/**
 * layout-planner/index.ts
 * ─────────────────────────
 * Pipeline orchestrator — style-based, sparse, agency-grade.
 *
 * Every call produces a unique result:
 *   • TemplateStyle — 12 choices, never repeats consecutive
 *   • Palette       — 12 choices, shuffled by seeded RNG
 *   • Font          — 5 families, assigned by tone or shuffled
 *   • Decor         — seeded shapes, different corners each run
 *
 * Each template shows AT MOST 2 text elements + contact strip.
 */

import type {
  CampaignData, TemplateShape, Orientation,
  GeneratedOfferLayoutResult, BrandFingerprint,
} from "./types";
import type { LayoutVariant } from "./types";

import { normalizeCampaignData, compactImageSlots, detectOrientation, seededRng, makeId, hexToRgba, clamp } from "./utils";
import { buildBrandFingerprint }    from "./brand-fingerprint";
import { buildAICreativeDirection } from "./creative-direction";
import { buildAIDecorPlan }         from "./decor-plan";
import { CANVAS_SIZES, PALETTES, VALID_PALETTES, Z_DECOR, DISPLAY_FONTS } from "./constants";
import type { Palette } from "./types";
import type { AICreativeDirection } from "./types";
import {
  pickTemplateStyle,
  buildStyleShapes,
  buildContactStrip,
  type TemplateStyleName,
} from "./template-styles";

// ── Background layer ───────────────────────────────────────────────────────────
function buildBg(palette: Palette, direction: AICreativeDirection, canvasW: number, canvasH: number): TemplateShape[] {
  const shapes: TemplateShape[] = [{
    id: makeId("bg"), type: "rectangle",
    x: 0, y: 0, width: canvasW, height: canvasH,
    backgroundColor: palette.bg,
    gradientColors: palette.bgGradient,
    gradientAngle: palette.bgGradientAngle,
    borderWidth: 0, zIndex: 0,
  } as TemplateShape];

  if (direction.bgPatternType !== "none") {
    shapes.push({
      id: makeId("bg-pat"), type: "pattern-overlay",
      x: 0, y: 0, width: canvasW, height: canvasH,
      patternType: direction.bgPatternType,
      patternColor: palette.text, patternOpacity: 0.030,
      borderWidth: 0, zIndex: 1,
    } as TemplateShape);
  }
  return shapes;
}

// ── Decorative layer ───────────────────────────────────────────────────────────
function buildDecor(
  palette: Palette, brand: BrandFingerprint,
  decorPlan: Awaited<ReturnType<typeof buildAIDecorPlan>>,
  canvasW: number, canvasH: number,
  direction: AICreativeDirection
): TemplateShape[] {
  const efs    = canvasW / 1080;
  const shapes: TemplateShape[] = [];
  const rng    = seededRng(brand.seed ^ 0x99AABB11);

  // 1. Primary glow — corner alternates by seed
  const gSide = brand.seed % 2 === 0;
  shapes.push({
    id: makeId("glow-a"), type: "glow-blob",
    x: gSide ? canvasW - Math.round(260 * efs) : -Math.round(60 * efs),
    y: -Math.round(60 * efs),
    width: Math.round(350 * efs), height: Math.round(350 * efs),
    backgroundColor: palette.glowColor,
    glowRadius: Math.round(110 * efs),
    borderWidth: 0, zIndex: Z_DECOR,
  } as TemplateShape);

  // 2. Secondary glow — bottom opposite corner
  shapes.push({
    id: makeId("glow-b"), type: "glow-blob",
    x: gSide ? -Math.round(60 * efs) : canvasW - Math.round(230 * efs),
    y: canvasH - Math.round(280 * efs),
    width: Math.round(290 * efs), height: Math.round(290 * efs),
    backgroundColor: hexToRgba(palette.accent2, 0.15),
    glowRadius: Math.round(90 * efs),
    borderWidth: 0, zIndex: Z_DECOR,
  } as TemplateShape);

  // 3. Bold vertical accent bar — far edge
  shapes.push({
    id: makeId("vbar"), type: "rounded-rect",
    x: gSide ? canvasW - Math.round(16 * efs) : Math.round(6 * efs),
    y: Math.round(canvasH * 0.08),
    width: Math.round(9 * efs), height: Math.round(canvasH * 0.64),
    backgroundColor: palette.accent,
    borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR,
  } as TemplateShape);

  // 4. Three corner dots — top, seeded side
  const dotSide = brand.seed % 2 === 0;
  const dotSz   = Math.round(22 * efs);
  [0,1,2].forEach(i => {
    const dx = dotSide
      ? canvasW - Math.round(26 * efs) - i * Math.round(34 * efs)
      : Math.round(26 * efs) + i * Math.round(34 * efs);
    shapes.push({
      id: makeId(`dot${i}`), type: "rounded-rect",
      x: dx, y: Math.round(22 * efs),
      width: dotSz, height: dotSz,
      backgroundColor: i === 0 ? palette.accent : i === 1 ? palette.accent2 : hexToRgba(palette.accent, 0.28),
      borderWidth: 0,
      borderRadius: brand.cardStyle === "pill" ? 999 : 5,
      zIndex: Z_DECOR + 1,
    } as TemplateShape);
  });

  // 5. Watermark circle — partial, off canvas
  const cR = Math.round(canvasW * 0.52);
  const cX = rng.next() > 0.5 ? canvasW - Math.round(cR * 0.25) : -Math.round(cR * 0.25);
  const cY = rng.next() > 0.5 ? -Math.round(cR * 0.20) : canvasH - Math.round(cR * 0.78);
  shapes.push({
    id: makeId("wm"), type: "circle",
    x: cX, y: cY, width: cR, height: cR,
    backgroundColor: hexToRgba(palette.accent, 0.045),
    borderWidth: Math.round(2 * efs), borderColor: hexToRgba(palette.accent, 0.09),
    zIndex: Z_DECOR,
  } as TemplateShape);

  // 6. Accent bottom strip edge
  if (direction.decorIntensity > 0.26) {
    shapes.push({
      id: makeId("bot-edge"), type: "rounded-rect",
      x: 0, y: canvasH - Math.round(106 * efs) - Math.round(3 * efs),
      width: canvasW, height: Math.round(3 * efs),
      backgroundColor: palette.accent2,
      borderWidth: 0, borderRadius: 0, zIndex: Z_DECOR,
    } as TemplateShape);
  }

  // 7. 2-3 shapes from AI decor plan (small, edge-positioned)
  const edgePad = Math.round(26 * efs);
  for (const item of decorPlan.shapes.slice(0, 3)) {
    const d  = item.size === "sm" ? 50 : item.size === "md" ? 90 : 150;
    const dx = item.edge.includes("right") ? canvasW - Math.round(d * efs) - edgePad : edgePad;
    const dy = item.edge.includes("bottom")
      ? clamp(canvasH - Math.round(d * efs) - edgePad, 0, canvasH - Math.round(110 * efs) - Math.round(d * efs))
      : edgePad + Math.round(70 * efs);
    const op = clamp(item.opacity, 0.06, 0.20);
    const f  = item.colorMode === "accent"  ? hexToRgba(palette.accent,  op)
             : item.colorMode === "accent2" ? hexToRgba(palette.accent2, op)
             : palette.glowColor;

    if (item.kind === "ring") {
      shapes.push({ id: makeId("dp-ring"), type: "circle", x: dx, y: dy, width: Math.round(d*efs), height: Math.round(d*efs), backgroundColor: "#00000000", borderWidth: Math.round(3*efs), borderColor: f, zIndex: Z_DECOR } as TemplateShape);
    } else if (item.kind === "star") {
      shapes.push({ id: makeId("dp-star"), type: "star", x: dx, y: dy, width: Math.min(Math.round(d*efs),64), height: Math.min(Math.round(d*efs),64), points: 5, backgroundColor: f, borderWidth: 0, zIndex: Z_DECOR } as TemplateShape);
    } else {
      shapes.push({ id: makeId("dp-pill"), type: "rounded-rect", x: dx, y: dy, width: Math.min(Math.round(d*efs),130), height: Math.min(Math.round(20*efs),28), backgroundColor: f, borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR } as TemplateShape);
    }
  }

  return shapes;
}

// ── Stub score ─────────────────────────────────────────────────────────────────
function score() {
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
  }
): Promise<GeneratedOfferLayoutResult & { styleName: TemplateStyleName }> {

  // ── Canvas setup ───────────────────────────────────────────────────────────
  let orientation: Orientation = options?.orientation ?? "portrait";
  let canvasW = options?.canvasWidth;
  let canvasH = options?.canvasHeight;
  if (canvasW && canvasH && !options?.orientation) orientation = detectOrientation(canvasW, canvasH);
  if (!canvasW || !canvasH) {
    const d  = CANVAS_SIZES[orientation];
    canvasW  = canvasW ?? d.width;
    canvasH  = canvasH ?? d.height;
  }

  // ── Entropy: sub-millisecond uniqueness ────────────────────────────────────
  const entropySeed = options?.entropySeed !== undefined
    ? options.entropySeed
    : Math.floor((typeof performance !== "undefined" ? performance.now() : Date.now()) * 1000) % 999983;

  // ── Normalize + fingerprint ────────────────────────────────────────────────
  const campaign = normalizeCampaignData(campaignData);
  const brand    = buildBrandFingerprint(campaign, entropySeed);

  // ── Palette — fully shuffled, never the same ───────────────────────────────
  const palRng       = seededRng(brand.seed ^ 0x55AA9977);
  const paletteName  = palRng.shuffle([...VALID_PALETTES])[0];
  const palette      = PALETTES[paletteName];

  // ── Creative direction (background pattern, glow, etc.) ───────────────────
  const direction  = await buildAICreativeDirection(campaign, brand, orientation);

  // ── Decor plan ─────────────────────────────────────────────────────────────
  const decorPlan  = await buildAIDecorPlan(
    direction,
    { layout: "hero-top-card-bottom", paletteName, elements: {} as any },
    campaign, brand
  );

  // ── Template style — CORE of variety ──────────────────────────────────────
  const styleName  = pickTemplateStyle(campaign, brand, options?.previousStyle ?? null);
  const imageSlots = compactImageSlots(campaign);

  // ── Render layers ──────────────────────────────────────────────────────────
  const bgShapes      = buildBg(palette, direction, canvasW, canvasH);
  const decorShapes   = buildDecor(palette, brand, decorPlan, canvasW, canvasH, direction);
  const styleShapes   = buildStyleShapes(styleName, campaign, palette, brand, canvasW, canvasH, orientation, imageSlots);
  const contactShapes = buildContactStrip(campaign, palette, brand, canvasW, canvasH, canvasW / 1080);

  const shapes: TemplateShape[] = [...bgShapes, ...decorShapes, ...styleShapes, ...contactShapes];

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
    placements: {}, score: score(), brand, orientation, styleName,
  };
}

// ── Convenience wrappers ───────────────────────────────────────────────────────
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

// ── Type re-exports ────────────────────────────────────────────────────────────
export type {
  GeneratedOfferLayoutResult, Orientation, LayoutVariant,
  AICreativeDirection, AICompositionPlan, AILayoutSkeleton, AIDecorPlan,
  LayoutScore, BrandFingerprint, PaletteName,
} from "./types";
export type { TemplateStyleName } from "./template-styles";