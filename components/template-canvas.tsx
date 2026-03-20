"use client";

import React, { Dispatch, forwardRef, SetStateAction, useEffect, useImperativeHandle, useRef, useState } from "react";
import { TemplateShape, CampaignData } from "@/lib/types";
import { calculateSnapGuides, SnapGuide } from "@/lib/alignment-utils";

interface TemplateCanvasProps {
  shapes: TemplateShape[];
  backgroundImage?: string | null;
  canvasWidth?: number;
  canvasHeight?: number;
  campaignData: CampaignData;
  logoUrl?: string | null;
  selectedShapeId?: string | null;
  onShapeSelect?: (id: string, multi?: boolean) => void;
  onShapeDrag?: (id: string, x: number, y: number) => void;
  onShapeResize?: (id: string, width: number, height: number) => void;
  isEditable?: boolean;
  showGrid?: boolean;
  snapToGrid?: boolean;
  snapToObjects?: boolean;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  pan: { x: number; y: number };
  setPan: Dispatch<SetStateAction<{ x: number; y: number }>>;
}

function isDataUrl(v?: string | null) {
  return !!v && v.startsWith("data:image");
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const isRemote = !isDataUrl(url);
    if (isRemote) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function fitFontSizeToBox(opts: {
  ctx: CanvasRenderingContext2D;
  text: string;
  maxWidth: number;
  maxHeight: number;
  fontFamily: string;
  fontWeight: number | string;
  maxFontSize: number;
  minFontSize: number;
  lineHeightMult?: number;
}) {
  const { ctx, text, maxWidth, maxHeight, fontFamily, fontWeight, maxFontSize, minFontSize, lineHeightMult = 1.12 } = opts;
  for (let size = maxFontSize; size >= minFontSize; size--) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    const lines = wrapLines(ctx, text, maxWidth);
    const lineHeight = Math.ceil(size * lineHeightMult);
    const totalHeight = lines.length * lineHeight;
    if (totalHeight <= maxHeight) return { fontSize: size, lines, lineHeight };
  }
  ctx.font = `${fontWeight} ${minFontSize}px ${fontFamily}`;
  const lines = wrapLines(ctx, text, maxWidth);
  const lineHeight = Math.ceil(minFontSize * lineHeightMult);
  return { fontSize: minFontSize, lines, lineHeight };
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dWidth: number, dHeight: number) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(dWidth / iw, dHeight / ih);
  const sw = dWidth / scale;
  const sh = dHeight / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dWidth, dHeight);
}

const TemplateCanvas = forwardRef<HTMLCanvasElement, TemplateCanvasProps>(function TemplateCanvas(
  {
    shapes, zoom, setZoom, pan, setPan,
    backgroundImage, canvasWidth = 1080, canvasHeight = 1350,
    campaignData, logoUrl, selectedShapeId,
    onShapeSelect, onShapeDrag, onShapeResize,
    isEditable = false, showGrid = false, snapToGrid = false, snapToObjects = true,
  },
  ref
) {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = (ref && typeof ref === "object" && "current" in ref
    ? (ref as React.RefObject<HTMLCanvasElement>)
    : null) || internalCanvasRef;

  const bgCacheRef         = useRef<{ url: string; img: HTMLImageElement } | null>(null);
  const shapeImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const logoCacheRef       = useRef<{ url: string; img: HTMLImageElement } | null>(null);

  const [draggedShapeId, setDraggedShapeId]   = useState<string | null>(null);
  const [dragStart, setDragStart]             = useState({ x: 0, y: 0 });
  const [shapeStartPos, setShapeStartPos]     = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing]           = useState(false);
  const [activeGuides, setActiveGuides]       = useState<SnapGuide[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fitToScreen(); }, [canvasWidth, canvasHeight]); // eslint-disable-line

  // ── Coordinate conversion ──────────────────────────────────────────────────
  // THE FIX: The canvas element may be CSS-scaled (style maxWidth:100%, height:auto).
  // getBoundingClientRect() returns the rendered (CSS) size, not the intrinsic
  // pixel size. We must account for this ratio + browser zoom + devicePixelRatio
  // by multiplying screen coords by (intrinsicSize / cssSize) before applying
  // the internal zoom/pan transform.
  //
  // Formula:
  //   cssScaleX = canvas.width  / rect.width   ← handles all CSS scaling + browser zoom
  //   cssScaleY = canvas.height / rect.height
  //   canvasX   = (clientX - rect.left)  * cssScaleX   ← position in canvas pixels
  //   canvasY   = (clientY - rect.top)   * cssScaleY
  //   worldX    = (canvasX - pan.x) / zoom              ← position in world coordinates
  //   worldY    = (canvasY - pan.y) / zoom
  //
  function screenToWorld(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // CSS scale ratio — this is what browser zoom / CSS transform / zoom property affect
    const cssScaleX = canvas.width  / rect.width;
    const cssScaleY = canvas.height / rect.height;

    // Position in canvas pixel space
    const canvasX = (e.clientX - rect.left)  * cssScaleX;
    const canvasY = (e.clientY - rect.top)   * cssScaleY;

    // Position in world (design) space — undo internal zoom+pan
    const worldX = (canvasX - pan.x) / zoom;
    const worldY = (canvasY - pan.y) / zoom;

    return { x: worldX, y: worldY };
  }

  // ── Shape drawing helpers (unchanged from original) ────────────────────────
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const getShapeText = (shape: TemplateShape): string => {
    if (shape.type !== "text") return "";
    let text = "";
    if (!shape.dataField) {
      text = String(shape.customText || "");
    } else {
      const field = shape.dataField as string;
      if (field.startsWith("bullet-")) {
        const bulletIndex = parseInt(field.split("-")[1], 10);
        text = campaignData.bullets[bulletIndex] || "";
      } else {
        text = (campaignData[field as keyof CampaignData] as string) || "";
      }
    }
    const transform = (shape as any).textTransform || "none";
    if (transform === "uppercase") return text.toUpperCase();
    if (transform === "lowercase") return text.toLowerCase();
    if (transform === "capitalize") return text.replace(/\b\w/g, (c) => c.toUpperCase());
    return text;
  };

  const loadShapeImage = async (url: string) => {
    const cache = shapeImageCacheRef.current;
    const cached = cache.get(url);
    if (cached) return cached;
    const img = await loadImage(url);
    cache.set(url, img);
    return img;
  };

  const drawImageContain = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dWidth: number, dHeight: number) => {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.min(dWidth / iw, dHeight / ih);
    const w = iw * scale;
    const h = ih * scale;
    const x = dx + (dWidth - w) / 2;
    const y = dy + (dHeight - h) / 2;
    ctx.drawImage(img, x, y, w, h);
  };

  const drawTriangle = (ctx: CanvasRenderingContext2D, shape: TemplateShape) => {
    const dir = shape.direction || "up";
    const x = shape.x, y = shape.y, w = shape.width, h = shape.height;
    ctx.beginPath();
    if (dir === "up")    { ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); }
    else if (dir === "down")  { ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w / 2, y + h); }
    else if (dir === "left")  { ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); }
    else                 { ctx.moveTo(x, y); ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x, y + h); }
    ctx.closePath();
    ctx.fillStyle = shape.backgroundColor || "rgba(0,0,0,0.12)";
    ctx.fill();
    if (shape.borderWidth && shape.borderWidth > 0) { ctx.strokeStyle = shape.borderColor || "#000"; ctx.lineWidth = shape.borderWidth; ctx.stroke(); }
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, gridSize = 20) => {
    ctx.save(); ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 1;
    for (let x = 0; x <= canvasWidth; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasHeight); ctx.stroke(); }
    for (let y = 0; y <= canvasHeight; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasWidth, y); ctx.stroke(); }
    ctx.restore();
  };

  const drawGuides = (ctx: CanvasRenderingContext2D, guides: SnapGuide[]) => {
    ctx.save(); ctx.strokeStyle = "#FF00FF"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    for (const guide of guides) {
      ctx.beginPath();
      if (guide.type === "vertical" || guide.type === "center-v") { ctx.moveTo(guide.position, 0); ctx.lineTo(guide.position, canvasHeight); }
      else { ctx.moveTo(0, guide.position); ctx.lineTo(canvasWidth, guide.position); }
      ctx.stroke();
      if (guide.label) {
        ctx.fillStyle = "#FF00FF"; ctx.font = "bold 10px Arial";
        if (guide.type === "vertical" || guide.type === "center-v") ctx.fillText(guide.label, guide.position + 4, 12);
        else ctx.fillText(guide.label, 4, guide.position - 4);
      }
    }
    ctx.setLineDash([]); ctx.restore();
  };

  const drawShapesOnly = async (ctx: CanvasRenderingContext2D) => {
    const sortedShapes = [...shapes].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
    for (const shape of sortedShapes) {
      ctx.save();
      if (shape.rotation) {
        const cx = shape.x + shape.width / 2;
        const cy = shape.y + shape.height / 2;
        ctx.translate(cx, cy); ctx.rotate((shape.rotation * Math.PI) / 180); ctx.translate(-cx, -cy);
      }
      ctx.globalAlpha = shape.opacity ?? 1;
      if (shape.shadowBlur && shape.shadowBlur > 0) {
        ctx.shadowColor = shape.shadowColor || "#000000"; ctx.shadowBlur = shape.shadowBlur;
        ctx.shadowOffsetX = shape.shadowX || 0; ctx.shadowOffsetY = shape.shadowY || 0;
      }

      if (shape.type === "rectangle") {
        ctx.fillStyle = shape.backgroundColor || "transparent";
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        if (shape.borderWidth && shape.borderWidth > 0) { ctx.strokeStyle = shape.borderColor || "#000"; ctx.lineWidth = shape.borderWidth; ctx.strokeRect(shape.x, shape.y, shape.width, shape.height); }
      }
      else if (shape.type === "image") {
        const src = (shape as any).src;
        if (src) {
          try {
            const img = await loadShapeImage(src);
            const r = (shape as any).radius || 0;
            if (r > 0) { ctx.save(); roundRect(ctx, shape.x, shape.y, shape.width, shape.height, r); ctx.clip(); }
            const fit = (shape as any).fit || "cover";
            if (fit === "contain") drawImageContain(ctx, img, shape.x, shape.y, shape.width, shape.height);
            else drawImageCover(ctx, img, shape.x, shape.y, shape.width, shape.height);
            if (r > 0) ctx.restore();
            if (shape.borderWidth && shape.borderWidth > 0) {
              ctx.strokeStyle = shape.borderColor || "#000"; ctx.lineWidth = shape.borderWidth;
              if (r > 0) { roundRect(ctx, shape.x, shape.y, shape.width, shape.height, r); ctx.stroke(); }
              else ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            }
          } catch {
            ctx.fillStyle = "rgba(200,200,200,0.3)"; ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
            ctx.strokeStyle = "#999"; ctx.lineWidth = 2; ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            ctx.save(); ctx.fillStyle = "#666"; ctx.font = "14px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("No Image", shape.x + shape.width / 2, shape.y + shape.height / 2); ctx.restore();
          }
        }
      }
      else if (shape.type === "triangle") { drawTriangle(ctx, shape); }
      else if (shape.type === "rounded-rect") {
        const radius = shape.borderRadius || 8;
        ctx.fillStyle = shape.backgroundColor || "transparent";
        roundRect(ctx, shape.x, shape.y, shape.width, shape.height, radius); ctx.fill();
        if (shape.borderWidth && shape.borderWidth > 0) { ctx.strokeStyle = shape.borderColor || "#000"; ctx.lineWidth = shape.borderWidth; roundRect(ctx, shape.x, shape.y, shape.width, shape.height, radius); ctx.stroke(); }
      }
      else if (shape.type === "circle") {
        const r = Math.min(shape.width, shape.height) / 2;
        ctx.fillStyle = shape.backgroundColor || "transparent";
        ctx.beginPath(); ctx.arc(shape.x + shape.width / 2, shape.y + shape.height / 2, r, 0, Math.PI * 2); ctx.fill();
        if (shape.borderWidth && shape.borderWidth > 0) { ctx.strokeStyle = shape.borderColor || "#000"; ctx.lineWidth = shape.borderWidth; ctx.stroke(); }
      }
      else if (shape.type === "button") {
        const buttonText = (shape as any).buttonText || "Button";
        const radius = shape.borderRadius || 6;
        ctx.fillStyle = shape.backgroundColor || "#3b82f6";
        roundRect(ctx, shape.x, shape.y, shape.width, shape.height, radius); ctx.fill();
        if (shape.borderWidth && shape.borderWidth > 0) { ctx.strokeStyle = shape.borderColor || "#000"; ctx.lineWidth = shape.borderWidth; roundRect(ctx, shape.x, shape.y, shape.width, shape.height, radius); ctx.stroke(); }
        ctx.save(); ctx.fillStyle = shape.textColor || "#ffffff";
        ctx.font = `${shape.fontWeight || 600} ${shape.fontSize || 16}px ${shape.fontFamily || "Century Gothic"}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(buttonText, shape.x + shape.width / 2, shape.y + shape.height / 2); ctx.restore();
      }
      else if (shape.type === "line") {
        ctx.save(); ctx.strokeStyle = shape.borderColor || "#000000"; ctx.lineWidth = (shape.lineWidth ?? 4);
        ctx.lineCap = (shape.lineCap ?? "round");
        const dash = shape.lineDash ?? [];
        if (dash.length) ctx.setLineDash(dash);
        ctx.beginPath(); ctx.moveTo(shape.x, shape.y); ctx.lineTo(shape.x + shape.width, shape.y + shape.height); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
      }

      if (shape.type === "text") {
        const text = getShapeText(shape);
        if (text) {
          const padding = shape.padding || 10;
          const maxFont = shape.fontSize || 24;
          const minFont = (shape as any).minFontSize || 12;
          ctx.textAlign = shape.textAlign || "left"; ctx.textBaseline = "top";
          const maxWidth = Math.max(1, shape.width - padding * 2);
          const maxHeight = Math.max(1, shape.height - padding * 2);
          const fitted = fitFontSizeToBox({ ctx, text, maxWidth, maxHeight, fontFamily: shape.fontFamily || "Century Gothic", fontWeight: shape.fontWeight || 400, maxFontSize: maxFont, minFontSize: minFont, lineHeightMult: 1.12 });
          const textX = shape.x + (shape.textAlign === "center" ? shape.width / 2 : padding);
          let textY = shape.y + padding;
          ctx.font = `${shape.fontWeight || 400} ${fitted.fontSize}px ${shape.fontFamily || "Century Gothic"}`;
          ctx.fillStyle = shape.textColor || "#000000";
          for (const line of fitted.lines) { ctx.fillText(line.trimEnd(), textX, textY); textY += fitted.lineHeight; }
        }
      }

      if (shape.type === "bullet-group") {
        const bullets = campaignData.bullets || [];
        const padding = shape.padding || 8;
        const bulletSpacing = shape.bulletSpacing || 12;
        const bulletIndent = shape.bulletIndent || 0;
        const marker = shape.bulletMarker || "•";
        const maxFont = shape.fontSize || 16; const minFont = (shape as any).minFontSize || 12;
        const family = shape.fontFamily || "Century Gothic"; const weight = shape.fontWeight || 400;
        const wrapBulletLines = (fontSize: number, t: string, maxW: number) => { ctx.font = `${weight} ${fontSize}px ${family}`; return wrapLines(ctx, t, maxW); };
        const fitsBullets = (fontSize: number) => {
          const lineHeight = Math.ceil(fontSize * 1.12);
          let y = shape.y + padding;
          for (const bullet of bullets) {
            if (!bullet) continue;
            const lines = wrapBulletLines(fontSize, String(bullet), shape.width - padding * 2 - bulletIndent - 20);
            const bottomAfter = y + lines.length * lineHeight;
            if (bottomAfter > shape.y + shape.height - padding) return { ok: false, lineHeight };
            y += lines.length * lineHeight + bulletSpacing;
          }
          return { ok: true, lineHeight };
        };
        let fittedFont = maxFont; let fittedLineHeight = Math.ceil(maxFont * 1.12);
        for (let fs = maxFont; fs >= minFont; fs--) { const chk = fitsBullets(fs); if (chk.ok) { fittedFont = fs; fittedLineHeight = chk.lineHeight; break; } }
        ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.font = `${weight} ${fittedFont}px ${family}`; ctx.fillStyle = shape.textColor || "#000000";
        let y = shape.y + padding;
        for (const bullet of bullets) {
          if (!bullet || y > shape.y + shape.height - padding) break;
          const bulletX = shape.x + padding + bulletIndent;
          ctx.fillText(marker, bulletX, y);
          const lines = wrapBulletLines(fittedFont, String(bullet), shape.width - padding * 2 - bulletIndent - 20);
          let lineY = y;
          for (const line of lines) { ctx.fillText(line.trimEnd(), bulletX + 20, lineY); lineY += fittedLineHeight; }
          y = lineY + bulletSpacing;
        }
        ctx.restore();
      }

      if (isEditable && selectedShapeId === shape.id) {
        ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        ctx.strokeRect(shape.x - 2, shape.y - 2, shape.width + 4, shape.height + 4);
        ctx.setLineDash([]); ctx.fillStyle = "#3b82f6";
        ctx.fillRect(shape.x + shape.width - 8, shape.y + shape.height - 8, 8, 8);
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(shape.x + shape.width / 2 - 40, shape.y - 20, 80, 16);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 11px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const rotText = shape.rotation ? ` ${shape.rotation}°` : "";
        ctx.fillText(`${Math.round(shape.width)} × ${Math.round(shape.height)}${rotText}`, shape.x + shape.width / 2, shape.y - 12);
      }

      ctx.globalAlpha = 1; ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.restore();
    }
  };

  // ── Render loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      const bgUrl = backgroundImage || null;
      const lgUrl = logoUrl || null;
      if (bgUrl) {
        try {
          const cached = bgCacheRef.current?.url === bgUrl ? bgCacheRef.current.img : null;
          const img = cached ?? (await loadImage(bgUrl));
          if (cancelled) return;
          bgCacheRef.current = { url: bgUrl, img };
          drawImageCover(ctx, img, 0, 0, canvasWidth, canvasHeight);
        } catch {}
      }
      if (showGrid) drawGrid(ctx, 20);
      await drawShapesOnly(ctx);
      if (activeGuides.length > 0) drawGuides(ctx, activeGuides);
      if (lgUrl) {
        try {
          const cached = logoCacheRef.current?.url === lgUrl ? logoCacheRef.current.img : null;
          const img = cached ?? (await loadImage(lgUrl));
          if (cancelled) return;
          logoCacheRef.current = { url: lgUrl, img };
          const logoPx = canvasHeight * 0.08;
          ctx.globalAlpha = 0.9;
          ctx.drawImage(img, canvasWidth - logoPx - 10, canvasHeight - logoPx - 10, logoPx, logoPx);
          ctx.globalAlpha = 1;
        } catch {}
      }
    };
    run();
    return () => { cancelled = true; };
  }, [shapes, backgroundImage, campaignData, logoUrl, selectedShapeId, isEditable, canvasWidth, canvasHeight, showGrid, activeGuides, zoom, pan]); // eslint-disable-line

  // ── Mouse handlers — all use the fixed screenToWorld ──────────────────────
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditable) return;
    const { x: mouseX, y: mouseY } = screenToWorld(e);
    const sortedShapes = [...shapes].sort((a, b) => (b.zIndex || 1) - (a.zIndex || 1));
    for (const shape of sortedShapes) {
      if (mouseX >= shape.x && mouseX <= shape.x + shape.width && mouseY >= shape.y && mouseY <= shape.y + shape.height) {
        onShapeSelect?.(shape.id, e.shiftKey);
        setDraggedShapeId(shape.id);
        setDragStart({ x: mouseX, y: mouseY });
        setShapeStartPos({ x: shape.x, y: shape.y });
        if (mouseX > shape.x + shape.width - 8 && mouseY > shape.y + shape.height - 8) setIsResizing(true);
        return;
      }
    }
    onShapeSelect?.("", false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditable || !draggedShapeId) return;
    const { x: mouseX, y: mouseY } = screenToWorld(e);
    const shape = shapes.find((s) => s.id === draggedShapeId);
    if (!shape) return;
    if (isResizing) {
      const newWidth  = Math.max(50, mouseX - shape.x);
      const newHeight = Math.max(50, mouseY - shape.y);
      onShapeResize?.(draggedShapeId, newWidth, newHeight);
      setActiveGuides([]);
    } else {
      const dx = mouseX - dragStart.x;
      const dy = mouseY - dragStart.y;
      const newX = shapeStartPos.x + dx;
      const newY = shapeStartPos.y + dy;
      const snapResult = calculateSnapGuides({ ...shape, x: newX, y: newY }, shapes, canvasWidth, canvasHeight, snapToObjects);
      onShapeDrag?.(draggedShapeId, snapResult.snapX ?? newX, snapResult.snapY ?? newY);
      setActiveGuides(snapResult.guides);
    }
  };

  const handleMouseUp = () => { setDraggedShapeId(null); setIsResizing(false); setActiveGuides([]); };

  const fitToScreen = () => {
    const el = containerRef.current;
    if (!el) return;
    const padding = 24;
    const vw = el.clientWidth  - padding;
    const vh = el.clientHeight - padding;
    const scale = Math.min(vw / canvasWidth, vh / canvasHeight);
    const cx = (el.clientWidth  - canvasWidth  * scale) / 2;
    const cy = (el.clientHeight - canvasHeight * scale) / 2;
    setZoom(+scale.toFixed(3));
    setPan({ x: cx, y: cy });
  };

  const zoomPct = Math.round(zoom * 100);

  return (
    <>
      <style>{`
        .tc-root { width: 100%; height: 100%; position: relative; overflow: hidden; background: #0a0d0a; font-family: 'DM Mono', monospace; }

        /* ── Zoom control bar — dark studio aesthetic matching PropertyInspector ── */
        .tc-zoom-bar {
          position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
          z-index: 20;
          display: flex; align-items: center; gap: 2px;
          background: linear-gradient(160deg, #0d1210, #0a0f0a);
          border: 1px solid rgba(30,95,59,0.35);
          border-radius: 10px;
          padding: 4px 6px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04);
          backdrop-filter: blur(8px);
        }
        .tc-zoom-btn {
          width: 26px; height: 26px; border-radius: 7px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.5); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 600; line-height: 1;
          transition: all 0.12s; font-family: 'DM Mono', monospace;
          flex-shrink: 0;
        }
        .tc-zoom-btn:hover { background: rgba(30,95,59,0.2); border-color: rgba(30,95,59,0.5); color: #4ade80; }
        .tc-zoom-btn:active { transform: scale(0.92); }
        .tc-zoom-display {
          min-width: 44px; text-align: center;
          font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
          color: rgba(255,255,255,0.6); padding: 0 4px;
          font-family: 'DM Mono', monospace;
        }
        .tc-zoom-divider {
          width: 1px; height: 16px; background: rgba(255,255,255,0.08); margin: 0 3px;
        }
        .tc-zoom-pill {
          height: 26px; border-radius: 7px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.4); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
          padding: 0 8px; transition: all 0.12s;
          font-family: 'DM Mono', monospace; white-space: nowrap;
          text-transform: uppercase;
        }
        .tc-zoom-pill:hover { background: rgba(30,95,59,0.18); border-color: rgba(30,95,59,0.4); color: #4ade80; }

        /* Canvas */
        .tc-canvas {
          display: block;
          /* DO NOT use CSS transform/scale/zoom here — it breaks coordinate math.
             The canvas uses ctx.setTransform internally for zoom/pan instead. */
          max-width: 100%; height: auto;
          cursor: default;
        }
        .tc-canvas.editable { cursor: move; }
      `}</style>

      <div className="tc-root" ref={containerRef}>

        {/* ── Dark studio zoom controls ── */}
        <div className="tc-zoom-bar">
          {/* Zoom out */}
          <button className="tc-zoom-btn" onClick={() => setZoom(z => Math.max(0.1, +(z - 0.1).toFixed(2)))} title="Zoom out (−)">−</button>

          {/* Zoom slider track */}
          <input
            type="range" min={10} max={300} step={5} value={zoomPct}
            onChange={e => setZoom(Number(e.target.value) / 100)}
            title="Zoom"
            style={{
              width: 80, height: 3, cursor: "pointer", appearance: "none",
              background: `linear-gradient(to right, #1e5f3b ${zoomPct / 3}%, rgba(255,255,255,0.1) ${zoomPct / 3}%)`,
              borderRadius: 2, outline: "none", margin: "0 4px",
            }}
          />

          {/* Zoom % display */}
          <span className="tc-zoom-display">{zoomPct}%</span>

          {/* Zoom in */}
          <button className="tc-zoom-btn" onClick={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(2)))} title="Zoom in (+)">+</button>

          <div className="tc-zoom-divider" />

          {/* Fit */}
          <button className="tc-zoom-pill" onClick={fitToScreen} title="Fit to screen">Fit</button>

          {/* 100% */}
          <button className="tc-zoom-pill" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset to 100%">1:1</button>
        </div>

        {/* ── Canvas — no CSS scaling, zoom is purely via ctx.setTransform ── */}
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className={`tc-canvas${isEditable ? " editable" : ""}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </>
  );
});

export default TemplateCanvas;