"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  preloadFonts,
  createRenderer,
  type Renderer,
  type CanvasSegment as RendererCanvasSegment,
} from "@/lib/canvas-renderer";
import type { CampaignData, TemplateShape } from "@/lib/types";

function getCampaignValueFromData(data: CampaignData, field: string): string {
  const d = (data || {}) as any;
  const direct = d[field];
  if (typeof direct === "string") return direct;
  if (typeof direct === "number") return String(direct);
  if (field === "headline") return d.headline || d.hook || "";
  if (field === "subheadline") return d.subheadline || d.subheading || "";
  if (field === "description") return d.description || d.subheading || "";
  if (field === "product_name") return d.product_name || d.companyName || "";
  if (field === "cta_text") return d.cta_text || d.cta || d.offer_cta || "";
  if (field === "feature_1") return d.feature_1 || d.bullet_1 || d.bullets?.[0] || "";
  if (field === "feature_2") return d.feature_2 || d.bullet_2 || d.bullets?.[1] || "";
  if (field === "feature_3") return d.feature_3 || d.bullet_3 || d.bullets?.[2] || "";
  if (field === "phone") return d.phone || d.businessInfo?.phone_primary || "";
  if (field === "website") return d.website || d.businessInfo?.website || "";
  if (field === "email") return d.email || d.businessInfo?.email_primary || "";
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
  if (slotKey === "sponsor_1") return d.sponsor_logo_1 || d.sponsors?.[0]?.logo_url || null;
  if (slotKey === "sponsor_2") return d.sponsor_logo_2 || d.sponsors?.[1]?.logo_url || null;
  if (slotKey === "sponsor_3") return d.sponsor_logo_3 || d.sponsors?.[2]?.logo_url || null;
  return null;
}

export function sanitizeShapes(shapes: TemplateShape[]): TemplateShape[] {
  return (Array.isArray(shapes) ? shapes : []).filter(Boolean).map((shape: any, index: number) => ({
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
    opacity: shape.opacity === undefined ? 1 : Number(shape.opacity),
    backgroundColor: shape.backgroundColor ?? (shape.type === "text" || shape.type === "image" ? "transparent" : "rgba(255,255,255,0)"),
    textColor: shape.textColor ?? "#ffffff",
    borderColor: shape.borderColor ?? "transparent",
    fontFamily: shape.fontFamily || "'Montserrat', sans-serif",
    fontSize: Number.isFinite(Number(shape.fontSize)) ? Number(shape.fontSize) : 24,
    fontWeight: shape.fontWeight ?? 700,
    textAlign: shape.textAlign || "left",
    lineHeight: Number.isFinite(Number(shape.lineHeight)) ? Number(shape.lineHeight) : 1.15,
    letterSpacing: Number.isFinite(Number(shape.letterSpacing)) ? Number(shape.letterSpacing) : 0,
    fit: shape.fit || "cover",
  })) as TemplateShape[];
}

function hitTestShape(shapes: TemplateShape[], x: number, y: number): TemplateShape | null {
  const ordered = [...(shapes || [])].sort((a: any, b: any) => Number(b.zIndex || 0) - Number(a.zIndex || 0));
  for (const shape of ordered as any[]) {
    const sx = Number(shape.x || 0), sy = Number(shape.y || 0), sw = Number(shape.width || 0), sh = Number(shape.height || 0);
    if (x >= sx && x <= sx + sw && y >= sy && y <= sy + sh) return shape as TemplateShape;
  }
  return null;
}

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const dragRef = useRef<any>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const zoom = 0.34;
  const safeShapes = useMemo(() => sanitizeShapes(shapes), [shapes]);

  useEffect(() => { preloadFonts().then(() => setFontsReady(true)).catch(() => setFontsReady(true)); }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    rendererRef.current?.destroy();
    rendererRef.current = createRenderer(canvasRef.current, {
      getCampaignValue: (field) => getCampaignValueFromData(campaignData, field),
      getSlotUrl: (slotKey, logoUrl) => getSlotUrlFromData(campaignData, slotKey, logoUrl),
    });
    return () => { rendererRef.current?.destroy(); rendererRef.current = null; };
  }, [campaignData]);

  const getCanvasPoint = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * canvasWidth, y: ((event.clientY - rect.top) / rect.height) * canvasHeight };
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
    const point = getCanvasPoint(event), drag = dragRef.current;
    onPatchShapes((prev) => sanitizeShapes(prev).map((shape: any) => shape.id === drag.shapeId ? { ...shape, x: Math.round(drag.originalX + point.x - drag.startX), y: Math.round(drag.originalY + point.y - drag.startY) } : shape));
  };

  useEffect(() => {
    if (!rendererRef.current) return;
    const segment: RendererCanvasSegment = { id: "ai-chat-composed", instanceId: "ai-chat-composed", name: "AI Chat Preview", description: "Composed from DB segments", segment_type: "campaign_composition", internal_segment_type: "campaign_composition", requested_type: "campaign_composition", y: 0, segment_height: canvasHeight, shapes: safeShapes as any[] };
    void rendererRef.current.draw([segment], "#7c3aed", ((campaignData as any)?.logo || null) as string | null, null, null).then(() => {
      if (!isEditable || !selectedShapeId || !canvasRef.current) return;
      const selected = safeShapes.find((s: any) => s.id === selectedShapeId) as any;
      const ctx = canvasRef.current.getContext("2d");
      if (!selected || !ctx) return;
      ctx.save(); ctx.strokeStyle = "rgba(124,58,237,0.95)"; ctx.lineWidth = 4; ctx.setLineDash([12, 8]); ctx.strokeRect(Number(selected.x || 0), Number(selected.y || 0), Number(selected.width || 0), Number(selected.height || 0)); ctx.restore();
    });
  }, [campaignData, safeShapes, canvasHeight, fontsReady, isEditable, selectedShapeId]);

  return (
    <main style={{ overflow: "auto", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 24, flex: 1, minWidth: 0 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "rgba(255,255,255,0.48)", fontSize: 11, fontFamily: "'DM Mono', monospace", width: canvasWidth * zoom }}>
          <span>FULL CANVAS · {canvasWidth}x{canvasHeight}</span><span>{safeShapes.length} shapes</span>
        </div>
        <div style={{ width: canvasWidth * zoom, height: canvasHeight * zoom, borderRadius: 10, overflow: "hidden", background: "#05070b", boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.7)" }}>
          <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={() => (dragRef.current = null)} onMouseLeave={() => (dragRef.current = null)} style={{ width: canvasWidth * zoom, height: canvasHeight * zoom, display: "block", cursor: isEditable ? "move" : "default" }} />
        </div>
      </div>
    </main>
  );
}
