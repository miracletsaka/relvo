/**
 * layout-planner/brand-fingerprint.ts
 * ──────────────────────────────────────
 * Per-org seed + tone-aware font assignment.
 * Triple-entropy ensures every generation is unique.
 */

import type { NormalizedCampaignData, BrandFingerprint } from "./types";
import { hashString, seededRng } from "./utils";
import { BEBAS_NEUE, INTER, TONE_FONTS } from "./constants";

export function buildBrandFingerprint(
  campaign:    NormalizedCampaignData,
  entropySeed: number
): BrandFingerprint {
  const orgKey   = [campaign.companyName, campaign.business_type, campaign.location]
    .filter(Boolean).join("|").toLowerCase();
  const orgHash  = hashString(orgKey || "default-org");
  const timeJitter = (typeof performance !== "undefined"
    ? Math.floor(performance.now() * 1000) : Date.now()) % 99991;
  const seed     = (orgHash ^ (entropySeed * 7919) ^ (timeJitter * 127)) >>> 0;

  const rng = seededRng(seed);
  const tone = campaign.tone || "default";

  const layoutBiases: BrandFingerprint["layoutBias"][] = ["left-heavy","right-heavy","centered","asymmetric"];
  const cardStyles: BrandFingerprint["cardStyle"][]    = ["sharp","soft","pill","none"];

  return {
    seed, orgKey,
    displayFont:   TONE_FONTS[tone] || BEBAS_NEUE,
    bodyFont:      INTER,
    accentRotation:rng.nextInt(0, 11) * 30,
    layoutBias:    rng.pick(layoutBiases),
    cardStyle:     rng.pick(cardStyles),
    decorDensity:  rng.next() * 0.6 + 0.2,
    tone,
  };
}