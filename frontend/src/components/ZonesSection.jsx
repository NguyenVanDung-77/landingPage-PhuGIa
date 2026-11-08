
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const ZONES = [
  { id: "ruby", name: "Ruby", number: "01" },
  { id: "crystal", name: "Crystal", number: "02" },
  { id: "sapphire", name: "Sapphire", number: "03" },
];

function getImageUrl(value) {
  const url = String(value || "").trim();

  if (!url) return "";

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith("/api/")) {
    return API_BASE + url;
  }

  if (
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes("..")
  ) {
    return url;
  }

  return "";
}

function getZoneImages(contents, zoneId) {
  const galleryValue = contents[`${zoneId}_images`];
  const oldImage = contents[`${zoneId}_image`];

  let images = [];

  try {
    const parsed = JSON.parse(galleryValue || "[]");

    if (Array.isArray(parsed)) {
      images = parsed.filter(
        (url) => typeof url === "string" && url.trim()
      );
    }
  } catch {
    images = [];
  }

  // Tương thích với dữ liệu cũ chỉ có một ảnh.
  if (!galleryValue && oldImage) {
    images.unshift(oldImage);
  }

  return [...new Set(images)]
    .map(getImageUrl)
    .filter(Boolean);
}

export default function ZonesSection() {
  const [contents, setContents] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeImages, setActiveImages] = useState({});
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadContents() {
      try {
        const response = await fetch(
          `${API_BASE}/api/contents`,
          {
            credentials: "include",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Không thể tải thông tin phân khu.");
        }

        const data = await response.json();
        const map = {};

        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (typeof item?.contentKey === "string") {
              map[item.contentKey] =
                item.contentValue || "";
            }
          });
        }

        setContents(map);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(
            "Lỗi tải dữ liệu phân khu:",
            error
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadContents();

    return () => controller.abort();
  }, []);

  function changeImage(zoneId, direction, count) {
    if (count <= 1) return;

    setActiveImages((current) => {
      const currentIndex = current[zoneId] || 0;

      return {
        ...current,
        [zoneId]:
          (currentIndex + direction + count) % count,
      };
    });
  }

  function selectImage(zoneId, index) {
    setActiveImages((current) => ({
      ...current,
      [zoneId]: index,
    }));
  }

  function openLightbox(zone, images, index) {
    setLightbox({
      title: `Phân khu ${zone.name}`,
      images,
      index,
    });
  }

  function changeLightboxImage(direction) {
    setLightbox((current) => {
      if (!current || current.images.length <= 1) {
        return current;
      }

      return {
        ...current,
        index:
          (current.index +
            direction +
            current.images.length) %
          current.images.length,
      };
    });
  }

  useEffect(() => {
    if (!lightbox) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setLightbox(null);
      }

      if (event.key === "ArrowLeft") {
        changeLightboxImage(-1);
      }

      if (event.key === "ArrowRight") {
        changeLightboxImage(1);
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [lightbox]);

  return (
    <section id="phan-khu" className="pz-section">
      <style>{`
        .pz-section {
          position: relative;
          width: 100%;
          padding: 100px 24px;
          background-image:
            linear-gradient(
              rgba(20, 100, 55, 0.65),
              rgba(12, 75, 40, 0.75)
            ),
            url("/images/phan-khu-bg.jpg");
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          color: #173c2a;
          font-family: "Segoe UI", Arial, sans-serif;
        }

        .pz-section * {
          box-sizing: border-box;
        }

        .pz-container {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
        }

        .pz-header {
          max-width: 780px;
          margin: 0 auto 58px;
          text-align: center;
        }

        .pz-eyebrow {
          display: block;
          margin-bottom: 15px;
          color: #e0f5e5;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 3px;
          text-transform: uppercase;
        }

        .pz-header h2 {
          margin: 0 0 20px;
          color: #ffffff;
          font-size: clamp(30px, 4vw, 48px);
          font-weight: 800;
          line-height: 1.25;
          text-shadow: 0 2px 8px rgba(0,0,0,.25);
        }

        .pz-header-line {
          width: 65px;
          height: 4px;
          margin: 0 auto;
          border-radius: 20px;
          background: #d8f5df;
        }

        .pz-loading {
          padding: 40px;
          text-align: center;
          color: #ffffff;
        }

        .pz-list {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .pz-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 390px;
          overflow: hidden;
          border: 1px solid rgba(45,119,75,.12);
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 14px 45px rgba(21,73,43,.12);
        }

        .pz-card:nth-child(even) .pz-image-side {
          order: 2;
        }

        .pz-card:nth-child(even) .pz-content {
          order: 1;
        }

        .pz-image-side {
          position: relative;
          min-width: 0;
          min-height: 390px;
          overflow: hidden;
          background: #e7f1e9;
        }

        .pz-image-stage {
          position: relative;
          width: 100%;
          height: 390px;
          overflow: hidden;
        }

        .pz-image-button {
          display: block;
          width: 100%;
          height: 100%;
          padding: 0;
          border: none;
          background: transparent;
          cursor: zoom-in;
        }

        .pz-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform .4s ease;
        }

        .pz-image-button:hover .pz-image {
          transform: scale(1.035);
        }

        .pz-image-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          gap: 12px;
          color: #769782;
          text-align: center;
        }

        .pz-placeholder-icon {
          font-size: 55px;
        }

        .pz-image-placeholder p {
          margin: 0;
          font-size: 14px;
        }

        .pz-image-label {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 2;
          padding: 10px 16px;
          border-radius: 8px;
          background: rgba(255,255,255,.94);
          color: #207345;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
          pointer-events: none;
        }

        .pz-nav-button {
          position: absolute;
          top: 50%;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          padding: 0;
          transform: translateY(-50%);
          border: 1px solid rgba(255,255,255,.65);
          border-radius: 50%;
          background: rgba(255,255,255,.88);
          color: #176b43;
          font-size: 27px;
          font-weight: 700;
          cursor: pointer;
          transition: background .2s ease;
        }

        .pz-nav-button:hover {
          background: #ffffff;
        }

        .pz-nav-prev {
          left: 14px;
        }

        .pz-nav-next {
          right: 14px;
        }

        .pz-image-counter {
          position: absolute;
          right: 18px;
          bottom: 18px;
          z-index: 2;
          padding: 8px 13px;
          border-radius: 20px;
          background: rgba(0,0,0,.58);
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          pointer-events: none;
        }

        .pz-thumbnails {
          display: flex;
          gap: 9px;
          padding: 12px;
          overflow-x: auto;
          background: #f2f7f3;
          scrollbar-width: thin;
        }

        .pz-thumbnail {
          width: 76px;
          height: 58px;
          flex-shrink: 0;
          padding: 0;
          overflow: hidden;
          border: 2px solid transparent;
          border-radius: 7px;
          background: #dbe8de;
          cursor: pointer;
        }

        .pz-thumbnail img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pz-thumbnail-active {
          border-color: #248b50;
        }

        .pz-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          min-width: 0;
          padding: clamp(30px, 4vw, 62px);
        }

        .pz-number {
          margin-bottom: 18px;
          color: #328657;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 3px;
        }

        .pz-content h3 {
          margin: 0 0 23px;
          color: #17452e;
          font-size: clamp(29px, 3vw, 40px);
          font-weight: 800;
          line-height: 1.2;
        }

        .pz-divider {
          width: 52px;
          height: 3px;
          margin-bottom: 26px;
          border-radius: 10px;
          background: #2c8a52;
        }

        .pz-description {
          margin: 0;
          color: #65776a;
          font-size: 15px;
          line-height: 1.95;
          white-space: pre-line;
          overflow-wrap: anywhere;
        }

        .pz-modal {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 65px 70px;
          background: rgba(0,0,0,.9);
        }

        .pz-modal-image {
          display: block;
          max-width: 100%;
          max-height: 83vh;
          object-fit: contain;
          border-radius: 8px;
        }

        .pz-modal-close {
          position: absolute;
          top: 18px;
          right: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 43px;
          height: 43px;
          border: 1px solid rgba(255,255,255,.4);
          border-radius: 50%;
          background: rgba(255,255,255,.13);
          color: #fff;
          font-size: 27px;
          cursor: pointer;
        }

        .pz-modal-nav {
          position: absolute;
          top: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          transform: translateY(-50%);
          border: 1px solid rgba(255,255,255,.45);
          border-radius: 50%;
          background: rgba(255,255,255,.15);
          color: #fff;
          font-size: 32px;
          cursor: pointer;
        }

        .pz-modal-prev {
          left: 15px;
        }

        .pz-modal-next {
          right: 15px;
        }

        .pz-modal-counter {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 8px 16px;
          border-radius: 20px;
          background: rgba(255,255,255,.15);
          color: #fff;
          font-size: 13px;
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .pz-section {
            padding: 75px 18px;
          }

          .pz-card {
            grid-template-columns: 1fr;
          }

          .pz-card:nth-child(even) .pz-image-side,
          .pz-card:nth-child(even) .pz-content {
            order: initial;
          }

          .pz-image-side {
            min-height: 320px;
          }

          .pz-image-stage {
            height: 340px;
          }

          .pz-content {
            padding: 34px 30px 42px;
          }
        }

        @media (max-width: 560px) {
          .pz-section {
            padding: 60px 14px;
          }

          .pz-header {
            margin-bottom: 35px;
          }

          .pz-list {
            gap: 22px;
          }

          .pz-card {
            border-radius: 13px;
          }

          .pz-image-side {
            min-height: 260px;
          }

          .pz-image-stage {
            height: 260px;
          }

          .pz-content {
            padding: 27px 23px 33px;
          }

          .pz-description {
            font-size: 14px;
          }

          .pz-nav-button {
            width: 36px;
            height: 36px;
            font-size: 23px;
          }

          .pz-thumbnail {
            width: 62px;
            height: 49px;
          }

          .pz-modal {
            padding: 70px 48px;
          }

          .pz-modal-nav {
            width: 36px;
            height: 36px;
            font-size: 25px;
          }

          .pz-modal-prev {
            left: 6px;
          }

          .pz-modal-next {
            right: 6px;
          }
        }
      `}</style>

      <div className="pz-container">
        <div className="pz-header">
          <span className="pz-eyebrow">
            PHÚ GIA ROYAL PARK
          </span>

          <h2>
            {contents.zones_title ||
              "Khám phá các phân khu"}
          </h2>

          <div className="pz-header-line" />
        </div>

        {loading ? (
          <div className="pz-loading">
            Đang tải thông tin phân khu...
          </div>
        ) : (
          <div className="pz-list">
            {ZONES.map((zone) => {
              const images = getZoneImages(
                contents,
                zone.id
              );

              const rawIndex =
                activeImages[zone.id] || 0;

              const activeIndex =
                images.length > 0
                  ? Math.min(
                      rawIndex,
                      images.length - 1
                    )
                  : 0;

              const currentImage =
                images[activeIndex] || "";

              const title =
                contents[`${zone.id}_title`] ||
                zone.name;

              const description =
                contents[`${zone.id}_description`] ||
                `Thông tin phân khu ${zone.name} sẽ được cập nhật trong thời gian tới.`;

              return (
                <article
                  className="pz-card"
                  key={zone.id}
                >
                  <div className="pz-image-side">
                    <div className="pz-image-stage">
                      {currentImage ? (
                        <button
                          type="button"
                          className="pz-image-button"
                          onClick={() =>
                            openLightbox(
                              zone,
                              images,
                              activeIndex
                            )
                          }
                          aria-label={`Phóng to ảnh phân khu ${zone.name}`}
                        >
                          <img
                            className="pz-image"
                            src={currentImage}
                            alt={`Phân khu ${zone.name} - ảnh ${activeIndex + 1}`}
                            loading="lazy"
                          />
                        </button>
                      ) : (
                        <div className="pz-image-placeholder">
                          <span className="pz-placeholder-icon">
                            ◇
                          </span>

                          <p>
                            Ảnh phân khu {zone.name}
                            <br />
                            đang được cập nhật
                          </p>
                        </div>
                      )}

                      <span className="pz-image-label">
                        PHÂN KHU {zone.number}
                      </span>

                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            className="pz-nav-button pz-nav-prev"
                            onClick={() =>
                              changeImage(
                                zone.id,
                                -1,
                                images.length
                              )
                            }
                            aria-label="Ảnh trước"
                          >
                            ‹
                          </button>

                          <button
                            type="button"
                            className="pz-nav-button pz-nav-next"
                            onClick={() =>
                              changeImage(
                                zone.id,
                                1,
                                images.length
                              )
                            }
                            aria-label="Ảnh tiếp theo"
                          >
                            ›
                          </button>
                        </>
                      )}

                      {images.length > 0 && (
                        <span className="pz-image-counter">
                          {activeIndex + 1} / {images.length}
                        </span>
                      )}
                    </div>

                    {images.length > 1 && (
                      <div className="pz-thumbnails">
                        {images.map((image, index) => (
                          <button
                            type="button"
                            key={`${zone.id}-${index}`}
                            className={
                              index === activeIndex
                                ? "pz-thumbnail pz-thumbnail-active"
                                : "pz-thumbnail"
                            }
                            onClick={() =>
                              selectImage(zone.id, index)
                            }
                            aria-label={`Xem ảnh ${index + 1}`}
                          >
                            <img
                              src={image}
                              alt={`Ảnh nhỏ ${index + 1}`}
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pz-content">
                    <span className="pz-number">
                      PHÂN KHU {zone.number}
                    </span>

                    <h3>{title}</h3>

                    <div className="pz-divider" />

                    <p className="pz-description">
                      {description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="pz-modal"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.title}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="pz-modal-close"
            onClick={() => setLightbox(null)}
            aria-label="Đóng ảnh"
          >
            ×
          </button>

          <img
            className="pz-modal-image"
            src={lightbox.images[lightbox.index]}
            alt={`${lightbox.title} - ảnh ${lightbox.index + 1}`}
            onClick={(event) =>
              event.stopPropagation()
            }
          />

          {lightbox.images.length > 1 && (
            <>
              <button
                type="button"
                className="pz-modal-nav pz-modal-prev"
                onClick={(event) => {
                  event.stopPropagation();
                  changeLightboxImage(-1);
                }}
                aria-label="Ảnh trước"
              >
                ‹
              </button>

              <button
                type="button"
                className="pz-modal-nav pz-modal-next"
                onClick={(event) => {
                  event.stopPropagation();
                  changeLightboxImage(1);
                }}
                aria-label="Ảnh tiếp theo"
              >
                ›
              </button>
            </>
          )}

          <span className="pz-modal-counter">
            {lightbox.index + 1} / {lightbox.images.length}
          </span>
        </div>
      )}
    </section>
  );
}
