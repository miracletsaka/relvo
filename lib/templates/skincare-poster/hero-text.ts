import {
  SKINCARE_BRAND_THEME,
  SKINCARE_POSTER_DIRECTION,
  SKINCARE_POSTER_LAYOUT,
} from "./layout";

const jitter = (base: number, amount: number) => {
  return Math.round(base + (Math.random() * amount * 2 - amount));
};

const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const typographySystems = [
  {
    name: "luxury-serif",
    headlineFont: "Georgia, serif",
    headlineWeight: 900,
    headlineLineHeight: 0.9,
    headlineLetterSpacing: -2,
    scriptFont: "'Brush Script MT', cursive",
    scriptWeight: 400,
  },
  {
    name: "beauty-editorial",
    headlineFont: "'Times New Roman', serif",
    headlineWeight: 900,
    headlineLineHeight: 0.92,
    headlineLetterSpacing: -3,
    scriptFont: "'Segoe Script', cursive",
    scriptWeight: 400,
  },
  {
    name: "clean-premium",
    headlineFont: "'Syne', sans-serif",
    headlineWeight: 900,
    headlineLineHeight: 0.95,
    headlineLetterSpacing: -4,
    scriptFont: "'Syne', sans-serif",
    scriptWeight: 700,
  },
  {
    name: "poster-beauty",
    headlineFont: "'Bebas Neue', Impact, sans-serif",
    headlineWeight: 400,
    headlineLineHeight: 0.88,
    headlineLetterSpacing: 2,
    scriptFont: "Georgia, serif",
    scriptWeight: 700,
  },
];

const textPlacements = {
  "editorial-left": {
    align: "left",
    headingX: 76,
    headingY: 130,
    headingW: 560,
    headingH: 230,
    headingSize: 88,
    scriptX: 80,
    scriptY: 390,
    scriptW: 380,
    scriptH: 80,
    scriptSize: 44,
    copyX: 82,
    copyY: 500,
    copyW: 430,
  },
  "center-product": {
    align: "center",
    headingX: 120,
    headingY: 90,
    headingW: 840,
    headingH: 150,
    headingSize: 86,
    scriptX: 240,
    scriptY: 235,
    scriptW: 600,
    scriptH: 70,
    scriptSize: 48,
    copyX: 260,
    copyY: 315,
    copyW: 560,
  },
  "minimal-luxury": {
    align: "left",
    headingX: 86,
    headingY: 150,
    headingW: 390,
    headingH: 180,
    headingSize: 82,
    scriptX: 88,
    scriptY: 360,
    scriptW: 330,
    scriptH: 70,
    scriptSize: 44,
    copyX: 90,
    copyY: 455,
    copyW: 330,
  },
  "stacked-vertical": {
    align: "center",
    headingX: 120,
    headingY: 90,
    headingW: 840,
    headingH: 170,
    headingSize: 92,
    scriptX: 220,
    scriptY: 280,
    scriptW: 640,
    scriptH: 72,
    scriptSize: 50,
    copyX: 250,
    copyY: 365,
    copyW: 580,
  },
  "beauty-magazine": {
    align: "left",
    headingX: 74,
    headingY: 110,
    headingW: 470,
    headingH: 230,
    headingSize: 98,
    scriptX: 78,
    scriptY: 360,
    scriptW: 410,
    scriptH: 76,
    scriptSize: 50,
    copyX: 80,
    copyY: 455,
    copyW: 380,
  },
} as const;

const placement =
  textPlacements[SKINCARE_POSTER_LAYOUT] || textPlacements["editorial-left"];

const typography = pick(typographySystems);

const headlineText =
  SKINCARE_POSTER_DIRECTION === "clinical-premium"
    ? "VISIBLE\nRADIANCE"
    : SKINCARE_POSTER_DIRECTION === "natural-beauty"
      ? "NATURAL\nGLOW"
      : SKINCARE_POSTER_DIRECTION === "bold-glow"
        ? "GLOW\nBOOST"
        : "RADIANT\nSKIN";

const scriptText =
  SKINCARE_POSTER_DIRECTION === "clinical-premium"
    ? "Advanced Serum"
    : SKINCARE_POSTER_DIRECTION === "natural-beauty"
      ? "Botanical Care"
      : SKINCARE_POSTER_DIRECTION === "bold-glow"
        ? "Glow Formula"
        : "Luxury Serum";

const copyText =
  SKINCARE_POSTER_DIRECTION === "clinical-premium"
    ? "Clinically inspired skincare for a smoother, brighter-looking finish."
    : SKINCARE_POSTER_DIRECTION === "natural-beauty"
      ? "Soft botanical hydration crafted for everyday radiance."
      : SKINCARE_POSTER_DIRECTION === "bold-glow"
        ? "A luminous skin ritual designed to feel rich, smooth, and unforgettable."
        : "A premium skincare ritual for hydrated, luminous, healthy-looking skin.";

const decorations = [
  () => [
    {
      id: "skincare-hero-accent-line",
      type: "rounded-rect",
      x: jitter(placement.headingX, 14),
      y: jitter(placement.headingY - 28, 10),
      width: jitter(180, 45),
      height: 5,
      backgroundColor: SKINCARE_BRAND_THEME.accent,
      borderWidth: 0,
      borderRadius: 999,
      zIndex: 19,
    },
  ],

  () => [
    {
      id: "skincare-premium-tag-bg",
      type: "rounded-rect",
      x: jitter(placement.headingX, 12),
      y: jitter(placement.headingY - 54, 10),
      width: 250,
      height: 40,
      backgroundColor: "rgba(255,255,255,0.055)",
      borderColor: SKINCARE_BRAND_THEME.line,
      borderWidth: 1,
      borderRadius: 999,
      zIndex: 19,
    },
    {
      id: "skincare-premium-tag-text",
      type: "text",
      x: jitter(placement.headingX + 18, 10),
      y: jitter(placement.headingY - 42, 10),
      width: 214,
      height: 24,
      dataField: "campaign_label",
      fontSize: 18,
      fontWeight: 800,
      textColor: SKINCARE_BRAND_THEME.accent2,
      textAlign: "center",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 2,
      borderWidth: 0,
      zIndex: 22,
    },
  ],

  () => [
    {
      id: "skincare-hero-frame",
      type: "rounded-rect",
      x: placement.headingX - 22,
      y: placement.headingY - 24,
      width: placement.headingW + 44,
      height: placement.scriptY - placement.headingY + 130,
      backgroundColor: "transparent",
      borderColor: SKINCARE_BRAND_THEME.line,
      borderWidth: 1,
      borderRadius: 28,
      opacity: 0.42,
      zIndex: 18,
    },
  ],

  () => [],
];

export const skincareHeroTextShapes = [
  ...pick(decorations)(),

  {
    id: "skincare-headline",
    type: "text",
    x: jitter(placement.headingX, 12),
    y: jitter(placement.headingY, 12),
    width: placement.headingW,
    height: placement.headingH,
    dataField: "headline",
    fontSize: jitter(placement.headingSize, 7),
    fontWeight: typography.headlineWeight,
    textColor: SKINCARE_BRAND_THEME.text,
    textGradientColors: pick([
      [SKINCARE_BRAND_THEME.text, SKINCARE_BRAND_THEME.cream],
      undefined,
    ]),
    textAlign: placement.align,
    fontFamily: typography.headlineFont,
    lineHeight: typography.headlineLineHeight,
    letterSpacing: typography.headlineLetterSpacing,
    borderWidth: 0,
    shadowColor: "rgba(0,0,0,0.38)",
    shadowBlur: pick([0, 4, 8]),
    zIndex: 20,
  },

  {
    id: "skincare-script-title",
    type: "text",
    x: jitter(placement.scriptX, 10),
    y: jitter(placement.scriptY, 10),
    width: placement.scriptW,
    height: placement.scriptH,
    dataField: "product_name",
    fontSize: jitter(placement.scriptSize, 5),
    fontWeight: typography.scriptWeight,
    textColor: SKINCARE_BRAND_THEME.accent2,
    textAlign: placement.align,
    fontFamily: typography.scriptFont,
    lineHeight: 1,
    letterSpacing: 0,
    borderWidth: 0,
    shadowColor: SKINCARE_BRAND_THEME.glow,
    shadowBlur: pick([0, 5, 9]),
    zIndex: 21,
  },

  {
    id: "skincare-body-copy",
    type: "text",
    x: jitter(placement.copyX, 10),
    y: jitter(placement.copyY, 10),
    width: placement.copyW,
    height: 96,
    dataField: "description",
    fontSize: pick([20, 22, 24]),
    fontWeight: 500,
    textColor: SKINCARE_BRAND_THEME.muted,
    textAlign: placement.align,
    fontFamily: "'Syne', sans-serif",
    lineHeight: 1.35,
    letterSpacing: 0,
    borderWidth: 0,
    zIndex: 20,
  },
];