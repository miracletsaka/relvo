import { ARCH_CANVAS, ARCH_POSTER_LAYOUT, ARCH_THEME } from "./layout";

const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const wallSplit =
  ARCH_POSTER_LAYOUT === "split-wall"
    ? 0.58
    : ARCH_POSTER_LAYOUT === "minimal-gallery"
      ? 0.78
      : pick([0.64, 0.68, 0.72]);

export const architecturalBackgroundShapes = [
  {
    id: "arch-bg-base",
    type: "rectangle",
    x: 0,
    y: 0,
    width: ARCH_CANVAS.width,
    height: ARCH_CANVAS.height,
    backgroundColor: ARCH_THEME.bg,
    borderWidth: 0,
    zIndex: 0,
  },

  {
    id: "arch-bg-wall-gradient",
    type: "rectangle",
    x: 0,
    y: 0,
    width: ARCH_CANVAS.width,
    height: ARCH_CANVAS.height,
    gradientColors: [
      { stop: 0, color: ARCH_THEME.wall },
      { stop: 0.54, color: ARCH_THEME.bg },
      { stop: 1, color: "rgba(0,0,0,0.08)" },
    ],
    gradientAngle: pick([35, 90, 135]),
    backgroundColor: ARCH_THEME.wall,
    borderWidth: 0,
    zIndex: 0,
  },

  {
    id: "arch-dark-wall",
    type: "rectangle",
    x: ARCH_CANVAS.width * wallSplit,
    y: 0,
    width: ARCH_CANVAS.width * (1 - wallSplit),
    height: ARCH_CANVAS.height,
    backgroundColor: ARCH_THEME.dark,
    borderWidth: 0,
    zIndex: 1,
  },

  {
    id: "arch-main-curve",
    type: "circle",
    x: ARCH_CANVAS.width * pick([0.24, 0.3, 0.36]),
    y: ARCH_CANVAS.height * pick([-0.08, -0.04, 0.02]),
    width: ARCH_CANVAS.width * pick([0.86, 0.96, 1.08]),
    height: ARCH_CANVAS.width * pick([0.86, 0.96, 1.08]),
    backgroundColor: "rgba(255,255,255,0.48)",
    borderWidth: 0,
    opacity: pick([0.58, 0.68, 0.78]),
    zIndex: 2,
  },

  {
    id: "arch-curve-shadow",
    type: "circle",
    x: ARCH_CANVAS.width * pick([0.46, 0.52, 0.58]),
    y: ARCH_CANVAS.height * pick([0.14, 0.2, 0.26]),
    width: ARCH_CANVAS.width * pick([0.48, 0.56, 0.64]),
    height: ARCH_CANVAS.width * pick([0.48, 0.56, 0.64]),
    backgroundColor: "rgba(0,0,0,0.14)",
    borderWidth: 0,
    opacity: 0.45,
    zIndex: 3,
  },

  {
    id: "arch-wall-joint",
    type: "rounded-rect",
    x: ARCH_CANVAS.width * wallSplit - 1,
    y: 0,
    width: 2,
    height: ARCH_CANVAS.height,
    backgroundColor: "rgba(0,0,0,0.16)",
    borderWidth: 0,
    opacity: 0.55,
    zIndex: 4,
  },

  {
    id: "arch-subtle-texture",
    type: "pattern-overlay",
    x: 0,
    y: 0,
    width: ARCH_CANVAS.width,
    height: ARCH_CANVAS.height,
    patternType: "diagonal-lines",
    patternColor: "#000000",
    patternOpacity: 0.012,
    borderWidth: 0,
    zIndex: 5,
  },
];
