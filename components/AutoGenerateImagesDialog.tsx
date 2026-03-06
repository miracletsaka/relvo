"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TemplateCanvas from "@/components/template-canvas";
import { generateLayoutShapes } from "@/lib/layout-engine";
import {
  buildCampaignDataFromDraft,
  canvasToFile,
  pickRandom,
  PORTRAIT_H,
  PORTRAIT_W,
  scaleTemplateShapes,
  waitForNextPaint,
} from "@/lib/design-studio-utils";
import { uploadFileToSpaces } from "@/lib/upload-client";
import { attachMediaToContentItem, listTemplates } from "@/lib/api";
import type { CampaignData, TemplateShape } from "@/lib/types";
import { getTemplates } from "@/lib/template-storage";

type StepStatus = "queued" | "running" | "done" | "failed" | "skipped";

type DraftRow = {
  draft: any;
  status: StepStatus;
  message?: string;
  imageUrl?: string | null;
};

export default function AutoGenerateImagesDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: any[];
  chat: any | null;
  onFinished?: () => Promise<void> | void;
}) {
  const { open, onOpenChange, drafts, chat, onFinished } = props;

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

  const backgrounds = useMemo(() => {
    return Array.isArray(chat?.background_images) ? chat.background_images.filter(Boolean) : [];
  }, [chat]);

  useEffect(() => {
    if (!open) return;

    const nextRows: DraftRow[] = (drafts || []).map((d) => {
      const alreadyHasMedia =
        !!String(d?.media_url || "").trim() ||
        (Array.isArray(d?.media_urls) && d.media_urls.length > 0);

      return {
        draft: d,
        status: alreadyHasMedia ? "skipped" : "queued",
        message: alreadyHasMedia ? "Already has media" : undefined,
      };
    });

    setRows(nextRows);
    setError(null);
  }, [open, drafts]);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      try {
        const data = await getTemplates(chat?.brand_id);
        setTemplates(Array.isArray(data) ? data : data || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load templates");
      }
    };

    load();
  }, [open, chat?.brand_id]);

  const queuedCount = rows.filter((r) => r.status === "queued").length;
  const doneCount = rows.filter((r) => r.status === "done").length;
  const failCount = rows.filter((r) => r.status === "failed").length;
  const skippedCount = rows.filter((r) => r.status === "skipped").length;

  const updateRow = (draftId: string, patch: Partial<DraftRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.draft.id === draftId ? { ...r, ...patch } : r))
    );
  };

  const prepareShapes = (template: any, campaignData: CampaignData): TemplateShape[] => {
    const tplShapes =
      (template?.shapes || template?.template_shapes || template?.layout?.shapes) as
        | TemplateShape[]
        | undefined;

    if (tplShapes?.length) {
      const baseW = Number(template?.canvasWidth || template?.width || template?.canvas_width || PORTRAIT_W);
      const baseH = Number(template?.canvasHeight || template?.height || template?.canvas_height || PORTRAIT_H);

      return scaleTemplateShapes(tplShapes, baseW, baseH, PORTRAIT_W, PORTRAIT_H);
    }

    const { shapes } = generateLayoutShapes({
      campaignData,
      canvasWidth: PORTRAIT_W,
      canvasHeight: PORTRAIT_H,
    });

    return shapes;
  };

  const runBatch = async () => {
    if (running) return;
    if (!templates.length) {
      setError("No templates available");
      return;
    }
    if (!rows.length) {
      setError("No drafts found");
      return;
    }

    setRunning(true);
    setError(null);

    try {
      for (const row of rows) {
        const draft = row.draft;
        if (row.status === "skipped") continue;

        updateRow(draft.id, { status: "running", message: "Preparing design..." });
        setCurrentDraftId(draft.id);

        try {
          const pickedTemplate = pickRandom(templates);
          if (!pickedTemplate) {
            throw new Error("No template found");
          }

          const pickedBg = pickRandom(backgrounds) || null;
          const campaignData = buildCampaignDataFromDraft(draft);
          const shapes = prepareShapes(pickedTemplate, campaignData);

          setCurrentTemplate(pickedTemplate);
          setCurrentCampaignData(campaignData);
          setCurrentShapes(shapes);
          setCurrentBg(
            pickedBg ||
              pickedTemplate?.backgroundImage ||
              pickedTemplate?.background_image ||
              null
          );

          updateRow(draft.id, { message: "Rendering canvas..." });

          await waitForNextPaint(3);

          const canvas = canvasRef.current;
          if (!canvas) {
            throw new Error("Canvas not ready");
          }

          updateRow(draft.id, { message: "Exporting image..." });

          const company = campaignData.companyName || "campaign";
          const file = await canvasToFile(canvas, `${company}-${draft.id}.png`);

          updateRow(draft.id, { message: "Uploading to storage..." });

          const uploadedUrl = await uploadFileToSpaces(file);

          updateRow(draft.id, { message: "Attaching to draft..." });

          await attachMediaToContentItem(draft.id, {
            media_type: "image",
            media_url: uploadedUrl,
            media_urls: [uploadedUrl],
            media_provider: "do_spaces",
            media_caption: null,
          });

          updateRow(draft.id, {
            status: "done",
            message: "Completed",
            imageUrl: uploadedUrl,
          });
        } catch (e: any) {
          updateRow(draft.id, {
            status: "failed",
            message: e?.message || "Failed",
          });
        }
      }

      await onFinished?.();
    } finally {
      setRunning(false);
      setCurrentDraftId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !running && onOpenChange(v)}>
      <DialogContent className="min-w-[90vw] max-w-[90vw] lg:min-w-[80vw] lg:max-w-[80vw] h-auto max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Auto Generate Images</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div>
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="text-sm font-medium mb-3">Preview Renderer</div>

              <div className="flex items-center justify-center bg-secondary rounded-lg overflow-hidden min-h-[540px]">
                {currentTemplate && currentCampaignData ? (
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
                    canvasWidth={PORTRAIT_W}
                    canvasHeight={PORTRAIT_H}
                    isEditable={false}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">No preview yet</div>
                )}
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                Current draft: {currentDraftId || "—"}
              </div>
            </div>
          </div>

          <div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-semibold">Batch Progress</div>
                  <div className="text-xs text-muted-foreground">
                    Queued {queuedCount} • Done {doneCount} • Failed {failCount} • Skipped {skippedCount}
                  </div>
                </div>

                <Button onClick={runBatch} disabled={running || !templates.length}>
                  {running ? "Generating..." : "Start Auto Generation"}
                </Button>
              </div>

              {error && (
                <div className="mb-3 text-sm text-red-600 border border-red-200 bg-red-50 rounded p-2">
                  {error}
                </div>
              )}

              <div className="space-y-2 max-h-[520px] overflow-auto">
                {rows.map((row) => (
                  <div
                    key={row.draft.id}
                    className="border rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{row.draft.id}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {row.draft?.structured?.hook || row.draft?.body_text || "—"}
                        </div>
                      </div>

                      <div className="text-xs font-medium uppercase">
                        {row.status}
                      </div>
                    </div>

                    {row.message && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {row.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}