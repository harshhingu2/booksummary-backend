"use client";

import React, { useState, useEffect } from "react";

interface CacheKeyInfo {
  key: string;
  cachedAt: string;
  ttlRemainingSeconds: number;
}

interface CacheStats {
  totalKeys: number;
  activeKeys: number;
  keys: CacheKeyInfo[];
}

export default function AdminCachePage() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [testLoading, setTestLoading] = useState<boolean>(false);

  const fetchCacheStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/cache", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error("Error fetching cache stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCacheStats();
  }, []);

  const handleClearCache = async (keyPattern?: string) => {
    try {
      setActionLoading(true);
      setMessage(null);

      const res = await fetch("/api/admin/cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyPattern }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: "success" });
        fetchCacheStats();
      } else {
        setMessage({ text: data.error || "Failed to clear cache", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Request failed", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestApiCall = async () => {
    try {
      setTestLoading(true);
      const startTime = performance.now();
      const res = await fetch("/api/topcombinebooksummary");
      const responseTimeMs = Math.round(performance.now() - startTime);
      const cacheHeader = res.headers.get("X-Cache-Status") || "MISS/FRESH";
      const data = await res.json();

      setApiResponse({
        status: res.status,
        cacheHeader,
        responseTimeMs,
        bookCount: data.data?.length || 0,
        sampleTitle: data.data?.[0]?.title || "N/A",
      });

      fetchCacheStats();
    } catch (err: any) {
      console.error("API test call failed:", err);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Cache Revalidation</h1>
          <p style={styles.subtitle}>Manage in-memory API response cache and TTL entries</p>
        </div>
        <button
          onClick={() => handleClearCache()}
          disabled={actionLoading}
          style={{ ...styles.button, ...styles.dangerButton }}
        >
          {actionLoading ? "Clearing..." : "🔥 Purge All Cache"}
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

      {/* Test Endpoint Drawer */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>API Cache Tester</h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#94A3B8" }}>
              Call <code>/api/topcombinebooksummary</code> to verify caching hit/miss speeds.
            </p>
          </div>
          <button
            onClick={handleTestApiCall}
            disabled={testLoading}
            style={{ ...styles.button, ...styles.secondaryButton }}
          >
            {testLoading ? "Fetching..." : "Fetch /api/topcombinebooksummary"}
          </button>
        </div>

        {apiResponse && (
          <div style={styles.testResultBox}>
            <div style={styles.testResultHeader}>
              <span
                style={{
                  ...styles.statusBadge,
                  backgroundColor: apiResponse.cacheHeader === "HIT" ? "#10B981" : "#F59E0B",
                }}
              >
                Cache: {apiResponse.cacheHeader}
              </span>
              <span style={styles.timeBadge}>Latency: {apiResponse.responseTimeMs} ms</span>
            </div>
            <pre style={styles.codeBlock}>{JSON.stringify(apiResponse, null, 2)}</pre>
          </div>
        )}
      </section>

      {/* Active Cache Entries List */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Active Cached Key Patterns</h2>
          <button onClick={fetchCacheStats} style={{ ...styles.button, ...styles.ghostButton }}>
            🔄 Refresh Stats
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#9CA3AF" }}>Loading cache statistics...</p>
        ) : stats?.keys && stats.keys.length > 0 ? (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Cache Key</th>
                  <th style={styles.th}>Cached At</th>
                  <th style={styles.th}>TTL Remaining</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.keys.map((item) => (
                  <tr key={item.key} style={styles.tr}>
                    <td style={styles.tdKey}>{item.key}</td>
                    <td style={styles.td}>
                      {item.cachedAt ? new Date(item.cachedAt).toLocaleTimeString() : "N/A"}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.ttlBadge}>{item.ttlRemainingSeconds}s</span>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleClearCache(item.key)}
                        disabled={actionLoading}
                        style={{ ...styles.button, ...styles.smallDangerButton }}
                      >
                        Delete Key
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>No active cached responses in memory currently.</p>
            <p style={{ fontSize: "0.875rem", color: "#6B7280" }}>
              Click <strong>&quot;Fetch /api/topcombinebooksummary&quot;</strong> above to generate cache entries.
            </p>
          </div>
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
  button: {
    padding: "10px 16px",
    fontSize: "0.875rem",
    fontWeight: 600,
    borderRadius: "8px",
    cursor: "pointer",
    border: "none",
    transition: "all 0.2s ease",
  },
  dangerButton: {
    backgroundColor: "#EF4444",
    color: "#FFFFFF",
    boxShadow: "0 4px 14px rgba(239, 68, 68, 0.3)",
  },
  secondaryButton: {
    backgroundColor: "#3B82F6",
    color: "#FFFFFF",
    boxShadow: "0 4px 14px rgba(59, 130, 246, 0.3)",
  },
  ghostButton: {
    backgroundColor: "transparent",
    color: "#94A3B8",
    border: "1px solid #334155",
  },
  smallDangerButton: {
    padding: "4px 10px",
    fontSize: "0.75rem",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#FCA5A5",
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },
  alert: {
    padding: "14px 18px",
    borderRadius: "8px",
    marginBottom: "28px",
    fontSize: "0.9rem",
    fontWeight: 500,
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
  section: {
    backgroundColor: "#1E293B",
    borderRadius: "14px",
    padding: "24px",
    border: "1px solid #334155",
    marginBottom: "28px",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  testResultBox: {
    backgroundColor: "#0F172A",
    borderRadius: "8px",
    padding: "16px",
    border: "1px solid #334155",
  },
  testResultHeader: {
    display: "flex",
    gap: "12px",
    marginBottom: "12px",
  },
  statusBadge: {
    fontSize: "0.75rem",
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: "4px",
    color: "#FFFFFF",
  },
  timeBadge: {
    fontSize: "0.75rem",
    color: "#94A3B8",
    padding: "4px 8px",
    backgroundColor: "#1E293B",
    borderRadius: "4px",
  },
  codeBlock: {
    margin: 0,
    fontSize: "0.85rem",
    color: "#38BDF8",
    overflowX: "auto",
    fontFamily: "monospace",
  },
  tableContainer: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    padding: "12px 16px",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#94A3B8",
    textTransform: "uppercase",
    borderBottom: "1px solid #334155",
  },
  tr: {
    borderBottom: "1px solid #1E293B",
  },
  td: {
    padding: "14px 16px",
    fontSize: "0.875rem",
    color: "#CBD5E1",
  },
  tdKey: {
    padding: "14px 16px",
    fontSize: "0.875rem",
    fontFamily: "monospace",
    color: "#38BDF8",
  },
  ttlBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    color: "#60A5FA",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  emptyState: {
    textAlign: "center",
    padding: "32px 16px",
    color: "#94A3B8",
  },
};
