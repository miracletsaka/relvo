import type { CanvasSegment as RendererCanvasSegment } from "@/lib/canvas-renderer";

import { architecturalBackgroundShapes } from "./background";
import { architecturalLightingShapes } from "./lighting";
import { architecturalPedestalShapes } from "./pedestal";
import { architecturalHeroImageShapes } from "./hero-image";
import { architecturalHeaderShapes } from "./header";
import { architecturalHeroTextShapes } from "./hero-text";
import { architecturalOfferShapes } from "./offer";
import { architecturalCtaShapes } from "./cta";
import { architecturalFooterShapes } from "./footer";

export const ARCHITECTURAL_WATCH_POSTER_TEMPLATE = {
  instanceId: "architectural-watch-poster-default",
  requested_type: "campaign_composition",
  name: "Architectural Watch Poster",
  description: "Editable architectural luxury watch advertisement with pedestal staging.",
  segment_type: "campaign_composition",
  internal_segment_type: "campaign_composition",
  segment_height: 1350,
  y: 0,
  shapes: [
    ...architecturalBackgroundShapes,
    ...architecturalLightingShapes,
    ...architecturalPedestalShapes,
    ...architecturalHeroImageShapes,
    ...architecturalHeaderShapes,
    ...architecturalHeroTextShapes,
    ...architecturalOfferShapes,
    ...architecturalCtaShapes,
    ...architecturalFooterShapes,
  ],
} satisfies RendererCanvasSegment & {
  requested_type: "campaign_composition";
};
