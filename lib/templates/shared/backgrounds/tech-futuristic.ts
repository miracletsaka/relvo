import type { BackgroundContext, Shape } from "./types";
import { jitter } from "./types";

export function techFuturisticBackground(ctx: BackgroundContext): Shape[] {
  const { width, height, theme } = ctx;

  return [
    { id: "bg-tech-base", type: "rectangle", x: 0, y: 0, width, height, backgroundColor: "#05070b", borderWidth: 0, zIndex: 0 },
    { id: "bg-tech-glow-a", type: "circle", x: jitter(width * 0.48, 80), y: jitter(height * 0.08, 80), width: jitter(width * 0.74, 80), height: jitter(width * 0.74, 80), backgroundColor: theme.glow, borderWidth: 0, opacity: 0.85, zIndex: 1 },
    { id: "bg-tech-grid-h", type: "rounded-rect", x: 0, y: jitter(height * 0.22, 50), width, height: 1, backgroundColor: theme.line, borderWidth: 0, opacity: 0.45, zIndex: 2 },
    { id: "bg-tech-grid-v", type: "rounded-rect", x: jitter(width * 0.52, 50), y: 0, width: 1, height, backgroundColor: theme.line, borderWidth: 0, opacity: 0.34, zIndex: 2 },
    { id: "bg-tech-card", type: "rounded-rect", x: jitter(width * 0.5, 40), y: jitter(height * 0.16, 40), width: jitter(width * 0.38, 50), height: jitter(height * 0.52, 60), backgroundColor: "rgba(255,255,255,0.028)", borderColor: theme.line, borderWidth: 1, borderRadius: 32, opacity: 0.9, zIndex: 3 },
    { id: "bg-tech-scan", type: "rounded-rect", x: jitter(width * 0.16, 60), y: jitter(height * 0.72, 50), width: jitter(width * 0.6, 90), height: 3, backgroundColor: theme.accent, borderWidth: 0, borderRadius: 999, opacity: 0.42, zIndex: 4 },
    { id: "bg-tech-pattern", type: "pattern-overlay", x: 0, y: 0, width, height, patternType: "lines", patternColor: theme.cream, patternOpacity: 0.014, borderWidth: 0, zIndex: 5 },
  ];
}
