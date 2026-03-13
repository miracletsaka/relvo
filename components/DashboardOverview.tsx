"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCcw, ArrowUpRight, AlertTriangle, CheckCircle2,
  Clock, XCircle, Layers, Image as ImageIcon, Zap,
  TrendingUp, Calendar, ExternalLink, ChevronRight,
  Activity, Sparkles, Eye,
} from "lucide-react";

/* ─── Types ────────────────────────────────────────────────── */
type TopicChatRow = {
  id: string;
  topic?: string | null;
  brand_id?: string | null;
  target_month?: string | null;
  posts_per_week?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DraftRow = {
  id: string;
  topic_chat_id: string;
  platform?: string | null;
  status?: string | null;
  body_text?: string | null;
  scheduled_at?: string | null;
  last_error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  media_urls?: any;
  thumbnail_url?: string | null;
  structured?: Record<string, any> | null;
};

type Bundle = { chat: TopicChatRow; drafts: DraftRow[]; counts: Record<string, number> };

/* ─── Helpers ───────────────────────────────────────────────── */
async function fetchJson(url: string) {
  const r = await fetch(url);
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { const j = await r.json(); msg = j?.detail || j?.message || msg; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

function countByStatus(drafts: DraftRow[]) {
  const map: Record<string, number> = {};
  for (const d of drafts) {
    const s = String(d.status || "UNKNOWN").toUpperCase();
    map[s] = (map[s] || 0) + 1;
  }
  return map;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getMediaUrl(d: DraftRow): string | null {
  if (d.thumbnail_url) return d.thumbnail_url;
  if (d.media_url) return d.media_url;
  if (Array.isArray(d.media_urls) && d.media_urls.length) return d.media_urls[0];
  return null;
}

const PLATFORM_COLOR: Record<string, string> = {
  instagram: "#E1306C", facebook: "#1877F2", linkedin: "#0A66C2",
  twitter: "#1DA1F2", tiktok: "#69C9D0",
};
const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  PENDING_APPROVAL: { color: "#a78bfa", icon: <Clock style={{ width: 11, height: 11 }} />, label: "Pending" },
  PUBLISHED:        { color: "#34d399", icon: <CheckCircle2 style={{ width: 11, height: 11 }} />, label: "Published" },
  FAILED:           { color: "#f87171", icon: <XCircle style={{ width: 11, height: 11 }} />, label: "Failed" },
  APPROVED:         { color: "#60a5fa", icon: <CheckCircle2 style={{ width: 11, height: 11 }} />, label: "Approved" },
  SCHEDULED:        { color: "#fbbf24", icon: <Calendar style={{ width: 11, height: 11 }} />, label: "Scheduled" },
};
function statusCfg(s: string) {
  return STATUS_CONFIG[s.toUpperCase()] ?? { color: "#6b7280", icon: null, label: s };
}

/* ─── Sub-components ────────────────────────────────────────── */

function KpiCard({ label, value, color, icon, loading, sub }: {
  label: string; value: number | string; color: string;
  icon: React.ReactNode; loading: boolean; sub?: string;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: `1px solid ${color}22`,
      borderRadius: 16, padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 8,
      position: "relative", overflow: "hidden",
      transition: "border-color 0.2s, transform 0.15s",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}45`; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}22`; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
    >
      {/* glow blob */}
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: color, opacity: 0.06, filter: "blur(20px)", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace" }}>{label}</span>
        <span style={{ color, opacity: 0.7 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: loading ? "rgba(255,255,255,0.1)" : "#e4e4e7", lineHeight: 1, fontFamily: "Syne, sans-serif" }}>
        {loading ? "—" : value}
      </div>
      {sub && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>{sub}</div>}
    </div>
  );
}

function DraftImageCard({ draft, chat }: { draft: DraftRow; chat: TopicChatRow }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const mediaUrl = getMediaUrl(draft);
  const s = String(draft.status || "").toUpperCase();
  const cfg = statusCfg(s);
  const pColor = PLATFORM_COLOR[String(draft.platform || "").toLowerCase()] ?? "#6b7280";
  const hook = draft.structured?.hook || draft.body_text?.slice(0, 80) || "—";

  return (
    <Link href={`/dashboard/topic-chats/${chat.id}`} style={{ textDecoration: "none" }}>
      <div style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16, overflow: "hidden",
        transition: "border-color 0.15s, transform 0.15s, box-shadow 0.15s",
        cursor: "pointer",
      }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = "rgba(255,255,255,0.15)";
          el.style.transform = "translateY(-2px)";
          el.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = "rgba(255,255,255,0.07)";
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "none";
        }}
      >
        {/* Image area */}
        <div style={{ aspectRatio: "4/3", background: "#111115", position: "relative", overflow: "hidden" }}>
          {mediaUrl && !imgErr ? (
            <>
              <img
                src={mediaUrl}
                alt=""
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgErr(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: imgLoaded ? 1 : 0, transition: "opacity 0.3s" }}
              />
              {!imgLoaded && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#a78bfa", borderRadius: "50%", animation: "dbspin 0.8s linear infinite" }} />
                </div>
              )}
            </>
          ) : (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "rgba(255,255,255,0.1)" }}>
              <ImageIcon style={{ width: 28, height: 28 }} />
              <span style={{ fontSize: 10, fontFamily: "DM Mono, monospace" }}>no image</span>
            </div>
          )}
          {/* Overlay badges */}
          <div style={{ position: "absolute", top: 8, left: 8, right: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ background: pColor + "cc", color: "white", fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 8, letterSpacing: "0.08em", textTransform: "uppercase", backdropFilter: "blur(4px)" }}>
              {draft.platform || "—"}
            </span>
            <span style={{ background: cfg.color + "22", border: `1px solid ${cfg.color}50`, color: cfg.color, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 8, display: "flex", alignItems: "center", gap: 3, backdropFilter: "blur(4px)" }}>
              {cfg.icon}{cfg.label}
            </span>
          </div>
          {/* Gradient fade at bottom */}
          {imgLoaded && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)", pointerEvents: "none" }} />}
        </div>

        {/* Content */}
        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", margin: 0 }}>
            {hook}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>
              {fmtDate(draft.scheduled_at || draft.created_at)}
            </span>
            {mediaUrl && !imgErr && (
              <span style={{ fontSize: 9, color: "#34d399", fontFamily: "DM Mono, monospace", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                <ImageIcon style={{ width: 8, height: 8 }} />IMG
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function AttentionRow({ chat, draft }: { chat: TopicChatRow; draft: DraftRow }) {
  const s = String(draft.status || "").toUpperCase();
  const cfg = statusCfg(s);
  const pColor = PLATFORM_COLOR[String(draft.platform || "").toLowerCase()] ?? "#6b7280";
  const mediaUrl = getMediaUrl(draft);

  return (
    <Link href={`/dashboard/topic-chats/${chat.id}`} style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
        borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)", transition: "background 0.15s, border-color 0.15s",
        cursor: "pointer",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.borderColor = `${cfg.color}30`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; }}
      >
        {/* Thumbnail */}
        <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", background: "#111115", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {mediaUrl
            ? <img src={mediaUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
            : <ImageIcon style={{ width: 16, height: 16, color: "rgba(255,255,255,0.15)" }} />
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ background: pColor + "22", color: pColor, fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {draft.platform || "—"}
            </span>
            <span style={{ background: cfg.color + "18", color: cfg.color, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, display: "flex", alignItems: "center", gap: 3 }}>
              {cfg.icon}{cfg.label}
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", marginLeft: "auto" }}>
              {fmtDate(draft.updated_at || draft.created_at)}
            </span>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {(chat.topic || draft.body_text || "—").slice(0, 100)}
          </p>
          {draft.last_error && s === "FAILED" && (
            <p style={{ fontSize: 10, color: "#f87171", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "DM Mono, monospace" }}>
              {draft.last_error.slice(0, 80)}
            </p>
          )}
        </div>

        <ChevronRight style={{ width: 14, height: 14, color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
      </div>
    </Link>
  );
}

function ChatRow({ bundle }: { bundle: Bundle }) {
  const { chat, counts } = bundle;
  const total = bundle.drafts.length;
  const withImages = bundle.drafts.filter(d => !!getMediaUrl(d)).length;
  const previews = bundle.drafts.filter(d => !!getMediaUrl(d)).slice(0, 4);

  return (
    <Link href={`/dashboard/topic-chats/${chat.id}`} style={{ textDecoration: "none" }}>
      <div style={{
        padding: "12px 14px", borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.02)",
        transition: "background 0.15s, border-color 0.15s",
        cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.25)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
      >
        {/* Stacked image previews */}
        <div style={{ display: "flex", flexShrink: 0 }}>
          {previews.length > 0 ? previews.map((d, i) => (
            <div key={d.id} style={{ width: 36, height: 36, borderRadius: 9, overflow: "hidden", border: "2px solid #0e0e12", marginLeft: i > 0 ? -10 : 0, background: "#111115" }}>
              <img src={getMediaUrl(d)!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
            </div>
          )) : (
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Layers style={{ width: 14, height: 14, color: "rgba(255,255,255,0.2)" }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7", margin: "0 0 5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {(chat.topic || "Untitled").slice(0, 80)}
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {chat.target_month && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", padding: "2px 7px", borderRadius: 6, fontFamily: "DM Mono, monospace" }}>{chat.target_month}</span>}
            {chat.posts_per_week && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", padding: "2px 7px", borderRadius: 6, fontFamily: "DM Mono, monospace" }}>{chat.posts_per_week}/wk</span>}
            {[
              { key: "PENDING_APPROVAL", color: "#a78bfa", label: "Pending" },
              { key: "PUBLISHED", color: "#34d399", label: "Published" },
              { key: "FAILED", color: "#f87171", label: "Failed" },
            ].map(({ key, color, label }) => counts[key] > 0 && (
              <span key={key} style={{ fontSize: 9, color, background: color + "18", border: `1px solid ${color}30`, padding: "2px 7px", borderRadius: 6, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>
                {counts[key]} {label}
              </span>
            ))}
            {withImages > 0 && (
              <span style={{ fontSize: 9, color: "#34d399", display: "flex", alignItems: "center", gap: 3, fontFamily: "DM Mono, monospace" }}>
                <ImageIcon style={{ width: 8, height: 8 }} />{withImages} img
              </span>
            )}
          </div>
        </div>

        {/* Meta */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#e4e4e7" }}>{total}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>drafts</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", marginTop: 3 }}>{fmtDate(chat.updated_at || chat.created_at)}</div>
        </div>

        <ChevronRight style={{ width: 14, height: 14, color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
      </div>
    </Link>
  );
}

/* ─── Section header ─────────────────────────────────────────── */
function SectionHeader({ icon, title, count, href }: { icon: React.ReactNode; title: string; count?: number; href?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ color: "rgba(255,255,255,0.3)", display: "flex" }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace" }}>{title}</span>
      {count !== undefined && (
        <span style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8, padding: "1px 7px", fontSize: 9, color: "rgba(255,255,255,0.4)", fontFamily: "DM Mono, monospace", fontWeight: 700 }}>{count}</span>
      )}
      {href && (
        <Link href={href} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#a78bfa", textDecoration: "none", fontWeight: 700 }}>
          View all <ArrowUpRight style={{ width: 11, height: 11 }} />
        </Link>
      )}
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────────── */
export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Bundle[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true); else setLoading(true);
    setErr(null);
    try {
      const chats: TopicChatRow[] = await fetchJson(`${process.env.NEXT_PUBLIC_API_BASE}/topic-chats?limit=12`);
      const bundles = await Promise.all(
        (chats || []).map(async (c) => {
          const drafts: DraftRow[] = await fetchJson(`${process.env.NEXT_PUBLIC_API_BASE}/topic-chats/${c.id}/drafts`);
          return { chat: c, drafts: drafts || [], counts: countByStatus(drafts || []) };
        })
      );
      setRows(bundles);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  /* computed */
  const globalCounts = useMemo(() => {
    const t: Record<string, number> = {};
    for (const r of rows) for (const [k, v] of Object.entries(r.counts)) t[k] = (t[k] || 0) + v;
    return t;
  }, [rows]);

  const totalDrafts = useMemo(() => rows.reduce((s, r) => s + r.drafts.length, 0), [rows]);
  const kpi = (s: string) => globalCounts[s.toUpperCase()] || 0;

  const needsAttention = useMemo(() => {
    const list: Array<{ chat: TopicChatRow; draft: DraftRow }> = [];
    for (const r of rows) for (const d of r.drafts) {
      const s = String(d.status || "").toUpperCase();
      if (s === "PENDING_APPROVAL" || s === "FAILED") list.push({ chat: r.chat, draft: d });
    }
    list.sort((a, b) => new Date(b.draft.updated_at || 0).getTime() - new Date(a.draft.updated_at || 0).getTime());
    return list.slice(0, 12);
  }, [rows]);

  /* all drafts with images — for the visual wall */
  const draftsWithImages = useMemo(() => {
    const all: Array<{ draft: DraftRow; chat: TopicChatRow }> = [];
    for (const r of rows) for (const d of r.drafts) if (getMediaUrl(d)) all.push({ draft: d, chat: r.chat });
    return all.slice(0, 12);
  }, [rows]);

  const imageRate = totalDrafts > 0 ? Math.round((draftsWithImages.length / totalDrafts) * 100) : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .db-root { font-family: 'Syne', sans-serif; background: #0c0c0f; min-height: 100vh; color: #e4e4e7; }
        @keyframes dbspin { to { transform: rotate(360deg); } }
        @keyframes dbfade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .db-animate { animation: dbfade 0.3s ease both; }
        .db-grid-images { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
        @media (max-width: 640px) { .db-grid-images { grid-template-columns: repeat(2, 1fr); } }
        .db-skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: dbshimmer 1.5s infinite; border-radius: 16px; }
        @keyframes dbshimmer { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }
        .db-scrollbar::-webkit-scrollbar { width: 3px; }
        .db-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .db-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      <div className="db-root" style={{ padding: "24px 20px", maxWidth: 1280, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(124,58,237,0.7)", marginBottom: 4, fontFamily: "DM Mono, monospace" }}>
              NeuroFlow · Command Center
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#e4e4e7", lineHeight: 1.1, margin: 0 }}>
              Content Dashboard
            </h1>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 5 }}>
              {loading ? "Loading…" : `${rows.length} campaigns · ${totalDrafts} drafts · ${draftsWithImages.length} images`}
            </p>
          </div>
          <button
            onClick={() => refresh(true)}
            disabled={refreshing}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 11, color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", transition: "all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; (e.currentTarget as HTMLElement).style.color = "#e4e4e7"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; }}
          >
            <RefreshCcw style={{ width: 13, height: 13, animation: refreshing ? "dbspin 0.8s linear infinite" : "none" }} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {err && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#f87171", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />{err}
          </div>
        )}

        {/* ── KPI row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 28 }}>
          <KpiCard label="Campaigns" value={rows.length} color="#a78bfa" icon={<Layers style={{ width: 14, height: 14 }} />} loading={loading} />
          <KpiCard label="Total Drafts" value={totalDrafts} color="#60a5fa" icon={<Zap style={{ width: 14, height: 14 }} />} loading={loading} />
          <KpiCard label="Pending" value={kpi("PENDING_APPROVAL")} color="#a78bfa" icon={<Clock style={{ width: 14, height: 14 }} />} loading={loading} sub="needs review" />
          <KpiCard label="Published" value={kpi("PUBLISHED")} color="#34d399" icon={<CheckCircle2 style={{ width: 14, height: 14 }} />} loading={loading} sub="live posts" />
          <KpiCard label="Failed" value={kpi("FAILED")} color="#f87171" icon={<XCircle style={{ width: 14, height: 14 }} />} loading={loading} />
          <KpiCard label="With Images" value={`${imageRate}%`} color="#fbbf24" icon={<ImageIcon style={{ width: 14, height: 14 }} />} loading={loading} sub={`${draftsWithImages.length} of ${totalDrafts}`} />
        </div>

        {/* ── Two-column layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>

          {/* LEFT column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Draft image wall */}
            <div className="db-animate">
              <SectionHeader
                icon={<ImageIcon style={{ width: 13, height: 13 }} />}
                title="Draft Images"
                count={draftsWithImages.length}
                href="/dashboard/topic-chats"
              />

              {loading ? (
                <div className="db-grid-images">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="db-skeleton" style={{ aspectRatio: "4/3", animationDelay: `${i * 0.06}s` }} />
                  ))}
                </div>
              ) : draftsWithImages.length === 0 ? (
                <div style={{ border: "2px dashed rgba(255,255,255,0.07)", borderRadius: 16, padding: "48px 20px", textAlign: "center", color: "rgba(255,255,255,0.15)" }}>
                  <ImageIcon style={{ width: 36, height: 36, margin: "0 auto 10px" }} />
                  <p style={{ fontSize: 13, fontWeight: 700 }}>No draft images yet</p>
                  <p style={{ fontSize: 11, marginTop: 4 }}>Generate topics with auto image generation enabled</p>
                </div>
              ) : (
                <div className="db-grid-images">
                  {draftsWithImages.map(({ draft, chat }, i) => (
                    <div key={draft.id} className="db-animate" style={{ animationDelay: `${i * 0.04}s` }}>
                      <DraftImageCard draft={draft} chat={chat} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent topic chats */}
            <div className="db-animate" style={{ animationDelay: "0.1s" }}>
              <SectionHeader
                icon={<Activity style={{ width: 13, height: 13 }} />}
                title="Recent Campaigns"
                count={rows.length}
                href="/dashboard/topic-chats"
              />
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="db-skeleton" style={{ height: 72, animationDelay: `${i * 0.07}s` }} />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 12 }}>No campaigns yet</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {rows.map((bundle, i) => (
                    <div key={bundle.chat.id} className="db-animate" style={{ animationDelay: `${0.1 + i * 0.04}s` }}>
                      <ChatRow bundle={bundle} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT column — needs attention */}
          <div className="db-animate" style={{ animationDelay: "0.05s", position: "sticky", top: 20 }}>
            <SectionHeader
              icon={<AlertTriangle style={{ width: 13, height: 13 }} />}
              title="Needs Attention"
              count={needsAttention.length}
              href="/dashboard/topic-chats"
            />

            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16, overflow: "hidden",
              maxHeight: "calc(100vh - 140px)",
            }}>
              {loading ? (
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="db-skeleton" style={{ height: 68, animationDelay: `${i * 0.07}s` }} />
                  ))}
                </div>
              ) : needsAttention.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.15)" }}>
                  <CheckCircle2 style={{ width: 32, height: 32, margin: "0 auto 10px", color: "#34d399", opacity: 0.5 }} />
                  <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>All clear</p>
                  <p style={{ fontSize: 11, marginTop: 3 }}>Nothing needs attention</p>
                </div>
              ) : (
                <div className="db-scrollbar" style={{ overflowY: "auto", maxHeight: "calc(100vh - 180px)", padding: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                  {/* Failed first */}
                  {needsAttention.filter(r => r.draft.status?.toUpperCase() === "FAILED").length > 0 && (
                    <>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#f87171", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "DM Mono, monospace", padding: "4px 4px 2px" }}>
                        Failed · {needsAttention.filter(r => r.draft.status?.toUpperCase() === "FAILED").length}
                      </div>
                      {needsAttention.filter(r => r.draft.status?.toUpperCase() === "FAILED").map(({ chat, draft }) => (
                        <AttentionRow key={draft.id} chat={chat} draft={draft} />
                      ))}
                    </>
                  )}
                  {/* Pending */}
                  {needsAttention.filter(r => r.draft.status?.toUpperCase() === "PENDING_APPROVAL").length > 0 && (
                    <>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "DM Mono, monospace", padding: "8px 4px 2px" }}>
                        Pending · {needsAttention.filter(r => r.draft.status?.toUpperCase() === "PENDING_APPROVAL").length}
                      </div>
                      {needsAttention.filter(r => r.draft.status?.toUpperCase() === "PENDING_APPROVAL").map(({ chat, draft }) => (
                        <AttentionRow key={draft.id} chat={chat} draft={draft} />
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Footer CTA */}
              {!loading && needsAttention.length > 0 && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 12px" }}>
                  <Link href="/dashboard/topic-chats" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 10, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#c4b5fd", fontSize: 11, fontWeight: 700, textDecoration: "none", transition: "background 0.15s" }}>
                    <Eye style={{ width: 12, height: 12 }} />
                    Review all drafts
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick actions bar ── */}
        <div style={{ marginTop: 28, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Generate Topics", href: "/dashboard/topics", color: "#7c3aed", icon: <Sparkles style={{ width: 13, height: 13 }} /> },
            { label: "Upload Media", href: "/dashboard/media-assets", color: "#3b82f6", icon: <ImageIcon style={{ width: 13, height: 13 }} /> },
            { label: "View All Chats", href: "/dashboard/topic-chats", color: "#10b981", icon: <Layers style={{ width: 13, height: 13 }} /> },
            { label: "Scheduled Posts", href: "https://publish.buffer.com/all-channels/calendar/week?status=scheduled", color: "#f59e0b", icon: <ExternalLink style={{ width: 13, height: 13 }} />, external: true },
          ].map(({ label, href, color, icon, external }) => (
            external
              ? <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: color + "15", border: `1px solid ${color}30`, borderRadius: 11, color, fontSize: 11, fontWeight: 700, textDecoration: "none", fontFamily: "Syne, sans-serif", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = color + "25"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = color + "15"}
              >{icon}{label}</a>
              : <Link key={label} href={href} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: color + "15", border: `1px solid ${color}30`, borderRadius: 11, color, fontSize: 11, fontWeight: 700, textDecoration: "none", fontFamily: "Syne, sans-serif", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = color + "25"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = color + "15"}
              >{icon}{label}</Link>
          ))}
        </div>

      </div>
    </>
  );
}