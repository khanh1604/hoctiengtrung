import {
  isSupabaseConfigured,
  requireSupabaseConfig,
  supabase,
} from "./supabaseClient.js";

const DEFAULT_REDIRECT = "index.html";

function sameOriginRedirect(value) {
  if (!value) return DEFAULT_REDIRECT;

  try {
    const url = new URL(value, window.location.href);
    if (url.origin !== window.location.origin) return DEFAULT_REDIRECT;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_REDIRECT;
  }
}

function friendlyAuthError(error) {
  const message = String(error?.message || error || "").toLowerCase();

  if (!isSupabaseConfigured) {
    return "Chưa cấu hình Supabase. Vui lòng điền URL và anon key trong js/supabaseClient.js.";
  }

  if (message.includes("already") || message.includes("registered")) {
    return "Email này đã tồn tại. Hãy đăng nhập hoặc dùng email khác.";
  }

  if (message.includes("invalid login credentials")) {
    return "Email hoặc mật khẩu không đúng.";
  }

  if (message.includes("email not confirmed")) {
    return "Email chưa được xác nhận. Hãy kiểm tra hộp thư của bạn.";
  }

  if (message.includes("password") && message.includes("6")) {
    return "Mật khẩu cần có ít nhất 6 ký tự.";
  }

  if (message.includes("network")) {
    return "Không kết nối được Supabase. Hãy kiểm tra mạng rồi thử lại.";
  }

  return error?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
}

async function fetchProfile(userId) {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Không tải được profile:", error.message);
    return null;
  }

  return data;
}

function profileFromUser(user) {
  const metadata = user?.user_metadata || {};
  const email = user?.email || "";
  return {
    id: user?.id,
    email,
    full_name:
      metadata.full_name ||
      metadata.name ||
      metadata.user_name ||
      metadata.preferred_username ||
      (email ? email.split("@")[0] : null),
    username: metadata.user_name || metadata.preferred_username || null,
    avatar_url: metadata.avatar_url || metadata.picture || null,
  };
}

async function ensureProfile(user) {
  if (!supabase || !user?.id) return null;

  const fallbackProfile = profileFromUser(user);
  let profile = await fetchProfile(user.id);
  const needsUpsert =
    !profile ||
    !profile.full_name ||
    (!profile.avatar_url && fallbackProfile.avatar_url);

  if (!needsUpsert) return profile;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(fallbackProfile, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (error) {
    console.warn("Khong dong bo duoc profile:", error.message);
    return profile || fallbackProfile;
  }

  return data || profile || fallbackProfile;
}

function normalizeStatRow(row = {}) {
  return {
    streakDays: Number(row.streak_days || 0),
    lastLoginDate: row.last_login_date || null,
    totalExp: Number(row.total_exp || 0),
    totalUniqueCorrect: Number(row.total_unique_correct || 0),
    currentLevel: Number(row.current_level || 0),
    todayLessonCount: Number(row.today_lesson_count || 0),
  };
}

function stableHash(value) {
  const text = String(value || "");
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function cleanIdPart(value, fallback = "unknown") {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || fallback;
}

function buildQuestionId(payload = {}) {
  if (payload.questionId) return String(payload.questionId);
  const course = cleanIdPart(payload.courseId || payload.subject || "course");
  const lesson = cleanIdPart(payload.lessonId || payload.lesson || "lesson");
  const type = cleanIdPart(payload.exerciseType || payload.content || "test");
  const seed = [
    payload.question,
    payload.prompt,
    payload.answer,
    payload.correctAnswer,
  ]
    .filter((part) => part !== undefined && part !== null && String(part).trim())
    .join("|");
  return `${course}_${lesson}_${type}_${stableHash(seed || JSON.stringify(payload))}`;
}

function authEventName() {
  return "ftc-auth-ready";
}

export const AuthContext = {
  user: null,
  session: null,
  profile: null,
  loading: true,
  error: null,
  isSupabaseConfigured,

  getRedirectTarget() {
    const params = new URLSearchParams(window.location.search);
    return sameOriginRedirect(params.get("redirect"));
  },

  async init() {
    this.loading = true;
    this.error = null;

    if (!supabase) {
      this.loading = false;
      this.error = friendlyAuthError();
      window.dispatchEvent(new CustomEvent(authEventName(), { detail: this }));
      return this;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      this.error = friendlyAuthError(error);
    }

    this.session = data?.session || null;
    this.user = this.session?.user || null;
    this.profile = this.user ? await ensureProfile(this.user) : null;
    this.loading = false;

    window.dispatchEvent(new CustomEvent(authEventName(), { detail: this }));

    supabase.auth.onAuthStateChange(async (_event, session) => {
      this.session = session || null;
      this.user = session?.user || null;
      this.profile = this.user ? await ensureProfile(this.user) : null;
      this.loading = false;
      window.dispatchEvent(new CustomEvent(authEventName(), { detail: this }));
    });

    return this;
  },

  async signUp({ email, password, fullName, username }) {
    const client = requireSupabaseConfig();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: username || null,
        },
      },
    });

    if (error) throw new Error(friendlyAuthError(error));

    if (data?.user) {
      const { error: profileError } = await client.from("profiles").upsert(
        {
          id: data.user.id,
          email,
          full_name: fullName,
          username: username || null,
        },
        { onConflict: "id" },
      );

      if (profileError) {
        console.warn(
          "Profile sẽ được tạo bằng Supabase trigger sau khi xác nhận email:",
          profileError.message,
        );
      }
    }

    return data;
  },

  async signIn({ email, password }) {
    const client = requireSupabaseConfig();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(friendlyAuthError(error));
    return data;
  },

  async signInWithGoogle() {
    const client = requireSupabaseConfig();
    const params = new URLSearchParams(window.location.search);
    const redirectTarget = sameOriginRedirect(params.get("redirect"));
    const redirectTo = new URL(redirectTarget, window.location.href).href;
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) throw new Error(friendlyAuthError(error));
    return data;
  },

  async signOut() {
    const client = requireSupabaseConfig();
    await client.auth.signOut();
    window.location.href = "login.html";
  },

  async saveProgress(payload) {
    const client = requireSupabaseConfig();
    if (!this.user) throw new Error("Bạn cần đăng nhập để lưu tiến độ.");

    return client.from("user_progress").upsert(
      {
        user_id: this.user.id,
        subject: payload.subject,
        lesson: payload.lesson,
        content: payload.content || "lesson",
        progress: payload.progress ?? 0,
        score: payload.score ?? 0,
        total: payload.total ?? 0,
        last_position: payload.lastPosition || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,subject,lesson,content" },
    );
  },

  async saveWord(payload) {
    const client = requireSupabaseConfig();
    if (!this.user) throw new Error("Bạn cần đăng nhập để lưu từ mới.");

    return client.from("saved_words").upsert(
      {
        user_id: this.user.id,
        subject: payload.subject,
        lesson: payload.lesson,
        chinese: payload.chinese,
        pinyin: payload.pinyin || "",
        vietnamese: payload.vietnamese || "",
        note: payload.note || "",
      },
      { onConflict: "user_id,subject,lesson,chinese" },
    );
  },

  async saveNote(payload) {
    const client = requireSupabaseConfig();
    if (!this.user) throw new Error("Bạn cần đăng nhập để lưu ghi chú.");

    return client.from("user_notes").upsert(
      {
        user_id: this.user.id,
        subject: payload.subject,
        lesson: payload.lesson,
        content: payload.content || "general",
        note: payload.note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,subject,lesson,content" },
    );
  },

  async saveWrongAnswer(payload) {
    const client = requireSupabaseConfig();
    if (!this.user) throw new Error("Bạn cần đăng nhập để lưu lỗi sai.");

    return client.from("wrong_answers").insert({
      user_id: this.user.id,
      subject: payload.subject,
      lesson: payload.lesson,
      content: payload.content || "test",
      question: payload.question || "",
      user_answer: payload.userAnswer || "",
      correct_answer: payload.correctAnswer || "",
      metadata: payload.metadata || {},
    });
  },

  async markDailyLogin() {
    const client = requireSupabaseConfig();
    if (!this.user) return null;

    const { data, error } = await client.rpc("mark_daily_login");
    if (error) throw new Error(error.message);
    return normalizeStatRow(Array.isArray(data) ? data[0] : data);
  },

  async getDashboardStats() {
    const client = requireSupabaseConfig();
    if (!this.user) return normalizeStatRow();

    const { data, error } = await client.rpc("get_dashboard_stats");
    if (error) throw new Error(error.message);
    return normalizeStatRow(Array.isArray(data) ? data[0] : data);
  },

  async markLessonActivity(payload = {}) {
    const client = requireSupabaseConfig();
    if (!this.user) return { todayLessonCount: 0 };

    const lessonId = payload.lessonId || payload.lesson || payload.lesson_id;
    if (!lessonId) return { todayLessonCount: 0 };

    const { data, error } = await client.rpc("mark_lesson_activity", {
      p_lesson_id: String(lessonId),
      p_course_id: String(payload.courseId || payload.subject || ""),
    });

    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return { todayLessonCount: Number(row?.today_lesson_count || 0) };
  },

  async awardCorrectAnswer(payload = {}) {
    const client = requireSupabaseConfig();
    if (!this.user) return null;

    const questionId = buildQuestionId(payload);
    const { data, error } = await client.rpc("award_correct_answer", {
      p_question_id: questionId,
      p_course_id: String(payload.courseId || payload.subject || ""),
      p_lesson_id: String(payload.lessonId || payload.lesson || ""),
      p_exercise_type: String(payload.exerciseType || payload.content || "test"),
    });

    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return {
      questionId,
      newExpAwarded: Boolean(row?.new_exp_awarded),
      alreadyAwarded: Boolean(row?.already_awarded),
      ...normalizeStatRow(row),
    };
  },
};

window.AuthContext = AuthContext;
window.FTCAuth = AuthContext;
window.FTCStats = {
  buildQuestionId,
  markLessonActivity: (payload) => AuthContext.markLessonActivity(payload),
  awardCorrectAnswer: (payload) => AuthContext.awardCorrectAnswer(payload),
  getDashboardStats: () => AuthContext.getDashboardStats(),
  markDailyLogin: () => AuthContext.markDailyLogin(),
};
