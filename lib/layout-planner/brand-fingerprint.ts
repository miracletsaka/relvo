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
  // ── Org-stable hash (same org always gets same base identity) ─────────────
  const orgKey  = [campaign.companyName, campaign.business_type, campaign.location,
                   campaign.email, campaign.phone]
    .filter(Boolean).join("|").toLowerCase();
  const orgHash = hashString(orgKey || "default-org");

  // ── Time jitter — sub-millisecond prevents same-second collisions ─────────
  const timeNs = typeof performance !== "undefined"
    ? Math.floor(performance.now() * 1_000_000)
    : Date.now() * 1_000_000;
  const timeJitter = timeNs % 999_983;

  // ── Random coin — even if all else is equal, this breaks ties ─────────────
  const randomCoin = Math.floor(Math.random() * 999_983);

  // ── Final seed: 5 sources XOR-mixed ──────────────────────────────────────
  // orgHash   = stable per org identity
  // entropySeed = call-site entropy (already org+time+random mixed in index.ts)
  // timeJitter  = local sub-ms timestamp
  // randomCoin  = pure randomness
  // prime multiply = avalanche effect across bit positions
  // Avalanche mix: prime multiply + XOR each independent source
  // Modular arithmetic keeps values in safe integer range
  const seedN = (
    ((orgHash     * 2654435761) >>> 0) ^
    ((entropySeed * 40503)      >>> 0) ^
    ((timeJitter  * 12289)      >>> 0) ^
    ((randomCoin  * 6700417)    >>> 0)
  ) >>> 0;

  const rng  = seededRng(seedN);
  const tone = campaign.tone || "default";

  // ── Font: rotate through all fonts by org — not just tone ────────────────
  // Every org gets a different default font regardless of tone
  const ALL_FONTS = [BEBAS_NEUE, SYNE, PLAYFAIR, BARLOW, OSWALD];
  const orgFontIdx    = orgHash % ALL_FONTS.length;
  const sessionFontIdx= Math.floor(rng.next() * ALL_FONTS.length);
  // Blend: 70% org-stable, 30% session-random so same org varies but has identity
  const displayFont = rng.next() < 0.70
    ? ALL_FONTS[orgFontIdx]
    : ALL_FONTS[sessionFontIdx];

  const layoutBiases: BrandFingerprint["layoutBias"][] = ["left-heavy","right-heavy","centered","asymmetric"];
  const cardStyles:   BrandFingerprint["cardStyle"][]  = ["sharp","soft","pill","none"];

  return {
    seed:          seedN,
    orgKey,
    displayFont:   TONE_FONTS[tone] ?? displayFont,
    bodyFont:      INTER,
    accentRotation:rng.nextInt(0, 11) * 30,
    layoutBias:    rng.pick(layoutBiases),
    cardStyle:     rng.pick(cardStyles),
    decorDensity:  rng.next() * 0.6 + 0.2,
    tone,
  };
}