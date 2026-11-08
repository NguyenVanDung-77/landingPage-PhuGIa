
import React from "react";
import "./Footer.css";

const PHONE = "0931589777";
const ZALO_URL = `https://zalo.me/${PHONE}`;

export default function Footer() {
  return (
    <>
      <footer className="pg-footer" id="footer">
        <div className="pg-footer-container">
          <div className="pg-footer-main">
            <div className="pg-footer-brand">
              <a href="/" className="pg-footer-logo">
                <img
                  src="/images/logo.jpg"
                  alt="Phú Gia Royal Park"
                />
              </a>

              <h2>PHÚ GIA ROYAL PARK</h2>

              <p>
                Khám phá không gian sống và những
                thông tin mới nhất về dự án Phú Gia
                Royal Park tại Quy Nhơn.
              </p>
            </div>

            <div className="pg-footer-column">
              <h3>KHÁM PHÁ</h3>

              <a href="/#tong-quan">Tổng quan dự án</a>
              <a href="/#vi-tri">Vị trí dự án</a>
              <a href="/#tien-ich">Tiện ích</a>
              <a href="/#san-pham">Sản phẩm</a>
              <a href="/#mat-bang">Mặt bằng</a>
            </div>

            <div className="pg-footer-column">
              <h3>LIÊN HỆ</h3>

              <p>
                <span className="pg-footer-contact-icon">⌖</span>
                Đường Tây Sơn, Quy Nhơn
              </p>

              <a href={`tel:${PHONE}`}>
                <span className="pg-footer-contact-icon">☎</span>
                0931 589 777
              </a>

              <a
                href={ZALO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="pg-footer-contact-icon">✉</span>
                Tư vấn qua Zalo
              </a>
            </div>
          </div>

          <div className="pg-footer-bottom">
            <span>
              © {new Date().getFullYear()} Phú Gia Royal Park.
              All rights reserved.
            </span>

            <span>Không gian sống xanh tại Quy Nhơn</span>
          </div>
        </div>
      </footer>

      <div
        className="pg-floating-contact"
        aria-label="Liên hệ tư vấn"
      >
        <a
          className="pg-float-item pg-float-zalo"
          href={ZALO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Liên hệ qua Zalo"
          title="Chat Zalo"
        >
          <span className="pg-float-tooltip">Chat Zalo</span>

          <span className="pg-float-circle">
            <span className="pg-zalo-text">Zalo</span>
          </span>
        </a>

        <a
          className="pg-float-item pg-float-hotline"
          href={`tel:${PHONE}`}
          aria-label="Gọi hotline 0931 589 777"
          title="Gọi Hotline"
        >
          <span className="pg-float-tooltip">
            0931 589 777
          </span>

          <span className="pg-float-circle">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 16.92v3a2 2 0 0 1-3.27 2.09 19.79 19.79 0 0 1-8.63-5.1 19.79 19.79 0 0 1-5.1-8.63A2 2 0 0 1 7.09 5h3a2 2 0 0 1 2 1.72c.13.96.36 1.91.68 2.81a2 2 0 0 1-.45 2.11L11.05 12.9a16 16 0 0 0 6.05 6.05l1.27-1.27a2 2 0 0 1 2.11-.45c.9.32 1.85.55 2.81.68A2 2 0 0 1 22 19.92" transform="translate(-1 -2) scale(.92)" />
            </svg>
          </span>
        </a>
      </div>
    </>
  );
}
