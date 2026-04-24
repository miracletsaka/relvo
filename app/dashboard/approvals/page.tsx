"use client";

import { useEffect, useMemo, useState } from "react";
import {
  bulkApprove,
  regenerateRejectedText,
  bulkReject,
  getPendingApproval,
  generateMediaViaMake, // ✅ NEW (must exist in lib/api.ts)
  type ContentItem,
  type Platform,
  type ContentType,
  listPlatforms,
  updateContentItem,
  uploadMediaFile,
  attachMediaToContentItem,
  publishViaMake,
} from "@/lib/api";
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import StructuredPost from "@/components/StructuredPost";
import { uploadFileToSpaces } from "@/lib/upload-client";

const TYPES: (ContentType | "all")[] = ["all", "text", "image", "video"];

type ActionDetails = {
  title: string;
  successLine: string;
  skipped?: number;
  skipped_items?: { id: string; status: string; reason: string }[];
};

function monthKey(it: any) {
  const iso = it.scheduled_at || it.created_at;
  if (!iso) return "unscheduled";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unscheduled";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(key: string) {
  if (key === "unscheduled") return "Unscheduled";
  const [y, m] = key.split("-");
  return `${y}-${m}`;
}


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

function getMediaPrimary(it: any): { kind: "image" | "video" | null; url: string | null; thumb: string | null } {
  const mediaType = (it?.media_type || "").toLowerCase();
  const mediaUrl = it?.media_url || null;
  const thumb = it?.thumbnail_url || null;

  const mediaUrls = safeJsonParseArray(it?.media_urls);
  const primary = mediaUrl || mediaUrls[0] || null;

  if (!primary) return { kind: null, url: null, thumb: null };

  if (mediaType === "video") return { kind: "video", url: primary, thumb: thumb || null };
  if (mediaType === "image") return { kind: "image", url: primary, thumb: null };

  const ctype = (it?.content_type || "").toLowerCase();
  if (ctype === "video") return { kind: "video", url: primary, thumb: thumb || null };
  if (ctype === "image") return { kind: "image", url: primary, thumb: null };

  const lower = String(primary).toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.includes("video")) {
    return { kind: "video", url: primary, thumb: thumb || null };
  }
  return { kind: "image", url: primary, thumb: null };
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [platformOptions, setPlatformOptions] = useState<{ id: string; display_name: string }[]>([]);

  // generation UI state
  const [genLoading, setGenLoading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);

  const [genBrand, setGenBrand] = useState("neuroflow-ai");
  const [genType, setGenType] = useState<"all" | "text" | "image" | "video">("text");
  const [genPlatform, setGenPlatform] = useState<"all" | "facebook" | "instagram" | "linkedin">("all");
  const [month, setMonth] = useState<string>("all");
  const [uploading, setUploading] = useState(false);

  // filters
  const [platform, setPlatform] = useState<(Platform | "all")>("all");
  const [ctype, setCtype] = useState<(ContentType | "all")>("all");
  const [q, setQ] = useState("");

  // selection
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  const [msg, setMsg] = useState<string | null>(null);
    const [bridgeLoading, setBridgeLoading] = useState(false);
  
    // UX additions
    const [details, setDetails] = useState<ActionDetails | null>(null);
    const [showDetails, setShowDetails] = useState(false);
  // preview drawer
  const [active, setActive] = useState<any | null>(null);

  // reject modal
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
  (async () => {
    try {
      const p = await listPlatforms(true);
      setPlatformOptions(p);
    } catch {}
  })();
  refresh();
}, []);

const months = useMemo(() => {
  const set = new Set<string>();
  for (const it of items as any[]) set.add(monthKey(it));
  const arr = Array.from(set);
  // sort newest first; keep "unscheduled" last
  arr.sort((a, b) => {
    if (a === "unscheduled") return 1;
    if (b === "unscheduled") return -1;
    return a < b ? 1 : -1;
  });
  return arr;
}, [items]);

const filtered = useMemo(() => {
  return items.filter((it: any) => {
    if (month !== "all" && monthKey(it) !== month) return false;
    if (platform !== "all" && it.platform !== platform) return false;
    if (ctype !== "all" && it.content_type !== ctype) return false;

    const needle = q.trim().toLowerCase();
    if (!needle) return true;

    const hay =
      `${it.id} ${it.topic_id} ${it.platform} ${it.content_type} ${it.status} ${it.body_text ?? ""} ${it.hashtags ?? ""} ${it.media_url ?? ""} ${it.media_caption ?? ""}`.toLowerCase();
    return hay.includes(needle);
  });
}, [items, month, platform, ctype, q]);

  const allChecked = filtered.length > 0 && filtered.every((it: any) => selected[it.id]);
  const someChecked = filtered.some((it: any) => selected[it.id]);

  const toggleAll = (checked: boolean) => {
    const next = { ...selected };
    for (const it of filtered as any[]) next[it.id] = checked;
    setSelected(next);
  };

  const toggleOne = (id: string, checked: boolean) => {

    console.log("toggleOne", id, checked);
    setSelected((prev) => ({ ...prev, [id]: checked }));
  };

  const refresh = async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await getPendingApproval();
      setItems(data as any);
      setSelected({});
      setActive(null);
    } catch (e: any) {
      setErr(e.message || "Failed to load pending approval items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const doBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setErr(null);
    try {
      await bulkApprove(selectedIds);
      await refresh();
    } catch (e: any) {
      setErr(e.message || "Bulk approve failed");
    }
  };

  const openReject = () => {
    setRejectReason("");
    setRejectOpen(true);
  };

  const doReject = async () => {
    if (selectedIds.length === 0) return;
    setErr(null);
    try {
      await bulkReject(selectedIds, rejectReason);
      setRejectOpen(false);
      await refresh();
    } catch (e: any) {
      setErr(e.message || "Bulk reject failed");
    }
  };

  /**
   * ✅ UI triggers generation by calling:
   * POST /media/generate { draft_ids: [...] }
   * This tells Make to generate, then Make calls /media/ingest to attach URLs back.
   */
  const generateMedia = async (ids: string[]) => {
    if (!ids.length) return;
    setErr(null);
    setMediaLoading(true);
    try {
      const res = await generateMediaViaMake(ids);
      await refresh();
      alert(`✅ Sent ${res.generated} item(s) for media generation.`);
    } catch (e: any) {
      setErr(e.message || "Media generation failed");
    } finally {
      setMediaLoading(false);
    }
  };

  const [draft, setDraft] = useState<any | null>(null);

  console.log("draft", draft)

useEffect(() => {
  if (active) {
    setDraft({
      hook: active.structured.hook || "",
      subheading: active.structured.subheading || "",
      bullets: Array.isArray(active.structured.bullets) ? active.structured.bullets : safeJsonParseArray(active.structured.bullets),
      proof: active.structured.proof || "",
      cta: active.structured.cta || "",
      body_text: active.body_text || "",
      hashtags: active.structured.hashtags || "",
      scheduled_at: active.scheduled_at || "",
    });
  } else {
    setDraft(null);
  }
}, [active]);

const saveActive = async () => {
  if (!active || !draft) return;
  setErr(null);

  try {
    await updateContentItem(active.id, {
      hook: draft.hook || null,
      subheading: draft.subheading || null,
      bullets: draft.bullets || null,
      proof: draft.proof || null,
      cta: draft.cta || null,
      body_text: draft.body_text || null,
      hashtags: draft.hashtags || null,
      scheduled_at: draft.scheduled_at ? new Date(draft.scheduled_at).toISOString() : null,
    });

    await refresh();

    // reopen the same item after refresh (optional)
    // simplest: close drawer and user reopens
    setActive(null);
  } catch (e: any) {
    setErr(e.message || "Failed to save edits");
  }
};

async function onUploadMedia(file: File) {
  setUploading(true);
  try {
    const url = await uploadFileToSpaces(file);

    // Save to backend content item (PATCH)
    await attachMediaToContentItem(active.id, {
      media_type: "image",
      media_url: url,
      media_urls: [url],
      media_provider: "do_spaces",
    });

    await refresh();
    alert("✅ Uploaded and attached media.");
  } catch (e: any) {
    setErr(e.message || "Upload failed");
  } finally {
    setUploading(false);
  }
}

console.log("selectedIds", selectedIds);

  const confirmPublished = async () => {

    if (selectedIds.length === 0) {
      setMsg("⚠️ Select at least one QUEUED item to confirm as PUBLISHED.");
      return;
    }

    setBridgeLoading(true);
    try {
      const res = await publishViaMake(selectedIds);

 

      setDetails({
        title: "Confirm Published",
        successLine: `Published: ${res}`,
        skipped: res.skipped,
        skipped_items: res.skipped_items,
      });
      setShowDetails(!!(res.skipped_items && res.skipped_items.length));

    } catch (e: any) {
      setMsg(`❌ ${e.message || "Mark published failed"}`);
    } finally {
      setBridgeLoading(false);
    }
  };

  console.log("active", active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4">
        <div className="w-full md:w-auto">
          <h1 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Approvals</h1>
          <p className="text-gray-400 text-xs">
            Review and bulk approve content items in <b>PENDING_APPROVAL</b> state.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
          <Button className="text-white text-xs" onClick={refresh} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>

          <Button
            className="text-white text-xs"
            onClick={async () => {
              setErr(null);
              setGenLoading(true);
              try {
                const platformFilter = genPlatform === "all" ? undefined : (genPlatform as any);
                const typeFilter = genType === "all" ? undefined : (genType as any);

                const res = await regenerateRejectedText(genBrand, platformFilter, (typeFilter ?? "text") as any);
                await refresh();
                alert(`✅ Regenerated ${res.generated} rejected draft(s).`);
              } catch (e: any) {
                setErr(e.message || "Regenerate rejected failed");
              } finally {
                setGenLoading(false);
              }
            }}
            disabled={loading || genLoading}
          >
            Regenerate Rejected (AI)
          </Button>

          {/* ✅ Media generation */}
          <Button
            className="text-white text-xs bg-indigo-600"
            onClick={() => generateMedia(selectedIds)}
            disabled={loading || mediaLoading || selectedIds.length === 0}
          >
            {mediaLoading ? "Generating Media..." : `Generate Media (Selected ${selectedIds.length})`}
          </Button>

          <Button className="text-white text-xs" onClick={confirmPublished} disabled={selectedIds.length === 0 || loading}>
            Bulk Approve ({selectedIds.length})
          </Button>

          <Button className="text-white text-xs" variant="destructive" onClick={openReject} disabled={selectedIds.length === 0 || loading}>
            Bulk Reject
          </Button>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Month</div>
            <select
              className="w-full bg-white shadow rounded text-gray-400 text-xs font-bold px-3 py-2"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option className="text-black" value="all">All</option>
              {months.map((m) => (
                <option className="text-black" key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Platform</div>
            <select
              className="w-full bg-white shadow rounded text-gray-400 text-xs font-bold px-3 py-2"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as any)}
            >
              <option className="text-black" value="all">All</option>
              {platformOptions.map((p) => (
                <option className="text-black" key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Content Type</div>
            <select
              className="w-full bg-white shadow rounded text-gray-400 text-xs font-bold px-3 py-2"
              value={ctype}
              onChange={(e) => setCtype(e.target.value as any)}
            >
              {TYPES.map((t) => (
                <option className="text-black" key={t} value={t}>
                  {t === "all" ? "All" : t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Search</div>
            <Input
            style={{backgroundColor:"white"}}
              className="w-full bg-white shadow rounded text-gray-400 text-xs font-bold px-3 py-2"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search text / id / hashtags / media url..."
            />
          </div>
        </div>

        {err && <div className="text-sm text-red-600">{err}</div>}

        <div className="rounded overflow-hidden space-y-1 bg-gray-100">
          <div className="grid grid-cols-[40px_120px_120px_140px_120px_1fr_180px_90px] gap-2 p-3 bg-gray-200 text-gray-600 text-sm font-medium">
            <div className="flex items-center justify-center">
              <Checkbox
                checked={allChecked}
                // @ts-ignore
                indeterminate={!allChecked && someChecked}
                onCheckedChange={(v) => toggleAll(Boolean(v))}
              />
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Platform</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Type</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Status</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Media</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Preview</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Created</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">View</div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-gray-600">Loading pending items...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">No items found.</div>
          ) : (
            (filtered as any[]).map((it) => {
              const m = getMediaPrimary(it);

              return (
                <div
                  key={it.id}
                  className="grid grid-cols-[40px_120px_120px_140px_120px_1fr_180px_90px] gap-2 p-3 text-xs shadow bg-white items-center"
                >
                  <div className="flex items-center justify-center">
                    <Checkbox checked={!!selected[it.id]} onCheckedChange={(v) => toggleOne(it.draft_id, Boolean(v))} />
                  </div>

                  <div>
                    <Badge variant="secondary" className="capitalize">
                      {it.platform}
                    </Badge>
                  </div>

                  <div>
                    <Badge className="text-white capitalize">{it.content_type}</Badge>
                  </div>

                  <div>
                    <Badge className="text-white capitalize">{String(it.status).toLowerCase().replaceAll("_", " ")}</Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {!m.kind ? (
                      <span className="text-gray-400">—</span>
                    ) : m.kind === "image" ? (
                      <img
                        src={m.url!}
                        alt="media"
                        className="w-14 h-10 object-cover rounded shadow border"
                        onError={(e) => ((e.currentTarget.style.display = "none"))}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        {m.thumb ? (
                          <img
                            src={m.thumb}
                            alt="thumb"
                            className="w-14 h-10 object-cover rounded shadow border"
                            onError={(e) => ((e.currentTarget.style.display = "none"))}
                          />
                        ) : (
                          <div className="w-14 h-10 rounded border bg-gray-100 flex items-center justify-center text-[10px] text-gray-500">
                            VIDEO
                          </div>
                        )}
                        <Badge variant="outline" className="text-[10px]">Video</Badge>
                      </div>
                    )}
                  </div>

                  <div className="text-gray-400 truncate">
                    {(it.body_text || it.title || it.last_error || it.media_caption || "").slice(0, 120) || "—"}
                  </div>

                  <div className="text-gray-400">{fmtDate(it.created_at)}</div>

                  <div>
                    <Button className="text-white text-xs" size="sm" onClick={() => setActive(it)}>
                      View
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Preview Drawer */}
      <Sheet open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-4 bg-gray-100">
          <SheetHeader>
            <SheetTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Content Preview</SheetTitle>
          </SheetHeader>

          {active && (
            <div className="space-y-4 mt-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary" className="capitalize">{active.platform}</Badge>
                <Badge className="text-white capitalize bg-green-400">{active.content_type}</Badge>
                <Badge className="capitalize text-white">{String(active.status).toLowerCase().replaceAll("_", " ")}</Badge>
              </div>

              {/* ✅ Media preview */}
              {(() => {
                const m = getMediaPrimary(active);
                const mediaUrls = safeJsonParseArray(active?.media_urls);
                const caption = active?.media_caption || "";

                if (!m.kind) return null;

                return (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Generated Media</div>

                    {m.kind === "image" ? (
                      <div className="bg-white shadow rounded p-2">
                        <img src={m.url!} alt="generated" className="w-full rounded object-contain" />
                      </div>
                    ) : (
                      <div className="bg-white shadow rounded p-2 space-y-2">
                        {m.thumb && <img src={m.thumb} className="w-full rounded object-cover" alt="thumb" />}
                        <video src={m.url!} controls className="w-full rounded" />
                      </div>
                    )}

                    <div className="text-xs text-gray-500 break-all">
                      <div><b>media_url:</b> {active.media_url || "—"}</div>
                      {mediaUrls.length > 0 && (
                        <div className="mt-1">
                          <b>media_urls:</b>
                          <ul className="list-disc ml-5">
                            {mediaUrls.map((u, idx) => (
                              <li key={idx} className="break-all">{u}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {caption && <div className="mt-1"><b>media_caption:</b> {caption}</div>}
                    </div>
                  </div>
                );
              })()}
              {/* ✅ Structured Preview */}
              <StructuredPost item={active.structured || {}} />

              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                <div className="font-medium">Content ID</div>
                <div className="text-gray-600 text-xs lowercase break-all">{active.id}</div>
              </div>

              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                <div className="font-medium">Topic ID</div>
                <div className="text-gray-600 text-xs lowercase break-all">{active.topic_id}</div>
              </div>

              {draft && (
                <div className="bg-white shadow rounded p-3 space-y-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Edit (V1)</div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      style={{ backgroundColor: "white" }}
                      className="text-xs"
                      value={draft.hook}
                      onChange={(e) => setDraft((d: any) => ({ ...d, hook: e.target.value }))}
                      placeholder="Hook"
                    />
                    <Input
                      style={{ backgroundColor: "white" }}
                      className="text-xs"
                      value={draft.subheading}
                      onChange={(e) => setDraft((d: any) => ({ ...d, subheading: e.target.value }))}
                      placeholder="Subheading"
                    />
                  </div>

                  <div>
                    <div className="text-[11px] text-gray-500 font-bold mb-1">Bullets (max 3)</div>
                    {[0, 1, 2].map((i) => (
                      <Input
                        key={i}
                        style={{ backgroundColor: "white" }}
                        className="text-xs mb-2"
                        value={draft.bullets?.[i] || ""}
                        onChange={(e) =>
                          setDraft((d: any) => {
                            const next = Array.isArray(d.bullets) ? [...d.bullets] : [];
                            next[i] = e.target.value;
                            return { ...d, bullets: next };
                          })
                        }
                        placeholder={`Bullet ${i + 1}`}
                      />
                    ))}
                  </div>

                  <Input
                    style={{ backgroundColor: "white" }}
                    className="text-xs"
                    value={draft.proof}
                    onChange={(e) => setDraft((d: any) => ({ ...d, proof: e.target.value }))}
                    placeholder="Proof"
                  />

                  <Input
                    style={{ backgroundColor: "white" }}
                    className="text-xs"
                    value={draft.cta}
                    onChange={(e) => setDraft((d: any) => ({ ...d, cta: e.target.value }))}
                    placeholder="CTA"
                  />

                  <div>
                    <div className="text-[11px] text-gray-500 font-bold mb-1">Body Text</div>
                    <textarea
                      className="w-full border text-gray-700 rounded p-2 text-xs"
                      rows={5}
                      value={draft.body_text}
                      onChange={(e) => setDraft((d: any) => ({ ...d, body_text: e.target.value }))}
                    />
                  </div>

                  <Input
                    style={{ backgroundColor: "white" }}
                    className="text-xs"
                    value={draft.hashtags}
                    onChange={(e) => setDraft((d: any) => ({ ...d, hashtags: e.target.value }))}
                    placeholder="#AI #Automation ..."
                  />

                  <div>
                    <div className="text-[11px] text-gray-500 font-bold mb-1">Scheduled At</div>
                    <input
                      type="datetime-local"
                      className="w-full border rounded p-2 text-xs"
                      value={draft.scheduled_at ? draft.scheduled_at.slice(0, 16) : ""}
                      onChange={(e) => setDraft((d: any) => ({ ...d, scheduled_at: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button className="text-white text-xs" onClick={saveActive}>
                      Save Changes
                    </Button>
                    <Button className="text-white text-xs" variant="outline" onClick={() => setDraft(null)}>
                      Reset
                    </Button>
                  </div>
                </div>
              )}


              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Body</div>
                <div className="shadow bg-white text-gray-400 font-bold rounded-md p-3 whitespace-pre-wrap text-sm">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-2 text-sm text-gray-700 last:mb-0 leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-sm text-gray-700">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-gray-900">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic text-gray-700">{children}</em>
                      ),
                      code: ({ children }) =>
          
                          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-blue-600">
                            {children}
                          </code>,
          
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          className="text-blue-600 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      ),
                      h1: ({ children }) => (
                        <h1 className="text-lg font-bold text-gray-900 mb-2 mt-1">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-base font-bold text-gray-900 mb-2 mt-1">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold text-gray-900 mb-1 mt-1">{children}</h3>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-blue-500 pl-3 py-1 my-2 text-gray-600 italic">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                     {active.body_text || "—"}
                  </ReactMarkdown>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Hashtags</div>
                <div className="shadow bg-white text-gray-400 font-bold rounded-md p-3 whitespace-pre-wrap text-sm">
                  {active.hashtags || "—"}
                </div>
              </div>

              {active.last_error && (
                <div className="space-y-1">
                  <div className="font-medium text-sm text-red-700">Last Error</div>
                  <div className="border border-red-200 rounded-md p-3 whitespace-pre-wrap text-sm">
                    {active.last_error}
                  </div>
                </div>
              )}

              <div className="text-sm grid grid-cols-2 gap-3">
                <div>
                  <div className="font-medium">Created</div>
                  <div className="text-gray-600">{fmtDate(active.created_at)}</div>
                </div>
                <div>
                  <div className="font-medium">Updated</div>
                  <div className="text-gray-600">{fmtDate(active.updated_at)}</div>
                </div>
              </div>


                <div className="bg-white shadow rounded p-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Media</div>

                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUploadMedia(f);
                    }}
                  />

                  <Button disabled={uploading} className="text-white text-xs">
                    {uploading ? "Uploading..." : "Upload Media"}
                  </Button>


                  <div className="text-[11px] text-gray-400">
                    Tip: Upload is instant. Generate Media uses Make pipeline.
                  </div>
                </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  className="text-white text-xs"
                  onClick={async () => {
                    try {
                      // add the active item to selectedIds for approval
                      if (!selectedIds.includes(active.id)) {
                        setSelected((prev) => ({ ...prev, [active.id]: true }));
                      }
                      await confirmPublished();
                      await refresh();
                    } catch (e: any) {
                      setErr(e.message || "Approve failed");
                    }
                  }}
                >
                  Approve
                </Button>

                <Button
                  className="text-white text-xs bg-indigo-600"
                  onClick={() => generateMedia([active.id])}
                  disabled={mediaLoading}
                >
                  {mediaLoading ? "Generating..." : "Generate Media (This Item)"}
                </Button>

                <Button className="text-white text-xs" variant="destructive" onClick={openReject}>
                  Reject
                </Button>

                <Button className="text-white text-xs" onClick={() => setActive(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject Modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-gray-100">
          <DialogHeader>
            <DialogTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Reject Content</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              Selected: <b>{selectedIds.length}</b> item(s)
            </div>
            <div className="text-sm font-medium">Reason</div>
            <textarea
              className="w-full border rounded-md p-2"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Example: Caption too generic. Add stronger hook + clear CTA."
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button className="text-white text-xs" onClick={() => setRejectOpen(false)}>
                Cancel
              </Button>
              <Button className="text-white text-xs" variant="destructive" onClick={doReject}>
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
