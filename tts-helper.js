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
  const sharedAudio = document.createElement("audio");
  sharedAudio.preload = "auto";
  sharedAudio.playsInline = true;

  function debugLog(message, data) {
    console.log(`[FTCTTS] ${message}`, data || "");
  }

  function logAudioError(message, error, audio) {
    console.error(`[FTCTTS] ${message}`, {
      name: error?.name || "UnknownError",
      message: error?.message || String(error || ""),
      src: audio?.currentSrc || audio?.src || "",
      readyState: audio?.readyState,
      networkState: audio?.networkState,
    });
  }

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

  function waitForVoices(timeoutMs = 700) {
    const synth = window.speechSynthesis;
    if (!synth) return Promise.resolve([]);
    const voices = synth.getVoices();
    if (voices?.length) return Promise.resolve(voices);

    return new Promise((resolve) => {
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        synth.removeEventListener?.("voiceschanged", finish);
        resolve(synth.getVoices() || []);
      };
      synth.addEventListener?.("voiceschanged", finish, { once: true });
      window.setTimeout(finish, timeoutMs);
    });
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
    try {
      sharedAudio.pause();
      sharedAudio.currentTime = 0;
    } catch (e) {}
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
    try {
      sharedAudio.pause();
    } catch (e) {}
  }

  function buildRemoteTtsUrl(text, lang) {
    const query = encodeURIComponent(text);
    return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang || "zh-CN")}&q=${query}`;
  }

  async function playAudio(url) {
    debugLog("Play clicked", { src: url });
    const audio = sharedAudio;
    currentAudio = audio;
    try {
      audio.pause();
      audio.muted = false;
      audio.volume = 1;
      if (audio.src !== url) {
        audio.src = url;
      }
      try {
        audio.currentTime = 0;
      } catch (error) {}

      const endedPromise = new Promise((resolve, reject) => {
        audio.onended = resolve;
        audio.onerror = () => reject(new Error("HTMLAudioElement playback error"));
      });

      await audio.play();
      debugLog("Audio played successfully", {
        src: audio.currentSrc || audio.src,
        readyState: audio.readyState,
        networkState: audio.networkState,
      });
      await endedPromise;
    } catch (error) {
      logAudioError("Audio play failed", error, audio);
      throw error;
    }
  }

  async function playRemoteTts(text, options = {}) {
    const chunks = splitSpeechText(text, 180);
    for (const chunk of chunks) {
      if (isStopped) break;
      await playAudio(buildRemoteTtsUrl(chunk, options.lang || "zh-CN"));
    }
  }

  function speakWithWebSpeech(text, options = {}) {
    return new Promise(async (resolve, reject) => {
      const synth = window.speechSynthesis;
      if (!synth || !window.SpeechSynthesisUtterance) {
        console.warn("[FTCTTS] speechSynthesis is not available; falling back to audio.");
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

        debugLog("Play clicked", { mode: "speechSynthesis", chunk: index + 1 });
        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        index += 1;
        utterance.lang = "zh-CN";
        utterance.voice = options.voice || null;
        utterance.rate = Number(options.rate) || 0.9;
        utterance.pitch = Number(options.pitch) || 1.03;
        utterance.volume = 1;
        utterance.onstart = () => {
          spokeAtLeastOneChunk = true;
          debugLog("Audio played successfully", {
            mode: "speechSynthesis",
            lang: utterance.lang,
            voice: utterance.voice?.name || "",
          });
        };
        utterance.onend = speakNext;
        utterance.onerror = (event) => {
          console.error("[FTCTTS] speechSynthesis failed", {
            name: event?.error || "SpeechSynthesisError",
            message: event?.message || "",
            lang: utterance.lang,
            voice: utterance.voice?.name || "",
          });
          if (spokeAtLeastOneChunk) speakNext();
          else reject(new Error("Speech synthesis failed"));
        };
        synth.speak(utterance);
      };

      try {
        synth.cancel();
        synth.resume();
        const voices = await waitForVoices();
        if (!options.voice && voices?.length) {
          options.voice =
            voices.find((voice) => voice.lang === "zh-CN") ||
            voices.find((voice) => voice.lang === "cmn-CN") ||
            voices.find((voice) => voice.lang?.startsWith("zh")) ||
            null;
        }
        if (!options.voice && ANDROID_RE.test(navigator.userAgent || "")) {
          console.warn("[FTCTTS] No Chinese voice found on Android; falling back to audio TTS.");
          reject(new Error("No Chinese speechSynthesis voice on Android"));
          return;
        }
        speakNext();
      } catch (error) {
        console.error("[FTCTTS] speechSynthesis exception", {
          name: error?.name || "UnknownError",
          message: error?.message || String(error || ""),
        });
        reject(error);
      }
    });
  }

  async function speak(text, options = {}) {
    if (!text) return;
    debugLog("Play clicked", {
      mode: options.forceRemote || ANDROID_RE.test(navigator.userAgent || "") ? "audio" : "speechSynthesis",
      textLength: String(text).length,
    });
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
