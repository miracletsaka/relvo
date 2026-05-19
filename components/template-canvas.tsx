"use client";

import React, {
  Dispatch,
  forwardRef,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { TemplateShape, CampaignData } from "@/lib/types";
import { calculateSnapGuides, SnapGuide } from "@/lib/alignment-utils";
import { getShapeText } from "@/lib/get-shape-text";

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
    if (!isDataUrl(url)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

type GradientStop = { stop: number; color: string };

function applyLinearGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  stops: GradientStop[],
  angleDeg: number,
): CanvasGradient {
  const rad = (angleDeg * Math.PI) / 180;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const half = Math.sqrt(w * w + h * h) / 2;
  const gx0 = cx - Math.cos(rad) * half;
  const gy0 = cy - Math.sin(rad) * half;
  const gx1 = cx + Math.cos(rad) * half;
  const gy1 = cy + Math.sin(rad) * half;
  const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
  stops.forEach(({ stop, color }) => grad.addColorStop(stop, color));
  return grad;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
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
  const {
    ctx,
    text,
    maxWidth,
    maxHeight,
    fontFamily,
    fontWeight,
    maxFontSize,
    minFontSize,
    lineHeightMult = 1.12,
  } = opts;

  for (let size = maxFontSize; size >= minFontSize; size--) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    const lines = wrapLines(ctx, text, maxWidth);
    const lineHeight = Math.ceil(size * lineHeightMult);
    if (lines.length * lineHeight <= maxHeight) {
      return { fontSize: size, lines, lineHeight };
    }
  }

  ctx.font = `${fontWeight} ${minFontSize}px ${fontFamily}`;
  const lines = wrapLines(ctx, text, maxWidth);
  return {
    fontSize: minFontSize,
    lines,
    lineHeight: Math.ceil(minFontSize * lineHeightMult),
  };
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, dx, dy, dw, dh);
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.min(dw / iw, dh / ih);
  const w = iw * scale;
  const h = ih * scale;
  ctx.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h);
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}


const TemplateCanvas = forwardRef<HTMLCanvasElement, TemplateCanvasProps>(function TemplateCanvas(
  {
    shapes,
    zoom,
    setZoom,
    pan,
    setPan,
    backgroundImage,
    canvasWidth = 1080,
    canvasHeight = 1350,
    campaignData,
    logoUrl,
    selectedShapeId,
    onShapeSelect,
    onShapeDrag,
    onShapeResize,
    isEditable = false,
    showGrid = false,
    snapToGrid = false,
    snapToObjects = true,
  },
  ref,
) {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef =
    (ref && typeof ref === "object" && "current" in ref
      ? (ref as React.RefObject<HTMLCanvasElement>)
      : null) || internalCanvasRef;

  const containerRef = useRef<HTMLDivElement>(null);
  const bgCacheRef = useRef<{ url: string; img: HTMLImageElement } | null>(null);
  const shapeImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const logoCacheRef = useRef<{ url: string; img: HTMLImageElement } | null>(null);

  const [draggedShapeId, setDraggedShapeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [shapeStartPos, setShapeStartPos] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 3;
  const zoomPct = Math.round(zoom * 100);
  const renderedWidth = Math.max(1, Math.round(canvasWidth * zoom));
  const renderedHeight = Math.max(1, Math.round(canvasHeight * zoom));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      setViewportSize({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };

    updateSize();

    const ro = new ResizeObserver(() => updateSize());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const fitToScreen = React.useCallback(() => {
  const el = containerRef.current;
  if (!el) return;

  if (el.clientWidth < 300 || el.clientHeight < 300) return;

  const paddingX = 24;
  const paddingY = 24;

  const availableWidth = Math.max(100, el.clientWidth - paddingX);
  const availableHeight = Math.max(100, el.clientHeight - paddingY);

  const scale = Math.min(
    availableWidth / canvasWidth,
    availableHeight / canvasHeight
  );

  setZoom(Number(scale.toFixed(3)));
  setPan({ x: 0, y: 0 });
}, [canvasHeight, canvasWidth, setPan, setZoom]);

  useEffect(() => {
    fitToScreen();
  }, [canvasWidth, canvasHeight, viewportSize.width, viewportSize.height, fitToScreen]);

  function screenToWorld(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const cssScaleX = canvas.width / rect.width;
    const cssScaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * cssScaleX,
      y: (e.clientY - rect.top) * cssScaleY,
    };
  }

  const loadShapeImage = async (url: string) => {
    const cache = shapeImageCacheRef.current;
    const cached = cache.get(url);
    if (cached) return cached;
    const img = await loadImage(url);
    cache.set(url, img);
    return img;
  };

  const getCampaignImageField = (field?: string | null): string | null => {
    if (!field) return null;

    const data = campaignData as any;
    const direct = data[field];

    if (typeof direct === "string" && direct.trim()) {
      return direct;
    }

    if (field === "logo") {
      return data.logo || data.imageSlots?.logo?.url || logoUrl || null;
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
  };

  function drawPatternOverlay(ctx: CanvasRenderingContext2D, shape: any) {
    const type = shape.patternType as string;
    const color = shape.patternColor || "#ffffff";
    const opacity = shape.patternOpacity || 0.05;
    const { x, y, width: w, height: h } = shape;

    ctx.save();
    ctx.globalAlpha = opacity;

    if (type === "dots") {
      const spacing = 28;
      const radius = 2;
      ctx.fillStyle = color;
      for (let px = x; px < x + w; px += spacing) {
        for (let py = y; py < y + h; py += spacing) {
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (type === "lines") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      const spacing = 32;
      for (let px = x; px < x + w + h; px += spacing) {
        ctx.beginPath();
        ctx.moveTo(px, y);
        ctx.lineTo(px - h, y + h);
        ctx.stroke();
      }
    } else if (type === "mesh") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5;
      const spacing = 48;
      for (let px = x; px <= x + w; px += spacing) {
        ctx.beginPath();
        ctx.moveTo(px, y);
        ctx.lineTo(px, y + h);
        ctx.stroke();
      }
      for (let py = y; py <= y + h; py += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, py);
        ctx.lineTo(x + w, py);
        ctx.stroke();
      }
    } else if (type === "noise") {
      ctx.fillStyle = color;
      const density = 0.003;
      const totalPx = w * h;
      for (let i = 0; i < totalPx * density; i++) {
        const px = x + Math.random() * w;
        const py = y + Math.random() * h;
        const r = 0.5 + Math.random() * 1.5;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawDotGrid(ctx: CanvasRenderingContext2D, shape: any) {
    const { x, y, width: w, height: h } = shape;
    const spacing = shape.dotSpacing || 18;
    const r = shape.dotRadius || 2;
    ctx.save();
    ctx.fillStyle = shape.dotColor || "rgba(255,255,255,0.15)";
    for (let px = x; px < x + w; px += spacing) {
      for (let py = y; py < y + h; py += spacing) {
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvasWidth; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawGuides = (ctx: CanvasRenderingContext2D, guides: SnapGuide[]) => {
    ctx.save();
    ctx.strokeStyle = "#FF00FF";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const g of guides) {
      ctx.beginPath();
      if (g.type === "vertical" || g.type === "center-v") {
        ctx.moveTo(g.position, 0);
        ctx.lineTo(g.position, canvasHeight);
      } else {
        ctx.moveTo(0, g.position);
        ctx.lineTo(canvasWidth, g.position);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  };

  const drawShapesOnly = async (ctx: CanvasRenderingContext2D) => {
    const sorted = [...shapes].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));

    for (const shape of sorted) {
      ctx.save();

      if (shape.rotation) {
        const cx = shape.x + shape.width / 2;
        const cy = shape.y + shape.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate((shape.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      ctx.globalAlpha = shape.opacity ?? 1;

      if (shape.shadowBlur && shape.shadowBlur > 0) {
        ctx.shadowColor = shape.shadowColor || "#000000";
        ctx.shadowBlur = shape.shadowBlur;
        ctx.shadowOffsetX = shape.shadowX || 0;
        ctx.shadowOffsetY = shape.shadowY || 0;
      }

      if ((shape as any).type === "gradient-overlay") {
        const s = shape as any;
        const stops: GradientStop[] = s.gradientColors || [];
        ctx.fillStyle =
          stops.length >= 2
            ? applyLinearGradient(ctx, s.x, s.y, s.width, s.height, stops, s.gradientAngle ?? 180)
            : s.backgroundColor || "transparent";
        ctx.fillRect(s.x, s.y, s.width, s.height);
        ctx.restore();
        continue;
      }

      if ((shape as any).type === "pattern-overlay") {
        drawPatternOverlay(ctx, shape as any);
        ctx.restore();
        continue;
      }

      if ((shape as any).type === "glow-blob") {
        const s = shape as any;
        const r = s.glowRadius || Math.max(s.width, s.height) / 2;
        const cx = s.x + s.width / 2;
        const cy = s.y + s.height / 2;
        ctx.shadowBlur = 0;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const rawColor = s.backgroundColor || "rgba(255,255,255,0.1)";
        grad.addColorStop(0, rawColor);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      if ((shape as any).type === "dot-grid") {
        drawDotGrid(ctx, shape as any);
        ctx.restore();
        continue;
      }

      if ((shape as any).type === "gradient-line") {
        const s = shape as any;
        const stops: GradientStop[] = s.gradientColors || [];
        ctx.fillStyle =
          stops.length >= 2
            ? applyLinearGradient(ctx, s.x, s.y, s.width, s.height, stops, s.gradientAngle ?? 90)
            : s.backgroundColor || "#ffffff";
        roundRectPath(ctx, s.x, s.y, s.width, s.height, s.borderRadius ?? 999);
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (shape.type === "rectangle") {
        const gradStops: GradientStop[] | undefined = (shape as any).gradientColors;
        ctx.fillStyle =
          gradStops && gradStops.length >= 2
            ? applyLinearGradient(
                ctx,
                shape.x,
                shape.y,
                shape.width,
                shape.height,
                gradStops,
                (shape as any).gradientAngle ?? 135,
              )
            : shape.backgroundColor || "transparent";
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        if (shape.borderWidth && shape.borderWidth > 0) {
          ctx.strokeStyle = shape.borderColor || "#000";
          ctx.lineWidth = shape.borderWidth;
          ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        }
      } else if (shape.type === "rounded-rect") {
        const r = shape.borderRadius || 8;
        roundRectPath(ctx, shape.x, shape.y, shape.width, shape.height, r);
        const gradStops: GradientStop[] | undefined = (shape as any).gradientColors;
        ctx.fillStyle =
          gradStops && gradStops.length >= 2
            ? applyLinearGradient(
                ctx,
                shape.x,
                shape.y,
                shape.width,
                shape.height,
                gradStops,
                (shape as any).gradientAngle ?? 90,
              )
            : shape.backgroundColor || "transparent";
        ctx.fill();
        if (shape.borderWidth && shape.borderWidth > 0) {
          ctx.strokeStyle = shape.borderColor || "#000";
          ctx.lineWidth = shape.borderWidth;
          roundRectPath(ctx, shape.x, shape.y, shape.width, shape.height, r);
          ctx.stroke();
        }
      } else if (shape.type === "circle") {
        const r = Math.min(shape.width, shape.height) / 2;
        ctx.beginPath();
        ctx.arc(shape.x + shape.width / 2, shape.y + shape.height / 2, r, 0, Math.PI * 2);
        ctx.fillStyle = shape.backgroundColor || "transparent";
        ctx.fill();
        if (shape.borderWidth && shape.borderWidth > 0) {
          ctx.strokeStyle = shape.borderColor || "#000";
          ctx.lineWidth = shape.borderWidth;
          ctx.stroke();
        }
      } else if (shape.type === "triangle") {
        const dir = (shape as any).direction || "up";
        const { x, y, width: w, height: h } = shape;
        ctx.beginPath();
        if (dir === "up") {
          ctx.moveTo(x + w / 2, y);
          ctx.lineTo(x + w, y + h);
          ctx.lineTo(x, y + h);
        } else if (dir === "down") {
          ctx.moveTo(x, y);
          ctx.lineTo(x + w, y);
          ctx.lineTo(x + w / 2, y + h);
        } else if (dir === "left") {
          ctx.moveTo(x, y + h / 2);
          ctx.lineTo(x + w, y);
          ctx.lineTo(x + w, y + h);
        } else {
          ctx.moveTo(x, y);
          ctx.lineTo(x + w, y + h / 2);
          ctx.lineTo(x, y + h);
        }
        ctx.closePath();
        ctx.fillStyle = shape.backgroundColor || "rgba(0,0,0,0.12)";
        ctx.fill();
      } else if (shape.type === "button") {
        const buttonText =
          ((shape as any).dataField ? getShapeText(shape, campaignData) : "") ||
          (shape as any).buttonText ||
          "Button";
        const r = shape.borderRadius || 6;
        roundRectPath(ctx, shape.x, shape.y, shape.width, shape.height, r);
        ctx.fillStyle = shape.backgroundColor || "#3b82f6";
        ctx.fill();
        if (shape.borderWidth && shape.borderWidth > 0) {
          ctx.strokeStyle = shape.borderColor || "#000";
          ctx.lineWidth = shape.borderWidth;
          roundRectPath(ctx, shape.x, shape.y, shape.width, shape.height, r);
          ctx.stroke();
        }
        ctx.fillStyle = shape.textColor || "#ffffff";
        ctx.font = `${shape.fontWeight || 600} ${shape.fontSize || 16}px ${shape.fontFamily || "sans-serif"}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(buttonText, shape.x + shape.width / 2, shape.y + shape.height / 2);
      } else if (shape.type === "line") {
        ctx.strokeStyle = shape.borderColor || "#000";
        ctx.lineWidth = (shape as any).lineWidth ?? 4;
        ctx.lineCap = (shape as any).lineCap ?? "round";
        const dash = (shape as any).lineDash ?? [];
        if (dash.length) ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (shape.type === "image") {
        function resolveImageUrl(shape: TemplateShape, campaignData: CampaignData): string | null {
          // 1. Explicit src wins
          if (shape.src && shape.src !== "undefined") return shape.src;

          // 2. New dataField image system
          const dataField = (shape as any).dataField as string | undefined;
          const dataFieldUrl = getCampaignImageField(dataField);
          if (dataFieldUrl) return dataFieldUrl;

          const slotKey = (shape as any).slotKey as string | undefined;
          if (!slotKey) return null;

          const cd = campaignData;

          // 3. Legacy slotKey support
          switch (slotKey) {
            case "logo":
              return (
                (cd.logo as string) ||
                cd.imageSlots?.logo?.url ||
                logoUrl ||
                null
              );

            case "hero_person":
              return (
                cd.imageSlots?.hero_person?.url ||
                (cd as any).heroImage ||
                (cd as any).hero_person ||
                null
              );

            case "dashboard_image":
              return (
                cd.imageSlots?.dashboard_image?.url ||
                (cd as any).dashboard_image ||
                null
              );

            case "sponsor_1":
              return getCampaignImageField("sponsor_logo_1");

            case "sponsor_2":
              return getCampaignImageField("sponsor_logo_2");

            case "sponsor_3":
              return getCampaignImageField("sponsor_logo_3");

            default:
              return cd.imageSlots?.[slotKey]?.url || getCampaignImageField(slotKey);
          }
        }

        let imageUrl: string | null = resolveImageUrl(shape, campaignData);
 
    if (imageUrl) {
      try {
        const img = await loadShapeImage(imageUrl);
        const r = (shape as any).radius || 0;
        if (r > 0) {
          ctx.save();
          roundRectPath(ctx, shape.x, shape.y, shape.width, shape.height, r);
          ctx.clip();
        }
        if (shape.fit === "cover") drawImageCover(ctx, img, shape.x, shape.y, shape.width, shape.height);
        else drawImageContain(ctx, img, shape.x, shape.y, shape.width, shape.height);
        if (r > 0) ctx.restore();
      } catch {
        // Draw placeholder
        ctx.fillStyle = "rgba(200,200,200,0.12)";
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        ctx.strokeStyle = "rgba(200,200,200,0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        ctx.fillStyle = "#9ca3af";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          (shape as any).slotLabel || (shape as any).slotKey || "Image",
          shape.x + shape.width / 2,
          shape.y + shape.height / 2,
        );
      }
    } else if ((shape as any).slotVisibleWhenEmpty) {
      // Show labeled placeholder when empty and visible
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.30)";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        (shape as any).slotLabel || (shape as any).slotKey || "Image",
        shape.x + shape.width / 2,
        shape.y + shape.height / 2,
      );
    }
  } else

      if (shape.type === "text") {
        const rawText = getShapeText(shape, campaignData);
        if (rawText) {
          const padding = (shape as any).padding || 8;
          const maxFont = shape.fontSize || 24;
          const minFont = (shape as any).minFontSize || 10;
          const maxWidth = Math.max(1, shape.width - padding * 2);
          const maxHeight = Math.max(1, shape.height - padding * 2);
          const fontFamily = shape.fontFamily || "sans-serif";
          const fontWeight = shape.fontWeight || 400;

          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          const fitted = fitFontSizeToBox({
            ctx,
            text: rawText,
            maxWidth,
            maxHeight,
            fontFamily,
            fontWeight,
            maxFontSize: maxFont,
            minFontSize: minFont,
            lineHeightMult: (shape as any).lineHeight || 1.12,
          });

          if ((shape as any).shadowBlur && (shape as any).shadowBlur > 0) {
            ctx.shadowColor = (shape as any).shadowColor || "rgba(0,0,0,0.4)";
            ctx.shadowBlur = (shape as any).shadowBlur;
          }

          ctx.font = `${fontWeight} ${fitted.fontSize}px ${fontFamily}`;
          ctx.textBaseline = "top";
          ctx.textAlign = shape.textAlign || "left";

          const textX =
            shape.x +
            (shape.textAlign === "center"
              ? shape.width / 2
              : shape.textAlign === "right"
                ? shape.width - padding
                : padding);

          const gradStops: GradientStop[] | undefined = (shape as any).gradientColors;
          ctx.fillStyle =
            gradStops && gradStops.length >= 2
              ? applyLinearGradient(
                  ctx,
                  shape.x,
                  shape.y,
                  shape.width,
                  shape.height,
                  gradStops,
                  (shape as any).gradientAngle ?? 90,
                )
              : shape.textColor || "#000000";

          let textY = shape.y + padding;
          for (const line of fitted.lines) {
            ctx.fillText(line.trimEnd(), textX, textY);
            textY += fitted.lineHeight;
          }
        }
      }

      if (shape.type === "bullet-group") {
        const bullets = campaignData.bullets || [];
        const padding = (shape as any).padding || 8;
        const bulletSpacing = (shape as any).bulletSpacing || 12;
        const bulletIndent = (shape as any).bulletIndent || 0;
        const marker = (shape as any).bulletMarker || "•";
        const maxFont = shape.fontSize || 16;
        const minFont = (shape as any).minFontSize || 12;
        const family = shape.fontFamily || "sans-serif";
        const weight = shape.fontWeight || 400;

        const wrapBulletLines = (fs: number, t: string, mw: number) => {
          ctx.font = `${weight} ${fs}px ${family}`;
          return wrapLines(ctx, t, mw);
        };

        const fitsBullets = (fs: number) => {
          const lh = Math.ceil(fs * 1.12);
          let y = shape.y + padding;
          for (const b of bullets) {
            if (!b) continue;
            const lines = wrapBulletLines(fs, String(b), shape.width - padding * 2 - bulletIndent - 20);
            if (y + lines.length * lh > shape.y + shape.height - padding) return false;
            y += lines.length * lh + bulletSpacing;
          }
          return true;
        };

        let fittedFont = maxFont;
        for (let fs = maxFont; fs >= minFont; fs--) {
          if (fitsBullets(fs)) {
            fittedFont = fs;
            break;
          }
        }

        const fittedLH = Math.ceil(fittedFont * 1.12);
        ctx.save();
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.font = `${weight} ${fittedFont}px ${family}`;
        ctx.fillStyle = shape.textColor || "#000";
        let y = shape.y + padding;
        for (const b of bullets) {
          if (!b || y > shape.y + shape.height - padding) break;
          const bx = shape.x + padding + bulletIndent;
          ctx.fillText(marker, bx, y);
          const lines = wrapBulletLines(fittedFont, String(b), shape.width - padding * 2 - bulletIndent - 20);
          let ly = y;
          for (const line of lines) {
            ctx.fillText(line.trimEnd(), bx + 20, ly);
            ly += fittedLH;
          }
          y = ly + bulletSpacing;
        }
        ctx.restore();
      }

      if (isEditable && selectedShapeId === shape.id) {
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(shape.x - 2, shape.y - 2, shape.width + 4, shape.height + 4);
        ctx.setLineDash([]);
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(shape.x + shape.width - 8, shape.y + shape.height - 8, 8, 8);
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(shape.x + shape.width / 2 - 42, shape.y - 22, 84, 16);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          `${Math.round(shape.width)} × ${Math.round(shape.height)}`,
          shape.x + shape.width / 2,
          shape.y - 14,
        );
      }

      ctx.globalAlpha = 1;
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.restore();
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const bgUrl = backgroundImage || null;
      if (bgUrl) {
        try {
          const cached = bgCacheRef.current?.url === bgUrl ? bgCacheRef.current.img : null;
          const img = cached ?? (await loadImage(bgUrl));
          if (cancelled) return;
          bgCacheRef.current = { url: bgUrl, img };
          drawImageCover(ctx, img, 0, 0, canvasWidth, canvasHeight);
        } catch {}
      }

      if (showGrid) drawGrid(ctx);
      await drawShapesOnly(ctx);
      if (activeGuides.length > 0) drawGuides(ctx, activeGuides);

      const lgUrl = logoUrl || null;
      if (lgUrl) {
        try {
          const cached = logoCacheRef.current?.url === lgUrl ? logoCacheRef.current.img : null;
          const img = cached ?? (await loadImage(lgUrl));
          if (cancelled) return;
          logoCacheRef.current = { url: lgUrl, img };
          const logoPx = canvasHeight * 0.07;
          ctx.globalAlpha = 0.88;
          ctx.drawImage(img, canvasWidth - logoPx - 14, canvasHeight - logoPx - 14, logoPx, logoPx);
          ctx.globalAlpha = 1;
        } catch {}
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    shapes,
    backgroundImage,
    campaignData,
    logoUrl,
    selectedShapeId,
    isEditable,
    canvasWidth,
    canvasHeight,
    showGrid,
    activeGuides,
  ]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditable) return;

    const { x: mx, y: my } = screenToWorld(e);
    const sorted = [...shapes].sort((a, b) => (b.zIndex || 1) - (a.zIndex || 1));

    for (const shape of sorted) {
      if (mx >= shape.x && mx <= shape.x + shape.width && my >= shape.y && my <= shape.y + shape.height) {
        onShapeSelect?.(shape.id, e.shiftKey);
        setDraggedShapeId(shape.id);
        setDragStart({ x: mx, y: my });
        setShapeStartPos({ x: shape.x, y: shape.y });
        if (mx > shape.x + shape.width - 10 && my > shape.y + shape.height - 10) {
          setIsResizing(true);
        }
        return;
      }
    }

    onShapeSelect?.("", false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditable || !draggedShapeId) return;

    const { x: mx, y: my } = screenToWorld(e);
    const shape = shapes.find((s) => s.id === draggedShapeId);
    if (!shape) return;

    if (isResizing) {
      onShapeResize?.(draggedShapeId, Math.max(50, mx - shape.x), Math.max(50, my - shape.y));
      setActiveGuides([]);
      return;
    }

    let newX = shapeStartPos.x + (mx - dragStart.x);
    let newY = shapeStartPos.y + (my - dragStart.y);

    if (snapToGrid) {
      const grid = 20;
      newX = Math.round(newX / grid) * grid;
      newY = Math.round(newY / grid) * grid;
    }

    const snap = calculateSnapGuides(
      { ...shape, x: newX, y: newY },
      shapes,
      canvasWidth,
      canvasHeight,
      snapToObjects,
    );

    onShapeDrag?.(draggedShapeId, snap.snapX ?? newX, snap.snapY ?? newY);
    setActiveGuides(snap.guides);
  };

  const handleMouseUp = () => {
    setDraggedShapeId(null);
    setIsResizing(false);
    setActiveGuides([]);
  };

  return (
    <>
      <style>{`
      /* Hide scrollbar for WebKit browsers */
::-webkit-scrollbar {
  width: 0px;
  height: 0px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: transparent;
}
        .tc-root {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  position: relative;
  overflow: auto;
  background: #060806;
  font-family: 'DM Mono', monospace;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  box-sizing: border-box;
}
        .tc-stage {
          position: relative;
          flex: 0 0 auto;
          display: inline-block;
          min-width: 0;
        }
        .tc-zoom-bar {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;

  display: flex;
  align-items: center;
  gap: 6px;

  width: fit-content;
  padding: 6px 10px;

  background: rgba(10, 18, 14, 0.92);
  backdrop-filter: blur(10px);

  border: 1px solid rgba(30, 95, 59, 0.35);
  border-radius: 10px;

  box-shadow:
    0 8px 30px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
        .tc-zoom-btn {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.12s;
        }
        .tc-zoom-btn:hover {
          background: rgba(30,95,59,0.2);
          border-color: rgba(30,95,59,0.5);
          color: #4ade80;
        }
        .tc-zoom-display {
          min-width: 44px;
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: rgba(255,255,255,0.6);
          padding: 0 4px;
        }
        .tc-zoom-divider {
          width: 1px;
          height: 16px;
          background: rgba(255,255,255,0.08);
          margin: 0 3px;
        }
        .tc-zoom-pill {
          height: 26px;
          border-radius: 7px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 0 8px;
          transition: all 0.12s;
          text-transform: uppercase;
        }
        .tc-zoom-pill:hover {
          background: rgba(30,95,59,0.18);
          border-color: rgba(30,95,59,0.4);
          color: #4ade80;
        }
        .tc-canvas {
          display: block;
          cursor: default;
          user-select: none;
          -webkit-user-drag: none;
        }
        .tc-canvas.editable {
          cursor: move;
        }
      `}</style>

      <div className="tc-root" ref={containerRef}>
        <div
  className="tc-stage"
  style={{
    width: renderedWidth,
    flex: "0 0 auto",
  }}
>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className={`tc-canvas${isEditable ? " editable" : ""}`}
            style={{ width: renderedWidth, height: renderedHeight }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />

          <div className="tc-zoom-bar">
            <button
              className="tc-zoom-btn"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Number((z - 0.1).toFixed(2))))}
            >
              −
            </button>

            <input
              type="range"
              min={10}
              max={300}
              step={5}
              value={zoomPct}
              onChange={(e) => setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(e.target.value) / 100)))}
              style={{
                width: 80,
                height: 3,
                cursor: "pointer",
                appearance: "none" as any,
                background: `linear-gradient(to right,#1e5f3b ${zoomPct / 3}%,rgba(255,255,255,0.1) ${zoomPct / 3}%)`,
                borderRadius: 2,
                outline: "none",
                margin: "0 4px",
              }}
            />

            <span className="tc-zoom-display">{zoomPct}%</span>

            <button
              className="tc-zoom-btn"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Number((z + 0.1).toFixed(2))))}
            >
              +
            </button>

            <div className="tc-zoom-divider" />

            <button className="tc-zoom-pill" onClick={fitToScreen}>
              Fit
            </button>

            <button
              className="tc-zoom-pill"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              1:1
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

export default TemplateCanvas;
