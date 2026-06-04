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

  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme);
  } else {
    initTheme();
  }
})();
