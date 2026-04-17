"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildReviewLink,
  clearRenderLibrary,
  deleteRenderFromLibrary,
  getRenderLibrary,
  type RenderLibraryItem,
} from "@/lib/studio/renderLibrary";
import {
  ArrowLeft, Trash2, RefreshCcw, Copy, ExternalLink, Play,
  Film, Layers, Clock, AlertTriangle, CheckCircle2, X,
  Library, Search,
} from "lucide-react";

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtDate(iso: string) {
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
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function truncUrl(url: string, max = 48) {
  if (url.length <= max) return url;
  return "…" + url.slice(-(max - 1));
}

/* ─── Toast ──────────────────────────────────────────────────── */
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1a1a22", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 12, padding: "10px 18px", display: "flex", alignItems: "center", gap: 8, zIndex: 9999, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "libfade 0.2s ease" }}>
      <CheckCircle2 style={{ width: 14, height: 14, color: "#34d399" }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7", fontFamily: "Syne, sans-serif" }}>{msg}</span>
    </div>
  );
}

/* ─── Confirm Dialog ─────────────────────────────────────────── */
function ConfirmDialog({ msg, onConfirm, onCancel }: { msg: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 9990, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#1a1a22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: "24px 28px", maxWidth: 360, width: "100%", animation: "libfade 0.15s ease" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle style={{ width: 15, height: 15, color: "#f87171" }} />
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.5, margin: 0 }}>{msg}</p>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ padding: "8px 16px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── RenderCard ─────────────────────────────────────────────── */
function RenderCard({ item, onDelete, onToast }: {
  item: RenderLibraryItem;
  onDelete: (id: string) => void;
  onToast: (msg: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [playing, setPlaying] = useState(false);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(item.url);
    onToast("Video URL copied");
  };
  const copyReview = async () => {
    await navigator.clipboard.writeText(buildReviewLink(item.url));
    onToast("Review link copied");
  };

  return (
    <>
      {confirm && (
        <ConfirmDialog
          msg="Delete this render from your local library? This cannot be undone."
          onConfirm={() => { setConfirm(false); onDelete(item.id); }}
          onCancel={() => setConfirm(false)}
        />
      )}

      <div style={{
        background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16, overflow: "hidden",
        transition: "border-color 0.18s, transform 0.18s, box-shadow 0.18s",
      }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(124,58,237,0.3)"; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 12px 36px rgba(0,0,0,0.4)"; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(255,255,255,0.07)"; el.style.transform = "translateY(0)"; el.style.boxShadow = "none"; }}
      >
        {/* Video area */}
        <div style={{ position: "relative", background: "#09090e", aspectRatio: "16/9", overflow: "hidden" }}>
          {!playing ? (
            <>
              {item.poster
                ? <img src={item.poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.75 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Film style={{ width: 36, height: 36, color: "rgba(255,255,255,0.08)" }} /></div>
              }
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <button
                  onClick={() => setPlaying(true)}
                  style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(124,58,237,0.85)", border: "2px solid rgba(167,139,250,0.5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform 0.15s, background 0.15s", boxShadow: "0 0 24px rgba(124,58,237,0.4)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                >
                  <Play style={{ width: 20, height: 20, color: "white", marginLeft: 2 }} fill="white" />
                </button>
              </div>
              {/* Timestamp badge */}
              <div style={{ position: "absolute", bottom: 8, left: 9, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", borderRadius: 7, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                <Clock style={{ width: 9, height: 9, color: "rgba(255,255,255,0.45)" }} />
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", fontFamily: "DM Mono, monospace" }}>{fmtDate(item.createdAt)}</span>
              </div>
            </>
          ) : (
            <video
              src={item.url} controls autoPlay playsInline
              poster={item.poster ?? undefined}
              style={{ width: "100%", height: "100%", display: "block", background: "#000" }}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* URL */}
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", fontFamily: "DM Mono, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {truncUrl(item.url)}
          </div>

          {/* Action row */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            <button onClick={copyUrl} style={actionBtn("#60a5fa")}>
              <Copy style={{ width: 10, height: 10 }} />Copy URL
            </button>
            <button onClick={copyReview} style={actionBtn("#a78bfa")}>
              <Copy style={{ width: 10, height: 10 }} />Review Link
            </button>
            <a
              href={buildReviewLink(item.url)} target="_blank" rel="noreferrer"
              style={{ ...actionBtn("#34d399"), textDecoration: "none", display: "inline-flex" }}
            >
              <ExternalLink style={{ width: 10, height: 10 }} />Open
            </a>
            <div style={{ marginLeft: "auto" }}>
              <button onClick={() => setConfirm(true)} style={actionBtn("#f87171", true)}>
                <Trash2 style={{ width: 10, height: 10 }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function actionBtn(color: string, iconOnly = false): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: iconOnly ? "5px 8px" : "5px 10px",
    background: color + "14", border: `1px solid ${color}30`,
    borderRadius: 8, color, fontSize: 10, fontWeight: 700,
    cursor: "pointer", fontFamily: "Syne, sans-serif",
    transition: "background 0.15s",
  };
}

/* ─── ProjectGroup ───────────────────────────────────────────── */
function ProjectGroup({ projectId, projectName, items, onDelete, onToast }: {
  projectId: string; projectName: string; items: RenderLibraryItem[];
  onDelete: (id: string) => void; onToast: (msg: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, overflow: "hidden", background: "rgba(255,255,255,0.018)" }}>
      {/* Group header */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: "100%", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer", borderBottom: open ? "1px solid rgba(255,255,255,0.06)" : "none", transition: "background 0.15s" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
      >
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Film style={{ width: 15, height: 15, color: "#a78bfa" }} />
        </div>
        <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#e4e4e7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectName}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", fontFamily: "DM Mono, monospace", marginTop: 2 }}>
            {projectId} · {items.length} render{items.length !== 1 ? "s" : ""}
          </div>
        </div>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", marginRight: 6 }}>
          {open ? "collapse" : "expand"}
        </span>
        <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.35)", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </button>

      {open && (
        <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {items.map(it => (
            <RenderCard key={it.id} item={it} onDelete={onDelete} onToast={onToast} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function LibraryPage() {
  const [items, setItems] = useState<RenderLibraryItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [q, setQ] = useState("");

  const refresh = () => setItems(getRenderLibrary());
  useEffect(() => { refresh(); }, []);

  const handleDelete = (id: string) => {
    deleteRenderFromLibrary(id);
    refresh();
    setToast("Render deleted");
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(it =>
      it.projectName.toLowerCase().includes(needle) ||
      it.projectId.toLowerCase().includes(needle) ||
      it.url.toLowerCase().includes(needle)
    );
  }, [items, q]);

  const byProject = useMemo(() => {
    const map = new Map<string, RenderLibraryItem[]>();
    for (const it of filtered) {
      const key = `${it.projectId}::${it.projectName}`;
      map.set(key, [...(map.get(key) ?? []), it]);
    }
    return [...map.entries()];
  }, [filtered]);

  const totalSize = items.length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .lib-root * { box-sizing: border-box; }
        .lib-root { font-family: 'Syne', sans-serif; background: #0c0c0f; min-height: 100vh; color: #e4e4e7; }
        @keyframes libfade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes libspin { to { transform: rotate(360deg); } }
        .lib-fade { animation: libfade 0.28s ease both; }
        .lib-skel { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: libshim 1.5s infinite; border-radius: 16px; }
        @keyframes libshim { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }
        .lib-input { background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.09) !important; color: #e4e4e7 !important; font-family: 'DM Mono', monospace !important; font-size: 12px !important; border-radius: 11px !important; padding: 9px 36px 9px 36px !important; width: 100% !important; outline: none !important; transition: border-color 0.15s, box-shadow 0.15s !important; }
        .lib-input:focus { border-color: rgba(124,58,237,0.5) !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.1) !important; }
        .lib-input::placeholder { color: rgba(255,255,255,0.2) !important; }
      `}</style>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      {confirmClear && (
        <ConfirmDialog
          msg="Clear all renders from your local library? This action cannot be undone."
          onConfirm={() => { clearRenderLibrary(); refresh(); setConfirmClear(false); setToast("Library cleared"); }}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      <div className="lib-root">

        {/* ── Header ── */}
        <div style={{ padding: "22px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(124,58,237,0.7)", marginBottom: 4, fontFamily: "DM Mono, monospace" }}>
                Relvō · Design Studio
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#e4e4e7", margin: 0, lineHeight: 1.1 }}>
                Render Library
              </h1>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 5 }}>
                {totalSize === 0 ? "No renders saved yet" : `${totalSize} render${totalSize !== 1 ? "s" : ""} · ${byProject.length} project${byProject.length !== 1 ? "s" : ""} · saved in this browser`}
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Link
                href="/studio"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 11, color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 700, textDecoration: "none", fontFamily: "Syne, sans-serif" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#e4e4e7"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
              >
                <ArrowLeft style={{ width: 12, height: 12 }} />Back to Studio
              </Link>
              <button
                onClick={refresh}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 11, color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#e4e4e7"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"; }}
              >
                <RefreshCcw style={{ width: 12, height: 12 }} />Refresh
              </button>
              {items.length > 0 && (
                <button
                  onClick={() => setConfirmClear(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 11, color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}
                >
                  <Trash2 style={{ width: 12, height: 12 }} />Clear all
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          {items.length > 0 && (
            <div style={{ position: "relative", maxWidth: 400, marginBottom: 20 }}>
              <Search style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "rgba(255,255,255,0.28)", pointerEvents: "none" }} />
              <input
                className="lib-input"
                placeholder="Search by project name, ID, URL…"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
              {q && (
                <button onClick={() => setQ("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", padding: 2 }}>
                  <X style={{ width: 11, height: 11 }} />
                </button>
              )}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 20 }} />
        </div>

        {/* ── Content ── */}
        <div style={{ padding: "0 24px 40px" }}>
          {items.length === 0 ? (
            /* Empty state */
            <div style={{ textAlign: "center", padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Library style={{ width: 30, height: 30, color: "#7c3aed", opacity: 0.6 }} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.3)", margin: 0 }}>No renders yet</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.17)", marginTop: 6 }}>Render a draft in Studio and it will appear here</p>
              </div>
              <Link
                href="/studio"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.35)", borderRadius: 12, color: "#c4b5fd", fontSize: 12, fontWeight: 700, textDecoration: "none", fontFamily: "Syne, sans-serif" }}
              >
                Go to Studio <ArrowLeft style={{ width: 12, height: 12, transform: "rotate(180deg)" }} />
              </Link>
            </div>
          ) : byProject.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: 700 }}>
              No results for "{q}"
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {byProject.map(([key, group], gi) => {
                const [projectId, projectName] = key.split("::");
                return (
                  <div key={key} className="lib-fade" style={{ animationDelay: `${gi * 0.06}s` }}>
                    <ProjectGroup
                      projectId={projectId}
                      projectName={projectName}
                      items={group}
                      onDelete={handleDelete}
                      onToast={setToast}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}