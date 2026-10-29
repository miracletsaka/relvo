"use client";

import { useEffect, useState } from "react";
import {
  Plus, Check, X, Loader2, Building2, Users,
  ArrowRight, RefreshCw, Settings, ChevronRight,
} from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

type Plan = "free" | "starter" | "pro" | "agency";

type Org = {
  id:        string;
  name:      string;
  slug:      string;
  plan:      Plan;
  role:      string;
  is_active: boolean;
  created_at: string;
  usage?: {
    brands:             number;
    platforms:          number;
    drafts_this_month:  number;
    renders_this_month: number;
    members:            number;
  };
  limits: {
    max_brands:     number;
    max_platforms:  number;
    max_drafts_pm:  number;
    max_renders_pm: number;
  };
};

// ── Constants ─────────────────────────────────────────────────────────────────

const PLAN_META: Record<Plan, { label: string; color: string }> = {
  free:    { label: "Free",    color: "#60a5fa" },
  starter: { label: "Starter", color: "#34d399" },
  pro:     { label: "Pro",     color: "#7c55f6" },
  agency:  { label: "Agency",  color: "#f59e0b" },
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, onClose }: { msg: { type: "ok" | "err"; text: string }; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  const ok = msg.type === "ok";
  return (
    <div className={[
      "fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-[16px] max-w-sm",
      "border font-[Inter,sans-serif] text-[12px] font-bold",
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_32px_rgba(0,0,0,0.1)]",
      ok ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-red-50 border-red-200 text-red-500",
    ].join(" ")}>
      {ok ? <Check size={13} /> : <X size={13} />}
      <span className="flex-1">{msg.text}</span>
      <button onClick={onClose} className="opacity-40 hover:opacity-70 cursor-pointer"><X size={12} /></button>
    </div>
  );
}

// ── Usage bar ─────────────────────────────────────────────────────────────────

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const inf = max >= 999999;
  const pct = inf ? 0 : Math.min(100, Math.round((used / max) * 100));
  const color = pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#10b981";
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] text-black/40 font-medium font-[Inter,sans-serif]">{label}</span>
        <span className="text-[9px] text-black/25 font-mono">{used} / {inf ? "∞" : max}</span>
      </div>
      {!inf && (
        <div className="h-[3px] bg-black/[0.07] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
        </div>
      )}
    </div>
  );
}

// ── Org card ──────────────────────────────────────────────────────────────────

function OrgCard({ org, isActive, switching, onSwitch }: {
  org: Org; isActive: boolean; switching: boolean; onSwitch: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const plan = PLAN_META[org.plan as Plan] || PLAN_META.free;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: isActive ? `linear-gradient(180deg,rgba(124,85,246,0.07) 0%,rgba(255,255,255,0.65) 40%)` : "rgba(255,255,255,0.62)",
        border: `1px solid ${isActive ? "rgba(124,85,246,0.28)" : "rgba(0,0,0,0.07)"}`,
        boxShadow: isActive
          ? "inset 0 1px 0 rgba(255,255,255,1), 0 4px 20px rgba(124,85,246,0.1)"
          : "inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 10px rgba(0,0,0,0.05)",
      }}
    >
      {/* Accent bar */}
      <div className="h-[3px]" style={{ background: isActive ? "#7c55f6" : plan.color, opacity: 0.8 }} />

      {/* Main row */}
      <div className="p-5 flex items-start gap-4">
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-[14px] flex items-center justify-center text-lg font-extrabold flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,1)]"
          style={{ background: plan.color + "18", color: plan.color, border: `1px solid ${plan.color}30` }}
        >
          {org.name[0]?.toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[14px] font-extrabold text-[#1a1a2e] tracking-[-0.01em]">{org.name}</span>
            {/* Plan badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border" style={{ background: plan.color + "12", color: plan.color, borderColor: plan.color + "28" }}>
              <span className="w-1 h-1 rounded-full" style={{ background: plan.color }} />
              {plan.label}
            </span>
            {/* Role */}
            <span className="text-[9px] font-bold uppercase tracking-wider text-black/30 font-mono">{org.role}</span>
            {/* Active indicator */}
            {isActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
                Active
              </span>
            )}
          </div>
          <p className="text-[10px] text-black/30 font-mono">{org.slug} · Created {fmtDate(org.created_at)}</p>

          {/* Stats row */}
          {org.usage && (
            <div className="flex gap-3 mt-2 flex-wrap">
              {[
                { label: "Brands",  value: org.usage.brands },
                { label: "Members", value: org.usage.members },
                { label: "Drafts",  value: org.usage.drafts_this_month },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1">
                  <span className="text-[12px] font-extrabold text-[#1a1a2e]">{s.value}</span>
                  <span className="text-[9px] text-black/30 font-medium font-[Inter,sans-serif]">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0 items-end">
          {!isActive && (
            <button
              onClick={onSwitch}
              disabled={switching}
              className={[
                "inline-flex items-center gap-2 px-4 py-2 rounded-[12px] text-[11px] font-bold cursor-pointer transition-all font-[Inter,sans-serif]",
                "border border-[rgba(168,85,247,0.45)] bg-[rgba(168,85,247,0.18)] text-[#5b21b6]",
                "shadow-[0_2px_10px_rgba(168,85,247,0.15),inset_0_1px_0_rgba(255,255,255,0.5)]",
                "hover:bg-[rgba(168,85,247,0.28)] hover:border-[rgba(168,85,247,0.6)] hover:-translate-y-px",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none",
              ].join(" ")}
            >
              {switching ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
              Switch
            </button>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[10px] font-bold bg-white/60 border border-black/[0.07] text-black/40 hover:bg-white/90 hover:text-black/60 cursor-pointer transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] font-[Inter,sans-serif]"
          >
            Usage <ChevronRight size={10} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        </div>
      </div>

      {/* Usage breakdown */}
      {expanded && org.usage && (
        <div className="px-5 pb-5 pt-1 border-t border-black/[0.05] bg-white/25">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-3">
            <UsageBar label="Brands"          used={org.usage.brands}             max={org.limits.max_brands} />
            <UsageBar label="Platforms"       used={org.usage.platforms}          max={org.limits.max_platforms} />
            <UsageBar label="Drafts / month"  used={org.usage.drafts_this_month}  max={org.limits.max_drafts_pm} />
            <UsageBar label="Renders / month" used={org.usage.renders_this_month} max={org.limits.max_renders_pm} />
          </div>
          {org.plan !== "agency" && (
            <a href="/dashboard/billing" className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-500 hover:text-amber-600 no-underline transition-colors font-[Inter,sans-serif]">
              ↑ Upgrade plan for more limits
            </a>
          )}
        </div>
      )}

      {/* Quick links (active org only) */}
      {isActive && (
        <div className="px-5 pb-4 flex gap-2 flex-wrap border-t border-black/[0.05] pt-3">
          {[
            { href: "/dashboard/settings", icon: Settings, label: "Settings" },
            { href: "/dashboard/members",  icon: Users,    label: "Members" },
          ].map(({ href, icon: Icon, label }) => (
            <a key={href} href={href} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[11px] font-bold bg-white/60 border border-black/[0.07] text-black/45 hover:bg-white/95 hover:text-black/65 no-underline cursor-pointer transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] font-[Inter,sans-serif]">
              <Icon size={11} /> {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Create drawer ─────────────────────────────────────────────────────────────

function CreateDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name,     setName]     = useState("");
  const [slug,     setSlug]     = useState("");
  const [creating, setCreating] = useState(false);
  const [err,      setErr]      = useState("");

  const inputCls = [
    "w-full text-[12px] font-medium font-[Inter,sans-serif]",
    "bg-white/70 border border-black/[0.08] rounded-[11px]",
    "px-3 py-2.5 text-[#1a1a2e] outline-none",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]",
    "placeholder:text-black/25",
    "focus:border-[rgba(124,85,246,0.45)] focus:shadow-[0_0_0_3px_rgba(124,85,246,0.1)]",
    "transition-all duration-150",
  ].join(" ");

  const create = async () => {
    if (!name.trim()) { setErr("Name is required."); return; }
    setCreating(true); setErr("");
    try {
      const res  = await fetch(`${API}/organisations`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), slug: slug || slugify(name) }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to create");
      onCreated();
    } catch (e: any) { setErr(e.message); setCreating(false); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/14 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col" style={{ background: "rgba(248,248,250,0.97)", backdropFilter: "blur(40px) saturate(180%)", borderLeft: "1px solid rgba(255,255,255,0.9)", boxShadow: "-8px 0 40px rgba(0,0,0,0.1), inset 1px 0 0 rgba(255,255,255,0.8)", animation: "org-slidein 0.22s cubic-bezier(0.32,0.72,0,1)" }}>
        <style>{`@keyframes org-slidein { from { transform:translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06] flex-shrink-0 bg-white/40">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/28 mb-0.5">New Workspace</p>
            <p className="text-[14px] font-extrabold text-[#1a1a2e] tracking-[-0.01em]">Create Organisation</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[11px] bg-white/70 border border-black/[0.08] text-black/35 hover:text-black/60 hover:bg-white/90 cursor-pointer transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
          <p className="text-[12px] text-black/40 font-medium leading-relaxed font-[Inter,sans-serif]">
            Each organisation is a separate workspace with its own brands, members, and billing. You can switch between them at any time.
          </p>

          <div className="rounded-[14px] bg-white/55 border border-black/[0.06] p-4 flex flex-col gap-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.15em] text-black/30 mb-1.5">Organisation Name *</label>
              <input className={inputCls} value={name} onChange={e => { setName(e.target.value); setSlug(slugify(e.target.value)); }} onKeyDown={e => e.key === "Enter" && create()} placeholder="e.g. Acme Agency" autoFocus />
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.15em] text-black/30 mb-1.5">Workspace Slug</label>
              <div className="flex overflow-hidden rounded-[11px] border border-black/[0.08] bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
                <span className="px-3 py-2.5 text-[11px] text-black/30 font-medium border-r border-black/[0.07] whitespace-nowrap font-[Inter,sans-serif] bg-white/40">relvo.app/</span>
                <input className="flex-1 px-3 py-2.5 bg-transparent text-[12px] font-medium text-[#1a1a2e] outline-none placeholder:text-black/25 font-[Inter,sans-serif]" value={slug} onChange={e => setSlug(slugify(e.target.value))} placeholder="acme-agency" />
              </div>
              <p className="text-[9px] text-black/25 font-medium mt-1 font-[Inter,sans-serif]">Auto-generated from name. Only lowercase letters, numbers, and hyphens.</p>
            </div>
          </div>

          {/* Info block */}
          <div className="p-3.5 rounded-[13px] bg-[rgba(124,85,246,0.05)] border border-[rgba(124,85,246,0.15)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <p className="text-[11px] text-black/45 font-medium leading-relaxed font-[Inter,sans-serif]">
              New organisations start on the <strong className="text-[#7c55f6]">Free plan</strong>. You can upgrade to unlock more brands, platforms, and AI credits.
            </p>
          </div>

          {err && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-[11px] bg-red-50 border border-red-200 text-[11px] text-red-500 font-medium font-[Inter,sans-serif]">
              <X size={12} className="flex-shrink-0 mt-px" />{err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-3.5 border-t border-black/[0.06] flex gap-2 bg-white/30">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-[14px] text-[12px] font-bold bg-white/60 border border-black/[0.08] text-black/40 hover:bg-white/90 cursor-pointer transition-all font-[Inter,sans-serif]">
            Cancel
          </button>
          <button
            onClick={create}
            disabled={creating || !name.trim()}
            className={[
              "flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-[12px] font-bold cursor-pointer transition-all font-[Inter,sans-serif]",
              "border border-[rgba(168,85,247,0.45)] bg-[rgba(168,85,247,0.18)] text-[#5b21b6]",
              "shadow-[0_2px_14px_rgba(168,85,247,0.18),inset_0_1px_0_rgba(255,255,255,0.5)]",
              "hover:bg-[rgba(168,85,247,0.28)] hover:border-[rgba(168,85,247,0.6)] hover:-translate-y-px",
              "disabled:opacity-35 disabled:cursor-not-allowed disabled:transform-none",
            ].join(" ")}
          >
            {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Create Organisation
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrganisationsPage() {
  const [orgs,       setOrgs]       = useState<Org[]>([]);
  const [activeId,   setActiveId]   = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [switching,  setSwitching]  = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast,      setToast]      = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showToast = (type: "ok" | "err", text: string) => setToast({ type, text });

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/organisations/my-orgs`, { credentials: "include" });
      const list = await res.json() as Org[];
      setOrgs(Array.isArray(list) ? list : []);

      // Determine active org
      const meRes  = await fetch(`${API}/organisations/me`, { credentials: "include" });
      const me     = await meRes.json();
      setActiveId(me?.id || null);
    } catch { showToast("err", "Failed to load organisations"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const switchOrg = async (org: Org) => {
    if (switching) return;
    setSwitching(org.id);
    try {
      await fetch(`${API}/organisations/switch/${org.id}`, { method: "POST", credentials: "include" });
      setActiveId(org.id);
      showToast("ok", `Switched to ${org.name}`);
    } catch { showToast("err", "Failed to switch organisation"); }
    finally { setSwitching(null); }
  };

  const active   = orgs.filter(o => o.id === activeId);
  const others   = orgs.filter(o => o.id !== activeId);

  return (
    <div className="min-h-screen font-[Inter,sans-serif]" style={{ background: "#f4f4f6" }}>
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(124,85,246,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(124,85,246,0.025) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />

      <div className="relative max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/28 mb-2">Account</p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-[#1a1a2e] leading-none">Organisations</h1>
              <p className="text-[12px] text-black/35 font-medium mt-1.5">
                {orgs.length} workspace{orgs.length !== 1 ? "s" : ""} · switch or create new ones here
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[13px] text-[11px] font-bold bg-white/60 border border-black/[0.08] text-black/40 hover:bg-white/90 cursor-pointer transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] disabled:opacity-40 font-[Inter,sans-serif]">
                <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className={[
                  "inline-flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-[12px] font-bold cursor-pointer font-[Inter,sans-serif]",
                  "border border-[rgba(168,85,247,0.45)] bg-[rgba(168,85,247,0.18)] text-[#5b21b6]",
                  "shadow-[0_2px_14px_rgba(168,85,247,0.2),inset_0_1px_0_rgba(255,255,255,0.5)]",
                  "hover:bg-[rgba(168,85,247,0.28)] hover:border-[rgba(168,85,247,0.65)] hover:-translate-y-px transition-all duration-150",
                ].join(" ")}
              >
                <Plus size={14} /> New Organisation
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-white/40 border border-black/[0.06] animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : orgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-[20px] bg-white/70 border border-black/[0.07] flex items-center justify-center mb-4 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_10px_rgba(0,0,0,0.05)]">
              <Building2 size={24} className="text-black/20" />
            </div>
            <p className="text-[13px] font-bold text-black/30 font-[Inter,sans-serif]">No organisations yet</p>
            <p className="text-[11px] text-black/20 font-medium mt-1 font-[Inter,sans-serif]">Click "New Organisation" to get started</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Active org */}
            {active.length > 0 && (
              <section>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-500/60 mb-2.5 font-[Inter,sans-serif]">Active Workspace</p>
                <div className="flex flex-col gap-3">
                  {active.map(o => (
                    <OrgCard key={o.id} org={o} isActive switching={false} onSwitch={() => {}} />
                  ))}
                </div>
              </section>
            )}

            {/* Other orgs */}
            {others.length > 0 && (
              <section>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/25 mb-2.5 font-[Inter,sans-serif]">Other Workspaces · {others.length}</p>
                <div className="flex flex-col gap-3">
                  {others.map(o => (
                    <OrgCard key={o.id} org={o} isActive={false} switching={switching === o.id} onSwitch={() => switchOrg(o)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateDrawer
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            await load();
            showToast("ok", "Organisation created!");
          }}
        />
      )}

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
