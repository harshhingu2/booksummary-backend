"use client";

import React, { useState, useEffect } from "react";

interface CronItem {
  _id: string;
  name: string;
  schedule: string;
  endpoint: string;
  isActive: boolean;
  lastRunAt?: string;
  lastStatus: "success" | "failed" | "running" | "never";
  lastRunResult?: string;
}

const FREQUENCY_OPTIONS = [
  { label: "Every 5 Minutes", value: "*/5 * * * *" },
  { label: "Every 15 Minutes", value: "*/15 * * * *" },
  { label: "Every 30 Minutes", value: "*/30 * * * *" },
  { label: "Every 1 Hour", value: "0 * * * *" },
  { label: "Every 6 Hours", value: "0 */6 * * *" },
  { label: "Every 12 Hours", value: "0 */12 * * *" },
  { label: "Once Every 24 Hours", value: "0 0 * * *" },
  { label: "Once a Week (Sunday)", value: "0 0 * * 0" },
  { label: "Custom Cron Expression", value: "custom" },
];

export function getCronHumanLabel(cronExpr: string): string {
  const matched = FREQUENCY_OPTIONS.find((opt) => opt.value === cronExpr.trim());
  if (matched && matched.value !== "custom") {
    return matched.label;
  }
  return cronExpr;
}

export default function AdminCronsPage() {
  const [crons, setCrons] = useState<CronItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);

  const [frequencyChoice, setFrequencyChoice] = useState("*/15 * * * *");
  const [customCron, setCustomCron] = useState("*/15 * * * *");
  const [formData, setFormData] = useState({
    name: "",
    schedule: "*/15 * * * *",
    endpoint: "/api/cron/youtube",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchCrons = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/crons", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setCrons(data.crons);
      }
    } catch (err) {
      console.error("Failed to load crons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrons();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFrequencyChoice("*/15 * * * *");
    setCustomCron("*/15 * * * *");
    setFormData({
      name: "",
      schedule: "*/15 * * * *",
      endpoint: "/api/cron/youtube",
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (job: CronItem) => {
    setEditingId(job._id);
    const matched = FREQUENCY_OPTIONS.find((opt) => opt.value === job.schedule);
    if (matched && matched.value !== "custom") {
      setFrequencyChoice(job.schedule);
    } else {
      setFrequencyChoice("custom");
      setCustomCron(job.schedule);
    }

    setFormData({
      name: job.name,
      schedule: job.schedule,
      endpoint: job.endpoint,
      isActive: job.isActive,
    });
    setShowModal(true);
  };

  const handleFrequencyChange = (val: string) => {
    setFrequencyChoice(val);
    if (val !== "custom") {
      setFormData((prev) => ({ ...prev, schedule: val }));
    } else {
      setFormData((prev) => ({ ...prev, schedule: customCron }));
    }
  };

  const handleCustomCronChange = (val: string) => {
    setCustomCron(val);
    setFormData((prev) => ({ ...prev, schedule: val }));
  };

  const handleSaveCron = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);

      const url = editingId ? `/api/admin/crons/${editingId}` : "/api/admin/crons";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: "success" });
        setShowModal(false);
        fetchCrons();
      } else {
        setMessage({ text: data.error || "Failed to save cron job", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Request failed", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleRunCronNow = async (id: string) => {
    try {
      setRunningId(id);
      setMessage(null);

      const res = await fetch(`/api/admin/crons/${id}/run`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: "success" });
        fetchCrons();
      } else {
        setMessage({ text: data.error || "Cron execution failed", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Execution request failed", type: "error" });
    } finally {
      setRunningId(null);
    }
  };

  const handleToggleActive = async (job: CronItem) => {
    try {
      const res = await fetch(`/api/admin/crons/${job._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !job.isActive }),
      });
      const data = await res.json();
      if (data.success) fetchCrons();
    } catch (err) {
      console.error("Failed to toggle cron job:", err);
    }
  };

  const handleDeleteCron = async (id: string) => {
    if (!confirm("Are you sure you want to delete this cron job?")) return;
    try {
      const res = await fetch(`/api/admin/crons/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) fetchCrons();
    } catch (err) {
      console.error("Failed to delete cron job:", err);
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Cron Jobs Control Center</h1>
          <p style={styles.subtitle}>Create, manage, and manually execute background scheduled tasks</p>
        </div>
        <button onClick={handleOpenAddModal} style={styles.primaryButton}>
          ➕ Create New Cron Job
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

      {/* Table */}
      <div style={styles.tableContainer}>
        {loading ? (
          <p style={{ padding: "24px", color: "#94A3B8" }}>Loading cron jobs...</p>
        ) : crons.length === 0 ? (
          <div style={styles.emptyState}>No cron jobs configured. Click &quot;Create New Cron Job&quot; above to add one.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Job Name</th>
                <th style={styles.th}>Frequency / Interval</th>
                <th style={styles.th}>Target Endpoint</th>
                <th style={styles.th}>Last Status</th>
                <th style={styles.th}>Last Run</th>
                <th style={styles.th}>State</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {crons.map((job) => (
                <tr key={job._id} style={styles.tr}>
                  <td style={styles.tdName}>
                    <div style={{ fontWeight: 600, color: "#F8FAFC" }}>{job.name}</div>
                  </td>
                  <td style={styles.tdCode}>
                    <div style={{ fontWeight: 600, color: "#38BDF8" }}>{getCronHumanLabel(job.schedule)}</div>
                    <span style={styles.cronBadge}>{job.schedule}</span>
                  </td>
                  <td style={styles.tdEndpoint}>{job.endpoint}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusTag,
                        backgroundColor:
                          job.lastStatus === "success"
                            ? "rgba(16, 185, 129, 0.2)"
                            : job.lastStatus === "failed"
                            ? "rgba(239, 68, 68, 0.2)"
                            : job.lastStatus === "running"
                            ? "rgba(245, 158, 11, 0.2)"
                            : "rgba(100, 116, 139, 0.2)",
                        color:
                          job.lastStatus === "success"
                            ? "#34D399"
                            : job.lastStatus === "failed"
                            ? "#FCA5A5"
                            : job.lastStatus === "running"
                            ? "#FBBF24"
                            : "#94A3B8",
                      }}
                    >
                      {job.lastStatus.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {job.lastRunAt ? new Date(job.lastRunAt).toLocaleTimeString() : "Never"}
                  </td>
                  <td style={styles.td}>
                    <span
                      onClick={() => handleToggleActive(job)}
                      style={{
                        ...styles.activeBadge,
                        backgroundColor: job.isActive ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                        color: job.isActive ? "#34D399" : "#FCA5A5",
                      }}
                      title="Click to toggle Active state"
                    >
                      {job.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={styles.tdActions}>
                    <button
                      onClick={() => handleRunCronNow(job._id)}
                      disabled={runningId === job._id}
                      style={styles.runButton}
                    >
                      {runningId === job._id ? "Running..." : "▶️ Run Now"}
                    </button>
                    {job.lastRunResult && (
                      <button
                        onClick={() => setSelectedResult(job.lastRunResult || null)}
                        style={styles.logButton}
                      >
                        📋 Log
                      </button>
                    )}
                    <button onClick={() => handleOpenEditModal(job)} style={styles.editButton}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDeleteCron(job._id)} style={styles.deleteButton}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Execution Log Viewer Modal */}
      {selectedResult && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: "600px" }}>
            <h2 style={{ margin: "0 0 16px 0", color: "#F8FAFC" }}>Last Execution Output Log</h2>
            <pre style={styles.codeBlock}>{selectedResult}</pre>
            <div style={{ textAlign: "right", marginTop: "16px" }}>
              <button onClick={() => setSelectedResult(null)} style={styles.cancelButton}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={{ margin: "0 0 20px 0", color: "#F8FAFC" }}>
              {editingId ? "Edit Cron Job" : "Create New Cron Job"}
            </h2>
            <form onSubmit={handleSaveCron} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={styles.label}>Job Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. YouTube Shorts Auto Ingestion"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.modalInput}
                />
              </div>

              <div>
                <label style={styles.label}>Run Frequency (Time Interval)</label>
                <select
                  value={frequencyChoice}
                  onChange={(e) => handleFrequencyChange(e.target.value)}
                  style={styles.modalInput}
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} {opt.value !== "custom" ? `(${opt.value})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {frequencyChoice === "custom" && (
                <div>
                  <label style={styles.label}>Custom Cron Expression</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. */15 * * * *"
                    value={customCron}
                    onChange={(e) => handleCustomCronChange(e.target.value)}
                    style={styles.modalInput}
                  />
                  <span style={{ fontSize: "0.72rem", color: "#94A3B8", marginTop: "4px", display: "block" }}>
                    Standard 5-field format: <code>minute hour day-of-month month day-of-week</code>
                  </span>
                </div>
              )}

              <div>
                <label style={styles.label}>Target Endpoint</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. /api/cron/youtube"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  style={styles.modalInput}
                />
              </div>

              <div>
                <label style={styles.label}>Active Status</label>
                <select
                  value={formData.isActive ? "active" : "inactive"}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "active" })}
                  style={styles.modalInput}
                >
                  <option value="active">Active (Scheduled)</option>
                  <option value="inactive">Inactive (Disabled)</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button type="submit" disabled={saving} style={styles.primaryButton}>
                  {saving ? "Saving..." : editingId ? "Update Cron Job" : "Create & Schedule Job"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={styles.cancelButton}>
                  Cancel
                </button>
              </div>
            </form>
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
  primaryButton: {
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
  cancelButton: {
    backgroundColor: "transparent",
    color: "#94A3B8",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 18px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
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
  tdName: {
    padding: "16px 18px",
    fontWeight: 600,
    color: "#F8FAFC",
  },
  tdCode: {
    padding: "16px 18px",
  },
  cronBadge: {
    display: "inline-block",
    fontFamily: "monospace",
    fontSize: "0.75rem",
    color: "#94A3B8",
    backgroundColor: "#0F172A",
    padding: "2px 6px",
    borderRadius: "4px",
    marginTop: "4px",
  },
  tdEndpoint: {
    padding: "16px 18px",
    fontSize: "0.85rem",
    color: "#94A3B8",
  },
  statusTag: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 700,
  },
  activeBadge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  tdActions: {
    padding: "16px 18px",
    display: "flex",
    gap: "6px",
    alignItems: "center",
  },
  runButton: {
    backgroundColor: "#10B981",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  logButton: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    color: "#60A5FA",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    padding: "6px 10px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  editButton: {
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    color: "#CBD5E1",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    padding: "6px 10px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#FCA5A5",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    padding: "6px 10px",
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
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#1E293B",
    borderRadius: "14px",
    border: "1px solid #334155",
    padding: "28px",
    width: "100%",
    maxWidth: "480px",
  },
  modalInput: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#F8FAFC",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box",
  },
  label: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#94A3B8",
    textTransform: "uppercase",
    marginBottom: "4px",
    display: "block",
  },
  codeBlock: {
    margin: 0,
    fontSize: "0.85rem",
    color: "#38BDF8",
    backgroundColor: "#0F172A",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid #334155",
    maxHeight: "300px",
    overflowY: "auto",
    fontFamily: "monospace",
  },
};
