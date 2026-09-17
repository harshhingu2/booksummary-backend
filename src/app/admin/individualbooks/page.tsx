"use client";

import React, { useState, useEffect } from "react";

interface Chapter {
  chapterNumber: number;
  title: string;
}

interface IndividualBookItem {
  _id: string;
  title: string;
  author?: string;
  topic: string;
  coverImage: string;
  audioUrl?: string;
  readingTimeMinutes: number;
  shortDescription?: string;
  content: string;
  chapters?: Chapter[];
  isFeatured?: boolean;
  createdAt: string;
}

export default function AdminIndividualBooksPage() {
  const [books, setBooks] = useState<IndividualBookItem[]>([]);
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
    author: "",
    topic: "Productivity",
    coverImage: "",
    audioUrl: "",
    readingTimeMinutes: 12,
    content: "",
    isFeatured: false, // Newline-separated list of chapter titles
  });

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);

      const res = await fetch(`/api/admin/individualbooks?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setBooks(data.books);
      }
    } catch (err) {
      console.error("Error fetching individual books:", err);
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
      author: "",
      topic: "Productivity",
      coverImage: "",
      audioUrl: "",
      readingTimeMinutes: 12,
      content: "",
    isFeatured: false,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (book: IndividualBookItem) => {
    setEditingId(book._id);
        setFormData({
      title: book.title,
      author: book.author || "",
      topic: book.topic || "Productivity",
      coverImage: book.coverImage || "",
      audioUrl: book.audioUrl || "",
      readingTimeMinutes: book.readingTimeMinutes || 12,
      content: book.content || "",
      isFeatured: !!book.isFeatured,
    });
    setShowModal(true);
  };

  // Upload Cover Image directly to Cloudflare R2
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

  // Upload Audiobook / Audio Narration directly to Cloudflare R2
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

      const payload = {
        title: formData.title,
        author: formData.author,
        topic: formData.topic,
        coverImage: formData.coverImage,
        audioUrl: formData.audioUrl,
        readingTimeMinutes: Number(formData.readingTimeMinutes) || 10,
        content: formData.content,
        isFeatured: formData.isFeatured,
      };

      const url = editingId ? `/api/admin/individualbooks/${editingId}` : "/api/admin/individualbooks";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          text: editingId ? "Book updated successfully!" : "Book created successfully!",
          type: "success",
        });
        setShowModal(false);
        fetchBooks();
      } else {
        setMessage({ text: data.error || "Failed to save book", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save book", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const [aiProvider, setAiProvider] = useState<"chatgpt" | "deepseek">("chatgpt");
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // AI Prompt Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedBookForAi, setSelectedBookForAi] = useState<IndividualBookItem | null>(null);
  const [modalPromptText, setModalPromptText] = useState("");
  const [modalAiProvider, setModalAiProvider] = useState<"chatgpt" | "deepseek">("chatgpt");
  const [modalHeadless, setModalHeadless] = useState(true);
  const [loadingPrompt, setLoadingPrompt] = useState(false);

  const handleOpenAiModal = async (book: IndividualBookItem) => {
    setSelectedBookForAi(book);
    setModalAiProvider(aiProvider);
    setModalHeadless(true); // Always resets to unchecked (headless: true) for each session
    setAiModalOpen(true);
    setLoadingPrompt(true);

    try {
      // Fetch active default individual prompt from DB
      const res = await fetch("/api/admin/prompts?type=individual", { cache: "no-store" });
      const data = await res.json();
      let promptTemplate = "";
      if (data.success && data.prompts && data.prompts.length > 0) {
        const activePrompt = data.prompts.find((p: any) => p.isDefault && p.isActive) || data.prompts[0];
        promptTemplate = activePrompt.content || "";
      }

      const topicVal = book.topic || "General";
      const titleVal = book.title || "";
      const authorVal = book.author || "Unknown";
      const contentTypeVal = "Single Book Summary";

      if (promptTemplate) {
        // Substitute only 2 main variables: topic/title (with author if present) and contentType
        let populatedPrompt = promptTemplate
          .replace(/\{\{topic\}\}/gi, topicVal)
          .replace(/\{\{title\}\}/gi, titleVal)
          .replace(/\{\{books\}\}/gi, titleVal)
          .replace(/\{\{author\}\}/gi, authorVal)
          .replace(/\{\{contentType\}\}/gi, contentTypeVal)
          .replace(/\{\{audience\}\}/gi, "US/Western adults")
          .replace(/\{\{targetLength\}\}/gi, "~1,500 words")
          .replace(/\{\{goal\}\}/gi, "[Decided by you]");

        // If the prompt template in DB didn't contain {{topic}} or {{title}}, ensure the 2-variable header is at the top
        if (!promptTemplate.includes("{{topic}}") && !promptTemplate.includes("{{title}}") && !promptTemplate.includes("{{books}}")) {
          const authorSuffix = authorVal ? ` (by ${authorVal})` : "";
          const varHeader = `> **Topic / Title:** ${topicVal} — ${titleVal}${authorSuffix}\n> **Content Type:** ${contentTypeVal}\n\n`;
          populatedPrompt = varHeader + populatedPrompt;
        }

        setModalPromptText(populatedPrompt);
      } else {
        // Fallback with only 2 variables at top
        const authorSuffix = authorVal ? ` (by ${authorVal})` : "";
        const fallback = `> **Topic / Title:** ${topicVal} — ${titleVal}${authorSuffix}
> **Content Type:** ${contentTypeVal}

# DUMBSCROLL — MASTER CONTENT GENERATION PROMPT

You are the lead content writer and intellectual editor for **Dumbscroll**, a premium knowledge and book-summary platform.

Your task is NOT to create an ordinary book summary.

Transform the strongest ideas from the provided books into a **deeply engaging, story-driven, highly readable and highly listenable intellectual experience** that makes the reader think:

> **“I never looked at this idea that way before.”**

Please format your response strictly in clean HTML tags (using <h2>, <h3>, <p>, <ul>, <li>, <blockquote>, and <br> without wrapping inside <html> or <body> tags).`;
        setModalPromptText(fallback);
      }
    } catch (err) {
      console.error("Failed to load prompt template:", err);
      const authorSuffix = book.author ? ` (by ${book.author})` : "";
      setModalPromptText(`> **Topic / Title:** ${book.topic || "General"} — ${book.title}${authorSuffix}\n> **Content Type:** Single Book Summary\n\nGenerate full high-impact summary content formatted in clean semantic HTML.`);
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleExecuteAiScraper = async () => {
    if (!selectedBookForAi) return;
    const book = selectedBookForAi;
    const providerLabel = modalAiProvider === "deepseek" ? "DeepSeek" : "ChatGPT";

    try {
      setGeneratingId(book._id);
      setAiModalOpen(false);
      setMessage({ text: `Generating AI content with ${providerLabel} for "${book.title}"... Please wait.`, type: "success" });

      const res = await fetch("/api/admin/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: book._id,
          type: "individual",
          title: book.title,
          author: book.author || "",
          topic: book.topic || "Productivity",
          provider: modalAiProvider,
          customPrompt: modalPromptText,
          headless: modalHeadless,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ text: `AI content generated via ${providerLabel} and saved to DB for "${book.title}"!`, type: "success" });
        fetchBooks();
      } else {
        setMessage({ text: data.error || "Failed to generate AI content", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to generate AI content", type: "error" });
    } finally {
      setGeneratingId(null);
    }
  };

  const handleToggleFeatured = async (book: IndividualBookItem) => {
    try {
      const res = await fetch(`/api/admin/individualbooks/${book._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !book.isFeatured }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBooks();
      }
    } catch (err) {
      console.error("Error toggling featured status:", err);
    }
  };

  const handleDeleteBook = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete '${title}'?`)) return;
    try {
      const res = await fetch(`/api/admin/individualbooks/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: "Book deleted successfully", type: "success" });
        fetchBooks();
      }
    } catch (err) {
      console.error("Error deleting individual book:", err);
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Individual Books Library</h1>
          <p style={styles.subtitle}>
            Manage specific book summaries, HTML content, chapters, and Cloudflare R2 covers & audiobooks
          </p>
        </div>
        <button onClick={handleOpenAddModal} style={styles.primaryBtn}>
          + Add New Book
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
          placeholder="Search by title, author, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ color: "#94A3B8", fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap" }}>
            AI Scraper:
          </label>
          <select
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value as "chatgpt" | "deepseek")}
            style={{
              padding: "8px 12px",
              backgroundColor: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "6px",
              color: "#F8FAFC",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="chatgpt">🤖 ChatGPT (chatgpt.com)</option>
            <option value="deepseek">🐋 DeepSeek (chat.deepseek.com)</option>
          </select>
        </div>
      </div>

      <div style={styles.tableContainer}>
        {loading ? (
          <p style={{ padding: "24px", color: "#94A3B8" }}>Loading books library...</p>
        ) : books.length === 0 ? (
          <div style={styles.emptyState}>No individual books found. Add one above!</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Book Title & Author</th>
                <th style={styles.th}>Topic</th>
                <th style={styles.th}>Read Time</th>
                <th style={styles.th}>Audiobook</th>
                <th style={styles.th}>Featured</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book._id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          style={{ width: "42px", height: "58px", borderRadius: "6px", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ width: "42px", height: "58px", borderRadius: "6px", backgroundColor: "#334155" }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: "#FFFFFF" }}>{book.title}</div>
                        {book.author && <div style={{ fontSize: "0.8rem", color: "#94A3B8" }}>by {book.author}</div>}
                        
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.badge}>{book.topic}</span>
                  </td>
                  <td style={styles.td}>{book.readingTimeMinutes} mins</td>
                  <td style={styles.td}>
                    {book.audioUrl ? (
                      <a
                        href={book.audioUrl}
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
                      onClick={() => handleToggleFeatured(book)}
                      style={{
                        ...styles.toggleBtn,
                        backgroundColor: book.isFeatured ? "#10B981" : "#334155",
                      }}
                    >
                      {book.isFeatured ? "Featured" : "Standard"}
                    </button>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        onClick={() => handleOpenAiModal(book)}
                        disabled={generatingId === book._id}
                        style={{
                          ...styles.aiBtn,
                          opacity: generatingId === book._id ? 0.6 : 1,
                          cursor: generatingId === book._id ? "wait" : "pointer",
                        }}
                        title={`Configure prompt and generate summary using ${aiProvider === "deepseek" ? "DeepSeek" : "ChatGPT"}`}
                      >
                        {generatingId === book._id ? "⚡ Generating..." : "⚡ AI Content"}
                      </button>
                      <button onClick={() => handleOpenEditModal(book)} style={styles.editBtn}>
                        Edit
                      </button>
                      <button onClick={() => handleDeleteBook(book._id, book.title)} style={styles.deleteBtn}>
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

      {/* AI Prompt Configuration & Scraper Modal */}
      {aiModalOpen && selectedBookForAi && (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modalContent, maxWidth: "880px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #334155", paddingBottom: "12px" }}>
              <div>
                <h2 style={{ ...styles.modalTitle, margin: 0, fontSize: "1.25rem" }}>
                  ⚡ AI Content Generator — {selectedBookForAi.title}
                </h2>
                <p style={{ color: "#94A3B8", fontSize: "0.82rem", margin: "4px 0 0 0" }}>
                  Review variables and prompt instructions before launching the headless scraper.
                </p>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#94A3B8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Variable summary badge strip */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px", padding: "12px 14px", backgroundColor: "#0F172A", borderRadius: "8px", border: "1px solid #334155" }}>
              <div style={{ fontSize: "0.8rem", color: "#94A3B8" }}>
                <span style={{ color: "#64748B" }}>Topic:</span> <strong style={{ color: "#F8FAFC" }}>{selectedBookForAi.topic || "Productivity"}</strong>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#94A3B8" }}>
                <span style={{ color: "#64748B" }}>Book:</span> <strong style={{ color: "#F8FAFC" }}>{selectedBookForAi.title}</strong>
              </div>
              {selectedBookForAi.author && (
                <div style={{ fontSize: "0.8rem", color: "#94A3B8" }}>
                  <span style={{ color: "#64748B" }}>Author:</span> <strong style={{ color: "#F8FAFC" }}>{selectedBookForAi.author}</strong>
                </div>
              )}
              <div style={{ fontSize: "0.8rem", color: "#94A3B8" }}>
                <span style={{ color: "#64748B" }}>Content Type:</span> <strong style={{ color: "#38BDF8" }}>Single Book Summary</strong>
              </div>
            </div>

            {/* Provider Selector & Browser Visibility Toggle */}
            <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <label style={{ ...styles.label, margin: 0 }}>Scraper Engine:</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setModalAiProvider("chatgpt")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      backgroundColor: modalAiProvider === "chatgpt" ? "#10A37F" : "#1E293B",
                      color: "#FFFFFF",
                      border: modalAiProvider === "chatgpt" ? "1px solid #10A37F" : "1px solid #334155",
                    }}
                  >
                    🟢 ChatGPT Scraper
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalAiProvider("deepseek")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      backgroundColor: modalAiProvider === "deepseek" ? "#4F46E5" : "#1E293B",
                      color: "#FFFFFF",
                      border: modalAiProvider === "deepseek" ? "1px solid #4F46E5" : "1px solid #334155",
                    }}
                  >
                    🔵 DeepSeek Scraper
                  </button>
                </div>
              </div>

              {/* Headless / Visible Browser Toggle */}
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.82rem", color: "#CBD5E1", backgroundColor: "#0F172A", padding: "6px 10px", borderRadius: "6px", border: "1px solid #334155" }}>
                <input
                  type="checkbox"
                  checked={!modalHeadless}
                  onChange={(e) => setModalHeadless(!e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                <span>🖥️ <strong>Show Live Browser Window</strong> (Headful)</span>
              </label>
            </div>

            {/* Prompt Textarea */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={styles.label}>
                  Prompt to Send to Scraper (Variables at Top + Collection Prompt Body):
                </label>
                {loadingPrompt && <span style={{ fontSize: "0.75rem", color: "#38BDF8" }}>Loading prompt template...</span>}
              </div>
              <textarea
                rows={14}
                value={modalPromptText}
                onChange={(e) => setModalPromptText(e.target.value)}
                disabled={loadingPrompt}
                style={{
                  ...styles.modalTextarea,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: "0.84rem",
                  lineHeight: "1.45",
                  backgroundColor: "#0B1120",
                  border: "1px solid #3b82f6",
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ ...styles.modalActions, marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAiScraper}
                disabled={loadingPrompt || !modalPromptText.trim()}
                style={{
                  ...styles.primaryBtn,
                  backgroundColor: modalAiProvider === "deepseek" ? "#4F46E5" : "#10A37F",
                  padding: "10px 22px",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                }}
              >
                ⚡ Start {modalAiProvider === "deepseek" ? "DeepSeek" : "ChatGPT"} & Generate Content
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>{editingId ? "Edit Individual Book" : "Add New Individual Book"}</h2>
            <form onSubmit={handleSaveBook} style={styles.form}>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Book Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Atomic Habits"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={styles.modalInput}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Author</label>
                  <input
                    type="text"
                    placeholder="e.g. James Clear"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    style={styles.modalInput}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Topic / Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Productivity, Mindset, Money, Philosophy"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    style={styles.modalInput}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Estimated Read Time (Minutes)</label>
                  <input
                    type="number"
                    value={formData.readingTimeMinutes}
                    onChange={(e) => setFormData({ ...formData, readingTimeMinutes: parseInt(e.target.value, 10) || 10 })}
                    style={styles.modalInput}
                  />
                </div>
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

              {/* Rich Content (HTML or formatted text) */}
              <div>
                <label style={styles.label}>Book Summary Content (HTML formatted)</label>
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
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <label htmlFor="isFeatured" style={{ color: "#F8FAFC", fontSize: "0.9rem", cursor: "pointer" }}>
                  Feature this book in Hero / Spotlight showcase
                </label>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.cancelBtn} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" style={styles.primaryBtn} disabled={saving || uploadingImage || uploadingAudio}>
                  {saving ? "Saving Book..." : editingId ? "Update Book" : "Create Book"}
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
  td: {
    padding: "14px 18px",
    color: "#CBD5E1",
    verticalAlign: "middle",
  },
  badge: {
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
  aiBtn: {
    padding: "6px 12px",
    backgroundColor: "#6366F1",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "4px",
    whiteSpace: "nowrap" as const,
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
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#EF4444",
    color: "#FFFFFF",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
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
