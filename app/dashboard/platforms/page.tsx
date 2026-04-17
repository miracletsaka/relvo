"use client";

import { useEffect, useState } from "react";
import {
  createPlatform,
  listPlatforms,
  updatePlatform,
  type PlatformRow,
} from "@/lib/api";
import { RefreshCcw, Plus, Globe, ToggleLeft, ToggleRight, AlertTriangle, Check } from "lucide-react";

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#1877F2", instagram: "#E1306C", linkedin: "#0A66C2",
  twitter: "#1DA1F2", tiktok: "#69C9D0", youtube: "#FF0000",
  whatsapp: "#25D366", pinterest: "#E60023", snapchat: "#FFFC00",
};

function getPlatformColor(id: string) {
  return PLATFORM_COLORS[id.toLowerCase()] ?? "#7c3aed";
}

function PlatformIcon({ id, size = 28 }: { id: string; size?: number }) {
  const color = getPlatformColor(id);
  const letter = id.charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3,
      background: color + "20", border: `1px solid ${color}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color, fontSize: size * 0.42, fontWeight: 800, fontFamily: "Syne, sans-serif",
      flexShrink: 0,
    }}>
      {letter}
    </div>
  );
}

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<PlatformRow[]>([]);
  const [loading, setLoading]     = useState(false);
  const [toggling, setToggling]   = useState<string | null>(null);
  const [msg, setMsg]             = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [isActive, setIsActive]       = useState(true);
  const [creating, setCreating]       = useState(false);
  const [showForm, setShowForm]       = useState(false);

  // Auto-derive slug from display name
  const autoId = displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const refresh = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setMsg(null);
    try {
      const data = await listPlatforms(false);
      setPlatforms(data);
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
      await createPlatform({ id: autoId, display_name: cleanName, is_active: isActive });
      setDisplayName(""); setIsActive(true); setShowForm(false);
      await refresh(true);
      setMsg({ type: "ok", text: `Platform "${cleanName}" created.` });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (p: PlatformRow) => {
    setToggling(p.id); setMsg(null);
    try {
      await updatePlatform(p.id, { is_active: !p.is_active });
      await refresh(true);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setToggling(null);
    }
  };

  const active   = platforms.filter(p => p.is_active);
  const inactive = platforms.filter(p => !p.is_active);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .pf-root { font-family: 'Syne', sans-serif; background: #0c0c0f; min-height: 100vh; color: #e4e4e7; padding: 28px 24px; }
        .pf-root * { box-sizing: border-box; }
        @keyframes pfFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .pf-fade { animation: pfFade 0.22s ease both; }
        .pf-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); border-radius: 11px; padding: 10px 14px; color: #e4e4e7; font-family: 'DM Mono', monospace; font-size: 12px; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .pf-input:focus { border-color: rgba(124,58,237,0.5); box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .pf-input::placeholder { color: rgba(255,255,255,0.18); }
        .pf-label { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.28); font-family: 'DM Mono', monospace; margin-bottom: 6px; display: block; }
        .pf-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 11px; font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; border: none; }
        .pf-btn-primary { background: linear-gradient(135deg,#7c3aed,#4f46e5); color: white; }
        .pf-btn-primary:hover:not(:disabled) { opacity: 0.85; }
        .pf-btn-outline { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.55); }
        .pf-btn-outline:hover:not(:disabled) { background: rgba(255,255,255,0.09); color: #e4e4e7; }
        .pf-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .pf-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden; transition: border-color 0.18s, transform 0.18s; }
        .pf-card:hover { border-color: rgba(255,255,255,0.13); transform: translateY(-1px); }
        .pf-toggle { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; transition: opacity 0.15s; }
        .pf-toggle:hover { opacity: 0.75; }
        .pf-toggle:disabled { opacity: 0.3; cursor: not-allowed; }
        .pf-section-label { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.22); font-family: 'DM Mono', monospace; margin-bottom: 12px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.1); border-top-color: #a78bfa; border-radius: 50%; animation: spin 0.7s linear infinite; }
      `}</style>

      <div className="pf-root">

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(124,58,237,0.7)", marginBottom: 4, fontFamily: "DM Mono, monospace" }}>
              Relvō · Config
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#e4e4e7", margin: 0, lineHeight: 1.1 }}>Platforms</h1>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 5 }}>
              {platforms.length} platform{platforms.length !== 1 ? "s" : ""} · {active.length} active
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="pf-btn pf-btn-outline" onClick={() => refresh()} disabled={loading}>
              <RefreshCcw style={{ width: 12, height: 12, animation: loading ? "spin 0.7s linear infinite" : "none" }} />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button className="pf-btn pf-btn-primary" onClick={() => setShowForm(v => !v)}>
              <Plus style={{ width: 12, height: 12 }} />
              New Platform
            </button>
          </div>
        </div>

        {/* ── Create form ── */}
        {showForm && (
          <div className="pf-fade" style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 18, padding: "20px 22px", marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", marginBottom: 16 }}>New Platform</div>

            {/* Single field */}
            <div style={{ marginBottom: 16 }}>
              <span className="pf-label">Platform Name</span>
              <input
                className="pf-input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onCreate()}
                placeholder="e.g. Facebook"
                autoFocus
              />
              {/* Auto-generated ID preview */}
              {autoId && (
                <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace" }}>ID →</span>
                  <span style={{ fontSize: 9, color: getPlatformColor(autoId) + "cc", fontFamily: "DM Mono, monospace", background: getPlatformColor(autoId) + "18", border: `1px solid ${getPlatformColor(autoId)}30`, padding: "2px 8px", borderRadius: 5 }}>
                    {autoId}
                  </span>
                </div>
              )}
            </div>

            {/* Active toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <span className="pf-label" style={{ margin: 0 }}>Active on creation</span>
              <button className="pf-toggle" onClick={() => setIsActive(v => !v)}>
                {isActive
                  ? <ToggleRight style={{ width: 28, height: 28, color: "#34d399" }} />
                  : <ToggleLeft  style={{ width: 28, height: 28, color: "rgba(255,255,255,0.2)" }} />
                }
              </button>
              <span style={{ fontSize: 11, color: isActive ? "#34d399" : "rgba(255,255,255,0.3)", fontWeight: 700 }}>
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {/* Live preview */}
            {displayName && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, marginBottom: 16 }}>
                <PlatformIcon id={autoId || displayName} size={26} />
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
              <button className="pf-btn pf-btn-primary" onClick={onCreate} disabled={creating}>
                {creating ? <span className="spinner" /> : <Plus style={{ width: 12, height: 12 }} />}
                {creating ? "Creating…" : "Create Platform"}
              </button>
              <button className="pf-btn pf-btn-outline" onClick={() => { setShowForm(false); setDisplayName(""); setMsg(null); }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Toast ── */}
        {msg && (
          <div className="pf-fade" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, marginBottom: 18, fontSize: 12, fontWeight: 700, background: msg.type === "ok" ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${msg.type === "ok" ? "rgba(52,211,153,0.25)" : "rgba(239,68,68,0.22)"}`, color: msg.type === "ok" ? "#34d399" : "#f87171" }}>
            {msg.type === "ok" ? <Check style={{ width: 13, height: 13, flexShrink: 0 }} /> : <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} />}
            {msg.text}
          </div>
        )}

        {/* ── Lists ── */}
        {loading && platforms.length === 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 10 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 80, borderRadius: 16, background: "rgba(255,255,255,0.04)", animation: "pfFade 1.5s ease infinite alternate" }} />
            ))}
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <div className="pf-section-label">Active · {active.length}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px,1fr))", gap: 10 }}>
                  {active.map((p, i) => (
                    <PlatformCard key={p.id} p={p} onToggle={toggleActive} toggling={toggling === p.id} idx={i} />
                  ))}
                </div>
              </section>
            )}

            {inactive.length > 0 && (
              <section>
                <div className="pf-section-label">Inactive · {inactive.length}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px,1fr))", gap: 10 }}>
                  {inactive.map((p, i) => (
                    <PlatformCard key={p.id} p={p} onToggle={toggleActive} toggling={toggling === p.id} idx={i} />
                  ))}
                </div>
              </section>
            )}

            {platforms.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.12)" }}>
                <Globe style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.35 }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.2)" }}>No platforms yet</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", marginTop: 4 }}>Click "New Platform" to add one</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function PlatformCard({ p, onToggle, toggling, idx }: {
  p: PlatformRow; onToggle: (p: PlatformRow) => void;
  toggling: boolean; idx: number;
}) {
  const color = getPlatformColor(p.id);
  return (
    <div className="pf-card pf-fade" style={{ animationDelay: `${idx * 0.04}s`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <PlatformIcon id={p.id} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: p.is_active ? "#e4e4e7" : "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {p.display_name}
        </div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", fontFamily: "DM Mono, monospace", marginTop: 2 }}>{p.id}</div>
      </div>
      <button className="pf-toggle" onClick={() => onToggle(p)} disabled={toggling} title={p.is_active ? "Disable" : "Enable"}>
        {toggling
          ? <span style={{ width: 26, height: 26, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: color, borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
          : p.is_active
            ? <ToggleRight style={{ width: 26, height: 26, color: "#34d399" }} />
            : <ToggleLeft  style={{ width: 26, height: 26, color: "rgba(255,255,255,0.18)" }} />
        }
      </button>
    </div>
  );
}