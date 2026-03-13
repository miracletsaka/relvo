"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createBrand, listBrands, updateBrand,
  getBrandProfile, startBrandScrape,
  type Brand, type BrandProfile,
} from "@/lib/api";
import {
  RefreshCcw, Plus, Building2, ToggleLeft, ToggleRight,
  AlertTriangle, Check, Globe, Wand2, ChevronDown, ChevronUp,
  Clock, X,
} from "lucide-react";

/* ─── Helpers ─────────────────────────────────── */
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  READY:    { color: "#34d399", label: "Ready"    },
  SCRAPING: { color: "#a78bfa", label: "Scraping" },
  FAILED:   { color: "#f87171", label: "Failed"   },
  IDLE:     { color: "#6b7280", label: "Idle"     },
};
function scfg(s?: string) { return STATUS_CFG[(s || "").toUpperCase()] ?? { color: "#6b7280", label: s || "Unknown" }; }

function BrandAvatar({ id, size = 36 }: { id: string; size?: number }) {
  const letter = id.charAt(0).toUpperCase();
  const hue = Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const color = `hsl(${hue},55%,60%)`;
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: color + "20", border: `1px solid ${color}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color, fontSize: size * 0.44, fontWeight: 800,
      fontFamily: "Syne, sans-serif", flexShrink: 0,
    }}>{letter}</div>
  );
}

/* ─── Brand Card ─────────────────────────────── */
function BrandCard({ b, onToggle, toggling }: {
  b: Brand; onToggle: (b: Brand) => void; toggling: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const hue = Array.from(b.id).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const accentColor = `hsl(${hue},55%,60%)`;

  const loadProfile = async () => {
    if (profile) return;
    setLoadingProfile(true);
    try {
      const p = await getBrandProfile(b.id);
      setProfile(p);
      setWebsiteUrl(p.website_url || "");
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "Failed to load profile" });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) loadProfile();
  };

  const scrapeNow = async () => {
    const url = websiteUrl.trim();
    if (!url) { setMsg({ type: "err", text: "Website URL is required." }); return; }
    if (!/^https?:\/\//i.test(url)) { setMsg({ type: "err", text: "URL must start with http:// or https://" }); return; }
    setScraping(true); setMsg(null);
    try {
      const res = await startBrandScrape({ brand_id: b.id, website_url: url });
      setProfile(p => p
        ? { ...p, website_url: url, status: "SCRAPING", last_error: null }
        : { brand_id: b.id, website_url: url, status: "SCRAPING" } as BrandProfile
      );
      setMsg({ type: "ok", text: `Scrape started — status: ${res.status}` });
      setTimeout(async () => {
        try { const p = await getBrandProfile(b.id); setProfile(p); } catch {}
      }, 1500);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "Failed to start scrape" });
    } finally {
      setScraping(false);
    }
  };

  const cfg = scfg(profile?.status);

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: `1px solid ${expanded ? accentColor + "30" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
        <BrandAvatar id={b.id} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: b.is_active ? "#e4e4e7" : "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {b.display_name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace" }}>{b.id}</span>
            {profile?.status && (
              <span style={{ fontSize: 8, fontWeight: 700, color: cfg.color, background: cfg.color + "18", border: `1px solid ${cfg.color}30`, padding: "1px 6px", borderRadius: 6, fontFamily: "DM Mono, monospace", letterSpacing: "0.06em" }}>
                {cfg.label}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onToggle(b)} disabled={toggling}
          style={{ background: "none", border: "none", cursor: toggling ? "not-allowed" : "pointer", padding: 0, display: "flex", opacity: toggling ? 0.4 : 1 }}
          title={b.is_active ? "Disable" : "Enable"}
        >
          {b.is_active
            ? <ToggleRight style={{ width: 26, height: 26, color: "#34d399" }} />
            : <ToggleLeft  style={{ width: 26, height: 26, color: "rgba(255,255,255,0.18)" }} />
          }
        </button>

        <button
          onClick={handleExpand}
          style={{ background: expanded ? accentColor + "18" : "rgba(255,255,255,0.05)", border: `1px solid ${expanded ? accentColor + "35" : "rgba(255,255,255,0.09)"}`, borderRadius: 9, padding: "6px 10px", cursor: "pointer", color: expanded ? accentColor : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, fontFamily: "Syne, sans-serif", transition: "all 0.15s" }}
        >
          <Globe style={{ width: 11, height: 11 }} />
          Profile
          {expanded ? <ChevronUp style={{ width: 10, height: 10 }} /> : <ChevronDown style={{ width: 10, height: 10 }} />}
        </button>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 18px", background: "rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: 14 }}>
          {loadingProfile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
              <span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: accentColor, borderRadius: "50%", display: "inline-block", animation: "brandspin 0.7s linear infinite" }} />
              Loading profile…
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", display: "block", marginBottom: 6 }}>Website URL</span>
                  <input
                    className="brand-input"
                    value={websiteUrl}
                    onChange={e => setWebsiteUrl(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && scrapeNow()}
                    placeholder="https://example.com"
                    disabled={scraping}
                  />
                </div>
                <button
                  onClick={scrapeNow} disabled={scraping}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: scraping ? "rgba(255,255,255,0.04)" : `${accentColor}22`, border: `1px solid ${scraping ? "rgba(255,255,255,0.07)" : accentColor + "45"}`, borderRadius: 11, color: scraping ? "rgba(255,255,255,0.25)" : accentColor, fontSize: 11, fontWeight: 700, cursor: scraping ? "not-allowed" : "pointer", fontFamily: "Syne, sans-serif", flexShrink: 0 }}
                >
                  {scraping
                    ? <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: accentColor, borderRadius: "50%", display: "inline-block", animation: "brandspin 0.7s linear infinite" }} />
                    : <Wand2 style={{ width: 12, height: 12 }} />
                  }
                  {scraping ? "Scraping…" : "Scrape Now"}
                </button>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>Profile Summary</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace" }}>
                    <Clock style={{ width: 9, height: 9 }} />
                    {fmtDate(profile?.last_scraped_at)}
                  </span>
                </div>
                {profile?.profile_summary ? (
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>{profile.profile_summary}</p>
                ) : (
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", margin: 0, fontStyle: "italic" }}>
                    No summary yet — enter a URL and click Scrape Now.
                  </p>
                )}
                {profile?.last_error && (
                  <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 9 }}>
                    <p style={{ fontSize: 10, color: "#f87171", margin: 0, fontFamily: "DM Mono, monospace", whiteSpace: "pre-wrap" }}>{profile.last_error}</p>
                  </div>
                )}
              </div>

              {msg && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: msg.type === "ok" ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${msg.type === "ok" ? "rgba(52,211,153,0.22)" : "rgba(239,68,68,0.22)"}`, color: msg.type === "ok" ? "#34d399" : "#f87171" }}>
                  {msg.type === "ok" ? <Check style={{ width: 12, height: 12, flexShrink: 0 }} /> : <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0 }} />}
                  {msg.text}
                  <button onClick={() => setMsg(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.5, padding: 2, display: "flex" }}>
                    <X style={{ width: 11, height: 11 }} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ────────────────────────────────── */
export default function BrandsPage() {
  const [brands, setBrands]   = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [msg, setMsg]         = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [showForm, setShowForm]       = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isActive, setIsActive]       = useState(true);
  const [creating, setCreating]       = useState(false);

  // Brand ID is auto-derived — user never types it
  const autoId = displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const refresh = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setMsg(null);
    try {
      const data = await listBrands(false);
      setBrands(data);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const onCreate = async () => {
    const cleanName = displayName.trim();
    if (!cleanName) { setMsg({ type: "err", text: "Display name is required." }); return; }
    if (!autoId)    { setMsg({ type: "err", text: "Name must contain at least one letter or number." }); return; }
    setCreating(true); setMsg(null);
    try {
      await createBrand({ id: autoId, display_name: cleanName, is_active: isActive });
      setDisplayName(""); setIsActive(true); setShowForm(false);
      await refresh(true);
      setMsg({ type: "ok", text: `Brand "${cleanName}" created.` });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (b: Brand) => {
    setToggling(b.id);
    try {
      await updateBrand(b.id, { is_active: !b.is_active });
      await refresh(true);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setToggling(null);
    }
  };

  const active   = useMemo(() => brands.filter(b => b.is_active),  [brands]);
  const inactive = useMemo(() => brands.filter(b => !b.is_active), [brands]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .brands-root { font-family: 'Syne', sans-serif; background: #0c0c0f; min-height: 100vh; color: #e4e4e7; padding: 28px 24px; }
        .brands-root * { box-sizing: border-box; }
        @keyframes brandspin { to { transform: rotate(360deg); } }
        @keyframes brandFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .brand-fade { animation: brandFade 0.22s ease both; }
        .brand-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); border-radius: 11px; padding: 10px 14px; color: #e4e4e7; font-family: 'DM Mono', monospace; font-size: 12px; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .brand-input:focus { border-color: rgba(124,58,237,0.5); box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .brand-input::placeholder { color: rgba(255,255,255,0.18); }
        .brand-input:disabled { opacity: 0.4; }
        .brand-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 11px; font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; border: none; }
        .brand-btn-primary { background: linear-gradient(135deg,#7c3aed,#4f46e5); color: white; }
        .brand-btn-primary:hover:not(:disabled) { opacity: 0.85; }
        .brand-btn-outline { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.55); }
        .brand-btn-outline:hover:not(:disabled) { background: rgba(255,255,255,0.09); color: #e4e4e7; }
        .brand-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .brand-section-label { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.22); font-family: 'DM Mono', monospace; margin-bottom: 10px; }
        .brand-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px,1fr)); gap: 10px; }
        @media (max-width: 500px) { .brand-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="brands-root">

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(124,58,237,0.7)", marginBottom: 4, fontFamily: "DM Mono, monospace" }}>
              NeuroFlow · Config
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#e4e4e7", margin: 0, lineHeight: 1.1 }}>Brands</h1>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 5 }}>
              {brands.length} brand{brands.length !== 1 ? "s" : ""} · {active.length} active · click a brand to configure its scraper
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="brand-btn brand-btn-outline" onClick={() => refresh()} disabled={loading}>
              <RefreshCcw style={{ width: 12, height: 12, animation: loading ? "brandspin 0.7s linear infinite" : "none" }} />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button className="brand-btn brand-btn-primary" onClick={() => setShowForm(v => !v)}>
              <Plus style={{ width: 12, height: 12 }} />
              New Brand
            </button>
          </div>
        </div>

        {/* ── Create form ── */}
        {showForm && (
          <div className="brand-fade" style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 18, padding: "20px 22px", marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", marginBottom: 16 }}>New Brand</div>

            {/* Single field — just the name */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", display: "block", marginBottom: 6 }}>
                Brand Name
              </span>
              <input
                className="brand-input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onCreate()}
                placeholder="e.g. NeuroFlow AI"
                autoFocus
              />
              {/* Auto-generated ID — read-only preview */}
              {autoId && (
                <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace" }}>ID →</span>
                  <span style={{ fontSize: 9, color: "rgba(124,58,237,0.65)", fontFamily: "DM Mono, monospace", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", padding: "2px 8px", borderRadius: 5 }}>
                    {autoId}
                  </span>
                </div>
              )}
            </div>

            {/* Active toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>Active on creation</span>
              <button onClick={() => setIsActive(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                {isActive
                  ? <ToggleRight style={{ width: 28, height: 28, color: "#34d399" }} />
                  : <ToggleLeft  style={{ width: 28, height: 28, color: "rgba(255,255,255,0.2)" }} />
                }
              </button>
              <span style={{ fontSize: 11, color: isActive ? "#34d399" : "rgba(255,255,255,0.3)", fontWeight: 700 }}>
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {/* Live card preview */}
            {displayName && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, marginBottom: 16 }}>
                <BrandAvatar id={autoId || displayName} size={28} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7" }}>{displayName}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>{autoId}</div>
                </div>
                <span style={{ marginLeft: "auto", fontSize: 9, background: isActive ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.06)", border: `1px solid ${isActive ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.1)"}`, color: isActive ? "#34d399" : "rgba(255,255,255,0.3)", padding: "2px 8px", borderRadius: 7, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>
                  {isActive ? "active" : "inactive"}
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button className="brand-btn brand-btn-primary" onClick={onCreate} disabled={creating}>
                {creating
                  ? <span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "brandspin 0.7s linear infinite" }} />
                  : <Plus style={{ width: 12, height: 12 }} />
                }
                {creating ? "Creating…" : "Create Brand"}
              </button>
              <button className="brand-btn brand-btn-outline" onClick={() => { setShowForm(false); setDisplayName(""); setMsg(null); }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Global toast ── */}
        {msg && (
          <div className="brand-fade" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, marginBottom: 18, fontSize: 12, fontWeight: 700, background: msg.type === "ok" ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${msg.type === "ok" ? "rgba(52,211,153,0.25)" : "rgba(239,68,68,0.22)"}`, color: msg.type === "ok" ? "#34d399" : "#f87171" }}>
            {msg.type === "ok" ? <Check style={{ width: 13, height: 13 }} /> : <AlertTriangle style={{ width: 13, height: 13 }} />}
            {msg.text}
            <button onClick={() => setMsg(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.5, padding: 2, display: "flex" }}>
              <X style={{ width: 11, height: 11 }} />
            </button>
          </div>
        )}

        {/* ── Brand lists ── */}
        {loading && brands.length === 0 ? (
          <div className="brand-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: 72, borderRadius: 16, background: "rgba(255,255,255,0.04)", animation: "brandFade 1.4s ease infinite alternate", animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <div className="brand-section-label">Active · {active.length}</div>
                <div className="brand-grid">
                  {active.map((b, i) => (
                    <div key={b.id} className="brand-fade" style={{ animationDelay: `${i * 0.04}s` }}>
                      <BrandCard b={b} onToggle={toggleActive} toggling={toggling === b.id} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {inactive.length > 0 && (
              <section>
                <div className="brand-section-label">Inactive · {inactive.length}</div>
                <div className="brand-grid">
                  {inactive.map((b, i) => (
                    <div key={b.id} className="brand-fade" style={{ animationDelay: `${i * 0.04}s` }}>
                      <BrandCard b={b} onToggle={toggleActive} toggling={toggling === b.id} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {brands.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <Building2 style={{ width: 42, height: 42, margin: "0 auto 12px", opacity: 0.35, color: "rgba(255,255,255,0.12)" }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.2)" }}>No brands yet</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", marginTop: 4 }}>Click "New Brand" to add one</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}