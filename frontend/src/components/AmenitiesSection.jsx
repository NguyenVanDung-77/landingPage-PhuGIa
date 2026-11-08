
import { useEffect, useState } from "react";

const API_BASE = "http://localhost:8080";

// ==========================================
// 3 ẢNH NỀN CỐ ĐỊNH - KHÔNG THAY ĐỔI
// ==========================================

const BANNER_BACKGROUND = "/images/tien-ich-bg.jpg";
const INTERNAL_BACKGROUND = "/images/tien-ich-noi-khu.jpg";
const EXTERNAL_BACKGROUND = "/images/tien-ich-ngoai-khu.jpg";

// ==========================================
// NỘI DUNG CHUNG
// ==========================================

const DEFAULT_CONTENT = {
  amenities_title: "Hệ thống tiện ích Phú Gia Royal Park",

  amenities_description:
    "Khám phá không gian tiện ích nội khu " +
    "và ngoại khu, mang đến những trải nghiệm " +
    "sống tiện nghi tại Phú Gia Royal Park.",

  amenities_internal_title: "Tiện ích nội khu",

  amenities_internal_description:
    "Khám phá các tiện ích và không gian " +
    "trải nghiệm bên trong dự án.",

  amenities_external_title: "Tiện ích ngoại khu",

  amenities_external_description:
    "Khám phá những địa điểm và tiện ích " +
    "kết nối xung quanh Phú Gia Royal Park.",
};

// ==========================================
// CHUYỂN URL ẢNH ĐƯỢC ADMIN UPLOAD
// ==========================================

function resolveImageUrl(value) {
  const url = String(value || "").trim();

  if (!url) return "";

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (
    url.startsWith("/uploads/") ||
    url.startsWith("/api/uploads/")
  ) {
    return API_BASE + url;
  }

  if (
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes("..")
  ) {
    return url;
  }

  if (
    /^[a-zA-Z0-9_\-. ]+\.(jpg|jpeg|png|webp)$/i.test(url)
  ) {
    return "/images/" + encodeURIComponent(url);
  }

  return "";
}

// ==========================================
// ĐỌC DANH SÁCH TIỆN ÍCH TỪ MARIADB
//
// Mỗi tiện ích có:
// id, title, description, imageUrl
// ==========================================

function parseAmenityItems(value) {
  if (!value) return [];

  try {
    const data = JSON.parse(value);

    if (!Array.isArray(data)) return [];

    return data
      .filter(
        (item) =>
          item &&
          typeof item === "object" &&
          !Array.isArray(item)
      )
      .map((item, index) => ({
        id: String(item.id ?? index),
        title: String(
          item.title || item.name || "Tiện ích"
        ),
        description: String(
          item.description || ""
        ),
        imageUrl: resolveImageUrl(
          item.imageUrl || item.image || item.url
        ),
      }));
  } catch (error) {
    console.error(
      "Danh sách ảnh tiện ích không hợp lệ:",
      error
    );

    return [];
  }
}

// ==========================================
// THẺ ẢNH CỦA MỘT TIỆN ÍCH
// ==========================================


function AmenityPhotoCard({ item, index, onOpen }) {
  return (
    <article className="pg-ag-photo-card">
      <button
        type="button"
        className="pg-ag-photo-button"
        onClick={() => onOpen(index)}
        disabled={!item.imageUrl}
        aria-label={`Xem ảnh ${item.title}`}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
          />
        ) : (
          <div className="pg-ag-no-image">
            Chưa có ảnh
          </div>
        )}

        <span className="pg-ag-photo-zoom">⤢</span>
      </button>

      <div className="pg-ag-photo-body">
        <h4>{item.title}</h4>
        {item.description && <p>{item.description}</p>}
      </div>
    </article>
  );
}


// ==========================================
// GIAO DIỆN NỘI KHU / NGOẠI KHU
// ==========================================

function AmenityGroup({
  id,
  number,
  category,
  title,
  description,
  background,
  items,
  onOpen,
}) {
  return (
    <div
      id={id}
      className="pg-ag-group"
      style={{
        backgroundImage: `
          linear-gradient(
            180deg,
            rgba(7, 37, 23, 0.63) 0%,
            rgba(7, 37, 23, 0.78) 100%
          ),
          url("${background}")
        `,
      }}
    >
      <div className="pg-ag-group-top">
        <span className="pg-ag-group-brand">
          PHÚ GIA ROYAL PARK
        </span>

        <span className="pg-ag-group-number">
          {number}
        </span>
      </div>

      <div className="pg-ag-group-heading">
        <div className="pg-ag-group-kicker">
          <span />
          {category}
        </div>

        <h3>{title}</h3>

        <p>{description}</p>
      </div>

      <div className="pg-ag-gallery">
        <div className="pg-ag-gallery-heading">
          <span>DANH SÁCH TIỆN ÍCH</span>
          <span>
            {String(items.length).padStart(2, "0")}
          </span>
        </div>

        {items.length > 0 ? (
          <div className="pg-ag-gallery-grid">
            
            {items.map((item, index) => (
              <AmenityPhotoCard
                key={`${item.id}-${index}`}
                item={item}
                index={index}
                onOpen={(photoIndex) =>
                  onOpen(items, photoIndex)
                }
              />
            ))}

          </div>
        ) : (
          <div className="pg-ag-empty">
            <span className="pg-ag-empty-icon">
              ◇
            </span>

            <strong>
              Danh sách tiện ích đang cập nhật
            </strong>

            <p>
              Hình ảnh và thông tin tiện ích sẽ
              xuất hiện tại đây khi được thêm
              từ trang quản trị.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT CHÍNH
// ==========================================

export default function AmenitiesSection() {
  const [content, setContent] = useState(
    DEFAULT_CONTENT
  );

  const [internalItems, setInternalItems] =
    useState([]);

  const [externalItems, setExternalItems] =
    useState([]);

 
const [selectedPhoto, setSelectedPhoto] =
  useState(null);

const openPhoto = (items, index) => {
  setSelectedPhoto({
    items,
    index,
  });
};

const changePhoto = (direction) => {
  setSelectedPhoto((current) => {
    if (!current || current.items.length === 0) {
      return current;
    }

    const total = current.items.length;

    return {
      ...current,
      index: (current.index + direction + total) % total,
    };
  });
};

const currentPhoto = selectedPhoto
  ? selectedPhoto.items[selectedPhoto.index]
  : null;


  // ========================================
  // TẢI NỘI DUNG & DANH SÁCH TIỆN ÍCH
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
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
            "Không thể tải dữ liệu tiện ích."
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

        if (controller.signal.aborted) return;

        setContent(updatedContent);

        // Danh sách ảnh nội khu do ADMIN quản lý
        setInternalItems(
          parseAmenityItems(
            contentMap.amenities_internal_items
          )
        );

        // Danh sách ảnh ngoại khu do ADMIN quản lý
        setExternalItems(
          parseAmenityItems(
            contentMap.amenities_external_items
          )
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(
            "Lỗi tải tiện ích:",
            error
          );
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, []);

  // Đóng ảnh phóng to bằng phím ESC
  
useEffect(() => {
  if (!selectedPhoto) return;

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      setSelectedPhoto(null);
    }

    if (event.key === "ArrowLeft") {
      changePhoto(-1);
    }

    if (event.key === "ArrowRight") {
      changePhoto(1);
    }
  };

  window.addEventListener("keydown", onKeyDown);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
  };
}, [selectedPhoto]);


  const openConsultation = () => {
    window.dispatchEvent(
      new Event("openConsultation")
    );
  };

  return (
    <section id="tien-ich" className="pg-amenities-gallery">
      <style>
        {`
          /* =====================================
             TIỆN ÍCH PHÚ GIA ROYAL PARK
          ===================================== */

          .pg-amenities-gallery {
            width: 100%;
            overflow: hidden;
            background: #f7faf7;
            font-family: "Segoe UI", Arial, sans-serif;
            scroll-margin-top: 75px;
          }

          .pg-amenities-gallery *,
          .pg-amenities-gallery *::before,
          .pg-amenities-gallery *::after {
            box-sizing: border-box;
          }

          /* =====================================
             BANNER ẢNH NỀN CỐ ĐỊNH THỨ NHẤT
          ===================================== */

          .pg-ag-hero {
            min-height: 660px;
            display: flex;
            align-items: center;

            padding: 110px 30px;

            background-color: #17432f;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
          }

          .pg-ag-container {
            max-width: 1280px;
            width: 100%;
            margin: 0 auto;
          }

          .pg-ag-hero-content {
            max-width: 770px;
          }

          .pg-ag-eyebrow {
            display: flex;
            align-items: center;
            gap: 15px;

            margin-bottom: 28px;

            color: #b7edc7;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 3px;
          }

          .pg-ag-eyebrow::before {
            content: "";
            width: 42px;
            height: 2px;
            background: #b7edc7;
          }

          .pg-ag-hero-title {
            margin: 0 0 25px;

            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff;

            font-family:
              "Palatino Linotype",
              Georgia,
              serif;

            font-size: clamp(44px, 6vw, 78px);
            font-weight: 600;
            line-height: 1.12;
            letter-spacing: -1px;

            background: none !important;
            overflow-wrap: break-word;
          }

          .pg-ag-hero-line {
            width: 75px;
            height: 3px;
            margin-bottom: 26px;
            background: #b9eec8;
          }

          .pg-ag-hero-description {
            max-width: 630px;
            margin: 0;

            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff;

            font-size: 17px;
            font-weight: 400;
            line-height: 1.9;

            white-space: pre-line;
          }

          .pg-ag-hero-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 14px;
            margin-top: 33px;
          }

          .pg-ag-hero-actions a {
            padding: 14px 23px;

            border-radius: 50px;
            border: 1px solid #ffffff;

            color: #194b34;
            background: #ffffff;

            font-size: 13px;
            font-weight: 750;
            text-decoration: none;
          }

          .pg-ag-hero-actions a:last-child {
            color: #ffffff;
            background: rgba(255,255,255,0.12);
            backdrop-filter: blur(8px);
          }

          /* =====================================
             HAI KHU VỰC NẰM NGANG
          ===================================== */

          .pg-ag-content {
            padding: 85px 26px 105px;
          }

          .pg-ag-heading {
            margin: 0 auto 42px;
            text-align: center;
          }

          .pg-ag-heading span {
            color: #308954;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 2.5px;
          }

          .pg-ag-heading h2 {
            margin: 17px 0 0;
            color: #17432e;

            font-family: Georgia, serif;
            font-size: clamp(30px, 4vw, 48px);
            font-weight: 600;
          }

          .pg-ag-columns {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            align-items: stretch;
            gap: 22px;
          }

          /* =====================================
             NỀN CỐ ĐỊNH NỘI KHU & NGOẠI KHU
          ===================================== */

          .pg-ag-group {
            min-width: 0;
            min-height: 750px;

            display: flex;
            flex-direction: column;

            padding: 30px;

            border-radius: 19px;
            overflow: hidden;

            background-color: #174733;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;

            scroll-margin-top: 90px;

            box-shadow:
              0 18px 45px rgba(15, 67, 36, 0.12);
          }

          .pg-ag-group-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
          }

          .pg-ag-group-brand {
            color: #e4fae9;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 2px;
          }

          .pg-ag-group-number {
            display: flex;
            align-items: center;
            justify-content: center;

            width: 43px;
            height: 43px;

            border: 1px solid rgba(255,255,255,0.6);
            border-radius: 50%;

            color: #ffffff;
            font-size: 12px;
            font-weight: 750;
          }

          .pg-ag-group-heading {
            margin: 110px 0 35px;
          }

          .pg-ag-group-kicker {
            display: flex;
            align-items: center;
            gap: 12px;

            margin-bottom: 20px;

            color: #b9f2c9;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 2px;
          }

          .pg-ag-group-kicker span {
            width: 32px;
            height: 2px;
            background: #b9f2c9;
          }

          .pg-ag-group-heading h3 {
            margin: 0 0 21px;

            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff;

            font-family: Georgia, serif;
            font-size: clamp(33px, 3.3vw, 49px);
            font-weight: 600;
            line-height: 1.15;

            background: none !important;
            overflow-wrap: break-word;
          }

          .pg-ag-group-heading p {
            max-width: 520px;
            margin: 0;

            color: #f0fff3 !important;
            font-size: 15px;
            line-height: 1.85;
            white-space: pre-line;
          }

          /* =====================================
             DANH SÁCH ẢNH TIỆN ÍCH ĐÈ TRÊN NỀN
          ===================================== */

          .pg-ag-gallery {
            margin-top: auto;
            padding: 23px;

            border: 1px solid rgba(255,255,255,0.35);
            border-radius: 16px;

            background: rgba(12, 40, 26, 0.48);

            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
          }

          .pg-ag-gallery-heading {
            display: flex;
            justify-content: space-between;
            align-items: center;

            gap: 15px;
            padding-bottom: 16px;
            margin-bottom: 19px;

            border-bottom:
              1px solid rgba(255,255,255,0.28);

            color: #e8fff0;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.5px;
          }

          .pg-ag-gallery-grid {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            gap: 14px;
          }

          /* =====================================
             THẺ ẢNH TIỆN ÍCH
          ===================================== */

          .pg-ag-photo-card {
            min-width: 0;
            overflow: hidden;

            border-radius: 11px;
            background: #ffffff;
            border: 1px solid rgba(255,255,255,0.7);

            box-shadow:
              0 8px 22px rgba(0,0,0,0.10);
          }

          .pg-ag-photo-button {
            position: relative;
            display: block;
            width: 100%;
            height: 160px;

            padding: 0;
            border: 0;
            background: #e8eee9;

            cursor: zoom-in;
            overflow: hidden;
          }

          .pg-ag-photo-button:disabled {
            cursor: default;
          }

          .pg-ag-photo-button img {
            width: 100%;
            height: 100%;
            display: block;

            object-fit: cover;
            transition: transform 0.3s ease;
          }

          .pg-ag-photo-button:hover img {
            transform: scale(1.06);
          }

          .pg-ag-no-image {
            display: flex;
            align-items: center;
            justify-content: center;

            width: 100%;
            height: 100%;

            color: #6a806f;
            font-size: 13px;
          }

          .pg-ag-photo-zoom {
            position: absolute;
            right: 10px;
            bottom: 10px;

            display: flex;
            align-items: center;
            justify-content: center;

            width: 29px;
            height: 29px;

            border-radius: 7px;
            background: rgba(255,255,255,0.9);
            color: #17513a;

            font-size: 19px;
          }

          .pg-ag-photo-body {
            padding: 15px;
          }

          .pg-ag-photo-body h4 {
            margin: 0 0 7px;

            color: #183d2b;
            font-size: 15px;
            font-weight: 750;
            line-height: 1.45;

            overflow-wrap: break-word;
          }

          .pg-ag-photo-body p {
            margin: 0;

            color: #718076;
            font-size: 12px;
            line-height: 1.7;
            white-space: pre-line;

            overflow-wrap: break-word;
          }

          /* DANH SÁCH RỖNG */

          .pg-ag-empty {
            padding: 35px 17px;
            text-align: center;
            color: #ffffff;
          }

          .pg-ag-empty-icon {
            display: block;
            margin-bottom: 12px;
            color: #c5f0d0;
            font-size: 35px;
          }

          .pg-ag-empty strong {
            display: block;
            margin-bottom: 10px;
            font-size: 14px;
          }

          .pg-ag-empty p {
            max-width: 320px;
            margin: 0 auto;

            color: #d6f0dc;
            font-size: 12px;
            line-height: 1.8;
          }

          /* =====================================
             TƯ VẤN
          ===================================== */

          .pg-ag-bottom {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 25px;

            padding: 65px max(26px, calc((100% - 1280px)/2));

            background: #123d2a;
            color: #ffffff;
          }

          .pg-ag-bottom span {
            color: #b9efc7;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 2px;
          }

          .pg-ag-bottom h3 {
            margin: 13px 0 0;

            color: #ffffff !important;
            font-family: Georgia, serif;
            font-size: clamp(25px, 3vw, 38px);
            font-weight: 600;
          }

          .pg-ag-bottom button {
            flex-shrink: 0;
            padding: 14px 22px;

            border: 0;
            border-radius: 50px;

            background: #ffffff;
            color: #174c33;

            font-size: 13px;
            font-weight: 750;
            cursor: pointer;
          }

          /* =====================================
             XEM ẢNH PHÓNG TO
          ===================================== */

          .pg-ag-modal {
            position: fixed;
            z-index: 99999;
            inset: 0;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 25px;
            background: rgba(4, 20, 12, 0.93);
          }

          .pg-ag-modal-box {
            width: min(100%, 1050px);
            max-height: 90vh;

            display: flex;
            flex-direction: column;
            position: relative;
          }

          .pg-ag-modal-close {
            position: absolute;
            right: 10px;
            top: 10px;
            z-index: 2;

            width: 40px;
            height: 40px;

            border: 0;
            border-radius: 50%;

            background: #ffffff;
            color: #123c2a;

            font-size: 24px;
            cursor: pointer;
          }

          .pg-ag-modal-image {
            display: block;
            width: 100%;
            max-height: 72vh;

            object-fit: contain;
            border-radius: 12px 12px 0 0;
            background: #102b20;
          }

          .pg-ag-modal-caption {
            padding: 20px;
            background: #ffffff;
            border-radius: 0 0 12px 12px;
          }

          .pg-ag-modal-caption strong {
            display: block;
            color: #17442e;
            font-size: 18px;
            margin-bottom: 5px;
          }

          .pg-ag-modal-caption p {
            margin: 0;
            color: #708075;
            font-size: 13px;
            line-height: 1.7;
          }

          
/* MŨI TÊN CHỈ HIỆN KHI PHÓNG TO ẢNH */

.pg-ag-nav-arrow {
  position: absolute;
  top: 45%;
  z-index: 5;
  transform: translateY(-50%);

  display: flex;
  align-items: center;
  justify-content: center;

  width: 50px;
  height: 50px;
  padding: 0 0 5px;

  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 50%;

  background: rgba(255, 255, 255, 0.95);
  color: #176b43;

  font-family: Arial, sans-serif;
  font-size: 36px;
  line-height: 1;

  cursor: pointer;
  box-shadow: 0 5px 18px rgba(0, 0, 0, 0.2);
}

.pg-ag-nav-arrow:hover {
  background: #176b43;
  color: #ffffff;
}

.pg-ag-nav-prev {
  left: 15px;
}

.pg-ag-nav-next {
  right: 15px;
}

@media (max-width: 560px) {
  .pg-ag-nav-arrow {
    width: 38px;
    height: 38px;
    font-size: 29px;
  }

  .pg-ag-nav-prev {
    left: 7px;
  }

  .pg-ag-nav-next {
    right: 7px;
  }
}



          /* =====================================
             RESPONSIVE
          ===================================== */

          @media (max-width: 1050px) {
            .pg-ag-group {
              padding: 22px;
            }

            .pg-ag-gallery {
              padding: 15px;
            }

            .pg-ag-gallery-grid {
              gap: 10px;
            }

            .pg-ag-photo-button {
              height: 130px;
            }
          }

          @media (max-width: 820px) {
            .pg-ag-columns {
              grid-template-columns: 1fr;
            }

            .pg-ag-group {
              min-height: 640px;
              padding: 25px;
            }

            .pg-ag-group-heading {
              margin-top: 75px;
            }

            .pg-ag-photo-button {
              height: 200px;
            }
          }

          @media (max-width: 560px) {
            .pg-ag-hero {
              min-height: 560px;
              padding: 90px 18px;
            }

            .pg-ag-eyebrow {
              font-size: 10px;
              letter-spacing: 1.5px;
            }

            .pg-ag-hero-title {
              font-size: clamp(38px, 10vw, 53px);
            }

            .pg-ag-hero-description {
              font-size: 14px;
            }

            .pg-ag-content {
              padding: 65px 13px 75px;
            }

            .pg-ag-heading h2 {
              font-size: 34px;
            }

            .pg-ag-group {
              padding: 17px;
              border-radius: 13px;
            }

            .pg-ag-group-heading {
              margin-top: 60px;
            }

            .pg-ag-group-heading h3 {
              font-size: 37px;
            }

            .pg-ag-group-heading p {
              font-size: 14px;
            }

            .pg-ag-photo-button {
              height: 120px;
            }

            .pg-ag-photo-body {
              padding: 12px;
            }

            .pg-ag-photo-body h4 {
              font-size: 13px;
            }

            .pg-ag-bottom {
              flex-direction: column;
              align-items: flex-start;
              padding: 55px 20px;
            }

            .pg-ag-bottom button {
              width: 100%;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .pg-ag-photo-button img {
              transition: none;
            }
          }
        `}
      </style>

      

      {/* ==================================
          ẢNH NỀN 1: BANNER TIỆN ÍCH
      ================================== */}

      <div
        className="pg-ag-hero"
        style={{
          backgroundImage: `
            linear-gradient(
              90deg,
              rgba(6, 31, 19, 0.87),
              rgba(7, 33, 21, 0.40)
            ),
            url("${BANNER_BACKGROUND}")
          `,
        }}
      >
        <div className="pg-ag-container">
          <div className="pg-ag-hero-content">
            <div className="pg-ag-eyebrow">
              PHÚ GIA ROYAL PARK • QUY NHƠN
            </div>

            <h2 className="pg-ag-hero-title">
              {content.amenities_title}
            </h2>

            <div className="pg-ag-hero-line" />

            <p className="pg-ag-hero-description">
              {content.amenities_description}
            </p>

            <div className="pg-ag-hero-actions">
              <a href="#tien-ich-noi-khu">
                Khám phá nội khu ↗
              </a>

              <a href="#tien-ich-ngoai-khu">
                Khám phá ngoại khu ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================
          NỘI KHU VÀ NGOẠI KHU NẰM NGANG
      ================================== */}

      <div className="pg-ag-content">
        <div className="pg-ag-container">
          <div className="pg-ag-heading">
            <span>KHÁM PHÁ TIỆN ÍCH</span>

            <h2>Nội khu & Ngoại khu</h2>
          </div>

          <div className="pg-ag-columns">
            {/* ẢNH NỀN 2: NỘI KHU */}
            <AmenityGroup
              id="tien-ich-noi-khu"
              number="01"
              category="TIỆN ÍCH NỘI KHU"
              title={content.amenities_internal_title}
              description={
                content.amenities_internal_description
              }
              background={INTERNAL_BACKGROUND}
              items={internalItems}
              onOpen={openPhoto}
            />

            {/* ẢNH NỀN 3: NGOẠI KHU */}
            <AmenityGroup
              id="tien-ich-ngoai-khu"
              number="02"
              category="TIỆN ÍCH NGOẠI KHU"
              title={content.amenities_external_title}
              description={
                content.amenities_external_description
              }
              background={EXTERNAL_BACKGROUND}
              items={externalItems}
              onOpen={openPhoto}
            />
          </div>
        </div>
      </div>

      {/* ==================================
          TƯ VẤN
      ================================== */}

      <div className="pg-ag-bottom">
        <div>
          <span>PHÚ GIA ROYAL PARK</span>

          <h3>
            Khám phá trải nghiệm sống tại dự án
          </h3>
        </div>

        <button
          type="button"
          onClick={openConsultation}
        >
          Đăng ký tư vấn ↗
        </button>
      </div>

      {/* ==================================
          XEM ẢNH PHÓNG TO
      ================================== */}

      
{currentPhoto && (
  <div
    className="pg-ag-modal"
    role="presentation"
    onClick={() => setSelectedPhoto(null)}
  >
    <div
      className="pg-ag-modal-box"
      role="dialog"
      aria-modal="true"
      aria-label={currentPhoto.title}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="pg-ag-modal-close"
        onClick={() => setSelectedPhoto(null)}
        aria-label="Đóng ảnh"
      >
        ×
      </button>

      <img
        className="pg-ag-modal-image"
        src={currentPhoto.imageUrl}
        alt={currentPhoto.title}
      />

      {selectedPhoto.items.length > 1 && (
        <>
          <button
            type="button"
            className="pg-ag-nav-arrow pg-ag-nav-prev"
            onClick={() => changePhoto(-1)}
            aria-label="Xem ảnh trước"
          >
            ‹
          </button>

          <button
            type="button"
            className="pg-ag-nav-arrow pg-ag-nav-next"
            onClick={() => changePhoto(1)}
            aria-label="Xem ảnh tiếp theo"
          >
            ›
          </button>
        </>
      )}

      <div className="pg-ag-modal-caption">
        <strong>{currentPhoto.title}</strong>

        {currentPhoto.description && (
          <p>{currentPhoto.description}</p>
        )}

        <p style={{ marginTop: 8 }}>
          Ảnh {selectedPhoto.index + 1} /{" "}
          {selectedPhoto.items.length}
        </p>
      </div>
    </div>
  </div>
)}

    </section>
  );
}
