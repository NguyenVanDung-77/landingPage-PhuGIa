
import { useEffect, useState } from "react";

const API_BASE = "http://localhost:8080";

const ZONES = [
  { id: "ruby", name: "Ruby", number: "01" },
  { id: "crystal", name: "Crystal", number: "02" },
  { id: "sapphire", name: "Sapphire", number: "03" },
];

function toImageUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/")) return API_BASE + url;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return "";
}

export default function ZoneManager() {
  const [values, setValues] = useState({});
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [busy, setBusy] = useState("");
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(
          `${API_BASE}/api/contents`,
          {
            credentials: "include",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Không thể tải nội dung phân khu.");
        }

        const data = await response.json();
        const map = {};

        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (item.contentKey) {
              map[item.contentKey] = item.contentValue || "";
            }
          });
        }

        setValues(map);
      } catch (error) {
        if (error.name !== "AbortError") {
          setMessages({
            general: error.message,
          });
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [previews]);

  function update(key, value) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function selectFile(zoneId, file) {
    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(
        file.type
      )
    ) {
      setMessages((current) => ({
        ...current,
        [zoneId]: "Chỉ hỗ trợ JPG, PNG hoặc WEBP.",
      }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessages((current) => ({
        ...current,
        [zoneId]: "Ảnh không được vượt quá 10 MB.",
      }));
      return;
    }

    const url = URL.createObjectURL(file);

    setFiles((current) => ({
      ...current,
      [zoneId]: file,
    }));

    setPreviews((current) => ({
      ...current,
      [zoneId]: url,
    }));

    setMessages((current) => ({
      ...current,
      [zoneId]: "",
    }));
  }

  async function getCsrf() {
    const response = await fetch(
      `${API_BASE}/api/auth/csrf`,
      { credentials: "include" }
    );

    if (!response.ok) {
      throw new Error("Không thể xác thực. Hãy đăng nhập lại.");
    }

    const csrf = await response.json();

    if (!csrf.headerName || !csrf.token) {
      throw new Error("Mã xác thực không hợp lệ.");
    }

    return csrf;
  }

  async function saveContent(key, value, csrf) {
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
      throw new Error(`Không thể lưu trường ${key}.`);
    }
  }

  async function uploadFile(file, csrf) {
    const formData = new FormData();
    formData.append("file", file);

    // Tận dụng API upload ảnh đã có của phần Tiện ích.
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
      throw new Error(
        response.status === 413
          ? "Ảnh vượt quá giới hạn Backend."
          : "Không thể tải ảnh lên Backend."
      );
    }

    const result = await response.json();

    if (
      !result.url ||
      !result.url.startsWith("/api/uploads/amenities/")
    ) {
      throw new Error("Đường dẫn ảnh không hợp lệ.");
    }

    return result.url;
  }

  async function saveZone(zone) {
    if (busy) return;

    setBusy(zone.id);
    setMessages((current) => ({
      ...current,
      [zone.id]: "",
    }));

    const titleKey = `${zone.id}_title`;
    const descriptionKey = `${zone.id}_description`;
    const imageKey = `${zone.id}_image`;

    try {
      const csrf = await getCsrf();

      let imageUrl = values[imageKey] || "";

      if (files[zone.id]) {
        imageUrl = await uploadFile(files[zone.id], csrf);
      }

      await saveContent(
        titleKey,
        values[titleKey]?.trim() || zone.name,
        csrf
      );

      await saveContent(
        descriptionKey,
        values[descriptionKey] || "",
        csrf
      );

      if (imageUrl) {
        await saveContent(imageKey, imageUrl, csrf);
      }

      setValues((current) => ({
        ...current,
        [titleKey]: current[titleKey]?.trim() || zone.name,
        [imageKey]: imageUrl,
      }));

      setFiles((current) => ({
        ...current,
        [zone.id]: null,
      }));

      setPreviews((current) => ({
        ...current,
        [zone.id]: "",
      }));

      setMessages((current) => ({
        ...current,
        [zone.id]: "Đã lưu phân khu thành công.",
      }));
    } catch (error) {
      setMessages((current) => ({
        ...current,
        [zone.id]: error.message,
      }));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="zm-page">
      <style>{`
        .zm-page {
          font-family: "Segoe UI", Arial, sans-serif;
          color: #183e2c;
        }

        .zm-page * {
          box-sizing: border-box;
        }

        .zm-intro {
          margin-bottom: 25px;
          padding: 23px;
          border: 1px solid #dbe9df;
          border-radius: 15px;
          background: #fff;
        }

        .zm-intro h2 {
          margin: 0 0 10px;
          color: #17432e;
          font-size: 23px;
        }

        .zm-intro p {
          margin: 0;
          color: #708075;
          font-size: 14px;
          line-height: 1.8;
        }

        .zm-list {
          display: flex;
          flex-direction: column;
          gap: 23px;
        }

        .zm-card {
          padding: 27px;
          border: 1px solid #dce9df;
          border-radius: 17px;
          background: #fff;
          box-shadow: 0 8px 25px rgba(16,60,35,.04);
        }

        .zm-card-head {
          display: flex;
          align-items: center;
          gap: 17px;
          margin-bottom: 25px;
          padding-bottom: 21px;
          border-bottom: 1px solid #e6eee8;
        }

        .zm-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 12px;
          background: #e5f4e9;
          color: #207746;
          font-weight: 850;
        }

        .zm-card-head span {
          color: #278451;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .zm-card-head h3 {
          margin: 5px 0 0;
          color: #173e2b;
          font-size: 23px;
        }

        .zm-card-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 25px;
          align-items: start;
        }

        .zm-photo {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          border: 1px dashed #bcd8c5;
          border-radius: 12px;
          background: #edf5ef;
        }

        .zm-photo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .zm-photo-empty {
          color: #779582;
          font-size: 13px;
          text-align: center;
        }

        .zm-upload {
          position: relative;
          display: inline-flex;
          margin-top: 14px;
          padding: 12px 17px;
          border: 1px solid #bedac6;
          border-radius: 9px;
          background: #f5faf6;
          color: #207347;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
        }

        .zm-upload input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
        }

        .zm-hint {
          margin: 11px 0 0;
          color: #7a8b7e;
          font-size: 12px;
          line-height: 1.7;
        }

        .zm-field {
          margin-bottom: 20px;
        }

        .zm-field label {
          display: block;
          margin-bottom: 9px;
          color: #294c38;
          font-size: 13px;
          font-weight: 750;
        }

        .zm-input {
          width: 100%;
          padding: 13px 15px;
          border: 1px solid #d7e5db;
          border-radius: 9px;
          outline: none;
          color: #183e2c;
          background: #fff;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.6;
        }

        .zm-input:focus {
          border-color: #26894e;
          box-shadow: 0 0 0 3px rgba(38,137,78,.1);
        }

        .zm-textarea {
          min-height: 150px;
          resize: vertical;
        }

        .zm-save {
          padding: 13px 21px;
          border: 0;
          border-radius: 9px;
          background: #176b43;
          color: white;
          font-family: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .zm-save:hover {
          background: #23834e;
        }

        .zm-save:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .zm-message {
          margin: 13px 0 0;
          color: #207347;
          font-size: 13px;
          line-height: 1.7;
        }

        @media (max-width: 800px) {
          .zm-card-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .zm-card {
            padding: 18px;
          }
        }
      `}</style>

      <div className="zm-intro">
        <h2>Quản lý 3 phân khu dự án</h2>
        <p>
          Ruby, Crystal và Sapphire là ba phân khu cố định.
          ADMIN có thể cập nhật ảnh đại diện, tiêu đề và mô tả
          cho từng phân khu. Dữ liệu được lưu vào Backend.
        </p>
      </div>

      {messages.general && (
        <p className="zm-message">{messages.general}</p>
      )}

      {loading ? (
        <p>Đang tải dữ liệu phân khu...</p>
      ) : (
        <div className="zm-list">
          {ZONES.map((zone) => {
            const titleKey = `${zone.id}_title`;
            const descriptionKey = `${zone.id}_description`;
            const imageKey = `${zone.id}_image`;

            const photo =
              previews[zone.id] ||
              toImageUrl(values[imageKey]);

            return (
              <article className="zm-card" key={zone.id}>
                <div className="zm-card-head">
                  <div className="zm-number">
                    {zone.number}
                  </div>

                  <div>
                    <span>PHÂN KHU CỐ ĐỊNH</span>
                    <h3>{zone.name}</h3>
                  </div>
                </div>

                <div className="zm-card-grid">
                  <div>
                    <div className="zm-photo">
                      {photo ? (
                        <img
                          src={photo}
                          alt={`Ảnh phân khu ${zone.name}`}
                        />
                      ) : (
                        <div className="zm-photo-empty">
                          Chưa có ảnh phân khu
                        </div>
                      )}
                    </div>

                    <label className="zm-upload">
                      Chọn ảnh phân khu
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={(event) => {
                          selectFile(
                            zone.id,
                            event.target.files?.[0]
                          );
                          event.target.value = "";
                        }}
                      />
                    </label>

                    <p className="zm-hint">
                      JPG, PNG hoặc WEBP, tối đa 10 MB.
                      Mỗi phân khu sử dụng một ảnh đại diện.
                    </p>

                    {files[zone.id] && (
                      <p className="zm-hint">
                        Đã chọn: {files[zone.id].name}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="zm-field">
                      <label htmlFor={`zm-title-${zone.id}`}>
                        Tiêu đề phân khu
                      </label>

                      <input
                        id={`zm-title-${zone.id}`}
                        className="zm-input"
                        type="text"
                        value={
                          values[titleKey] === undefined
                            ? zone.name
                            : values[titleKey]
                        }
                        onChange={(event) =>
                          update(titleKey, event.target.value)
                        }
                        placeholder={zone.name}
                      />
                    </div>

                    <div className="zm-field">
                      <label htmlFor={`zm-desc-${zone.id}`}>
                        Mô tả phân khu
                      </label>

                      <textarea
                        id={`zm-desc-${zone.id}`}
                        className="zm-input zm-textarea"
                        value={values[descriptionKey] || ""}
                        onChange={(event) =>
                          update(
                            descriptionKey,
                            event.target.value
                          )
                        }
                        placeholder={`Nhập mô tả phân khu ${zone.name}...`}
                      />
                    </div>

                    <button
                      type="button"
                      className="zm-save"
                      disabled={Boolean(busy)}
                      onClick={() => saveZone(zone)}
                    >
                      {busy === zone.id
                        ? "Đang lưu..."
                        : `Lưu phân khu ${zone.name}`}
                    </button>

                    {messages[zone.id] && (
                      <p className="zm-message">
                        {messages[zone.id]}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
