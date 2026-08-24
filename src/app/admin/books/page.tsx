"use client";

import React, { useState, useEffect } from "react";

interface BookItem {
  _id: string;
  title: string;
  topic: string;
  readingTimeMinutes: number;
  shortDescription: string;
  isTopCombine: boolean;
  createdAt: string;
}

export default function AdminBooksPage() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const handleDeleteBook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this book summary?")) return;
    try {
      const res = await fetch(`/api/admin/books/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
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
          <h1 style={styles.title}>Book Summaries Library</h1>
          <p style={styles.subtitle}>View, manage, and toggle featured book summaries</p>
        </div>
      </div>

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
                <th style={styles.th}>Book Title</th>
                <th style={styles.th}>Topic</th>
                <th style={styles.th}>Read Time</th>
                <th style={styles.th}>Top Combine</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b._id} style={styles.tr}>
                  <td style={styles.tdTitle}>
                    <div style={{ fontWeight: 600, color: "#F8FAFC" }}>{b.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "#94A3B8", lineClamp: 1 }}>
                      {b.shortDescription}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.topicBadge}>{b.topic}</span>
                  </td>
                  <td style={styles.td}>{b.readingTimeMinutes} mins</td>
                  <td style={styles.td}>
                    <span
                      onClick={() => handleToggleTopCombine(b)}
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: b.isTopCombine ? "rgba(16, 185, 129, 0.2)" : "rgba(100, 116, 139, 0.2)",
                        color: b.isTopCombine ? "#34D399" : "#94A3B8",
                      }}
                    >
                      {b.isTopCombine ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleDeleteBook(b._id)}
                      style={styles.deleteButton}
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
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  header: {
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
  filterBar: {
    marginBottom: "24px",
  },
  searchInput: {
    width: "100%",
    maxWidth: "400px",
    padding: "10px 14px",
    backgroundColor: "#1E293B",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#F8FAFC",
    fontSize: "0.9rem",
    outline: "none",
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
  tdTitle: {
    padding: "16px 18px",
    maxWidth: "350px",
  },
  topicBadge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "0.75rem",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    color: "#60A5FA",
    fontWeight: 600,
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
