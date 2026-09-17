"use client";

import React, { useState, useEffect } from "react";

interface SettingsState {
  defaultAiScraper: "deepseek" | "chatgpt";
  individualAiScraper: "deepseek" | "chatgpt";
  multibookAiScraper: "deepseek" | "chatgpt";
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    defaultAiScraper: "deepseek",
    individualAiScraper: "deepseek",
    multibookAiScraper: "deepseek",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings({
          defaultAiScraper: data.settings.defaultAiScraper || "deepseek",
          individualAiScraper: data.settings.individualAiScraper || "deepseek",
          multibookAiScraper: data.settings.multibookAiScraper || "deepseek",
        });
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ text: "Settings saved successfully! Cron scrapers will now use the selected engines.", type: "success" });
      } else {
        setMessage({ text: data.error || "Failed to save settings", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save settings", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>System Settings & Scraper Defaults</h1>
          <p style={styles.subtitle}>
            Configure the default AI scraper engine utilized by automated cron jobs and background generation tasks.
          </p>
        </div>
      </div>

      {message && (
        <div
          style={{
            ...styles.alert,
            backgroundColor: message.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            borderColor: message.type === "success" ? "#10B981" : "#EF4444",
            color: message.type === "success" ? "#34D399" : "#F87171",
          }}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#94A3B8" }}>Loading settings...</p>
      ) : (
        <form onSubmit={handleSave} style={styles.formCard}>
          <div style={styles.sectionHeader}>
            <span style={{ fontSize: "1.3rem" }}>🤖</span>
            <div>
              <h2 style={styles.sectionTitle}>Automated Cron AI Scraper Defaults</h2>
              <p style={styles.sectionSubtitle}>
                Select which AI browser scraper (DeepSeek vs ChatGPT) automated background crons will invoke when processing queued books.
              </p>
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Individual Books Cron Default Scraper Engine</label>
            <p style={styles.fieldHint}>
              Used by <code>/api/cron/individual-content</code> to process individual books marked with the Auto-Cron flag.
            </p>
            <div style={styles.radioGrid}>
              <label
                style={{
                  ...styles.radioCard,
                  borderColor: settings.individualAiScraper === "deepseek" ? "#6366F1" : "#334155",
                  backgroundColor: settings.individualAiScraper === "deepseek" ? "rgba(99, 102, 241, 0.12)" : "#0F172A",
                }}
              >
                <input
                  type="radio"
                  name="individualAiScraper"
                  value="deepseek"
                  checked={settings.individualAiScraper === "deepseek"}
                  onChange={() => setSettings({ ...settings, individualAiScraper: "deepseek" })}
                  style={{ cursor: "pointer" }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: "#F8FAFC", fontSize: "0.95rem" }}>
                    🐋 DeepSeek Scraper (Recommended)
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: "0.8rem", marginTop: "2px" }}>
                    Uses chat.deepseek.com with persistent headless session. Fast and high quality Markdown output.
                  </div>
                </div>
              </label>

              <label
                style={{
                  ...styles.radioCard,
                  borderColor: settings.individualAiScraper === "chatgpt" ? "#10A37F" : "#334155",
                  backgroundColor: settings.individualAiScraper === "chatgpt" ? "rgba(16, 163, 127, 0.12)" : "#0F172A",
                }}
              >
                <input
                  type="radio"
                  name="individualAiScraper"
                  value="chatgpt"
                  checked={settings.individualAiScraper === "chatgpt"}
                  onChange={() => setSettings({ ...settings, individualAiScraper: "chatgpt" })}
                  style={{ cursor: "pointer" }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: "#F8FAFC", fontSize: "0.95rem" }}>
                    🟢 ChatGPT Scraper
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: "0.8rem", marginTop: "2px" }}>
                    Uses chatgpt.com via logged-in persistent profile.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div style={{ ...styles.fieldGroup, marginTop: "24px" }}>
            <label style={styles.label}>Multi-Book Syntheses Cron Default Scraper Engine</label>
            <p style={styles.fieldHint}>
              Used by <code>/api/cron/multibook-content</code> to process top combine summaries marked with the Auto-Cron flag.
            </p>
            <div style={styles.radioGrid}>
              <label
                style={{
                  ...styles.radioCard,
                  borderColor: settings.multibookAiScraper === "deepseek" ? "#6366F1" : "#334155",
                  backgroundColor: settings.multibookAiScraper === "deepseek" ? "rgba(99, 102, 241, 0.12)" : "#0F172A",
                }}
              >
                <input
                  type="radio"
                  name="multibookAiScraper"
                  value="deepseek"
                  checked={settings.multibookAiScraper === "deepseek"}
                  onChange={() => setSettings({ ...settings, multibookAiScraper: "deepseek" })}
                  style={{ cursor: "pointer" }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: "#F8FAFC", fontSize: "0.95rem" }}>
                    🐋 DeepSeek Scraper (Recommended)
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: "0.8rem", marginTop: "2px" }}>
                    High context-window multi-book synthesis generator.
                  </div>
                </div>
              </label>

              <label
                style={{
                  ...styles.radioCard,
                  borderColor: settings.multibookAiScraper === "chatgpt" ? "#10A37F" : "#334155",
                  backgroundColor: settings.multibookAiScraper === "chatgpt" ? "rgba(16, 163, 127, 0.12)" : "#0F172A",
                }}
              >
                <input
                  type="radio"
                  name="multibookAiScraper"
                  value="chatgpt"
                  checked={settings.multibookAiScraper === "chatgpt"}
                  onChange={() => setSettings({ ...settings, multibookAiScraper: "chatgpt" })}
                  style={{ cursor: "pointer" }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: "#F8FAFC", fontSize: "0.95rem" }}>
                    🟢 ChatGPT Scraper
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: "0.8rem", marginTop: "2px" }}>
                    OpenAI web interface via persistent headless profile.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...styles.submitBtn,
                opacity: saving ? 0.7 : 1,
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? "Saving Settings..." : "💾 Save Settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
  },
  header: {
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
  alert: {
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "0.9rem",
    border: "1px solid",
  },
  formCard: {
    backgroundColor: "#1E293B",
    borderRadius: "12px",
    border: "1px solid #334155",
    padding: "24px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    paddingBottom: "16px",
    borderBottom: "1px solid #334155",
    marginBottom: "20px",
  },
  sectionTitle: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "#F8FAFC",
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: "0.82rem",
    color: "#94A3B8",
    margin: "4px 0 0 0",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#F8FAFC",
  },
  fieldHint: {
    fontSize: "0.78rem",
    color: "#94A3B8",
    margin: "0 0 8px 0",
  },
  radioGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  radioCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "14px 16px",
    borderRadius: "8px",
    border: "1px solid",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  submitBtn: {
    backgroundColor: "#3B82F6",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "10px 24px",
    fontWeight: 600,
    fontSize: "0.92rem",
    boxShadow: "0 4px 14px rgba(59, 130, 246, 0.3)",
  },
};
