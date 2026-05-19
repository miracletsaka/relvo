export type CanvasSegment = {
  instanceId: string;
  requested_type: string;
  y: number;
  segment_height: number;
  shapes: Shape[];
  name: string;
  description: string;
  segment_type: string;
};

export type Shape = Record<string, any>;

export type SelectedShapeRef = {
  segmentId: string;
  shapeId: string;
};

export type DragMode =
  | "move"
  | "resize-nw"
  | "resize-ne"
  | "resize-sw"
  | "resize-se"
  | "resize-n"
  | "resize-s"
  | "resize-e"
  | "resize-w";

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

const CANVAS_W = 1080;
const CANVAS_H = 1350;

const FONTS_TO_LOAD = [
  { weight: 400, size: 32, family: "Bebas Neue" },
  { weight: 400, size: 32, family: "Oswald" },
  { weight: 500, size: 32, family: "Oswald" },
  { weight: 600, size: 32, family: "Oswald" },
  { weight: 700, size: 32, family: "Oswald" },

  { weight: 400, size: 32, family: "Montserrat" },
  { weight: 500, size: 32, family: "Montserrat" },
  { weight: 600, size: 32, family: "Montserrat" },
  { weight: 700, size: 32, family: "Montserrat" },
  { weight: 800, size: 32, family: "Montserrat" },
  { weight: 900, size: 32, family: "Montserrat" },

  { weight: 400, size: 32, family: "Raleway" },
  { weight: 500, size: 32, family: "Raleway" },
  { weight: 600, size: 32, family: "Raleway" },
  { weight: 700, size: 32, family: "Raleway" },
  { weight: 800, size: 32, family: "Raleway" },

  { weight: 400, size: 32, family: "Anton" },
  { weight: 400, size: 32, family: "Barlow Condensed" },
  { weight: 600, size: 32, family: "Barlow Condensed" },
  { weight: 700, size: 32, family: "Barlow Condensed" },
  { weight: 800, size: 32, family: "Barlow Condensed" },
];

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@400;600;700;800&family=Bebas+Neue&family=Montserrat:wght@400;500;600;700;800;900&family=Oswald:wght@400;500;600;700&family=Raleway:wght@400;500;600;700;800&display=swap";

let fontsInjected = false;
let fontsReadyPromise: Promise<boolean> | null = null;

export function preloadFonts(): Promise<boolean> {
  if (fontsReadyPromise) return fontsReadyPromise;

  fontsReadyPromise = (async () => {
    if (!fontsInjected) {
      fontsInjected = true;

      const preconnect1 = document.createElement("link");
      preconnect1.rel = "preconnect";
      preconnect1.href = "https://fonts.googleapis.com";
      document.head.appendChild(preconnect1);

      const preconnect2 = document.createElement("link");
      preconnect2.rel = "preconnect";
      preconnect2.href = "https://fonts.gstatic.com";
      preconnect2.crossOrigin = "anonymous";
      document.head.appendChild(preconnect2);

      const existing = document.querySelector(`link[href="${GOOGLE_FONTS_URL}"]`);
      if (!existing) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = GOOGLE_FONTS_URL;
        document.head.appendChild(link);
      }
    }

    await document.fonts.ready;

    await Promise.all(
      FONTS_TO_LOAD.map(({ weight, size, family }) =>
        document.fonts.load(`${weight} ${size}px "${family}"`).catch(() => {
          console.warn(`[canvas-renderer] font load failed: ${weight} ${size}px ${family}`);
          return [];
        }),
      ),
    );

    return true;
  })();

  return fontsReadyPromise;
}

export function areFontsReady(): boolean {
  return FONTS_TO_LOAD.every(({ weight, size, family }) =>
    document.fonts.check(`${weight} ${size}px "${family}"`),
  );
}

const imageCache = new Map<string, HTMLImageElement>();
const imageLoadingPromises = new Map<string, Promise<HTMLImageElement>>();

function loadImg(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached) return Promise.resolve(cached);

  const existing = imageLoadingPromises.get(url);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      imageCache.set(url, img);
      imageLoadingPromises.delete(url);
      resolve(img);
    };

    img.onerror = () => {
      imageLoadingPromises.delete(url);
      reject(new Error(`Image failed to load: ${url}`));
    };

    img.src = url;
  });

  imageLoadingPromises.set(url, promise);
  return promise;
}

export function clearImageCache() {
  imageCache.clear();
  imageLoadingPromises.clear();
}

function replaceAccent(value: string | undefined | null, brandColor: string): string {
  if (!value) return "";
  return value.replace(/__BRAND_ACCENT__/g, brandColor);
}

export function shapeGlobalRect(segment: CanvasSegment, shape: Shape) {
  return {
    x: Number(shape.x || 0),
    y: Number(segment.y || 0) + Number(shape.y || 0),
    width: Number(shape.width || 0),
    height: Number(shape.height || 0),
  };
}

export function getSelectedShape(
  segments: CanvasSegment[],
  selected: SelectedShapeRef | null,
): { segment: CanvasSegment; shape: Shape } | null {
  if (!selected) return null;

  const segment = segments.find((s) => s.instanceId === selected.segmentId);
  if (!segment) return null;

  const shape = (segment.shapes || []).find((s) => s.id === selected.shapeId);
  if (!shape) return null;

  return { segment, shape };
}

export function hitTestShape(
  segments: CanvasSegment[],
  canvasX: number,
  canvasY: number,
): SelectedShapeRef | null {
  const all = segments.flatMap((segment) =>
    (segment.shapes || []).map((shape) => ({
      segment,
      shape,
      rect: shapeGlobalRect(segment, shape),
      z: Number(shape.zIndex || 0),
    })),
  );

  all.sort((a, b) => {
    if (a.segment.requested_type === "hero_media" && b.segment.requested_type !== "hero_media") return 1;
    if (b.segment.requested_type === "hero_media" && a.segment.requested_type !== "hero_media") return -1;
    return b.z - a.z;
  });

  for (const item of all) {
    const { rect } = item;

    if (
      canvasX >= rect.x &&
      canvasX <= rect.x + rect.width &&
      canvasY >= rect.y &&
      canvasY <= rect.y + rect.height
    ) {
      return {
        segmentId: item.segment.instanceId,
        shapeId: item.shape.id,
      };
    }
  }

  return null;
}

function drawRoundedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(Math.abs(radius), width / 2, height / 2);

  ctx.beginPath();

  if (r > 0) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
  } else {
    ctx.rect(x, y, width, height);
  }

  ctx.closePath();
}

function applyShadow(ctx: CanvasRenderingContext2D, shape: Shape, brandColor: string) {
  const blur = Number(shape.shadowBlur || 0);

  if (blur <= 0) return;

  ctx.shadowColor = replaceAccent(shape.shadowColor, brandColor) || "rgba(0,0,0,0.6)";
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = Number(shape.shadowX || 0);
  ctx.shadowOffsetY = Number(shape.shadowY || 0);
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function resolveImageUrl(
  shape: Shape,
  logoUrl: string | null,
  resolvers: RendererResolvers,
): string | null {
  if (typeof shape.src === "string" && shape.src.length > 0) {
    return shape.src;
  }

  if (shape.dataField) {
    const value = resolvers.getCampaignValue(String(shape.dataField));

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  if (shape.slotKey) {
    return resolvers.getSlotUrl(String(shape.slotKey), logoUrl);
  }

  return null;
}

function drawLetterSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: string,
  strokeWidth = 0,
  strokeColor = "transparent",
) {
  const chars = Array.from(text);
  const widths = chars.map((char) => ctx.measureText(char).width);

  const totalWidth =
    widths.reduce((sum, value) => sum + value, 0) +
    spacing * Math.max(chars.length - 1, 0);

  let cursor = x;

  if (align === "center") cursor = x - totalWidth / 2;
  if (align === "right") cursor = x - totalWidth;

  for (let i = 0; i < chars.length; i += 1) {
    if (strokeWidth > 0) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = strokeColor;
      ctx.strokeText(chars[i], cursor, y);
    }

    ctx.fillText(chars[i], cursor, y);
    cursor += widths[i] + spacing;
  }
}

function measureLetterSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  spacing: number,
): number {
  const chars = Array.from(text);

  return (
    chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) +
    spacing * Math.max(chars.length - 1, 0)
  );
}

function cleanFontFamily(fontFamily: string): string {
  return String(fontFamily || "Bebas Neue")
    .split(",")[0]
    .replace(/["']/g, "")
    .trim();
}

function drawTextShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  globalY: number,
  brandColor: string,
  getCampaignValue: (field: string) => string,
) {
  const rawText =
    shape.dataField
      ? getCampaignValue(shape.dataField)
      : typeof shape.text === "string" && shape.text.length > 0
        ? shape.text
        : "";

  if (!rawText) return;

  const fontSize = Math.max(Number(shape.fontSize || 24), 1);
  const fontWeight = Number(shape.fontWeight || 700);
  const fontFamily = cleanFontFamily(shape.fontFamily || "Bebas Neue");
  const padding = Number(shape.padding || 0);
  const lineHeight = Number(shape.lineHeight || 1.1) * fontSize;
  const align = (shape.textAlign || "left") as CanvasTextAlign;
  const letterSpacing = Number(shape.letterSpacing || 0);
  const shapeX = Number(shape.x || 0);
  const shapeY = globalY + Number(shape.y || 0);
  const shapeW = Number(shape.width || 200);
  const shapeH = Number(shape.height || 100);
  const maxW = Math.max(10, shapeW - padding * 2);

  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  const gradientColors = shape.textGradientColors as string[] | undefined;

  if (Array.isArray(gradientColors) && gradientColors.length >= 2) {
    const gradient = ctx.createLinearGradient(
      shapeX,
      shapeY,
      shapeX + shapeW,
      shapeY + shapeH,
    );

    gradientColors.forEach((color, index) => {
      gradient.addColorStop(
        index / (gradientColors.length - 1),
        replaceAccent(color, brandColor),
      );
    });

    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = replaceAccent(shape.textColor, brandColor) || "#ffffff";
  }

  const strokeWidth = Number(shape.textStrokeWidth || 0);
  const strokeColor = replaceAccent(shape.textStrokeColor, brandColor) || "transparent";

  const finalLines: string[] = [];

  for (const paragraph of String(rawText).split("\n")) {
    const words = paragraph.split(" ");
    let current = "";

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const testWidth =
        letterSpacing === 0
          ? ctx.measureText(test).width
          : measureLetterSpacedText(ctx, test, letterSpacing);

      if (testWidth <= maxW) {
        current = test;
      } else {
        if (current) finalLines.push(current);
        current = word;
      }
    }

    if (current) finalLines.push(current);
  }

  let anchorX = shapeX + padding;

  if (align === "center") anchorX = shapeX + shapeW / 2;
  if (align === "right") anchorX = shapeX + shapeW - padding;

  const capOffset = fontSize * 0.76;
  let ty = shapeY + padding + capOffset;
  const bottom = shapeY + shapeH;

  for (const line of finalLines) {
    if (ty > bottom) break;

    if (letterSpacing !== 0) {
      drawLetterSpacedText(
        ctx,
        line,
        anchorX,
        ty,
        letterSpacing,
        align,
        strokeWidth,
        strokeColor,
      );
    } else {
      ctx.textAlign = align;

      if (strokeWidth > 0) {
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = strokeColor;
        ctx.strokeText(line, anchorX, ty);
      }

      ctx.fillText(line, anchorX, ty);
      ctx.textAlign = "left";
    }

    ty += lineHeight;
  }
}

function drawHandles(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
) {
  const { x, y, width, height } = rect;

  const points = [
    [x, y],
    [x + width / 2, y],
    [x + width, y],
    [x + width, y + height / 2],
    [x + width, y + height],
    [x + width / 2, y + height],
    [x, y + height],
    [x, y + height / 2],
  ];

  for (const [hx, hy] of points) {
    ctx.fillStyle = "#34d399";
    ctx.strokeStyle = "#05070b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(hx - 6, hy - 6, 12, 12);
    ctx.fill();
    ctx.stroke();
  }
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  resolvers: RendererResolvers,
): Renderer {
  let generation = 0;
  let destroyed = false;

  async function draw(
    segments: CanvasSegment[],
    brandColor: string,
    logoUrl: string | null,
    selectedSegmentId?: string | null,
    selectedShape?: SelectedShapeRef | null,
  ): Promise<void> {
    if (destroyed) return;

    const myGeneration = ++generation;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    await preloadFonts();

    if (myGeneration !== generation || destroyed) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#05070b";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const all = segments.flatMap((segment) =>
      (segment.shapes || []).map((shape) => ({
        ...shape,
        __segment: segment,
        __globalY: segment.y,
      })),
    );

    all.sort((a, b) => {
      const az = Number(a.zIndex || 0);
      const bz = Number(b.zIndex || 0);

      if (a.__segment.requested_type === "hero_media" && b.__segment.requested_type !== "hero_media") return -1;
      if (b.__segment.requested_type === "hero_media" && a.__segment.requested_type !== "hero_media") return 1;

      return az - bz;
    });

    for (const shape of all) {
      if (myGeneration !== generation || destroyed) return;

      ctx.save();

      const type = String(shape.type || "").toLowerCase();
      const x = Number(shape.x || 0);
      const y = Number(shape.__globalY || 0) + Number(shape.y || 0);
      const width = Number(shape.width || 100);
      const height = Number(shape.height || 40);
      const rotation = Number(shape.rotation || 0);

      ctx.globalAlpha = Math.max(0, Math.min(1, Number(shape.opacity ?? 1)));

      if (rotation) {
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-(x + width / 2), -(y + height / 2));
      }

      if (type === "gradient-overlay") {
        const stops: Array<{ stop: number; color: string }> = shape.gradientColors || [];

        if (stops.length >= 2) {
          const angle = ((Number(shape.gradientAngle) || 180) * Math.PI) / 180;
          const cx = x + width / 2;
          const cy = y + height / 2;
          const half = Math.sqrt(width * width + height * height) / 2;

          const gradient = ctx.createLinearGradient(
            cx - Math.cos(angle) * half,
            cy - Math.sin(angle) * half,
            cx + Math.cos(angle) * half,
            cy + Math.sin(angle) * half,
          );

          for (const stop of stops) {
            gradient.addColorStop(
              Math.max(0, Math.min(1, Number(stop.stop))),
              replaceAccent(stop.color, brandColor),
            );
          }

          applyShadow(ctx, shape, brandColor);
          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, width, height);
          clearShadow(ctx);
        }

        ctx.restore();
        continue;
      }

      if (type === "pattern-overlay") {
        const patternType = String(shape.patternType || "lines");
        const patternColor = replaceAccent(shape.patternColor, brandColor) || "#ffffff";
        const patternOpacity = Math.max(0, Math.min(1, Number(shape.patternOpacity ?? 0.04)));

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();
        ctx.globalAlpha = patternOpacity;
        ctx.strokeStyle = patternColor;
        ctx.lineWidth = 1;

        if (patternType === "diagonal-lines" || patternType === "lines") {
          const gap = 28;

          for (let i = -height; i < width + height; i += gap) {
            ctx.beginPath();
            ctx.moveTo(x + i, y + height);
            ctx.lineTo(x + i + height, y);
            ctx.stroke();
          }
        }

        ctx.restore();
        ctx.restore();
        continue;
      }

      if (type === "rounded-rect" || type === "rectangle") {
        const radius = type === "rectangle" ? 0 : Number(shape.borderRadius || 0);
        const stops: Array<{ stop: number; color: string }> = shape.gradientColors || [];

        let fillStyle: string | CanvasGradient = "transparent";

        if (stops.length >= 2) {
          const gradient = ctx.createLinearGradient(x, y, x + width, y + height);

          for (const stop of stops) {
            gradient.addColorStop(
              Math.max(0, Math.min(1, Number(stop.stop))),
              replaceAccent(stop.color, brandColor),
            );
          }

          fillStyle = gradient;
        } else {
          fillStyle = replaceAccent(shape.backgroundColor, brandColor) || "transparent";
        }

        applyShadow(ctx, shape, brandColor);
        drawRoundedPath(ctx, x, y, width, height, radius);

        if (fillStyle !== "transparent") {
          ctx.fillStyle = fillStyle;
          ctx.fill();
        }

        clearShadow(ctx);

        if (Number(shape.borderWidth || 0) > 0) {
          ctx.strokeStyle = replaceAccent(shape.borderColor, brandColor) || "rgba(255,255,255,0.2)";
          ctx.lineWidth = Number(shape.borderWidth || 1);
          ctx.stroke();
        }

        ctx.restore();
        continue;
      }

      if (type === "circle") {
        applyShadow(ctx, shape, brandColor);
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
        ctx.fillStyle = replaceAccent(shape.backgroundColor, brandColor) || "transparent";
        ctx.fill();
        clearShadow(ctx);
        ctx.restore();
        continue;
      }

      if (type === "line") {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y + height);
        ctx.strokeStyle = replaceAccent(shape.backgroundColor || shape.borderColor, brandColor) || "#ffffff";
        ctx.lineWidth = Number(shape.borderWidth || 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (type === "image") {
        const url = resolveImageUrl(shape, logoUrl, resolvers);

        if (url) {
          try {
            const image = await loadImg(url);

            if (myGeneration !== generation || destroyed) {
              ctx.restore();
              return;
            }

            const fit = shape.fit || "cover";
            let sx = 0;
            let sy = 0;
            let sw = image.naturalWidth;
            let sh = image.naturalHeight;

            if (fit === "cover") {
              const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
              sw = width / scale;
              sh = height / scale;
              sx = (image.naturalWidth - sw) / 2;
              sy = (image.naturalHeight - sh) / 2;
            }

            const radius = Number(shape.radius || 0);

            if (radius > 0) {
              drawRoundedPath(ctx, x, y, width, height, radius);
              ctx.clip();
            }

            ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
          } catch {
            drawRoundedPath(ctx, x, y, width, height, Number(shape.radius || 8));
            ctx.fillStyle = "rgba(255,255,255,0.06)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.14)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        ctx.restore();
        continue;
      }

      if (type === "text") {
        applyShadow(ctx, shape, brandColor);
        drawTextShape(ctx, shape, Number(shape.__globalY || 0), brandColor, resolvers.getCampaignValue);
        clearShadow(ctx);
        ctx.restore();
        continue;
      }

      ctx.restore();
    }

    if (myGeneration !== generation || destroyed) return;

    if (selectedSegmentId) {
      const segment = segments.find((s) => s.instanceId === selectedSegmentId);

      if (segment) {
        ctx.save();
        ctx.strokeStyle = "rgba(167,139,250,0.78)";
        ctx.lineWidth = 3;
        ctx.setLineDash([14, 10]);
        ctx.strokeRect(3, segment.y + 3, CANVAS_W - 6, segment.segment_height - 6);
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    if (selectedShape) {
      const found = getSelectedShape(segments, selectedShape);

      if (found) {
        const rect = shapeGlobalRect(found.segment, found.shape);

        ctx.save();
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        ctx.setLineDash([]);
        drawHandles(ctx, rect);
        ctx.restore();
      }
    }
  }

  function destroy() {
    destroyed = true;
    generation += 1;
  }

  return { draw, destroy };
}

export function getResizeHandleAtPoint(
  segment: CanvasSegment,
  shape: Shape,
  canvasX: number,
  canvasY: number,
): DragMode | null {
  const rect = shapeGlobalRect(segment, shape);
  const size = 18;

  const handles: { mode: DragMode; x: number; y: number }[] = [
    { mode: "resize-nw", x: rect.x, y: rect.y },
    { mode: "resize-n", x: rect.x + rect.width / 2, y: rect.y },
    { mode: "resize-ne", x: rect.x + rect.width, y: rect.y },
    { mode: "resize-e", x: rect.x + rect.width, y: rect.y + rect.height / 2 },
    { mode: "resize-se", x: rect.x + rect.width, y: rect.y + rect.height },
    { mode: "resize-s", x: rect.x + rect.width / 2, y: rect.y + rect.height },
    { mode: "resize-sw", x: rect.x, y: rect.y + rect.height },
    { mode: "resize-w", x: rect.x, y: rect.y + rect.height / 2 },
  ];

  for (const handle of handles) {
    if (
      canvasX >= handle.x - size / 2 &&
      canvasX <= handle.x + size / 2 &&
      canvasY >= handle.y - size / 2 &&
      canvasY <= handle.y + size / 2
    ) {
      return handle.mode;
    }
  }

  return null;
}