import { ARCH_POSTER_LAYOUT } from "./layout";

const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const productPlacements: Record<
  string,
  {
    x: number;
    y: number;
    width: number;
    height: number;
  }[]
> = {
  "gallery-right": [
    { x: 585, y: 485, width: 360, height: 430 },
    { x: 610, y: 455, width: 330, height: 470 },
  ],
  "center-pedestal": [
    { x: 335, y: 430, width: 410, height: 500 },
    { x: 370, y: 455, width: 350, height: 460 },
  ],
  "editorial-arch": [
    { x: 570, y: 455, width: 380, height: 460 },
    { x: 610, y: 475, width: 340, height: 430 },
  ],
  "minimal-gallery": [
    { x: 520, y: 500, width: 320, height: 390 },
    { x: 560, y: 520, width: 280, height: 360 },
  ],
  "split-wall": [
    { x: 570, y: 440, width: 405, height: 500 },
    { x: 615, y: 455, width: 340, height: 470 },
  ],
} as const;

const p = pick(productPlacements[ARCH_POSTER_LAYOUT] || productPlacements["gallery-right"]);

export const architecturalHeroImageShapes = [
  {
    id: "arch-product-glow",
    type: "circle",
    x: p.x - 55,
    y: p.y - 45,
    width: p.width + 110,
    height: p.width + 110,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 0,
    opacity: pick([0.55, 0.68, 0.75]),
    zIndex: 12,
  },

  {
    id: "arch-product-image",
    type: "image",
    x: p.x,
    y: p.y,
    width: p.width,
    height: p.height,
    dataField: "heroImage",
    fit: "contain",
    radius: 0,
    borderWidth: 0,
    zIndex: 18,
  },

  {
    id: "arch-product-contact-shadow",
    type: "circle",
    x: p.x + p.width * 0.24,
    y: p.y + p.height * 0.9,
    width: p.width * 0.52,
    height: 34,
    backgroundColor: "rgba(0,0,0,0.32)",
    borderWidth: 0,
    opacity: 0.52,
    zIndex: 13,
  },
];