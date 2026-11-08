
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Chờ tiếp nhận" },
  { value: "RECEIVED", label: "Đã tiếp nhận" },
  { value: "CONSULTED", label: "Đã tư vấn" },
];

const STATUS_COLORS = {
  PENDING: {
    background: "#fff5db",
    color: "#996600",
  },
  RECEIVED: {
    background: "#e6f1ff",
    color: "#225da8",
  },
  CONSULTED: {
    background: "#e2f5e9",
    color: "#176b43",
  },
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("vi-VN");
}

export default function AdminConsultationsPage() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [updatingId, setUpdatingId] = useState(null);

  const loadConsultations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/consultations`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "Bạn không có quyền xem danh sách khách hàng."
            : "Không thể tải danh sách khách hàng."
        );
      }

      const data = await response.json();

      setConsultations(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConsultations();
  }, [loadConsultations]);

  const updateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    setError("");
    setSuccess("");

    try {
      const csrfResponse = await fetch(
        `${API_BASE}/api/auth/csrf`,
        {
          credentials: "include",
        }
      );

      if (!csrfResponse.ok) {
        throw new Error("Không thể lấy mã xác thực.");
      }

      const csrf = await csrfResponse.json();

      const response = await fetch(
        `${API_BASE}/api/consultations/${id}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            [csrf.headerName]: csrf.token,
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Không thể cập nhật trạng thái khách hàng."
        );
      }

      setConsultations((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, status: newStatus }
            : item
        )
      );

      setSuccess("Đã cập nhật trạng thái thành công.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredConsultations = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return consultations.filter((item) => {
      const matchSearch =
        !keyword ||
        (item.fullName || "")
          .toLowerCase()
          .includes(keyword) ||
        (item.phone || "")
          .toLowerCase()
          .includes(keyword) ||
        (item.email || "")
          .toLowerCase()
          .includes(keyword);

      const matchStatus =
        filterStatus === "ALL" ||
        item.status === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [consultations, search, filterStatus]);

  const pendingCount = consultations.filter(
    (item) => item.status === "PENDING"
  ).length;

  const receivedCount = consultations.filter(
    (item) => item.status === "RECEIVED"
  ).length;

  const consultedCount = consultations.filter(
    (item) => item.status === "CONSULTED"
  ).length;

  return (
    <div style={styles.page}>
      <Link to="/admin" style={styles.backLink}>
        ← Quay lại tổng quan
      </Link>

      <div style={styles.heading}>
        <div>
          <span style={styles.eyebrow}>
            QUẢN LÝ KHÁCH HÀNG
          </span>

          <h1 style={styles.title}>
            Khách hàng đăng ký tư vấn
          </h1>

          <p style={styles.description}>
            Theo dõi và xử lý các yêu cầu tư vấn
            từ Landing Page Phú Gia Royal Park.
          </p>
        </div>

        <button
          type="button"
          style={styles.refreshButton}
          onClick={loadConsultations}
          disabled={loading}
        >
          {loading ? "Đang tải..." : "↻ Làm mới"}
        </button>
      </div>

      <div style={styles.stats}>
        <StatCard
          label="Tổng yêu cầu"
          value={consultations.length}
        />
        <StatCard
          label="Chờ tiếp nhận"
          value={pendingCount}
        />
        <StatCard
          label="Đã tiếp nhận"
          value={receivedCount}
        />
        <StatCard
          label="Đã tư vấn"
          value={consultedCount}
        />
      </div>

      {error && (
        <div style={styles.error} role="alert">
          {error}
        </div>
      )}

      {success && (
        <div style={styles.success}>
          {success}
        </div>
      )}

      <div style={styles.tableCard}>
        <div style={styles.toolbar}>
          <input
            type="search"
            placeholder="Tìm tên, SĐT hoặc email..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            style={styles.searchInput}
          />

          <select
            value={filterStatus}
            onChange={(event) =>
              setFilterStatus(event.target.value)
            }
            style={styles.filterSelect}
          >
            <option value="ALL">
              Tất cả trạng thái
            </option>

            {STATUS_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={styles.empty}>
            Đang tải danh sách khách hàng...
          </div>
        ) : filteredConsultations.length === 0 ? (
          <div style={styles.empty}>
            Không có khách hàng phù hợp.
          </div>
        ) : (
          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Khách hàng</th>
                  <th style={styles.th}>Liên hệ</th>
                  <th style={styles.th}>Nội dung tư vấn</th>
                  <th style={styles.th}>Ngày gửi</th>
                  <th style={styles.th}>Trạng thái</th>
                  <th style={styles.th}>Cập nhật</th>
                </tr>
              </thead>

              <tbody>
                {filteredConsultations.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>
                      <strong style={styles.customerName}>
                        {item.fullName || "—"}
                      </strong>
                      <div style={styles.customerId}>
                        Mã #{item.id}
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div>{item.phone || "—"}</div>
                      <div style={styles.email}>
                        {item.email || "—"}
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.message}>
                        {item.message || "Không có nội dung"}
                      </div>
                    </td>

                    <td style={styles.td}>
                      {formatDate(item.createdAt)}
                    </td>

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...(STATUS_COLORS[item.status] ||
                            STATUS_COLORS.PENDING),
                        }}
                      >
                        {STATUS_OPTIONS.find(
                          (option) =>
                            option.value === item.status
                        )?.label || item.status}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <select
                        value={item.status || "PENDING"}
                        disabled={updatingId === item.id}
                        onChange={(event) =>
                          updateStatus(
                            item.id,
                            event.target.value
                          )
                        }
                        style={styles.statusSelect}
                        aria-label={`Cập nhật trạng thái khách hàng ${item.fullName}`}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statLabel}>{label}</span>
      <strong style={styles.statValue}>{value}</strong>
    </div>
  );
}

const styles = {
  page: {
    width: "100%",
  },
  backLink: {
    display: "inline-block",
    marginBottom: "24px",
    color: "#176b43",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "700",
  },
  heading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "28px",
  },
  eyebrow: {
    color: "#238353",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "1px",
  },
  title: {
    color: "#183b2a",
    fontSize: "29px",
    margin: "12px 0",
  },
  description: {
    color: "#718176",
    fontSize: "14px",
    lineHeight: "1.7",
  },
  refreshButton: {
    padding: "12px 18px",
    background: "#176b43",
    color: "#ffffff",
    border: "none",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "700",
  },
  stats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "26px",
  },
  statCard: {
    background: "#ffffff",
    padding: "22px",
    borderRadius: "14px",
    border: "1px solid #e0eae3",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  statLabel: {
    color: "#718176",
    fontSize: "13px",
  },
  statValue: {
    color: "#176b43",
    fontSize: "29px",
  },
  error: {
    padding: "14px",
    marginBottom: "18px",
    background: "#fff0f0",
    color: "#b42323",
    borderRadius: "9px",
    fontSize: "13px",
  },
  success: {
    padding: "14px",
    marginBottom: "18px",
    background: "#e5f5ea",
    color: "#176b43",
    borderRadius: "9px",
    fontSize: "13px",
  },
  tableCard: {
    background: "#ffffff",
    border: "1px solid #e0eae3",
    borderRadius: "16px",
    overflow: "hidden",
  },
  toolbar: {
    display: "flex",
    gap: "14px",
    padding: "20px",
    flexWrap: "wrap",
    borderBottom: "1px solid #eaf0eb",
  },
  searchInput: {
    flex: "1 1 260px",
    minWidth: "180px",
    padding: "12px 14px",
    border: "1px solid #dce7df",
    borderRadius: "9px",
    fontSize: "13px",
  },
  filterSelect: {
    padding: "12px 14px",
    border: "1px solid #dce7df",
    borderRadius: "9px",
    background: "#ffffff",
    fontSize: "13px",
  },
  tableScroll: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "950px",
  },
  th: {
    padding: "16px",
    background: "#f8fbf9",
    color: "#64776a",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "700",
    borderBottom: "1px solid #eaf0eb",
  },
  td: {
    padding: "17px 16px",
    borderBottom: "1px solid #edf2ee",
    color: "#34443a",
    fontSize: "13px",
    verticalAlign: "top",
    lineHeight: "1.6",
  },
  customerName: {
    color: "#183b2a",
  },
  customerId: {
    color: "#9aa9a0",
    fontSize: "11px",
    marginTop: "4px",
  },
  email: {
    color: "#718176",
    fontSize: "12px",
  },
  message: {
    maxWidth: "250px",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  statusBadge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },
  statusSelect: {
    padding: "9px",
    border: "1px solid #dce7df",
    borderRadius: "8px",
    background: "#ffffff",
    fontSize: "12px",
    maxWidth: "160px",
  },
  empty: {
    padding: "55px 20px",
    textAlign: "center",
    color: "#718176",
    fontSize: "14px",
  },
};
