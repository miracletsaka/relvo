import { SKINCARE_BRAND_THEME, SKINCARE_POSTER_LAYOUT } from "./layout";

const jitter = (base: number, amount: number) => {
  return Math.round(base + (Math.random() * amount * 2 - amount));
};

const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const headerLayouts = [
  () => [
    {
      id: "skincare-header-label",
      type: "text",
      x: 72,
      y: 72,
      width: 420,
      height: 32,
      dataField: "campaign_label",
      fontSize: 20,
      fontWeight: 800,
      textColor: SKINCARE_BRAND_THEME.accent2,
      textAlign: "left",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 3,
      borderWidth: 0,
      zIndex: 30,
    },
    {
      id: "skincare-header-line",
      type: "rounded-rect",
      x: 72,
      y: 116,
      width: jitter(180, 45),
      height: 3,
      backgroundColor: SKINCARE_BRAND_THEME.line,
      borderWidth: 0,
      borderRadius: 999,
      zIndex: 30,
    },
  ],

  () => [
    {
      id: "skincare-header-card",
      type: "rounded-rect",
      x: 72,
      y: 54,
      width: 330,
      height: 76,
      backgroundColor: "rgba(255,255,255,0.045)",
      borderColor: SKINCARE_BRAND_THEME.line,
      borderWidth: 1,
      borderRadius: 999,
      zIndex: 29,
    },
    {
      id: "skincare-header-card-text",
      type: "text",
      x: 94,
      y: 82,
      width: 286,
      height: 26,
      dataField: "campaign_label",
      fontSize: 18,
      fontWeight: 800,
      textColor: SKINCARE_BRAND_THEME.cream,
      textAlign: "center",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 2,
      borderWidth: 0,
      zIndex: 30,
    },
  ],

  () => [
    {
      id: "skincare-header-left",
      type: "text",
      x: 72,
      y: 72,
      width: 300,
      height: 30,
      dataField: "campaign_label",
      fontSize: 18,
      fontWeight: 900,
      textColor: SKINCARE_BRAND_THEME.accent2,
      textAlign: "left",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 3,
      borderWidth: 0,
      zIndex: 30,
    },
    {
      id: "skincare-header-right",
      type: "text",
      x: 690,
      y: 72,
      width: 318,
      height: 30,
      dataField: "collection_label",
      fontSize: 18,
      fontWeight: 800,
      textColor: SKINCARE_BRAND_THEME.muted,
      textAlign: "right",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 3,
      borderWidth: 0,
      zIndex: 30,
    },
  ],

  () => [
    {
      id: "skincare-corner-a",
      type: "rounded-rect",
      x: 72,
      y: 72,
      width: 110,
      height: 3,
      backgroundColor: SKINCARE_BRAND_THEME.accent,
      borderWidth: 0,
      borderRadius: 999,
      zIndex: 30,
    },
    {
      id: "skincare-corner-b",
      type: "rounded-rect",
      x: 72,
      y: 72,
      width: 3,
      height: 110,
      backgroundColor: SKINCARE_BRAND_THEME.accent,
      borderWidth: 0,
      borderRadius: 999,
      zIndex: 30,
    },
    {
      id: "skincare-corner-text",
      type: "text",
      x: 102,
      y: 102,
      width: 300,
      height: 28,
      dataField: "campaign_label",
      fontSize: 18,
      fontWeight: 800,
      textColor: SKINCARE_BRAND_THEME.cream,
      textAlign: "left",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 2,
      borderWidth: 0,
      zIndex: 31,
    },
  ],
];

const filteredLayouts =
  SKINCARE_POSTER_LAYOUT === "center-product" ||
  SKINCARE_POSTER_LAYOUT === "stacked-vertical"
    ? [headerLayouts[1], headerLayouts[2]]
    : headerLayouts;

export const skincareHeaderShapes = pick(filteredLayouts)();