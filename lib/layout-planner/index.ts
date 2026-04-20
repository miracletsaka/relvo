/**
 * layout-planner/index.ts
 * ─────────────────────────
 * Pipeline orchestrator — slot-based, dataField-driven.
 *
 * RULE: Text shapes have text:"" and dataField set. The editor
 * replaces text from CampaignData client-side. This file never
 * puts campaign content inside shape.text.
 *
 * Variety per generation:
 *   - 12 template styles, never repeats consecutive
 *   - 12 palettes, shuffled by seeded RNG
 *   - 5 font families, tone-mapped or seeded
 *   - Fully randomised decoratives (4 RNG streams, 20 zones)
 */

import type {
  CampaignData, TemplateShape, Orientation,
  GeneratedOfferLayoutResult, BrandFingerprint,
  Palette, AICreativeDirection,
} from "./types";
import type { LayoutVariant } from "./types";

import {
  normalizeCampaignData, compactImageSlots, detectOrientation,
  seededRng, makeId, hexToRgba, clamp,
} from "./utils";
import { buildBrandFingerprint }    from "./brand-fingerprint";
import { buildAICreativeDirection } from "./creative-direction";
import { buildAIDecorPlan }         from "./decor-plan";
import {
  CANVAS_SIZES, PALETTES, VALID_PALETTES, Z_DECOR,
} from "./constants";
import {
  pickTemplateStyle, buildStyleShapes, buildContactStrip,
  type TemplateStyleName,
} from "./template-styles";
import type { DecorShapeKind, DecorEdge } from "./types";

// ── Background layer ───────────────────────────────────────────────────────────
function buildBg(p: Palette, d: AICreativeDirection, W: number, H: number): TemplateShape[] {
  const out: TemplateShape[] = [{
    id: makeId("bg"), type: "rectangle",
    x: 0, y: 0, width: W, height: H,
    backgroundColor: p.bg, gradientColors: p.bgGradient,
    gradientAngle: p.bgGradientAngle, borderWidth: 0, zIndex: 0,
  } as TemplateShape];
  if (d.bgPatternType !== "none") {
    out.push({
      id: makeId("bgp"), type: "pattern-overlay",
      x: 0, y: 0, width: W, height: H,
      patternType: d.bgPatternType,
      patternColor: p.text, patternOpacity: 0.028,
      borderWidth: 0, zIndex: 1,
    } as TemplateShape);
  }
  return out;
}

// ── Decor layer — fully randomised, no fixed positions ────────────────────────
function buildDecor(
  palette: Palette, brand: BrandFingerprint,
  decorPlan: Awaited<ReturnType<typeof buildAIDecorPlan>>,
  canvasW: number, canvasH: number,
  direction: AICreativeDirection
): TemplateShape[] {
  const efs    = canvasW / 1080;
  const shapes: TemplateShape[] = [];

  // Four independent RNG streams — position, size, colour, opacity
  const rngPos  = seededRng(brand.seed ^ 0x1357ACE0);
  const rngSz   = seededRng(brand.seed ^ 0x2468BDF1);
  const rngClr  = seededRng(brand.seed ^ 0xFEDCBA98);
  const rngAux  = seededRng(brand.seed ^ 0x80706050);

  // Map decor plan shapes to actual canvas positions
  // Each zone maps to a RANGE so sub-positions vary by rng
  function zonePos(edge: DecorEdge, size: "sm"|"md"|"lg"): { x: number; y: number; w: number; h: number } {
    const s   = size === "sm" ? Math.round((40 + rngSz.next() * 40) * efs)
              : size === "md" ? Math.round((80 + rngSz.next() * 60) * efs)
              :                 Math.round((150 + rngSz.next() * 80) * efs);
    const ep  = Math.round((8 + rngPos.next() * 30) * efs);  // randomised inset

    switch (edge) {
      case "top-left":
        return { x: ep, y: ep + Math.round(rngPos.next() * 40 * efs), w: s, h: s };
      case "top-right":
        return { x: canvasW - s - ep, y: ep + Math.round(rngPos.next() * 40 * efs), w: s, h: s };
      case "bottom-left":
        return { x: ep, y: canvasH - s - ep - Math.round(100 * efs), w: s, h: s };
      case "bottom-right":
        return { x: canvasW - s - ep, y: canvasH - s - ep - Math.round(100 * efs), w: s, h: s };
      case "left":
        return { x: ep, y: Math.round(canvasH * (0.20 + rngPos.next() * 0.50)), w: Math.round((8 + rngSz.next() * 14) * efs), h: Math.round((80 + rngSz.next() * 120) * efs) };
      case "right":
        return { x: canvasW - ep - Math.round((8 + rngSz.next() * 14) * efs), y: Math.round(canvasH * (0.20 + rngPos.next() * 0.50)), w: Math.round((8 + rngSz.next() * 14) * efs), h: Math.round((80 + rngSz.next() * 120) * efs) };
      case "top":
        return { x: Math.round(canvasW * (0.10 + rngPos.next() * 0.60)), y: ep, w: Math.round((80 + rngSz.next() * 120) * efs), h: Math.round((16 + rngSz.next() * 20) * efs) };
      case "bottom":
        return { x: Math.round(canvasW * (0.10 + rngPos.next() * 0.55)), y: canvasH - ep - Math.round(110 * efs) - Math.round((16 + rngSz.next() * 20) * efs), w: Math.round((80 + rngSz.next() * 120) * efs), h: Math.round((16 + rngSz.next() * 20) * efs) };
    }
  }

  function fillColor(mode: string, opacity: number): string {
    if (mode === "glow")    return palette.glowColor;
    if (mode === "accent2") return hexToRgba(palette.accent2, opacity);
    if (mode === "accent")  return hexToRgba(palette.accent,  opacity);
    return hexToRgba(palette.accent, Math.min(opacity, 0.07));
  }

  for (const item of decorPlan.shapes) {
    const pos = zonePos(item.edge, item.size);
    const sr  = {
      x: clamp(pos.x, 0, canvasW - pos.w),
      y: clamp(pos.y, 0, canvasH - pos.h - Math.round(96 * efs)),
      w: clamp(pos.w, 8, canvasW * 0.4),
      h: clamp(pos.h, 8, canvasH * 0.35),
    };
    const f   = fillColor(item.colorMode, item.opacity);

    switch (item.kind as DecorShapeKind) {
      case "glow-blob":
        shapes.push({ id: makeId("d-glow"), type: "glow-blob", x: sr.x, y: sr.y, width: Math.min(sr.w, Math.round(320 * efs)), height: Math.min(sr.h, Math.round(320 * efs)), backgroundColor: palette.glowColor, glowRadius: Math.round((70 + rngAux.next() * 60) * efs), borderWidth: 0, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "circle":
        shapes.push({ id: makeId("d-circle"), type: "circle", x: sr.x, y: sr.y, width: Math.min(sr.w, Math.round(90 * efs)), height: Math.min(sr.w, Math.round(90 * efs)), backgroundColor: f, borderWidth: 0, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "ring":
        shapes.push({ id: makeId("d-ring"), type: "circle", x: sr.x, y: sr.y, width: Math.min(sr.w, Math.round(80 * efs)), height: Math.min(sr.w, Math.round(80 * efs)), backgroundColor: "#00000000", borderWidth: Math.round((2 + rngAux.next() * 3) * efs), borderColor: f, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "bar":
        shapes.push({ id: makeId("d-bar"), type: "rounded-rect", x: sr.x, y: sr.y, width: Math.round((6 + rngSz.next() * 10) * efs), height: Math.max(sr.h, Math.round(60 * efs)), backgroundColor: f, borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "pill": case "chip":
        shapes.push({ id: makeId("d-pill"), type: "rounded-rect", x: sr.x, y: sr.y, width: Math.min(sr.w, Math.round(160 * efs)), height: Math.round((18 + rngSz.next() * 16) * efs), backgroundColor: f, borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "star":
        shapes.push({ id: makeId("d-star"), type: "star", x: sr.x, y: sr.y, width: Math.min(sr.w, Math.round(60 * efs)), height: Math.min(sr.w, Math.round(60 * efs)), points: rngAux.nextInt(4, 6), backgroundColor: f, borderWidth: 0, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "sparkle":
        shapes.push({ id: makeId("d-sp-h"), type: "rounded-rect", x: sr.x, y: sr.y + Math.round(sr.h * 0.42), width: sr.w, height: Math.max(6, Math.round(sr.h * 0.16)), backgroundColor: f, borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR } as TemplateShape);
        shapes.push({ id: makeId("d-sp-v"), type: "rounded-rect", x: sr.x + Math.round(sr.w * 0.42), y: sr.y, width: Math.max(6, Math.round(sr.w * 0.16)), height: sr.h, backgroundColor: f, borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "cross":
        shapes.push({ id: makeId("d-cr-h"), type: "rounded-rect", x: sr.x, y: sr.y + Math.round(sr.h * 0.42), width: sr.w, height: Math.max(5, Math.round(sr.h * 0.18)), backgroundColor: f, borderWidth: 0, borderRadius: 3, zIndex: Z_DECOR } as TemplateShape);
        shapes.push({ id: makeId("d-cr-v"), type: "rounded-rect", x: sr.x + Math.round(sr.w * 0.42), y: sr.y, width: Math.max(5, Math.round(sr.w * 0.18)), height: sr.h, backgroundColor: f, borderWidth: 0, borderRadius: 3, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "arc":
        shapes.push({ id: makeId("d-arc"), type: "arc", x: sr.x, y: sr.y, width: Math.min(sr.w, Math.round(80 * efs)), height: Math.min(sr.h, Math.round(80 * efs)), backgroundColor: "transparent", borderWidth: Math.round(3 * efs), borderColor: f, startAngle: Math.round(rngAux.next() * 180), endAngle: Math.round(rngAux.next() * 180 + 90), zIndex: Z_DECOR } as TemplateShape);
        break;
      case "wave-line":
        shapes.push({ id: makeId("d-wave"), type: "wave-line", x: sr.x, y: sr.y, width: Math.min(sr.w, Math.round(200 * efs)), height: Math.round((20 + rngSz.next() * 14) * efs), backgroundColor: "transparent", waveColor: f, waveAmplitude: Math.round(rngAux.next() * 8 + 4), waveFrequency: Math.round(rngAux.next() * 3 + 2), borderWidth: 0, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "hexagon":
        shapes.push({ id: makeId("d-hex"), type: "rounded-rect", x: sr.x, y: sr.y, width: Math.min(sr.w, Math.round(70 * efs)), height: Math.min(sr.h, Math.round(70 * efs)), backgroundColor: f, borderWidth: 0, borderRadius: Math.round((10 + rngSz.next() * 14) * efs), opacity: item.opacity, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "dot-grid":
        shapes.push({ id: makeId("d-dots"), type: "dot-grid", x: sr.x, y: sr.y, width: sr.w, height: sr.h, backgroundColor: "transparent", dotColor: f, dotSpacing: Math.round((14 + rngSz.next() * 10) * efs), dotRadius: Math.round((1 + rngSz.next() * 2) * efs), borderWidth: 0, zIndex: Z_DECOR } as TemplateShape);
        break;
      default: // soft-card
        shapes.push({ id: makeId("d-card"), type: "rounded-rect", x: sr.x, y: sr.y, width: Math.min(sr.w, Math.round(120 * efs)), height: Math.min(sr.h, Math.round(80 * efs)), backgroundColor: f, borderWidth: 0, borderRadius: Math.round(16 * efs), zIndex: Z_DECOR } as TemplateShape);
    }
  }

  return shapes;
}

function stubScore() {
  return { overlapScore:1, hierarchyScore:1, readabilityScore:1, whitespaceScore:1, uniquenessScore:1, ctaVisibilityScore:1, total:1 };
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function buildOfferLayoutResult(
  campaignData: Partial<CampaignData>,
  options?: {
    canvasWidth?:    number;
    canvasHeight?:   number;
    orientation?:    Orientation;
    previousLayout?: LayoutVariant | null;
    previousStyle?:  TemplateStyleName | null;
    entropySeed?:    number;
    logoUrl?:        string | null;   // ← org logo URL — baked into every template
  }
): Promise<GeneratedOfferLayoutResult & { styleName: TemplateStyleName }> {

  // Canvas
  let orientation: Orientation = options?.orientation ?? "portrait";
  let canvasW = options?.canvasWidth;
  let canvasH = options?.canvasHeight;
  if (canvasW && canvasH && !options?.orientation) orientation = detectOrientation(canvasW, canvasH);
  if (!canvasW || !canvasH) {
    const d = CANVAS_SIZES[orientation]; canvasW = canvasW ?? d.width; canvasH = canvasH ?? d.height;
  }

  // Sub-millisecond entropy
  const entropySeed = options?.entropySeed !== undefined
    ? options.entropySeed
    : Math.floor((typeof performance !== "undefined" ? performance.now() : Date.now()) * 1000) % 999983;

  const campaign = normalizeCampaignData(campaignData);
  const brand    = buildBrandFingerprint(campaign, entropySeed);

  // Palette — shuffled
  const palRng      = seededRng(brand.seed ^ 0x55AA9977);
  const paletteName = palRng.shuffle([...VALID_PALETTES])[0];
  const palette     = PALETTES[paletteName];

  // Direction + decor
  const direction = await buildAICreativeDirection(campaign, brand, orientation);
  const decorPlan = await buildAIDecorPlan(
    direction,
    { layout: "hero-top-card-bottom", paletteName, elements: {} as any },
    campaign, brand
  );

  // Style
  const styleName  = pickTemplateStyle(campaign, brand, options?.previousStyle ?? null);
  const imageSlots = compactImageSlots(campaign);

  // Build all layers
  const bgShapes      = buildBg(palette, direction, canvasW, canvasH);
  const decorShapes   = buildDecor(palette, brand, decorPlan, canvasW, canvasH, direction);
  const styleShapes   = buildStyleShapes(styleName, campaign, palette, brand, canvasW, canvasH, orientation, imageSlots);
  const contactShapes = buildContactStrip(campaign, palette, brand, canvasW, canvasH, canvasW / 1080);

  // ── Bake logo URL into every logo slot ────────────────────────────────────
  // The org logo is set at template generation time so it renders immediately
  // without requiring the user to assign it in the editor.
  // Priority: options.logoUrl → campaign.logo → campaignData.imageSlots.logo
  const resolvedLogoUrl =
    options?.logoUrl ||
    (campaign.logo as string) ||
    campaign.imageSlots?.logo?.url ||
    null;

  const allStyleShapes = resolvedLogoUrl
    ? styleShapes.map(shape => {
        if (
          (shape as any).slotKey === "logo" &&
          (shape as any).type === "image" &&
          !(shape as any).src
        ) {
          return { ...shape, src: resolvedLogoUrl };
        }
        return shape;
      })
    : styleShapes;

  const shapes: TemplateShape[] = [...bgShapes, ...decorShapes, ...allStyleShapes, ...contactShapes];

  return {
    shapes, campaign, direction,
    composition: { layout: "hero-top-card-bottom", paletteName, elements: {} as any },
    decorPlan, palette,
    skeleton: {
      canvas: { width: canvasW, height: canvasH },
      zones: {
        content:  { x: 0, y: 0, width: canvasW, height: canvasH },
        headline: { x: 0, y: 0, width: canvasW, height: 100 },
        cta:      { x: 0, y: canvasH - 200, width: canvasW, height: 80 },
      },
      rules: { minGap: 16, safeMargin: 50, textMustStayInside: true, allowOverlayTextOnHero: false },
    },
    placements: {}, score: stubScore(), brand, orientation, styleName,
  };
}

export async function buildOfferShapesWithAIPlannedBlocks(
  d: Partial<CampaignData>,
  opts?: Parameters<typeof buildOfferLayoutResult>[1]
): Promise<TemplateShape[]> {
  return (await buildOfferLayoutResult(d, opts)).shapes;
}

export const buildPortraitLayout  = (d: Partial<CampaignData>, prev?: LayoutVariant | null) =>
  buildOfferLayoutResult(d, { orientation: "portrait",  previousLayout: prev });
export const buildLandscapeLayout = (d: Partial<CampaignData>, prev?: LayoutVariant | null) =>
  buildOfferLayoutResult(d, { orientation: "landscape", previousLayout: prev });
export const buildSquareLayout    = (d: Partial<CampaignData>, prev?: LayoutVariant | null) =>
  buildOfferLayoutResult(d, { orientation: "square",    previousLayout: prev });

export type {
  GeneratedOfferLayoutResult, Orientation, LayoutVariant,
  AICreativeDirection, AICompositionPlan, AILayoutSkeleton, AIDecorPlan,
  LayoutScore, BrandFingerprint, PaletteName,
} from "./types";
export type { TemplateStyleName } from "./template-styles";