/**
 * frontend/lib/campaign-design-intelligence.ts
 *
 * KEY CHANGES vs previous version:
 *  - NO per-text scrims / background boxes. Text legibility = shadow + overlay only.
 *  - injectImageOverlay() adds ONE gradient-overlay shape over every hero image,
 *    darkening the bottom 60% so text placed below/over it is always readable.
 *  - Collision resolver now sorts by Y before resolving so pushes are always downward.
 *  - improveTextShape gives display headlines shadowBlur:20 + shadowOffsetY:3 — no box.
 *  - CTA button panel gets accent colour only; text inside gets no background.
 *  - Band clamping runs first, collision runs last, overlay injection runs after both.
 */

import { applyLayoutSafety } from "@/lib/campaign-layout-safety";
// Visual identity — owned by mixed-poster/index
import { FAMILY_THEMES, type ThemeTokens, type TemplateFamilyId } from "@/lib/templates/mixed-poster/index";
// Zone geometry — owned by layout-contract
import { ZONES as LAYOUT_BANDS } from "@/lib/templates/layout-contract";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CampaignDesignMood =
  | "fitness"
  | "luxury"
  | "beauty"
  | "tech"
  | "food"
  | "corporate"
  | "general";

interface BBox { x: number; y: number; w: number; h: number }

// ─── Mood detection ───────────────────────────────────────────────────────────

export function detectCampaignDesignMood(data: any): CampaignDesignMood {
  const text = [
    data?.headline, data?.hook, data?.subheading, data?.description,
    data?.product_name, data?.product_description,
    data?.campaign_label, data?.offer_label,
  ].filter(Boolean).join(" ").toLowerCase();

  if (/gym|fitness|workout|training|muscle|energy|transformation|coach/.test(text)) return "fitness";
  if (/luxury|premium|elegant|exclusive|high-end|prestige|elite/.test(text))         return "luxury";
  if (/beauty|skin|serum|glow|skincare|hair|salon|cosmetic/.test(text))              return "beauty";
  if (/ai|automation|software|saas|tech|dashboard|system|crm|booking/.test(text))   return "tech";
  if (/restaurant|burger|food|meal|drink|coffee|kitchen|pizza/.test(text))           return "food";
  if (/consulting|finance|legal|agency|business|professional|service/.test(text))    return "corporate";
  return "general";
}

// ─── Font system ──────────────────────────────────────────────────────────────

interface FontSystem {
  display: string;
  heading: string;
  body: string;
  offer: string;
  displayWeight: number;
  headingWeight: number;
  bodyWeight: number;
}

const MOOD_FONT_SYSTEMS: Record<CampaignDesignMood, FontSystem> = {
  fitness:   { display: "Anton",              heading: "Bebas Neue",         body: "Barlow Condensed", offer: "Bebas Neue",        displayWeight: 400, headingWeight: 400, bodyWeight: 600 },
  luxury:    { display: "Cormorant Garamond", heading: "Playfair Display",   body: "DM Sans",          offer: "Playfair Display",  displayWeight: 600, headingWeight: 700, bodyWeight: 300 },
  beauty:    { display: "Playfair Display",   heading: "Cormorant Garamond", body: "DM Sans",          offer: "Syne",              displayWeight: 700, headingWeight: 600, bodyWeight: 400 },
  tech:      { display: "Bebas Neue",         heading: "Syne",               body: "Outfit",           offer: "Bebas Neue",        displayWeight: 400, headingWeight: 800, bodyWeight: 400 },
  food:      { display: "Syne",               heading: "Outfit",             body: "DM Sans",          offer: "Syne",              displayWeight: 800, headingWeight: 700, bodyWeight: 400 },
  corporate: { display: "Syne",               heading: "Outfit",             body: "Outfit",           offer: "Syne",              displayWeight: 800, headingWeight: 700, bodyWeight: 400 },
  general:   { display: "Bebas Neue",         heading: "Syne",               body: "Outfit",           offer: "Bebas Neue",        displayWeight: 400, headingWeight: 700, bodyWeight: 400 },
};

// ─── Token resolution ─────────────────────────────────────────────────────────

const MOOD_TO_FAMILY: Partial<Record<CampaignDesignMood, TemplateFamilyId>> = {
  luxury: "watch", beauty: "skincare", tech: "watch", fitness: "watch", corporate: "architectural",
};

function resolveTokens(shape: any, mood: CampaignDesignMood): ThemeTokens {
  if (shape._tokens) return shape._tokens as ThemeTokens;
  const family = MOOD_TO_FAMILY[mood];
  if (family) return FAMILY_THEMES[family];
  return {
    bg: "#0A0A0F", surface: "#13131A",
    textPrimary: "#FFFFFF", textSecondary: "#A0A0B0",
    accent: "#C9A84C", fontDisplay: "Bebas Neue", fontBody: "Outfit", fontOffer: "Bebas Neue",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const lower  = (v: any) => String(v || "").toLowerCase();
const isText  = (s: any) => s?.type === "text";
const isPanel = (s: any) => ["rectangle", "rounded-rect", "circle"].includes(String(s?.type));
const isImage = (s: any) => s?.type === "image";

function luminance(hex: string): number {
  const c = String(hex || "").trim();
  if (!c.startsWith("#") || c.length < 7) return 0.5;
  const r = parseInt(c.slice(1, 3), 16);
  const g = parseInt(c.slice(3, 5), 16);
  const b = parseInt(c.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function getBBox(shape: any): BBox | null {
  const x = shape.x ?? shape.left ?? null;
  const y = shape.y ?? shape.top  ?? null;
  const w = shape.width  ?? shape.w ?? null;
  const h = shape.height ?? shape.h ?? null;
  if (x === null || y === null || w === null || h === null) return null;
  return { x: Number(x), y: Number(y), w: Number(w), h: Number(h) };
}

function bboxOverlaps(a: BBox, b: BBox): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ─── Image overlay injection ──────────────────────────────────────────────────
//
// For every image shape found in the list, inject a gradient-overlay shape
// that sits ABOVE the image (zIndex = imageZIndex + 1) and darkens its bottom
// portion. This replaces per-text scrims entirely — one overlay per image,
// not one rectangle per text shape.
//
// The overlay is a linear gradient: transparent at top → dark at bottom (60%).
// On light-theme posters, the dark is reduced to 0.35 opacity.

function injectImageOverlays(shapes: any[], tokens: ThemeTokens): any[] {
  const result = [...shapes];
  const isDark = luminance(tokens.bg) < 0.5;
  const overlayOpacity = isDark ? 0.72 : 0.35;

  const imageShapes = shapes.filter(isImage);

  for (const img of imageShapes) {
    const bbox = getBBox(img);
    if (!bbox) continue;

    const overlayId = `__overlay_${img.id ?? Math.random().toString(36).slice(2)}`;

    // Don't double-inject
    if (result.some((s) => s.id === overlayId)) continue;

    const overlay = {
      id:   overlayId,
      type: "gradient-overlay",
      x:    bbox.x,
      y:    bbox.y,
      width:  bbox.w,
      height: bbox.h,
      zIndex: Number(img.zIndex ?? 0) + 1,
      opacity: 1,
      gradientAngle: 180, // top → bottom
      gradientColors: [
        { stop: 0,    color: "rgba(0,0,0,0)" },
        { stop: 0.35, color: "rgba(0,0,0,0)" },
        { stop: 1,    color: `rgba(0,0,0,${overlayOpacity})` },
      ],
      // Internal marker so collision resolver ignores this shape
      _isOverlay: true,
    };

    // Insert immediately after the image in the array
    const imgIdx = result.indexOf(img);
    result.splice(imgIdx + 1, 0, overlay);
  }

  return result;
}

// ─── Text improvement ─────────────────────────────────────────────────────────
//
// NO backgroundColor on text shapes. Legibility via:
//   - Strong drop shadow (shadowBlur 20, offsetY 3) on headlines
//   - Moderate shadow (shadowBlur 10) on body text
//   - Correct colour from tokens (never dark-on-dark or light-on-light)

function improveTextShape(shape: any, mood: CampaignDesignMood, tokens: ThemeTokens): any {
  const field = lower(shape.dataField);
  const role  = lower(shape._role ?? "");
  const fonts = MOOD_FONT_SYSTEMS[mood];

  const isHero = role === "heading"    || field === "headline" || field === "hook" || field.includes("headline");
  const isOffer= role === "accent"     || field.includes("price") || field.includes("offer") || field.includes("discount");
  const isSub  = role === "subheading" || field.includes("label") || field.includes("tag") || field.includes("subheading");
  const isBody = role === "body"       || field.includes("description") || field.includes("body");

  // Shared: never set backgroundColor on text
  const noBox = { backgroundColor: "transparent" };

  if (isHero) {
    return {
      ...shape, ...noBox,
      fontFamily:    shape.fontFamily    || fonts.display,
      fontWeight:    shape.fontWeight    || fonts.displayWeight,
      letterSpacing: shape.letterSpacing ?? (mood === "luxury" || mood === "beauty" ? -1.5 : -0.5),
      lineHeight:    shape.lineHeight    || 0.95,
      textColor:     shape.textColor     || tokens.textPrimary,
      textTransform: (mood === "fitness" || mood === "tech") ? "uppercase" : (shape.textTransform ?? "none"),
      // Strong drop shadow — the ONLY legibility aid, no box
      shadowBlur:    20,
      shadowColor:   "rgba(0,0,0,0.85)",
      shadowX:       0,
      shadowY:       3,
    };
  }

  if (isOffer) {
    return {
      ...shape, ...noBox,
      fontFamily:    shape.fontFamily || fonts.offer,
      fontWeight:    shape.fontWeight || fonts.displayWeight,
      letterSpacing: shape.letterSpacing ?? 1,
      textColor:     shape.textColor  || tokens.accent,
      textTransform: "uppercase",
      shadowBlur:    16,
      shadowColor:   "rgba(0,0,0,0.75)",
      shadowX: 0, shadowY: 2,
    };
  }

  if (isSub) {
    return {
      ...shape, ...noBox,
      fontFamily:    shape.fontFamily || fonts.heading,
      fontWeight:    shape.fontWeight || fonts.headingWeight,
      letterSpacing: shape.letterSpacing ?? 2,
      textColor:     shape.textColor  || tokens.accent,
      textTransform: "uppercase",
      shadowBlur:    8,
      shadowColor:   "rgba(0,0,0,0.6)",
      shadowX: 0, shadowY: 1,
    };
  }

  if (isBody) {
    return {
      ...shape, ...noBox,
      fontFamily: shape.fontFamily || fonts.body,
      fontWeight: shape.fontWeight || fonts.bodyWeight,
      lineHeight: shape.lineHeight || 1.5,
      textColor:  shape.textColor  || tokens.textSecondary,
      shadowBlur: 6,
      shadowColor: "rgba(0,0,0,0.5)",
      shadowX: 0, shadowY: 1,
    };
  }

  // Default
  return {
    ...shape, ...noBox,
    fontFamily: shape.fontFamily || fonts.body,
    fontWeight: shape.fontWeight || fonts.bodyWeight,
    lineHeight: shape.lineHeight || 1.4,
    textColor:  shape.textColor  || tokens.textSecondary,
    shadowBlur: 6,
    shadowColor: "rgba(0,0,0,0.5)",
    shadowX: 0, shadowY: 1,
  };
}

// ─── CTA improvement ──────────────────────────────────────────────────────────

function improveCtaShape(shape: any, tokens: ThemeTokens): any {
  const field = lower(shape.dataField);
  const id    = lower(shape.id ?? "");
  const isCta = field.includes("cta") || id.includes("cta") || shape._role === "ui";
  if (!isCta) return shape;

  if (isText(shape)) {
    return {
      ...shape,
      backgroundColor: "transparent",       // NO text box on CTA label
      fontFamily:    shape.fontFamily    || "Syne",
      fontWeight:    shape.fontWeight    || 700,
      letterSpacing: shape.letterSpacing ?? 1.5,
      textColor:     shape.textColor     || tokens.bg,  // dark text on accent button
      textTransform: "uppercase",
      shadowBlur:    0,  // CTA button has its own bg, shadow not needed
    };
  }

  if (isPanel(shape)) {
    const existing = shape.backgroundColor;
    const shouldOverride = !existing || existing === "#ffffff" || existing === "white" || existing === "#7c3aed";
    return {
      ...shape,
      backgroundColor: shouldOverride ? tokens.accent : existing,
      borderRadius:    shape.borderRadius ?? 6,
      opacity:         shape.opacity      ?? 1,
    };
  }

  return shape;
}

// ─── Panel improvement ────────────────────────────────────────────────────────

function improvePanels(shape: any, mood: CampaignDesignMood, tokens: ThemeTokens): any {
  if (!isPanel(shape)) return shape;
  // Never touch CTA panels here — improveCtaShape owns those
  if (lower(shape.id ?? "").includes("cta") || lower(shape.dataField ?? "").includes("cta")) return shape;

  const bg = String(shape.backgroundColor || "");
  const lum = bg ? luminance(bg) : -1;

  if (mood === "fitness" || mood === "tech" || mood === "corporate") {
    if (lum < 0 || lum > 0.68) {
      return { ...shape, backgroundColor: tokens.surface || "rgba(0,0,0,0.50)", borderColor: shape.borderColor || `${tokens.accent}33` };
    }
    return { ...shape, borderColor: shape.borderColor || `${tokens.accent}33` };
  }

  if (mood === "luxury" || mood === "beauty") {
    return { ...shape, borderColor: shape.borderColor || `${tokens.accent}44`, borderWidth: shape.borderWidth || 1 };
  }

  return shape;
}

// ─── Contrast check ───────────────────────────────────────────────────────────

function enforceContrast(shape: any, tokens: ThemeTokens): any {
  if (!isText(shape)) return shape;
  const textColor = shape.textColor || "";
  const bgLum     = luminance(tokens.bg);
  const textLum   = luminance(textColor);
  if (textColor && Math.abs(bgLum - textLum) < 0.3) {
    return { ...shape, textColor: bgLum < 0.5 ? tokens.textPrimary : "#1A1208" };
  }
  return shape;
}

// ─── Band clamping ────────────────────────────────────────────────────────────

function clampToBand(shape: any): any {
  const band = shape._layoutBand as { yStart: number; height: number } | undefined;
  if (!band) return shape;
  const y = shape.y ?? shape.top;
  if (y === null || y === undefined) return shape;
  const yNum = Number(y);
  const yMin = band.yStart;
  const yMax = band.yStart + band.height - Number(shape.height ?? shape.h ?? 0);
  if (yNum < yMin || yNum > Math.max(yMin, yMax)) {
    const clamped = Math.max(yMin, Math.min(Math.max(yMin, yMax), yNum));
    return shape.y !== undefined ? { ...shape, y: clamped } : { ...shape, top: clamped };
  }
  return shape;
}

// ─── Collision resolver ───────────────────────────────────────────────────────
//
// Sorts by Y first so pushes always go downward, not randomly.
// Images and overlays are anchors — they never move.
// Text and panels move down to resolve overlaps.
// Gutter: 16px between text blocks (agency-level breathing room).

function resolveCollisions(shapes: any[]): any[] {
  const result = shapes.map((s) => ({ ...s }));

  // Sort movable shapes by Y so we resolve top-down
  const movable = result
    .map((s, i) => ({ i, s }))
    .filter(({ s }) => (isText(s) || isPanel(s)) && !s._isOverlay)
    .sort((a, b) => Number(a.s.y ?? 0) - Number(b.s.y ?? 0));

  for (let ai = 0; ai < movable.length; ai++) {
    for (let bi = ai + 1; bi < movable.length; bi++) {
      const a = result[movable[ai].i];
      const b = result[movable[bi].i];

      const bboxA = getBBox(a);
      const bboxB = getBBox(b);
      if (!bboxA || !bboxB) continue;
      if (!bboxOverlaps(bboxA, bboxB)) continue;

      const overlapY = Math.min(bboxA.y + bboxA.h, bboxB.y + bboxB.h) - Math.max(bboxA.y, bboxB.y);
      if (overlapY <= 0) continue;

      // Always push the LOWER shape down
      const pushAmount = overlapY + 16;
      const target = result[movable[bi].i];
      result[movable[bi].i] = target.y !== undefined
        ? { ...target, y: Number(target.y) + pushAmount }
        : { ...target, top: Number(target.top ?? 0) + pushAmount };
    }
  }

  return result;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function improveCampaignDesignShapes(shapes: any[], campaignData: any): any[] {
  if (!shapes?.length) return [];

  const mood   = detectCampaignDesignMood(campaignData);
  // Resolve tokens once from the first shape that has them, or from mood
  const tokens = resolveTokens(shapes.find((s) => s._tokens) ?? {}, mood);

  // Phase 1 — per-shape property improvements
  const improved = shapes.map((shape) => {
    let next = { ...shape };
    next = clampToBand(next);
    next = improvePanels(next, mood, tokens);
    if (isText(next)) {
      next = improveTextShape(next, mood, tokens);
      next = enforceContrast(next, tokens);
    }
    next = improveCtaShape(next, tokens);
    return next;
  });

  // Phase 2 — inject image darkening overlays (replaces per-text scrims)
  const withOverlays = injectImageOverlays(improved, tokens);

  // Phase 3 — resolve text/panel collisions
  const resolved = resolveCollisions(withOverlays);

  // Phase 4 — existing layout safety pass
  return applyLayoutSafety(resolved);
}