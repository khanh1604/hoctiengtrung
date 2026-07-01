import { AuthContext } from "./auth-context.js";

const $ = (selector) => document.querySelector(selector);

function setStatus(message, type = "error") {
  const status = $("#authStatus");
  if (!status) return;
  status.textContent = message || "";
  status.dataset.type = type;
  status.hidden = !message;
}

function setLoading(form, isLoading) {
  const button = form?.querySelector("[data-auth-submit]");
  if (!button) return;
  button.disabled = isLoading;
  button.dataset.loading = String(isLoading);
  button.textContent = isLoading ? "Đang xử lý..." : button.dataset.label;
}

function requireValue(form, name, message) {
  const input = form.elements[name];
  const value = String(input?.value || "").trim();
  if (!value) throw new Error(message);
  return value;
}

async function boot() {
  await AuthContext.init();
  if (AuthContext.session) {
    window.location.replace(AuthContext.getRedirectTarget());
    return;
  }

  const loginForm = $("#loginForm");
  const registerForm = $("#registerForm");
  const googleButtons = document.querySelectorAll("[data-google-login]");

  googleButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        setStatus("");
        button.disabled = true;
        await AuthContext.signInWithGoogle();
      } catch (error) {
        setStatus(error.message);
        button.disabled = false;
      }
    });
  });

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");
    setLoading(loginForm, true);

    try {
      const email = requireValue(loginForm, "email", "Bạn chưa nhập email.");
      const password = requireValue(
        loginForm,
        "password",
        "Bạn chưa nhập mật khẩu.",
      );
      await AuthContext.signIn({ email, password });
      window.location.replace(AuthContext.getRedirectTarget());
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(loginForm, false);
    }
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");
    setLoading(registerForm, true);

    try {
      const fullName = requireValue(
        registerForm,
        "fullName",
        "Bạn chưa nhập họ và tên.",
      );
      const email = requireValue(registerForm, "email", "Bạn chưa nhập email.");
      const username = String(registerForm.elements.username?.value || "").trim();
      const password = requireValue(
        registerForm,
        "password",
        "Bạn chưa nhập mật khẩu.",
      );
      const confirmPassword = requireValue(
        registerForm,
        "confirmPassword",
        "Bạn chưa xác nhận mật khẩu.",
      );
      const terms = registerForm.elements.terms?.checked;

      if (password.length < 6) {
        throw new Error("Mật khẩu cần có ít nhất 6 ký tự.");
      }

      if (password !== confirmPassword) {
        throw new Error("Mật khẩu xác nhận chưa khớp.");
      }

      if (!terms) {
        throw new Error("Bạn cần đồng ý điều khoản sử dụng.");
      }

      await AuthContext.signUp({ email, password, fullName, username });
      setStatus(
        "Đăng ký thành công. Nếu Supabase yêu cầu xác nhận email, hãy kiểm tra hộp thư trước khi đăng nhập.",
        "success",
      );
      setTimeout(() => {
        window.location.href = `login.html?redirect=${encodeURIComponent(
          AuthContext.getRedirectTarget(),
        )}`;
      }, 900);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(registerForm, false);
    }
  });
}

boot();
