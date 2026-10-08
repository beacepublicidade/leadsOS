"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { GlobalInputFormatter } from "@/components/ui/GlobalInputFormatter";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <GlobalInputFormatter />
      <div className="dashboard-layout">
        <Sidebar />
        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
