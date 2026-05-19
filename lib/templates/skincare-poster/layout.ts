const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

export const SKINCARE_CANVAS = {
  width: 1080,
  height: 1350,
  safe: 72,
};

export const skincarePosterLayouts = [
  "editorial-left",
  "center-product",
  "minimal-luxury",
  "stacked-vertical",
  "beauty-magazine",
] as const;

export type SkincarePosterLayout = (typeof skincarePosterLayouts)[number];

export const SKINCARE_POSTER_LAYOUT: SkincarePosterLayout =
  pick(skincarePosterLayouts);

export const SKINCARE_POSTER_DIRECTION = pick([
  "soft-luxury",
  "clinical-premium",
  "gold-editorial",
  "natural-beauty",
  "bold-glow",
] as const);

export const SKINCARE_BRAND_THEME = pick([
  {
    name: "warm-gold",
    bg: "#120b08",
    surface: "#21130e",
    cream: "#f7e7d0",
    accent: "#d7a86e",
    accent2: "#f5d0a0",
    text: "#ffffff",
    muted: "rgba(255,255,255,0.62)",
    line: "rgba(245,208,160,0.28)",
    glow: "rgba(245,208,160,0.16)",
  },
  {
    name: "rose-beige",
    bg: "#140b0d",
    surface: "#28171a",
    cream: "#f6ddd8",
    accent: "#e8a9a1",
    accent2: "#f5c7bd",
    text: "#ffffff",
    muted: "rgba(255,255,255,0.62)",
    line: "rgba(232,169,161,0.30)",
    glow: "rgba(232,169,161,0.15)",
  },
  {
    name: "clean-cream",
    bg: "#11100d",
    surface: "#272018",
    cream: "#fff1dc",
    accent: "#c9a46a",
    accent2: "#f2d49b",
    text: "#ffffff",
    muted: "rgba(255,255,255,0.60)",
    line: "rgba(242,212,155,0.26)",
    glow: "rgba(242,212,155,0.14)",
  },
] as const);