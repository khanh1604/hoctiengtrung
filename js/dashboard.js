// =========================================================
// DOM references
// =========================================================
const themeToggleButton = document.getElementById("themeToggleButton");
const themeToggleLabel = document.getElementById("themeToggleLabel");

// =========================================================
// UI handlers
// =========================================================
function applyDashboardTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("light-theme", isLight);
  themeToggleButton?.classList.toggle("is-light", isLight);
  themeToggleButton?.setAttribute("aria-pressed", String(isLight));
  if (themeToggleLabel) {
    themeToggleLabel.textContent = isLight ? "Nền sáng" : "Bóng đêm";
  }
  localStorage.setItem("menuTheme", theme);
}

// =========================================================
// Event listeners
// =========================================================
themeToggleButton?.addEventListener("click", () => {
  applyDashboardTheme(
    document.body.classList.contains("light-theme") ? "dark" : "light",
  );
});

// =========================================================
// Initialisation
// =========================================================
applyDashboardTheme(localStorage.getItem("menuTheme") || "dark");

