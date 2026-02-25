"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import StructuredPost from "@/components/StructuredPost";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  getTopicChat,
  listTopicChatDrafts,
  updateDraft,
  publishViaMake,
  bulkReject,
  attachMediaToContentItem,
  saveChatBackgrounds,
  generateBackgrounds,
} from "@/lib/api";

import { uploadFileToSpaces, uploadGeneratedBackgroundToSpaces } from "@/lib/upload-client";
import ContentUploadPage from "@/components/ContentUploadPage";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackgroundGenerationDialog } from "@/components/BackgroundGenerationDialog";
import { extractImagePrompts, getRandomPrompts, generateFinalPrompts } from "@/lib/prompt-utils";

/* ---------------- utils ---------------- */

function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function safeJsonParseArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      if (v.includes(",")) return v.split(",").map((x) => x.trim()).filter(Boolean);
    }
  }
  return [];
}

function normStatus(s: any) {
  return String(s || "").toUpperCase().trim();
}

/**
 * Tab mapping:
 * - pending: anything not published/failed/rejected goes here IF you want
 *   but we will keep it strict as "PENDING_APPROVAL" only (safest UX)
 * - published: PUBLISHED
 * - failed: FAILED + REJECTED (you can adjust)
 */
type TabKey = "pending" | "published" | "failed";

function tabForDraft(d: any): TabKey {
  const st = normStatus(d?.status);

  if (st === "PUBLISHED") return "published";
  if (st === "FAILED" || st === "REJECTED") return "failed";

  // safest: only show true pending here
  // if you want also APPROVED/SCHEDULED in pending tab, add them here.
  return "pending";
}

function normalizeStatus(s: any) {
  return String(s || "").toUpperCase().trim();
}

function normalizePlatform(p: any) {
  const x = String(p || "").toLowerCase().trim();
  return x || "unknown";
}

function parseMediaUrls(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      // ignore
    }
  }
  return [];
}

function draftType(d: any): "text" | "image" | "video" {
  const mt = String(d?.media_type || "").toLowerCase().trim();
  if (mt === "video") return "video";
  if (mt === "image") return "image";

  const url = String(d?.media_url || "").toLowerCase();
  if (url.endsWith(".mp4") || url.includes("video")) return "video";
  if (url) return "image";

  const urls = parseMediaUrls(d?.media_urls);
  if (urls.length) {
    const u0 = String(urls[0]).toLowerCase();
    if (u0.endsWith(".mp4") || u0.includes("video")) return "video";
    return "image";
  }

  return "text";
}

function firstMediaUrl(d: any): string | null {
  // prefer thumbnail for video if present
  const thumb = String(d?.thumbnail_url || "").trim();
  if (thumb) return thumb;

  const mu = String(d?.media_url || "").trim();
  if (mu) return mu;

  const arr = parseMediaUrls(d?.media_urls);
  return arr[0] || null;
}

/* ---------------- page ---------------- */

export default function TopicChatDetailPage() {
  const params = useParams();
  const topicChatId = String((params as any)?.topicChatId || "");
  const [bgDialogOpen, setBgDialogOpen] = useState(false)
  const [bgFiles, setBgFiles] = useState<File[]>([])
  const [bgUploading, setBgUploading] = useState(false)
  const [bgLibrary, setBgLibrary] = useState<any[]>([])

  // AI Background Generation State
  const [generatingBg, setGeneratingBg] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<Array<{url: string; prompt: string; generatedAt: string}>>([])
  const [bgGenDialogOpen, setBgGenDialogOpen] = useState(false)
  const [selectedGeneratedBg, setSelectedGeneratedBg] = useState<string[]>([])
  const [bgPromptSelectorOpen, setBgPromptSelectorOpen] = useState(false)
  const [randomPrompt, setRandomPrompt] = useState<string>("")
  const [selectedUserPrompts, setSelectedUserPrompts] = useState<string[]>([])

  const [chat, setChat] = useState<any | null>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectBackground, setSelectBackground] = useState<(url: string) => void>(() => () => {});
  const [tab, setTab] = useState<TabKey>("pending");

  /* selection */
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );

  /* drawer */
  const [active, setActive] = useState<any | null>(null);
  const [draft, setDraft] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  /* search */
  const [q, setQ] = useState("");

  /* ---------------- data ---------------- */

  const refresh = async () => {
    setLoading(true);
    setErr(null);
    try {
      const c = await getTopicChat(topicChatId);
      const ds = await listTopicChatDrafts(topicChatId);

      setChat(c);
      setDrafts(ds);
      setSelected({});
      setActive(null);
    } catch (e: any) {
      setErr(e?.message || "Failed to load topic chat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!topicChatId) return;
    refresh();
  }, [topicChatId]);

  /* ---------------- tab + filtering ---------------- */

  const draftsByTab = useMemo(() => {
    const grouped: Record<TabKey, any[]> = { pending: [], published: [], failed: [] };
    for (const d of drafts) grouped[tabForDraft(d)].push(d);
    return grouped;
  }, [drafts]);

  // reset selection whenever tab changes (prevents cross-tab selection)
  useEffect(() => {
    setSelected({});
  }, [tab]);


  const filtered = useMemo(() => {
    const base = draftsByTab[tab] || [];
    const needle = q.trim().toLowerCase();
    if (!needle) return base;

    return base.filter((d: any) => {
      const hay = `${d.id} ${d.platform} ${d.status} ${d.body_text || ""} ${d.hashtags || ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [draftsByTab, tab, q]);

  const counts = useMemo(() => {
    return {
      pending: draftsByTab.pending.length,
      published: draftsByTab.published.length,
      failed: draftsByTab.failed.length,
    };
  }, [draftsByTab]);

  /* ---------------- selection helpers ---------------- */

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  };

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    filtered.forEach((d: any) => (next[d.id] = checked));
    setSelected(next);
  };

  const allChecked =
    filtered.length > 0 && filtered.every((d: any) => selected[d.id]);
  const someChecked =
    filtered.some((d: any) => selected[d.id]) && !allChecked;

  /* ---------------- bulk actions ---------------- */

  const bulkApprove = async () => {
    if (!selectedIds.length) return;


    setLoading(true);
    setErr(null);
    try {
      await publishViaMake(selectedIds); // hits /make/publish → Make
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Bulk publish failed");
    } finally {
      setLoading(false);
    }
  };

  const bulkRejectDrafts = async () => {
    if (!selectedIds.length) return;

    if (tab !== "pending") {
      alert("✅ Reject is only available in Pending tab.");
      return;
    }

    const reason = prompt("Reject reason?");
    if (!reason) return;

    setLoading(true);
    setErr(null);
    try {
      await bulkReject(selectedIds, reason);
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Bulk reject failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- drawer edit ---------------- */

  useEffect(() => {
    if (!active) {
      setDraft(null);
      return;
    }
    const s = active.structured || {};
    setDraft({
      hook: s.hook || "",
      subheading: s.subheading || "",
      bullets: Array.isArray(s.bullets) ? s.bullets : safeJsonParseArray(s.bullets),
      proof: s.proof || "",
      cta: s.cta || "",
      body_text: active.body_text || "",
      hashtags: active.hashtags || "",
      scheduled_at: active.scheduled_at || "",
    });
  }, [active]);

  const saveActive = async () => {
    if (!active || !draft) return;
    setSaving(true);
    setErr(null);

    try {
      const bullets = (draft.bullets || []).filter(Boolean).slice(0, 3);

      await updateDraft(active.id, {
        body_text: draft.body_text || null,
        hashtags: draft.hashtags || null,
        structured: {
          ...(active.structured || {}),
          hook: draft.hook || null,
          subheading: draft.subheading || null,
          bullets: bullets.length ? bullets : null,
          proof: draft.proof || null,
          cta: draft.cta || null,
        },
        scheduled_at: draft.scheduled_at ? new Date(draft.scheduled_at).toISOString() : undefined,
      });

      await refresh();
      setActive(null);
    } catch (e: any) {
      setErr(e?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- media upload ---------------- */

  async function onUploadMedia(file: File) {
    if (!active) return;

    setUploading(true);
    setErr(null);

    try {
      const url = await uploadFileToSpaces(file);
      const isVideo = file.type.startsWith("video/");
      const media_type = isVideo ? "video" : "image";

      // same endpoint works for drafts due to your backwards compatible router
      await attachMediaToContentItem(active.id, {
        media_type,
        media_url: url,
        media_urls: [url],
        media_provider: "do_spaces",
      });

      await refresh();
      alert("✅ Uploaded and attached media to draft.");
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  /* ---------------- render ---------------- */

  const tabLabel = (k: TabKey) => {
    if (k === "pending") return "Pending";
    if (k === "published") return "Published";
    return "Failed";
  };

  /* ---------------- AI Background Generation ---------------- */

  async function generateBackgroundsHandler() {
    setGeneratingBg(true)
    setErr(null)
    try {
      const allPrompts = extractImagePrompts(drafts)
      
      if (!allPrompts.length) {
        setErr("No image prompts found in drafts. Add image_prompt to your draft structured data.")
        setGeneratingBg(false)
        return
      }

      // For MVP: get 3 random prompts
      const selectedPrompts = getRandomPrompts(allPrompts, 3)

      const result = await generateBackgrounds(topicChatId, selectedPrompts)
      setGeneratedImages(result.images)
      setBgGenDialogOpen(true)
    } catch (e: any) {
      setErr(e?.message || "Failed to generate backgrounds")
    } finally {
      setGeneratingBg(false)
    }
  }

  async function saveGeneratedBackground() {
  if (selectedGeneratedBg.length === 0) return

  setBgUploading(true)
  setErr(null)
  try {
    console.log(`[v0] Starting upload of ${selectedGeneratedBg.length} backgrounds...`)
    
    // Upload all selected images to Digital Ocean Spaces
    const uploadPromises = selectedGeneratedBg.map(bgUrl => 
      uploadGeneratedBackgroundToSpaces(bgUrl)
    )
    const urls = await Promise.all(uploadPromises)
    console.log("[v0] All backgrounds uploaded to DO Spaces:", urls)

    // Save all to chat backgrounds
    console.log("[v0] Saving background URLs to chat...")
    await saveChatBackgrounds({
      topic_chat_id: topicChatId,
      urls: urls,
    })

    console.log("[v0] Backgrounds saved successfully, reloading...")
    setGeneratedImages([])
    setSelectedGeneratedBg([])
    setBgGenDialogOpen(false)
    alert(`✅ ${urls.length} background(s) saved successfully!`)
    refresh()
  } catch (e: any) {
    console.error("[v0] Error saving backgrounds:", e)
    setErr(e?.message || "Failed to save backgrounds")
  } finally {
    setBgUploading(false)
  }
}

  async function uploadBackgrounds() {
    setBgUploading(true)
    try {
      // 1. upload all files to Spaces
      const urls = await Promise.all(
        bgFiles.map(file => uploadFileToSpaces(file))
      )

     await saveChatBackgrounds({
      topic_chat_id: topicChatId,
      urls,
    })
      setBgFiles([])
    } finally {
      setBgUploading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="lg:sticky lg:top-0 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-start gap-6">
            <div className="flex-1">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Topic Chat Management
              </div>
              <h1 className="text-4xl line-clamp-2 md:text-5xl font-bold mt-2 text-foreground">
                {chat?.topic || "—"}
              </h1>
              <div className="text-sm text-muted-foreground mt-3 space-y-1">
                <div>
                  Brand{" "}
                  <span className="font-semibold text-foreground">{chat?.brand_id}</span> • Month{" "}
                  <span className="font-semibold text-foreground">{chat?.target_month}</span> •{" "}
                  <span className="font-semibold text-foreground">{chat?.posts_per_week}</span>{" "}
                  posts/week
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                className="text-xs bg-primary hover:bg-primary/90 rounded-full"
                onClick={refresh}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Refresh"}
              </Button>

              {/* bulk actions only in Pending tab */}
              {tab === "pending" && (
                <>
                  <Button
                    className="text-xs bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full disabled:opacity-50"
                    disabled={!selectedIds.length}
                    onClick={bulkApprove}
                  >
                    Approve ({selectedIds.length})
                  </Button>
                  <Button
                    variant="destructive"
                    className="text-xs rounded-full"
                    disabled={!selectedIds.length}
                    onClick={bulkRejectDrafts}
                  >
                    Reject
                  </Button>
                </>
              )}
              {tab === "published" && (
                <Button
                  className="text-xs bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full disabled:opacity-50"
                  disabled={!selectedIds.length}
                  onClick={bulkApprove}
                >
                  Republish ({selectedIds.length})
                </Button>
              )}
            </div>
          </div>

          {err && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {err}
            </div>
          )}

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap gap-2">
            {(["pending", "published", "failed"] as TabKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={[
                  "px-4 py-2 rounded-full text-xs font-bold border transition",
                  tab === k
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background border-border text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {tabLabel(k)}{" "}
                <span className="ml-2 px-2 py-0.5 rounded-full bg-muted text-foreground">
                  {k === "pending" ? counts.pending : k === "published" ? counts.published : counts.failed}
                </span>
              </button>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBgDialogOpen(true)}
            >
              Upload Backgrounds
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={generateBackgroundsHandler}
              disabled={generatingBg || drafts.length === 0}
            >
              {generatingBg ? "Generating..." : "Generate with AI"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={bgDialogOpen} onOpenChange={setBgDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Background Library</DialogTitle>
          </DialogHeader>

          {/* Upload */}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              if (!e.target.files) return
              setBgFiles(Array.from(e.target.files))
            }}
          />

          <Button
            disabled={!bgFiles.length || bgUploading}
            onClick={uploadBackgrounds}
          >
            {bgUploading ? "Uploading..." : `Upload ${bgFiles.length} images`}
          </Button>

          {/* Existing backgrounds */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            {bgLibrary.map(bg => (
              <div
                key={bg.id}
                className={`border rounded cursor-pointer hover:ring-2`}
                onClick={() => selectBackground(bg.image_url)}
              >
                <img
                  src={bg.image_url}
                  className="w-full h-24 object-cover rounded"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Background Generation Dialog */}
      <BackgroundGenerationDialog
        open={bgGenDialogOpen}
        onOpenChange={setBgGenDialogOpen}
        generatedImages={generatedImages}
        selectedImageUrls={selectedGeneratedBg}  // Changed prop name
        onSelectImage={(url) => {
          // Toggle selection
          setSelectedGeneratedBg(prev => 
            prev.includes(url) 
              ? prev.filter(u => u !== url)  // Remove if already selected
              : [...prev, url]                // Add if not selected
          )
        }}
        onSave={saveGeneratedBackground}
        onRegenerate={generateBackgroundsHandler}
        isLoading={generatingBg}
        isSaving={bgUploading}
        error={err}
      />

      {/* Main */}
      {/* Drafts Grid (Library-style layout) */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="">
              <Input
                className="text-sm bg-card border-border rounded-full h-12 pl-12 pr-4"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search drafts by ID, platform, status, or text…"
              />
              <svg
                className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Pending tab selection header */}
          {tab === "pending" && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => el && (el.indeterminate = someChecked)}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="rounded border-border"
                />
                <span>Select all</span>
                {selectedIds.length > 0 && (
                  <span className="ml-2 text-foreground font-semibold">
                    ({selectedIds.length} selected)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Cards */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-muted-foreground text-sm">No drafts found</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {filtered.map((it) => {
                const st = normalizeStatus(it.status);
                const pf = normalizePlatform(it.platform);
                const type = draftType(it);
                const media = firstMediaUrl(it);

                return (
                  <Card
                    key={it.id}
                    className="p-3 bg-white shadow rounded cursor-pointer hover:shadow-md transition"
                    onClick={() => setActive(it)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        {/* top row badges */}
                        <div className="flex gap-2 flex-wrap items-center">
                          {/* selection only for pending */}
                          {tab === "pending" && (
                            <input
                              type="checkbox"
                              checked={!!selected[it.id]}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleOne(it.id, e.target.checked);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-border"
                            />
                          )}
                          {tab === "published" && (
                            <input
                              type="checkbox"
                              checked={!!selected[it.id]}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleOne(it.id, e.target.checked);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-border"
                            />
                          )}

                          <Badge variant="secondary" className="bg-green-500 text-white capitalize">
                            {pf}
                          </Badge>

                          <Badge className="bg-yellow-500 text-gray-50 shadow capitalize">
                            {type === "text" ? (
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" /> text
                              </span>
                            ) : type === "image" ? (
                              <span className="flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> image
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <VideoIcon className="w-3 h-3" /> video
                              </span>
                            )}
                          </Badge>

                          <Badge className="capitalize bg-blue-500 text-white">
                            {st.toLowerCase().replaceAll("_", " ")}
                          </Badge>

                          {/* chat context chips (comes from chat, not draft) */}
                          <Badge className="bg-white border text-gray-600">
                            {chat?.target_month} • {chat?.posts_per_week}/wk
                          </Badge>
                        </div>

                        {/* topic */}
                        <div className="text-xs font-bold text-slate-700 truncate">
                          {chat?.topic || "—"}
                        </div>

                        {/* preview */}
                        <div className="text-xs text-gray-500 truncate">
                          {(it.body_text || it.hashtags || it.last_error || "").slice(0, 140) || "—"}
                        </div>

                        {/* meta */}
                        <div className="text-[11px] text-gray-400 font-bold">
                          Scheduled: {fmtDate(it.scheduled_at)} • Updated: {fmtDate(it.updated_at)}
                        </div>
                      </div>

                      {/* thumbnail */}
                      <div className="shrink-0">
                        {media ? (
                          type === "video" && !it.thumbnail_url ? (
                            <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center text-gray-500">
                              <VideoIcon className="w-5 h-5" />
                            </div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={media}
                              alt="media"
                              className="w-16 h-16 rounded object-cover border"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActive(it);
                              }}
                            />
                          )
                        ) : (
                          <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>


      {/* Drawer */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent side="right" className="sm:max-w-2xl bg-gray-100 border-l border-gray-200 p-0">
          <div className="h-full overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white shadow-sm border-b border-gray-200 p-6 z-50">
              <SheetHeader>
                <SheetTitle className="text-2xl font-bold text-gray-900">Draft Editor</SheetTitle>
              </SheetHeader>
            </div>

            {/* Media Section */}
            <div className="p-1">
              <div className="bg-white shadow-sm  p-5 space-y-4">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Media</div>

                <div className="space-y-1">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUploadMedia(f);
                    }}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file: file:border-0 file:text-sm file:font-medium file:bg-gray-900 file:text-white hover:file:bg-gray-800 file:cursor-pointer"
                  />

                  <Button disabled={uploading} className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                    {uploading ? "Uploading..." : "Upload Media"}
                  </Button>
                </div>

                {active?.media_url ? (
                  <div className="mt-4 space-y-2">
                    <div className=" overflow-hidden border border-gray-200">
                      {(String(active.media_type || "").toLowerCase() === "video" ||
                        String(active.media_url).toLowerCase().endsWith(".mp4")) ? (
                        <video src={active.media_url} controls className="w-full" />
                      ) : (
                        <img src={active.media_url} className="w-full object-contain max-h-64" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 break-all bg-gray-50 rounded p-2">
                      <span className="font-semibold">URL:</span> {active.media_url}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 ">
                    No media attached yet
                  </div>
                )}
              </div>
            </div>

            {/* Editor */}
            {active && draft && (
              <div className="px-1 pb-1 space-y-1">
                {/* Structured Content */}
                <div className="bg-white shadow-sm  p-5 space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Structured Content
                  </label>
                  <StructuredPost item={active.structured || {}} />
                </div>

                {/* Body Text */}
                <div className="bg-white shadow-sm  p-5 space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Body Text
                  </label>
                  <textarea
                    className="w-full text-sm p-4 border border-gray-200 bg-white  focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none transition-all"
                    rows={6}
                    value={draft.body_text}
                    onChange={(e) => setDraft({ ...draft, body_text: e.target.value })}
                    placeholder="Enter your draft text here…"
                  />
                </div>

                {/* Hashtags */}
                <div className="bg-white shadow-sm  p-5 space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Hashtags
                  </label>
                  <Input
                    className="text-sm bg-white border-gray-200  focus:ring-2 focus:ring-gray-900"
                    value={draft.hashtags}
                    onChange={(e) => setDraft({ ...draft, hashtags: e.target.value })}
                    placeholder="#hashtag1 #hashtag2"
                  />
                </div>

                {/* Scheduled Date */}
                <div className="bg-white shadow-sm  p-5 space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Scheduled Date
                  </label>
                  <Input
                    type="datetime-local"
                    className="text-sm bg-white border-gray-200  focus:ring-2 focus:ring-gray-900"
                    value={draft.scheduled_at ? String(draft.scheduled_at).slice(0, 16) : ""}
                    onChange={(e) => setDraft({ ...draft, scheduled_at: e.target.value })}
                  />
                </div>

                {/* Action Buttons */}
                <div className="bg-white shadow-sm  p-5">
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-gray-900 hover:bg-gray-800 text-white  h-11 font-medium"
                      onClick={saveActive}
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-gray-300 hover:bg-gray-50  h-11 font-medium"
                      onClick={() => setActive(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>

                {/* Rendered markdown preview */}
                <div className="bg-white shadow-sm  p-5 space-y-3">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Body Preview
                  </div>
                  <div className="bg-gray-50  p-4 text-sm prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {active.body_text || "—"}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Design studio hook */}
            {active?.structured && (
              <div className="px-1 pb-1">
                <div className="bg-white shadow-sm  p-5">
                  <ContentUploadPage
                    background_images={chat.background_images || []}
                    topicId={topicChatId}
                    activeId={active.id}
                    structured={active.structured}
                  />
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
