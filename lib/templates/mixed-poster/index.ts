import type { CanvasSegment as RendererCanvasSegment } from "@/lib/canvas-renderer";

import { watchPosterBackgroundShapes } from "../watch-product-poster/background";
import { watchPosterHeaderShapes } from "../watch-product-poster/header";
import { watchPosterHeroImageShapes } from "../watch-product-poster/hero-image";
import { watchPosterHeroTextShapes } from "../watch-product-poster/hero-text";
import { watchPosterOfferShapes } from "../watch-product-poster/offer";
import { watchPosterCtaShapes } from "../watch-product-poster/cta";
import { watchPosterFooterShapes } from "../watch-product-poster/footer";

import { skincareBackgroundShapes } from "../skincare-poster/background";
import { skincareHeaderShapes } from "../skincare-poster/header";
import { skincareHeroImageShapes } from "../skincare-poster/hero-image";
import { skincareHeroTextShapes } from "../skincare-poster/hero-text";
import { skincareOfferShapes } from "../skincare-poster/offer";
import { skincareCtaShapes } from "../skincare-poster/cta";
import { skincareFooterShapes } from "../skincare-poster/footer";

import { architecturalBackgroundShapes } from "../architectural-watch-poster/background";
import { architecturalLightingShapes } from "../architectural-watch-poster/lighting";
import { architecturalPedestalShapes } from "../architectural-watch-poster/pedestal";
import { architecturalHeaderShapes } from "../architectural-watch-poster/header";
import { architecturalHeroImageShapes } from "../architectural-watch-poster/hero-image";
import { architecturalHeroTextShapes } from "../architectural-watch-poster/hero-text";
import { architecturalOfferShapes } from "../architectural-watch-poster/offer";
import { architecturalCtaShapes } from "../architectural-watch-poster/cta";
import { architecturalFooterShapes } from "../architectural-watch-poster/footer";

import {
  socialIconSectionShapes,
  sponsorLogoSectionShapes,
  contactSectionShapes,
  featuresSectionShapes,
} from "../shared/sections";

const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const generationId = `mixed-${Date.now()}-${Math.random()
  .toString(36)
  .slice(2)}`;

const pickedBackground = pick([
  watchPosterBackgroundShapes,
  skincareBackgroundShapes,
  architecturalBackgroundShapes,
]);

const pickedScene = pick([
  [],
  architecturalLightingShapes,
]);

const pickedPedestal = pick([
  [],
  architecturalPedestalShapes,
]);

const pickedHeroImage = pick([
  watchPosterHeroImageShapes,
  skincareHeroImageShapes,
  architecturalHeroImageShapes,
]);

const pickedHeader = pick([
  watchPosterHeaderShapes,
  skincareHeaderShapes,
  architecturalHeaderShapes,
]);

const pickedHeroText = pick([
  watchPosterHeroTextShapes,
  skincareHeroTextShapes,
  architecturalHeroTextShapes,
]);

const pickedOffer = pick([
  watchPosterOfferShapes,
  skincareOfferShapes,
  architecturalOfferShapes,
]);

const pickedCta = pick([
  watchPosterCtaShapes,
  skincareCtaShapes,
  architecturalCtaShapes,
]);

const pickedFeatures = pick([
  [],
  featuresSectionShapes,
]);

const pickedSponsors = pick([
  [],
  sponsorLogoSectionShapes,
]);

const pickedContact = pick([
  [],
  contactSectionShapes,
]);

const pickedSocial = pick([
  [],
  socialIconSectionShapes,
]);

const pickedFooter = pick([
  watchPosterFooterShapes,
  skincareFooterShapes,
  architecturalFooterShapes,
]);

export const MIXED_POSTER_SECTIONS = [
  {
    instanceId: `${generationId}-background`,
    requested_type: "background",
    name: "Mixed Background",
    description: "Generated mixed background section.",
    shapes: pickedBackground,
  },

  {
    instanceId: `${generationId}-scene`,
    requested_type: "scene",
    name: "Mixed Scene",
    description: "Generated lighting and pedestal scene.",
    shapes: [
      ...pickedScene,
      ...pickedPedestal,
    ],
  },

  {
    instanceId: `${generationId}-hero-image`,
    requested_type: "hero-image",
    name: "Mixed Hero Image",
    description: "Generated mixed hero image.",
    shapes: pickedHeroImage,
  },

  {
    instanceId: `${generationId}-header`,
    requested_type: "header",
    name: "Mixed Header",
    description: "Generated mixed header.",
    shapes: pickedHeader,
  },

  {
    instanceId: `${generationId}-hero-text`,
    requested_type: "hero-text",
    name: "Mixed Hero Text",
    description: "Generated mixed hero text.",
    shapes: pickedHeroText,
  },

  {
    instanceId: `${generationId}-offer`,
    requested_type: "offer",
    name: "Mixed Offer",
    description: "Generated mixed offer.",
    shapes: pickedOffer,
  },

  {
    instanceId: `${generationId}-cta`,
    requested_type: "cta",
    name: "Mixed CTA",
    description: "Generated mixed CTA.",
    shapes: pickedCta,
  },
  {
  instanceId: `${generationId}-features`,
  requested_type: "features",
  name: "Mixed Features",
  description: "Generated features section.",
  shapes: pickedFeatures,
},

{
  instanceId: `${generationId}-sponsors`,
  requested_type: "sponsors",
  name: "Mixed Sponsors",
  description: "Generated sponsor logos section.",
  shapes: pickedSponsors,
},

{
  instanceId: `${generationId}-contact`,
  requested_type: "contact",
  name: "Mixed Contact",
  description: "Generated contact section.",
  shapes: pickedContact,
},

{
  instanceId: `${generationId}-social`,
  requested_type: "social",
  name: "Mixed Social",
  description: "Generated social icons section.",
  shapes: pickedSocial,
},

  {
    instanceId: `${generationId}-footer`,
    requested_type: "footer",
    name: "Mixed Footer",
    description: "Generated mixed footer.",
    shapes: pickedFooter,
  },
];

export const MIXED_POSTER_TEMPLATE = {
  instanceId: generationId,

  requested_type: "campaign_composition",

  name: "Mixed Premium Poster",

  description:
    "Randomly mixed editable premium poster sections.",

  segment_type: "campaign_composition",

  internal_segment_type: "campaign_composition",

  segment_height: 1350,

  y: 0,

  shapes: MIXED_POSTER_SECTIONS.flatMap(
    (section) => section.shapes,
  ),
} satisfies RendererCanvasSegment & {
  requested_type: "campaign_composition";
};