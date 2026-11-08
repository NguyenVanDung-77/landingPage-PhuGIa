
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./AdminUsersPage.css";

const API_BASE = "http://localhost:8080";

export default function AdminUsersPage() {
  const { user: currentUser } = useOutletContext();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/admin/users`,
        {
          credentials: "include",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "Bạn không có quyền quản lý người dùng."
            : "Không thể tải danh sách người dùng."
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu người dùng không hợp lệ.");
      }

      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === "ADMIN").length,
      active: users.filter((u) => u.enabled).length,
      locked: users.filter((u) => !u.enabled).length,
    }),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole =
        roleFilter === "ALL" || user.role === roleFilter;

      const searchable = [
        user.fullName,
        user.username,
        user.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesRole && searchable.includes(keyword);
    });
  }, [users, search, roleFilter]);

  const isSelf = (user) =>
    user.username === currentUser?.username;

  const requestUpdate = async (id, field, value) => {
    setBusyId(id);
    setError("");
    setNotice("");

    try {
      const csrfResponse = await fetch(
        `${API_BASE}/api/auth/csrf`,
        { credentials: "include" }
      );

      if (!csrfResponse.ok) {
        throw new Error("Không thể lấy mã bảo mật CSRF.");
      }

      const csrf = await csrfResponse.json();

      const endpoint =
        field === "role" ? "role" : "status";

      const payload =
        field === "role"
          ? { role: value }
          : { enabled: value };

      const response = await fetch(
        `${API_BASE}/api/admin/users/${id}/${endpoint}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            [csrf.headerName]: csrf.token,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        let message = "Không thể cập nhật tài khoản.";

        if (response.status === 403) {
          message = "Bạn không có quyền thực hiện thao tác này.";
        } else if (response.status === 401) {
          message = "Phiên đăng nhập đã hết hạn.";
        }

        throw new Error(message);
      }

      const updatedUser = await response.json();

      setUsers((previous) =>
        previous.map((user) =>
          user.id === id ? updatedUser : user
        )
      );

      setNotice(
        field === "role"
          ? `Đã cập nhật vai trò của ${updatedUser.fullName || updatedUser.username}.`
          : `Đã ${value ? "mở khóa" : "khóa"} tài khoản ${updatedUser.username}.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRoleChange = (user, nextRole) => {
    if (user.role === nextRole || isSelf(user)) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn đổi vai trò của "${user.fullName || user.username}" từ ${user.role} sang ${nextRole}?\n\nNgười dùng cần đăng nhập lại để nhận quyền mới.`
    );

    if (confirmed) {
      requestUpdate(user.id, "role", nextRole);
    }
  };

  const handleStatusChange = (user) => {
    if (isSelf(user)) return;

    const nextStatus = !user.enabled;

    const confirmed = window.confirm(
      `Bạn có chắc muốn ${nextStatus ? "mở khóa" : "khóa"} tài khoản "${user.fullName || user.username}"?`
    );

    if (confirmed) {
      requestUpdate(user.id, "status", nextStatus);
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="pg-users-page">
      <div className="pg-users-heading">
        <div>
          <div className="pg-users-eyebrow">
            QUẢN TRỊ / TÀI KHOẢN
          </div>
          <h1>Quản lý người dùng</h1>
          <p>
            Theo dõi tài khoản, phân quyền và kiểm soát
            trạng thái truy cập hệ thống.
          </p>
        </div>

        <button
          type="button"
          className="pg-users-refresh"
          onClick={loadUsers}
          disabled={loading || busyId !== null}
        >
          ↻ Làm mới
        </button>
      </div>

      <div className="pg-users-stats">
        {[
          { label: "Tổng tài khoản", value: stats.total, icon: "♙" },
          { label: "Quản trị viên", value: stats.admins, icon: "✦" },
          { label: "Đang hoạt động", value: stats.active, icon: "✓" },
          { label: "Đã khóa", value: stats.locked, icon: "⊘" },
        ].map((item) => (
          <div className="pg-users-stat" key={item.label}>
            <div className="pg-users-stat-top">
              <span>{item.label}</span>
              <span className="pg-users-stat-icon">
                {item.icon}
              </span>
            </div>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="pg-users-panel">
        <div className="pg-users-panel-header">
          <div>
            <h2>Danh sách tài khoản</h2>
            <p>
              {filteredUsers.length} người dùng được hiển thị
            </p>
          </div>

          <div className="pg-users-filters">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, email, tài khoản..."
              aria-label="Tìm kiếm người dùng"
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Lọc vai trò"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
            </select>
          </div>
        </div>

        {notice && (
          <div className="pg-users-notice" role="status">
            ✓ {notice}
          </div>
        )}

        {error && (
          <div className="pg-users-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="pg-users-empty">
            Đang tải danh sách người dùng...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="pg-users-empty">
            Không tìm thấy tài khoản phù hợp.
          </div>
        ) : (
          <div className="pg-users-table-wrap">
            <table className="pg-users-table">
              <thead>
                <tr>
                  <th>NGƯỜI DÙNG</th>
                  <th>VAI TRÒ</th>
                  <th>TRẠNG THÁI</th>
                  <th>NGÀY TẠO</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => {
                  const self = isSelf(user);
                  const busy = busyId === user.id;

                  const initials = (
                    user.fullName ||
                    user.username ||
                    "U"
                  )
                    .trim()
                    .charAt(0)
                    .toUpperCase();

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="pg-users-person">
                          <div className="pg-users-avatar">
                            {initials}
                          </div>

                          <div className="pg-users-person-info">
                            <strong>
                              {user.fullName ||
                                user.username}
                              {self && (
                                <span className="pg-users-self">
                                  Bạn
                                </span>
                              )}
                            </strong>

                            <span>
                              {user.email || "Chưa có email"}
                            </span>

                            <small>@{user.username}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <select
                          className={
                            "pg-users-role-select " +
                            (user.role === "ADMIN"
                              ? "is-admin"
                              : "is-user")
                          }
                          value={user.role}
                          disabled={self || busyId !== null}
                          onChange={(e) =>
                            handleRoleChange(
                              user,
                              e.target.value
                            )
                          }
                          aria-label={`Vai trò của ${user.username}`}
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>

                      <td>
                        <span
                          className={
                            "pg-users-status " +
                            (user.enabled
                              ? "is-active"
                              : "is-locked")
                          }
                        >
                          <span className="pg-users-status-dot" />
                          {user.enabled
                            ? "Hoạt động"
                            : "Đã khóa"}
                        </span>
                      </td>

                      <td className="pg-users-date">
                        {formatDate(user.createdAt)}
                      </td>

                      <td>
                        <button
                          type="button"
                          className={
                            "pg-users-action " +
                            (user.enabled
                              ? "action-lock"
                              : "action-unlock")
                          }
                          disabled={self || busyId !== null}
                          onClick={() =>
                            handleStatusChange(user)
                          }
                        >
                          {busy
                            ? "Đang lưu..."
                            : self
                              ? "Tài khoản của bạn"
                              : user.enabled
                                ? "Khóa tài khoản"
                                : "Mở khóa"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pg-users-info">
        <strong>🔒 Bảo mật phân quyền</strong>
        <p>
          Chỉ ADMIN được thay đổi vai trò và trạng thái
          tài khoản. Không thể tự hạ quyền hoặc tự khóa
          tài khoản đang sử dụng. Người dùng cần đăng nhập
          lại sau khi được thay đổi quyền.
        </p>
      </div>
    </div>
  );
}
