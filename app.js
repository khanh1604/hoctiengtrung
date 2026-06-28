(function () {
  let totalQuestions = 32;

  const questionEl = document.querySelector(".question");
  const answerInput = document.querySelector(".answer-input");
  const checkBtn = document.querySelector(".check-btn");
  const soundBtn = document.querySelector(".sound-btn");
  const toolBtn = document.querySelector(".tool-btn");
  const customPanel = document.getElementById("customPanel");
  const voiceSelect = document.getElementById("voiceSelect");
  const speedRange = document.getElementById("speedRange");
  const speedValue = document.getElementById("speedValue");
  const customCloseBtn = document.getElementById("customCloseBtn");
  const completionNote = document.querySelector(".completion-note");
  const feedbackEl = document.querySelector(".answer-feedback");
  const remainingEl = document.querySelector(".info b");
  const expEl = document.querySelector(".exp");
  const lessonEl = document.querySelector(".lesson");
  const progressBar = document.querySelector(".progress-bar");

  if (!questionEl || !checkBtn) return;

  const params = new URLSearchParams(window.location.search);
  const lesson = params.get("lesson") || "01";
  const testNum = params.get("test") || "1";
  const subject = params.get("subject") || "";
  const content = params.get("content") || "";
  const subjectParam = subject ? `&subject=${subject}` : "";
  const contentParam = content ? `&content=${content}` : "";
  const storagePrefix = `${subject ? `${subject}-` : ""}${content ? `${content}-` : ""}`;
  const expKey = `typingExp-${storagePrefix}${lesson}-${testNum}`;
  const resetKey = `typingReset-${storagePrefix}${lesson}-${testNum}`;
  const practiceActivityContents = new Set(["paragraph", "structure", "example"]);
  const isReflexTyping =
    (subject === "speaking" || subject === "hanyu1" || subject === "hanyu2" || subject === "hanyu3" || subject === "hanyu4" || subject === "hanyu5" || subject === "hanyu6" || subject === "writing" || subject === "listening" || subject === "listening3" || subject === "listening4") &&
    practiceActivityContents.has(content);
  const reflexCurrentEl = document.querySelector(".reflex-current");
  const reflexDoneEl = document.querySelector(".reflex-done");
  const reflexAccuracyEl = document.querySelector(".reflex-accuracy");
  const reflexQuestionGrid = document.getElementById("reflexQuestionGrid");
  const reflexPrevBtn = document.querySelector(".reflex-prev-btn");
  const reflexNextBtn = document.querySelector(".reflex-next-btn");
  const reflexFlagBtn = document.querySelector(".reflex-flag-btn");
  const reflexDonut = document.querySelector(".reflex-donut");
  const reflexDonutCount = document.querySelector(".reflex-donut-count");
  const reflexRightCount = document.querySelector(".reflex-right-count");
  const reflexWrongCount = document.querySelector(".reflex-wrong-count");
  const reflexLeftCount = document.querySelector(".reflex-left-count");
  const reflexSideAccuracy = document.querySelector(".reflex-side-accuracy");

  let questions = [];
  let currentIndex = parseInt(
    sessionStorage.getItem("currentQuestion") || "0",
    10,
  );
  let exp = parseInt(sessionStorage.getItem(expKey) || "0", 10);
  let showingResult = false;
  let finished = false;
  let speakingExampleTestCount = 10;
  let listeningExampleTestCount = 1;
  let speakingParagraphTestCount = 1;
  let speakingStructureTestCount = 1;
  let hanyu3ExerciseTestCount = 6;
  let answerStates = [];
  let flaggedQuestions = new Set();

  if (lessonEl) {
    const testLabel = String(testNum).padStart(2, "0");
    const activityTitle =
      content === "paragraph"
        ? `Ôn tập bài khóa ${testLabel}`
        : content === "structure"
          ? `Luyện tập cấu trúc ${testLabel}`
          : `Bài ${lesson} - Kiểm tra ${testLabel}`;
    lessonEl.textContent = activityTitle;
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeQuestion(item) {
    const explanation = item.explanation || item.meaning || "";
    const completed = item.completed || item.fullSentence || "";
    return {
      type: item.type || item.kind || "",
      title: item.title || item.name || "",
      pattern: item.pattern || item.structure || item.formula || "",
      meaning: completed
        ? `${completed}${item.meaning ? `\n${item.meaning}` : ""}${explanation ? `\n${explanation}` : ""}`
        : explanation,
      usage: item.usage || item.note || "",
      vietnamese: item.question || item.vietnamese || item.vi || "",
      chinese: item.answer || item.chinese || item.zh || "",
      pinyin: item.pinyin || item.py || "",
      examples: Array.isArray(item.examples)
        ? item.examples.map((example) => ({
            chinese: example.chinese || example.zh || "",
            pinyin: example.pinyin || example.py || "",
            vietnamese: example.vietnamese || example.vi || "",
          }))
        : [],
    };
  }

  function hasStructureDetails(q) {
    return Boolean(
      q.title || q.pattern || q.meaning || q.usage || q.examples?.length,
    );
  }

  function renderExampleList(examples) {
    if (!examples?.length) return "";
    return `
      <div class="structure-examples">
        <div class="structure-section-title">Ví dụ</div>
        ${examples
          .map(
            (example) => `
              <div class="structure-example">
                <strong>${escapeHtml(example.chinese)}</strong>
                ${example.pinyin ? `<span>${escapeHtml(example.pinyin)}</span>` : ""}
                ${example.vietnamese ? `<small>${escapeHtml(example.vietnamese)}</small>` : ""}
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function renderQuestionPrompt(q) {
    if (!hasStructureDetails(q)) {
      questionEl.textContent = q.vietnamese;
      return;
    }

    const title = q.title || q.vietnamese || "Cấu trúc";
    questionEl.innerHTML = `
      <div class="structure-card">
        <div class="structure-kicker">Từ vựng và cấu trúc</div>
        <div class="structure-title">${escapeHtml(title)}</div>
        ${q.pattern ? `<div class="structure-pattern">${escapeHtml(q.pattern)}</div>` : ""}
        ${q.meaning ? `<p class="structure-meaning">${escapeHtml(q.meaning)}</p>` : ""}
        ${q.usage ? `<p class="structure-usage">${escapeHtml(q.usage)}</p>` : ""}
        ${renderExampleList(q.examples)}
        ${q.vietnamese ? `<div class="structure-task">${escapeHtml(q.vietnamese)}</div>` : ""}
      </div>
    `;
  }

  function parseTabSeparatedVocabulary(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/\t+/);
        return {
          chinese: parts[0] || "",
          pinyin: parts[1] || "",
          vietnamese: parts[2] || "",
        };
      });
  }

  function splitIntoGroups(items, groupSize) {
    const groups = [];
    for (let i = 0; i < items.length; i += groupSize) {
      groups.push(items.slice(i, i + groupSize));
    }
    return groups;
  }

  function splitIntoParts(items, partCount) {
    const groups = [];
    const size = Math.ceil((items || []).length / partCount);
    for (let i = 0; i < partCount; i++) {
      groups.push((items || []).slice(i * size, (i + 1) * size));
    }
    return groups;
  }

  function normalizeAnswer(text) {
    return String(text || "")
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N}\p{Script=Han}]/gu, "")
      .toLowerCase();
  }

  function getComparableChars(text) {
    return Array.from(normalizeAnswer(text));
  }

  function getMatchingUserIndexes(userChars, correctChars) {
    const rows = userChars.length + 1;
    const cols = correctChars.length + 1;
    const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

    for (let i = userChars.length - 1; i >= 0; i -= 1) {
      for (let j = correctChars.length - 1; j >= 0; j -= 1) {
        dp[i][j] =
          userChars[i] === correctChars[j]
            ? dp[i + 1][j + 1] + 1
            : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    const matched = new Set();
    let i = 0;
    let j = 0;
    while (i < userChars.length && j < correctChars.length) {
      if (userChars[i] === correctChars[j]) {
        matched.add(i);
        i += 1;
        j += 1;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        i += 1;
      } else {
        j += 1;
      }
    }

    return matched;
  }

  function highlightWrongParts(userAnswer, correctAnswer) {
    const userChars = getComparableChars(userAnswer);
    const correctChars = getComparableChars(correctAnswer);
    const matched = getMatchingUserIndexes(userChars, correctChars);
    let comparableIndex = 0;

    return Array.from(String(userAnswer || ""))
      .map((char) => {
        const comparable = getComparableChars(char);
        if (!comparable.length) return escapeHtml(char);

        const isWrong = !matched.has(comparableIndex);
        comparableIndex += comparable.length;

        return isWrong
          ? `<span class="answer-wrong-part">${escapeHtml(char)}</span>`
          : escapeHtml(char);
      })
      .join("");
  }

  function getSavedVoiceSettings() {
    const voiceURI = sessionStorage.getItem("ttsVoiceURI") || "";
    const rate = parseFloat(sessionStorage.getItem("ttsRate") || "1") || 1;
    return { voiceURI, rate };
  }

  function saveVoiceSettings(voiceURI, rate) {
    sessionStorage.setItem("ttsVoiceURI", voiceURI);
    sessionStorage.setItem("ttsRate", String(rate));
  }

  const preferredChineseVoiceNames = [
    "zh-cn-xiaoxiaoneural",
    "xiaoxiaoneural",
    "microsoft xiaoxiao",
    "xiaoxiao",
    "zh-cn-xiaonineural",
    "xiaonineural",
    "microsoft xiaoni",
    "xiaoni",
    "google 普通话",
    "google mandarin",
    "google chinese",
  ];

  function getVoiceSearchText(voice) {
    return `${voice.name || ""} ${voice.voiceURI || ""} ${voice.lang || ""}`.toLowerCase();
  }

  function scoreChineseVoice(voice) {
    const text = getVoiceSearchText(voice);
    if (!voice.lang || !voice.lang.toLowerCase().startsWith("zh")) return -1;

    const preferredIndex = preferredChineseVoiceNames.findIndex((name) => text.includes(name));
    if (preferredIndex >= 0) return 1000 - preferredIndex * 20;
    if (text.includes("neural")) return 760;
    if (text.includes("microsoft")) return 700;
    if (text.includes("google")) return 680;
    if (voice.lang.toLowerCase() === "zh-cn") return 620;
    return 500;
  }

  function getBestChineseVoice(voices, usedVoiceURIs = new Set()) {
    const bestVoice = (voices || [])
      .filter((voice) => !usedVoiceURIs.has(voice.voiceURI) && scoreChineseVoice(voice) >= 0)
      .sort((a, b) => scoreChineseVoice(b) - scoreChineseVoice(a))[0] || null;
    if (bestVoice) usedVoiceURIs.add(bestVoice.voiceURI);
    return bestVoice;
  }

  function getSelectedVoice(voices) {
    const { voiceURI } = getSavedVoiceSettings();
    if (voiceURI) {
      const match = voices.find((v) => v.voiceURI === voiceURI);
      if (match) return match;
    }
    const preferredVoices = getLimitedVoiceOptions(voices);
    return preferredVoices[0]?.voice || getBestChineseVoice(voices) || voices[0];
  }

  function findVoiceByLang(voices, langPrefix, usedVoiceURIs) {
    const exact = voices.find(
      (voice) =>
        voice.lang &&
        voice.lang.toLowerCase().startsWith(langPrefix.toLowerCase()) &&
        !usedVoiceURIs.has(voice.voiceURI),
    );
    if (!exact) return null;
    usedVoiceURIs.add(exact.voiceURI);
    return exact;
  }

  function getLimitedVoiceOptions(voices) {
    const usedVoiceURIs = new Set();
    const options = [
      {
        label: "Tiếng Trung Neural",
        voice: getBestChineseVoice(voices, usedVoiceURIs) || findVoiceByLang(voices, "zh-CN", usedVoiceURIs),
        fallbackLang: "zh-CN",
      },
      {
        label: "Tiếng Trung 2",
        voice:
          findVoiceByLang(voices, "zh-TW", usedVoiceURIs) ||
          findVoiceByLang(voices, "zh-HK", usedVoiceURIs) ||
          findVoiceByLang(voices, "zh", usedVoiceURIs),
        fallbackLang: "zh-TW",
      },
      {
        label: "Tiếng Trung 3",
        voice: findVoiceByLang(voices, "zh", usedVoiceURIs),
        fallbackLang: "zh-CN",
      },
      {
        label: "Tiếng Việt",
        voice: findVoiceByLang(voices, "vi", usedVoiceURIs),
        fallbackLang: "vi-VN",
      },
    ];

    return options.map((option, idx) => {
      const value = option.voice
        ? option.voice.voiceURI
        : `fallback-${option.fallbackLang}-${idx}`;
      return {
        ...option,
        value,
        lang: option.voice?.lang || option.fallbackLang,
      };
    });
  }

  const progressKey = `typingProgress-${storagePrefix}${lesson}-${testNum}`;
  const flagKey = `typingFlags-${storagePrefix}${lesson}-${testNum}`;

  function loadProgressState() {
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(progressKey) || "null");
    } catch (e) {
      stored = null;
    }

    const forceReset = sessionStorage.getItem(resetKey) === "1";
    if (forceReset) {
      sessionStorage.removeItem(resetKey);
      localStorage.removeItem(progressKey);
      currentIndex = 0;
      exp = 0;
      sessionStorage.setItem("currentQuestion", "0");
      sessionStorage.setItem(expKey, "0");
      return;
    }

    const storedIndex =
      stored && typeof stored.currentIndex === "number"
        ? stored.currentIndex
        : null;
    const storedExp =
      stored && typeof stored.correctCount === "number"
        ? stored.correctCount
        : null;

    // Prefer the best saved values so reopening a test does not wipe
    // progress if session storage is stale or has been reset elsewhere.
    const sessExpRaw = sessionStorage.getItem(expKey);
    if (sessExpRaw !== null && sessExpRaw !== undefined) {
      const v = parseInt(sessExpRaw, 10);
      if (!Number.isNaN(v)) exp = v;
    }
    if (storedExp !== null) {
      exp = Math.max(exp, storedExp);
    }

    const sessionIndex = parseInt(
      sessionStorage.getItem("currentQuestion") || "0",
      10,
    );
    const nextIndex = Math.max(
      0,
      Math.min(
        totalQuestions,
        Math.max(
          Number.isNaN(sessionIndex) ? 0 : sessionIndex,
          storedIndex !== null ? storedIndex : 0,
        ),
      ),
    );
    currentIndex = nextIndex;
    if (storedIndex !== null || sessionIndex > 0) {
      sessionStorage.setItem("currentQuestion", String(currentIndex));
    } else {
      currentIndex = 0;
    }
  }

  function saveProgressState(indexOverride) {
    const state = {
      currentIndex:
        typeof indexOverride === "number" ? indexOverride : currentIndex,
      correctCount: exp,
    };

    // Preserve the highest correctCount seen for this test
    try {
      const prev = JSON.parse(localStorage.getItem(progressKey) || "null");
      if (prev && typeof prev.correctCount === "number") {
        state.correctCount = Math.max(
          prev.correctCount,
          state.correctCount || 0,
        );
      }
    } catch (e) {
      // ignore parse errors and proceed to save
    }

    localStorage.setItem(progressKey, JSON.stringify(state));
    sessionStorage.setItem("currentQuestion", String(state.currentIndex));
  }

  function loadFlagState() {
    if (!isReflexTyping) return;
    try {
      const saved = JSON.parse(localStorage.getItem(flagKey) || "[]");
      flaggedQuestions = new Set(Array.isArray(saved) ? saved : []);
    } catch (e) {
      flaggedQuestions = new Set();
    }
  }

  function saveFlagState() {
    if (!isReflexTyping) return;
    localStorage.setItem(flagKey, JSON.stringify(Array.from(flaggedQuestions)));
  }

  function getEvaluationText() {
    if (exp >= totalQuestions) return `Giỏi (${totalQuestions}/${totalQuestions} đúng)`;
    return `Khá (${exp}/${totalQuestions} đúng)`;
  }

  function splitSpeechText(text, maxLength = 90) {
    const parts = String(text || "")
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

  function primeSpeechSynthesis() {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.getVoices();
    } catch (e) {}
  }

  document.addEventListener("pointerdown", primeSpeechSynthesis, { once: true, passive: true });
  document.addEventListener("touchstart", primeSpeechSynthesis, { once: true, passive: true });

  // Simple TTS helper using the Web Speech API
  function speakText(text, preferredLang = "zh-CN") {
    if (!text) return;
    const settings = getSavedVoiceSettings();
    const selectedLang =
      voiceSelect?.selectedOptions?.[0]?.dataset?.lang || preferredLang;
    const voices = window.speechSynthesis?.getVoices?.() || [];
    const selectedVoice = getSelectedVoice(voices || []);

    if (window.FTCTTS?.speak) {
      window.FTCTTS.speak(text, {
        lang: selectedLang,
        rate: Math.min(settings.rate || 0.88, 0.92),
        pitch: 1.03,
        voice: selectedVoice,
      });
      return;
    }

    if (!window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const chunks = splitSpeechText(text);
    let index = 0;

    const speakNext = () => {
      if (index >= chunks.length) return;
      const utt = new SpeechSynthesisUtterance(chunks[index]);
      index += 1;
      utt.lang = selectedLang;
      utt.rate = Math.min(settings.rate || 0.88, 0.92);
      utt.pitch = 1.03;
      utt.volume = 1;
      if (selectedVoice) {
        utt.voice = selectedVoice;
        utt.lang = selectedVoice.lang || selectedLang;
      }
      utt.onend = speakNext;
      utt.onerror = speakNext;
      synth.speak(utt);
    };

    try {
      synth.cancel();
      synth.resume();
      synth.getVoices();
      speakNext();
    } catch (e) {}
  }

  function populateVoiceOptions() {
    if (!voiceSelect) return;
    const voices = window.speechSynthesis.getVoices();

    const saved = getSavedVoiceSettings();
    voiceSelect.innerHTML = "";

    getLimitedVoiceOptions(voices || []).forEach((voiceOption) => {
      const option = document.createElement("option");
      option.value = voiceOption.value;
      option.dataset.lang = voiceOption.lang;
      option.textContent = `${voiceOption.label} (${voiceOption.lang})`;
      if (voiceOption.value === saved.voiceURI) {
        option.selected = true;
      }
      voiceSelect.appendChild(option);
    });

    const hasSavedOption = Array.from(voiceSelect.options).some(
      (option) => option.value === saved.voiceURI,
    );
    if (!hasSavedOption && voiceSelect.options.length) {
      voiceSelect.value = voiceSelect.options[0].value;
    }
  }

  function syncVoiceSettingsUI() {
    if (!speedRange || !speedValue) return;
    const saved = getSavedVoiceSettings();
    speedRange.value = String(saved.rate || 1);
    speedValue.textContent = saved.rate.toFixed(1);
  }

  function toggleCustomPanel(open) {
    if (!customPanel) return;
    if (open) {
      customPanel.classList.add("active");
      populateVoiceOptions();
      syncVoiceSettingsUI();
    } else {
      customPanel.classList.remove("active");
    }
  }

  function getTestQuestions(allData) {
    if (subject === "writing" && content === "paragraph") {
      const lessonKey = String(Number(lesson));
      const lessonItems = allData[lesson] || allData[lessonKey] || [];
      return lessonItems.map(normalizeQuestion);
    }

    if (subject === "writing" && (content === "grammar" || content === "structure")) {
      const lessonKey = String(Number(lesson));
      const grammar = allData.grammar || allData.grammarTests || {};
      const structure = allData.structure || allData.structureTests || {};
      const structureItems = structure[lesson] || structure[lessonKey] || [];
      const grammarItems = grammar[lesson] || grammar[lessonKey] || [];
      const items =
        content === "structure" && Array.isArray(structureItems) && structureItems.length
          ? structureItems
          : content === "structure" && Array.isArray(grammarItems)
            ? grammarItems.filter(
                (item) =>
                  !item.partOfSpeech &&
                  (item.title ||
                    item.pattern ||
                    item.meaning ||
                    item.usage ||
                    item.examples),
              )
            : Array.isArray(grammarItems)
              ? grammarItems.filter((item) => item && !item.partOfSpeech)
              : grammarItems;

      if (Array.isArray(items)) {
        if (Array.isArray(items[0])) {
          return (items[Number(testNum) - 1] || []).map(normalizeQuestion);
        }

        const start = (Number(testNum) - 1) * 20;
        return items.slice(start, start + 20).map(normalizeQuestion);
      }

      const groupedItems = items[testNum] || items[String(Number(testNum))] || [];
      return groupedItems.map(normalizeQuestion);
    }

    if (subject === "writing" && !content) {
      const lessonKey = String(Number(lesson));
      const examples = allData.examples || allData.exampleTests || {};
      const items = examples[lesson] || examples[lessonKey] || [];
      const groups = splitWritingExamplesIntoReadings(items);

      return (groups[Number(testNum) - 1] || []).map(normalizeQuestion);
    }

    if ((subject === "speaking" || subject === "hanyu1" || subject === "hanyu2" || subject === "hanyu3" || subject === "hanyu4" || subject === "hanyu5" || subject === "hanyu6") && content === "example") {
      const lessonNum = String(Number(lesson));
      const exampleGroupSize = (subject === "hanyu1" || subject === "hanyu2") ? 10 : 20;
      if (!allData.__rawText) {
        const exampleItems = allData.example || [];
        const groups = splitIntoGroups(exampleItems, exampleGroupSize);
        return (groups[Number(testNum) - 1] || []).map(normalizeQuestion);
      }

      const rawText = allData.__rawText || "";
      const items = parseTabSeparatedVocabulary(rawText);
      const groups = splitIntoGroups(items, exampleGroupSize);
      return (groups[Number(testNum) - 1] || []).map(normalizeQuestion);
    }

    if ((subject === "listening" || subject === "listening3" || subject === "listening4") && content === "example") {
      const lessonKey = String(Number(lesson));
      const items = allData[lesson] || allData[lessonKey] || [];
      const groups = splitIntoGroups(items, 20);
      return (groups[Number(testNum) - 1] || []).map(normalizeQuestion);
    }

    if ((subject === "speaking" || subject === "hanyu1" || subject === "hanyu2" || subject === "hanyu3" || subject === "hanyu4" || subject === "hanyu5" || subject === "hanyu6") && (content === "grammar" || content === "structure")) {
      const lessonNum = String(Number(lesson));
      if (!allData.__rawText) {
        const grammarItems = content === "structure"
          ? allData.structure || []
          : allData.grammar || allData.structure || [];
        const groupSize = content === "structure" ? 20 : 25;
        const groups = splitIntoGroups(grammarItems, groupSize);
        return (groups[Number(testNum) - 1] || []).map(normalizeQuestion);
      }

      const rawText = allData.__rawText || "";
      const items = parseTabSeparatedVocabulary(rawText);
      const groups = splitIntoGroups(items, content === "structure" ? 20 : 25);
      return (groups[Number(testNum) - 1] || []).map(normalizeQuestion);
    }

    if ((subject === "speaking" || subject === "hanyu1" || subject === "hanyu2" || subject === "hanyu3" || subject === "hanyu4" || subject === "hanyu5" || subject === "hanyu6") && content === "paragraph") {
      const lessonNum = String(Number(lesson));
      if (!allData.__rawText) {
        const paragraphGroups = getSpeakingParagraphGroups(allData);
        const group = paragraphGroups[Number(testNum) - 1] || [];
        return getParagraphGroupLines(group).map(normalizeQuestion);
      }
      const rawText = allData.__rawText || "";
      const items = parseTabSeparatedVocabulary(rawText);
      const groups = splitIntoGroups(items, 25);
      return (groups[Number(testNum) - 1] || []).map(normalizeQuestion);
    }

    if (subject === "hanyu3" && content === "exercise") {
      const exerciseItems = allData.exercise || [];
      if (Array.isArray(exerciseItems[0])) {
        return (exerciseItems[Number(testNum) - 1] || []).map(normalizeQuestion);
      }
      if (exerciseItems[0] && (Array.isArray(exerciseItems[0].questions) || exerciseItems[0].title)) {
        const exercise = exerciseItems[Number(testNum) - 1] || {};
        if (Array.isArray(exercise.questions)) {
          return exercise.questions.map(normalizeQuestion);
        }
        return [];
      }
      const groups = splitIntoGroups(exerciseItems, 20);
      return (groups[Number(testNum) - 1] || []).map(normalizeQuestion);
    }

    const key = String(testNum);
    return (allData[key] || allData[testNum] || []).map(normalizeQuestion);
  }

  function splitIntoParts(items, partCount) {
    const base = Math.floor(items.length / partCount);
    const extra = items.length % partCount;
    let start = 0;

    return Array.from({ length: partCount }, (_, idx) => {
      const size = base + (idx < extra ? 1 : 0);
      const end = start + size;
      const part = items.slice(start, end);
      start = end;
      return part;
    }).filter((part) => part.length > 0);
  }

  function getSpeakingParagraphGroups(data) {
    const items = data.paragraph || [];
    if (!Array.isArray(items) || !items.length) return [];
    if (Array.isArray(items[0])) return items;
    if (items[0] && (Array.isArray(items[0].lines) || items[0].title || items[0].type)) return items;
    if (subject === "hanyu3") return splitIntoParts(items, 3);
    return [items];
  }

  function getParagraphGroupLines(group) {
    if (Array.isArray(group)) return group;
    if (group && Array.isArray(group.value)) return group.value;
    if (group && Array.isArray(group.lines)) return group.lines;
    return [];
  }

  function splitWritingExamplesIntoReadings(items) {
    if (!Array.isArray(items)) {
      return Object.keys(items || {})
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => items[key]);
    }
    if (Array.isArray(items[0])) return items;
    if (!items.length) return [];

    const readingCount = 9;
    const groupSize = Math.ceil(items.length / readingCount);
    return Array.from({ length: readingCount }, (_, idx) =>
      items.slice(idx * groupSize, (idx + 1) * groupSize),
    ).filter((group) => group.length);
  }

  function countWritingPracticeGroups(items) {
    if (!Array.isArray(items)) return Object.keys(items || {}).length;
    if (Array.isArray(items[0])) return items.length;
    return Math.ceil(items.length / 20);
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem("reviewTestData");
      if (!raw) return false;
      questions = getTestQuestions(JSON.parse(raw));
      return questions.length > 0;
    } catch {
      return false;
    }
  }

  async function loadQuestions() {
    if ((subject === "listening" || subject === "listening3" || subject === "listening4") && content !== "example" && loadFromStorage()) return;

    const dataFile =
      subject === "writing"
        ? "data/writing-tests.json"
        : (subject === "listening" || subject === "listening3" || subject === "listening4") && content === "example"
          ? subject === "listening4"
            ? "data/listening4-example-tests.json"
            : subject === "listening3"
              ? "data/listening3-example-tests.json"
              : "data/listening-example-tests.json"
        : (subject === "hanyu1" || subject === "hanyu2" || subject === "hanyu3" || subject === "hanyu4" || subject === "hanyu5" || subject === "hanyu6")
          ? `data/${subject}-lessons.json?v=${Date.now()}`
        : subject === "speaking"
          ? `data/speaking-lesson-${Number(lesson)}.json?v=${Date.now()}`
          : "data/nghe1-tests.json";
    const res = await fetch(dataFile);
    if (!res.ok) throw new Error("Không tải được dữ liệu câu hỏi");

    if (subject === "hanyu1" || subject === "hanyu2" || subject === "hanyu3" || subject === "hanyu4" || subject === "hanyu5" || subject === "hanyu6") {
      const allLessons = await res.json();
      const lessonData = allLessons[String(Number(lesson))];
      if (!lessonData) throw new Error("Không tải được dữ liệu Giáo trình Hán ngữ");
      const typingLessonCrumb = document.getElementById("typingBreadcrumbLesson");
      if (typingLessonCrumb) {
        const padLesson = String(Number(lesson)).padStart(2, "0");
        const cleanTitle = String(lessonData.title || "").trim();
        typingLessonCrumb.textContent = cleanTitle ? `Bài ${padLesson} - ${cleanTitle}` : `Bài ${padLesson}`;
      }
      if (content === "example") {
        const exampleGroupSize = (subject === "hanyu1" || subject === "hanyu2") ? 10 : 20;
        speakingExampleTestCount = Math.max(
          1,
          splitIntoGroups(lessonData.example || [], exampleGroupSize).length,
        );
      }
      if (content === "paragraph") {
        speakingParagraphTestCount = Math.max(
          1,
          getSpeakingParagraphGroups(lessonData).length,
        );
      }
      if (content === "structure") {
        speakingStructureTestCount = Math.max(
          1,
          splitIntoGroups(lessonData.structure || [], 20).length,
        );
      }
      if (content === "exercise") {
        const exerciseItems = lessonData.exercise || [];
        hanyu3ExerciseTestCount = exerciseItems[0]?.title
          ? Math.max(6, exerciseItems.length)
          : Array.isArray(exerciseItems[0])
          ? Math.max(6, exerciseItems.length)
          : Math.max(6, splitIntoGroups(exerciseItems, 20).length);
      }
      questions = getTestQuestions(lessonData);
      return;
    }

    if (subject === "speaking") {
      const lessonData = await res.json();
      if (content === "example") {
        speakingExampleTestCount = Math.max(
          1,
          splitIntoGroups(lessonData.example || [], 20).length,
        );
      }
      if (content === "paragraph") {
        speakingParagraphTestCount = Math.max(
          1,
          getSpeakingParagraphGroups(lessonData).length,
        );
      }
      if (content === "structure") {
        speakingStructureTestCount = Math.max(
          1,
          splitIntoGroups(lessonData.structure || [], 20).length,
        );
      }
      questions = getTestQuestions(lessonData);
      return;
    }

    const allData = await res.json();
    if ((subject === "listening" || subject === "listening3" || subject === "listening4") && content === "example") {
      const lessonKey = String(Number(lesson));
      const items = allData[lesson] || allData[lessonKey] || [];
      listeningExampleTestCount = Math.max(1, splitIntoGroups(items, 20).length);
    }
    questions = getTestQuestions(allData);
  }

  function updateExpDisplay() {
    if (expEl) expEl.textContent = String(exp);
    sessionStorage.setItem(expKey, String(exp));
  }

  function clampIndex() {
    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex >= questions.length) {
      currentIndex = questions.length > 0 ? questions.length - 1 : 0;
    }
  }

  function updateProgress() {
    if (!progressBar) return;
    const pct = isReflexTyping
      ? Math.min(100, ((Math.min(currentIndex + 1, totalQuestions)) / totalQuestions) * 100)
      : Math.min(100, (exp / totalQuestions) * 100);
    progressBar.style.width = `${pct}%`;
    if (completionNote) {
      if (currentIndex >= totalQuestions) {
        completionNote.textContent = `Hoàn thành: ${getEvaluationText()}`;
      } else {
        completionNote.textContent = isReflexTyping
          ? `${Math.round(pct)}% hoàn thành`
          : `Đã đúng: ${exp}/${totalQuestions}`;
      }
    }
    updateReflexStats();
    renderReflexQuestionGrid();
  }

  function getReflexDoneCount() {
    return answerStates.filter(Boolean).length;
  }

  function getReflexWrongCount() {
    return answerStates.filter((state) => state === "wrong").length;
  }

  function updateReflexStats() {
    if (!isReflexTyping || !totalQuestions) return;
    const doneCount = getReflexDoneCount();
    const wrongCount = getReflexWrongCount();
    const currentDisplay = Math.min(currentIndex + 1, totalQuestions);
    const accuracy = doneCount ? Math.round((exp / doneCount) * 100) : 0;

    if (reflexCurrentEl) {
      reflexCurrentEl.textContent = `${String(currentDisplay).padStart(2, "0")}/${totalQuestions}`;
    }
    if (reflexDoneEl) reflexDoneEl.textContent = String(doneCount);
    if (reflexAccuracyEl) reflexAccuracyEl.textContent = `${accuracy}%`;
    if (reflexDonutCount) reflexDonutCount.textContent = `${doneCount}/${totalQuestions}`;
    if (reflexDonut) {
      const rightPct = totalQuestions ? (exp / totalQuestions) * 100 : 0;
      const wrongEndPct = totalQuestions
        ? ((exp + wrongCount) / totalQuestions) * 100
        : 0;
      reflexDonut.style.setProperty("--right", `${rightPct}%`);
      reflexDonut.style.setProperty("--wrong-end", `${wrongEndPct}%`);
    }
    if (reflexRightCount) reflexRightCount.textContent = String(exp);
    if (reflexWrongCount) reflexWrongCount.textContent = String(wrongCount);
    if (reflexLeftCount) reflexLeftCount.textContent = String(Math.max(0, totalQuestions - doneCount));
    if (reflexSideAccuracy) reflexSideAccuracy.textContent = `${accuracy}%`;
  }

  function renderReflexQuestionGrid() {
    if (!isReflexTyping || !reflexQuestionGrid || !totalQuestions) return;
    reflexQuestionGrid.innerHTML = "";
    questions.forEach((_, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(index + 1).padStart(2, "0");
      button.className = "reflex-question-dot";
      if (index === currentIndex) button.classList.add("is-current");
      if (flaggedQuestions.has(index)) button.classList.add("is-flagged");
      if (answerStates[index] === "correct") button.classList.add("is-correct");
      if (answerStates[index] === "wrong") button.classList.add("is-wrong");
      button.addEventListener("click", () => {
        currentIndex = index;
        showQuestion();
      });
      reflexQuestionGrid.appendChild(button);
    });
  }

  function setCheckMode() {
    showingResult = false;
    checkBtn.textContent = isReflexTyping ? "Kiểm tra" : "Kiểm tra (Enter)";
    checkBtn.classList.remove("next-btn");
    checkBtn.disabled = false;
  }

  function setNextMode() {
    showingResult = true;
    if (isReflexTyping) {
      checkBtn.textContent = "Kiểm tra";
      checkBtn.classList.remove("next-btn");
      checkBtn.disabled = true;
      return;
    }
    checkBtn.textContent = isReflexTyping ? "Câu tiếp theo" : "Tiếp theo (Enter)";
    checkBtn.classList.add("next-btn");
    checkBtn.disabled = false;
  }

  function clearFeedback() {
    if (!feedbackEl) return;
    feedbackEl.hidden = true;
    feedbackEl.textContent = "";
    feedbackEl.className = "answer-feedback";
    if (answerInput) {
      answerInput.classList.remove("input-wrong", "input-correct");
    }
  }

  function showFeedback(type, message) {
    if (!feedbackEl) return;
    feedbackEl.hidden = false;
    feedbackEl.className = `answer-feedback ${type}`;
    feedbackEl.innerHTML = message;
  }

  function showCorrectResult(q) {
    if (answerInput) answerInput.classList.add("input-correct");
    if (isReflexTyping && q) {
      showFeedback(
        "correct",
        `<strong>Kết quả: Đúng</strong>
         <div class="reflex-result-answer">${escapeHtml(q.chinese)}</div>
         <small>${escapeHtml(q.pinyin)}</small>`,
      );
      return;
    }
    showFeedback("correct", "✓ Chính xác!");
  }

  function showWrongResult(q, userAnswer) {
    if (answerInput) answerInput.classList.add("input-wrong");
    if (isReflexTyping) {
      showFeedback(
        "wrong",
        `<strong>Kết quả: Sai</strong>
         <div class="result-row">
           <span class="answer-label">Bạn đã nhập:</span>
           <span class="answer-user">${highlightWrongParts(userAnswer, q.chinese)}</span>
         </div>
         <div class="reflex-result-answer">${escapeHtml(q.chinese)}</div>
         <small>${escapeHtml(q.pinyin)}</small>`,
      );
      return;
    }
    showFeedback(
      "wrong",
      `<div class="result-row">
         <span class="answer-label">Bạn đã nhập:</span>
         <span class="answer-user">${highlightWrongParts(userAnswer, q.chinese)}</span>
       </div>
       <div class="result-row">
         <span class="answer-label">Đáp án đúng:</span>
         <span class="answer-chinese">${escapeHtml(q.chinese)}</span>
         <br><small>${escapeHtml(q.pinyin)}</small>
       </div>`,
    );
  }

  function getCurrentQuestion() {
    clampIndex();
    return questions[currentIndex];
  }

  function showCompletion() {
    if (questionEl) questionEl.textContent = "Đã hoàn thành bài kiểm tra.";
    if (answerInput) answerInput.disabled = true;
    // allow the main button to return to the current test list
    finished = true;
    if (checkBtn) {
      checkBtn.disabled = false;
      checkBtn.textContent = "Hoàn thành";
      checkBtn.classList.remove("next-btn");
    }
    if (remainingEl) remainingEl.textContent = "0";
    updateProgress();
    if (feedbackEl) {
      showFeedback("correct", `Mức độ: ${getEvaluationText()}`);
    }
  }

  function showQuestion() {
    if (!questions.length) {
      questionEl.textContent =
        "Chưa có dữ liệu câu hỏi. Vui lòng import file Excel.";
      return;
    }

    clampIndex();
    if (currentIndex >= questions.length) {
      saveProgressState(totalQuestions);
      showCompletion();
      return;
    }

    setCheckMode();
    clearFeedback();

    const q = getCurrentQuestion();
    renderQuestionPrompt(q);
    questionEl.dataset.chinese = q.chinese;
    questionEl.dataset.pinyin = q.pinyin;

    const remaining = Math.max(0, totalQuestions - currentIndex);
    if (remainingEl) remainingEl.textContent = String(remaining);
    if (reflexFlagBtn) {
      reflexFlagBtn.classList.toggle("is-active", flaggedQuestions.has(currentIndex));
    }

    updateProgress();
    saveProgressState();

    if (answerInput) {
      answerInput.value = "";
      answerInput.disabled = false;
      answerInput.focus();
    }
  }

  function nextQuestion() {
    if (!questions.length) return;

    if (currentIndex < questions.length - 1) {
      currentIndex += 1;
      showQuestion();
    } else {
      saveProgressState(totalQuestions);
      showCompletion();
    }
  }

  function checkAnswer() {
    if (!questions.length || showingResult) return;

    const q = getCurrentQuestion();
    const userAnswer = answerInput ? answerInput.value : "";

    if (!userAnswer.trim()) {
      if (answerInput) answerInput.focus();
      return;
    }

    const isCorrect =
      normalizeAnswer(userAnswer) === normalizeAnswer(q.chinese);

    if (answerInput) answerInput.disabled = true;

    if (isCorrect) {
      if (isReflexTyping) {
        if (answerStates[currentIndex] !== "correct") exp += 1;
        answerStates[currentIndex] = "correct";
      } else {
        exp += 1;
      }
      updateExpDisplay();
      showCorrectResult(q);
      // speak the correct answer on success for reinforcement
      if (q.chinese || q.pinyin) {
        speakText(q.chinese || q.pinyin, "zh-CN");
      }
    } else {
      if (isReflexTyping) {
        if (answerStates[currentIndex] === "correct") exp = Math.max(0, exp - 1);
        answerStates[currentIndex] = "wrong";
        updateExpDisplay();
      }
      showWrongResult(q, userAnswer);
      // speak the correct answer when the response is wrong
      if (q.chinese || q.pinyin) {
        speakText(q.chinese || q.pinyin, "zh-CN");
      }
    }

    setNextMode();
    saveProgressState(currentIndex + 1);
    updateReflexStats();
    renderReflexQuestionGrid();
  }

  function onMainAction() {
    if (checkBtn.disabled) return;
    if (finished) {
      window.location.href = `review.html?lesson=${lesson}${subjectParam}${contentParam}`;
      return;
    }
    if (showingResult) {
      nextQuestion();
    } else {
      checkAnswer();
    }
  }

  function bindTapFallback(button, handler) {
    if (!button) return;
    let handledTouchAt = 0;
    button.addEventListener("touchend", (event) => {
      handledTouchAt = Date.now();
      event.preventDefault();
      handler(event);
    }, { passive: false });
    button.addEventListener("click", (event) => {
      if (Date.now() - handledTouchAt < 650) return;
      handler(event);
    });
  }

  bindTapFallback(checkBtn, onMainAction);

  if (soundBtn) {
    bindTapFallback(soundBtn, () => {
      if (isReflexTyping) {
        const q = getCurrentQuestion();
        if (q?.chinese || q?.pinyin) speakText(q.chinese || q.pinyin, "zh-CN");
        return;
      }
      const text =
        (questionEl &&
          (questionEl.dataset.chinese || questionEl.dataset.pinyin)) ||
        (questionEl && questionEl.textContent) ||
        "";
      if (text) speakText(text, "zh-CN");
    });
  }

  if (reflexPrevBtn) {
    reflexPrevBtn.addEventListener("click", () => {
      if (!questions.length || currentIndex <= 0) return;
      currentIndex -= 1;
      showQuestion();
    });
  }

  if (reflexNextBtn) {
    reflexNextBtn.addEventListener("click", () => {
      if (!questions.length) return;
      if (showingResult) {
        nextQuestion();
        return;
      }
      if (currentIndex < questions.length - 1) {
        currentIndex += 1;
        showQuestion();
      }
    });
  }

  if (reflexFlagBtn) {
    reflexFlagBtn.addEventListener("click", () => {
      if (!questions.length) return;
      if (flaggedQuestions.has(currentIndex)) {
        flaggedQuestions.delete(currentIndex);
      } else {
        flaggedQuestions.add(currentIndex);
      }
      saveFlagState();
      renderReflexQuestionGrid();
    });
  }

  if (toolBtn) {
    toolBtn.addEventListener("click", () => toggleCustomPanel(true));
  }

  if (customCloseBtn) {
    customCloseBtn.addEventListener("click", () => toggleCustomPanel(false));
  }

  if (voiceSelect) {
    voiceSelect.addEventListener("change", (e) => {
      saveVoiceSettings(e.target.value, parseFloat(speedRange.value) || 1);
    });
  }

  if (speedRange && speedValue) {
    speedRange.addEventListener("input", (e) => {
      const rate = parseFloat(e.target.value) || 1;
      speedValue.textContent = rate.toFixed(1);
      saveVoiceSettings(voiceSelect.value, rate);
    });
  }

  if (answerInput) {
    answerInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onMainAction();
      }
    });
  }

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = populateVoiceOptions;
  }
  loadProgressState();
  populateVoiceOptions();
  syncVoiceSettingsUI();
  updateExpDisplay();

  loadQuestions()
    .then(() => {
      if (!questions.length) {
        questionEl.textContent =
          "Không có câu hỏi cho bài kiểm tra này. Hãy import nghe1.xlsx trước.";
        return;
      }
      totalQuestions = questions.length;
      if (isReflexTyping) {
        answerStates = Array.from({ length: totalQuestions });
        loadFlagState();
      }
      loadProgressState();
      if (isReflexTyping && currentIndex > 0) {
        for (let i = 0; i < currentIndex; i += 1) {
          answerStates[i] = i < exp ? "correct" : "answered";
        }
      }
      showQuestion();
    })
    .catch((err) => {
      questionEl.textContent = `Lỗi: ${err.message}`;
    });
})();







