"use client";

import React, { useState, useEffect } from "react";

type ScraperEngine = "deepseek" | "chatgpt" | "gemini";

interface GeminiAccountItem {
  id: string;
  label: string;
  apiKey: string;
  model: string;
  isActive: boolean;
}

interface SettingsState {
  defaultAiScraper: ScraperEngine;
  individualAiScraper: ScraperEngine;
  individualCronBatchSize: number;
  individualCronMinDelaySeconds: number;
  individualCronMaxDelaySeconds: number;
  multibookAiScraper: ScraperEngine;
  multibookCronBatchSize: number;
  multibookCronMinDelaySeconds: number;
  multibookCronMaxDelaySeconds: number;
  geminiConcurrencyLimit: number;
  geminiTotalBooksLimit: number;
  geminiAccounts: GeminiAccountItem[];
  audioVoice: string;
  audioRate: string;
  audioPitch: string;
  audioConcurrency: number;
  audioBatchSize: number;
  showAudio: boolean;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    defaultAiScraper: "deepseek",
    individualAiScraper: "deepseek",
    individualCronBatchSize: 5,
    individualCronMinDelaySeconds: 30,
    individualCronMaxDelaySeconds: 150,
    multibookAiScraper: "deepseek",
    multibookCronBatchSize: 5,
    multibookCronMinDelaySeconds: 30,
    multibookCronMaxDelaySeconds: 150,
    geminiConcurrencyLimit: 2,
    geminiTotalBooksLimit: 10,
    geminiAccounts: [
      { id: "acc-1", label: "Account 1", apiKey: "", model: "gemini-2.5-flash", isActive: true },
      { id: "acc-2", label: "Account 2", apiKey: "", model: "gemini-2.5-flash", isActive: true },
    ],
    audioVoice: "en-US-ChristopherNeural",
    audioRate: "-4%",
    audioPitch: "-2Hz",
    audioConcurrency: 3,
    audioBatchSize: 10,
    showAudio: true,
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
          individualCronBatchSize: Number(data.settings.individualCronBatchSize) || 5,
          individualCronMinDelaySeconds: Number(data.settings.individualCronMinDelaySeconds) ?? 30,
          individualCronMaxDelaySeconds: Number(data.settings.individualCronMaxDelaySeconds) ?? 150,
          multibookAiScraper: data.settings.multibookAiScraper || "deepseek",
          multibookCronBatchSize: Number(data.settings.multibookCronBatchSize) || 5,
          multibookCronMinDelaySeconds: Number(data.settings.multibookCronMinDelaySeconds) ?? 30,
          multibookCronMaxDelaySeconds: Number(data.settings.multibookCronMaxDelaySeconds) ?? 150,
          geminiConcurrencyLimit: Number(data.settings.geminiConcurrencyLimit) || 2,
          geminiTotalBooksLimit: Number(data.settings.geminiTotalBooksLimit) || 10,
          showAudio: data.settings.showAudio !== false,
          geminiAccounts: Array.isArray(data.settings.geminiAccounts) && data.settings.geminiAccounts.length > 0
            ? data.settings.geminiAccounts
            : [
                { id: "acc-1", label: "Account 1", apiKey: "", model: "gemini-2.5-flash", isActive: true },
                { id: "acc-2", label: "Account 2", apiKey: "", model: "gemini-2.5-flash", isActive: true },
              ],
          audioVoice: data.settings.audioVoice || "en-US-ChristopherNeural",
          audioRate: data.settings.audioRate || "-4%",
          audioPitch: data.settings.audioPitch || "-2Hz",
          audioConcurrency: Number(data.settings.audioConcurrency) || 3,
          audioBatchSize: Number(data.settings.audioBatchSize) || 10,
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

              <label
                style={{
                  ...styles.radioCard,
                  borderColor: settings.individualAiScraper === "gemini" ? "#38BDF8" : "#334155",
                  backgroundColor: settings.individualAiScraper === "gemini" ? "rgba(56, 189, 248, 0.12)" : "#0F172A",
                }}
              >
                <input
                  type="radio"
                  name="individualAiScraper"
                  value="gemini"
                  checked={settings.individualAiScraper === "gemini"}
                  onChange={() => setSettings({ ...settings, individualAiScraper: "gemini" })}
                  style={{ cursor: "pointer" }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: "#F8FAFC", fontSize: "0.95rem" }}>
                    ✨ Gemini API (Zero RAM)
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: "0.8rem", marginTop: "2px" }}>
                    Uses official Google Gemini API with multi-account rotation &amp; concurrency. No browser/CAPTCHAs.
                  </div>
                </div>
              </label>
            </div>

            <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <label style={{ fontSize: "0.85rem", color: "#CBD5E1", fontWeight: 600 }}>
                Stop Cron After (Execution Limit / Batch Size):
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.individualCronBatchSize}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    individualCronBatchSize: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
                style={{
                  width: "90px",
                  padding: "6px 10px",
                  backgroundColor: "#0F172A",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  color: "#F8FAFC",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              />
              <span style={{ fontSize: "0.8rem", color: "#64748B" }}>
                (Processes first X books from queue and stops. Next run continues with the remaining)
              </span>
            </div>

            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "10px 14px", backgroundColor: "rgba(15, 23, 42, 0.6)", borderRadius: "8px", border: "1px solid #1E293B" }}>
              <label style={{ fontSize: "0.85rem", color: "#38BDF8", fontWeight: 600 }}>
                Anti-Bot Random Delay Range (between scrapes):
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.8rem", color: "#94A3B8" }}>Min:</span>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={settings.individualCronMinDelaySeconds}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      individualCronMinDelaySeconds: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  style={{
                    width: "75px",
                    padding: "6px 10px",
                    backgroundColor: "#0F172A",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    color: "#F8FAFC",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: "0.8rem", color: "#94A3B8" }}>s</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.8rem", color: "#94A3B8" }}>Max:</span>
                <input
                  type="number"
                  min={10}
                  max={600}
                  value={settings.individualCronMaxDelaySeconds}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      individualCronMaxDelaySeconds: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  style={{
                    width: "75px",
                    padding: "6px 10px",
                    backgroundColor: "#0F172A",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    color: "#F8FAFC",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: "0.8rem", color: "#94A3B8" }}>s</span>
              </div>
              <span style={{ fontSize: "0.78rem", color: "#64748B" }}>
                (Default: 30s to 150s [2.5 mins]. Randomized intervals mimic human browsing & bypass bot detection)
              </span>
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

              <label
                style={{
                  ...styles.radioCard,
                  borderColor: settings.multibookAiScraper === "gemini" ? "#38BDF8" : "#334155",
                  backgroundColor: settings.multibookAiScraper === "gemini" ? "rgba(56, 189, 248, 0.12)" : "#0F172A",
                }}
              >
                <input
                  type="radio"
                  name="multibookAiScraper"
                  value="gemini"
                  checked={settings.multibookAiScraper === "gemini"}
                  onChange={() => setSettings({ ...settings, multibookAiScraper: "gemini" })}
                  style={{ cursor: "pointer" }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: "#F8FAFC", fontSize: "0.95rem" }}>
                    ✨ Gemini API (Zero RAM)
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: "0.8rem", marginTop: "2px" }}>
                    Uses official Google Gemini API with multi-account rotation &amp; concurrency. No browser/CAPTCHAs.
                  </div>
                </div>
              </label>
            </div>

            <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <label style={{ fontSize: "0.85rem", color: "#CBD5E1", fontWeight: 600 }}>
                Stop Cron After (Execution Limit / Batch Size):
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.multibookCronBatchSize}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    multibookCronBatchSize: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
                style={{
                  width: "90px",
                  padding: "6px 10px",
                  backgroundColor: "#0F172A",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  color: "#F8FAFC",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              />
              <span style={{ fontSize: "0.8rem", color: "#64748B" }}>
                (Processes first X syntheses from queue and stops. Next run continues with the remaining)
              </span>
            </div>

            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "10px 14px", backgroundColor: "rgba(15, 23, 42, 0.6)", borderRadius: "8px", border: "1px solid #1E293B" }}>
              <label style={{ fontSize: "0.85rem", color: "#A78BFA", fontWeight: 600 }}>
                Anti-Bot Random Delay Range (between scrapes):
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.8rem", color: "#94A3B8" }}>Min:</span>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={settings.multibookCronMinDelaySeconds}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      multibookCronMinDelaySeconds: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  style={{
                    width: "75px",
                    padding: "6px 10px",
                    backgroundColor: "#0F172A",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    color: "#F8FAFC",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: "0.8rem", color: "#94A3B8" }}>s</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.8rem", color: "#94A3B8" }}>Max:</span>
                <input
                  type="number"
                  min={10}
                  max={600}
                  value={settings.multibookCronMaxDelaySeconds}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      multibookCronMaxDelaySeconds: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  style={{
                    width: "75px",
                    padding: "6px 10px",
                    backgroundColor: "#0F172A",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    color: "#F8FAFC",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: "0.8rem", color: "#94A3B8" }}>s</span>
              </div>
              <span style={{ fontSize: "0.78rem", color: "#64748B" }}>
                (Default: 30s to 150s. Randomized pauses between processing queued syntheses)
              </span>
            </div>
          </div>

          {/* Gemini API Configuration */}
          <div style={{ ...styles.fieldGroup, marginTop: "28px", paddingTop: "24px", borderTop: "1px solid #334155" }}>
            <label style={styles.label}>✨ Gemini API Configuration (Free Tier &amp; Multi-Account)</label>
            <p style={styles.fieldHint}>
              Used when <strong>Gemini API</strong> is selected above. Active accounts are rotated round-robin. No Chromium RAM or CAPTCHAs.
            </p>

            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <label style={{ fontSize: "0.85rem", color: "#CBD5E1", fontWeight: 600 }}>
                  Concurrent Requests Limit:
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.geminiConcurrencyLimit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      geminiConcurrencyLimit: Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)),
                    })
                  }
                  style={{
                    width: "80px",
                    padding: "6px 10px",
                    backgroundColor: "#0F172A",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    color: "#F8FAFC",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <label style={{ fontSize: "0.85rem", color: "#CBD5E1", fontWeight: 600 }}>
                  Total Books Limit (Gemini only):
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.geminiTotalBooksLimit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      geminiTotalBooksLimit: Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)),
                    })
                  }
                  style={{
                    width: "80px",
                    padding: "6px 10px",
                    backgroundColor: "#0F172A",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    color: "#F8FAFC",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {settings.geminiAccounts.map((acc, idx) => (
                <div
                  key={acc.id || idx}
                  style={{
                    padding: "14px",
                    backgroundColor: "#0F172A",
                    border: "1px solid #334155",
                    borderRadius: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        type="checkbox"
                        checked={acc.isActive !== false}
                        onChange={(e) => {
                          const updated = [...settings.geminiAccounts];
                          updated[idx] = { ...acc, isActive: e.target.checked };
                          setSettings({ ...settings, geminiAccounts: updated });
                        }}
                        title="Enable/disable this account"
                      />
                      <input
                        type="text"
                        value={acc.label}
                        placeholder={`Account ${idx + 1}`}
                        onChange={(e) => {
                          const updated = [...settings.geminiAccounts];
                          updated[idx] = { ...acc, label: e.target.value };
                          setSettings({ ...settings, geminiAccounts: updated });
                        }}
                        style={{
                          padding: "6px 10px",
                          backgroundColor: "#1E293B",
                          border: "1px solid #334155",
                          borderRadius: "6px",
                          color: "#F8FAFC",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          width: "160px",
                        }}
                      />
                    </div>
                    {settings.geminiAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = settings.geminiAccounts.filter((_, i) => i !== idx);
                          setSettings({ ...settings, geminiAccounts: updated });
                        }}
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.15)",
                          color: "#FCA5A5",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <input
                      type="password"
                      value={acc.apiKey}
                      placeholder="Gemini API Key (AIza...)"
                      onChange={(e) => {
                        const updated = [...settings.geminiAccounts];
                        updated[idx] = { ...acc, apiKey: e.target.value };
                        setSettings({ ...settings, geminiAccounts: updated });
                      }}
                      style={{
                        flex: 1,
                        minWidth: "240px",
                        padding: "8px 10px",
                        backgroundColor: "#1E293B",
                        border: "1px solid #334155",
                        borderRadius: "6px",
                        color: "#F8FAFC",
                        fontSize: "0.85rem",
                      }}
                    />
                    <select
                      value={acc.model}
                      onChange={(e) => {
                        const updated = [...settings.geminiAccounts];
                        updated[idx] = { ...acc, model: e.target.value };
                        setSettings({ ...settings, geminiAccounts: updated });
                      }}
                      style={{
                        width: "260px",
                        padding: "8px 10px",
                        backgroundColor: "#1E293B",
                        border: "1px solid #334155",
                        borderRadius: "6px",
                        color: "#F8FAFC",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview — Best quality (~50–100/day free)</option>
                      <option value="gemini-3-flash-preview">gemini-3-flash-preview — Medium quality (~250–1,500/day free)</option>
                      <option value="gemini-2.5-flash">gemini-2.5-flash — Legacy Flash (~250–1,500/day free)</option>
                      <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite — Fast / Basic quality (~1,000+/day free)</option>
                    </select>
                  </div>
                </div>
              ))}

              <div>
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = settings.geminiAccounts.length + 1;
                    setSettings({
                      ...settings,
                      geminiAccounts: [
                        ...settings.geminiAccounts,
                        {
                          id: `acc-${Date.now()}`,
                          label: `Account ${nextNum}`,
                          apiKey: "",
                          model: "gemini-2.5-flash",
                          isActive: true,
                        },
                      ],
                    });
                  }}
                  style={{
                    backgroundColor: "rgba(56, 189, 248, 0.15)",
                    color: "#38BDF8",
                    border: "1px solid rgba(56, 189, 248, 0.35)",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Add Gemini Account
                </button>
              </div>
            </div>
          </div>

          {/* Audio Generation Settings */}
          <div style={{ ...styles.card, marginTop: "24px" }}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>🎧 Audio Generation (Microsoft Edge Neural TTS)</h2>
                <p style={styles.sectionSubtitle}>
                  Configure voice, speed, pitch, and parallel concurrency for automated book audio generation.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Narrator Voice</label>
                <p style={styles.fieldHint}>ChristopherNeural is recommended for non-fiction audiobooks.</p>
                <select
                  value={settings.audioVoice}
                  onChange={(e) => setSettings({ ...settings, audioVoice: e.target.value })}
                  style={{
                    backgroundColor: "#0F172A",
                    color: "#F8FAFC",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "0.9rem",
                  }}
                >
                  <option value="en-US-ChristopherNeural">en-US-ChristopherNeural (Best - Deep Male Narrator)</option>
                  <option value="en-US-EricNeural">en-US-EricNeural (Modern Male Podcast)</option>
                  <option value="en-US-GuyNeural">en-US-GuyNeural (Warm Male)</option>
                  <option value="en-US-JennyNeural">en-US-JennyNeural (Clear Female)</option>
                  <option value="en-GB-RyanNeural">en-GB-RyanNeural (British Male)</option>
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Concurrent Workers (1–5)</label>
                <p style={styles.fieldHint}>How many books to generate in parallel per Audio Cron batch.</p>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.audioConcurrency}
                  onChange={(e) =>
                    setSettings({ ...settings, audioConcurrency: Math.max(1, Number(e.target.value) || 1) })
                  }
                  style={{
                    backgroundColor: "#0F172A",
                    color: "#F8FAFC",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Speech Rate Adjustment</label>
                <p style={styles.fieldHint}>e.g. -4% (relaxed audiobook pace), 0% (default)</p>
                <input
                  type="text"
                  value={settings.audioRate}
                  onChange={(e) => setSettings({ ...settings, audioRate: e.target.value })}
                  placeholder="-4%"
                  style={{
                    backgroundColor: "#0F172A",
                    color: "#F8FAFC",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Pitch Adjustment</label>
                <p style={styles.fieldHint}>e.g. -2Hz (slightly deeper), 0Hz (natural)</p>
                <input
                  type="text"
                  value={settings.audioPitch}
                  onChange={(e) => setSettings({ ...settings, audioPitch: e.target.value })}
                  placeholder="-2Hz"
                  style={{
                    backgroundColor: "#0F172A",
                    color: "#F8FAFC",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Batch Size per Cron Run</label>
                <p style={styles.fieldHint}>Max books processed each time the Audio Cron runs.</p>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={settings.audioBatchSize}
                  onChange={(e) =>
                    setSettings({ ...settings, audioBatchSize: Math.max(1, Number(e.target.value) || 1) })
                  }
                  style={{
                    backgroundColor: "#0F172A",
                    color: "#F8FAFC",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "0.9rem",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Global Audio Visibility Toggle */}
          <div style={{ ...styles.fieldGroup, marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #334155" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.showAudio}
                onChange={(e) => setSettings({ ...settings, showAudio: e.target.checked })}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <div>
                <div style={{ fontWeight: 700, color: "#F8FAFC", fontSize: "0.95rem" }}>
                  🔊 Show Audio (Global Toggle)
                </div>
                <div style={{ color: "#94A3B8", fontSize: "0.8rem", marginTop: "2px" }}>
                  On by default. Turn off to hide all audio across the app.
                </div>
              </div>
            </label>
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
