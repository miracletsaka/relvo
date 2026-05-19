"use client";

import type { Brand } from "@/lib/api";
import type { Tone } from "@/lib/types";
import type { OrgCampaignData } from "@/lib/org-campaign-enricher";
import type { ChatThread } from "./types";
import { ChevronDown, LogOut, Plus, MessageCircle } from "lucide-react";
import { useState } from "react";
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

  const userInitial =
    currentUser?.first_name?.charAt(0).toUpperCase() ||
    currentUser?.email?.charAt(0).toUpperCase() ||
    "?";

  const displayName = currentUser
    ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ") ||
      currentUser.email ||
      "User"
    : "User";

  const displayRole = currentUser?.role
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
    : "Member";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .aic-sb {
          font-family: 'Inter', sans-serif;
          width: 240px;
          flex-shrink: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;

          background: #f4f4f6;
          backdrop-filter: blur(40px) saturate(200%) brightness(1.05);
          -webkit-backdrop-filter: blur(40px) saturate(200%) brightness(1.05);
          border-right: 1px solid #e4e4e8;
          box-shadow:
            4px 0 24px rgba(0, 0, 0, 0.06),
            inset -1px 0 0 rgba(255, 255, 255, 0.7);
        }

        .aic-sb::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.9) 50%, transparent 95%);
          pointer-events: none;
          z-index: 10;
        }

        .aic-top {
          padding: 16px 14px 13px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex-shrink: 0;
        }

        .aic-new-chat {
          width: 100%;
          padding: 11px 14px;
          border-radius: 16px;
          border: 1px solid rgba(168, 85, 247, 0.45);
          background: rgba(168, 85, 247, 0.18);
          color: rgba(255, 255, 255, 0.95);
          font-size: 12px;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          letter-spacing: 0.01em;
          backdrop-filter: blur(8px);
          box-shadow:
            0 2px 14px rgba(168, 85, 247, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            inset 0 -1px 0 rgba(0, 0, 0, 0.12);
          transition: all 0.18s ease;
        }
        .aic-new-chat:not(:disabled):hover {
          background: rgba(168, 85, 247, 0.3);
          border-color: rgba(168, 85, 247, 0.65);
          box-shadow:
            0 4px 22px rgba(168, 85, 247, 0.4),
            inset 0 1px 0 rgba(255,255,255,0.22);
          transform: translateY(-1px);
        }
        .aic-new-chat:not(:disabled):active { transform: translateY(0); }
        .aic-new-chat:disabled { opacity: 0.4; cursor: not-allowed; }

        .aic-section { padding: 11px 14px 6px; flex-shrink: 0; }
        .aic-label {
          display: block;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(0, 0, 0, 0.3);
          margin-bottom: 7px;
        }

        .aic-select {
          width: 100%;
          padding: 9px 28px 9px 11px;
          border-radius: 13px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          color: #1a1a2e;
          font-size: 12px;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          outline: none;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(0,0,0,0.3)'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.9),
            inset 0 -1px 0 rgba(0,0,0,0.04),
            0 1px 4px rgba(0,0,0,0.05);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .aic-select:focus {
          border-color: rgba(124, 85, 246, 0.45);
          box-shadow: 0 0 0 3px rgba(124,85,246,0.1), inset 0 1px 0 rgba(255,255,255,0.9);
        }
        .aic-select:disabled { opacity: 0.4; cursor: not-allowed; }

        .aic-threads {
          flex: 1;
          overflow-y: auto;
          padding: 2px 14px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .aic-threads::-webkit-scrollbar { width: 2px; }
        .aic-threads::-webkit-scrollbar-track { background: transparent; }
        .aic-threads::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }

        .aic-thread {
          width: 100%;
          text-align: left;
          padding: 9px 11px;
          border-radius: 13px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          background: rgba(255, 255, 255, 0.55);
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.45);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.85),
            0 1px 3px rgba(0,0,0,0.04);
          transition: all 0.15s ease;
        }
        .aic-thread:hover {
          background: rgba(255, 255, 255, 0.85);
          border-color: rgba(0, 0, 0, 0.08);
          color: rgba(0, 0, 0, 0.72);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,1),
            0 2px 8px rgba(0,0,0,0.07);
          transform: translateX(2px);
        }
        .aic-thread.active {
          background: rgba(255, 255, 255, 0.9);
          border-color: rgba(124, 85, 246, 0.28);
          color: #4c2db8;
          box-shadow:
            0 2px 12px rgba(124, 85, 246, 0.1),
            inset 0 1px 0 rgba(255,255,255,1);
        }
        .aic-thread-icon { flex-shrink: 0; opacity: 0.35; }
        .aic-thread.active .aic-thread-icon { opacity: 1; color: #7c55f6; }
        .aic-thread-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .aic-thread-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #7c55f6;
          margin-left: auto;
          flex-shrink: 0;
          box-shadow: 0 0 5px rgba(124,85,246,0.6);
          animation: aicpulse 2s ease-in-out infinite;
        }
        @keyframes aicpulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }

        .aic-footer {
          flex-shrink: 0;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          position: relative;
        }

        .aic-dropdown {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 14px; right: 14px;
          background: rgba(248, 248, 250, 0.92);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.95);
          border-radius: 18px;
          overflow: hidden;
          box-shadow:
            0 -12px 40px rgba(0,0,0,0.1),
            inset 0 1px 0 rgba(255,255,255,1);
          z-index: 50;
          animation: aicdropup 0.18s ease;
        }
        @keyframes aicdropup {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .aic-dd-item {
          width: 100%;
          display: flex; align-items: center; gap: 9px;
          padding: 11px 15px;
          background: none; border: none; cursor: pointer;
          font-size: 12px; font-weight: 600;
          color: rgba(0,0,0,0.6);
          font-family: 'Inter', sans-serif;
          text-decoration: none;
          transition: background 0.12s;
        }
        .aic-dd-item:hover { background: rgba(0,0,0,0.04); color: #1a1a2e; }
        .aic-dd-divider { height: 1px; background: rgba(0,0,0,0.06); }

        .aic-profile-btn {
          width: 100%;
          display: flex; align-items: center; gap: 9px;
          padding: 9px 11px;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(0, 0, 0, 0.07);
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.95),
            0 2px 8px rgba(0,0,0,0.06);
          font-family: 'Inter', sans-serif;
          transition: all 0.15s;
        }
        .aic-profile-btn:hover {
          background: rgba(255, 255, 255, 0.9);
          border-color: rgba(0, 0, 0, 0.1);
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 4px 14px rgba(0,0,0,0.08);
        }

        .aic-avatar {
          width: 30px; height: 30px; border-radius: 10px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(99,102,241,0.4);
        }

        .aic-p-info { flex: 1; min-width: 0; text-align: left; }
        .aic-p-name {
          font-size: 12px; font-weight: 700;
          color: #1a1a2e;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .aic-p-role {
          font-size: 10px;
          color: rgba(0,0,0,0.32);
          letter-spacing: 0.04em;
          margin-top: 1px;
        }
        .aic-chevron { transition: transform 0.2s; color: rgba(0,0,0,0.25); flex-shrink: 0; }
        .aic-chevron.open { transform: rotate(180deg); }

        .aic-logout {
          width: 100%;
          display: flex; align-items: center; gap: 8px;
          padding: 9px 12px;
          border-radius: 13px;
          border: 1px solid rgba(239, 68, 68, 0.18);
          background: rgba(239, 68, 68, 0.05);
          color: #d94040;
          font-size: 11px;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.85),
            0 1px 4px rgba(239,68,68,0.06);
          transition: all 0.15s;
        }
        .aic-logout:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.35);
          color: #b91c1c;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(239,68,68,0.14), inset 0 1px 0 rgba(255,255,255,0.9);
        }
        .aic-logout:active { transform: translateY(0); }
      `}</style>

      <aside className="aic-sb">
        <div className="aic-top">
          <OrgSwitcher
            apiBase={process.env.NEXT_PUBLIC_API_BASE!}
            collapsed={false}
            onCreateNew={() => { window.location.href = "/dashboard/organisations"; }}
          />
          <button
            className="aic-new-chat"
            onClick={onNewChat}
            disabled={running}
          >
            <Plus size={14} />
            New Chat
          </button>
        </div>

        <div className="aic-section">
          <label className="aic-label">Brand</label>
          <select
            className="aic-select"
            value={brandId}
            disabled={running}
            onChange={(e) => onBrandChange(e.target.value)}
          >
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.display_name || brand.id}
              </option>
            ))}
          </select>
        </div>

        <div className="aic-section">
          <label className="aic-label">Chat History</label>
        </div>
        <div className="aic-threads">
          {threads.map((thread) => {
            const isActive = selectedThreadId === thread.id;
            return (
              <button
                key={thread.id}
                className={`aic-thread${isActive ? " active" : ""}`}
                onClick={() => onOpenThread(thread)}
                title={thread.title || "New chat"}
              >
                <MessageCircle size={13} className="aic-thread-icon" />
                <span className="aic-thread-label">
                  {thread.title || "New chat"}
                </span>
                {isActive && <span className="aic-thread-dot" />}
              </button>
            );
          })}
        </div>

        <div className="aic-footer">
          {profileOpen && (
            <div className="aic-dropdown">
              <a href="/dashboard/settings" className="aic-dd-item">
                Settings
              </a>
            </div>
          )}

          <button
            className="aic-profile-btn"
            onClick={() => setProfileOpen((v) => !v)}
          >
            <div className="aic-avatar">{userInitial}</div>
            <div className="aic-p-info">
              <div className="aic-p-name">{displayName}</div>
              <div className="aic-p-role">{displayRole}</div>
            </div>
            <ChevronDown
              size={13}
              className={`aic-chevron${profileOpen ? " open" : ""}`}
            />
          </button>

          <button
            className="aic-logout"
            onClick={async () => {
              try { await logoutUser(); } finally { window.location.href = "/auth/login"; }
            }}
          >
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}