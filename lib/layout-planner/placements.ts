/**
 * layout-planner/placements.ts
 * ──────────────────────────────
 * Pass 5: Exact pixel positions and styles for every text/CTA block.
 *
 * Font sizing is now agency-grade — big, commanding, campaign-ready.
 * The same display font is used for ALL text (hook, bullets, CTA, contact)
 * so the template looks cohesive, not like a Word document.
 * Contact details (phone, email, website, address, social) are ALWAYS included.
 */

import type {
  AICompositionPlan, AICreativeDirection, Palette, AILayoutSkeleton,
  NormalizedCampaignData, BrandFingerprint, PlacementMap,
  AIBlockPlacement, Rect, Orientation,
} from "./types";
import { clamp, getAvailableBullets, getBusinessMetaLine, isNonEmpty } from "./utils";

// ── Font scale multipliers per orientation ────────────────────────────────────
function effectiveFontScale(canvasW: number, orientation: Orientation): number {
  const base = canvasW / 1080;
  if (orientation === "landscape") return base * 0.80;
  if (orientation === "square")    return base * 0.88;
  return base;
}

// ── Single placement builder ───────────────────────────────────────────────────
function make(
  field: AIBlockPlacement["field"],
  rect: Rect,
  palette: Palette,
  composition: AICompositionPlan,
  direction: AICreativeDirection,
  brand: BrandFingerprint,
  efs: number
): AIBlockPlacement {
  // ALL text uses the brand display font — campaign / agency aesthetic
  const DF = brand.displayFont;

  const isCenter =
    composition.layout === "editorial-center-stack" ||
    direction.textAlignmentBias === "center";
  const align: "left" | "center" | "right" = isCenter ? "center" : "left";

  // Font size helper — never call with a tiny value
  const fs = (base: number) => Math.max(16, Math.round(base * efs));

  switch (field) {
    // ── Pre-headline labels ──────────────────────────────────────────────────
    case "hook_tag":
      return { field, rect, style: {
        fontSize: fs(26), fontWeight: 700, textAlign: align,
        color: palette.accent, fontFamily: DF,
        lineHeight: 1.1, letterSpacing: 2.5,
      }};

    case "hook_pre":
      return { field, rect, style: {
        fontSize: fs(34), fontWeight: 700, textAlign: align,
        color: palette.text, fontFamily: DF,
        lineHeight: 1.05, letterSpacing: 1.0,
      }};

    // ── Main headline — BIG, fills space ──────────────────────────────────────
    case "hook": {
      const size =
        composition.elements.headlineSize === "xl" ? fs(148) :
        composition.elements.headlineSize === "lg" ? fs(118) : fs(92);
      return { field, rect, style: {
        fontSize: size, fontWeight: 800, textAlign: align,
        color: palette.text, fontFamily: DF,
        lineHeight: 0.96, letterSpacing: -1,
        shadowBlur:  direction.useGlowEffect ? 24 : 0,
        shadowColor: palette.glowColor,
      }};
    }

    // ── Headline emphasis (second line, accent colour) ─────────────────────
    case "hook_emphasis": {
      const size =
        composition.elements.headlineSize === "xl" ? fs(148) :
        composition.elements.headlineSize === "lg" ? fs(118) : fs(92);
      return { field, rect, style: {
        fontSize: size, fontWeight: 800, textAlign: align,
        color: palette.textEmphasis, fontFamily: DF,
        lineHeight: 0.96, letterSpacing: -1,
        gradientColors: palette.accentGradient, gradientAngle: 90,
        shadowBlur:  direction.useGlowEffect ? 32 : 0,
        shadowColor: palette.glowColor,
      }};
    }

    // ── Subheading ───────────────────────────────────────────────────────────
    case "subheading":
      return { field, rect, style: {
        fontSize: fs(32), fontWeight: 500, textAlign: align,
        color: palette.muted, fontFamily: DF,
        lineHeight: 1.30, letterSpacing: 0.2,
      }};

    // ── Bullets ──────────────────────────────────────────────────────────────
    case "bullets":
      return { field, rect, style: {
        fontSize: fs(30), fontWeight: 700, textAlign: align,
        color: palette.text, fontFamily: DF,
        lineHeight: 1.20, letterSpacing: 0.3,
      }};

    // ── Proof / trust line ───────────────────────────────────────────────────
    case "proof":
      return { field, rect, style: {
        fontSize: fs(26), fontWeight: 700, textAlign: align,
        color: palette.textEmphasis, fontFamily: DF,
        lineHeight: 1.10, letterSpacing: 1.0,
      }};

    // ── Review ───────────────────────────────────────────────────────────────
    case "review_text":
      return { field, rect, style: {
        fontSize: fs(24), fontWeight: 500, textAlign: align,
        color: palette.muted, fontFamily: DF,
        fontStyle: "italic", lineHeight: 1.40,
      }};

    case "review_author":
      return { field, rect, style: {
        fontSize: fs(22), fontWeight: 700, textAlign: align,
        color: palette.accent, fontFamily: DF, lineHeight: 1.1,
      }};

    // ── CTA button text ───────────────────────────────────────────────────────
    case "cta": {
      const isFilled = ["filled","pill","gradient"].includes(composition.elements.ctaStyle);
      return { field, rect, style: {
        fontSize: fs(32), fontWeight: 800, textAlign: "center",
        fontFamily: DF, lineHeight: 1.0, letterSpacing: 1.5,
        color: isFilled ? "#ffffff" : palette.accent,
        backgroundColor: isFilled ? palette.accent : "transparent",
        gradientColors: composition.elements.ctaStyle === "gradient" ? palette.accentGradient : undefined,
        gradientAngle: 90,
        radius: composition.elements.ctaStyle === "pill" ? 999 :
                composition.elements.ctaStyle === "gradient" ? 20 : 16,
      }};
    }

    case "offer_cta":
      return { field, rect, style: {
        fontSize: fs(26), fontWeight: 700, textAlign: align,
        color: palette.accent2, fontFamily: DF, lineHeight: 1.1,
      }};

    // ── Footer / contact details ──────────────────────────────────────────────
    // All contact fields use the SAME font, just smaller — still display font
    case "companyName":
      return { field, rect, style: {
        fontSize: fs(22), fontWeight: 700, textAlign: "left",
        color: palette.text, fontFamily: DF,
        lineHeight: 1.1, letterSpacing: 0.5,
      }};

    case "business_website":
      return { field, rect, style: {
        fontSize: fs(20), fontWeight: 500, textAlign: "right",
        color: palette.accent, fontFamily: DF, lineHeight: 1.1,
      }};

    case "business_meta":
      return { field, rect, style: {
        fontSize: fs(20), fontWeight: 500, textAlign: align,
        color: palette.muted, fontFamily: DF, lineHeight: 1.25,
      }};

    case "sponsors":
      return { field, rect, style: {
        fontSize: fs(18), fontWeight: 600, textAlign: align,
        color: palette.muted, fontFamily: DF, lineHeight: 1.2,
      }};

    case "accreditations":
      return { field, rect, style: {
        fontSize: fs(18), fontWeight: 600, textAlign: align,
        color: palette.muted, fontFamily: DF, lineHeight: 1.2,
      }};

    default:
      return { field, rect, style: {
        fontSize: fs(20), fontWeight: 500, textAlign: align,
        color: palette.muted, fontFamily: DF, lineHeight: 1.2,
      }};
  }
}

// ── Contact block builder ─────────────────────────────────────────────────────
// Assembles ALL contact info from businessInfo + flattened helpers.
// This is ALWAYS rendered — contact details are never optional.
export function buildContactBlock(
  campaign: NormalizedCampaignData,
  palette: Palette,
  brand: BrandFingerprint,
  startX: number,
  startY: number,
  maxWidth: number,
  efs: number
): { shapes: Array<{ text: string; x: number; y: number; width: number; height: number; style: AIBlockPlacement["style"] }> } {
  const biz    = campaign.businessInfo || {};
  const DF     = brand.displayFont;
  const fs     = (n: number) => Math.max(14, Math.round(n * efs));
  const lineH  = Math.round(28 * efs);
  const gap    = Math.round(6  * efs);
  const items: Array<{ text: string; icon: string }> = [];

  // Phone
  const phone = campaign.phone || biz.phone_primary || biz.phone_secondary;
  if (phone) items.push({ icon: "📞", text: phone });

  // WhatsApp
  const wa = campaign.whatsapp || biz.whatsapp;
  if (wa && wa !== phone) items.push({ icon: "💬", text: `WhatsApp: ${wa}` });

  // Email
  const email = campaign.email || biz.email_primary || biz.email_support;
  if (email) items.push({ icon: "✉", text: email });

  // Website
  const website = campaign.website || biz.website || campaign.business_website;
  if (website) items.push({ icon: "🌐", text: website.replace(/^https?:\/\//, "") });

  // Address
  const address = campaign.fullAddress || campaign.address || biz.address;
  const city    = campaign.city    || biz.city;
  const country = campaign.country || biz.country;
  const loc     = [address, city, country].filter(Boolean).join(", ");
  if (loc) items.push({ icon: "📍", text: loc });

  // Social handles (compact)
  const socials: string[] = [];
  const fb  = campaign.facebook_url  || biz.facebook_url;
  const ig  = campaign.instagram_url || biz.instagram_url;
  const li  = campaign.linkedin_url  || biz.linkedin_url;
  const tt  = campaign.tiktok_url    || biz.tiktok_url;
  if (fb) socials.push("fb: " + fb.replace(/.*facebook\.com\//, ""));
  if (ig) socials.push("ig: @" + ig.replace(/.*instagram\.com\//, "").replace(/\/$/, ""));
  if (li) socials.push("in: " + li.replace(/.*linkedin\.com\/company\//, ""));
  if (tt) socials.push("tt: @" + tt.replace(/.*tiktok\.com\/@/, "").replace(/\/$/, ""));
  if (socials.length) items.push({ icon: "◎", text: socials.join("  ·  ") });

  // Registration / VAT
  const reg = campaign.registration_no || biz.registration_no;
  const vat = campaign.vat_number      || biz.vat_number;
  if (reg || vat) {
    const regText = [reg && `Reg: ${reg}`, vat && `VAT: ${vat}`].filter(Boolean).join("  ·  ");
    items.push({ icon: "🏛", text: regText });
  }

  const shapes = items.map((item, i) => ({
    text:  `${item.icon}  ${item.text}`,
    x:     startX,
    y:     startY + i * (lineH + gap),
    width: maxWidth,
    height: lineH,
    style: {
      fontSize:    fs(19),
      fontWeight:  500,
      textAlign:   "left" as const,
      color:       palette.muted,
      fontFamily:  DF,
      lineHeight:  1.15,
      letterSpacing: 0.2,
    },
  }));

  return { shapes };
}

// ── Main placement builder ────────────────────────────────────────────────────
export function buildSequentialFallbackPlacements(
  composition: AICompositionPlan,
  direction: AICreativeDirection,
  palette: Palette,
  skeleton: AILayoutSkeleton,
  campaign: NormalizedCampaignData,
  brand: BrandFingerprint,
  orientation: Orientation
): PlacementMap {
  const placements: PlacementMap   = {};
  const minGap   = skeleton.rules.minGap;
  const zone     = skeleton.zones.content;
  const efs      = effectiveFontScale(skeleton.canvas.width, orientation);
  const contentBottom = zone.y + zone.height;

  let cy = skeleton.zones.headline.y;

  function tryPlace(height: number): Rect | null {
    if (cy + height > contentBottom - 90) return null;
    return { x: skeleton.zones.headline.x, y: cy, width: skeleton.zones.headline.width, height };
  }

  // ── Hook tag (label above headline) ────────────────────────────────────────
  if (composition.elements.showHookTag && campaign.hook_tag) {
    const h = Math.round(34 * efs);
    const r = tryPlace(h);
    if (r) { placements.hook_tag = make("hook_tag", r, palette, composition, direction, brand, efs); cy += h + minGap; }
  }

  // ── Hook pre (descriptor line) ──────────────────────────────────────────────
  if (composition.elements.showHookPre && campaign.hook_pre) {
    const h = Math.round(46 * efs);
    const r = tryPlace(h);
    if (r) { placements.hook_pre = make("hook_pre", r, palette, composition, direction, brand, efs); cy += h + minGap; }
  }

  // ── Main headline — deliberately large ─────────────────────────────────────
  const headlineFontPx =
    composition.elements.headlineSize === "xl" ? Math.round(148 * efs) :
    composition.elements.headlineSize === "lg" ? Math.round(118 * efs) :
                                                  Math.round(92  * efs);

  const hookH    = clamp(Math.round(headlineFontPx * 1.02), 60, contentBottom - cy - 130);
  const hookLines= campaign.hook.includes("\n") ? campaign.hook.split("\n") : null;

  if (direction.headlineMultiColor && hookLines && hookLines.length >= 2) {
    const l1 = Math.round(hookH * 0.44);
    const l2 = Math.round(hookH * 0.56);
    const r1 = tryPlace(l1);
    if (r1) { placements.hook = make("hook", r1, palette, composition, direction, brand, efs); cy += l1 + 6; }
    const r2 = tryPlace(l2);
    if (r2) { placements.hook_emphasis = make("hook_emphasis", r2, palette, composition, direction, brand, efs); cy += l2 + 20; }
  } else {
    const r = tryPlace(hookH);
    if (r) { placements.hook = make("hook", r, palette, composition, direction, brand, efs); cy += hookH + 20; }
  }

  // ── Subheading ──────────────────────────────────────────────────────────────
  if (composition.elements.showSubheading && campaign.subheading) {
    const lineCount = Math.ceil(campaign.subheading.length / 36);
    const h = clamp(lineCount * Math.round(38 * efs), 40, Math.round(150 * efs));
    const r = tryPlace(h);
    if (r) { placements.subheading = make("subheading", r, palette, composition, direction, brand, efs); cy += h + minGap; }
  }

  // ── Bullets ─────────────────────────────────────────────────────────────────
  if (composition.elements.showBullets && getAvailableBullets(campaign).length) {
    const count = getAvailableBullets(campaign).length;
    const h = clamp(count * Math.round(46 * efs) + 8, 46, Math.round(210 * efs));
    const r = tryPlace(h);
    if (r) { placements.bullets = make("bullets", r, palette, composition, direction, brand, efs); cy += h + minGap; }
  }

  // ── Proof / trust ───────────────────────────────────────────────────────────
  if (composition.elements.showProof && campaign.proof) {
    const h = Math.round(36 * efs);
    const r = tryPlace(h);
    if (r) { placements.proof = make("proof", r, palette, composition, direction, brand, efs); cy += h + minGap; }
  }

  // ── Review ──────────────────────────────────────────────────────────────────
  if (composition.elements.showReview && campaign.review_text) {
    const lineCount = Math.ceil(campaign.review_text.length / 42);
    const h = clamp(lineCount * Math.round(28 * efs), 40, Math.round(110 * efs));
    const r = tryPlace(h);
    if (r) {
      placements.review_text = make("review_text", r, palette, composition, direction, brand, efs);
      cy += h + 8;
      if (campaign.review_author) {
        const r2 = tryPlace(Math.round(26 * efs));
        if (r2) placements.review_author = make("review_author", r2, palette, composition, direction, brand, efs);
      }
    }
  }

  // ── CTA — pinned to bottom of content zone ──────────────────────────────────
  placements.cta = make("cta", skeleton.zones.cta, palette, composition, direction, brand, efs);

  if (composition.elements.ctaSecondary && campaign.offer_cta) {
    placements.offer_cta = make(
      "offer_cta",
      {
        x: skeleton.zones.cta.x + skeleton.zones.cta.width + 20,
        y: skeleton.zones.cta.y + 18,
        width: Math.max(120, zone.width - skeleton.zones.cta.width - 36),
        height: Math.round(30 * efs),
      },
      palette, composition, direction, brand, efs
    );
  }

  // ── Footer row: company name + website ─────────────────────────────────────
  if (composition.elements.showFooter && skeleton.zones.footer) {
    const fw = skeleton.zones.footer;
    if (campaign.companyName)
      placements.companyName = make("companyName",
        { x: fw.x, y: fw.y, width: Math.round(fw.width * 0.50), height: fw.height },
        palette, composition, direction, brand, efs);
    if (campaign.business_website)
      placements.business_website = make("business_website",
        { x: fw.x + Math.round(fw.width * 0.54), y: fw.y, width: Math.round(fw.width * 0.44), height: fw.height },
        palette, composition, direction, brand, efs);
  }

  // ── Business meta (type · tagline · location) ───────────────────────────────
  if (composition.elements.showBusinessMeta && skeleton.zones.businessMeta)
    placements.business_meta = make("business_meta", skeleton.zones.businessMeta, palette, composition, direction, brand, efs);

  // ── Sponsors + accreditations ───────────────────────────────────────────────
  if (composition.elements.showSponsors && skeleton.zones.sponsors && campaign.sponsors?.length)
    placements.sponsors = make("sponsors", skeleton.zones.sponsors, palette, composition, direction, brand, efs);

  if (composition.elements.showAccreditations && skeleton.zones.accreditations && campaign.accreditations?.length)
    placements.accreditations = make("accreditations", skeleton.zones.accreditations, palette, composition, direction, brand, efs);

  return placements;
}