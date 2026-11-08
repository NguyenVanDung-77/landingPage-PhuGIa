
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "./LoginPage.css";

const API_BASE = "http://localhost:8080";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Chuyển hướng theo quyền tài khoản
  const redirectByRole = (user) => {
    if (user.role === "ADMIN") {
      navigate("/admin", { replace: true });
    } else if (user.role === "USER") {
      navigate("/", { replace: true });
    } else {
      throw new Error(
        "Tài khoản chưa được cấp quyền truy cập."
      );
    }
  };

  // Kiểm tra phiên đăng nhập sau khi Google chuyển về React
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

    let cancelled = false;

    const checkGoogleLogin = async () => {
      setGoogleLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE}/api/auth/me`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Không thể xác minh phiên đăng nhập Google."
          );
        }

        const user = await response.json();

        if (cancelled) return;

        redirectByRole(user);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              "Có lỗi xảy ra khi đăng nhập Google."
          );
        }
      } finally {
        if (!cancelled) {
          setGoogleLoading(false);
        }
      }
    };

    checkGoogleLogin();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  // Đăng nhập bằng username/password
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || googleLoading) return;

    setError("");
    setLoading(true);

    try {
      const csrfResponse = await fetch(
        `${API_BASE}/api/auth/csrf`,
        {
          credentials: "include",
        }
      );

      if (!csrfResponse.ok) {
        throw new Error(
          "Không thể kết nối máy chủ xác thực."
        );
      }

      const csrf = await csrfResponse.json();

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

        throw new Error(
          "Đăng nhập thất bại. Vui lòng thử lại."
        );
      }

      const meResponse = await fetch(
        `${API_BASE}/api/auth/me`,
        {
          credentials: "include",
        }
      );

      if (!meResponse.ok) {
        throw new Error(
          "Không thể xác định quyền tài khoản."
        );
      }

      const user = await meResponse.json();

      redirectByRole(user);
    } catch (err) {
      setError(
        err.message || "Có lỗi xảy ra khi đăng nhập."
      );
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập bằng Google OAuth2
  const handleGoogleLogin = () => {
    if (loading || googleLoading) return;

    setError("");
    setGoogleLoading(true);

    // Spring Security xử lý xác thực Google.
    // Không cần gửi mật khẩu Google qua React.
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

        {/* Phân cách hai phương thức đăng nhập */}
        <div className="pg-login-divider">
          <span>HOẶC</span>
        </div>

        {/* Đăng nhập Google */}
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
              ? "Đang kết nối Google..."
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
