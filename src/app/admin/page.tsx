"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    usersCount: 0,
    adminCount: 0,
    editorCount: 0,
    cacheKeysCount: 0,
    booksCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const [usersRes, cacheRes, booksRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/cache"),
          fetch("/api/admin/books"),
        ]);

        const usersData = await usersRes.json();
        const cacheData = await cacheRes.json();
        const booksData = await booksRes.json();

        const users = usersData.users || [];
        const adminUsers = users.filter((u: any) => u.role?.toUpperCase() === "ADMIN");
        const editorUsers = users.filter((u: any) => u.role?.toUpperCase() === "EDITOR");

        setStats({
          usersCount: users.length,
          adminCount: adminUsers.length,
          editorCount: editorUsers.length,
          cacheKeysCount: cacheData.stats?.activeKeys || 0,
          booksCount: booksData.count || 0,
        });
      } catch (err) {
        console.error("Failed to load dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard Overview</h1>
          <p style={styles.subtitle}>System metrics and management quick links</p>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>👥</span>
            <span style={styles.cardTitle}>Total Users</span>
          </div>
          <div style={styles.cardValue}>{loading ? "..." : stats.usersCount}</div>
          <p style={styles.cardSubtext}>{stats.adminCount} Admins · {stats.editorCount} Editors</p>
          <Link href="/admin/users" style={styles.cardLink}>
            Manage Users →
          </Link>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>⚡</span>
            <span style={styles.cardTitle}>Active Cache Entries</span>
          </div>
          <div style={styles.cardValue}>{loading ? "..." : stats.cacheKeysCount}</div>
          <p style={styles.cardSubtext}>In-memory cached endpoints</p>
          <Link href="/admin/cache" style={styles.cardLink}>
            Purge & Revalidate →
          </Link>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>📚</span>
            <span style={styles.cardTitle}>Book Summaries</span>
          </div>
          <div style={styles.cardValue}>{loading ? "..." : stats.booksCount}</div>
          <p style={styles.cardSubtext}>Top combine book items</p>
          <Link href="/admin/books" style={styles.cardLink}>
            View Book Library →
          </Link>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>System Quick Actions</h2>
        <div style={styles.actionsGrid}>
          <Link href="/admin/users" style={styles.actionCard}>
            <h3>👤 Add New Admin or Editor</h3>
            <p>Create credentials for team members or standard users.</p>
          </Link>
          <Link href="/admin/cache" style={styles.actionCard}>
            <h3>🔥 Clear In-Memory Cache</h3>
            <p>Flush active cached API responses to force immediate database revalidation.</p>
          </Link>
          <Link href="/admin/books" style={styles.actionCard}>
            <h3>📖 Toggle Top Combine Books</h3>
            <p>Manage featured book summaries rendered on mobile apps & frontend endpoints.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    marginBottom: "32px",
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
    marginBottom: "40px",
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: "14px",
    padding: "24px",
    border: "1px solid #334155",
    display: "flex",
    flexDirection: "column",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
  },
  cardIcon: {
    fontSize: "1.5rem",
  },
  cardTitle: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  cardValue: {
    fontSize: "2.5rem",
    fontWeight: 800,
    color: "#F8FAFC",
    margin: "4px 0",
  },
  cardSubtext: {
    fontSize: "0.8rem",
    color: "#64748B",
    margin: "0 0 16px 0",
  },
  cardLink: {
    marginTop: "auto",
    fontSize: "0.875rem",
    color: "#60A5FA",
    textDecoration: "none",
    fontWeight: 600,
  },
  section: {
    backgroundColor: "#1E293B",
    borderRadius: "14px",
    padding: "28px",
    border: "1px solid #334155",
  },
  sectionTitle: {
    margin: "0 0 20px 0",
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#F8FAFC",
  },
  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
  },
  actionCard: {
    backgroundColor: "#0F172A",
    padding: "20px",
    borderRadius: "10px",
    border: "1px solid #334155",
    textDecoration: "none",
    color: "inherit",
    transition: "border-color 0.2s ease",
  },
};
