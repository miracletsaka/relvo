"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";

type OrgItem = {
  id: string;
  name: string;
  slug: string;
  role: string;
  logo_url?: string;
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
        logo_url: me.logo_url,
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

    return () =>
      document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleSwitch(orgId: string) {
    if (!orgId || orgId === currentOrg?.id) {
      setMenuOpen(false);
      return;
    }

    setSwitchingId(orgId);
    setErr(null);

    try {
      await fetchJson(
        `${apiBase}/organisations/switch/${orgId}`,
        {
          method: "POST",
        }
      );

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
    <div
      ref={rootRef}
      className="relative w-full min-w-0 font-[Inter,sans-serif]"
    >
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        title={collapsed ? activeName : undefined}
        className={`
          flex items-center justify-between
          border border-black/5
          bg-white/70
          transition-all duration-150
          hover:bg-white
          hover:border-black/10
          ${
            collapsed
              ? "h-10 w-10 rounded-xl p-0"
              : "w-full rounded-2xl px-2.5 py-2"
          }
        `}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {/* Logo */}
          <div
            className="
              flex h-7 w-7 shrink-0 items-center justify-center
              overflow-hidden rounded-[10px]
              border border-black/5
              bg-white
            "
          >
            <img
              src={currentOrg?.logo_url || "/logo.png"}
              alt={activeName}
              className="h-[22px] w-[22px] object-contain"
            />
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1 text-left">
              <div
                className="
                  truncate text-[12px]
                  font-medium text-gray-500
                "
              >
                {loading ? "Loading..." : activeName}
              </div>

              <div
                className="
                  mt-0.5 truncate
                  text-[9px] font-medium uppercase
                  tracking-[0.12em]
                  text-gray-400
                "
              >
                {activeRole}
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <ChevronDown
            className={`
              h-3.5 w-3.5 shrink-0
              text-gray-300
              transition-transform duration-200
              ${menuOpen ? "rotate-180" : ""}
            `}
          />
        )}
      </button>

      {menuOpen && (
        <div
          className={`
            absolute z-[9999]
            overflow-hidden rounded-2xl
            border border-black/5
            bg-white/95
            p-2
            shadow-[0_10px_30px_rgba(0,0,0,0.08)]
            backdrop-blur-xl
            animate-in fade-in zoom-in-95 duration-150
            ${
              collapsed
                ? "left-[calc(100%+12px)] top-0 w-[260px]"
                : "left-0 top-[calc(100%+8px)] w-full min-w-[240px]"
            }
          `}
        >
          <div
            className="
              px-2.5 pb-2 pt-1
              text-[9px] font-semibold uppercase
              tracking-[0.14em]
              text-gray-400
            "
          >
            Workspaces
          </div>

          {err && (
            <div
              className="
                mx-1 mb-2 rounded-xl
                border border-red-200
                bg-red-50
                px-3 py-2
                text-xs text-red-600
              "
            >
              {err}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
                    className="
                      flex w-full items-center justify-between gap-3
                      rounded-xl px-3 py-2.5
                      text-left
                      transition-all duration-150
                      hover:bg-black/[0.03]
                    "
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-gray-600">
                        {org.name}
                      </div>

                      <div className="mt-0.5 truncate text-[10px] text-gray-400">
                        {org.slug} · {org.role}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {switching ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-300" />
                      ) : active ? (
                        <Check className="h-3.5 w-3.5 text-violet-500" />
                      ) : null}
                    </div>
                  </button>
                );
              })}

              <div className="mx-1 my-1 h-px bg-black/5" />

              <button
                type="button"
                onClick={onCreateNew}
                className="
                  flex w-full items-center gap-2
                  rounded-xl px-3 py-2.5
                  text-left text-[12px]
                  font-medium text-violet-600
                  transition-all duration-150
                  hover:bg-violet-500/5
                "
              >
                <Plus className="h-3.5 w-3.5" />
                Manage Organisations
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}