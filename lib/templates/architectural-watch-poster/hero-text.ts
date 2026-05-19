import { ARCH_POSTER_LAYOUT, ARCH_THEME } from "./layout";

type TextPlacement = {
  x: number;
  y: number;
  w: number;
  h: number;
  align: "left" | "center" | "right";
  size: number;
  sx: number;
  sy: number;
  sw: number;
};

const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const placements: Record<string, TextPlacement[]> = {
  "gallery-right": [
    { x: 72, y: 165, w: 455, h: 220, align: "left", size: 92, sx: 76, sy: 410, sw: 420 },
    { x: 72, y: 140, w: 485, h: 230, align: "left", size: 86, sx: 76, sy: 395, sw: 430 },
  ],
  "center-pedestal": [
    { x: 120, y: 95, w: 840, h: 160, align: "center", size: 86, sx: 240, sy: 250, sw: 600 },
    { x: 150, y: 110, w: 780, h: 150, align: "center", size: 78, sx: 260, sy: 260, sw: 560 },
  ],
  "editorial-arch": [
    { x: 72, y: 130, w: 455, h: 220, align: "left", size: 96, sx: 76, sy: 388, sw: 410 },
    { x: 90, y: 150, w: 430, h: 210, align: "left", size: 88, sx: 94, sy: 395, sw: 390 },
  ],
  "minimal-gallery": [
    { x: 72, y: 160, w: 360, h: 190, align: "left", size: 72, sx: 76, sy: 365, sw: 330 },
    { x: 72, y: 185, w: 340, h: 170, align: "left", size: 64, sx: 76, sy: 360, sw: 320 },
  ],
  "split-wall": [
    { x: 72, y: 130, w: 430, h: 220, align: "left", size: 90, sx: 76, sy: 386, sw: 410 },
    { x: 84, y: 150, w: 410, h: 205, align: "left", size: 82, sx: 88, sy: 388, sw: 390 },
  ],
};

const p = pick(placements[ARCH_POSTER_LAYOUT] || placements["gallery-right"]);

export const architecturalHeroTextShapes = [
  {
    id: "arch-kicker",
    type: "text",
    x: p.x,
    y: p.y - 52,
    width: 360,
    height: 26,
    dataField: "campaign_label",
    fontSize: 18,
    fontWeight: 900,
    textColor: ARCH_THEME.accent,
    textAlign: p.align,
    fontFamily: "'Syne', sans-serif",
    lineHeight: 1,
    letterSpacing: 3,
    borderWidth: 0,
    zIndex: 28,
  },

  {
    id: "arch-headline",
    type: "text",
    x: p.x,
    y: p.y,
    width: p.w,
    height: p.h,
    dataField: "headline",
    fontSize: p.size,
    fontWeight: 900,
    textColor: ARCH_THEME.text,
    textGradientColors: [ARCH_THEME.text, "#3a3027"],
    textAlign: p.align,
    fontFamily: pick(["Georgia, serif", "'Bebas Neue', Impact, sans-serif", "'Syne', sans-serif"]),
    lineHeight: pick([0.88, 0.9, 0.94]),
    letterSpacing: pick([-3, -2, 0, 1]),
    borderWidth: 0,
    zIndex: 28,
  },

  {
    id: "arch-script",
    type: "text",
    x: p.sx,
    y: p.sy,
    width: p.sw,
    height: 68,
    dataField: "product_name",
    fontSize: pick([38, 42, 48]),
    fontWeight: 400,
    textColor: ARCH_THEME.accent,
    textAlign: p.align,
    fontFamily: pick(["'Brush Script MT', cursive", "Georgia, serif", "'Syne', sans-serif"]),
    lineHeight: 1,
    letterSpacing: 0,
    borderWidth: 0,
    zIndex: 29,
  },

  {
    id: "arch-body",
    type: "text",
    x: p.sx,
    y: p.sy + 82,
    width: Math.min(p.sw, 430),
    height: 100,
    dataField: "description",
    fontSize: pick([18, 19, 20]),
    fontWeight: 600,
    textColor: ARCH_THEME.muted,
    textAlign: p.align,
    fontFamily: "'Syne', sans-serif",
    lineHeight: 1.35,
    letterSpacing: 0,
    borderWidth: 0,
    zIndex: 28,
  },
];