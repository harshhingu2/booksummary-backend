"use client";

import React, { useState, useEffect } from "react";

interface Chapter {
  chapterNumber: number;
  title: string;
}

interface BookItem {
  _id: string;
  title: string;
  topic: string;
  coverImage: string;
  audioUrl?: string;
  readingTimeMinutes: number;
  shortDescription: string;
  content: string;
  chapters?: Chapter[];
  isTopCombine: boolean;
  createdAt: string;
}

export default function AdminBooksPage() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal State for Add & Edit
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    topic: "Productivity",
    coverImage: "",
    audioUrl: "",
    readingTimeMinutes: 10,
    shortDescription: "",
    content: "",
    isTopCombine: true,
    chaptersText: "",
  });

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);

      const res = await fetch(`/api/admin/books?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setBooks(data.books);
      }
    } catch (err) {
      console.error("Error fetching books:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [search]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      title: "",
      topic: "Productivity",
      coverImage: "",
      audioUrl: "",
      readingTimeMinutes: 10,
      shortDescription: "",
      content: "",
      isTopCombine: true,
      chaptersText: "",
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (b: BookItem) => {
    setEditingId(b._id);
    const chText = (b.chapters || []).map((c) => c.title).join("\n");
    setFormData({
      title: b.title,
      topic: b.topic || "Productivity",
      coverImage: b.coverImage || "",
      audioUrl: b.audioUrl || "",
      readingTimeMinutes: b.readingTimeMinutes || 10,
      shortDescription: b.shortDescription || "",
      content: b.content || "",
      isTopCombine: !!b.isTopCombine,
      chaptersText: chText,
    });
    setShowModal(true);
  };

  // Upload Cover Image to Cloudflare R2
  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setMessage(null);

      const data = new FormData();
      data.append("file", file);
      data.append("type", "images");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: data,
      });
      const result = await res.json();

      if (result.success && result.url) {
        setFormData((prev) => ({ ...prev, coverImage: result.url }));
        setMessage({ text: "Cover image uploaded to Cloudflare R2!", type: "success" });
      } else {
        setMessage({ text: result.error || "Image upload failed", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to upload image", type: "error" });
    } finally {
      setUploadingImage(false);
    }
  };

  // Upload Audiobook / Audio Narration to Cloudflare R2
  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAudio(true);
      setMessage(null);

      const data = new FormData();
      data.append("file", file);
      data.append("type", "audio");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: data,
      });
      const result = await res.json();

      if (result.success && result.url) {
        setFormData((prev) => ({ ...prev, audioUrl: result.url }));
        setMessage({ text: "Audiobook uploaded to Cloudflare R2!", type: "success" });
      } else {
        setMessage({ text: result.error || "Audio upload failed", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to upload audio", type: "error" });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);

      const chapters: Chapter[] = formData.chaptersText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((title, idx) => ({
          chapterNumber: idx + 1,
          title,
        }));

      const payload = {
        title: formData.title,
        topic: formData.topic,
        coverImage: formData.coverImage,
        audioUrl: formData.audioUrl,
        readingTimeMinutes: Number(formData.readingTimeMinutes) || 10,
        shortDescription: formData.shortDescription,
        content: formData.content,
        chapters,
        isTopCombine: formData.isTopCombine,
      };

      const url = editingId ? `/api/admin/books/${editingId}` : "/api/admin/books";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          text: editingId ? "Top Combine summary updated!" : "Top Combine summary created!",
          type: "success",
        });
        setShowModal(false);
        fetchBooks();
      } else {
        setMessage({ text: data.error || "Failed to save summary", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save summary", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTopCombine = async (book: BookItem) => {
    try {
      const res = await fetch(`/api/admin/books/${book._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTopCombine: !book.isTopCombine }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBooks();
      }
    } catch (err) {
      console.error("Error toggling book status:", err);
    }
  };

  const handleDeleteBook = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete '${title}'?`)) return;
    try {
      const res = await fetch(`/api/admin/books/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: "Summary deleted successfully", type: "success" });
        fetchBooks();
      }
    } catch (err) {
      console.error("Error deleting book:", err);
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Top Combine Summaries Library</h1>
          <p style={styles.subtitle}>
            Manage combined topic summaries, rich HTML content, and Cloudflare R2 covers & audiobooks
          </p>
        </div>
        <button onClick={handleOpenAddModal} style={styles.primaryBtn}>
          + Add Top Combine Summary
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

      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="Search by title or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.tableContainer}>
        {loading ? (
          <p style={{ padding: "24px", color: "#94A3B8" }}>Loading book library...</p>
        ) : books.length === 0 ? (
          <div style={styles.emptyState}>No book summaries found.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Summary Title</th>
                <th style={styles.th}>Topic</th>
                <th style={styles.th}>Read Time</th>
                <th style={styles.th}>Audiobook</th>
                <th style={styles.th}>Top Combine</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b._id} style={styles.tr}>
                  <td style={styles.tdTitle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {b.coverImage ? (
                        <img
                          src={b.coverImage}
                          alt={b.title}
                          style={{ width: "42px", height: "58px", borderRadius: "6px", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ width: "42px", height: "58px", borderRadius: "6px", backgroundColor: "#334155" }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: "#F8FAFC" }}>{b.title}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>
                          {b.chapters?.length || 0} chapters
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.topicBadge}>{b.topic}</span>
                  </td>
                  <td style={styles.td}>{b.readingTimeMinutes} mins</td>
                  <td style={styles.td}>
                    {b.audioUrl ? (
                      <a
                        href={b.audioUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#10B981", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}
                      >
                        🎧 Has Audio
                      </a>
                    ) : (
                      <span style={{ color: "#64748B", fontSize: "0.75rem" }}>None</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleToggleTopCombine(b)}
                      style={{
                        ...styles.toggleBtn,
                        backgroundColor: b.isTopCombine ? "#10B981" : "#334155",
                      }}
                    >
                      {b.isTopCombine ? "Featured" : "Standard"}
                    </button>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => handleOpenEditModal(b)} style={styles.editBtn}>
                        Edit
                      </button>
                      <button onClick={() => handleDeleteBook(b._id, b.title)} style={styles.deleteBtn}>
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
            <h2 style={styles.modalTitle}>{editingId ? "Edit Top Combine Summary" : "Add New Top Combine Summary"}</h2>
            <form onSubmit={handleSaveBook} style={styles.form}>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Summary Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mastering Money & Financial Freedom"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={styles.modalInput}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Topic / Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Money, Psychology, Productivity"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    style={styles.modalInput}
                  />
                </div>
              </div>

              <div>
                <label style={styles.label}>Estimated Read Time (Minutes)</label>
                <input
                  type="number"
                  value={formData.readingTimeMinutes}
                  onChange={(e) => setFormData({ ...formData, readingTimeMinutes: parseInt(e.target.value, 10) || 10 })}
                  style={styles.modalInput}
                />
              </div>

              {/* Cover Image URL + Cloudflare R2 Upload */}
              <div>
                <label style={styles.label}>Cover Image (URL or Upload to Cloudflare R2)</label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="text"
                    required
                    placeholder="https://... or upload file"
                    value={formData.coverImage}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    style={{ ...styles.modalInput, flex: 1 }}
                  />
                  <label style={styles.uploadFileBtn}>
                    {uploadingImage ? "Uploading..." : "Upload Cover to R2"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadCover}
                      style={{ display: "none" }}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
                {formData.coverImage && (
                  <div style={{ marginTop: "8px" }}>
                    <img
                      src={formData.coverImage}
                      alt="Cover Preview"
                      style={{ width: "60px", height: "85px", borderRadius: "6px", objectFit: "cover" }}
                    />
                  </div>
                )}
              </div>

              {/* Audiobook Audio URL + Cloudflare R2 Upload */}
              <div>
                <label style={styles.label}>Audiobook / Audio Narration (URL or Upload to Cloudflare R2)</label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="https://...mp3 (or upload audio below)"
                    value={formData.audioUrl}
                    onChange={(e) => setFormData({ ...formData, audioUrl: e.target.value })}
                    style={{ ...styles.modalInput, flex: 1 }}
                  />
                  <label style={styles.uploadFileBtn}>
                    {uploadingAudio ? "Uploading..." : "Upload Audio to R2"}
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleUploadAudio}
                      style={{ display: "none" }}
                      disabled={uploadingAudio}
                    />
                  </label>
                </div>
                {formData.audioUrl && (
                  <div style={{ marginTop: "8px" }}>
                    <audio controls src={formData.audioUrl} style={{ width: "100%", height: "36px" }} />
                  </div>
                )}
              </div>

              {/* Short Description */}
              <div>
                <label style={styles.label}>Short Hook Description *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="One or two sentences summarizing this topic distillation..."
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  style={styles.modalTextarea}
                />
              </div>

              {/* Chapters List */}
              <div>
                <label style={styles.label}>Chapters / Modules (One chapter title per line)</label>
                <textarea
                  rows={3}
                  placeholder="1. Mindset & Behavioral Finance&#10;2. Assets vs Liabilities&#10;3. The Compounding Machine"
                  value={formData.chaptersText}
                  onChange={(e) => setFormData({ ...formData, chaptersText: e.target.value })}
                  style={styles.modalTextarea}
                />
              </div>

              {/* Rich Content (HTML or formatted text) */}
              <div>
                <label style={styles.label}>Summary Content (HTML formatted)</label>
                <textarea
                  required
                  rows={8}
                  placeholder="<h2>1. Core Principle</h2><p>Summary paragraph...</p><blockquote>Quote</blockquote>"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  style={{ ...styles.modalTextarea, fontFamily: "monospace", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="isTopCombine"
                  checked={formData.isTopCombine}
                  onChange={(e) => setFormData({ ...formData, isTopCombine: e.target.checked })}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <label htmlFor="isTopCombine" style={{ color: "#F8FAFC", fontSize: "0.9rem", cursor: "pointer" }}>
                  Featured Top Combine Summary
                </label>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.cancelBtn} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" style={styles.primaryBtn} disabled={saving || uploadingImage || uploadingAudio}>
                  {saving ? "Saving Summary..." : editingId ? "Update Summary" : "Create Summary"}
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
  filterBar: {
    marginBottom: "20px",
  },
  searchInput: {
    width: "100%",
    maxWidth: "400px",
    padding: "10px 16px",
    backgroundColor: "#1E293B",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#FFFFFF",
    outline: "none",
    fontSize: "0.9rem",
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
  tdTitle: {
    padding: "14px 18px",
    color: "#CBD5E1",
    verticalAlign: "middle",
  },
  td: {
    padding: "14px 18px",
    color: "#CBD5E1",
    verticalAlign: "middle",
  },
  topicBadge: {
    padding: "4px 10px",
    borderRadius: "20px",
    backgroundColor: "#334155",
    color: "#38BDF8",
    fontSize: "0.75rem",
    fontWeight: 600,
  },
  toggleBtn: {
    padding: "4px 12px",
    borderRadius: "6px",
    border: "none",
    color: "#FFFFFF",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
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
    padding: "20px",
  },
  modalContent: {
    backgroundColor: "#1E293B",
    padding: "26px",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "750px",
    maxHeight: "90vh",
    overflowY: "auto",
    border: "1px solid #334155",
  },
  modalTitle: {
    fontSize: "1.35rem",
    fontWeight: 700,
    color: "#FFFFFF",
    margin: "0 0 18px 0",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  label: {
    display: "block",
    fontSize: "0.82rem",
    color: "#94A3B8",
    marginBottom: "6px",
    fontWeight: 600,
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
  modalTextarea: {
    width: "100%",
    padding: "10px 14px",
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#FFFFFF",
    outline: "none",
    fontSize: "0.9rem",
    boxSizing: "border-box",
    resize: "vertical",
  },
  uploadFileBtn: {
    display: "inline-block",
    padding: "10px 14px",
    backgroundColor: "#0284C7",
    color: "#FFFFFF",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "12px",
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
