
import { useEffect, useState } from "react";

// ==========================================
// CẤU HÌNH
// ==========================================
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ẢNH NỀN TỔNG QUAN
// Đặt ảnh tại frontend/public/images/
// Bạn có thể tự đổi tên file ảnh tại đây.
const OVERVIEW_IMAGE = "/images/tong-quan-bg.jpg";

// ==========================================
// NỘI DUNG MẶC ĐỊNH
// ==========================================
const DEFAULT_CONTENT = {
  overview_title: "Tổng quan dự án",

  overview_description:
    "Phú Gia Royal Park kiến tạo không gian sống hiện đại, " +
    "hài hòa cùng thiên nhiên, nơi mỗi giá trị sống " +
    "được nâng niu và phát triển bền vững.",

  overview_details: [
    "Tên dự án: Phú Gia Royal Park",
    "Vị trí: Đường Tây Sơn, Quy Nhơn Nam",
    "Tổng diện tích: 63.557 m²",
    "Sản phẩm: 283 căn nhà thấp tầng",
    "Quy mô: 10 lô LK01–LK10",
    "Tiến độ bàn giao: Theo từng mã căn",
    "Pháp lý: Hồ sơ dự án và điều kiện kinh doanh",
  ].join("\n"),
};

// ==========================================
// XỬ LÝ THÔNG TIN TỪ ADMIN
// ==========================================
function parseDetails(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const separator = line.search(/[:：]/);

      if (separator === -1) {
        return {
          id: index,
          label: `Thông tin ${index + 1}`,
          value: line,
        };
      }

      return {
        id: index,
        label: line.substring(0, separator).trim(),
        value: line.substring(separator + 1).trim(),
      };
    });
}

// ==========================================
// COMPONENT
// ==========================================
export default function OverviewSection() {
  const [content, setContent] = useState(DEFAULT_CONTENT);

  useEffect(() => {
    const controller = new AbortController();

    async function loadContent() {
      try {
        const response = await fetch(
          `${API_BASE}/api/contents`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            "Không tải được nội dung Tổng quan"
          );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Dữ liệu không hợp lệ");
        }

        const contentMap = {};

        data.forEach((item) => {
          if (
            item &&
            typeof item.contentKey === "string" &&
            typeof item.contentValue === "string"
          ) {
            contentMap[item.contentKey] =
              item.contentValue;
          }
        });

        const result = {};

        Object.keys(DEFAULT_CONTENT).forEach((key) => {
          const value = contentMap[key];

          result[key] =
            typeof value === "string" &&
            value.trim() !== ""
              ? value
              : DEFAULT_CONTENT[key];
        });

        if (!controller.signal.aborted) {
          setContent(result);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(
            "Lỗi tải Tổng quan:",
            error
          );
        }
      }
    }

    loadContent();

    return () => controller.abort();
  }, []);

  const details = parseDetails(
    content.overview_details
  );

  const openConsultation = () => {
    window.dispatchEvent(
      new Event("openConsultation")
    );
  };

  return (
    <section
      id="tong-quan"
      className="pg-overview-premium"
      style={{
        backgroundImage: `
          linear-gradient(
            90deg,
            rgba(7, 29, 22, 0.83) 0%,
            rgba(8, 38, 27, 0.61) 48%,
            rgba(8, 38, 27, 0.32) 100%
          ),
          linear-gradient(
            0deg,
            rgba(6, 27, 20, 0.92) 0%,
            rgba(8, 32, 24, 0.20) 55%,
            rgba(7, 29, 22, 0.26) 100%
          ),
          url("${OVERVIEW_IMAGE}")
        `,
      }}
    >
      <style>
        {`
          /* ==================================
             TỔNG QUAN - FULL BACKGROUND
          ================================== */

          .pg-overview-premium {
            position: relative;
            width: 100%;
            min-height: 850px;

            display: flex;
            align-items: stretch;

            background-color: #163d2c;
            background-size: cover;
            background-position: center center;
            background-repeat: no-repeat;

            overflow: hidden;
            scroll-margin-top: 70px;
            isolation: isolate;

            font-family: "Segoe UI", Arial, sans-serif;
          }

          .pg-overview-premium *,
          .pg-overview-premium *::before,
          .pg-overview-premium *::after {
            box-sizing: border-box;
          }

          /* Hiệu ứng ánh sáng nhẹ */
          .pg-overview-premium::before {
            content: "";
            position: absolute;
            top: -230px;
            right: -180px;
            width: 650px;
            height: 650px;
            border-radius: 50%;

            background: radial-gradient(
              circle,
              rgba(168, 226, 176, 0.13) 0%,
              transparent 70%
            );

            pointer-events: none;
            z-index: 0;
          }

          .pg-op-container {
            position: relative;
            z-index: 1;

            width: 100%;
            max-width: 1300px;
            margin: 0 auto;
            padding: 100px 35px 65px;

            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 75px;
          }

          /* ==================================
             PHẦN TIÊU ĐỀ
          ================================== */

          .pg-op-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 50px;
          }

          .pg-op-copy {
            max-width: 740px;
          }

          .pg-op-eyebrow {
            display: flex;
            align-items: center;
            gap: 17px;
            margin-bottom: 32px;

            color: #c6f5d1;
            font-size: 12px;
            font-weight: 750;
            letter-spacing: 3px;
            text-transform: uppercase;
          }

          .pg-op-eyebrow-line {
            display: block;
            width: 47px;
            height: 2px;
            background: #a6eebc;
          }

          .pg-op-title {
            margin: 0 0 24px;

            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff;

            font-family:
              "Palatino Linotype",
              "Book Antiqua",
              Georgia,
              serif;

            font-size: clamp(48px, 6.5vw, 88px);
            font-weight: 600;
            line-height: 1.08;
            letter-spacing: -1.7px;
            text-transform: none;

            overflow-wrap: break-word;
          }

          .pg-op-title-accent {
            width: 87px;
            height: 4px;
            margin-bottom: 30px;

            border-radius: 10px;
            background: linear-gradient(
              90deg,
              #9af0b2,
              #ffffff
            );
          }

          .pg-op-description {
            max-width: 635px;
            margin: 0;

            color: #f3fff5 !important;
            -webkit-text-fill-color: #f3fff5;

            font-size: clamp(15px, 1.5vw, 18px);
            font-weight: 400;
            line-height: 1.95;
            white-space: pre-line;
            overflow-wrap: break-word;
          }

          /* ==================================
             NHÃN TRANG TRÍ BÊN PHẢI
          ================================== */

          .pg-op-side {
            flex-shrink: 0;

            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 18px;

            padding-top: 8px;
          }

          .pg-op-side-number {
            color: rgba(255,255,255,0.86);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 3px;
          }

          .pg-op-side-line {
            width: 1px;
            height: 92px;
            background: linear-gradient(
              to bottom,
              #c6f5d1,
              transparent
            );
          }

          .pg-op-side-text {
            writing-mode: vertical-rl;
            color: rgba(255,255,255,0.8);
            font-size: 10px;
            font-weight: 650;
            letter-spacing: 4px;
          }

          /* ==================================
             NÚT HÀNH ĐỘNG
          ================================== */

          .pg-op-actions {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 14px;
            margin-top: 36px;
          }

          .pg-op-btn-primary,
          .pg-op-btn-secondary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 20px;

            min-height: 48px;
            padding: 13px 23px;

            border-radius: 50px;

            font-family: inherit;
            font-size: 13px;
            font-weight: 700;
            line-height: 1.4;
            text-decoration: none;

            cursor: pointer;

            transition:
              transform 0.2s ease,
              background 0.2s ease,
              border-color 0.2s ease;
          }

          .pg-op-btn-primary {
            border: 1px solid #ffffff;
            background: #ffffff;
            color: #184931;
          }

          .pg-op-btn-primary:hover {
            transform: translateY(-2px);
            background: #e5f8e9;
          }

          .pg-op-btn-secondary {
            border: 1px solid rgba(255,255,255,0.6);
            background: rgba(255,255,255,0.08);
            color: #ffffff;
            backdrop-filter: blur(8px);
          }

          .pg-op-btn-secondary:hover {
            transform: translateY(-2px);
            background: rgba(255,255,255,0.18);
          }

          .pg-op-button-arrow {
            font-size: 18px;
            font-weight: 400;
          }

          /* ==================================
             BẢNG KÍNH THÔNG TIN
          ================================== */

          .pg-op-info-panel {
            width: 100%;
            padding: 30px 30px 32px;

            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 19px;

            background: rgba(8, 33, 24, 0.54);

            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);

            box-shadow:
              0 20px 60px rgba(0,0,0,0.15);
          }

          .pg-op-info-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;

            padding: 0 4px 23px;
            margin-bottom: 5px;

            border-bottom:
              1px solid rgba(255,255,255,0.24);
          }

          .pg-op-info-heading {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .pg-op-info-icon {
            display: flex;
            align-items: center;
            justify-content: center;

            width: 37px;
            height: 37px;

            border: 1px solid rgba(185,245,201,0.65);
            border-radius: 10px;

            color: #bdf4c9;
            font-size: 20px;
          }

          .pg-op-info-title {
            margin: 0;

            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff;

            font-family:
              Georgia,
              "Times New Roman",
              serif;

            font-size: 23px;
            font-weight: 600;
            letter-spacing: 0.2px;
          }

          .pg-op-info-caption {
            color: #c2efd0;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
          }

          /* ==================================
             LƯỚI THÔNG TIN TỪ ADMIN
          ================================== */

          .pg-op-info-grid {
            display: grid;
            grid-template-columns:
              repeat(4, minmax(0, 1fr));

            gap: 12px 0;
          }

          .pg-op-info-item {
            position: relative;
            min-width: 0;
            padding: 23px 20px;

            border-bottom:
              1px solid rgba(255,255,255,0.12);

            transition: background 0.2s ease;
          }

          .pg-op-info-item:hover {
            background: rgba(255,255,255,0.07);
            border-radius: 9px;
          }

          .pg-op-info-item::before {
            content: "";
            position: absolute;
            top: 26px;
            bottom: 26px;
            left: 0;

            width: 1px;
            background: rgba(255,255,255,0.2);
          }

          .pg-op-info-label {
            display: block;
            margin-bottom: 13px;

            color: #c5decd;
            font-size: 12px;
            font-weight: 500;
            line-height: 1.5;
          }

          .pg-op-info-value {
            display: block;
            margin: 0;

            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff;

            font-size: clamp(15px, 1.4vw, 19px);
            font-weight: 700;
            line-height: 1.5;

            white-space: pre-line;
            overflow-wrap: break-word;
          }

          /* ==================================
             DÒNG THƯƠNG HIỆU CUỐI
          ================================== */

          .pg-op-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;

            margin-top: 22px;
            padding: 0 5px;

            color: rgba(255,255,255,0.8);

            font-size: 11px;
            font-weight: 650;
            letter-spacing: 2px;
            text-transform: uppercase;
          }

          .pg-op-footer-dot {
            width: 5px;
            height: 5px;
            flex-shrink: 0;

            border-radius: 50%;
            background: #a5f0b6;
          }

          /* ==================================
             TABLET
          ================================== */

          @media (max-width: 1000px) {
            .pg-op-container {
              padding: 85px 25px 50px;
              gap: 65px;
            }

            .pg-op-info-grid {
              grid-template-columns:
                repeat(3, minmax(0, 1fr));
            }

            .pg-op-title {
              font-size: clamp(47px, 7vw, 72px);
            }

            .pg-op-side {
              display: none;
            }
          }

          /* ==================================
             MOBILE
          ================================== */

          @media (max-width: 700px) {
            .pg-overview-premium {
              min-height: 100vh;
              background-position: center;
            }

            .pg-op-container {
              padding: 78px 18px 35px;
              gap: 55px;
            }

            .pg-op-eyebrow {
              margin-bottom: 23px;
              gap: 12px;
              font-size: 10px;
              letter-spacing: 1.5px;
            }

            .pg-op-eyebrow-line {
              width: 26px;
            }

            .pg-op-title {
              font-size: clamp(39px, 10vw, 55px);
              line-height: 1.14;
              letter-spacing: -0.7px;
            }

            .pg-op-title-accent {
              width: 60px;
              margin-bottom: 23px;
            }

            .pg-op-description {
              font-size: 14px;
              line-height: 1.85;
            }

            .pg-op-actions {
              gap: 11px;
              margin-top: 28px;
            }

            .pg-op-btn-primary,
            .pg-op-btn-secondary {
              padding: 12px 17px;
              font-size: 12px;
            }

            .pg-op-info-panel {
              padding: 22px 16px 24px;
              border-radius: 15px;
            }

            .pg-op-info-header {
              padding-bottom: 18px;
            }

            .pg-op-info-title {
              font-size: 19px;
            }

            .pg-op-info-caption {
              display: none;
            }

            .pg-op-info-grid {
              grid-template-columns:
                repeat(2, minmax(0, 1fr));

              gap: 0;
            }

            .pg-op-info-item {
              padding: 20px 12px;
            }

            .pg-op-info-label {
              font-size: 11px;
              margin-bottom: 9px;
            }

            .pg-op-info-value {
              font-size: 15px;
            }

            .pg-op-footer {
              font-size: 9px;
              letter-spacing: 1px;
            }
          }

          @media (max-width: 390px) {
            .pg-op-info-grid {
              grid-template-columns: 1fr;
            }

            .pg-op-info-item {
              padding: 15px 10px;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .pg-op-btn-primary,
            .pg-op-btn-secondary,
            .pg-op-info-item {
              transition: none;
            }
          }
        `}
      </style>

      <div className="pg-op-container">
        {/* ==================================
            TIÊU ĐỀ & GIỚI THIỆU
        ================================== */}

        <div className="pg-op-top">
          <div className="pg-op-copy">
            <div className="pg-op-eyebrow">
              <span className="pg-op-eyebrow-line" />

              PHÚ GIA ROYAL PARK • QUY NHƠN
            </div>

            <h2 className="pg-op-title">
              {content.overview_title}
            </h2>

            <div className="pg-op-title-accent" />

            <p className="pg-op-description">
              {content.overview_description}
            </p>

            <div className="pg-op-actions">
              <a
                href="#mat-bang"
                className="pg-op-btn-primary"
              >
                Khám phá mặt bằng

                <span className="pg-op-button-arrow">
                  ↗
                </span>
              </a>

              <button
                type="button"
                className="pg-op-btn-secondary"
                onClick={openConsultation}
              >
                Nhận tư vấn

                <span className="pg-op-button-arrow">
                  ↗
                </span>
              </button>
            </div>
          </div>

          <div
            className="pg-op-side"
            aria-hidden="true"
          >
            <span className="pg-op-side-number">
              02 / OVERVIEW
            </span>

            <span className="pg-op-side-line" />

            <span className="pg-op-side-text">
              PHÚ GIA ROYAL PARK
            </span>
          </div>
        </div>

        {/* ==================================
            BẢNG THÔNG TIN KÍNH MỜ
        ================================== */}

        <div>
          {details.length > 0 && (
            <div className="pg-op-info-panel">
              <div className="pg-op-info-header">
                <div className="pg-op-info-heading">
                  <div className="pg-op-info-icon">
                    ◇
                  </div>

                  <h3 className="pg-op-info-title">
                    Thông tin dự án
                  </h3>
                </div>

                <span className="pg-op-info-caption">
                  PROJECT INFORMATION
                </span>
              </div>

              <div className="pg-op-info-grid">
                {details.map((item) => (
                  <div
                    key={item.id}
                    className="pg-op-info-item"
                  >
                    <span className="pg-op-info-label">
                      {item.label}
                    </span>

                    <p className="pg-op-info-value">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pg-op-footer">
            <span>PHÚ GIA ROYAL PARK</span>

            <span className="pg-op-footer-dot" />

            <span>KHÔNG GIAN SỐNG XANH</span>

            <span className="pg-op-footer-dot" />

            <span>QUY NHƠN</span>
          </div>
        </div>
      </div>
    </section>
  );
}
