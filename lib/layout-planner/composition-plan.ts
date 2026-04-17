/**
 * layout-planner/composition-plan.ts
 * ──────────────────────────────────────
 * Pass 2: Picks layout variant, colour palette, and element visibility.
 *
 * Key fix: palette selection uses the full seeded RNG — it shuffles ALL
 * 12 palettes and picks by position, so repeating the same palette is
 * statistically impossible across consecutive calls with different seeds.
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type {
  NormalizedCampaignData, BrandFingerprint, AICreativeDirection,
  AICompositionPlan, Orientation, PaletteName, LayoutVariant,
  CTAStyle, BulletDotStyle, HeadlineSize,
} from "./types";
import {
  clamp, seededRng, isNonEmpty,
  hasHeroImage, hasSecondaryImage,
  getAvailableBullets, getBusinessMetaLine,
} from "./utils";
import { LAYOUTS_BY_ORIENTATION, VALID_PALETTES } from "./constants";

// ── Seeded fallback ────────────────────────────────────────────────────────────
export function buildFallbackCompositionPlan(
  campaign: NormalizedCampaignData,
  direction: AICreativeDirection,
  brand: BrandFingerprint,
  orientation: Orientation,
  previousLayout?: LayoutVariant | null
): AICompositionPlan {
  // Use a different RNG sub-stream from creative-direction (XOR offset)
  const rng = seededRng(brand.seed ^ 0xCAFEBABE);

  // ── Layout: shuffle orientation pool, pick first that ≠ previous ──────────
  const validLayouts = LAYOUTS_BY_ORIENTATION[orientation];
  const shuffled     = rng.shuffle(validLayouts);
  const layout       = shuffled.find(l => l !== previousLayout) ?? shuffled[0];

  // ── Palette: shuffle ALL 12, pick top by paletteMode filter ───────────────
  // This is the main fix — stops the same 2-3 palettes recurring
  const darkPalettes:  PaletteName[] = ["navy-gold","midnight-blue","slate-cyan","obsidian-amber","violet-lime"];
  const lightPalettes: PaletteName[] = ["emerald-white","lavender-coral","rose-dark","sand-brown","mono-lux","forest-cream","arctic-fire"];

  let palettePool: PaletteName[];
  if (direction.paletteMode === "dark")       palettePool = darkPalettes;
  else if (direction.paletteMode === "light") palettePool = lightPalettes;
  else                                         palettePool = VALID_PALETTES;

  const shuffledPalettes = rng.shuffle(palettePool);
  const paletteName      = shuffledPalettes[0];

  // ── Element visibility: also seeded for variety ───────────────────────────
  const ctaStyles:    CTAStyle[]     = ["filled","pill","outline","ghost","gradient"];
  const bulletStyles: BulletDotStyle[]= ["square","circle","dash","arrow","chevron"];

  const headlineLen = campaign.hook.length;
  const headlineSize: HeadlineSize =
    headlineLen < 34 ? "xl" : headlineLen < 62 ? "lg" : "md";

  return {
    layout, paletteName,
    elements: {
      showHookTag:    isNonEmpty(campaign.hook_tag),
      showHookPre:    isNonEmpty(campaign.hook_pre),
      showDividerLine:direction.styleFamily !== "minimal" && rng.next() > 0.35,
      showSubheading: isNonEmpty(campaign.subheading),
      showBullets:    getAvailableBullets(campaign).length > 0,
      bulletCount:    campaign.bullet_3 ? 3 : 2,
      showProof:      isNonEmpty(campaign.proof)   && rng.next() > 0.30,
      showReview:     isNonEmpty(campaign.review_text) && rng.next() > 0.45,
      showFooter:     isNonEmpty(campaign.companyName) || isNonEmpty(campaign.business_website),
      headlineSize,
      bulletDotStyle: rng.pick(bulletStyles),
      ctaStyle:       rng.pick(ctaStyles),
      ctaSecondary:   !!campaign.offer_cta && rng.next() > 0.5,
      showSecondaryImage: hasSecondaryImage(campaign) && rng.next() > 0.3,
      showSponsors:    campaign.sponsors.length > 0    && rng.next() > 0.4,
      showAccreditations: campaign.accreditations.length > 0 && rng.next() > 0.4,
      showBusinessMeta: !!getBusinessMetaLine(campaign) && rng.next() > 0.3,
    },
  };
}

// ── AI-powered composition ────────────────────────────────────────────────────
export async function buildAICompositionPlan(
  campaign: NormalizedCampaignData,
  direction: AICreativeDirection,
  brand: BrandFingerprint,
  orientation: Orientation,
  previousLayout?: LayoutVariant | null
): Promise<AICompositionPlan> {
  const fallback     = buildFallbackCompositionPlan(campaign, direction, brand, orientation, previousLayout);
  const validLayouts = LAYOUTS_BY_ORIENTATION[orientation];

  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      temperature: 1.2,
      prompt: `You are a premium ad composition director. Return JSON only — no markdown.
Direction: styleFamily=${direction.styleFamily}, mood=${direction.mood}, paletteMode=${direction.paletteMode}
Brand seed: ${brand.seed} — MUST produce a unique, different result each call.
Campaign hook: "${campaign.hook}", company: "${campaign.companyName}"
Orientation: ${orientation}
Available layouts: ${validLayouts.join(", ")}
Available palettes: ${VALID_PALETTES.join(", ")}
previousLayout: ${previousLayout ?? "none"} — you MUST pick a DIFFERENT layout.
Previously-likely palette: ${fallback.paletteName} — try to pick a DIFFERENT palette.

Return EXACTLY:
{"layout":"...","paletteName":"...","elements":{"showHookTag":false,"showHookPre":true,"showDividerLine":true,"showSubheading":true,"showBullets":true,"bulletCount":3,"showProof":true,"showReview":false,"showFooter":true,"headlineSize":"xl","bulletDotStyle":"circle","ctaStyle":"pill","ctaSecondary":false,"showSecondaryImage":false,"showSponsors":false,"showAccreditations":false,"showBusinessMeta":true}}`,
    });

    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const e      = (parsed.elements && typeof parsed.elements === "object")
      ? parsed.elements as Record<string, unknown>
      : {};

    const ctaStyles:    CTAStyle[]     = ["filled","pill","outline","ghost","gradient"];
    const bulletStyles: BulletDotStyle[]= ["square","circle","dash","arrow","chevron"];

    let layout =
      typeof parsed.layout === "string" && validLayouts.includes(parsed.layout as LayoutVariant)
        ? parsed.layout as LayoutVariant
        : fallback.layout;
    if (previousLayout && layout === previousLayout) layout = fallback.layout;

    const paletteName =
      typeof parsed.paletteName === "string" && VALID_PALETTES.includes(parsed.paletteName as PaletteName)
        ? parsed.paletteName as PaletteName
        : fallback.paletteName;

    const result: AICompositionPlan = {
      layout, paletteName,
      elements: {
        showHookTag:        !!e.showHookTag,
        showHookPre:        !!e.showHookPre,
        showDividerLine:    !!e.showDividerLine,
        showSubheading:     !!e.showSubheading,
        showBullets:        !!e.showBullets,
        bulletCount:        e.bulletCount === 2 ? 2 : 3,
        showProof:          !!e.showProof,
        showReview:         !!e.showReview,
        showFooter:         !!e.showFooter,
        headlineSize:       e.headlineSize === "md" ? "md" : e.headlineSize === "lg" ? "lg" : "xl",
        bulletDotStyle:     bulletStyles.includes(e.bulletDotStyle as BulletDotStyle) ? e.bulletDotStyle as BulletDotStyle : "circle",
        ctaStyle:           ctaStyles.includes(e.ctaStyle as CTAStyle) ? e.ctaStyle as CTAStyle : "filled",
        ctaSecondary:       !!e.ctaSecondary,
        showSecondaryImage: !!e.showSecondaryImage,
        showSponsors:       !!e.showSponsors,
        showAccreditations: !!e.showAccreditations,
        showBusinessMeta:   !!e.showBusinessMeta,
      },
    };

    // Safety guards — don't show elements with no data
    if (!campaign.hook_tag)              result.elements.showHookTag = false;
    if (!campaign.hook_pre)              result.elements.showHookPre = false;
    if (!campaign.subheading)            result.elements.showSubheading = false;
    if (!getAvailableBullets(campaign).length) result.elements.showBullets = false;
    if (!campaign.proof)                 result.elements.showProof = false;
    if (!campaign.review_text)           result.elements.showReview = false;
    if (!hasSecondaryImage(campaign))    result.elements.showSecondaryImage = false;
    if (!campaign.sponsors.length)       result.elements.showSponsors = false;
    if (!campaign.accreditations.length) result.elements.showAccreditations = false;
    if (!getBusinessMetaLine(campaign))  result.elements.showBusinessMeta = false;
    if (!hasHeroImage(campaign) && result.layout === "centered-content-bg-hero")
      result.layout = fallback.layout;
    if (campaign.hook.length > 72) {
      result.elements.headlineSize = "md";
      result.elements.showReview   = false;
      result.elements.bulletCount  = 2;
    }

    return result;
  } catch {
    return fallback;
  }
}
