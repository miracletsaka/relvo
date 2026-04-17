/**
 * layout-planner/scorer.ts
 * ──────────────────────────
 * Pass 6: Scores the layout quality for debugging / selection.
 */

import type {
  AICompositionPlan, AICreativeDirection, AILayoutSkeleton,
  PlacementMap, AIBlockPlacement, LayoutScore,
} from "./types";
import { rectArea, overlapArea, within } from "./utils";

export function scoreLayout(
  composition: AICompositionPlan,
  direction: AICreativeDirection,
  skeleton: AILayoutSkeleton,
  placements: PlacementMap
): LayoutScore {
  const rects = Object.values(placements)
    .filter(Boolean)
    .map(p => (p as AIBlockPlacement).rect);

  const contentArea = rectArea(skeleton.zones.content);

  let overlapPenalty = 0;
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++)
      overlapPenalty += overlapArea(rects[i], rects[j]);

  const overlapScore   = Math.max(0, Math.min(1, 1 - overlapPenalty / Math.max(1, contentArea)));
  const coverage       = rects.reduce((s, r) => s + rectArea(r), 0) / Math.max(1, contentArea);
  const whitespaceScore= coverage < 0.22 ? 0.82 : coverage > 0.78 ? 0.62 : 0.95;

  const headline        = placements.hook?.rect;
  const cta             = placements.cta?.rect;
  const hierarchyScore  = headline && cta && headline.height > cta.height ? 0.94 : 0.74;
  const ctaVisibilityScore = cta && within(skeleton.zones.content, cta, 0) ? 0.96 : 0.68;
  const readabilityScore= Math.max(0, Math.min(1, (overlapScore + whitespaceScore) / 2));

  const uniquenessBase =
    composition.layout === "split-diagonal" ||
    composition.layout === "editorial-center-stack" ||
    direction.asymmetry > 0.65 ? 0.95 : 0.82;

  const total =
    overlapScore * 0.24      +
    hierarchyScore * 0.18    +
    readabilityScore * 0.20  +
    whitespaceScore * 0.12   +
    uniquenessBase * 0.12    +
    ctaVisibilityScore * 0.14;

  return {
    overlapScore, hierarchyScore, readabilityScore,
    whitespaceScore, uniquenessScore: uniquenessBase,
    ctaVisibilityScore, total,
  };
}
