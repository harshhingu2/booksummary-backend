"use client";

import React, { useState, useEffect } from "react";

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
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
  }, [search, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", isActive: true, sortOrder: categories.length });
    setShowModal(true);
  };

  const handleOpenEditModal = (cat: CategoryItem) => {
    setEditingId(cat._id);
    setFormData({
      name: cat.name,
      description: cat.description || "",
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
      setMessage({ text: err.message || "Request failed", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat: CategoryItem) => {
    try {
      const res = await fetch(`/api/admin/categories/${cat._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      const data = await res.json();
      if (data.success) fetchCategories();
    } catch (err) {
      console.error("Failed to toggle category status:", err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) fetchCategories();
    } catch (err) {
      console.error("Failed to delete category:", err);
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Category Management</h1>
          <p style={styles.subtitle}>Create, edit, and toggle active status for content categories</p>
        </div>
        <button onClick={handleOpenAddModal} style={styles.primaryButton}>
          ➕ Add New Category
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
          placeholder="Search by category name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.selectFilter}
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Table */}
      <div style={styles.tableContainer}>
        {loading ? (
          <p style={{ padding: "24px", color: "#94A3B8" }}>Loading categories...</p>
        ) : categories.length === 0 ? (
          <div style={styles.emptyState}>No categories found matching your search.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Sort</th>
                <th style={styles.th}>Category Name</th>
                <th style={styles.th}>Slug</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat._id} style={styles.tr}>
                  <td style={styles.tdOrder}>{cat.sortOrder}</td>
                  <td style={styles.tdName}>{cat.name}</td>
                  <td style={styles.tdSlug}>{cat.slug}</td>
                  <td style={styles.tdDesc}>{cat.description || "—"}</td>
                  <td style={styles.td}>
                    <span
                      onClick={() => handleToggleActive(cat)}
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: cat.isActive ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                        color: cat.isActive ? "#34D399" : "#FCA5A5",
                      }}
                      title="Click to toggle status"
                    >
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={styles.tdActions}>
                    <button onClick={() => handleOpenEditModal(cat)} style={styles.editButton}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDeleteCategory(cat._id)} style={styles.deleteButton}>
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={{ margin: "0 0 20px 0", color: "#F8FAFC" }}>
              {editingId ? "Edit Category" : "Create New Category"}
            </h2>
            <form onSubmit={handleSaveCategory} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={styles.label}>Category Name</label>
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
                <label style={styles.label}>Description (Optional)</label>
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

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button type="submit" disabled={saving} style={styles.primaryButton}>
                  {saving ? "Saving..." : editingId ? "Update Category" : "Create Category"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={styles.cancelButton}>
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
  tdOrder: {
    padding: "16px 18px",
    fontSize: "0.85rem",
    color: "#94A3B8",
    fontWeight: 600,
  },
  tdName: {
    padding: "16px 18px",
    fontWeight: 600,
    color: "#F8FAFC",
  },
  tdSlug: {
    padding: "16px 18px",
    fontFamily: "monospace",
    fontSize: "0.85rem",
    color: "#60A5FA",
  },
  tdDesc: {
    padding: "16px 18px",
    fontSize: "0.85rem",
    color: "#94A3B8",
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
    display: "flex",
    gap: "8px",
  },
  editButton: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    color: "#60A5FA",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
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
