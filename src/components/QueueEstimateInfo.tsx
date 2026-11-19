"use client";

import React, { useState } from "react";
import { QueueEstimation, calculateQueueEstimate } from "@/lib/queueEstimation";

interface QueueEstimateInfoProps {
  queueCount: number;
  batchLimit: number;
  cronSchedule: string;
  isCronActive: boolean;
  title?: string;
  itemLabel?: string;
  style?: React.CSSProperties;
}

export default function QueueEstimateInfo({
  queueCount,
  batchLimit,
  cronSchedule,
  isCronActive,
  title = "AI Queue Completion Estimate",
  itemLabel = "books",
  style,
}: QueueEstimateInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customSelectedCount, setCustomSelectedCount] = useState<number | "">("");

  // Target count for calculation: custom selected number if user wants to test a specific batch, otherwise actual queueCount
  const effectiveCount = customSelectedCount !== "" && !isNaN(Number(customSelectedCount))
    ? Math.max(0, Number(customSelectedCount))
    : queueCount;

  const estimate: QueueEstimation = calculateQueueEstimate(
    effectiveCount,
    batchLimit,
    cronSchedule,
    isCronActive
  );

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", ...style }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Click to view AI Queue Completion time calculation"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 11px",
          backgroundColor: isOpen ? "rgba(99, 102, 241, 0.25)" : "rgba(30, 41, 59, 0.9)",
          border: isOpen ? "1px solid #818CF8" : "1px solid #475569",
          borderRadius: "8px",
          color: "#E2E8F0",
          fontSize: "0.8rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            backgroundColor: "#4F46E5",
            color: "#FFFFFF",
            fontSize: "0.72rem",
            fontWeight: "bold",
          }}
        >
          ℹ️
        </span>
        <span>
          AI Queue: <strong style={{ color: "#38BDF8" }}>{queueCount}</strong> {itemLabel}
        </span>
        {queueCount > 0 && (
          <span style={{ color: isCronActive ? "#34D399" : "#FBBF24", fontSize: "0.75rem", marginLeft: "4px" }}>
            (takes {estimate.durationText}{!isCronActive ? " • paused" : ""})
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay to close when clicking outside */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
            }}
          />

          {/* Modal Popover */}
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              zIndex: 9999,
              width: "380px",
              maxWidth: "92vw",
              backgroundColor: "#0F172A",
              border: "1px solid #3B82F6",
              borderRadius: "12px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)",
              padding: "18px 20px",
              color: "#F8FAFC",
              fontSize: "0.85rem",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>⏱️</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#F8FAFC" }}>
                    {title}
                  </h4>
                  <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>
                    Automated Scraping Completion Forecast
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  lineHeight: 1,
                  padding: "2px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Custom Selected Count Calculator Input */}
            <div
              style={{
                backgroundColor: "rgba(30, 41, 59, 0.7)",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "10px 12px",
                marginBottom: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "0.78rem", color: "#CBD5E1", fontWeight: 600 }}>
                  Calculate for Selected / Custom Amount:
                </label>
                {customSelectedCount !== "" && (
                  <button
                    type="button"
                    onClick={() => setCustomSelectedCount("")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#38BDF8",
                      fontSize: "0.72rem",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Reset to Total ({queueCount})
                  </button>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                <input
                  type="number"
                  min={1}
                  placeholder={`Current queue: ${queueCount} ${itemLabel}`}
                  value={customSelectedCount}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustomSelectedCount(v === "" ? "" : Math.max(0, parseInt(v, 10) || 0));
                  }}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    backgroundColor: "#0F172A",
                    border: "1px solid #475569",
                    borderRadius: "6px",
                    color: "#F8FAFC",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: "0.78rem", color: "#94A3B8", whiteSpace: "nowrap" }}>
                  {itemLabel} selected
                </span>
              </div>
            </div>

            {/* Completion Duration Highlight Box */}
            <div
              style={{
                backgroundColor: !isCronActive ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.12)",
                border: !isCronActive ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "14px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.5px", color: !isCronActive ? "#FCD34D" : "#6EE7B7", fontWeight: 700 }}>
                Estimated Time to Complete ({effectiveCount} {itemLabel})
              </div>
              <div
                style={{
                  fontSize: "1.45rem",
                  fontWeight: 800,
                  color: !isCronActive ? "#FBBF24" : "#34D399",
                  marginTop: "4px",
                }}
              >
                {estimate.durationText}
              </div>
              {!isCronActive ? (
                <div style={{ fontSize: "0.75rem", color: "#FCD34D", marginTop: "4px" }}>
                  ⏸️ Cron is currently <strong>Paused</strong>. Once unpaused, it will take <strong>{estimate.durationText}</strong> to finish this amount.
                </div>
              ) : (
                <div style={{ fontSize: "0.75rem", color: "#6EE7B7", marginTop: "4px" }}>
                  🟢 Cron is <strong>Active</strong> and running on schedule.
                </div>
              )}
            </div>

            {/* Formula & Calculation breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px", fontSize: "0.82rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1E293B", paddingBottom: "6px" }}>
                <span style={{ color: "#94A3B8" }}>Selected for Processing:</span>
                <span style={{ fontWeight: 700, color: "#38BDF8" }}>
                  {effectiveCount} {itemLabel} {customSelectedCount !== "" ? "(custom)" : "(total queue)"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1E293B", paddingBottom: "6px" }}>
                <span style={{ color: "#94A3B8" }}>Stop Limit per Cron Run (Batch):</span>
                <span style={{ fontWeight: 700, color: "#F8FAFC" }}>
                  {estimate.batchLimit} {itemLabel}/run
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1E293B", paddingBottom: "6px" }}>
                <span style={{ color: "#94A3B8" }}>Cron Frequency:</span>
                <span style={{ fontWeight: 600, color: "#F8FAFC", textAlign: "right", maxWidth: "180px" }}>
                  {estimate.cronIntervalDescription}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1E293B", paddingBottom: "6px" }}>
                <span style={{ color: "#94A3B8" }}>Total Cron Executions Required:</span>
                <span style={{ fontWeight: 700, color: "#FBBF24" }}>
                  {estimate.totalCronRunsNeeded} runs
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1E293B", paddingBottom: "6px" }}>
                <span style={{ color: "#94A3B8" }}>Processing Throughput:</span>
                <span style={{ fontWeight: 700, color: "#A78BFA" }}>
                  ~{estimate.itemsPerDay} {itemLabel}/day
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "4px" }}>
                <span style={{ color: "#94A3B8" }}>Anti-Bot Delays:</span>
                <span style={{ fontWeight: 600, color: "#38BDF8" }}>
                  Random 30s – 2.5m gap
                </span>
              </div>
            </div>

            {/* Note / Info footer */}
            <div
              style={{
                fontSize: "0.75rem",
                color: "#94A3B8",
                backgroundColor: "rgba(30, 41, 59, 0.7)",
                borderRadius: "6px",
                padding: "8px 10px",
                lineHeight: 1.4,
              }}
            >
              💡 <strong>Accurate Time Span:</strong> Even if your cron is temporarily paused, this calculation gives you the exact time span (in minutes, hours, or days) it will take to complete once it runs.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
