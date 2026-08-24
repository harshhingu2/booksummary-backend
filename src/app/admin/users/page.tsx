"use client";

import React, { useState, useEffect } from "react";

export type RoleType = "ADMIN" | "EDITOR" | "USER";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: RoleType;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER" as RoleType,
  });
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err: any) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      setMessage(null);

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserData),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ text: "User created successfully!", type: "success" });
        setShowModal(false);
        setNewUserData({ name: "", email: "", password: "", role: "USER" });
        fetchUsers();
      } else {
        setMessage({ text: data.error || "Failed to create user", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Request failed", type: "error" });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error("Error updating user status:", err);
    }
  };

  const handleRoleChange = async (user: UserItem, nextRole: RoleType) => {
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error("Error updating user role:", err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>User Management</h1>
          <p style={styles.subtitle}>Manage administrators, editors, and standard users</p>
        </div>
        <button onClick={() => setShowModal(true)} style={styles.primaryButton}>
          ➕ Add New User
        </button>
      </div>

      {message && (
        <div
          style={{
            ...styles.alert,
            ...(message.type === "success" ? styles.alertSuccess : styles.alertError),
          }}
        >
          {message.text}
        </div>
      )}

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={styles.selectFilter}
        >
          <option value="">All Roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="EDITOR">EDITOR</option>
          <option value="USER">USER</option>
        </select>
      </div>

      {/* Table */}
      <div style={styles.tableContainer}>
        {loading ? (
          <p style={{ padding: "24px", color: "#94A3B8" }}>Loading users list...</p>
        ) : users.length === 0 ? (
          <div style={styles.emptyState}>No users found matching your search.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Joined</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} style={styles.tr}>
                  <td style={styles.tdUser}>
                    <div style={styles.avatarMini}>{u.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#F8FAFC" }}>{u.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>{u.email}</div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <select
                      value={u.role?.toUpperCase() || "USER"}
                      onChange={(e) => handleRoleChange(u, e.target.value as RoleType)}
                      style={{
                        ...styles.roleSelect,
                        backgroundColor:
                          u.role === "ADMIN"
                            ? "rgba(59, 130, 246, 0.2)"
                            : u.role === "EDITOR"
                            ? "rgba(168, 85, 247, 0.2)"
                            : "rgba(100, 116, 139, 0.2)",
                        color:
                          u.role === "ADMIN"
                            ? "#60A5FA"
                            : u.role === "EDITOR"
                            ? "#C084FC"
                            : "#94A3B8",
                      }}
                    >
                      <option value="ADMIN" style={{ backgroundColor: "#1E293B", color: "#60A5FA" }}>ADMIN</option>
                      <option value="EDITOR" style={{ backgroundColor: "#1E293B", color: "#C084FC" }}>EDITOR</option>
                      <option value="USER" style={{ backgroundColor: "#1E293B", color: "#94A3B8" }}>USER</option>
                    </select>
                  </td>
                  <td style={styles.td}>
                    <span
                      onClick={() => handleToggleActive(u)}
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: u.isActive ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                        color: u.isActive ? "#34D399" : "#FCA5A5",
                      }}
                      title="Click to toggle active status"
                    >
                      {u.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td style={styles.td}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td style={styles.tdActions}>
                    <button
                      onClick={() => handleDeleteUser(u._id)}
                      style={styles.deleteButton}
                      title="Delete User"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={{ margin: "0 0 20px 0", color: "#F8FAFC" }}>Create New User Account</h2>
            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={styles.label}>Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  style={styles.modalInput}
                />
              </div>

              <div>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  style={styles.modalInput}
                />
              </div>

              <div>
                <label style={styles.label}>Password</label>
                <input
                  type="password"
                  required
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  style={styles.modalInput}
                />
              </div>

              <div>
                <label style={styles.label}>Role</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as RoleType })}
                  style={styles.modalInput}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="EDITOR">EDITOR</option>
                  <option value="USER">USER</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button type="submit" disabled={creating} style={styles.primaryButton}>
                  {creating ? "Saving..." : "Create Account"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "28px",
  },
  title: {
    margin: 0,
    fontSize: "1.875rem",
    fontWeight: 700,
    color: "#F8FAFC",
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "#94A3B8",
    fontSize: "0.95rem",
  },
  primaryButton: {
    backgroundColor: "#3B82F6",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "10px 18px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(59, 130, 246, 0.3)",
  },
  cancelButton: {
    backgroundColor: "transparent",
    color: "#94A3B8",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 18px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  filterBar: {
    display: "flex",
    gap: "16px",
    marginBottom: "24px",
  },
  searchInput: {
    flex: 1,
    padding: "10px 14px",
    backgroundColor: "#1E293B",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#F8FAFC",
    fontSize: "0.9rem",
    outline: "none",
  },
  selectFilter: {
    padding: "10px 14px",
    backgroundColor: "#1E293B",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#F8FAFC",
    fontSize: "0.9rem",
    outline: "none",
  },
  alert: {
    padding: "14px 18px",
    borderRadius: "8px",
    marginBottom: "24px",
    fontSize: "0.9rem",
  },
  alertSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#34D399",
    border: "1px solid rgba(16, 185, 129, 0.3)",
  },
  alertError: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#FCA5A5",
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },
  tableContainer: {
    backgroundColor: "#1E293B",
    borderRadius: "14px",
    border: "1px solid #334155",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    padding: "14px 18px",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#94A3B8",
    textTransform: "uppercase",
    borderBottom: "1px solid #334155",
  },
  tr: {
    borderBottom: "1px solid #0F172A",
  },
  td: {
    padding: "16px 18px",
    fontSize: "0.9rem",
    color: "#CBD5E1",
  },
  tdUser: {
    padding: "16px 18px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatarMini: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#3B82F6",
    color: "#FFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.85rem",
  },
  roleSelect: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 700,
    border: "none",
    outline: "none",
    cursor: "pointer",
  },
  statusBadge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  tdActions: {
    padding: "16px 18px",
  },
  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#FCA5A5",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  emptyState: {
    padding: "40px",
    textAlign: "center",
    color: "#94A3B8",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#1E293B",
    borderRadius: "14px",
    border: "1px solid #334155",
    padding: "28px",
    width: "100%",
    maxWidth: "460px",
  },
  modalInput: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#F8FAFC",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box",
  },
  label: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#94A3B8",
    textTransform: "uppercase",
    marginBottom: "4px",
    display: "block",
  },
};
