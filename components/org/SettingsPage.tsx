"use client";

import { useEffect, useState } from "react";
import {
  Save, Eye, EyeOff, Check, X, Shield, Building2,
  Briefcase, Loader2, AlertTriangle, Trash2, ChevronDown,
} from "lucide-react";
import { changePassword } from "@/lib/api";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

type Plan = "free" | "starter" | "pro" | "agency";

type ActiveOrg = {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  role: string;
  created_at: string;
};

type BusinessInfo = {
  tagline?: string;
  description?: string;
  business_type?: string;
  company_size?: string;
  founded_year?: number;
  registration_no?: string;
  vat_number?: string;
  email_primary?: string;
  email_support?: string;
  phone_primary?: string;
  phone_secondary?: string;
  whatsapp?: string;
  website?: string;
  country?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  address?: string;
  map_url?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const BUSINESS_TYPES = ["Agency","Freelancer","Startup","SME","Enterprise","Non-profit","Other"];
const COMPANY_SIZES  = ["1–5","6–20","21–50","51–200","201–500","500+"];
const COUNTRIES = ["Malawi","United Kingdom","United States","South Africa","Kenya","Nigeria","Ghana","Uganda","Tanzania","Other"];
const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/brand" },
  { key: "facebook",  label: "Facebook",  placeholder: "https://facebook.com/brand" },
  { key: "linkedin",  label: "LinkedIn",  placeholder: "https://linkedin.com/company/brand" },
  { key: "twitter",   label: "Twitter/X", placeholder: "https://twitter.com/brand" },
  { key: "tiktok",    label: "TikTok",    placeholder: "https://tiktok.com/@brand" },
  { key: "youtube",   label: "YouTube",   placeholder: "https://youtube.com/@brand" },
];

const PLAN_META: Record<Plan, { label: string; color: string }> = {
  free:    { label: "Free",    color: "#60a5fa" },
  starter: { label: "Starter", color: "#34d399" },
  pro:     { label: "Pro",     color: "#7c55f6" },
  agency:  { label: "Agency",  color: "#f59e0b" },
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

// ── Shared primitives ─────────────────────────────────────────────────────────

const labelCls = "block text-[9px] font-bold uppercase tracking-[0.15em] text-black/30 mb-1.5";

const inputCls = [
  "w-full text-[12px] font-medium font-[Inter,sans-serif]",
  "bg-white/70 border border-black/[0.08] rounded-[11px]",
  "px-3 py-2.5 text-[#1a1a2e] outline-none",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.04)]",
  "placeholder:text-black/25 placeholder:font-normal",
  "focus:border-[rgba(124,85,246,0.45)] focus:shadow-[0_0_0_3px_rgba(124,85,246,0.1),inset_0_1px_0_rgba(255,255,255,0.95)]",
  "transition-all duration-150",
].join(" ");

function SectionCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/65 border border-black/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_10px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-6 py-4 border-b border-black/[0.06] bg-white/40">
        <p className="text-[13px] font-extrabold text-[#1a1a2e] tracking-[-0.01em]">{title}</p>
        {desc && <p className="text-[10.5px] text-black/30 font-medium mt-0.5">{desc}</p>}
      </div>
      <div className="p-6 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Field({ label, children, grid }: { label?: string; children: React.ReactNode; grid?: string }) {
  return (
    <div className={grid}>
      {label && <label className={labelCls}>{label}</label>}
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-black/[0.05]" />;
}

function MsgTag({ type, text }: { type: "ok" | "err"; text: string }) {
  return (
    <span className={[
      "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold border",
      type === "ok" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-500 border-red-200",
    ].join(" ")}>
      {type === "ok" ? <Check size={11} /> : <X size={11} />}
      {text}
    </span>
  );
}

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={[
      "inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-[12px] font-bold cursor-pointer font-[Inter,sans-serif]",
      "border border-[rgba(168,85,247,0.45)] bg-[rgba(168,85,247,0.18)] text-[#5b21b6]",
      "shadow-[0_2px_14px_rgba(168,85,247,0.18),inset_0_1px_0_rgba(255,255,255,0.5)]",
      "hover:bg-[rgba(168,85,247,0.28)] hover:border-[rgba(168,85,247,0.65)] hover:-translate-y-px",
      "active:translate-y-0 transition-all duration-150",
      "disabled:opacity-35 disabled:cursor-not-allowed disabled:transform-none",
    ].join(" ")}>{children}</button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={[
      "inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-[12px] font-bold cursor-pointer font-[Inter,sans-serif]",
      "border border-black/[0.08] bg-white/70 text-black/40",
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]",
      "hover:bg-white/95 hover:text-black/60 hover:-translate-y-px transition-all duration-150",
    ].join(" ")}>{children}</button>
  );
}

function DangerBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={[
      "inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-[12px] font-bold cursor-pointer font-[Inter,sans-serif]",
      "border border-red-200 bg-red-50 text-red-500",
      "hover:bg-red-100 hover:border-red-300 hover:-translate-y-px",
      "active:translate-y-0 transition-all duration-150",
      "disabled:opacity-35 disabled:cursor-not-allowed disabled:transform-none",
    ].join(" ")}>{children}</button>
  );
}

function NavItem({ active, icon: Icon, label, onClick }: { active: boolean; icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={[
      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[13px] text-[12px] font-semibold text-left cursor-pointer transition-all duration-150 border font-[Inter,sans-serif]",
      active
        ? "bg-white/90 border-[rgba(124,85,246,0.28)] text-[#4c2db8] shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_10px_rgba(124,85,246,0.1)]"
        : "bg-transparent border-transparent text-black/40 hover:bg-white/60 hover:border-black/[0.07] hover:text-black/65",
    ].join(" ")}>
      <Icon size={14} className={active ? "text-[#7c55f6]" : "text-black/30"} />
      {label}
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7c55f6] shadow-[0_0_5px_rgba(124,85,246,0.6)]" />}
    </button>
  );
}

function PasswordInput({ value, onChange, show, onToggle, placeholder, style }: {
  value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void;
  placeholder?: string; style?: React.CSSProperties;
}) {
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} className={`${inputCls} pr-11`} />
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-[#7c55f6] transition-colors cursor-pointer">
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

// ── TABS ──────────────────────────────────────────────────────────────────────

// ── Security Tab ──────────────────────────────────────────────────────────────

function SecurityTab() {
  const [pw,      setPw]      = useState({ current: "", next: "", confirm: "" });
  const [showPw,  setShowPw]  = useState({ current: false, next: false, confirm: false });
  const [pwMsg,   setPwMsg]   = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = (p: string) => {
    if (!p) return null;
    if (p.length < 6)  return { label: "Weak",   color: "#ef4444", width: "25%" };
    if (p.length < 10) return { label: "Fair",   color: "#f59e0b", width: "55%" };
    if (p.length < 14) return { label: "Good",   color: "#22c55e", width: "78%" };
    return               { label: "Strong", color: "#10b981", width: "100%" };
  };
  const str = strength(pw.next);

  return (
    <SectionCard title="Security" desc="Update your password to keep your account safe.">
      <Field label="Current Password">
        <PasswordInput value={pw.current} onChange={v => setPw(p => ({ ...p, current: v }))} show={showPw.current} onToggle={() => setShowPw(s => ({ ...s, current: !s.current }))} placeholder="Enter your current password" />
      </Field>
      <Field label="New Password">
        <PasswordInput value={pw.next} onChange={v => setPw(p => ({ ...p, next: v }))} show={showPw.next} onToggle={() => setShowPw(s => ({ ...s, next: !s.next }))} placeholder="Minimum 8 characters" />
        {pw.next && str ? (
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex-1 h-[3px] bg-black/[0.07] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: str.width, background: str.color }} />
            </div>
            <span className="text-[10px] font-bold min-w-[38px] text-right" style={{ color: str.color }}>{str.label}</span>
          </div>
        ) : !pw.next ? (
          <p className="mt-1.5 text-[11px] text-black/30 font-medium font-[Inter,sans-serif]">Use 8+ characters for a stronger password.</p>
        ) : null}
      </Field>
      <Field label="Confirm New Password">
        <PasswordInput
          value={pw.confirm} onChange={v => setPw(p => ({ ...p, confirm: v }))}
          show={showPw.confirm} onToggle={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}
          placeholder="Re-type new password"
          style={pw.confirm && pw.confirm !== pw.next ? { borderColor: "rgba(239,68,68,0.45)" } : pw.confirm && pw.confirm === pw.next ? { borderColor: "rgba(16,185,129,0.45)" } : undefined}
        />
        {pw.confirm && pw.confirm !== pw.next && <p className="mt-1.5 text-[11px] font-medium text-red-400 font-[Inter,sans-serif]">Passwords don't match.</p>}
      </Field>
      <Divider />
      <div className="flex items-center gap-3 flex-wrap">
        <PrimaryBtn disabled={loading} onClick={async () => {
          setPwMsg(null);
          const { current, next, confirm } = pw;
          if (!current || !next || !confirm) return setPwMsg({ type: "err", text: "Please fill all fields." });
          if (next.length < 8) return setPwMsg({ type: "err", text: "Password must be 8+ characters." });
          if (next !== confirm) return setPwMsg({ type: "err", text: "Passwords do not match." });
          try {
            setLoading(true);
            await changePassword({ current_password: current, new_password: next });
            setPw({ current: "", next: "", confirm: "" });
            setPwMsg({ type: "ok", text: "Password updated." });
          } catch (e: any) { setPwMsg({ type: "err", text: e.message }); }
          finally { setLoading(false); }
        }}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Update Password
        </PrimaryBtn>
        {pwMsg && <MsgTag type={pwMsg.type} text={pwMsg.text} />}
      </div>
    </SectionCard>
  );
}

// ── Organisation Tab ──────────────────────────────────────────────────────────

function OrganisationTab() {
  const [org,     setOrg]     = useState<ActiveOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [name,    setName]    = useState("");
  const [slug,    setSlug]    = useState("");
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting,      setDeleting]      = useState(false);

  useEffect(() => {
    fetch(`${API}/organisations/me`, { credentials: "include" })
      .then(r => r.json()).then(d => { setOrg(d); setName(d.name); setSlug(d.slug); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!org || !name.trim()) return;
    setSaving(true); setMsg(null);
    try {
      const res  = await fetch(`${API}/organisations/me`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), slug: slug.trim() }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed");
      setOrg(prev => prev ? { ...prev, name: json.organisation.name, slug: json.organisation.slug } : prev);
      setMsg({ type: "ok", text: "Organisation updated." });
    } catch (e: any) { setMsg({ type: "err", text: e.message }); }
    finally { setSaving(false); }
  };

  const deleteOrg = async () => {
    if (!org || deleteConfirm !== org.name) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/organisations/me`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
      window.location.href = "/dashboard/organisations";
    } catch (e: any) { setMsg({ type: "err", text: e.message }); setDeleting(false); }
  };

  if (loading) return (
    <div className="flex items-center gap-2.5 text-[13px] text-black/35 font-medium font-[Inter,sans-serif] p-6">
      <Loader2 size={14} className="animate-spin text-[#7c55f6]" /> Loading organisation…
    </div>
  );

  if (!org) return <p className="text-[12px] text-black/35 font-[Inter,sans-serif] p-6">No organisation found.</p>;

  const plan = PLAN_META[org.plan as Plan] || PLAN_META.free;
  const canManage = org.role === "owner" || org.role === "admin";
  const isOwner   = org.role === "owner";

  return (
    <div className="flex flex-col gap-4">
      {/* Overview */}
      <SectionCard title="Organisation" desc="Your active workspace details.">
        {/* Plan badge + info row */}
        <div className="flex items-center gap-3 p-3.5 rounded-[13px] bg-white/50 border border-black/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="w-10 h-10 rounded-[13px] flex items-center justify-center text-lg font-extrabold flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,1)]" style={{ background: plan.color + "18", color: plan.color, border: `1px solid ${plan.color}30` }}>
            {org.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-extrabold text-[#1a1a2e] tracking-[-0.01em]">{org.name}</p>
            <p className="text-[10px] text-black/30 font-mono mt-0.5">{org.slug} · ID: {org.id.slice(0, 8)}…</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border" style={{ background: plan.color + "12", color: plan.color, borderColor: plan.color + "30" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: plan.color }} />
            {plan.label}
          </span>
          {org.plan !== "agency" && (
            <a href="/dashboard/billing" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-600 no-underline hover:-translate-y-px transition-all">
              ↑ Upgrade
            </a>
          )}
        </div>

        {canManage && (
          <>
            <Divider />
            <Field label="Organisation Name">
              <input className={inputCls} value={name} onChange={e => setName(e.target.value)} />
            </Field>
            <Field label="Workspace Slug">
              <div className="flex overflow-hidden rounded-[11px] border border-black/[0.08] bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
                <span className="px-3 py-2.5 text-[11px] text-black/30 font-medium border-r border-black/[0.07] whitespace-nowrap font-[Inter,sans-serif] bg-white/40">
                  relvo.app/
                </span>
                <input className="flex-1 px-3 py-2.5 bg-transparent text-[12px] font-medium text-[#1a1a2e] outline-none placeholder:text-black/25 font-[Inter,sans-serif]"
                  value={slug} onChange={e => setSlug(slugify(e.target.value))} />
              </div>
            </Field>
            <div className="flex items-center gap-3 flex-wrap">
              <PrimaryBtn onClick={save} disabled={saving || (name === org.name && slug === org.slug)}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Changes
              </PrimaryBtn>
              {msg && <MsgTag type={msg.type} text={msg.text} />}
            </div>
          </>
        )}

        {/* Info rows */}
        <Divider />
        <div className="flex flex-col gap-0">
          {[
            { label: "Organisation ID", value: org.id },
            { label: "Created", value: org.created_at ? new Date(org.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—" },
            { label: "Your Role", value: org.role.charAt(0).toUpperCase() + org.role.slice(1) },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-black/[0.05] last:border-0">
              <span className="text-[11px] text-black/30 font-medium font-[Inter,sans-serif]">{row.label}</span>
              <span className="text-[11px] text-black/55 font-mono max-w-[60%] overflow-hidden text-ellipsis whitespace-nowrap">{row.value}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Danger zone — owner only */}
      {isOwner && (
        <div className="rounded-2xl bg-red-50/60 border border-red-200 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="px-6 py-4 border-b border-red-100 bg-red-50/80 flex items-center gap-2.5">
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
            <p className="text-[13px] font-extrabold text-red-600 tracking-[-0.01em]">Danger Zone</p>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <p className="text-[12px] text-red-500/80 font-medium leading-relaxed font-[Inter,sans-serif]">
              Permanently deletes <strong className="text-red-600">{org.name}</strong> and all its data — brands, drafts, templates, and media. This cannot be undone.
            </p>
            <Field label={`Type "${org.name}" to confirm`}>
              <input className={`${inputCls} border-red-200 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]`}
                value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={org.name} />
            </Field>
            <DangerBtn onClick={deleteOrg} disabled={deleteConfirm !== org.name || deleting}>
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Delete Organisation
            </DangerBtn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Business Info Tab ─────────────────────────────────────────────────────────

function BusinessTab() {
  const [data,    setData]    = useState<BusinessInfo>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/org-profile/business-info`, { credentials: "include" })
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (k: keyof BusinessInfo, v: any) => setData(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/org-profile/business-info`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to save");
      setData(json); setMsg({ type: "ok", text: "Business info saved." });
    } catch (e: any) { setMsg({ type: "err", text: e.message }); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center gap-2.5 text-[13px] text-black/35 font-medium font-[Inter,sans-serif] p-6">
      <Loader2 size={14} className="animate-spin text-[#7c55f6]" /> Loading business info…
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Identity */}
      <SectionCard title="Identity" desc="How your business presents itself.">
        <Field label="Tagline">
          <input className={inputCls} value={data.tagline || ""} onChange={e => set("tagline", e.target.value)} placeholder="Transforming brands through intelligent content" />
        </Field>
        <Field label="Description">
          <textarea className={`${inputCls} resize-none leading-relaxed`} rows={4} value={data.description || ""} onChange={e => set("description", e.target.value)} placeholder="Tell us about your business…" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Business Type", "business_type", BUSINESS_TYPES],
            ["Company Size",  "company_size",  COMPANY_SIZES],
          ].map(([lbl, key, opts]) => (
            <Field key={key as string} label={lbl as string}>
              <select className={`${inputCls} appearance-none`} value={(data as any)[key as string] || ""} onChange={e => set(key as keyof BusinessInfo, e.target.value)}
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(0,0,0,0.3)'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32 }}>
                <option value="">Select…</option>
                {(opts as string[]).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
          ))}
          <Field label="Founded Year">
            <input type="number" className={inputCls} value={data.founded_year || ""} onChange={e => set("founded_year", e.target.value ? parseInt(e.target.value) : undefined)} placeholder="2019" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Registration / Company No.">
            <input className={inputCls} value={data.registration_no || ""} onChange={e => set("registration_no", e.target.value)} placeholder="12345678" />
          </Field>
          <Field label="VAT Number">
            <input className={inputCls} value={data.vat_number || ""} onChange={e => set("vat_number", e.target.value)} placeholder="GB123456789" />
          </Field>
        </div>
      </SectionCard>

      {/* Contact */}
      <SectionCard title="Contact Details" desc="How customers and partners can reach you.">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary Email"><input type="email" className={inputCls} value={data.email_primary || ""} onChange={e => set("email_primary", e.target.value)} placeholder="hello@yourbrand.com" /></Field>
          <Field label="Support Email"><input type="email" className={inputCls} value={data.email_support || ""} onChange={e => set("email_support", e.target.value)} placeholder="support@yourbrand.com" /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Primary Phone"><input className={inputCls} value={data.phone_primary || ""} onChange={e => set("phone_primary", e.target.value)} placeholder="+44 7911 123456" /></Field>
          <Field label="Secondary Phone"><input className={inputCls} value={data.phone_secondary || ""} onChange={e => set("phone_secondary", e.target.value)} placeholder="+265 991 234567" /></Field>
          <Field label="WhatsApp"><input className={inputCls} value={data.whatsapp || ""} onChange={e => set("whatsapp", e.target.value)} placeholder="+44 7911 123456" /></Field>
        </div>
        <Field label="Website"><input className={inputCls} value={data.website || ""} onChange={e => set("website", e.target.value)} placeholder="https://yourbrand.com" /></Field>
      </SectionCard>

      {/* Location */}
      <SectionCard title="Location" desc="Your physical or registered business address.">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country">
            <select className={`${inputCls} appearance-none`} value={data.country || ""} onChange={e => set("country", e.target.value)}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(0,0,0,0.3)'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32 }}>
              <option value="">Select…</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="City"><input className={inputCls} value={data.city || ""} onChange={e => set("city", e.target.value)} placeholder="London" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="State / Province"><input className={inputCls} value={data.state_province || ""} onChange={e => set("state_province", e.target.value)} placeholder="England" /></Field>
          <Field label="Postcode / ZIP"><input className={inputCls} value={data.postal_code || ""} onChange={e => set("postal_code", e.target.value)} placeholder="SW1A 1AA" /></Field>
        </div>
        <Field label="Street Address">
          <textarea className={`${inputCls} resize-none`} rows={2} value={data.address || ""} onChange={e => set("address", e.target.value)} placeholder="123 High Street, Westminster" />
        </Field>
        <Field label="Google Maps URL">
          <input className={inputCls} value={data.map_url || ""} onChange={e => set("map_url", e.target.value)} placeholder="https://maps.google.com/?q=…" />
          <p className="text-[9px] text-black/25 font-medium mt-1 font-[Inter,sans-serif]">Paste a Google Maps share link — shown as a map button on your public profile.</p>
        </Field>
      </SectionCard>

      {/* Social */}
      <SectionCard title="Social Media" desc="Your brand's online presence.">
        <div className="grid grid-cols-2 gap-3">
          {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
            <Field key={key} label={label}>
              <input type="url" className={inputCls} value={(data as any)[key] || ""} onChange={e => set(key as keyof BusinessInfo, e.target.value)} placeholder={placeholder} />
            </Field>
          ))}
        </div>
      </SectionCard>

      <div className="flex items-center gap-3">
        <PrimaryBtn onClick={save} disabled={saving}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Business Info
        </PrimaryBtn>
        {msg && <MsgTag type={msg.type} text={msg.text} />}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type TabId = "security" | "organisation" | "business";

const TABS: { id: TabId; icon: any; label: string }[] = [
  { id: "security",     icon: Shield,    label: "Security" },
  { id: "organisation", icon: Building2, label: "Organisation" },
  { id: "business",     icon: Briefcase, label: "Business Info" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("security");

  return (
    <div className="min-h-screen font-[Inter,sans-serif]" style={{ background: "#f4f4f6" }}>
      {/* Dot-grid texture */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(124,85,246,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(124,85,246,0.025) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />

      <div className="relative max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/28 mb-2">Configuration</p>
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-[#1a1a2e] leading-none">Settings</h1>
          <p className="text-[12px] text-black/35 font-medium mt-1.5">Manage your account, organisation, and business profile.</p>
        </div>

        <div className="flex gap-5 items-start">
          {/* Nav */}
          <nav className="w-44 flex-shrink-0 flex flex-col gap-1 sticky top-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/25 mb-1 px-1">Menu</p>
            {TABS.map(t => (
              <NavItem key={t.id} active={activeTab === t.id} icon={t.icon} label={t.label} onClick={() => setActiveTab(t.id)} />
            ))}
            {/* Members link */}
            <div className="mt-3 pt-3 border-t border-black/[0.06]">
              <a href="/dashboard/members" className={[
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[13px] text-[12px] font-semibold text-left transition-all duration-150 border font-[Inter,sans-serif] no-underline",
                "bg-transparent border-transparent text-black/40 hover:bg-white/60 hover:border-black/[0.07] hover:text-black/65",
              ].join(" ")}>
                <span className="text-black/30 text-sm">👥</span> Members
              </a>
              <a href="/dashboard/organisations" className={[
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[13px] text-[12px] font-semibold text-left transition-all duration-150 border font-[Inter,sans-serif] no-underline",
                "bg-transparent border-transparent text-black/40 hover:bg-white/60 hover:border-black/[0.07] hover:text-black/65",
              ].join(" ")}>
                <span className="text-black/30 text-sm">🏢</span> Organisations
              </a>
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === "security"     && <SecurityTab />}
            {activeTab === "organisation" && <OrganisationTab />}
            {activeTab === "business"     && <BusinessTab />}
          </div>
        </div>
      </div>

      <style>{`
        input[type='range']::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:linear-gradient(135deg,#7c3aed,#7c55f6); cursor:pointer; border:2px solid white; box-shadow:0 1px 6px rgba(124,85,246,0.45); }
      `}</style>
    </div>
  );
}
