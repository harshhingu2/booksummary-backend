import React from "react";
import AdminSessionProvider from "@/components/AdminSessionProvider";
import AdminShell from "@/components/AdminShell";

export const metadata = {
  title: "Admin Panel - DumbScroll",
  description: "Admin panel for DumbScroll book summary backend",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSessionProvider>
      <AdminShell>{children}</AdminShell>
    </AdminSessionProvider>
  );
}
