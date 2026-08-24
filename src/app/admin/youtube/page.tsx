"use client";

import React, { useState, useEffect } from "react";

interface ChannelItem {
  _id: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  feedUrl: string;
  defaultCategory: string;
  isActive: boolean;
  lastFetchedAt?: string;
  lastSuccessfulFetchAt?: string;
}

export default function AdminYouTubeChannelsPage() {
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [channelUrl, setChannelUrl] = useState("");
  const [category, setCategory] = useState("Science");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [lastStats, setLastStats] = useState<any>(null);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const [chRes, catRes] = await Promise.all([
        fetch("/api/admin/youtube/channels", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);
      const chData = await chRes.json();
      const catData = await catRes.json();

      if (chData.success) setChannels(chData.channels);
      if (catData.success && catData.categories) {
        const catNames = catData.categories.map((c: any) => c.name);
        setCategories(catNames);
        if (catNames.length > 0 && !catNames.includes(category)) {
          setCategory(catNames[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load channels/categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelUrl) return;

    try {
      setAdding(true);
      setMessage(null);

      const res = await fetch("/api/admin/youtube/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl, category }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: "success" });
        setChannelUrl("");
        fetchChannels();
      } else {
        setMessage({ text: data.error || "Failed to add channel", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Request failed", type: "error" });
    } finally {
      setAdding(false);
    }
  };

  const handleRunIngestion = async () => {
    try {
      setIngesting(true);
      setMessage(null);
      setLastStats(null);

      const res = await fetch("/api/admin/youtube/ingest", {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ text: "YouTube Shorts Ingestion completed!", type: "success" });
        setLastStats(data.stats);
        fetchChannels();
      } else {
        setMessage({ text: data.error || "Ingestion run failed", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Ingestion trigger failed", type: "error" });
    } finally {
      setIngesting(false);
    }
  };

  const handleToggleActive = async (ch: ChannelItem) => {
    try {
      const res = await fetch(`/api/admin/youtube/channels/${ch._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !ch.isActive }),
      });
      const data = await res.json();
      if (data.success) fetchChannels();
    } catch (err) {
      console.error("Failed to toggle channel:", err);
    }
  };

  const handleChangeCategory = async (ch: ChannelItem, newCat: string) => {
    try {
      const res = await fetch(`/api/admin/youtube/channels/${ch._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultCategory: newCat }),
      });
      const data = await res.json();
      if (data.success) fetchChannels();
    } catch (err) {
      console.error("Failed to update category:", err);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm("Are you sure you want to remove this channel?")) return;
    try {
      const res = await fetch(`/api/admin/youtube/channels/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) fetchChannels();
    } catch (err) {
      console.error("Failed to delete channel:", err);
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>YouTube Shorts Channels</h1>
          <p style={styles.subtitle}>Manage trusted YouTube channels for automated Shorts discovery</p>
        </div>
        <button
          onClick={handleRunIngestion}
          disabled={ingesting}
          style={styles.runNowButton}
        >
          {ingesting ? "⚡ Ingesting Feeds..." : "▶️ Run Ingestion Now"}
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

      {/* Ingestion Stats Summary Box */}
      {lastStats && (
        <div style={styles.statsCard}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#60A5FA" }}>
            📊 Last Execution Report
          </h3>
          <div style={styles.statsGrid}>
            <div>Channels Checked: <strong>{lastStats.channelsChecked}</strong></div>
            <div>Videos Discovered: <strong>{lastStats.videosDiscovered}</strong></div>
            <div>New Shorts Saved: <strong style={{ color: "#34D399" }}>{lastStats.newShortsSaved}</strong></div>
            <div>Duplicates Skipped: <strong>{lastStats.duplicates}</strong></div>
          </div>
        </div>
      )}

      {/* Add Channel Form */}
      <section style={styles.cardSection}>
        <h2 style={styles.cardTitle}>➕ Add New Channel</h2>
        <form onSubmit={handleAddChannel} style={styles.addForm}>
          <input
            type="text"
            required
            placeholder="Paste Channel URL (e.g. https://youtube.com/@veritasium or /channel/UC...)"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            style={styles.inputUrl}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={styles.selectCategory}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <button type="submit" disabled={adding} style={styles.addButton}>
            {adding ? "Resolving..." : "Add Channel"}
          </button>
        </form>
      </section>

      {/* Channels List */}
      <section style={styles.tableContainer}>
        <h2 style={{ ...styles.cardTitle, padding: "20px 24px 0 24px" }}>Configured Channels ({channels.length})</h2>
        {loading ? (
          <p style={{ padding: "24px", color: "#94A3B8" }}>Loading channels list...</p>
        ) : channels.length === 0 ? (
          <div style={styles.emptyState}>No channels added yet. Add a channel above to begin automated discovery.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Channel Name & XML Feed URL</th>
                <th style={styles.th}>Channel ID</th>
                <th style={styles.th}>Default Category</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Last Fetched</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((ch) => (
                <tr key={ch._id} style={styles.tr}>
                  <td style={styles.tdChannel}>
                    <div style={{ fontWeight: 600, color: "#F8FAFC" }}>{ch.channelName}</div>
                    <a
                      href={ch.feedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.linkSub}
                      title="Click to view YouTube XML Feed"
                    >
                      {ch.feedUrl}
                    </a>
                  </td>
                  <td style={styles.tdCode}>{ch.channelId}</td>
                  <td style={styles.td}>
                    <select
                      value={ch.defaultCategory}
                      onChange={(e) => handleChangeCategory(ch, e.target.value)}
                      style={styles.inlineSelect}
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={styles.td}>
                    <span
                      onClick={() => handleToggleActive(ch)}
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: ch.isActive ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                        color: ch.isActive ? "#34D399" : "#FCA5A5",
                      }}
                    >
                      {ch.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {ch.lastFetchedAt ? new Date(ch.lastFetchedAt).toLocaleTimeString() : "Never"}
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => handleDeleteChannel(ch._id)} style={styles.deleteButton}>
                      🗑️ Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
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
  runNowButton: {
    backgroundColor: "#10B981",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "10px 18px",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
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
  statsCard: {
    backgroundColor: "#1E293B",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #334155",
    marginBottom: "28px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    color: "#CBD5E1",
    fontSize: "0.9rem",
  },
  cardSection: {
    backgroundColor: "#1E293B",
    borderRadius: "14px",
    padding: "24px",
    border: "1px solid #334155",
    marginBottom: "28px",
  },
  cardTitle: {
    margin: "0 0 16px 0",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#F8FAFC",
  },
  addForm: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
  },
  inputUrl: {
    flex: 1,
    minWidth: "300px",
    padding: "10px 14px",
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#F8FAFC",
    fontSize: "0.9rem",
    outline: "none",
  },
  selectCategory: {
    padding: "10px 14px",
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#F8FAFC",
    fontSize: "0.9rem",
    outline: "none",
  },
  addButton: {
    backgroundColor: "#3B82F6",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
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
    marginTop: "16px",
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
  tdChannel: {
    padding: "16px 18px",
    maxWidth: "360px",
  },
  linkSub: {
    fontSize: "0.75rem",
    color: "#60A5FA",
    textDecoration: "none",
    wordBreak: "break-all",
    display: "block",
    marginTop: "4px",
  },
  tdCode: {
    padding: "16px 18px",
    fontFamily: "monospace",
    fontSize: "0.85rem",
    color: "#38BDF8",
  },
  inlineSelect: {
    padding: "4px 8px",
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "6px",
    color: "#F8FAFC",
    fontSize: "0.8rem",
  },
  statusBadge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 700,
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
};
