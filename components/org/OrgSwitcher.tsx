"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";

type OrgItem = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

type OrgSwitcherProps = {
  apiBase: string;
  collapsed?: boolean;
  onCreateNew?: () => void;
};

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(json?.detail || json?.message || "Request failed");
  }

  return json as T;
}

export default function OrgSwitcher({
  apiBase,
  collapsed = false,
  onCreateNew,
}: OrgSwitcherProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrgItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const [myOrgs, me] = await Promise.all([
        fetchJson<OrgItem[]>(`${apiBase}/organisations/my-orgs`),
        fetchJson<any>(`${apiBase}/organisations/me`),
      ]);

      setOrgs(myOrgs || []);
      setCurrentOrg({
        id: me.id,
        name: me.name,
        slug: me.slug,
        role: me.role,
      });
    } catch (e: any) {
      setErr(e?.message || "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [apiBase]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleSwitch(orgId: string) {
    if (!orgId || orgId === currentOrg?.id) {
      setMenuOpen(false);
      return;
    }

    setSwitchingId(orgId);
    setErr(null);

    try {
      await fetchJson(`${apiBase}/organisations/switch/${orgId}`, {
        method: "POST",
      });
      window.location.reload();
    } catch (e: any) {
      setErr(e?.message || "Failed to switch workspace");
    } finally {
      setSwitchingId(null);
    }
  }

  const activeName = currentOrg?.name || "Workspace";
  const activeRole = currentOrg?.role || "member";

  return (
    <>
      <style>{`
        .orgs-root {
          position: relative;
          width: 100%;
          min-width: 0;
          overflow: visible;
        }

        .orgs-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          min-width: 0;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.05);
          padding: 6px 10px;
          transition: background 0.15s, border-color 0.15s;
          backdrop-filter: blur(8px);
        }
        .orgs-trigger:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.14);
        }

        .orgs-trigger.collapsed {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 14px;
          padding: 0;
          justify-content: center;
        }

        .orgs-trigger-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }

        .orgs-logo {
          width: 28px;
          height: 28px;
          min-width: 28px;
          border-radius: 999px;
          background: #fff;
          box-shadow: 0 8px 20px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .orgs-text {
          min-width: 0;
          text-align: left;
          flex: 1;
        }

        .orgs-name {
          font-size: 11px;
          line-height: 1.1;
          font-weight: 800;
          color: #f5f5f5;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .orgs-role {
          margin-top: 2px;
          font-size: 9px;
          line-height: 1;
          color: rgba(255,255,255,0.48);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: 'DM Mono', monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .orgs-chevron {
          width: 14px;
          height: 14px;
          min-width: 14px;
          color: rgba(255,255,255,0.45);
          flex-shrink: 0;
          transition: transform 0.18s ease;
        }

        .orgs-chevron.open {
          transform: rotate(180deg);
        }

        .orgs-menu {
          position: absolute;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.10);
          background: #101216;
          box-shadow: 0 18px 50px rgba(0,0,0,0.48);
          padding: 8px;
          z-index: 9999;
          overflow: hidden;
          animation: orgFadeIn 0.14s ease;
        }

        .orgs-menu.expanded {
          top: calc(100% + 8px);
          left: 0;
          width: 320px;
          max-width: min(320px, calc(100vw - 24px));
        }

        .orgs-menu.collapsed {
          top: 0;
          left: calc(100% + 12px);
          width: 300px;
          max-width: min(300px, calc(100vw - 84px));
        }

        @keyframes orgFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .orgs-section-title {
          padding: 6px 10px 8px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: rgba(255,255,255,0.34);
          font-family: 'DM Mono', monospace;
        }

        .orgs-error {
          margin: 0 4px 8px;
          border-radius: 12px;
          border: 1px solid rgba(239,68,68,0.2);
          background: rgba(239,68,68,0.10);
          color: #fca5a5;
          padding: 10px 12px;
          font-size: 12px;
        }

        .orgs-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 0;
          background: transparent;
          border-radius: 12px;
          padding: 10px 12px;
          text-align: left;
          transition: background 0.12s ease;
        }

        .orgs-item:hover {
          background: rgba(255,255,255,0.05);
        }

        .orgs-item-main {
          min-width: 0;
          flex: 1;
        }

        .orgs-item-name {
          font-size: 13px;
          font-weight: 700;
          color: #f5f5f5;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .orgs-item-meta {
          margin-top: 2px;
          font-size: 11px;
          color: rgba(255,255,255,0.45);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .orgs-create {
          margin-top: 6px;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 0;
          background: transparent;
          border-radius: 12px;
          padding: 11px 12px;
          text-align: left;
          color: rgba(255,255,255,0.88);
          font-size: 13px;
          font-weight: 600;
          transition: background 0.12s ease;
        }

        .orgs-create:hover {
          background: rgba(255,255,255,0.05);
        }
      `}</style>

      <div ref={rootRef} className="orgs-root">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={`orgs-trigger ${collapsed ? "collapsed" : ""}`}
          title={collapsed ? activeName : undefined}
        >
          <div className="orgs-trigger-left">
            <div className="">
              <img src="/logo.png" alt="Relvō AI" style={{ width: 50, height: "auto" }} />
            </div>

            {!collapsed && (
              <div className="orgs-text">
                <div className="orgs-name">
                  {loading ? "Loading..." : activeName}
                </div>
                <div className="orgs-role">
                  {activeRole}
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <ChevronDown className={`orgs-chevron ${menuOpen ? "open" : ""}`} />
          )}
        </button>

        {menuOpen && (
          <div className={`orgs-menu ${collapsed ? "collapsed" : "expanded"}`}>
            <div className="orgs-section-title">Workspaces</div>

            {err && <div className="orgs-error">{err}</div>}

            {loading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <>
                {orgs.map((org) => {
                  const active = org.id === currentOrg?.id;
                  const switching = switchingId === org.id;

                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => handleSwitch(org.id)}
                      className="orgs-item"
                    >
                      <div className="orgs-item-main">
                        <div className="orgs-item-name">{org.name}</div>
                        <div className="orgs-item-meta">
                          {org.slug} • {org.role}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {switching ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                        ) : active ? (
                          <Check className="h-4 w-4 text-[#4ade80]" />
                        ) : null}
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={onCreateNew}
                  className="orgs-create"
                >
                  <Plus className="h-4 w-4" />
                  Manage Organisations
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}