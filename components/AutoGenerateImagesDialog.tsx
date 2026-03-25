"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TemplateCanvas from "@/components/template-canvas";
import { generateLayoutShapes } from "@/lib/layout-engine";
import {
  buildCampaignDataFromDraft, canvasToFile, pickRandom,
  PORTRAIT_H, PORTRAIT_W, scaleTemplateShapes, waitForNextPaint,
} from "@/lib/design-studio-utils";
import { uploadFileToSpaces } from "@/lib/upload-client";
import { attachMediaToContentItem } from "@/lib/api";
import type { CampaignData, TemplateShape } from "@/lib/types";
import { getTemplates } from "@/lib/template-storage";
import { Check, X, Sparkles, ChevronRight, Image as ImageIcon, AlertCircle, Play, SkipForward } from "lucide-react";
import { listMediaAssets } from "@/lib/studio/media-asset-api";

type StepStatus = "queued" | "running" | "done" | "failed" | "skipped";
type DraftRow = { draft: any; status: StepStatus; message?: string; imageUrl?: string | null; };

const STATUS_CONFIG: Record<StepStatus, { color: string; label: string }> = {
  queued:   { color: "#6b7280", label: "Queued" },
  running:  { color: "#a78bfa", label: "Generating" },
  done:     { color: "#34d399", label: "Done" },
  failed:   { color: "#f87171", label: "Failed" },
  skipped:  { color: "#fbbf24", label: "Skipped" },
};

function StatusBadge({ status }: { status: StepStatus }) {
  const { color, label } = STATUS_CONFIG[status];
  return (
    <span style={{ background: color + "18", border: `1px solid ${color}35`, color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block", ...(status === "running" ? { animation: "autopulse 1s ease-in-out infinite" } : {}) }} />
      {label}
    </span>
  );
}

export default function AutoGenerateImagesDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: any[];
  chat: any | null;
  autoStart?: boolean;
  brandId: string;
  onFinished?: () => Promise<void> | void;
}) {
  const { open, onOpenChange, drafts, chat, autoStart, brandId, onFinished } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [rows, setRows] = useState<DraftRow[]>([]);
  const [running, setRunning] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<any | null>(null);
  const [currentCampaignData, setCurrentCampaignData] = useState<CampaignData | null>(null);
  const [currentShapes, setCurrentShapes] = useState<TemplateShape[]>([]);
  const [currentBg, setCurrentBg] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backgrounds, setBackgrounds] = useState<string[]>([]);

  useEffect(() => {
    if (!brandId) return;
    (async () => {
      try {
        const assets = await listMediaAssets({ type: "image", brand_id: brandId });
        console.log("fetched media assets for brand", brandId, assets);
        setBackgrounds(assets.map(a => a.url).filter(Boolean));
      } catch (e) {
        console.warn("[backgrounds] fetch failed:", e);
      }
    })();
  }, [brandId]);

  useEffect(() => {
    if (!open) return;
    setRows((drafts || []).map((d) => {
      const hasMedia = !!String(d?.media_url || "").trim() || (Array.isArray(d?.media_urls) && d.media_urls.length > 0);
      return { draft: d, status: "queued", message: hasMedia ? "Already has media" : undefined };
    }));
    setError(null);
  }, [open, drafts]);

  useEffect(() => {
    if (!open) return;
    getTemplates(chat?.brand_id)
      .then((data) => setTemplates(Array.isArray(data) ? data : data || []))
      .catch((e: any) => setError(e?.message || "Failed to load templates"));
  }, [open, chat?.brand_id]);

  const autoStartFiredRef = useRef(false);
  useEffect(() => {
    if (!autoStart || !open || running || templates.length === 0 || rows.length === 0) return;
    if (autoStartFiredRef.current) return;
    autoStartFiredRef.current = true;
    const t = setTimeout(() => runBatch(), 120);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, open, templates.length, rows.length]);

  useEffect(() => { if (!open) autoStartFiredRef.current = false; }, [open]);

  const queuedCount  = rows.filter((r) => r.status === "queued").length;
  const doneCount    = rows.filter((r) => r.status === "done").length;
  const failCount    = rows.filter((r) => r.status === "failed").length;
  const skippedCount = rows.filter((r) => r.status === "skipped").length;
  const runningRow   = rows.find((r) => r.status === "running");

  const updateRow = (draftId: string, patch: Partial<DraftRow>) =>
    setRows((prev) => prev.map((r) => (r.draft.id === draftId ? { ...r, ...patch } : r)));

  const prepareShapes = (template: any, campaignData: CampaignData): TemplateShape[] => {
    const tplShapes = (template?.shapes || template?.template_shapes || template?.layout?.shapes) as TemplateShape[] | undefined;
    if (tplShapes?.length) {
      const bW = Number(template?.canvasWidth || template?.width || template?.canvas_width || PORTRAIT_W);
      const bH = Number(template?.canvasHeight || template?.height || template?.canvas_height || PORTRAIT_H);
      return scaleTemplateShapes(tplShapes, bW, bH, PORTRAIT_W, PORTRAIT_H);
    }
    return generateLayoutShapes({ campaignData, canvasWidth: PORTRAIT_W, canvasHeight: PORTRAIT_H }).shapes;
  };

  const runBatch = async () => {
    if (running || !templates.length) return;
    setRunning(true); setError(null);
    try {
      for (const row of rows) {
        if (row.status === "skipped") continue;
        const { draft } = row;
        updateRow(draft.id, { status: "running", message: "Preparing design…" });
        setCurrentDraftId(draft.id);
        try {
          const tpl = pickRandom(templates);
          if (!tpl) throw new Error("No template");
          const bg = pickRandom(backgrounds) || null;
          const campaignData = buildCampaignDataFromDraft(draft);
          const shapes = prepareShapes(tpl, campaignData);
          setCurrentTemplate(tpl);
          setCurrentCampaignData(campaignData);
          setCurrentShapes(shapes);
          setCurrentBg(bg || tpl?.backgroundImage || tpl?.background_image || null);
          updateRow(draft.id, { message: "Rendering…" });
          await waitForNextPaint(3);
          const canvas = canvasRef.current;
          if (!canvas) throw new Error("Canvas not ready");
          updateRow(draft.id, { message: "Exporting…" });
          const file = await canvasToFile(canvas, `${campaignData.companyName || "draft"}-${draft.id}.png`);
          updateRow(draft.id, { message: "Uploading…" });
          const url = await uploadFileToSpaces(file);
          updateRow(draft.id, { message: "Attaching…" });
          await attachMediaToContentItem(draft.id, { media_type: "image", media_url: url, media_urls: [url], media_provider: "do_spaces", media_caption: null });
          updateRow(draft.id, { status: "done", message: "Complete", imageUrl: url });
        } catch (e: any) {
          updateRow(draft.id, { status: "failed", message: e?.message || "Failed" });
        }
      }
      await onFinished?.();
    } finally {
      setRunning(false); setCurrentDraftId(null);
    }
  };

  const progress = rows.length > 0 ? Math.round(((doneCount + failCount + skippedCount) / rows.length) * 100) : 0;

  console.log("media assets for backgrounds:",  backgrounds);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');

        /* ── Dialog shell ── */
        .auto-dialog {
          background: #111115 !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 20px !important;
          font-family: 'Syne', sans-serif;
          color: #e4e4e7;
          /* Responsive: fill screen on mobile, capped on desktop */
          width: min(92vw, 960px) !important;
          max-width: min(92vw, 960px) !important;
          max-height: 92vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* ── Two-column body grid ── */
        .auto-body {
          flex: 1;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr 1.1fr; /* desktop default */
          gap: 16px;
          padding: 20px;
        }

        /* ── Live preview column ── */
        .auto-preview-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 0;
        }

        /* ── Batch progress column ── */
        .auto-batch-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 0;
        }

        .auto-start-btn {
          display: inline-flex; align-items: center; gap: 7px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: white; border: none; border-radius: 11px;
          padding: 10px 20px; font-family: 'Syne', sans-serif;
          font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
          cursor: pointer; transition: opacity 0.15s; white-space: nowrap;
        }
        .auto-start-btn:hover:not(:disabled) { opacity: 0.85; }
        .auto-start-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .progress-bar { height: 3px; background: rgba(255,255,255,0.07); border-radius: 2px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, #7c3aed, #4f46e5); transition: width 0.4s ease; }

        .row-item { border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); transition: background 0.15s; }
        .row-item.running { background: rgba(139,92,246,0.07); border-color: rgba(139,92,246,0.2); }
        .row-item.done    { background: rgba(52,211,153,0.05);  border-color: rgba(52,211,153,0.12); }
        .row-item.failed  { background: rgba(248,113,113,0.05); border-color: rgba(248,113,113,0.12); }

        .close-btn {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5); border-radius: 8px; padding: 6px 12px;
          font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
          display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;
        }
        .close-btn:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }

        .spinner-sm {
          width: 12px; height: 12px; flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.1); border-top-color: #a78bfa;
          border-radius: 50%; animation: autopulse-spin 0.6s linear infinite;
          display: inline-block;
        }

        .auto-stats { display: flex; gap: 12px; flex-wrap: wrap; }

        @keyframes autopulse-spin { to { transform: rotate(360deg); } }
        @keyframes autopulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

        /* ── Mobile: stack to single column, hide live preview ── */
        @media (max-width: 640px) {
          .auto-dialog {
            border-radius: 16px !important;
            max-height: 96vh;
          }
          .auto-body {
            grid-template-columns: 1fr;   /* single column */
            overflow-y: auto;
            padding: 12px;
            gap: 12px;
          }
          /* Hide the live preview panel on mobile — canvas still renders
             off-screen for image generation, preview just not shown */
          .auto-preview-col { display: none; }
          .auto-batch-col { overflow: visible; min-height: unset; }
          .auto-stats { gap: 8px; }
          .auto-start-btn { padding: 9px 14px; font-size: 11px; }
        }
      `}</style>

      <Dialog open={open} onOpenChange={(v) => !running && onOpenChange(v)}>
        <DialogContent className="auto-dialog">
          <DialogHeader style={{ padding: "16px 20px 0", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <DialogTitle style={{ fontSize: 15, fontWeight: 800, color: "#e4e4e7", fontFamily: "Syne, sans-serif" }}>
                    Auto Generate Images
                  </DialogTitle>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
                    Renders each draft with a random template + background
                  </p>
                </div>
              </div>
              <button className="close-btn" onClick={() => !running && onOpenChange(false)} disabled={running}>
                <X className="w-3 h-3" />Close
              </button>
            </div>
          </DialogHeader>

          <div className="auto-body">

            {/* ── LEFT: Live Preview — hidden on mobile via CSS ── */}
            <div className="auto-preview-col">
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
                Live Preview
              </div>
              <div style={{ flex: 1, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#0c0c0f", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
                {currentTemplate && currentCampaignData ? (
                  <TemplateCanvas
                    ref={canvasRef}
                    zoom={1} setZoom={() => {}} pan={{ x: 0, y: 0 }} setPan={() => {}}
                    backgroundImage={currentBg}
                    logoUrl={currentTemplate?.logoPlacement?.url}
                    campaignData={currentCampaignData}
                    selectedShapeId={null} onShapeSelect={() => {}}
                    shapes={currentShapes}
                    canvasWidth={PORTRAIT_W} canvasHeight={PORTRAIT_H}
                    isEditable={false}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.15)" }}>
                    <ImageIcon className="w-10 h-10" style={{ opacity: 0.2 }} />
                    <p style={{ fontSize: 12, fontWeight: 600 }}>Preview will appear here</p>
                  </div>
                )}
              </div>
              {currentDraftId && (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="spinner-sm" />
                  {runningRow?.message || "Processing…"} — <span style={{ color: "#a78bfa" }}>{currentDraftId.slice(0, 16)}…</span>
                </div>
              )}
            </div>

            {/* ── RIGHT: Batch Progress ── */}
            <div className="auto-batch-col">

              {/* Stats + start */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div className="auto-stats">
                  {[
                    { label: "Queued",  val: queuedCount,  color: "#6b7280" },
                    { label: "Done",    val: doneCount,    color: "#34d399" },
                    { label: "Failed",  val: failCount,    color: "#f87171" },
                    { label: "Skipped", val: skippedCount, color: "#fbbf24" },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color }}>{val}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
                    </div>
                  ))}
                </div>
                <button className="auto-start-btn" onClick={runBatch} disabled={running || !templates.length || queuedCount === 0}>
                  {running ? <><span className="spinner-sm" />Generating…</> : <><Play className="w-3.5 h-3.5 fill-white" />Start</>}
                </button>
              </div>

              {/* Progress bar */}
              {rows.length > 0 && (
                <div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>
                    <span>{progress}% complete</span>
                    <span>{doneCount + failCount + skippedCount} / {rows.length}</span>
                  </div>
                </div>
              )}

              {/* Running status — visible on mobile since preview is hidden */}
              {currentDraftId && (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "rgba(139,92,246,0.07)", borderRadius: 8, border: "1px solid rgba(139,92,246,0.15)" }}>
                  <span className="spinner-sm" />
                  {runningRow?.message || "Processing…"}
                </div>
              )}

              {error && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "8px 12px", fontSize: 11, color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
                </div>
              )}

              {!templates.length && !error && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "8px 12px", border: "1px solid rgba(255,255,255,0.06)" }}>
                  No templates found for brand. Add templates to start generating.
                </div>
              )}

              {/* Draft list */}
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, maxHeight: 360 }}>
                {rows.map((row) => (
                  <div key={row.draft.id} className={`row-item ${row.status}`} style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.05)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {row.imageUrl
                        ? <img src={row.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : row.status === "running"  ? <span className="spinner-sm" />
                        : row.status === "done"     ? <Check className="w-4 h-4" style={{ color: "#34d399" }} />
                        : row.status === "failed"   ? <X className="w-4 h-4" style={{ color: "#f87171" }} />
                        : row.status === "skipped"  ? <SkipForward className="w-4 h-4" style={{ color: "#fbbf24" }} />
                        : <ImageIcon className="w-4 h-4" style={{ color: "rgba(255,255,255,0.2)" }} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "DM Mono, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.draft.id.slice(0, 20)}…
                        </span>
                        <StatusBadge status={row.status} />
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.message || row.draft?.structured?.hook || row.draft?.body_text || "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Off-screen canvas for image generation — always mounted when active */}
              <div style={{ position: "absolute", left: -9999, top: -9999, pointerEvents: "none", opacity: 0 }}>
                {currentTemplate && currentCampaignData && (
                  <TemplateCanvas
                    ref={canvasRef}
                    zoom={1} setZoom={() => {}} pan={{ x: 0, y: 0 }} setPan={() => {}}
                    backgroundImage={currentBg}
                    logoUrl={currentTemplate?.logoPlacement?.url}
                    campaignData={currentCampaignData}
                    selectedShapeId={null} onShapeSelect={() => {}}
                    shapes={currentShapes}
                    canvasWidth={PORTRAIT_W} canvasHeight={PORTRAIT_H}
                    isEditable={false}
                  />
                )}
              </div>

            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}