import { WATCH_POSTER_LAYOUT } from "./layout";

const jitter = (base: number, amount: number) => {
  return Math.round(base + (Math.random() * amount * 2 - amount));
};

const pick = <T,>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const palettes = [
  {
    accent: "#ef4444",
    accentSoft: "rgba(239,68,68,0.14)",
    text: "#ffffff",
    muted: "rgba(255,255,255,0.72)",
    dark: "#050000",
  },
  {
    accent: "#facc15",
    accentSoft: "rgba(250,204,21,0.12)",
    text: "#ffffff",
    muted: "rgba(255,255,255,0.72)",
    dark: "#050000",
  },
];

const palette = pick(palettes);

const offerLayouts = [
  // CLASSIC
  () => [
    {
      id: "offer-label",
      type: "text",
      x: 100,
      y: 590,
      width: 520,
      height: 60,
      dataField: "offer_label",
      fontSize: 58,
      fontWeight: 700,
      textColor: palette.text,
      textAlign: "left",
      fontFamily: "Georgia, serif",
      lineHeight: 1,
      letterSpacing: 0,
      borderWidth: 0,
      zIndex: 20,
    },

    {
      id: "offer-main",
      type: "text",
      x: 100,
      y: 690,
      width: 520,
      height: 100,
      dataField: "offer_value",
      fontSize: 112,
      fontWeight: 900,
      textColor: palette.accent,
      textAlign: "left",
      fontFamily: "'Bebas Neue', sans-serif",
      lineHeight: 1,
      letterSpacing: 0,
      borderWidth: 0,
      zIndex: 21,
    },

    {
      id: "offer-off",
      type: "text",
      x: 370,
      y: 705,
      width: 260,
      height: 80,
      dataField: "offer_label",
      fontSize: 72,
      fontWeight: 700,
      textColor: palette.text,
      textAlign: "left",
      fontFamily: "Georgia, serif",
      lineHeight: 1,
      letterSpacing: 0,
      borderWidth: 0,
      zIndex: 21,
    },
  ],

  // RETAIL BADGE
  () => [
    {
      id: "offer-sale-circle",
      type: "circle",
      x: 120,
      y: 610,
      width: 260,
      height: 260,
      backgroundColor: palette.accent,
      borderWidth: 0,
      zIndex: 18,
    },

    {
      id: "offer-sale-text-top",
      type: "text",
      x: 120,
      y: 670,
      width: 260,
      height: 40,
      dataField: "offer_label",
      fontSize: 28,
      fontWeight: 800,
      textColor: palette.dark,
      textAlign: "center",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 4,
      borderWidth: 0,
      zIndex: 20,
    },

    {
      id: "offer-sale-main",
      type: "text",
      x: 120,
      y: 705,
      width: 260,
      height: 90,
      dataField: "offer_value",
      fontSize: 110,
      fontWeight: 900,
      textColor: palette.dark,
      textAlign: "center",
      fontFamily: "'Bebas Neue', sans-serif",
      lineHeight: 1,
      letterSpacing: 0,
      borderWidth: 0,
      zIndex: 20,
    },

    {
      id: "offer-sale-bottom",
      type: "text",
      x: 120,
      y: 805,
      width: 260,
      height: 40,
      dataField: "offer_label",
      fontSize: 36,
      fontWeight: 800,
      textColor: palette.dark,
      textAlign: "center",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 4,
      borderWidth: 0,
      zIndex: 20,
    },
  ],

  // EDITORIAL
  () => [
    {
      id: "offer-editorial-line",
      type: "rounded-rect",
      x: 100,
      y: 650,
      width: 240,
      height: 4,
      backgroundColor: palette.accent,
      borderWidth: 0,
      borderRadius: 999,
      zIndex: 18,
    },

    {
      id: "offer-editorial-main",
      type: "text",
      x: 100,
      y: 690,
      width: 620,
      height: 120,
      dataField: "offer_value",
      fontSize: 120,
      fontWeight: 900,
      textColor: palette.text,
      textGradientColors: ["#ffffff", palette.accent],
      textAlign: "left",
      fontFamily: "'Bebas Neue', sans-serif",
      lineHeight: 1,
      letterSpacing: 2,
      borderWidth: 0,
      zIndex: 21,
    },

    {
      id: "offer-editorial-sub",
      type: "text",
      x: 105,
      y: 810,
      width: 420,
      height: 30,
      dataField: "offer_label",
      fontSize: 24,
      fontWeight: 700,
      textColor: palette.muted,
      textAlign: "left",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 3,
      borderWidth: 0,
      zIndex: 21,
    },
  ],

  // LUXURY MINIMAL
  () => [
    {
      id: "offer-minimal-top",
      type: "text",
      x: 100,
      y: 650,
      width: 360,
      height: 34,
      dataField: "offer_label",
      fontSize: 26,
      fontWeight: 700,
      textColor: palette.muted,
      textAlign: "left",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 3,
      borderWidth: 0,
      zIndex: 20,
    },

    {
      id: "offer-minimal-main",
      type: "text",
      x: 100,
      y: 700,
      width: 420,
      height: 100,
      dataField: "offer_value",
      fontSize: 96,
      fontWeight: 900,
      textColor: palette.text,
      textAlign: "left",
      fontFamily: "Georgia, serif",
      lineHeight: 1,
      letterSpacing: -2,
      borderWidth: 0,
      zIndex: 21,
    },
  ],
];

export const watchPosterOfferShapes = pick(offerLayouts)();