import { SKINCARE_BRAND_THEME, SKINCARE_POSTER_LAYOUT } from "./layout";

const jitter = (base: number, amount: number) => {
  return Math.round(base + (Math.random() * amount * 2 - amount));
};

const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const productPlacements = {
  "editorial-left": {
    x: 300,
y: 220,
width: 620,
height: 860,
    haloX: 250,
haloY: 180,
haloW: 720,
haloH: 720,
  },

  "center-product": {
    x: 235,
    y: 300,
    width: 610,
    height: 760,
    haloX: 235,
    haloY: 280,
    haloW: 610,
    haloH: 610,
  },

  "minimal-luxury": {
    x: 390,
    y: 310,
    width: 500,
    height: 690,
    haloX: 360,
    haloY: 300,
    haloW: 540,
    haloH: 540,
  },

  "stacked-vertical": {
    x: 255,
    y: 350,
    width: 570,
    height: 720,
    haloX: 260,
    haloY: 335,
    haloW: 560,
    haloH: 560,
  },

  "beauty-magazine": {
    x: 500,
    y: 280,
    width: 520,
    height: 720,
    haloX: 480,
    haloY: 260,
    haloW: 560,
    haloH: 560,
  },
};

const placement =
  productPlacements[SKINCARE_POSTER_LAYOUT] || productPlacements["editorial-left"];

const imageX = jitter(placement.x, 22);
const imageY = jitter(placement.y, 26);
const imageW = jitter(placement.width, 28);
const imageH = jitter(placement.height, 34);

const haloX = jitter(placement.haloX, 24);
const haloY = jitter(placement.haloY, 24);
const haloW = jitter(placement.haloW, 36);
const haloH = jitter(placement.haloH, 36);

const depthSystems = [
  () => [
    {
      id: "skincare-product-halo",
      type: "circle",
      x: haloX,
      y: haloY,
      width: haloW,
      height: haloH,
      backgroundColor: SKINCARE_BRAND_THEME.glow,
      borderWidth: 0,
      opacity: 1,
      zIndex: 2,
    },
  ],

  () => [
    {
      id: "skincare-product-halo",
      type: "circle",
      x: haloX,
      y: haloY,
      width: haloW,
      height: haloH,
      backgroundColor: SKINCARE_BRAND_THEME.glow,
      borderWidth: 0,
      opacity: 1,
      zIndex: 2,
    },
    {
      id: "skincare-product-inner-light",
      type: "circle",
      x: haloX + haloW * 0.18,
      y: haloY + haloH * 0.18,
      width: haloW * 0.64,
      height: haloH * 0.64,
      backgroundColor: "rgba(255,255,255,0.06)",
      borderWidth: 0,
      opacity: 0.85,
      zIndex: 3,
    },
  ],

  () => [
    {
      id: "skincare-light-column",
      type: "rounded-rect",
      x: jitter(imageX + imageW * 0.42, 18),
      y: 80,
      width: jitter(95, 22),
      height: 1080,
      backgroundColor: SKINCARE_BRAND_THEME.glow,
      borderWidth: 0,
      borderRadius: 999,
      opacity: 0.32,
      rotation: pick([-7, -4, 4, 7]),
      zIndex: 2,
    },
    {
      id: "skincare-product-halo",
      type: "circle",
      x: haloX,
      y: haloY,
      width: haloW,
      height: haloH,
      backgroundColor: SKINCARE_BRAND_THEME.glow,
      borderWidth: 0,
      opacity: 0.9,
      zIndex: 3,
    },
  ],

  () => [
    {
      id: "skincare-product-frame",
      type: "rounded-rect",
      x: imageX + 55,
      y: imageY + 70,
      width: imageW - 110,
      height: imageH - 160,
      backgroundColor: "transparent",
      borderColor: SKINCARE_BRAND_THEME.line,
      borderWidth: 1,
      borderRadius: 999,
      opacity: 0.32,
      zIndex: 3,
    },
  ],
];

const foregroundSystems = [
  () => [
    {
      id: "skincare-product-shadow",
      type: "circle",
      x: imageX + imageW * 0.22,
      y: imageY + imageH * 0.86,
      width: imageW * 0.56,
      height: imageH * 0.08,
      backgroundColor: "rgba(0,0,0,0.45)",
      borderWidth: 0,
      opacity: 0.6,
      zIndex: 14,
    },
  ],

  () => [
    {
      id: "skincare-reflection-line",
      type: "rounded-rect",
      x: imageX + imageW * 0.25,
      y: imageY + imageH * 0.89,
      width: imageW * 0.5,
      height: 5,
      backgroundColor: SKINCARE_BRAND_THEME.accent,
      borderWidth: 0,
      borderRadius: 999,
      opacity: 0.28,
      zIndex: 16,
    },
  ],

  () => [
    {
      id: "skincare-beauty-dot-a",
      type: "circle",
      x: imageX + imageW * 0.08,
      y: imageY + imageH * 0.24,
      width: 9,
      height: 9,
      backgroundColor: SKINCARE_BRAND_THEME.accent,
      borderWidth: 0,
      opacity: 0.55,
      zIndex: 16,
    },
    {
      id: "skincare-beauty-dot-b",
      type: "circle",
      x: imageX + imageW * 0.13,
      y: imageY + imageH * 0.24,
      width: 6,
      height: 6,
      backgroundColor: SKINCARE_BRAND_THEME.accent2,
      borderWidth: 0,
      opacity: 0.38,
      zIndex: 16,
    },
  ],

  () => [],
];

export const skincareHeroImageShapes = [
  ...pick(depthSystems)(),

  {
    id: "skincare-product-image",
    type: "image",
    x: imageX,
    y: imageY,
    width: imageW,
    height: imageH,
    dataField: "heroImage",
    fit: "contain",
    radius: 0,
    borderWidth: 0,
    zIndex: 15,
  },

  ...pick(foregroundSystems)(),
];