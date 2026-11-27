"use client";

import React, { useEffect, useState } from "react";

interface BookRequestItem {
  _id: string;
  bookName: string;
  email?: string;
  createdAt?: string;
}

export default function AdminBookRequestsPage() {
  const [requests, setRequests] = useState<BookRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/book-requests", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setRequests(data.data || []);
      } else {
        setError(data.error || "Failed to load book requests");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#F8FAFC" }}>
            📩 User Book Requests
          </h1>
          <p style={{ margin: "6px 0 0 0", color: "#94A3B8", fontSize: "0.9rem" }}>
            Total submissions: <strong style={{ color: "#F8FAFC" }}>{requests.length}</strong>
          </p>
        </div>
        <button
          onClick={fetchRequests}
          style={{
            backgroundColor: "#1E293B",
            color: "#F8FAFC",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "8px 14px",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#FCA5A5", borderRadius: "8px", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: "24px", color: "#94A3B8" }}>Loading book requests...</p>
        ) : requests.length === 0 ? (
          <p style={{ padding: "24px", color: "#94A3B8" }}>No book requests submitted yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155", backgroundColor: "#0F172A" }}>
                <th style={{ textAlign: "left", padding: "12px 16px", color: "#94A3B8", fontSize: "0.8rem", textTransform: "uppercase" }}>Book Name</th>
                <th style={{ textAlign: "left", padding: "12px 16px", color: "#94A3B8", fontSize: "0.8rem", textTransform: "uppercase" }}>Email</th>
                <th style={{ textAlign: "left", padding: "12px 16px", color: "#94A3B8", fontSize: "0.8rem", textTransform: "uppercase" }}>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req._id} style={{ borderBottom: "1px solid #334155" }}>
                  <td style={{ padding: "14px 16px", color: "#F8FAFC", fontWeight: 600 }}>{req.bookName}</td>
                  <td style={{ padding: "14px 16px", color: "#CBD5E1" }}>{req.email || "—"}</td>
                  <td style={{ padding: "14px 16px", color: "#94A3B8", fontSize: "0.85rem" }}>
                    {req.createdAt ? new Date(req.createdAt).toLocaleString() : "—"}
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
