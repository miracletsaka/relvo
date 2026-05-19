import type { CanvasSegment as RendererCanvasSegment } from "@/lib/canvas-renderer";

import { skincareBackgroundShapes } from "./background";
import { skincareHeaderShapes } from "./header";
import { skincareHeroImageShapes } from "./hero-image";
import { skincareHeroTextShapes } from "./hero-text";
import { skincareOfferShapes } from "./offer";
import { skincareCtaShapes } from "./cta";
import { skincareFooterShapes } from "./footer";

export const SKINCARE_POSTER_TEMPLATE = {
  instanceId: "skincare-poster-default",
  requested_type: "campaign_composition",
  name: "Luxury Skincare Poster",
  description: "Editable luxury skincare campaign poster.",
  segment_type: "campaign_composition",
  internal_segment_type: "campaign_composition",
  segment_height: 1350,
  y: 0,
  shapes: [
    ...skincareBackgroundShapes,
    ...skincareHeroImageShapes,
    ...skincareHeaderShapes,
    ...skincareHeroTextShapes,
    ...skincareOfferShapes,
    ...skincareCtaShapes,
    ...skincareFooterShapes,
  ],
} satisfies RendererCanvasSegment & {
  requested_type: "campaign_composition";
};