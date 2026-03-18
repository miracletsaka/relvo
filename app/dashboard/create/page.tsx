"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Image as ImageIcon } from "lucide-react";

import {
  Brand,
  listBrands,
  getBrandProfile,
  type BrandProfile,
  createTopicChatAndGenerate,
  listTopicChatDrafts,
  publishViaMake,
} from "@/lib/api";
import { getTemplates } from "@/lib/template-storage";
import DashboardOverview from "@/components/DashboardOverview";
import AutoGenerateImagesDialog from "@/components/AutoGenerateImagesDialog";
import Platforms from "@/components/platforms";

type Draft = {
  id: string;
  platform: string;
  status: string;
  body_text?: string;
  hashtags?: string;
  scheduled_at?: string;
  structured?: Record<string, any>;
  media_url?: string;
};

type GenerationResult = {
  topic: string;
  topic_chat_id: string | null;
  status: "success" | "partial" | "failed";
  generated: number;
  failed: number;
  drafts: Draft[];
};

async function safeGenerateWithFallback(
  params: Parameters<typeof createTopicChatAndGenerate>[0],
  onChatIdKnown: (id: string) => void
): Promise<{ generated: number; failed: number; topic_chat_id: string | null }> {
  let topicChatId: string | null = null;
  try {
    const res = await createTopicChatAndGenerate(params);
    topicChatId = (res as any)?.topic_chat_id ?? null;
    if (topicChatId) onChatIdKnown(topicChatId);
    return {
      generated: (res as any)?.generated ?? 0,
      failed: (res as any)?.failed ?? 0,
      topic_chat_id: topicChatId,
    };
  } catch (networkErr) {
    if (!topicChatId) throw networkErr;
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const drafts: Draft[] = await listTopicChatDrafts(topicChatId);
      const generated = drafts.filter((d) => d.status !== "FAILED").length;
      const failed    = drafts.filter((d) => d.status === "FAILED").length;
      return { generated, failed, topic_chat_id: topicChatId };
    } catch {
      throw networkErr;
    }
  }
}

const PLATFORM_COLORS: Record<string, string> = {
  linkedin:  "#0A66C2",
  facebook:  "#1877F2",
  instagram: "#E1306C",
  twitter:   "#1DA1F2",
  tiktok:    "#69C9D0",
};

function PlatformBadge({ platform }: { platform: string }) {
  const color = PLATFORM_COLORS[platform.toLowerCase()] ?? "#555";
  return (
    <span
      style={{ background: color + "22", color, border: `1px solid ${color}55` }}
      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest"
    >
      {platform}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "PENDING_APPROVAL" ? "#a78bfa" :
    status === "FAILED"           ? "#f87171" : "#34d399";
  return (
    <span
      style={{ background: color }}
      className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0"
    />
  );
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  facebook:  "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  linkedin:  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  twitter:   "M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z",
  tiktok:    "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
};

function PlatformIcon({ platform, size = 11 }: { platform: string; size?: number }) {
  const path = PLATFORM_ICONS[platform.toLowerCase()];
  if (!path) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d={path} />
    </svg>
  );
}

function DraftCard({ draft, index, selected, onSelect }: {
  draft: Draft;
  index: number;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError]   = useState(false);
  const [expanded, setExpanded]   = useState(false);
  const [hovered, setHovered]     = useState(false);

  const s        = draft.structured ?? {};
  const hook     = s.hook || draft.body_text?.slice(0, 72) || "";
  const caption  = draft.body_text || "";
  const mediaUrl = draft.media_url || null;
  const hasImage = !!mediaUrl && !imgError;

  const PLATFORM_COLORS: Record<string, string> = {
    instagram: "#E1306C", facebook: "#1877F2", linkedin: "#0A66C2",
    twitter: "#1DA1F2", tiktok: "#69C9D0",
  };
  const pColor  = PLATFORM_COLORS[draft.platform?.toLowerCase()] ?? "#7c3aed";
  const dateStr = draft.scheduled_at
    ? new Date(draft.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;

  const statusColor =
    draft.status === "PENDING_APPROVAL" ? "#a78bfa" :
    draft.status === "FAILED"           ? "#f87171" :
    draft.status === "PUBLISHED"        ? "#34d399" : "#6b7280";

  useEffect(() => { setImgLoaded(false); setImgError(false); }, [mediaUrl]);

  return (
    <div
      style={{
        background:    selected ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.02)",
        border:        `1px solid ${selected ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.07)"}`,
        borderRadius:  16,
        overflow:      "hidden",
        cursor:        "pointer",
        transition:    "all 0.18s ease",
        transform:     hovered && !selected ? "translateY(-2px)" : "none",
        boxShadow:     hovered ? "0 8px 32px rgba(0,0,0,0.4)" : selected ? "0 0 0 1px rgba(124,58,237,0.3)" : "none",
        position:      "relative",
        display:       "flex",
        flexDirection: "column",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setExpanded(v => !v)}
    >
      {onSelect && (
        <div
          style={{ position: "absolute", top: 10, left: 10, zIndex: 20, opacity: hovered || selected ? 1 : 0, transition: "opacity 0.15s", pointerEvents: hovered || selected ? "auto" : "none" }}
          onClick={e => { e.stopPropagation(); onSelect(!selected); }}
        >
          <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${selected ? "#7c3aed" : "rgba(255,255,255,0.4)"}`, background: selected ? "#7c3aed" : "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", boxShadow: selected ? "0 0 12px rgba(124,58,237,0.5)" : "none" }}>
            {selected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
        </div>
      )}

      <div style={{ position: "relative", width: "100%", aspectRatio: "4/5", background: hasImage ? "#000" : `linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`, flexShrink: 0, overflow: "hidden" }}>
        {mediaUrl && (
          <img
            src={mediaUrl} alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: imgLoaded ? 1 : 0, transition: "opacity 0.3s ease" }}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}
        {!hasImage && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <div style={{ width: 48, height: 48, borderRadius: 14, background: pColor + "18", border: `1px solid ${pColor}30`, display: "flex", alignItems: "center", justifyContent: "center", color: pColor, position: "relative" }}>
              <PlatformIcon platform={draft.platform} size={22} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", letterSpacing: "0.08em" }}>NO IMAGE YET</span>
          </div>
        )}
        {mediaUrl && !imgLoaded && !imgError && (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        )}
        {hasImage && imgLoaded && (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 45%, transparent 70%)" }} />
        )}
        <div style={{ position: "absolute", top: 10, right: 10, display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)", border: `1px solid ${pColor}40`, borderRadius: 20, padding: "4px 8px 4px 6px" }}>
          <span style={{ color: pColor, display: "flex" }}><PlatformIcon platform={draft.platform} size={10} /></span>
          <span style={{ fontSize: 9, fontWeight: 800, color: pColor, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Syne, sans-serif" }}>{draft.platform}</span>
        </div>
        {dateStr && (
          <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", borderRadius: 8, padding: "3px 7px" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: "DM Mono, monospace" }}>{dateStr}</span>
          </div>
        )}
        <div style={{ position: "absolute", bottom: 10, right: 10, background: statusColor + "20", border: `1px solid ${statusColor}40`, borderRadius: 20, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor, display: "inline-block", ...(draft.status === "PENDING_APPROVAL" ? { animation: "autopulse 1.5s ease-in-out infinite" } : {}) }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: statusColor, letterSpacing: "0.06em", fontFamily: "DM Mono, monospace" }}>
            {draft.status === "PENDING_APPROVAL" ? "PENDING" : draft.status === "FAILED" ? "FAILED" : draft.status?.replace(/_/g," ")}
          </span>
        </div>
      </div>

      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)", lineHeight: 1.45, fontFamily: "Syne, sans-serif", margin: 0, display: "-webkit-box", WebkitLineClamp: expanded ? undefined : 2, WebkitBoxOrient: "vertical", overflow: expanded ? "visible" : "hidden" }}>
          {hook || "(no content)"}
        </p>
        {Array.isArray(s.bullets) && s.bullets.filter(Boolean).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {s.bullets.filter(Boolean).slice(0, expanded ? 3 : 2).map((b: string, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                <span style={{ color: pColor, fontSize: 10, flexShrink: 0, marginTop: 1 }}>›</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", lineHeight: 1.4, fontFamily: "DM Mono, monospace" }}>{b}</span>
              </div>
            ))}
          </div>
        )}
        {expanded && caption && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, marginTop: 2 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 6, fontFamily: "DM Mono, monospace" }}>Full Caption</div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{caption}</p>
            {draft.hashtags && <p style={{ fontSize: 11, color: "#a78bfa", marginTop: 8, lineHeight: 1.5 }}>{draft.hashtags}</p>}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 4 }}>
          <button
            style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: "0.06em", fontFamily: "DM Mono, monospace", textTransform: "uppercase", transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
          >
            {expanded ? "↑ Less" : "↓ More"}
          </button>
          {hasImage && (
            <span style={{ fontSize: 9, fontWeight: 700, color: "#34d399", fontFamily: "DM Mono, monospace", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              IMAGE READY
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultsPanel({
  results, onRegenImages, onRegenSelected, selectedDraftIds, onSelectDraft,
}: {
  results: GenerationResult[];
  onRegenImages: (topicIdx: number) => void;
  onRegenSelected: (topicIdx: number, draftIds: string[]) => void;
  selectedDraftIds: Set<string>;
  onSelectDraft: (draftId: string, checked: boolean) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [approving, setApproving] = useState(false);
  const [err, setErr]             = useState<string | null>(null);
  const safeIdx = Math.min(activeIdx, Math.max(0, results.length - 1));
  const active  = results[safeIdx];
  if (!active) return null;

  const totalDrafts    = results.reduce((s, r) => s + r.drafts.length, 0);
  const activeDraftIds = active.drafts.map(d => d.id);
  const activeSelected = activeDraftIds.filter(id => selectedDraftIds.has(id));
  const allSelected    = activeDraftIds.length > 0 && activeSelected.length === activeDraftIds.length;
  const hasSelection   = activeSelected.length > 0;

  const toggleSelectAll = () => {
    const next = !allSelected;
    activeDraftIds.forEach(id => onSelectDraft(id, next));
  };
  const clearSelection = () => activeDraftIds.forEach(id => onSelectDraft(id, false));

  const bulkApprove = async () => {
    if (!activeSelected.length) return;
    setApproving(true); setErr(null);
    try {
      await publishViaMake(activeSelected);
      if (active.topic_chat_id) window.location.href = `/dashboard/topic-chats/${active.topic_chat_id}`;
    } catch (e: any) {
      setErr(e?.message || "Bulk publish failed");
      setApproving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.07]">
        <div className="text-xs text-white/40">
          <span className="text-white font-bold text-sm">{totalDrafts}</span> drafts ·{" "}
          <span className="text-white font-bold">{results.length}</span> topic{results.length !== 1 ? "s" : ""}
        </div>
        {active.topic_chat_id && (
          <a target="___blank" href={`/dashboard/topic-chats/${active.topic_chat_id}`} onClick={e => e.stopPropagation()}
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 8, textDecoration: "none", letterSpacing: "0.04em" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            View chat
          </a>
        )}
      </div>

      {results.length > 1 && (
        <div className="flex gap-1 p-2 border-b border-white/[0.07] overflow-x-auto">
          {results.map((r, i) => (
            <button key={i} onClick={() => setActiveIdx(i)}
              className={`flex-shrink-0 text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${i === safeIdx ? "bg-violet-600 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
              {r.topic.length > 20 ? r.topic.slice(0, 20) + "…" : r.topic}
              <span style={{ fontSize: 9, opacity: 0.6, fontFamily: "DM Mono, monospace" }}>{r.drafts.length}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ overflow: "hidden", maxHeight: hasSelection ? 48 : 0, opacity: hasSelection ? 1 : 0, transition: "max-height 0.2s ease, opacity 0.2s ease", background: "rgba(124,58,237,0.07)", borderBottom: hasSelection ? "1px solid rgba(124,58,237,0.2)" : "none" }}>
        <div className="flex items-center gap-2 px-3" style={{ height: 48, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", fontFamily: "DM Mono, monospace" }}>{activeSelected.length} selected</span>
          <button onClick={toggleSelectAll} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>{allSelected ? "Deselect all" : "Select all"}</button>
          <div style={{ flex: 1 }} />
          <button onClick={() => onRegenSelected(safeIdx, activeSelected)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399", fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 8, cursor: "pointer" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
            Regen {activeSelected.length}
          </button>
          <button onClick={bulkApprove} disabled={approving} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: approving ? "rgba(255,255,255,0.04)" : "rgba(167,139,250,0.12)", border: `1px solid ${approving ? "rgba(255,255,255,0.08)" : "rgba(167,139,250,0.3)"}`, color: approving ? "rgba(255,255,255,0.2)" : "#a78bfa", fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 8, cursor: approving ? "not-allowed" : "pointer" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Approve ({activeSelected.length})
          </button>
          <button onClick={clearSelection} style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}>✕</button>
        </div>
      </div>

      {err && <div style={{ margin: "8px 12px", padding: "8px 12px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, fontSize: 11, color: "#f87171" }}>{err}</div>}

      <div className="flex-1 overflow-y-auto p-3">
        {active.drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-white/20 text-sm">No drafts loaded</div>
        ) : (
          <div className="draft-grid">
            {active.drafts.map((d, i) => (
              <DraftCard key={d.id} draft={d} index={i} selected={selectedDraftIds.has(d.id)} onSelect={(checked) => onSelectDraft(d.id, checked)} />
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-2.5 border-t border-white/[0.07] flex items-center gap-2 flex-wrap">
        <button onClick={toggleSelectAll} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 8, cursor: "pointer" }}>
          <div style={{ width: 13, height: 13, borderRadius: 3, flexShrink: 0, border: `1.5px solid ${allSelected ? "#7c3aed" : "rgba(255,255,255,0.3)"}`, background: allSelected ? "#7c3aed" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {allSelected && <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          {allSelected ? "Deselect all" : "Select all"}
        </button>
        {active.topic_chat_id && <a target="__blank" href={`/dashboard/topic-chats/${active.topic_chat_id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#a78bfa", fontWeight: 600, textDecoration: "none" }}>Open full chat →</a>}
        <div style={{ flex: 1 }} />
        {active.drafts.length > 0 && (
          <button onClick={() => onRegenImages(safeIdx)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399", fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 9, cursor: "pointer" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
            Regen all images
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TopicsPage() {
  const [topicsText, setTopicsText]   = useState("");
  const [brands, setBrands]           = useState<Brand[]>([]);
  const [brandId, setBrandId]         = useState<string>("");
  const [p, setP]                     = useState<BrandProfile | null>(null);

  const [monthlyMode, setMonthlyMode] = useState(true);
  const [targetMonth, setTargetMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [skipImages, setSkipImages]     = useState(false);

  const [loading, setLoading]               = useState(false);
  const [reviewOpen, setReviewOpen]         = useState(false);
  const [statusMsg, setStatusMsg]           = useState<{ type: "ok" | "warn" | "err"; text: string } | null>(null);
  const [results, setResults]               = useState<GenerationResult[]>([]);
  const [generating, setGenerating]         = useState(false);
  const [generatingTopic, setGeneratingTopic] = useState<string | null>(null);
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  const [autoGenOpen, setAutoGenOpen]       = useState(false);
  const [autoGenDrafts, setAutoGenDrafts]   = useState<Draft[]>([]);
  const [autoStart, setAutoStart]           = useState(false);
  const [templates, setTemplates]           = useState<any[]>([]);

  // Mobile: which panel is visible ("left" | "right")
  const [mobilePanel, setMobilePanel] = useState<"left" | "right">("left");

  useEffect(() => {
    (async () => {
      const data = await listBrands(true);
      setBrands(data);
      if (data.length > 0) setBrandId(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!brandId) return;
    (async () => {
      try { setP(await getBrandProfile(brandId)); } catch { setP(null); }
      try {
        const tpls = await getTemplates(brandId);
        setTemplates(Array.isArray(tpls) ? tpls : []);
      } catch { setTemplates([]); }
    })();
  }, [brandId]);

  const topics = useMemo(() =>
    topicsText.split("\n").map((t) => t.trim()).filter(Boolean),
    [topicsText]
  );

  const validate = (): string | null => {
    if (!brandId)            return "Please select a brand.";
    if (topics.length === 0) return "Enter at least 1 topic (one per line).";
    if (monthlyMode && !targetMonth)      return "Please select a target month.";
    if (monthlyMode && postsPerWeek <= 0) return "Choose posts per week.";
    return null;
  };

  const openReview = () => {
    const err = validate();
    if (err) { setStatusMsg({ type: "err", text: err }); return; }
    setStatusMsg(null);
    setReviewOpen(true);
  };

  const handleSelectDraft = (draftId: string, checked: boolean) => {
    setSelectedDraftIds(prev => {
      const next = new Set(prev);
      checked ? next.add(draftId) : next.delete(draftId);
      return next;
    });
  };

  const openImageDialog = (drafts: Draft[], shouldAutoStart: boolean) => {
    setAutoGenDrafts(drafts);
    setAutoStart(shouldAutoStart);
    setAutoGenOpen(true);
  };

  const regenImagesForTopic = (topicIdx: number) => {
    const r = results[topicIdx];
    if (!r?.drafts.length) return;
    openImageDialog(r.drafts, false);
  };

  const regenImagesForSelected = (_topicIdx: number, draftIds: string[]) => {
    const draftsToRegen = results.flatMap(r => r.drafts).filter(d => draftIds.includes(d.id));
    if (!draftsToRegen.length) return;
    setSelectedDraftIds(new Set());
    openImageDialog(draftsToRegen, false);
  };

  const confirmGenerate = async () => {
    setLoading(true);
    setGenerating(true);
    setReviewOpen(false);
    setStatusMsg(null);
    setResults([]);
    setSelectedDraftIds(new Set());

    const clientNow = new Date().toISOString();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";

    let totalOk = 0, totalFail = 0;
    const completedResults: GenerationResult[] = [];

    for (const topic of topics) {
      setGeneratingTopic(topic);

      const result: GenerationResult = {
        topic, topic_chat_id: null, status: "failed", generated: 0, failed: 0, drafts: [],
      };

      try {
        const res = await safeGenerateWithFallback(
          {
            brand_id: brandId, topic, mode: "monthly",
            target_month: targetMonth, posts_per_week: postsPerWeek,
            brand_profile_summary: p?.profile_summary ?? undefined,
            brand_profile_json: p?.profile_json ?? undefined,
            client_now: clientNow, posting_hour_local: 9,
          },
          (id) => { result.topic_chat_id = id; }
        );

        result.topic_chat_id = res.topic_chat_id;
        result.generated     = res.generated;
        result.failed        = res.failed;
        result.status        = res.generated > 0 ? "success" : "partial";
        totalOk   += res.generated;
        totalFail += res.failed;

        if (res.topic_chat_id) {
          try { result.drafts = await listTopicChatDrafts(res.topic_chat_id); } catch {}
        }
      } catch (e: any) {
        result.status = "failed";
        setStatusMsg({ type: "err", text: `"${topic}": ${e?.message ?? "generation failed"}` });
      }

      completedResults.push(result);
      setResults([...completedResults]);
    }

    setGeneratingTopic(null);
    setGenerating(false);
    setLoading(false);
    setTopicsText("");

    if (totalOk > 0) {
      setStatusMsg({
        type: totalFail > 0 ? "warn" : "ok",
        text: `Generated ${totalOk} draft(s) across ${topics.length} topic(s).${totalFail ? ` ${totalFail} failed.` : ""}${!skipImages && templates.length > 0 ? " Starting image generation…" : ""}`,
      });
      // Switch to results panel on mobile after generation
      setMobilePanel("right");
    } else if (!statusMsg) {
      setStatusMsg({ type: "err", text: "0 drafts generated. Check backend logs." });
    }

    const allDrafts    = completedResults.flatMap(r => r.drafts);
    const canGenImages = !skipImages && templates.length > 0 && allDrafts.length > 0;
    if (canGenImages) openImageDialog(allDrafts, true);
  };

  const showPanel = results.length > 0 || generating;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        .topics-root { font-family: 'Syne', sans-serif; background: #0c0c0f; min-height: 100vh; color: #e4e4e7; }
        .topics-input { background: rgba(255,255,255,0.04) !important; border: 1px solid rgba(255,255,255,0.08) !important; color: #e4e4e7 !important; font-family: 'DM Mono', monospace; font-size: 12px; resize: none; transition: border-color 0.2s; }
        .topics-input:focus { border-color: rgba(139,92,246,0.5) !important; outline: none; box-shadow: 0 0 0 3px rgba(139,92,246,0.12); }
        .topics-input::placeholder { color: rgba(255,255,255,0.2); }
        .topics-select { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #e4e4e7; font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600; border-radius: 10px; padding: 8px 12px; width: 100%; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 30px; }
        .topics-select:focus { outline: none; border-color: rgba(139,92,246,0.5); }
        .topics-select option { background: #1a1a2e; }
        .field-label { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 6px; display: block; }
        .generate-btn { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px; letter-spacing: 0.04em; border: none; border-radius: 12px; padding: 12px 24px; width: 100%; cursor: pointer; transition: opacity 0.2s, transform 0.1s; position: relative; overflow: hidden; }
        .generate-btn:hover:not(:disabled) { opacity: 0.9; }
        .generate-btn:active:not(:disabled) { transform: scale(0.98); }
        .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .generate-btn::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent); pointer-events: none; }
        .month-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #e4e4e7; font-family: 'DM Mono', monospace; font-size: 12px; border-radius: 10px; padding: 8px 12px; width: 100%; color-scheme: dark; }
        .month-input:focus { outline: none; border-color: rgba(139,92,246,0.5); }
        .checkbox-custom { width: 16px; height: 16px; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; background: rgba(255,255,255,0.04); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s, border-color 0.15s; }
        .checkbox-custom.checked { background: #7c3aed; border-color: #7c3aed; }
        .stat-chip { display: inline-flex; align-items: center; gap: 5px; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); color: #a78bfa; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
        .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.1); border-top-color: #a78bfa; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes autopulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.85); } }
        .dialog-dark { background: #141418 !important; border: 1px solid rgba(255,255,255,0.1) !important; color: #e4e4e7 !important; }
        .msg-ok   { color: #34d399; font-size: 12px; font-weight: 600; }
        .msg-warn { color: #fbbf24; font-size: 12px; font-weight: 600; }
        .msg-err  { color: #f87171; font-size: 12px; font-weight: 600; }
        .img-toggle-box { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 12px 14px; }

        /* ── Layout ── */
        .topics-layout { display: flex; height: 100vh; overflow: hidden; }

        /* Desktop: side-by-side */
        .panel-left {
          width: 380px; min-width: 320px; flex-shrink: 0;
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column;
          height: 100vh; overflow-y: auto;
        }
        .panel-right {
          flex: 1; min-width: 0;
          display: flex; flex-direction: column;
          height: 100vh;
        }

        /* Draft grid — 3 cols on large, 2 on medium, 1 on small */
        .draft-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 14px;
        }

        /* ── Mobile tab bar ── */
        .mobile-tabs {
          display: none;
          position: sticky; top: 0;
          background: #0c0c0f;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 0;
        }
        .mobile-tab-btn {
          flex: 1; padding: 12px 8px;
          font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700;
          border: none; background: none; cursor: pointer;
          color: rgba(255,255,255,0.35);
          border-bottom: 2px solid transparent;
          transition: all 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .mobile-tab-btn.active {
          color: #e4e4e7;
          border-bottom-color: #7c3aed;
        }

        /* ── Responsive breakpoints ── */

        /* Tablet: shrink left panel */
        @media (max-width: 900px) {
          .panel-left { width: 300px; min-width: 260px; }
          .draft-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
        }

        /* Mobile: stacked, tab-switched panels */
        @media (max-width: 640px) {
          .topics-layout { flex-direction: column; height: auto; overflow: visible; }

          .mobile-tabs { display: flex; }

          .panel-left {
            width: 100%; min-width: unset;
            height: auto; max-height: none;
            border-right: none;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            overflow-y: visible;
          }
          .panel-left.mobile-hidden { display: none; }

          .panel-right {
            height: auto; min-height: 60vh;
          }
          .panel-right.mobile-hidden { display: none; }

          .draft-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          /* Make generate button sticky on mobile */
          .mobile-sticky-footer {
            position: sticky;
            bottom: 0;
            background: #0c0c0f;
            padding-bottom: env(safe-area-inset-bottom, 0px);
            border-top: 1px solid rgba(255,255,255,0.06);
            z-index: 40;
          }
        }

        /* Very small phones */
        @media (max-width: 380px) {
          .draft-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="topics-root">

        {/* ── Mobile tab bar ── */}
        <div className="mobile-tabs">
          <button
            className={`mobile-tab-btn ${mobilePanel === "left" ? "active" : ""}`}
            onClick={() => setMobilePanel("left")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Generator
          </button>
          <button
            className={`mobile-tab-btn ${mobilePanel === "right" ? "active" : ""}`}
            onClick={() => setMobilePanel("right")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Drafts
            {results.length > 0 && (
              <span style={{ background: "#7c3aed", color: "white", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 10, fontFamily: "DM Mono, monospace" }}>
                {results.reduce((s, r) => s + r.drafts.length, 0)}
              </span>
            )}
          </button>
        </div>

        <div className="topics-layout">
          {/* ── LEFT PANEL ── */}
          <div className={`panel-left ${mobilePanel === "right" ? "mobile-hidden" : ""}`}>
            <div className="px-5 pt-6 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                </div>
                <h1 className="text-[15px] font-bold tracking-tight">Content Generator</h1>
              </div>
              <p className="text-[11px] text-white/30 leading-relaxed">
                Generate AI-powered drafts + images for your social channels.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Brand */}
              <div>
                <span className="field-label">Brand / Page</span>
                <select className="topics-select" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.display_name}</option>)}
                </select>
              </div>

              {/* Topics */}
              <div>
                <span className="field-label">Topics — one per line</span>
                <textarea
                  className="topics-input w-full rounded-xl p-3"
                  rows={8}
                  value={topicsText}
                  onChange={(e) => setTopicsText(e.target.value)}
                  placeholder={"AI receptionist reduces missed calls\nWhatsApp blog automation case study\nHow we 3× our client's leads"}
                />
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="stat-chip">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6"/></svg>
                    {topics.length} topic{topics.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Monthly planner */}
              <div>
                <span className="field-label">Monthly Bulk Generation</span>
                <label className="flex items-center gap-2.5 text-xs font-semibold text-white/60 cursor-pointer mb-3" onClick={() => setMonthlyMode((v) => !v)}>
                  <span className={`checkbox-custom ${monthlyMode ? "checked" : ""}`}>
                    {monthlyMode && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </span>
                  Generate a full month calendar
                </label>
                {monthlyMode && (
                  <div className="space-y-3">
                    <div>
                      <span className="field-label">Target month</span>
                      <input type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} className="month-input" />
                    </div>
                    <div>
                      <span className="field-label">Posts per week</span>
                      <select value={postsPerWeek} onChange={(e) => setPostsPerWeek(Number(e.target.value))} className="topics-select">
                        {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} / week</option>)}
                      </select>
                    </div>
                    <p className="text-[11px] text-white/25 leading-relaxed">It is recommended to select one social media per each generation for faster generation.</p>
                  </div>
                )}
              </div>

              <Platforms />

              {/* Image toggle */}
              <div className="img-toggle-box">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon style={{ width: 13, height: 13, color: "#a78bfa" }} />
                  <span className="text-[12px] font-bold">Auto Image Generation</span>
                  {templates.length > 0
                    ? <span className="text-[10px] ml-auto" style={{ color: "#34d399", fontFamily: "DM Mono, monospace" }}>{templates.length} template{templates.length !== 1 ? "s" : ""} ready</span>
                    : <span className="text-[10px] ml-auto" style={{ color: "#f87171", fontFamily: "DM Mono, monospace" }}>no templates</span>
                  }
                </div>
                <p className="text-[10px] text-white/25 leading-relaxed mb-3">
                  Opens automatically after <strong style={{ color: "rgba(255,255,255,0.4)" }}>all drafts</strong> are saved — starts rendering immediately.
                </p>
                <label className="flex items-center gap-2.5 text-xs font-semibold text-white/50 cursor-pointer" onClick={() => setSkipImages((v) => !v)}>
                  <span className={`checkbox-custom ${skipImages ? "checked" : ""}`}>
                    {skipImages && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </span>
                  Skip image generation
                </label>
              </div>
            </div>

            {/* Footer — sticky on mobile */}
            <div className="px-5 pb-5 pt-3 border-t border-white/[0.06] space-y-3 mobile-sticky-footer">
              {statusMsg && <p className={`msg-${statusMsg.type}`}>{statusMsg.text}</p>}
              <button className="generate-btn" onClick={openReview} disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="spinner" />
                    {generatingTopic ? `Writing "${generatingTopic.slice(0, 18)}…"` : "Working…"}
                  </span>
                ) : "Generate Drafts + Images →"}
              </button>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className={`panel-right overflow-y-auto ${mobilePanel === "left" ? "mobile-hidden" : ""}`}>
            <div className="px-5 pt-6 pb-4 border-b border-white/[0.06] flex items-center gap-3 flex-wrap">
              <h2 className="text-[13px] font-bold text-white/70">Generated Drafts</h2>
              {generating && (
                <div className="flex items-center gap-2">
                  <span className="spinner" />
                  <span className="text-[11px] text-violet-400">
                    {generatingTopic ? `Writing "${generatingTopic.slice(0, 28)}…"` : "Starting…"}
                  </span>
                </div>
              )}
              {results.length > 0 && results.some(r => r.drafts.length > 0) && !generating && (
                <button
                  onClick={() => { const idx = results.findIndex(r => r.drafts.length > 0); if (idx !== -1) regenImagesForTopic(idx); }}
                  style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399", fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 10, cursor: "pointer", letterSpacing: "0.03em" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                  Regenerate Images
                </button>
              )}
            </div>

            {showPanel ? (
              <ResultsPanel
                results={results}
                onRegenImages={regenImagesForTopic}
                onRegenSelected={regenImagesForSelected}
                selectedDraftIds={selectedDraftIds}
                onSelectDraft={handleSelectDraft}
              />
            ) : (
              <DashboardOverview />
            )}
          </div>
        </div>
      </div>

      {/* ── Review Dialog ── */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="dialog-dark max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ color: "#e4e4e7", fontFamily: "Syne, sans-serif" }}>Review before generating</DialogTitle>
            <DialogDescription style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
              Phase 1 writes all drafts · Phase 2 auto-generates images after all are saved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            {[
              ["Brand",        brandId],
              ["Topics",       topics.length],
              ["Target month", targetMonth],
              ["Posts / week", postsPerWeek],
              ["Images",       skipImages ? "Skipped" : templates.length > 0 ? `Auto — ${templates.length} template${templates.length !== 1 ? "s" : ""} — starts after all drafts saved` : "No templates — will skip"],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex gap-2">
                <span style={{ color: "rgba(255,255,255,0.3)", width: 110, flexShrink: 0 }}>{k}</span>
                <span className="font-bold" style={{ color: "#e4e4e7" }}>{String(v)}</span>
              </div>
            ))}
          </div>
          <div className="max-h-56 overflow-auto rounded-xl border border-white/[0.07] bg-white/[0.02]">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Topic", "Drafts", "Images"].map((h) => (
                    <th key={h} className="text-left p-2.5" style={{ color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.08em", fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topics.map((t) => (
                  <tr key={t} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="p-2.5" style={{ color: "rgba(255,255,255,0.7)" }}>{t}</td>
                    <td className="p-2.5" style={{ color: "rgba(255,255,255,0.5)" }}>—</td>
                    <td className="p-2.5">
                      {skipImages || !templates.length
                        ? <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>—</span>
                        : <span style={{ color: "#34d399", fontWeight: 700, fontSize: 11 }}>AUTO</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <button onClick={() => setReviewOpen(false)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: 13, padding: "9px 20px", borderRadius: 10, cursor: "pointer" }}>Cancel</button>
            <button className="generate-btn" style={{ width: "auto", padding: "9px 24px" }} onClick={confirmGenerate} disabled={loading}>Confirm & Generate</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Auto Image Generation Dialog ── */}
      <AutoGenerateImagesDialog
        open={autoGenOpen}
        brandId={brandId}
        onOpenChange={(o) => {
          if (!o) { setAutoGenOpen(false); setAutoGenDrafts([]); setAutoStart(false); }
        }}
        drafts={autoGenDrafts}
        chat={{ brand_id: brandId, background_images: [] }}
        autoStart={autoStart}
        onFinished={async () => {
          setAutoGenOpen(false);
          setAutoGenDrafts([]);
          setAutoStart(false);
          try {
            const updated = await Promise.all(
              results.map(async (r) => {
                if (!r.topic_chat_id) return r;
                try {
                  const fresh = await listTopicChatDrafts(r.topic_chat_id);
                  return { ...r, drafts: fresh };
                } catch { return r; }
              })
            );
            setResults(updated);
            setStatusMsg({ type: "ok", text: "Images generated and attached ✓" });
          } catch {
            setStatusMsg({ type: "ok", text: "Images generated. Refresh to see them." });
          }
        }}
      />
    </>
  );
}