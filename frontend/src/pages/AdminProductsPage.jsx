
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const TYPES = [
  { id: "sale", label: "Sản phẩm đang bán", key: "sale_products" },
  { id: "rent", label: "Sản phẩm cho thuê", key: "rent_products" },
];

const ZONES = ["Ruby", "Crystal", "Sapphire"];

function emptyProduct(type = "sale") {
  return {
    id: "",
    type,
    code: "",
    zone: "Ruby",
    landArea: "",
    usableArea: "",
    direction: "",
    basePrice: "",
    salePrice: "",
    constructionStatus: "",
    handoverDate: "",
    paymentPolicy: "",
    handoverStatus: "",
    rentPrice: "",
    rentalTerms: "",
    description: "",
    videoUrl: "",
    images: [],
  };
}

function parseProducts(value) {
  try {
    const result = JSON.parse(value || "[]");
    return Array.isArray(result)
      ? result.filter((item) => item && typeof item === "object")
      : [];
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

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AdminProductsPage() {
  const [activeType, setActiveType] = useState("sale");
  const [products, setProducts] = useState({ sale: [], rent: [] });
  const [draft, setDraft] = useState(emptyProduct());
  const [editingId, setEditingId] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  const [newImages, setNewImages] = useState([]);
  const [newVideo, setNewVideo] = useState(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const formRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const imagePreviewsRef = useRef([]);
  const videoPreviewRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`${API_BASE}/api/contents`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Không thể tải danh sách sản phẩm.");
        }

        const data = await response.json();
        const map = {};

        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (item?.contentKey) {
              map[item.contentKey] = item.contentValue || "";
            }
          });
        }

        setProducts({
          sale: parseProducts(map.sale_products),
          rent: parseProducts(map.rent_products),
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    imagePreviewsRef.current = newImages;
  }, [newImages]);

  useEffect(() => {
    videoPreviewRef.current = newVideo;
  }, [newVideo]);

  useEffect(() => {
    return () => {
      imagePreviewsRef.current.forEach((item) =>
        URL.revokeObjectURL(item.preview)
      );

      if (videoPreviewRef.current?.preview) {
        URL.revokeObjectURL(videoPreviewRef.current.preview);
      }
    };
  }, []);

  function clearImages() {
    newImages.forEach((item) => URL.revokeObjectURL(item.preview));
    imagePreviewsRef.current = [];
    setNewImages([]);

    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function clearVideo() {
    if (newVideo?.preview) {
      URL.revokeObjectURL(newVideo.preview);
    }

    videoPreviewRef.current = null;
    setNewVideo(null);

    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  function resetForm(type = activeType) {
    clearImages();
    clearVideo();
    setDraft(emptyProduct(type));
    setEditingId(null);
    setEditingIndex(null);
  }

  function changeType(type) {
    if (busy) return;

    resetForm(type);
    setActiveType(type);
    setMessage("");
    setError("");
  }

  function changeField(key, value) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
    setMessage("");
  }

  function chooseImages(files) {
    const selected = Array.from(files || []);
    if (!selected.length) return;

    for (const file of selected) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setMessage("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.");
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setMessage(`Ảnh ${file.name} vượt quá 10 MB.`);
        return;
      }
    }

    const items = selected.map((file) => ({
      id: makeId(),
      file,
      preview: URL.createObjectURL(file),
    }));

    setNewImages((current) => [...current, ...items]);
    setMessage(`Đã chọn thêm ${items.length} ảnh.`);
  }

  function removeNewImage(id) {
    const item = newImages.find((entry) => entry.id === id);

    if (item) URL.revokeObjectURL(item.preview);

    setNewImages((current) =>
      current.filter((entry) => entry.id !== id)
    );
  }

  function removeSavedImage(url) {
    setDraft((current) => ({
      ...current,
      images: current.images.filter((image) => image !== url),
    }));
  }

  function chooseVideo(files) {
    const file = files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["mp4", "mov", "webm"].includes(extension)) {
      setMessage("Chỉ hỗ trợ video MP4, MOV hoặc WEBM.");
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setMessage("Video vượt quá 200 MB.");
      return;
    }

    clearVideo();

    setNewVideo({
      file,
      preview: URL.createObjectURL(file),
    });

    setMessage(`Đã chọn video: ${file.name}`);
  }

  function removeVideo() {
    clearVideo();

    setDraft((current) => ({
      ...current,
      videoUrl: "",
    }));

    setMessage("Đã bỏ video khỏi sản phẩm. Bấm lưu để cập nhật.");
  }

  async function getCsrf() {
    const response = await fetch(`${API_BASE}/api/auth/csrf`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Không thể lấy mã xác thực. Hãy đăng nhập lại.");
    }

    const data = await response.json();

    if (!data.headerName || !data.token) {
      throw new Error("Mã xác thực không hợp lệ.");
    }

    return data;
  }

  async function putContent(key, value, csrf) {
    const response = await fetch(
      `${API_BASE}/api/contents/${encodeURIComponent(key)}`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          [csrf.headerName]: csrf.token,
        },
        body: JSON.stringify({ value }),
      }
    );

    if (!response.ok) {
      throw new Error(
        response.status === 403
          ? "Không có quyền lưu. Hãy đăng nhập lại."
          : `Không thể lưu sản phẩm (HTTP ${response.status}).`
      );
    }
  }

  
  async function uploadFile(file, endpoint, csrf) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      credentials: "include",
      headers: {
        [csrf.headerName]: csrf.token,
      },
      body: formData,
    });

    if (!response.ok) {
      let detail = "";

      try {
        const result = await response.json();
        detail = result.message || result.detail || "";
      } catch {
        // Backend có thể không trả JSON.
      }

      throw new Error(
        `Không thể tải ${file.name} (HTTP ${response.status}). ${detail}`
      );
    }

    const data = await response.json();
    const url = String(data.url || "").trim();

    const isCloudinaryImage =
      endpoint === "/api/uploads/amenities" &&
      /^https:\/\/res\.cloudinary\.com\/jev1urnf\/image\/upload\//i.test(url);

    const isLegacyFile =
      url.startsWith(`${endpoint}/`);

    if (!isCloudinaryImage && !isLegacyFile) {
      throw new Error(
        "Backend trả về đường dẫn tệp không hợp lệ."
      );
    }

    return url;
  }


  async function saveProduct() {
    if (busy) return;

    if (!draft.code.trim()) {
      setMessage("Vui lòng nhập mã căn.");
      return;
    }

    const list = products[activeType];

    const duplicate = list.some((item, index) => {
      const isCurrent = editingIndex !== null && index === editingIndex;

      return (
        !isCurrent &&
        String(item.code || "").trim().toLowerCase() ===
          draft.code.trim().toLowerCase()
      );
    });

    if (duplicate) {
      setMessage("Mã căn đã tồn tại trong nhóm sản phẩm này.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const csrf = await getCsrf();
      const uploadedImages = [];

      for (let index = 0; index < newImages.length; index++) {
        setMessage(`Đang tải ảnh ${index + 1}/${newImages.length}...`);

        const url = await uploadFile(
          newImages[index].file,
          "/api/uploads/amenities",
          csrf
        );

        uploadedImages.push(url);
      }

      let finalVideoUrl = draft.videoUrl || "";

      if (newVideo?.file) {
        setMessage("Đang tải video lên. Vui lòng chờ...");

        finalVideoUrl = await uploadFile(
          newVideo.file,
          "/api/uploads/product-videos",
          csrf
        );
      }

      const item = {
        ...draft,
        id: editingId || makeId(),
        type: activeType,
        code: draft.code.trim(),
        videoUrl: finalVideoUrl,
        images: [
          ...(Array.isArray(draft.images) ? draft.images : []),
          ...uploadedImages,
        ],
      };

      const nextList =
        editingIndex !== null
          ? list.map((oldItem, index) =>
              index === editingIndex ? item : oldItem
            )
          : [...list, item];

      const key =
        activeType === "sale" ? "sale_products" : "rent_products";

      setMessage("Đang lưu thông tin sản phẩm...");

      await putContent(key, JSON.stringify(nextList), csrf);

      setProducts((current) => ({
        ...current,
        [activeType]: nextList,
      }));

      const wasEditing = editingIndex !== null;

      resetForm();

      setMessage(
        wasEditing
          ? "Đã cập nhật sản phẩm thành công."
          : "Đã thêm sản phẩm thành công."
      );
    } catch (err) {
      setMessage(err.message || "Đã xảy ra lỗi khi lưu sản phẩm.");
    } finally {
      setBusy(false);
    }
  }

  function editProduct(product, index) {
    if (busy) return;

    resetForm();

    setEditingId(product.id || null);
    setEditingIndex(index);

    setDraft({
      ...emptyProduct(activeType),
      ...product,
      images: Array.isArray(product.images)
        ? [...product.images]
        : product.imageUrl
        ? [product.imageUrl]
        : [],
    });

    setMessage(`Đang chỉnh sửa căn ${product.code}.`);

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  function cancelEdit() {
    if (busy) return;
    resetForm();
    setMessage("");
  }

  async function deleteProduct(product, index) {
    if (busy) return;

    if (!window.confirm(`Xóa sản phẩm ${product.code}?`)) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const nextList = products[activeType].filter(
        (_, itemIndex) => itemIndex !== index
      );

      const csrf = await getCsrf();
      const key =
        activeType === "sale" ? "sale_products" : "rent_products";

      await putContent(key, JSON.stringify(nextList), csrf);

      setProducts((current) => ({
        ...current,
        [activeType]: nextList,
      }));

      if (editingIndex !== null) {
        resetForm();
      }

      setMessage(`Đã xóa sản phẩm ${product.code}.`);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  function renderInput(label, key, placeholder = "") {
    return (
      <div className="ap-field" key={key}>
        <label htmlFor={`ap-${key}`}>{label}</label>
        <input
          id={`ap-${key}`}
          type="text"
          value={draft[key] || ""}
          placeholder={placeholder}
          disabled={busy}
          onChange={(event) =>
            changeField(key, event.target.value)
          }
        />
      </div>
    );
  }

  function renderTextarea(label, key, placeholder = "") {
    return (
      <div className="ap-field ap-full" key={key}>
        <label htmlFor={`ap-${key}`}>{label}</label>
        <textarea
          id={`ap-${key}`}
          rows={4}
          value={draft[key] || ""}
          placeholder={placeholder}
          disabled={busy}
          onChange={(event) =>
            changeField(key, event.target.value)
          }
        />
      </div>
    );
  }

  const currentProducts = products[activeType];

  return (
    <div className="ap-page">
      <style>{`
        .ap-page {
          max-width: 1450px;
          margin: auto;
          padding: 10px 0 60px;
          color: #173e2a;
          font-family: "Segoe UI", Arial, sans-serif;
        }

        .ap-page * { box-sizing: border-box; }

        .ap-back {
          display: inline-block;
          margin-bottom: 24px;
          color: #176b43;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        .ap-heading { margin-bottom: 28px; }

        .ap-eyebrow {
          color: #27834f;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.7px;
        }

        .ap-heading h1 {
          margin: 10px 0;
          color: #173c2a;
          font-size: 32px;
        }

        .ap-heading p {
          color: #738377;
          font-size: 14px;
          line-height: 1.7;
        }

        .ap-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 25px;
        }

        .ap-tab {
          padding: 13px 20px;
          border: 1px solid #d5e5da;
          border-radius: 9px;
          background: white;
          color: #4b6a56;
          font-weight: 750;
          cursor: pointer;
        }

        .ap-tab.active {
          background: #176b43;
          border-color: #176b43;
          color: white;
        }

        .ap-layout {
          display: grid;
          grid-template-columns: minmax(0,1fr) minmax(0,1.1fr);
          gap: 22px;
          align-items: start;
        }

        .ap-panel {
          min-width: 0;
          padding: 25px;
          border: 1px solid #e0ebe3;
          border-radius: 15px;
          background: white;
        }

        .ap-panel h2 {
          margin: 0 0 21px;
          font-size: 20px;
          color: #173e2a;
        }

        .ap-form-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 17px;
        }

        .ap-field { min-width: 0; }
        .ap-full { grid-column: 1 / -1; }

        .ap-field label,
        .ap-label {
          display: block;
          margin-bottom: 8px;
          color: #355c42;
          font-size: 12px;
          font-weight: 750;
        }

        .ap-field input,
        .ap-field select,
        .ap-field textarea {
          width: 100%;
          min-width: 0;
          padding: 12px;
          border: 1px solid #d9e7dd;
          border-radius: 8px;
          outline: none;
          background: white;
          color: #173e2a;
          font: 13px "Segoe UI", Arial, sans-serif;
        }

        .ap-field textarea {
          resize: vertical;
          line-height: 1.7;
        }

        .ap-field input:focus,
        .ap-field select:focus,
        .ap-field textarea:focus {
          border-color: #278e54;
          box-shadow: 0 0 0 3px rgba(39,142,84,.1);
        }

        .ap-subheading {
          grid-column: 1 / -1;
          margin: 10px 0 0;
          padding-top: 18px;
          border-top: 1px solid #e7eee9;
          color: #176b43;
          font-size: 15px;
        }

        .ap-upload {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 17px;
          border: 1px solid #a8d2b6;
          border-radius: 8px;
          background: #edf8f0;
          color: #176b43;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .ap-upload:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .ap-hidden-input {
          display: none !important;
        }

        .ap-hint {
          margin: 10px 0;
          color: #7b8c7e;
          font-size: 12px;
          line-height: 1.7;
        }

        .ap-gallery {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 10px;
          margin-top: 16px;
        }

        .ap-gallery-item {
          position: relative;
          aspect-ratio: 4/3;
          overflow: hidden;
          border: 1px solid #dce8df;
          border-radius: 8px;
          background: #edf3ee;
        }

        .ap-gallery-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .ap-gallery-item button {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 27px;
          height: 27px;
          border: none;
          border-radius: 50%;
          background: #c62c2c;
          color: white;
          font-size: 19px;
          cursor: pointer;
        }

        .ap-new-image {
          border: 2px dashed #2b9858;
        }

        .ap-video-box {
          margin-top: 15px;
          padding: 14px;
          border: 1px solid #dce8df;
          border-radius: 12px;
          background: #f7faf8;
        }

        .ap-video-box video {
          display: block;
          width: 100%;
          max-height: 330px;
          border-radius: 9px;
          background: #111;
        }

        .ap-video-name {
          margin: 0 0 12px;
          color: #365b42;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .ap-remove-video {
          margin-top: 12px;
          padding: 9px 13px;
          border: 1px solid #f0d1d1;
          border-radius: 7px;
          background: #fff0f0;
          color: #b02b2b;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
        }

        .ap-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }

        .ap-button {
          padding: 12px 19px;
          border: 1px solid #176b43;
          border-radius: 8px;
          background: #176b43;
          color: white;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .ap-button:disabled,
        .ap-upload:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .ap-button-light {
          background: white;
          color: #176b43;
        }

        .ap-message {
          margin-top: 15px;
          padding: 12px;
          border-radius: 8px;
          background: #edf7ef;
          color: #236c42;
          font-size: 12px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .ap-error {
          background: #fff1f1;
          color: #b42323;
        }

        .ap-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ap-product {
          display: flex;
          gap: 14px;
          padding: 12px;
          border: 1px solid #e1ebe4;
          border-radius: 11px;
        }

        .ap-product-image {
          width: 125px;
          height: 120px;
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 8px;
          background: #e9f1eb;
        }

        .ap-product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .ap-product-info {
          min-width: 0;
          flex: 1;
        }

        .ap-product-info h3 {
          margin: 3px 0 7px;
          font-size: 17px;
          color: #17442d;
        }

        .ap-product-info p {
          margin: 0 0 7px;
          color: #78897c;
          font-size: 12px;
          line-height: 1.6;
        }

        .ap-product-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .ap-product-actions button {
          padding: 8px 12px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .ap-edit {
          border: 1px solid #cbe4d2;
          background: #e9f5ec;
          color: #176b43;
        }

        .ap-delete {
          border: 1px solid #f0d1d1;
          background: #fff0f0;
          color: #b02b2b;
        }

        .ap-empty {
          padding: 35px 15px;
          border: 1px dashed #cbded0;
          border-radius: 10px;
          text-align: center;
          color: #819185;
          font-size: 13px;
          line-height: 1.7;
        }

        @media (max-width: 1150px) {
          .ap-layout { grid-template-columns: 1fr; }
        }

        @media (max-width: 600px) {
          .ap-panel { padding: 18px; }
          .ap-form-grid { grid-template-columns: 1fr; }
          .ap-full, .ap-subheading { grid-column: auto; }
          .ap-gallery {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }
          .ap-product-image {
            width: 90px;
            height: 100px;
          }
        }
      `}</style>

      <Link to="/admin" className="ap-back">
        ← Quay lại Dashboard
      </Link>

      <div className="ap-heading">
        <span className="ap-eyebrow">PHÚ GIA ROYAL PARK</span>
        <h1>Quản lý sản phẩm</h1>
        <p>
          Quản lý riêng sản phẩm đang bán và cho thuê.
          Có thể chọn nhiều ảnh và tải video trực tiếp từ máy tính.
        </p>
      </div>

      <div className="ap-tabs">
        {TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            className={
              activeType === type.id ? "ap-tab active" : "ap-tab"
            }
            disabled={busy}
            onClick={() => changeType(type.id)}
          >
            {type.label} ({products[type.id].length})
          </button>
        ))}
      </div>

      {error && (
        <div className="ap-message ap-error">{error}</div>
      )}

      {loading ? (
        <div className="ap-empty">Đang tải sản phẩm...</div>
      ) : (
        <div className="ap-layout">
          <div className="ap-panel" ref={formRef}>
            <h2>
              {editingIndex !== null
                ? `Chỉnh sửa căn ${draft.code}`
                : activeType === "sale"
                ? "Thêm sản phẩm đang bán"
                : "Thêm sản phẩm cho thuê"}
            </h2>

            <div className="ap-form-grid">
              {renderInput("Mã căn *", "code", "PG-RB-001")}

              <div className="ap-field">
                <label htmlFor="ap-zone">Phân khu</label>
                <select
                  id="ap-zone"
                  value={draft.zone}
                  disabled={busy}
                  onChange={(event) =>
                    changeField("zone", event.target.value)
                  }
                >
                  {ZONES.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>

              {renderInput("Diện tích đất", "landArea", "100 m²")}
              {renderInput(
                "Diện tích sử dụng",
                "usableArea",
                "Theo hồ sơ căn"
              )}
              {renderInput("Hướng", "direction", "Đông Nam")}

              {activeType === "sale" ? (
                <>
                  {renderInput(
                    "Giá gốc",
                    "basePrice",
                    "Liên hệ hoặc 5 tỷ"
                  )}
                  {renderInput(
                    "Giá bán",
                    "salePrice",
                    "Liên hệ hoặc 5,5 tỷ"
                  )}
                  {renderInput(
                    "Tình trạng xây dựng",
                    "constructionStatus",
                    "Đang hoàn thiện"
                  )}
                  {renderInput(
                    "Thời gian bàn giao dự kiến",
                    "handoverDate",
                    "Quý IV/2026"
                  )}
                  {renderTextarea(
                    "Chính sách thanh toán",
                    "paymentPolicy",
                    "Nhập chính sách thanh toán..."
                  )}
                </>
              ) : (
                <>
                  {renderInput(
                    "Tình trạng bàn giao",
                    "handoverStatus",
                    "Đã bàn giao"
                  )}
                  {renderInput(
                    "Giá thuê/tháng",
                    "rentPrice",
                    "15 triệu/tháng"
                  )}
                  {renderTextarea(
                    "Điều kiện thuê",
                    "rentalTerms",
                    "Tiền cọc, thời hạn thuê..."
                  )}
                </>
              )}

              {renderTextarea(
                "Thông tin bổ sung",
                "description",
                "Nhập thông tin về căn nhà..."
              )}

              <h3 className="ap-subheading">
                Hình ảnh sản phẩm
              </h3>

              <div className="ap-field ap-full">
                <button
                  type="button"
                  className="ap-upload"
                  disabled={busy}
                  onClick={() => imageInputRef.current?.click()}
                >
                  + Chọn nhiều ảnh từ máy tính
                </button>

                <input
                  ref={imageInputRef}
                  className="ap-hidden-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  multiple
                  disabled={busy}
                  onChange={(event) => {
                    chooseImages(event.target.files);
                    event.target.value = "";
                  }}
                />

                <p className="ap-hint">
                  Có thể chọn nhiều ảnh. Mỗi ảnh tối đa 10 MB.
                  Ảnh đầu tiên sẽ là ảnh đại diện.
                </p>

                <div className="ap-gallery">
                  {(draft.images || []).map((url, index) => (
                    <div
                      className="ap-gallery-item"
                      key={`${url}-${index}`}
                    >
                      <img
                        src={mediaUrl(url)}
                        alt={`Ảnh ${index + 1}`}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        title="Xóa ảnh"
                        onClick={() => removeSavedImage(url)}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {newImages.map((item) => (
                    <div
                      className="ap-gallery-item ap-new-image"
                      key={item.id}
                    >
                      <img src={item.preview} alt="Ảnh mới" />
                      <button
                        type="button"
                        disabled={busy}
                        title="Bỏ ảnh"
                        onClick={() => removeNewImage(item.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="ap-subheading">
                Video sản phẩm
              </h3>

              <div className="ap-field ap-full">
                <button
                  type="button"
                  className="ap-upload"
                  disabled={busy}
                  onClick={() => videoInputRef.current?.click()}
                >
                  ▶ Chọn video từ máy tính
                </button>

                <input
                  ref={videoInputRef}
                  className="ap-hidden-input"
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                  disabled={busy}
                  onChange={(event) => {
                    chooseVideo(event.target.files);
                    event.target.value = "";
                  }}
                />

                <p className="ap-hint">
                  Chọn video MP4, MOV hoặc WEBM, tối đa 200 MB.
                  Không cần nhập đường dẫn hay link video.
                  MP4 thường tương thích với trình duyệt tốt nhất.
                </p>

                {newVideo ? (
                  <div className="ap-video-box">
                    <p className="ap-video-name">
                      Video mới: <strong>{newVideo.file.name}</strong>
                    </p>

                    <video
                      key={newVideo.preview}
                      src={newVideo.preview}
                      controls
                      playsInline
                      preload="metadata"
                    />

                    <button
                      type="button"
                      className="ap-remove-video"
                      disabled={busy}
                      onClick={removeVideo}
                    >
                      × Bỏ video đã chọn
                    </button>
                  </div>
                ) : draft.videoUrl ? (
                  <div className="ap-video-box">
                    <p className="ap-video-name">
                      Video hiện tại của sản phẩm
                    </p>

                    <video
                      src={mediaUrl(draft.videoUrl)}
                      controls
                      playsInline
                      preload="metadata"
                    />

                    <button
                      type="button"
                      className="ap-remove-video"
                      disabled={busy}
                      onClick={removeVideo}
                    >
                      × Xóa video khỏi sản phẩm
                    </button>
                  </div>
                ) : (
                  <p className="ap-hint">
                    Chưa chọn video cho sản phẩm này.
                  </p>
                )}
              </div>
            </div>

            <div className="ap-actions">
              <button
                type="button"
                className="ap-button"
                disabled={busy}
                onClick={saveProduct}
              >
                {busy
                  ? "Đang tải lên và lưu..."
                  : editingIndex !== null
                  ? "Lưu chỉnh sửa"
                  : "+ Thêm sản phẩm"}
              </button>

              {editingIndex !== null && (
                <button
                  type="button"
                  className="ap-button ap-button-light"
                  disabled={busy}
                  onClick={cancelEdit}
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </div>

            {message && (
              <div className="ap-message">{message}</div>
            )}
          </div>

          <div className="ap-panel">
            <h2>
              Danh sách{" "}
              {activeType === "sale" ? "đang bán" : "cho thuê"} (
              {currentProducts.length})
            </h2>

            {currentProducts.length === 0 ? (
              <div className="ap-empty">
                Chưa có sản phẩm. Hãy nhập thông tin để thêm
                căn đầu tiên.
              </div>
            ) : (
              <div className="ap-list">
                {currentProducts.map((product, index) => {
                  const firstImage = Array.isArray(product.images)
                    ? product.images[0]
                    : product.imageUrl;

                  return (
                    <div
                      className="ap-product"
                      key={product.id || index}
                    >
                      <div className="ap-product-image">
                        {firstImage && (
                          <img
                            src={mediaUrl(firstImage)}
                            alt={product.code}
                          />
                        )}
                      </div>

                      <div className="ap-product-info">
                        <h3>{product.code}</h3>

                        <p>
                          Phân khu:{" "}
                          {product.zone || "Chưa cập nhật"}
                        </p>

                        <p>
                          Diện tích đất:{" "}
                          {product.landArea || "Chưa cập nhật"}
                        </p>

                        <p>
                          {activeType === "sale"
                            ? `Giá bán: ${product.salePrice || "Liên hệ"}`
                            : `Giá thuê: ${product.rentPrice || "Liên hệ"}`}
                        </p>

                        {product.videoUrl && (
                          <p>▶ Đã có video sản phẩm</p>
                        )}

                        <div className="ap-product-actions">
                          <button
                            type="button"
                            className="ap-edit"
                            disabled={busy}
                            onClick={() =>
                              editProduct(product, index)
                            }
                          >
                            Chỉnh sửa
                          </button>

                          <button
                            type="button"
                            className="ap-delete"
                            disabled={busy}
                            onClick={() =>
                              deleteProduct(product, index)
                            }
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
