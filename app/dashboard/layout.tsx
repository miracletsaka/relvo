"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, Bell, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { logoutUser } from "@/lib/api";

type TopNavItem = {
  label: string;
  href: string;
  key: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // mobile top nav drawer
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // simple dropdown
  const [profileOpen, setProfileOpen] = useState(false);

  const router = useRouter();

  const navItems: TopNavItem[] = useMemo(
    () => [
      { key: "overview", label: "Overview", href: "/dashboard" },
      { key: "scheduled", label: "Scheduled", href: "https://publish.buffer.com/all-channels/calendar/week?status=scheduled" },
      { key: "published", label: "Published", href: "/dashboard/published" },
      { key: "failed", label: "Failed", href: "/dashboard/failed" },
      { key: "platforms", label: "Platforms", href: "/dashboard/platforms" },
      { key: "brands", label: "Manage brand Profile", href: "/dashboard/settings/brand-profile" },
    ],
    []
  );

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/dashboard/";
    return pathname?.startsWith(href);
  };

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden font-sans text-gray-900">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 w-full lg:w-auto">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>

      {/* Click-out overlays (simple) */}
      {(mobileNavOpen || profileOpen) && (
        <button
          aria-label="Close menus"
          className="fixed inset-0 z-30 bg-black/0 cursor-default"
          onClick={() => {
            setMobileNavOpen(false);
            setProfileOpen(false);
          }}
        />
      )}
    </div>
  );
}
