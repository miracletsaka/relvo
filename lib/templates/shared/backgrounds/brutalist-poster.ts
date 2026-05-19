import type { BackgroundContext, Shape } from "./types";
import { jitter, pick } from "./types";

export function brutalistPosterBackground(ctx: BackgroundContext): Shape[] {
  const { width, height, theme } = ctx;

  return [
    { id: "bg-brutalist-base", type: "rectangle", x: 0, y: 0, width, height, backgroundColor: theme.bg, borderWidth: 0, zIndex: 0 },
    { id: "bg-brutalist-block-a", type: "rectangle", x: 0, y: jitter(height * 0.12, 80), width: jitter(width * 0.5, 80), height: jitter(height * 0.45, 90), backgroundColor: "rgba(255,255,255,0.055)", borderWidth: 0, opacity: 0.75, zIndex: 1 },
    { id: "bg-brutalist-block-b", type: "rectangle", x: jitter(width * 0.48, 60), y: jitter(height * 0.44, 60), width: jitter(width * 0.6, 90), height: jitter(height * 0.32, 70), backgroundColor: theme.glow, borderWidth: 0, opacity: 0.65, zIndex: 1 },
    { id: "bg-brutalist-line-a", type: "rounded-rect", x: 72, y: jitter(height * 0.18, 60), width: width - 144, height: pick([2, 3, 4]), backgroundColor: theme.accent, borderWidth: 0, borderRadius: 999, opacity: 0.55, zIndex: 3 },
    { id: "bg-brutalist-line-b", type: "rounded-rect", x: jitter(width * 0.56, 70), y: 0, width: pick([2, 3, 4]), height, backgroundColor: theme.line, borderWidth: 0, opacity: 0.45, zIndex: 3 },
    { id: "bg-brutalist-pattern", type: "pattern-overlay", x: 0, y: 0, width, height, patternType: "diagonal-lines", patternColor: theme.cream, patternOpacity: 0.015, borderWidth: 0, zIndex: 4 },
  ];
}
