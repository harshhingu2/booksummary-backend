"use client";

import React, { useState, useEffect } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

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
  shortDescription?: string;
  content: string;
  pendingContent?: string;
  contentStatus?: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  chapters?: Chapter[];
  isTopCombine: boolean;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  needsContentGeneration?: boolean;
  createdAt: string;
}

export default function AdminBooksPage() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [contentStatusFilter, setContentStatusFilter] = useState("ALL");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal State for Add & Edit
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  // Review Draft Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewBook, setReviewBook] = useState<BookItem | null>(null);
  const [reviewDraftText, setReviewDraftText] = useState("");
  const [reviewTab, setReviewTab] = useState<"pending" | "preview" | "current">("preview");
  const [reviewActionLoading, setReviewActionLoading] = useState(false);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    topic: "Productivity",
    coverImage: "",
    audioUrl: "",
    readingTimeMinutes: 10,
    content: "",
    pendingContent: "",
    contentStatus: "DRAFT" as "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED",
    isTopCombine: true,
    status: "PENDING" as "ACTIVE" | "INACTIVE" | "PENDING",
    needsContentGeneration: false,
  });

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);
      if (contentStatusFilter && contentStatusFilter !== "ALL") params.append("contentStatus", contentStatusFilter);

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
  }, [search, statusFilter, contentStatusFilter]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      title: "",
      topic: "Productivity",
      coverImage: "",
      audioUrl: "",
      readingTimeMinutes: 10,
      content: "",
      pendingContent: "",
      contentStatus: "DRAFT",
      isTopCombine: true,
      status: "PENDING",
      needsContentGeneration: true, // Default to true when adding so cron picks it up
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (b: BookItem) => {
    setEditingId(b._id);
    setFormData({
      title: b.title,
      topic: b.topic || "Productivity",
      coverImage: b.coverImage || "",
      audioUrl: b.audioUrl || "",
      readingTimeMinutes: b.readingTimeMinutes || 10,
      content: b.content || "",
      pendingContent: b.pendingContent || "",
      contentStatus: b.contentStatus || (b.content ? "APPROVED" : "DRAFT"),
      isTopCombine: !!b.isTopCombine,
      status: (b.status || "ACTIVE") as "ACTIVE" | "INACTIVE" | "PENDING",
      needsContentGeneration: !!b.needsContentGeneration,
    });
    setShowModal(true);
  };

  const handleOpenReviewModal = (b: BookItem) => {
    setReviewBook(b);
    setReviewDraftText(b.pendingContent || "");
    setReviewTab(b.pendingContent ? "preview" : "current");
    setReviewModalOpen(true);
  };

  const handleApproveDraft = async (bookId: string, customContent?: string) => {
    const targetContent = customContent !== undefined ? customContent : reviewDraftText;
    try {
      setReviewActionLoading(true);
      const res = await fetch(`/api/admin/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: targetContent,
          contentStatus: "APPROVED",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: "Content approved and published to live summary!", type: "success" });
        setReviewModalOpen(false);
        fetchBooks();
      } else {
        setMessage({ text: data.error || "Failed to approve content", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to approve content", type: "error" });
    } finally {
      setReviewActionLoading(false);
    }
  };

  const handleRejectDraft = async (bookId: string) => {
    try {
      setReviewActionLoading(true);
      const res = await fetch(`/api/admin/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentStatus: "REJECTED",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: "Draft marked as REJECTED.", type: "success" });
        setReviewModalOpen(false);
        fetchBooks();
      } else {
        setMessage({ text: data.error || "Failed to reject draft", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to reject draft", type: "error" });
    } finally {
      setReviewActionLoading(false);
    }
  };

  const handleSaveDraftOnly = async (bookId: string) => {
    try {
      setReviewActionLoading(true);
      const res = await fetch(`/api/admin/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingContent: reviewDraftText,
          contentStatus: "PENDING_REVIEW",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: "Draft changes saved to pendingContent.", type: "success" });
        fetchBooks();
      } else {
        setMessage({ text: data.error || "Failed to save draft changes", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save draft changes", type: "error" });
    } finally {
      setReviewActionLoading(false);
    }
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

      const payload = {
        title: formData.title,
        topic: formData.topic,
        coverImage: formData.coverImage,
        audioUrl: formData.audioUrl,
        readingTimeMinutes: Number(formData.readingTimeMinutes) || 10,
        content: formData.content,
        pendingContent: formData.pendingContent,
        contentStatus: formData.contentStatus || "DRAFT",
        isTopCombine: formData.isTopCombine,
        status: formData.status || "ACTIVE",
        needsContentGeneration: formData.needsContentGeneration,
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

  const handleToggleNeedsContent = async (book: BookItem) => {
    const nextVal = !book.needsContentGeneration;
    try {
      const res = await fetch(`/api/admin/books/${book._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needsContentGeneration: nextVal }),
      });
      const data = await res.json();
      if (data.success) {
        setBooks((prev) => prev.map((b) => (b._id === book._id ? { ...b, needsContentGeneration: nextVal } : b)));
        setMessage({
          text: nextVal ? `"${book.title}" queued for automated Multi-Book Cron AI generation!` : `Removed "${book.title}" from AI Cron queue.`,
          type: "success",
        });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to toggle content generation status", type: "error" });
    }
  };

  const handleStatusChange = async (bookId: string, newStatus: "ACTIVE" | "INACTIVE" | "PENDING") => {
    try {
      const res = await fetch(`/api/admin/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setBooks((prev) => prev.map((b) => (b._id === bookId ? { ...b, status: newStatus } : b)));
        setMessage({ text: `Status updated to ${newStatus}`, type: "success" });
      } else {
        setMessage({ text: data.error || "Failed to update status", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Error updating status", type: "error" });
    }
  };

  const [aiProvider, setAiProvider] = useState<"chatgpt" | "deepseek">("chatgpt");
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // AI Prompt Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedBookForAi, setSelectedBookForAi] = useState<BookItem | null>(null);
  const [modalPromptText, setModalPromptText] = useState("");
  const [modalAiProvider, setModalAiProvider] = useState<"chatgpt" | "deepseek">("chatgpt");
  const [modalHeadless, setModalHeadless] = useState(true);
  const [loadingPrompt, setLoadingPrompt] = useState(false);

  const handleOpenAiModal = async (book: BookItem) => {
    setSelectedBookForAi(book);
    setModalAiProvider(aiProvider);
    setModalHeadless(true); // Always resets to unchecked (headless: true) for each session
    setAiModalOpen(true);
    setLoadingPrompt(true);

    try {
      // Fetch active default multi-book prompt from DB
      const res = await fetch("/api/admin/prompts?type=multibook", { cache: "no-store" });
      const data = await res.json();
      let promptTemplate = "";
      if (data.success && data.prompts && data.prompts.length > 0) {
        const activePrompt = data.prompts.find((p: any) => p.isDefault && p.isActive) || data.prompts[0];
        promptTemplate = activePrompt.content || "";
      }

      const topicVal = book.topic || "General";
      const booksVal = book.title || "";
      const contentTypeVal = "Multi-Book Synthesis";

      if (promptTemplate) {
        let populatedPrompt = promptTemplate
          .replace(/\{\{topic\}\}/gi, topicVal)
          .replace(/\{\{books\}\}/gi, booksVal)
          .replace(/\{\{title\}\}/gi, booksVal)
          .replace(/\{\{contentType\}\}/gi, contentTypeVal)
          .replace(/\{\{author\}\}/gi, "")
          .replace(/\{\{audience\}\}/gi, "US/Western adults")
          .replace(/\{\{targetLength\}\}/gi, "~2,000 words")
          .replace(/\{\{goal\}\}/gi, "[Decided by you]");

        // Ensure Topic and Books are always present at the very top of the prompt
        const topSlice = populatedPrompt.slice(0, 600);
        const hasTopicAtTop = /^\s*(?:>\s*)?\*\*Topic/im.test(topSlice) || topSlice.includes(topicVal);
        const hasBooksAtTop = /^\s*(?:>\s*)?\*\*(?:Books?|Title)/im.test(topSlice) || (booksVal && topSlice.includes(booksVal));

        if (!hasTopicAtTop || !hasBooksAtTop) {
          const headerLines: string[] = [
            `**Topic:** ${topicVal}`,
            `**Books:** ${booksVal}`,
          ];
          if (!/^\s*(?:>\s*)?\*\*Content Type:\*\*/im.test(topSlice)) {
            headerLines.push(`**Content Type:** ${contentTypeVal}`);
          }
          populatedPrompt = headerLines.join("\n\n") + "\n\n" + populatedPrompt.trimStart();
        }

        setModalPromptText(populatedPrompt);
      } else {
        const fallback = `**Topic:** ${topicVal}

**Books:** ${booksVal}

**Content Type:** ${contentTypeVal}

**Audience:** US/Western adults

**Target Length:** ~2,000 words

**Goal:** Synthesize key agreements, contradictions, and complementary models across these seminal works into one coherent intellectual journey.

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
      setModalPromptText(`**Topic:** ${book.topic || "General"}\n\n**Books:** ${book.title}\n\n**Content Type:** Multi-Book Synthesis\n\nGenerate full high-impact summary content formatted in clean semantic HTML.`);
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
          type: "topcombine",
          title: book.title,
          topic: book.topic || "Productivity",
          provider: modalAiProvider,
          customPrompt: modalPromptText,
          headless: modalHeadless,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ text: `AI content generated via ${providerLabel} and saved to pendingContent (awaiting review) for "${book.title}"!`, type: "success" });
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

  const handlePromptDelete = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/books/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `"${deleteTarget.title}" deleted successfully`, type: "success" });
        setDeleteTarget(null);
        fetchBooks();
      } else {
        setMessage({ text: data.error || "Failed to delete summary", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Error deleting summary", type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Top Combine Summaries Library</h1>
          <p style={styles.subtitle}>
            Manage combined topic summaries, pending AI drafts & review workflow, and Cloudflare R2 covers & audiobooks
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ color: "#94A3B8", fontSize: "0.85rem", fontWeight: 600 }}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
              <option value="ALL">All Publication Statuses</option>
              <option value="ACTIVE">🟢 Active</option>
              <option value="PENDING">🟡 Pending</option>
              <option value="INACTIVE">🔴 Inactive</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ color: "#94A3B8", fontSize: "0.85rem", fontWeight: 600 }}>AI Content Review:</label>
            <select
              value={contentStatusFilter}
              onChange={(e) => setContentStatusFilter(e.target.value)}
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
              <option value="ALL">All Content Statuses</option>
              <option value="PENDING_REVIEW">🟡 Pending Review</option>
              <option value="APPROVED">🟢 Approved</option>
              <option value="REJECTED">🔴 Rejected</option>
              <option value="DRAFT">⚪ Draft</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
                <th style={styles.th}>Pub Status</th>
                <th style={styles.th}>AI Content Status</th>
                <th style={styles.th}>AI Cron Queue</th>
                <th style={styles.th}>Top Combine</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => {
                const bookStatus = b.status || "ACTIVE";
                const contentStatus = b.contentStatus || (b.content ? "APPROVED" : "DRAFT");
                const isQueued = !!b.needsContentGeneration;
                const hasPending = !!(b.pendingContent && b.pendingContent.trim().length > 0);
                const hasLiveContent = !!(b.content && b.content.trim().length > 50);

                return (
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
                          {hasPending && (
                            <span style={{ fontSize: "0.72rem", color: "#F59E0B", fontWeight: 600 }}>
                              ⚡ AI Draft Available ({b.pendingContent!.length} chars)
                            </span>
                          )}
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
                      <select
                        value={bookStatus}
                        onChange={(e) => handleStatusChange(b._id, e.target.value as "ACTIVE" | "INACTIVE" | "PENDING")}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          outline: "none",
                          border: "1px solid",
                          backgroundColor:
                            bookStatus === "ACTIVE"
                              ? "rgba(16, 185, 129, 0.15)"
                              : bookStatus === "PENDING"
                              ? "rgba(245, 158, 11, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
                          borderColor:
                            bookStatus === "ACTIVE"
                              ? "rgba(16, 185, 129, 0.4)"
                              : bookStatus === "PENDING"
                              ? "rgba(245, 158, 11, 0.4)"
                              : "rgba(239, 68, 68, 0.4)",
                          color:
                            bookStatus === "ACTIVE"
                              ? "#34D399"
                              : bookStatus === "PENDING"
                              ? "#FBBF24"
                              : "#F87171",
                        }}
                      >
                        <option value="ACTIVE" style={{ backgroundColor: "#1E293B", color: "#34D399" }}>ACTIVE</option>
                        <option value="PENDING" style={{ backgroundColor: "#1E293B", color: "#FBBF24" }}>PENDING</option>
                        <option value="INACTIVE" style={{ backgroundColor: "#1E293B", color: "#F87171" }}>INACTIVE</option>
                      </select>
                    </td>

                    {/* Content Status & Quick Review Trigger */}
                    <td style={styles.td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            width: "fit-content",
                            backgroundColor:
                              contentStatus === "PENDING_REVIEW"
                                ? "rgba(245, 158, 11, 0.2)"
                                : contentStatus === "APPROVED"
                                ? "rgba(16, 185, 129, 0.2)"
                                : contentStatus === "REJECTED"
                                ? "rgba(239, 68, 68, 0.2)"
                                : "rgba(148, 163, 184, 0.15)",
                            color:
                              contentStatus === "PENDING_REVIEW"
                                ? "#FBBF24"
                                : contentStatus === "APPROVED"
                                ? "#34D399"
                                : contentStatus === "REJECTED"
                                ? "#F87171"
                                : "#94A3B8",
                            border:
                              contentStatus === "PENDING_REVIEW"
                                ? "1px solid rgba(245, 158, 11, 0.4)"
                                : contentStatus === "APPROVED"
                                ? "1px solid rgba(16, 185, 129, 0.4)"
                                : contentStatus === "REJECTED"
                                ? "1px solid rgba(239, 68, 68, 0.4)"
                                : "1px solid rgba(148, 163, 184, 0.2)",
                          }}
                        >
                          {contentStatus === "PENDING_REVIEW"
                            ? "🟡 Pending Review"
                            : contentStatus === "APPROVED"
                            ? "🟢 Approved"
                            : contentStatus === "REJECTED"
                            ? "🔴 Rejected"
                            : "⚪ Draft"}
                        </span>
                        {hasPending && (
                          <button
                            onClick={() => handleOpenReviewModal(b)}
                            style={{
                              padding: "2px 6px",
                              backgroundColor: "#D97706",
                              color: "#FFFFFF",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              width: "fit-content",
                            }}
                          >
                            👁️ Review AI Draft
                          </button>
                        )}
                      </div>
                    </td>

                    <td style={styles.td}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "4px 8px", backgroundColor: isQueued ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.03)", borderRadius: "6px", border: isQueued ? "1px solid #6366F1" : "1px solid rgba(255,255,255,0.1)" }}>
                        <input
                          type="checkbox"
                          checked={isQueued}
                          onChange={() => handleToggleNeedsContent(b)}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: isQueued ? "#A5B4FC" : "#94A3B8" }}>
                          {isQueued ? "⚡ Auto-Cron" : hasLiveContent ? "✅ Ready" : "⬜ Empty"}
                        </span>
                      </label>
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
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <button
                          onClick={() => handleOpenAiModal(b)}
                          disabled={generatingId === b._id}
                          style={{
                            ...styles.aiBtn,
                            opacity: generatingId === b._id ? 0.6 : 1,
                            cursor: generatingId === b._id ? "wait" : "pointer",
                          }}
                          title={`Configure prompt and generate summary using ${aiProvider === "deepseek" ? "DeepSeek" : "ChatGPT"}`}
                        >
                          {generatingId === b._id ? "⚡ Generating..." : "⚡ AI Content"}
                        </button>
                        <button onClick={() => handleOpenEditModal(b)} style={styles.editBtn}>
                          Edit
                        </button>
                        <button onClick={() => handlePromptDelete(b._id, b.title)} style={styles.deleteBtn}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Review AI Draft Modal */}
      {reviewModalOpen && reviewBook && (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modalContent, maxWidth: "920px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #334155", paddingBottom: "12px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h2 style={{ ...styles.modalTitle, margin: 0, fontSize: "1.25rem" }}>
                    🔍 Review AI Generated Content
                  </h2>
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      backgroundColor:
                        reviewBook.contentStatus === "APPROVED"
                          ? "rgba(16, 185, 129, 0.2)"
                          : reviewBook.contentStatus === "REJECTED"
                          ? "rgba(239, 68, 68, 0.2)"
                          : "rgba(245, 158, 11, 0.2)",
                      color:
                        reviewBook.contentStatus === "APPROVED"
                          ? "#34D399"
                          : reviewBook.contentStatus === "REJECTED"
                          ? "#F87171"
                          : "#FBBF24",
                    }}
                  >
                    Status: {reviewBook.contentStatus || "PENDING_REVIEW"}
                  </span>
                </div>
                <p style={{ color: "#94A3B8", fontSize: "0.85rem", margin: "4px 0 0 0" }}>
                  Book: <strong style={{ color: "#F8FAFC" }}>{reviewBook.title}</strong> ({reviewBook.topic})
                </p>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#94A3B8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #334155", paddingBottom: "10px", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={() => setReviewTab("preview")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  backgroundColor: reviewTab === "preview" ? "#3B82F6" : "#1E293B",
                  color: "#FFFFFF",
                }}
              >
                🌐 Rendered HTML Preview
              </button>
              <button
                type="button"
                onClick={() => setReviewTab("pending")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  backgroundColor: reviewTab === "pending" ? "#3B82F6" : "#1E293B",
                  color: "#FFFFFF",
                }}
              >
                📝 Edit AI Draft (Raw HTML)
              </button>
              <button
                type="button"
                onClick={() => setReviewTab("current")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  backgroundColor: reviewTab === "current" ? "#3B82F6" : "#1E293B",
                  color: "#FFFFFF",
                }}
              >
                📄 Current Production Content
              </button>
            </div>

            {/* Tab 1: Rendered HTML Preview */}
            {reviewTab === "preview" && (
              <div>
                <div style={{ marginBottom: "8px", color: "#94A3B8", fontSize: "0.8rem" }}>
                  Below is the visual live preview of the pending AI-generated HTML content:
                </div>
                {reviewDraftText ? (
                  <div
                    style={{
                      maxHeight: "450px",
                      overflowY: "auto",
                      backgroundColor: "#0F172A",
                      padding: "20px",
                      borderRadius: "8px",
                      border: "1px solid #334155",
                      color: "#E2E8F0",
                      lineHeight: "1.6",
                    }}
                    dangerouslySetInnerHTML={{ __html: reviewDraftText }}
                  />
                ) : (
                  <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8", backgroundColor: "#0F172A", borderRadius: "8px" }}>
                    No pending AI draft found for this book summary.
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Raw HTML Editor */}
            {reviewTab === "pending" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={styles.label}>Pending AI Draft (Editable Raw HTML):</label>
                  <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>{reviewDraftText.length} characters</span>
                </div>
                <textarea
                  rows={16}
                  value={reviewDraftText}
                  onChange={(e) => setReviewDraftText(e.target.value)}
                  style={{
                    ...styles.modalTextarea,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: "0.85rem",
                    backgroundColor: "#0B1120",
                  }}
                />
              </div>
            )}

            {/* Tab 3: Current Live Content */}
            {reviewTab === "current" && (
              <div>
                <div style={{ marginBottom: "8px", color: "#94A3B8", fontSize: "0.8rem" }}>
                  Current Live/Production Content:
                </div>
                {reviewBook.content ? (
                  <div
                    style={{
                      maxHeight: "450px",
                      overflowY: "auto",
                      backgroundColor: "#0F172A",
                      padding: "20px",
                      borderRadius: "8px",
                      border: "1px solid #334155",
                      color: "#E2E8F0",
                      lineHeight: "1.6",
                    }}
                    dangerouslySetInnerHTML={{ __html: reviewBook.content }}
                  />
                ) : (
                  <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8", backgroundColor: "#0F172A", borderRadius: "8px" }}>
                    No live production content currently saved.
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ ...styles.modalActions, marginTop: "20px", borderTop: "1px solid #334155", paddingTop: "14px" }}>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                style={styles.cancelBtn}
                disabled={reviewActionLoading}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleSaveDraftOnly(reviewBook._id)}
                disabled={reviewActionLoading || !reviewDraftText}
                style={{
                  ...styles.cancelBtn,
                  backgroundColor: "#334155",
                  color: "#F8FAFC",
                  fontWeight: 600,
                }}
              >
                💾 Save Draft Edits
              </button>
              <button
                type="button"
                onClick={() => handleRejectDraft(reviewBook._id)}
                disabled={reviewActionLoading}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#EF4444",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ❌ Reject Draft
              </button>
              <button
                type="button"
                onClick={() => handleApproveDraft(reviewBook._id, reviewDraftText)}
                disabled={reviewActionLoading || !reviewDraftText}
                style={{
                  ...styles.primaryBtn,
                  backgroundColor: "#10B981",
                  padding: "10px 20px",
                  fontWeight: 700,
                }}
              >
                {reviewActionLoading ? "Processing..." : "✅ Approve & Publish to Live Content"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  Review variables and prompt instructions before launching the scraper. Output will be saved to <strong>pendingContent</strong>.
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
                <span style={{ color: "#64748B" }}>Books / Title:</span> <strong style={{ color: "#F8FAFC" }}>{selectedBookForAi.title}</strong>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#94A3B8" }}>
                <span style={{ color: "#64748B" }}>Content Type:</span> <strong style={{ color: "#38BDF8" }}>Multi-Book Synthesis</strong>
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
                ⚡ Start {modalAiProvider === "deepseek" ? "DeepSeek" : "ChatGPT"} & Save to Pending
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalContent}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ ...styles.modalTitle, margin: 0 }}>{editingId ? "Edit Top Combine Summary" : "Add New Top Combine Summary"}</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94A3B8",
                  fontSize: "1.3rem",
                  cursor: "pointer",
                  padding: "4px 8px",
                  lineHeight: 1,
                  borderRadius: "4px",
                }}
                title="Close"
              >
                ✕
              </button>
            </div>
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

              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Estimated Read Time (Minutes)</label>
                  <input
                    type="number"
                    value={formData.readingTimeMinutes}
                    onChange={(e) => setFormData({ ...formData, readingTimeMinutes: parseInt(e.target.value, 10) || 10 })}
                    style={styles.modalInput}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>AI Content Status</label>
                  <select
                    value={formData.contentStatus}
                    onChange={(e) => setFormData({ ...formData, contentStatus: e.target.value as any })}
                    style={styles.modalInput}
                  >
                    <option value="DRAFT">⚪ DRAFT (Not reviewed)</option>
                    <option value="PENDING_REVIEW">🟡 PENDING_REVIEW (AI Draft Ready)</option>
                    <option value="APPROVED">🟢 APPROVED (Published to live)</option>
                    <option value="REJECTED">🔴 REJECTED</option>
                  </select>
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

              {/* Pending AI Generated Content Box (if exists) */}
              {formData.pendingContent && (
                <div style={{ padding: "14px", backgroundColor: "#172554", borderRadius: "8px", border: "1px solid #1D4ED8" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ color: "#93C5FD", fontSize: "0.85rem", fontWeight: 700 }}>
                      ⚡ Pending AI Generated Content (Awaiting Approval)
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          content: prev.pendingContent,
                          contentStatus: "APPROVED",
                        }))
                      }
                      style={{
                        padding: "4px 10px",
                        backgroundColor: "#10B981",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      📋 Copy Pending to Live Content & Set Approved
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={formData.pendingContent}
                    onChange={(e) => setFormData({ ...formData, pendingContent: e.target.value })}
                    style={{ ...styles.modalTextarea, fontFamily: "monospace", fontSize: "0.82rem", backgroundColor: "#0F172A" }}
                  />
                </div>
              )}

              {/* Live Rich Content (HTML or formatted text) */}
              <div>
                <label style={styles.label}>Live Production Content (HTML formatted — Served to Users)</label>
                <textarea
                  rows={8}
                  placeholder="<h2>1. Core Principle</h2><p>Summary paragraph...</p><blockquote>Quote</blockquote>"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  style={{ ...styles.modalTextarea, fontFamily: "monospace", fontSize: "0.85rem" }}
                />
              </div>

              {/* Queue for AI Cron Checkbox */}
              <div style={{ padding: "12px 14px", backgroundColor: "#0F172A", borderRadius: "8px", border: "1px solid #334155" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.needsContentGeneration}
                    onChange={(e) => setFormData({ ...formData, needsContentGeneration: e.target.checked })}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <div>
                    <div style={{ color: "#F8FAFC", fontSize: "0.9rem", fontWeight: 600 }}>
                      ⚡ Queue for Automated AI Content Generation (Cron Job)
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: "0.78rem" }}>
                      When checked, the Multi-Book AI cron scraper will generate content into <strong>pendingContent</strong> for your review.
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "center" }}>
                <div>
                  <label style={styles.label}>Publication Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as "ACTIVE" | "INACTIVE" | "PENDING" })}
                    style={styles.modalInput}
                  >
                    <option value="ACTIVE">🟢 ACTIVE (Live / Published)</option>
                    <option value="PENDING">🟡 PENDING (Draft / In Review)</option>
                    <option value="INACTIVE">🔴 INACTIVE (Hidden)</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "20px" }}>
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

      {/* Confirm Delete Alert Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.title}
        title="Delete Top Combine Summary"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
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
