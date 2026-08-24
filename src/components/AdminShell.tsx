"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/admin/login" || pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: "16px", color: "#94A3B8", fontSize: "0.9rem" }}>Loading session...</p>
      </div>
    );
  }

  const role = (session?.user as any)?.role?.toUpperCase();
  const isAllowed = role === "ADMIN" || role === "EDITOR";

  if (status === "unauthenticated" || !isAllowed) {
    if (typeof window !== "undefined") {
      router.push("/login");
    }
    return (
      <div style={styles.loadingContainer}>
        <p style={{ color: "#EF4444" }}>Access Denied. Redirecting to login...</p>
      </div>
    );
  }

  const navItems = [
    { label: "Dashboard", path: "/admin", icon: "📊" },
    { label: "Users", path: "/admin/users", icon: "👥" },
    { label: "Cache Revalidation", path: "/admin/cache", icon: "⚡" },
    { label: "Book Summaries", path: "/admin/books", icon: "📚" },
  ];

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logoBox}>
          <span style={styles.logoIcon}>📜</span>
          <div>
            <h1 style={styles.logoTitle}>DumbScroll</h1>
            <span style={styles.logoBadge}>{role} PORTAL</span>
          </div>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userProfile}>
            <div style={styles.avatar}>
              {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{session?.user?.name || "User"}</span>
              <span style={styles.userEmail}>{session?.user?.email || ""}</span>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={styles.mainContent}>{children}</main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  loadingContainer: {
    minHeight: "100vh",
    backgroundColor: "#0F172A",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid rgba(59, 130, 246, 0.2)",
    borderTopColor: "#3B82F6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  layout: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#0F172A",
    color: "#F8FAFC",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  sidebar: {
    width: "260px",
    backgroundColor: "#1E293B",
    borderRight: "1px solid #334155",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "24px 16px",
    position: "sticky",
    top: 0,
    height: "100vh",
  },
  logoBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    paddingBottom: "20px",
    borderBottom: "1px solid #334155",
    marginBottom: "24px",
  },
  logoIcon: {
    fontSize: "2rem",
  },
  logoTitle: {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#F8FAFC",
  },
  logoBadge: {
    fontSize: "0.7rem",
    color: "#60A5FA",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: 600,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    flex: 1,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    borderRadius: "8px",
    color: "#94A3B8",
    textDecoration: "none",
    fontSize: "0.9rem",
    fontWeight: 500,
    transition: "all 0.2s ease",
  },
  navItemActive: {
    backgroundColor: "#3B82F6",
    color: "#FFFFFF",
    fontWeight: 600,
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
  },
  sidebarFooter: {
    borderTop: "1px solid #334155",
    paddingTop: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  userProfile: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#3B82F6",
    color: "#FFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.9rem",
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  userName: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#F8FAFC",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
  userEmail: {
    fontSize: "0.72rem",
    color: "#64748B",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
  logoutButton: {
    width: "100%",
    padding: "8px",
    borderRadius: "6px",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#FCA5A5",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center",
  },
  mainContent: {
    flex: 1,
    padding: "36px 40px",
    overflowY: "auto",
  },
};
