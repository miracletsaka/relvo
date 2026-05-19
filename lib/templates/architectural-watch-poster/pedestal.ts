import { ARCH_CANVAS, ARCH_POSTER_LAYOUT, ARCH_THEME } from "./layout";

const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const pedestalPlacements = {
  "gallery-right": { x: 610, y: 885, width: 300, height: 465 },
  "center-pedestal": { x: 380, y: 900, width: 320, height: 450 },
  "editorial-arch": { x: 600, y: 875, width: 310, height: 475 },
  "minimal-gallery": { x: 560, y: 900, width: 280, height: 450 },
  "split-wall": { x: 585, y: 875, width: 330, height: 475 },
} as const;

const p = pedestalPlacements[ARCH_POSTER_LAYOUT] || pedestalPlacements["gallery-right"];

export const architecturalPedestalShapes = [
  {
    id: "arch-pedestal-shadow",
    type: "circle",
    x: p.x - 35,
    y: p.y - 18,
    width: p.width + 70,
    height: 50,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 0,
    opacity: 0.42,
    zIndex: 9,
  },

  {
    id: "arch-pedestal-front",
    type: "rectangle",
    x: p.x,
    y: p.y,
    width: p.width,
    height: p.height,
    backgroundColor: ARCH_THEME.pedestal,
    borderWidth: 0,
    opacity: 0.98,
    zIndex: 10,
  },

  {
    id: "arch-pedestal-top",
    type: "rectangle",
    x: p.x,
    y: p.y,
    width: p.width,
    height: 18,
    backgroundColor: ARCH_THEME.pedestalTop,
    borderWidth: 0,
    opacity: 0.95,
    zIndex: 11,
  },

  {
    id: "arch-pedestal-highlight",
    type: "rounded-rect",
    x: p.x + p.width - 18,
    y: p.y + 16,
    width: 2,
    height: p.height - 40,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 0,
    borderRadius: 999,
    opacity: 0.65,
    zIndex: 12,
  },
];
