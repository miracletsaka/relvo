"use client";

/**
 * org-profile-tabs/shared.tsx
 *
 * Design tokens, shared types, and all primitive components used across
 * the org-profile tab files. Import from here — never re-declare in tabs.
 */

import { useEffect, useRef, useState } from "react";
import { uploadFileToSpaces } from "@/lib/upload-client";

// ─── API helper ───────────────────────────────────────────────────────────────

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...((opts.headers as any) || {}) },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail || json.message || `Error ${res.status}`);
  return json as T;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

export const C = {
  bg:       "#0c0c0f",
  surface:  "rgba(255,255,255,0.025)",
  border:   "rgba(255,255,255,0.07)",
  borderHi: "rgba(124,58,237,0.45)",
  text:     "#e4e4e7",
  muted:    "rgba(255,255,255,0.35)",
  dim:      "rgba(255,255,255,0.15)",
  accent:   "#a78bfa",
  violet:   "#7c3aed",
  green:    "#34d399",
  red:      "#f87171",
  yellow:   "#fbbf24",
} as const;

// ─── Shared types ─────────────────────────────────────────────────────────────

export type Sponsor       = { id: string; name: string; logo_url?: string; website?: string; sort_order: number; is_active: boolean };
export type Review        = { id: string; author_name: string; rating: number; body?: string; source?: string; review_date?: string; is_featured: boolean };
export type Goal          = { id: string; label: string; is_preset: boolean; is_active: boolean };
export type Offer         = { id: string; title: string; description?: string; cta_text?: string; cta_url?: string; expires_at?: string; is_active: boolean };
export type Accreditation = { id: string; name: string; issuer?: string; year?: number; logo_url?: string; is_active: boolean };
export type Meta          = { id: string; key: string; value: string; category?: string };

export type BusinessInfo = {
  business_type?: string; founded_year?: number; company_size?: string;
  tagline?: string; description?: string; registration_no?: string; vat_number?: string;
  email_primary?: string; email_support?: string;
  phone_primary?: string; phone_secondary?: string; whatsapp?: string; website?: string;
  address?: string; city?: string; state_province?: string; postal_code?: string;
  country?: string; map_url?: string;
  facebook_url?: string; instagram_url?: string; linkedin_url?: string;
  twitter_url?: string; tiktok_url?: string; youtube_url?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const COUNTRIES = [
  "United Kingdom","United States","Australia","Canada","South Africa",
  "Nigeria","Kenya","Ghana","Zimbabwe","Zambia","Malawi","Tanzania","Uganda",
  "India","Pakistan","Bangladesh","Singapore","Malaysia","Philippines",
  "United Arab Emirates","Saudi Arabia","Qatar","Kuwait","Bahrain",
  "Ireland","Germany","France","Netherlands","Sweden","Norway","Denmark",
  "New Zealand","Jamaica","Trinidad and Tobago","Barbados",
];

export const BUSINESS_TYPES = ["Agency","E-commerce","SaaS","Retail","Healthcare","Education","Finance","Non-profit","Hospitality","Real Estate","Other"];
export const COMPANY_SIZES  = ["1–10","11–50","51–200","201–500","500+"];
export const PRESET_GOALS   = ["Brand Awareness","Lead Generation","Sales & Conversions","Community Engagement","Customer Retention","Product Launch","Event Promotion","Thought Leadership"];

export const SOCIAL_PLATFORMS = [
  { key: "facebook_url",  label: "Facebook",    placeholder: "https://facebook.com/yourbrand",  icon: "📘" },
  { key: "instagram_url", label: "Instagram",   placeholder: "https://instagram.com/yourbrand", icon: "📸" },
  { key: "linkedin_url",  label: "LinkedIn",    placeholder: "https://linkedin.com/company/…",  icon: "💼" },
  { key: "twitter_url",   label: "X / Twitter", placeholder: "https://x.com/yourbrand",         icon: "🐦" },
  { key: "tiktok_url",    label: "TikTok",      placeholder: "https://tiktok.com/@yourbrand",   icon: "🎵" },
  { key: "youtube_url",   label: "YouTube",     placeholder: "https://youtube.com/@yourbrand",  icon: "▶️" },
] as const;

// ─── Primitive components ─────────────────────────────────────────────────────

export function Inp({ label, value, onChange, placeholder, type = "text", disabled }: any) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.dim, fontFamily: "DM Mono, monospace", marginBottom: 6 }}>{label}</div>}
      <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        style={{ width: "100%", boxSizing: "border-box" as const, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", color: C.text, fontSize: 12, fontFamily: "DM Mono, monospace", outline: "none", transition: "border-color 0.15s, box-shadow 0.15s" }}
        onFocus={e => { e.target.style.borderColor = C.borderHi; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
        onBlur={e  => { e.target.style.borderColor = C.border;   e.target.style.boxShadow = "none"; }}
      />
    </div>
  );
}

export function Sel({ label, value, onChange, options }: { label?: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.dim, fontFamily: "DM Mono, monospace", marginBottom: 6 }}>{label}</div>}
      <select value={value ?? ""} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", color: value ? C.text : C.muted, fontSize: 12, fontFamily: "DM Mono, monospace", outline: "none" }}>
        <option className="text-black" value="">— Select —</option>
        {options.map(o => <option className="text-black" key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function Textarea({ label, value, onChange, placeholder, rows = 3 }: any) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.dim, fontFamily: "DM Mono, monospace", marginBottom: 6 }}>{label}</div>}
      <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width: "100%", boxSizing: "border-box" as const, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", color: C.text, fontSize: 12, fontFamily: "DM Mono, monospace", outline: "none", resize: "vertical", transition: "border-color 0.15s" }}
        onFocus={e => { e.target.style.borderColor = C.borderHi; }}
        onBlur={e  => { e.target.style.borderColor = C.border; }}
      />
    </div>
  );
}

export function Btn({ onClick, disabled, loading, children, variant = "primary", small }: any) {
  const bg     = variant === "primary" ? `linear-gradient(135deg,${C.violet},#4f46e5)` : variant === "danger" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)";
  const border = variant === "danger" ? "1px solid rgba(239,68,68,0.25)" : "none";
  const color  = variant === "danger" ? C.red : C.text;
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: small ? "6px 12px" : "9px 18px", background: disabled || loading ? "rgba(255,255,255,0.04)" : bg, border, borderRadius: 10, color: disabled || loading ? C.dim : color, fontSize: small ? 10 : 11, fontWeight: 700, fontFamily: "Syne, sans-serif", cursor: disabled || loading ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
      {loading && <span style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "op-spin 0.7s linear infinite" }} />}
      {children}
    </button>
  );
}

export function Card({ children, style }: any) {
  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", marginBottom: 14, ...style }}>{children}</div>;
}

export function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: color + "18", border: `1px solid ${color}35`, color, fontFamily: "DM Mono, monospace", letterSpacing: "0.06em" }}>{label}</span>;
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ fontSize: 13, letterSpacing: 1 }}>
      {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= Math.round(rating) ? C.yellow : C.dim }}>★</span>)}
    </span>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
      <div style={{ width: 36, height: 20, borderRadius: 10, background: value ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.07)", border: `1px solid ${value ? "rgba(52,211,153,0.35)" : C.border}`, position: "relative", transition: "all 0.2s" }}>
        <div style={{ position: "absolute", top: 2, left: value ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: value ? C.green : C.dim, transition: "left 0.2s" }} />
      </div>
    </button>
  );
}

export function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: "Syne, sans-serif" }}>{title}</div>
      {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function TabHeader({ title, sub, onAdd }: { title: string; sub?: string; onAdd?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap" as const, gap: 10 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, fontFamily: "Syne, sans-serif" }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{sub}</div>}
      </div>
      {onAdd && (
        <Btn onClick={onAdd} small>+ Add</Btn>
      )}
    </div>
  );
}

export function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 14px" }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", whiteSpace: "nowrap" as const }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: "center" as const, padding: "48px 20px", color: C.dim }}>
      <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "Syne, sans-serif" }}>{text}</div>
      <div style={{ fontSize: 11, marginTop: 4, fontFamily: "DM Mono, monospace" }}>Click "+ Add" to get started</div>
    </div>
  );
}

export function LoadingCards() {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
      {[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }} />)}
    </div>
  );
}

export function PhoneInp({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace", marginBottom: 6 }}>{label}</div>}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 14, pointerEvents: "none" }}>📞</span>
        <input type="tel" value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder || "+44 7911 123456"}
          style={{ width: "100%", boxSizing: "border-box" as const, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 13px 10px 38px", color: "#f1f5f9", fontSize: 12, fontFamily: "DM Mono, monospace", outline: "none" }}
          onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)"; }}
          onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.boxShadow = "none"; }}
        />
      </div>
      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", margin: "4px 0 0", fontFamily: "DM Mono, monospace" }}>Include country code, e.g. +44, +1, +265</p>
    </div>
  );
}

// ─── ImageInput ───────────────────────────────────────────────────────────────

export function ImageInput({ label, value, onChange, placeholder = "https://…", accept = "image/*" }: {
  label?: string; value: string; onChange: (url: string) => void; placeholder?: string; accept?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab,      setTab]      = useState<"url" | "upload">("url");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading,setUploading]= useState(false);
  const [err,      setErr]      = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setErr("Only image files are supported"); return; }
    if (file.size > 10 * 1024 * 1024)   { setErr("File must be under 10 MB"); return; }
    setErr(null); setUploading(true); setProgress(5);
    try {
      const url = await uploadFileToSpaces(file);
      onChange(url); setTab("url");
    } catch (e: any) { setErr(e.message || "Upload failed"); }
    finally { setUploading(false); setTimeout(() => setProgress(0), 600); }
  };

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };

  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "5px 0", background: active ? "rgba(124,58,237,0.15)" : "transparent",
    border: `1px solid ${active ? "rgba(124,58,237,0.35)" : "transparent"}`, borderRadius: 7,
    color: active ? C.accent : C.dim, fontSize: 10, fontWeight: 700, cursor: "pointer",
    fontFamily: "Syne, sans-serif", transition: "all 0.15s",
  });

  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.dim, fontFamily: "DM Mono, monospace", marginBottom: 6 }}>{label}</div>}
      <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: 3, marginBottom: 7 }}>
        <button style={tabBtn(tab === "url")}    onClick={() => setTab("url")}>🔗 URL</button>
        <button style={tabBtn(tab === "upload")} onClick={() => setTab("upload")}>⬆ Upload</button>
      </div>
      {tab === "url" ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="url" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", color: C.text, fontSize: 12, fontFamily: "DM Mono, monospace", outline: "none" }}
            onFocus={e => { e.target.style.borderColor = C.borderHi; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
            onBlur={e  => { e.target.style.borderColor = C.border;   e.target.style.boxShadow = "none"; }}
          />
          {value && <img src={value} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}`, flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
        </div>
      ) : (
        <>
          <input ref={fileRef} type="file" accept={accept} style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
            onClick={() => !uploading && fileRef.current?.click()}
            style={{ border: `2px dashed ${dragging ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, padding: "18px 12px", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 6, background: dragging ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)", cursor: uploading ? "wait" : "pointer", transition: "all 0.2s", textAlign: "center" as const }}>
            {uploading ? (
              <>
                <div style={{ width: "80%", maxWidth: 140, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg,${C.violet},#4f46e5)`, borderRadius: 2, transition: "width 0.3s ease" }} />
                </div>
                <span style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono, monospace" }}>Uploading… {progress}%</span>
              </>
            ) : (
              <>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <span style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono, monospace" }}>{dragging ? "Drop image here" : "Click or drag image"}</span>
                <span style={{ fontSize: 9, color: C.dim, fontFamily: "DM Mono, monospace" }}>PNG · JPG · WEBP · Max 10 MB</span>
              </>
            )}
          </div>
          {value && !uploading && (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 8 }}>
              <img src={value} alt="" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span style={{ fontSize: 9, color: C.green, fontFamily: "DM Mono, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>✓ {value.split("/").pop()}</span>
              <button onClick={() => onChange("")} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 12, padding: 0, flexShrink: 0 }}>✕</button>
            </div>
          )}
        </>
      )}
      {err && <div style={{ marginTop: 5, fontSize: 10, color: C.red, fontFamily: "DM Mono, monospace" }}>⚠ {err}</div>}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export function Toast({ msg, onClose }: { msg: { type: "ok" | "err"; text: string }; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: msg.type === "ok" ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${msg.type === "ok" ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: 14, color: msg.type === "ok" ? C.green : C.red, fontSize: 12, fontWeight: 700, fontFamily: "Syne, sans-serif", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", maxWidth: 360 }}>
      {msg.type === "ok" ? "✓" : "✕"} {msg.text}
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.5, marginLeft: 6, padding: 0, fontSize: 14 }}>✕</button>
    </div>
  );
}

// ─── LogoSection ──────────────────────────────────────────────────────────────

export function LogoSection({ currentLogoUrl, onSaved, toast }: {
  currentLogoUrl: string | null;
  onSaved: (url: string | null) => void;
  toast: (ok: boolean, msg: string) => void;
}) {
  const [logoUrl,  setLogoUrl]  = useState(currentLogoUrl || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview,  setPreview]  = useState(currentLogoUrl || "");
  const [saving,   setSaving]   = useState(false);
  const [drag,     setDrag]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLogoUrl(currentLogoUrl || ""); setPreview(currentLogoUrl || ""); }, [currentLogoUrl]);

  const pickFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setLogoFile(file); setLogoUrl("");
    const r = new FileReader();
    r.onload = e => setPreview(e.target?.result as string);
    r.readAsDataURL(file);
  };

  const saveLogo = async () => {
    setSaving(true);
    try {
      let finalUrl = logoUrl.trim();
      if (logoFile) finalUrl = await uploadFileToSpaces(logoFile);
      if (!finalUrl) { toast(false, "Please provide a logo or URL"); return; }
      await api("/organisations/me", { method: "PATCH", body: JSON.stringify({ logo_url: finalUrl }) });
      setLogoUrl(finalUrl); setLogoFile(null); setPreview(finalUrl); onSaved(finalUrl);
      toast(true, "Logo saved");
    } catch (e: any) { toast(false, e.message); }
    finally { setSaving(false); }
  };

  const removeLogo = async () => {
    setSaving(true);
    try {
      await api("/organisations/me", { method: "PATCH", body: JSON.stringify({ logo_url: "" }) });
      setLogoUrl(""); setLogoFile(null); setPreview(""); onSaved(null);
      toast(true, "Logo removed");
    } catch (e: any) { toast(false, e.message); }
    finally { setSaving(false); }
  };

  const isDirty = !!(logoFile || (logoUrl.trim() && logoUrl.trim() !== currentLogoUrl));

  return (
    <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.dim, fontFamily: "DM Mono, monospace", marginBottom: 10 }}>Organisation Logo</div>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", margin: "-4px 0 14px" }}>Displayed on your public profile and embedded in review cards</p>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 96, height: 96, borderRadius: 16, border: `1.5px solid ${preview ? C.borderHi : C.border}`, background: preview ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {preview ? <img src={preview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 10 }} onError={() => setPreview("")} /> : <span style={{ fontSize: 32, opacity: 0.35 }}>🏢</span>}
          </div>
          {preview && (
            <button onClick={removeLogo} disabled={saving} style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: C.bg, border: `1.5px solid ${C.border}`, color: C.red, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: 9 }}>
          <div onClick={() => fileRef.current?.click()} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files[0]); }}
            style={{ border: `1.5px dashed ${drag ? C.borderHi : logoFile ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", background: drag ? "rgba(124,58,237,0.05)" : "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s" }}>
            <span style={{ fontSize: 18 }}>📁</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: logoFile ? C.green : C.muted, margin: 0 }}>{logoFile ? `${logoFile.name} ✓` : "Drop logo here or click to browse"}</p>
              <p style={{ fontSize: 9, color: C.dim, margin: "2px 0 0", fontFamily: "DM Mono, monospace" }}>PNG · SVG · JPG — transparent bg recommended</p>
            </div>
            {logoFile && <button type="button" onClick={e => { e.stopPropagation(); setLogoFile(null); setPreview(currentLogoUrl || ""); }} style={{ background: "none", border: "none", color: C.red, fontSize: 14, cursor: "pointer", padding: "2px 6px" }}>✕</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => pickFile(e.target.files?.[0] || null)} />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 9, color: C.dim, fontFamily: "DM Mono, monospace", flexShrink: 0 }}>OR URL</span>
            <input type="url" value={logoUrl} onChange={e => { setLogoUrl(e.target.value); setLogoFile(null); setPreview(e.target.value); }} placeholder="https://yourbrand.com/logo.png" disabled={!!logoFile}
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 12px", color: C.text, fontSize: 11, fontFamily: "DM Mono, monospace", outline: "none", opacity: logoFile ? 0.4 : 1 }}
              onFocus={e => { if (!logoFile) e.target.style.borderColor = C.borderHi; }}
              onBlur={e => { e.target.style.borderColor = C.border; }} />
          </div>
          {isDirty && (
            <button onClick={saveLogo} disabled={saving} style={{ alignSelf: "flex-start", padding: "8px 18px", background: saving ? "rgba(255,255,255,0.06)" : "rgba(124,58,237,0.85)", border: "none", borderRadius: 9, color: saving ? C.dim : "#fff", fontSize: 11, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7 }}>
              {saving ? <><span style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "op-spin 0.6s linear infinite" }} />Saving…</> : "Save Logo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
