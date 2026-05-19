import type { CanvasSegment as RendererCanvasSegment } from "@/lib/canvas-renderer";

import { watchPosterBackgroundShapes } from "./background";
import { watchPosterHeaderShapes } from "./header";
import { watchPosterHeroImageShapes } from "./hero-image";
import { watchPosterHeroTextShapes } from "./hero-text";
import { watchPosterOfferShapes } from "./offer";
import { watchPosterCtaShapes } from "./cta";
import { watchPosterFooterShapes } from "./footer";

export const WATCH_PRODUCT_POSTER_TEMPLATE = {
  instanceId: "watch-product-poster-default",
  requested_type: "campaign_composition",
  name: "Luxury Watch Product Poster",
  description: "Editable shape-based luxury watch advertisement.",
  segment_type: "campaign_composition",
  internal_segment_type: "campaign_composition",
  segment_height: 1080,
  y: 0,
  shapes: [
    ...watchPosterBackgroundShapes,
    ...watchPosterHeroImageShapes,
    ...watchPosterHeaderShapes,
    ...watchPosterHeroTextShapes,
    ...watchPosterOfferShapes,
    ...watchPosterCtaShapes,
    ...watchPosterFooterShapes,
  ],
} satisfies RendererCanvasSegment & {
  requested_type: "campaign_composition";
};
