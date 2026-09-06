"use client";

import React, { useState, useEffect } from "react";

interface IndividualBookItem {
  _id: string;
  title: string;
  author?: string;
  topic: string;
  readingTimeMinutes: number;
  shortDescription: string;
  isFeatured?: boolean;
  createdAt: string;
}

export default function AdminIndividualBooksPage() {
  const [books, setBooks] = useState<IndividualBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const handleDeleteBook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this individual book summary?")) return;
    try {
      const res = await fetch(`/api/admin/individualbooks/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
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
          <p style={styles.subtitle}>Specific book summaries (collection: individualbooks)</p>
        </div>
      </div>

      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="Search by title, author, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.tableContainer}>
        {loading ? (
          <p style={{ padding: "24px", color: "#94A3B8" }}>Loading books library...</p>
        ) : books.length === 0 ? (
          <div style={styles.emptyState}>No individual books found. Use the seed endpoint or add books!</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Title & Author</th>
                <th style={styles.th}>Topic</th>
                <th style={styles.th}>Read Time</th>
                <th style={styles.th}>Featured</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book._id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 600, color: "#FFFFFF" }}>{book.title}</div>
                    {book.author && <div style={{ fontSize: "0.8rem", color: "#94A3B8" }}>by {book.author}</div>}
                    <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "4px" }}>
                      {book.shortDescription.substring(0, 90)}...
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.badge}>{book.topic}</span>
                  </td>
                  <td style={styles.td}>{book.readingTimeMinutes} mins</td>
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
                    {new Date(book.createdAt).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleDeleteBook(book._id)}
                      style={styles.deleteBtn}
                    >
                      Delete
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
};
