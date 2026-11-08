
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
  Outlet,
  useNavigate,
} from "react-router-dom";

import "./index.css";

import App from "./App.jsx";
import LoginPage from "./pages/LoginPage.jsx";

import AdminConsultationsPage from "./pages/AdminConsultationsPage.jsx";
import AdminContentsPage from "./pages/AdminContentsPage.jsx";
import AdminProductsPage from "./pages/AdminProductsPage.jsx";
import AdminUsersPage from "./pages/AdminUsersPage.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ==========================================
// MENU QUẢN TRỊ
// ==========================================

const ADMIN_MENU = [
  {
    to: "/admin",
    label: "Tổng quan",
    end: true,
  },
  {
    to: "/admin/contents",
    label: "Quản lý nội dung",
  },
  {
    to: "/admin/products",
    label: "Quản lý sản phẩm",
  },
  {
    to: "/admin/consultations",
    label: "Khách hàng tư vấn",
  },
  {
    to: "/admin/users",
    label: "Quản lý người dùng",
  },
];

// ==========================================
// ADMIN LAYOUT
// ==========================================

function AdminLayout() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      try {
        const response = await fetch(
          `${API_BASE}/api/auth/me`,
          {
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Chưa đăng nhập");
        }

        const data = await response.json();

        if (active) {
          setUser(data);
        }
      } catch (error) {
        console.error(
          "Không thể kiểm tra tài khoản ADMIN:",
          error
        );

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    checkAdmin();

    return () => {
      active = false;
    };
  }, []);

  // ==========================================
  // ĐĂNG XUẤT
  // ==========================================

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      const csrfResponse = await fetch(
        `${API_BASE}/api/auth/csrf`,
        {
          credentials: "include",
        }
      );

      if (!csrfResponse.ok) {
        throw new Error(
          "Không thể lấy mã xác thực."
        );
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
        throw new Error(
          "Đăng xuất thất bại. Vui lòng thử lại."
        );
      }

      setUser(null);

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      setLogoutError(
        error.message || "Đăng xuất thất bại."
      );
    } finally {
      setLoggingOut(false);
    }
  };

  // ==========================================
  // KIỂM TRA QUYỀN ADMIN
  // ==========================================

  if (loading) {
    return (
      <div style={styles.center}>
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  // ==========================================
  // GIAO DIỆN ADMIN
  // ==========================================

  return (
    <div style={styles.adminRoot}>
      <header style={styles.header}>
        <Link
          to="/admin"
          style={styles.brand}
        >
          <span style={styles.brandIcon}>
            PG
          </span>

          <span>
            <strong
              style={{
                display: "block",
              }}
            >
              PHÚ GIA
            </strong>

            <small>
              ROYAL PARK ADMIN
            </small>
          </span>
        </Link>

        <div style={styles.headerRight}>
          <div style={styles.account}>
            <strong>
              {user.fullName ||
                user.username}
            </strong>

            <span style={styles.role}>
              ADMIN
            </span>
          </div>

          <button
            type="button"
            style={styles.logoutButton}
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut
              ? "Đang đăng xuất..."
              : "Đăng xuất"}
          </button>
        </div>
      </header>

      {/* MENU ĐIỀU HƯỚNG ADMIN */}

      <nav style={styles.navigation}>
        <div style={styles.navigationInner}>
          {ADMIN_MENU.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                ...styles.navigationLink,

                ...(isActive
                  ? styles.navigationLinkActive
                  : {}),
              })}
            >
              {item.label}
            </NavLink>
          ))}

          <Link
            to="/"
            style={styles.websiteLink}
          >
            Xem website ↗
          </Link>
        </div>
      </nav>

      {logoutError && (
        <div style={styles.error}>
          {logoutError}
        </div>
      )}

      <main style={styles.main}>
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}

// ==========================================
// TRANG TỔNG QUAN ADMIN
// ==========================================

function AdminPage() {
  return (
    <div>
      <div style={styles.pageHeading}>
        <div>
          <span style={styles.eyebrow}>
            QUẢN TRỊ WEBSITE
          </span>

          <h1 style={styles.title}>
            Tổng quan quản trị
          </h1>

          <p style={styles.description}>
            Quản lý nội dung, sản phẩm,
            khách hàng và tài khoản
            người dùng của dự án
            Phú Gia Royal Park.
          </p>
        </div>

        <Link
          to="/"
          style={styles.outlineButton}
        >
          Xem website
        </Link>
      </div>

      <div style={styles.cardGrid}>
        {/* QUẢN LÝ NỘI DUNG */}

        <Link
          to="/admin/contents"
          style={styles.card}
        >
          <span style={styles.cardIcon}>
            ✎
          </span>

          <h2 style={styles.cardTitle}>
            Quản lý nội dung
          </h2>

          <p style={styles.cardText}>
            Chỉnh sửa tiêu đề, mô tả,
            hình ảnh tiện ích và thông tin
            các phân khu hiển thị trên
            Landing Page.
          </p>

          <span style={styles.cardLink}>
            Chỉnh sửa nội dung →
          </span>
        </Link>

        {/* QUẢN LÝ SẢN PHẨM */}

        <Link
          to="/admin/products"
          style={styles.card}
        >
          <span style={styles.cardIcon}>
            ▦
          </span>

          <h2 style={styles.cardTitle}>
            Quản lý sản phẩm
          </h2>

          <p style={styles.cardText}>
            Thêm, chỉnh sửa và xóa
            sản phẩm đang bán hoặc
            cho thuê. Quản lý mã căn,
            giá, hình ảnh và thông tin
            chi tiết từng sản phẩm.
          </p>

          <span style={styles.cardLink}>
            Quản lý sản phẩm →
          </span>
        </Link>

        {/* KHÁCH HÀNG TƯ VẤN */}

        <Link
          to="/admin/consultations"
          style={styles.card}
        >
          <span style={styles.cardIcon}>
            ✉
          </span>

          <h2 style={styles.cardTitle}>
            Quản lý khách hàng tư vấn
          </h2>

          <p style={styles.cardText}>
            Xem danh sách khách hàng
            đã gửi yêu cầu tư vấn và
            cập nhật trạng thái xử lý.
          </p>

          <span style={styles.cardLink}>
            Xem danh sách →
          </span>
        </Link>

        {/* QUẢN LÝ NGƯỜI DÙNG */}

        <Link
          to="/admin/users"
          style={styles.card}
        >
          <span style={styles.cardIcon}>
            ♙
          </span>

          <h2 style={styles.cardTitle}>
            Quản lý người dùng
          </h2>

          <p style={styles.cardText}>
            Xem danh sách tài khoản,
            tìm kiếm người dùng,
            thay đổi quyền USER hoặc ADMIN,
            khóa và mở khóa tài khoản.
            Chỉ ADMIN được thực hiện
            thay đổi phân quyền.
          </p>

          <span style={styles.cardLink}>
            Quản lý tài khoản →
          </span>
        </Link>
      </div>
    </div>
  );
}

// ==========================================
// STYLES ADMIN
// ==========================================

const styles = {
  adminRoot: {
    minHeight: "100vh",
    background: "#f4f8f5",
    fontFamily: "Arial, sans-serif",
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4f8f5",
    color: "#176b43",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    minHeight: "78px",
    padding: "16px 5%",
    background: "#ffffff",
    borderBottom: "1px solid #e2eee5",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "#176b43",
    textDecoration: "none",
  },

  brandIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    background: "#176b43",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
  },

  account: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "13px",
    color: "#294b37",
  },

  role: {
    color: "#238353",
    fontSize: "11px",
    fontWeight: "700",
  },

  logoutButton: {
    border: "none",
    background: "#176b43",
    color: "#ffffff",
    padding: "11px 17px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  navigation: {
    background: "#ffffff",
    borderBottom: "1px solid #e2eee5",
  },

  navigationInner: {
    maxWidth: "1450px",
    margin: "0 auto",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  navigationLink: {
    display: "inline-block",
    padding: "17px 15px",
    color: "#617566",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "700",
    borderBottom: "3px solid transparent",
  },

  navigationLinkActive: {
    color: "#176b43",
    borderBottom: "3px solid #176b43",
  },

  websiteLink: {
    marginLeft: "auto",
    padding: "12px 10px",
    color: "#176b43",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "700",
  },

  error: {
    margin: "16px 5%",
    padding: "12px",
    background: "#fff1f1",
    color: "#b42323",
    borderRadius: "8px",
  },

  main: {
    maxWidth: "1450px",
    margin: "0 auto",
    padding: "42px 24px",
  },

  pageHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "30px",
  },

  eyebrow: {
    color: "#238353",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "1px",
  },

  title: {
    color: "#183b2a",
    fontSize: "30px",
    margin: "12px 0",
  },

  description: {
    color: "#718176",
    fontSize: "14px",
    lineHeight: "1.7",
  },

  outlineButton: {
    border: "1px solid #176b43",
    color: "#176b43",
    padding: "12px 18px",
    borderRadius: "9px",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "700",
  },

  cardGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px",
  },

  card: {
    background: "#ffffff",
    padding: "28px",
    borderRadius: "16px",
    border: "1px solid #e0eae3",
    textDecoration: "none",
    boxShadow:
      "0 8px 24px rgba(22,90,56,0.04)",
    transition:
      "transform 0.2s ease, box-shadow 0.2s ease",
  },

  cardIcon: {
    fontSize: "30px",
    color: "#176b43",
  },

  cardTitle: {
    color: "#183b2a",
    fontSize: "18px",
    margin: "18px 0 10px",
  },

  cardText: {
    color: "#718176",
    fontSize: "13px",
    lineHeight: "1.7",
  },

  cardLink: {
    display: "inline-block",
    marginTop: "18px",
    color: "#176b43",
    fontWeight: "700",
    fontSize: "13px",
  },
};

// ==========================================
// ROUTER
// ==========================================

createRoot(
  document.getElementById("root")
).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* WEBSITE USER */}

        <Route
          path="/"
          element={<App />}
        />

        {/* ĐĂNG NHẬP */}

        <Route
          path="/login"
          element={<LoginPage />}
        />

        {/* ADMIN */}

        <Route
          path="/admin"
          element={<AdminLayout />}
        >
          {/* TỔNG QUAN */}

          <Route
            index
            element={<AdminPage />}
          />

          {/* QUẢN LÝ NỘI DUNG */}

          <Route
            path="contents"
            element={<AdminContentsPage />}
          />

          {/* QUẢN LÝ SẢN PHẨM */}

          <Route
            path="products"
            element={<AdminProductsPage />}
          />

          {/* KHÁCH HÀNG TƯ VẤN */}

          <Route
            path="consultations"
            element={<AdminConsultationsPage />}
          />

          {/* QUẢN LÝ NGƯỜI DÙNG */}

          <Route
            path="users"
            element={<AdminUsersPage />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
