import type { BackgroundContext, BackgroundGenerator, Shape } from "./types";

import { editorialLuxuryBackground } from "./editorial-luxury";
import { techFuturisticBackground } from "./tech-futuristic";
import { minimalClinicalBackground } from "./minimal-clinical";
import { premiumRetailBackground } from "./premium-retail";
import { organicBeautyBackground } from "./organic-beauty";
import { brutalistPosterBackground } from "./brutalist-poster";

export * from "./types";

const pick = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

export const backgroundArchetypes = [
  editorialLuxuryBackground,
  techFuturisticBackground,
  minimalClinicalBackground,
  premiumRetailBackground,
  organicBeautyBackground,
  brutalistPosterBackground,
] satisfies BackgroundGenerator[];

export function generateMixedBackground(ctx: BackgroundContext): Shape[] {
  return pick(backgroundArchetypes)(ctx);
}

export function generateBackgroundByName(
  name:
    | "editorial-luxury"
    | "tech-futuristic"
    | "minimal-clinical"
    | "premium-retail"
    | "organic-beauty"
    | "brutalist-poster",
  ctx: BackgroundContext,
): Shape[] {
  const map: Record<string, BackgroundGenerator> = {
    "editorial-luxury": editorialLuxuryBackground,
    "tech-futuristic": techFuturisticBackground,
    "minimal-clinical": minimalClinicalBackground,
    "premium-retail": premiumRetailBackground,
    "organic-beauty": organicBeautyBackground,
    "brutalist-poster": brutalistPosterBackground,
  };

  return map[name](ctx);
}

export { editorialLuxuryBackground } from "./editorial-luxury";
export { techFuturisticBackground } from "./tech-futuristic";
export { minimalClinicalBackground } from "./minimal-clinical";
export { premiumRetailBackground } from "./premium-retail";
export { organicBeautyBackground } from "./organic-beauty";
export { brutalistPosterBackground } from "./brutalist-poster";