"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createBrand, listBrands, updateBrand, deleteBrand,
  getBrandProfile, startBrandScrape,
  type Brand as ApiBrand, type BrandProfile,
} from "@/lib/api";
import {
  RefreshCcw, Plus, Building2, ToggleLeft, ToggleRight,
  AlertTriangle, Check, Globe, Wand2, ChevronDown, ChevronUp,
  Clock, X, Trash2, Palette, Image as ImageIcon, CalendarDays,
  Layers3, Pencil, Save, Upload, MapPin, Phone, Mail, Instagram,
  Facebook, Linkedin, Twitter, Youtube, Link2, Tag, FileText,
} from "lucide-react";
import { uploadFileToSpaces } from "@/lib/video-upload-client";
import { saveGeneratedSections } from "@/lib/save-generated-sections";
import { MIXED_POSTER_SECTIONS } from "@/lib/templates/mixed-poster";

// ── Types ─────────────────────────────────────────────────────────────────────

type Brand = ApiBrand & {
  logo_url?: string | null; primary_color?: string | null;
  tones?: string[] | null; created_at?: string | null; org_id?: string | null;
  description?: string | null; tagline?: string | null; industry?: string | null;
  website_url?: string | null; email?: string | null; phone?: string | null;
  address?: string | null; facebook_url?: string | null; instagram_url?: string | null;
  linkedin_url?: string | null; twitter_url?: string | null; tiktok_url?: string | null;
  youtube_url?: string | null; secondary_color?: string | null;
  font_primary?: string | null; font_secondary?: string | null;
  brand_values?: string[] | null; target_audience?: string | null;
};

interface BrandDraft {
  display_name: string; logo_url: string; primary_color: string; secondary_color: string;
  is_active: boolean; tagline: string; description: string; industry: string;
  target_audience: string; website_url: string; email: string; phone: string; address: string;
  facebook_url: string; instagram_url: string; linkedin_url: string;
  twitter_url: string; tiktok_url: string; youtube_url: string;
  font_primary: string; font_secondary: string; brand_values: string;
}

const EMPTY_DRAFT: BrandDraft = {
  display_name: "", logo_url: "", primary_color: "#7c3aed", secondary_color: "",
  is_active: true, tagline: "", description: "", industry: "", target_audience: "",
  website_url: "", email: "", phone: "", address: "",
  facebook_url: "", instagram_url: "", linkedin_url: "",
  twitter_url: "", tiktok_url: "", youtube_url: "",
  font_primary: "", font_secondary: "", brand_values: "",
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CANVAS_W = 1080, CANVAS_H = 1350;
const FIXED_ORIENTATION = "portrait";

const INDUSTRIES = [
  "Technology","Healthcare","Finance","Education","Retail / E-commerce",
  "Food & Beverage","Real Estate","Marketing / Media","Non-profit",
  "Agriculture","Manufacturing","Logistics","Legal","Beauty & Wellness",
  "Tourism & Hospitality","Other",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function saveBrandSectionLibrary(brandId: string, source: string) {
  await saveGeneratedSections({
    templateFamily: "mixed-poster", generationSource: source,
    sections: MIXED_POSTER_SECTIONS, brandId,
    tags: ["brand-page","mixed-poster","starter", FIXED_ORIENTATION, `${CANVAS_W}x${CANVAS_H}`],
  } as any);
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtRelative(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 7 ? `${days}d ago` : fmtDate(iso);
}

function normalizeHex(v: string) {
  const s = (v || "").trim();
  if (!s) return "#7c3aed";
  return s.startsWith("#") ? s : `#${s}`;
}

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  READY:    { color: "#10b981", label: "Ready" },
  SCRAPING: { color: "#7c55f6", label: "Scraping" },
  FAILED:   { color: "#ef4444", label: "Failed" },
  IDLE:     { color: "#6b7280", label: "Idle" },
};
const scfg = (s?: string) => STATUS_CFG[(s || "").toUpperCase()] ?? { color: "#6b7280", label: s || "Unknown" };

function brandToDraft(b: Brand): BrandDraft {
  return {
    display_name:   b.display_name || "",
    logo_url:       b.logo_url     || "",
    primary_color:  b.primary_color || "#7c3aed",
    secondary_color: b.secondary_color || "",
    is_active:      b.is_active ?? true,
    tagline:        b.tagline        || "",
    description:    b.description    || "",
    industry:       b.industry       || "",
    target_audience: b.target_audience || "",
    website_url:    b.website_url    || "",
    email:          b.email          || "",
    phone:          b.phone          || "",
    address:        b.address        || "",
    facebook_url:   b.facebook_url   || "",
    instagram_url:  b.instagram_url  || "",
    linkedin_url:   b.linkedin_url   || "",
    twitter_url:    b.twitter_url    || "",
    tiktok_url:     b.tiktok_url     || "",
    youtube_url:    b.youtube_url    || "",
    font_primary:   b.font_primary   || "",
    font_secondary: b.font_secondary || "",
    brand_values:   Array.isArray(b.brand_values) ? b.brand_values.join(", ") : "",
  };
}

// ── Shared class strings ──────────────────────────────────────────────────────

const inputCls = "bp-input";
const labelCls = "bp-label";

// ── Sub-components ────────────────────────────────────────────────────────────

function BrandAvatar({ id, logoUrl, size = 42 }: { id: string; logoUrl?: string | null; size?: number }) {
  const hue = Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const color = `hsl(${hue},55%,50%)`;

  if (logoUrl) return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,1)" }}>
      <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 5 }} />
    </div>
  );

  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: color + "18", border: `1px solid ${color}35`, display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: size * 0.44, fontWeight: 800, flexShrink: 0 }}>
      {id.charAt(0).toUpperCase()}
    </div>
  );
}

function StatPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 999, background: color ? `${color}0e` : "rgba(255,255,255,0.55)", border: `1px solid ${color ? `${color}25` : "rgba(0,0,0,0.07)"}`, fontSize: 10, fontWeight: 600, color: color || "rgba(0,0,0,0.45)", whiteSpace: "nowrap", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }}>
      {icon}
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ color: color || "rgba(0,0,0,0.7)", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 2px" }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(0,0,0,0.28)", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.06)" }} />
    </div>
  );
}

function MsgBar({ msg, onClose }: { msg: { type: "ok" | "err"; text: string }; onClose: () => void }) {
  const ok = msg.type === "ok";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 12px", borderRadius: 11, fontSize: 11, fontWeight: 700, background: ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${ok ? "rgba(16,185,100,0.2)" : "rgba(239,68,68,0.2)"}`, color: ok ? "#059669" : "#dc2626" }}>
      {ok ? <Check style={{ width: 12, height: 12 }} /> : <AlertTriangle style={{ width: 12, height: 12 }} />}
      <span style={{ flex: 1 }}>{msg.text}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.5 }}><X style={{ width: 11, height: 11 }} /></button>
    </div>
  );
}

// ── Brand Drawer (create + edit) ──────────────────────────────────────────────

function BrandDrawer({
  initial, onClose, onSaved,
}: {
  initial?: Brand | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial?.id;
  const [d, setD] = useState<BrandDraft>(() => initial ? brandToDraft(initial) : EMPTY_DRAFT);
  const [logoFile,   setLogoFile]   = useState<File | null>(null);
  const [logoPrev,   setLogoPrev]   = useState(initial?.logo_url || "");
  const [saving,     setSaving]     = useState(false);
  const [savingSec,  setSavingSec]  = useState(false);
  const [msg,        setMsg]        = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const set = (k: keyof BrandDraft, v: any) => setD(prev => ({ ...prev, [k]: v }));

  const autoId = d.display_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const save = async () => {
    if (!d.display_name.trim()) { setMsg({ type: "err", text: "Brand name is required." }); return; }
    if (!isEdit && !autoId)     { setMsg({ type: "err", text: "Name must contain letters or numbers." }); return; }

    setSaving(true); setMsg(null);
    try {
      let finalLogoUrl: string | null = d.logo_url.trim() || null;
      if (logoFile) finalLogoUrl = await uploadFileToSpaces(logoFile);

      const payload: any = {
        display_name:    d.display_name.trim(),
        logo_url:        finalLogoUrl,
        primary_color:   normalizeHex(d.primary_color),
        secondary_color: d.secondary_color.trim() ? normalizeHex(d.secondary_color) : null,
        is_active:       d.is_active,
        tagline:         d.tagline.trim()         || null,
        description:     d.description.trim()     || null,
        industry:        d.industry               || null,
        target_audience: d.target_audience.trim() || null,
        website_url:     d.website_url.trim()     || null,
        email:           d.email.trim()           || null,
        phone:           d.phone.trim()           || null,
        address:         d.address.trim()         || null,
        facebook_url:    d.facebook_url.trim()    || null,
        instagram_url:   d.instagram_url.trim()   || null,
        linkedin_url:    d.linkedin_url.trim()    || null,
        twitter_url:     d.twitter_url.trim()     || null,
        tiktok_url:      d.tiktok_url.trim()      || null,
        youtube_url:     d.youtube_url.trim()     || null,
        font_primary:    d.font_primary.trim()    || null,
        font_secondary:  d.font_secondary.trim()  || null,
        brand_values:    d.brand_values.trim()
          ? d.brand_values.split(",").map(s => s.trim()).filter(Boolean)
          : [],
      };

      if (isEdit) {
        await updateBrand(initial!.id, payload);
      } else {
        setSavingSec(false);
        const created = await createBrand({ id: autoId, ...payload });
        const createdId = (created as any)?.id || autoId;
        setSavingSec(true);
        await saveBrandSectionLibrary(createdId, "brand-drawer-create");
        setSavingSec(false);
      }

      onSaved();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const btnLabel = saving
    ? savingSec ? "Saving sections…" : "Saving…"
    : isEdit ? "Save Changes" : "Create Brand";

  return (
    <>
      <div className="bp-backdrop" onClick={onClose} />
      <div className="bp-drawer">
        <style>{`
          .bp-backdrop {
            position: fixed; inset: 0; z-index: 40;
            background: rgba(0,0,0,0.14);
            backdrop-filter: blur(2px);
          }
          .bp-drawer {
            position: fixed; right: 0; top: 0; bottom: 0; z-index: 50;
            width: 100%; max-width: 480px;
            display: flex; flex-direction: column;
            background: rgba(248,248,250,0.97);
            backdrop-filter: blur(40px) saturate(180%);
            -webkit-backdrop-filter: blur(40px) saturate(180%);
            border-left: 1px solid rgba(255,255,255,0.9);
            box-shadow: -8px 0 40px rgba(0,0,0,0.1), inset 1px 0 0 rgba(255,255,255,0.8);
            animation: bp-slidein 0.22s cubic-bezier(0.32,0.72,0,1);
          }
          @keyframes bp-slidein {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
          .bp-drawer-scroll::-webkit-scrollbar { width: 3px; }
          .bp-drawer-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
        `}</style>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: 0, background: "rgba(255,255,255,0.5)" }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(0,0,0,0.28)", marginBottom: 2 }}>
              {isEdit ? "Editing Brand" : "New Brand"}
            </p>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e", letterSpacing: "-0.01em" }}>
              {isEdit ? initial?.display_name : "Create Brand"}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 11, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.35)", cursor: "pointer", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Body */}
        <div className="bp-drawer-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ── Identity ── */}
          <div style={{ borderRadius: 14, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.07)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)" }}>
            <SectionDivider label="Identity" />

            <div className="bp-grid2">
              <div>
                <label className={labelCls}>Brand Name *</label>
                <input className={inputCls} value={d.display_name} onChange={e => set("display_name", e.target.value)} placeholder="e.g. NeuroFlow AI" autoFocus />
                {!isEdit && autoId && (
                  <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 9, color: "rgba(0,0,0,0.28)" }}>ID →</span>
                    <span style={{ fontSize: 9, color: "#7c55f6", background: "rgba(124,85,246,0.08)", border: "1px solid rgba(124,85,246,0.2)", padding: "1px 8px", borderRadius: 5 }}>{autoId}</span>
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>Tagline</label>
                <input className={inputCls} value={d.tagline} onChange={e => set("tagline", e.target.value)} placeholder="Short punchy line" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <textarea className={inputCls} rows={3} value={d.description} onChange={e => set("description", e.target.value)} placeholder="What does this brand do? Who does it serve?" style={{ resize: "none" }} />
            </div>

            <div className="bp-grid2">
              <div>
                <label className={labelCls}>Industry</label>
                <select className={inputCls} value={d.industry} onChange={e => set("industry", e.target.value)}>
                  <option value="">Select…</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Target Audience</label>
                <input className={inputCls} value={d.target_audience} onChange={e => set("target_audience", e.target.value)} placeholder="e.g. SME owners" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Brand Values <span style={{ opacity: 0.45, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(comma-separated)</span></label>
              <input className={inputCls} value={d.brand_values} onChange={e => set("brand_values", e.target.value)} placeholder="Innovation, Trust, Simplicity" />
            </div>

            {/* Active toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.45)" }}>Active</span>
              <button onClick={() => set("is_active", !d.is_active)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                {d.is_active
                  ? <ToggleRight style={{ width: 28, height: 28, color: "#10b981" }} />
                  : <ToggleLeft  style={{ width: 28, height: 28, color: "rgba(0,0,0,0.2)" }} />
                }
              </button>
              <span style={{ fontSize: 11, fontWeight: 700, color: d.is_active ? "#10b981" : "rgba(0,0,0,0.3)" }}>
                {d.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          {/* ── Logo ── */}
          <div style={{ borderRadius: 14, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.07)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)" }}>
            <SectionDivider label="Logo" />
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label className={labelCls}>Logo URL</label>
                <input className={inputCls} value={d.logo_url} onChange={e => { set("logo_url", e.target.value); setLogoFile(null); setLogoPrev(e.target.value); }} placeholder="https://example.com/logo.png" disabled={!!logoFile} />
                <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap" }}>
                  <button className="bp-btn bp-btn-outline" style={{ fontSize: 10, padding: "5px 10px" }} onClick={() => document.getElementById("bp-logo-file")?.click()}>
                    <Upload style={{ width: 11, height: 11 }} /> Upload
                  </button>
                  {(d.logo_url || logoFile || logoPrev) && (
                    <button className="bp-btn bp-btn-outline" style={{ fontSize: 10, padding: "5px 10px", color: "#dc2626" }} onClick={() => { setLogoFile(null); set("logo_url", ""); setLogoPrev(""); }}>
                      <X style={{ width: 11, height: 11 }} /> Remove
                    </button>
                  )}
                </div>
                <input id="bp-logo-file" type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setLogoFile(f); set("logo_url", "");
                  const r = new FileReader();
                  r.onload = ev => setLogoPrev((ev.target?.result as string) || "");
                  r.readAsDataURL(f);
                }} />
              </div>
              <div style={{ width: 72, height: 72, borderRadius: 13, background: logoPrev ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {logoPrev ? <img src={logoPrev} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }} onError={() => setLogoPrev("")} /> : <ImageIcon style={{ width: 22, height: 22, color: "rgba(0,0,0,0.18)" }} />}
              </div>
            </div>
          </div>

          {/* ── Colours ── */}
          <div style={{ borderRadius: 14, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.07)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)" }}>
            <SectionDivider label="Colours" />
            <div className="bp-grid2">
              {([
                ["Primary Colour", "primary_color"] as const,
                ["Secondary Colour", "secondary_color"] as const,
              ]).map(([lbl, key]) => (
                <div key={key}>
                  <label className={labelCls}>{lbl}</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 34px 34px", gap: 6 }}>
                    <input className={inputCls} value={d[key]} onChange={e => set(key, e.target.value)} placeholder="#7c3aed" />
                    <input type="color" value={normalizeHex(d[key] || "#7c3aed")} onChange={e => set(key, e.target.value)} style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid rgba(0,0,0,0.08)", padding: 2, cursor: "pointer", background: "rgba(255,255,255,0.7)" }} />
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: d[key] ? normalizeHex(d[key]) : "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.08)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Typography ── */}
          <div style={{ borderRadius: 14, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.07)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)" }}>
            <SectionDivider label="Typography" />
            <div className="bp-grid2">
              <div>
                <label className={labelCls}>Primary Font</label>
                <input className={inputCls} value={d.font_primary} onChange={e => set("font_primary", e.target.value)} placeholder="e.g. Inter, Syne" />
              </div>
              <div>
                <label className={labelCls}>Secondary Font</label>
                <input className={inputCls} value={d.font_secondary} onChange={e => set("font_secondary", e.target.value)} placeholder="e.g. DM Mono" />
              </div>
            </div>
          </div>

          {/* ── Contact ── */}
          <div style={{ borderRadius: 14, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.07)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)" }}>
            <SectionDivider label="Contact" />
            <div className="bp-grid2">
              {([
                ["website_url", "Website", "https://example.com"],
                ["email",       "Email",   "hello@brand.com"],
                ["phone",       "Phone",   "+265 999 000 000"],
                ["address",     "Address", "City, Country"],
              ] as [keyof BrandDraft, string, string][]).map(([key, lbl, ph]) => (
                <div key={key}>
                  <label className={labelCls}>{lbl}</label>
                  <input className={inputCls} value={d[key] as string} onChange={e => set(key, e.target.value)} placeholder={ph} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Social ── */}
          <div style={{ borderRadius: 14, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.07)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)" }}>
            <SectionDivider label="Social Media" />
            <div className="bp-grid2">
              {([
                ["instagram_url", "Instagram", "https://instagram.com/brand"],
                ["facebook_url",  "Facebook",  "https://facebook.com/brand"],
                ["linkedin_url",  "LinkedIn",  "https://linkedin.com/company/brand"],
                ["twitter_url",   "Twitter/X", "https://twitter.com/brand"],
                ["tiktok_url",    "TikTok",    "https://tiktok.com/@brand"],
                ["youtube_url",   "YouTube",   "https://youtube.com/@brand"],
              ] as [keyof BrandDraft, string, string][]).map(([key, lbl, ph]) => (
                <div key={key}>
                  <label className={labelCls}>{lbl}</label>
                  <input className={inputCls} value={d[key] as string} onChange={e => set(key, e.target.value)} placeholder={ph} />
                </div>
              ))}
            </div>
          </div>

          {/* Preview strip */}
          {d.display_name && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
              <BrandAvatar id={autoId || "brand"} logoUrl={logoPrev || d.logo_url || null} size={34} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{d.display_name}</div>
                {d.tagline && <div style={{ fontSize: 10, color: "rgba(0,0,0,0.4)", marginTop: 1 }}>{d.tagline}</div>}
                <div style={{ fontSize: 9, color: "rgba(0,0,0,0.25)", fontFamily: "monospace" }}>{autoId || initial?.id || "auto-id"}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: 5, background: normalizeHex(d.primary_color), border: "1px solid rgba(0,0,0,0.08)" }} />
                {d.secondary_color && <div style={{ width: 16, height: 16, borderRadius: 5, background: normalizeHex(d.secondary_color), border: "1px solid rgba(0,0,0,0.08)" }} />}
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: d.is_active ? "rgba(16,185,129,0.1)" : "rgba(0,0,0,0.05)", border: `1px solid ${d.is_active ? "rgba(16,185,129,0.25)" : "rgba(0,0,0,0.08)"}`, color: d.is_active ? "#059669" : "rgba(0,0,0,0.3)" }}>
                  {d.is_active ? "active" : "inactive"}
                </span>
              </div>
            </div>
          )}

          {!isEdit && (
            <div style={{ padding: "10px 13px", borderRadius: 11, border: "1px solid rgba(124,85,246,0.15)", background: "rgba(124,85,246,0.06)", color: "rgba(0,0,0,0.45)", fontSize: 11, lineHeight: 1.6 }}>
              Relvo will save a starter mixed-poster section library for this brand. Canvas: {CANVAS_W} × {CANVAS_H}.
            </div>
          )}

          {msg && <MsgBar msg={msg} onClose={() => setMsg(null)} />}
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: "14px 20px", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 8, background: "rgba(255,255,255,0.35)" }}>
          <button className="bp-btn bp-btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="bp-btn bp-btn-primary" onClick={save} disabled={saving} style={{ flex: 2 }}>
            {saving ? <span className="bp-spinner-white" /> : <Save style={{ width: 12, height: 12 }} />}
            {btnLabel}
          </button>
        </div>
      </div>
    </>
  );
}

// ── BrandCard ─────────────────────────────────────────────────────────────────

function BrandCard({ b, onToggle, toggling, onDelete, onEdit }: {
  b: Brand; onToggle: (b: Brand) => void; toggling: boolean;
  onDelete: () => void; onEdit: () => void;
}) {
  const [expanded,       setExpanded]       = useState(false);
  const [profile,        setProfile]        = useState<BrandProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [websiteUrl,     setWebsiteUrl]     = useState("");
  const [scraping,       setScraping]       = useState(false);
  const [msg,            setMsg]            = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [deleting,       setDeleting]       = useState(false);

  const accentColor = b.primary_color || "#7c3aed";
  const cfg   = scfg((profile as any)?.status);
  const tones = Array.isArray(b.tones) ? b.tones.filter(Boolean) : [];

  const loadProfile = async () => {
    if (profile) return;
    setLoadingProfile(true);
    try { const p = await getBrandProfile(b.id); setProfile(p); setWebsiteUrl((p as any).website_url || ""); }
    catch (e: any) { setMsg({ type: "err", text: e.message || "Failed to load profile" }); }
    finally { setLoadingProfile(false); }
  };

  const handleExpand = () => { const next = !expanded; setExpanded(next); if (next) loadProfile(); };

  const scrapeNow = async () => {
    const url = websiteUrl.trim();
    if (!url) { setMsg({ type: "err", text: "Website URL is required." }); return; }
    if (!/^https?:\/\//i.test(url)) { setMsg({ type: "err", text: "URL must start with http:// or https://" }); return; }
    setScraping(true); setMsg(null);
    try {
      const res = await startBrandScrape({ brand_id: b.id, website_url: url });
      setProfile(p => p ? { ...p, website_url: url, status: "SCRAPING", last_error: null } : ({ brand_id: b.id, website_url: url, status: "SCRAPING" } as BrandProfile));
      setMsg({ type: "ok", text: `Scrape started — ${res.status}` });
      setTimeout(async () => { try { setProfile(await getBrandProfile(b.id)); } catch {} }, 1500);
    } catch (e: any) { setMsg({ type: "err", text: e.message || "Failed to start scrape" }); }
    finally { setScraping(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await deleteBrand(b.id); onDelete(); }
    catch (e: any) { setMsg({ type: "err", text: e.message || "Failed to delete" }); setDeleting(false); setConfirmDelete(false); }
  };

  return (
    <div style={{ background: expanded ? `linear-gradient(180deg,${accentColor}0e 0%,rgba(255,255,255,0.55) 30%)` : "rgba(255,255,255,0.62)", border: `1px solid ${expanded ? `${accentColor}28` : "rgba(0,0,0,0.07)"}`, borderRadius: 20, overflow: "hidden", transition: "all 0.2s", boxShadow: expanded ? `inset 0 1px 0 rgba(255,255,255,1), 0 6px 24px ${accentColor}10` : "inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 10px rgba(0,0,0,0.05)" }}>
      {/* Accent top bar */}
      <div style={{ height: 3, background: accentColor, opacity: 0.9 }} />

      {/* Header */}
      <div className="bp-card-header">
        <BrandAvatar id={b.id} logoUrl={b.logo_url} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: b.is_active ? "#1a1a2e" : "rgba(0,0,0,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
            {b.display_name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, color: "rgba(0,0,0,0.22)", fontFamily: "monospace" }}>{b.id}</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: b.is_active ? "#059669" : "rgba(0,0,0,0.3)", background: b.is_active ? "rgba(16,185,129,0.1)" : "rgba(0,0,0,0.05)", border: `1px solid ${b.is_active ? "rgba(16,185,129,0.22)" : "rgba(0,0,0,0.08)"}`, padding: "1px 6px", borderRadius: 6, fontFamily: "monospace" }}>
              {b.is_active ? "ACTIVE" : "INACTIVE"}
            </span>
            {(profile as any)?.status && (
              <span style={{ fontSize: 8, fontWeight: 700, color: cfg.color, background: cfg.color + "14", border: `1px solid ${cfg.color}28`, padding: "1px 6px", borderRadius: 6, fontFamily: "monospace" }}>{cfg.label}</span>
            )}
          </div>
        </div>

        <div className="bp-card-actions">
          {/* Toggle active */}
          <button onClick={() => onToggle(b)} disabled={toggling} style={{ background: "none", border: "none", cursor: toggling ? "not-allowed" : "pointer", padding: 0, display: "flex", opacity: toggling ? 0.4 : 1 }}>
            {b.is_active
              ? <ToggleRight style={{ width: 22, height: 22, color: "#10b981" }} />
              : <ToggleLeft  style={{ width: 22, height: 22, color: "rgba(0,0,0,0.2)" }} />
            }
          </button>

          {/* Edit */}
          <button onClick={onEdit} title="Edit brand" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: 5, cursor: "pointer", display: "flex", color: "rgba(0,0,0,0.35)", transition: "all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${accentColor}14`; (e.currentTarget as HTMLElement).style.color = accentColor; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; (e.currentTarget as HTMLElement).style.color = "rgba(0,0,0,0.35)"; }}
          >
            <Pencil style={{ width: 13, height: 13 }} />
          </button>

          {/* Delete */}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: "rgba(0,0,0,0.22)", transition: "color 0.15s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#ef4444")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(0,0,0,0.22)")}
            >
              <Trash2 style={{ width: 13, height: 13 }} />
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={handleDelete} disabled={deleting} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 7, color: "#dc2626", fontSize: 10, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer" }}>
                {deleting ? <span className="bp-spinner-red" /> : <Check style={{ width: 10, height: 10 }} />} Yes
              </button>
              <button onClick={() => setConfirmDelete(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 7, color: "rgba(0,0,0,0.4)", cursor: "pointer" }}>
                <X style={{ width: 10, height: 10 }} />
              </button>
            </div>
          )}

          {/* Expand profile */}
          <button onClick={handleExpand} style={{ background: expanded ? `${accentColor}12` : "rgba(255,255,255,0.65)", border: `1px solid ${expanded ? `${accentColor}28` : "rgba(0,0,0,0.08)"}`, borderRadius: 10, padding: "5px 9px", cursor: "pointer", color: expanded ? accentColor : "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)", transition: "all 0.15s", whiteSpace: "nowrap" }}>
            <Globe style={{ width: 11, height: 11, flexShrink: 0 }} />
            <span className="bp-profile-label">Profile</span>
            {expanded ? <ChevronUp style={{ width: 10, height: 10 }} /> : <ChevronDown style={{ width: 10, height: 10 }} />}
          </button>
        </div>
      </div>

      {/* Meta strip */}
      <div style={{ padding: "0 16px 14px", display: "flex", flexWrap: "wrap", gap: 7 }}>
        <StatPill icon={<Palette style={{ width: 10, height: 10 }} />} label="color" value={b.primary_color || "#7c3aed"} color={b.primary_color || accentColor} />
        <StatPill icon={<Layers3 style={{ width: 10, height: 10 }} />} label="tones" value={String(tones.length)} />
        <StatPill icon={<CalendarDays style={{ width: 10, height: 10 }} />} label="created" value={fmtRelative(b.created_at)} />
        {b.logo_url && <StatPill icon={<ImageIcon style={{ width: 10, height: 10 }} />} label="logo" value="set" />}
      </div>

      {/* Tones */}
      {tones.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0,0,0,0.28)", marginBottom: 7 }}>Tones</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {tones.map((tone, i) => (
              <span key={`${tone}-${i}`} style={{ padding: "4px 9px", borderRadius: 999, background: "rgba(255,255,255,0.65)", border: "1px solid rgba(0,0,0,0.07)", color: "rgba(0,0,0,0.5)", fontSize: 10, fontWeight: 600, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
                {tone}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Profile / Scrape panel */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", padding: "16px 18px", background: "rgba(255,255,255,0.35)", display: "flex", flexDirection: "column", gap: 12 }}>
          {loadingProfile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(0,0,0,0.35)", fontSize: 11 }}>
              <span className="bp-spinner-accent" style={{ "--c": accentColor } as any} /> Loading profile…
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label className={labelCls}>Website URL</label>
                  <input className={inputCls} value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && scrapeNow()} placeholder="https://example.com" disabled={scraping} />
                </div>
                <button onClick={scrapeNow} disabled={scraping} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: scraping ? "rgba(0,0,0,0.04)" : `${accentColor}12`, border: `1px solid ${scraping ? "rgba(0,0,0,0.07)" : accentColor + "30"}`, borderRadius: 11, color: scraping ? "rgba(0,0,0,0.28)" : accentColor, fontSize: 11, fontWeight: 700, cursor: scraping ? "not-allowed" : "pointer", flexShrink: 0, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)", transition: "all 0.15s" }}>
                  {scraping ? <span className="bp-spinner-red" /> : <Wand2 style={{ width: 12, height: 12 }} />}
                  {scraping ? "Scraping…" : "Scrape Now"}
                </button>
              </div>

              <div style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "12px 14px", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0,0,0,0.28)" }}>Profile Summary</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "rgba(0,0,0,0.25)" }}>
                    <Clock style={{ width: 9, height: 9 }} />{fmtDate((profile as any)?.last_scraped_at)}
                  </span>
                </div>
                {(profile as any)?.profile_summary
                  ? <p style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>{(profile as any).profile_summary}</p>
                  : <p style={{ fontSize: 11, color: "rgba(0,0,0,0.28)", margin: 0, fontStyle: "italic" }}>No summary yet — enter a URL and click Scrape Now.</p>
                }
                {(profile as any)?.last_error && (
                  <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.16)", borderRadius: 9 }}>
                    <p style={{ fontSize: 10, color: "#dc2626", margin: 0, whiteSpace: "pre-wrap" }}>{(profile as any).last_error}</p>
                  </div>
                )}
              </div>

              {msg && <MsgBar msg={msg} onClose={() => setMsg(null)} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BrandsPage() {
  const [brands,    setBrands]    = useState<Brand[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [toggling,  setToggling]  = useState<string | null>(null);
  const [msg,       setMsg]       = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [drawer,    setDrawer]    = useState<{ open: boolean; brand: Brand | null }>({ open: false, brand: null });

  const refresh = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setMsg(null);
    try { setBrands((await listBrands(false)) as Brand[]); }
    catch (e: any) { setMsg({ type: "err", text: e.message }); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const toggleActive = async (b: Brand) => {
    setToggling(b.id);
    try { await updateBrand(b.id, { is_active: !b.is_active }); await refresh(true); }
    catch (e: any) { setMsg({ type: "err", text: e.message }); }
    finally { setToggling(null); }
  };

  const active      = useMemo(() => brands.filter(b => b.is_active),  [brands]);
  const inactive    = useMemo(() => brands.filter(b => !b.is_active), [brands]);
  const totalTones  = useMemo(() => brands.reduce((a, b) => a + (Array.isArray(b.tones) ? b.tones.length : 0), 0), [brands]);

  const openCreate = () => setDrawer({ open: true, brand: null });
  const openEdit   = (b: Brand) => setDrawer({ open: true, brand: b });
  const closeDrawer = () => setDrawer({ open: false, brand: null });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .bp-root { font-family: 'Inter', sans-serif; background: #f4f4f6; min-height: 100vh; color: #1a1a2e; padding: 22px 16px; }
        .bp-root * { box-sizing: border-box; }

        @keyframes bpspin  { to { transform: rotate(360deg); } }
        @keyframes bpFade  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .bp-fade { animation: bpFade 0.22s ease both; }

        .bp-spinner-white  { display:inline-block;width:13px;height:13px;border:2px solid rgba(255,255,255,0.25);border-top-color:white;border-radius:50%;animation:bpspin .7s linear infinite; }
        .bp-spinner-red    { display:inline-block;width:10px;height:10px;border:1.5px solid rgba(239,68,68,0.2);border-top-color:#ef4444;border-radius:50%;animation:bpspin .6s linear infinite; }
        .bp-spinner-accent { display:inline-block;width:12px;height:12px;border:1.5px solid rgba(0,0,0,0.08);border-top-color:var(--c,#7c55f6);border-radius:50%;animation:bpspin .6s linear infinite; }

        .bp-input {
          width:100%; background:rgba(255,255,255,0.72); border:1px solid rgba(0,0,0,0.08); border-radius:12px;
          padding:10px 13px; color:#1a1a2e; font-family:'Inter',sans-serif; font-size:12px; outline:none;
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.9),0 1px 3px rgba(0,0,0,0.04);
          transition:border-color .15s,box-shadow .15s; display:block;
        }
        .bp-input:focus { border-color:rgba(124,85,246,0.45); box-shadow:0 0 0 3px rgba(124,85,246,0.09),inset 0 1px 0 rgba(255,255,255,0.9); }
        .bp-input::placeholder { color:rgba(0,0,0,0.25); }
        .bp-input:disabled { opacity:0.4; }
        textarea.bp-input { resize:none; }

        .bp-label { display:block; font-size:9px; font-weight:700; letter-spacing:0.13em; text-transform:uppercase; color:rgba(0,0,0,0.3); margin-bottom:5px; }

        .bp-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:12px; font-family:'Inter',sans-serif; font-size:11px; font-weight:700; cursor:pointer; transition:all .15s; border:none; justify-content:center; }
        .bp-btn-primary { background:rgba(168,85,247,0.18); border:1px solid rgba(168,85,247,0.45); color:#5b21b6; box-shadow:0 2px 14px rgba(168,85,247,0.2),inset 0 1px 0 rgba(255,255,255,0.5); }
        .bp-btn-primary:hover:not(:disabled) { background:rgba(168,85,247,0.28); border-color:rgba(168,85,247,0.65); transform:translateY(-1px); }
        .bp-btn-outline { background:rgba(255,255,255,0.65); border:1px solid rgba(0,0,0,0.08); color:rgba(0,0,0,0.5); box-shadow:inset 0 1px 0 rgba(255,255,255,0.9); }
        .bp-btn-outline:hover:not(:disabled) { background:rgba(255,255,255,0.95); color:rgba(0,0,0,0.7); }
        .bp-btn:disabled { opacity:0.4; cursor:not-allowed; transform:none !important; }

        .bp-grid  { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:12px; }
        .bp-grid2 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }

        .bp-card-header  { display:flex; align-items:center; gap:12px; padding:14px 16px 10px; min-width:0; overflow:hidden; }
        .bp-card-actions { display:flex; align-items:center; gap:4px; flex-shrink:0; margin-left:auto; }
        .bp-profile-label { display:inline; }
        .bp-section-label { font-size:9px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:rgba(0,0,0,0.3); margin-bottom:10px; }

        @media (max-width:760px) {
          .bp-grid  { grid-template-columns:1fr !important; }
          .bp-grid2 { grid-template-columns:1fr !important; }
        }
        @media (max-width:640px) {
          .bp-root { padding:14px 10px; }
          .bp-card-header { gap:8px; padding:12px 12px 10px; }
          .bp-profile-label { display:none; }
        }
      `}</style>

      {/* Dot-grid texture */}
      <style>{`
        .bp-root::before {
          content:''; position:fixed; inset:0; pointer-events:none;
          background-image:linear-gradient(rgba(124,85,246,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(124,85,246,0.025) 1px,transparent 1px);
          background-size:28px 28px; z-index:0;
        }
        .bp-root > * { position:relative; z-index:1; }
      `}</style>

      <div className="bp-root">
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(124,85,246,0.65)", marginBottom: 4 }}>NeuroFlow · Config</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", margin: 0, lineHeight: 1.1 }}>Brands</h1>
            <p style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", marginTop: 6 }}>
              {brands.length} brand{brands.length !== 1 ? "s" : ""} · {active.length} active · {totalTones} tone assignment{totalTones !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="bp-btn bp-btn-outline" onClick={() => refresh()} disabled={loading}>
              <RefreshCcw style={{ width: 12, height: 12, animation: loading ? "bpspin .7s linear infinite" : "none" }} />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button className="bp-btn bp-btn-primary" onClick={openCreate}>
              <Plus style={{ width: 12, height: 12 }} /> New Brand
            </button>
          </div>
        </div>

        {/* Toast */}
        {msg && (
          <div className="bp-fade" style={{ marginBottom: 18 }}>
            <MsgBar msg={msg} onClose={() => setMsg(null)} />
          </div>
        )}

        {/* Brand lists */}
        {loading && brands.length === 0 ? (
          <div className="bp-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: 160, borderRadius: 20, background: "rgba(255,255,255,0.55)", border: "1px solid rgba(0,0,0,0.06)", animation: "bpFade 1.4s ease infinite alternate", animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <div className="bp-section-label">Active · {active.length}</div>
                <div className="bp-grid">
                  {active.map((b, i) => (
                    <div key={b.id} className="bp-fade" style={{ animationDelay: `${i * 0.04}s` }}>
                      <BrandCard b={b} onToggle={toggleActive} toggling={toggling === b.id} onDelete={() => refresh(true)} onEdit={() => openEdit(b)} />
                    </div>
                  ))}
                </div>
              </section>
            )}
            {inactive.length > 0 && (
              <section>
                <div className="bp-section-label">Inactive · {inactive.length}</div>
                <div className="bp-grid">
                  {inactive.map((b, i) => (
                    <div key={b.id} className="bp-fade" style={{ animationDelay: `${i * 0.04}s` }}>
                      <BrandCard b={b} onToggle={toggleActive} toggling={toggling === b.id} onDelete={() => refresh(true)} onEdit={() => openEdit(b)} />
                    </div>
                  ))}
                </div>
              </section>
            )}
            {brands.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "70px 20px" }}>
                <Building2 style={{ width: 44, height: 44, margin: "0 auto 12px", color: "rgba(0,0,0,0.15)" }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(0,0,0,0.3)" }}>No brands yet</p>
                <p style={{ fontSize: 11, color: "rgba(0,0,0,0.2)", marginTop: 4 }}>Click "New Brand" to add one</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drawer */}
      {drawer.open && (
        <BrandDrawer
          initial={drawer.brand}
          onClose={closeDrawer}
          onSaved={async () => {
            closeDrawer();
            await refresh(true);
            setMsg({ type: "ok", text: drawer.brand ? "Brand updated." : "Brand created." });
          }}
        />
      )}
    </>
  );
}