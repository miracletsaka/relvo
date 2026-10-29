/**
 * frontend/lib/templates/mixed-poster/index.ts
 *
 * Single source of composition. All types (ThemeTokens, TemplateFamilyId,
 * FAMILY_THEMES, FONT_STACKS) are defined HERE and imported by downstream
 * files — including campaign-design-intelligence.ts.
 *
 * layout-contract.ts owns zone geometry (buildZoneMap, rebaseSegment, ZONES).
 * This file owns visual identity (colours, fonts) and composition logic.
 *
 * NOTHING is re-declared across both files.
 */

import type { CanvasSegment as RendererCanvasSegment } from "@/lib/canvas-renderer";
import { buildZoneMap, rebaseSegment, CANVAS_W } from "@/lib/templates/layout-contract";

// ─── Shape imports ────────────────────────────────────────────────────────────

import { watchPosterBackgroundShapes }   from "../watch-product-poster/background";
import { watchPosterHeaderShapes }       from "../watch-product-poster/header";
import { watchPosterHeroImageShapes }    from "../watch-product-poster/hero-image";
import { watchPosterHeroTextShapes }     from "../watch-product-poster/hero-text";
import { watchPosterOfferShapes }        from "../watch-product-poster/offer";
import { watchPosterCtaShapes }          from "../watch-product-poster/cta";
import { watchPosterFooterShapes }       from "../watch-product-poster/footer";

import { skincareBackgroundShapes }      from "../skincare-poster/background";
import { skincareHeaderShapes }          from "../skincare-poster/header";
import { skincareHeroImageShapes }       from "../skincare-poster/hero-image";
import { skincareHeroTextShapes }        from "../skincare-poster/hero-text";
import { skincareOfferShapes }           from "../skincare-poster/offer";
import { skincareCtaShapes }             from "../skincare-poster/cta";
import { skincareFooterShapes }          from "../skincare-poster/footer";

import { architecturalBackgroundShapes } from "../architectural-watch-poster/background";
import { architecturalLightingShapes }   from "../architectural-watch-poster/lighting";
import { architecturalPedestalShapes }   from "../architectural-watch-poster/pedestal";
import { architecturalHeaderShapes }     from "../architectural-watch-poster/header";
import { architecturalHeroImageShapes }  from "../architectural-watch-poster/hero-image";
import { architecturalHeroTextShapes }   from "../architectural-watch-poster/hero-text";
import { architecturalOfferShapes }      from "../architectural-watch-poster/offer";
import { architecturalCtaShapes }        from "../architectural-watch-poster/cta";
import { architecturalFooterShapes }     from "../architectural-watch-poster/footer";

import {
  socialIconSectionShapes,
  sponsorLogoSectionShapes,
  contactSectionShapes,
  featuresSectionShapes,
} from "../shared/sections";

// ─── Visual identity types (owned here, imported everywhere else) ─────────────

export type TemplateFamilyId = "watch" | "skincare" | "architectural";

export interface ThemeTokens {
  bg: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  fontDisplay: string;
  fontBody: string;
  fontOffer: string;
}

export const FONT_STACKS = {
  techDark:      { fontDisplay: "Bebas Neue",       fontBody: "Barlow Condensed", fontOffer: "Bebas Neue"       },
  luxuryLight:   { fontDisplay: "Playfair Display", fontBody: "DM Sans",          fontOffer: "Syne"             },
  agencyNeutral: { fontDisplay: "Syne",             fontBody: "Outfit",           fontOffer: "Syne"             },
} as const;

export const FAMILY_THEMES: Record<TemplateFamilyId, ThemeTokens> = {
  watch:        { bg: "#0A0A0F", surface: "#13131A", textPrimary: "#FFFFFF", textSecondary: "#A0A0B0", accent: "#C9A84C", ...FONT_STACKS.techDark      },
  skincare:     { bg: "#FAF7F4", surface: "#FFFFFF",  textPrimary: "#1A1208", textSecondary: "#6B5E52", accent: "#D4956A", ...FONT_STACKS.luxuryLight   },
  architectural:{ bg: "#0E0E0E", surface: "#1C1C1C",  textPrimary: "#F2F2F2", textSecondary: "#888888", accent: "#E8E8E8", ...FONT_STACKS.agencyNeutral },
};

// ─── Shape lookup tables ──────────────────────────────────────────────────────

const BG     = { watch: watchPosterBackgroundShapes,  skincare: skincareBackgroundShapes,  architectural: architecturalBackgroundShapes };
const HDR    = { watch: watchPosterHeaderShapes,      skincare: skincareHeaderShapes,      architectural: architecturalHeaderShapes      };
const HIMG   = { watch: watchPosterHeroImageShapes,   skincare: skincareHeroImageShapes,   architectural: architecturalHeroImageShapes   };
const HTXT   = { watch: watchPosterHeroTextShapes,    skincare: skincareHeroTextShapes,    architectural: architecturalHeroTextShapes    };
const OFFER  = { watch: watchPosterOfferShapes,       skincare: skincareOfferShapes,       architectural: architecturalOfferShapes       };
const CTA    = { watch: watchPosterCtaShapes,         skincare: skincareCtaShapes,         architectural: architecturalCtaShapes         };
const FOOTER = { watch: watchPosterFooterShapes,      skincare: skincareFooterShapes,      architectural: architecturalFooterShapes      };

// ─── Picker ───────────────────────────────────────────────────────────────────

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
function pickFamily(): TemplateFamilyId {
  return pick(["watch", "skincare", "architectural"] as TemplateFamilyId[]);
}

// ─── Composition ──────────────────────────────────────────────────────────────

const generationId  = `mixed-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const primaryFamily = pickFamily();
const accentFamily  = Math.random() > 0.3
  ? primaryFamily
  : pick((["watch", "skincare", "architectural"] as TemplateFamilyId[]).filter(f => f !== primaryFamily));
const tokens        = FAMILY_THEMES[primaryFamily];

const includeScene    = primaryFamily === "architectural" && Math.random() > 0.5;
const includeFeatures = Math.random() > 0.5;
const includeSponsors = !includeFeatures && Math.random() > 0.5;
const includeContact  = Math.random() > 0.6;
const includeSocial   = Math.random() > 0.6;

// Zone map — computes yStart for every optional zone and final canvas height
const { zones, canvasHeight } = buildZoneMap({
  includeFeatures,
  includeSponsors,
  includeContact,
  includeSocial,
});

// ─── Section factory ──────────────────────────────────────────────────────────
//
// rebaseSegment: normalises shape Y values to their zone's yStart
// stamp: attaches _tokens + _role metadata for intelligence layer

function stamp(shapes: any[], role: string): any[] {
  return shapes.map(s => ({ ...s, _tokens: tokens, _role: role }));
}

function section(zoneKey: string, rawShapes: any[], role: string) {
  const zone = zones[zoneKey];
  if (!zone) return null; // optional zone not included this run
  return {
    instanceId:     `${generationId}-${zoneKey}`,
    requested_type: zoneKey,
    name:           `Mixed ${zoneKey}`,
    description:    `Zone-locked ${zoneKey}.`,
    shapes:         stamp(rebaseSegment(rawShapes, zoneKey, zone), role),
    _primaryFamily: primaryFamily,
    _tokens:        tokens,
  };
}

// ─── Sections ─────────────────────────────────────────────────────────────────

const heroImageRaw = includeScene
  ? [...architecturalLightingShapes, ...(Math.random() > 0.5 ? architecturalPedestalShapes : []), ...HIMG[primaryFamily]]
  : HIMG[primaryFamily];

export const MIXED_POSTER_SECTIONS = [
  section("background", BG[primaryFamily],   "background"),
  section("hero-image", heroImageRaw,        "image"),
  section("header",     HDR[primaryFamily],  "subheading"),
  section("hero-text",  HTXT[primaryFamily], "heading"),
  section("offer",      OFFER[accentFamily], "accent"),
  section("cta",        CTA[accentFamily],   "ui"),
  includeFeatures ? section("features", featuresSectionShapes,    "ui")   : null,
  includeSponsors ? section("sponsors", sponsorLogoSectionShapes, "ui")   : null,
  includeContact  ? section("contact",  contactSectionShapes,     "body") : null,
  includeSocial   ? section("social",   socialIconSectionShapes,  "ui")   : null,
  section("footer",     FOOTER[primaryFamily], "body"),
].filter(Boolean) as NonNullable<ReturnType<typeof section>>[];

// ─── Template export ──────────────────────────────────────────────────────────

export const MIXED_POSTER_TEMPLATE = {
  instanceId:            generationId,
  requested_type:        "campaign_composition" as const,
  name:                  "Mixed Premium Poster",
  description:           "Zone-locked mixed poster. Every segment type always in its fixed position.",
  segment_type:          "campaign_composition",
  internal_segment_type: "campaign_composition",
  segment_height:        canvasHeight,
  y:                     0,
  shapes:                MIXED_POSTER_SECTIONS.flatMap(s => s.shapes),
  _meta: {
    primaryFamily,
    accentFamily,
    tokens,
    canvasWidth:  CANVAS_W,
    canvasHeight,
    zones,
  },
} satisfies RendererCanvasSegment & { requested_type: "campaign_composition" };

export { CANVAS_W };