"use client";

import React, { useState, useEffect } from "react";

interface ShortItem {
  _id: string;
  videoId: string;
  channelName: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  category: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export default function AdminShortsModerationPage() {
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState("Random");

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Add Short Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrlOrId, setNewUrlOrId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newCategory, setNewCategory] = useState("Science");
  const [newStatus, setNewStatus] = useState<"approved" | "pending">("approved");
  const [isAdding, setIsAdding] = useState(false);

  const fetchShortsAndCategories = async () => {
    try {
      setLoading(true);
      const [shortsRes, catRes] = await Promise.all([
        fetch(`/api/admin/youtube/shorts?status=${activeTab}`, { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);

      const shortsData = await shortsRes.json();
      const catData = await catRes.json();

      if (shortsData.success) {
        setShorts(shortsData.shorts);
        setSelectedIds([]); // Reset bulk selections on tab change
      }
      if (catData.success && catData.categories) {
        const names = catData.categories.map((c: any) => c.name);
        setCategories(names);
        if (names.length > 0) {
          setBulkCategory(names[0]);
          if (!names.includes(newCategory)) setNewCategory(names[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch shorts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddShort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrlOrId) return;

    try {
      setIsAdding(true);
      setMessage(null);

      const res = await fetch("/api/admin/youtube/shorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urlOrId: newUrlOrId,
          title: newTitle || undefined,
          channelName: newChannelName || undefined,
          category: newCategory,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: "success" });
        setNewUrlOrId("");
        setNewTitle("");
        setNewChannelName("");
        setShowAddForm(false);
        fetchShortsAndCategories();
      } else {
        setMessage({ text: data.error || "Failed to add short video", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Request failed", type: "error" });
    } finally {
      setIsAdding(false);
    }
  };

  useEffect(() => {
    fetchShortsAndCategories();
  }, [activeTab]);

  // Filtered Shorts
  const filteredShorts = shorts.filter((item) => {
    const matchesCategory =
      selectedCategoryFilter === "ALL" || item.category === selectedCategoryFilter;
    const matchesSearch =
      searchQuery === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.channelName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Checkbox handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredShorts.map((s) => s._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk API Action
  const handleBulkAction = async (
    action: "approve" | "reject" | "pending" | "delete" | "change_category",
    targetCategory?: string
  ) => {
    if (selectedIds.length === 0) return;

    const count = selectedIds.length;
    let confirmMsg = "";

    if (action === "approve") {
      confirmMsg = `Are you sure you want to APPROVE ${count} selected short(s)?`;
    } else if (action === "reject") {
      confirmMsg = `Are you sure you want to REJECT ${count} selected short(s)?`;
    } else if (action === "pending") {
      confirmMsg = `Are you sure you want to set status to PENDING for ${count} selected short(s)?`;
    } else if (action === "delete") {
      confirmMsg = `Are you sure you want to DELETE ${count} selected short(s)? This action cannot be undone.`;
    } else if (action === "change_category") {
      const catName = targetCategory || bulkCategory;
      confirmMsg = `Are you sure you want to set the category of ${count} selected short(s) to '${catName}'?`;
    }

    if (!confirm(confirmMsg)) return;

    try {
      setMessage(null);
      const res = await fetch("/api/admin/youtube/shorts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds,
          action,
          category: targetCategory || bulkCategory,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: "success" });
        setSelectedIds([]);
        fetchShortsAndCategories();
      } else {
        setMessage({ text: data.error || "Bulk operation failed", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Request failed", type: "error" });
    }
  };

  // Single Actions
  const handleSingleAction = async (id: string, newStatus: "approved" | "rejected" | "pending") => {
    try {
      const res = await fetch(`/api/admin/youtube/shorts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) fetchShortsAndCategories();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleChangeCategory = async (id: string, newCategory: string) => {
    try {
      const res = await fetch(`/api/admin/youtube/shorts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory }),
      });
      const data = await res.json();
      if (data.success) fetchShortsAndCategories();
    } catch (err) {
      console.error("Failed to update category:", err);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this short?")) return;
    try {
      const res = await fetch(`/api/admin/youtube/shorts/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) fetchShortsAndCategories();
    } catch (err) {
      console.error("Failed to delete short:", err);
    }
  };

  const isAllSelected =
    filteredShorts.length > 0 && selectedIds.length === filteredShorts.length;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Shorts Moderation</h1>
          <p style={styles.subtitle}>Review discovered YouTube Shorts, approve for feed, or reclassify categories</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={styles.toggleAddButton}
        >
          {showAddForm ? "❌ Close Form" : "➕ Add Short Video"}
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

      {/* Add Short Form */}
      {showAddForm && (
        <section style={styles.addFormCard}>
          <h2 style={styles.addFormTitle}>➕ Add YouTube Short Video</h2>
          <form onSubmit={handleAddShort} style={styles.addShortForm}>
            <div style={styles.formGroupFull}>
              <label style={styles.formLabel}>YouTube Short URL or Video ID *</label>
              <input
                type="text"
                required
                placeholder="e.g. https://www.youtube.com/shorts/dQw4w9WgXcQ or dQw4w9WgXcQ"
                value={newUrlOrId}
                onChange={(e) => setNewUrlOrId(e.target.value)}
                style={styles.formInput}
              />
            </div>
            <div style={styles.formGroupHalf}>
              <label style={styles.formLabel}>Title (Optional - Auto-detected if empty)</label>
              <input
                type="text"
                placeholder="Custom Short Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={styles.formInput}
              />
            </div>
            <div style={styles.formGroupHalf}>
              <label style={styles.formLabel}>Channel Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Veritasium"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                style={styles.formInput}
              />
            </div>
            <div style={styles.formGroupHalf}>
              <label style={styles.formLabel}>Category *</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                style={styles.formSelect}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.formGroupHalf}>
              <label style={styles.formLabel}>Initial Status *</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as "approved" | "pending")}
                style={styles.formSelect}
              >
                <option value="approved">Approved (Directly visible in feed)</option>
                <option value="pending">Pending (Needs review)</option>
              </select>
            </div>
            <div style={{ width: "100%", display: "flex", gap: "10px", marginTop: "10px" }}>
              <button type="submit" disabled={isAdding} style={styles.submitAddButton}>
                {isAdding ? "Saving Short..." : "🚀 Add Short Video"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={styles.cancelAddButton}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Tabs */}
      <div style={styles.tabContainer}>
        {(["pending", "approved", "rejected"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tabButton,
              ...(activeTab === tab ? styles.tabButtonActive : {}),
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div style={styles.filterToolbar}>
        <input
          type="text"
          placeholder="Search by title or channel..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />

        <select
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="ALL">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div style={styles.bulkBar}>
          <span style={styles.bulkCount}>
            Selected <strong>{selectedIds.length}</strong> item(s)
          </span>

          <div style={styles.bulkActionsGroup}>
            {activeTab !== "pending" && (
              <button
                onClick={() => handleBulkAction("pending")}
                style={styles.bulkPendingBtn}
              >
                ⏳ Mark Pending ({selectedIds.length})
              </button>
            )}

            {activeTab !== "approved" && (
              <button
                onClick={() => handleBulkAction("approve")}
                style={styles.bulkApproveBtn}
              >
                ✅ Approve Selected ({selectedIds.length})
              </button>
            )}

            {activeTab !== "rejected" && (
              <button
                onClick={() => handleBulkAction("reject")}
                style={styles.bulkRejectBtn}
              >
                ❌ Reject Selected ({selectedIds.length})
              </button>
            )}

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                style={styles.bulkCategorySelect}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleBulkAction("change_category", bulkCategory)}
                style={styles.bulkCategoryBtn}
              >
                🏷️ Set Category
              </button>
            </div>

            <button
              onClick={() => handleBulkAction("delete")}
              style={styles.bulkDeleteBtn}
            >
              🗑️ Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Content Grid / Table */}
      {loading ? (
        <p style={{ color: "#94A3B8", padding: "24px" }}>Loading shorts...</p>
      ) : filteredShorts.length === 0 ? (
        <div style={styles.emptyState}>No {activeTab} Shorts found matching your filter criteria.</div>
      ) : (
        <div>
          {/* Header Bar with Select All */}
          <div style={styles.selectAllHeader}>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleSelectAll}
                style={styles.checkbox}
              />
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#94A3B8" }}>
                Select All ({filteredShorts.length} items)
              </span>
            </label>
          </div>

          <div style={styles.grid}>
            {filteredShorts.map((item) => {
              const isSelected = selectedIds.includes(item._id);
              return (
                <div
                  key={item._id}
                  style={{
                    ...styles.card,
                    ...(isSelected ? styles.cardSelected : {}),
                  }}
                >
                  {/* Select Checkbox badge */}
                  <div style={styles.checkboxBadge}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOne(item._id)}
                      style={styles.checkbox}
                    />
                  </div>

                  <a
                    href={`https://www.youtube.com/shorts/${item.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.thumbnailBox}
                  >
                    <img
                      src={item.thumbnailUrl || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`}
                      alt={item.title}
                      style={styles.thumbnail}
                    />
                    <span style={styles.playBadge}>▶️ Watch Short</span>
                  </a>

                  <div style={styles.cardContent}>
                    <h3 style={styles.cardTitle}>{item.title}</h3>
                    <div style={styles.channelName}>{item.channelName}</div>

                    <div style={styles.metaRow}>
                      <select
                        value={item.category}
                        onChange={(e) => handleChangeCategory(item._id, e.target.value)}
                        style={styles.inlineSelect}
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.actionsRow}>
                      {activeTab !== "pending" && (
                        <button
                          onClick={() => handleSingleAction(item._id, "pending")}
                          style={styles.pendingButton}
                        >
                          ⏳ Pending
                        </button>
                      )}
                      {activeTab !== "approved" && (
                        <button
                          onClick={() => handleSingleAction(item._id, "approved")}
                          style={styles.approveButton}
                        >
                          ✅ Approve
                        </button>
                      )}
                      {activeTab !== "rejected" && (
                        <button
                          onClick={() => handleSingleAction(item._id, "rejected")}
                          style={styles.rejectButton}
                        >
                          ❌ Reject
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteSingle(item._id)}
                        style={styles.deleteButton}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
    marginBottom: "20px",
  },
  toggleAddButton: {
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
  addFormCard: {
    backgroundColor: "#1E293B",
    borderRadius: "14px",
    padding: "24px",
    border: "1px solid #334155",
    marginBottom: "24px",
  },
  addFormTitle: {
    margin: "0 0 16px 0",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#F8FAFC",
  },
  addShortForm: {
    display: "flex",
    flexWrap: "wrap",
    gap: "14px",
  },
  formGroupFull: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  formGroupHalf: {
    flex: "1 1 220px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  formLabel: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#94A3B8",
  },
  formInput: {
    padding: "10px 14px",
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#F8FAFC",
    fontSize: "0.9rem",
    outline: "none",
  },
  formSelect: {
    padding: "10px 14px",
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#F8FAFC",
    fontSize: "0.9rem",
    outline: "none",
  },
  submitAddButton: {
    backgroundColor: "#10B981",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  cancelAddButton: {
    backgroundColor: "transparent",
    color: "#94A3B8",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 18px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
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
  alert: {
    padding: "14px 18px",
    borderRadius: "8px",
    marginBottom: "20px",
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
  tabContainer: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
    borderBottom: "1px solid #334155",
    paddingBottom: "12px",
  },
  tabButton: {
    backgroundColor: "transparent",
    color: "#94A3B8",
    border: "none",
    padding: "8px 16px",
    fontSize: "0.85rem",
    fontWeight: 600,
    borderRadius: "6px",
    cursor: "pointer",
  },
  tabButtonActive: {
    backgroundColor: "#3B82F6",
    color: "#FFFFFF",
  },
  filterToolbar: {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
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
  filterSelect: {
    padding: "10px 14px",
    backgroundColor: "#1E293B",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#F8FAFC",
    fontSize: "0.9rem",
    outline: "none",
  },
  bulkBar: {
    position: "sticky",
    top: "20px",
    zIndex: 100,
    backgroundColor: "#1E293B",
    border: "1px solid #3B82F6",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    borderRadius: "12px",
    padding: "14px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "12px",
  },
  bulkCount: {
    fontSize: "0.9rem",
    color: "#F8FAFC",
  },
  bulkActionsGroup: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  bulkPendingBtn: {
    backgroundColor: "#F59E0B",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  bulkApproveBtn: {
    backgroundColor: "#10B981",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  bulkRejectBtn: {
    backgroundColor: "#EF4444",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  bulkCategorySelect: {
    padding: "8px 10px",
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "6px",
    color: "#F8FAFC",
    fontSize: "0.85rem",
  },
  bulkCategoryBtn: {
    backgroundColor: "#3B82F6",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "6px",
    padding: "8px 12px",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  bulkDeleteBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    color: "#FCA5A5",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    borderRadius: "6px",
    padding: "8px 12px",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  selectAllHeader: {
    backgroundColor: "#1E293B",
    padding: "10px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    border: "1px solid #334155",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    accentColor: "#3B82F6",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: "12px",
    border: "1px solid #334155",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    transition: "border 0.2s ease",
  },
  cardSelected: {
    border: "2px solid #3B82F6",
    backgroundColor: "#1E293D",
  },
  checkboxBadge: {
    position: "absolute",
    top: "10px",
    left: "10px",
    zIndex: 10,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    backdropFilter: "blur(4px)",
    borderRadius: "6px",
    padding: "4px 8px",
    display: "flex",
    alignItems: "center",
  },
  thumbnailBox: {
    position: "relative",
    width: "100%",
    height: "180px",
    backgroundColor: "#0F172A",
    display: "block",
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  playBadge: {
    position: "absolute",
    bottom: "8px",
    right: "8px",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    color: "#FFFFFF",
    fontSize: "0.75rem",
    padding: "4px 8px",
    borderRadius: "4px",
    fontWeight: 600,
  },
  cardContent: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    justifyContent: "space-between",
  },
  cardTitle: {
    margin: "0 0 6px 0",
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#F8FAFC",
    lineHeight: 1.3,
  },
  channelName: {
    fontSize: "0.8rem",
    color: "#94A3B8",
    marginBottom: "12px",
  },
  metaRow: {
    marginBottom: "14px",
  },
  inlineSelect: {
    width: "100%",
    padding: "6px 8px",
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "6px",
    color: "#F8FAFC",
    fontSize: "0.8rem",
  },
  actionsRow: {
    display: "flex",
    gap: "8px",
  },
  pendingButton: {
    flex: 1,
    backgroundColor: "#F59E0B",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "6px",
    padding: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  approveButton: {
    flex: 1,
    backgroundColor: "#10B981",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "6px",
    padding: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "6px",
    padding: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#FCA5A5",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    padding: "8px",
    borderRadius: "6px",
    fontSize: "0.8rem",
    cursor: "pointer",
  },
  emptyState: {
    padding: "40px",
    textAlign: "center",
    color: "#94A3B8",
  },
};
