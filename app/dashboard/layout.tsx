"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Open by default on desktop, closed on mobile
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
        .dash-mobile-logo {
          display: flex; align-items: center; gap: 8px;
          font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 800;
          color: #e4e4e7; text-decoration: none;
        }
        .dash-mobile-logo span { color: #a78bfa; }

        /* sidebar slot: takes real width on desktop, zero on mobile */
        .sidebar-slot { flex-shrink: 0; }
        @media (max-width: 1023px) {
          .dash-mobile-bar { display: flex; }
          .sidebar-slot { width: 0 !important; overflow: visible; }
        }
      `}</style>

      <div style={{ display: "flex", height: "100vh", background: "#09090c", overflow: "hidden", color: "#e4e4e7" }}>

        {/* Sidebar — zero-width slot on mobile so it never pushes content */}
        <div className="sidebar-slot">
          <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />
        </div>

        {/* Main content column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

          {/* Mobile top bar */}
          <div className="dash-mobile-bar">
            <button className="dash-hamburger" onClick={() => setSidebarOpen(v => !v)} aria-label="Open menu">
              <Menu style={{ width: 16, height: 16 }} />
            </button>
            <Link href="/dashboard" className="dash-mobile-logo">
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src="/NeuroFlow_AI_Logo.png" alt="Logo" style={{ height: 14, width: "auto" }} />
              </div>
              Neuro<span>Flow</span>
            </Link>
          </div>

          {/* Page content */}
          <main style={{ flex: 1, overflowY: "auto" }}>
            {children}
          </main>

        </div>
      </div>
    </>
  );
}