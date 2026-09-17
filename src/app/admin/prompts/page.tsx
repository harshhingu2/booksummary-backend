"use client";

import React, { useState, useEffect } from "react";

interface PromptItem {
  _id: string;
  name: string;
  type: "individual" | "multibook";
  content: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "individual" as "individual" | "multibook",
    content: "",
    description: "",
    isActive: true,
    isDefault: false,
  });
  const [saving, setSaving] = useState(false);
  const [viewingContent, setViewingContent] = useState<PromptItem | null>(null);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter) params.append("type", typeFilter);

      const res = await fetch(`/api/admin/prompts?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setPrompts(data.prompts);
      }
    } catch (err) {
      console.error("Failed to load prompts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, [typeFilter]);

  const handleOpenAddModal = (defaultType?: "individual" | "multibook") => {
    setEditingId(null);
    setFormData({
      name: "",
      type: defaultType || "individual",
      content: "",
      description: "",
      isActive: true,
      isDefault: false,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (prompt: PromptItem) => {
    setEditingId(prompt._id);
    setFormData({
      name: prompt.name,
      type: prompt.type,
      content: prompt.content,
      description: prompt.description || "",
      isActive: prompt.isActive,
      isDefault: prompt.isDefault,
    });
    setShowModal(true);
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);

      const url = editingId ? `/api/admin/prompts/${editingId}` : "/api/admin/prompts";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          text: editingId ? "Prompt updated successfully!" : "Prompt created successfully!",
          type: "success",
        });
        setShowModal(false);
        fetchPrompts();
      } else {
        setMessage({ text: data.error || "Failed to save prompt", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "An unexpected error occurred", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePrompt = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the prompt "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/prompts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `Prompt "${name}" deleted.`, type: "success" });
        fetchPrompts();
      } else {
        setMessage({ text: data.error || "Failed to delete prompt", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Error deleting prompt", type: "error" });
    }
  };

  const handleToggleActive = async (prompt: PromptItem) => {
    try {
      const res = await fetch(`/api/admin/prompts/${prompt._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !prompt.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPrompts();
      }
    } catch (err) {
      console.error("Failed to toggle prompt status", err);
    }
  };

  const handleSetDefault = async (prompt: PromptItem) => {
    try {
      const res = await fetch(`/api/admin/prompts/${prompt._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true, isActive: true }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `Set "${prompt.name}" as default ${prompt.type} prompt.`, type: "success" });
        fetchPrompts();
      }
    } catch (err) {
      console.error("Failed to set default prompt", err);
    }
  };

  const filteredPrompts = prompts.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      p.content.toLowerCase().includes(q)
    );
  });

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>AI Prompts Management</h1>
          <p style={styles.subtitle}>
            Manage and edit system prompts used for generating Individual Book Summaries and Multi-Book Syntheses.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => handleOpenAddModal("individual")} style={styles.secondaryButton}>
            + Add Individual Prompt
          </button>
          <button onClick={() => handleOpenAddModal("multibook")} style={styles.primaryButton}>
            + Add Multi-Book Prompt
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {message && (
        <div
          style={{
            ...styles.alert,
            backgroundColor: message.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            borderColor: message.type === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)",
            color: message.type === "success" ? "#34D399" : "#F87171",
          }}
        >
          <span>{message.type === "success" ? "✅" : "⚠️"} {message.text}</span>
          <button onClick={() => setMessage(null)} style={styles.closeAlert}>✕</button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search prompts by name or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          {search && (
            <button onClick={() => setSearch("")} style={styles.clearSearch}>✕</button>
          )}
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={styles.select}
          >
            <option value="">All Types</option>
            <option value="individual">📖 Individual Book</option>
            <option value="multibook">📚 Multi-Book Synthesis</option>
          </select>
        </div>
      </div>

      {/* Prompts Table / Cards */}
      {loading ? (
        <div style={styles.loadingBox}>
          <div style={styles.spinner}></div>
          <p style={{ color: "#94A3B8", marginTop: "12px" }}>Loading prompts...</p>
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div style={styles.emptyBox}>
          <span style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📝</span>
          <h3 style={{ color: "#F8FAFC", margin: "0 0 6px 0" }}>No Prompts Found</h3>
          <p style={{ color: "#64748B", margin: 0, fontSize: "0.9rem" }}>
            {search || typeFilter
              ? "Try adjusting your search criteria or type filter."
              : "Create your first prompt template using the buttons above."}
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredPrompts.map((prompt) => (
            <div
              key={prompt._id}
              style={{
                ...styles.card,
                borderColor: prompt.isDefault ? "rgba(99, 102, 241, 0.6)" : "rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={styles.cardTop}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      ...styles.typeBadge,
                      backgroundColor:
                        prompt.type === "individual" ? "rgba(59, 130, 246, 0.15)" : "rgba(168, 85, 247, 0.15)",
                      color: prompt.type === "individual" ? "#60A5FA" : "#C084FC",
                      border: `1px solid ${
                        prompt.type === "individual" ? "rgba(59, 130, 246, 0.3)" : "rgba(168, 85, 247, 0.3)"
                      }`,
                    }}
                  >
                    {prompt.type === "individual" ? "📖 Single Book" : "📚 Multi-Book"}
                  </span>

                  {prompt.isDefault && (
                    <span style={styles.defaultBadge}>⭐ Active Default</span>
                  )}

                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: prompt.isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(100, 116, 139, 0.15)",
                      color: prompt.isActive ? "#34D399" : "#94A3B8",
                    }}
                  >
                    {prompt.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => handleOpenEditModal(prompt)}
                    style={styles.actionIconButton}
                    title="Edit Prompt"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeletePrompt(prompt._id, prompt.name)}
                    style={styles.actionIconButton}
                    title="Delete Prompt"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <h3 style={styles.cardTitle}>{prompt.name}</h3>
              {prompt.description && <p style={styles.cardDesc}>{prompt.description}</p>}

              {/* Content Preview */}
              <div style={styles.previewBox}>
                <div style={styles.previewHeader}>
                  <span style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>PROMPT PREVIEW</span>
                  <button
                    onClick={() => setViewingContent(prompt)}
                    style={styles.viewFullButton}
                  >
                    View Full ↗
                  </button>
                </div>
                <p style={styles.previewText}>
                  {prompt.content.slice(0, 220)}
                  {prompt.content.length > 220 ? "..." : ""}
                </p>
              </div>

              {/* Card Footer */}
              <div style={styles.cardFooter}>
                <button
                  onClick={() => handleToggleActive(prompt)}
                  style={{
                    ...styles.footerToggleBtn,
                    color: prompt.isActive ? "#F87171" : "#34D399",
                  }}
                >
                  {prompt.isActive ? "Deactivate" : "Activate"}
                </button>

                {!prompt.isDefault && prompt.isActive && (
                  <button
                    onClick={() => handleSetDefault(prompt)}
                    style={styles.setDefaultBtn}
                  >
                    Set as Default
                  </button>
                )}

                <button
                  onClick={() => handleOpenEditModal(prompt)}
                  style={styles.editButton}
                >
                  Edit Prompt
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingId ? "Edit AI Prompt" : "Create New AI Prompt"}
              </h2>
              <button onClick={() => setShowModal(false)} style={styles.modalCloseButton}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePrompt} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Prompt Name <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Dumbscroll Single Book Summary Prompt"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Content Type <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    style={styles.select}
                  >
                    <option value="individual">📖 Individual Book</option>
                    <option value="multibook">📚 Multi-Book Synthesis</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Default for this Type?</label>
                  <div style={{ display: "flex", alignItems: "center", height: "42px", gap: "8px" }}>
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      style={{ cursor: "pointer", width: "18px", height: "18px" }}
                    />
                    <label htmlFor="isDefault" style={{ color: "#94A3B8", fontSize: "0.85rem", cursor: "pointer" }}>
                      Make default prompt
                    </label>
                  </div>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description / Purpose (Optional)</label>
                <input
                  type="text"
                  placeholder="Short note about what tone or format this prompt delivers"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={styles.label}>
                    Prompt Instructions / Template <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
                    {formData.content.length} characters
                  </span>
                </div>

                {/* Variable insertion hint toolbar */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "8px", padding: "8px 10px", backgroundColor: "#0F172A", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94A3B8", fontWeight: 600 }}>Insert variables:</span>
                  {(formData.type === "individual"
                    ? ["{{topic}}", "{{title}}", "{{contentType}}"]
                    : ["{{topic}}", "{{books}}", "{{contentType}}"]
                  ).map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, content: prev.content + " " + variable }))}
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.75rem",
                        fontFamily: "monospace",
                        backgroundColor: "#1E293B",
                        color: "#38BDF8",
                        border: "1px solid #334155",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                      title={`Click to append ${variable} into template`}
                    >
                      + {variable}
                    </button>
                  ))}
                </div>

                <textarea
                  required
                  rows={14}
                  placeholder="Paste your full master prompt instructions here..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  style={styles.textarea}
                />
              </div>

              <div style={styles.checkboxRow}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ cursor: "pointer" }}
                  />
                  <span style={{ color: "#CBD5E1", fontSize: "0.9rem" }}>Active and enabled for use</span>
                </label>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={styles.cancelButton}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.saveButton}
                  disabled={saving}
                >
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Prompt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Content View Modal */}
      {viewingContent && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: "800px" }}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>{viewingContent.name}</h2>
                <span style={{ fontSize: "0.8rem", color: "#94A3B8" }}>
                  Type: {viewingContent.type === "individual" ? "Single Book" : "Multi-Book"}
                  {viewingContent.isDefault && " · Default Active"}
                </span>
              </div>
              <button onClick={() => setViewingContent(null)} style={styles.modalCloseButton}>
                ✕
              </button>
            </div>

            <div style={{ maxHeight: "65vh", overflowY: "auto", padding: "16px", backgroundColor: "#090D16", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace", fontSize: "0.85rem", color: "#E2E8F0", lineHeight: "1.6" }}>
                {viewingContent.content}
              </pre>
            </div>

            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(viewingContent.content);
                  alert("Prompt copied to clipboard!");
                }}
                style={styles.secondaryButton}
              >
                📋 Copy Content
              </button>
              <button
                onClick={() => {
                  const toEdit = viewingContent;
                  setViewingContent(null);
                  handleOpenEditModal(toEdit);
                }}
                style={styles.primaryButton}
              >
                ✏️ Edit this Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "24px",
    maxWidth: "1300px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "16px",
  },
  title: {
    fontSize: "1.85rem",
    fontWeight: 700,
    color: "#F8FAFC",
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: "0.95rem",
    margin: 0,
  },
  primaryButton: {
    backgroundColor: "#6366F1",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "10px 18px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  secondaryButton: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    color: "#A5B4FC",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    borderRadius: "8px",
    padding: "10px 18px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  alert: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid",
    marginBottom: "20px",
    fontSize: "0.9rem",
  },
  closeAlert: {
    background: "none",
    border: "none",
    color: "inherit",
    cursor: "pointer",
    fontSize: "1rem",
  },
  filterBar: {
    display: "flex",
    gap: "16px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  searchBox: {
    flex: 1,
    minWidth: "260px",
    display: "flex",
    alignItems: "center",
    backgroundColor: "#131A29",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    padding: "0 12px",
  },
  searchIcon: {
    fontSize: "0.9rem",
    color: "#64748B",
    marginRight: "8px",
  },
  searchInput: {
    width: "100%",
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    color: "#F8FAFC",
    padding: "10px 0",
    fontSize: "0.9rem",
  },
  clearSearch: {
    background: "none",
    border: "none",
    color: "#64748B",
    cursor: "pointer",
    padding: "4px",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  filterLabel: {
    fontSize: "0.85rem",
    color: "#94A3B8",
    fontWeight: 500,
  },
  select: {
    backgroundColor: "#131A29",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    color: "#F8FAFC",
    padding: "10px 14px",
    fontSize: "0.9rem",
    outline: "none",
    cursor: "pointer",
  },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 0",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: "3px solid rgba(99, 102, 241, 0.2)",
    borderTopColor: "#6366F1",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  emptyBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    backgroundColor: "#0D131F",
    borderRadius: "12px",
    border: "1px dashed rgba(255, 255, 255, 0.1)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
    gap: "20px",
  },
  card: {
    backgroundColor: "#0D131F",
    borderRadius: "12px",
    border: "1px solid",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },
  typeBadge: {
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: "6px",
  },
  defaultBadge: {
    fontSize: "0.75rem",
    fontWeight: 600,
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    color: "#A5B4FC",
    border: "1px solid rgba(99, 102, 241, 0.4)",
    padding: "3px 8px",
    borderRadius: "6px",
  },
  statusBadge: {
    fontSize: "0.75rem",
    fontWeight: 500,
    padding: "3px 8px",
    borderRadius: "6px",
  },
  actionIconButton: {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "6px",
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  cardTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#F8FAFC",
    margin: "0 0 6px 0",
    lineHeight: "1.3",
  },
  cardDesc: {
    fontSize: "0.85rem",
    color: "#94A3B8",
    margin: "0 0 14px 0",
    lineHeight: "1.4",
  },
  previewBox: {
    backgroundColor: "#080C14",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    padding: "12px",
    marginBottom: "16px",
    flex: 1,
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  viewFullButton: {
    background: "none",
    border: "none",
    color: "#818CF8",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
  },
  previewText: {
    fontFamily: "monospace",
    fontSize: "0.8rem",
    color: "#94A3B8",
    margin: 0,
    lineHeight: "1.5",
    wordBreak: "break-word",
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    paddingTop: "14px",
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    flexWrap: "wrap",
  },
  footerToggleBtn: {
    background: "none",
    border: "none",
    fontSize: "0.8rem",
    fontWeight: 500,
    cursor: "pointer",
    padding: "4px 0",
  },
  setDefaultBtn: {
    background: "none",
    border: "none",
    color: "#A5B4FC",
    fontSize: "0.8rem",
    fontWeight: 500,
    cursor: "pointer",
    padding: "4px 0",
  },
  editButton: {
    marginLeft: "auto",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    color: "#F1F5F9",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "0.8rem",
    fontWeight: 500,
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: "#0E1524",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "680px",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: "24px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  modalTitle: {
    fontSize: "1.3rem",
    fontWeight: 700,
    color: "#F8FAFC",
    margin: 0,
  },
  modalCloseButton: {
    background: "none",
    border: "none",
    color: "#64748B",
    fontSize: "1.2rem",
    cursor: "pointer",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#E2E8F0",
  },
  input: {
    backgroundColor: "#131A29",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#F8FAFC",
    fontSize: "0.9rem",
    outline: "none",
  },
  textarea: {
    backgroundColor: "#090D16",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    padding: "12px 14px",
    color: "#E2E8F0",
    fontSize: "0.85rem",
    fontFamily: "monospace",
    lineHeight: "1.5",
    outline: "none",
    resize: "vertical",
  },
  checkboxRow: {
    padding: "4px 0",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "8px",
  },
  cancelButton: {
    backgroundColor: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#94A3B8",
    borderRadius: "8px",
    padding: "10px 18px",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  saveButton: {
    backgroundColor: "#6366F1",
    border: "none",
    color: "#FFFFFF",
    borderRadius: "8px",
    padding: "10px 20px",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};
