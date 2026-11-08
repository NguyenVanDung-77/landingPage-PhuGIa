
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ConsultationPopup.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const API_URL = `${API_BASE}/api/consultations`;

const EMPTY_FORM = {
  fullName: "",
  phone: "",
  email: "",
  message: "",
};

export default function ConsultationPopup() {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkingRef = useRef(false);

  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  // ========================================
  // 1. KIỂM TRA TÀI KHOẢN ĐĂNG NHẬP
  // ========================================

  const getCurrentUser = useCallback(async () => {
    let response;

    try {
      response = await fetch(
        `${API_BASE}/api/auth/me`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );
    } catch (err) {
      console.error("Lỗi kết nối API /auth/me:", err);

      throw new Error(
        "Không thể kết nối máy chủ để kiểm tra đăng nhập."
      );
    }

    // Chưa đăng nhập
    if (
      response.status === 401 ||
      response.redirected
    ) {
      return null;
    }

    // Không có quyền hoặc tài khoản bị khóa
    if (response.status === 403) {
      throw new Error(
        "Tài khoản không có quyền truy cập hoặc đã bị khóa."
      );
    }

    if (!response.ok) {
      throw new Error(
        `Không thể kiểm tra đăng nhập (HTTP ${response.status}).`
      );
    }

    const contentType =
      response.headers.get("content-type") || "";

    // Spring Security trả trang login
    if (!contentType.includes("application/json")) {
      return null;
    }

    const data = await response.json();

    if (!data || !data.username) {
      return null;
    }

    if (data.enabled === false) {
      throw new Error(
        "Tài khoản đã bị khóa."
      );
    }

    return data;
  }, []);

  // ========================================
  // 2. CHUYỂN SANG TRANG LOGIN
  // ========================================

  const redirectToLogin = useCallback(() => {
    setUser(null);
    setIsOpen(false);
    setError("");
    setSuccess("");

    navigate("/login", {
      state: {
        returnTo: "/",
        openConsultation: true,
      },
    });
  }, [navigate]);

  // ========================================
  // 3. MỞ ĐĂNG KÝ TƯ VẤN
  // ========================================

  const openConsultation = useCallback(async () => {
    if (checkingRef.current) return;

    checkingRef.current = true;
    setIsChecking(true);
    setError("");
    setSuccess("");

    try {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        redirectToLogin();
        return;
      }

      setUser(currentUser);

      setForm({
        fullName: currentUser.fullName || "",
        phone: "",
        email: currentUser.email || "",
        message: "",
      });

      setIsOpen(true);
    } catch (err) {
      console.error(
        "Lỗi mở đăng ký tư vấn:",
        err
      );

      setIsOpen(false);

      // Không bật alert gây khó chịu.
      // Nếu không kết nối được backend,
      // chuyển sang trang đăng nhập để
      // người dùng tiếp tục thao tác.
      if (
        err.message?.includes(
          "Không thể kết nối máy chủ"
        )
      ) {
        redirectToLogin();
      } else {
        setError(
          err.message ||
            "Không thể mở đăng ký tư vấn."
        );
      }
    } finally {
      checkingRef.current = false;
      setIsChecking(false);
    }
  }, [getCurrentUser, redirectToLogin]);

  // ========================================
  // 4. LẮNG NGHE SỰ KIỆN MỞ TƯ VẤN
  // ========================================

  useEffect(() => {
    const handleOpen = () => {
      openConsultation();
    };

    window.addEventListener(
      "openConsultation",
      handleOpen
    );

    return () => {
      window.removeEventListener(
        "openConsultation",
        handleOpen
      );
    };
  }, [openConsultation]);

  // ========================================
  // 5. ĐÓNG POPUP
  // ========================================

  const closePopup = useCallback(() => {
    if (isSubmitting) return;

    setIsOpen(false);
    setError("");
    setSuccess("");
  }, [isSubmitting]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closePopup();
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [isOpen, closePopup]);

  // ========================================
  // 6. CẬP NHẬT FORM
  // ========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    // Không cho chỉnh sửa email
    if (name === "email") return;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  // ========================================
  // 7. GỬI YÊU CẦU TƯ VẤN
  // ========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting || isChecking) return;

    setError("");
    setSuccess("");

    if (
      !form.fullName.trim() ||
      !form.phone.trim()
    ) {
      setError(
        "Vui lòng nhập họ tên và số điện thoại."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const currentUser = await getCurrentUser();

      // Hết phiên đăng nhập
      if (!currentUser) {
        redirectToLogin();
        return;
      }

      if (!currentUser.email?.trim()) {
        throw new Error(
          "Tài khoản chưa có email. Vui lòng cập nhật email trước khi gửi tư vấn."
        );
      }

      setUser(currentUser);

      // Lấy CSRF token
      const csrfResponse = await fetch(
        `${API_BASE}/api/auth/csrf`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!csrfResponse.ok) {
        throw new Error(
          "Không thể lấy mã bảo mật. Vui lòng thử lại."
        );
      }

      const csrf = await csrfResponse.json();

      if (!csrf.headerName || !csrf.token) {
        throw new Error(
          "Mã bảo mật không hợp lệ."
        );
      }

      // Gửi yêu cầu về backend
      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          [csrf.headerName]: csrf.token,
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: currentUser.email,
          message: form.message.trim(),
        }),
      });

      if (
        response.status === 401 ||
        response.redirected
      ) {
        redirectToLogin();
        return;
      }

      if (response.status === 403) {
        throw new Error(
          "Phiên đăng nhập hoặc mã bảo mật không hợp lệ. Vui lòng tải lại trang và thử lại."
        );
      }

      if (!response.ok) {
        throw new Error(
          `Không thể gửi đăng ký tư vấn (HTTP ${response.status}).`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          "Gửi đăng ký không thành công."
        );
      }

      setSuccess(
        "Đăng ký thành công! Chúng tôi sẽ liên hệ tư vấn sớm."
      );

      setForm({
        fullName:
          currentUser.fullName ||
          form.fullName,
        phone: "",
        email: currentUser.email,
        message: "",
      });
    } catch (err) {
      console.error(
        "Lỗi gửi đăng ký tư vấn:",
        err
      );

      setError(
        err.message ||
          "Có lỗi xảy ra. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================
  // 8. GIAO DIỆN POPUP
  // ========================================

  if (!isOpen) return null;

  return (
    <div
      className="pg-popup-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closePopup();
        }
      }}
    >
      <div
        className="pg-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pg-popup-title"
      >
        <button
          className="pg-popup-close"
          onClick={closePopup}
          type="button"
          disabled={isSubmitting}
          aria-label="Đóng tư vấn"
        >
          ✕
        </button>

        <div className="pg-popup-heading">
          <span className="pg-popup-label">
            PHÚ GIA ROYAL PARK
          </span>

          <h2 id="pg-popup-title">
            Đăng ký nhận tư vấn
          </h2>

          <p>
            Thông tin tư vấn sẽ được liên kết
            với tài khoản đang đăng nhập của bạn.
          </p>
        </div>

        {success ? (
          <div
            role="status"
            style={{
              textAlign: "center",
              padding: "22px 10px",
            }}
          >
            <div
              style={{
                fontSize: "36px",
                marginBottom: "12px",
              }}
            >
              ✓
            </div>

            <p
              style={{
                color: "#16734a",
                fontSize: "15px",
                fontWeight: "700",
                lineHeight: "1.7",
              }}
            >
              {success}
            </p>

            <button
              type="button"
              className="pg-popup-submit"
              onClick={closePopup}
              style={{
                width: "100%",
                marginTop: "18px",
              }}
            >
              Hoàn tất
            </button>
          </div>
        ) : (
          <form
            className="pg-popup-form"
            onSubmit={handleSubmit}
          >
            <label>
              Họ và tên <span>*</span>
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Nhập họ và tên"
                maxLength={150}
                required
                disabled={isSubmitting}
              />
            </label>

            <label>
              Số điện thoại <span>*</span>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="Nhập số điện thoại"
                maxLength={30}
                required
                disabled={isSubmitting}
              />
            </label>

            <label>
              Email tài khoản
              <input
                name="email"
                type="email"
                value={user?.email || form.email}
                readOnly
                aria-readonly="true"
                placeholder="Email tài khoản đăng nhập"
                maxLength={150}
                style={{
                  background: "#f1f5f2",
                  color: "#51645a",
                  cursor: "not-allowed",
                }}
              />
            </label>

            <p
              style={{
                margin: "-4px 0 4px",
                color: "#64748b",
                fontSize: "11px",
              }}
            >
              Email được lấy từ tài khoản
              đăng nhập và không thể chỉnh sửa.
            </p>

            <label>
              Nội dung cần tư vấn
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Bạn quan tâm đến sản phẩm nào?"
                rows={3}
                disabled={isSubmitting}
              />
            </label>

            {error && (
              <p
                role="alert"
                style={{
                  color: "#d83d3d",
                  fontSize: "12px",
                  margin: 0,
                }}
              >
                {error}
              </p>
            )}

            <button
              className="pg-popup-submit"
              type="submit"
              disabled={isSubmitting || isChecking}
            >
              {isSubmitting
                ? "Đang gửi thông tin..."
                : "Gửi yêu cầu tư vấn"}
            </button>

            <p className="pg-popup-note">
              Thông tin của bạn chỉ được
              sử dụng để liên hệ tư vấn
              về dự án.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
