
import { useState } from "react";

const MASTER_PLAN_IMAGE = "/images/mat-bang-phu-gia.jpg";

export default function MasterPlanSection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section id="mat-bang" className="pg-masterplan">
      <style>{`
        .pg-masterplan {
          padding: 90px 24px 105px;
          background: #f7faf7;
          font-family: "Segoe UI", Arial, sans-serif;
          scroll-margin-top: 80px;
        }

        .pg-masterplan * {
          box-sizing: border-box;
        }

        .pg-masterplan-container {
          max-width: 1280px;
          margin: 0 auto;
        }

        .pg-masterplan-heading {
          text-align: center;
          margin-bottom: 40px;
        }

        .pg-masterplan-label {
          display: block;
          margin-bottom: 15px;
          color: #27804c;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 3px;
        }

        .pg-masterplan-heading h2 {
          margin: 0 0 18px;
          color: #17432e;
          font-family: Georgia, serif;
          font-size: clamp(32px, 4vw, 52px);
          font-weight: 600;
        }

        .pg-masterplan-heading p {
          max-width: 720px;
          margin: 0 auto;
          color: #66776c;
          font-size: 15px;
          line-height: 1.9;
        }

        .pg-masterplan-image-wrap {
          padding: 12px;
          border: 1px solid #dce8df;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 18px 45px rgba(15, 67, 36, .08);
        }

        .pg-masterplan-image-button {
          display: block;
          width: 100%;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: zoom-in;
        }

        .pg-masterplan-image {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 10px;
        }

        .pg-masterplan-hint {
          margin-top: 20px;
          text-align: center;
          color: #718076;
          font-size: 13px;
        }

        .pg-masterplan-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 65px 20px 25px;
          background: rgba(5, 22, 13, .95);
        }

        .pg-masterplan-full-image {
          display: block;
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
        }

        .pg-masterplan-close {
          position: absolute;
          top: 18px;
          right: 20px;
          width: 44px;
          height: 44px;
          border: 0;
          border-radius: 50%;
          background: white;
          color: #17432e;
          font-size: 27px;
          cursor: pointer;
        }

        @media (max-width: 600px) {
          .pg-masterplan {
            padding: 65px 14px 75px;
          }

          .pg-masterplan-image-wrap {
            padding: 6px;
            border-radius: 12px;
          }
        }
      `}</style>

      <div className="pg-masterplan-container">
        <div className="pg-masterplan-heading">
          <span className="pg-masterplan-label">
            PHÚ GIA ROYAL PARK
          </span>

          <h2>Mặt bằng tổng thể dự án</h2>

          <p>
            Khám phá quy hoạch tổng thể và cách bố trí
            các khu vực tại Phú Gia Royal Park.
          </p>
        </div>

        <div className="pg-masterplan-image-wrap">
          <button
            type="button"
            className="pg-masterplan-image-button"
            onClick={() => setIsOpen(true)}
            aria-label="Phóng to mặt bằng dự án"
          >
            <img
              src={MASTER_PLAN_IMAGE}
              alt="Mặt bằng tổng thể Phú Gia Royal Park"
              className="pg-masterplan-image"
            />
          </button>
        </div>

        <p className="pg-masterplan-hint">
          Nhấn vào ảnh để xem mặt bằng ở kích thước lớn hơn.
        </p>
      </div>

      {isOpen && (
        <div
          className="pg-masterplan-overlay"
          onClick={() => setIsOpen(false)}
          role="presentation"
        >
          <button
            type="button"
            className="pg-masterplan-close"
            onClick={() => setIsOpen(false)}
            aria-label="Đóng ảnh"
          >
            ×
          </button>

          <img
            src={MASTER_PLAN_IMAGE}
            alt="Mặt bằng tổng thể Phú Gia Royal Park"
            className="pg-masterplan-full-image"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
