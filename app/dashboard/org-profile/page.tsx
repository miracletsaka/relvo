"use client";
import ReviewsManagerPage from "@/components/review-manager";
import { ReviewsTab } from "@/components/reviews-tab-and-mobile-guard";
import { uploadFileToSpaces } from "@/lib/upload-client";
/**
 * app/dashboard/org-profile/page.tsx
 * Full org profile management — all image fields support
 * both URL input AND direct file upload to DO Spaces.
 */
import { useEffect, useState, useCallback, useRef } from "react";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...((opts.headers as any) || {}) },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail || json.message || `Error ${res.status}`);
  return json as T;
}

// ── Types ──────────────────────────────────────────────────────────────────────
type Sponsor       = { id: string; name: string; logo_url?: string; website?: string; sort_order: number; is_active: boolean };
type Review        = { id: string; author_name: string; rating: number; body?: string; source?: string; review_date?: string; is_featured: boolean };
type BusinessInfo = {
  // identity
  business_type?:   string;
  founded_year?:    number;
  company_size?:    string;
  tagline?:         string;
  description?:     string;
  registration_no?: string;
  vat_number?:      string;
  // contact
  email_primary?:   string;
  email_support?:   string;
  phone_primary?:   string;
  phone_secondary?: string;
  whatsapp?:        string;
  website?:         string;
  // location
  address?:         string;
  city?:            string;
  state_province?:  string;
  postal_code?:     string;
  country?:         string;
  map_url?:         string;
  // social
  facebook_url?:    string;
  instagram_url?:   string;
  linkedin_url?:    string;
  twitter_url?:     string;
  tiktok_url?:      string;
  youtube_url?:     string;
};
 
// Country list — ISO common subset
const COUNTRIES = [
  "United Kingdom","United States","Australia","Canada","South Africa",
  "Nigeria","Kenya","Ghana","Zimbabwe","Zambia","Malawi","Tanzania","Uganda",
  "India","Pakistan","Bangladesh","Singapore","Malaysia","Philippines",
  "United Arab Emirates","Saudi Arabia","Qatar","Kuwait","Bahrain",
  "Ireland","Germany","France","Netherlands","Sweden","Norway","Denmark",
  "New Zealand","Jamaica","Trinidad and Tobago","Barbados",
];

type Goal          = { id: string; label: string; is_preset: boolean; is_active: boolean };
type Offer         = { id: string; title: string; description?: string; cta_text?: string; cta_url?: string; expires_at?: string; is_active: boolean };
type Accreditation = { id: string; name: string; issuer?: string; year?: number; logo_url?: string; is_active: boolean };
type Meta          = { id: string; key: string; value: string; category?: string };

const PRESET_GOALS   = ["Brand Awareness","Lead Generation","Sales & Conversions","Community Engagement","Customer Retention","Product Launch","Event Promotion","Thought Leadership"];
const BUSINESS_TYPES = ["Agency","E-commerce","SaaS","Retail","Healthcare","Education","Finance","Non-profit","Hospitality","Real Estate","Other"];
const COMPANY_SIZES  = ["1–10","11–50","51–200","201–500","500+"];

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
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
};

// ── Social platform config ────────────────────────────────────────────────────
const SOCIAL_PLATFORMS = [
  { key: "facebook_url",  label: "Facebook",  placeholder: "https://facebook.com/yourbrand",  icon: "📘" },
  { key: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/yourbrand", icon: "📸" },
  { key: "linkedin_url",  label: "LinkedIn",  placeholder: "https://linkedin.com/company/…",  icon: "💼" },
  { key: "twitter_url",   label: "X / Twitter", placeholder: "https://x.com/yourbrand",       icon: "🐦" },
  { key: "tiktok_url",    label: "TikTok",    placeholder: "https://tiktok.com/@yourbrand",   icon: "🎵" },
  { key: "youtube_url",   label: "YouTube",   placeholder: "https://youtube.com/@yourbrand",  icon: "▶️" },
] as const;
 
// ── Inline section divider ────────────────────────────────────────────────────
function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 14px" }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}
 
// ── Phone input with country-code prefix hint ─────────────────────────────────
function PhoneInp({
  label, value, onChange, placeholder,
}: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace", marginBottom: 6 }}>
          {label}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 14, pointerEvents: "none" }}>📞</span>
        <input
          type="tel"
          value={value ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || "+44 7911 123456"}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10, padding: "10px 13px 10px 38px",
            color: "#f1f5f9", fontSize: 12,
            fontFamily: "DM Mono, monospace", outline: "none",
          }}
          onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)"; }}
          onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.boxShadow = "none"; }}
        />
      </div>
      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", margin: "4px 0 0", fontFamily: "DM Mono, monospace" }}>
        Include country code, e.g. +44, +1, +265
      </p>
    </div>
  );
}

// ── ImageInput — URL + Upload in one component ─────────────────────────────────
function ImageInput({
  label, value, onChange, placeholder = "https://…", accept = "image/*",
}: {
  label?: string; value: string; onChange: (url: string) => void;
  placeholder?: string; accept?: string;
}) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [tab,      setTab]      = useState<"url" | "upload">("url");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [err,      setErr]      = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setErr("Only image files are supported"); return; }
    if (file.size > 10 * 1024 * 1024)   { setErr("File must be under 10 MB"); return; }
    setErr(null);
    setUploading(true);
    setProgress(5);
    try {
      const url = await uploadFileToSpaces(file);
      onChange(url);
      setTab("url");
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 600);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "5px 0",
    background: active ? "rgba(124,58,237,0.15)" : "transparent",
    border: `1px solid ${active ? "rgba(124,58,237,0.35)" : "transparent"}`,
    borderRadius: 7, color: active ? C.accent : C.dim,
    fontSize: 10, fontWeight: 700, cursor: "pointer",
    fontFamily: "Syne, sans-serif", transition: "all 0.15s",
  });

  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.dim, fontFamily: "DM Mono, monospace", marginBottom: 6 }}>
          {label}
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: 3, marginBottom: 7 }}>
        <button style={tabBtnStyle(tab === "url")}    onClick={() => setTab("url")}>🔗 URL</button>
        <button style={tabBtnStyle(tab === "upload")} onClick={() => setTab("upload")}>⬆ Upload</button>
      </div>

      {tab === "url" ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="url" value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", color: C.text, fontSize: 12, fontFamily: "DM Mono, monospace", outline: "none" }}
            onFocus={e => { e.target.style.borderColor = C.borderHi; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
            onBlur={e =>  { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
          />
          {value && (
            <img src={value} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}`, flexShrink: 0 }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
        </div>
      ) : (
        <>
          <input ref={fileRef} type="file" accept={accept} style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !uploading && fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 10, padding: "18px 12px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
              background: dragging ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)",
              cursor: uploading ? "wait" : "pointer", transition: "all 0.2s", textAlign: "center",
            }}
          >
            {uploading ? (
              <>
                <div style={{ width: "80%", maxWidth: 140, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg,${C.violet},#4f46e5)`, borderRadius: 2, transition: "width 0.3s ease" }} />
                </div>
                <span style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono, monospace" }}>Uploading to Spaces… {progress}%</span>
              </>
            ) : (
              <>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <span style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono, monospace" }}>{dragging ? "Drop image here" : "Click or drag image"}</span>
                <span style={{ fontSize: 9, color: C.dim, fontFamily: "DM Mono, monospace" }}>PNG · JPG · WEBP · Max 10MB · Uploads to DO Spaces</span>
              </>
            )}
          </div>

          {value && !uploading && (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 8 }}>
              <img src={value} alt="" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 5, flexShrink: 0 }}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span style={{ fontSize: 9, color: C.green, fontFamily: "DM Mono, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                ✓ {value.split("/").pop()}
              </span>
              <button onClick={() => onChange("")} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 12, padding: 0, flexShrink: 0 }}>✕</button>
            </div>
          )}
        </>
      )}

      {err && (
        <div style={{ marginTop: 5, fontSize: 10, color: C.red, fontFamily: "DM Mono, monospace", display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {err}
        </div>
      )}
    </div>
  );
}

// ── Shared primitives ──────────────────────────────────────────────────────────

function Inp({ label, value, onChange, placeholder, type = "text", disabled }: any) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.dim, fontFamily: "DM Mono, monospace", marginBottom: 6 }}>{label}</div>}
      <input
        type={type} value={value ?? ""} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", color: C.text, fontSize: 12, fontFamily: "DM Mono, monospace", outline: "none", transition: "border-color 0.15s, box-shadow 0.15s" }}
        onFocus={e => { e.target.style.borderColor = C.borderHi; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
        onBlur={e  => { e.target.style.borderColor = C.border;   e.target.style.boxShadow = "none"; }}
      />
    </div>
  );
}

function Sel({ label, value, onChange, options }: { label?: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.dim, fontFamily: "DM Mono, monospace", marginBottom: 6 }}>{label}</div>}
      <select value={value ?? ""} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", color: value ? C.text : C.muted, fontSize: 12, fontFamily: "DM Mono, monospace", outline: "none" }}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 3 }: any) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.dim, fontFamily: "DM Mono, monospace", marginBottom: 6 }}>{label}</div>}
      <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", color: C.text, fontSize: 12, fontFamily: "DM Mono, monospace", outline: "none", resize: "vertical", transition: "border-color 0.15s" }}
        onFocus={e => { e.target.style.borderColor = C.borderHi; }}
        onBlur={e  => { e.target.style.borderColor = C.border; }}
      />
    </div>
  );
}

function Btn({ onClick, disabled, loading, children, variant = "primary", small }: any) {
  const bg = variant === "primary" ? `linear-gradient(135deg,${C.violet},#4f46e5)`
           : variant === "danger"  ? "rgba(239,68,68,0.12)"
           : "rgba(255,255,255,0.06)";
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

function Toast({ msg, onClose }: { msg: { type: "ok" | "err"; text: string }; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: msg.type === "ok" ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${msg.type === "ok" ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: 14, color: msg.type === "ok" ? C.green : C.red, fontSize: 12, fontWeight: 700, fontFamily: "Syne, sans-serif", animation: "op-fadein 0.3s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", maxWidth: 360 }}>
      {msg.type === "ok" ? "✓" : "✕"} {msg.text}
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.5, marginLeft: 6, padding: 0, fontSize: 14 }}>✕</button>
    </div>
  );
}

function Card({ children, style }: any) {
  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", marginBottom: 14, ...style }}>{children}</div>;
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: color + "18", border: `1px solid ${color}35`, color, fontFamily: "DM Mono, monospace", letterSpacing: "0.06em" }}>{label}</span>;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ fontSize: 13, letterSpacing: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? C.yellow : C.dim }}>★</span>
      ))}
    </span>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
      <div style={{ width: 36, height: 20, borderRadius: 10, background: value ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.07)", border: `1px solid ${value ? "rgba(52,211,153,0.35)" : C.border}`, position: "relative", transition: "all 0.2s" }}>
        <div style={{ position: "absolute", top: 2, left: value ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: value ? C.green : C.dim, transition: "left 0.2s" }} />
      </div>
    </button>
  );
}

function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: "Syne, sans-serif" }}>{title}</div>
      {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function TabHeader({ title, sub, onAdd }: { title: string; sub?: string; onAdd?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, fontFamily: "Syne, sans-serif" }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{sub}</div>}
      </div>
      {onAdd && <Btn onClick={onAdd}>+ Add</Btn>}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: C.dim }}>
      <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "Syne, sans-serif" }}>{text}</div>
      <div style={{ fontSize: 11, marginTop: 4, fontFamily: "DM Mono, monospace" }}>Click "+ Add" to get started</div>
    </div>
  );
}

function LoadingCards() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height: 72, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }} />
      ))}
    </div>
  );
}

function LogoSection({
  currentLogoUrl,
  onSaved,
  toast,
}: {
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
 
  useEffect(() => {
    setLogoUrl(currentLogoUrl || "");
    setPreview(currentLogoUrl || "");
  }, [currentLogoUrl]);
 
  const pickFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setLogoFile(file);
    setLogoUrl("");
    const r = new FileReader();
    r.onload = e => setPreview(e.target?.result as string);
    r.readAsDataURL(file);
  };
 
  const saveLogo = async () => {
    setSaving(true);
    try {
      let finalUrl = logoUrl.trim();
      if (logoFile) {
        finalUrl = await uploadFileToSpaces(logoFile);
      }
      if (!finalUrl) { toast(false, "Please provide a logo or URL"); return; }
      await api("/organisations/me", {
        method: "PATCH",
        body: JSON.stringify({ logo_url: finalUrl }),
      });
      setLogoUrl(finalUrl);
      setLogoFile(null);
      setPreview(finalUrl);
      onSaved(finalUrl);
      toast(true, "Logo saved");
    } catch (e: any) {
      toast(false, e.message);
    } finally {
      setSaving(false);
    }
  };
 
  const removeLogo = async () => {
    setSaving(true);
    try {
      await api("/organisations/me", {
        method: "PATCH",
        body: JSON.stringify({ logo_url: "" }),
      });
      setLogoUrl(""); setLogoFile(null); setPreview("");
      onSaved(null);
      toast(true, "Logo removed");
    } catch (e: any) { toast(false, e.message); }
    finally { setSaving(false); }
  };
 
  const isDirty = !!(logoFile || (logoUrl.trim() && logoUrl.trim() !== currentLogoUrl));
 
  return (
    <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.dim, fontFamily: "DM Mono, monospace", marginBottom: 10 }}>
        Organisation Logo
      </div>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", margin: "-4px 0 14px" }}>
        Displayed on your public profile and embedded in review cards
      </p>
 
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        {/* Preview */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 96, height: 96, borderRadius: 16, border: `1.5px solid ${preview ? C.borderHi : C.border}`, background: preview ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", transition: "border-color 0.2s" }}>
            {preview
              ? <img src={preview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 10 }} onError={() => setPreview("")} />
              : <span style={{ fontSize: 32, opacity: 0.35 }}>🏢</span>
            }
          </div>
          {preview && (
            <button onClick={removeLogo} disabled={saving}
              style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: C.bg, border: `1.5px solid ${C.border}`, color: C.red, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, lineHeight: 1 }}>
              ✕
            </button>
          )}
        </div>
 
        {/* Upload + URL */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files[0]); }}
            style={{ border: `1.5px dashed ${drag ? C.borderHi : logoFile ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", background: drag ? "rgba(124,58,237,0.05)" : "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>📁</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: logoFile ? C.green : C.muted, margin: 0 }}>
                {logoFile ? `${logoFile.name} ✓` : "Drop logo here or click to browse"}
              </p>
              <p style={{ fontSize: 9, color: C.dim, margin: "2px 0 0", fontFamily: "DM Mono, monospace" }}>PNG · SVG · JPG — transparent bg recommended</p>
            </div>
            {logoFile && (
              <button type="button" onClick={e => { e.stopPropagation(); setLogoFile(null); setPreview(currentLogoUrl || ""); }}
                style={{ background: "none", border: "none", color: C.red, fontSize: 14, cursor: "pointer", padding: "2px 6px" }}>✕</button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => pickFile(e.target.files?.[0] || null)} />
 
          {/* URL row */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 9, color: C.dim, fontFamily: "DM Mono, monospace", flexShrink: 0 }}>OR URL</span>
            <input type="url" value={logoUrl} onChange={e => { setLogoUrl(e.target.value); setLogoFile(null); setPreview(e.target.value); }}
              placeholder="https://yourbrand.com/logo.png" disabled={!!logoFile}
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 12px", color: C.text, fontSize: 11, fontFamily: "DM Mono, monospace", outline: "none", opacity: logoFile ? 0.4 : 1 }}
              onFocus={e => { if (!logoFile) e.target.style.borderColor = C.borderHi; }}
              onBlur={e => { e.target.style.borderColor = C.border; }} />
          </div>
 
          {isDirty && (
            <button onClick={saveLogo} disabled={saving}
              style={{ alignSelf: "flex-start", padding: "8px 18px", background: saving ? "rgba(255,255,255,0.06)" : "rgba(124,58,237,0.85)", border: "none", borderRadius: 9, color: saving ? C.dim : "#fff", fontSize: 11, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
              {saving
                ? <><span style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "op-spin 0.6s linear infinite" }} />Saving…</>
                : "Save Logo"
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// TAB: Business Info
// ─────────────────────────────────────────────────────────────────────────────
function BusinessTab({ toast }: { toast: (ok: boolean, msg: string) => void }) {
  const [data,    setData]    = useState<BusinessInfo>({});
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
 
  useEffect(() => {
    Promise.all([
      api<BusinessInfo>("/org-profile/business-info").catch(() => ({} as BusinessInfo)),
      api<{ logo_url?: string | null }>("/organisations/me").catch(() => ({})),
    ]).then(([biz, org]) => {
      setData(biz);
      setOrgLogo(org?.logo_url || null);
    }).finally(() => setLoading(false));
  }, []);
 
  const set = (field: keyof BusinessInfo, value: any) =>
    setData(d => ({ ...d, [field]: value }));
 
  const save = async () => {
    setSaving(true);
    try {
      const updated = await api<BusinessInfo>("/org-profile/business-info", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      setData(updated);
      toast(true, "Business info saved");
    } catch (e: any) {
      toast(false, e.message);
    } finally {
      setSaving(false);
    }
  };
 
  if (loading) return <LoadingCards />;
 
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
 
      {/* ── Identity ── */}
      <Card>
        <SectionHeading title="Identity" sub="How your business presents itself" />
 
        {/* LOGO — top of identity card */}
        <LogoSection
          currentLogoUrl={orgLogo}
          onSaved={url => setOrgLogo(url)}
          toast={toast}
        />
 
        <Inp label="Tagline" value={data.tagline}
          onChange={(v: string) => set("tagline", v)} placeholder="Transforming brands through intelligent content" />
        <Textarea label="Description" value={data.description}
          onChange={(v: string) => set("description", v)} placeholder="Tell us about your business…" rows={4} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Sel label="Business Type" value={data.business_type || ""} onChange={v => set("business_type", v)} options={BUSINESS_TYPES} />
          <Sel label="Company Size"  value={data.company_size  || ""} onChange={v => set("company_size",  v)} options={COMPANY_SIZES}  />
          <Inp label="Founded Year" type="number" value={data.founded_year}
            onChange={(v: string) => set("founded_year", v ? parseInt(v) : undefined)} placeholder="2019" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Inp label="Registration / Company Number" value={data.registration_no}
            onChange={(v: string) => set("registration_no", v)} placeholder="12345678" />
          <Inp label="VAT Number" value={data.vat_number}
            onChange={(v: string) => set("vat_number", v)} placeholder="GB123456789" />
        </div>
      </Card>
 
      {/* ── Contact ── */}
      <Card>
        <SectionHeading title="Contact Details" sub="How customers and partners can reach you" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Inp label="Primary Email" type="email" value={data.email_primary}
            onChange={(v: string) => set("email_primary", v)} placeholder="hello@yourbrand.com" />
          <Inp label="Support / Enquiries Email" type="email" value={data.email_support}
            onChange={(v: string) => set("email_support", v)} placeholder="support@yourbrand.com" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <PhoneInp label="Primary Phone"   value={data.phone_primary}   onChange={v => set("phone_primary",   v)} placeholder="+44 7911 123456" />
          <PhoneInp label="Secondary Phone" value={data.phone_secondary} onChange={v => set("phone_secondary", v)} placeholder="+265 991 234567" />
          <PhoneInp label="WhatsApp"        value={data.whatsapp}        onChange={v => set("whatsapp",        v)} placeholder="+44 7911 123456" />
        </div>
        <Inp label="Website" value={data.website}
          onChange={(v: string) => set("website", v)} placeholder="https://yourbrand.com" />
      </Card>
 
      {/* ── Location ── */}
      <Card>
        <SectionHeading title="Location" sub="Your physical or registered business address" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Sel label="Country" value={data.country || ""} onChange={v => set("country", v)} options={COUNTRIES} />
          <Inp label="City" value={data.city} onChange={(v: string) => set("city", v)} placeholder="London" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Inp label="State / Province / Region" value={data.state_province}
            onChange={(v: string) => set("state_province", v)} placeholder="England" />
          <Inp label="Postcode / ZIP" value={data.postal_code}
            onChange={(v: string) => set("postal_code", v)} placeholder="SW1A 1AA" />
        </div>
        <Textarea label="Street Address" value={data.address}
          onChange={(v: string) => set("address", v)} placeholder="123 High Street, Westminster" rows={2} />
        <Inp label="Google Maps URL" value={data.map_url}
          onChange={(v: string) => set("map_url", v)} placeholder="https://maps.google.com/?q=…" />
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", margin: "-8px 0 0", fontFamily: "DM Mono, monospace" }}>
          Paste a Google Maps share link or embed URL — shown as a map button on your public profile
        </p>
      </Card>
 
      {/* ── Social Links ── */}
      <Card>
        <SectionHeading title="Social Media" sub="Your brand's online presence" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {SOCIAL_PLATFORMS.map(({ key, label, placeholder, icon }) => (
            <div key={key} style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{icon}</span> {label}
              </div>
              <input type="url" value={(data as any)[key] ?? ""}
                onChange={e => set(key as keyof BusinessInfo, e.target.value)}
                placeholder={placeholder}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 13px", color: "#f1f5f9", fontSize: 12, fontFamily: "DM Mono, monospace", outline: "none" }}
                onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.boxShadow = "none"; }} />
            </div>
          ))}
        </div>
      </Card>
 
      {/* ── Save ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: 8 }}>
        <Btn onClick={save} loading={saving}>Save Business Info</Btn>
      </div>
 
    </div>
  );
}
 

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Sponsors  (logo_url now supports upload)
// ─────────────────────────────────────────────────────────────────────────────
function SponsorsTab({ toast }: { toast: (ok: boolean, msg: string) => void }) {
  const [items, setItems]     = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState({ name: "", logo_url: "", website: "" });
  const [adding, setAdding]   = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await api<Sponsor[]>("/org-profile/sponsors")); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.name.trim()) return;
    setAdding(true);
    try {
      await api("/org-profile/sponsors", { method: "POST", body: JSON.stringify({ name: form.name, logo_url: form.logo_url || null, website: form.website || null }) });
      setForm({ name: "", logo_url: "", website: "" });
      setShowForm(false);
      await load();
      toast(true, "Sponsor added");
    } catch (e: any) { toast(false, e.message); }
    finally { setAdding(false); }
  };

  const toggle = async (item: Sponsor) => {
    try { await api(`/org-profile/sponsors/${item.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !item.is_active }) }); await load(); }
    catch (e: any) { toast(false, e.message); }
  };

  const remove = async (id: string) => {
    try { await api(`/org-profile/sponsors/${id}`, { method: "DELETE" }); await load(); toast(true, "Sponsor removed"); }
    catch (e: any) { toast(false, e.message); }
  };

  if (loading) return <LoadingCards />;

  return (
    <div>
      <TabHeader title="Sponsors" sub={`${items.length} sponsor${items.length !== 1 ? "s" : ""}`} onAdd={() => setShowForm(v => !v)} />

      {showForm && (
        <Card style={{ border: `1px solid rgba(124,58,237,0.2)`, background: "rgba(124,58,237,0.04)", animation: "op-fadein 0.2s ease" }}>
          <SectionHeading title="Add Sponsor" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Name *" value={form.name} onChange={(v: string) => setForm(f => ({ ...f, name: v }))} placeholder="Relvo  Corp" />
            <Inp label="Website" value={form.website} onChange={(v: string) => setForm(f => ({ ...f, website: v }))} placeholder="https://Relvo .com" />
          </div>
          {/* ↓ Logo supports both URL and file upload */}
          <ImageInput label="Sponsor Logo" value={form.logo_url} onChange={url => setForm(f => ({ ...f, logo_url: url }))} placeholder="https://cdn.example.com/logo.png" />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={add} loading={adding} disabled={!form.name.trim()}>Add Sponsor</Btn>
            <Btn onClick={() => setShowForm(false)} variant="ghost">Cancel</Btn>
          </div>
        </Card>
      )}

      {items.length === 0 ? <EmptyState icon="🤝" text="No sponsors yet" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 10 }}>
          {items.map((s, i) => (
            <Card key={s.id} style={{ animation: `op-fadein 0.3s ease ${i * 0.04}s both`, opacity: s.is_active ? 1 : 0.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.name} style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤝</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  {s.website && <div style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.website}</div>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Toggle value={s.is_active} onChange={() => toggle(s)} />
                <Btn onClick={() => remove(s.id)} variant="danger" small>Remove</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Goals
// ─────────────────────────────────────────────────────────────────────────────
function GoalsTab({ toast }: { toast: (ok: boolean, msg: string) => void }) {
  const [selected, setSelected] = useState<Goal[]>([]);
  const [loading, setLoading]   = useState(true);
  const [custom, setCustom]     = useState("");
  const [adding, setAdding]     = useState(false);

  const load = useCallback(async () => {
    try { const d = await api<{ presets: string[]; selected: Goal[] }>("/org-profile/campaign-goals"); setSelected(d.selected); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeLabels = new Set(selected.filter(g => g.is_active).map(g => g.label));

  const togglePreset = async (label: string) => {
    const existing = selected.find(g => g.label === label);
    try {
      if (existing) {
        await api(`/org-profile/campaign-goals/${existing.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !existing.is_active }) });
      } else {
        await api("/org-profile/campaign-goals", { method: "POST", body: JSON.stringify({ label }) });
      }
      await load();
    } catch (e: any) { toast(false, e.message); }
  };

  const addCustom = async () => {
    if (!custom.trim()) return;
    setAdding(true);
    try { await api("/org-profile/campaign-goals", { method: "POST", body: JSON.stringify({ label: custom.trim() }) }); setCustom(""); await load(); toast(true, "Goal added"); }
    catch (e: any) { toast(false, e.message); }
    finally { setAdding(false); }
  };

  const remove = async (id: string) => {
    try { await api(`/org-profile/campaign-goals/${id}`, { method: "DELETE" }); await load(); }
    catch (e: any) { toast(false, e.message); }
  };

  if (loading) return <LoadingCards />;

  return (
    <div>
      <TabHeader title="Campaign Goals" sub="Define what your content campaigns aim to achieve" />
      <Card>
        <SectionHeading title="Preset Goals" sub="Click to toggle" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PRESET_GOALS.map(label => {
            const active = activeLabels.has(label);
            return (
              <button key={label} onClick={() => togglePreset(label)}
                style={{ padding: "8px 16px", borderRadius: 20, border: `1px solid ${active ? "rgba(124,58,237,0.5)" : C.border}`, background: active ? "rgba(124,58,237,0.12)" : "transparent", color: active ? C.accent : C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }}>
                {active && <span style={{ fontSize: 10 }}>✓</span>}
                {label}
              </button>
            );
          })}
        </div>
      </Card>
      <Card>
        <SectionHeading title="Custom Goals" sub="Add goals specific to your business" />
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustom()} placeholder="e.g. Trade Show Traffic"
            style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 13px", color: C.text, fontSize: 12, fontFamily: "DM Mono, monospace", outline: "none" }} />
          <Btn onClick={addCustom} loading={adding} disabled={!custom.trim()}>Add</Btn>
        </div>
        {selected.filter(g => !g.is_preset).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {selected.filter(g => !g.is_preset).map(g => (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 20, border: `1px solid rgba(124,58,237,0.4)`, background: "rgba(124,58,237,0.08)", color: C.accent, fontSize: 11, fontWeight: 700, fontFamily: "Syne, sans-serif" }}>
                {g.label}
                <button onClick={() => remove(g.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.5, padding: 0, fontSize: 12, lineHeight: 1 }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Offers
// ─────────────────────────────────────────────────────────────────────────────
function OffersTab({ toast }: { toast: (ok: boolean, msg: string) => void }) {
  const [items, setItems]     = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ title: "", description: "", cta_text: "", cta_url: "", expires_at: "" });
  const [adding, setAdding]   = useState(false);

  const load = useCallback(async () => {
    try { setItems(await api<Offer[]>("/org-profile/offers")); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.title.trim()) return;
    setAdding(true);
    try {
      await api("/org-profile/offers", { method: "POST", body: JSON.stringify({ title: form.title, description: form.description || null, cta_text: form.cta_text || null, cta_url: form.cta_url || null, expires_at: form.expires_at || null }) });
      setForm({ title: "", description: "", cta_text: "", cta_url: "", expires_at: "" });
      setShowForm(false);
      await load();
      toast(true, "Offer added");
    } catch (e: any) { toast(false, e.message); }
    finally { setAdding(false); }
  };

  const toggle = async (item: Offer) => {
    try { await api(`/org-profile/offers/${item.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !item.is_active }) }); await load(); }
    catch (e: any) { toast(false, e.message); }
  };

  const remove = async (id: string) => {
    try { await api(`/org-profile/offers/${id}`, { method: "DELETE" }); await load(); toast(true, "Removed"); }
    catch (e: any) { toast(false, e.message); }
  };

  if (loading) return <LoadingCards />;

  return (
    <div>
      <TabHeader title="Offers" sub={`${items.filter(o => o.is_active).length} active`} onAdd={() => setShowForm(v => !v)} />

      {showForm && (
        <Card style={{ border: `1px solid rgba(124,58,237,0.2)`, background: "rgba(124,58,237,0.04)", animation: "op-fadein 0.2s ease" }}>
          <SectionHeading title="New Offer" />
          <Inp label="Title *" value={form.title} onChange={(v: string) => setForm(f => ({ ...f, title: v }))} placeholder="20% Off This Month" />
          <Textarea label="Description" value={form.description} onChange={(v: string) => setForm(f => ({ ...f, description: v }))} placeholder="Tell customers about the offer…" rows={2} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="CTA Text" value={form.cta_text} onChange={(v: string) => setForm(f => ({ ...f, cta_text: v }))} placeholder="Book Now" />
            <Inp label="CTA URL"  value={form.cta_url}  onChange={(v: string) => setForm(f => ({ ...f, cta_url: v }))}  placeholder="https://…" />
          </div>
          <Inp label="Expires" type="date" value={form.expires_at} onChange={(v: string) => setForm(f => ({ ...f, expires_at: v }))} />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={add} loading={adding} disabled={!form.title.trim()}>Add Offer</Btn>
            <Btn onClick={() => setShowForm(false)} variant="ghost">Cancel</Btn>
          </div>
        </Card>
      )}

      {items.length === 0 ? <EmptyState icon="🎁" text="No offers yet" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((o, i) => (
            <Card key={o.id} style={{ animation: `op-fadein 0.3s ease ${i * 0.04}s both`, opacity: o.is_active ? 1 : 0.5 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{o.title}</span>
                    {o.is_active ? <Badge label="Active" color={C.green} /> : <Badge label="Inactive" color={C.dim} />}
                    {o.expires_at && <Badge label={`Expires ${o.expires_at}`} color={C.yellow} />}
                  </div>
                  {o.description && <p style={{ fontSize: 11, color: C.muted, margin: "0 0 6px", lineHeight: 1.5 }}>{o.description}</p>}
                  {o.cta_text && <span style={{ fontSize: 10, color: C.accent, fontFamily: "DM Mono, monospace" }}>CTA: {o.cta_text}{o.cta_url ? ` → ${o.cta_url}` : ""}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <Toggle value={o.is_active} onChange={() => toggle(o)} />
                  <Btn onClick={() => remove(o.id)} variant="danger" small>Remove</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Accreditations  (logo_url supports upload)
// ─────────────────────────────────────────────────────────────────────────────
function AccreditationsTab({ toast }: { toast: (ok: boolean, msg: string) => void }) {
  const [items, setItems]     = useState<Accreditation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ name: "", issuer: "", year: "", logo_url: "" });
  const [adding, setAdding]   = useState(false);

  const load = useCallback(async () => {
    try { setItems(await api<Accreditation[]>("/org-profile/accreditations")); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.name.trim()) return;
    setAdding(true);
    try {
      await api("/org-profile/accreditations", { method: "POST", body: JSON.stringify({ name: form.name, issuer: form.issuer || null, year: form.year ? parseInt(form.year) : null, logo_url: form.logo_url || null }) });
      setForm({ name: "", issuer: "", year: "", logo_url: "" });
      setShowForm(false);
      await load();
      toast(true, "Accreditation added");
    } catch (e: any) { toast(false, e.message); }
    finally { setAdding(false); }
  };

  const toggle = async (item: Accreditation) => {
    try { await api(`/org-profile/accreditations/${item.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !item.is_active }) }); await load(); }
    catch (e: any) { toast(false, e.message); }
  };

  const remove = async (id: string) => {
    try { await api(`/org-profile/accreditations/${id}`, { method: "DELETE" }); await load(); toast(true, "Removed"); }
    catch (e: any) { toast(false, e.message); }
  };

  if (loading) return <LoadingCards />;

  return (
    <div>
      <TabHeader title="Accreditations" sub="Certifications, awards & partnerships" onAdd={() => setShowForm(v => !v)} />

      {showForm && (
        <Card style={{ border: `1px solid rgba(124,58,237,0.2)`, background: "rgba(124,58,237,0.04)", animation: "op-fadein 0.2s ease" }}>
          <SectionHeading title="Add Accreditation" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Name *" value={form.name}   onChange={(v: string) => setForm(f => ({ ...f, name: v }))}   placeholder="Google Partner" />
            <Inp label="Issuer" value={form.issuer} onChange={(v: string) => setForm(f => ({ ...f, issuer: v }))} placeholder="Google" />
            <Inp label="Year" type="number" value={form.year} onChange={(v: string) => setForm(f => ({ ...f, year: v }))} placeholder="2024" />
          </div>
          {/* ↓ Badge logo supports both URL and file upload */}
          <ImageInput label="Badge / Logo" value={form.logo_url} onChange={url => setForm(f => ({ ...f, logo_url: url }))} placeholder="https://…" />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={add} loading={adding} disabled={!form.name.trim()}>Add</Btn>
            <Btn onClick={() => setShowForm(false)} variant="ghost">Cancel</Btn>
          </div>
        </Card>
      )}

      {items.length === 0 ? <EmptyState icon="🏅" text="No accreditations yet" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
          {items.map((a, i) => (
            <Card key={a.id} style={{ animation: `op-fadein 0.3s ease ${i * 0.04}s both`, opacity: a.is_active ? 1 : 0.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                {a.logo_url ? (
                  <img src={a.logo_url} alt={a.name} style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏅</div>
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{a.name}</div>
                  {a.issuer && <div style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono, monospace" }}>{a.issuer}{a.year ? ` · ${a.year}` : ""}</div>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Toggle value={a.is_active} onChange={() => toggle(a)} />
                <Btn onClick={() => remove(a.id)} variant="danger" small>Remove</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Metadata
// ─────────────────────────────────────────────────────────────────────────────
function MetadataTab({ toast }: { toast: (ok: boolean, msg: string) => void }) {
  const [items, setItems]     = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState({ key: "", value: "", category: "ai_context" });
  const [adding, setAdding]   = useState(false);

  const CATEGORIES = ["ai_context", "compliance", "audience", "brand_voice", "other"];

  const load = useCallback(async () => {
    try { setItems(await api<Meta[]>("/org-profile/metadata")); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.key.trim() || !form.value.trim()) return;
    setAdding(true);
    try { await api("/org-profile/metadata", { method: "POST", body: JSON.stringify(form) }); setForm({ key: "", value: "", category: "ai_context" }); await load(); toast(true, "Metadata added"); }
    catch (e: any) { toast(false, e.message); }
    finally { setAdding(false); }
  };

  const remove = async (id: string) => {
    try { await api(`/org-profile/metadata/${id}`, { method: "DELETE" }); await load(); }
    catch (e: any) { toast(false, e.message); }
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter(m => (m.category || "other") === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, Meta[]>);

  if (loading) return <LoadingCards />;

  return (
    <div>
      <TabHeader title="Metadata Strip" sub="Key-value pairs injected as AI context during content generation" />

      <Card style={{ border: "1px solid rgba(52,211,153,0.15)", background: "rgba(52,211,153,0.03)", marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "rgba(52,211,153,0.7)", marginBottom: 12, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>ⓘ You are set</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 10, alignItems: "end" }}>
          <Inp label="Key"   value={form.key}   onChange={(v: string) => setForm(f => ({ ...f, key: v }))}   placeholder="target_audience" />
          <Inp label="Value" value={form.value} onChange={(v: string) => setForm(f => ({ ...f, value: v }))} placeholder="25–40 year old homeowners" />
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.dim, fontFamily: "DM Mono, monospace", marginBottom: 6 }}>Category</div>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", color: C.text, fontSize: 11, fontFamily: "DM Mono, monospace", outline: "none" }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 9, marginBottom: 6, opacity: 0 }}>x</div>
            <Btn onClick={add} loading={adding} disabled={!form.key.trim() || !form.value.trim()}>Add</Btn>
          </div>
        </div>
      </Card>

      {items.length === 0 ? <EmptyState icon="🔧" text="No metadata yet" /> : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.dim, fontFamily: "DM Mono, monospace", marginBottom: 10 }}>{cat}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {catItems.map((m, i) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, animation: `op-fadein 0.3s ease ${i * 0.03}s both` }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, fontFamily: "DM Mono, monospace", minWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.key}</span>
                  <span style={{ fontSize: 9, color: C.dim }}>→</span>
                  <span style={{ fontSize: 11, color: C.muted, flex: 1, fontFamily: "DM Mono, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.value}</span>
                  <button onClick={() => remove(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, padding: 4, display: "flex", transition: "color 0.1s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = C.red}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = C.dim}>
                    <span style={{ fontSize: 12 }}>✕</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "business",       label: "Business",       icon: "🏢" },
  { id: "sponsors",       label: "Sponsors",       icon: "🤝" },
  { id: "reviews",        label: "Reviews",        icon: "⭐" },
  { id: "goals",          label: "Goals",          icon: "🎯" },
  { id: "offers",         label: "Offers",         icon: "🎁" },
  { id: "accreditations", label: "Accreditations", icon: "🏅" },
  { id: "metadata",       label: "Metadata",       icon: "🔧" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function OrgProfilePage() {
  const [activeTab, setActiveTab] = useState<TabId>("business");
  const [toast, setToast]         = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showToast = (ok: boolean, msg: string) => setToast({ type: ok ? "ok" : "err", text: msg });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes op-spin   { to { transform: rotate(360deg); } }
        @keyframes op-fadein { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .op-tab:hover { background: rgba(255,255,255,0.05) !important; color: #e4e4e7 !important; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); }
        select option { background: #1a1a2e; color: #e4e4e7; }
      `}</style>

      <div style={{ fontFamily: "Syne, sans-serif", background: C.bg, minHeight: "100vh", color: C.text, padding: "28px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(124,58,237,0.7)", marginBottom: 4, fontFamily: "DM Mono, monospace" }}>
            Relvo · Organisation
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Org Profile</h1>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
            Manage your organisation's public profile, campaign context, and AI metadata
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, overflowX: "auto", paddingBottom: 4, borderBottom: `1px solid ${C.border}` }}>
          {TABS.map(tab => {
            const active = tab.id === activeTab;
            return (
              <button key={tab.id} className="op-tab" onClick={() => setActiveTab(tab.id)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: "10px 10px 0 0", background: active ? "rgba(124,58,237,0.1)" : "transparent", border: "none", borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent", color: active ? C.accent : C.muted, fontSize: 11, fontWeight: 700, fontFamily: "Syne, sans-serif", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0 }}>
                <span style={{ fontSize: 14 }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{ maxWidth: 900 }}>
          {activeTab === "business"       && <BusinessTab       toast={showToast} />}
          {activeTab === "sponsors"       && <SponsorsTab       toast={showToast} />}
          {activeTab === "reviews" && <ReviewsTab toast={showToast} />}
          {activeTab === "goals"          && <GoalsTab          toast={showToast} />}
          {activeTab === "offers"         && <OffersTab         toast={showToast} />}
          {activeTab === "accreditations" && <AccreditationsTab toast={showToast} />}
          {activeTab === "metadata"       && <MetadataTab       toast={showToast} />}
        </div>
      </div>

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </>
  );
}