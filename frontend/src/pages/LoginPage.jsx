
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "./LoginPage.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const getRolePath = (role) => {
  switch (String(role || "").toUpperCase()) {
    case "ADMIN":
      return "/admin";
    case "USER":
      return "/";
    default:
      return null;
  }
};

async function getCurrentUserWithRetry(attempts = 4) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(
        `${API_BASE}/api/auth/me`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (response.ok) {
        const user = await response.json();

        if (user?.enabled === false) {
          throw new Error("Tài khoản đã bị khóa.");
        }

        if (getRolePath(user?.role) !== null) {
          return user;
        }

        throw new Error(
          "Tài khoản chưa được cấp quyền truy cập."
        );
      }

      if (response.status === 403) {
        throw new Error("Tài khoản không có quyền truy cập.");
      }

      lastError = new Error(
        "Chưa xác minh được phiên đăng nhập."
      );
    } catch (error) {
      lastError = error;

      if (
        error.message === "Tài khoản đã bị khóa." ||
        error.message ===
          "Tài khoản chưa được cấp quyền truy cập." ||
        error.message ===
          "Tài khoản không có quyền truy cập."
      ) {
        throw error;
      }
    }

    if (attempt < attempts - 1) {
      await sleep(400 * (attempt + 1));
    }
  }

  throw lastError || new Error(
    "Không thể xác minh phiên đăng nhập."
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const googleCheckedRef = useRef(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectByRole = (role) => {
    const destination = getRolePath(role);

    if (destination === null) {
      throw new Error(
        "Tài khoản chưa được cấp quyền truy cập."
      );
    }

    navigate(destination, { replace: true });
  };

  // Kiểm tra đăng nhập Google sau khi backend chuyển về
  useEffect(() => {
    const googleStatus = searchParams.get("google_login");

    if (googleStatus === "error") {
      setError(
        "Đăng nhập Google thất bại. Vui lòng thử lại."
      );
      return;
    }

    if (googleStatus !== "success") {
      return;
    }

    if (googleCheckedRef.current) {
      return;
    }

    googleCheckedRef.current = true;

    let active = true;

    const verifyGoogleLogin = async () => {
      setGoogleLoading(true);
      setError("");

      try {
        const user = await getCurrentUserWithRetry(5);

        if (!active) return;

        redirectByRole(user.role);
      } catch (err) {
        if (!active) return;

        setError(
          err.message ||
            "Không thể xác minh đăng nhập Google."
        );

        setGoogleLoading(false);
      }
    };

    verifyGoogleLogin();

    return () => {
      active = false;
    };
  }, [searchParams, navigate]);

  // Đăng nhập username/password
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || googleLoading) return;

    setError("");
    setLoading(true);

    let loginSucceeded = false;

    try {
      const csrfResponse = await fetch(
        `${API_BASE}/api/auth/csrf`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!csrfResponse.ok) {
        throw new Error(
          "Không thể kết nối máy chủ xác thực."
        );
      }

      const csrf = await csrfResponse.json();

      if (!csrf?.headerName || !csrf?.token) {
        throw new Error(
          "Không nhận được mã bảo mật CSRF."
        );
      }

      const body = new URLSearchParams({
        username: username.trim(),
        password,
      });

      const loginResponse = await fetch(
        `${API_BASE}/api/auth/login`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
            Accept: "application/json",
            [csrf.headerName]: csrf.token,
          },
          body: body.toString(),
        }
      );

      if (!loginResponse.ok) {
        if (loginResponse.status === 401) {
          throw new Error(
            "Tên đăng nhập hoặc mật khẩu không đúng."
          );
        }

        if (loginResponse.status === 403) {
          throw new Error(
            "Phiên bảo mật đã hết hạn hoặc tài khoản không được phép đăng nhập. Vui lòng thử lại."
          );
        }

        throw new Error(
          "Đăng nhập thất bại. Vui lòng thử lại."
        );
      }

      let loginData = {};

      try {
        loginData = await loginResponse.json();
      } catch {
        loginData = {};
      }

      if (loginData.success === false) {
        throw new Error(
          loginData.message || "Đăng nhập thất bại."
        );
      }

      loginSucceeded = true;

      // Backend mới trả về role ngay khi đăng nhập thành công.
      // Không phụ thuộc vào lần gọi /me tức thời.
      if (getRolePath(loginData.role) !== null) {
        redirectByRole(loginData.role);
        return;
      }

      // Tương thích backend cũ nếu chưa deploy cập nhật.
      const user = await getCurrentUserWithRetry(5);

      redirectByRole(user.role);
    } catch (err) {
      if (loginSucceeded) {
        setError(
          "Đăng nhập đã được chấp nhận nhưng chưa thể xác minh quyền. Vui lòng thử tải lại trang."
        );
      } else {
        setError(
          err.message || "Có lỗi xảy ra khi đăng nhập."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập Google OAuth2
  const handleGoogleLogin = () => {
    if (loading || googleLoading) return;

    setError("");
    setGoogleLoading(true);

    window.location.assign(
      `${API_BASE}/oauth2/authorization/google`
    );
  };

  return (
    <div className="pg-login-page">
      <div className="pg-login-card">
        <Link to="/" className="pg-login-brand">
          <span className="pg-login-brand-icon">
            PG
          </span>

          <span>
            <strong>PHÚ GIA</strong>
            <small>ROYAL PARK</small>
          </span>
        </Link>

        <div className="pg-login-heading">
          <span className="pg-login-eyebrow">
            HỆ THỐNG PHÚ GIA ROYAL PARK
          </span>

          <h1>Đăng nhập tài khoản</h1>

          <p>
            Đăng nhập để truy cập hệ thống theo
            quyền được cấp.
          </p>
        </div>

        <form
          className="pg-login-form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="pg-username">
            Tên đăng nhập
          </label>

          <input
            id="pg-username"
            type="text"
            autoComplete="username"
            placeholder="Nhập tên đăng nhập"
            value={username}
            onChange={(event) =>
              setUsername(event.target.value)
            }
            required
            disabled={loading || googleLoading}
          />

          <label htmlFor="pg-password">
            Mật khẩu
          </label>

          <div className="pg-login-password">
            <input
              id="pg-password"
              type={
                showPassword ? "text" : "password"
              }
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              disabled={loading || googleLoading}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword((prev) => !prev)
              }
              disabled={loading || googleLoading}
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>

          {error && (
            <p
              className="pg-login-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="pg-login-submit"
            type="submit"
            disabled={loading || googleLoading}
          >
            {loading
              ? "Đang đăng nhập..."
              : "Đăng nhập"}
          </button>
        </form>

        <div className="pg-login-divider">
          <span>HOẶC</span>
        </div>

        <button
          type="button"
          className="pg-login-google"
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
        >
          <svg
            className="pg-google-icon"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M21.35 12.24c0-.71-.06-1.39-.18-2.05H12v3.87h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.7 2.91-4.2 2.91-7.2z"
            />
            <path
              fill="#34A853"
              d="M12 21.75c2.62 0 4.82-.87 6.43-2.36l-3.14-2.44c-.87.58-1.98.93-3.29.93-2.53 0-4.67-1.71-5.44-4.01H3.33v2.52A9.74 9.74 0 0 0 12 21.75z"
            />
            <path
              fill="#FBBC05"
              d="M6.56 13.87a5.85 5.85 0 0 1 0-3.74V7.61H3.33a9.74 9.74 0 0 0 0 8.78l3.23-2.52z"
            />
            <path
              fill="#EA4335"
              d="M12 6.12c1.43 0 2.71.49 3.72 1.46l2.79-2.79A9.34 9.34 0 0 0 12 2.25a9.74 9.74 0 0 0-8.67 5.36l3.23 2.52c.77-2.3 2.91-4.01 5.44-4.01z"
            />
          </svg>

          <span>
            {googleLoading
              ? "Đang xác minh Google..."
              : "Tiếp tục với Google"}
          </span>
        </button>

        <div className="pg-login-footer">
          <Link to="/">
            ← Quay lại trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
