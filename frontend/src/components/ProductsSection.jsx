
import { useEffect, useRef, useState } from "react";

const API_BASE = "http://localhost:8080";

// Ảnh đặt trong frontend/public/images/
const SALE_BACKGROUND = "/images/sale-bg.jpg";
const RENT_BACKGROUND = "/images/rent-bg.jpg";

function parseProducts(value) {
  try {
    const data = JSON.parse(value || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function mediaUrl(value) {
  const url = String(value || "").trim();

  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/")) return API_BASE + url;
  if (url.startsWith("/") && !url.startsWith("//")) return url;

  return "";
}

function getImages(product) {
  const images = Array.isArray(product.images)
    ? product.images
    : [];

  if (images.length) {
    return images.map(mediaUrl).filter(Boolean);
  }

  return product.imageUrl
    ? [mediaUrl(product.imageUrl)].filter(Boolean)
    : [];
}

function ProductCard({ product, type, onView }) {
  const images = getImages(product);
  const isSale = type === "sale";
  const hasVideo = Boolean(mediaUrl(product.videoUrl));

  return (
    <article className="pr-card">
      <div className="pr-photo">
        {images.length ? (
          <img
            src={images[0]}
            alt={product.code || "Sản phẩm"}
            loading="lazy"
          />
        ) : (
          <div className="pr-photo-empty">
            <span>⌂</span>
            <p>Hình ảnh đang cập nhật</p>
          </div>
        )}

        <span className="pr-status">
          {isSale ? "ĐANG BÁN" : "CHO THUÊ"}
        </span>

        {hasVideo && (
          <span className="pr-video-badge">
            ▶ Có video
          </span>
        )}
      </div>

      <div className="pr-card-body">
        <span className="pr-zone">
          PHÂN KHU {product.zone || "Đang cập nhật"}
        </span>

        <h3>{product.code || "Chưa có mã căn"}</h3>

        <div className="pr-info">
          <div>
            <span>Diện tích đất</span>
            <strong>
              {product.landArea || "Đang cập nhật"}
            </strong>
          </div>

          <div>
            <span>Diện tích sử dụng</span>
            <strong>
              {product.usableArea || "Theo hồ sơ căn"}
            </strong>
          </div>

          <div>
            <span>Hướng</span>
            <strong>
              {product.direction || "Theo thực tế"}
            </strong>
          </div>

          {isSale ? (
            <>
              <div>
                <span>Giá gốc</span>
                <strong>
                  {product.basePrice || "Liên hệ"}
                </strong>
              </div>

              <div>
                <span>Giá bán</span>
                <strong className="pr-price">
                  {product.salePrice || "Liên hệ"}
                </strong>
              </div>
            </>
          ) : (
            <>
              <div>
                <span>Tình trạng bàn giao</span>
                <strong>
                  {product.handoverStatus || "Đang cập nhật"}
                </strong>
              </div>

              <div>
                <span>Giá thuê/tháng</span>
                <strong className="pr-price">
                  {product.rentPrice || "Liên hệ"}
                </strong>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className="pr-detail-button"
          onClick={() => onView(product, type)}
        >
          Xem chi tiết căn →
        </button>
      </div>
    </article>
  );
}

function ProductRow({
  title,
  subtitle,
  products,
  type,
  onView,
}) {
  const trackRef = useRef(null);

  const backgroundImage =
    type === "sale" ? SALE_BACKGROUND : RENT_BACKGROUND;

  function scroll(direction) {
    trackRef.current?.scrollBy({
      left: direction * 350,
      behavior: "smooth",
    });
  }

  return (
    <div className={`pr-category pr-category-${type}`}>
      {/* Ảnh nền riêng cho bán và thuê */}
      <div
        className="pr-category-background"
        style={{
          backgroundImage: `url("${backgroundImage}")`,
        }}
      />

      {/* Lớp phủ xanh giống HeroBanner trang chủ */}
      <div className="pr-category-overlay" />

      <div className="pr-container">
        <div className="pr-category-heading">
          <div>
            <span className="pr-eyebrow">
              PHÚ GIA ROYAL PARK
            </span>

            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          {products.length > 1 && (
            <div className="pr-arrows">
              <button
                type="button"
                onClick={() => scroll(-1)}
                aria-label="Cuộn sang trái"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={() => scroll(1)}
                aria-label="Cuộn sang phải"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {products.length > 0 ? (
          <div className="pr-track" ref={trackRef}>
            {products.map((product, index) => (
              <ProductCard
                key={product.id || `${type}-${index}`}
                product={product}
                type={type}
                onView={onView}
              />
            ))}
          </div>
        ) : (
          <div className="pr-empty">
            {type === "sale"
              ? "Sản phẩm đang được cập nhật."
              : "Chưa có sản phẩm cho thuê."}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsSection() {
  const [saleProducts, setSaleProducts] = useState([]);
  const [rentProducts, setRentProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const response = await fetch(
          `${API_BASE}/api/contents`,
          {
            credentials: "include",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Không thể tải sản phẩm");
        }

        const data = await response.json();
        const map = {};

        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (item?.contentKey) {
              map[item.contentKey] =
                item.contentValue || "";
            }
          });
        }

        setSaleProducts(parseProducts(map.sale_products));
        setRentProducts(parseProducts(map.rent_products));
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selected) return;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setSelected(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () =>
      document.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  function openProduct(product, type) {
    setSelected({ product, type });
    setPhotoIndex(0);
    setVideoError(false);
  }

  function closeProduct() {
    setSelected(null);
    setVideoError(false);
  }

  const selectedImages = selected
    ? getImages(selected.product)
    : [];

  const selectedVideoUrl = selected
    ? mediaUrl(selected.product.videoUrl)
    : "";

  return (
    <section id="san-pham" className="pr-section">
      <style>{`
        .pr-section {
          width: 100%;
          padding: 0;
          margin: 0;
          background: #f5f9f6;
          font-family: "Segoe UI", Arial, sans-serif;
          color: #173e2a;
        }

        .pr-section * {
          box-sizing: border-box;
        }

        .pr-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* NỀN SẢN PHẨM TOÀN CHIỀU NGANG */

        .pr-category {
          position: relative;
          width: 100%;
          min-height: 650px;
          padding: 85px 0 90px;
          overflow: hidden;
          isolation: isolate;
          background: #123d2a;
        }

        .pr-category + .pr-category {
          margin-top: 0;
        }

        /* ẢNH NỀN GIỐNG CẤU TRÚC HERO BANNER */

        .pr-category-background {
          position: absolute;
          inset: 0;
          z-index: 0;
          background-position: center;
          background-size: cover;
          background-repeat: no-repeat;
          transform: scale(1.02);
          pointer-events: none;
        }

        /* LỚP PHỦ XANH GIỐNG HỆT TRANG CHỦ */

        .pr-category-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(
            90deg,
            rgba(5, 39, 25, 0.88) 0%,
            rgba(10, 53, 34, 0.74) 43%,
            rgba(10, 53, 34, 0.16) 100%
          );
          pointer-events: none;
        }

        .pr-category-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 35px;
        }

        .pr-eyebrow {
          display: block;
          margin-bottom: 12px;
          color: #c2ebcf;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .pr-category-heading h2 {
          margin: 0 0 12px;
          color: #fff;
          font-size: clamp(30px, 3.5vw, 44px);
          font-weight: 800;
          text-shadow: 0 2px 12px rgba(0,0,0,.25);
        }

        .pr-category-heading p {
          margin: 0;
          color: #f0f8f1;
          font-size: 15px;
          line-height: 1.7;
          text-shadow: 0 1px 6px rgba(0,0,0,.25);
        }

        .pr-arrows {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .pr-arrows button {
          width: 44px;
          height: 44px;
          border: 1px solid rgba(255,255,255,.75);
          border-radius: 50%;
          background: rgba(255,255,255,.94);
          color: #176b43;
          font-size: 27px;
          cursor: pointer;
          transition: .2s;
        }

        .pr-arrows button:hover {
          background: #176b43;
          color: #fff;
        }

        .pr-track {
          display: flex;
          gap: 22px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: thin;
          padding: 5px 2px 20px;
        }

        .pr-card {
          flex: 0 0 310px;
          max-width: 310px;
          overflow: hidden;
          border: 1px solid #e1ebe4;
          border-radius: 15px;
          background: #fff;
          box-shadow: 0 12px 35px rgba(0,0,0,.18);
          scroll-snap-align: start;
        }

        .pr-photo {
          position: relative;
          height: 225px;
          overflow: hidden;
          background: #e6efe8;
        }

        .pr-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pr-photo-empty {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: #779782;
        }

        .pr-photo-empty span {
          font-size: 52px;
        }

        .pr-photo-empty p {
          font-size: 12px;
        }

        .pr-status {
          position: absolute;
          top: 15px;
          left: 15px;
          padding: 8px 12px;
          border-radius: 6px;
          background: #176b43;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .pr-video-badge {
          position: absolute;
          bottom: 13px;
          right: 13px;
          padding: 8px 11px;
          border-radius: 7px;
          background: rgba(0,0,0,.72);
          color: #fff;
          font-size: 11px;
          font-weight: 750;
        }

        .pr-card-body {
          padding: 23px;
        }

        .pr-zone {
          color: #318856;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .pr-card-body h3 {
          margin: 10px 0 20px;
          color: #183f2b;
          font-size: 23px;
        }

        .pr-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pr-info > div {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding-bottom: 11px;
          border-bottom: 1px solid #edf1ed;
        }

        .pr-info span {
          color: #819085;
          font-size: 12px;
          flex-shrink: 0;
        }

        .pr-info strong {
          color: #254832;
          font-size: 12px;
          font-weight: 750;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .pr-info .pr-price {
          color: #1c8a4d;
          font-size: 14px;
        }

        .pr-detail-button {
          width: 100%;
          margin-top: 23px;
          padding: 13px;
          border: none;
          border-radius: 8px;
          background: #176b43;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .pr-detail-button:hover {
          background: #248550;
        }

        .pr-empty {
          padding: 35px;
          border: 1px solid rgba(255,255,255,.5);
          border-radius: 12px;
          background: rgba(255,255,255,.94);
          color: #738678;
          text-align: center;
        }

        .pr-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          background: rgba(0,0,0,.7);
        }

        .pr-modal {
          position: relative;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 16px;
          background: #fff;
          padding: 28px;
        }

        .pr-modal-close {
          position: absolute;
          top: 15px;
          right: 15px;
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 50%;
          background: #edf4ef;
          color: #176b43;
          font-size: 24px;
          cursor: pointer;
        }

        .pr-modal h2 {
          margin: 0 50px 22px 0;
          color: #16452e;
          font-size: 27px;
        }

        .pr-modal-photo {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 350px;
          overflow: hidden;
          border-radius: 10px;
          background: #edf3ee;
        }

        .pr-modal-photo img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .pr-modal-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 50%;
          background: rgba(255,255,255,.9);
          color: #176b43;
          font-size: 26px;
          cursor: pointer;
        }

        .pr-modal-prev {
          left: 12px;
        }

        .pr-modal-next {
          right: 12px;
        }

        .pr-modal-count {
          position: absolute;
          bottom: 12px;
          right: 12px;
          padding: 6px 10px;
          border-radius: 15px;
          background: rgba(0,0,0,.6);
          color: #fff;
          font-size: 12px;
        }

        .pr-modal-details {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 16px;
          margin-top: 25px;
        }

        .pr-detail-item {
          padding: 14px;
          border-radius: 9px;
          background: #f4f9f5;
        }

        .pr-detail-item span {
          display: block;
          margin-bottom: 7px;
          color: #7a8d7f;
          font-size: 12px;
        }

        .pr-detail-item strong {
          color: #1c5134;
          font-size: 14px;
          white-space: pre-line;
          overflow-wrap: anywhere;
        }

        .pr-extra {
          margin-top: 25px;
          padding-top: 20px;
          border-top: 1px solid #e2ece5;
        }

        .pr-extra h3 {
          color: #16452e;
          font-size: 20px;
        }

        .pr-extra p {
          color: #64796b;
          line-height: 1.8;
          white-space: pre-line;
        }

        .pr-video {
          display: block;
          width: 100%;
          max-height: 430px;
          margin-top: 15px;
          border-radius: 10px;
          background: #000;
        }

        .pr-video-error {
          padding: 12px;
          border-radius: 8px;
          background: #fff0f0;
          color: #b42323;
          font-size: 13px;
          line-height: 1.7;
        }

        @media (max-width: 650px) {
          .pr-category {
            min-height: 500px;
            padding: 65px 0;
          }

          .pr-category-background {
            background-position: center;
          }

          /* Trùng với overlay mobile của HeroBanner */
          .pr-category-overlay {
            background: rgba(6, 40, 25, 0.74);
          }

          .pr-container {
            padding: 0 15px;
          }

          .pr-card {
            flex-basis: 270px;
            max-width: 270px;
          }

          .pr-category-heading {
            align-items: flex-start;
          }

          .pr-category-heading h2 {
            font-size: 28px;
          }

          .pr-modal {
            padding: 20px;
          }

          .pr-modal-photo {
            height: 240px;
          }

          .pr-modal-details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {loading ? (
        <div className="pr-loading-wrap">
          <div className="pr-container">
            <div className="pr-empty">
              Đang tải danh sách sản phẩm...
            </div>
          </div>
        </div>
      ) : (
        <>
          <ProductRow
            title="Sản phẩm đang bán"
            subtitle="Khám phá các sản phẩm tại Phú Gia Royal Park"
            products={saleProducts}
            type="sale"
            onView={openProduct}
          />

          {rentProducts.length > 0 && (
            <ProductRow
              title="Sản phẩm cho thuê"
              subtitle="Các sản phẩm cho thuê hiện có tại dự án"
              products={rentProducts}
              type="rent"
              onView={openProduct}
            />
          )}
        </>
      )}

      {selected && (
        <div
          className="pr-modal-overlay"
          onClick={closeProduct}
        >
          <div
            className="pr-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Chi tiết căn ${selected.product.code || ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="pr-modal-close"
              onClick={closeProduct}
              aria-label="Đóng chi tiết sản phẩm"
            >
              ×
            </button>

            <h2>
              Chi tiết căn {selected.product.code || ""}
            </h2>

            <div className="pr-modal-photo">
              {selectedImages.length > 0 ? (
                <>
                  <img
                    src={selectedImages[photoIndex]}
                    alt={selected.product.code}
                  />

                  {selectedImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="pr-modal-arrow pr-modal-prev"
                        onClick={() =>
                          setPhotoIndex(
                            (photoIndex - 1 + selectedImages.length) %
                              selectedImages.length
                          )
                        }
                        aria-label="Ảnh trước"
                      >
                        ‹
                      </button>

                      <button
                        type="button"
                        className="pr-modal-arrow pr-modal-next"
                        onClick={() =>
                          setPhotoIndex(
                            (photoIndex + 1) %
                              selectedImages.length
                          )
                        }
                        aria-label="Ảnh tiếp theo"
                      >
                        ›
                      </button>
                    </>
                  )}

                  <span className="pr-modal-count">
                    {photoIndex + 1}/{selectedImages.length}
                  </span>
                </>
              ) : (
                <div className="pr-photo-empty">
                  Chưa có hình ảnh
                </div>
              )}
            </div>

            <div className="pr-modal-details">
              {[
                ["Mã căn", selected.product.code],
                ["Phân khu", selected.product.zone],
                ["Diện tích đất", selected.product.landArea],
                ["Diện tích sử dụng", selected.product.usableArea],
                ["Hướng", selected.product.direction],
                ...(selected.type === "sale"
                  ? [
                      [
                        "Giá gốc",
                        selected.product.basePrice || "Liên hệ",
                      ],
                      [
                        "Giá bán",
                        selected.product.salePrice || "Liên hệ",
                      ],
                      [
                        "Tình trạng xây dựng",
                        selected.product.constructionStatus,
                      ],
                      [
                        "Thời gian bàn giao dự kiến",
                        selected.product.handoverDate,
                      ],
                      [
                        "Chính sách thanh toán",
                        selected.product.paymentPolicy,
                      ],
                    ]
                  : [
                      [
                        "Tình trạng bàn giao",
                        selected.product.handoverStatus,
                      ],
                      [
                        "Giá thuê/tháng",
                        selected.product.rentPrice || "Liên hệ",
                      ],
                      [
                        "Điều kiện thuê",
                        selected.product.rentalTerms,
                      ],
                    ]),
              ].map(([label, value]) => (
                <div
                  className="pr-detail-item"
                  key={label}
                >
                  <span>{label}</span>
                  <strong>
                    {value || "Đang cập nhật"}
                  </strong>
                </div>
              ))}
            </div>

            {selected.product.description && (
              <div className="pr-extra">
                <h3>Thông tin bổ sung</h3>
                <p>{selected.product.description}</p>
              </div>
            )}

            {selectedVideoUrl && (
              <div className="pr-extra">
                <h3>
                  {selected.type === "sale"
                    ? "Video căn nhà đang bán"
                    : "Video căn nhà cho thuê"}
                </h3>

                <video
                  key={selectedVideoUrl}
                  className="pr-video"
                  src={selectedVideoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  onError={() => setVideoError(true)}
                  onLoadedMetadata={() => setVideoError(false)}
                />

                {videoError && (
                  <p className="pr-video-error">
                    Không thể phát video. Vui lòng kiểm tra
                    định dạng video hoặc quyền truy cập
                    đường dẫn tải lên.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
