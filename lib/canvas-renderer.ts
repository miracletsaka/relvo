/**
 * frontend/lib/canvas-renderer.ts
 *
 * KEY CHANGES vs previous version:
 *  - drawTextScrim() REMOVED entirely. No per-text background boxes.
 *  - Darkening overlay is a gradient-overlay shape injected by the intelligence
 *    layer — the renderer just draws it as a normal gradient-overlay. One overlay
 *    per image, positioned and z-ordered correctly.
 *  - Z-sort: explicit SEGMENT_Z_PRIORITY map. background=0, hero-image=2,
 *    overlays=3, header/text=4+. Images are always behind text.
 *  - capOffset from real TextMetrics.actualBoundingBoxAscent — no fixed 0.76.
 *  - textTransform: uppercase/lowercase/capitalize applied before word-wrap.
 *  - Dynamic canvas size from segment _meta (no hardcoded 1080×1350).
 *  - brandColor: never defaults to #7c3aed; uses shape._tokens.accent fallback.
 *  - All premium fonts loaded: Anton, Bebas Neue, Syne, Outfit, DM Sans,
 *    Barlow Condensed, Playfair Display, Cormorant Garamond, Space Grotesk.
 */

export type CanvasSegment = {
  /** Optional legacy id alias — instanceId is canonical */
  id?: string;
  instanceId: string;
  requested_type: string;
  y: number;
  segment_height: number;
  shapes: Shape[];
  name: string;
  description: string;
  segment_type: string;
  /** Present on campaign_composition segments */
  internal_segment_type?: string;
  _meta?: {
    tokens?: { bg: string; accent: string; textPrimary: string; [key: string]: any };
    canvasWidth?: number;
    canvasHeight?: number;
    primaryFamily?: string;
    accentFamily?: string;
    zones?: Record<string, any>;
    layoutBands?: Record<string, any>;
    [key: string]: any;
  };
};

export type Shape = Record<string, any>;

export type SelectedShapeRef = { segmentId: string; shapeId: string };

export type DragMode =
  | "move" | "resize-nw" | "resize-ne" | "resize-sw" | "resize-se"
  | "resize-n" | "resize-s" | "resize-e" | "resize-w";

export type RendererResolvers = {
  getCampaignValue: (field: string) => string;
  getSlotUrl: (slotKey: string, logoUrl: string | null) => string | null;
};

export type Renderer = {
  draw(
    segments: CanvasSegment[],
    brandColor: string,
    logoUrl: string | null,
    selectedSegmentId?: string | null,
    selectedShape?: SelectedShapeRef | null,
  ): Promise<void>;
  destroy(): void;
};

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_CANVAS_W = 1080;
const DEFAULT_CANVAS_H = 1350;

// ─── Font loading ─────────────────────────────────────────────────────────────

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?" +
  "family=Anton&" +
  "family=Bebas+Neue&" +
  "family=Cormorant+Garamond:ital,wght@0,300;0,600;1,400&" +
  "family=Playfair+Display:ital,wght@0,700;1,400&" +
  "family=Syne:wght@400;700;800&" +
  "family=Barlow+Condensed:wght@300;400;600;700;800&" +
  "family=Outfit:wght@300;400;600;700&" +
  "family=DM+Sans:wght@300;400;500;600&" +
  "family=Space+Grotesk:wght@300;400;500;600;700&" +
  "family=Montserrat:wght@400;500;600;700;800;900&" +
  "family=Oswald:wght@400;500;600;700&" +
  "family=Raleway:wght@400;500;600;700;800&" +
  "display=swap";

interface FontSpec { family: string; weight: number; size: number }

const FONTS_TO_LOAD: FontSpec[] = [
  { family: "Anton",              weight: 400, size: 48 },
  { family: "Bebas Neue",         weight: 400, size: 48 },
  { family: "Cormorant Garamond", weight: 300, size: 32 },
  { family: "Cormorant Garamond", weight: 600, size: 32 },
  { family: "Playfair Display",   weight: 700, size: 32 },
  { family: "Syne",               weight: 400, size: 32 },
  { family: "Syne",               weight: 700, size: 32 },
  { family: "Syne",               weight: 800, size: 32 },
  { family: "Barlow Condensed",   weight: 300, size: 32 },
  { family: "Barlow Condensed",   weight: 400, size: 32 },
  { family: "Barlow Condensed",   weight: 600, size: 32 },
  { family: "Barlow Condensed",   weight: 700, size: 32 },
  { family: "Barlow Condensed",   weight: 800, size: 32 },
  { family: "Outfit",             weight: 300, size: 32 },
  { family: "Outfit",             weight: 400, size: 32 },
  { family: "Outfit",             weight: 600, size: 32 },
  { family: "Outfit",             weight: 700, size: 32 },
  { family: "DM Sans",            weight: 300, size: 32 },
  { family: "DM Sans",            weight: 400, size: 32 },
  { family: "DM Sans",            weight: 500, size: 32 },
  { family: "DM Sans",            weight: 600, size: 32 },
  { family: "Space Grotesk",      weight: 400, size: 32 },
  { family: "Space Grotesk",      weight: 700, size: 32 },
  { family: "Montserrat",         weight: 400, size: 32 },
  { family: "Montserrat",         weight: 700, size: 32 },
  { family: "Montserrat",         weight: 900, size: 32 },
  { family: "Oswald",             weight: 400, size: 32 },
  { family: "Oswald",             weight: 700, size: 32 },
  { family: "Raleway",            weight: 400, size: 32 },
  { family: "Raleway",            weight: 700, size: 32 },
];

let fontsInjected       = false;
let fontsReadyPromise: Promise<boolean> | null = null;

export function preloadFonts(): Promise<boolean> {
  if (fontsReadyPromise) return fontsReadyPromise;
  fontsReadyPromise = (async () => {
    if (!fontsInjected) {
      fontsInjected = true;
      const pc1 = document.createElement("link"); pc1.rel = "preconnect"; pc1.href = "https://fonts.googleapis.com"; document.head.appendChild(pc1);
      const pc2 = document.createElement("link"); pc2.rel = "preconnect"; pc2.href = "https://fonts.gstatic.com"; pc2.crossOrigin = "anonymous"; document.head.appendChild(pc2);
      if (!document.querySelector(`link[href="${GOOGLE_FONTS_URL}"]`)) {
        const link = document.createElement("link"); link.rel = "stylesheet"; link.href = GOOGLE_FONTS_URL; document.head.appendChild(link);
      }
    }
    await document.fonts.ready;
    await Promise.allSettled(FONTS_TO_LOAD.map(({ weight, size, family }) => document.fonts.load(`${weight} ${size}px "${family}"`)));
    return true;
  })();
  return fontsReadyPromise;
}

export function areFontsReady(): boolean {
  return FONTS_TO_LOAD.every(({ weight, size, family }) => document.fonts.check(`${weight} ${size}px "${family}"`));
}

// ─── Image cache ──────────────────────────────────────────────────────────────

const imageCache          = new Map<string, HTMLImageElement>();
const imageLoadingPromises = new Map<string, Promise<HTMLImageElement>>();

function loadImg(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached) return Promise.resolve(cached);
  const existing = imageLoadingPromises.get(url);
  if (existing) return existing;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload  = () => { imageCache.set(url, img); imageLoadingPromises.delete(url); resolve(img); };
    img.onerror = () => { imageLoadingPromises.delete(url); reject(new Error(`Image failed: ${url}`)); };
    img.src = url;
  });
  imageLoadingPromises.set(url, promise);
  return promise;
}

export function clearImageCache() { imageCache.clear(); imageLoadingPromises.clear(); }

// ─── Shared helpers ───────────────────────────────────────────────────────────

function replaceAccent(value: string | undefined | null, accent: string): string {
  if (!value) return "";
  return value.replace(/__BRAND_ACCENT__/g, accent);
}

/** Shape's effective accent colour — never falls back to purple */
function shapeAccent(shape: Shape, brandColor: string): string {
  if (shape._tokens?.accent) return shape._tokens.accent as string;
  if (brandColor && brandColor !== "#7c3aed") return brandColor;
  return "#C9A84C";
}

function cleanFontFamily(ff: string): string {
  return String(ff || "Bebas Neue").split(",")[0].replace(/["']/g, "").trim();
}

function applyTextTransform(text: string, transform: string | undefined): string {
  switch (String(transform || "").toLowerCase()) {
    case "uppercase":  return text.toUpperCase();
    case "lowercase":  return text.toLowerCase();
    case "capitalize": return text.replace(/\b\w/g, (c) => c.toUpperCase());
    default:           return text;
  }
}

// Cap height via real font metrics — fixes top-clip on display fonts
const capOffsetCache = new Map<string, number>();
function getCapOffset(ctx: CanvasRenderingContext2D, fontSize: number): number {
  const key = ctx.font;
  if (capOffsetCache.has(key)) return capOffsetCache.get(key)!;
  try {
    const m = ctx.measureText("M");
    const ascent = (m as any).actualBoundingBoxAscent ?? fontSize * 0.72;
    capOffsetCache.set(key, ascent);
    return ascent;
  } catch { return fontSize * 0.72; }
}

function drawRoundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(Math.abs(r), w / 2, h / 2);
  ctx.beginPath();
  if (radius > 0) {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
  } else { ctx.rect(x, y, w, h); }
  ctx.closePath();
}

function applyShadow(ctx: CanvasRenderingContext2D, shape: Shape, accent: string) {
  const blur = Number(shape.shadowBlur || 0);
  if (blur <= 0) return;
  ctx.shadowColor   = replaceAccent(shape.shadowColor, accent) || "rgba(0,0,0,0.6)";
  ctx.shadowBlur    = blur;
  ctx.shadowOffsetX = Number(shape.shadowX || 0);
  ctx.shadowOffsetY = Number(shape.shadowY || 0);
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
}

function resolveImageUrl(shape: Shape, logoUrl: string | null, resolvers: RendererResolvers): string | null {
  if (typeof shape.src === "string" && shape.src.length > 0) return shape.src;
  if (shape.dataField) { const v = resolvers.getCampaignValue(String(shape.dataField)); if (v) return v; }
  if (shape.slotKey)   return resolvers.getSlotUrl(String(shape.slotKey), logoUrl);
  return null;
}

function measureLetterSpacedText(ctx: CanvasRenderingContext2D, text: string, spacing: number): number {
  const chars = Array.from(text);
  return chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * Math.max(chars.length - 1, 0);
}

function drawLetterSpacedText(
  ctx: CanvasRenderingContext2D, text: string,
  x: number, y: number, spacing: number, align: string,
  strokeWidth = 0, strokeColor = "transparent",
) {
  const chars  = Array.from(text);
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total  = widths.reduce((s, v) => s + v, 0) + spacing * Math.max(chars.length - 1, 0);
  let cursor   = x;
  if (align === "center") cursor = x - total / 2;
  if (align === "right")  cursor = x - total;
  for (let i = 0; i < chars.length; i++) {
    if (strokeWidth > 0) { ctx.lineWidth = strokeWidth; ctx.strokeStyle = strokeColor; ctx.strokeText(chars[i], cursor, y); }
    ctx.fillText(chars[i], cursor, y);
    cursor += widths[i] + spacing;
  }
}

// ─── Text rendering ───────────────────────────────────────────────────────────
//
// No background box. No clip on height — all lines always rendered.

function drawTextShape(
  ctx: CanvasRenderingContext2D, shape: Shape,
  globalY: number, accent: string,
  getCampaignValue: (field: string) => string,
) {
  const raw = shape.dataField
    ? getCampaignValue(shape.dataField)
    : typeof shape.text === "string" ? shape.text : "";
  if (!raw) return;

  const text         = applyTextTransform(raw, shape.textTransform);
  const fontSize     = Math.max(Number(shape.fontSize || 24), 1);
  const fontWeight   = Number(shape.fontWeight || 700);
  const fontFamily   = cleanFontFamily(shape.fontFamily || "Bebas Neue");
  const padding      = Number(shape.padding || 0);
  const lineHeightPx = Number(shape.lineHeight || 1.1) * fontSize;
  const align        = (shape.textAlign || "left") as CanvasTextAlign;
  const spacing      = Number(shape.letterSpacing || 0);
  const shapeX       = Number(shape.x || 0);
  const shapeY       = globalY + Number(shape.y || 0);
  const shapeW       = Number(shape.width || 200);
  const maxW         = Math.max(10, shapeW - padding * 2);

  ctx.font         = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign    = "left";

  // Fill style
  const gradColors = shape.textGradientColors as string[] | undefined;
  if (Array.isArray(gradColors) && gradColors.length >= 2) {
    const g = ctx.createLinearGradient(shapeX, shapeY, shapeX + shapeW, shapeY + fontSize * 3);
    gradColors.forEach((c, i) => g.addColorStop(i / (gradColors.length - 1), replaceAccent(c, accent)));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = replaceAccent(shape.textColor, accent) || "#ffffff";
  }

  const strokeW = Number(shape.textStrokeWidth || 0);
  const strokeC = replaceAccent(shape.textStrokeColor, accent) || "transparent";

  // Word wrap
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(" ");
    let curr = "";
    for (const word of words) {
      const test  = curr ? `${curr} ${word}` : word;
      const testW = spacing === 0 ? ctx.measureText(test).width : measureLetterSpacedText(ctx, test, spacing);
      if (testW <= maxW) { curr = test; } else { if (curr) lines.push(curr); curr = word; }
    }
    if (curr) lines.push(curr);
  }

  let anchorX = shapeX + padding;
  if (align === "center") anchorX = shapeX + shapeW / 2;
  if (align === "right")  anchorX = shapeX + shapeW - padding;

  const capOffset = getCapOffset(ctx, fontSize);
  let ty = shapeY + padding + capOffset;

  // Render all lines — no height clipping
  for (const line of lines) {
    if (spacing !== 0) {
      drawLetterSpacedText(ctx, line, anchorX, ty, spacing, align, strokeW, strokeC);
    } else {
      ctx.textAlign = align;
      if (strokeW > 0) { ctx.lineWidth = strokeW; ctx.strokeStyle = strokeC; ctx.strokeText(line, anchorX, ty); }
      ctx.fillText(line, anchorX, ty);
      ctx.textAlign = "left";
    }
    ty += lineHeightPx;
  }
}

// ─── Z-order ──────────────────────────────────────────────────────────────────
//
// Lower number = drawn first = visually behind.
// Overlays (injected by intelligence layer) sit just above images.

const SEGMENT_Z_PRIORITY: Record<string, number> = {
  background:           0,
  scene:                1,
  "hero-image":         2,
  hero_media:           2,
  header:               4,
  "hero-text":          5,
  offer:                6,
  cta:                  7,
  features:             8,
  sponsors:             9,
  contact:              10,
  social:               11,
  footer:               12,
  campaign_composition: 5,
};

function segmentZPri(requestedType: string): number {
  return SEGMENT_Z_PRIORITY[requestedType] ?? 5;
}

// ─── Selection handles ────────────────────────────────────────────────────────

export function shapeGlobalRect(segment: CanvasSegment, shape: Shape) {
  return { x: Number(shape.x || 0), y: Number(segment.y || 0) + Number(shape.y || 0), width: Number(shape.width || 0), height: Number(shape.height || 0) };
}

export function getSelectedShape(segments: CanvasSegment[], selected: SelectedShapeRef | null) {
  if (!selected) return null;
  const segment = segments.find((s) => s.instanceId === selected.segmentId);
  if (!segment) return null;
  const shape = (segment.shapes || []).find((s) => s.id === selected.shapeId);
  if (!shape) return null;
  return { segment, shape };
}

export function hitTestShape(segments: CanvasSegment[], canvasX: number, canvasY: number): SelectedShapeRef | null {
  const all = segments.flatMap((seg) =>
    (seg.shapes || []).map((shape) => ({ seg, shape, rect: shapeGlobalRect(seg, shape), z: Number(shape.zIndex || 0) }))
  );
  all.sort((a, b) => b.z - a.z);
  for (const { seg, shape, rect } of all) {
    if (canvasX >= rect.x && canvasX <= rect.x + rect.width && canvasY >= rect.y && canvasY <= rect.y + rect.height)
      return { segmentId: seg.instanceId, shapeId: shape.id };
  }
  return null;
}

function drawHandles(ctx: CanvasRenderingContext2D, rect: { x: number; y: number; width: number; height: number }) {
  const { x, y, width, height } = rect;
  for (const [hx, hy] of [[x,y],[x+width/2,y],[x+width,y],[x+width,y+height/2],[x+width,y+height],[x+width/2,y+height],[x,y+height],[x,y+height/2]]) {
    ctx.fillStyle = "#34d399"; ctx.strokeStyle = "#05070b"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(hx - 6, hy - 6, 12, 12); ctx.fill(); ctx.stroke();
  }
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export function createRenderer(canvas: HTMLCanvasElement, resolvers: RendererResolvers): Renderer {
  let generation = 0;
  let destroyed  = false;

  async function draw(
    segments: CanvasSegment[],
    brandColor: string,
    logoUrl: string | null,
    selectedSegmentId?: string | null,
    selectedShape?: SelectedShapeRef | null,
  ): Promise<void> {
    if (destroyed) return;
    const myGen = ++generation;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    await preloadFonts();
    if (myGen !== generation || destroyed) return;

    // Dynamic canvas dimensions
    const firstMeta = segments.find((s) => s._meta?.canvasWidth)?._meta;
    const canvasW = firstMeta?.canvasWidth  ?? DEFAULT_CANVAS_W;
    const canvasH = firstMeta?.canvasHeight ?? segments.reduce((m, s) => Math.max(m, (s.y || 0) + (s.segment_height || 0)), DEFAULT_CANVAS_H);

    canvas.width  = canvasW;
    canvas.height = canvasH;

    // Background
    const tokenBg = firstMeta?.tokens?.bg ?? "#05070b";
    ctx.fillStyle = tokenBg;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Flatten all shapes
    const all = segments.flatMap((seg) =>
      (seg.shapes || []).map((shape) => ({
        ...shape,
        __seg:     seg,
        __globalY: seg.y || 0,
        __segZPri: segmentZPri(seg.requested_type),
      }))
    );

    // Sort: segment layer first, shape zIndex within layer second.
    // _isOverlay shapes get segZPri = image segZPri + 0.5 so they sit
    // above their image but below text.
    all.sort((a, b) => {
      const az = a._isOverlay ? a.__segZPri + 0.5 : a.__segZPri;
      const bz = b._isOverlay ? b.__segZPri + 0.5 : b.__segZPri;
      if (az !== bz) return az - bz;
      return Number(a.zIndex || 0) - Number(b.zIndex || 0);
    });

    // ── Draw loop ──
    for (const shape of all) {
      if (myGen !== generation || destroyed) return;

      ctx.save();
      const type = String(shape.type || "").toLowerCase();
      const x    = Number(shape.x || 0);
      const y    = Number(shape.__globalY || 0) + Number(shape.y || 0);
      const w    = Number(shape.width  || 100);
      const h    = Number(shape.height || 40);
      const rot  = Number(shape.rotation || 0);
      const acc  = shapeAccent(shape, brandColor);

      ctx.globalAlpha = Math.max(0, Math.min(1, Number(shape.opacity ?? 1)));

      if (rot) {
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.translate(-(x + w / 2), -(y + h / 2));
      }

      // ── Gradient overlay (image darkening) ──
      if (type === "gradient-overlay") {
        const stops: Array<{ stop: number; color: string }> = shape.gradientColors || [];
        if (stops.length >= 2) {
          const angle = ((Number(shape.gradientAngle) || 180) * Math.PI) / 180;
          const cx = x + w / 2, cy = y + h / 2;
          const half = Math.sqrt(w * w + h * h) / 2;
          const g = ctx.createLinearGradient(cx - Math.cos(angle) * half, cy - Math.sin(angle) * half, cx + Math.cos(angle) * half, cy + Math.sin(angle) * half);
          stops.forEach((s) => g.addColorStop(Math.max(0, Math.min(1, Number(s.stop))), replaceAccent(s.color, acc)));
          ctx.fillStyle = g;
          ctx.fillRect(x, y, w, h);
        }
        ctx.restore(); continue;
      }

      // ── Pattern overlay ──
      if (type === "pattern-overlay") {
        const pColor   = replaceAccent(shape.patternColor, acc) || "#ffffff";
        const pOpacity = Math.max(0, Math.min(1, Number(shape.patternOpacity ?? 0.04)));
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        ctx.globalAlpha = pOpacity; ctx.strokeStyle = pColor; ctx.lineWidth = 1;
        for (let i = -h; i < w + h; i += 28) { ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.stroke(); }
        ctx.restore(); ctx.restore(); continue;
      }

      // ── Rectangle / rounded-rect ──
      if (type === "rounded-rect" || type === "rectangle") {
        const radius = type === "rectangle" ? 0 : Number(shape.borderRadius || 0);
        const stops: Array<{ stop: number; color: string }> = shape.gradientColors || [];
        let fill: string | CanvasGradient = "transparent";
        if (stops.length >= 2) {
          const g = ctx.createLinearGradient(x, y, x + w, y + h);
          stops.forEach((s) => g.addColorStop(Math.max(0, Math.min(1, Number(s.stop))), replaceAccent(s.color, acc)));
          fill = g;
        } else { fill = replaceAccent(shape.backgroundColor, acc) || "transparent"; }
        applyShadow(ctx, shape, acc);
        drawRoundedPath(ctx, x, y, w, h, radius);
        if (fill !== "transparent") { ctx.fillStyle = fill; ctx.fill(); }
        clearShadow(ctx);
        if (Number(shape.borderWidth || 0) > 0) {
          ctx.strokeStyle = replaceAccent(shape.borderColor, acc) || "rgba(255,255,255,0.2)";
          ctx.lineWidth   = Number(shape.borderWidth || 1);
          ctx.stroke();
        }
        ctx.restore(); continue;
      }

      // ── Circle ──
      if (type === "circle") {
        applyShadow(ctx, shape, acc);
        ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
        ctx.fillStyle = replaceAccent(shape.backgroundColor, acc) || "transparent"; ctx.fill();
        clearShadow(ctx); ctx.restore(); continue;
      }

      // ── Line ──
      if (type === "line") {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
        ctx.strokeStyle = replaceAccent(shape.backgroundColor || shape.borderColor, acc) || "#ffffff";
        ctx.lineWidth   = Number(shape.borderWidth || 2); ctx.stroke();
        ctx.restore(); continue;
      }

      // ── Image ──
      if (type === "image") {
        const url = resolveImageUrl(shape, logoUrl, resolvers);
        if (url) {
          try {
            const img = await loadImg(url);
            if (myGen !== generation || destroyed) { ctx.restore(); return; }
            const fit = shape.fit || "cover";
            let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
            if (fit === "cover") {
              const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
              sw = w / scale; sh = h / scale;
              sx = (img.naturalWidth  - sw) / 2;
              sy = (img.naturalHeight - sh) / 2;
            }
            const radius = Number(shape.radius || 0);
            if (radius > 0) { drawRoundedPath(ctx, x, y, w, h, radius); ctx.clip(); }
            ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
          } catch {
            drawRoundedPath(ctx, x, y, w, h, Number(shape.radius || 8));
            ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1; ctx.stroke();
          }
        }
        ctx.restore(); continue;
      }

      // ── Text — shadow only, NO background box ──
      if (type === "text") {
        applyShadow(ctx, shape, acc);
        drawTextShape(ctx, shape, Number(shape.__globalY || 0), acc, resolvers.getCampaignValue);
        clearShadow(ctx);
        ctx.restore(); continue;
      }

      ctx.restore();
    }

    if (myGen !== generation || destroyed) return;

    // ── Selection overlays ──
    if (selectedSegmentId) {
      const seg = segments.find((s) => s.instanceId === selectedSegmentId);
      if (seg) {
        ctx.save(); ctx.strokeStyle = "rgba(167,139,250,0.78)"; ctx.lineWidth = 3;
        ctx.setLineDash([14, 10]); ctx.strokeRect(3, seg.y + 3, canvasW - 6, seg.segment_height - 6);
        ctx.setLineDash([]); ctx.restore();
      }
    }

    if (selectedShape) {
      const found = getSelectedShape(segments, selectedShape);
      if (found) {
        const rect = shapeGlobalRect(found.segment, found.shape);
        ctx.save(); ctx.strokeStyle = "#34d399"; ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]); ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        ctx.setLineDash([]); drawHandles(ctx, rect); ctx.restore();
      }
    }
  }

  function destroy() { destroyed = true; generation += 1; }
  return { draw, destroy };
}

// ─── Resize handle hit-testing ────────────────────────────────────────────────

export function getResizeHandleAtPoint(segment: CanvasSegment, shape: Shape, canvasX: number, canvasY: number): DragMode | null {
  const rect = shapeGlobalRect(segment, shape);
  const size = 18;
  const handles: { mode: DragMode; x: number; y: number }[] = [
    { mode: "resize-nw", x: rect.x,                  y: rect.y },
    { mode: "resize-n",  x: rect.x + rect.width / 2, y: rect.y },
    { mode: "resize-ne", x: rect.x + rect.width,      y: rect.y },
    { mode: "resize-e",  x: rect.x + rect.width,      y: rect.y + rect.height / 2 },
    { mode: "resize-se", x: rect.x + rect.width,      y: rect.y + rect.height },
    { mode: "resize-s",  x: rect.x + rect.width / 2, y: rect.y + rect.height },
    { mode: "resize-sw", x: rect.x,                  y: rect.y + rect.height },
    { mode: "resize-w",  x: rect.x,                  y: rect.y + rect.height / 2 },
  ];
  for (const h of handles) {
    if (canvasX >= h.x - size / 2 && canvasX <= h.x + size / 2 && canvasY >= h.y - size / 2 && canvasY <= h.y + size / 2) return h.mode;
  }
  return null;
}