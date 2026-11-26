"use client";

import React, { useEffect, useState } from "react";

interface ScreenshotItem {
  key: string;
  label: string;
  filename: string;
  exists: boolean;
  url: string | null;
  updatedAt: string | null;
  sizeBytes: number;
}

export default function ScraperScreenshotsPage() {
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScreenshots = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/scraper-screenshots", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setScreenshots(data.screenshots);
      } else {
        setError(data.error || "Failed to load screenshots");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load screenshots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenshots();
  }, []);

  return (
    <div style={{ padding: "24px", color: "#F8FAFC", maxWidth: "1200px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            📸 Scraper Debug Screenshots
          </h1>
          <p style={{ color: "#94A3B8", fontSize: "0.9rem", margin: "4px 0 0 0" }}>
            Latest failure/debug screenshots saved by ChatGPT and DeepSeek scrapers in <code>public/</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchScreenshots}
          disabled={loading}
          style={{
            padding: "8px 16px",
            backgroundColor: "#3B82F6",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid #EF4444",
            borderRadius: "8px",
            color: "#FCA5A5",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: "20px" }}>
        {screenshots.map((item) => (
          <div
            key={item.key}
            style={{
              backgroundColor: "#0F172A",
              border: "1px solid #1E293B",
              borderRadius: "10px",
              padding: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
                borderBottom: "1px solid #1E293B",
                paddingBottom: "10px",
              }}
            >
              <div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{item.label}</h2>
                <div style={{ fontSize: "0.8rem", color: "#94A3B8", marginTop: "2px" }}>
                  <code>public/{item.filename}</code>
                </div>
              </div>
              {item.exists && item.updatedAt ? (
                <div style={{ textAlign: "right", fontSize: "0.78rem", color: "#94A3B8" }}>
                  <div>🕒 {new Date(item.updatedAt).toLocaleString(undefined, { hour12: true })}</div>
                  <div>{(item.sizeBytes / 1024).toFixed(1)} KB</div>
                </div>
              ) : (
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    color: "#34D399",
                  }}
                >
                  No failure screenshot
                </span>
              )}
            </div>

            {item.exists && item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer" title="Open full size in new tab">
                <img
                  src={item.url}
                  alt={item.label}
                  style={{
                    width: "100%",
                    height: "auto",
                    borderRadius: "6px",
                    border: "1px solid #334155",
                    display: "block",
                  }}
                />
              </a>
            ) : (
              <div
                style={{
                  padding: "48px 20px",
                  textAlign: "center",
                  color: "#64748B",
                  backgroundColor: "#0B1120",
                  borderRadius: "6px",
                  border: "1px dashed #334155",
                  fontSize: "0.9rem",
                }}
              >
                No screenshot found (cleaned up after last successful run, or never generated).
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
