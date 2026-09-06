"use client";

import React, { useState, useEffect } from "react";

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  type?: "all" | "topcombine" | "individual";
  isActive: boolean;
  sortOrder: number;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "all" as "all" | "topcombine" | "individual",
    isActive: true,
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("type", typeFilter);

      const res = await fetch(`/api/admin/categories?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [search, statusFilter, typeFilter]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", type: "all", isActive: true, sortOrder: categories.length });
    setShowModal(true);
  };

  const handleOpenEditModal = (cat: CategoryItem) => {
    setEditingId(cat._id);
    setFormData({
      name: cat.name,
      description: cat.description || "",
      type: cat.type || "all",
      isActive: cat.isActive,
      sortOrder: cat.sortOrder || 0,
    });
    setShowModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);

      const url = editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: "success" });
        setShowModal(false);
        fetchCategories();
      } else {
        setMessage({ text: data.error || "Failed to save category", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category '${name}'?`)) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: "success" });
        fetchCategories();
      }
    } catch (err: any) {
      alert("Error deleting category: " + err.message);
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Categories & Topics</h1>
          <p style={styles.subtitle}>Manage topic taxonomy for Top Combine & Individual books</p>
        </div>
        <button onClick={handleOpenAddModal} style={styles.primaryBtn}>
          + Add Category
        </button>
      </div>

      {message && (
        <div
          style={{
            ...styles.alert,
            backgroundColor: message.type === "success" ? "#065F46" : "#991B1B",
          }}
        >
          {message.text}
        </div>
      )}

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={styles.selectInput}
        >
          <option value="">All Types</option>
          <option value="all">Universal (All Books)</option>
          <option value="topcombine">Top Combine Only</option>
          <option value="individual">Individual Books Only</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.selectInput}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Categories Table */}
      <div style={styles.tableContainer}>
        {loading ? (
          <p style={{ padding: "24px", color: "#94A3B8" }}>Loading categories...</p>
        ) : categories.length === 0 ? (
          <div style={styles.emptyState}>No categories found.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name & Slug</th>
                <th style={styles.th}>Scope Type</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Order</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat._id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 600, color: "#FFFFFF" }}>{cat.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748B" }}>/{cat.slug}</div>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.typeBadge,
                        backgroundColor:
                          cat.type === "individual"
                            ? "rgba(16, 185, 129, 0.15)"
                            : cat.type === "topcombine"
                            ? "rgba(245, 158, 11, 0.15)"
                            : "rgba(59, 130, 246, 0.15)",
                        color:
                          cat.type === "individual"
                            ? "#34D399"
                            : cat.type === "topcombine"
                            ? "#FBBF24"
                            : "#60A5FA",
                      }}
                    >
                      {cat.type === "individual"
                        ? "Individual"
                        : cat.type === "topcombine"
                        ? "Top Combine"
                        : "Universal"}
                    </span>
                  </td>
                  <td style={styles.td}>{cat.description || "—"}</td>
                  <td style={styles.td}>{cat.sortOrder}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        backgroundColor: cat.isActive ? "#065F46" : "#334155",
                        color: cat.isActive ? "#34D399" : "#94A3B8",
                      }}
                    >
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => handleOpenEditModal(cat)} style={styles.editBtn}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(cat._id, cat.name)} style={styles.deleteBtn}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>{editingId ? "Edit Category" : "Add New Category"}</h2>
            <form onSubmit={handleSaveCategory} style={styles.form}>
              <div>
                <label style={styles.label}>Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science, Philosophy, AI"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.modalInput}
                />
              </div>

              <div>
                <label style={styles.label}>Applies To (Category Type)</label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as "all" | "topcombine" | "individual" })
                  }
                  style={styles.modalInput}
                >
                  <option value="all">Universal (Both Top Combine & Individual)</option>
                  <option value="topcombine">Top Combine Summaries Only</option>
                  <option value="individual">Individual Books Only</option>
                </select>
              </div>

              <div>
                <label style={styles.label}>Description</label>
                <input
                  type="text"
                  placeholder="Short summary of this category"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={styles.modalInput}
                />
              </div>

              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Sort Order</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value, 10) || 0 })}
                    style={styles.modalInput}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Status</label>
                  <select
                    value={formData.isActive ? "active" : "inactive"}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "active" })}
                    style={styles.modalInput}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={styles.cancelBtn}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.primaryBtn} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: "1.875rem",
    fontWeight: 700,
    color: "#FFFFFF",
    margin: 0,
  },
  subtitle: {
    fontSize: "0.875rem",
    color: "#94A3B8",
    marginTop: "4px",
  },
  primaryBtn: {
    padding: "10px 18px",
    backgroundColor: "#3B82F6",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  filterBar: {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  searchInput: {
    flex: 1,
    minWidth: "220px",
    padding: "10px 16px",
    backgroundColor: "#1E293B",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#FFFFFF",
    outline: "none",
  },
  selectInput: {
    padding: "10px 16px",
    backgroundColor: "#1E293B",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#FFFFFF",
    outline: "none",
  },
  tableContainer: {
    backgroundColor: "#1E293B",
    borderRadius: "12px",
    border: "1px solid #334155",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "0.875rem",
  },
  th: {
    padding: "14px 18px",
    backgroundColor: "#0F172A",
    color: "#94A3B8",
    fontWeight: 600,
    borderBottom: "1px solid #334155",
  },
  tr: {
    borderBottom: "1px solid #334155",
  },
  td: {
    padding: "14px 18px",
    color: "#CBD5E1",
    verticalAlign: "middle",
  },
  badge: {
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: 600,
  },
  typeBadge: {
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: 700,
    border: "1px solid currentColor",
  },
  editBtn: {
    padding: "6px 12px",
    backgroundColor: "#334155",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.75rem",
  },
  deleteBtn: {
    padding: "6px 12px",
    backgroundColor: "#EF4444",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.75rem",
  },
  emptyState: {
    padding: "40px",
    textAlign: "center",
    color: "#94A3B8",
  },
  alert: {
    padding: "12px 16px",
    borderRadius: "8px",
    color: "#FFFFFF",
    marginBottom: "16px",
    fontSize: "0.9rem",
  },
  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  modalContent: {
    backgroundColor: "#1E293B",
    padding: "24px",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "500px",
    border: "1px solid #334155",
  },
  modalTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#FFFFFF",
    margin: "0 0 16px 0",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  label: {
    display: "block",
    fontSize: "0.8rem",
    color: "#94A3B8",
    marginBottom: "6px",
    fontWeight: 500,
  },
  modalInput: {
    width: "100%",
    padding: "10px 14px",
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#FFFFFF",
    outline: "none",
    fontSize: "0.9rem",
    boxSizing: "border-box",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "8px",
  },
  cancelBtn: {
    padding: "10px 16px",
    backgroundColor: "transparent",
    color: "#94A3B8",
    border: "1px solid #334155",
    borderRadius: "8px",
    cursor: "pointer",
  },
};
