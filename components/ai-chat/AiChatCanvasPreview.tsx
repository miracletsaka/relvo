"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  preloadFonts,
  createRenderer,
  type Renderer,
  type CanvasSegment as RendererCanvasSegment,
} from "@/lib/canvas-renderer";
import type { CampaignData, TemplateShape } from "@/lib/types";

// ─── Campaign value resolver ──────────────────────────────────────────────────

function getCampaignValueFromData(data: CampaignData, field: string): string {
  const d = (data || {}) as any;
  const direct = d[field];
  if (typeof direct === "string") return direct;
  if (typeof direct === "number") return String(direct);
  if (field === "headline")      return d.headline     || d.hook                      || "";
  if (field === "subheadline")   return d.subheadline  || d.subheading                || "";
  if (field === "description")   return d.description  || d.subheading                || "";
  if (field === "product_name")  return d.product_name || d.companyName               || "";
  if (field === "cta_text")      return d.cta_text     || d.cta      || d.offer_cta   || "";
  if (field === "feature_1")     return d.feature_1    || d.bullet_1 || d.bullets?.[0] || "";
  if (field === "feature_2")     return d.feature_2    || d.bullet_2 || d.bullets?.[1] || "";
  if (field === "feature_3")     return d.feature_3    || d.bullet_3 || d.bullets?.[2] || "";
  if (field === "phone")         return d.phone    || d.businessInfo?.phone_primary    || "";
  if (field === "website")       return d.website  || d.businessInfo?.website          || "";
  if (field === "email")         return d.email    || d.businessInfo?.email_primary    || "";
  if (field === "social_handle") return d.social_handle || "@yourbrand";
  return "";
}

function getSlotUrlFromData(
  data: CampaignData,
  slotKey: string,
  logoUrl: string | null,
): string | null {
  const d = (data || {}) as any;
  if (slotKey === "logo")        return logoUrl || d.logo || d.imageSlots?.logo?.url   || null;
  const slotUrl = d.imageSlots?.[slotKey]?.url;
  if (slotUrl)                   return slotUrl;
  if (slotKey === "hero_person") return d.heroImage || d.imageSlots?.heroImage?.url    || null;
  if (slotKey === "heroImage")   return d.heroImage || d.imageSlots?.hero_person?.url  || null;
  if (slotKey === "sponsor_1")   return d.sponsor_logo_1 || d.sponsors?.[0]?.logo_url  || null;
  if (slotKey === "sponsor_2")   return d.sponsor_logo_2 || d.sponsors?.[1]?.logo_url  || null;
  if (slotKey === "sponsor_3")   return d.sponsor_logo_3 || d.sponsors?.[2]?.logo_url  || null;
  return null;
}

// ─── Shape sanitiser ──────────────────────────────────────────────────────────
//
// FIX: fontFamily now respects _role:
//   heading/accent → _tokens.fontDisplay
//   body/subheading/ui → _tokens.fontBody
// Not every shape gets the display font.

export function sanitizeShapes(shapes: TemplateShape[]): TemplateShape[] {
  return (Array.isArray(shapes) ? shapes : [])
    .filter(Boolean)
    .map((shape: any, index: number) => {
      const role    = String(shape._role || "");
      const tokens  = shape._tokens as any;

      const defaultFont =
        role === "heading" || role === "accent"
          ? (tokens?.fontDisplay || "Bebas Neue")
          : (tokens?.fontBody    || "Outfit");

      const defaultColor =
        role === "accent"
          ? (tokens?.accent      || "#C9A84C")
          : role === "subheading"
            ? (tokens?.accent    || "#C9A84C")
            : (tokens?.textPrimary || "#ffffff");

      return {
        ...shape,
        id:              shape.id    || `shape-${index}`,
        type:            shape.type  || "rectangle",
        x:               Number.isFinite(Number(shape.x))      ? Number(shape.x)      : 0,
        y:               Number.isFinite(Number(shape.y))      ? Number(shape.y)      : 0,
        width:           Number.isFinite(Number(shape.width))  ? Number(shape.width)  : 100,
        height:          Number.isFinite(Number(shape.height)) ? Number(shape.height) : 100,
        zIndex:          Number.isFinite(Number(shape.zIndex)) ? Number(shape.zIndex) : index,
        borderWidth:     Number.isFinite(Number(shape.borderWidth))  ? Number(shape.borderWidth)  : 0,
        borderRadius:    Number.isFinite(Number(shape.borderRadius)) ? Number(shape.borderRadius) : 0,
        opacity:         shape.opacity === undefined ? 1 : Number(shape.opacity),
        backgroundColor: shape.backgroundColor ??
          (shape.type === "text" || shape.type === "image" ? "transparent" : "rgba(255,255,255,0)"),
        textColor:       shape.textColor  ?? defaultColor,
        borderColor:     shape.borderColor ?? "transparent",
        fontFamily:      shape.fontFamily  || defaultFont,
        fontSize:        Number.isFinite(Number(shape.fontSize)) ? Number(shape.fontSize) : 24,
        fontWeight:      shape.fontWeight  ?? 700,
        textAlign:       shape.textAlign   || "left",
        lineHeight:      Number.isFinite(Number(shape.lineHeight))    ? Number(shape.lineHeight)    : 1.15,
        letterSpacing:   Number.isFinite(Number(shape.letterSpacing)) ? Number(shape.letterSpacing) : 0,
        fit:             shape.fit || "cover",
      } as TemplateShape;
    });
}

// ─── Hit-test ─────────────────────────────────────────────────────────────────

function hitTestShapeLocal(shapes: TemplateShape[], x: number, y: number): TemplateShape | null {
  const ordered = [...shapes].sort((a: any, b: any) => Number(b.zIndex || 0) - Number(a.zIndex || 0));
  for (const shape of ordered as any[]) {
    if (x >= Number(shape.x || 0) && x <= Number(shape.x || 0) + Number(shape.width  || 0) &&
        y >= Number(shape.y || 0) && y <= Number(shape.y || 0) + Number(shape.height || 0)) {
      return shape as TemplateShape;
    }
  }
  return null;
}

// ─── Brand colour resolution ──────────────────────────────────────────────────

function resolveBrandColor(campaignData: CampaignData, shapes: TemplateShape[]): string {
  const d = campaignData as any;
  if (d?.brandColor  && d.brandColor  !== "#7c3aed") return d.brandColor;
  if (d?.brand_color && d.brand_color !== "#7c3aed") return d.brand_color;
  if (d?.primaryColor) return d.primaryColor;
  const firstWithToken = (shapes as any[]).find((s) => s._tokens?.accent);
  if (firstWithToken?._tokens?.accent) return firstWithToken._tokens.accent;
  return "#C9A84C";
}

// ─── Responsive zoom ──────────────────────────────────────────────────────────
//
// FIX: zoom is calculated from the container width so the canvas always
// fits on screen — mobile, tablet, and desktop.
// Canvas is 1080px wide at full resolution; we scale it to fit the container
// with a max of 480px display width (keeps it crisp on all devices).

function useResponsiveZoom(canvasWidth: number): { zoom: number; containerRef: React.RefObject<HTMLDivElement> } {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.34);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const containerW = entry.contentRect.width;
      // Leave 48px padding on each side, max display width 480px
      const available = Math.min(containerW - 48, 480);
      setZoom(Math.max(0.18, available / canvasWidth));
    });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [canvasWidth]);

  return { zoom, containerRef };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AiChatCanvasPreview({
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
  const canvasRef   = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const dragRef     = useRef<any>(null);

  // FIX: separate loading states so we know exactly what's pending
  const [fontsReady,    setFontsReady]    = useState(false);
  const [rendererReady, setRendererReady] = useState(false);
  const isLoading = !fontsReady || !rendererReady;

  // FIX: responsive zoom from container width
  const { zoom, containerRef } = useResponsiveZoom(canvasWidth);

  const safeShapes  = useMemo(() => sanitizeShapes(shapes), [shapes]);
  const brandColor  = useMemo(() => resolveBrandColor(campaignData, safeShapes), [campaignData, safeShapes]);

  // Preload fonts — runs once
  useEffect(() => {
    let cancelled = false;
    preloadFonts()
      .then(() => { if (!cancelled) setFontsReady(true); })
      .catch(() => { if (!cancelled) setFontsReady(true); });
    return () => { cancelled = true; };
  }, []);

  // Create renderer when canvas is ready and campaignData changes
  useEffect(() => {
    if (!canvasRef.current) return;

    rendererRef.current?.destroy();
    setRendererReady(false);

    rendererRef.current = createRenderer(canvasRef.current, {
      getCampaignValue: (field) => getCampaignValueFromData(campaignData, field),
      getSlotUrl: (slotKey, logoUrl) => getSlotUrlFromData(campaignData, slotKey, logoUrl),
    });

    setRendererReady(true);

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [campaignData]);

  // Canvas coordinate helper — accounts for zoom scaling
  const getCanvasPoint = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width)  * canvasWidth,
      y: ((event.clientY - rect.top)  / rect.height) * canvasHeight,
    };
  }, [canvasWidth, canvasHeight]);

  const handlePointerDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditable) return;
    const point = getCanvasPoint(event);
    const hit   = hitTestShapeLocal(safeShapes, point.x, point.y) as any;
    if (!hit?.id) { onSelectShape?.(null); return; }
    onSelectShape?.(hit.id);
    dragRef.current = {
      shapeId:   hit.id,
      startX:    point.x,
      startY:    point.y,
      originalX: Number(hit.x || 0),
      originalY: Number(hit.y || 0),
    };
  }, [isEditable, safeShapes, onSelectShape, getCanvasPoint]);

  const handlePointerMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditable || !dragRef.current || !onPatchShapes) return;
    const point = getCanvasPoint(event);
    const drag  = dragRef.current;
    onPatchShapes((prev) =>
      sanitizeShapes(prev).map((shape: any) =>
        shape.id === drag.shapeId
          ? { ...shape, x: Math.round(drag.originalX + point.x - drag.startX), y: Math.round(drag.originalY + point.y - drag.startY) }
          : shape,
      ),
    );
  }, [isEditable, onPatchShapes, getCanvasPoint]);

  // Main draw effect — runs when everything is ready
  useEffect(() => {
    if (!rendererRef.current || !fontsReady || !rendererReady) return;

    const segment: RendererCanvasSegment = {
      id:                    "ai-chat-composed",
      instanceId:            "ai-chat-composed",
      name:                  "AI Chat Preview",
      description:           "Composed from DB segments",
      segment_type:          "campaign_composition",
      internal_segment_type: "campaign_composition",
      requested_type:        "campaign_composition",
      y:                     0,
      segment_height:        canvasHeight,
      shapes:                safeShapes as any[],
    };

    void rendererRef.current
      .draw([segment], brandColor, (campaignData as any)?.logo ?? null, null, null)
      .then(() => {
        if (!isEditable || !selectedShapeId || !canvasRef.current) return;
        const selected = safeShapes.find((s: any) => s.id === selectedShapeId) as any;
        const ctx      = canvasRef.current.getContext("2d");
        if (!selected || !ctx) return;
        ctx.save();
        ctx.strokeStyle = "rgba(52,211,153,0.95)";
        ctx.lineWidth   = 4;
        ctx.setLineDash([12, 8]);
        ctx.strokeRect(Number(selected.x || 0), Number(selected.y || 0), Number(selected.width || 0), Number(selected.height || 0));
        ctx.restore();
      });
  }, [campaignData, safeShapes, canvasHeight, fontsReady, rendererReady, isEditable, selectedShapeId, brandColor]);

  return (
    // FIX: outermost div is the resize observer target — full width, no fixed size
    <div
      ref={containerRef}
      style={{
        width:          "100%",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        padding:        "16px 0",
      }}
    >
      {/* Meta bar */}
      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          marginBottom:   8,
          color:          "rgba(255,255,255,0.40)",
          fontSize:       10,
          fontFamily:     "'DM Mono', 'Fira Mono', monospace",
          width:          canvasWidth * zoom,
          maxWidth:       "100%",
        }}
      >
        <span>{canvasWidth}×{canvasHeight}</span>
        <span>{safeShapes.length} shapes</span>
      </div>

      {/* Canvas wrapper — relative so loading overlay can be absolute */}
      <div
        style={{
          position:     "relative",
          width:        canvasWidth  * zoom,
          height:       canvasHeight * zoom,
          maxWidth:     "100%",
          borderRadius: 10,
          overflow:     "hidden",
          background:   "#05070b",
          boxShadow:    "0 0 0 1px rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.6)",
          // Prevent layout shift while loading
          flexShrink:   0,
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={()    => { dragRef.current = null; }}
          onMouseLeave={()  => { dragRef.current = null; }}
          // Touch support for mobile editing
          onTouchStart={(e) => {
            if (!isEditable) return;
            const touch = e.touches[0];
            handlePointerDown({ clientX: touch.clientX, clientY: touch.clientY, ...e } as any);
          }}
          onTouchMove={(e) => {
            if (!isEditable) return;
            const touch = e.touches[0];
            handlePointerMove({ clientX: touch.clientX, clientY: touch.clientY, ...e } as any);
          }}
          onTouchEnd={() => { dragRef.current = null; }}
          style={{
            width:   "100%",
            height:  "100%",
            display: "block",
            cursor:  isEditable ? "move" : "default",
          }}
        />

        {/* FIX: loading overlay — shown while fonts or renderer initialise */}
        {isLoading && (
          <div
            style={{
              position:       "absolute",
              inset:          0,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              background:     "rgba(5,7,11,0.85)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              style={{
                display:    "flex",
                flexDirection: "column",
                alignItems: "center",
                gap:        12,
                color:      "rgba(255,255,255,0.5)",
                fontSize:   12,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {/* Simple CSS spinner — no dependencies */}
              <div
                style={{
                  width:        28,
                  height:       28,
                  border:       "2px solid rgba(255,255,255,0.12)",
                  borderTop:    "2px solid rgba(201,168,76,0.8)",
                  borderRadius: "50%",
                  animation:    "spin 0.8s linear infinite",
                }}
              />
              <span>Loading canvas…</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}