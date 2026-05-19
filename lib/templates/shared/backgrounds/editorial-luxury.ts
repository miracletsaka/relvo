import type { BackgroundContext, Shape } from "./types";
import { jitter, pick } from "./types";

export function editorialLuxuryBackground(ctx: BackgroundContext): Shape[] {
  const { width, height, theme } = ctx;

  return [
    { id: "bg-editorial-base", type: "rectangle", x: 0, y: 0, width, height, backgroundColor: theme.bg, borderWidth: 0, zIndex: 0 },
    {
      id: "bg-editorial-gradient",
      type: "rectangle",
      x: 0,
      y: 0,
      width,
      height,
      gradientColors: [
        { stop: 0, color: theme.bg },
        { stop: 0.52, color: theme.surface },
        { stop: 1, color: theme.bg },
      ],
      gradientAngle: pick([25, 45, 90, 135]),
      backgroundColor: theme.surface,
      borderWidth: 0,
      zIndex: 0,
    },
    { id: "bg-editorial-orb-a", type: "circle", x: jitter(width * 0.34, 70), y: jitter(height * 0.16, 80), width: jitter(width * 0.74, 90), height: jitter(width * 0.74, 90), backgroundColor: theme.glow, borderWidth: 0, opacity: 0.9, zIndex: 1 },
    { id: "bg-editorial-orb-b", type: "circle", x: jitter(-120, 50), y: jitter(height * 0.25, 80), width: jitter(width * 0.48, 70), height: jitter(width * 0.62, 90), backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 0, opacity: 0.7, zIndex: 1 },
    { id: "bg-editorial-panel", type: "rounded-rect", x: jitter(width * 0.48, 45), y: jitter(height * 0.14, 60), width: jitter(width * 0.40, 45), height: jitter(height * 0.64, 80), backgroundColor: "rgba(255,255,255,0.035)", borderColor: "rgba(255,255,255,0.075)", borderWidth: 1, borderRadius: pick([40, 60, 90, 999]), opacity: 0.86, zIndex: 2 },
    { id: "bg-editorial-pattern", type: "pattern-overlay", x: 0, y: 0, width, height, patternType: "diagonal-lines", patternColor: theme.cream, patternOpacity: pick([0.014, 0.018, 0.022]), borderWidth: 0, zIndex: 3 },
  ];
}
