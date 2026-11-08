
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const CONTENT_SECTIONS = [
  {
    id: "home",
    title: "Trang chủ",
    fields: [
      { key: "home_label", label: "Nhãn trang chủ" },
      { key: "home_title", label: "Tiêu đề trang chủ" },
      {
        key: "home_description",
        label: "Mô tả trang chủ",
        multiline: true,
      },
    ],
  },
  {
    id: "overview",
    title: "Tổng quan",
    fields: [
      { key: "overview_title", label: "Tiêu đề tổng quan" },
      {
        key: "overview_description",
        label: "Giới thiệu dự án",
        multiline: true,
      },
      {
        key: "overview_details",
        label: "Thông tin chi tiết dự án",
        multiline: true,
      },
    ],
  },
  {
    id: "location",
    title: "Vị trí",
    fields: [
      { key: "location_title", label: "Tiêu đề vị trí" },
      {
        key: "location_description",
        label: "Mô tả vị trí",
        multiline: true,
      },
      {
        key: "location_connections",
        label: "Kết nối giao thông",
        multiline: true,
      },
    ],
  },
  {
    id: "amenities",
    title: "Tiện ích",
    fields: [
      { key: "amenities_title", label: "Tiêu đề tiện ích" },
      {
        key: "amenities_description",
        label: "Mô tả tiện ích",
        multiline: true,
      },
    ],
  },
  {
    id: "masterplan",
    title: "Mặt bằng",
    fields: [
      { key: "masterplan_title", label: "Tiêu đề mặt bằng" },
      {
        key: "masterplan_description",
        label: "Mô tả mặt bằng",
        multiline: true,
      },
    ],
  },
  {
    id: "zones",
    title: "Phân khu",
    fields: [
      { key: "zones_title", label: "Tiêu đề phân khu" },
    ],
  },
  {
    id: "contact",
    title: "Liên hệ",
    fields: [
      { key: "contact_title", label: "Tiêu đề liên hệ" },
      {
        key: "contact_description",
        label: "Nội dung liên hệ",
        multiline: true,
      },
      { key: "contact_phone", label: "Số điện thoại" },
      { key: "contact_email", label: "Email liên hệ" },
      { key: "contact_address", label: "Địa chỉ" },
    ],
  },
];

const AMENITY_GROUPS = [
  {
    id: "internal",
    number: "01",
    label: "NỘI KHU",
    title: "Tiện ích Nội khu",
    titleKey: "amenities_internal_title",
    descriptionKey: "amenities_internal_description",
    itemsKey: "amenities_internal_items",
  },
  {
    id: "external",
    number: "02",
    label: "NGOẠI KHU",
    title: "Tiện ích Ngoại khu",
    titleKey: "amenities_external_title",
    descriptionKey: "amenities_external_description",
    itemsKey: "amenities_external_items",
  },
];

const ZONES = [
  { id: "ruby", name: "Ruby", number: "01" },
  { id: "crystal", name: "Crystal", number: "02" },
  { id: "sapphire", name: "Sapphire", number: "03" },
];

function emptyDraft() {
  return {
    editingId: null,
    title: "",
    description: "",
    file: null,
    preview: "",
  };
}

function parseItems(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item, index) => ({
        id: String(item.id ?? index),
        title: String(item.title || item.name || ""),
        description: String(item.description || ""),
        imageUrl: String(
          item.imageUrl || item.image || item.url || ""
        ),
      }));
  } catch {
    return [];
  }
}

function parseZoneImages(galleryValue, legacyValue) {
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

  // Giữ ảnh cũ khi chuyển từ 1 ảnh sang nhiều ảnh.
  // Nếu gallery đã có dữ liệu, gallery là nguồn chính.
  if (!galleryValue && legacyValue) {
    images.unshift(legacyValue);
  }

  return [...new Set(images)];
}

function getImageUrl(value) {
  const url = String(value || "").trim();

  if (!url) return "";

  if (/^https?:\/\//i.test(url)) return url;

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

  if (/^[a-zA-Z0-9_. -]+\.(jpg|jpeg|png|webp)$/i.test(url)) {
    return "/images/" + encodeURIComponent(url);
  }

  return "";
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AdminContentsPage() {
  const [activeSection, setActiveSection] = useState("home");
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [messages, setMessages] = useState({});
  const [error, setError] = useState("");

  const [drafts, setDrafts] = useState({
    internal: emptyDraft(),
    external: emptyDraft(),
  });

  const [zoneFiles, setZoneFiles] = useState({});
  const [zoneRemoved, setZoneRemoved] = useState({});
  const [zoneGalleryTouched, setZoneGalleryTouched] = useState({});

  const amenityPreviewsRef = useRef({});
  const zoneFilesRef = useRef({});

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
          throw new Error("Không thể tải nội dung website.");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Dữ liệu nội dung không hợp lệ.");
        }

        const map = {};

        data.forEach((item) => {
          if (typeof item?.contentKey === "string") {
            map[item.contentKey] = item.contentValue || "";
          }
        });

        setValues(map);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
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

  useEffect(() => {
    zoneFilesRef.current = zoneFiles;
  }, [zoneFiles]);

  useEffect(() => {
    return () => {
      Object.values(amenityPreviewsRef.current).forEach(
        (url) => URL.revokeObjectURL(url)
      );

      Object.values(zoneFilesRef.current).forEach((items) => {
        (items || []).forEach((item) => {
          URL.revokeObjectURL(item.preview);
        });
      });
    };
  }, []);

  function setMessage(key, message) {
    setMessages((current) => ({
      ...current,
      [key]: message,
    }));
  }

  function handleChange(key, value) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));

    setMessage(key, "");
  }

  async function getCsrf() {
    const response = await fetch(
      `${API_BASE}/api/auth/csrf`,
      { credentials: "include" }
    );

    if (!response.ok) {
      throw new Error(
        "Không thể lấy mã xác thực. Hãy đăng nhập lại."
      );
    }

    const csrf = await response.json();

    if (!csrf.headerName || !csrf.token) {
      throw new Error("Mã xác thực không hợp lệ.");
    }

    return csrf;
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
          : `Không thể lưu dữ liệu: ${key}.`
      );
    }

    return response.json();
  }

  
  async function uploadImage(file, csrf) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${API_BASE}/api/uploads/amenities`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          [csrf.headerName]: csrf.token,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      if (response.status === 413) {
        throw new Error("Ảnh vượt giới hạn dung lượng Backend.");
      }

      if (response.status === 403) {
        throw new Error(
          "Không có quyền tải ảnh. Hãy đăng nhập lại."
        );
      }

      throw new Error(
        `Tải ảnh thất bại (HTTP ${response.status}).`
      );
    }

    const result = await response.json();
    const imageUrl = String(result.url || "").trim();

    const isCloudinaryUrl =
      /^https:\/\/res\.cloudinary\.com\/jev1urnf\/image\/upload\//i.test(
        imageUrl
      );

    const isLegacyUrl =
      /^\/api\/uploads\/amenities\/[a-f0-9-]{36}\.(jpg|png|webp)$/i.test(
        imageUrl
      );

    if (!isCloudinaryUrl && !isLegacyUrl) {
      throw new Error(
        "Backend không trả về đường dẫn ảnh hợp lệ."
      );
    }

    return imageUrl;
  }


  function validateImage(file) {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(
        file.type
      )
    ) {
      return "Chỉ hỗ trợ ảnh JPG, PNG và WEBP.";
    }

    if (file.size > 10 * 1024 * 1024) {
      return "Mỗi ảnh không được vượt quá 10 MB.";
    }

    return "";
  }

  async function saveField(key) {
    if (busy) return;

    setBusy(`field-${key}`);

    try {
      const csrf = await getCsrf();

      await putContent(key, values[key] || "", csrf);

      setMessage(key, "Đã lưu thành công.");
    } catch (err) {
      setMessage(key, err.message);
    } finally {
      setBusy("");
    }
  }

  // ==========================================
  // QUẢN LÝ TIỆN ÍCH
  // ==========================================

  function changeDraft(groupId, field, value) {
    setDrafts((current) => ({
      ...current,
      [groupId]: {
        ...current[groupId],
        [field]: value,
      },
    }));

    setMessage(`items-${groupId}`, "");
  }

  function clearAmenityPreview(groupId) {
    const url = amenityPreviewsRef.current[groupId];

    if (url) {
      URL.revokeObjectURL(url);
      delete amenityPreviewsRef.current[groupId];
    }
  }

  function selectAmenityImage(groupId, file) {
    if (!file) return;

    const validationError = validateImage(file);

    if (validationError) {
      setMessage(`items-${groupId}`, validationError);
      return;
    }

    clearAmenityPreview(groupId);

    const preview = URL.createObjectURL(file);
    amenityPreviewsRef.current[groupId] = preview;

    setDrafts((current) => ({
      ...current,
      [groupId]: {
        ...current[groupId],
        file,
        preview,
      },
    }));

    setMessage(`items-${groupId}`, "");
  }

  function resetDraft(groupId) {
    clearAmenityPreview(groupId);

    setDrafts((current) => ({
      ...current,
      [groupId]: emptyDraft(),
    }));
  }

  async function saveAmenity(group) {
    if (busy) return;

    const draft = drafts[group.id];
    const title = draft.title.trim();
    const description = draft.description.trim();
    const messageKey = `items-${group.id}`;

    if (!title) {
      setMessage(messageKey, "Vui lòng nhập tên tiện ích.");
      return;
    }

    const oldItems = parseItems(values[group.itemsKey]);

    const existing = draft.editingId
      ? oldItems.find((item) => item.id === draft.editingId)
      : null;

    if (draft.editingId && !existing) {
      setMessage(
        messageKey,
        "Không tìm thấy tiện ích cần chỉnh sửa."
      );
      return;
    }

    if (!draft.file && !existing?.imageUrl) {
      setMessage(messageKey, "Vui lòng chọn ảnh tiện ích.");
      return;
    }

    setBusy(messageKey);

    try {
      const csrf = await getCsrf();

      let imageUrl = existing?.imageUrl || "";

      if (draft.file) {
        imageUrl = await uploadImage(draft.file, csrf);
      }

      const item = {
        id: existing?.id || makeId(),
        title,
        description,
        imageUrl,
      };

      const nextItems = existing
        ? oldItems.map((oldItem) =>
            oldItem.id === existing.id ? item : oldItem
          )
        : [...oldItems, item];

      const json = JSON.stringify(nextItems);

      await putContent(group.itemsKey, json, csrf);

      setValues((current) => ({
        ...current,
        [group.itemsKey]: json,
      }));

      resetDraft(group.id);

      setMessage(
        messageKey,
        existing
          ? "Đã cập nhật tiện ích thành công."
          : "Đã thêm tiện ích thành công."
      );
    } catch (err) {
      setMessage(messageKey, err.message);
    } finally {
      setBusy("");
    }
  }

  function startEditAmenity(group, item) {
    clearAmenityPreview(group.id);

    setDrafts((current) => ({
      ...current,
      [group.id]: {
        editingId: item.id,
        title: item.title,
        description: item.description,
        file: null,
        preview: "",
      },
    }));

    setMessage(
      `items-${group.id}`,
      `Đang chỉnh sửa: ${item.title}`
    );

    document
      .getElementById(`amenity-form-${group.id}`)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  }

  async function deleteAmenity(group, item) {
    if (busy) return;

    if (
      !window.confirm(
        `Bạn có chắc muốn xóa tiện ích "${item.title}"?`
      )
    ) {
      return;
    }

    const messageKey = `items-${group.id}`;
    setBusy(messageKey);

    try {
      const oldItems = parseItems(values[group.itemsKey]);

      const nextItems = oldItems.filter(
        (oldItem) => oldItem.id !== item.id
      );

      const json = JSON.stringify(nextItems);
      const csrf = await getCsrf();

      await putContent(group.itemsKey, json, csrf);

      setValues((current) => ({
        ...current,
        [group.itemsKey]: json,
      }));

      if (drafts[group.id].editingId === item.id) {
        resetDraft(group.id);
      }

      setMessage(
        messageKey,
        "Đã xóa tiện ích khỏi danh sách."
      );
    } catch (err) {
      setMessage(messageKey, err.message);
    } finally {
      setBusy("");
    }
  }

  // ==========================================
  // QUẢN LÝ NHIỀU ẢNH CHO 3 PHÂN KHU
  // ==========================================

  function getSavedZoneImages(zoneId) {
    return parseZoneImages(
      values[`${zoneId}_images`],
      values[`${zoneId}_image`]
    ).filter(
      (url) => !(zoneRemoved[zoneId] || []).includes(url)
    );
  }

  function selectZoneImages(zoneId, files) {
    const selectedFiles = Array.from(files || []);

    if (!selectedFiles.length) return;

    for (const file of selectedFiles) {
      const validationError = validateImage(file);

      if (validationError) {
        setMessage(
          `zone-${zoneId}`,
          `${file.name}: ${validationError}`
        );
        return;
      }
    }

    const newItems = selectedFiles.map((file) => ({
      id: makeId(),
      file,
      preview: URL.createObjectURL(file),
    }));

    setZoneFiles((current) => ({
      ...current,
      [zoneId]: [
        ...(current[zoneId] || []),
        ...newItems,
      ],
    }));

    setMessage(
      `zone-${zoneId}`,
      `Đã chọn thêm ${newItems.length} ảnh. Bấm Lưu phân khu để tải lên.`
    );
  }

  function removePendingZoneImage(zoneId, imageId) {
    const item = (zoneFiles[zoneId] || []).find(
      (entry) => entry.id === imageId
    );

    if (item) {
      URL.revokeObjectURL(item.preview);
    }

    setZoneFiles((current) => ({
      ...current,
      [zoneId]: (current[zoneId] || []).filter(
        (entry) => entry.id !== imageId
      ),
    }));
  }

  function removeSavedZoneImage(zoneId, imageUrl) {
    setZoneRemoved((current) => ({
      ...current,
      [zoneId]: [
        ...(current[zoneId] || []),
        imageUrl,
      ],
    }));

    setZoneGalleryTouched((current) => ({
      ...current,
      [zoneId]: true,
    }));

    setMessage(
      `zone-${zoneId}`,
      "Đã đánh dấu xóa ảnh. Bấm Lưu phân khu để xác nhận."
    );
  }

  function restoreRemovedZoneImages(zoneId) {
    setZoneRemoved((current) => ({
      ...current,
      [zoneId]: [],
    }));

    setZoneGalleryTouched((current) => ({
      ...current,
      [zoneId]: false,
    }));

    setMessage(`zone-${zoneId}`, "Đã khôi phục danh sách ảnh.");
  }

  async function saveZone(zone) {
    if (busy) return;

    const titleKey = `${zone.id}_title`;
    const descriptionKey = `${zone.id}_description`;
    const imageKey = `${zone.id}_image`;
    const galleryKey = `${zone.id}_images`;
    const messageKey = `zone-${zone.id}`;

    setBusy(messageKey);
    setMessage(messageKey, "");

    try {
      const csrf = await getCsrf();

      const title =
        (values[titleKey] || zone.name).trim() ||
        zone.name;

      const description = values[descriptionKey] || "";

      const images = getSavedZoneImages(zone.id);
      const pending = zoneFiles[zone.id] || [];

      for (let index = 0; index < pending.length; index++) {
        setMessage(
          messageKey,
          `Đang tải ảnh ${index + 1}/${pending.length}...`
        );

        const url = await uploadImage(
          pending[index].file,
          csrf
        );

        images.push(url);
      }

      const galleryJson = JSON.stringify(images);

      await putContent(titleKey, title, csrf);
      await putContent(descriptionKey, description, csrf);

      // Lưu danh sách nhiều ảnh vào CMS.
      await putContent(galleryKey, galleryJson, csrf);

      // Đồng bộ ảnh đầu tiên để tương thích USER cũ.
      await putContent(imageKey, images[0] || "", csrf);

      setValues((current) => ({
        ...current,
        [titleKey]: title,
        [descriptionKey]: description,
        [galleryKey]: galleryJson,
        [imageKey]: images[0] || "",
      }));

      pending.forEach((item) => {
        URL.revokeObjectURL(item.preview);
      });

      setZoneFiles((current) => ({
        ...current,
        [zone.id]: [],
      }));

      setZoneRemoved((current) => ({
        ...current,
        [zone.id]: [],
      }));

      setZoneGalleryTouched((current) => ({
        ...current,
        [zone.id]: false,
      }));

      setMessage(
        messageKey,
        `Đã lưu phân khu ${zone.name} thành công với ${images.length} ảnh.`
      );
    } catch (err) {
      setMessage(messageKey, err.message);
    } finally {
      setBusy("");
    }
  }

  // ==========================================
  // GIAO DIỆN CHỈNH SỬA NỘI DUNG
  // ==========================================

  function renderField(field) {
    return (
      <div className="ac-field" key={field.key}>
        <label
          htmlFor={`ac-${field.key}`}
          className="ac-label"
        >
          {field.label}
        </label>

        {field.multiline ? (
          <textarea
            id={`ac-${field.key}`}
            rows={5}
            value={values[field.key] || ""}
            onChange={(event) =>
              handleChange(field.key, event.target.value)
            }
            placeholder={`Nhập ${field.label.toLowerCase()}`}
            className="ac-control ac-textarea"
          />
        ) : (
          <input
            id={`ac-${field.key}`}
            type="text"
            value={values[field.key] || ""}
            onChange={(event) =>
              handleChange(field.key, event.target.value)
            }
            placeholder={`Nhập ${field.label.toLowerCase()}`}
            className="ac-control"
          />
        )}

        <div className="ac-field-footer">
          <span className="ac-message">
            {messages[field.key] || ""}
          </span>

          <button
            type="button"
            className="ac-button"
            disabled={Boolean(busy)}
            onClick={() => saveField(field.key)}
          >
            {busy === `field-${field.key}`
              ? "Đang lưu..."
              : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    );
  }

  function renderAmenityGroup(group) {
    const items = parseItems(values[group.itemsKey]);
    const draft = drafts[group.id];

    const selectedItem = draft.editingId
      ? items.find((item) => item.id === draft.editingId)
      : null;

    const currentPreview =
      draft.preview ||
      getImageUrl(selectedItem?.imageUrl);

    const isEditing = Boolean(draft.editingId);

    return (
      <div className="ac-group" key={group.id}>
        <div className="ac-group-head">
          <div className="ac-group-number">
            {group.number}
          </div>

          <div>
            <span className="ac-eyebrow">
              TIỆN ÍCH {group.label}
            </span>
            <h2>{group.title}</h2>
            <p>
              Quản lý hình ảnh và thông tin tiện ích.
            </p>
          </div>
        </div>

        <div className="ac-subsection">
          <h3>Thông điệp hiển thị</h3>

          {renderField({
            key: group.titleKey,
            label: `Tiêu đề ${group.title}`,
          })}

          {renderField({
            key: group.descriptionKey,
            label: `Mô tả ${group.title}`,
            multiline: true,
          })}
        </div>

        <div
          className="ac-form"
          id={`amenity-form-${group.id}`}
        >
          <span className="ac-eyebrow">
            {isEditing
              ? "CHỈNH SỬA TIỆN ÍCH"
              : "THÊM TIỆN ÍCH MỚI"}
          </span>

          <h3>
            {isEditing
              ? "Cập nhật tiện ích"
              : "Thêm hình ảnh tiện ích"}
          </h3>

          <label className="ac-label">
            Tên tiện ích
          </label>

          <input
            type="text"
            className="ac-control"
            placeholder="Ví dụ: Công viên cây xanh"
            value={draft.title}
            onChange={(event) =>
              changeDraft(
                group.id,
                "title",
                event.target.value
              )
            }
          />

          <label className="ac-label ac-mt">
            Mô tả tiện ích
          </label>

          <textarea
            className="ac-control ac-textarea"
            rows={4}
            placeholder="Nhập mô tả tiện ích..."
            value={draft.description}
            onChange={(event) =>
              changeDraft(
                group.id,
                "description",
                event.target.value
              )
            }
          />

          <label className="ac-label ac-mt">
            Hình ảnh tiện ích
          </label>

          <div className="ac-image-preview">
            {currentPreview ? (
              <img
                src={currentPreview}
                alt="Xem trước tiện ích"
              />
            ) : (
              <div className="ac-image-empty">
                <span>▧</span>
                <p>Chưa chọn ảnh tiện ích</p>
              </div>
            )}
          </div>

          <label className="ac-file-label">
            Chọn ảnh từ máy tính
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(event) => {
                selectAmenityImage(
                  group.id,
                  event.target.files?.[0]
                );
                event.target.value = "";
              }}
            />
          </label>

          <p className="ac-hint">
            JPG, PNG hoặc WEBP, tối đa 10 MB.
          </p>

          {draft.file && (
            <p className="ac-selected-file">
              Đã chọn: {draft.file.name}
            </p>
          )}

          <div className="ac-form-actions">
            <button
              type="button"
              className="ac-button"
              disabled={Boolean(busy)}
              onClick={() => saveAmenity(group)}
            >
              {busy === `items-${group.id}`
                ? "Đang tải ảnh và lưu..."
                : isEditing
                ? "Lưu chỉnh sửa"
                : "+ Thêm tiện ích"}
            </button>

            {isEditing && (
              <button
                type="button"
                className="ac-button ac-button-light"
                disabled={Boolean(busy)}
                onClick={() => resetDraft(group.id)}
              >
                Hủy chỉnh sửa
              </button>
            )}
          </div>

          {messages[`items-${group.id}`] && (
            <p className="ac-feedback">
              {messages[`items-${group.id}`]}
            </p>
          )}
        </div>

        <div className="ac-list-section">
          <div className="ac-list-heading">
            <div>
              <span className="ac-eyebrow">
                DANH SÁCH ĐÃ LƯU
              </span>
              <h3>Tiện ích đã thêm</h3>
            </div>

            <span className="ac-count">
              {items.length} tiện ích
            </span>
          </div>

          {items.length === 0 ? (
            <div className="ac-list-empty">
              Chưa có tiện ích nào. Hãy nhập tên,
              mô tả và chọn ảnh để thêm.
            </div>
          ) : (
            <div className="ac-items">
              {items.map((item) => (
                <article
                  className="ac-item"
                  key={item.id}
                >
                  <div className="ac-item-photo">
                    {getImageUrl(item.imageUrl) ? (
                      <img
                        src={getImageUrl(item.imageUrl)}
                        alt={item.title}
                        loading="lazy"
                      />
                    ) : (
                      <span>Chưa có ảnh</span>
                    )}
                  </div>

                  <div className="ac-item-content">
                    <h4>{item.title}</h4>

                    <p>
                      {item.description ||
                        "Chưa có mô tả."}
                    </p>

                    <div className="ac-item-actions">
                      <button
                        type="button"
                        className="ac-edit"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          startEditAmenity(group, item)
                        }
                      >
                        Chỉnh sửa
                      </button>

                      <button
                        type="button"
                        className="ac-delete"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          deleteAmenity(group, item)
                        }
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // GIAO DIỆN PHÂN KHU NHIỀU ẢNH
  // ==========================================

  function renderZone(zone) {
    const titleKey = `${zone.id}_title`;
    const descriptionKey = `${zone.id}_description`;
    const messageKey = `zone-${zone.id}`;

    const savedImages = getSavedZoneImages(zone.id);
    const pendingImages = zoneFiles[zone.id] || [];

    const removedImages = zoneRemoved[zone.id] || [];

    const totalImages =
      savedImages.length + pendingImages.length;

    return (
      <article className="ac-zone" key={zone.id}>
        <div className="ac-zone-heading">
          <div className="ac-group-number">
            {zone.number}
          </div>

          <div>
            <span className="ac-eyebrow">
              PHÂN KHU CỐ ĐỊNH
            </span>

            <h2>Phân khu {zone.name}</h2>

            <p className="ac-zone-subtitle">
              Quản lý bộ sưu tập ảnh và thông tin
              phân khu.
            </p>
          </div>

          <span className="ac-count">
            {totalImages} ảnh
          </span>
        </div>

        <div className="ac-zone-grid">
          <div>
            <label className="ac-label">
              Bộ sưu tập ảnh phân khu
            </label>

            <p className="ac-hint">
              Có thể chọn nhiều ảnh cùng lúc hoặc
              thêm ảnh nhiều lần. Ảnh đầu tiên là
              ảnh đại diện.
            </p>

            {totalImages === 0 ? (
              <div className="ac-zone-empty">
                <span>▧</span>
                <strong>Chưa có ảnh phân khu</strong>
                <p>
                  Chọn ảnh từ máy tính để bắt đầu.
                </p>
              </div>
            ) : (
              <div className="ac-zone-gallery">
                {savedImages.map((imageUrl, index) => (
                  <div
                    className="ac-zone-photo"
                    key={`${imageUrl}-${index}`}
                  >
                    <img
                      src={getImageUrl(imageUrl)}
                      alt={`${zone.name} - ảnh ${index + 1}`}
                      loading="lazy"
                    />

                    {index === 0 && (
                      <span className="ac-photo-badge">
                        Ảnh đại diện
                      </span>
                    )}

                    <button
                      type="button"
                      className="ac-photo-delete"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        removeSavedZoneImage(
                          zone.id,
                          imageUrl
                        )
                      }
                      title="Xóa ảnh"
                    >
                      ×
                    </button>

                    <span className="ac-photo-number">
                      {index + 1}
                    </span>
                  </div>
                ))}

                {pendingImages.map((item, index) => (
                  <div
                    className="ac-zone-photo ac-photo-new"
                    key={item.id}
                  >
                    <img
                      src={item.preview}
                      alt={`Ảnh mới ${index + 1}`}
                    />

                    <span className="ac-photo-badge">
                      Ảnh mới
                    </span>

                    <button
                      type="button"
                      className="ac-photo-delete"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        removePendingZoneImage(
                          zone.id,
                          item.id
                        )
                      }
                      title="Bỏ ảnh đã chọn"
                    >
                      ×
                    </button>

                    <span className="ac-photo-number">
                      {savedImages.length + index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <label className="ac-file-label ac-zone-upload">
              + Chọn nhiều ảnh phân khu
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                multiple
                disabled={Boolean(busy)}
                onChange={(event) => {
                  selectZoneImages(
                    zone.id,
                    event.target.files
                  );

                  event.target.value = "";
                }}
              />
            </label>

            <p className="ac-hint">
              Hỗ trợ JPG, PNG, WEBP. Tối đa 10 MB
              cho mỗi ảnh. Có thể giữ Ctrl hoặc
              Shift khi chọn ảnh.
            </p>

            {pendingImages.length > 0 && (
              <p className="ac-selected-file">
                Đã chọn {pendingImages.length} ảnh
                mới, chưa lưu.
              </p>
            )}

            {removedImages.length > 0 && (
              <div className="ac-removed">
                <span>
                  {removedImages.length} ảnh đang
                  chờ xóa.
                </span>

                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    restoreRemovedZoneImages(zone.id)
                  }
                >
                  Hoàn tác
                </button>
              </div>
            )}
          </div>

          <div>
            <label
              className="ac-label"
              htmlFor={`zone-title-${zone.id}`}
            >
              Tiêu đề phân khu
            </label>

            <input
              id={`zone-title-${zone.id}`}
              className="ac-control"
              type="text"
              value={
                values[titleKey] === undefined
                  ? zone.name
                  : values[titleKey]
              }
              onChange={(event) =>
                handleChange(
                  titleKey,
                  event.target.value
                )
              }
              placeholder={zone.name}
            />

            <label
              className="ac-label ac-mt"
              htmlFor={`zone-description-${zone.id}`}
            >
              Mô tả phân khu
            </label>

            <textarea
              id={`zone-description-${zone.id}`}
              className="ac-control ac-textarea"
              rows={10}
              value={values[descriptionKey] || ""}
              onChange={(event) =>
                handleChange(
                  descriptionKey,
                  event.target.value
                )
              }
              placeholder={`Nhập mô tả phân khu ${zone.name}...`}
            />

            <div className="ac-zone-info">
              <strong>Hiển thị trên website USER</strong>
              <p>
                Ảnh đầu tiên sẽ là ảnh đại diện.
                Các ảnh còn lại sẽ xuất hiện trong
                bộ sưu tập ảnh của phân khu.
              </p>
            </div>

            <div className="ac-form-actions">
              <button
                type="button"
                className="ac-button"
                disabled={Boolean(busy)}
                onClick={() => saveZone(zone)}
              >
                {busy === messageKey
                  ? "Đang tải ảnh và lưu..."
                  : `Lưu phân khu ${zone.name}`}
              </button>
            </div>

            {messages[messageKey] && (
              <p className="ac-feedback">
                {messages[messageKey]}
              </p>
            )}
          </div>
        </div>
      </article>
    );
  }

  const section = CONTENT_SECTIONS.find(
    (item) => item.id === activeSection
  );

  return (
    <div className="ac-page">
      <style>{`
        .ac-page {
          width: 100%;
          color: #183e2c;
          font-family: "Segoe UI", Arial, sans-serif;
        }

        .ac-page * {
          box-sizing: border-box;
        }

        .ac-back {
          display: inline-block;
          margin-bottom: 26px;
          color: #176b43;
          font-size: 13px;
          font-weight: 750;
          text-decoration: none;
        }

        .ac-heading {
          margin-bottom: 28px;
        }

        .ac-eyebrow {
          display: block;
          margin-bottom: 10px;
          color: #288754;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .ac-heading h1 {
          margin: 0 0 12px;
          color: #173c2a;
          font-size: clamp(28px, 3vw, 35px);
        }

        .ac-heading p {
          margin: 0;
          color: #718176;
          font-size: 14px;
          line-height: 1.7;
        }

        .ac-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-bottom: 27px;
          padding-bottom: 19px;
          border-bottom: 1px solid #dfeae2;
        }

        .ac-tab {
          padding: 11px 16px;
          border: 1px solid #dce8e0;
          border-radius: 9px;
          background: #fff;
          color: #476452;
          font-family: inherit;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
        }

        .ac-tab-active {
          background: #176b43;
          border-color: #176b43;
          color: #fff;
        }

        .ac-card,
        .ac-group,
        .ac-banner,
        .ac-zone {
          padding: 28px;
          border: 1px solid #e0eae3;
          border-radius: 16px;
          background: #fff;
        }

        .ac-card > h2,
        .ac-banner > h2 {
          margin: 0 0 26px;
          color: #183d2b;
          font-size: 22px;
        }

        .ac-field {
          margin-bottom: 25px;
          padding-bottom: 24px;
          border-bottom: 1px solid #edf2ee;
        }

        .ac-field:last-child {
          border-bottom: 0;
          padding-bottom: 0;
          margin-bottom: 0;
        }

        .ac-label {
          display: block;
          margin-bottom: 10px;
          color: #294b37;
          font-size: 14px;
          font-weight: 750;
        }

        .ac-control {
          display: block;
          width: 100%;
          min-width: 0;
          padding: 13px 15px;
          border: 1px solid #d8e6dc;
          border-radius: 9px;
          outline: none;
          background: #fff;
          color: #183e2c;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.6;
        }

        .ac-control:focus {
          border-color: #2c9459;
          box-shadow: 0 0 0 3px rgba(44,148,89,.1);
        }

        .ac-textarea {
          min-height: 105px;
          resize: vertical;
        }

        .ac-field-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 12px;
        }

        .ac-message {
          color: #26804c;
          font-size: 12px;
        }

        .ac-button {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          padding: 12px 19px;
          border: 1px solid #176b43;
          border-radius: 9px;
          background: #176b43;
          color: #fff;
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .ac-button:hover {
          background: #24834f;
        }

        .ac-button:disabled,
        .ac-edit:disabled,
        .ac-delete:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .ac-button-light {
          background: #fff;
          color: #176b43;
        }

        .ac-button-light:hover {
          background: #eff7f1;
        }

        .ac-banner {
          margin-bottom: 22px;
        }

        .ac-banner-note {
          margin: 0 0 23px;
          padding: 14px 17px;
          border-radius: 10px;
          background: #eff7f1;
          color: #427153;
          font-size: 13px;
          line-height: 1.7;
        }

        .ac-groups {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 22px;
          align-items: start;
        }

        .ac-group {
          min-width: 0;
          padding: 24px;
        }

        .ac-group-head,
        .ac-zone-heading {
          display: flex;
          gap: 15px;
          align-items: flex-start;
          margin-bottom: 27px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e6eee8;
        }

        .ac-group-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          border-radius: 11px;
          background: #e6f4e9;
          color: #227749;
          font-weight: 850;
        }

        .ac-group-head h2,
        .ac-zone-heading h2 {
          margin: 0 0 9px;
          font-size: 21px;
          color: #163c2b;
        }

        .ac-group-head p,
        .ac-zone-subtitle {
          margin: 0;
          font-size: 12px;
          line-height: 1.7;
          color: #718176;
        }

        .ac-subsection {
          margin-bottom: 24px;
        }

        .ac-subsection h3,
        .ac-list-heading h3,
        .ac-form h3 {
          margin: 0 0 19px;
          color: #183e2c;
          font-size: 18px;
        }

        .ac-form {
          padding: 22px;
          margin-bottom: 25px;
          border: 1px solid #cfe6d6;
          border-radius: 14px;
          background: #f6faf7;
          scroll-margin-top: 115px;
        }

        .ac-mt {
          margin-top: 19px;
        }

        .ac-image-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 245px;
          overflow: hidden;
          border: 1px dashed #b5d7bf;
          border-radius: 11px;
          background: #e8f1e9;
        }

        .ac-image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .ac-image-empty {
          text-align: center;
          color: #73927c;
        }

        .ac-image-empty span {
          display: block;
          margin-bottom: 9px;
          font-size: 40px;
        }

        .ac-image-empty p {
          margin: 0;
          font-size: 12px;
        }

        .ac-file-label {
          position: relative;
          display: inline-flex;
          padding: 12px 17px;
          margin-top: 15px;
          border: 1px solid #b8d7c1;
          border-radius: 9px;
          background: #fff;
          color: #207345;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .ac-file-label input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
        }

        .ac-hint {
          margin: 10px 0;
          color: #758579;
          font-size: 12px;
          line-height: 1.7;
        }

        .ac-selected-file {
          color: #267c49;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .ac-form-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .ac-feedback {
          margin: 15px 0 0;
          padding: 12px;
          border: 1px solid #d3e8d9;
          border-radius: 9px;
          background: #f6faf7;
          color: #216b43;
          font-size: 12px;
          line-height: 1.6;
        }

        .ac-list-section {
          padding-top: 21px;
          border-top: 1px solid #e3ebe5;
        }

        .ac-list-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
        }

        .ac-list-heading h3 {
          margin-bottom: 0;
        }

        .ac-count {
          margin-left: auto;
          padding: 8px 12px;
          border-radius: 50px;
          background: #e9f5ec;
          color: #237849;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .ac-list-empty {
          padding: 32px 18px;
          border: 1px dashed #bcd8c3;
          border-radius: 11px;
          text-align: center;
          color: #77877b;
          font-size: 13px;
          line-height: 1.8;
        }

        .ac-items {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .ac-item {
          display: flex;
          gap: 14px;
          padding: 12px;
          border: 1px solid #e1eae3;
          border-radius: 12px;
          background: #fff;
        }

        .ac-item-photo {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 130px;
          height: 120px;
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 9px;
          background: #e8efe9;
          color: #78897c;
          font-size: 11px;
        }

        .ac-item-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .ac-item-content {
          min-width: 0;
          flex: 1;
        }

        .ac-item-content h4 {
          margin: 3px 0 8px;
          color: #17422d;
          font-size: 15px;
          overflow-wrap: break-word;
        }

        .ac-item-content p {
          margin: 0 0 13px;
          color: #728075;
          font-size: 12px;
          line-height: 1.7;
          overflow-wrap: break-word;
          white-space: pre-line;
        }

        .ac-item-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .ac-edit,
        .ac-delete {
          padding: 8px 12px;
          border-radius: 7px;
          font-family: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .ac-edit {
          background: #e8f4eb;
          border: 1px solid #cce6d3;
          color: #206e44;
        }

        .ac-delete {
          background: #fff0f0;
          border: 1px solid #f3d2d2;
          color: #b42323;
        }

        .ac-error {
          padding: 14px;
          margin-bottom: 20px;
          border-radius: 9px;
          background: #fff0f0;
          color: #b42323;
        }

        .ac-loading {
          padding: 45px;
          text-align: center;
          color: #718176;
        }

        .ac-zones {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .ac-zone {
          box-shadow: 0 8px 25px rgba(16,60,35,.04);
        }

        .ac-zone-grid {
          display: grid;
          grid-template-columns: minmax(0,1fr) minmax(0,1fr);
          gap: 28px;
          align-items: start;
        }

        .ac-zone-gallery {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .ac-zone-photo {
          position: relative;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          border: 1px solid #dce9df;
          border-radius: 11px;
          background: #e8f1e9;
        }

        .ac-zone-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .ac-photo-new {
          border: 2px dashed #2b9858;
        }

        .ac-photo-badge {
          position: absolute;
          top: 9px;
          left: 9px;
          padding: 6px 9px;
          border-radius: 6px;
          background: rgba(255,255,255,.95);
          color: #176b43;
          font-size: 10px;
          font-weight: 800;
        }

        .ac-photo-delete {
          position: absolute;
          top: 7px;
          right: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 29px;
          height: 29px;
          border: none;
          border-radius: 50%;
          background: #c83232;
          color: #fff;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
        }

        .ac-photo-delete:hover {
          background: #a91d1d;
        }

        .ac-photo-number {
          position: absolute;
          right: 9px;
          bottom: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: rgba(255,255,255,.94);
          color: #176b43;
          font-size: 11px;
          font-weight: 800;
        }

        .ac-zone-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 220px;
          border: 1px dashed #b5d7bf;
          border-radius: 11px;
          background: #f4faf5;
          color: #73927c;
          text-align: center;
        }

        .ac-zone-empty span {
          font-size: 45px;
        }

        .ac-zone-empty strong {
          font-size: 14px;
        }

        .ac-zone-empty p {
          margin: 0;
          font-size: 12px;
        }

        .ac-zone-upload {
          background: #e8f5ec;
          border-color: #a6d6b6;
          color: #176b43;
        }

        .ac-zone-info {
          margin-top: 23px;
          padding: 16px;
          border-radius: 10px;
          background: #eff7f1;
          color: #3d7050;
        }

        .ac-zone-info strong {
          font-size: 13px;
        }

        .ac-zone-info p {
          margin: 8px 0 0;
          font-size: 12px;
          line-height: 1.7;
        }

        .ac-removed {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 14px;
          padding: 12px;
          border-radius: 9px;
          background: #fff3e8;
          color: #9a5b1d;
          font-size: 12px;
        }

        .ac-removed button {
          border: none;
          background: transparent;
          color: #176b43;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 1120px) {
          .ac-groups {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 800px) {
          .ac-zone-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .ac-card,
          .ac-banner,
          .ac-group,
          .ac-zone {
            padding: 19px;
          }

          .ac-form {
            padding: 16px;
          }

          .ac-item-photo {
            width: 96px;
            height: 105px;
          }

          .ac-item {
            gap: 10px;
          }

          .ac-image-preview {
            height: 210px;
          }

          .ac-tab {
            padding: 10px 12px;
            font-size: 12px;
          }

          .ac-zone-gallery {
            gap: 9px;
          }

          .ac-zone-heading {
            flex-wrap: wrap;
          }
        }
      `}</style>

      <Link to="/admin" className="ac-back">
        ← Quay lại Dashboard
      </Link>

      <div className="ac-heading">
        <span className="ac-eyebrow">
          QUẢN TRỊ WEBSITE
        </span>

        <h1>Quản lý nội dung</h1>

        <p>
          Chỉnh sửa nội dung, hình ảnh tiện ích
          và bộ sưu tập ảnh của từng phân khu.
        </p>
      </div>

      {error && (
        <div className="ac-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="ac-loading">
          Đang tải nội dung...
        </div>
      ) : (
        <>
          <div className="ac-tabs">
            {CONTENT_SECTIONS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={
                  activeSection === item.id
                    ? "ac-tab ac-tab-active"
                    : "ac-tab"
                }
                onClick={() => setActiveSection(item.id)}
              >
                {item.title}
              </button>
            ))}
          </div>

          {activeSection === "amenities" ? (
            <>
              <div className="ac-banner">
                <h2>Quản lý nội dung Tiện ích</h2>

                <p className="ac-banner-note">
                  ADMIN có thể chỉnh sửa nội dung
                  và quản lý danh sách tiện ích
                  nội khu, ngoại khu.
                </p>

                {section.fields.map(renderField)}
              </div>

              <div className="ac-groups">
                {AMENITY_GROUPS.map(renderAmenityGroup)}
              </div>
            </>
          ) : activeSection === "zones" ? (
            <>
              <div className="ac-banner">
                <h2>Quản lý nội dung Phân khu</h2>

                <p className="ac-banner-note">
                  Ba phân khu cố định:
                  <strong>
                    {" "}Ruby → Crystal → Sapphire
                  </strong>.
                  ADMIN có thể thêm nhiều ảnh,
                  xóa ảnh, chỉnh sửa tiêu đề và
                  mô tả cho từng phân khu.
                </p>

                {section.fields.map(renderField)}
              </div>

              <div className="ac-zones">
                {ZONES.map(renderZone)}
              </div>
            </>
          ) : (
            <div className="ac-card">
              <h2>{section.title}</h2>
              {section.fields.map(renderField)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
