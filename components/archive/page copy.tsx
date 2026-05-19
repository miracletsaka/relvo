"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Image as ImageIcon, Loader2, Send, User } from "lucide-react";

import {
  preloadFonts,
  createRenderer,
  type Renderer,
  type CanvasSegment as RendererCanvasSegment,
} from "@/lib/canvas-renderer";
import {
  Brand,
  listBrands,
  getBrandProfile,
  type BrandProfile,
  createTopicChatAndGenerate,
  listTopicChatDrafts,
} from "@/lib/api";
import { Tone, CampaignData, TemplateShape } from "@/lib/types";
import { apiFetch } from "@/lib/tone";
import {
  buildCampaignDataFromDraft,
  PORTRAIT_H,
  PORTRAIT_W,
} from "@/lib/design-studio-utils";
import {
  fetchOrgCampaignData,
  enrichCampaignData,
  type OrgCampaignData,
} from "@/lib/org-campaign-enricher";
import { composeRandomTemplateFromDb } from "@/lib/compose-random-template";
import { createThread, getMessages, listThreads, replyToThread, updateMessage } from "@/app/api/ai-chat-api";

type ChatRole = "user" | "assistant" | "system";
type ChatStatus = "idle" | "generating" | "ready" | "error";

const CANVAS_W = 1080;
const CANVAS_H = 1350;

const C = {
  bg: "#08080c",
  panel: "#0e0e14",
  border: "rgba(255,255,255,0.08)",
  surface: "rgba(255,255,255,0.04)",
  accent: "#7c3aed",
  accentLt: "#a78bfa",
  text: "#e4e4e7",
  muted: "rgba(255,255,255,0.48)",
  dim: "rgba(255,255,255,0.24)",
  green: "#34d399",
  cyan: "#22d3ee",
  red: "#f87171",
  mono: "'DM Mono', monospace",
  sans: "'Syne', sans-serif",
};

type Draft = {
  id: string;
  platform: string;
  status: string;
  body_text?: string;
  hashtags?: string;
  org_slug?: string;
  scheduled_at?: string;
  structured?: Record<string, any>;
  media_url?: string;
  media_urls?: any[];
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  status?: ChatStatus;
  messageType?: string;
  metadata?: Record<string, any>;
  draft?: Draft | null;
  campaignData?: CampaignData | null;
  shapes?: TemplateShape[];
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundImage?: string | null;
  topicChatId?: string | null;
};

const TEMPLATE_FAMILY = "mixed-poster";

const DEFAULT_SECTIONS = [
  "background",
  "hero-image",
  "hero-text",
  "features",
  "cta",
  "footer",
];

function uid(prefix = "msg") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function safeGenerateWithFallback(
  params: Parameters<typeof createTopicChatAndGenerate>[0],
  onChatIdKnown: (id: string) => void,
  onProgress?: (draftsCount: number) => void,
): Promise<{ generated: number; failed: number; topic_chat_id: string | null }> {
  console.log("[safeGenerateWithFallback] called with params:", JSON.stringify(params, null, 2));

  const res = await createTopicChatAndGenerate(params);
  console.log("[safeGenerateWithFallback] raw response from createTopicChatAndGenerate:", res);
  console.log("[safeGenerateWithFallback] typeof res:", typeof res);
  console.log("[safeGenerateWithFallback] res keys:", res ? Object.keys(res as object) : "res is null/undefined");

  const topicChatId: string | null = (res as any)?.topic_chat_id ?? null;
  console.log("[safeGenerateWithFallback] extracted topicChatId:", topicChatId);

  if (!topicChatId) {
    console.error("[safeGenerateWithFallback] FATAL: No topic_chat_id in response");
    throw new Error("No topic_chat_id returned from server");
  }

  onChatIdKnown(topicChatId);

  const serverStatus = (res as any)?.status;
  console.log("[safeGenerateWithFallback] serverStatus:", serverStatus);

  if (serverStatus !== "processing") {
    console.log("[safeGenerateWithFallback] not processing, returning immediately");
    return {
      generated: (res as any)?.generated ?? 0,
      failed: (res as any)?.failed ?? 0,
      topic_chat_id: topicChatId,
    };
  }

  console.log("[safeGenerateWithFallback] status is 'processing', starting poll loop");

  const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
  const POLL_INTERVAL = 4000;
  const POLL_TIMEOUT = 900_000;
  const pollStart = Date.now();

  while (Date.now() - pollStart < POLL_TIMEOUT) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    try {
      const pollUrl = `${API}/topic-chats/${topicChatId}/status`;
      console.log("[safeGenerateWithFallback] polling:", pollUrl);

      const pollRes = await fetch(pollUrl, { credentials: "include" });
      const poll = await pollRes.json();

      console.log("[safeGenerateWithFallback] poll response:", poll);

      if (poll.drafts_so_far !== undefined) {
        console.log("[safeGenerateWithFallback] drafts_so_far:", poll.drafts_so_far);
        onProgress?.(poll.drafts_so_far);
      }

      if (poll.status === "done") {
        console.log("[safeGenerateWithFallback] poll done:", poll);
        return {
          generated: poll.generated ?? 0,
          failed: poll.failed ?? 0,
          topic_chat_id: topicChatId,
        };
      }

      if (poll.status === "failed") {
        console.error("[safeGenerateWithFallback] poll returned failed:", poll);
        throw new Error(poll.error || "Generation failed on server");
      }
    } catch (pollErr: any) {
      if (pollErr?.message?.includes("Generation failed")) {
        throw pollErr;
      }
      console.warn("[safeGenerateWithFallback] poll error (retrying):", pollErr?.message);
    }
  }

  console.warn("[safeGenerateWithFallback] poll timed out, fetching drafts directly");
  const drafts: Draft[] = await listTopicChatDrafts(topicChatId).catch(() => []);
  console.log("[safeGenerateWithFallback] fallback drafts after timeout:", drafts);

  return {
    generated: drafts.filter((d) => d.status !== "FAILED").length,
    failed: drafts.filter((d) => d.status === "FAILED").length,
    topic_chat_id: topicChatId,
  };
}

function getComposedShapes(composed: any): TemplateShape[] {
  console.log("[getComposedShapes] composed object:", composed);
  console.log("[getComposedShapes] composed keys:", composed ? Object.keys(composed) : "null/undefined");

  const shapes = composed?.shapes || composed?.template_shapes || composed?.layout?.shapes;
  console.log("[getComposedShapes] resolved shapes source:", 
    composed?.shapes ? "composed.shapes" :
    composed?.template_shapes ? "composed.template_shapes" :
    composed?.layout?.shapes ? "composed.layout.shapes" : "NONE FOUND"
  );
  console.log("[getComposedShapes] raw shapes value:", shapes);
  console.log("[getComposedShapes] Array.isArray(shapes):", Array.isArray(shapes));
  console.log("[getComposedShapes] shapes length:", Array.isArray(shapes) ? shapes.length : "N/A");

  return Array.isArray(shapes) ? (shapes as TemplateShape[]) : [];
}

function getDraftTitle(draft: Draft | null | undefined) {
  const s = draft?.structured || {};
  return (
    s.headline ||
    s.hook ||
    draft?.body_text?.slice(0, 90) ||
    "Generated campaign"
  );
}

function getDraftCaption(draft: Draft | null | undefined) {
  return [draft?.body_text, draft?.hashtags].filter(Boolean).join("\n\n");
}


function getCampaignValueFromData(data: CampaignData, field: string): string {
  const d = (data || {}) as any;
  const direct = d[field];

  if (typeof direct === "string") return direct;
  if (typeof direct === "number") return String(direct);

  if (field === "headline") return d.headline || d.hook || "";
  if (field === "subheadline") return d.subheadline || d.subheading || "";
  if (field === "description") return d.subheadline || d.subheading || "";
  if (field === "product_name") return d.product_name || d.companyName || "";

  if (field === "campaign_label") return d.campaign_label || d.hook_tag || "";
  if (field === "collection_label") return d.collection_label || "";
  if (field === "footer_label") return d.footer_label || d.companyName || "";

  if (field === "cta_text") return d.cta_text || d.cta || d.offer_cta || "";
  if (field === "offer_value") return d.offer_value || d.price_label || "";
  if (field === "offer_label") return d.offer_label || d.hook_tag || "";

  if (field === "proof") return d.proof || "";

  if (field === "feature_1") return d.feature_1 || d.bullet_1 || d.bullets?.[0] || "";
  if (field === "feature_2") return d.feature_2 || d.bullet_2 || d.bullets?.[1] || "";
  if (field === "feature_3") return d.feature_3 || d.bullet_3 || d.bullets?.[2] || "";
  if (field === "feature_4") return d.feature_4 || d.metadata?.[0]?.value || "";

  if (field === "phone") return d.phone || d.businessInfo?.phone_primary || "";
  if (field === "website") return d.website || d.businessInfo?.website || "";
  if (field === "email") return d.email || d.businessInfo?.email_primary || "";
  if (field === "whatsapp") return d.whatsapp || d.businessInfo?.whatsapp || "";

  if (field === "business_website") return d.website || d.businessInfo?.website || "";

  if (field === "contact_row1") {
    const company = d.companyName || "NeuroFlow";
    const phone = d.phone || d.businessInfo?.phone_primary || "";
    const email = d.email || d.businessInfo?.email_primary || "";
    return [company, phone, email].filter(Boolean).join(" · ");
  }

  if (field === "contact_row2") {
    const city = d.city || d.businessInfo?.city || "";
    const country = d.country || d.businessInfo?.country || "";
    const instagram = d.instagram_url ? "IG: @neuroflowai" : "";
    return [city, country, instagram].filter(Boolean).join(" · ");
  }

  if (field === "review_text") return d.review_text || d.reviews?.[0]?.body || "";
  if (field === "review_author") return d.review_author || d.reviews?.[0]?.author_name || "";
  if (field === "review_rating") return d.reviews?.[0]?.rating ? "★★★★★" : "";

  if (field === "offer_title") return d.offer_title || d.offers?.[0]?.title || "";
  if (field === "offer_description") return d.offer_description || d.offers?.[0]?.description || "";
  if (field === "price") return d.price_label || "";
  if (field === "discount_label") return d.hook_tag || d.offer_label || "";

  if (field === "social_handle") return d.social_handle || "@neuroflowai";

  return "";
}

function getSlotUrlFromData(data: CampaignData, slotKey: string, logoUrl: string | null): string | null {
  const d = (data || {}) as any;

  if (slotKey === "logo") return logoUrl || d.logo || d.imageSlots?.logo?.url || null;

  const slotUrl = d.imageSlots?.[slotKey]?.url;
  if (slotUrl) return slotUrl;

  if (slotKey === "hero_person") return d.heroImage || d.imageSlots?.heroImage?.url || null;
  if (slotKey === "heroImage") return d.heroImage || d.imageSlots?.hero_person?.url || null;
  if (slotKey === "dashboard_image") return d.dashboard_image || d.imageSlots?.dashboard_image?.url || null;

  if (slotKey === "sponsor_1") return d.sponsor_logo_1 || d.sponsors?.[0]?.logo_url || null;
  if (slotKey === "sponsor_2") return d.sponsor_logo_2 || d.sponsors?.[1]?.logo_url || null;
  if (slotKey === "sponsor_3") return d.sponsor_logo_3 || d.sponsors?.[2]?.logo_url || null;

  return null;
}

function sanitizeShapes(shapes: TemplateShape[]): TemplateShape[] {
  return (Array.isArray(shapes) ? shapes : [])
    .filter(Boolean)
    .map((shape: any, index: number) => ({
      ...shape,
      id: shape.id || `shape-${index}`,
      type: shape.type || "rectangle",
      x: Number.isFinite(Number(shape.x)) ? Number(shape.x) : 0,
      y: Number.isFinite(Number(shape.y)) ? Number(shape.y) : 0,
      width: Number.isFinite(Number(shape.width)) ? Number(shape.width) : 100,
      height: Number.isFinite(Number(shape.height)) ? Number(shape.height) : 100,
      zIndex: Number.isFinite(Number(shape.zIndex)) ? Number(shape.zIndex) : index,
      borderWidth: Number.isFinite(Number(shape.borderWidth)) ? Number(shape.borderWidth) : 0,
      borderRadius: Number.isFinite(Number(shape.borderRadius)) ? Number(shape.borderRadius) : 0,
      radius: Number.isFinite(Number(shape.radius)) ? Number(shape.radius) : 0,
      opacity: shape.opacity === undefined ? 1 : Number(shape.opacity),
      backgroundColor:
        shape.backgroundColor ??
        (shape.type === "text" || shape.type === "image" ? "transparent" : "rgba(255,255,255,0)"),
      textColor: shape.textColor ?? "#ffffff",
      borderColor: shape.borderColor ?? "transparent",
      fontFamily: shape.fontFamily || "'Montserrat', sans-serif",
      fontSize: Number.isFinite(Number(shape.fontSize)) ? Number(shape.fontSize) : 24,
      fontWeight: shape.fontWeight ?? 700,
      textAlign: shape.textAlign || "left",
      lineHeight: Number.isFinite(Number(shape.lineHeight)) ? Number(shape.lineHeight) : 1.15,
      letterSpacing: Number.isFinite(Number(shape.letterSpacing)) ? Number(shape.letterSpacing) : 0,
      fit: shape.fit || "cover",
      gradientColors: Array.isArray(shape.gradientColors)
        ? shape.gradientColors.filter((g: any) => g && typeof g.color === "string")
        : undefined,
    })) as TemplateShape[];
}


function getShapeLabel(shape: any) {
  if (!shape) return "No shape";
  return (shape.dataField || shape.slotKey || shape.text || shape.type || shape.id || "Shape").toString();
}

function hitTestShape(shapes: TemplateShape[], x: number, y: number): TemplateShape | null {
  const ordered = [...(shapes || [])].sort((a: any, b: any) => Number(b.zIndex || 0) - Number(a.zIndex || 0));
  for (const shape of ordered as any[]) {
    const sx = Number(shape.x || 0);
    const sy = Number(shape.y || 0);
    const sw = Number(shape.width || 0);
    const sh = Number(shape.height || 0);
    if (x >= sx && x <= sx + sw && y >= sy && y <= sy + sh) return shape as TemplateShape;
  }
  return null;
}

function EditableCanvasSidebar({
  message,
  selectedShapeId,
  onSelectShape,
  onPatchShape,
  onClose,
}: {
  message?: ChatMessage | null;
  selectedShapeId: string | null;
  onSelectShape: (shapeId: string | null) => void;
  onPatchShape: (patch: Partial<TemplateShape>) => void;
  onClose: () => void;
}) {
  const shapes = message?.shapes || [];
  const selectedShape = shapes.find((s: any) => s.id === selectedShapeId) as any;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.045)",
    color: "#fff",
    padding: "10px 11px",
    outline: "none",
    fontSize: 12,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    color: "rgba(255,255,255,0.42)",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  };

  const field = (label: string, node: React.ReactNode) => (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {node}
    </div>
  );

  return (
    <aside style={{ width: 340, flex: "0 0 340px", borderLeft: "1px solid rgba(255,255,255,0.08)", background: "rgba(8,8,12,0.96)", padding: 18, overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Edit Canvas</div>
          <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, marginTop: 3 }}>Select a layer, then adjust it manually.</div>
        </div>
        <button onClick={onClose} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "white", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>Close</button>
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 12, background: "rgba(255,255,255,0.03)", marginBottom: 14 }}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>Layers</div>
        <div style={{ display: "grid", gap: 7, maxHeight: 230, overflowY: "auto" }}>
          {[...shapes].sort((a: any, b: any) => Number(b.zIndex || 0) - Number(a.zIndex || 0)).map((shape: any) => (
            <button key={shape.id} onClick={() => onSelectShape(shape.id)} style={{ textAlign: "left", borderRadius: 10, border: selectedShapeId === shape.id ? "1px solid rgba(167,139,250,0.8)" : "1px solid rgba(255,255,255,0.06)", background: selectedShapeId === shape.id ? "rgba(124,58,237,0.22)" : "rgba(255,255,255,0.035)", color: "white", padding: "9px 10px", cursor: "pointer", fontSize: 11 }}>
              <div style={{ fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{getShapeLabel(shape)}</div>
              <div style={{ color: "rgba(255,255,255,0.36)", marginTop: 3 }}>{shape.type} · z{shape.zIndex ?? 0}</div>
            </button>
          ))}
        </div>
      </div>

      {!selectedShape ? (
        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.55 }}>Click a shape on the canvas or select one from layers.</div>
      ) : (
        <>
          <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 12, background: "rgba(255,255,255,0.03)", marginBottom: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>{getShapeLabel(selectedShape)}</div>
            {field("Position", <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input style={inputStyle} type="number" value={Number(selectedShape.x || 0)} onChange={(e) => onPatchShape({ x: Number(e.target.value) } as any)} /><input style={inputStyle} type="number" value={Number(selectedShape.y || 0)} onChange={(e) => onPatchShape({ y: Number(e.target.value) } as any)} /></div>)}
            {field("Size", <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input style={inputStyle} type="number" value={Number(selectedShape.width || 0)} onChange={(e) => onPatchShape({ width: Number(e.target.value) } as any)} /><input style={inputStyle} type="number" value={Number(selectedShape.height || 0)} onChange={(e) => onPatchShape({ height: Number(e.target.value) } as any)} /></div>)}
            {field("Layer", <input style={inputStyle} type="number" value={Number(selectedShape.zIndex || 0)} onChange={(e) => onPatchShape({ zIndex: Number(e.target.value) } as any)} />)}
            {selectedShape.type === "text" && <>
              {field("Text", <textarea style={{ ...inputStyle, minHeight: 92, resize: "vertical" }} value={(selectedShape.text || "").toString()} onChange={(e) => onPatchShape({ text: e.target.value } as any)} />)}
              {field("Font Size", <input style={inputStyle} type="number" value={Number(selectedShape.fontSize || 24)} onChange={(e) => onPatchShape({ fontSize: Number(e.target.value) } as any)} />)}
              {field("Text Color", <input style={inputStyle} value={(selectedShape.textColor || "#ffffff").toString()} onChange={(e) => onPatchShape({ textColor: e.target.value } as any)} />)}
              {field("Align", <select style={inputStyle} value={(selectedShape.textAlign || "left").toString()} onChange={(e) => onPatchShape({ textAlign: e.target.value } as any)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>)}
            </>}
            {selectedShape.type !== "text" && <>
              {field("Background", <input style={inputStyle} value={(selectedShape.backgroundColor || "transparent").toString()} onChange={(e) => onPatchShape({ backgroundColor: e.target.value } as any)} />)}
              {field("Opacity", <input style={inputStyle} type="number" min={0} max={1} step={0.05} value={Number(selectedShape.opacity ?? 1)} onChange={(e) => onPatchShape({ opacity: Number(e.target.value) } as any)} />)}
            </>}
          </div>
          <button onClick={() => onSelectShape(null)} style={{ width: "100%", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "white", borderRadius: 12, padding: "12px 14px", cursor: "pointer", fontWeight: 850 }}>Clear Selection</button>
        </>
      )}
    </aside>
  );
}

function CanvasPreview({
  campaignData,
  shapes,
  canvasWidth,
  canvasHeight,
  isEditable = false,
  selectedShapeId,
  onSelectShape,
  onPatchShapes,
}: {
  campaignData: CampaignData;
  shapes: TemplateShape[];
  canvasWidth: number;
  canvasHeight: number;
  backgroundImage?: string | null;
  isEditable?: boolean;
  selectedShapeId?: string | null;
  onSelectShape?: (shapeId: string | null) => void;
  onPatchShapes?: (updater: (prev: TemplateShape[]) => TemplateShape[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const dragRef = useRef<{ shapeId: string; startX: number; startY: number; originalX: number; originalY: number } | null>(null);
  const [fontsReady, setFontsReady] = useState(false);

  const zoom = 0.34;
  const safeShapes = useMemo(() => sanitizeShapes(shapes), [shapes]);

  const getCanvasPoint = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvasWidth,
      y: ((event.clientY - rect.top) / rect.height) * canvasHeight,
    };
  };

  const handlePointerDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditable) return;
    const point = getCanvasPoint(event);
    const hit = hitTestShape(safeShapes, point.x, point.y) as any;
    if (!hit?.id) { onSelectShape?.(null); return; }
    onSelectShape?.(hit.id);
    dragRef.current = { shapeId: hit.id, startX: point.x, startY: point.y, originalX: Number(hit.x || 0), originalY: Number(hit.y || 0) };
  };

  const handlePointerMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditable || !dragRef.current || !onPatchShapes) return;
    const point = getCanvasPoint(event);
    const drag = dragRef.current;
    const dx = point.x - drag.startX;
    const dy = point.y - drag.startY;
    onPatchShapes((prev) => sanitizeShapes(prev).map((shape: any) => shape.id === drag.shapeId ? { ...shape, x: Math.round(drag.originalX + dx), y: Math.round(drag.originalY + dy) } : shape));
  };

  const handlePointerUp = () => { dragRef.current = null; };

  useEffect(() => {
    preloadFonts().then(() => setFontsReady(true)).catch(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    rendererRef.current?.destroy();

    rendererRef.current = createRenderer(canvasRef.current, {
      getCampaignValue: (field: string) => getCampaignValueFromData(campaignData, field),
      getSlotUrl: (slotKey: string, logoUrl: string | null) =>
        getSlotUrlFromData(campaignData, slotKey, logoUrl),
    });

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [campaignData]);

  useEffect(() => {
    if (!rendererRef.current) return;

    const segment: RendererCanvasSegment = {
      id: "ai-chat-composed",
      instanceId: "ai-chat-composed",
      name: "AI Chat Preview",
      description: "Composed from DB segments",
      segment_type: "campaign_composition",
      internal_segment_type: "campaign_composition",
      requested_type: "campaign_composition",
      y: 0,
      segment_height: canvasHeight,
      shapes: safeShapes as any[],
    };

    void rendererRef.current.draw(
      [segment],
      "#7c3aed",
      ((campaignData as any)?.logo || null) as string | null,
      null,
      null,
    ).then(() => {
      if (!isEditable || !selectedShapeId || !canvasRef.current) return;
      const selected = safeShapes.find((s: any) => s.id === selectedShapeId) as any;
      if (!selected) return;
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      ctx.save();
      ctx.strokeStyle = "rgba(124,58,237,0.95)";
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(Number(selected.x || 0), Number(selected.y || 0), Number(selected.width || 0), Number(selected.height || 0));
      ctx.restore();
    });
  }, [campaignData, safeShapes, canvasHeight, fontsReady, isEditable, selectedShapeId]);

  return (
    <main
      style={{
        overflow: "auto",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: 24,
        flex: 1,
        minWidth: 0,
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
            color: C.muted,
            fontSize: 11,
            fontFamily: C.mono,
            width: canvasWidth * zoom,
          }}
        >
          <span>
            FULL CANVAS · {canvasWidth}x{canvasHeight}
          </span>
          <span>{safeShapes.length} shapes</span>
        </div>

        <div
          style={{
            width: canvasWidth * zoom,
            height: canvasHeight * zoom,
            borderRadius: 10,
            overflow: "hidden",
            background: "#05070b",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.7)",
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            style={{
              width: canvasWidth * zoom,
              height: canvasHeight * zoom,
              display: "block",
              cursor: isEditable ? "move" : "default",
            }}
          />
        </div>
      </div>
    </main>
  );
}

function dbMessageToChatMessage(row: any): ChatMessage {
  const metadata = row.metadata || {};

  if (row.message_type === "generated_image") {
    return {
      id: row.id,
      role: row.role,
      text: row.content,
      status: "ready",
      messageType: row.message_type,
      metadata,
      draft: metadata.draft || null,
      campaignData: metadata.campaign_data || null,
      shapes: Array.isArray(metadata.shapes) ? metadata.shapes : [],
      canvasWidth: metadata.canvas_width || PORTRAIT_W,
      canvasHeight: metadata.canvas_height || PORTRAIT_H,
      backgroundImage: metadata.background_image || null,
      topicChatId: metadata.topic_chat_id || null,
    };
  }

  return {
    id: row.id,
    role: row.role,
    text: row.content,
    status: "ready",
    messageType: row.message_type,
    metadata,
  };
}

export default function DesignStudioAiChatPage() {
  const endRef = useRef<HTMLDivElement | null>(null);

  const [prompt, setPrompt] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState("");
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);

  const [tones, setTones] = useState<Tone[]>([]);
  const [toneId, setToneId] = useState("");

  const [orgData, setOrgData] = useState<OrgCampaignData | null>(null);
  const [progressText, setProgressText] = useState("");
  const [running, setRunning] = useState(false);
  const [activeEditableMessageId, setActiveEditableMessageId] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid("assistant"),
      role: "assistant",
      text: "Tell me what campaign image you want. I will generate the campaign data, compose random DB segments, and show the poster here before saving.",
      status: "idle",
    },
  ]);

  const selectedBrand = useMemo(
    () => brands.find((b) => b.id === brandId) || null,
    [brands, brandId],
  );

  const selectedTone = useMemo(
    () => tones.find((t) => t.id === toneId) || null,
    [tones, toneId],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, progressText, running]);

  useEffect(() => {
    console.log("[init] loading brands, tones, org data...");
    (async () => {
      try {
        const [brandRows, toneRows, org] = await Promise.all([
          listBrands(true),
          apiFetch<Tone[]>("/tones?active_only=false").catch((e) => {
            console.warn("[init] tones fetch failed:", e);
            return [];
          }),
          fetchOrgCampaignData().catch((e) => {
            console.warn("[init] orgData fetch failed:", e);
            return null;
          }),
        ]);

        console.log("[init] brandRows:", brandRows);
        console.log("[init] toneRows:", toneRows);
        console.log("[init] orgData:", org);

        setBrands(Array.isArray(brandRows) ? brandRows : []);
        setTones(Array.isArray(toneRows) ? toneRows : []);
        setOrgData(org);

        if (Array.isArray(brandRows) && brandRows.length > 0) {
          setBrandId((prev) => prev || brandRows[0].id);
        }

        if (Array.isArray(toneRows) && toneRows.length > 0) {
          setToneId((prev) => prev || toneRows[0].id);
        }
      } catch (err) {
        console.error("[init] FATAL initial load failed:", err);
      }
    })();
  }, []);

  function dbMessageToChatMessage(row: any): ChatMessage {
  const metadata = row.metadata || {};

  if (row.message_type === "generated_image") {
    return {
      id: row.id,
      role: row.role,
      text: row.content,
      status: "ready",
      messageType: row.message_type,
      metadata,
      draft: metadata.draft || null,
      campaignData: metadata.campaign_data || null,
      shapes: Array.isArray(metadata.shapes) ? metadata.shapes : [],
      canvasWidth: metadata.canvas_width || PORTRAIT_W,
      canvasHeight: metadata.canvas_height || PORTRAIT_H,
      backgroundImage: metadata.background_image || null,
      topicChatId: metadata.topic_chat_id || null,
    };
  }

  if (row.message_type === "generated_month") {
    return {
      id: row.id,
      role: row.role,
      text: row.content,
      status: "ready",
      messageType: row.message_type,
      metadata,
    };
  }

  return {
    id: row.id,
    role: row.role,
    text: row.content,
    status: "ready",
    messageType: row.message_type,
    metadata,
  };
}

useEffect(() => {
  const loadOrCreateThread = async () => {
    try {
      const threads = await listThreads();

      let threadId: string | null = null;

      if (Array.isArray(threads) && threads.length > 0) {
        threadId = threads[0].id;
      } else {
        const thread = await createThread({
          title: "New marketing chat",
          brand_id: brandId || null,
          tone_id: toneId || null,
        });

        threadId = thread.id;
      }

      setSelectedThreadId(threadId);

      const rows = await getMessages(threadId);

      if (Array.isArray(rows) && rows.length > 0) {
        setMessages(rows.map(dbMessageToChatMessage));
      }

      if (Array.isArray(rows) && rows.length > 0) {
        setMessages(rows.map(dbMessageToChatMessage));
      }
    } catch (err) {
      console.error("[ai-chat] failed to load/create thread", err);
    }
  };

  void loadOrCreateThread();
}, []);

  useEffect(() => {
    if (!brandId) return;
    console.log("[brandProfile] fetching for brandId:", brandId);
    getBrandProfile(brandId)
      .then((p) => {
        console.log("[brandProfile] result:", p);
        setBrandProfile(p);
      })
      .catch((e) => {
        console.warn("[brandProfile] fetch failed:", e);
        setBrandProfile(null);
      });
  }, [brandId]);

  const appendMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  };

  const patchMessage = (id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...patch } : msg)),
    );
  };

  const startEditingMessage = (messageId: string) => {
    setActiveEditableMessageId(messageId);
    setSelectedShapeId(null);
  };

  const stopEditingMessage = () => {
    setActiveEditableMessageId(null);
    setSelectedShapeId(null);
  };

  const patchActiveMessageShapes = (messageId: string, updater: (prev: TemplateShape[]) => TemplateShape[]) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const nextShapes = sanitizeShapes(updater(msg.shapes || []));
        return { ...msg, shapes: nextShapes, metadata: { ...(msg.metadata || {}), shapes: nextShapes } };
      }),
    );
  };

  const patchSelectedShape = (patch: Partial<TemplateShape>) => {
    if (!activeEditableMessageId || !selectedShapeId) return;
    patchActiveMessageShapes(activeEditableMessageId, (prev) =>
      sanitizeShapes(prev).map((shape: any) => shape.id === selectedShapeId ? { ...shape, ...patch } : shape),
    );
  };

  const sendMessage = async () => {
  const topic = prompt.trim();

  if (!topic || running) return;

  if (!brandId) {
    appendMessage({
      id: uid("system"),
      role: "system",
      text: "Please select a brand first.",
      status: "error",
    });

    return;
  }

  if (!selectedThreadId) {
    appendMessage({
      id: uid("system"),
      role: "system",
      text: "Chat thread is not ready yet.",
      status: "error",
    });

    return;
  }

  setPrompt("");
  setRunning(true);

  const optimisticUserId = uid("user");
  const optimisticAssistantId = uid("assistant");

  appendMessage({
    id: optimisticUserId,
    role: "user",
    text: topic,
  });

  appendMessage({
    id: optimisticAssistantId,
    role: "assistant",
    text: "Thinking…",
    status: "generating",
  });

  try {
    const replyData = await replyToThread(selectedThreadId, {
      content: topic,
      brand_id: brandId,
      tone_id: toneId || null,
    });

    const savedUser = replyData.user_message;
    const savedAssistant = replyData.assistant_message;

    patchMessage(optimisticUserId, {
      id: savedUser.id,
      text: savedUser.content,
      status: "ready",
    });

    patchMessage(optimisticAssistantId, {
      id: savedAssistant.id,
      text: savedAssistant.content,
      status: "ready",
      messageType: savedAssistant.message_type,
      metadata: savedAssistant.metadata || {},
    });

    /*
    ─────────────────────────────────────────────
    NORMAL CHAT
    ─────────────────────────────────────────────
    */

    if (
      savedAssistant.message_type !== "generate_image" &&
      savedAssistant.message_type !== "generate_month_content"
    ) {
      setRunning(false);
      return;
    }

    /*
    ─────────────────────────────────────────────
    MONTH GENERATION
    ─────────────────────────────────────────────
    */

    if (savedAssistant.message_type === "generate_month_content") {
      patchMessage(savedAssistant.id, {
        text: "Generating monthly content plan…",
        status: "generating",
      });

      setProgressText("Generating monthly content…");

      const monthItems: any[] = [];

      for (let i = 0; i < 4; i++) {
        setProgressText(`Generating post ${i + 1} of 4…`);

        const genRes = await safeGenerateWithFallback(
          {
            brand_id: brandId,
            tone_id: toneId || null,
            topic: `${topic}. Monthly campaign post ${i + 1}. Make it unique.`,
            mode: "single",
            target_month: undefined,
            posts_per_week: 1,
            client_now: new Date().toISOString(),
            timezone:
              Intl.DateTimeFormat().resolvedOptions().timeZone,
            posting_hour_local: 9,
          } as any,
           () => {},
          () => {},
        );

        const topicChatId = genRes.topic_chat_id;

        if (!topicChatId) continue;

        const draftResponse =
          await listTopicChatDrafts(topicChatId);

        const drafts: Draft[] = Array.isArray(draftResponse)
          ? draftResponse
          : [];

        const draft = drafts[0];

        if (!draft) continue;

        const campaignData =
          buildCampaignDataFromDraft(draft);

        const composed =
          await composeRandomTemplateFromDb(
            TEMPLATE_FAMILY,
            DEFAULT_SECTIONS,
          );

        monthItems.push({
          topic_chat_id: topicChatId,
          draft,
          campaign_data: campaignData,
          shapes: sanitizeShapes(
            getComposedShapes(composed),
          ),
          canvas_width:
            composed?.canvasWidth || PORTRAIT_W,
          canvas_height:
            composed?.canvasHeight || PORTRAIT_H,
          background_image:
            composed?.backgroundImage || null,
        });
      }

      const metadata = {
        ...(savedAssistant.metadata || {}),
        items: monthItems,
      };

      const updatedAssistant = await updateMessage(
        savedAssistant.id,
        {
          content: `Generated ${monthItems.length} monthly posts.`,
          message_type: "generated_month",
          metadata,
        },
      );

      patchMessage(savedAssistant.id, {
        text: updatedAssistant.content,
        status: "ready",
        messageType: "generated_month",
        metadata,
      });

      setRunning(false);
      setProgressText("");
      return;
    }

    /*
    ─────────────────────────────────────────────
    SINGLE IMAGE GENERATION
    ─────────────────────────────────────────────
    */

    patchMessage(savedAssistant.id, {
      text: "Generating campaign image…",
      status: "generating",
    });

    setProgressText("Generating image…");

    const genRes = await safeGenerateWithFallback(
      {
        brand_id: brandId,
        tone_id: toneId || null,
        topic,
        mode: "single",
        target_month: undefined,
        posts_per_week: 1,
        client_now: new Date().toISOString(),
        timezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        posting_hour_local: 9,
      } as any,
       () => {},
        () => {},
    );

    const topicChatId = genRes.topic_chat_id;

    if (!topicChatId) {
      throw new Error("No topic chat id returned");
    }

    const draftResponse =
      await listTopicChatDrafts(topicChatId);

    const drafts: Draft[] = Array.isArray(draftResponse)
      ? draftResponse
      : [];

    const draft = drafts[0];

    if (!draft) {
      throw new Error("No draft generated");
    }

    const campaignData =
      buildCampaignDataFromDraft(draft);

    const composed =
      await composeRandomTemplateFromDb(
        TEMPLATE_FAMILY,
        DEFAULT_SECTIONS,
      );

    const metadata = {
      ...(savedAssistant.metadata || {}),
      topic_chat_id: topicChatId,
      draft,
      campaign_data: campaignData,
      shapes: sanitizeShapes(
        getComposedShapes(composed),
      ),
      canvas_width:
        composed?.canvasWidth || PORTRAIT_W,
      canvas_height:
        composed?.canvasHeight || PORTRAIT_H,
      background_image:
        composed?.backgroundImage || null,
    };

    const updatedAssistant = await updateMessage(
      savedAssistant.id,
      {
        content: "Generated campaign image.",
        message_type: "generated_image",
        metadata,
      },
    );

    patchMessage(savedAssistant.id, {
      text: updatedAssistant.content,
      status: "ready",
      messageType: "generated_image",
      metadata,
      draft,
      campaignData,
      shapes: metadata.shapes,
      canvasWidth: metadata.canvas_width,
      canvasHeight: metadata.canvas_height,
      backgroundImage: metadata.background_image,
      topicChatId,
    });

    setProgressText("");
  } catch (err: any) {
    console.error(err);

    patchMessage(optimisticAssistantId, {
      text: err?.message || "Something went wrong.",
      status: "error",
    });
  } finally {
    setRunning(false);
  }
};

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@400;600;700;800&family=Bebas+Neue&family=DM+Mono:wght@400;500&family=Montserrat:wght@400;500;600;700;800;900&family=Oswald:wght@400;500;600;700&family=Raleway:wght@400;500;600;700;800&family=Syne:wght@400;600;700;800&display=swap');

        .ai-chat-root {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(124,58,237,0.18), transparent 34%),
            radial-gradient(circle at bottom right, rgba(52,211,153,0.10), transparent 32%),
            #08080b;
          color: #e4e4e7;
          font-family: 'Syne', sans-serif;
          display: grid;
          grid-template-columns: 360px 1fr;
        }

        .ai-chat-sidebar {
          border-right: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.025);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ai-chat-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          height: 100vh;
        }

        .ai-chat-header {
          border-bottom: 1px solid rgba(255,255,255,0.07);
          padding: 18px 22px;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
        }

        .ai-chat-stream {
          flex: 1;
          overflow-y: auto;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .ai-chat-compose {
          border-top: 1px solid rgba(255,255,255,0.07);
          padding: 16px 22px;
          background: rgba(8,8,11,0.88);
          backdrop-filter: blur(16px);
        }

        .ai-chat-input-row {
          display: flex;
          gap: 10px;
          align-items: flex-end;
        }

        .ai-chat-input {
          flex: 1;
          min-height: 54px;
          max-height: 150px;
          resize: vertical;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #f4f4f5;
          padding: 14px 15px;
          outline: none;
          font-family: 'Raleway', sans-serif;
          font-size: 14px;
          line-height: 1.45;
        }

        .ai-chat-input:focus {
          border-color: rgba(167,139,250,0.45);
          box-shadow: 0 0 0 3px rgba(124,58,237,0.12);
        }

        .ai-chat-send {
          height: 54px;
          width: 54px;
          border-radius: 16px;
          border: 1px solid rgba(167,139,250,0.34);
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: white;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .ai-chat-send:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .ai-message {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          max-width: 980px;
        }

        .ai-message.user {
          margin-left: auto;
          flex-direction: row-reverse;
        }

        .ai-avatar {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.68);
        }

        .ai-message.user .ai-avatar {
          background: rgba(124,58,237,0.16);
          color: #c4b5fd;
        }

        .ai-bubble {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          padding: 14px;
          max-width: 860px;
        }

        .ai-message.user .ai-bubble {
          background: rgba(124,58,237,0.14);
          border-color: rgba(124,58,237,0.26);
        }

        .ai-message-text {
          white-space: pre-wrap;
          font-family: 'Raleway', sans-serif;
          font-size: 14px;
          line-height: 1.58;
          color: rgba(255,255,255,0.82);
        }

        .ai-draft-meta {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .ai-chip {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.58);
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          padding: 4px 7px;
          border-radius: 999px;
        }

        .ai-caption {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.07);
          white-space: pre-wrap;
          font-size: 12px;
          line-height: 1.55;
          color: rgba(255,255,255,0.52);
          font-family: 'Raleway', sans-serif;
        }

        .ai-select,
        .ai-number {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #e4e4e7;
          padding: 10px 12px;
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          outline: none;
        }

        .ai-select option {
          background: #171720;
        }

        .ai-label {
          display: block;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: rgba(255,255,255,0.34);
          font-weight: 800;
          margin-bottom: 7px;
        }

        .ai-sidebar-card {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.075);
          background: rgba(255,255,255,0.035);
          padding: 14px;
        }

        .ai-loading-line {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #a78bfa;
        }

        @media (max-width: 860px) {
          .ai-chat-root {
            grid-template-columns: 1fr;
          }

          .ai-chat-sidebar {
            border-right: 0;
            border-bottom: 1px solid rgba(255,255,255,0.07);
          }

          .ai-chat-main {
            height: auto;
            min-height: 70vh;
          }
        }
      `}</style>

      <main
        className="ai-chat-root"
        style={{
          gridTemplateColumns: activeEditableMessageId ? "360px minmax(0, 1fr) 340px" : "360px minmax(0, 1fr)",
        }}
      >
        <aside className="ai-chat-sidebar">
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em" }}>
              AI Poster Chat
            </div>
            <p style={{ marginTop: 8, color: "rgba(255,255,255,0.46)", fontSize: 13, lineHeight: 1.55 }}>
              Generate campaign data first, then preview a composed DB-segment poster before saving.
            </p>
          </div>

          <div className="ai-sidebar-card">
            <label className="ai-label">Brand</label>
            <select
              className="ai-select"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              disabled={running}
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.display_name || brand.id}
                </option>
              ))}
            </select>
          </div>

          <div className="ai-sidebar-card">
            <label className="ai-label">Tone</label>
            <select
              className="ai-select"
              value={toneId}
              onChange={(e) => setToneId(e.target.value)}
              disabled={running}
            >
              {tones.map((tone) => (
                <option key={tone.id} value={tone.id}>
                  {(tone as any).label || tone.name}
                </option>
              ))}
            </select>
          </div>

          <div className="ai-sidebar-card">
            <label className="ai-label">Pipeline</label>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                "Generate draft campaign data",
                "Fetch saved generated draft",
                "Enrich with org DB data",
                "Compose template segments",
                "Render preview in chat",
              ].map((item, index) => (
                <div key={item} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="ai-chip">{index + 1}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ai-sidebar-card">
            <label className="ai-label">Status</label>
            <div className="ai-chip">
              {selectedBrand ? selectedBrand.display_name || selectedBrand.id : "No brand selected"}
            </div>
            <div style={{ height: 8 }} />
            <div className="ai-chip">
              {selectedTone ? (selectedTone as any).label || selectedTone.name : "No tone selected"}
            </div>
            {orgData && (
              <>
                <div style={{ height: 8 }} />
                <div className="ai-chip">
                  Org data ready · {((orgData as any).sponsors || []).length} sponsors · {((orgData as any).reviews || []).length} reviews
                </div>
              </>
            )}
          </div>
        </aside>

        <section className="ai-chat-main">
          <header className="ai-chat-header">
            <div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>Campaign preview chat</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.36)", marginTop: 3 }}>
                Saving/uploading is intentionally not included yet.
              </div>
            </div>

            {running && (
              <span className="ai-loading-line">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {progressText || "Working…"}
              </span>
            )}
          </header>

          <div className="ai-chat-stream">
            {messages.map((message) => (
              <div key={message.id} className={`ai-message ${message.role}`}>
                <div className="ai-avatar">
                  {message.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div className="ai-bubble">
                  <div className="ai-message-text">
                    {message.status === "generating" && (
                      <Loader2 className="inline-block h-3.5 w-3.5 animate-spin" style={{ marginRight: 8 }} />
                    )}
                    {message.text}
                  </div>

                  {message.campaignData && message.shapes?.length ? (
                    <>
                      <CanvasPreview
                        campaignData={message.campaignData}
                        shapes={message.shapes}
                        canvasWidth={message.canvasWidth || PORTRAIT_W}
                        canvasHeight={message.canvasHeight || PORTRAIT_H}
                        backgroundImage={message.backgroundImage || null}
                        isEditable={activeEditableMessageId === message.id}
                        selectedShapeId={activeEditableMessageId === message.id ? selectedShapeId : null}
                        onSelectShape={setSelectedShapeId}
                        onPatchShapes={(updater) => patchActiveMessageShapes(message.id, updater)}
                      />

                      <div className="ai-draft-meta">
                        <span className="ai-chip">{message.draft?.platform || "platform"}</span>
                        <span className="ai-chip">{message.draft?.status || "draft"}</span>
                        {message.topicChatId && (
                          <a className="ai-chip" href={`/dashboard/topic-chats/${message.topicChatId}`}>
                            Open saved draft chat
                          </a>
                        )}
                      </div>

                      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => startEditingMessage(message.id)} style={{ border: "1px solid rgba(167,139,250,0.45)", background: activeEditableMessageId === message.id ? "rgba(124,58,237,0.28)" : "rgba(124,58,237,0.12)", color: "#ddd6fe", borderRadius: 999, padding: "8px 12px", cursor: "pointer", fontSize: 11, fontWeight: 900 }}>
                          {activeEditableMessageId === message.id ? "Editing" : "Edit"}
                        </button>
                        <button disabled style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", borderRadius: 999, padding: "8px 12px", fontSize: 11, fontWeight: 900 }}>Save Draft Soon</button>
                        <button disabled style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", borderRadius: 999, padding: "8px 12px", fontSize: 11, fontWeight: 900 }}>Regenerate Soon</button>
                      </div>

                      <div style={{ marginTop: 12, fontWeight: 900, fontSize: 15 }}>
                        {getDraftTitle(message.draft)}
                      </div>

                      {getDraftCaption(message.draft) && (
                        <div className="ai-caption">
                          {getDraftCaption(message.draft)}
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            ))}

            <div ref={endRef} />
          </div>

          <div className="ai-chat-compose">
            <div className="ai-chat-input-row">
              <textarea
                className="ai-chat-input"
                value={prompt}
                disabled={running}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: Generate a premium ad for AI lead conversion, focused on booking more appointments..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    void sendMessage();
                  }
                }}
              />

              <button
                className="ai-chat-send"
                disabled={running || !prompt.trim()}
                onClick={() => void sendMessage()}
                title="Generate preview"
              >
                {running ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send size={18} />}
              </button>
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", color: "rgba(255,255,255,0.32)", fontSize: 11 }}>
              <ImageIcon size={13} />
              <span>Preview only. Save/upload comes in the next step.</span>
            </div>
          </div>
        </section>

        {activeEditableMessageId && (
          <EditableCanvasSidebar
            message={messages.find((m) => m.id === activeEditableMessageId)}
            selectedShapeId={selectedShapeId}
            onSelectShape={setSelectedShapeId}
            onPatchShape={patchSelectedShape}
            onClose={stopEditingMessage}
          />
        )}
      </main>
    </>
  );
}