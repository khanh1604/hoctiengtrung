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

  let questions = [];
  let currentIndex = parseInt(
    sessionStorage.getItem("currentQuestion") || "0",
    10,
  );
  let exp = parseInt(sessionStorage.getItem(expKey) || "0", 10);
  let showingResult = false;
  let finished = false;
  let speakingExampleTestCount = 10;

  if (lessonEl) {
    lessonEl.textContent = `Bài ${lesson} - Kiểm tra ${String(testNum).padStart(2, "0")}`;
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeQuestion(item) {
    return {
      vietnamese: item.vietnamese || item.vi || "",
      chinese: item.chinese || item.zh || "",
      pinyin: item.pinyin || item.py || "",
    };
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

  function normalizeAnswer(text) {
    const s = String(text || "")
      .trim()
      .replace(/\s+/g, "");

    if (subject === "writing") {
      return s.replace(/[^\p{L}\p{N}\p{Script=Han}]/gu, "").toLowerCase();
    }

    const noPunct = s.replace(/[。，！？,.!?、；："'“”「」【】]+$/g, "");
    return noPunct.toLowerCase();
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

  function getSelectedVoice(voices) {
    const { voiceURI } = getSavedVoiceSettings();
    if (voiceURI) {
      const match = voices.find((v) => v.voiceURI === voiceURI);
      if (match) return match;
    }
    const preferredVoices = getLimitedVoiceOptions(voices);
    return preferredVoices[0]?.voice || voices.find((v) => v.lang && v.lang.startsWith("zh")) || voices[0];
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
        label: "Tiếng Trung 1",
        voice: findVoiceByLang(voices, "zh-CN", usedVoiceURIs),
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

  function getEvaluationText() {
    if (exp >= totalQuestions) return `Giỏi (${totalQuestions}/${totalQuestions} đúng)`;
    return `Khá (${exp}/${totalQuestions} đúng)`;
  }

  // Simple TTS helper using the Web Speech API
  function speakText(text, preferredLang = "zh-CN") {
    if (!window.speechSynthesis) return;
    const settings = getSavedVoiceSettings();
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    const utt = new SpeechSynthesisUtterance(String(text || ""));
    const selectedLang =
      voiceSelect?.selectedOptions?.[0]?.dataset?.lang || preferredLang;
    utt.lang = selectedLang;
    utt.rate = settings.rate;
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length) {
      const selectedVoice = getSelectedVoice(voices);
      if (selectedVoice) utt.voice = selectedVoice;
    }
    window.speechSynthesis.speak(utt);
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

    if (subject === "writing" && content === "grammar") {
      const lessonKey = String(Number(lesson));
      const grammar = allData.grammar || allData.grammarTests || {};
      const items = grammar[lesson] || grammar[lessonKey] || [];

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

      if (Array.isArray(items)) {
        if (Array.isArray(items[0])) {
          return (items[Number(testNum) - 1] || []).map(normalizeQuestion);
        }

        const start = (Number(testNum) - 1) * 20;
        const exampleQuestions = items.slice(start, start + 20);
        if (exampleQuestions.length) return exampleQuestions.map(normalizeQuestion);
      } else {
        const groupedItems = items[testNum] || items[String(Number(testNum))] || [];
        if (groupedItems.length) return groupedItems.map(normalizeQuestion);
      }
    }

    if (subject === "speaking" && content === "example") {
      const lessonNum = String(Number(lesson));
      if (lessonNum === "5") {
        const exampleItems = allData.example || [];
        const groups = splitIntoGroups(exampleItems, 20);
        return (groups[Number(testNum) - 1] || []).map(normalizeQuestion);
      }
      if (lessonNum !== "4") return [];

      const rawText = allData.__rawText || "";
      const items = parseTabSeparatedVocabulary(rawText);
      const groups = splitIntoGroups(items, 25);
      return (groups[Number(testNum) - 1] || []).map(normalizeQuestion);
    }

    if (subject === "speaking" && content === "grammar") {
      const lessonNum = String(Number(lesson));
      if (lessonNum === "5") {
        const grammarItems = allData.grammar || [];
        const groups = splitIntoGroups(grammarItems, 25);
        return (groups[Number(testNum) - 1] || []).map(normalizeQuestion);
      }
      if (lessonNum !== "4") return [];

      const rawText = allData.__rawText || "";
      const items = parseTabSeparatedVocabulary(rawText);
      const groups = splitIntoGroups(items, 25);
      return (groups[Number(testNum) - 1] || []).map(normalizeQuestion);
    }

    if (subject === "speaking" && content === "paragraph") {
      const lessonNum = String(Number(lesson));
      if (lessonNum === "5") {
        const paragraphItems = allData.paragraph || [];
        return paragraphItems.map(normalizeQuestion);
      }
      if (lessonNum !== "4") return [];
      const rawText = allData.__rawText || "";
      const items = parseTabSeparatedVocabulary(rawText);
      const groups = splitIntoGroups(items, 25);
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
    if (subject === "listening" && loadFromStorage()) return;

    const dataFile =
      subject === "writing"
        ? "data/writing-tests.json"
        : subject === "speaking"
          ? Number(lesson) === 5
            ? `data/speaking-lesson-5.json?v=${Date.now()}`
            : "data/speaking-lesson-4-raw.txt"
          : "data/nghe1-tests.json";
    const res = await fetch(dataFile);
    if (!res.ok) throw new Error("Không tải được dữ liệu câu hỏi");

    if (subject === "speaking") {
      if (Number(lesson) === 5) {
        const lessonData = await res.json();
        if (content === "example") {
          speakingExampleTestCount = Math.min(
            10,
            splitIntoGroups(lessonData.example || [], 20).length,
          );
        }
        questions = getTestQuestions(lessonData);
        return;
      }

      const rawText = await res.text();
      if (content === "example") {
        speakingExampleTestCount = Math.min(
          10,
          splitIntoGroups(parseTabSeparatedVocabulary(rawText), 25).length,
        );
      }
      questions = getTestQuestions({ __rawText: rawText, paragraph: [] });
      return;
    }

    const allData = await res.json();
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
    const pct = Math.min(100, (exp / totalQuestions) * 100);
    progressBar.style.width = `${pct}%`;
    if (completionNote) {
      if (currentIndex >= totalQuestions) {
        completionNote.textContent = `Hoàn thành: ${getEvaluationText()}`;
      } else {
        completionNote.textContent = `Đã đúng: ${exp}/${totalQuestions}`;
      }
    }
  }

  function setCheckMode() {
    showingResult = false;
    checkBtn.textContent = "Kiểm tra (Enter)";
    checkBtn.classList.remove("next-btn");
    checkBtn.disabled = false;
  }

  function setNextMode() {
    showingResult = true;
    checkBtn.textContent = "Tiếp theo (Enter)";
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

  function showCorrectResult() {
    if (answerInput) answerInput.classList.add("input-correct");
    showFeedback("correct", "✓ Chính xác!");
  }

  function showWrongResult(q, userAnswer) {
    if (answerInput) answerInput.classList.add("input-wrong");
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
    // allow check button to navigate to next test
    finished = true;
    if (checkBtn) {
      checkBtn.disabled = false;
      checkBtn.textContent = "Bài tiếp theo";
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
    questionEl.textContent = q.vietnamese;
    questionEl.dataset.chinese = q.chinese;
    questionEl.dataset.pinyin = q.pinyin;

    const remaining = Math.max(0, totalQuestions - currentIndex);
    if (remainingEl) remainingEl.textContent = String(remaining);

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
      checkBtn.disabled = true;
      checkBtn.textContent = `Đã hoàn thành ${totalQuestions} câu`;
      checkBtn.classList.remove("next-btn");
      if (remainingEl) remainingEl.textContent = "0";
      if (progressBar) progressBar.style.width = "100%";
      if (answerInput) answerInput.disabled = true;
      clearFeedback();
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
      exp += 1;
      updateExpDisplay();
      showCorrectResult();
      // speak the correct answer on success for reinforcement
      if (q.chinese || q.pinyin) {
        speakText(q.chinese || q.pinyin, "zh-CN");
      }
    } else {
      showWrongResult(q, userAnswer);
      // speak the correct answer when the response is wrong
      if (q.chinese || q.pinyin) {
        speakText(q.chinese || q.pinyin, "zh-CN");
      }
    }

    setNextMode();
    saveProgressState(currentIndex + 1);
  }

  function onMainAction() {
    if (checkBtn.disabled) return;
    if (finished) {
      const nextTestNum = Number(testNum) + 1;
      const maxTests =
        subject === "writing" && content === "paragraph"
          ? 1
          : subject === "writing" && content === "grammar"
          ? 4
              : subject === "writing" && !content
              ? 4
              : subject === "speaking" && content === "paragraph" && (Number(lesson) === 4 || Number(lesson) === 5)
                ? 1
              : subject === "speaking" && content === "grammar" && (Number(lesson) === 4 || Number(lesson) === 5)
                ? 2
              : subject === "speaking" && content === "example" && Number(lesson) === 5
                ? Math.max(1, speakingExampleTestCount)
              : subject === "speaking" && content === "example" && Number(lesson) === 4
                ? Math.max(1, speakingExampleTestCount)
              : subject !== "writing" && content === "listening" && Number(lesson) === 1
                ? 5
              : 10;
      if (nextTestNum > maxTests) {
        // no more tests: go back to review
        window.location.href = `review.html?lesson=${lesson}${subjectParam}${contentParam}`;
      } else {
        // navigate to next test
        window.location.href = `typing.html?lesson=${lesson}&test=${nextTestNum}${subjectParam}${contentParam}`;
      }
      return;
    }
    if (showingResult) {
      nextQuestion();
    } else {
      checkAnswer();
    }
  }

  checkBtn.addEventListener("click", onMainAction);

  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      const text =
        (questionEl &&
          (questionEl.dataset.chinese || questionEl.dataset.pinyin)) ||
        (questionEl && questionEl.textContent) ||
        "";
      if (text) speakText(text, "zh-CN");
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
      loadProgressState();
      showQuestion();
    })
    .catch((err) => {
      questionEl.textContent = `Lỗi: ${err.message}`;
    });
})();
