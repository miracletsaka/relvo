"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { composeRandomTemplateFromDb } from "@/lib/compose-random-template";
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
import html2canvas from "html2canvas";

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

function inferOrientation(_draft: any): "portrait" {
  return "portrait";
}

type RunBatchMode = "queued_only" | "failed_only";

const TEMPLATE_FAMILY = "mixed-poster";

const DB_COMPOSE_SECTIONS = [
  "background",
  "scene",
  "hero-image",
  "header",
  "hero-text",
  "offer",
  "cta",
  "footer",
  "features",
  "sponsors",
  "contact",
  "social",
];

const TEMPLATE_FETCH_MAX_TRIES = 5;
const RESOLUTION_MAX_TRIES = 3;
const RENDER_MAX_TRIES = 2;
const UPLOAD_MAX_TRIES = 2;
const ATTACH_MAX_TRIES = 2;
const MIN_TEMPLATE_SHAPES = 4;
const MIN_RESOLVED_SHAPES = 4;
const MANDATORY_SLOT_KEYS = ["hero_person"];
const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || "";

type ResolvedImageAsset = {
  id: string;
  url: string;
  filename: string;
  tags?: string[];
  price?: number | null;
  price_currency?: string | null;
  width?: number | null;
  height?: number | null;
  type?: string;
  source: "media_library" | "unsplash";
};

async function fetchUnsplashImage(
  query: string,
  orientation: "portrait" | "landscape" | "squarish" = "portrait",
): Promise<string | null> {
  if (!UNSPLASH_ACCESS_KEY || !query.trim()) return null;
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=${orientation}&content_filter=high`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

async function fetchBestUnsplashImage(
  queries: string[],
  orientation: "portrait" | "landscape" | "squarish" = "portrait",
): Promise<string | null> {
  for (const query of queries) {
    const url = await fetchUnsplashImage(query, orientation);
    if (url) return url;
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTemplateShapes(template: any): TemplateShape[] {
  const shapes = template?.shapes || template?.template_shapes || template?.layout?.shapes;
  return Array.isArray(shapes) ? (shapes as TemplateShape[]) : [];
}

function getTemplateSize(template: any) {
  const width = Number(template?.canvasWidth || template?.width || template?.canvas_width || PORTRAIT_W);
  const height = Number(template?.canvasHeight || template?.height || template?.canvas_height || PORTRAIT_H);
  return { width, height };
}

function getOrientationFromTemplate(template: any): "portrait" | "landscape" {
  const raw = String(template?.orientation || template?.layout?.orientation || "").toLowerCase();
  if (raw === "portrait" || raw === "landscape") return raw;
  const { width, height } = getTemplateSize(template);
  return width >= height ? "landscape" : "portrait";
}

function hasValidShapeBox(shape: any) {
  const w = Number(shape?.width);
  const h = Number(shape?.height);
  return w > 0 && h > 0 && Number.isFinite(w) && Number.isFinite(h);
}

function hasBrokenDimensions(shapes: TemplateShape[]) {
  return shapes.some((shape: any) => !hasValidShapeBox(shape));
}

function validateResolvedShapes(
  shapes: TemplateShape[],
  _campaignData?: CampaignData | null,
): { ok: boolean; reason?: string } {
  if (!Array.isArray(shapes) || shapes.length < MIN_RESOLVED_SHAPES) {
    return { ok: false, reason: "resolved_shape_count_too_low" };
  }
  if (hasBrokenDimensions(shapes)) {
    return { ok: false, reason: "resolved_shapes_have_broken_dimensions" };
  }
  return { ok: true };
}

function buildUnsplashQueriesFromDraft(draft: any, draftData: any): string[] {
  const structured = draft?.structured || {};
  const candidates = [
    structured?.topic,
    structured?.hook,
    structured?.headline,
    draftData?.companyName && structured?.topic ? `${draftData.companyName} ${structured.topic}` : null,
    draftData?.companyName && draftData?.location ? `${draftData.companyName} ${draftData.location} business` : null,
    draft?.topic,
    draft?.title,
    draft?.body_text,
    draftData?.proof,
    draftData?.location,
    draftData?.companyName,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  return Array.from(new Set(candidates)).slice(0, 8);
}

async function resolveImageAssetPool(params: {
  draft: any;
  draftData: any;
  orientation: "portrait" | "landscape";
  mediaAssets: MediaAsset[];
}): Promise<ResolvedImageAsset[]> {
  const { draft, draftData, orientation, mediaAssets } = params;

  const mappedMediaAssets: ResolvedImageAsset[] = mediaAssets
    .filter((a) => a?.url)
    .map((a) => ({
      id: a.id,
      url: a.url,
      filename: a.filename || `${a.id}.jpg`,
      tags: a.tags,
      price: a.price,
      price_currency: a.price_currency,
      width: a.width,
      height: a.height,
      type: a.type,
      source: "media_library",
    }));

  if (mappedMediaAssets.length > 0) return mappedMediaAssets;

  const unsplashOrientation = orientation === "landscape" ? "landscape" : "portrait";
  const queries = buildUnsplashQueriesFromDraft(draft, draftData);
  const heroUrl = await fetchBestUnsplashImage(queries, unsplashOrientation);
  if (!heroUrl) return [];

  const secondaryUrl = await fetchBestUnsplashImage(
    [...queries.map((q) => `${q} technology`), "business dashboard", "analytics dashboard", "professional workspace"],
    unsplashOrientation,
  );

  const assets: ResolvedImageAsset[] = [
    { id: `unsplash-hero-${draft?.id || "draft"}`, url: heroUrl, filename: `unsplash-hero-${draft?.id || "draft"}.jpg`, type: "image", source: "unsplash" },
  ];
  if (secondaryUrl) {
    assets.push({ id: `unsplash-secondary-${draft?.id || "draft"}`, url: secondaryUrl, filename: `unsplash-secondary-${draft?.id || "draft"}.jpg`, type: "image", source: "unsplash" });
  }
  return assets;
}

function proxiedImageUrl(url: string): string {
  if (!url || !url.startsWith("http")) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function resolveCampaignImageField(
  field: string | undefined,
  campaignData: CampaignData | null,
): string | null {
  if (!field || !campaignData) return null;

  const data = campaignData as any;
  const direct = data[field];

  if (typeof direct === "string" && direct.trim()) {
    return direct;
  }

  if (field === "logo") {
    return data.logo || data.imageSlots?.logo?.url || null;
  }

  if (field === "heroImage") {
    return (
      data.heroImage ||
      data.imageSlots?.hero_person?.url ||
      data.imageSlots?.heroImage?.url ||
      null
    );
  }

  if (field === "background_image") {
    return data.background_image || data.imageSlots?.background_image?.url || null;
  }

  if (field === "dashboard_image") {
    return data.dashboard_image || data.imageSlots?.dashboard_image?.url || null;
  }

  if (field === "sponsor_logo_1") {
    return data.sponsor_logo_1 || data.imageSlots?.sponsor_1?.url || data.sponsors?.[0]?.logo_url || null;
  }

  if (field === "sponsor_logo_2") {
    return data.sponsor_logo_2 || data.imageSlots?.sponsor_2?.url || data.sponsors?.[1]?.logo_url || null;
  }

  if (field === "sponsor_logo_3") {
    return data.sponsor_logo_3 || data.imageSlots?.sponsor_3?.url || data.sponsors?.[2]?.logo_url || null;
  }

  return data.imageSlots?.[field]?.url || null;
}

async function preloadShapeImages(
  shapes: TemplateShape[],
  campaignData: CampaignData | null = null,
): Promise<void> {
  const urls = shapes
    .filter((s: any) => String(s?.type || "").toLowerCase() === "image")
    .map((s: any) => {
      if (s?.src) return s.src as string;

      if (s?.dataField) {
        return resolveCampaignImageField(
          String(s.dataField),
          campaignData,
        );
      }

      if (s?.slotKey === "sponsor_1") {
        return resolveCampaignImageField(
          "sponsor_logo_1",
          campaignData,
        );
      }

      if (s?.slotKey === "sponsor_2") {
        return resolveCampaignImageField(
          "sponsor_logo_2",
          campaignData,
        );
      }

      if (s?.slotKey === "sponsor_3") {
        return resolveCampaignImageField(
          "sponsor_logo_3",
          campaignData,
        );
      }

      if (s?.slotKey === "hero_person") {
        return resolveCampaignImageField(
          "heroImage",
          campaignData,
        );
      }

      if (s?.slotKey === "logo") {
        return resolveCampaignImageField(
          "logo",
          campaignData,
        );
      }

      return campaignData?.imageSlots?.[s.slotKey]?.url || null;
    })
    .filter(Boolean)
    .map((src) => proxiedImageUrl(String(src)));

  await Promise.allSettled(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  );
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

  const previewRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
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
    (drafts || []).map((d) => ({ draft: d, status: "queued" as StepStatus, message: undefined, imageUrl: null }));

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

  const updateRow = (draftId: string, patch: Partial<DraftRow>) =>
    setRows((prev) => prev.map((r) => (r.draft.id === draftId ? { ...r, ...patch } : r)));

  const setRowStage = (draftId: string, message: string, status: StepStatus = "running") =>
    updateRow(draftId, { status, message });

  const loadRowsForMode = (mode: RunBatchMode): DraftRow[] => {
    const sourceRows = rows.length ? rows : buildInitialRows();

    if (mode === "failed_only") {
      const retryIds = new Set(sourceRows.filter((r) => r.status === "failed").map((r) => r.draft.id));
      const nextRows = sourceRows.map((r) =>
        retryIds.has(r.draft.id) ? { ...r, status: "queued" as StepStatus, message: "Queued for retry" } : r,
      );
      setRows(nextRows);
      return nextRows.filter((r) => retryIds.has(r.draft.id));
    }

    if (!rows.length) setRows(sourceRows);
    return sourceRows.filter((r) => r.status === "queued");
  };

  const fetchUsableTemplate = async (draftId: string, _orientation: "portrait" | "landscape"): Promise<any> => {
    setRowStage(draftId, "composing_segments_from_db");

    const composed = await composeRandomTemplateFromDb(TEMPLATE_FAMILY, DB_COMPOSE_SECTIONS);
    const shapes = getTemplateShapes(composed);

    if (!shapes.length || shapes.length < MIN_TEMPLATE_SHAPES) {
      throw new Error("DB segment composition returned too few shapes");
    }

    if (hasBrokenDimensions(shapes)) {
      throw new Error("DB segment composition returned shapes with broken dimensions");
    }

    return {
      ...composed,
      id: composed.instanceId || `db-composed-${TEMPLATE_FAMILY}`,
      name: composed.name || "DB Mixed Poster",
      description: composed.description || "Composed from saved template segments",
      orientation: "portrait",
      canvasWidth: PORTRAIT_W,
      canvasHeight: PORTRAIT_H,
      canvas_width: PORTRAIT_W,
      canvas_height: PORTRAIT_H,
      backgroundImage: null,
      logoPlacement: null,
      shapes,
    };
  };

  const exportCanvasFile = async (draftId: string, fileName: string): Promise<File> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= RENDER_MAX_TRIES; attempt++) {
      try {
        setRowStage(draftId, attempt > 1 ? `render_retry_${attempt}` : "rendering");

        // Flush React DOM updates.
        await waitForNextPaint(3);

        if (typeof document !== "undefined" && "fonts" in document) {
          await (document as any).fonts.ready;
        }

        // Extra breathing room for images to fully paint.
        await sleep(350);

        const node = captureRef.current;
        if (!node) throw new Error("Capture DOM node is not mounted");

        const capturedCanvas: HTMLCanvasElement = await html2canvas(node, {
          useCORS: true,
          allowTaint: false,
          scale: 2,
          backgroundColor: null,
          logging: false,
          // Rewrite image URLs in the cloned document so html2canvas can draw
          // them without triggering cross-origin canvas taint.
          onclone: (clonedDoc: Document) => {
            // Patch <img> tags
            clonedDoc.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
              const src = img.getAttribute("src") || "";
              if (src.startsWith("http")) {
                img.setAttribute("src", proxiedImageUrl(src));
                img.setAttribute("crossorigin", "anonymous");
              }
            });

            // Patch inline background-image styles
            clonedDoc.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
              const style = el.getAttribute("style") || "";
              const patched = style.replace(
                /url\(["']?(https?:[^"')]+)["']?\)/g,
                (_: string, url: string) => `url("${proxiedImageUrl(url)}")`,
              );
              if (patched !== style) el.setAttribute("style", patched);
            });
          },
        });

        return await new Promise<File>((resolve, reject) => {
          capturedCanvas.toBlob(
            (blob) => {
              if (!blob) { reject(new Error("html2canvas toBlob returned null")); return; }
              resolve(new File([blob], fileName, { type: "image/png" }));
            },
            "image/png",
            1.0,
          );
        });
      } catch (err) {
        lastError = err;
        await sleep(250);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Render/export failed");
  };

  const uploadWithRetry = async (draftId: string, file: File): Promise<string> => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= UPLOAD_MAX_TRIES; attempt++) {
      try {
        setRowStage(draftId, attempt > 1 ? `upload_retry_${attempt}` : "uploading");
        return await uploadFileToSpaces(file);
      } catch (err) { lastError = err; await sleep(200); }
    }
    throw lastError instanceof Error ? lastError : new Error("Upload failed");
  };

  const attachWithRetry = async (draftId: string, url: string): Promise<void> => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= ATTACH_MAX_TRIES; attempt++) {
      try {
        setRowStage(draftId, attempt > 1 ? `attach_retry_${attempt}` : "attaching");
        await attachMediaToContentItem(draftId, {
          media_type: "image",
          media_url: url,
          media_urls: [url],
          media_provider: "do_spaces",
          media_caption: null,
        });
        return;
      } catch (err) { lastError = err; await sleep(200); }
    }
    throw lastError instanceof Error ? lastError : new Error("Attach failed");
  };

  const enhanceCanvasWithAI = async (draftId: string, file: File): Promise<File> => {
    try {
      setRowStage(draftId, "ai_final_polish");

      const formData = new FormData();
      formData.append("image", file, file.name);

      const res = await fetch("/api/enhance-canvas-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      // 402 / 403 means the org is not on a paid plan. Keep normal export.
      if (res.status === 402 || res.status === 403) {
        setRowStage(draftId, "ai_final_polish_skipped_unpaid");
        return file;
      }

      // Do not break generation if the AI polish endpoint fails.
      if (!res.ok) {
        setRowStage(draftId, "ai_final_polish_skipped");
        return file;
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) return file;

      return new File(
        [blob],
        file.name.replace(/\.png$/i, "-ai-polished.png"),
        { type: blob.type || "image/png" },
      );
    } catch {
      return file;
    }
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
    const t = setTimeout(() => { void runBatch(); }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, open, rows.length, orgDataLoading, running]);

  const queuedCount = rows.filter((r) => r.status === "queued").length;
  const doneCount = rows.filter((r) => r.status === "done").length;
  const failCount = rows.filter((r) => r.status === "failed").length;
  const skippedCount = rows.filter((r) => r.status === "skipped").length;
  const runningRow = rows.find((r) => r.status === "running");
  const progress = rows.length > 0 ? Math.round(((doneCount + failCount + skippedCount) / rows.length) * 100) : 0;

  const previewFacts = useMemo(() => {
    if (!currentCampaignData) return [];
    return [
      currentCampaignData.companyName,
      currentCampaignData.location,
      currentCampaignData.proof,
      (currentCampaignData as any).offer_title,
      (currentCampaignData as any).review_author,
    ].filter(Boolean).slice(0, 5) as string[];
  }, [currentCampaignData]);

  const prepareShapes = (template: any, campaignData: CampaignData): TemplateShape[] => {
    const tplShapes = (template?.shapes || template?.template_shapes || template?.layout?.shapes) as TemplateShape[] | undefined;
    const targetW = Number(template?.canvasWidth || template?.width || template?.canvas_width || PORTRAIT_W);
    const targetH = Number(template?.canvasHeight || template?.height || template?.canvas_height || PORTRAIT_H);

    if (tplShapes?.length) {
      const bW = Number(template?.canvasWidth || template?.width || template?.canvas_width || targetW);
      const bH = Number(template?.canvasHeight || template?.height || template?.canvas_height || targetH);
      return scaleTemplateShapes(tplShapes, bW, bH, targetW, targetH);
    }

    return generateLayoutShapes({ campaignData, canvasWidth: targetW, canvasHeight: targetH }).shapes;
  };

  async function chooseAssets(draft: any, template: any, assets: ResolvedImageAsset[]): Promise<AITemplateDecision> {
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
            slotKeys: Array.isArray(template?.shapes) ? template.shapes.map((s: any) => s.slotKey || s.dataField).filter(Boolean) : [],
          },
          mediaAssets: assets.slice(0, 20).map((a) => ({
            id: a.id, filename: a.filename, tags: a.tags, price: a.price,
            price_currency: a.price_currency, width: a.width, height: a.height, type: a.type,
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
        proofText: assets[0]?.price ? `${assets[0].price_currency || "USD"} ${assets[0].price}` : draftData.proof,
      };
    }
  }

  const runBatch = async (mode: RunBatchMode = "queued_only") => {
    if (running) return;
    setError(null);
    setRunning(true);
    resetPreviewState();

    const targetRows = loadRowsForMode(mode);
    if (!targetRows.length) { setRunning(false); return; }

    try {
      for (const row of targetRows) {
        const { draft } = row;
        const orientation = inferOrientation(draft);
        setRowStage(draft.id, "fetching_template");
        setCurrentDraftId(draft.id);

        try {
          const draftData = buildCampaignDataFromDraft(draft);
          setRowStage(draft.id, mediaAssets.length ? "checking_brand_media" : "fetching_unsplash_fallback");

          const imageAssetPool = await resolveImageAssetPool({ draft, draftData, orientation, mediaAssets });
          if (!imageAssetPool.length) {
            throw new Error("No brand media assets found, and Unsplash fallback returned no image");
          }

          let finalTemplate: any | null = null;
          let finalCampaignData: CampaignData | null = null;
          let finalShapes: TemplateShape[] = [];
          let resolutionFailureReason = "resolved_output_invalid";

          for (let resolutionAttempt = 1; resolutionAttempt <= RESOLUTION_MAX_TRIES; resolutionAttempt++) {
            setRowStage(
              draft.id,
              resolutionAttempt > 1 ? `retrying_resolution_${resolutionAttempt}` : "validating_template",
            );

            const template = await fetchUsableTemplate(draft.id, orientation);

            setRowStage(draft.id, "choosing_assets");
            const aiDecision = await chooseAssets(draft, template, imageAssetPool);

            const heroAsset = imageAssetPool.find((a) => a.id === aiDecision.heroAssetId) || imageAssetPool[0];
            const secondaryAsset = imageAssetPool.find((a) => a.id === aiDecision.secondaryAssetId) || imageAssetPool[1];
            const sponsor1 = orgData?.sponsors[0];
            const sponsor2 = orgData?.sponsors[1];
            const sponsor3 = orgData?.sponsors[2];

            const aiImageSlots: CampaignData["imageSlots"] = {
              ...(heroAsset?.url ? { hero_person: { url: heroAsset.url }, heroImage: { url: heroAsset.url } } : {}),
              ...(secondaryAsset?.url ? { dashboard_image: { url: secondaryAsset.url } } : {}),
              ...(sponsor1?.logo_url ? { sponsor_1: { url: sponsor1.logo_url } } : {}),
              ...(sponsor2?.logo_url ? { sponsor_2: { url: sponsor2.logo_url } } : {}),
              ...(sponsor3?.logo_url ? { sponsor_3: { url: sponsor3.logo_url } } : {}),
            };

            const formatAssetPrice = (asset?: MediaAsset | null) => {
              if (!asset || asset.price == null) return "";
              const value = typeof asset.price === "number" ? asset.price.toString() : String(asset.price);
              const currency = (asset.price_currency || "").toUpperCase();
              const symbolMap: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", MWK: "MWK", ZAR: "R " };
              const prefix = symbolMap[currency] ?? (currency ? `${currency} ` : "");
              return `${prefix}${value}`;
            };

            const heroPriceLabel = aiDecision.showPrice ? formatAssetPrice(heroAsset) : "";

            setRowStage(draft.id, "building_campaign_data");
            const enrichedBase: CampaignData = {
              ...draftData,

              // New segment dataField image fields
              heroImage: heroAsset?.url || (draftData as any).heroImage || "",
              sponsor_logo_1: sponsor1?.logo_url || (draftData as any).sponsor_logo_1 || "",
              sponsor_logo_2: sponsor2?.logo_url || (draftData as any).sponsor_logo_2 || "",
              sponsor_logo_3: sponsor3?.logo_url || (draftData as any).sponsor_logo_3 || "",

              // Existing campaign proof/price fields still supported
              proof: aiDecision.showPrice ? aiDecision.proofText || draftData.proof || heroPriceLabel : draftData.proof,
              price_label: heroPriceLabel || (draftData as any).price_label || "",
              imageSlots: {
                ...(draftData.imageSlots || {}),
                ...aiImageSlots,
              },
            } as CampaignData;
            const enrichedData: CampaignData = orgData ? enrichCampaignData(enrichedBase, orgData) : enrichedBase;

            setRowStage(draft.id, "resolving_shapes");
            const baseShapes = prepareShapes(template, enrichedData);
            const shapes = resolveTemplateSlots(baseShapes, enrichedData);

            setRowStage(draft.id, "validating_output");
            const resolvedValidation = validateResolvedShapes(shapes, enrichedData);
            if (!resolvedValidation.ok) {
              resolutionFailureReason = resolvedValidation.reason || resolutionFailureReason;
              continue;
            }

            finalTemplate = template;
            finalCampaignData = enrichedData;
            finalShapes = shapes;
            break;
          }

          if (!finalTemplate || !finalCampaignData || !finalShapes.length) {
            throw new Error(`Generation rejected: ${resolutionFailureReason}`);
          }

          // Push updated template/shapes into state so the DOM re-renders.
          setCurrentTemplate(finalTemplate);
          setCurrentCampaignData(finalCampaignData);
          setCurrentShapes(finalShapes);
          setCurrentBg(finalTemplate?.backgroundImage || null);

          // Pre-warm the browser image cache so html2canvas can paint immediately.
          setRowStage(draft.id, "preloading_images");
          await preloadShapeImages(finalShapes, finalCampaignData);

          // Allow TemplateCanvas to fully paint text + images before capture.
          await waitForNextPaint(4);
          await sleep(250);

          const file = await exportCanvasFile(
            draft.id,
            `${finalCampaignData.companyName || "draft"}-${draft.id}.png`,
          );

          const finalFile = await enhanceCanvasWithAI(draft.id, file);

          const url = await uploadWithRetry(draft.id, finalFile);
          await attachWithRetry(draft.id, url);

          updateRow(draft.id, { status: "done", message: "complete", imageUrl: url });
        } catch (err: any) {
          updateRow(draft.id, { status: "failed", message: err?.message || "failed" });
        }
      }

      onFinished && (await onFinished());
    } catch (err: any) {
      setError(err?.message || "Batch generation failed");
    } finally {
      setRunning(false);
      setCurrentDraftId(null);
    }
  };

  const handleGenerateAgain = async () => { await runBatch("failed_only"); };

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
        .auto-preview-col { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
        .auto-batch-col { display: flex; flex-direction: column; gap: 12px; min-height: 0; }

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
        .progress-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg,#7c3aed,#4f46e5); transition: width 0.4s ease; }

        .row-item { border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); transition: background 0.15s; }
        .row-item.running { background: rgba(139,92,246,0.07); border-color: rgba(139,92,246,0.2); }
        .row-item.done { background: rgba(52,211,153,0.05); border-color: rgba(52,211,153,0.12); }
        .row-item.failed { background: rgba(248,113,113,0.05); border-color: rgba(248,113,113,0.12); }

        .close-btn {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5); border-radius: 8px; padding: 6px 12px;
          font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
          display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;
        }
        .close-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
        .close-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .spinner-sm {
          width: 12px; height: 12px; flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.1); border-top-color: #a78bfa;
          border-radius: 50%; animation: autopulse-spin 0.6s linear infinite; display: inline-block;
        }

        .org-data-badge {
          display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px;
          border-radius: 20px; font-size: 10px; font-weight: 700;
          font-family: 'DM Mono', monospace; letter-spacing: 0.04em;
        }
        .org-data-badge.loaded { background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.25); color: #34d399; }
        .org-data-badge.loading { background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.25); color: #a78bfa; }

        .auto-stats { display: flex; gap: 12px; flex-wrap: wrap; }

        .preview-shell {
          flex: 1; border-radius: 16px; overflow: hidden; background: #0c0c0f;
          display: flex; align-items: center; justify-content: center;
          min-height: 300px; position: relative; transition: all 0.2s ease;
        }
        .preview-shell.idle { border: 1px solid rgba(255,255,255,0.08); }
        .preview-shell.active { border: 1px solid rgba(167,139,250,0.28); box-shadow: 0 0 0 1px rgba(167,139,250,0.08), inset 0 0 40px rgba(124,58,237,0.10); }

        .preview-running-pill {
          position: absolute; top: 10px; left: 10px;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 8px; border-radius: 999px;
          background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.24);
          color: #c4b5fd; font-size: 10px; font-weight: 700;
          font-family: 'DM Mono', monospace; z-index: 2;
        }

        .preview-facts { display: flex; flex-wrap: wrap; gap: 6px; }
        .preview-fact {
          font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 999px;
          background: rgba(167,139,250,0.10); border: 1px solid rgba(167,139,250,0.22);
          color: #c4b5fd; font-family: 'DM Mono', monospace;
        }

        @keyframes autopulse-spin { to { transform: rotate(360deg); } }
        @keyframes autopulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

        @media (max-width: 640px) {
          .auto-dialog { border-radius: 16px !important; max-height: 96vh; }
          .auto-body { grid-template-columns: 1fr; overflow-y: auto; padding: 12px; gap: 12px; }
          .auto-preview-col { display: none; }
          .auto-batch-col { overflow: visible; min-height: unset; }
          .auto-stats { gap: 8px; }
          .auto-start-btn { padding: 9px 14px; font-size: 11px; }
        }
      `}</style>

      <Dialog open={open} onOpenChange={(v) => !running && onOpenChange(v)}>
        <DialogContent className="auto-dialog">
          <DialogHeader style={{ padding: "16px 20px 0", flexShrink: 0 }}>
            <div style={{  gap: 8 }}>
              <div style={{ display: "flex", marginBottom:"8", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <DialogTitle style={{ fontSize: 15, fontWeight: 800, color: "#e4e4e7", fontFamily: "Syne, sans-serif" }}>
                    Media generation
                  </DialogTitle>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {orgDataLoading ? (
                  <span className="org-data-badge loading"><span className="spinner-sm" style={{ width: 8, height: 8 }} />Loading org data…</span>
                ) : orgData ? (
                  <span className="org-data-badge loaded">✓ Org data ready · {(orgData.reviews || []).length} reviews · {(orgData.sponsors || []).length} sponsors</span>
                ) : null}
                <button className="close-btn" onClick={() => !running && onOpenChange(false)} disabled={running}>
                  <X className="w-3 h-3" /> Close
                </button>
              </div>
            </div>
          </DialogHeader>

          <div className="auto-body">
            {/* ── LEFT: Live preview ─────────────────────────────────────── */}
            <div className="auto-preview-col">
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
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

                    {/*
                      previewRef is the visible preview for UI.
                      Scaled/clipped to fit the container for readability.
                    */}
                    <div
                      ref={previewRef}
                      style={{ width: "100%", height: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <TemplateCanvas
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
                    </div>

                    {/*
                      HIDDEN CAPTURE DIV: Positioned off-screen at exact template
                      dimensions (no scaling). html2canvas will target this div to
                      capture the full unclipped canvas at exact pixel dimensions.
                    */}
                    <div
                      ref={captureRef}
                      style={{
                        position: "fixed",
                        left: -9999,
                        top: -9999,
                        width: currentTemplate?.canvasWidth || PORTRAIT_W,
                        height: currentTemplate?.canvasHeight || PORTRAIT_H,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "transparent",
                        pointerEvents: "none",
                      }}
                    >
                      <TemplateCanvas
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
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "rgba(255,255,255,0.22)", textAlign: "center", padding: 24 }}>
                    <ImageIcon className="w-10 h-10" style={{ opacity: 0.2 }} />
                    <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>Ready to generate</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", maxWidth: 320 }}>
                      The live preview will appear here as each draft is prepared and rendered.
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                      <button className="auto-start-btn" onClick={() => void runBatch()} disabled={running || orgDataLoading || !rows.length}>
                        {running ? <><span className="spinner-sm" />Generating…</> : orgDataLoading ? <><span className="spinner-sm" />Loading data…</> : <><Play className="w-3.5 h-3.5 fill-white" />Start Generation</>}
                      </button>
                      <button className="close-btn" onClick={resetSession} disabled={running}>
                        <RefreshCcw className="w-3 h-3" /> Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {previewFacts.length > 0 && (
                <div className="preview-facts">
                  {previewFacts.map((fact, i) => (
                    <span key={`${fact}-${i}`} className="preview-fact">{fact}</span>
                  ))}
                </div>
              )}

              {orgData && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { label: "Reviews", val: (orgData.reviews || []).length },
                    { label: "Sponsors", val: (orgData.sponsors || []).length },
                    { label: "Accreditations", val: (orgData.accreditations || []).length },
                    { label: "Offers", val: (orgData.offers || []).length },
                  ].map(({ label, val }) =>
                    val > 0 ? (
                      <span key={label} style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399", fontFamily: "DM Mono, monospace" }}>
                        {val} {label}
                      </span>
                    ) : null,
                  )}
                </div>
              )}

              {currentDraftId && (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="spinner-sm" />
                  {runningRow?.message || "Processing…"} — <span style={{ color: "#a78bfa" }}>{currentDraftId.slice(0, 16)}…</span>
                </div>
              )}
            </div>

            {/* ── RIGHT: Batch queue ─────────────────────────────────────── */}
            <div className="auto-batch-col">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div className="auto-stats">
                  {[
                    { label: "Queued", val: queuedCount, color: "#6b7280" },
                    { label: "Done", val: doneCount, color: "#34d399" },
                    { label: "Failed", val: failCount, color: "#f87171" },
                    { label: "Skipped", val: skippedCount, color: "#fbbf24" },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color }}>{val}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="auto-start-btn" onClick={() => void runBatch()} disabled={running || queuedCount === 0 || orgDataLoading}>
                    {running ? <><span className="spinner-sm" />Generating…</> : orgDataLoading ? <><span className="spinner-sm" />Loading data…</> : <><Play className="w-3.5 h-3.5 fill-white" />Start</>}
                  </button>
                  <button className="close-btn" onClick={() => void handleGenerateAgain()} disabled={running || orgDataLoading}>
                    <RefreshCcw className="w-3 h-3" /> Retry Failed
                  </button>
                </div>
              </div>

              {rows.length > 0 && (
                <div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>
                    <span>{progress}% complete</span>
                    <span>{doneCount + failCount + skippedCount} / {rows.length}</span>
                  </div>
                </div>
              )}

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

              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, maxHeight: 380 }}>
                {rows.map((row) => (
                  <div key={row.draft.id} className={`row-item ${row.status}`} style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.05)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {row.imageUrl ? (
                        <img src={row.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
