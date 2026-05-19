import type { BackgroundContext, Shape } from "./types";
import { jitter, pick } from "./types";

export function minimalClinicalBackground(ctx: BackgroundContext): Shape[] {
  const { width, height, theme } = ctx;
  const base = pick(["#f7eee3", "#f3e4d6", "#efe4d7", theme.cream]);

  return [
    { id: "bg-clinical-base", type: "rectangle", x: 0, y: 0, width, height, backgroundColor: base, borderWidth: 0, zIndex: 0 },
    { id: "bg-clinical-corner-glow", type: "circle", x: jitter(width * 0.45, 80), y: jitter(height * 0.1, 80), width: jitter(width * 0.64, 80), height: jitter(width * 0.64, 80), backgroundColor: "rgba(214,168,110,0.18)", borderWidth: 0, opacity: 0.7, zIndex: 1 },
    { id: "bg-clinical-top-line", type: "rounded-rect", x: 72, y: jitter(130, 30), width: width - 144, height: 1, backgroundColor: "rgba(35,24,18,0.18)", borderWidth: 0, opacity: 0.6, zIndex: 2 },
    { id: "bg-clinical-side-line", type: "rounded-rect", x: jitter(width * 0.5, 80), y: 72, width: 1, height: height - 144, backgroundColor: "rgba(35,24,18,0.10)", borderWidth: 0, opacity: 0.6, zIndex: 2 },
    { id: "bg-clinical-dot", type: "circle", x: jitter(width * 0.82, 60), y: jitter(height * 0.18, 50), width: 8, height: 8, backgroundColor: "rgba(35,24,18,0.28)", borderWidth: 0, opacity: 0.65, zIndex: 3 },
  ];
}
