import type { BackgroundContext, Shape } from "./types";
import { jitter, pick } from "./types";

export function organicBeautyBackground(ctx: BackgroundContext): Shape[] {
  const { width, height, theme } = ctx;

  return [
    { id: "bg-organic-base", type: "rectangle", x: 0, y: 0, width, height, backgroundColor: theme.bg, borderWidth: 0, zIndex: 0 },
    { id: "bg-organic-blob-a", type: "circle", x: jitter(-120, 70), y: jitter(height * 0.15, 80), width: jitter(width * 0.58, 100), height: jitter(width * 0.7, 120), backgroundColor: theme.glow, borderWidth: 0, opacity: 0.72, zIndex: 1 },
    { id: "bg-organic-blob-b", type: "circle", x: jitter(width * 0.56, 70), y: jitter(height * 0.08, 80), width: jitter(width * 0.55, 90), height: jitter(width * 0.7, 110), backgroundColor: "rgba(255,255,255,0.045)", borderWidth: 0, opacity: 0.75, zIndex: 1 },
    { id: "bg-organic-flow-line", type: "rounded-rect", x: jitter(width * 0.52, 80), y: -120, width: jitter(95, 25), height, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 0, borderRadius: 999, opacity: 0.5, rotation: pick([-8, -5, 5, 8]), zIndex: 2 },
    { id: "bg-organic-dot", type: "circle", x: jitter(width * 0.78, 60), y: jitter(height * 0.2, 60), width: 9, height: 9, backgroundColor: theme.accent2, borderWidth: 0, opacity: 0.55, zIndex: 3 },
  ];
}
