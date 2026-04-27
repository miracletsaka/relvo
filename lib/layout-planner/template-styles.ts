/**
 * layout-planner/template-styles.ts  (v6 — compact card, no duplication)
 * ──────────────────────────────────────────────────────────────────────────
 * Target canvas: 1080×1080 square (best for social media)
 *
 * KEY FIXES in this version:
 *  1. No CONTACT() helper inside template body — contacts ONLY in strip
 *  2. Logo slot properly mapped — slotKey="logo" + src from campaignData.logo
 *  3. Contact strip font sizes doubled (22px row1, 17px row2)
 *  4. Layouts restructured to fill canvas without voids
 *  5. Templates are now compact and horizontally balanced
 *
 * All text shapes: text="" + dataField — editor fills from CampaignData
 */

import type {
  NormalizedCampaignData, BrandFingerprint, Palette,
  Orientation, TemplateShape, GradientStop,
} from "./types";
import {
  seededRng, clamp, isNonEmpty, getAvailableBullets,
  hexToRgba, makeId,
} from "./utils";
import {
  BEBAS_NEUE, SYNE, PLAYFAIR, BARLOW, OSWALD,
  Z_TEXT, Z_CTA, Z_DECOR, Z_HERO, Z_LOGO,
} from "./constants";

// ── Types ──────────────────────────────────────────────────────────────────────
export type TemplateStyleName =
  | "headline-only"    | "cta-dominant"    | "stat-callout"
  | "editorial"        | "proof-forward"   | "offer-card"
  | "bullet-list"      | "side-by-side"    | "full-bleed-image"
  | "contact-showcase" | "announcement"    | "minimal-logo";

export const ALL_STYLE_NAMES: TemplateStyleName[] = [
  "headline-only", "cta-dominant", "stat-callout", "editorial",
  "proof-forward", "offer-card", "bullet-list", "side-by-side",
  "full-bleed-image", "contact-showcase", "announcement", "minimal-logo",
];

// ── Style picker ───────────────────────────────────────────────────────────────
export function pickTemplateStyle(
  campaign: NormalizedCampaignData,
  brand: BrandFingerprint,
  previousStyle?: TemplateStyleName | null
): TemplateStyleName {
  const rng = seededRng(brand.seed ^ 0xAB12CD34);
  let pool  = [...ALL_STYLE_NAMES];
  if (!isNonEmpty(campaign.review_text) && !isNonEmpty(campaign.proof))
    pool = pool.filter(s => s !== "proof-forward");
  if (!campaign.offers?.length && !isNonEmpty(campaign.offer_cta) && !isNonEmpty(campaign.price_label))
    pool = pool.filter(s => s !== "offer-card");
  if (!getAvailableBullets(campaign).length)
    pool = pool.filter(s => s !== "bullet-list");
  pool = pool.filter(s => s !== previousStyle);
  if (!pool.length) pool = ALL_STYLE_NAMES.filter(s => s !== previousStyle);
  return rng.pick(pool);
}

// ── Primitives ─────────────────────────────────────────────────────────────────

/** Text slot — text always "", editor fills via dataField */
function T(
  dataField: string,
  x: number, y: number, w: number, h: number,
  fontSize: number, weight: number, color: string, font: string,
  align: "left"|"center"|"right" = "left",
  extra: Partial<TemplateShape> = {}
): TemplateShape {
  return {
    id: makeId("t"), type: "text",
    x: Math.round(x), y: Math.round(y),
    width: Math.round(Math.max(w, 10)), height: Math.round(Math.max(h, 10)),
    text: "", dataField,
    fontSize: Math.round(Math.max(fontSize, 12)), fontWeight: weight,
    textColor: color, textAlign: align,
    fontFamily: font,
    lineHeight: extra.lineHeight ?? 1.0,
    letterSpacing: extra.letterSpacing ?? 0,
    borderWidth: 0, zIndex: Z_TEXT,
    ...extra,
  } as TemplateShape;
}

/** Rect / pill */
function R(
  x: number, y: number, w: number, h: number,
  bg: string, radius = 0, extra: Partial<TemplateShape> = {}
): TemplateShape {
  return {
    id: makeId("r"), type: "rounded-rect",
    x: Math.round(x), y: Math.round(y),
    width: Math.round(Math.max(w, 2)), height: Math.round(Math.max(h, 2)),
    backgroundColor: bg, borderWidth: 0, borderRadius: radius,
    zIndex: Z_DECOR, ...extra,
  } as TemplateShape;
}

/** Image / logo slot */
function IMG(
  slotKey: string, x: number, y: number, w: number, h: number,
  fit: "cover"|"contain" = "cover",
  radius = 0, zIndex = Z_HERO, slotVisibleWhenEmpty = false
): TemplateShape {
  const isLogo = slotKey === "logo";
  return {
    id: makeId(`img-${slotKey}`), type: "image",
    x: Math.round(x), y: Math.round(y),
    width: Math.round(w), height: Math.round(h),
    src: undefined, fit, radius,
    slotKey,
    slotType:  isLogo ? "logo" : "image",
    slotRole:  isLogo ? "logo" : slotKey === "dashboard_image" ? "secondary" : "hero",
    slotVisibleWhenEmpty: isLogo || slotVisibleWhenEmpty,
    slotLabel: isLogo ? "Logo" : slotKey === "dashboard_image" ? "Secondary Image" : "Hero Image",
    borderWidth: 0, zIndex,
  } as TemplateShape;
}

/** Gradient scrim */
function SCRIM(
  x: number, y: number, w: number, h: number,
  angle: number, stops: Array<{stop: number; color: string}>
): TemplateShape {
  return {
    id: makeId("scrim"), type: "gradient-overlay",
    x: Math.round(x), y: Math.round(y),
    width: Math.round(w), height: Math.round(h),
    gradientColors: stops as GradientStop[],
    gradientAngle: angle,
    backgroundColor: "transparent", borderWidth: 0,
    zIndex: Z_HERO + 1,
  } as TemplateShape;
}

/** CTA button — background + text slot */
function CTA(
  x: number, y: number, w: number, h: number,
  palette: Palette, brand: BrandFingerprint, font: string, efs: number
): TemplateShape[] {
  const r = brand.cardStyle === "pill" ? 999
          : brand.cardStyle === "sharp" ? 4
          : Math.round(12 * efs);
  return [
    R(x, y, w, h, palette.accent, r, {
      gradientColors: palette.accentGradient, gradientAngle: 90,
      shadowBlur: Math.round(28 * efs), shadowX: 0, shadowY: Math.round(8 * efs),
      shadowColor: palette.glowColor, zIndex: Z_CTA,
    }),
    T("cta",
      x + Math.round(20 * efs), y + Math.round(h * 0.18),
      w - Math.round(40 * efs), Math.round(h * 0.66),
      Math.round(38 * efs), 900, "#ffffff", font, "center",
      { letterSpacing: 1.0, lineHeight: 1.0, zIndex: Z_CTA + 1 }),
  ];
}

/** Logo slot — properly mapped, always visible */
function LOGO(x: number, y: number, w: number, h: number): TemplateShape {
  return {
    id: makeId("img-logo"), type: "image",
    x: Math.round(x), y: Math.round(y),
    width: Math.round(w), height: Math.round(h),
    src: undefined,
    fit: "contain",
    radius: 0,
    slotKey: "logo",
    slotType: "logo",
    slotRole: "logo",
    slotLabel: "Company Logo",
    slotVisibleWhenEmpty: true,
    borderWidth: 0,
    zIndex: Z_LOGO,
  } as TemplateShape;
}

// ── Contact strip — ONLY place contacts are rendered ─────────────────────────
// Larger fonts, no duplication — this is the single source of truth.
export function buildContactStrip(
  campaign: NormalizedCampaignData,
  palette:  Palette,
  brand:    BrandFingerprint,
  canvasW:  number,
  canvasH:  number,
  efs:      number
): TemplateShape[] {
  const shapes: TemplateShape[] = [];
  const rng   = seededRng(brand.seed ^ 0xC0FFEE42);   // deterministic per brand, unique per seed
  const DF    = brand.displayFont;

  // ── Pick a strip VARIANT (0–7) driven by brand seed ─────────────────────
  // Each variant has a completely different visual structure so no two orgs
  // share the same footer design even if they generate at the same time.
  const variant = rng.nextInt(0, 7);

  // Shared sizing — varies slightly per variant
  const stripH = Math.round((variant % 2 === 0 ? 120 : 136) * efs);
  const stripY = canvasH - stripH;
  const pad    = Math.round((variant < 4 ? 40 : 50) * efs);
  const textW  = canvasW - pad * 2;
  const fs1    = Math.round((variant % 3 === 0 ? 24 : variant % 3 === 1 ? 22 : 26) * efs);
  const fs2    = Math.round((variant % 3 === 0 ? 18 : variant % 3 === 1 ? 17 : 20) * efs);
  const row1H  = Math.round(fs1 * 1.6);
  const row2H  = Math.round(fs2 * 1.6);

  // Alignment alternates per variant
  const row1Align: "left"|"center"|"right" = variant < 3 ? "left" : variant < 6 ? "center" : "right";
  const row1X = row1Align === "center" ? 0   : row1Align === "right" ? canvasW - textW - pad : pad;
  const row1W = row1Align === "center" ? canvasW : textW;

  // ── Background — 4 distinct styles ───────────────────────────────────────
  switch (variant % 4) {
    case 0:
      // Solid dark bg
      shapes.push(R(0, stripY, canvasW, stripH,
        hexToRgba(palette.bg, 0.96), 0, { zIndex: Z_TEXT - 2 }));
      break;
    case 1:
      // Accent tinted bg
      shapes.push(R(0, stripY, canvasW, stripH,
        hexToRgba(palette.accent, 0.12), 0, { zIndex: Z_TEXT - 2 }));
      break;
    case 2:
      // Solid bg + subtle inner glow
      shapes.push(R(0, stripY, canvasW, stripH,
        hexToRgba(palette.bg, 0.98), 0, {
          zIndex: Z_TEXT - 2,
          shadowBlur: Math.round(20 * efs), shadowX: 0, shadowY: -4,
          shadowColor: hexToRgba(palette.accent, 0.10),
        }));
      break;
    case 3:
      // Near-transparent — dark wash
      shapes.push(R(0, stripY, canvasW, stripH,
        hexToRgba(palette.bg, 0.82), 0, { zIndex: Z_TEXT - 2 }));
      // Gradient overlay reinforcement
      shapes.push({
        id: makeId("strip-grad"), type: "gradient-overlay",
        x: 0, y: stripY, width: canvasW, height: stripH,
        gradientColors: [
          { stop: 0, color: hexToRgba(palette.accent, 0.05) },
          { stop: 1, color: hexToRgba(palette.bg, 0.0) },
        ],
        gradientAngle: variant % 2 === 0 ? 90 : 270,
        backgroundColor: "transparent", borderWidth: 0,
        zIndex: Z_TEXT - 1,
      } as TemplateShape);
      break;
  }

  // ── Top border — 4 distinct styles ───────────────────────────────────────
  switch (variant % 4) {
    case 0:
      // Bold single line
      shapes.push(R(0, stripY, canvasW, Math.round(5 * efs),
        palette.accent, 0, { zIndex: Z_TEXT - 1 }));
      break;
    case 1:
      // Gradient line
      shapes.push(R(0, stripY, canvasW, Math.round(4 * efs),
        palette.accent, 0, {
          gradientColors: palette.accentGradient, gradientAngle: 90,
          zIndex: Z_TEXT - 1,
        }));
      break;
    case 2:
      // Double thin line
      shapes.push(R(0, stripY, canvasW, Math.round(2 * efs),
        palette.accent, 0, { zIndex: Z_TEXT - 1 }));
      shapes.push(R(0, stripY + Math.round(5 * efs), canvasW, Math.round(1 * efs),
        hexToRgba(palette.accent, 0.30), 0, { zIndex: Z_TEXT - 1 }));
      break;
    case 3:
      // Left inset accent block
      shapes.push(R(0, stripY, Math.round(8 * efs), stripH,
        palette.accent, 0, { zIndex: Z_TEXT - 1 }));
      shapes.push(R(0, stripY, canvasW, Math.round(1 * efs),
        hexToRgba(palette.accent, 0.20), 0, { zIndex: Z_TEXT - 1 }));
      break;
  }

  // ── Row 1 — primary contact line ─────────────────────────────────────────
  const row1PadLeft = variant % 4 === 3 ? pad + Math.round(16 * efs) : row1X;
  shapes.push(T("contact_row1",
    row1PadLeft, stripY + Math.round(10 * efs),
    row1Align === "center" ? canvasW : textW,
    row1H,
    fs1, variant < 4 ? 700 : 600, palette.text, DF, row1Align,
    { letterSpacing: variant % 2 === 0 ? 0.4 : 0.2, lineHeight: 1.15, zIndex: Z_TEXT + 1 }
  ));

  // ── Row 2 — secondary contact / social line ───────────────────────────────
  const row2Y = stripY + row1H + Math.round((variant % 2 === 0 ? 16 : 14) * efs);
  shapes.push(T("contact_row2",
    row1PadLeft, row2Y,
    row1Align === "center" ? canvasW : textW,
    row2H,
    fs2, 400,
    variant % 3 === 2 ? palette.accent : palette.muted,
    DF, row1Align,
    { letterSpacing: variant % 2 === 0 ? 0.3 : 0.5, lineHeight: 1.15, zIndex: Z_TEXT + 1 }
  ));

  // ── Website accent — position varies by variant ───────────────────────────
  if (row1Align !== "right") {
    // Only show right-side website when row1 is left/center
    const webFS = Math.round((variant % 2 === 0 ? 18 : 20) * efs);
    const webW  = Math.round((variant % 2 === 0 ? 400 : 360) * efs);
    shapes.push(T("business_website",
      canvasW - webW - Math.round(pad * 0.5), stripY + Math.round(28 * efs),
      webW, row1H,
      webFS, 800, palette.accent, DF, "right",
      { letterSpacing: variant % 2 === 0 ? 1.0 : 0.6, lineHeight: 1.0, zIndex: Z_TEXT + 2 }
    ));
  }

  // ── Variant-specific decorative extras ───────────────────────────────────
  if (variant === 1 || variant === 5) {
    // Small accent dot-separator between rows
    shapes.push({
      id: makeId("strip-dot"), type: "circle",
      x: Math.round(pad * 0.5), y: stripY + Math.round(stripH / 2 - 4 * efs),
      width: Math.round(8 * efs), height: Math.round(8 * efs),
      backgroundColor: hexToRgba(palette.accent, 0.5),
      borderWidth: 0, zIndex: Z_TEXT,
    } as TemplateShape);
  }

  if (variant === 3 || variant === 7) {
    // Right-side vertical accent bar
    shapes.push(R(canvasW - Math.round(4 * efs), stripY, Math.round(4 * efs), stripH,
      hexToRgba(palette.accent, 0.4), 0, { zIndex: Z_TEXT }));
  }

  if (variant === 2 || variant === 6) {
    // Subtle center divider between rows
    shapes.push(R(pad, stripY + row1H + Math.round(12 * efs),
      Math.round(textW * 0.6), Math.round(1 * efs),
      hexToRgba(palette.accent, 0.18), 0, { zIndex: Z_TEXT }));
  }

  return shapes;
}


export function buildStyleShapes(
  style: TemplateStyleName,
  campaign: NormalizedCampaignData,
  palette: Palette,
  brand: BrandFingerprint,
  canvasW: number,
  canvasH: number,
  orientation: Orientation,
  imageSlots: { logo?: string; hero_person?: string; dashboard_image?: string }
): TemplateShape[] {

  // Font scale — 1.0 at 1080px
  const efs     = (canvasW / 1080) * (orientation === "landscape" ? 0.85 : orientation === "square" ? 0.95 : 1.0);
  const pad     = Math.round(44 * efs);
  // Strip is 110px — leave it free
  const stripH  = Math.round(110 * efs);
  const usableH = canvasH - stripH;
  const W       = canvasW - pad * 2;
  const shapes: TemplateShape[] = [];

  // Logo dimensions — consistent, prominent
  const logoW = Math.round(160 * efs);
  const logoH = Math.round(56 * efs);

  switch (style) {

    // ── 1. HEADLINE ONLY ─────────────────────────────────────────────────────
    // Left: logo + massive headline + proof
    // Right: hero image, full height
    // Layout fills the square perfectly
    case "headline-only": {
      const F      = BEBAS_NEUE;
      const splitX = Math.round(canvasW * 0.50);
      const textW  = splitX - pad - Math.round(16 * efs);

      // Hero — right half
      shapes.push(IMG("hero_person", splitX, 0, canvasW - splitX, usableH, "cover", 0));
      shapes.push(SCRIM(splitX, 0, Math.round(100 * efs), usableH, 90, [
        { stop: 0, color: `${palette.bg}ff` }, { stop: 1, color: "#00000000" },
      ]));
      // Secondary — bottom-right corner of image area
      shapes.push(IMG("dashboard_image",
        splitX + Math.round(16 * efs), usableH - Math.round(220 * efs),
        canvasW - splitX - Math.round(24 * efs), Math.round(200 * efs),
        "cover", Math.round(12 * efs), Z_HERO + 2, true));

      // Logo — top-left
      shapes.push(LOGO(pad, Math.round(28 * efs), logoW, logoH));

      // Headline — fills most of left column
      const hSize = Math.round(116 * efs);
      const hY    = Math.round(usableH * 0.18);
      shapes.push(T("hook", pad, hY, textW, Math.round(hSize * 2.6),
        hSize, 900, palette.text, F, "left",
        { lineHeight: 0.93, letterSpacing: -1 }));

      // Accent bar
      shapes.push(R(Math.round(6 * efs), hY, Math.round(10 * efs),
        Math.round(hSize * 2.6), palette.accent, 999, { zIndex: Z_DECOR + 1 }));

      // Proof — below headline
      shapes.push(T("proof", pad, hY + Math.round(hSize * 2.8),
        textW, Math.round(60 * efs),
        Math.round(26 * efs), 600, palette.muted, F, "left",
        { letterSpacing: 1.5 }));

      // Gradient rule
      shapes.push(R(pad, hY + Math.round(hSize * 2.8) + Math.round(46 * efs),
        Math.round(textW * 0.40), Math.round(5 * efs), palette.accent, 999,
        { gradientColors: palette.accentGradient, gradientAngle: 90 }));
      break;
    }

    // ── 2. CTA DOMINANT ──────────────────────────────────────────────────────
    // Top half: hero image with logo overlay
    // Bottom half: hook + massive CTA — no blank space
    case "cta-dominant": {
      const F      = OSWALD;
      const heroH  = Math.round(usableH * 0.42);
      const contentY = heroH + Math.round(28 * efs);

      // Hero — top strip, full width
      shapes.push(IMG("hero_person", 0, 0, canvasW, heroH, "cover", 0));
      shapes.push(SCRIM(0, Math.round(heroH * 0.50), canvasW, Math.round(heroH * 0.50), 180, [
        { stop: 0, color: "#00000000" }, { stop: 1, color: `${palette.bg}ff` },
      ]));

      // Logo — over hero, top-left
      shapes.push(LOGO(pad, Math.round(24 * efs), logoW, logoH));

      // Secondary — top-right corner, small
      shapes.push(IMG("dashboard_image",
        canvasW - Math.round(170 * efs), Math.round(24 * efs),
        Math.round(148 * efs), Math.round(heroH - 48 * efs),
        "cover", Math.round(12 * efs), Z_HERO + 2, true));
      shapes.push(R(canvasW - Math.round(172 * efs), Math.round(22 * efs),
        Math.round(152 * efs), Math.round(heroH - 44 * efs),
        "transparent", Math.round(14 * efs),
        { borderWidth: Math.round(2 * efs), borderColor: palette.accent, zIndex: Z_HERO + 1 }));

      // Hook — compact, below hero
      shapes.push(T("hook", pad, contentY, W, Math.round(76 * efs),
        Math.round(54 * efs), 900, palette.text, F, "center",
        { lineHeight: 0.94, letterSpacing: 0.3 }));

      // Proof — one tight line
      shapes.push(T("proof", pad, contentY + Math.round(82 * efs), W, Math.round(60 * efs),
        Math.round(24 * efs), 500, palette.muted, F, "center",
        { letterSpacing: 1.5 }));

      // CTA — large, fills width, tight to proof
      const ctaY = contentY + Math.round(122 * efs);
      const ctaH = Math.round(usableH - ctaY - Math.round(20 * efs));
      shapes.push(...CTA(pad, ctaY, W, Math.max(ctaH, Math.round(90 * efs)), palette, brand, F, efs));
      break;
    }

    // ── 3. STAT CALLOUT ───────────────────────────────────────────────────────
    // Left: giant number + label
    // Right: hero image, full height
    case "stat-callout": {
      const F       = BARLOW;
      const splitX  = Math.round(canvasW * 0.52);
      const textW   = splitX - pad - Math.round(16 * efs);

      // Hero — right
      shapes.push(IMG("hero_person", splitX, 0, canvasW - splitX, usableH, "cover", 0));
      shapes.push(SCRIM(splitX, 0, Math.round(80 * efs), usableH, 90, [
        { stop: 0, color: `${palette.bg}ff` }, { stop: 1, color: "#00000000" },
      ]));
      // Secondary — below hero image split
      shapes.push(IMG("dashboard_image",
        splitX + Math.round(12 * efs), usableH - Math.round(200 * efs),
        canvasW - splitX - Math.round(20 * efs), Math.round(188 * efs),
        "cover", Math.round(10 * efs), Z_HERO + 2, true));

      // Logo — top-left
      shapes.push(LOGO(pad, Math.round(24 * efs), logoW, logoH));

      // Giant stat
      shapes.push(T("hook_number", pad, Math.round(usableH * 0.14), textW, Math.round(196 * efs),
        Math.round(180 * efs), 900, palette.text, F, "left",
        { lineHeight: 0.88, letterSpacing: -4 }));

      // Rule
      shapes.push(R(pad, Math.round(usableH * 0.14) + Math.round(194 * efs),
        textW, Math.round(5 * efs), palette.accent, 0,
        { gradientColors: palette.accentGradient, gradientAngle: 90 }));

      // Label + subheading
      shapes.push(T("hook_label", pad, Math.round(usableH * 0.14) + Math.round(208 * efs),
        textW, Math.round(80 * efs),
        Math.round(56 * efs), 800, palette.text, F, "left", { lineHeight: 1.05 }));
      shapes.push(T("subheading", pad, Math.round(usableH * 0.14) + Math.round(298 * efs),
        textW, Math.round(80 * efs),
        Math.round(26 * efs), 400, palette.muted, F, "left", { lineHeight: 1.3 }));

      // Hook tag pill
      shapes.push(R(pad, Math.round(usableH * 0.14) + Math.round(358 * efs),
        Math.round(textW * 0.60), Math.round(46 * efs), palette.accent, 999));
      shapes.push(T("hook_tag",
        pad + Math.round(14 * efs), Math.round(usableH * 0.14) + Math.round(358 * efs) + Math.round(10 * efs),
        Math.round(textW * 0.56), Math.round(28 * efs),
        Math.round(22 * efs), 800, "#ffffff", F, "center", { letterSpacing: 1.5 }));
      break;
    }

    // ── 4. EDITORIAL ─────────────────────────────────────────────────────────
    // Elegant: logo top, hero full-width middle band, text bottom
    case "editorial": {
      const F      = PLAYFAIR;
      const heroY  = Math.round(usableH * 0.14);
      const heroH  = Math.round(usableH * 0.38);
      const textY  = heroY + heroH + Math.round(28 * efs);

      // Logo top-left
      shapes.push(LOGO(pad, Math.round(16 * efs), logoW, logoH));

      // Hero — full width middle band with radius
      shapes.push(IMG("hero_person", Math.round(16 * efs), heroY,
        canvasW - Math.round(32 * efs), heroH, "cover", Math.round(14 * efs)));
      shapes.push(SCRIM(Math.round(16 * efs), heroY + Math.round(heroH * 0.45),
        canvasW - Math.round(32 * efs), Math.round(heroH * 0.55), 180, [
          { stop: 0, color: "#00000000" }, { stop: 1, color: `${palette.bg}dd` },
        ]));

      // Secondary — right side, text area
      shapes.push(IMG("dashboard_image",
        canvasW - Math.round(220 * efs), textY,
        Math.round(196 * efs), Math.round(160 * efs), "cover", Math.round(12 * efs),
        Z_HERO + 1, true));

      // Headline — left of text area
      const hSize = Math.round(74 * efs);
      const tW    = canvasW - pad - Math.round(234 * efs);
      shapes.push(T("hook", pad, textY, tW, Math.round(hSize * 2.8),
        hSize, 700, palette.text, F, "left",
        { lineHeight: 1.12, letterSpacing: -0.5, fontStyle: "italic" }));

      // Rule + subheading
      shapes.push(R(pad, textY + Math.round(hSize * 3.0),
        Math.round(tW * 0.35), Math.round(5 * efs), palette.accent, 999,
        { gradientColors: palette.accentGradient, gradientAngle: 90 }));
      shapes.push(T("subheading", pad, textY + Math.round(hSize * 3.0) + Math.round(20 * efs),
        tW, Math.round(80 * efs),
        Math.round(26 * efs), 400, palette.muted, F, "left",
        { lineHeight: 1.45, fontStyle: "italic" }));
      break;
    }

    // ── 5. PROOF FORWARD ─────────────────────────────────────────────────────
    // Hero left strip + large quote right — fills square tightly
    case "proof-forward": {
      const F      = PLAYFAIR;
      const imgW   = Math.round(canvasW * 0.36);
      const textX  = imgW + Math.round(36 * efs);
      const textW  = canvasW - textX - pad;

      // Hero — left strip, full height
      shapes.push(IMG("hero_person", 0, 0, imgW, usableH, "cover", 0));
      shapes.push(SCRIM(Math.round(imgW * 0.62), 0, Math.round(imgW * 0.38), usableH, 90, [
        { stop: 0, color: "#00000000" }, { stop: 1, color: `${palette.bg}ff` },
      ]));
      // Secondary — small, bottom-left
      shapes.push(IMG("dashboard_image",
        Math.round(14 * efs), usableH - Math.round(180 * efs),
        Math.round(imgW - 28 * efs), Math.round(162 * efs),
        "cover", Math.round(10 * efs), Z_HERO + 2, true));

      // Logo — top-right of content
      shapes.push(LOGO(textX, Math.round(22 * efs), logoW, logoH));

      // Large open quote
      shapes.push(T("deco_icon",
        textX - Math.round(6 * efs), Math.round(usableH * 0.06),
        Math.round(100 * efs), Math.round(110 * efs),
        Math.round(140 * efs), 900, hexToRgba(palette.accent, 0.20), F, "left",
        { lineHeight: 0.82 }));

      // Quote body
      shapes.push(T("review_text", textX, Math.round(usableH * 0.16), textW, Math.round(usableH * 0.48),
        Math.round(36 * efs), 700, palette.text, F, "left",
        { lineHeight: 1.38, fontStyle: "italic" }));

      // Author + stars
      shapes.push(T("review_author", textX, Math.round(usableH * 0.67), textW, Math.round(40 * efs),
        Math.round(26 * efs), 800, palette.accent, F, "left", { letterSpacing: 0.3 }));
      shapes.push(T("review_rating", textX, Math.round(usableH * 0.67) + Math.round(46 * efs),
        Math.round(160 * efs), Math.round(30 * efs),
        Math.round(22 * efs), 400, palette.accent, F, "left"));

      // CTA — below stars
      const ctaY = Math.round(usableH * 0.67) + Math.round(82 * efs);
      shapes.push(...CTA(textX, ctaY,
        Math.min(textW, Math.round(380 * efs)), Math.round(70 * efs), palette, brand, F, efs));
      break;
    }

    // ── 6. OFFER CARD ─────────────────────────────────────────────────────────
    // Hero right 35%. Offer left — title + price + CTA stacked tight
    case "offer-card": {
      const F     = BEBAS_NEUE;
      const imgW  = Math.round(canvasW * 0.36);
      const imgX  = canvasW - imgW;
      const textW = imgX - pad - Math.round(18 * efs);

      // Hero — right column
      shapes.push(IMG("hero_person", imgX, 0, imgW, usableH, "cover", 0));
      shapes.push(SCRIM(imgX, 0, Math.round(70 * efs), usableH, 90, [
        { stop: 0, color: `${palette.bg}ff` }, { stop: 1, color: "#00000000" },
      ]));
      shapes.push(IMG("dashboard_image",
        imgX + Math.round(12 * efs), usableH - Math.round(210 * efs),
        Math.round(imgW - 24 * efs), Math.round(192 * efs),
        "cover", Math.round(10 * efs), Z_HERO + 2, true));

      // Logo
      shapes.push(LOGO(pad, Math.round(22 * efs), logoW, logoH));

      // Offer badge
      shapes.push(R(pad, Math.round(92 * efs), Math.round(172 * efs), Math.round(44 * efs), palette.accent, 999));
      shapes.push(T("hook_tag",
        pad + Math.round(12 * efs), Math.round(92 * efs) + Math.round(10 * efs),
        Math.round(148 * efs), Math.round(26 * efs),
        Math.round(19 * efs), 900, "#ffffff", F, "center", { letterSpacing: 2 }));

      // Offer title
      const tSize = Math.round(78 * efs);
      shapes.push(T("offer_title", pad, Math.round(150 * efs), textW, Math.round(tSize * 2.4),
        tSize, 900, palette.text, F, "left",
        { lineHeight: 0.94, letterSpacing: -0.8 }));

      // Price
      shapes.push(T("price_label", pad, Math.round(150 * efs) + Math.round(tSize * 2.6),
        Math.round(320 * efs), Math.round(100 * efs),
        Math.round(96 * efs), 900, palette.accent, F, "left",
        { lineHeight: 0.90, letterSpacing: -3 }));

      // Description
      shapes.push(T("subheading", pad, Math.round(150 * efs) + Math.round(tSize * 2.6) + Math.round(108 * efs),
        textW, Math.round(80 * efs),
        Math.round(26 * efs), 400, palette.muted, F, "left", { letterSpacing: 0.2 }));

      // CTA
      const ctaY = usableH - Math.round(96 * efs);
      shapes.push(...CTA(pad, ctaY, Math.round(textW * 0.85), Math.round(80 * efs), palette, brand, F, efs));
      shapes.push(T("fine_print", pad, ctaY + Math.round(86 * efs),
        Math.round(280 * efs), Math.round(22 * efs),
        Math.round(14 * efs), 400, palette.muted, F, "left"));
      break;
    }

    // ── 7. BULLET LIST ────────────────────────────────────────────────────────
    // Hero top-right quadrant. Logo + hook + 3 bullets fill left/bottom
    case "bullet-list": {
      const F      = OSWALD;
      const heroX  = Math.round(canvasW * 0.52);
      const heroH  = Math.round(usableH * 0.52);
      const bStep  = Math.round((usableH - heroH - Math.round(36 * efs)) / 3);

      // Hero — top-right
      shapes.push(IMG("hero_person", heroX, 0, canvasW - heroX, heroH, "cover", 0));
      shapes.push(SCRIM(heroX, 0, Math.round(80 * efs), heroH, 90, [
        { stop: 0, color: `${palette.bg}ff` }, { stop: 1, color: "#00000000" },
      ]));
      shapes.push(IMG("dashboard_image",
        heroX + Math.round(12 * efs), heroH + Math.round(12 * efs),
        canvasW - heroX - Math.round(20 * efs), usableH - heroH - Math.round(20 * efs),
        "cover", Math.round(10 * efs), Z_HERO, true));

      // Logo + hook — top-left
      shapes.push(LOGO(pad, Math.round(20 * efs), logoW, logoH));
      shapes.push(T("hook", pad, Math.round(86 * efs),
        heroX - pad - Math.round(16 * efs), Math.round(112 * efs),
        Math.round(56 * efs), 900, palette.text, F, "left", { lineHeight: 0.94 }));

      // Rule
      shapes.push(R(pad, Math.round(206 * efs), Math.round(80 * efs),
        Math.round(6 * efs), palette.accent, 999));

      // 3 numbered bullets — bottom half, full width
      const bStart = Math.round(220 * efs);
      const bFields = ["bullet_1","bullet_2","bullet_3"] as const;
      bFields.forEach((field, i) => {
        const by = bStart + i * bStep;
        // Ghost number
        shapes.push(T(`meta_${i+1}_value`,
          pad, by, Math.round(68 * efs), Math.round(72 * efs),
          Math.round(64 * efs), 900, hexToRgba(palette.accent, 0.14), F, "left",
          { lineHeight: 0.90 }));
        // Bullet text
        shapes.push(T(field,
          pad + Math.round(74 * efs), by + Math.round(10 * efs),
          heroX - pad - Math.round(90 * efs), Math.round(bStep - 14 * efs),
          Math.round(38 * efs), 700, palette.text, F, "left", { lineHeight: 1.0 }));
        if (i < 2) shapes.push(R(pad, by + bStep - Math.round(6 * efs),
          heroX - pad - Math.round(16 * efs), Math.round(1 * efs),
          hexToRgba(palette.accent, 0.16), 0));
      });
      break;
    }

    // ── 8. SIDE BY SIDE ──────────────────────────────────────────────────────
    // Classic split — image left, content right
    case "side-by-side": {
      const F      = BARLOW;
      const splitX = Math.round(canvasW * 0.46);
      const cX     = splitX + Math.round(10 * efs);
      const cW     = canvasW - cX - pad;

      // Hero — left half
      shapes.push(IMG("hero_person", 0, 0, splitX, usableH, "cover", 0));
      shapes.push(SCRIM(Math.round(splitX * 0.75), 0, Math.round(splitX * 0.25), usableH, 90, [
        { stop: 0, color: "#00000000" }, { stop: 1, color: `${palette.bg}dd` },
      ]));
      // Secondary — bottom of left strip
      shapes.push(IMG("dashboard_image",
        Math.round(16 * efs), usableH - Math.round(210 * efs),
        Math.round(splitX - 28 * efs), Math.round(190 * efs),
        "cover", Math.round(10 * efs), Z_HERO + 2, true));

      // Bold accent divider
      shapes.push(R(splitX, 0, Math.round(8 * efs), usableH, palette.accent, 0, { zIndex: Z_DECOR + 1 }));

      // Logo — top of right column
      shapes.push(LOGO(cX, Math.round(22 * efs), logoW, logoH));

      // Hook — large, fills right column
      const hSize = Math.round(68 * efs);
      shapes.push(T("hook", cX, Math.round(90 * efs), cW, Math.round(hSize * 3.4),
        hSize, 900, palette.text, F, "left",
        { lineHeight: 0.94, letterSpacing: 0.3 }));

      // Rule
      shapes.push(R(cX, Math.round(90 * efs) + Math.round(hSize * 3.6),
        Math.round(cW * 0.40), Math.round(5 * efs), palette.accent, 999,
        { gradientColors: palette.accentGradient, gradientAngle: 90 }));

      // Subheading
      shapes.push(T("subheading",
        cX, Math.round(90 * efs) + Math.round(hSize * 3.6) + Math.round(26 * efs),
        cW, Math.round(80 * efs),
        Math.round(26 * efs), 400, palette.muted, F, "left", { lineHeight: 1.38 }));

      // CTA
      const ctaY = Math.round(90 * efs) + Math.round(hSize * 3.6) + Math.round(90 * efs);
      shapes.push(...CTA(cX, ctaY, cW, Math.round(80 * efs), palette, brand, F, efs));
      break;
    }

    // ── 9. FULL BLEED IMAGE ───────────────────────────────────────────────────
    // Photo covers everything, deep scrim bottom 55%, text/CTA over it
    case "full-bleed-image": {
      const F = BEBAS_NEUE;

      shapes.push(IMG("hero_person", 0, 0, canvasW, usableH, "cover", 0));
      // Top fade for logo
      shapes.push(SCRIM(0, 0, canvasW, Math.round(usableH * 0.22), 180, [
        { stop: 0, color: "#000000aa" }, { stop: 1, color: "#00000000" },
      ]));
      // Bottom deep scrim for text
      shapes.push(SCRIM(0, Math.round(usableH * 0.40), canvasW, Math.round(usableH * 0.60), 180, [
        { stop: 0, color: "#00000000" },
        { stop: 0.35, color: "#000000bb" },
        { stop: 1, color: "#000000f0" },
      ]));

      // Secondary — top-right
      shapes.push(IMG("dashboard_image",
        canvasW - Math.round(220 * efs), Math.round(20 * efs),
        Math.round(200 * efs), Math.round(148 * efs),
        "cover", Math.round(12 * efs), Z_HERO + 2, true));
      shapes.push(R(canvasW - Math.round(222 * efs), Math.round(18 * efs),
        Math.round(204 * efs), Math.round(152 * efs), "transparent", Math.round(14 * efs),
        { borderWidth: Math.round(3 * efs), borderColor: palette.accent, zIndex: Z_HERO + 1 }));

      // Logo — top-left
      shapes.push(LOGO(pad, Math.round(22 * efs), logoW, logoH));

      // Headline — large, over scrim
      const hSize = Math.round(96 * efs);
      shapes.push(T("hook", pad, Math.round(usableH * 0.46), W, Math.round(hSize * 2.4),
        hSize, 900, "#ffffff", F, "left",
        { lineHeight: 0.94, letterSpacing: -1,
          shadowBlur: 16, shadowColor: "#000000bb", zIndex: Z_TEXT + 2 }));

      // CTA — over scrim
      const ctaY = Math.round(usableH * 0.78);
      shapes.push(...CTA(pad, ctaY,
        Math.round(380 * efs), Math.round(78 * efs), palette, brand, F, efs));

      // Proof pill — beside CTA
      shapes.push(T("proof",
        pad + Math.round(400 * efs), ctaY + Math.round(20 * efs),
        W - Math.round(400 * efs), Math.round(60 * efs),
        Math.round(24 * efs), 500, "rgba(255,255,255,0.65)", F, "left",
        { zIndex: Z_TEXT + 2 }));
      break;
    }

    // ── 10. CONTACT SHOWCASE ─────────────────────────────────────────────────
    // Big company name + contact grid fills left. Hero fills right.
    case "contact-showcase": {
      const F    = SYNE;
      const splitX = Math.round(canvasW * 0.50);
      const imgX   = splitX + Math.round(10 * efs);
      const imgW   = canvasW - imgX;

      // Hero — right half
      shapes.push(IMG("hero_person", imgX, 0, imgW, usableH, "cover", 0));
      shapes.push(SCRIM(imgX, 0, Math.round(80 * efs), usableH, 90, [
        { stop: 0, color: `${palette.bg}ff` }, { stop: 1, color: "#00000000" },
      ]));
      shapes.push(IMG("dashboard_image",
        imgX + Math.round(12 * efs), usableH - Math.round(210 * efs),
        imgW - Math.round(20 * efs), Math.round(192 * efs),
        "cover", Math.round(10 * efs), Z_HERO + 2, true));

      // Logo — top-left
      shapes.push(LOGO(pad, Math.round(22 * efs), logoW, logoH));

      // Company name
      const nameSize = Math.round(82 * efs);
      shapes.push(T("companyName", pad, Math.round(86 * efs),
        splitX - pad - Math.round(16 * efs), Math.round(nameSize * 1.1),
        nameSize, 900, palette.text, F, "left",
        { lineHeight: 0.90, letterSpacing: -1 }));

      // Tagline
      shapes.push(T("subheading", pad, Math.round(86 * efs) + Math.round(nameSize * 1.2),
        splitX - pad - Math.round(16 * efs), Math.round(80 * efs),
        Math.round(26 * efs), 400, palette.muted, F, "left", { letterSpacing: 0.8 }));

      // Rule
      shapes.push(R(pad, Math.round(86 * efs) + Math.round(nameSize * 1.3) + Math.round(44 * efs),
        splitX - pad - Math.round(16 * efs), Math.round(4 * efs), palette.accent, 0));

      // Contact grid — 2 cols, 3 rows
      const gY   = Math.round(86 * efs) + Math.round(nameSize * 1.3) + Math.round(58 * efs);
      const colW = Math.round((splitX - pad * 2) / 2) - Math.round(10 * efs);
      const itemH= Math.round(76 * efs);

      [1,2,3,4,5,6].forEach(i => {
        const col = (i - 1) % 2;
        const row = Math.floor((i - 1) / 2);
        const ix  = pad + col * (colW + Math.round(20 * efs));
        const iy  = gY + row * itemH;
        // Label (CALL US, EMAIL etc.) — small uppercase
        shapes.push(T(`meta_${i}_key`,
          ix, iy, colW, Math.round(18 * efs),
          Math.round(11 * efs), 800, palette.muted, F, "left",
          { letterSpacing: 2.5 }));
        // Value (phone, email etc.) — bold, larger
        shapes.push(T(`meta_${i}_value`,
          ix, iy + Math.round(20 * efs), colW, Math.round(38 * efs),
          Math.round(22 * efs), 700, palette.text, F, "left"));
      });
      break;
    }

    // ── 11. ANNOUNCEMENT ─────────────────────────────────────────────────────
    // Big bold headline fills left. Hero fills right bottom. Logo top.
    case "announcement": {
      const F    = OSWALD;
      const imgW = Math.round(canvasW * 0.42);
      const imgH = Math.round(usableH * 0.52);
      const imgX = canvasW - imgW;
      const imgY = usableH - imgH;

      // Hero — bottom-right
      shapes.push(IMG("hero_person", imgX, imgY, imgW, imgH, "cover", Math.round(14 * efs)));
      shapes.push(SCRIM(imgX, imgY, Math.round(80 * efs), imgH, 90, [
        { stop: 0, color: `${palette.bg}ff` }, { stop: 1, color: "#00000000" },
      ]));
      // Secondary — top-right
      shapes.push(IMG("dashboard_image",
        imgX, Math.round(16 * efs),
        imgW, imgY - Math.round(28 * efs),
        "cover", Math.round(12 * efs), Z_HERO + 1, true));

      // Logo
      shapes.push(LOGO(pad, Math.round(18 * efs), logoW, logoH));

      // Tag badge
      shapes.push(R(pad, Math.round(84 * efs), Math.round(192 * efs), Math.round(46 * efs), palette.accent, 999));
      shapes.push(T("hook_tag",
        pad + Math.round(12 * efs), Math.round(84 * efs) + Math.round(10 * efs),
        Math.round(168 * efs), Math.round(28 * efs),
        Math.round(19 * efs), 900, "#ffffff", F, "center", { letterSpacing: 2 }));

      // Headline
      const hSize = Math.round(90 * efs);
      const hY    = Math.round(148 * efs);
      const hW    = imgX - pad - Math.round(20 * efs);
      shapes.push(T("hook", pad, hY, hW, Math.round(hSize * 2.8),
        hSize, 900, palette.text, F, "left",
        { lineHeight: 0.92, letterSpacing: -0.5 }));

      // Accent block + date detail
      shapes.push(R(0, hY + Math.round(hSize * 2.9),
        Math.round(12 * efs), Math.round(90 * efs),
        palette.accent, 0, { zIndex: Z_DECOR + 1 }));
      shapes.push(T("hook_pre",
        Math.round(26 * efs), hY + Math.round(hSize * 2.9) + Math.round(12 * efs),
        hW - Math.round(26 * efs), Math.round(68 * efs),
        Math.round(36 * efs), 600, palette.accent, F, "left", { letterSpacing: 0.3 }));

      // White CTA
      const ctaY = hY + Math.round(hSize * 2.9) + Math.round(108 * efs);
      shapes.push(R(pad, ctaY, Math.round(380 * efs), Math.round(76 * efs),
        "#ffffff", Math.round(10 * efs), { zIndex: Z_CTA }));
      shapes.push(T("cta",
        pad + Math.round(16 * efs), ctaY + Math.round(18 * efs),
        Math.round(348 * efs), Math.round(42 * efs),
        Math.round(36 * efs), 900, palette.bg, F, "center",
        { zIndex: Z_CTA + 1, letterSpacing: 0.8 }));
      break;
    }

    // ── 12. MINIMAL LOGO ─────────────────────────────────────────────────────
    // Brand awareness. Logo + tagline centered. Hero texture bg. Secondary accent.
    case "minimal-logo": {
      const F = SYNE;

      // Hero — full background, very heavy scrim = texture
      shapes.push(IMG("hero_person", 0, 0, canvasW, usableH, "cover", 0));
      shapes.push(SCRIM(0, 0, canvasW, usableH, 180, [
        { stop: 0, color: `${palette.bg}d0` }, { stop: 1, color: `${palette.bg}f0` },
      ]));

      // Secondary — bottom-right, prominent
      shapes.push(IMG("dashboard_image",
        canvasW - Math.round(240 * efs), usableH - Math.round(220 * efs),
        Math.round(220 * efs), Math.round(200 * efs),
        "cover", Math.round(14 * efs), Z_HERO + 2, true));
      shapes.push(R(canvasW - Math.round(242 * efs), usableH - Math.round(222 * efs),
        Math.round(224 * efs), Math.round(204 * efs), "transparent", Math.round(16 * efs),
        { borderWidth: Math.round(3 * efs), borderColor: palette.accent, zIndex: Z_HERO + 1 }));

      // Logo — centered, large
      shapes.push({
        ...LOGO(Math.round(canvasW / 2 - 150 * efs), Math.round(usableH * 0.12),
          Math.round(300 * efs), Math.round(100 * efs)),
      });

      // Company name
      shapes.push(T("companyName", pad, Math.round(usableH * 0.12), W, Math.round(96 * efs),
        Math.round(72 * efs), 900, palette.text, F, "center",
        { letterSpacing: 5, lineHeight: 0.92 }));

      // Rules
      shapes.push(R(pad, Math.round(usableH * 0.33), W, Math.round(2 * efs),
        hexToRgba(palette.accent, 0.35), 0));

      // Big tagline
      shapes.push(T("subheading", pad, Math.round(usableH * 0.38), W, Math.round(160 * efs),
        Math.round(74 * efs), 900, palette.accent, F, "center",
        { lineHeight: 0.92, letterSpacing: -0.8 }));

      shapes.push(R(pad, Math.round(usableH * 0.62), W, Math.round(2 * efs),
        hexToRgba(palette.accent, 0.35), 0));

      // Outline CTA — centered
      const ctaW = Math.round(300 * efs);
      const ctaX = Math.round(canvasW / 2 - ctaW / 2);
      const ctaY = Math.round(usableH * 0.68);
      shapes.push(R(ctaX, ctaY, ctaW, Math.round(68 * efs), "transparent", 999, {
        borderWidth: Math.round(3 * efs), borderColor: palette.accent, zIndex: Z_CTA,
      }));
      shapes.push(T("cta",
        ctaX + Math.round(14 * efs), ctaY + Math.round(16 * efs),
        ctaW - Math.round(28 * efs), Math.round(38 * efs),
        Math.round(32 * efs), 800, palette.accent, F, "center",
        { letterSpacing: 3, zIndex: Z_CTA + 1 }));
      break;
    }
  }

  return shapes;
}