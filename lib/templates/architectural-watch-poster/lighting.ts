import { ARCH_CANVAS, ARCH_POSTER_LAYOUT, ARCH_THEME } from "./layout";

const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const shadowY =
  ARCH_POSTER_LAYOUT === "center-pedestal" ? 1010 :
  ARCH_POSTER_LAYOUT === "minimal-gallery" ? 1040 :
  980;

export const architecturalLightingShapes = [
  {
    id: "arch-light-beam",
    type: "rounded-rect",
    x: ARCH_CANVAS.width * pick([0.48, 0.54, 0.6]),
    y: -120,
    width: pick([70, 90, 110]),
    height: ARCH_CANVAS.height * 1.18,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 0,
    borderRadius: 999,
    opacity: pick([0.34, 0.42, 0.5]),
    rotation: pick([-8, -5, 4, 7]),
    zIndex: 6,
  },

  {
    id: "arch-hard-shadow-floor",
    type: "rectangle",
    x: ARCH_CANVAS.width * -0.18,
    y: shadowY,
    width: ARCH_CANVAS.width * 0.58,
    height: ARCH_CANVAS.height * 0.16,
    backgroundColor: ARCH_THEME.shadow,
    rotation: pick([-28, -24, -20]),
    borderWidth: 0,
    opacity: 0.55,
    zIndex: 7,
  },

  {
    id: "arch-floor-line",
    type: "rounded-rect",
    x: 0,
    y: 1045,
    width: ARCH_CANVAS.width,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderWidth: 0,
    opacity: 0.55,
    zIndex: 7,
  },

  {
    id: "arch-gold-detail-line",
    type: "rounded-rect",
    x: ARCH_CANVAS.width * pick([0.08, 0.12, 0.16]),
    y: ARCH_CANVAS.height * pick([0.34, 0.4, 0.46]),
    width: ARCH_CANVAS.width * pick([0.16, 0.22, 0.28]),
    height: 2,
    backgroundColor: ARCH_THEME.accent,
    borderWidth: 0,
    borderRadius: 999,
    opacity: 0.65,
    zIndex: 8,
  },
];
