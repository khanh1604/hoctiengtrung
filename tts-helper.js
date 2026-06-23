(function () {
  const ANDROID_RE = /Android/i;
  const AUDIO_TRIGGER_SELECTOR = [
    ".sound-btn",
    ".vocab-sound-btn",
    ".vocab-detail-sound",
    ".structure-list-sound",
    ".structure-sound-btn",
    ".writing-reference-play",
    ".reading-audio-play",
    ".reading-audio-repeat",
    ".reading-mobile-replay",
  ].join(",");
  let currentAudio = null;
  let isStopped = false;
  let activeTrigger = null;
  let lastTrigger = null;

  function getAudioTrigger(target) {
    return target?.closest?.(AUDIO_TRIGGER_SELECTOR) || null;
  }

  function setTriggerState(trigger, state) {
    if (!trigger) return;
    trigger.classList.toggle("tts-pressing", state === "pressing");
    trigger.classList.toggle("tts-speaking", state === "speaking");
    trigger.setAttribute("aria-busy", state === "speaking" ? "true" : "false");
  }

  function rememberTrigger(event) {
    const trigger = getAudioTrigger(event.target);
    if (!trigger) return;
    lastTrigger = trigger;
    setTriggerState(trigger, "pressing");
    window.setTimeout(() => {
      if (trigger !== activeTrigger) {
        trigger.classList.remove("tts-pressing");
      }
    }, 180);
  }

  function activateTrigger(trigger) {
    if (activeTrigger && activeTrigger !== trigger) {
      setTriggerState(activeTrigger, "");
    }
    activeTrigger = trigger || lastTrigger;
    setTriggerState(activeTrigger, "speaking");
  }

  function clearActiveTrigger() {
    if (activeTrigger) {
      setTriggerState(activeTrigger, "");
    }
    activeTrigger = null;
    if (lastTrigger) {
      lastTrigger.classList.remove("tts-pressing");
    }
  }

  function splitSpeechText(text, maxLength = 140) {
    const parts =
      String(text || "")
        .replace(/\s+/g, " ")
        .match(/[^。！？!?；;，,]+[。！？!?；;，,]?/g) || [String(text || "")];
    const chunks = [];
    let current = "";

    parts.forEach((part) => {
      const next = `${current}${part}`;
      if (next.length > maxLength && current) {
        chunks.push(current);
        current = part;
      } else {
        current = next;
      }
    });

    if (current) chunks.push(current);
    return chunks.map((chunk) => chunk.trim()).filter(Boolean);
  }

  function prime() {
    try {
      window.speechSynthesis?.resume();
      window.speechSynthesis?.getVoices();
    } catch (e) {}
  }

  function stop() {
    isStopped = true;
    clearActiveTrigger();
    try {
      window.speechSynthesis?.cancel();
    } catch (e) {}
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (e) {}
    }
    currentAudio = null;
  }

  function pause() {
    clearActiveTrigger();
    try {
      window.speechSynthesis?.pause();
    } catch (e) {}
    if (currentAudio) {
      try {
        currentAudio.pause();
      } catch (e) {}
    }
  }

  function buildRemoteTtsUrl(text, lang) {
    const query = encodeURIComponent(text);
    return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang || "zh-CN")}&q=${query}`;
  }

  function playAudioUrl(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      currentAudio = audio;
      audio.preload = "auto";
      audio.playsInline = true;
      audio.onended = resolve;
      audio.onerror = reject;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(reject);
      }
    });
  }

  async function playRemoteTts(text, options = {}) {
    const chunks = splitSpeechText(text, 180);
    for (const chunk of chunks) {
      if (isStopped) break;
      await playAudioUrl(buildRemoteTtsUrl(chunk, options.lang || "zh-CN"));
    }
  }

  function speakWithWebSpeech(text, options = {}) {
    return new Promise((resolve, reject) => {
      const synth = window.speechSynthesis;
      if (!synth || !window.SpeechSynthesisUtterance) {
        reject(new Error("Speech synthesis is not supported"));
        return;
      }

      const chunks = splitSpeechText(text, 90);
      let index = 0;
      let spokeAtLeastOneChunk = false;

      const speakNext = () => {
        if (isStopped || index >= chunks.length) {
          resolve();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        index += 1;
        utterance.lang = options.lang || options.voice?.lang || "zh-CN";
        utterance.voice = options.voice || null;
        utterance.rate = Number(options.rate) || 0.86;
        utterance.pitch = Number(options.pitch) || 1.03;
        utterance.volume = 1;
        utterance.onstart = () => {
          spokeAtLeastOneChunk = true;
        };
        utterance.onend = speakNext;
        utterance.onerror = () => {
          if (spokeAtLeastOneChunk) speakNext();
          else reject(new Error("Speech synthesis failed"));
        };
        synth.speak(utterance);
      };

      try {
        synth.cancel();
        synth.resume();
        synth.getVoices();
        speakNext();
      } catch (error) {
        reject(error);
      }
    });
  }

  async function speak(text, options = {}) {
    if (!text) return;
    stop();
    isStopped = false;
    activateTrigger(options.trigger || lastTrigger);
    prime();

    const shouldUseRemoteFirst =
      options.forceRemote || ANDROID_RE.test(navigator.userAgent || "");

    if (shouldUseRemoteFirst) {
      try {
        await playRemoteTts(text, options);
        clearActiveTrigger();
        return;
      } catch (e) {
        stop();
        isStopped = false;
        activateTrigger(options.trigger || lastTrigger);
      }
    }

    try {
      await speakWithWebSpeech(text, options);
      clearActiveTrigger();
    } catch (e) {
      try {
        await playRemoteTts(text, options);
        clearActiveTrigger();
      } catch (error) {
        clearActiveTrigger();
      }
    }
  }

  document.addEventListener("pointerdown", rememberTrigger, { passive: true });
  document.addEventListener("touchstart", rememberTrigger, { passive: true });
  document.addEventListener("pointerdown", prime, { once: true, passive: true });
  document.addEventListener("touchstart", prime, { once: true, passive: true });

  window.FTCTTS = {
    speak,
    stop,
    pause,
    prime,
    splitSpeechText,
  };
})();
