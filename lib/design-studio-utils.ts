import type { CampaignData, TemplateShape } from "@/lib/types";

export const PORTRAIT_W = 1080;
export const PORTRAIT_H = 1350;

function safeArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x || "").trim()).filter(Boolean);

  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x || "").trim()).filter(Boolean);
      }
    } catch {}
    if (v.includes(",")) return v.split(",").map((x) => x.trim()).filter(Boolean);
    if (v.includes("\n")) return v.split("\n").map((x) => x.trim()).filter(Boolean);
    return [v.trim()].filter(Boolean);
  }
  return [];
}

function safeHashtags(v: any): string {
  if (!v) return "";
  if (Array.isArray(v)) return v.map((x) => String(x || "").trim()).filter(Boolean).join(" ");
  return String(v || "").trim();
}

export function buildCampaignDataFromDraft(draft: any): CampaignData {
  const s = draft?.structured || {};

  return {
    hook: (s.hook ?? "").toString(),
    subheading: (s.subheading ?? "").toString(),
    bullets: safeArray(s.bullets).slice(0, 3),
    proof: (s.proof ?? "").toString(),
    cta: (s.cta ?? "").toString(),
    ctaLink: (s.ctaLink ?? "").toString(),
    hashtags: safeHashtags(draft?.hashtags ?? s.hashtags ?? ""),
    companyName: (s.companyName ?? "").toString(),
    location: (s.location ?? "MARKETING").toString(),
    links: [],
  } as CampaignData;
}

export function scaleTemplateShapes(
  shapes: TemplateShape[],
  fromW: number,
  fromH: number,
  toW: number,
  toH: number
): TemplateShape[] {
  const sx = toW / fromW;
  const sy = toH / fromH;
  const sFont = Math.min(sx, sy);

  return (shapes || []).map((sh) => {
    const anySh: any = sh;
    return {
      ...sh,
      x: (sh.x || 0) * sx,
      y: (sh.y || 0) * sy,
      width: (sh.width || 0) * sx,
      height: (sh.height || 0) * sy,

      fontSize: sh.fontSize ? Math.round(sh.fontSize * sFont) : sh.fontSize,
      padding: sh.padding ? Math.round(sh.padding * sFont) : sh.padding,

      borderWidth: sh.borderWidth ? Math.max(1, Math.round(sh.borderWidth * sFont)) : sh.borderWidth,
      borderRadius: sh.borderRadius ? Math.round(sh.borderRadius * sFont) : sh.borderRadius,

      shadowBlur: sh.shadowBlur ? Math.round(sh.shadowBlur * sFont) : sh.shadowBlur,
      shadowX: sh.shadowX ? Math.round(sh.shadowX * sx) : sh.shadowX,
      shadowY: sh.shadowY ? Math.round(sh.shadowY * sy) : sh.shadowY,

      radius: anySh.radius ? Math.round(anySh.radius * sFont) : anySh.radius,
      bulletSpacing: anySh.bulletSpacing ? Math.round(anySh.bulletSpacing * sFont) : anySh.bulletSpacing,
      bulletIndent: anySh.bulletIndent ? Math.round(anySh.bulletIndent * sFont) : anySh.bulletIndent,
    } as TemplateShape;
  });
}

export function pickRandom<T>(arr: T[]): T | null {
  if (!arr?.length) return null;
  const i = Math.floor(Math.random() * arr.length);
  return arr[i] ?? null;
}

export async function waitForNextPaint(times = 2) {
  let remaining = times;
  while (remaining > 0) {
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    remaining -= 1;
  }
}

export async function canvasToFile(canvas: HTMLCanvasElement, filename: string) {
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error("Failed to export canvas as PNG blob"));
        resolve(b);
      },
      "image/png",
      1.0
    );
  });

  return new File([blob], filename, { type: "image/png" });
}