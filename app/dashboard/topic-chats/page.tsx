"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  RefreshCcw, Search, X, ChevronRight, Image as ImageIcon,
  Clock, CheckCircle2, XCircle, Calendar, Layers, ArrowUpRight,
  MessageCircle, SlidersHorizontal, Play, Eye, AlertTriangle,
  CheckCheck, Filter, Trash2,
} from "lucide-react";
import { listTopicChats, listTopicChatDrafts, deleteTopicChat } from "@/lib/api";

/* ─── Types ─────────────────────────────────────────────────── */
type Chat = {
  id: string; topic?: string | null; brand_id?: string | null;
  target_month?: string | null; posts_per_week?: number | null;
  created_at?: string | null; updated_at?: string | null;
};
type Draft = {
  id: string; topic_chat_id: string; platform?: string | null;
  status?: string | null; body_text?: string | null;
  scheduled_at?: string | null; last_error?: string | null;
  created_at?: string | null; updated_at?: string | null;
  media_type?: string | null; media_url?: string | null;
  media_urls?: any; thumbnail_url?: string | null;
  structured?: Record<string, any> | null;
};

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function safeArr(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") {
    try { const p = JSON.parse(v); if (Array.isArray(p)) return p.filter(Boolean); } catch {}
    if (v.includes(",")) return v.split(",").map(x => x.trim()).filter(Boolean);
  }
  return [];
}

function getMedia(d: Draft): { kind: "image" | "video" | null; url: string | null; thumb: string | null } {
  const urls = safeArr(d.media_urls);
  const primary = d.media_url || urls[0] || null;
  if (!primary) return { kind: null, url: null, thumb: null };
  const mt = (d.media_type || "").toLowerCase();
  const lower = primary.toLowerCase();
  const isVideo = mt === "video" || lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.includes("video");
  return { kind: isVideo ? "video" : "image", url: primary, thumb: d.thumbnail_url || null };
}

function countByStatus(drafts: Draft[]) {
  const m: Record<string, number> = {};
  for (const d of drafts) { const s = String(d.status || "UNKNOWN").toUpperCase(); m[s] = (m[s] || 0) + 1; }
  return m;
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C", facebook: "#1877F2", linkedin: "#0A66C2",
  twitter: "#1DA1F2", tiktok: "#69C9D0",
};

const STATUS_CFG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  PENDING_APPROVAL: { color: "#a78bfa", label: "Pending",   icon: <Clock style={{ width: 10, height: 10 }} /> },
  PUBLISHED:        { color: "#34d399", label: "Published", icon: <CheckCircle2 style={{ width: 10, height: 10 }} /> },
  FAILED:           { color: "#f87171", label: "Failed",    icon: <XCircle style={{ width: 10, height: 10 }} /> },
  APPROVED:         { color: "#60a5fa", label: "Approved",  icon: <CheckCheck style={{ width: 10, height: 10 }} /> },
  SCHEDULED:        { color: "#fbbf24", label: "Scheduled", icon: <Calendar style={{ width: 10, height: 10 }} /> },
};
function scfg(s: string) { return STATUS_CFG[s.toUpperCase()] ?? { color: "#6b7280", label: s, icon: null }; }

/* ─── DeleteConfirmModal ─────────────────────────────────────── */
function DeleteConfirmModal({
  chat,
  draftCount,
  onConfirm,
  onCancel,
  deleting,
}: {
  chat: Chat;
  draftCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "#141418", border: "1px solid rgba(248,113,113,0.25)",
        borderRadius: 18, padding: "28px 28px 24px", maxWidth: 400, width: "100%",
        boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Trash2 style={{ width: 16, height: 16, color: "#f87171" }} />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#e4e4e7", margin: 0, fontFamily: "Syne, sans-serif" }}>
            Delete campaign?
          </h3>
        </div>

        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: "0 0 8px" }}>
          This will permanently delete:
        </p>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, border: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7", margin: "0 0 4px" }}>
            {chat.topic || "Untitled topic"}
          </p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0, fontFamily: "DM Mono, monospace" }}>
            {draftCount} draft{draftCount !== 1 ? "s" : ""} · {chat.brand_id} · {chat.target_month}
          </p>
        </div>

        <p style={{ fontSize: 11, color: "#f87171", margin: "0 0 20px", fontWeight: 600 }}>
          This action cannot be undone.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 11, color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{ flex: 1, padding: "10px", background: deleting ? "rgba(248,113,113,0.08)" : "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.35)", borderRadius: 11, color: deleting ? "rgba(248,113,113,0.4)" : "#f87171", fontSize: 12, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", fontFamily: "Syne, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            {deleting ? (
              <>
                <span style={{ width: 12, height: 12, border: "2px solid rgba(248,113,113,0.2)", borderTopColor: "#f87171", borderRadius: "50%", animation: "tcspin 0.7s linear infinite", display: "inline-block" }} />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 style={{ width: 12, height: 12 }} />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ChatCard ───────────────────────────────────────────────── */
function ChatCard({
  chat, drafts, counts, onQuickView, onDelete,
}: {
  chat: Chat;
  drafts: Draft[];
  counts: Record<string, number>;
  onQuickView: () => void;
  onDelete: () => void;
}) {
  const previews = drafts.filter(d => !!getMedia(d).url).slice(0, 5);
  const withImages = drafts.filter(d => !!getMedia(d).url).length;
  const total = drafts.length;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18, overflow: "hidden",
        transition: "border-color 0.18s, transform 0.18s, box-shadow 0.18s",
        display: "flex", flexDirection: "column",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(124,58,237,0.35)";
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "0 12px 40px rgba(0,0,0,0.35)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(255,255,255,0.07)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      {/* Image strip */}
      <div style={{ height: 92, display: "flex", gap: 1.5, background: "#090910", overflow: "hidden", position: "relative" }}>
        {previews.length > 0 ? (
          previews.map((d, i) => {
            const m = getMedia(d);
            return (
              <div key={d.id} style={{ flex: i === 0 ? 2.5 : 1, overflow: "hidden", position: "relative" }}>
                <img
                  src={m.thumb || m.url!} alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85, transition: "opacity 0.2s" }}
                  onError={e => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                  onMouseEnter={e => { (e.target as HTMLImageElement).style.opacity = "1"; }}
                  onMouseLeave={e => { (e.target as HTMLImageElement).style.opacity = "0.85"; }}
                />
                {i === 0 && previews.length > 1 && (
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 55%, rgba(9,9,16,0.7))", pointerEvents: "none" }} />
                )}
              </div>
            );
          })
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, color: "rgba(255,255,255,0.07)" }}>
            <ImageIcon style={{ width: 26, height: 26 }} />
            <span style={{ fontSize: 9, fontFamily: "DM Mono, monospace", letterSpacing: "0.08em" }}>NO IMAGES</span>
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 32, background: "linear-gradient(to top, rgba(9,9,16,0.8), transparent)", pointerEvents: "none" }} />

        {/* Delete button — top right of image strip */}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          style={{
            position: "absolute", top: 7, right: 7, zIndex: 10,
            width: 26, height: 26, borderRadius: 8,
            background: "rgba(0,0,0,0.55)", border: "1px solid rgba(248,113,113,0.3)",
            color: "#f87171", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)", transition: "all 0.15s",
            opacity: 0.7,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.2)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.55)"; }}
          title="Delete campaign"
        >
          <Trash2 style={{ width: 11, height: 11 }} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {chat.brand_id && (
            <span style={{ background: "rgba(124,58,237,0.14)", border: "1px solid rgba(124,58,237,0.28)", color: "#c4b5fd", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 8, fontFamily: "DM Mono, monospace", letterSpacing: "0.04em" }}>
              {chat.brand_id}
            </span>
          )}
          {chat.target_month && (
            <span style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.38)", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 8, fontFamily: "DM Mono, monospace" }}>
              {chat.target_month}
            </span>
          )}
          {typeof chat.posts_per_week === "number" && (
            <span style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.27)", fontSize: 9, fontFamily: "DM Mono, monospace", padding: "2px 8px", borderRadius: 8 }}>
              {chat.posts_per_week}/wk
            </span>
          )}
        </div>

        <p style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7", lineHeight: 1.42, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {chat.topic || "Untitled topic"}
        </p>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {(["PENDING_APPROVAL", "PUBLISHED", "FAILED"] as const).map(s =>
            counts[s] > 0 && (
              <span key={s} style={{ background: scfg(s).color + "18", border: `1px solid ${scfg(s).color}35`, color: scfg(s).color, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 7, display: "flex", alignItems: "center", gap: 3, fontFamily: "DM Mono, monospace" }}>
                {scfg(s).icon}{counts[s]}
              </span>
            )
          )}
          {withImages > 0 && (
            <span style={{ background: "#34d39914", border: "1px solid #34d39930", color: "#34d399", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 7, display: "flex", alignItems: "center", gap: 3, fontFamily: "DM Mono, monospace" }}>
              <ImageIcon style={{ width: 8, height: 8 }} />{withImages}
            </span>
          )}
        </div>

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, paddingTop: 4 }}>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontFamily: "DM Mono, monospace" }}>
            {fmtDate(chat.updated_at || chat.created_at)}{total > 0 ? ` · ${total} drafts` : ""}
          </span>
          <div style={{ display: "flex", gap: 5 }}>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onQuickView(); }}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#e4e4e7"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
            >
              <Eye style={{ width: 10, height: 10 }} />Quick
            </button>
            <Link
              href={`/dashboard/topic-chats/${chat.id}`}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.38)", borderRadius: 8, color: "#c4b5fd", fontSize: 10, fontWeight: 700, textDecoration: "none", fontFamily: "Syne, sans-serif", transition: "background 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.28)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.18)"; }}
            >
              Open <ArrowUpRight style={{ width: 10, height: 10 }} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── DraftDrawerCard ────────────────────────────────────────── */
function DraftDrawerCard({ d }: { d: Draft }) {
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const m = getMedia(d);
  const s = String(d.status || "").toUpperCase();
  const cfg = scfg(s);
  const pColor = PLATFORM_COLORS[String(d.platform || "").toLowerCase()] ?? "#6b7280";
  const hook = d.structured?.hook || d.body_text?.slice(0, 100) || "—";

  return (
    <div
      style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", overflow: "hidden", transition: "border-color 0.15s", cursor: "pointer" }}
      onClick={() => setExpanded(v => !v)}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.13)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"}
    >
      <div style={{ display: "flex", gap: 10, padding: "11px 12px", alignItems: "flex-start" }}>
        <div style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", background: "#111115", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {m.url && m.kind === "image" ? (
            <>
              <img
                src={m.thumb || m.url} alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: imgLoaded ? 1 : 0, transition: "opacity 0.25s" }}
                onLoad={() => setImgLoaded(true)}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {!imgLoaded && <div style={{ position: "absolute", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "#a78bfa", borderRadius: "50%", animation: "tcspin 0.8s linear infinite" }} />}
            </>
          ) : m.url && m.kind === "video" ? (
            <Play style={{ width: 18, height: 18, color: "#a78bfa" }} />
          ) : (
            <ImageIcon style={{ width: 18, height: 18, color: "rgba(255,255,255,0.1)" }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ background: pColor + "22", color: pColor, fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 7, letterSpacing: "0.07em", textTransform: "uppercase" }}>
              {d.platform || "—"}
            </span>
            <span style={{ background: cfg.color + "18", border: `1px solid ${cfg.color}35`, color: cfg.color, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 7, display: "flex", alignItems: "center", gap: 3 }}>
              {cfg.icon}{cfg.label}
            </span>
            {d.scheduled_at && (
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", fontFamily: "DM Mono, monospace", marginLeft: "auto", flexShrink: 0 }}>
                {fmtDate(d.scheduled_at)}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.52)", margin: 0, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: expanded ? 99 : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {hook}
          </p>
          {d.last_error && s === "FAILED" && (
            <p style={{ fontSize: 10, color: "#f87171", margin: "4px 0 0", fontFamily: "DM Mono, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              ↳ {d.last_error.slice(0, 80)}
            </p>
          )}
        </div>

        <ChevronRight style={{ width: 13, height: 13, color: "rgba(255,255,255,0.2)", flexShrink: 0, transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </div>

      {expanded && (
        <div style={{ padding: "0 12px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          {m.url && m.kind === "image" && (
            <img src={m.url} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10 }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
          {m.url && m.kind === "video" && (
            <div style={{ background: "#111115", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
              <Play style={{ width: 14, height: 14, color: "#a78bfa", flexShrink: 0 }} />
              <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#a78bfa", fontFamily: "DM Mono, monospace", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.url}
              </a>
            </div>
          )}
          {d.body_text && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5, fontFamily: "DM Mono, monospace" }}>Caption</div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap" }}>{d.body_text}</p>
            </div>
          )}
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.12)", fontFamily: "DM Mono, monospace", paddingTop: 2 }}>{d.id}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function TopicChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatDrafts, setChatDrafts] = useState<Record<string, Draft[]>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("all");
  const [month, setMonth] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [drawerDrafts, setDrawerDrafts] = useState<Draft[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerFilter, setDrawerFilter] = useState("all");

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Chat | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true); else setLoading(true);
    setErr(null);
    try {
      const data: Chat[] = await listTopicChats(60);
      setChats(data || []);
      const slice = (data || []).slice(0, 24);
      const pairs = await Promise.allSettled(
        slice.map(c => listTopicChatDrafts(c.id).then(ds => ({ id: c.id, drafts: ds || [] })))
      );
      const map: Record<string, Draft[]> = {};
      for (const p of pairs) if (p.status === "fulfilled") map[p.value.id] = p.value.drafts;
      setChatDrafts(map);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const brands = useMemo(() => Array.from(new Set(chats.map(c => c.brand_id).filter(Boolean) as string[])).sort(), [chats]);
  const months = useMemo(() => Array.from(new Set(chats.map(c => c.target_month).filter(Boolean) as string[])).sort((a, b) => b.localeCompare(a)), [chats]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return chats.filter(c => {
      if (brand !== "all" && c.brand_id !== brand) return false;
      if (month !== "all" && c.target_month !== month) return false;
      if (!needle) return true;
      return `${c.id} ${c.brand_id} ${c.topic} ${c.target_month}`.toLowerCase().includes(needle);
    });
  }, [chats, q, brand, month]);

  const openDrawer = async (chat: Chat) => {
    setActiveChat(chat);
    setDrawerFilter("all");
    setDrawerLoading(true);
    try {
      const ds = await listTopicChatDrafts(chat.id);
      setDrawerDrafts(ds || []);
      setChatDrafts(prev => ({ ...prev, [chat.id]: ds || [] }));
    } catch {
      setDrawerDrafts([]);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteErr(null);
    try {
      const ok = await deleteTopicChat(deleteTarget.id);
      if (!ok) throw new Error("Delete failed");
      // Remove from local state immediately
      setChats(prev => prev.filter(c => c.id !== deleteTarget.id));
      setChatDrafts(prev => {
        const next = { ...prev };
        delete next[deleteTarget.id];
        return next;
      });
      // Close drawer if deleted chat was open
      if (activeChat?.id === deleteTarget.id) {
        setActiveChat(null);
        setDrawerDrafts([]);
      }
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteErr(e?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const drawerCounts = useMemo(() => countByStatus(drawerDrafts), [drawerDrafts]);

  const visibleDrafts = useMemo(() => {
    if (drawerFilter === "all") return drawerDrafts;
    if (drawerFilter === "images") return drawerDrafts.filter(d => !!getMedia(d).url);
    return drawerDrafts.filter(d => String(d.status || "").toUpperCase() === drawerFilter);
  }, [drawerDrafts, drawerFilter]);

  const totalDrafts = useMemo(() => Object.values(chatDrafts).reduce((s, ds) => s + ds.length, 0), [chatDrafts]);
  const totalImages = useMemo(() => Object.values(chatDrafts).reduce((s, ds) => s + ds.filter(d => !!getMedia(d).url).length, 0), [chatDrafts]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .tc-root * { box-sizing: border-box; }
        .tc-root { font-family: 'Syne', sans-serif; background: #0c0c0f; min-height: 100vh; color: #e4e4e7; }
        .tc-input { background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.09) !important; color: #e4e4e7 !important; font-family: 'DM Mono', monospace !important; font-size: 12px !important; border-radius: 11px !important; padding: 9px 36px 9px 36px !important; width: 100% !important; outline: none !important; transition: border-color 0.15s, box-shadow 0.15s !important; }
        .tc-input:focus { border-color: rgba(124,58,237,0.5) !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.1) !important; }
        .tc-input::placeholder { color: rgba(255,255,255,0.2) !important; }
        .tc-select { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); color: rgba(255,255,255,0.65); font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; border-radius: 11px; padding: 8px 32px 8px 12px; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; outline: none; }
        .tc-select:focus { border-color: rgba(124,58,237,0.5); }
        .tc-select option { background: #1a1a2e; }
        .tc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 14px; }
        @media (max-width: 600px) { .tc-grid { grid-template-columns: 1fr; } }
        @keyframes tcspin { to { transform: rotate(360deg); } }
        @keyframes tcfade { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
        .tc-fade { animation: tcfade 0.28s ease both; }
        .tc-skel { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: tcshim 1.5s infinite; border-radius: 18px; }
        @keyframes tcshim { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }
        .tc-drawer-root { background: #111115 !important; border-left: 1px solid rgba(255,255,255,0.08) !important; }
        .tc-scroll::-webkit-scrollbar { width: 3px; }
        .tc-scroll::-webkit-scrollbar-track { background: transparent; }
        .tc-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        .tc-filter-panel { animation: tcfade 0.2s ease both; }
      `}</style>

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <DeleteConfirmModal
          chat={deleteTarget}
          draftCount={chatDrafts[deleteTarget.id]?.length ?? 0}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeleteTarget(null); setDeleteErr(null); }}
          deleting={deleting}
        />
      )}

      {deleteErr && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9998, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 12, padding: "10px 16px", fontSize: 12, color: "#f87171", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, fontFamily: "Syne, sans-serif" }}>
          <AlertTriangle style={{ width: 13, height: 13 }} />{deleteErr}
          <button onClick={() => setDeleteErr(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 0, marginLeft: 4, display: "flex" }}>
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>
      )}

      <div className="tc-root" style={{ padding: "24px 20px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(124,58,237,0.7)", marginBottom: 4, fontFamily: "DM Mono, monospace" }}>
              NeuroFlow · Campaigns
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#e4e4e7", margin: 0, lineHeight: 1.1 }}>
              Topic Chats
            </h1>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 5 }}>
              {loading ? "Loading…" : `${chats.length} campaigns · ${totalDrafts} drafts · ${totalImages} images`}
            </p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 11, color: refreshing ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, cursor: refreshing ? "default" : "pointer", fontFamily: "Syne, sans-serif", transition: "all 0.15s" }}
            onMouseEnter={e => { if (!refreshing) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; (e.currentTarget as HTMLElement).style.color = "#e4e4e7"; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; }}
          >
            <RefreshCcw style={{ width: 12, height: 12, animation: refreshing ? "tcspin 0.8s linear infinite" : "none" }} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {err && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#f87171", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} />{err}
          </div>
        )}

        {/* ── Search + filter bar ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: showFilters ? 12 : 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "rgba(255,255,255,0.28)", pointerEvents: "none" }} />
            <input
              className="tc-input"
              placeholder="Search topics, brand, month…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            {q && (
              <button onClick={() => setQ("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", padding: 2 }}>
                <X style={{ width: 11, height: 11 }} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: showFilters ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.05)", border: `1px solid ${showFilters ? "rgba(124,58,237,0.38)" : "rgba(255,255,255,0.1)"}`, borderRadius: 11, color: showFilters ? "#c4b5fd" : "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", transition: "all 0.15s", position: "relative" }}
          >
            <SlidersHorizontal style={{ width: 12, height: 12 }} />Filters
            {(brand !== "all" || month !== "all") && (
              <span style={{ position: "absolute", top: 7, right: 7, width: 5, height: 5, borderRadius: "50%", background: "#a78bfa" }} />
            )}
          </button>

          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: "DM Mono, monospace", whiteSpace: "nowrap" }}>
            {loading ? "…" : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="tc-filter-panel" style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>Brand</span>
              <select className="tc-select" value={brand} onChange={e => setBrand(e.target.value)}>
                <option value="all">All brands</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>Month</span>
              <select className="tc-select" value={month} onChange={e => setMonth(e.target.value)}>
                <option value="all">All months</option>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {(brand !== "all" || month !== "all") && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  onClick={() => { setBrand("all"); setMonth("all"); }}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 11, color: "#f87171", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}
                >
                  <X style={{ width: 11, height: 11 }} />Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Cards grid ── */}
        {loading ? (
          <div className="tc-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="tc-skel" style={{ height: 265, animationDelay: `${i * 0.05}s` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.12)" }}>
            <MessageCircle style={{ width: 48, height: 48, margin: "0 auto 14px", opacity: 0.4 }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.22)" }}>No campaigns found</p>
            {q && <p style={{ fontSize: 12, marginTop: 6, color: "rgba(255,255,255,0.15)" }}>Try clearing your search</p>}
          </div>
        ) : (
          <div className="tc-grid">
            {filtered.map((chat, i) => (
              <div key={chat.id} className="tc-fade" style={{ animationDelay: `${i * 0.03}s` }}>
                <ChatCard
                  chat={chat}
                  drafts={chatDrafts[chat.id] ?? []}
                  counts={countByStatus(chatDrafts[chat.id] ?? [])}
                  onQuickView={() => openDrawer(chat)}
                  onDelete={() => setDeleteTarget(chat)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick-view Drawer ── */}
      <Sheet open={!!activeChat} onOpenChange={open => { if (!open) { setActiveChat(null); setDrawerDrafts([]); } }}>
        <SheetContent
          side="right"
          className="tc-drawer-root tc-scroll"
          style={{ width: "min(500px, 100vw)", maxWidth: "100vw", padding: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}
        >
          {activeChat && (
            <>
              <div style={{ padding: "22px 20px 0", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      {activeChat.brand_id && (
                        <span style={{ background: "rgba(124,58,237,0.14)", border: "1px solid rgba(124,58,237,0.28)", color: "#c4b5fd", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 8, fontFamily: "DM Mono, monospace" }}>
                          {activeChat.brand_id}
                        </span>
                      )}
                      {activeChat.target_month && (
                        <span style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 8, fontFamily: "DM Mono, monospace" }}>
                          {activeChat.target_month}
                        </span>
                      )}
                      {typeof activeChat.posts_per_week === "number" && (
                        <span style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.28)", fontSize: 9, fontFamily: "DM Mono, monospace", padding: "2px 8px", borderRadius: 8 }}>
                          {activeChat.posts_per_week}/wk
                        </span>
                      )}
                    </div>
                    <h2 style={{ fontSize: 14, fontWeight: 800, color: "#e4e4e7", margin: 0, lineHeight: 1.35 }}>
                      {activeChat.topic || "Untitled topic"}
                    </h2>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontFamily: "DM Mono, monospace", marginTop: 5 }}>
                      {activeChat.id}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => { setActiveChat(null); setDrawerDrafts([]); setDeleteTarget(activeChat); }}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 11px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 10, color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}
                    >
                      <Trash2 style={{ width: 11, height: 11 }} />Delete
                    </button>
                    <Link
                      href={`/dashboard/topic-chats/${activeChat.id}`}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.38)", borderRadius: 10, color: "#c4b5fd", fontSize: 11, fontWeight: 700, textDecoration: "none", fontFamily: "Syne, sans-serif", whiteSpace: "nowrap" }}
                    >
                      Open <ArrowUpRight style={{ width: 11, height: 11 }} />
                    </Link>
                  </div>
                </div>

                {!drawerLoading && drawerDrafts.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <button
                      onClick={() => setDrawerFilter("all")}
                      style={{ padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: "Syne, sans-serif", border: `1px solid ${drawerFilter === "all" ? "rgba(255,255,255,0.2)" : "transparent"}`, background: drawerFilter === "all" ? "rgba(255,255,255,0.08)" : "transparent", color: drawerFilter === "all" ? "#e4e4e7" : "rgba(255,255,255,0.35)", cursor: "pointer" }}
                    >
                      All {drawerDrafts.length}
                    </button>
                    {(["PENDING_APPROVAL", "PUBLISHED", "FAILED", "APPROVED"] as const).map(s =>
                      drawerCounts[s] > 0 && (
                        <button key={s}
                          onClick={() => setDrawerFilter(prev => prev === s ? "all" : s)}
                          style={{ padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: "Syne, sans-serif", background: drawerFilter === s ? scfg(s).color + "22" : "transparent", border: `1px solid ${drawerFilter === s ? scfg(s).color + "50" : "transparent"}`, color: scfg(s).color, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          {scfg(s).icon}{drawerCounts[s]}
                        </button>
                      )
                    )}
                    {drawerDrafts.filter(d => !!getMedia(d).url).length > 0 && (
                      <button
                        onClick={() => setDrawerFilter(prev => prev === "images" ? "all" : "images")}
                        style={{ padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: "Syne, sans-serif", background: drawerFilter === "images" ? "#34d39922" : "transparent", border: `1px solid ${drawerFilter === "images" ? "#34d39950" : "transparent"}`, color: "#34d399", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <ImageIcon style={{ width: 10, height: 10 }} />
                        {drawerDrafts.filter(d => !!getMedia(d).url).length}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="tc-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 20px 28px" }}>
                {drawerLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="tc-skel" style={{ height: 78, animationDelay: `${i * 0.07}s` }} />
                    ))}
                  </div>
                ) : visibleDrafts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.15)" }}>
                    <Layers style={{ width: 30, height: 30, margin: "0 auto 10px", opacity: 0.5 }} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.2)" }}>
                      {drawerFilter !== "all" ? "No drafts match this filter" : "No drafts yet"}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontFamily: "DM Mono, monospace", padding: "2px 0 8px" }}>
                      {visibleDrafts.length} draft{visibleDrafts.length !== 1 ? "s" : ""}
                      {drawerFilter !== "all" && drawerFilter !== "images" ? ` · ${scfg(drawerFilter).label.toLowerCase()}` : drawerFilter === "images" ? " · with images" : ""}
                    </div>
                    {visibleDrafts.map(d => <DraftDrawerCard key={d.id} d={d} />)}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}