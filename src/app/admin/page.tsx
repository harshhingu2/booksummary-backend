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

export default function AdminPage() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [testLoading, setTestLoading] = useState<boolean>(false);

  const fetchCacheStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/cache");
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
        body: JSON.stringify(keyPattern ? { keyPattern } : {}),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ text: data.message, type: "success" });
        await fetchCacheStats();
      } else {
        setMessage({ text: data.error || "Failed to clear cache", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "An error occurred", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestApiCall = async () => {
    try {
      setTestLoading(true);
      const startTime = performance.now();
      const res = await fetch("/api/topcombinebooksummary");
      const endTime = performance.now();
      const cacheHeader = res.headers.get("X-Cache") || "N/A";
      const json = await res.json();

      setApiResponse({
        status: res.status,
        responseTimeMs: Math.round(endTime - startTime),
        cacheHeader,
        count: json.count ?? json.data?.length ?? 0,
        cachedAt: json.cachedAt,
      });
      await fetchCacheStats();
    } catch (err: any) {
      console.error("Test fetch error:", err);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTitleContainer}>
          <div style={styles.badge}>Admin Dashboard</div>
          <h1 style={styles.title}>API Cache Manager</h1>
        </div>
        <div style={styles.actionsGroup}>
          <button
            onClick={() => handleClearCache()}
            disabled={actionLoading}
            style={{ ...styles.button, ...styles.dangerButton }}
          >
            {actionLoading ? "Clearing..." : "⚡ Clear Entire Cache"}
          </button>
        </div>
      </header>

      {message && (
        <div
          style={{
            ...styles.alert,
            ...(message.type === "success" ? styles.alertSuccess : styles.alertError),
          }}
        >
          {message.type === "success" ? "✅" : "⚠️"} {message.text}
        </div>
      )}

      {/* Stats Grid */}
      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Total Cache Keys</h3>
          <p style={styles.cardValue}>{loading ? "..." : stats?.totalKeys ?? 0}</p>
          <span style={styles.cardSubtext}>Entries in memory store</span>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Active Valid Keys</h3>
          <p style={styles.cardValue}>{loading ? "..." : stats?.activeKeys ?? 0}</p>
          <span style={styles.cardSubtext}>Unexpired entries</span>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Default TTL</h3>
          <p style={styles.cardValue}>5 Min</p>
          <span style={styles.cardSubtext}>300 seconds automatic expiration</span>
        </div>
      </div>

      {/* Live API Testing Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2>Live Cache Test Console</h2>
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
                Cache Status: {apiResponse.cacheHeader}
              </span>
              <span style={styles.timeBadge}>Time: {apiResponse.responseTimeMs} ms</span>
            </div>
            <pre style={styles.codeBlock}>{JSON.stringify(apiResponse, null, 2)}</pre>
          </div>
        )}
      </section>

      {/* Active Cache Entries List */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2>Cached Endpoints & Keys</h2>
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
                  <th style={styles.th}>Cache Key Pattern</th>
                  <th style={styles.th}>Cached Time</th>
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
              Click <strong>&quot;Fetch /api/topcombinebooksummary&quot;</strong> above to generate a cache entry.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "40px 24px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: "#E5E7EB",
    backgroundColor: "#0F172A",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
    paddingBottom: "24px",
    borderBottom: "1px solid #1E293B",
  },
  headerTitleContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  badge: {
    display: "inline-block",
    alignSelf: "flex-start",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    color: "#60A5FA",
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "4px 10px",
    borderRadius: "9999px",
    border: "1px solid rgba(59, 130, 246, 0.3)",
  },
  title: {
    margin: 0,
    fontSize: "2rem",
    fontWeight: 700,
    letterSpacing: "-0.025em",
    color: "#F8FAFC",
  },
  actionsGroup: {
    display: "flex",
    gap: "12px",
  },
  button: {
    padding: "10px 18px",
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "20px",
    marginBottom: "40px",
  },
  card: {
    backgroundColor: "#1E293B",
    padding: "24px",
    borderRadius: "12px",
    border: "1px solid #334155",
  },
  cardTitle: {
    margin: 0,
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#94A3B8",
  },
  cardValue: {
    margin: "10px 0 4px 0",
    fontSize: "2.25rem",
    fontWeight: 700,
    color: "#F8FAFC",
  },
  cardSubtext: {
    fontSize: "0.75rem",
    color: "#64748B",
  },
  section: {
    backgroundColor: "#1E293B",
    borderRadius: "12px",
    padding: "28px",
    border: "1px solid #334155",
    marginBottom: "32px",
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
