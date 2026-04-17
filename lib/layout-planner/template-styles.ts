/**
 * layout-planner/template-styles.ts
 * ────────────────────────────────────
 * 12 completely distinct template styles.
 *
 * PHILOSOPHY:
 *   - Each style shows AT MOST 2 text elements (+ contact strip)
 *   - Each style has its OWN hardcoded font that defines its character
 *   - No style looks like another
 *   - Contact strip is assembled separately by buildContactStrip()
 *
 * STYLES:
 *   1.  headline-only      BEBAS_NEUE  — full-canvas huge type, nothing else
 *   2.  cta-dominant       OSWALD      — monster CTA button is the whole ad
 *   3.  stat-callout       BARLOW      — one giant number + short label
 *   4.  editorial          PLAYFAIR    — headline + italic subheading, white space
 *   5.  proof-forward      PLAYFAIR    — quote fills canvas, attribution below
 *   6.  offer-card         BEBAS_NEUE  — offer title + price + CTA only
 *   7.  bullet-list        OSWALD      — 3 numbered bullets, no headline needed
 *   8.  side-by-side       BARLOW      — image left / headline right, clean split
 *   9.  full-bleed-image   BEBAS_NEUE  — photo covers all, text overlaid minimal
 *  10.  contact-showcase   SYNE        — contact details ARE the content
 *  11.  announcement       OSWALD      — bold event / news announcement
 *  12.  minimal-logo       SYNE        — logo + one line + CTA, brand awareness
 */

import type {
  NormalizedCampaignData, BrandFingerprint, Palette,
  Orientation, TemplateShape, GradientStop,
} from "./types";
import { seededRng, clamp, isNonEmpty, getAvailableBullets, hexToRgba, makeId } from "./utils";
import {
  BEBAS_NEUE, SYNE, PLAYFAIR, BARLOW, OSWALD,
  Z_TEXT, Z_CTA, Z_DECOR, Z_BG, Z_HERO,
} from "./constants";

// ── Types ──────────────────────────────────────────────────────────────────────
export type TemplateStyleName =
  | "headline-only"
  | "cta-dominant"
  | "stat-callout"
  | "editorial"
  | "proof-forward"
  | "offer-card"
  | "bullet-list"
  | "side-by-side"
  | "full-bleed-image"
  | "contact-showcase"
  | "announcement"
  | "minimal-logo";

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

  // Remove styles that need missing data
  if (!isNonEmpty(campaign.review_text) && !isNonEmpty(campaign.proof))
    pool = pool.filter(s => s !== "proof-forward");
  if (!campaign.offers?.length && !isNonEmpty(campaign.offer_cta) && !isNonEmpty(campaign.price_label))
    pool = pool.filter(s => s !== "offer-card");
  if (!getAvailableBullets(campaign).length)
    pool = pool.filter(s => s !== "bullet-list");

  // Never repeat
  pool = pool.filter(s => s !== previousStyle);
  if (!pool.length) pool = ALL_STYLE_NAMES.filter(s => s !== previousStyle);

  return rng.pick(pool);
}

// ── Shape factory helpers ──────────────────────────────────────────────────────
function T(
  text: string, x: number, y: number, w: number, h: number,
  fontSize: number, weight: number, color: string, font: string,
  align: "left"|"center"|"right" = "left",
  extra: Partial<TemplateShape> = {}
): TemplateShape {
  return {
    id: makeId("t"), type: "text",
    x: Math.round(x), y: Math.round(y),
    width: Math.round(w), height: Math.round(h),
    text, fontSize: Math.round(fontSize), fontWeight: weight,
    textColor: color, textAlign: align,
    fontFamily: font, lineHeight: extra.lineHeight ?? 0.95,
    letterSpacing: extra.letterSpacing ?? 0,
    borderWidth: 0, zIndex: Z_TEXT,
    ...extra,
  } as TemplateShape;
}

function R(
  x: number, y: number, w: number, h: number,
  bg: string, radius = 0, extra: Partial<TemplateShape> = {}
): TemplateShape {
  return {
    id: makeId("r"), type: "rounded-rect",
    x: Math.round(x), y: Math.round(y),
    width: Math.round(w), height: Math.round(h),
    backgroundColor: bg, borderWidth: 0, borderRadius: radius,
    zIndex: Z_DECOR, ...extra,
  } as TemplateShape;
}

function IMG(
  slotKey: string, x: number, y: number, w: number, h: number,
  fit: "cover"|"contain" = "cover", radius = 0
): TemplateShape {
  return {
    id: makeId("img"), type: "image",
    x: Math.round(x), y: Math.round(y),
    width: Math.round(w), height: Math.round(h),
    src: undefined, fit, radius,
    slotKey, slotType: slotKey === "logo" ? "logo" : "image",
    slotRole: slotKey === "logo" ? "logo" : "hero",
    slotVisibleWhenEmpty: slotKey === "logo",
    zIndex: slotKey === "logo" ? 22 : Z_HERO,
    borderWidth: 0,
  } as TemplateShape;
}

// ── Contact strip — always at canvas bottom ────────────────────────────────────
export function buildContactStrip(
  c: NormalizedCampaignData,
  palette: Palette,
  brand: BrandFingerprint,
  canvasW: number,
  canvasH: number,
  efs: number
): TemplateShape[] {
  const shapes: TemplateShape[] = [];
  const biz     = c.businessInfo || {};
  const stripH  = Math.round(96 * efs);
  const stripY  = canvasH - stripH;
  const pad     = Math.round(40 * efs);
  const DF      = brand.displayFont;

  // Background strip
  shapes.push(R(0, stripY, canvasW, stripH, hexToRgba(palette.accent, 0.09), 0, { zIndex: Z_TEXT - 2 }));
  // Top accent line
  shapes.push(R(0, stripY, canvasW, Math.round(3 * efs), palette.accent, 0, { zIndex: Z_TEXT - 1 }));

  // Collect contact data
  const phone   = c.phone   || biz.phone_primary || biz.phone_secondary || "";
  const email   = c.email   || biz.email_primary || biz.email_support   || "";
  const website = c.website || biz.website || c.business_website        || "";
  const wa      = c.whatsapp || biz.whatsapp                            || "";
  const city    = c.city    || biz.city                                 || "";
  const country = c.country || biz.country                              || "";
  const address = [biz.address, city, country].filter(Boolean).join(", ");
  const reg     = c.registration_no || biz.registration_no              || "";
  const vat     = c.vat_number      || biz.vat_number                   || "";

  const fb      = c.facebook_url  || biz.facebook_url  || "";
  const ig      = c.instagram_url || biz.instagram_url || "";
  const li      = c.linkedin_url  || biz.linkedin_url  || "";
  const tt      = c.tiktok_url    || biz.tiktok_url    || "";
  const yt      = c.youtube_url   || biz.youtube_url   || "";

  // Row 1 — identity + primary contact
  const row1: string[] = [];
  if (c.companyName)  row1.push(c.companyName.toUpperCase());
  if (phone)          row1.push(`📞 ${phone}`);
  if (wa && wa !== phone) row1.push(`💬 ${wa}`);
  if (email)          row1.push(`✉ ${email}`);
  if (website)        row1.push(`🌐 ${website.replace(/^https?:\/\//, "")}`);

  // Row 2 — location + socials + registration
  const row2: string[] = [];
  if (address)        row2.push(`📍 ${address}`);
  const socials: string[] = [];
  if (fb) socials.push(`FB: ${fb.replace(/.*facebook\.com\//, "")}`);
  if (ig) socials.push(`IG: @${ig.replace(/.*instagram\.com\//, "").replace(/\/$/, "")}`);
  if (li) socials.push(`IN: ${li.replace(/.*linkedin\.com\/company\//, "")}`);
  if (tt) socials.push(`TT: @${tt.replace(/.*tiktok\.com\/@/, "").replace(/\/$/, "")}`);
  if (yt) socials.push(`YT: ${yt.replace(/.*youtube\.com\/(channel\/|@)?/, "")}`);
  if (socials.length) row2.push(socials.join("  ·  "));
  if (reg) row2.push(`REG: ${reg}`);
  if (vat) row2.push(`VAT: ${vat}`);

  const lineH  = Math.round(24 * efs);
  const fsize1 = Math.round(17 * efs);
  const fsize2 = Math.round(14 * efs);
  const textW  = canvasW - pad * 2;

  if (row1.length) {
    shapes.push(T(
      row1.join("  ·  "),
      pad, stripY + Math.round(12 * efs), textW, lineH,
      fsize1, 700, palette.text, DF, "left",
      { letterSpacing: 0.2, lineHeight: 1.1, zIndex: Z_TEXT + 1 }
    ));
  }

  if (row2.length) {
    shapes.push(T(
      row2.join("  ·  "),
      pad, stripY + lineH + Math.round(18 * efs), textW, lineH,
      fsize2, 400, palette.muted, DF, "left",
      { letterSpacing: 0.2, lineHeight: 1.1, zIndex: Z_TEXT + 1 }
    ));
  }

  // Website accent — top right of strip
  const cleanWeb = website.replace(/^https?:\/\//, "").toUpperCase();
  if (cleanWeb) {
    shapes.push(T(
      cleanWeb,
      canvasW - Math.round(380 * efs), stripY + Math.round(30 * efs),
      Math.round(340 * efs), Math.round(32 * efs),
      Math.round(18 * efs), 800, palette.accent, DF, "right",
      { letterSpacing: 1.0, lineHeight: 1.0, zIndex: Z_TEXT + 2 }
    ));
  }

  return shapes;
}

// ── Main style renderer ────────────────────────────────────────────────────────
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

  const efs     = (canvasW / 1080) * (orientation === "landscape" ? 0.80 : orientation === "square" ? 0.88 : 1.0);
  const pad     = Math.round(50 * efs);
  const stripH  = Math.round(96 * efs);
  const usableH = canvasH - stripH;
  const W       = canvasW - pad * 2;
  const shapes: TemplateShape[] = [];

  // CTA helper — pill or sharp based on brand
  const ctaRadius = brand.cardStyle === "pill" ? 999 : brand.cardStyle === "sharp" ? 6 : Math.round(14 * efs);
  function CTA(text: string, x: number, y: number, w: number, h: number, font: string): TemplateShape[] {
    return [
      R(x, y, w, h, palette.accent, ctaRadius, {
        gradientColors: palette.accentGradient, gradientAngle: 90,
        shadowBlur: Math.round(24 * efs), shadowX: 0, shadowY: Math.round(6 * efs),
        shadowColor: palette.glowColor, zIndex: Z_CTA,
      }),
      T(text.toUpperCase(), x + Math.round(16 * efs), y + Math.round(h * 0.22),
        w - Math.round(32 * efs), Math.round(h * 0.58),
        Math.round(38 * efs), 900, "#ffffff", font, "center",
        { letterSpacing: 1.5, lineHeight: 1.0, zIndex: Z_CTA + 1 }
      ),
    ];
  }

  switch (style) {

    // ─────────────────────────────────────────────────────────────────────────
    // 1. HEADLINE ONLY — Bebas Neue — massive type, 1 element, raw power
    // Reference: TouchPeace anxiety/stress post
    // ─────────────────────────────────────────────────────────────────────────
    case "headline-only": {
      const F     = BEBAS_NEUE;
      const lines = campaign.hook.split(/\n|(?<=.{22})\s/g).slice(0, 3);
      const hSize = clamp(
        lines.length === 1 ? Math.round(168 * efs) :
        lines.length === 2 ? Math.round(138 * efs) : Math.round(108 * efs),
        60, Math.round(180 * efs)
      );
      const lineH  = Math.round(hSize * 0.98);
      const totalH = lines.length * lineH;
      const startY = Math.round((usableH - totalH) / 2);

      lines.forEach((line, i) => {
        const isAccent = i === lines.length - 1 && lines.length > 1;
        shapes.push(T(
          line.toUpperCase(), pad, startY + i * lineH, W, lineH + 10,
          hSize, 900, isAccent ? palette.textEmphasis : palette.text, F, "left",
          { lineHeight: 0.95, letterSpacing: -1 }
        ));
      });

      // Bold left accent bar
      shapes.push(R(Math.round(6 * efs), startY, Math.round(10 * efs), totalH, palette.accent, 999, { zIndex: Z_DECOR + 1 }));

      // Tagline if any — small, bottom area
      if (campaign.subheading || campaign.proof) {
        shapes.push(T(
          (campaign.proof || campaign.subheading).toUpperCase(),
          pad, startY + totalH + Math.round(28 * efs), W, Math.round(38 * efs),
          Math.round(24 * efs), 600, palette.muted, F, "left",
          { letterSpacing: 3, lineHeight: 1.1 }
        ));
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. CTA DOMINANT — Oswald — the button IS the ad
    // ─────────────────────────────────────────────────────────────────────────
    case "cta-dominant": {
      const F = OSWALD;

      // Hook — compact, top
      shapes.push(T(
        campaign.hook.toUpperCase(),
        pad, Math.round(usableH * 0.08), W, Math.round(90 * efs),
        Math.round(58 * efs), 800, palette.text, F, "center",
        { lineHeight: 0.92, letterSpacing: 0.5 }
      ));

      // Proof / subheading under hook
      const sub = campaign.proof || campaign.subheading;
      if (sub) {
        shapes.push(T(
          sub.toUpperCase(),
          pad, Math.round(usableH * 0.08) + Math.round(96 * efs), W, Math.round(36 * efs),
          Math.round(22 * efs), 600, palette.muted, F, "center",
          { letterSpacing: 2.5, lineHeight: 1.1 }
        ));
      }

      // GIANT CTA — fills middle third
      const ctaW = W;
      const ctaH = Math.round(138 * efs);
      const ctaY = Math.round(usableH * 0.40);
      shapes.push(...CTA(campaign.cta || "Get Started Now", pad, ctaY, ctaW, ctaH, F));

      // Small arrow hint below CTA
      shapes.push(T(
        "↓", pad + Math.round(ctaW / 2) - Math.round(20 * efs), ctaY + ctaH + Math.round(12 * efs),
        Math.round(40 * efs), Math.round(40 * efs),
        Math.round(32 * efs), 400, hexToRgba(palette.accent, 0.4), F, "center"
      ));
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. STAT CALLOUT — Barlow Condensed — Spotify-style milestone
    // Reference: "711,661 all-time streams" post
    // ─────────────────────────────────────────────────────────────────────────
    case "stat-callout": {
      const F = BARLOW;

      // Album / product image top-left if available
      if (imageSlots.hero_person) {
        shapes.push(IMG("hero_person", pad, Math.round(usableH * 0.06), Math.round(260 * efs), Math.round(260 * efs), "cover", Math.round(12 * efs)));
        // Label beside image
        shapes.push(T(
          "LATEST · RELEASE", pad + Math.round(276 * efs), Math.round(usableH * 0.06) + Math.round(14 * efs),
          W - Math.round(276 * efs), Math.round(26 * efs),
          Math.round(17 * efs), 600, palette.muted, F, "left",
          { letterSpacing: 3 }
        ));
        shapes.push(T(
          campaign.companyName || campaign.hook,
          pad + Math.round(276 * efs), Math.round(usableH * 0.06) + Math.round(46 * efs),
          W - Math.round(276 * efs), Math.round(60 * efs),
          Math.round(42 * efs), 800, palette.text, F, "left"
        ));
      }

      // Giant stat number
      const stat = campaign.hook_number || campaign.proof?.match(/[\d,]+/)?.[0] || "500+";
      shapes.push(T(
        stat, pad, Math.round(usableH * 0.38), W, Math.round(220 * efs),
        Math.round(200 * efs), 900, palette.text, F, "left",
        { lineHeight: 0.85, letterSpacing: -4 }
      ));

      // Horizontal rule after stat
      shapes.push(R(pad, Math.round(usableH * 0.38) + Math.round(210 * efs), W, Math.round(4 * efs), palette.accent, 0));

      // Label
      const label = campaign.proof?.replace(/[\d,]+/g, "").trim() || campaign.subheading || campaign.hook;
      shapes.push(T(
        label.toUpperCase(), pad, Math.round(usableH * 0.38) + Math.round(222 * efs), W, Math.round(100 * efs),
        Math.round(56 * efs), 700, palette.text, F, "left",
        { lineHeight: 1.05 }
      ));
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. EDITORIAL — Playfair Display — elegant, serif, lots of white space
    // ─────────────────────────────────────────────────────────────────────────
    case "editorial": {
      const F = PLAYFAIR;
      const hLen  = campaign.hook.length;
      const hSize = hLen < 30 ? Math.round(116 * efs) : hLen < 55 ? Math.round(90 * efs) : Math.round(70 * efs);

      // Headline — centered with generous leading
      shapes.push(T(
        campaign.hook, pad, Math.round(usableH * 0.15), W, Math.round(hSize * 2.6 * efs),
        hSize, 700, palette.text, F, "center",
        { lineHeight: 1.15, letterSpacing: -0.5, fontStyle: "italic" }
      ));

      // Gradient line centered
      shapes.push(R(
        pad + Math.round(W * 0.35), Math.round(usableH * 0.15) + Math.round(hSize * 2.8 * efs),
        Math.round(W * 0.30), Math.round(5 * efs), palette.accent, 999,
        { gradientColors: palette.accentGradient, gradientAngle: 90 }
      ));

      // Subheading — single line, elegant
      if (campaign.subheading) {
        shapes.push(T(
          campaign.subheading,
          pad, Math.round(usableH * 0.15) + Math.round(hSize * 2.8 * efs) + Math.round(30 * efs),
          W, Math.round(56 * efs),
          Math.round(26 * efs), 400, palette.muted, F, "center",
          { lineHeight: 1.5, fontStyle: "italic" }
        ));
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. PROOF FORWARD — Playfair Display — quote fills canvas
    // ─────────────────────────────────────────────────────────────────────────
    case "proof-forward": {
      const F     = PLAYFAIR;
      const quote = campaign.review_text || campaign.proof || campaign.hook;
      const auth  = campaign.review_author || campaign.companyName;

      // Giant open quote mark
      shapes.push(T(
        "\u201C", pad - Math.round(8 * efs), Math.round(usableH * 0.04),
        Math.round(130 * efs), Math.round(140 * efs),
        Math.round(180 * efs), 900, hexToRgba(palette.accent, 0.18), F, "left",
        { lineHeight: 0.8 }
      ));

      // Quote body
      const qLen  = quote.length;
      const qSize = qLen < 80 ? Math.round(48 * efs) : qLen < 140 ? Math.round(38 * efs) : Math.round(30 * efs);
      shapes.push(T(
        `\u201C${quote}\u201D`,
        pad, Math.round(usableH * 0.12), W, Math.round(usableH * 0.54),
        qSize, 700, palette.text, F, "left",
        { lineHeight: 1.40, fontStyle: "italic" }
      ));

      // Attribution
      shapes.push(T(
        `\u2014 ${auth}`,
        pad, Math.round(usableH * 0.70), W, Math.round(44 * efs),
        Math.round(28 * efs), 800, palette.accent, F, "left",
        { letterSpacing: 0.5 }
      ));

      // Stars if rating available
      const rating = campaign.reviews?.[0]?.rating;
      if (rating) {
        const stars = "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
        shapes.push(T(stars, pad, Math.round(usableH * 0.70) + Math.round(52 * efs), Math.round(200 * efs), Math.round(36 * efs),
          Math.round(26 * efs), 400, palette.accent, F, "left"));
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. OFFER CARD — Bebas Neue — price + CTA, retail energy
    // ─────────────────────────────────────────────────────────────────────────
    case "offer-card": {
      const F     = BEBAS_NEUE;
      const offer = campaign.offers?.[0];
      const title = offer?.title || campaign.offer_title || campaign.hook;
      const price = campaign.price_label;
      const desc  = offer?.description || campaign.subheading;
      const exp   = offer?.expires_at;

      // "OFFER" tag
      shapes.push(R(pad, pad, Math.round(180 * efs), Math.round(46 * efs), palette.accent, 999));
      shapes.push(T(
        "SPECIAL OFFER", pad + Math.round(14 * efs), pad + Math.round(10 * efs),
        Math.round(152 * efs), Math.round(28 * efs),
        Math.round(20 * efs), 900, "#ffffff", F, "center",
        { letterSpacing: 2 }
      ));

      // Title
      const tLen  = title.length;
      const tSize = tLen < 25 ? Math.round(108 * efs) : tLen < 45 ? Math.round(84 * efs) : Math.round(64 * efs);
      shapes.push(T(
        title.toUpperCase(), pad, pad + Math.round(62 * efs), W, Math.round(tSize * 2.2 * efs),
        tSize, 900, palette.text, F, "left",
        { lineHeight: 0.92, letterSpacing: -1 }
      ));

      // Price — huge accent
      if (price) {
        shapes.push(T(
          price, pad, pad + Math.round(62 * efs) + Math.round(tSize * 2.4 * efs), Math.round(380 * efs), Math.round(120 * efs),
          Math.round(110 * efs), 900, palette.accent, F, "left",
          { lineHeight: 0.88, letterSpacing: -3 }
        ));
      }

      // Description — single line only
      if (desc) {
        shapes.push(T(
          desc.toUpperCase(), pad, Math.round(usableH * 0.64), W, Math.round(42 * efs),
          Math.round(24 * efs), 400, palette.muted, F, "left",
          { letterSpacing: 0.5 }
        ));
      }

      // CTA
      const ctaY = Math.round(usableH * 0.76);
      shapes.push(...CTA(offer?.cta_text || campaign.cta || "Claim Offer", pad, ctaY, Math.round(420 * efs), Math.round(82 * efs), F));

      if (exp) {
        shapes.push(T(`Expires: ${exp}`, pad, ctaY + Math.round(92 * efs), Math.round(300 * efs), Math.round(26 * efs),
          Math.round(16 * efs), 400, palette.muted, F, "left"));
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. BULLET LIST — Oswald — numbered, structured, bold
    // ─────────────────────────────────────────────────────────────────────────
    case "bullet-list": {
      const F       = OSWALD;
      const bullets = getAvailableBullets(campaign).slice(0, 3);

      // Compact hook at top
      shapes.push(T(
        campaign.hook.toUpperCase(), pad, pad + Math.round(8 * efs), W, Math.round(80 * efs),
        Math.round(60 * efs), 900, palette.text, F, "left",
        { lineHeight: 0.92 }
      ));

      // Accent rule
      shapes.push(R(pad, pad + Math.round(96 * efs), Math.round(90 * efs), Math.round(7 * efs), palette.accent, 999));

      // Numbered bullets
      const bStep  = Math.round(116 * efs);
      const bStart = pad + Math.round(118 * efs);

      bullets.forEach((b, i) => {
        const by = bStart + i * bStep;

        // Large ghost number behind
        shapes.push(T(
          String(i + 1).padStart(2, "0"),
          pad, by - Math.round(8 * efs), Math.round(80 * efs), Math.round(90 * efs),
          Math.round(80 * efs), 900, hexToRgba(palette.accent, 0.12), F, "left",
          { lineHeight: 0.88 }
        ));

        // Bullet text
        shapes.push(T(
          b.toUpperCase(),
          pad + Math.round(88 * efs), by + Math.round(14 * efs),
          W - Math.round(88 * efs), Math.round(64 * efs),
          Math.round(44 * efs), 700, palette.text, F, "left",
          { lineHeight: 1.0 }
        ));

        // Thin divider between bullets
        if (i < bullets.length - 1) {
          shapes.push(R(pad, by + Math.round(92 * efs), W, Math.round(1 * efs),
            hexToRgba(palette.accent, 0.14), 0));
        }
      });
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. SIDE BY SIDE — Barlow — image fills left, type fills right
    // ─────────────────────────────────────────────────────────────────────────
    case "side-by-side": {
      const F      = BARLOW;
      const splitX = Math.round(canvasW * 0.46);
      const cX     = splitX + Math.round(38 * efs);
      const cW     = canvasW - cX - Math.round(32 * efs);
      const imgH   = usableH;

      // Image — left half, full height
      if (imageSlots.hero_person) {
        shapes.push(IMG("hero_person", 0, 0, splitX, imgH, "cover", 0));
      } else {
        shapes.push(R(0, 0, splitX, imgH, palette.surface, 0, { zIndex: Z_HERO }));
      }

      // Accent divider line
      shapes.push(R(splitX, 0, Math.round(8 * efs), imgH, palette.accent, 0, { zIndex: Z_DECOR + 1 }));

      // Headline — right side, fills it
      const hLen  = campaign.hook.length;
      const hSize = hLen < 30 ? Math.round(96 * efs) : hLen < 55 ? Math.round(76 * efs) : Math.round(58 * efs);
      shapes.push(T(
        campaign.hook.toUpperCase(),
        cX, Math.round(usableH * 0.10), cW, Math.round(hSize * 3.2 * efs),
        hSize, 900, palette.text, F, "left",
        { lineHeight: 0.92, letterSpacing: 0.5 }
      ));

      // CTA — right side bottom
      const ctaY = Math.round(usableH * 0.72);
      shapes.push(...CTA(campaign.cta || "Learn More", cX, ctaY, cW, Math.round(78 * efs), F));
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. FULL BLEED IMAGE — Bebas Neue — photo fills all, minimal text overlay
    // ─────────────────────────────────────────────────────────────────────────
    case "full-bleed-image": {
      const F = BEBAS_NEUE;

      // Image covers entire canvas above strip
      if (imageSlots.hero_person) {
        shapes.push(IMG("hero_person", 0, 0, canvasW, usableH, "cover", 0));
        // Heavy gradient scrim — bottom half only
        shapes.push({
          id: makeId("scrim"), type: "gradient-overlay",
          x: 0, y: Math.round(usableH * 0.30),
          width: canvasW, height: Math.round(usableH * 0.70),
          gradientColors: [
            { stop: 0, color: "#00000000" },
            { stop: 0.45, color: "#000000bb" },
            { stop: 1, color: "#000000ee" },
          ] as GradientStop[],
          gradientAngle: 180,
          backgroundColor: "transparent", borderWidth: 0, zIndex: Z_HERO + 1,
        } as TemplateShape);
      } else {
        shapes.push(R(0, 0, canvasW, usableH, palette.surface, 0, { zIndex: Z_HERO }));
      }

      // Headline — bottom left, over scrim
      const hLen  = campaign.hook.length;
      const hSize = hLen < 35 ? Math.round(108 * efs) : Math.round(80 * efs);
      shapes.push(T(
        campaign.hook.toUpperCase(),
        pad, Math.round(usableH * 0.52), W, Math.round(hSize * 2.2 * efs),
        hSize, 900, "#ffffff", F, "left",
        { lineHeight: 0.92, letterSpacing: -1, shadowBlur: 10, shadowColor: "#00000099", zIndex: Z_TEXT + 2 }
      ));

      // CTA — bottom area, accent pill
      const ctaY = Math.round(usableH * 0.82);
      shapes.push(...CTA(campaign.cta || "Find Out More", pad, ctaY, Math.round(380 * efs), Math.round(76 * efs), F));
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 10. CONTACT SHOWCASE — Syne — contact details ARE the product
    // Directory-ad / Yellow Pages style
    // ─────────────────────────────────────────────────────────────────────────
    case "contact-showcase": {
      const F   = SYNE;
      const biz = campaign.businessInfo || {};

      // Company name — massive
      const nameSize = (campaign.companyName || "").length < 12
        ? Math.round(116 * efs) : Math.round(86 * efs);
      shapes.push(T(
        (campaign.companyName || "Your Business").toUpperCase(),
        pad, pad, W, Math.round(nameSize * 1.1 * efs),
        nameSize, 900, palette.text, F, "left",
        { lineHeight: 0.88, letterSpacing: -1 }
      ));

      // Tagline / hook — one line
      const tag = campaign.subheading || campaign.hook || biz.tagline;
      if (tag) {
        shapes.push(T(
          tag.toUpperCase(), pad, pad + Math.round(nameSize * 1.2 * efs), W, Math.round(42 * efs),
          Math.round(24 * efs), 400, palette.muted, F, "left",
          { letterSpacing: 1.5 }
        ));
      }

      // Full-width rule
      shapes.push(R(pad, pad + Math.round(nameSize * 1.3 * efs) + Math.round(50 * efs), W, Math.round(3 * efs), palette.accent, 0));

      // Contact grid — 2 columns
      const phone   = campaign.phone   || biz.phone_primary;
      const email   = campaign.email   || biz.email_primary;
      const website = campaign.website || biz.website;
      const address = [biz.address, biz.city, biz.country].filter(Boolean).join(", ");
      const wa      = campaign.whatsapp || biz.whatsapp;

      const items = [
        phone   && { icon: "📞", label: "CALL",     val: phone },
        wa      && wa !== phone && { icon: "💬", label: "WHATSAPP", val: wa },
        email   && { icon: "✉",  label: "EMAIL",    val: email },
        website && { icon: "🌐", label: "VISIT",    val: website.replace(/^https?:\/\//, "") },
        address && { icon: "📍", label: "FIND US",  val: address },
      ].filter(Boolean) as Array<{icon:string; label:string; val:string}>;

      const gY     = pad + Math.round(nameSize * 1.3 * efs) + Math.round(62 * efs);
      const colW   = Math.round(W / 2) - Math.round(12 * efs);
      const itemH  = Math.round(92 * efs);

      items.slice(0, 6).forEach((item, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const ix  = pad + col * (colW + Math.round(24 * efs));
        const iy  = gY + row * itemH;

        shapes.push(T(item.icon, ix, iy + Math.round(10 * efs), Math.round(34 * efs), Math.round(38 * efs),
          Math.round(26 * efs), 400, palette.accent, F, "left"));
        shapes.push(T(item.label, ix + Math.round(42 * efs), iy + Math.round(6 * efs),
          colW - Math.round(42 * efs), Math.round(20 * efs),
          Math.round(13 * efs), 800, palette.muted, F, "left", { letterSpacing: 2.5 }));
        shapes.push(T(item.val, ix + Math.round(42 * efs), iy + Math.round(26 * efs),
          colW - Math.round(42 * efs), Math.round(40 * efs),
          Math.round(24 * efs), 700, palette.text, F, "left"));
      });
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 11. ANNOUNCEMENT — Oswald — bold event / news, poster energy
    // ─────────────────────────────────────────────────────────────────────────
    case "announcement": {
      const F = OSWALD;

      // Tag at top
      const tag = campaign.hook_tag || "ANNOUNCEMENT";
      shapes.push(R(pad, pad, Math.round(200 * efs), Math.round(48 * efs), palette.accent, 999));
      shapes.push(T(
        tag.toUpperCase(), pad + Math.round(14 * efs), pad + Math.round(11 * efs),
        Math.round(172 * efs), Math.round(28 * efs),
        Math.round(20 * efs), 900, "#ffffff", F, "center",
        { letterSpacing: 2 }
      ));

      // Main headline — very large
      const hLen  = campaign.hook.length;
      const hSize = hLen < 28 ? Math.round(128 * efs) : hLen < 50 ? Math.round(100 * efs) : Math.round(78 * efs);
      const hY    = pad + Math.round(68 * efs);
      shapes.push(T(
        campaign.hook.toUpperCase(), pad, hY, W, Math.round(hSize * 2.5 * efs),
        hSize, 900, palette.text, F, "left",
        { lineHeight: 0.90, letterSpacing: -0.5 }
      ));

      // Left accent block beside detail
      shapes.push(R(
        0, hY + Math.round(hSize * 2.6 * efs),
        Math.round(12 * efs), Math.round(100 * efs),
        palette.accent, 0, { zIndex: Z_DECOR + 1 }
      ));

      // Detail line (hook_pre = date / venue / subtitle)
      if (campaign.hook_pre) {
        shapes.push(T(
          campaign.hook_pre.toUpperCase(),
          Math.round(30 * efs), hY + Math.round(hSize * 2.6 * efs) + Math.round(10 * efs),
          W - Math.round(30 * efs), Math.round(76 * efs),
          Math.round(40 * efs), 600, palette.accent, F, "left",
          { letterSpacing: 0.5 }
        ));
      }

      // CTA — white background (high contrast)
      const ctaY = Math.round(usableH * 0.78);
      shapes.push(R(pad, ctaY, Math.round(400 * efs), Math.round(78 * efs), "#ffffff", Math.round(10 * efs), { zIndex: Z_CTA }));
      shapes.push(T(
        (campaign.cta || "Register Now").toUpperCase(),
        pad + Math.round(16 * efs), ctaY + Math.round(20 * efs),
        Math.round(368 * efs), Math.round(42 * efs),
        Math.round(38 * efs), 900, palette.bg, F, "center",
        { zIndex: Z_CTA + 1, letterSpacing: 1 }
      ));
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 12. MINIMAL LOGO — Syne — brand awareness, almost empty canvas
    // ─────────────────────────────────────────────────────────────────────────
    case "minimal-logo": {
      const F = SYNE;

      // Logo — centered top third
      if (imageSlots.logo) {
        shapes.push(IMG("logo", Math.round(canvasW / 2 - 130 * efs), Math.round(usableH * 0.12),
          Math.round(260 * efs), Math.round(90 * efs), "contain", 0));
      }
      // Company name as fallback / alongside
      shapes.push(T(
        campaign.companyName.toUpperCase(),
        pad, Math.round(usableH * 0.12), W, Math.round(90 * efs),
        Math.round(68 * efs), 900, palette.text, F, "center",
        { letterSpacing: 4, lineHeight: 0.9 }
      ));

      // Full-width rule
      shapes.push(R(pad, Math.round(usableH * 0.32), W, Math.round(2 * efs), hexToRgba(palette.accent, 0.3), 0));

      // Single tagline — large, centered, accent colour
      const tagline = campaign.subheading || campaign.hook;
      shapes.push(T(
        tagline.toUpperCase(),
        pad, Math.round(usableH * 0.38), W, Math.round(160 * efs),
        Math.round(82 * efs), 900, palette.accent, F, "center",
        { lineHeight: 0.90, letterSpacing: -1 }
      ));

      // Second rule
      shapes.push(R(pad, Math.round(usableH * 0.62), W, Math.round(2 * efs), hexToRgba(palette.accent, 0.3), 0));

      // CTA — outline style
      const ctaY = Math.round(usableH * 0.68);
      const ctaW = Math.round(340 * efs);
      const ctaX = Math.round(canvasW / 2 - ctaW / 2);
      shapes.push(R(ctaX, ctaY, ctaW, Math.round(68 * efs), "transparent", 999, {
        borderWidth: Math.round(3 * efs), borderColor: palette.accent, zIndex: Z_CTA,
      }));
      shapes.push(T(
        (campaign.cta || "Visit Us").toUpperCase(),
        ctaX + Math.round(14 * efs), ctaY + Math.round(16 * efs),
        ctaW - Math.round(28 * efs), Math.round(38 * efs),
        Math.round(32 * efs), 800, palette.accent, F, "center",
        { letterSpacing: 3, zIndex: Z_CTA + 1 }
      ));
      break;
    }
  }

  return shapes;
}