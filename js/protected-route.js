import { AuthContext } from "./auth-context.js";

const PUBLIC_PAGES = new Set(["index.html", "login.html", "register.html"]);

function currentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function redirectToLogin() {
  const redirect = encodeURIComponent(window.location.href);
  window.location.replace(`login.html?redirect=${redirect}`);
}

function fillAuthUi(ctx) {
  const profile = ctx.profile || {};
  const user = ctx.user || {};
  const fullName =
    profile.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "Học viên";
  const email = user.email || "";
  const avatar =
    profile.avatar_url ||
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    "";

  document.querySelectorAll("[data-auth-name]").forEach((node) => {
    node.textContent = `Xin chào, ${fullName}`;
  });

  document.querySelectorAll("[data-auth-email]").forEach((node) => {
    node.textContent = email ? `Lv. 0 · ${email}` : "Lv. 0 · 0 / 0 EXP";
  });

  document.querySelectorAll("[data-auth-avatar]").forEach((node) => {
    if (avatar) {
      node.textContent = "";
      node.style.backgroundImage = `url("${avatar}")`;
      node.style.backgroundSize = "cover";
      node.style.backgroundPosition = "center";
    } else {
      node.textContent = fullName.trim().charAt(0).toUpperCase() || "人";
    }
  });

  document.querySelectorAll("[data-auth-logout]").forEach((button) => {
    button.textContent = ctx.session ? "Đăng xuất" : "Đăng nhập";
    button.addEventListener("click", () => {
      if (ctx.session) {
        AuthContext.signOut();
        return;
      }
      window.location.href = "login.html";
    });
  });
}

function getCurrentRouteParts() {
  const params = new URLSearchParams(window.location.search);
  const subject = params.get("subject") || "hanyu3";
  const lesson = params.get("lesson") || "";
  const content = params.get("content") || params.get("section") || params.get("test") || "lesson";
  return { subject, lesson, content };
}

function makeLessonActivityId() {
  const { subject, lesson } = getCurrentRouteParts();
  if (!lesson) return "";
  return `${subject}_lesson_${String(lesson).padStart(2, "0")}`;
}

function formatLevel(value) {
  const level = Number(value || 0);
  return Number.isInteger(level) ? String(level) : String(level);
}

function fillDashboardStats(stats = {}) {
  const values = [
    stats.streakDays ?? 0,
    stats.totalExp ?? 0,
    `Lv. ${formatLevel(stats.currentLevel)}`,
    stats.todayLessonCount ?? 0,
  ];

  document.querySelectorAll(".stat-grid .stat-card strong").forEach((node, index) => {
    if (values[index] !== undefined) node.textContent = String(values[index]);
  });

  document.querySelectorAll("[data-auth-email]").forEach((node) => {
    node.textContent = `Lv. ${formatLevel(stats.currentLevel)} · ${stats.totalExp ?? 0} EXP`;
  });
}

async function refreshDashboardStats({ markLogin = false } = {}) {
  if (!AuthContext.session) return;
  try {
    if (markLogin) await AuthContext.markDailyLogin();
    fillDashboardStats(await AuthContext.getDashboardStats());
  } catch (error) {
    console.warn("Khong cap nhat duoc thong ke:", error.message);
  }
}

async function markCurrentLessonActivity() {
  if (!AuthContext.session) return;
  const lessonId = makeLessonActivityId();
  if (!lessonId) return;

  try {
    const { subject } = getCurrentRouteParts();
    await AuthContext.markLessonActivity({ subject, lessonId });
  } catch (error) {
    console.warn("Khong ghi nhan duoc bai hoc hom nay:", error.message);
  }
}

const page = currentPage();

if (page === "index.html") {
  await AuthContext.init();
  fillAuthUi(AuthContext);
  await refreshDashboardStats({ markLogin: true });
  document.documentElement.classList.add("auth-ready");
} else if (!PUBLIC_PAGES.has(page)) {
  await AuthContext.init();

  if (!AuthContext.session) {
    redirectToLogin();
  } else {
    fillAuthUi(AuthContext);
    await refreshDashboardStats({ markLogin: true });
    await markCurrentLessonActivity();
    document.documentElement.classList.add("auth-ready");
  }
}
