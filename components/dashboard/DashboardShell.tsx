"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 1024);
  }, []);

  return (
    <>
      <style>{`
        .dash-mobile-bar {
          display: none;
          position: sticky; top: 0; z-index: 40;
          height: 52px;
          background: #0e0e12;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 0 16px;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .dash-hamburger {
          width: 34px; height: 34px; border-radius: 9px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
          color: rgba(255,255,255,0.6); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: background 0.15s;
        }
        .dash-hamburger:hover { background: rgba(255,255,255,0.1); }
        .sidebar-slot { flex-shrink: 0; }
        @media (max-width: 1023px) {
          .dash-mobile-bar { display: flex; }
          .sidebar-slot { width: 0 !important; overflow: visible; }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          height: "100vh",
          background: "#09090c",
          overflow: "hidden",
          color: "#e4e4e7",
        }}
      >
        <div className="sidebar-slot">
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((v) => !v)}
          />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div className="dash-mobile-bar">
            <button
              className="dash-hamburger"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Open menu"
            >
              <Menu style={{ width: 16, height: 16 }} />
            </button>
          </div>

          <main style={{ flex: 1, overflowY: "auto" }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}