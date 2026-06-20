// =========================================================
// DOM references
// =========================================================
const themeToggleButton = document.getElementById("themeToggleButton");
const themeToggleLabel = document.getElementById("themeToggleLabel");
const courseGrid = document.getElementById("courseGrid");
const dashboardToast = document.getElementById("dashboardToast");
const dashboardDrawer = document.getElementById("dashboardDrawer");
const dashboardMenuToggles = document.querySelectorAll(".dashboard-menu-toggle");
const dashboardDrawerBackdrop = document.querySelector(".dashboard-drawer-backdrop");
const dashboardDrawerClose = document.querySelector(".dashboard-drawer-close");

const courseGroups = [
  {
    id: "hanyu",
    title: "Giáo trình Hán Ngữ",
    color: "blue",
    icon: "📘",
    href: "lessons.html?subject=hanyu3",
    courses: [
      {
        title: "Hán Ngữ Quyển 1",
        meta: "15 bài · nhập môn",
        href: "lessons.html?subject=hanyu1",
        unlocked: true,
      },
      { title: "Hán Ngữ Quyển 2", meta: "0 bài · đang khóa" },
      {
        title: "Hán Ngữ Quyển 3",
        meta: "Đọc hiểu · 0 bài đã học",
        href: "lessons.html?subject=hanyu3",
        unlocked: true,
      },
      { title: "Hán Ngữ Quyển 4", meta: "0 bài · đang khóa" },
      { title: "Hán Ngữ Quyển 5", meta: "0 bài · đang khóa" },
      { title: "Hán Ngữ Quyển 6", meta: "0 bài · đang khóa" },
    ],
  },
  {
    id: "speaking",
    title: "Khẩu ngữ",
    color: "green",
    icon: "💬",
    href: "lessons.html?subject=speaking",
    courses: [
      { title: "初级口语（I）", meta: "0 bài · đang khóa" },
      {
        title: "初级口语（II）",
        meta: "Luyện nói · 0 bài đã học",
        href: "lessons.html?subject=speaking",
        unlocked: true,
      },
      { title: "中级口语（I）", meta: "0 bài · đang khóa" },
      { title: "中级口语（II）", meta: "0 bài · đang khóa" },
      { title: "高级口语", meta: "0 bài · đang khóa" },
    ],
  },
  {
    id: "listening",
    title: "Nghe hiểu",
    color: "violet",
    icon: "🎧",
    href: "lessons.html",
    courses: [
      { title: "初级听力（I）", meta: "0 bài · đang khóa" },
      {
        title: "初级听力（II）",
        meta: "Luyện nghe · 0 bài đã học",
        href: "lessons.html",
        unlocked: true,
      },
      { title: "中级听力（I）", meta: "0 bài · đang khóa" },
      { title: "中级听力（II）", meta: "0 bài · đang khóa" },
      { title: "高级听力", meta: "0 bài · đang khóa" },
    ],
  },
  {
    id: "writing",
    title: "Viết",
    color: "amber",
    icon: "✍️",
    href: "lessons.html?subject=writing",
    courses: [
      { title: "初级写作", meta: "0 bài · đang khóa" },
      {
        title: "中级写作（I）",
        meta: "Luyện viết · 0 bài đã học",
        href: "lessons.html?subject=writing",
        unlocked: true,
      },
      { title: "中级写作（II）", meta: "0 bài · đang khóa" },
      { title: "高级写作", meta: "0 bài · đang khóa" },
    ],
  },
];

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showDashboardToast(message) {
  if (!dashboardToast) return;
  dashboardToast.textContent = message;
  dashboardToast.classList.add("is-visible");
  window.clearTimeout(showDashboardToast.timer);
  showDashboardToast.timer = window.setTimeout(() => {
    dashboardToast.classList.remove("is-visible");
  }, 1800);
}

function setDashboardDrawer(open) {
  if (!dashboardDrawer) return;
  dashboardDrawer.hidden = !open;
  document.body.classList.toggle("dashboard-menu-open", open);
  dashboardMenuToggles.forEach((button) => {
    button.setAttribute("aria-expanded", String(open));
  });
}

function renderCourseGroups() {
  if (!courseGrid) return;

  courseGrid.innerHTML = courseGroups
    .map(
      (group) => `
        <article class="course-panel panel-${group.color}" data-course-group="${escapeHtml(group.id)}">
          <button class="course-panel-head" type="button" aria-expanded="true">
            <span class="course-panel-icon" aria-hidden="true">${group.icon}</span>
            <span>${escapeHtml(group.title)}</span>
            <span class="course-panel-caret" aria-hidden="true">⌄</span>
          </button>
          <div class="course-list">
            ${group.courses
              .map((course) => {
                const unlocked = Boolean(course.unlocked && course.href);
                const href = unlocked ? course.href : "#";
                return `
                  <a class="course-link${unlocked ? "" : " is-disabled"}"
                    href="${escapeHtml(href)}"
                    ${unlocked ? "" : 'data-locked="true" aria-disabled="true"'}
                  >
                    <span>
                      <strong>${escapeHtml(course.title)}</strong>
                      <small>${escapeHtml(course.meta)}</small>
                    </span>
                    <span class="course-link-state" aria-hidden="true">${unlocked ? "›" : "🔒"}</span>
                  </a>
                `;
              })
              .join("")}
          </div>
        </article>
      `,
    )
    .join("");
}

function installCourseHandlers() {
  courseGrid?.addEventListener("click", (event) => {
    const head = event.target.closest(".course-panel-head");
    if (head) {
      const panel = head.closest(".course-panel");
      const collapsed = panel.classList.toggle("is-collapsed");
      head.setAttribute("aria-expanded", String(!collapsed));
      return;
    }

    const locked = event.target.closest("[data-locked='true']");
    if (locked) {
      event.preventDefault();
      showDashboardToast("Khóa học đang khóa");
    }
  });

  document.querySelectorAll("[data-locked='true']").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      showDashboardToast("Khóa học đang khóa");
    });
  });
}

// =========================================================
// Event listeners
// =========================================================
themeToggleButton?.addEventListener("click", () => {
  applyDashboardTheme(
    document.body.classList.contains("light-theme") ? "dark" : "light",
  );
});

dashboardMenuToggles.forEach((button) => {
  button.addEventListener("click", () => {
    setDashboardDrawer(dashboardDrawer?.hidden ?? true);
  });
});

dashboardDrawerBackdrop?.addEventListener("click", () => setDashboardDrawer(false));
dashboardDrawerClose?.addEventListener("click", () => setDashboardDrawer(false));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setDashboardDrawer(false);
  }
});

// =========================================================
// Initialisation
// =========================================================
renderCourseGroups();
installCourseHandlers();
applyDashboardTheme(localStorage.getItem("menuTheme") || "dark");

