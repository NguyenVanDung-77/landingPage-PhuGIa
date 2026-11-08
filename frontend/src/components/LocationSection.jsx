
import { useEffect, useState } from "react";

// ============================================
// CẤU HÌNH WEBSITE
// ============================================

const API_BASE = "http://localhost:8080";

// ẢNH NỀN VỊ TRÍ
// Đặt ảnh tại frontend/public/images/
// Chỉ cần thay tên ảnh ở dòng dưới.
const LOCATION_IMAGE = "/images/vi-tri-bg.jpg";

// GOOGLE MAPS
// Có thể thay địa chỉ tìm kiếm nếu cần.
const MAP_QUERY =
  "Phú Gia Royal Park, đường Tây Sơn, Quy Nhơn";

const MAP_EMBED_URL =
  "https://www.google.com/maps?q=" +
  encodeURIComponent(MAP_QUERY) +
  "&z=16&output=embed";

const MAP_OPEN_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(MAP_QUERY);

// TOUR 360 CỦA PHÚ GIA ROYAL PARK
const TOUR_360_URL =
  "https://virtual-360.bdshub.vn/360-Phu-Gia-Royal-Park/";

// ============================================
// NỘI DUNG MẶC ĐỊNH
// ============================================

const DEFAULT_CONTENT = {
  location_title: "Vị trí và kết nối",

  location_description:
    "Tọa lạc trên trục đường Tây Sơn, " +
    "Phú Gia Royal Park mang đến khả năng kết nối " +
    "thuận tiện với các khu vực và tiện ích tại Quy Nhơn.",

  location_connections: [
    "Đường Tây Sơn: Trục giao thông chính",
    "Quốc lộ 1D: Kết nối khu vực",
    "Đại học Quy Nhơn: Tiện ích giáo dục",
    "Bãi biển Quy Nhơn: Không gian du lịch",
    "Quảng trường Nguyễn Tất Thành: Khu vực trung tâm",
    "Sân bay Phù Cát: Kết nối hàng không",
  ].join("\n"),
};

// ============================================
// XỬ LÝ NỘI DUNG KẾT NỐI GIAO THÔNG
// ============================================

function parseConnections(value) {
  return String(value || "")
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const separator = line.search(/[:：]/);

      if (separator === -1) {
        return {
          id: index,
          title: line,
          description: "",
        };
      }

      return {
        id: index,
        title: line.slice(0, separator).trim(),
        description: line.slice(separator + 1).trim(),
      };
    });
}

// ============================================
// COMPONENT
// ============================================

export default function LocationSection() {
  const [content, setContent] = useState(DEFAULT_CONTENT);

  // LẤY NỘI DUNG TỪ ADMIN
  useEffect(() => {
    const controller = new AbortController();

    async function loadContents() {
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
            "Không thể tải nội dung vị trí."
          );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Dữ liệu không hợp lệ.");
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

        const updatedContent = {};

        Object.keys(DEFAULT_CONTENT).forEach((key) => {
          const savedValue = contentMap[key];

          updatedContent[key] =
            typeof savedValue === "string" &&
            savedValue.trim() !== ""
              ? savedValue
              : DEFAULT_CONTENT[key];
        });

        if (!controller.signal.aborted) {
          setContent(updatedContent);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(
            "Lỗi tải nội dung vị trí:",
            error
          );
        }
      }
    }

    loadContents();

    return () => controller.abort();
  }, []);

  const connections = parseConnections(
    content.location_connections
  );

  const openConsultation = () => {
    window.dispatchEvent(
      new Event("openConsultation")
    );
  };

  return (
    <section id="vi-tri" className="pg-location-v2">
      <style>
        {`
          /* =========================================
             PHÚ GIA ROYAL PARK - LOCATION PREMIUM
          ========================================= */

          .pg-location-v2 {
            --loc-dark: #103d2b;
            --loc-green: #1c6641;
            --loc-accent: #b8f0c5;
            --loc-text: #173b2a;
            --loc-muted: #697b70;

            width: 100%;
            background: #ffffff;
            overflow: hidden;
            scroll-margin-top: 75px;
            font-family: "Segoe UI", Arial, sans-serif;
          }

          .pg-location-v2 *,
          .pg-location-v2 *::before,
          .pg-location-v2 *::after {
            box-sizing: border-box;
          }

          .pg-location-v2 a {
            text-decoration: none;
          }

          .pg-lv-container {
            width: min(100% - 64px, 1240px);
            margin: 0 auto;
          }

          /* =========================================
             1. BANNER NỀN TOÀN MÀN HÌNH
          ========================================= */

          .pg-lv-hero {
            position: relative;
            display: flex;
            align-items: center;

            min-height: 790px;
            min-height: min(900px, 100svh);

            background-color: #123d2b;
            background-position: center;
            background-size: cover;
            background-repeat: no-repeat;

            isolation: isolate;
          }

          .pg-lv-hero::after {
            content: "";
            position: absolute;
            z-index: -1;
            inset: 0;

            background: linear-gradient(
              to top,
              rgba(7, 32, 21, 0.64),
              transparent 43%
            );

            pointer-events: none;
          }

          .pg-lv-hero-inner {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 85px;

            padding-top: 130px;
            padding-bottom: 48px;
          }

          .pg-lv-hero-content {
            max-width: 790px;
          }

          /* NHÃN PHÍA TRÊN TIÊU ĐỀ */

          .pg-lv-eyebrow {
            display: flex;
            align-items: center;
            gap: 15px;

            margin-bottom: 29px;

            color: #c1f1ce;
            font-size: 12px;
            font-weight: 750;
            letter-spacing: 3px;
          }

          .pg-lv-eyebrow::before {
            content: "";
            width: 44px;
            height: 2px;
            flex-shrink: 0;
            background: #b5ecc5;
          }

          /* TIÊU ĐỀ LỚN */

          .pg-lv-hero-title {
            max-width: 820px;
            margin: 0 0 24px;

            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff;

            font-family:
              "Palatino Linotype",
              "Book Antiqua",
              Georgia,
              serif;

            font-size: clamp(45px, 5.7vw, 76px);
            font-weight: 600;
            line-height: 1.13;
            letter-spacing: -1.5px;
            text-transform: none;

            background: none !important;
            background-image: none !important;
            overflow-wrap: break-word;
          }

          /* ĐƯỜNG NHẤN XANH */

          .pg-lv-accent-line {
            width: 75px;
            height: 3px;

            margin-bottom: 28px;
            border-radius: 20px;

            background: #b8f0c5;
          }

          /* MÔ TẢ TỪ ADMIN */

          .pg-lv-hero-description {
            max-width: 640px;
            margin: 0;

            color: #f7fff8 !important;
            -webkit-text-fill-color: #f7fff8;

            font-size: clamp(15px, 1.35vw, 18px);
            font-weight: 400;
            line-height: 1.95;

            white-space: pre-line;
            overflow-wrap: break-word;
          }

          /* NÚT BANNER */

          .pg-lv-hero-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 14px;

            margin-top: 35px;
          }

          .pg-lv-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 17px;

            min-height: 51px;
            padding: 14px 25px;

            border-radius: 50px;

            font-family: inherit;
            font-size: 13px;
            font-weight: 750;
            line-height: 1.4;

            transition:
              background 0.2s ease,
              transform 0.2s ease;
          }

          .pg-lv-btn-primary {
            background: #ffffff;
            border: 1px solid #ffffff;
            color: #17472f;
          }

          .pg-lv-btn-primary:hover {
            background: #e8f8ed;
            transform: translateY(-2px);
          }

          .pg-lv-btn-outline {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.65);
            color: #ffffff;
            backdrop-filter: blur(8px);
          }

          .pg-lv-btn-outline:hover {
            background: rgba(255,255,255,0.2);
            transform: translateY(-2px);
          }

          /* DẢI THÔNG TIN DƯỚI ẢNH */

          .pg-lv-hero-strip {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));

            width: 100%;
            padding: 23px 30px;

            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 15px;

            background: rgba(8, 35, 24, 0.35);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
          }

          .pg-lv-strip-item {
            padding: 7px 26px;
            border-right: 1px solid rgba(255,255,255,0.26);
          }

          .pg-lv-strip-item:first-child {
            padding-left: 0;
          }

          .pg-lv-strip-item:last-child {
            border-right: 0;
          }

          .pg-lv-strip-label {
            display: block;
            margin-bottom: 9px;

            color: #b8ecc7;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
          }

          .pg-lv-strip-value {
            display: block;

            color: #ffffff;
            font-size: 16px;
            font-weight: 650;
            line-height: 1.5;
          }

          /* =========================================
             2. KẾT NỐI + GOOGLE MAPS
          ========================================= */

          .pg-lv-map-section {
            padding: 115px 0 120px;
            background: #ffffff;
            scroll-margin-top: 90px;
          }

          .pg-lv-map-header {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 40px;

            margin-bottom: 50px;
          }

          .pg-lv-section-label {
            display: flex;
            align-items: center;
            gap: 13px;

            margin-bottom: 20px;

            color: #2c8a55;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 2.6px;
            text-transform: uppercase;
          }

          .pg-lv-section-label::before {
            content: "";
            width: 34px;
            height: 2px;
            background: #2c8a55;
          }

          .pg-lv-heading {
            max-width: 680px;
            margin: 0;

            color: #173e2c !important;
            -webkit-text-fill-color: #173e2c;

            font-family:
              "Palatino Linotype",
              Georgia,
              serif;

            font-size: clamp(34px, 3.8vw, 52px);
            font-weight: 600;
            line-height: 1.21;
            letter-spacing: -0.9px;
          }

          .pg-lv-heading span {
            color: #2d9259 !important;
            -webkit-text-fill-color: #2d9259;
          }

          .pg-lv-map-intro {
            max-width: 340px;
            margin: 0 0 5px;

            color: #748379;
            font-size: 14px;
            line-height: 1.9;
          }

          /* BỐ CỤC 2 CỘT */

          .pg-lv-map-layout {
            display: grid;
            grid-template-columns:
              minmax(0, 0.85fr)
              minmax(0, 1.15fr);

            gap: 35px;
            align-items: stretch;
          }

          /* DANH SÁCH KẾT NỐI */

          .pg-lv-connections {
            display: flex;
            flex-direction: column;
            gap: 13px;
          }

          .pg-lv-connection {
            display: flex;
            align-items: flex-start;
            gap: 17px;

            padding: 20px 22px;

            border: 1px solid #e3ece6;
            border-radius: 13px;

            background: #f7faf7;

            transition:
              border-color 0.2s ease,
              transform 0.2s ease,
              background 0.2s ease;
          }

          .pg-lv-connection:hover {
            transform: translateX(3px);
            border-color: #a9d8b7;
            background: #ffffff;
          }

          .pg-lv-connection-number {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;

            width: 38px;
            height: 38px;

            background: #e5f3e8;
            border-radius: 10px;

            color: #207947;
            font-size: 13px;
            font-weight: 800;
          }

          .pg-lv-connection-content {
            min-width: 0;
          }

          .pg-lv-connection-title {
            margin: 0 0 6px;

            color: #17412e;
            font-size: 16px;
            font-weight: 750;
            line-height: 1.45;
            overflow-wrap: break-word;
          }

          .pg-lv-connection-description {
            margin: 0;

            color: #78877d;
            font-size: 13px;
            line-height: 1.7;
            overflow-wrap: break-word;
          }

          /* GOOGLE MAPS */

          .pg-lv-map-card {
            display: flex;
            flex-direction: column;

            min-height: 590px;

            overflow: hidden;
            border: 1px solid #e0e9e2;
            border-radius: 17px;

            background: #f0f4f0;

            box-shadow:
              0 18px 48px rgba(18, 66, 40, 0.08);
          }

          .pg-lv-map-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;

            padding: 19px 23px;
            background: #174a34;
          }

          .pg-lv-map-toolbar-title {
            display: flex;
            align-items: center;
            gap: 11px;

            color: #ffffff;
            font-size: 14px;
            font-weight: 750;
          }

          .pg-lv-map-dot {
            width: 9px;
            height: 9px;
            flex-shrink: 0;

            border-radius: 50%;
            background: #a9edba;
          }

          .pg-lv-map-toolbar-note {
            color: #c4e8cf;
            font-size: 10px;
            letter-spacing: 1.5px;
          }

          .pg-lv-map-iframe {
            display: block;
            width: 100%;
            flex: 1;
            min-height: 475px;

            border: 0;
            background: #e6eee7;
          }

          .pg-lv-map-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 13px;

            padding: 19px 22px;
            background: #ffffff;
          }

          .pg-lv-map-footer-text {
            color: #718176;
            font-size: 12px;
          }

          .pg-lv-map-link {
            color: #217748;
            font-size: 13px;
            font-weight: 800;
          }

          .pg-lv-map-link:hover {
            text-decoration: underline;
          }

          /* =========================================
             3. TOUR 360 ĐỘ
          ========================================= */

          .pg-lv-tour-section {
            padding: 105px 0 120px;

            background:
              radial-gradient(
                circle at 90% 5%,
                rgba(87, 159, 105, 0.16),
                transparent 40%
              ),
              #103b2a;

            scroll-margin-top: 90px;
          }

          .pg-lv-tour-heading {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 30px;

            margin-bottom: 40px;
          }

          .pg-lv-tour-copy {
            max-width: 780px;
          }

          .pg-lv-tour-label {
            display: flex;
            align-items: center;
            gap: 13px;

            margin-bottom: 24px;

            color: #b9eeca;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 2.5px;
            text-transform: uppercase;
          }

          .pg-lv-tour-label::before {
            content: "";
            width: 34px;
            height: 2px;
            background: #b9eeca;
          }

          .pg-lv-tour-title {
            margin: 0 0 18px;

            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff;

            font-family:
              "Palatino Linotype",
              Georgia,
              serif;

            font-size: clamp(39px, 4.5vw, 61px);
            font-weight: 600;
            line-height: 1.16;
            letter-spacing: -1px;

            background: none !important;
            background-image: none !important;
          }

          .pg-lv-tour-title span {
            color: #b9efc8 !important;
            -webkit-text-fill-color: #b9efc8;
          }

          .pg-lv-tour-description {
            max-width: 690px;
            margin: 0;

            color: #d6e9dc;
            font-size: 15px;
            line-height: 1.9;
          }

          .pg-lv-tour-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 5px;
            flex-shrink: 0;

            width: 110px;
            height: 110px;

            border: 1px solid rgba(255,255,255,0.4);
            border-radius: 50%;

            color: #ffffff;
          }

          .pg-lv-tour-badge-number {
            font-family: Georgia, serif;
            font-size: 37px;
            font-weight: 700;
          }

          .pg-lv-tour-badge-text {
            font-size: 10px;
            letter-spacing: 2px;
          }

          /* KHUNG TOUR */

          .pg-lv-tour-card {
            overflow: hidden;

            border: 1px solid rgba(255,255,255,0.26);
            border-radius: 18px;

            background: #082b1d;

            box-shadow:
              0 24px 60px rgba(0,0,0,0.23);
          }

          .pg-lv-tour-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 15px;

            padding: 17px 22px;
            background: #ffffff;
          }

          .pg-lv-tour-toolbar-title {
            color: #17462f;
            font-size: 14px;
            font-weight: 750;
          }

          .pg-lv-tour-open {
            color: #227849;
            font-size: 13px;
            font-weight: 800;
          }

          .pg-lv-tour-open:hover {
            text-decoration: underline;
          }

          .pg-lv-tour-iframe {
            display: block;
            width: 100%;
            height: 650px;

            border: 0;
            background: #08291d;
          }

          .pg-lv-tour-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 18px;

            padding: 20px 23px;
            background: #ffffff;
          }

          .pg-lv-tour-help {
            max-width: 640px;
            margin: 0;

            color: #718177;
            font-size: 12px;
            line-height: 1.7;
          }

          .pg-lv-tour-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;

            padding: 13px 20px;

            border-radius: 50px;
            background: #174e35;

            color: #ffffff;
            font-size: 12px;
            font-weight: 800;
          }

          .pg-lv-tour-button:hover {
            background: #27804f;
          }

          /* =========================================
             4. TƯ VẤN CUỐI TRANG
          ========================================= */

          .pg-lv-cta {
            padding: 74px 0;
            background: #f5f9f5;
          }

          .pg-lv-cta-inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 30px;
          }

          .pg-lv-cta-label {
            display: block;
            margin-bottom: 13px;

            color: #2b8e55;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 2px;
          }

          .pg-lv-cta-title {
            margin: 0;

            color: #173e2c !important;
            -webkit-text-fill-color: #173e2c;

            font-family: Georgia, serif;
            font-size: clamp(26px, 3vw, 37px);
            font-weight: 600;
            line-height: 1.4;
          }

          .pg-lv-cta-btn {
            flex-shrink: 0;

            padding: 16px 25px;

            background: #174d34;
            border: 0;
            border-radius: 50px;

            color: #ffffff;
            font-family: inherit;
            font-size: 13px;
            font-weight: 800;

            cursor: pointer;
          }

          .pg-lv-cta-btn:hover {
            background: #277d4c;
          }

          /* =========================================
             TABLET
          ========================================= */

          @media (max-width: 1000px) {
            .pg-lv-hero {
              min-height: 740px;
              min-height: 85svh;
            }

            .pg-lv-map-header {
              display: block;
            }

            .pg-lv-map-intro {
              max-width: 700px;
              margin-top: 20px;
            }

            .pg-lv-map-layout {
              grid-template-columns: 1fr;
            }

            .pg-lv-map-iframe {
              min-height: 480px;
            }

            .pg-lv-tour-iframe {
              height: 550px;
            }
          }

          /* =========================================
             MOBILE
          ========================================= */

          @media (max-width: 700px) {
            .pg-lv-container {
              width: calc(100% - 36px);
            }

            .pg-lv-hero {
              min-height: 790px;
              min-height: 100svh;
            }

            .pg-lv-hero-inner {
              gap: 60px;
              padding-top: 105px;
              padding-bottom: 25px;
            }

            .pg-lv-eyebrow {
              gap: 10px;
              margin-bottom: 22px;
              font-size: 10px;
              letter-spacing: 1.5px;
            }

            .pg-lv-eyebrow::before {
              width: 25px;
            }

            .pg-lv-hero-title {
              font-size: clamp(40px, 10vw, 55px);
              line-height: 1.16;
              letter-spacing: -0.7px;
            }

            .pg-lv-hero-description {
              font-size: 14px;
              line-height: 1.85;
            }

            .pg-lv-hero-actions {
              gap: 11px;
            }

            .pg-lv-btn {
              min-height: 46px;
              padding: 12px 17px;
              font-size: 12px;
            }

            .pg-lv-hero-strip {
              grid-template-columns: 1fr;
              gap: 0;

              padding: 10px 18px;
            }

            .pg-lv-strip-item,
            .pg-lv-strip-item:first-child {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 15px;

              padding: 13px 0;
              border-right: 0;
              border-bottom:
                1px solid rgba(255,255,255,0.2);
            }

            .pg-lv-strip-item:last-child {
              border-bottom: 0;
            }

            .pg-lv-strip-label {
              margin-bottom: 0;
              font-size: 10px;
            }

            .pg-lv-strip-value {
              font-size: 13px;
              text-align: right;
            }

            .pg-lv-map-section {
              padding: 75px 0;
            }

            .pg-lv-map-header {
              margin-bottom: 32px;
            }

            .pg-lv-heading {
              font-size: 35px;
            }

            .pg-lv-map-intro {
              font-size: 14px;
            }

            .pg-lv-map-layout {
              gap: 30px;
            }

            .pg-lv-connection {
              padding: 17px 16px;
            }

            .pg-lv-connection-title {
              font-size: 15px;
            }

            .pg-lv-map-card {
              min-height: 0;
            }

            .pg-lv-map-iframe {
              min-height: 390px;
            }

            .pg-lv-map-toolbar {
              padding: 17px;
            }

            .pg-lv-map-toolbar-note {
              display: none;
            }

            .pg-lv-map-footer {
              padding: 17px;
            }

            .pg-lv-tour-section {
              padding: 75px 0;
            }

            .pg-lv-tour-heading {
              margin-bottom: 30px;
            }

            .pg-lv-tour-title {
              font-size: 39px;
            }

            .pg-lv-tour-description {
              font-size: 14px;
            }

            .pg-lv-tour-badge {
              display: none;
            }

            .pg-lv-tour-toolbar {
              padding: 17px;
            }

            .pg-lv-tour-iframe {
              height: 440px;
            }

            .pg-lv-tour-footer {
              padding: 18px;
            }

            .pg-lv-tour-button {
              width: 100%;
            }

            .pg-lv-cta {
              padding: 60px 0;
            }

            .pg-lv-cta-inner {
              flex-direction: column;
              align-items: flex-start;
            }

            .pg-lv-cta-btn {
              width: 100%;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .pg-lv-btn,
            .pg-lv-connection {
              transition: none;
            }
          }
        `}
      </style>

      {/* ========================================
          1. BANNER ẢNH NỀN
      ======================================== */}

      <div
        className="pg-lv-hero"
        style={{
          backgroundImage: `
            linear-gradient(
              90deg,
              rgba(7, 30, 21, 0.88) 0%,
              rgba(7, 36, 24, 0.62) 47%,
              rgba(7, 36, 24, 0.18) 100%
            ),
            url("${LOCATION_IMAGE}")
          `,
        }}
      >
        <div className="pg-lv-container pg-lv-hero-inner">
          <div className="pg-lv-hero-content">
            <div className="pg-lv-eyebrow">
              PHÚ GIA ROYAL PARK • QUY NHƠN
            </div>

            {/* TIÊU ĐỀ TỪ ADMIN */}
            <h2 className="pg-lv-hero-title">
              {content.location_title}
            </h2>

            <div className="pg-lv-accent-line" />

            {/* MÔ TẢ TỪ ADMIN */}
            <p className="pg-lv-hero-description">
              {content.location_description}
            </p>

            <div className="pg-lv-hero-actions">
              <a
                href="#vi-tri-ban-do"
                className="pg-lv-btn pg-lv-btn-primary"
              >
                Khám phá vị trí <span>↗</span>
              </a>

              <a
                href="#vi-tri-360"
                className="pg-lv-btn pg-lv-btn-outline"
              >
                Trải nghiệm 360° <span>↗</span>
              </a>
            </div>
          </div>

          {/* DẢI THÔNG TIN TRÊN ẢNH */}
          <div className="pg-lv-hero-strip">
            <div className="pg-lv-strip-item">
              <span className="pg-lv-strip-label">
                Vị trí
              </span>

              <span className="pg-lv-strip-value">
                Đường Tây Sơn, Quy Nhơn
              </span>
            </div>

            <div className="pg-lv-strip-item">
              <span className="pg-lv-strip-label">
                Khám phá
              </span>

              <span className="pg-lv-strip-value">
                Google Maps tương tác
              </span>
            </div>

            <div className="pg-lv-strip-item">
              <span className="pg-lv-strip-label">
                Trải nghiệm
              </span>

              <span className="pg-lv-strip-value">
                Thực tế ảo 360°
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          2. KẾT NỐI GIAO THÔNG VÀ GOOGLE MAPS
      ======================================== */}

      <div
        id="vi-tri-ban-do"
        className="pg-lv-map-section"
      >
        <div className="pg-lv-container">
          <div className="pg-lv-map-header">
            <div>
              <div className="pg-lv-section-label">
                01 / KẾT NỐI GIAO THÔNG
              </div>

              <h3 className="pg-lv-heading">
                Vị trí thuận tiện,
                <span> kết nối đa chiều</span>
              </h3>
            </div>

            <p className="pg-lv-map-intro">
              Khám phá vị trí Phú Gia Royal Park
              trên bản đồ và các khu vực kết nối
              được giới thiệu trong dự án.
            </p>
          </div>

          <div className="pg-lv-map-layout">
            {/* DANH SÁCH TỪ ADMIN */}
            <div className="pg-lv-connections">
              {connections.map((item, index) => (
                <div
                  key={item.id}
                  className="pg-lv-connection"
                >
                  <span className="pg-lv-connection-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="pg-lv-connection-content">
                    <h4 className="pg-lv-connection-title">
                      {item.title}
                    </h4>

                    {item.description && (
                      <p className="pg-lv-connection-description">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* GOOGLE MAPS */}
            <div className="pg-lv-map-card">
              <div className="pg-lv-map-toolbar">
                <div className="pg-lv-map-toolbar-title">
                  <span className="pg-lv-map-dot" />
                  Bản đồ Phú Gia Royal Park
                </div>

                <span className="pg-lv-map-toolbar-note">
                  GOOGLE MAPS
                </span>
              </div>

              <iframe
                className="pg-lv-map-iframe"
                src={MAP_EMBED_URL}
                title="Google Maps vị trí Phú Gia Royal Park"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />

              <div className="pg-lv-map-footer">
                <span className="pg-lv-map-footer-text">
                  Phóng to và di chuyển để khám phá
                </span>

                <a
                  href={MAP_OPEN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pg-lv-map-link"
                >
                  Mở Google Maps ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          3. TRẢI NGHIỆM THỰC TẾ ẢO 360
      ======================================== */}

      <div
        id="vi-tri-360"
        className="pg-lv-tour-section"
      >
        <div className="pg-lv-container">
          <div className="pg-lv-tour-heading">
            <div className="pg-lv-tour-copy">
              <div className="pg-lv-tour-label">
                02 / TRẢI NGHIỆM THỰC TẾ ẢO
              </div>

              <h3 className="pg-lv-tour-title">
                Trải nghiệm dự án
                <span> qua góc nhìn 360°</span>
              </h3>

              <p className="pg-lv-tour-description">
                Khám phá Phú Gia Royal Park
                qua không gian tham quan trực quan.
                Tương tác với hình ảnh 360° để
                quan sát dự án từ nhiều góc nhìn.
              </p>
            </div>

            <div
              className="pg-lv-tour-badge"
              aria-hidden="true"
            >
              <span className="pg-lv-tour-badge-number">
                360°
              </span>

              <span className="pg-lv-tour-badge-text">
                VIRTUAL
              </span>
            </div>
          </div>

          <div className="pg-lv-tour-card">
            <div className="pg-lv-tour-toolbar">
              <span className="pg-lv-tour-toolbar-title">
                ◉ Trải nghiệm Phú Gia Royal Park 360°
              </span>

              <a
                className="pg-lv-tour-open"
                href={TOUR_360_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Mở toàn màn hình ↗
              </a>
            </div>

            <iframe
              className="pg-lv-tour-iframe"
              src={TOUR_360_URL}
              title="Tham quan thực tế ảo 360 độ Phú Gia Royal Park"
              loading="lazy"
              allow="fullscreen; accelerometer; gyroscope; xr-spatial-tracking"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />

            <div className="pg-lv-tour-footer">
              <p className="pg-lv-tour-help">
                Nếu tour không hiển thị trong
                website, bạn có thể mở trực tiếp
                để trải nghiệm đầy đủ.
              </p>

              <a
                className="pg-lv-tour-button"
                href={TOUR_360_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Khám phá 360° ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          4. ĐĂNG KÝ TƯ VẤN
      ======================================== */}

      
    </section>
  );
}
