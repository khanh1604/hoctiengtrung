(function () {
  const STORAGE_KEY = "menuTheme";

  function getSavedTheme() {
    return localStorage.getItem(STORAGE_KEY) || "dark";
  }

  function setTheme(theme) {
    const isLight = theme === "light";
    document.body.classList.toggle("light-theme", isLight);
    localStorage.setItem(STORAGE_KEY, theme);

    const toggleButton = document.getElementById("themeToggleButton");
    const toggleLabel = document.getElementById("themeToggleLabel");
    if (!toggleButton) return;

    toggleButton.classList.toggle("is-light", isLight);
    toggleButton.setAttribute("aria-pressed", String(isLight));
    if (toggleLabel) {
      toggleLabel.textContent = isLight ? "☀️ Nền Sáng" : "🌙 Bóng Đêm";
    }
  }

  function initTheme() {
    setTheme(getSavedTheme());
    installChineseFontMarker();

  }

  function installChineseFontMarker() {
    if (document.body?.classList.contains("ftc-dashboard")) return;

    const cjkPattern = /[\u3400-\u9fff\uf900-\ufaff]/;
    const cjkChunkPattern = /[\u3400-\u9fff\uf900-\ufaff][\u3400-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef\s]*/g;
    const ignoredTags = new Set([
      "SCRIPT",
      "STYLE",
      "TEXTAREA",
      "INPUT",
      "SELECT",
      "OPTION",
      "CODE",
      "PRE",
    ]);

    function shouldSkip(node) {
      const parent = node.parentElement;
      if (!parent || ignoredTags.has(parent.tagName)) return true;
      return parent.closest("[data-skip-zh-font], .zh-auto, .no-zh-font");
    }

    function markTextNode(node) {
      const value = node.nodeValue;
      if (!value || !cjkPattern.test(value) || shouldSkip(node)) return;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      value.replace(cjkChunkPattern, (match, offset) => {
        if (offset > lastIndex) {
          fragment.append(document.createTextNode(value.slice(lastIndex, offset)));
        }

        const span = document.createElement("span");
        span.className = "zh-auto";
        span.lang = "zh";
        span.textContent = match;
        fragment.append(span);
        lastIndex = offset + match.length;
        return match;
      });

      if (lastIndex < value.length) {
        fragment.append(document.createTextNode(value.slice(lastIndex)));
      }

      node.parentNode.replaceChild(fragment, node);
    }

    function scan(root) {
      if (!root || ignoredTags.has(root.tagName)) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(markTextNode);
    }

    scan(document.body);

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        scan(document.body);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme);
  } else {
    initTheme();
  }
})();
