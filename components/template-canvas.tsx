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
  zoom:number, 
  setZoom:Dispatch<SetStateAction<number>>,
  pan:{ x: number, y: number }, 
  setPan:Dispatch<SetStateAction<{ x: number, y: number }>>,
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
    const totalHeight = lines.length * lineHeight;
    if (totalHeight <= maxHeight) {
      return { fontSize: size, lines, lineHeight };
    }
  }

  ctx.font = `${fontWeight} ${minFontSize}px ${fontFamily}`;
  const lines = wrapLines(ctx, text, maxWidth);
  const lineHeight = Math.ceil(minFontSize * lineHeightMult);
  return { fontSize: minFontSize, lines, lineHeight };
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dWidth: number,
  dHeight: number
) {
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
  ref
) {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = (ref && typeof ref === "object" && "current" in ref ? (ref as React.RefObject<HTMLCanvasElement>) : null) || internalCanvasRef;

  const bgCacheRef = useRef<{ url: string; img: HTMLImageElement } | null>(null);
  const shapeImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const logoCacheRef = useRef<{ url: string; img: HTMLImageElement } | null>(null);

  const [draggedShapeId, setDraggedShapeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [shapeStartPos, setShapeStartPos] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

  // ✅ ZOOM & PAN STATEy
  const containerRef = useRef<HTMLDivElement>(null);

  // ✅ Fit canvas to screen on mount
  useEffect(() => {
    fitToScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasWidth, canvasHeight]);

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
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
    } else if (shape.dataField) {
      const field = shape.dataField as string;
      if (field.startsWith("bullet-")) {
        const bulletIndex = parseInt(field.split("-")[1], 10);
        text = campaignData.bullets[bulletIndex] || "";
      } else {
        text = (campaignData[field as keyof CampaignData] as string) || "";
      }
    }

  // ✅ Apply text transform
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

  const drawImageContain = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number
  ) => {
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
    if (shape.borderWidth && shape.borderWidth > 0) {
      ctx.strokeStyle = shape.borderColor || "#000";
      ctx.lineWidth = shape.borderWidth;
      ctx.stroke();
    }
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, gridSize: number = 20) => {
    ctx.save();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvasWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y += gridSize) {
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
    for (const guide of guides) {
      ctx.beginPath();
      if (guide.type === "vertical" || guide.type === "center-v") {
        ctx.moveTo(guide.position, 0);
        ctx.lineTo(guide.position, canvasHeight);
      } else {
        ctx.moveTo(0, guide.position);
        ctx.lineTo(canvasWidth, guide.position);
      }
      ctx.stroke();
      if (guide.label) {
        ctx.fillStyle = "#FF00FF";
        ctx.font = "bold 10px Arial";
        if (guide.type === "vertical" || guide.type === "center-v") {
          ctx.fillText(guide.label, guide.position + 4, 12);
        } else {
          ctx.fillText(guide.label, 4, guide.position - 4);
        }
      }
    }
    ctx.setLineDash([]);
    ctx.restore();
  };

  const drawShapesOnly = async (ctx: CanvasRenderingContext2D) => {
    const sortedShapes = [...shapes].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));

    for (const shape of sortedShapes) {
      ctx.save();
      
      if (shape.rotation) {
        const centerX = shape.x + shape.width / 2;
        const centerY = shape.y + shape.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((shape.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }

      ctx.globalAlpha = shape.opacity ?? 1;

      if (shape.shadowBlur && shape.shadowBlur > 0) {
        ctx.shadowColor = shape.shadowColor || "#000000";
        ctx.shadowBlur = shape.shadowBlur;
        ctx.shadowOffsetX = shape.shadowX || 0;
        ctx.shadowOffsetY = shape.shadowY || 0;
      }

      if (shape.type === "rectangle") {
        ctx.fillStyle = shape.backgroundColor || "transparent";
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        if (shape.borderWidth && shape.borderWidth > 0) {
          ctx.strokeStyle = shape.borderColor || "#000";
          ctx.lineWidth = shape.borderWidth;
          ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        }
      }

      else if (shape.type === "image") {
        const src = (shape as any).src;
        if (src) {
          try {
            const img = await loadShapeImage(src);
            const r = (shape as any).radius || 0;
            if (r > 0) {
              ctx.save();
              roundRect(ctx, shape.x, shape.y, shape.width, shape.height, r);
              ctx.clip();
            }
            const fit = (shape as any).fit || "cover";
            if (fit === "contain") {
              drawImageContain(ctx, img, shape.x, shape.y, shape.width, shape.height);
            } else {
              drawImageCover(ctx, img, shape.x, shape.y, shape.width, shape.height);
            }
            if (r > 0) ctx.restore();
            if (shape.borderWidth && shape.borderWidth > 0) {
              ctx.strokeStyle = shape.borderColor || "#000";
              ctx.lineWidth = shape.borderWidth;
              if (r > 0) {
                roundRect(ctx, shape.x, shape.y, shape.width, shape.height, r);
                ctx.stroke();
              } else {
                ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
              }
            }
          } catch {
            ctx.fillStyle = "rgba(200, 200, 200, 0.3)";
            ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
            ctx.strokeStyle = "#999";
            ctx.lineWidth = 2;
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            ctx.save();
            ctx.fillStyle = "#666";
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("No Image", shape.x + shape.width / 2, shape.y + shape.height / 2);
            ctx.restore();
          }
        }
      }

      else if (shape.type === "triangle") {
        drawTriangle(ctx, shape);
      }

      else if (shape.type === "rounded-rect") {
        const radius = shape.borderRadius || 8;
        ctx.fillStyle = shape.backgroundColor || "transparent";
        roundRect(ctx, shape.x, shape.y, shape.width, shape.height, radius);
        ctx.fill();
        if (shape.borderWidth && shape.borderWidth > 0) {
          ctx.strokeStyle = shape.borderColor || "#000";
          ctx.lineWidth = shape.borderWidth;
          roundRect(ctx, shape.x, shape.y, shape.width, shape.height, radius);
          ctx.stroke();
        }
      }

      else if (shape.type === "circle") {
        const r = Math.min(shape.width, shape.height) / 2;
        ctx.fillStyle = shape.backgroundColor || "transparent";
        ctx.beginPath();
        ctx.arc(shape.x + shape.width / 2, shape.y + shape.height / 2, r, 0, Math.PI * 2);
        ctx.fill();
        if (shape.borderWidth && shape.borderWidth > 0) {
          ctx.strokeStyle = shape.borderColor || "#000";
          ctx.lineWidth = shape.borderWidth;
          ctx.stroke();
        }
      }

      else if (shape.type === "button") {
        const buttonText = (shape as any).buttonText || "Button";
        const radius = shape.borderRadius || 6;
        ctx.fillStyle = shape.backgroundColor || "#3b82f6";
        roundRect(ctx, shape.x, shape.y, shape.width, shape.height, radius);
        ctx.fill();
        if (shape.borderWidth && shape.borderWidth > 0) {
          ctx.strokeStyle = shape.borderColor || "#000";
          ctx.lineWidth = shape.borderWidth;
          roundRect(ctx, shape.x, shape.y, shape.width, shape.height, radius);
          ctx.stroke();
        }
        ctx.save();
        ctx.fillStyle = shape.textColor || "#ffffff";
        ctx.font = `${shape.fontWeight || 600} ${shape.fontSize || 16}px ${shape.fontFamily || "Century Gothic"}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const textX = shape.x + shape.width / 2;
        const textY = shape.y + shape.height / 2;
        ctx.fillText(buttonText, textX, textY);
        ctx.restore();
        if ((shape as any).buttonLink) {
          ctx.save();
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          ctx.font = "12px Arial";
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          ctx.fillText("🔗", shape.x + shape.width - 5, shape.y + shape.height - 3);
          ctx.restore();
        }
      }

      else if (shape.type === "line") {
        const x1 = shape.x;
        const y1 = shape.y;
        const x2 = shape.x + shape.width;
        const y2 = shape.y + shape.height;
        ctx.save();
        ctx.strokeStyle = shape.borderColor || "#000000";
        ctx.lineWidth = (shape.lineWidth ?? 4);
        ctx.lineCap = (shape.lineCap ?? "round");
        const dash = shape.lineDash ?? [];
        if (dash.length) ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      if (shape.type === "text") {
        const text = getShapeText(shape);
        if (text) {
          const padding = shape.padding || 10;
          const maxFont = shape.fontSize || 24;
          const minFont = (shape as any).minFontSize || 12;
          ctx.textAlign = shape.textAlign || "left";
          ctx.textBaseline = "top";
          const maxWidth = Math.max(1, shape.width - padding * 2);
          const maxHeight = Math.max(1, shape.height - padding * 2);
          const fitted = fitFontSizeToBox({
            ctx,
            text,
            maxWidth,
            maxHeight,
            fontFamily: shape.fontFamily || "Century Gothic",
            fontWeight: shape.fontWeight || 400,
            maxFontSize: maxFont,
            minFontSize: minFont,
            lineHeightMult: 1.12,
          });
          const textX = shape.x + (shape.textAlign === "center" ? shape.width / 2 : padding);
          let textY = shape.y + padding;
          const chosenTextColor = shape.textColor || "#000000";
          ctx.font = `${shape.fontWeight || 400} ${fitted.fontSize}px ${shape.fontFamily || "Century Gothic"}`;
          ctx.fillStyle = chosenTextColor;
          for (const line of fitted.lines) {
            const out = line.trimEnd();
            ctx.fillText(out, textX, textY);
            textY += fitted.lineHeight;
          }
        }
      }

      if (shape.type === "bullet-group") {
        const bullets = campaignData.bullets || [];
        const padding = shape.padding || 8;
        const bulletSpacing = shape.bulletSpacing || 12;
        const bulletIndent = shape.bulletIndent || 0;
        const marker = shape.bulletMarker || "•";
        const boxX = shape.x;
        const boxY = shape.y;
        const boxW = shape.width;
        const boxH = shape.height;
        const maxFont = shape.fontSize || 16;
        const minFont = (shape as any).minFontSize || 12;
        const family = shape.fontFamily || "Century Gothic";
        const weight = shape.fontWeight || 400;
        const chosenTextColor = shape.textColor || "#000000";
        const wrapBulletLines = (fontSize: number, t: string, maxW: number) => {
          ctx.font = `${weight} ${fontSize}px ${family}`;
          return wrapLines(ctx, t, maxW);
        };
        const fitsBullets = (fontSize: number) => {
          const lineHeight = Math.ceil(fontSize * 1.12);
          let y = boxY + padding;
          for (const bullet of bullets) {
            if (!bullet) continue;
            const bulletX = boxX + padding + bulletIndent;
            const textX = bulletX + 20;
            const maxW = boxW - padding * 2 - bulletIndent - 20;
            const lines = wrapBulletLines(fontSize, String(bullet), maxW);
            const bulletHeight = lines.length * lineHeight;
            const bottomAfter = y + bulletHeight;
            if (bottomAfter > boxY + boxH - padding) return { ok: false, lineHeight };
            y += bulletHeight + bulletSpacing;
          }
          return { ok: true, lineHeight };
        };
        let fittedFont = maxFont;
        let fittedLineHeight = Math.ceil(maxFont * 1.12);
        for (let fs = maxFont; fs >= minFont; fs--) {
          const chk = fitsBullets(fs);
          if (chk.ok) {
            fittedFont = fs;
            fittedLineHeight = chk.lineHeight;
            break;
          }
        }
        ctx.save();
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.font = `${weight} ${fittedFont}px ${family}`;
        ctx.fillStyle = chosenTextColor;
        let y = boxY + padding;
        for (const bullet of bullets) {
          if (!bullet) continue;
          if (y > boxY + boxH - padding) break;
          const bulletX = boxX + padding + bulletIndent;
          ctx.fillText(marker, bulletX, y);
          const textX = bulletX + 20;
          const maxW = boxW - padding * 2 - bulletIndent - 20;
          const lines = wrapBulletLines(fittedFont, String(bullet), maxW);
          let lineY = y;
          for (const line of lines) {
            const out = line.trimEnd();
            ctx.fillText(out, textX, lineY);
            lineY += fittedLineHeight;
          }
          y = lineY + bulletSpacing;
        }
        ctx.restore();
      }

      if (isEditable && selectedShapeId === shape.id) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(shape.x - 2, shape.y - 2, shape.width + 4, shape.height + 4);
        ctx.setLineDash([]);
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(shape.x + shape.width - 8, shape.y + shape.height - 8, 8, 8);
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(shape.x + shape.width / 2 - 40, shape.y - 20, 80, 16);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const rotText = shape.rotation ? ` ${shape.rotation}°` : "";
        ctx.fillText(`${Math.round(shape.width)} × ${Math.round(shape.height)}${rotText}`, shape.x + shape.width / 2, shape.y - 12);
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

      // ✅ Reset transform and clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // ✅ Apply zoom and pan
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

      if (showGrid) {
        drawGrid(ctx, 20);
      }

      await drawShapesOnly(ctx);

      if (activeGuides.length > 0) {
        drawGuides(ctx, activeGuides);
      }

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
  }, [shapes, backgroundImage, campaignData, logoUrl, selectedShapeId, isEditable, canvasWidth, canvasHeight, showGrid, activeGuides, zoom, pan]);

  // ✅ Convert screen coordinates to world coordinates
  function screenToWorld(
    e: React.MouseEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
    rect: DOMRect
  ) {
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wx = (sx - pan.x) / zoom;
    const wy = (sy - pan.y) / zoom;
    return { x: wx, y: wy };
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditable) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { x: mouseX, y: mouseY } = screenToWorld(e, canvas, rect);

    const sortedShapes = [...shapes].sort((a, b) => (b.zIndex || 1) - (a.zIndex || 1));
    for (const shape of sortedShapes) {
      if (mouseX >= shape.x && mouseX <= shape.x + shape.width && mouseY >= shape.y && mouseY <= shape.y + shape.height) {
        const multi = e.shiftKey;
        onShapeSelect?.(shape.id, multi);
        setDraggedShapeId(shape.id);
        setDragStart({ x: mouseX, y: mouseY });
        setShapeStartPos({ x: shape.x, y: shape.y });
        if (mouseX > shape.x + shape.width - 8 && mouseY > shape.y + shape.height - 8) {
          setIsResizing(true);
        }
        return;
      }
    }

    onShapeSelect?.("", false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditable || !draggedShapeId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { x: mouseX, y: mouseY } = screenToWorld(e, canvas, rect);

    const shape = shapes.find((s) => s.id === draggedShapeId);
    if (!shape) return;

    if (isResizing) {
      const newWidth = Math.max(50, mouseX - shape.x);
      const newHeight = Math.max(50, mouseY - shape.y);
      onShapeResize?.(draggedShapeId, newWidth, newHeight);
      setActiveGuides([]);
    } else {
      const dx = mouseX - dragStart.x;
      const dy = mouseY - dragStart.y;
      const newX = shapeStartPos.x + dx;
      const newY = shapeStartPos.y + dy;
      const tempShape = { ...shape, x: newX, y: newY };
      const snapResult = calculateSnapGuides(tempShape, shapes, canvasWidth, canvasHeight, snapToObjects);
      const finalX = snapResult.snapX ?? newX;
      const finalY = snapResult.snapY ?? newY;
      onShapeDrag?.(draggedShapeId, finalX, finalY);
      setActiveGuides(snapResult.guides);
    }
  };

  const handleMouseUp = () => {
    setDraggedShapeId(null);
    setIsResizing(false);
    setActiveGuides([]);
  };

  // ✅ FIT TO SCREEN
  const fitToScreen = () => {
    const el = containerRef.current;
    if (!el) return;
    const padding = 24;
    const vw = el.clientWidth - padding;
    const vh = el.clientHeight - padding;
    const scale = Math.min(vw / canvasWidth, vh / canvasHeight);
    const cx = (el.clientWidth - canvasWidth * scale) / 2;
    const cy = (el.clientHeight - canvasHeight * scale) / 2;
    setZoom(+scale.toFixed(3));
    setPan({ x: cx, y: cy });
  };

  return (
    <div className="w-full h-full relative overflow-hidden" ref={containerRef}>
      {/* ✅ ZOOM CONTROLS */}
      <div className="absolute top-3 right-3 z-10 flex gap-2 bg-white/90 backdrop-blur rounded-md border border-border p-2 shadow-sm">
        <button
          onClick={() => setZoom((z) => Math.max(0.2, +(z - 0.1).toFixed(2)))}
          className="px-2 py-1 text-xs border rounded hover:bg-gray-100 transition"
          title="Zoom Out"
        >
          −
        </button>
        <div className="text-xs w-14 text-center self-center font-medium">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
          className="px-2 py-1 text-xs border rounded hover:bg-gray-100 transition"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={fitToScreen}
          className="px-2 py-1 text-xs border rounded hover:bg-gray-100 transition"
          title="Fit to Screen"
        >
          Fit
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="px-2 py-1 text-xs border rounded hover:bg-gray-100 transition"
          title="Reset to 100%"
        >
          100%
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`border border-border rounded-lg ${isEditable ? "cursor-move" : ""}`}
        style={{ maxWidth: "100%", height: "auto", display: "block" }}
      />
    </div>
  );
});

export default TemplateCanvas;