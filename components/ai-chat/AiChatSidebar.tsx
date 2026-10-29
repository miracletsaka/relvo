"use client";

import type { Brand } from "@/lib/api";
import type { Tone } from "@/lib/types";
import type { OrgCampaignData } from "@/lib/org-campaign-enricher";
import type { ChatThread } from "./types";

import {
  Check,
  ChevronDown,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";

import { logoutUser } from "@/lib/api";
import OrgSwitcher from "@/components/org/OrgSwitcher";

export default function AiChatSidebar({
  threads,
  selectedThreadId,
  brands,
  brandId,
  selectedBrand,
  selectedTone,
  orgData,
  running,
  currentUser,
  onNewChat,
  onOpenThread,
  onBrandChange,
}: {
  threads: ChatThread[];
  selectedThreadId: string | null;
  brands: Brand[];
  brandId: string;
  selectedBrand: Brand | null;
  selectedTone: Tone | null;
  orgData: OrgCampaignData | null;
  running: boolean;
  currentUser?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string | null;
  } | null;
  onNewChat: () => void;
  onOpenThread: (thread: ChatThread) => void;
  onBrandChange: (brandId: string) => void;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const userInitial =
    currentUser?.first_name?.charAt(0).toUpperCase() ||
    currentUser?.email?.charAt(0).toUpperCase() ||
    "?";

  const displayName = currentUser
    ? [currentUser.first_name, currentUser.last_name]
        .filter(Boolean)
        .join(" ") ||
      currentUser.email ||
      "User"
    : "User";

  const displayRole = currentUser?.role
    ? currentUser.role.charAt(0).toUpperCase() +
      currentUser.role.slice(1)
    : "Member";

  const SidebarContent = () => (
    <>
      {/* TOP */}
      <div className="flex flex-col gap-3 border-b border-black/5 p-4">
        <div className="flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Relvo"
              className="h-8 w-auto"
            />
            <span className="text-sm font-semibold tracking-tight text-gray-800">
              Relvo
            </span>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white/70 text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <OrgSwitcher
          apiBase={process.env.NEXT_PUBLIC_API_BASE!}
          collapsed={false}
          onCreateNew={() => {
            window.location.href = "/dashboard/organisations";
          }}
        />

        <button
          onClick={onNewChat}
          disabled={running}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500 to-indigo-500 px-4 text-sm font-medium text-white shadow-[0_8px_30px_rgba(124,58,237,0.28)] transition-all hover:scale-[1.01] hover:shadow-[0_10px_35px_rgba(124,58,237,0.38)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={15} />
          New Chat
        </button>
      </div>

      {/* BRAND */}
      {/* BRAND */}
<div className="px-4 pt-4">
  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
    Brand
  </label>

  <div className="relative">
    <button
      type="button"
      disabled={running}
      onClick={() => setBrandMenuOpen((v) => !v)}
      className="
        flex h-11 w-full items-center justify-between
        rounded-2xl border border-black/5
        bg-white/70 px-3
        shadow-sm backdrop-blur-xl
        transition-all duration-150
        hover:border-black/10 hover:bg-white
        disabled:cursor-not-allowed disabled:opacity-50
      "
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="
            flex h-7 w-7 shrink-0 items-center justify-center
            overflow-hidden rounded-[10px]
            border border-black/5
            bg-gradient-to-br from-violet-500 to-indigo-500
            text-[11px] font-bold text-white
          "
        >
          {(selectedBrand?.display_name || "B")
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="min-w-0 text-left">
          <div className="truncate text-[12px] font-medium text-gray-700">
            {selectedBrand?.display_name || "Select Brand"}
          </div>

          <div className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-gray-400">
            Active Brand
          </div>
        </div>
      </div>

      <ChevronDown
        className={`h-3.5 w-3.5 shrink-0 text-gray-300 transition-transform duration-200 ${
          brandMenuOpen ? "rotate-180" : ""
        }`}
      />
    </button>

    {brandMenuOpen && (
      <div
        className="
          absolute left-0 top-[calc(100%+8px)] z-[999]
          w-full overflow-hidden rounded-2xl
          border border-black/5
          bg-white/95 p-2
          shadow-[0_10px_30px_rgba(0,0,0,0.08)]
          backdrop-blur-xl
          animate-in fade-in zoom-in-95 duration-150
        "
      >
        <div
          className="
            px-2.5 pb-2 pt-1
            text-[9px] font-semibold uppercase
            tracking-[0.14em]
            text-gray-400
          "
        >
          Available Brands
        </div>

        <div className="max-h-[260px] overflow-y-auto">
          {brands.map((brand) => {
            const active = brand.id === brandId;

            return (
              <button
                key={brand.id}
                type="button"
                onClick={() => {
                  onBrandChange(brand.id);
                  setBrandMenuOpen(false);
                }}
                className="
                  flex w-full items-center justify-between gap-3
                  rounded-xl px-3 py-2.5
                  text-left
                  transition-all duration-150
                  hover:bg-black/[0.03]
                "
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className="
                      flex h-8 w-8 shrink-0 items-center justify-center
                      rounded-xl
                      bg-gradient-to-br from-violet-500 to-indigo-500
                      text-[11px] font-bold text-white
                    "
                  >
                    {(brand.display_name || brand.id)
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium text-gray-700">
                      {brand.display_name || brand.id}
                    </div>

                    <div className="mt-0.5 truncate text-[10px] text-gray-400">
                      Brand Workspace
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {active ? (
                    <Check className="h-3.5 w-3.5 text-violet-500" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    )}
  </div>
</div>

      {/* CHAT HISTORY */}
      <div className="px-4 pt-5">
        <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
          Chat History
        </label>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-4 py-3">
        {threads.map((thread) => {
          const isActive = selectedThreadId === thread.id;

          return (
            <button
              key={thread.id}
              onClick={() => {
                onOpenThread(thread);
                setMobileOpen(false);
              }}
              title={thread.title || "New chat"}
              className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                isActive
                  ? "border-violet-300/40 bg-white text-violet-700 shadow-[0_6px_20px_rgba(124,58,237,0.08)]"
                  : "border-black/5 bg-white/60 text-gray-600 hover:border-black/10 hover:bg-white hover:text-gray-900"
              }`}
            >
              <MessageCircle
                size={15}
                className={`shrink-0 ${
                  isActive
                    ? "text-violet-500"
                    : "text-gray-400 group-hover:text-gray-700"
                }`}
              />

              <span className="flex-1 truncate text-sm font-medium">
                {thread.title || "New chat"}
              </span>

              {isActive && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(124,58,237,0.7)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="border-t border-black/5 p-4">
        <div className="relative">
          {profileOpen && (
            <div className="absolute bottom-[calc(100%+10px)] left-0 right-0 overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-2xl">
              <a
                href="/dashboard/settings"
                className="block px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-black/[0.03]"
              >
                Settings
              </a>

              <div className="h-px bg-black/5" />

              <button
                onClick={async () => {
                  try {
                    await logoutUser();
                  } finally {
                    window.location.href = "/auth/login";
                  }
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          )}

          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-white/70 p-3 shadow-sm backdrop-blur-xl transition hover:bg-white"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-bold text-white shadow-[0_6px_20px_rgba(99,102,241,0.35)]">
              {userInitial}
            </div>

            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-semibold text-gray-800">
                {displayName}
              </div>

              <div className="truncate text-xs text-gray-500">
                {displayRole}
              </div>
            </div>

            <ChevronDown
              size={15}
              className={`shrink-0 text-gray-400 transition-transform ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-black/5 bg-[#f4f4f6]/80 px-4 backdrop-blur-2xl lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white/70 text-gray-700"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden h-screen w-[260px] shrink-0 flex-col overflow-hidden border-r border-[#e5e7eb] bg-[#f4f4f6] shadow-[4px_0_24px_rgba(0,0,0,0.04)] lg:flex">
        <SidebarContent />
      </aside>

      {/* MOBILE SIDEBAR */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <aside className="absolute left-0 top-0 flex h-full w-[88vw] max-w-[340px] flex-col overflow-hidden border-r border-white/40 bg-[#f4f4f6] shadow-[30px_0_80px_rgba(0,0,0,0.25)]">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}