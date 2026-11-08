
import { useEffect, useState } from "react";
import "./HeroBanner.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const DEFAULT_CONTENT = {
  home_label: "PHÚ GIA ROYAL PARK • QUY NHƠN",

  home_title:
    "PHÚ GIA ROYAL PARK / Không gian sống xanh",

  home_description:
    "Phú Gia Royal Park mang đến không gian sống hiện đại, " +
    "hài hòa cùng thiên nhiên và hệ thống tiện ích, " +
    "mở ra những giá trị sống bền vững.",
};

export default function HeroBanner() {
  const [content, setContent] = useState(DEFAULT_CONTENT);

  // Tải font Dancing Script
  useEffect(() => {
    const fontId = "pg-dancing-script-font";

    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");

      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?" +
        "family=Dancing+Script:wght@400..700&display=swap";

      document.head.appendChild(link);
    }
  }, []);

  // Lấy nội dung ADMIN đã lưu
  useEffect(() => {
    const controller = new AbortController();

    async function loadWebsiteContent() {
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
            "Không thể tải nội dung trang chủ."
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
            "Lỗi tải nội dung Hero Banner:",
            error
          );
        }
      }
    }

    loadWebsiteContent();

    return () => controller.abort();
  }, []);

  const openConsultation = () => {
    window.dispatchEvent(
      new Event("openConsultation")
    );
  };

  // Dấu / tự động xuống hàng
  const titleLines = content.home_title
    .split("/")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <section id="trang-chu" className="pg-hero">
      <div className="pg-hero-background" />

      <div className="pg-hero-overlay" />

      <div className="pg-hero-content">
        <div className="pg-hero-label">
          {content.home_label}
        </div>

        <h1
          style={{
            marginBottom: "22px",
            lineHeight: 1.2,
            textTransform: "none",
            color: "#ffffff",
            WebkitTextFillColor: "#ffffff",
          }}
        >
          {titleLines.map((line, index) => {
            const isMainTitle = index === 0;

            return (
              <span
                key={index}
                style={{
                  display: "block",

                  // DÒNG ĐẦU: DANCING SCRIPT
                  fontFamily: isMainTitle
                    ? '"Dancing Script", cursive'
                    : '"Segoe UI", Arial, sans-serif',

                  fontSize: isMainTitle
                    ? "clamp(38px, 5.5vw, 78px)"
                    : "clamp(20px, 2.5vw, 34px)",

                  fontWeight: isMainTitle
                    ? 700
                    : 500,

                  // Dòng đầu trắng, dòng sau xanh
                  color: isMainTitle
                    ? "#ffffff"
                    : "#8EE2A1",

                  WebkitTextFillColor: isMainTitle
                    ? "#ffffff"
                    : "#8EE2A1",

                  background: "none",
                  backgroundImage: "none",
                  backgroundClip: "border-box",
                  WebkitBackgroundClip: "border-box",

                  textTransform: "none",

                  letterSpacing: isMainTitle
                    ? "0.01em"
                    : "0.025em",

                  lineHeight: isMainTitle
                    ? 1.3
                    : 1.5,

                  marginTop: isMainTitle
                    ? "0"
                    : "14px",

                  textShadow: isMainTitle
                    ? "0 3px 14px rgba(0,0,0,0.3)"
                    : "0 2px 8px rgba(0,0,0,0.2)",

                  whiteSpace: "pre-wrap",
                  overflowWrap: "break-word",
                }}
              >
                {line}
              </span>
            );
          })}
        </h1>

        <p
          style={{
            color: "#ffffff",
            WebkitTextFillColor: "#ffffff",
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: "clamp(14px, 1.2vw, 17px)",
            fontWeight: 400,
            lineHeight: 1.8,
            opacity: 1,
            textTransform: "none",
            whiteSpace: "pre-line",
          }}
        >
          {content.home_description}
        </p>

        <div className="pg-hero-actions">
          <a
            href="#phan-khu"
            className="pg-hero-primary"
          >
            Khám phá dự án
          </a>

          <button
            type="button"
            className="pg-hero-secondary"
            onClick={openConsultation}
          >
            Đăng ký tư vấn
          </button>
        </div>
      </div>

      <div className="pg-hero-bottom">
        <span>PHÚ GIA ROYAL PARK</span>
        <span>KHÔNG GIAN SỐNG XANH</span>
        <span>QUY NHƠN</span>
      </div>
    </section>
  );
}
