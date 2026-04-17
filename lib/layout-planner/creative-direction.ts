/**
 * layout-planner/creative-direction.ts
 * ──────────────────────────────────────
 * Pass 1: Determines the visual style DNA of the ad.
 *
 * Key fix: The fallback now uses seededRng so every call with a different
 * brand seed produces a genuinely different style — not a hash % N pattern.
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type {
  NormalizedCampaignData, BrandFingerprint, AICreativeDirection,
  Orientation, StyleFamily, Mood, Density, PaletteMode, AlignmentBias,
} from "./types";
import { clamp, seededRng, hasHeroImage } from "./utils";

// ── Seeded fallback (no AI) ────────────────────────────────────────────────────
export function buildFallbackCreativeDirection(
  campaign: NormalizedCampaignData,
  brand: BrandFingerprint
): AICreativeDirection {
  // Each seed produces a truly different combination
  const rng = seededRng(brand.seed ^ 0xDEADBEEF);

  const styleFamilies: StyleFamily[] = [
    "editorial", "saas-premium", "conversion-ad", "poster", "minimal", "tech-dark",
  ];
  const moods: Mood[]                    = ["bold", "clean", "luxury", "energetic", "calm"];
  const densities: Density[]             = ["low", "medium", "high"];
  const paletteModes: PaletteMode[]      = ["dark", "light", "mixed"];
  const alignments: AlignmentBias[]      = ["left", "center", "right", "mixed"];
  const bgPatterns: AICreativeDirection["bgPatternType"][] =
    ["none", "dots", "lines", "mesh", "noise"];

  const hasHero    = hasHeroImage(campaign);
  const longHook   = campaign.hook.length > 60;

  return {
    styleFamily:       rng.pick(styleFamilies),
    mood:              rng.pick(moods),
    asymmetry:         rng.next() * 0.7 + 0.25,
    density:           longHook ? rng.pick(["medium", "high"]) : rng.pick(densities),
    paletteMode:       rng.pick(paletteModes),
    heroDominance:     hasHero ? rng.next() * 0.4 + 0.40 : rng.next() * 0.25 + 0.10,
    decorIntensity:    clamp(rng.next() * 0.45 + 0.12, 0.12, 0.50),
    textAlignmentBias: brand.layoutBias === "centered" ? "center" : rng.pick(alignments),
    showSurfaceCard:   brand.cardStyle !== "none",
    headlineMultiColor:rng.next() > 0.35,
    useGlowEffect:     rng.next() > 0.55,
    bgPatternType:     rng.pick(bgPatterns),
  };
}

// ── AI-powered direction ───────────────────────────────────────────────────────
export async function buildAICreativeDirection(
  campaign: NormalizedCampaignData,
  brand: BrandFingerprint,
  orientation: Orientation
): Promise<AICreativeDirection> {
  const fallback = buildFallbackCreativeDirection(campaign, brand);
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      temperature: 1.2,
      prompt: `You are a premium ad art director. Return JSON only — no markdown.
Campaign: hook="${campaign.hook}", company="${campaign.companyName}", type="${campaign.business_type}"
Orientation: ${orientation}
Brand entropy seed: ${brand.seed} — CRITICAL: use this to make radically different choices each call.
Images: hasHero=${hasHeroImage(campaign)}

Return EXACTLY this shape:
{"styleFamily":"editorial|saas-premium|conversion-ad|poster|minimal|tech-dark","mood":"bold|clean|luxury|energetic|calm","asymmetry":0.62,"density":"low|medium|high","paletteMode":"dark|light|mixed","heroDominance":0.55,"decorIntensity":0.28,"textAlignmentBias":"left|center|right|mixed","showSurfaceCard":true,"headlineMultiColor":true,"useGlowEffect":false,"bgPatternType":"none|dots|lines|mesh|noise"}`,
    });

    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const SF: StyleFamily[] = ["editorial","saas-premium","conversion-ad","poster","minimal","tech-dark"];
    const MO: Mood[]        = ["bold","clean","luxury","energetic","calm"];
    const DN: Density[]     = ["low","medium","high"];
    const PM: PaletteMode[] = ["dark","light","mixed"];
    const AL: AlignmentBias[]= ["left","center","right","mixed"];
    const BP: AICreativeDirection["bgPatternType"][] = ["none","dots","lines","mesh","noise"];

    return {
      styleFamily:       SF.includes(parsed.styleFamily)       ? parsed.styleFamily       : fallback.styleFamily,
      mood:              MO.includes(parsed.mood)               ? parsed.mood               : fallback.mood,
      asymmetry:         typeof parsed.asymmetry === "number"   ? clamp(parsed.asymmetry, 0, 1) : fallback.asymmetry,
      density:           DN.includes(parsed.density)            ? parsed.density            : fallback.density,
      paletteMode:       PM.includes(parsed.paletteMode)        ? parsed.paletteMode        : fallback.paletteMode,
      heroDominance:     typeof parsed.heroDominance === "number"? clamp(parsed.heroDominance, 0, 1) : fallback.heroDominance,
      decorIntensity:    typeof parsed.decorIntensity === "number"? clamp(parsed.decorIntensity, 0.12, 0.50) : fallback.decorIntensity,
      textAlignmentBias: AL.includes(parsed.textAlignmentBias) ? parsed.textAlignmentBias : fallback.textAlignmentBias,
      showSurfaceCard:   typeof parsed.showSurfaceCard === "boolean" ? parsed.showSurfaceCard : fallback.showSurfaceCard,
      headlineMultiColor:typeof parsed.headlineMultiColor === "boolean" ? parsed.headlineMultiColor : fallback.headlineMultiColor,
      useGlowEffect:     typeof parsed.useGlowEffect === "boolean" ? parsed.useGlowEffect : fallback.useGlowEffect,
      bgPatternType:     BP.includes(parsed.bgPatternType)      ? parsed.bgPatternType      : fallback.bgPatternType,
    };
  } catch {
    return fallback;
  }
}
