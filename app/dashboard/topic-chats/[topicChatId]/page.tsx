"use client";
//regen all drafts
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FileText, Image as ImageIcon, Video as VideoIcon, Sparkles, Upload, RefreshCw, Check, X, ChevronRight, Search, Wand2, Trash2, Share2, Copy, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import StructuredPost from "@/components/StructuredPost";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AutoGenerateImagesDialog from "@/components/AutoGenerateImagesDialog";
import {
  getTopicChat,
  listTopicChatDrafts,
  updateDraft,
  publishViaMake,
  bulkReject,
  deleteDraft,
  attachMediaToContentItem,
  saveChatBackgrounds,
  generateBackgrounds,
} from "@/lib/api";
import { uploadFileToSpaces, uploadGeneratedBackgroundToSpaces } from "@/lib/upload-client";
import ContentUploadPage from "@/components/ContentUploadPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackgroundGenerationDialog } from "@/components/BackgroundGenerationDialog";
import { extractImagePrompts, getRandomPrompts } from "@/lib/prompt-utils";

//Regen Text
/* ─── utils ─────────────────────────────────────────────── */
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function safeJsonParseArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") {
    try { const p = JSON.parse(v); if (Array.isArray(p)) return p.filter(Boolean); } catch {}
    if (v.includes(",")) return v.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return [];
}
function normStatus(s: any) { return String(s || "").toUpperCase().trim(); }
type TabKey = "pending" | "published" | "failed";
function tabForDraft(d: any): TabKey {
  const st = normStatus(d?.status);
  if (st === "PUBLISHED") return "published";
  if (st === "FAILED" || st === "REJECTED") return "failed";
  return "pending";
}
function parseMediaUrls(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string") { try { const p = JSON.parse(v); if (Array.isArray(p)) return p.filter(Boolean).map(String); } catch {} }
  return [];
}
function draftType(d: any): "text" | "image" | "video" {
  const mt = String(d?.media_type || "").toLowerCase();
  if (mt === "video") return "video";
  if (mt === "image") return "image";
  const url = String(d?.media_url || "").toLowerCase();
  if (url.endsWith(".mp4") || url.includes("video")) return "video";
  if (url) return "image";
  const urls = parseMediaUrls(d?.media_urls);
  if (urls.length) { const u0 = String(urls[0]).toLowerCase(); if (u0.endsWith(".mp4") || u0.includes("video")) return "video"; return "image"; }
  return "text";
}
function firstMediaUrl(d: any): string | null {
  const thumb = String(d?.thumbnail_url || "").trim();
  if (thumb) return thumb;
  const mu = String(d?.media_url || "").trim();
  if (mu) return mu;
  const arr = parseMediaUrls(d?.media_urls);
  return arr[0] || null;
}

const PLATFORM_ACCENT: Record<string, string> = {
  linkedin: "#0A66C2", facebook: "#1877F2", instagram: "#E1306C",
  twitter: "#1DA1F2", tiktok: "#69C9D0",
};

const SHARE_PLATFORM_META: Record<string, { label: string; bg: string; border: string; color: string }> = {
  facebook: { label: "Facebook", bg: "rgba(24,119,242,0.12)", border: "rgba(24,119,242,0.28)", color: "#60a5fa" },
  linkedin: { label: "LinkedIn", bg: "rgba(10,102,194,0.12)", border: "rgba(10,102,194,0.28)", color: "#60a5fa" },
  twitter: { label: "X / Twitter", bg: "rgba(29,161,242,0.12)", border: "rgba(29,161,242,0.28)", color: "#7dd3fc" },
  whatsapp: { label: "WhatsApp", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.28)", color: "#4ade80" },
  telegram: { label: "Telegram", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.28)", color: "#67e8f9" },
  email: { label: "Email", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.28)", color: "#c4b5fd" },
};

/* ─── Sub-components ────────────────────────────────────── */
function PlatformPill({ platform }: { platform: string }) {
  const color = PLATFORM_ACCENT[platform.toLowerCase()] ?? "#6b7280";
  return (
    <span style={{ background: color + "20", color, border: `1px solid ${color}40` }}
      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
      {platform}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING_APPROVAL: "#a78bfa", PUBLISHED: "#34d399", FAILED: "#f87171", REJECTED: "#fb923c",
    APPROVED: "#60a5fa", SCHEDULED: "#fbbf24",
  };
  const color = map[status] ?? "#9ca3af";
  return (
    <span style={{ color, background: color + "15", border: `1px solid ${color}30` }}
      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
      <span style={{ background: color }} className="w-1 h-1 rounded-full inline-block" />
      {status.toLowerCase().replace(/_/g, " ")}
    </span>
  );
}

function TypeIcon({ type }: { type: "text" | "image" | "video" }) {
  if (type === "video") return <VideoIcon className="w-3 h-3" />;
  if (type === "image") return <ImageIcon className="w-3 h-3" />;
  return <FileText className="w-3 h-3" />;
}

/* ─── DraftCard ─────────────────────────────────────────── */
function DraftCard({ it, chat, selected, onSelect, onOpen, showCheckbox }: {
  it: any; chat: any; selected: boolean; onSelect: (checked: boolean) => void;
  onOpen: () => void; showCheckbox: boolean;
}) {
  const st = normStatus(it.status);
  const pf = String(it.platform || "").toLowerCase();
  const type = draftType(it);
  const media = firstMediaUrl(it);
  return (
    <div
      onClick={onOpen}
      className={`group relative rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden
        ${selected ? "border-violet-500/60 bg-violet-500/5" : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.14]"}`}
    >
      {/* Media strip */}
      {media ? (
        <div className="h-32 overflow-hidden bg-black/30">
          {type === "video" && !it.thumbnail_url ? (
            <div className="h-full flex items-center justify-center">
              <VideoIcon className="w-8 h-8 text-white/20" />
            </div>
          ) : (
            <img src={media} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      ) : (
        <div className="h-24 flex items-center justify-center bg-white/[0.02]">
          <div className="text-white/10">
            <TypeIcon type={type} />
          </div>
        </div>
      )}

      {/* Checkbox */}
      {showCheckbox && (
        <div className="absolute top-3 left-3" onClick={(e) => { e.stopPropagation(); onSelect(!selected); }}>
          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all
            ${selected ? "bg-violet-500 border-violet-500" : "border-white/30 bg-black/40 backdrop-blur-sm"}`}>
            {selected && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>
      )}

      {/* Type badge */}
      <div className="absolute top-3 right-3">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white/60 flex items-center gap-1">
          <TypeIcon type={type} />{type}
        </span>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PlatformPill platform={pf || "unknown"} />
          <StatusPill status={st} />
        </div>

        <p className="text-xs text-white/55 leading-relaxed line-clamp-2">
          {(it.body_text || it.hashtags || it.last_error || "No content").slice(0, 100)}
        </p>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-white/25 font-mono">{fmtDate(it.scheduled_at)}</span>
          <div className="flex items-center gap-2">
            {chat && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${(typeof window !== "undefined" ? window.location.origin : "")}/business/${chat?.org_slug}?draftId=${it.id}`); }}
                className="text-[10px] font-semibold px-2 py-1 rounded-full border border-white/10 bg-white/[0.04] text-white/45 hover:text-white/75 hover:bg-white/[0.08]"
              >
                Link
              </button>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
export default function TopicChatDetailPage() {
  const params = useParams();
  const topicChatId = String((params as any)?.topicChatId || "");

  const [bgDialogOpen, setBgDialogOpen] = useState(false);
  const [bgFiles, setBgFiles] = useState<File[]>([]);
  const [bgUploading, setBgUploading] = useState(false);
  const [generatingBg, setGeneratingBg] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; prompt: string; generatedAt: string }>>([]);
  const [bgGenDialogOpen, setBgGenDialogOpen] = useState(false);
  const [selectedGeneratedBg, setSelectedGeneratedBg] = useState<string[]>([]);
  const [autoGenOpen, setAutoGenOpen] = useState(false);
  // null = closed, "all" = all drafts, "selected" = only selected
  const [regenImgTarget, setRegenImgTarget] = useState<"all" | "selected" | null>(null);
  // Regenerate draft text
  const [regenDraftsConfirm, setRegenDraftsConfirm] = useState(false);
  const [regenDraftsTarget, setRegenDraftsTarget] = useState<"all" | "selected">("all");
  const [regenningDrafts, setRegenningDrafts] = useState(false);
  // Per-draft image regen progress (draft id → status)
  const [regenImgProgress, setRegenImgProgress] = useState<Record<string, "pending"|"done"|"failed">>({});
  const [chat, setChat] = useState<any | null>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("pending");
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);
  const [active, setActive] = useState<any | null>(null);
  const [draft, setDraft] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDraft, setShareDraft] = useState<any | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [copiedCaptionId, setCopiedCaptionId] = useState<string | null>(null);
const [downloadingMediaId, setDownloadingMediaId] = useState<string | null>(null);

async function copyDraftCaptionForSocial(draftItem: any) {
  const fullText = [draftItem?.body_text, draftItem?.hashtags].filter(Boolean).join("\n\n");
  if (!fullText) return;

  try {
    await navigator.clipboard.writeText(fullText);
    setCopiedCaptionId(draftItem.id);
    setTimeout(() => setCopiedCaptionId(null), 2200);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = fullText;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    setCopiedCaptionId(draftItem.id);
    setTimeout(() => setCopiedCaptionId(null), 2200);
  }
}

async function downloadDraftMedia(draftItem: any) {
  const mediaUrl = draftItem?.media_url;
  if (!mediaUrl || downloadingMediaId === draftItem.id) return;

  setDownloadingMediaId(draftItem.id);

  try {
    const res = await fetch(mediaUrl);
    const blob = await res.blob();

    const ext =
      blob.type.includes("png") ? "png" :
      blob.type.includes("webp") ? "webp" :
      blob.type.includes("mp4") ? "mp4" :
      blob.type.includes("gif") ? "gif" :
      "jpg";

    const filename = `draft-${draftItem?.platform || "media"}-${String(draftItem?.id || "").slice(0, 8)}.${ext}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    window.open(mediaUrl, "_blank");
  } finally {
    setDownloadingMediaId(null);
  }
}

  const refresh = async () => {
    setLoading(true); setErr(null);
    try {
      const [c, ds] = await Promise.all([getTopicChat(topicChatId), listTopicChatDrafts(topicChatId)]);
      setChat(c); setDrafts(ds); setSelected({}); setActive(null);
      
    } catch (e: any) { setErr(e?.message || "Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (topicChatId) refresh(); }, [topicChatId]);

  const draftsByTab = useMemo(() => {
    const g: Record<TabKey, any[]> = { pending: [], published: [], failed: [] };
    for (const d of drafts) g[tabForDraft(d)].push(d);
    return g;
  }, [drafts]);

  useEffect(() => { setSelected({}); }, [tab]);

  const filtered = useMemo(() => {
    const base = draftsByTab[tab] || [];
    const needle = q.trim().toLowerCase();
    if (!needle) return base;
    return base.filter((d: any) =>
      `${d.id} ${d.platform} ${d.status} ${d.body_text || ""} ${d.hashtags || ""}`.toLowerCase().includes(needle)
    );
  }, [draftsByTab, tab, q]);

  const counts = useMemo(() => ({
    pending: draftsByTab.pending.length,
    published: draftsByTab.published.length,
    failed: draftsByTab.failed.length,
  }), [draftsByTab]);

  const toggleOne = (id: string, checked: boolean) => setSelected((p) => ({ ...p, [id]: checked }));
  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    filtered.forEach((d: any) => (next[d.id] = checked));
    setSelected(next);
  };
  const allChecked = filtered.length > 0 && filtered.every((d: any) => selected[d.id]);
  const someChecked = filtered.some((d: any) => selected[d.id]) && !allChecked;

  const bulkDelete = async () => {
  if (!selectedIds.length) return;
  if (!confirm(`Delete ${selectedIds.length} draft${selectedIds.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
  setLoading(true); setErr(null);
  try {
    await Promise.all(selectedIds.map(deleteDraft));
    await refresh();
  } catch (e: any) {
    setErr(e?.message || "Delete failed");
    setLoading(false);
  }
};

  const bulkApprove = async () => {
    if (!selectedIds.length) return;
    setLoading(true); setErr(null);
    try { await publishViaMake(selectedIds); await refresh(); }
    catch (e: any) { setErr(e?.message || "Bulk publish failed"); setLoading(false); }
  };
  const bulkRejectDrafts = async () => {
    if (!selectedIds.length || tab !== "pending") return;
    const reason = prompt("Reject reason?");
    if (!reason) return;
    setLoading(true); setErr(null);
    try { await bulkReject(selectedIds, reason); await refresh(); }
    catch (e: any) { setErr(e?.message || "Bulk reject failed"); setLoading(false); }
  };

  useEffect(() => {
    if (!active) { setDraft(null); return; }
    const s = active.structured || {};
    setDraft({
      hook: s.hook || "", subheading: s.subheading || "",
      bullets: Array.isArray(s.bullets) ? s.bullets : safeJsonParseArray(s.bullets),
      proof: s.proof || "", cta: s.cta || "",
      body_text: active.body_text || "", hashtags: active.hashtags || "",
      scheduled_at: active.scheduled_at || "",
    });
  }, [active]);

  const saveActive = async () => {
    if (!active || !draft) return;
    setSaving(true); setErr(null);
    try {
      const bullets = (draft.bullets || []).filter(Boolean).slice(0, 3);
      await updateDraft(active?.id, {
        body_text: draft.body_text || null, hashtags: draft.hashtags || null,
        structured: { ...(active.structured || {}), hook: draft.hook || null, subheading: draft.subheading || null, bullets: bullets.length ? bullets : null, proof: draft.proof || null, cta: draft.cta || null },
        scheduled_at: draft.scheduled_at ? new Date(draft.scheduled_at).toISOString() : undefined,
      });
      await refresh(); setActive(null);
    } catch (e: any) { setErr(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  async function onUploadMedia(file: File) {
    if (!active) return;
    setUploading(true); setErr(null);
    try {
      const url = await uploadFileToSpaces(file);
      await attachMediaToContentItem(active?.id, { media_type: file.type.startsWith("video/") ? "video" : "image", media_url: url, media_urls: [url], media_provider: "do_spaces" });
      await refresh();
    } catch (e: any) { setErr(e?.message || "Upload failed"); }
    finally { setUploading(false); }
  }

  async function generateBackgroundsHandler() {
    setGeneratingBg(true); setErr(null);
    try {
      const allPrompts = extractImagePrompts(drafts);
      if (!allPrompts.length) { setErr("No image prompts found in drafts."); return; }
      const result = await generateBackgrounds(topicChatId, getRandomPrompts(allPrompts, 3));
      setGeneratedImages(result.images); setBgGenDialogOpen(true);
    } catch (e: any) { setErr(e?.message || "Failed to generate backgrounds"); }
    finally { setGeneratingBg(false); }
  }

  async function saveGeneratedBackground() {
    if (!selectedGeneratedBg.length) return;
    setBgUploading(true); setErr(null);
    try {
      const urls = await Promise.all(selectedGeneratedBg.map(uploadGeneratedBackgroundToSpaces));
      await saveChatBackgrounds({ topic_chat_id: topicChatId, urls });
      setGeneratedImages([]); setSelectedGeneratedBg([]); setBgGenDialogOpen(false); refresh();
    } catch (e: any) { setErr(e?.message || "Failed to save backgrounds"); }
    finally { setBgUploading(false); }
  }

  async function uploadBackgrounds() {
    if (!bgFiles.length) return;
    setBgUploading(true);
    setErr(null);
    try {
      const urls = await Promise.all(bgFiles.map((f) => uploadFileToSpaces(f)));
      await saveChatBackgrounds({ topic_chat_id: topicChatId, urls });
      setBgFiles([]);
      setBgDialogOpen(false);
    } catch (e: any) {
      setErr(e?.message || "Failed to upload backgrounds");
    } finally {
      setBgUploading(false);
    }
  }

  const getSiteUrl = () => {
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
    if (typeof window !== "undefined") return window.location.origin.replace(/\/$/, "");
    return "http://localhost:3000";
  };

  const getShareSlug = () => {
    return (
      chat?.org_slug
    )
  };

  const buildDraftShareUrl = (draftId: string) => {
    const slug = getShareSlug();
    if (!slug) return "";
    return `${getSiteUrl()}/business/${slug}?draftId=${encodeURIComponent(draftId)}`;
  };

  const buildDraftShareText = (item: any) => {
    const hook = item?.structured?.hook || item?.title || item?.body_text || "Check out this post";
    const shortBody = String(item?.body_text || "").replace(/\s+/g, " ").trim().slice(0, 120);
    return [hook, shortBody].filter(Boolean).join(" — ");
  };

  const openShareDialogForDraft = (item: any) => {
    setShareDraft(item);
    setShareDialogOpen(true);
  };

  const copyDraftShareLink = async (draftId: string) => {
    try {
      const url = buildDraftShareUrl(draftId);
      if (!url) throw new Error("Missing business slug for share link");
      await navigator.clipboard.writeText(url);
      setCopiedShareId(draftId);
      setTimeout(() => setCopiedShareId((current) => (current === draftId ? null : current)), 2000);
    } catch (e: any) {
      setErr(e?.message || "Failed to copy share link");
    }
  };

  const openPlatformShare = (platform: "facebook" | "linkedin" | "twitter" | "whatsapp" | "telegram" | "email", item: any) => {
    const url = buildDraftShareUrl(item.id);
    if (!url) {
      setErr("Missing business slug for share link");
      return;
    }

    const text = buildDraftShareText(item);
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    const encodedSubject = encodeURIComponent(item?.structured?.hook || item?.title || "Shared draft");

    const shareMap: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`.trim())}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      email: `mailto:?subject=${encodedSubject}&body=${encodeURIComponent(`${text}

${url}`)}`,
    };

    const target = shareMap[platform];
    if (!target) return;

    if (platform === "email") {
      window.location.href = target;
      return;
    }

    window.open(target, "_blank", "noopener,noreferrer,width=720,height=760");
  };

  const shareDraftNatively = async (item: any) => {
    const url = buildDraftShareUrl(item.id);
    if (!url) {
      setErr("Missing business slug for share link");
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: item?.structured?.hook || item?.title || "Shared draft",
          text: buildDraftShareText(item),
          url,
        });
      } catch {}
      return;
    }

    await copyDraftShareLink(item.id);
  };

  const TAB_CONFIG: { key: TabKey; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "published", label: "Published", count: counts.published },
    { key: "failed", label: "Failed / Rejected", count: counts.failed },
  ];

  // Drafts fed to the image-gen dialog based on current target
  const autoGenDrafts = regenImgTarget === "selected"
    ? drafts.filter((d: any) => selected[d.id])
    : drafts;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');

        .tc-root { font-family: 'Syne', sans-serif; background: #0c0c0f; min-height: 100vh; color: #e4e4e7; }
        .tc-search {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 10px 16px 10px 40px;
          color: #e4e4e7;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          width: 100%;
          transition: border-color 0.2s;
        }
        .tc-search::placeholder { color: rgba(255,255,255,0.2); }
        .tc-search:focus { outline: none; border-color: rgba(139,92,246,0.5); }
        .tc-tab {
          padding: 7px 16px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
          display: flex; align-items: center; gap: 6px;
        }
        .tc-tab.active { background: rgba(139,92,246,0.2); border-color: rgba(139,92,246,0.4); color: #c4b5fd; }
        .tc-tab.inactive { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); }
        .tc-tab.inactive:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.7); }
        .tc-count { background: rgba(255,255,255,0.1); border-radius: 10px; padding: 1px 7px; font-size: 10px; }
        .tc-tab.active .tc-count { background: rgba(139,92,246,0.3); }
        .action-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
        }
        .action-btn-primary { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; }
        .action-btn-primary:hover:not(:disabled) { opacity: 0.85; }
        .action-btn-outline { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); }
        .action-btn-outline:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); }
        .action-btn-danger { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #f87171; }
        .action-btn-danger:hover:not(:disabled) { background: rgba(239,68,68,0.2); }
        .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .select-all-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: rgba(255,255,255,0.35); cursor: pointer; }
        .select-all-row:hover { color: rgba(255,255,255,0.6); }
        .custom-check {
          width: 16px; height: 16px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.15s; cursor: pointer;
        }
        .custom-check.checked { background: #7c3aed; border-color: #7c3aed; }
        .custom-check.indeterminate { background: rgba(139,92,246,0.3); border-color: rgba(139,92,246,0.5); }
        .drawer-field-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 6px; display: block; }
        .drawer-input {
          width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 10px 12px; color: #e4e4e7; font-family: 'DM Mono', monospace;
          font-size: 12px; transition: border-color 0.2s;
        }
        .drawer-input:focus { outline: none; border-color: rgba(139,92,246,0.5); background: rgba(255,255,255,0.07); }
        .drawer-input::placeholder { color: rgba(255,255,255,0.2); }
        .drawer-textarea { resize: none; }
        .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.1); border-top-color: #a78bfa; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .upload-zone {
          border: 2px dashed rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .upload-zone:hover { border-color: rgba(139,92,246,0.4); background: rgba(139,92,246,0.05); }
        .upload-zone input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
      `}</style>

      <div className="tc-root">
        {/* ── TOP HEADER ── */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(12,12,15,0.95)", backdropFilter: "blur(20px)" }}
          className="sticky top-0 z-30 px-6 py-5">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(139,92,246,0.7)" }} className="mb-1">
                  Topic Chat
                </div>
                <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 800, lineHeight: 1.2, color: "#e4e4e7" }} className="truncate">
                  {chat?.topic || "—"}
                </h1>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6, fontFamily: "DM Mono, monospace" }}>
                  {chat?.brand_id} &nbsp;·&nbsp; {chat?.target_month} &nbsp;·&nbsp; {chat?.posts_per_week} posts/wk
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button className="action-btn action-btn-outline" onClick={refresh} disabled={loading}>
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Loading" : "Refresh"}
                </button>

                <button className="action-btn action-btn-outline" onClick={() => setBgDialogOpen(true)}>
                  <Upload className="w-3.5 h-3.5" />
                  Backgrounds
                </button>

                <button className="action-btn action-btn-outline" onClick={generateBackgroundsHandler} disabled={generatingBg || !drafts.length}>
                  {generatingBg ? <span className="spinner" /> : <Wand2 className="w-3.5 h-3.5" />}
                  {generatingBg ? "Generating…" : "AI Backgrounds"}
                </button>

                {/* ── Image generation group ── */}
                <div style={{ display: "flex", gap: 4, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, padding: "3px 4px", alignItems: "center" }}>
                  <button
                    className="action-btn action-btn-primary"
                    style={{ borderRadius: 8 }}
                    onClick={() => setRegenImgTarget("all")}
                    disabled={!drafts.length}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Gen Images
                  </button>
                  {selectedIds.length > 0 && (
                    <button
                      className="action-btn"
                      style={{ borderRadius: 8, background: "rgba(167,139,250,0.2)", border: "1px solid rgba(167,139,250,0.35)", color: "#c4b5fd" }}
                      onClick={() => setRegenImgTarget("selected")}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Selected ({selectedIds.length})
                    </button>
                  )}
                </div>
                {tab === "pending" && selectedIds.length > 0 && (
                  <>
                    <button className="action-btn action-btn-primary" onClick={bulkApprove}>
                      <Check className="w-3.5 h-3.5" />
                      Approve ({selectedIds.length})
                    </button>
                    <button className="action-btn action-btn-danger" onClick={bulkRejectDrafts}>
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </>
                )}
                {tab === "published" && selectedIds.length > 0 && (
                  <button className="action-btn action-btn-primary" onClick={bulkApprove}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Republish ({selectedIds.length})
                  </button>
                )}
              </div>
            </div>

            {err && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginTop: 12, fontSize: 12, color: "#f87171" }}>
                {err}
              </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-2 mt-5 flex-wrap">
              {TAB_CONFIG.map(({ key, label, count }) => (
                <button key={key} className={`tc-tab ${tab === key ? "active" : "inactive"}`} onClick={() => setTab(key)}>
                  {label}
                  <span className="tc-count">{count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Search + select-all */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.2)" }} />
              <input
                className="tc-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search drafts…"
              />
            </div>

            {(tab === "pending" || tab === "published") && filtered.length > 0 && (
              <label className="select-all-row" onClick={() => toggleAll(!allChecked)}>
                <span className={`custom-check ${allChecked ? "checked" : someChecked ? "indeterminate" : ""}`}>
                  {allChecked && <Check className="w-2.5 h-2.5 text-white" />}
                  {someChecked && !allChecked && <span style={{ width: 8, height: 2, background: "#a78bfa", borderRadius: 1 }} />}
                </span>
                {allChecked ? "Deselect all" : "Select all"}
                {selectedIds.length > 0 && <span style={{ color: "#a78bfa", fontWeight: 700 }}>({selectedIds.length} selected)</span>}
              </label>
            )}

            <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>
              {filtered.length} draft{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* ── Selection action bar — appears when drafts are selected ── */}
          {selectedIds.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
              padding: "10px 14px", marginBottom: 14,
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: 14,
              animation: "fadeIn 0.2s ease",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", fontFamily: "DM Mono, monospace", flexShrink: 0 }}>
                {selectedIds.length} selected
              </span>
              <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

              {/* Regen images for selected */}
              <button
                className="action-btn action-btn-primary"
                style={{ borderRadius: 9, padding: "6px 12px" }}
                onClick={() => setRegenImgTarget("selected")}
              >
                <Sparkles className="w-3 h-3" />
                Regen Images ({selectedIds.length})
              </button>

              <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

              {/* Approve / Reject (pending only) */}
              {tab === "pending" && (
                <>
                  <button className="action-btn action-btn-primary" style={{ borderRadius: 9, padding: "6px 12px" }} onClick={bulkApprove}>
                    <Check className="w-3 h-3" />
                    Approve
                  </button>
                  <button className="action-btn action-btn-danger" style={{ borderRadius: 9, padding: "6px 12px" }} onClick={bulkRejectDrafts}>
                    <X className="w-3 h-3" />
                    Reject
                  </button>
                  <button
                    className="action-btn action-btn-danger"
                    style={{ borderRadius: 9, padding: "6px 12px" }}
                    onClick={bulkDelete}
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete ({selectedIds.length})
                  </button>
                </>
              )}
              {tab === "published" && (
                <button className="action-btn action-btn-primary" style={{ borderRadius: 9, padding: "6px 12px" }} onClick={bulkApprove}>
                  <RefreshCw className="w-3 h-3" />
                  Republish
                </button>
              )}

              <button
                onClick={() => setSelected({})}
                style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, fontFamily: "Syne, sans-serif" }}
              >
                <X className="w-3 h-3" />Clear
              </button>
            </div>
          )}

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: "rgba(255,255,255,0.12)" }}>
              <FileText className="w-10 h-10 opacity-30" />
              <p style={{ fontSize: 13, fontWeight: 600 }}>No drafts found</p>
              {q && <p style={{ fontSize: 11 }}>Try clearing your search</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((it) => (
                <DraftCard
                  key={it.id}
                  it={it}
                  chat={chat}
                  selected={!!selected[it.id]}
                  onSelect={(checked) => toggleOne(it.id, checked)}
                  onOpen={() => setActive(it)}
                  showCheckbox={tab === "pending" || tab === "published"}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DRAWER ── */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent side="right" className="p-0 overflow-hidden"
          style={{ width: 520, maxWidth: "95vw", background: "#111115", borderLeft: "1px solid rgba(255,255,255,0.07)", fontFamily: "Syne, sans-serif" }}>
          <div className="h-full overflow-y-auto flex flex-col">
            {/* Drawer header */}
            <div className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between"
              style={{ background: "#111115", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(139,92,246,0.7)" }}>Edit Draft</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e4e4e7", marginTop: 2 }}>
                  {String(active?.platform || "").toUpperCase() || "Draft"}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="action-btn action-btn-outline" onClick={() => active && openShareDialogForDraft(active)}>
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
                <button className="action-btn action-btn-primary" onClick={saveActive} disabled={saving}>
                  {saving ? <span className="spinner" /> : <Check className="w-3.5 h-3.5" />}
                  {saving ? "Saving…" : "Save"}
                </button>
                <button className="action-btn action-btn-outline" onClick={() => setActive(null)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {active && draft && (
              <div className="flex-1 p-4 space-y-4">
                {/* Media */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
                  <span className="drawer-field-label">Media</span>

                  {active?.media_url ? (
                    <div className="space-y-3">
                      <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {String(active.media_type || "").toLowerCase() === "video" || String(active?.media_url).toLowerCase().endsWith(".mp4")
                          ? <video src={active?.media_url} controls className="w-full max-h-52" />
                          : <img src={active?.media_url} className="w-full object-contain max-h-52" />
                        }
                      </div>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", wordBreak: "break-all" }}>{active?.media_url}</p>
                    </div>
                  ) : (
                    <div className="upload-zone">
                      <input type="file" accept="image/*,video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadMedia(f); }} />
                      <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.2)" }} />
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>Drop or click to upload</p>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>JPG, PNG, MP4 · max 100MB</p>
                    </div>
                  )}

                  {active?.media_url && (
                    <div className="mt-3">
                      <label className="upload-zone" style={{ display: "block", cursor: "pointer" }}>
                        <input type="file" accept="image/*,video/*" style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadMedia(f); }} />
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
                          {uploading ? "Uploading…" : "Replace media"}
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    <Link href={`/studio/${topicChatId}?draftId=${active?.id}`}
                      className="action-btn action-btn-outline w-full justify-center"
                      style={{ display: "flex", textDecoration: "none" }}>
                      <VideoIcon className="w-3.5 h-3.5" />
                      Generate Video in Studio
                    </Link>

                    <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(196,181,253,0.8)", marginBottom: 8 }}>
                        Share Draft
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="action-btn action-btn-primary" type="button" onClick={() => openShareDialogForDraft(active)}>
                          <Share2 className="w-3.5 h-3.5" />
                          Share
                        </button>
                        <button className="action-btn action-btn-outline" type="button" onClick={() => copyDraftShareLink(active?.id)}>
                          <Copy className="w-3.5 h-3.5" />
                          {copiedShareId === active?.id ? "Copied" : "Copy Link"}
                        </button>
                        <a
                          href={buildDraftShareUrl(active?.id) || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-btn action-btn-outline"
                          style={{ textDecoration: "none" }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Shared View
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Structured preview */}
                {active.structured && (
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
                    <span className="drawer-field-label">Structured Content</span>
                    <StructuredPost item={active.structured} />
                  </div>
                )}

                {/* Body text */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
                  <span className="drawer-field-label">Body Text</span>
                  <textarea className="drawer-input drawer-textarea" rows={6}
                    value={draft.body_text}
                    onChange={(e) => setDraft({ ...draft, body_text: e.target.value })}
                    placeholder="Enter post caption…"
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px", color: "#e4e4e7", fontFamily: "DM Mono, monospace", fontSize: 12, resize: "none" }}
                  />
                </div>

                {/* Hashtags */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
                  <span className="drawer-field-label">Hashtags</span>
                  <input className="drawer-input" type="text"
                    value={draft.hashtags}
                    onChange={(e) => setDraft({ ...draft, hashtags: e.target.value })}
                    placeholder="#hashtag1 #hashtag2"
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px", color: "#e4e4e7", fontFamily: "DM Mono, monospace", fontSize: 12 }}
                  />
                </div>

                {/* Scheduled */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
                  <span className="drawer-field-label">Scheduled Date</span>
                  <input type="datetime-local"
                    value={draft.scheduled_at ? String(draft.scheduled_at).slice(0, 16) : ""}
                    onChange={(e) => setDraft({ ...draft, scheduled_at: e.target.value })}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px", color: "#e4e4e7", fontFamily: "DM Mono, monospace", fontSize: 12, colorScheme: "dark" }}
                  />
                </div>

                {/* Markdown preview */}
                {active.body_text && (
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 16 }}>
                    <span className="drawer-field-label">Preview</span>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{active.body_text}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Design Studio */}
                {active.structured && (
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 16 }}>
                    <ContentUploadPage
                      background_images={chat?.background_images || []}
                      topicId={topicChatId}
                      activeId={active?.id}
                      structured={active.structured}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "Syne, sans-serif", maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#e4e4e7", fontSize: 16, fontWeight: 700 }}>Share Draft</DialogTitle>
          </DialogHeader>

          {shareDraft && (
            <div className="space-y-4">
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 14 }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(139,92,246,0.7)", marginBottom: 6 }}>Draft Destination</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e4e4e7", marginBottom: 6 }}>
                      /biz/{getShareSlug() || "missing-slug"}?draftId={shareDraft.id}
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                      Social platforms will share the business page URL with the draft panel opened automatically for this draft.
                    </p>
                  </div>
                  <button className="action-btn action-btn-outline" type="button" onClick={() => shareDraftNatively(shareDraft)}>
                    <Share2 className="w-3.5 h-3.5" />
                    Native
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="action-btn action-btn-primary"
                  type="button"
                  onClick={() => openShareDialogForDraft(active)}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>

                <button
                  className="action-btn action-btn-outline"
                  type="button"
                  onClick={() => copyDraftShareLink(active?.id)}
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedShareId === active?.id ? "Copied" : "Copy Link"}
                </button>

                <button
                  className="action-btn action-btn-outline"
                  type="button"
                  onClick={() => copyDraftCaptionForSocial(active)}
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedCaptionId === active?.id ? "Caption Copied" : "Copy Text"}
                </button>

                {active?.media_url && (
                  <button
                    className="action-btn action-btn-outline"
                    type="button"
                    onClick={() => downloadDraftMedia(active)}
                    disabled={downloadingMediaId === active?.id}
                  >
                    {downloadingMediaId === active?.id ? (
                      <span className="spinner" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {downloadingMediaId === active?.id ? "Downloading…" : "Download Image"}
                  </button>
                )}

                <a
                  href={buildDraftShareUrl(active?.id) || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn action-btn-outline"
                  style={{ textDecoration: "none" }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Shared View
                </a>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                {(["facebook", "linkedin", "twitter", "whatsapp", "telegram", "email"] as const).map((platform) => {
                  const meta = SHARE_PLATFORM_META[platform];
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => openPlatformShare(platform, shareDraft)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: `1px solid ${meta.border}`,
                        background: meta.bg,
                        color: meta.color,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      <span>{meta.label}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 12 }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                  Feed-style sharing works for the platforms above using their share dialogs. Instagram and TikTok usually still need manual app posting, so copy link is the fallback for those.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── BACKGROUND UPLOAD DIALOG ── */}
      <Dialog open={bgDialogOpen} onOpenChange={setBgDialogOpen}>
        <DialogContent style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "Syne, sans-serif", maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#e4e4e7", fontSize: 16, fontWeight: 700 }}>Upload Backgrounds</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="upload-zone" style={{ position: "relative" }}>
              <input type="file" accept="image/*" multiple
                onChange={(e) => { if (e.target.files) setBgFiles(Array.from(e.target.files)); }}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
              />
              <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.2)" }} />
              <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>
                {bgFiles.length ? `${bgFiles.length} file${bgFiles.length > 1 ? "s" : ""} selected` : "Click or drop images"}
              </p>
            </div>

            {bgFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {bgFiles.map((f, i) => (
                  <div key={i} style={{ borderRadius: 8, overflow: "hidden", aspectRatio: "1", background: "rgba(255,255,255,0.05)" }}>
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <button className="action-btn action-btn-primary w-full justify-center"
              style={{ width: "100%", justifyContent: "center" }}
              disabled={!bgFiles.length || bgUploading} onClick={uploadBackgrounds}>
              {bgUploading ? <><span className="spinner" />Uploading…</> : <><Upload className="w-3.5 h-3.5" />Upload {bgFiles.length || ""} Image{bgFiles.length !== 1 ? "s" : ""}</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── AI BG GENERATION DIALOG ── */}
      <BackgroundGenerationDialog
        open={bgGenDialogOpen}
        onOpenChange={setBgGenDialogOpen}
        generatedImages={generatedImages}
        selectedImageUrls={selectedGeneratedBg}
        onSelectImage={(url) => setSelectedGeneratedBg((prev) => prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url])}
        onSave={saveGeneratedBackground}
        onRegenerate={generateBackgroundsHandler}
        isLoading={generatingBg}
        isSaving={bgUploading}
        error={err}
      />

      <AutoGenerateImagesDialog
        brandId={chat?.brand_id}
        open={regenImgTarget !== null}
        onOpenChange={(o) => { if (!o) setRegenImgTarget(null); }}
        drafts={autoGenDrafts}
        chat={chat}
        onFinished={() => { setRegenImgTarget(null); refresh(); }}
      />
    </>
  );
}