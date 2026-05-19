import type { BackgroundContext, Shape } from "./types";
import { jitter, pick } from "./types";

export function premiumRetailBackground(ctx: BackgroundContext): Shape[] {
  const { width, height, theme } = ctx;

  return [
    { id: "bg-retail-base", type: "rectangle", x: 0, y: 0, width, height, backgroundColor: theme.bg, borderWidth: 0, zIndex: 0 },
    { id: "bg-retail-side-block", type: "rounded-rect", x: jitter(-120, 40), y: jitter(height * 0.18, 60), width: jitter(width * 0.48, 70), height: jitter(height * 0.48, 80), backgroundColor: theme.glow, borderWidth: 0, borderRadius: pick([0, 40, 80, 999]), opacity: 0.75, zIndex: 1 },
    { id: "bg-retail-burst", type: "circle", x: jitter(width * 0.42, 60), y: jitter(height * 0.18, 70), width: jitter(width * 0.76, 90), height: jitter(width * 0.76, 90), backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 0, opacity: 0.82, zIndex: 2 },
    { id: "bg-retail-band", type: "rounded-rect", x: jitter(width * 0.08, 40), y: jitter(height * 0.7, 50), width: jitter(width * 0.74, 80), height: pick([5, 6, 8]), backgroundColor: theme.accent, borderWidth: 0, borderRadius: 999, opacity: 0.55, zIndex: 3 },
    { id: "bg-retail-pattern", type: "pattern-overlay", x: 0, y: 0, width, height, patternType: "diagonal-lines", patternColor: theme.cream, patternOpacity: 0.018, borderWidth: 0, zIndex: 4 },
  ];
}
