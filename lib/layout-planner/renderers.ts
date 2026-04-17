/**
 * layout-planner/renderers.ts
 * ─────────────────────────────
 * Converts the plan into TemplateShape arrays.
 *
 * Changes from v1:
 *  - Surface card REMOVED from hero — no rounded rect covering the image
 *  - Contact block ALWAYS rendered at bottom of every template
 *  - Rich decorative elements: large accent shapes, geometric overlays,
 *    stripe accents, number callouts, bold divider lines
 *  - All text uses brand.displayFont (same across template)
 *  - CTA rendered without card chrome — just bg pill + bold text
 */

import type {
  RenderContext, TemplateShape, Rect, AIBlockPlacement,
  Palette, AICompositionPlan, AICreativeDirection,
  CTAStyle, BulletDotStyle, NormalizedCampaignData, BrandFingerprint,
  Orientation,
} from "./types";
import {
  makeId, hexToRgba, expandRect, overlapArea, clamp,
  getAvailableBullets, getBusinessMetaLine,
} from "./utils";
import {
  Z_BG, Z_BG_GRAD, Z_DECOR, Z_HERO, Z_SECONDARY, Z_TEXT, Z_CTA, Z_LOGO,
} from "./constants";
import { buildContactBlock } from "./placements";

// ── Base canvas ────────────────────────────────────────────────────────────────
export function buildBaseCanvasShapes(ctx: RenderContext): TemplateShape[] {
  const { canvasW, canvasH, palette, direction } = ctx;
  const shapes: TemplateShape[] = [
    {
      id: makeId("bg-main"), type: "rectangle",
      x: 0, y: 0, width: canvasW, height: canvasH,
      backgroundColor: palette.bg,
      gradientColors:  palette.bgGradient,
      gradientAngle:   palette.bgGradientAngle,
      borderWidth: 0, zIndex: Z_BG,
    } as TemplateShape,
  ];

  if (direction.bgPatternType !== "none") {
    shapes.push({
      id: makeId("bg-pattern"), type: "pattern-overlay",
      x: 0, y: 0, width: canvasW, height: canvasH,
      patternType:    direction.bgPatternType,
      patternColor:   palette.text,
      patternOpacity: 0.035,
      borderWidth: 0, zIndex: Z_BG_GRAD,
    } as TemplateShape);
  }

  return shapes;
}

// ── Rich decorative shapes ─────────────────────────────────────────────────────
export function buildDecorativeShapes(ctx: RenderContext): TemplateShape[] {
  const { palette, skeleton, placements, decorPlan, canvasW, canvasH, brand, direction } = ctx;
  const shapes: TemplateShape[] = [];

  const efs = canvasW / 1080;

  // Compute protected zones — decor must not sit on top of text
  const protectedRects = [
    skeleton.zones.headline, skeleton.zones.subheading, skeleton.zones.bullets,
    skeleton.zones.proof, skeleton.zones.review, skeleton.zones.cta,
    skeleton.zones.footer, skeleton.zones.sponsors, skeleton.zones.accreditations,
    skeleton.zones.businessMeta,
    ...Object.values(placements).filter(Boolean).map(p => (p as AIBlockPlacement).rect),
  ].filter((r): r is Rect => !!r).map(r => expandRect(r, 24));

  function isSafe(rect: Rect): boolean {
    return !protectedRects.some(r => overlapArea(r, rect) > 200);
  }

  function fill(mode: string, opacity: number): string {
    if (mode === "glow")    return palette.glowColor;
    if (mode === "accent2") return hexToRgba(palette.accent2, opacity);
    if (mode === "accent")  return hexToRgba(palette.accent,  opacity);
    return hexToRgba(palette.accent, Math.min(opacity, 0.08));
  }

  // ── Always-present structural accents ────────────────────────────────────
  // 1. Large corner glow blob (top-right or top-left by seed)
  const glowSide = brand.seed % 2 === 0 ? canvasW - Math.round(220 * efs) : 0;
  shapes.push({
    id: makeId("bg-glow"), type: "glow-blob",
    x: glowSide, y: -Math.round(60 * efs),
    width: Math.round(320 * efs), height: Math.round(320 * efs),
    backgroundColor: palette.glowColor,
    glowRadius: Math.round(100 * efs),
    borderWidth: 0, zIndex: Z_DECOR,
  } as TemplateShape);

  // 2. Bottom-opposite glow
  const glowBot = brand.seed % 2 === 0 ? 0 : canvasW - Math.round(200 * efs);
  shapes.push({
    id: makeId("bg-glow-b"), type: "glow-blob",
    x: glowBot, y: canvasH - Math.round(200 * efs),
    width: Math.round(260 * efs), height: Math.round(260 * efs),
    backgroundColor: hexToRgba(palette.accent2, 0.18),
    glowRadius: Math.round(80 * efs),
    borderWidth: 0, zIndex: Z_DECOR,
  } as TemplateShape);

  // 3. Bold vertical accent bar — far edge
  const barX = brand.seed % 2 === 0 ? canvasW - Math.round(18 * efs) : Math.round(8 * efs);
  shapes.push({
    id: makeId("accent-bar"), type: "rounded-rect",
    x: barX, y: Math.round(canvasH * 0.12),
    width: Math.round(10 * efs), height: Math.round(canvasH * 0.60),
    backgroundColor: palette.accent,
    borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR,
  } as TemplateShape);

  // 4. Horizontal rule under headline area
  const ruleY = skeleton.zones.headline.y + skeleton.zones.headline.height + Math.round(6 * efs);
  if (ruleY < canvasH * 0.55) {
    shapes.push({
      id: makeId("headline-rule"), type: "rounded-rect",
      x: skeleton.zones.headline.x,
      y: ruleY,
      width: Math.round(Math.min(skeleton.zones.headline.width * 0.45, 200 * efs)),
      height: Math.round(6 * efs),
      backgroundColor: palette.accent,
      gradientColors: palette.accentGradient, gradientAngle: 90,
      borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR,
    } as TemplateShape);
  }

  // 5. Large background circle (watermark-like, partially off canvas)
  const circR = Math.round(canvasW * 0.55);
  const circX = brand.seed % 3 === 0 ? canvasW - Math.round(circR * 0.3)
              : brand.seed % 3 === 1 ? -Math.round(circR * 0.3)
              : Math.round(canvasW / 2 - circR / 2);
  const circY = brand.seed % 2 === 0 ? -Math.round(circR * 0.25) : canvasH - Math.round(circR * 0.75);
  shapes.push({
    id: makeId("bg-circle"), type: "circle",
    x: circX, y: circY,
    width: circR, height: circR,
    backgroundColor: hexToRgba(palette.accent, 0.06),
    borderWidth: Math.round(2 * efs), borderColor: hexToRgba(palette.accent, 0.12),
    zIndex: Z_DECOR,
  } as TemplateShape);

  // 6. Three small accent squares / dots — top corner cluster
  const dotSide = brand.seed % 2 === 0 ? "right" : "left";
  const dotStartX = dotSide === "right" ? canvasW - Math.round(90 * efs) : Math.round(24 * efs);
  [0, 1, 2].forEach(i => {
    const sq = Math.round(20 * efs);
    shapes.push({
      id: makeId(`dot-${i}`), type: "rounded-rect",
      x: dotStartX + (dotSide === "right" ? -(i * Math.round(32 * efs)) : i * Math.round(32 * efs)),
      y: Math.round(24 * efs),
      width: sq, height: sq,
      backgroundColor: i === 0 ? palette.accent : i === 1 ? palette.accent2 : hexToRgba(palette.accent, 0.3),
      borderWidth: 0, borderRadius: brand.cardStyle === "pill" ? 999 : 4,
      zIndex: Z_DECOR + 1,
    } as TemplateShape);
  });

  // 7. Diagonal stripe overlay (seed-gated, low intensity)
  if (direction.decorIntensity > 0.30 && brand.seed % 4 !== 0) {
    shapes.push({
      id: makeId("stripe"), type: "diagonal-stripes",
      x: 0, y: 0, width: canvasW, height: canvasH,
      backgroundColor: "transparent",
      stripeColor: hexToRgba(palette.accent, 0.03),
      stripeWidth: Math.round(40 * efs), stripeGap: Math.round(60 * efs),
      borderWidth: 0, zIndex: Z_DECOR,
    } as TemplateShape);
  }

  // 8. Bold corner accent (filled triangle-like rect pair)
  if (direction.decorIntensity > 0.28) {
    const cSize = Math.round(80 * efs);
    const cX = brand.seed % 2 === 0 ? 0 : canvasW - cSize;
    shapes.push({
      id: makeId("corner-accent-h"), type: "rounded-rect",
      x: cX, y: canvasH - Math.round(18 * efs),
      width: cSize * 2, height: Math.round(18 * efs),
      backgroundColor: palette.accent,
      borderWidth: 0, borderRadius: 0, zIndex: Z_DECOR,
    } as TemplateShape);
  }

  // 9. Decor plan shapes (from AI / seeded)
  function edgeToRect(edge: string, size: "sm"|"md"|"lg"): Rect {
    const d = size === "sm" ? {w:60,h:60} : size === "md" ? {w:110,h:44} : {w:180,h:180};
    const ep = 24;
    switch (edge) {
      case "top-left":    return { x: ep, y: ep, width: d.w, height: d.h };
      case "top-right":   return { x: canvasW - d.w - ep, y: ep, width: d.w, height: d.h };
      case "bottom-left": return { x: ep, y: canvasH - d.h - ep, width: d.w, height: d.h };
      case "bottom-right":return { x: canvasW - d.w - ep, y: canvasH - d.h - ep, width: d.w, height: d.h };
      case "left":        return { x: ep, y: Math.round(canvasH * 0.30), width: 12, height: 150 };
      case "right":       return { x: canvasW - ep - 12, y: Math.round(canvasH * 0.44), width: 12, height: 150 };
      case "top":         return { x: Math.round(canvasW * 0.14), y: ep, width: 120, height: 24 };
      default:            return { x: canvasW - 180, y: canvasH - ep - 24, width: 150, height: 24 };
    }
  }

  for (const item of decorPlan.shapes) {
    const raw = edgeToRect(item.edge, item.size);
    const sr: Rect = {
      x:      clamp(raw.x, 0, canvasW - raw.width),
      y:      clamp(raw.y, 0, canvasH - raw.height),
      width:  clamp(raw.width,  10, canvasW),
      height: clamp(raw.height, 10, canvasH),
    };
    if (!isSafe(sr)) continue;
    const f = fill(item.colorMode, item.opacity);

    switch (item.kind) {
      case "circle":
        shapes.push({ id: makeId("d-circle"), type: "circle", x: sr.x, y: sr.y, width: Math.min(sr.width,80), height: Math.min(sr.height,80), backgroundColor: f, borderWidth: 0, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "ring":
        shapes.push({ id: makeId("d-ring"), type: "circle", x: sr.x, y: sr.y, width: Math.min(sr.width,70), height: Math.min(sr.height,70), backgroundColor: "#00000000", borderWidth: 3, borderColor: f, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "bar":
        shapes.push({ id: makeId("d-bar"), type: "rounded-rect", x: sr.x, y: sr.y, width: 10, height: Math.max(sr.height,100), backgroundColor: f, borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "star":
        shapes.push({ id: makeId("d-star"), type: "star", x: sr.x, y: sr.y, width: Math.min(sr.width,56), height: Math.min(sr.height,56), points: 5, backgroundColor: f, borderWidth: 0, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "sparkle":
        shapes.push({ id: makeId("d-sp-h"), type: "rounded-rect", x: sr.x, y: sr.y + Math.round(sr.height*0.42), width: sr.width, height: Math.max(6, Math.round(sr.height*0.16)), backgroundColor: f, borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR } as TemplateShape);
        shapes.push({ id: makeId("d-sp-v"), type: "rounded-rect", x: sr.x + Math.round(sr.width*0.42), y: sr.y, width: Math.max(6, Math.round(sr.width*0.16)), height: sr.height, backgroundColor: f, borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "wave-line":
        shapes.push({ id: makeId("d-wave"), type: "wave-line", x: sr.x, y: sr.y, width: Math.min(sr.width,160), height: 24, backgroundColor: "transparent", waveColor: f, waveAmplitude: 6, waveFrequency: 3, borderWidth: 0, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "hexagon":
        shapes.push({ id: makeId("d-hex"), type: "rounded-rect", x: sr.x, y: sr.y, width: Math.min(sr.width,60), height: Math.min(sr.height,60), backgroundColor: f, borderWidth: 0, borderRadius: 14, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "glow-blob":
        shapes.push({ id: makeId("d-glow"), type: "glow-blob", x: sr.x, y: sr.y, width: Math.min(sr.width,180), height: Math.min(sr.height,180), backgroundColor: palette.glowColor, glowRadius: 70, borderWidth: 0, zIndex: Z_DECOR } as TemplateShape);
        break;
      case "dot-grid":
        shapes.push({ id: makeId("d-dots"), type: "dot-grid", x: sr.x, y: sr.y, width: sr.width, height: sr.height, backgroundColor: "transparent", dotColor: f, dotSpacing: 16, dotRadius: 2, borderWidth: 0, zIndex: Z_DECOR } as TemplateShape);
        break;
      default: // pill / chip / cross / arc / soft-card
        shapes.push({ id: makeId("d-pill"), type: "rounded-rect", x: sr.x, y: sr.y, width: Math.min(sr.width,140), height: Math.min(sr.height,32), backgroundColor: f, borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR } as TemplateShape);
    }
  }

  return shapes;
}

// ── Hero + images + logo ──────────────────────────────────────────────────────
export function buildHeroShapes(ctx: RenderContext): TemplateShape[] {
  const { skeleton, palette, composition, imageSlots, brand, canvasW, canvasH } = ctx;
  const efs    = canvasW / 1080;
  const shapes: TemplateShape[] = [];

  // ── Hero image (NO surface card blocking it) ────────────────────────────
  if (skeleton.zones.hero) {
    const heroRadius =
      composition.layout === "centered-content-bg-hero" ||
      composition.layout === "split-diagonal" ? 0 : Math.round(16 * efs);

    if (imageSlots.hero_person) {
      shapes.push({
        id: makeId("hero-image"), type: "image",
        x: skeleton.zones.hero.x, y: skeleton.zones.hero.y,
        width: skeleton.zones.hero.width, height: skeleton.zones.hero.height,
        src: undefined, fit: "cover", radius: heroRadius, zIndex: Z_HERO,
        slotKey: "hero_person", slotType: "image", slotRole: "hero", slotVisibleWhenEmpty: false,
      } as TemplateShape);
    } else if (composition.layout !== "editorial-center-stack") {
      // Placeholder gradient instead of white box
      shapes.push({
        id: makeId("hero-fallback"), type: "rounded-rect",
        x: skeleton.zones.hero.x, y: skeleton.zones.hero.y,
        width: skeleton.zones.hero.width, height: skeleton.zones.hero.height,
        backgroundColor: palette.surface,
        gradientColors: [{ stop: 0, color: palette.surface }, { stop: 1, color: palette.bg }],
        gradientAngle: 135,
        borderWidth: 0, borderRadius: heroRadius, zIndex: Z_HERO,
      } as TemplateShape);
    }

    // Gradient tint (only on full-bleed layouts)
    if (["centered-content-bg-hero","split-diagonal","top-hero-bottom-content"].includes(composition.layout)) {
      shapes.push({
        id: makeId("hero-tint"), type: "gradient-overlay",
        x: skeleton.zones.hero.x, y: skeleton.zones.hero.y,
        width: skeleton.zones.hero.width, height: skeleton.zones.hero.height,
        gradientColors:  palette.heroTintGradient,
        gradientAngle:   composition.layout === "split-diagonal" ? 90 : 180,
        backgroundColor: "transparent", borderWidth: 0, zIndex: Z_HERO + 1,
      } as TemplateShape);
    }
  }

  // ── Secondary image (no card chrome) ────────────────────────────────────
  if (composition.elements.showSecondaryImage && imageSlots.dashboard_image && skeleton.zones.secondaryImage) {
    const si = skeleton.zones.secondaryImage;
    shapes.push({
      id: makeId("secondary-image"), type: "image",
      x: si.x, y: si.y, width: si.width, height: si.height,
      src: undefined, fit: "cover", radius: Math.round(10 * efs),
      zIndex: Z_SECONDARY,
      slotKey: "dashboard_image", slotType: "image", slotRole: "secondary", slotVisibleWhenEmpty: true,
    } as TemplateShape);

    // Thin accent border instead of full card
    shapes.push({
      id: makeId("secondary-border"), type: "rounded-rect",
      x: si.x - 2, y: si.y - 2, width: si.width + 4, height: si.height + 4,
      backgroundColor: "transparent",
      borderWidth: 2, borderColor: palette.accent,
      borderRadius: Math.round(12 * efs), zIndex: Z_SECONDARY - 1,
    } as TemplateShape);
  }

  // ── Logo ────────────────────────────────────────────────────────────────
  if (imageSlots.logo) {
    const logoW = Math.round(160 * efs), logoH = Math.round(58 * efs);
    const logoX =
      composition.layout === "right-content-left-hero"  ? skeleton.zones.content.x :
      composition.layout === "editorial-center-stack"   ? skeleton.zones.content.x + Math.round(skeleton.zones.content.width * 0.35) :
      Math.round(40 * efs);
    const logoY =
      ["top-hero-bottom-content","hero-top-card-bottom"].includes(composition.layout)
        ? skeleton.zones.content.y + 6
        : Math.round(36 * efs);
    shapes.push({
      id: makeId("logo-image"), type: "image",
      x: logoX, y: logoY, width: logoW, height: logoH,
      src: undefined, fit: "contain", radius: 0, zIndex: Z_LOGO,
      slotKey: "logo", slotType: "logo", slotVisibleWhenEmpty: true,
    } as TemplateShape);
  }

  return shapes;
}

// ── Content shapes ─────────────────────────────────────────────────────────────
function buildTextShape(p: AIBlockPlacement, text: string, dataField?: string): TemplateShape {
  return {
    id: makeId(`text-${p.field}`), type: "text",
    x: p.rect.x, y: p.rect.y, width: p.rect.width, height: p.rect.height,
    text, fontSize: p.style.fontSize ?? 26, fontWeight: p.style.fontWeight ?? 600,
    textColor: p.style.color || "#000000", textAlign: p.style.textAlign ?? "left",
    fontFamily: p.style.fontFamily, fontStyle: p.style.fontStyle,
    lineHeight: p.style.lineHeight, letterSpacing: p.style.letterSpacing,
    shadowBlur: p.style.shadowBlur ?? 0, shadowColor: p.style.shadowColor,
    gradientColors: p.style.gradientColors, gradientAngle: p.style.gradientAngle,
    borderWidth: 0, dataField: dataField || p.field, zIndex: Z_TEXT,
  } as TemplateShape;
}

function buildBulletMarker(x: number, y: number, style: BulletDotStyle, color: string, efs: number): TemplateShape {
  const ms = Math.round(14 * efs);
  switch (style) {
    case "dash":    return { id: makeId("bm-dash"), type: "rounded-rect", x, y: y + Math.round(8*efs), width: Math.round(22*efs), height: Math.round(5*efs), backgroundColor: color, borderWidth: 0, borderRadius: 6, zIndex: Z_TEXT } as TemplateShape;
    case "arrow":   return { id: makeId("bm-arrow"), type: "text", x, y: y - Math.round(4*efs), width: Math.round(24*efs), height: Math.round(26*efs), text: "→", fontSize: Math.round(24*efs), fontWeight: 800, textColor: color, textAlign: "left", borderWidth: 0, zIndex: Z_TEXT } as TemplateShape;
    case "chevron": return { id: makeId("bm-chev"), type: "text", x, y: y - Math.round(3*efs), width: Math.round(22*efs), height: Math.round(28*efs), text: "›", fontSize: Math.round(28*efs), fontWeight: 800, textColor: color, textAlign: "left", borderWidth: 0, zIndex: Z_TEXT } as TemplateShape;
    case "circle":  return { id: makeId("bm-circle"), type: "circle", x, y: y + Math.round(3*efs), width: ms, height: ms, backgroundColor: color, borderWidth: 0, zIndex: Z_TEXT } as TemplateShape;
    default:        return { id: makeId("bm-sq"), type: "rounded-rect", x, y: y + Math.round(3*efs), width: ms, height: ms, backgroundColor: color, borderWidth: 0, borderRadius: 4, zIndex: Z_TEXT } as TemplateShape;
  }
}

function buildCTAShapes(p: AIBlockPlacement, text: string, palette: Palette, ctaStyle: CTAStyle, efs: number): TemplateShape[] {
  const r = p.style.radius ?? (ctaStyle === "pill" ? 999 : Math.round(16 * efs));
  const shapes: TemplateShape[] = [];

  if (ctaStyle === "gradient") {
    shapes.push({ id: makeId("cta-bg"), type: "rounded-rect", x: p.rect.x, y: p.rect.y, width: p.rect.width, height: p.rect.height, backgroundColor: palette.accent, gradientColors: palette.accentGradient, gradientAngle: 90, borderWidth: 0, borderRadius: r, shadowBlur: 20, shadowX: 0, shadowY: 6, shadowColor: palette.glowColor, zIndex: Z_CTA } as TemplateShape);
  } else if (["filled","pill"].includes(ctaStyle)) {
    shapes.push({ id: makeId("cta-bg"), type: "rounded-rect", x: p.rect.x, y: p.rect.y, width: p.rect.width, height: p.rect.height, backgroundColor: p.style.backgroundColor || palette.accent, borderWidth: 0, borderRadius: r, shadowBlur: 14, shadowX: 0, shadowY: 5, shadowColor: palette.glowColor, zIndex: Z_CTA } as TemplateShape);
  } else { // outline / ghost
    shapes.push({ id: makeId("cta-bg"), type: "rounded-rect", x: p.rect.x, y: p.rect.y, width: p.rect.width, height: p.rect.height, backgroundColor: "#00000000", borderWidth: 3, borderColor: palette.accent, borderRadius: r, zIndex: Z_CTA } as TemplateShape);
  }

  shapes.push({
    id: makeId("cta-text"), type: "text",
    x: p.rect.x + Math.round(20*efs), y: p.rect.y + Math.round(p.rect.height * 0.20),
    width: p.rect.width - Math.round(40*efs), height: Math.round(p.rect.height * 0.62),
    text, fontSize: p.style.fontSize ?? Math.round(32*efs), fontWeight: 800,
    textColor: p.style.color || "#ffffff", textAlign: "center",
    fontFamily: p.style.fontFamily, lineHeight: 1.0,
    letterSpacing: p.style.letterSpacing,
    borderWidth: 0, dataField: "cta", zIndex: Z_CTA + 1,
  } as TemplateShape);

  return shapes;
}

export function buildContentShapes(ctx: RenderContext): TemplateShape[] {
  const { placements, campaign, composition, palette, direction, brand, canvasW, canvasH, orientation, skeleton } = ctx;
  const efs = (canvasW / 1080) * (orientation === "landscape" ? 0.80 : orientation === "square" ? 0.88 : 1.0);
  const shapes: TemplateShape[] = [];

  if (placements.hook_tag && campaign.hook_tag)
    shapes.push(buildTextShape(placements.hook_tag, campaign.hook_tag, "hook_tag"));

  if (placements.hook_pre && campaign.hook_pre)
    shapes.push(buildTextShape(placements.hook_pre, campaign.hook_pre, "hook_pre"));

  if (placements.hook) {
    const text = direction.headlineMultiColor && campaign.hook.includes("\n")
      ? campaign.hook.split("\n")[0]
      : campaign.hook || "Your Headline Here";
    shapes.push(buildTextShape(placements.hook, text, "hook"));
  }

  if (placements.hook_emphasis && direction.headlineMultiColor && campaign.hook.includes("\n"))
    shapes.push(buildTextShape(placements.hook_emphasis, campaign.hook.split("\n").slice(1).join(" "), "hook_emphasis"));

  if (placements.subheading && campaign.subheading)
    shapes.push(buildTextShape(placements.subheading, campaign.subheading, "subheading"));

  // ── Bullets with markers ─────────────────────────────────────────────────
  if (placements.bullets) {
    const bullets  = getAvailableBullets(campaign).slice(0, composition.elements.bulletCount);
    const lineStep = Math.max(Math.round(46 * efs), Math.round((placements.bullets.rect.height - 8) / Math.max(1, bullets.length)));
    bullets.forEach((bullet, idx) => {
      const by = placements.bullets!.rect.y + idx * lineStep;
      shapes.push(buildBulletMarker(placements.bullets!.rect.x, by + Math.round(8*efs), composition.elements.bulletDotStyle, palette.accent, efs));
      shapes.push({
        id: makeId(`bt-${idx}`), type: "text",
        x: placements.bullets!.rect.x + Math.round(36*efs), y: by,
        width: placements.bullets!.rect.width - Math.round(36*efs), height: lineStep,
        text: bullet,
        fontSize: placements.bullets!.style.fontSize ?? Math.round(30*efs),
        fontWeight: 700,
        textColor: placements.bullets!.style.color || palette.text,
        textAlign: placements.bullets!.style.textAlign ?? "left",
        fontFamily: brand.displayFont,
        lineHeight: 1.2, borderWidth: 0,
        dataField: `bullet_${idx + 1}`, zIndex: Z_TEXT,
      } as TemplateShape);
    });
  }

  if (placements.proof && campaign.proof)
    shapes.push(buildTextShape(placements.proof, campaign.proof, "proof"));

  if (placements.review_text && campaign.review_text)
    shapes.push(buildTextShape(placements.review_text, `"${campaign.review_text}"`, "review_text"));
  if (placements.review_author && campaign.review_author)
    shapes.push(buildTextShape(placements.review_author, `— ${campaign.review_author}`, "review_author"));

  // ── CTA ──────────────────────────────────────────────────────────────────
  if (placements.cta)
    shapes.push(...buildCTAShapes(placements.cta, campaign.cta || "Get Started", palette, composition.elements.ctaStyle, efs));

  if (placements.offer_cta && campaign.offer_cta)
    shapes.push(buildTextShape(placements.offer_cta, campaign.offer_cta, "offer_cta"));

  // ── Footer: company name + website ───────────────────────────────────────
  if (placements.companyName && campaign.companyName)
    shapes.push(buildTextShape(placements.companyName, campaign.companyName, "companyName"));
  if (placements.business_website && campaign.business_website)
    shapes.push(buildTextShape(placements.business_website, campaign.business_website, "business_website"));
  if (placements.business_meta)
    shapes.push(buildTextShape(placements.business_meta, getBusinessMetaLine(campaign), "business_meta"));
  if (placements.sponsors && campaign.sponsors?.length)
    shapes.push(buildTextShape(placements.sponsors, campaign.sponsors.map(s => s.name).slice(0,3).join(" · "), "sponsors"));
  if (placements.accreditations && campaign.accreditations?.length)
    shapes.push(buildTextShape(placements.accreditations, campaign.accreditations.map(a => a.name).slice(0,3).join(" · "), "accreditations"));

  // ── Contact block — ALWAYS rendered, never optional ──────────────────────
  // Positioned in the bottom strip, below the CTA zone
  const contactStartY = Math.min(
    skeleton.zones.cta.y + skeleton.zones.cta.height + Math.round(18 * efs),
    canvasH - Math.round(200 * efs)
  );
  const contactX = skeleton.zones.content.x;
  const contactW = skeleton.zones.content.width;

  const contactBlock = buildContactBlock(campaign, palette, brand, contactX, contactStartY, contactW, efs);

  for (const item of contactBlock.shapes) {
    shapes.push({
      id: makeId("contact"), type: "text",
      x: item.x, y: item.y, width: item.width, height: item.height,
      text: item.text,
      fontSize:    item.style.fontSize ?? Math.round(19 * efs),
      fontWeight:  item.style.fontWeight ?? 500,
      textColor:   item.style.color || palette.muted,
      textAlign:   item.style.textAlign ?? "left",
      fontFamily:  item.style.fontFamily || brand.displayFont,
      lineHeight:  item.style.lineHeight,
      letterSpacing: item.style.letterSpacing,
      borderWidth: 0, zIndex: Z_TEXT,
    } as TemplateShape);
  }

  return shapes;
}