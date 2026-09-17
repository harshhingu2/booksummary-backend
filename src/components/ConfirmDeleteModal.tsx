"use client";

import React from "react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  itemName?: string;
  message?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({
  isOpen,
  title = "Confirm Deletion",
  itemName,
  message,
  isDeleting = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "#1E293B",
          border: "1px solid #334155",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "420px",
          padding: "22px 24px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)",
          animation: "scaleUp 0.15s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "16px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              flexShrink: 0,
            }}
          >
            ⚠️
          </div>
          <div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "1.15rem", fontWeight: 700, color: "#F8FAFC" }}>
              {title}
            </h3>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#94A3B8", lineHeight: 1.45 }}>
              {message || (
                <>
                  Are you sure you want to permanently delete{" "}
                  {itemName ? <strong style={{ color: "#F8FAFC" }}>&ldquo;{itemName}&rdquo;</strong> : "this item"}? This action cannot be undone.
                </>
              )}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "22px" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              backgroundColor: "transparent",
              border: "1px solid #475569",
              color: "#CBD5E1",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: isDeleting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              backgroundColor: "#DC2626",
              border: "none",
              color: "#FFFFFF",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: isDeleting ? "wait" : "pointer",
              boxShadow: "0 2px 8px rgba(220, 38, 38, 0.4)",
              opacity: isDeleting ? 0.7 : 1,
            }}
          >
            {isDeleting ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
