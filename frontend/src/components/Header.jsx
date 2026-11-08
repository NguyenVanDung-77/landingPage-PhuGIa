
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Header.css";

const API_BASE = "http://localhost:8080";

const menuItems = [
  { label: "Trang chủ", href: "#trang-chu" },
  { label: "Tổng quan", href: "#tong-quan" },
  { label: "Vị trí", href: "#vi-tri" },
  { label: "Tiện ích", href: "#tien-ich" },
  { label: "Mặt bằng", href: "#mat-bang" },
  { label: "Phân khu", href: "#phan-khu" },
  { label: "Sản phẩm", href: "#san-pham" },
];

export default function Header() {
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  // Kiểm tra tài khoản đang đăng nhập
  const checkLogin = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/auth/me`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        setUser(null);
        return;
      }

      const data = await response.json();

      if (data.enabled === false) {
        setUser(null);
        return;
      }

      setUser(data);
    } catch (error) {
      console.error("Không thể kiểm tra đăng nhập:", error);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Kiểm tra khi Header được mở hoặc đổi trang
  useEffect(() => {
    checkLogin();
  }, [checkLogin, location.pathname, location.search]);

  // Kiểm tra lại khi quay về tab trình duyệt
  useEffect(() => {
    const handleFocus = () => {
      checkLogin();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkLogin]);

  // Mở form đăng ký tư vấn
  const openConsultation = () => {
    closeMenu();
    window.dispatchEvent(new Event("openConsultation"));
  };

  // Đăng xuất
  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      // Lấy CSRF token trước khi đăng xuất
      const csrfResponse = await fetch(
        `${API_BASE}/api/auth/csrf`,
        {
          credentials: "include",
        }
      );

      if (!csrfResponse.ok) {
        throw new Error("Không thể lấy mã bảo mật.");
      }

      const csrf = await csrfResponse.json();

      const logoutResponse = await fetch(
        `${API_BASE}/api/auth/logout`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            [csrf.headerName]: csrf.token,
          },
        }
      );

      if (!logoutResponse.ok) {
        throw new Error("Đăng xuất thất bại.");
      }

      setUser(null);
      closeMenu();

      window.location.assign("/");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      alert(
        error.message ||
          "Không thể đăng xuất. Vui lòng thử lại."
      );
    } finally {
      setLoggingOut(false);
    }
  };

  const displayName =
    user?.fullName?.trim() ||
    user?.username ||
    "Tài khoản";

  return (
    <header className="pg-header">
      <div className="pg-header-inner">
        <a
          className="pg-brand"
          href="#trang-chu"
          onClick={closeMenu}
        >
          <span className="pg-brand-icon">PG</span>

          <span className="pg-brand-text">
            <strong>PHÚ GIA</strong>
            <small>ROYAL PARK</small>
          </span>
        </a>

        <button
          className="pg-menu-toggle"
          type="button"
          aria-label={
            menuOpen ? "Đóng menu" : "Mở menu"
          }
          aria-expanded={menuOpen}
          aria-controls="pg-main-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <nav
          id="pg-main-navigation"
          className={`pg-navigation ${
            menuOpen ? "is-open" : ""
          }`}
          aria-label="Điều hướng chính"
        >
          {menuItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={closeMenu}
            >
              {item.label}
            </a>
          ))}

          <a
            href="#tu-van"
            className="pg-consult-link"
            onClick={(event) => {
              event.preventDefault();
              openConsultation();
            }}
          >
            Đăng ký tư vấn
          </a>

          {/* Đang kiểm tra đăng nhập */}
          {authLoading ? (
            <span className="pg-auth-loading">
              Đang kiểm tra...
            </span>
          ) : user ? (
            <>
              {/* Tên tài khoản */}
              <span
                className="pg-user-name"
                title={displayName}
              >
                <span className="pg-user-avatar">
                  {displayName.charAt(0).toUpperCase()}
                </span>

                <span className="pg-user-text">
                  {displayName}
                </span>
              </span>

              {/* Chỉ ADMIN mới thấy quản trị */}
              {user.role === "ADMIN" && (
                <Link
                  to="/admin"
                  className="pg-admin-button"
                  onClick={closeMenu}
                >
                  Quản trị
                </Link>
              )}

              {/* Đăng xuất */}
              <button
                type="button"
                className="pg-logout-button"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut
                  ? "Đang đăng xuất..."
                  : "Đăng xuất"}
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="pg-login-button"
              onClick={closeMenu}
            >
              Đăng nhập
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
