"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import StructuredPost from "@/components/StructuredPost";
import { getAllDrafts, attachMediaToContentItem } from "@/lib/api";
import { uploadFileToSpaces } from "@/lib/upload-client";
import {
  RefreshCcw, Image as ImageIcon, Video as VideoIcon, FileText,
  ExternalLink, Search, X, Upload, Clock, CheckCircle2, XCircle,
  Calendar, CheckCheck, ArrowUpRight, AlertTriangle, Hash,
  ChevronRight, Play, Layers, Filter,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */
type DraftItem = {
  id: string; topic_chat_id: string; topic: string; brand_id: string;
  target_month: string; posts_per_week: number; platform: string;
  status: string; body_text?: string | null; hashtags?: string | null;
  structured?: any; scheduled_at?: string | null;
  media_type?: "image" | "video" | null; media_url?: string | null;
  media_urls?: string[] | null; thumbnail_url?: string | null;
  media_provider?: string | null; media_caption?: string | null;
  last_error?: string | null; created_at?: string | null; updated_at?: string | null;
};

/* ─── Constants ──────────────────────────────────────────────── */
const STAT_TABS = [
  { key: "ALL",              label: "All",       color: "#e4e4e7" },
  { key: "PENDING_APPROVAL", label: "Pending",   color: "#a78bfa" },
  { key: "APPROVED",         label: "Approved",  color: "#60a5fa" },
  { key: "SCHEDULED",        label: "Scheduled", color: "#fbbf24" },
  { key: "PUBLISHED",        label: "Published", color: "#34d399" },
  { key: "FAILED",           label: "Failed",    color: "#f87171" },
  { key: "REJECTED",         label: "Rejected",  color: "#6b7280" },
] as const;

const PLATFORMS = ["all", "facebook", "instagram", "linkedin", "twitter", "tiktok", "youtube"];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C", facebook: "#1877F2", linkedin: "#0A66C2",
  twitter: "#1DA1F2", tiktok: "#69C9D0", youtube: "#FF0000",
};

const STATUS_CFG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  PENDING_APPROVAL: { color: "#a78bfa", icon: <Clock style={{ width: 10, height: 10 }} />,        label: "Pending"   },
  PUBLISHED:        { color: "#34d399", icon: <CheckCircle2 style={{ width: 10, height: 10 }} />, label: "Published" },
  FAILED:           { color: "#f87171", icon: <XCircle style={{ width: 10, height: 10 }} />,      label: "Failed"    },
  APPROVED:         { color: "#60a5fa", icon: <CheckCheck style={{ width: 10, height: 10 }} />,   label: "Approved"  },
  SCHEDULED:        { color: "#fbbf24", icon: <Calendar style={{ width: 10, height: 10 }} />,     label: "Scheduled" },
  REJECTED:         { color: "#6b7280", icon: <XCircle style={{ width: 10, height: 10 }} />,      label: "Rejected"  },
};
function scfg(s: string) { return STATUS_CFG[s.toUpperCase()] ?? { color: "#6b7280", icon: null, label: s }; }

/* ─── Helpers ────────────────────────────────────────────────── */
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
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function safeList(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  return [];
}

function firstMedia(d: DraftItem) {
  return d.thumbnail_url || d.media_url || safeList(d.media_urls)[0] || null;
}

function draftType(d: DraftItem): "text" | "image" | "video" {
  const mt = String(d.media_type || "").toLowerCase();
  if (mt === "video") return "video";
  if (mt === "image") return "image";
  if ((d.media_urls?.length || 0) > 0 || d.media_url) return "image";
  return "text";
}

function normStatus(s?: string | null) { return String(s || "").toUpperCase().trim() || "UNKNOWN"; }
function normPlatform(p?: string | null) { return String(p || "").toLowerCase().trim() || "unknown"; }

/* ─── DraftCard ──────────────────────────────────────────────── */
function DraftCard({ item, onClick }: { item: DraftItem; onClick: () => void }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const media = firstMedia(item);
  const type  = draftType(item);
  const s     = normStatus(item.status);
  const cfg   = scfg(s);
  const pColor = PLATFORM_COLORS[normPlatform(item.platform)] ?? "#6b7280";
  const hook  = item.structured?.hook || item.body_text?.slice(0, 100) || "—";

  return (
    <div
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16, overflow: "hidden", cursor: "pointer",
        transition: "border-color 0.18s, transform 0.18s, box-shadow 0.18s",
        display: "flex", flexDirection: "column",
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(124,58,237,0.3)"; el.style.transform = "translateY(-1px)"; el.style.boxShadow = "0 8px 28px rgba(0,0,0,0.35)"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(255,255,255,0.07)"; el.style.transform = "translateY(0)"; el.style.boxShadow = "none"; }}
    >
      {/* Media area */}
      <div style={{ height: 80, background: "#09090e", position: "relative", overflow: "hidden", flexShrink: 0 }}>
        {media ? (
          <>
            <img
              src={media} alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", opacity: imgLoaded ? 0.82 : 0, transition: "opacity 0.25s" }}
              onLoad={() => setImgLoaded(true)}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            {!imgLoaded && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "#a78bfa", borderRadius: "50%", animation: "libspin 0.8s linear infinite" }} />
              </div>
            )}
            {type === "video" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Play style={{ width: 11, height: 11, color: "white", marginLeft: 1 }} fill="white" />
                </div>
              </div>
            )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(9,9,14,0.7) 0%, transparent 60%)", pointerEvents: "none" }} />
          </>
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.07)" }}>
            {type === "video" ? <VideoIcon style={{ width: 24, height: 24 }} /> : <FileText style={{ width: 22, height: 22 }} />}
          </div>
        )}
        {/* Platform badge overlay */}
        <span style={{ position: "absolute", top: 7, left: 8, background: pColor + "cc", color: "white", fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 7, letterSpacing: "0.07em", textTransform: "uppercase", backdropFilter: "blur(4px)" }}>
          {normPlatform(item.platform)}
        </span>
        {/* Status overlay */}
        <span style={{ position: "absolute", top: 7, right: 8, background: cfg.color + "22", border: `1px solid ${cfg.color}45`, color: cfg.color, fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 7, display: "flex", alignItems: "center", gap: 3, backdropFilter: "blur(4px)" }}>
          {cfg.icon}{cfg.label}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Topic chip */}
        {item.topic && (
          <p style={{ fontSize: 10, color: "#a78bfa", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}>
            {item.topic.slice(0, 60)}
          </p>
        )}
        {/* Hook */}
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.42, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {hook}
        </p>
        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {item.target_month && (
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.05)", padding: "1px 6px", borderRadius: 6, fontFamily: "DM Mono, monospace" }}>
                {item.target_month}
              </span>
            )}
            {media && (
              <span style={{ fontSize: 9, color: "#34d399", display: "flex", alignItems: "center", gap: 2, fontFamily: "DM Mono, monospace" }}>
                <ImageIcon style={{ width: 7, height: 7 }} />IMG
              </span>
            )}
          </div>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontFamily: "DM Mono, monospace" }}>
            {fmtDate(item.updated_at || item.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Preview Drawer ─────────────────────────────────────────── */
function PreviewDrawer({
  item, open, onClose, onUpload, uploading,
}: {
  item: DraftItem | null; open: boolean; onClose: () => void;
  onUpload: (f: File) => void; uploading: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  if (!item) return null;

  const media = firstMedia(item);
  const type = draftType(item);
  const s = normStatus(item.status);
  const cfg = scfg(s);
  const pColor = PLATFORM_COLORS[normPlatform(item.platform)] ?? "#6b7280";

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent
        side="right"
        style={{ width: "min(540px, 100vw)", maxWidth: "100vw", padding: 0, background: "#111115", borderLeft: "1px solid rgba(255,255,255,0.08)", overflowY: "auto", display: "flex", flexDirection: "column" }}
        className="lib-scroll"
      >
        <style>{`
          .lib-scroll::-webkit-scrollbar{width:3px} .lib-scroll::-webkit-scrollbar-track{background:transparent} .lib-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
          .lib-md { font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.6; }
          .lib-md p { margin: 0 0 8px; }
          .lib-md strong { color: rgba(255,255,255,0.85); }
          .lib-md ul { padding-left: 16px; margin: 0 0 8px; }
          .lib-md li { margin-bottom: 3px; }
          @keyframes libspin { to { transform: rotate(360deg); } }
        `}</style>

        {/* Header */}
        <div style={{ padding: "18px 20px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ background: pColor + "22", color: pColor, fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  {normPlatform(item.platform)}
                </span>
                <span style={{ background: cfg.color + "18", border: `1px solid ${cfg.color}35`, color: cfg.color, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 8, display: "flex", alignItems: "center", gap: 3 }}>
                  {cfg.icon}{cfg.label}
                </span>
                {item.target_month && (
                  <span style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)", fontSize: 9, padding: "2px 8px", borderRadius: 8, fontFamily: "DM Mono, monospace", fontWeight: 700 }}>
                    {item.target_month}
                  </span>
                )}
                {item.brand_id && (
                  <span style={{ background: "rgba(124,58,237,0.14)", border: "1px solid rgba(124,58,237,0.28)", color: "#c4b5fd", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 8, fontFamily: "DM Mono, monospace" }}>
                    {item.brand_id}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", margin: "0 0 5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.topic || "—"}
              </p>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontFamily: "DM Mono, monospace" }}>{item.id}</div>
            </div>
            <Link
              href={`/dashboard/topic-chats/${item.topic_chat_id}`}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.35)", borderRadius: 10, color: "#c4b5fd", fontSize: 11, fontWeight: 700, textDecoration: "none", flexShrink: 0, fontFamily: "Syne, sans-serif", whiteSpace: "nowrap" }}>
              Chat <ArrowUpRight style={{ width: 11, height: 11 }} />
            </Link>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />
        </div>

        <div className="lib-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Media */}
          <section>
            <SectionLabel>Media</SectionLabel>
            {media ? (
              <div style={{ borderRadius: 14, overflow: "hidden", background: "#09090e", border: "1px solid rgba(255,255,255,0.07)" }}>
                {type === "video" ? (
                  <video controls playsInline src={item.media_url || safeList(item.media_urls)[0] || undefined}
                    poster={item.thumbnail_url ?? undefined}
                    style={{ width: "100%", display: "block", background: "#000" }} />
                ) : (
                  <img src={media} alt="" style={{ width: "100%", display: "block", objectFit: "contain", maxHeight: 280 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
              </div>
            ) : (
              <div style={{ border: "2px dashed rgba(255,255,255,0.07)", borderRadius: 14, padding: "28px 20px", textAlign: "center", color: "rgba(255,255,255,0.15)" }}>
                <ImageIcon style={{ width: 28, height: 28, margin: "0 auto 8px" }} />
                <p style={{ fontSize: 12, margin: 0 }}>No media attached</p>
              </div>
            )}

            {/* Upload */}
            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
              <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: uploading ? "rgba(255,255,255,0.04)" : "rgba(52,211,153,0.12)", border: `1px solid ${uploading ? "rgba(255,255,255,0.07)" : "rgba(52,211,153,0.25)"}`, borderRadius: 10, color: uploading ? "rgba(255,255,255,0.25)" : "#34d399", fontSize: 11, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "Syne, sans-serif" }}
              >
                <Upload style={{ width: 12, height: 12 }} />
                {uploading ? "Uploading…" : media ? "Replace media" : "Upload media"}
              </button>
              {media && (
                <a href={media} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#60a5fa", textDecoration: "none", fontWeight: 700 }}>
                  <ExternalLink style={{ width: 11, height: 11 }} />Open
                </a>
              )}
            </div>
          </section>

          {/* Structured preview */}
          {item.structured && Object.keys(item.structured).length > 0 && (
            <section>
              <SectionLabel>Structured Post</SectionLabel>
              <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px" }}>
                <StructuredPost item={item.structured} />
              </div>
            </section>
          )}

          {/* Body */}
          {item.body_text && (
            <section>
              <SectionLabel>Caption</SectionLabel>
              <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px" }}>
                <div className="lib-md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.body_text}</ReactMarkdown>
                </div>
              </div>
            </section>
          )}

          {/* Hashtags */}
          {item.hashtags && (
            <section>
              <SectionLabel>Hashtags</SectionLabel>
              <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)", borderRadius: 14, padding: "12px 14px" }}>
                <p style={{ fontSize: 11, color: "#a78bfa", margin: 0, lineHeight: 1.6 }}>{item.hashtags}</p>
              </div>
            </section>
          )}

          {/* Schedule / meta */}
          <section>
            <SectionLabel>Metadata</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Scheduled", val: fmtDate(item.scheduled_at) },
                { label: "Updated",   val: fmtDate(item.updated_at) },
                { label: "Created",   val: fmtDate(item.created_at) },
                { label: "Posts/wk",  val: item.posts_per_week ?? "—" },
              ].map(({ label, val }) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "DM Mono, monospace", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>{String(val)}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Error */}
          {item.last_error && (
            <section>
              <SectionLabel color="#f87171">Last Error</SectionLabel>
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: "12px 14px" }}>
                <p style={{ fontSize: 11, color: "#f87171", margin: 0, fontFamily: "DM Mono, monospace", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{item.last_error}</p>
              </div>
            </section>
          )}

          {/* IDs */}
          <section>
            <SectionLabel>IDs</SectionLabel>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
              {[{ label: "Draft", val: item.id }, { label: "Chat", val: item.topic_chat_id }].map(({ label, val }) => (
                <div key={label} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", letterSpacing: "0.08em", flexShrink: 0, paddingTop: 1, textTransform: "uppercase" }}>{label}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "DM Mono, monospace", wordBreak: "break-all" }}>{val}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionLabel({ children, color = "rgba(255,255,255,0.25)" }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color, fontFamily: "DM Mono, monospace", marginBottom: 8 }}>
      {children}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function ContentLibraryPage() {
  const [items, setItems]   = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  const [tab, setTab]           = useState<string>("ALL");
  const [platform, setPlatform] = useState("all");
  const [q, setQ]               = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [active, setActive]     = useState<DraftItem | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true); else setLoading(true);
    setErr(null);
    try {
      const data = await getAllDrafts(300);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load library");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { ALL: 0 };
    for (const it of items) {
      const s = normStatus(it.status);
      m[s] = (m[s] || 0) + 1;
      m.ALL++;
    }
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(it => {
      if (tab !== "ALL" && normStatus(it.status) !== tab) return false;
      if (platform !== "all" && normPlatform(it.platform) !== platform) return false;
      if (!needle) return true;
      const hay = `${it.id} ${it.topic_chat_id} ${it.brand_id} ${it.topic} ${it.target_month} ${it.platform} ${it.status} ${it.body_text || ""} ${it.hashtags || ""} ${it.media_url || ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [items, tab, platform, q]);

  const withImages = useMemo(() => filtered.filter(it => !!firstMedia(it)).length, [filtered]);

  const handleUpload = async (file: File) => {
    if (!active) return;
    setUploading(true); setErr(null);
    try {
      const url = await uploadFileToSpaces(file);
      await attachMediaToContentItem(active.id, {
        media_type: file.type.startsWith("video/") ? "video" : "image",
        media_url: url, media_urls: [url], media_provider: "do_spaces",
      });
      await load(true);
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .lib-root * { box-sizing: border-box; }
        .lib-root { font-family: 'Syne', sans-serif; background: #0c0c0f; min-height: 100vh; color: #e4e4e7; }
        @keyframes libspin { to { transform: rotate(360deg); } }
        @keyframes libfade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .lib-fade { animation: libfade 0.25s ease both; }
        .lib-skel { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: libshim 1.5s infinite; border-radius: 16px; }
        @keyframes libshim { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }
        .lib-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
        @media (max-width: 500px) { .lib-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; } }
        .lib-input { background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.09) !important; color: #e4e4e7 !important; font-family: 'DM Mono', monospace !important; font-size: 12px !important; border-radius: 11px !important; padding: 9px 36px !important; width: 100% !important; outline: none !important; transition: border-color 0.15s, box-shadow 0.15s !important; }
        .lib-input:focus { border-color: rgba(124,58,237,0.5) !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.1) !important; }
        .lib-input::placeholder { color: rgba(255,255,255,0.2) !important; }
        .lib-select { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); color: rgba(255,255,255,0.65); font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; border-radius: 11px; padding: 8px 32px 8px 12px; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; outline: none; }
        .lib-select:focus { border-color: rgba(124,58,237,0.5); }
        .lib-select option { background: #1a1a2e; }
        .lib-tabs { display: flex; gap: 4px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
        .lib-tabs::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="lib-root" style={{ padding: "24px 20px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(124,58,237,0.7)", marginBottom: 4, fontFamily: "DM Mono, monospace" }}>
              Relvo · Content
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#e4e4e7", margin: 0, lineHeight: 1.1 }}>Library</h1>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 5 }}>
              {loading ? "Loading…" : `${items.length} drafts · ${withImages} with images`}
            </p>
          </div>
          <button
            onClick={() => load(true)} disabled={refreshing}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 11, color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; (e.currentTarget as HTMLElement).style.color = "#e4e4e7"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; }}
          >
            <RefreshCcw style={{ width: 12, height: 12, animation: refreshing ? "libspin 0.8s linear infinite" : "none" }} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {err && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#f87171", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} />{err}
          </div>
        )}

        {/* ── Status tabs ── */}
        <div className="lib-tabs" style={{ marginBottom: 16 }}>
          {STAT_TABS.map(t => {
            const isActive = tab === t.key;
            const c = counts[t.key] ?? 0;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flexShrink: 0, padding: "6px 12px", borderRadius: 10,
                  background: isActive ? t.color + "20" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isActive ? t.color + "45" : "rgba(255,255,255,0.07)"}`,
                  color: isActive ? t.color : "rgba(255,255,255,0.35)",
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  fontFamily: "Syne, sans-serif", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                {t.label}
                <span style={{ background: isActive ? t.color + "25" : "rgba(255,255,255,0.06)", border: `1px solid ${isActive ? t.color + "40" : "rgba(255,255,255,0.08)"}`, borderRadius: 6, padding: "0px 5px", fontSize: 9, fontFamily: "DM Mono, monospace", color: isActive ? t.color : "rgba(255,255,255,0.3)" }}>
                  {c}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Search + filters ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: showFilters ? 12 : 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "rgba(255,255,255,0.28)", pointerEvents: "none" }} />
            <input className="lib-input" placeholder="Search topic, body, hashtags, URL…" value={q} onChange={e => setQ(e.target.value)} />
            {q && <button onClick={() => setQ("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", padding: 2 }}><X style={{ width: 11, height: 11 }} /></button>}
          </div>

          <button
            onClick={() => setShowFilters(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: showFilters ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.05)", border: `1px solid ${showFilters ? "rgba(124,58,237,0.38)" : "rgba(255,255,255,0.1)"}`, borderRadius: 11, color: showFilters ? "#c4b5fd" : "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", position: "relative" }}
          >
            <Filter style={{ width: 12, height: 12 }} />Platform
            {platform !== "all" && <span style={{ position: "absolute", top: 7, right: 7, width: 5, height: 5, borderRadius: "50%", background: "#a78bfa" }} />}
          </button>

          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: "DM Mono, monospace", whiteSpace: "nowrap" }}>
            {loading ? "…" : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {showFilters && (
          <div className="lib-fade" style={{ display: "flex", gap: 8, marginBottom: 18, padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>Platform</span>
              <select className="lib-select" value={platform} onChange={e => setPlatform(e.target.value)}>
                {PLATFORMS.map(p => <option className="text-black" key={p} value={p}>{p === "all" ? "All platforms" : p}</option>)}
              </select>
            </div>
            {platform !== "all" && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button onClick={() => setPlatform("all")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 11, color: "#f87171", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
                  <X style={{ width: 11, height: 11 }} />Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="lib-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="lib-skel" style={{ height: 210, animationDelay: `${i * 0.04}s` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.12)" }}>
            <Layers style={{ width: 44, height: 44, margin: "0 auto 14px", opacity: 0.4 }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.2)" }}>
              {q || platform !== "all" ? "No drafts match your filters" : "No drafts yet"}
            </p>
          </div>
        ) : (
          <div className="lib-grid">
            {filtered.map((it, i) => (
              <div key={it.id} className="lib-fade" style={{ animationDelay: `${i * 0.025}s` }}>
                <DraftCard item={it} onClick={() => setActive(it)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <PreviewDrawer
        item={active}
        open={!!active}
        onClose={() => setActive(null)}
        onUpload={handleUpload}
        uploading={uploading}
      />
    </>
  );
}