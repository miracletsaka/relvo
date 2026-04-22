"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TemplateCanvas from "@/components/template-canvas";
import { generateLayoutShapes } from "@/lib/layout-engine";
import {
  buildCampaignDataFromDraft,
  canvasToFile,
  PORTRAIT_H,
  PORTRAIT_W,
  scaleTemplateShapes,
  waitForNextPaint,
} from "@/lib/design-studio-utils";
import { uploadFileToSpaces } from "@/lib/upload-client";
import { attachMediaToContentItem } from "@/lib/api";
import type { AITemplateDecision, CampaignData, TemplateShape } from "@/lib/types";
import { getRandomTemplate } from "@/lib/template-storage";
import {
  Check,
  X,
  Sparkles,
  Image as ImageIcon,
  AlertCircle,
  Play,
  SkipForward,
  RefreshCcw,
} from "lucide-react";
import { listMediaAssets, type MediaAsset } from "@/lib/studio/media-asset-api";
import { resolveTemplateSlots } from "@/lib/resolve-template-slots";
import {
  fetchOrgCampaignData,
  enrichCampaignData,
  type OrgCampaignData,
} from "@/lib/org-campaign-enricher";

type StepStatus = "queued" | "running" | "done" | "failed" | "skipped";

type DraftRow = {
  draft: any;
  status: StepStatus;
  message?: string;
  imageUrl?: string | null;
};

const STATUS_CONFIG: Record<StepStatus, { color: string; label: string }> = {
  queued: { color: "#6b7280", label: "Queued" },
  running: { color: "#a78bfa", label: "Generating" },
  done: { color: "#34d399", label: "Done" },
  failed: { color: "#f87171", label: "Failed" },
  skipped: { color: "#fbbf24", label: "Skipped" },
};

function StatusBadge({ status }: { status: StepStatus }) {
  const { color, label } = STATUS_CONFIG[status];
  return (
    <span
      style={{
        background: color + "18",
        border: `1px solid ${color}35`,
        color,
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 20,
        letterSpacing: "0.06em",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          ...(status === "running" ? { animation: "autopulse 1s ease-in-out infinite" } : {}),
        }}
      />
      {label}
    </span>
  );
}

function inferOrientation(draft: any): "portrait" | "landscape" {
  return String(draft?.platform || "").toLowerCase() === "facebook" ? "landscape" : "portrait";
}

export default function AutoGenerateImagesDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: any[];
  toneId?: string;
  chat: any | null;
  autoStart?: boolean;
  brandId: string;
  onFinished?: () => Promise<void> | void;
}) {
  const { open, onOpenChange, drafts, toneId, autoStart, brandId, onFinished } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const autoStartFiredRef = useRef(false);

  const [rows, setRows] = useState<DraftRow[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgData, setOrgData] = useState<OrgCampaignData | null>(null);
  const [orgDataLoading, setOrgDataLoading] = useState(false);

  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);

  const [currentTemplate, setCurrentTemplate] = useState<any | null>(null);
  const [currentCampaignData, setCurrentCampaignData] = useState<CampaignData | null>(null);
  const [currentShapes, setCurrentShapes] = useState<TemplateShape[]>([]);
  const [currentBg, setCurrentBg] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  const buildInitialRows = (): DraftRow[] =>
    (drafts || []).map((d) => ({
      draft: d,
      status: "queued" as StepStatus,
      message: undefined,
      imageUrl: null,
    }));

  const resetPreviewState = () => {
    setCurrentTemplate(null);
    setCurrentCampaignData(null);
    setCurrentShapes([]);
    setCurrentBg(null);
    setCurrentDraftId(null);
  };

  const resetSession = () => {
    setRows(buildInitialRows());
    setRunning(false);
    setError(null);
    resetPreviewState();
    autoStartFiredRef.current = false;
  };

  useEffect(() => {
    if (!open) return;

    resetSession();

    setOrgDataLoading(true);
    fetchOrgCampaignData()
      .then(setOrgData)
      .catch((e) => console.warn("[org-data] fetch failed (non-fatal):", e))
      .finally(() => setOrgDataLoading(false));

    if (brandId) {
      listMediaAssets({ type: "image", brand_id: brandId })
        .then((assets: MediaAsset[]) => setMediaAssets(assets.filter((a) => a.url)))
        .catch((e: unknown) => console.warn("[mediaAssets] fetch failed:", e));
    } else {
      setMediaAssets([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, drafts, brandId]);

  useEffect(() => {
    if (open) return;

    setRunning(false);
    setError(null);
    resetPreviewState();
    autoStartFiredRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!autoStart || !open || running || rows.length === 0 || orgDataLoading) return;
    if (autoStartFiredRef.current) return;

    autoStartFiredRef.current = true;
    const t = setTimeout(() => {
      void runBatch();
    }, 200);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, open, rows.length, orgDataLoading, running]);

  const queuedCount = rows.filter((r) => r.status === "queued").length;
  const doneCount = rows.filter((r) => r.status === "done").length;
  const failCount = rows.filter((r) => r.status === "failed").length;
  const skippedCount = rows.filter((r) => r.status === "skipped").length;
  const runningRow = rows.find((r) => r.status === "running");
  const progress =
    rows.length > 0
      ? Math.round(((doneCount + failCount + skippedCount) / rows.length) * 100)
      : 0;

  const previewFacts = useMemo(() => {
    if (!currentCampaignData) return [];
    return [
      currentCampaignData.companyName,
      currentCampaignData.location,
      currentCampaignData.proof,
      (currentCampaignData as any).offer_title,
      (currentCampaignData as any).review_author,
    ]
      .filter(Boolean)
      .slice(0, 5) as string[];
  }, [currentCampaignData]);

  const updateRow = (draftId: string, patch: Partial<DraftRow>) =>
    setRows((prev) => prev.map((r) => (r.draft.id === draftId ? { ...r, ...patch } : r)));

  const prepareShapes = (template: any, campaignData: CampaignData): TemplateShape[] => {
    const tplShapes = (
      template?.shapes ||
      template?.template_shapes ||
      template?.layout?.shapes
    ) as TemplateShape[] | undefined;

    const targetW = Number(
      template?.canvasWidth || template?.width || template?.canvas_width || PORTRAIT_W,
    );
    const targetH = Number(
      template?.canvasHeight || template?.height || template?.canvas_height || PORTRAIT_H,
    );

    if (tplShapes?.length) {
      const bW = Number(template?.canvasWidth || template?.width || template?.canvas_width || targetW);
      const bH = Number(template?.canvasHeight || template?.height || template?.canvas_height || targetH);
      return scaleTemplateShapes(tplShapes, bW, bH, targetW, targetH);
    }

    return generateLayoutShapes({
      campaignData,
      canvasWidth: targetW,
      canvasHeight: targetH,
    }).shapes;
  };

  async function chooseAssets(
    draft: any,
    template: any,
    assets: MediaAsset[],
  ): Promise<AITemplateDecision> {
    const draftData = buildCampaignDataFromDraft(draft);

    try {
      const res = await fetch("/api/choose-template-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftData,
          template: {
            id: template?.id,
            name: template?.name,
            description: template?.description,
            shapeCount: Array.isArray(template?.shapes) ? template.shapes.length : 0,
            slotKeys: Array.isArray(template?.shapes)
              ? template.shapes.map((s: any) => s.slotKey).filter(Boolean)
              : [],
          },
          mediaAssets: assets.slice(0, 20).map((a) => ({
            id: a.id,
            filename: a.filename,
            tags: a.tags,
            price: a.price,
            price_currency: a.price_currency,
            width: a.width,
            height: a.height,
            type: a.type,
          })),
          sponsorsCount: (orgData?.sponsors || []).length,
          reviewsCount: (orgData?.reviews || []).length,
          accreditationsCount: (orgData?.accreditations || []).length,
          offersCount: (orgData?.offers || []).length,
        }),
      });

      const data = await res.json();
      if (data?.ok && data?.decision) return data.decision;
      throw new Error(data?.error || "AI decision failed");
    } catch {
      return {
        heroAssetId: assets[0]?.id,
        secondaryAssetId: assets[1]?.id,
        showPrice: !!assets[0]?.price,
        showSponsors: (orgData?.sponsors || []).length > 0,
        showReview: (orgData?.reviews || []).length > 0,
        proofText: assets[0]?.price
          ? `${assets[0].price_currency || "USD"} ${assets[0].price}`
          : draftData.proof,
      };
    }
  }

  const runBatch = async () => {
    if (running) return;

    setError(null);
    setRunning(true);
    resetPreviewState();

    const freshRows = buildInitialRows();
    setRows(freshRows);

    try {
      for (const row of freshRows) {
        if (row.status === "skipped") continue;

        const { draft } = row;
        updateRow(draft.id, { status: "running", message: "Preparing design…" });
        setCurrentDraftId(draft.id);

        try {
          if (!mediaAssets.length) throw new Error("No media assets found for this brand");

          const orientation = inferOrientation(draft);
          const tpl = await getRandomTemplate(brandId, { toneId, orientation });
          if (!tpl) throw new Error("No matching template found");

          const draftData = buildCampaignDataFromDraft(draft);

          updateRow(draft.id, { message: "Choosing assets…" });
          const aiDecision = await chooseAssets(draft, tpl, mediaAssets);

          const heroAsset =
            mediaAssets.find((a) => a.id === aiDecision.heroAssetId) || mediaAssets[0];
          const secondaryAsset =
            mediaAssets.find((a) => a.id === aiDecision.secondaryAssetId) || mediaAssets[1];

          const sponsor1 = orgData?.sponsors[0];
          const sponsor2 = orgData?.sponsors[1];

          const aiImageSlots: CampaignData["imageSlots"] = {
            ...(heroAsset?.url ? { hero_person: { url: heroAsset.url } } : {}),
            ...(secondaryAsset?.url ? { dashboard_image: { url: secondaryAsset.url } } : {}),
            ...(sponsor1?.logo_url ? { sponsor_1: { url: sponsor1.logo_url } } : {}),
            ...(sponsor2?.logo_url ? { sponsor_2: { url: sponsor2.logo_url } } : {}),
          };

          const formatAssetPrice = (asset?: MediaAsset | null) => {
            if (!asset || asset.price == null) return "";
            const value =
              typeof asset.price === "number" ? asset.price.toString() : String(asset.price);
            const currency = (asset.price_currency || "").toUpperCase();

            const symbolMap: Record<string, string> = {
              USD: "$",
              GBP: "£",
              EUR: "€",
              MWK: "MWK",
              ZAR: "R ",
            };

            const prefix = symbolMap[currency] ?? (currency ? `${currency} ` : "");
            return `${prefix}${value}`;
          };

          const heroPriceLabel = aiDecision.showPrice ? formatAssetPrice(heroAsset) : "";

          const enrichedBase: CampaignData = {
            ...draftData,
            proof: aiDecision.showPrice
              ? aiDecision.proofText || draftData.proof || heroPriceLabel
              : draftData.proof,
            price_label: heroPriceLabel || (draftData as any).price_label || "",
            imageSlots: aiImageSlots,
          };

          const enrichedData: CampaignData = orgData
            ? enrichCampaignData(enrichedBase, orgData)
            : enrichedBase;

          const baseShapes = prepareShapes(tpl, enrichedData);
          const shapes = resolveTemplateSlots(baseShapes, enrichedData);

          setCurrentTemplate(tpl);
          setCurrentCampaignData(enrichedData);
          setCurrentShapes(shapes);
          setCurrentBg(tpl?.backgroundImage || null);

          updateRow(draft.id, { message: "Rendering…" });
          await waitForNextPaint(3);

          const canvas = canvasRef.current;
          if (!canvas) throw new Error("Canvas not ready");

          updateRow(draft.id, { message: "Exporting…" });
          const file = await canvasToFile(
            canvas,
            `${enrichedData.companyName || "draft"}-${draft.id}.png`,
          );

          updateRow(draft.id, { message: "Uploading…" });
          const url = await uploadFileToSpaces(file);

          updateRow(draft.id, { message: "Attaching…" });
          await attachMediaToContentItem(draft.id, {
            media_type: "image",
            media_url: url,
            media_urls: [url],
            media_provider: "do_spaces",
            media_caption: null,
          });

          updateRow(draft.id, {
            status: "done",
            message: "Complete",
            imageUrl: url,
          });
        } catch (e: any) {
          updateRow(draft.id, {
            status: "failed",
            message: e?.message || "Failed",
          });
        }
      }

      onFinished && (await onFinished());
    } catch (e: any) {
      setError(e?.message || "Batch generation failed");
    } finally {
      setRunning(false);
      setCurrentDraftId(null);
    }
  };

  const handleGenerateAgain = async () => {
    resetSession();
    setTimeout(() => {
      void runBatch();
    }, 80);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');

        .auto-dialog {
          background: #111115 !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 20px !important;
          font-family: 'Syne', sans-serif;
          color: #e4e4e7;
          width: min(92vw, 960px) !important;
          max-width: min(92vw, 960px) !important;
          max-height: 92vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .auto-body {
          flex: 1;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 16px;
          padding: 20px;
        }
        .auto-preview-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 0;
        }
        .auto-batch-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 0;
        }

        .auto-start-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: white;
          border: none;
          border-radius: 11px;
          padding: 10px 20px;
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: opacity 0.15s;
          white-space: nowrap;
        }
        .auto-start-btn:hover:not(:disabled) { opacity: 0.85; }
        .auto-start-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .progress-bar {
          height: 3px;
          background: rgba(255,255,255,0.07);
          border-radius: 2px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 2px;
          background: linear-gradient(90deg,#7c3aed,#4f46e5);
          transition: width 0.4s ease;
        }

        .row-item {
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
          transition: background 0.15s;
        }
        .row-item.running {
          background: rgba(139,92,246,0.07);
          border-color: rgba(139,92,246,0.2);
        }
        .row-item.done {
          background: rgba(52,211,153,0.05);
          border-color: rgba(52,211,153,0.12);
        }
        .row-item.failed {
          background: rgba(248,113,113,0.05);
          border-color: rgba(248,113,113,0.12);
        }

        .close-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          border-radius: 8px;
          padding: 6px 12px;
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }
        .close-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.8);
        }
        .close-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .spinner-sm {
          width: 12px;
          height: 12px;
          flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: #a78bfa;
          border-radius: 50%;
          animation: autopulse-spin 0.6s linear infinite;
          display: inline-block;
        }

        .org-data-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.04em;
        }
        .org-data-badge.loaded {
          background: rgba(52,211,153,0.1);
          border: 1px solid rgba(52,211,153,0.25);
          color: #34d399;
        }
        .org-data-badge.loading {
          background: rgba(167,139,250,0.1);
          border: 1px solid rgba(167,139,250,0.25);
          color: #a78bfa;
        }

        .auto-stats {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .preview-shell {
          flex: 1;
          border-radius: 16px;
          overflow: hidden;
          background: #0c0c0f;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          position: relative;
          transition: all 0.2s ease;
        }

        .preview-shell.idle {
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: none;
        }

        .preview-shell.active {
          border: 1px solid rgba(167,139,250,0.28);
          box-shadow: 0 0 0 1px rgba(167,139,250,0.08), inset 0 0 40px rgba(124,58,237,0.10);
        }

        .preview-running-pill {
          position: absolute;
          top: 10px;
          left: 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(167,139,250,0.12);
          border: 1px solid rgba(167,139,250,0.24);
          color: #c4b5fd;
          font-size: 10px;
          font-weight: 700;
          font-family: 'DM Mono', monospace;
          z-index: 2;
        }

        .preview-facts {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .preview-fact {
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(167,139,250,0.10);
          border: 1px solid rgba(167,139,250,0.22);
          color: #c4b5fd;
          font-family: 'DM Mono', monospace;
        }

        @keyframes autopulse-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes autopulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        @media (max-width: 640px) {
          .auto-dialog {
            border-radius: 16px !important;
            max-height: 96vh;
          }
          .auto-body {
            grid-template-columns: 1fr;
            overflow-y: auto;
            padding: 12px;
            gap: 12px;
          }
          .auto-preview-col {
            display: none;
          }
          .auto-batch-col {
            overflow: visible;
            min-height: unset;
          }
          .auto-stats {
            gap: 8px;
          }
          .auto-start-btn {
            padding: 9px 14px;
            font-size: 11px;
          }
        }
      `}</style>

      <Dialog open={open} onOpenChange={(v) => !running && onOpenChange(v)}>
        <DialogContent className="auto-dialog">
          <DialogHeader style={{ padding: "16px 20px 0", flexShrink: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <DialogTitle
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#e4e4e7",
                      fontFamily: "Syne, sans-serif",
                    }}
                  >
                    Auto Generate Images
                  </DialogTitle>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
                    Renders each draft with a template + real org profile data
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {orgDataLoading ? (
                  <span className="org-data-badge loading">
                    <span className="spinner-sm" style={{ width: 8, height: 8 }} />
                    Loading org data…
                  </span>
                ) : orgData ? (
                  <span className="org-data-badge loaded">
                    ✓ Org data ready · {orgData.reviews.length} reviews · {orgData.sponsors.length} sponsors
                  </span>
                ) : null}

                <button
                  className="close-btn"
                  onClick={() => !running && onOpenChange(false)}
                  disabled={running}
                >
                  <X className="w-3 h-3" />
                  Close
                </button>
              </div>
            </div>
          </DialogHeader>

          <div className="auto-body">
            <div className="auto-preview-col">
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                Live Preview
              </div>

              <div className={`preview-shell ${running ? "active" : "idle"}`}>
                {currentTemplate && currentCampaignData ? (
                  <>
                    {running && (
                      <div className="preview-running-pill">
                        <span className="spinner-sm" style={{ width: 8, height: 8 }} />
                        {runningRow?.message || "Generating…"}
                      </div>
                    )}

                    <TemplateCanvas
                      ref={canvasRef}
                      zoom={1}
                      setZoom={() => {}}
                      pan={{ x: 0, y: 0 }}
                      setPan={() => {}}
                      backgroundImage={currentBg}
                      logoUrl={currentTemplate?.logoPlacement?.url}
                      campaignData={currentCampaignData}
                      selectedShapeId={null}
                      onShapeSelect={() => {}}
                      shapes={currentShapes}
                      canvasWidth={currentTemplate?.canvasWidth || PORTRAIT_W}
                      canvasHeight={currentTemplate?.canvasHeight || PORTRAIT_H}
                      isEditable={false}
                    />
                  </>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      color: "rgba(255,255,255,0.22)",
                      textAlign: "center",
                      padding: 24,
                    }}
                  >
                    <ImageIcon className="w-10 h-10" style={{ opacity: 0.2 }} />
                    <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>
                      Ready to generate
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.28)",
                        maxWidth: 320,
                      }}
                    >
                      The live preview will appear here as each draft is prepared and rendered.
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        justifyContent: "center",
                      }}
                    >
                      <button
                        className="auto-start-btn"
                        onClick={() => void runBatch()}
                        disabled={running || orgDataLoading || !rows.length}
                      >
                        {running ? (
                          <>
                            <span className="spinner-sm" />
                            Generating…
                          </>
                        ) : orgDataLoading ? (
                          <>
                            <span className="spinner-sm" />
                            Loading data…
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-white" />
                            Start Generation
                          </>
                        )}
                      </button>

                      <button
                        className="close-btn"
                        onClick={resetSession}
                        disabled={running}
                      >
                        <RefreshCcw className="w-3 h-3" />
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {previewFacts.length > 0 && (
                <div className="preview-facts">
                  {previewFacts.map((fact, i) => (
                    <span key={`${fact}-${i}`} className="preview-fact">
                      {fact}
                    </span>
                  ))}
                </div>
              )}

              {orgData && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { label: "Reviews", val: orgData.reviews.length },
                    { label: "Sponsors", val: orgData.sponsors.length },
                    { label: "Accreditations", val: orgData.accreditations.length },
                    { label: "Offers", val: orgData.offers.length },
                  ].map(({ label, val }) =>
                    val > 0 ? (
                      <span
                        key={label}
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 6,
                          background: "rgba(52,211,153,0.1)",
                          border: "1px solid rgba(52,211,153,0.2)",
                          color: "#34d399",
                          fontFamily: "DM Mono, monospace",
                        }}
                      >
                        {val} {label}
                      </span>
                    ) : null,
                  )}
                </div>
              )}

              {currentDraftId && (
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.25)",
                    fontFamily: "DM Mono, monospace",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span className="spinner-sm" />
                  {runningRow?.message || "Processing…"} —{" "}
                  <span style={{ color: "#a78bfa" }}>{currentDraftId.slice(0, 16)}…</span>
                </div>
              )}
            </div>

            <div className="auto-batch-col">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div className="auto-stats">
                  {[
                    { label: "Queued", val: queuedCount, color: "#6b7280" },
                    { label: "Done", val: doneCount, color: "#34d399" },
                    { label: "Failed", val: failCount, color: "#f87171" },
                    { label: "Skipped", val: skippedCount, color: "#fbbf24" },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color }}>{val}</div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "rgba(255,255,255,0.3)",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="auto-start-btn"
                    onClick={() => void runBatch()}
                    disabled={running || queuedCount === 0 || orgDataLoading}
                  >
                    {running ? (
                      <>
                        <span className="spinner-sm" />
                        Generating…
                      </>
                    ) : orgDataLoading ? (
                      <>
                        <span className="spinner-sm" />
                        Loading data…
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Start
                      </>
                    )}
                  </button>

                  <button
                    className="close-btn"
                    onClick={() => void handleGenerateAgain()}
                    disabled={running || orgDataLoading}
                  >
                    <RefreshCcw className="w-3 h-3" />
                    Generate Again
                  </button>
                </div>
              </div>

              {rows.length > 0 && (
                <div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 4,
                      fontSize: 10,
                      color: "rgba(255,255,255,0.25)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    <span>{progress}% complete</span>
                    <span>
                      {doneCount + failCount + skippedCount} / {rows.length}
                    </span>
                  </div>
                </div>
              )}

              {currentDraftId && (
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.25)",
                    fontFamily: "DM Mono, monospace",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    background: "rgba(139,92,246,0.07)",
                    borderRadius: 8,
                    border: "1px solid rgba(139,92,246,0.15)",
                  }}
                >
                  <span className="spinner-sm" />
                  {runningRow?.message || "Processing…"}
                </div>
              )}

              {error && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 10,
                    padding: "8px 12px",
                    fontSize: 11,
                    color: "#f87171",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  maxHeight: 380,
                }}
              >
                {rows.map((row) => (
                  <div
                    key={row.draft.id}
                    className={`row-item ${row.status}`}
                    style={{
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "rgba(255,255,255,0.05)",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {row.imageUrl ? (
                        <img
                          src={row.imageUrl}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : row.status === "running" ? (
                        <span className="spinner-sm" />
                      ) : row.status === "done" ? (
                        <Check className="w-4 h-4" style={{ color: "#34d399" }} />
                      ) : row.status === "failed" ? (
                        <X className="w-4 h-4" style={{ color: "#f87171" }} />
                      ) : row.status === "skipped" ? (
                        <SkipForward className="w-4 h-4" style={{ color: "#fbbf24" }} />
                      ) : (
                        <ImageIcon className="w-4 h-4" style={{ color: "rgba(255,255,255,0.2)" }} />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.6)",
                            fontFamily: "DM Mono, monospace",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.draft.id.slice(0, 20)}…
                        </span>
                        <StatusBadge status={row.status} />
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.3)",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.message ||
                          row.draft?.structured?.hook ||
                          row.draft?.body_text ||
                          "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  position: "absolute",
                  left: -9999,
                  top: -9999,
                  pointerEvents: "none",
                  opacity: 0,
                }}
              >
                {currentTemplate && currentCampaignData && (
                  <TemplateCanvas
                    ref={canvasRef}
                    zoom={1}
                    setZoom={() => {}}
                    pan={{ x: 0, y: 0 }}
                    setPan={() => {}}
                    backgroundImage={currentBg}
                    logoUrl={currentTemplate?.logoPlacement?.url}
                    campaignData={currentCampaignData}
                    selectedShapeId={null}
                    onShapeSelect={() => {}}
                    shapes={currentShapes}
                    canvasWidth={currentTemplate?.canvasWidth || PORTRAIT_W}
                    canvasHeight={currentTemplate?.canvasHeight || PORTRAIT_H}
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