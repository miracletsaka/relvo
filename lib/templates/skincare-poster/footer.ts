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

const footerText =
  SKINCARE_POSTER_DIRECTION === "clinical-premium"
    ? "CLINICALLY INSPIRED BEAUTY"
    : SKINCARE_POSTER_DIRECTION === "natural-beauty"
      ? "BOTANICAL SKINCARE RITUAL"
      : SKINCARE_POSTER_DIRECTION === "bold-glow"
        ? "GLOW CARE COLLECTION"
        : "PREMIUM SKINCARE COLLECTION";

const footerLayouts = [
  () => [
    {
      id: "skincare-footer-line",
      type: "rounded-rect",
      x: 72,
      y: 1218,
      width: 936,
      height: 1,
      backgroundColor: SKINCARE_BRAND_THEME.line,
      borderWidth: 0,
      opacity: 0.65,
      zIndex: 28,
    },
    {
      id: "skincare-footer-handle",
      type: "text",
      x: 72,
      y: 1250,
      width: 380,
      height: 38,
      dataField: "social_handle",
      fontSize: 30,
      fontWeight: 700,
      textColor: SKINCARE_BRAND_THEME.text,
      textAlign: "left",
      fontFamily: "Georgia, serif",
      lineHeight: 1,
      letterSpacing: 0,
      borderWidth: 0,
      zIndex: 29,
    },
    {
      id: "skincare-footer-copy",
      type: "text",
      x: 468,
      y: 1256,
      width: 540,
      height: 28,
      dataField: "footer_label",
      fallbackText: footerText,
      fontSize: 18,
      fontWeight: 800,
      textColor: SKINCARE_BRAND_THEME.muted,
      textAlign: "right",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 2,
      borderWidth: 0,
      zIndex: 29,
    },
  ],

  () => [
    {
      id: "skincare-footer-glass",
      type: "rounded-rect",
      x: jitter(72, 10),
      y: jitter(1210, 10),
      width: 936,
      height: 94,
      backgroundColor: "rgba(255,255,255,0.05)",
      borderColor: SKINCARE_BRAND_THEME.line,
      borderWidth: 1,
      borderRadius: 28,
      zIndex: 28,
    },
    {
      id: "skincare-footer-glass-handle",
      type: "text",
      x: 104,
      y: 1240,
      width: 360,
      height: 36,
      dataField: "social_handle",
      fontSize: 28,
      fontWeight: 700,
      textColor: SKINCARE_BRAND_THEME.text,
      textAlign: "left",
      fontFamily: "Georgia, serif",
      lineHeight: 1,
      letterSpacing: 0,
      borderWidth: 0,
      zIndex: 29,
    },
    {
      id: "skincare-footer-glass-code",
      type: "text",
      x: 540,
      y: 1248,
      width: 430,
      height: 26,
      dataField: "footer_label",
      fallbackText: "BEAUTY RITUAL / 2026",
      fontSize: 18,
      fontWeight: 800,
      textColor: SKINCARE_BRAND_THEME.accent2,
      textAlign: "right",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 2,
      borderWidth: 0,
      zIndex: 29,
    },
  ],

  () => [
    {
      id: "skincare-footer-center-left",
      type: "rounded-rect",
      x: 190,
      y: 1255,
      width: 180,
      height: 2,
      backgroundColor: SKINCARE_BRAND_THEME.line,
      borderWidth: 0,
      borderRadius: 999,
      zIndex: 28,
    },
    {
      id: "skincare-footer-center-right",
      type: "rounded-rect",
      x: 710,
      y: 1255,
      width: 180,
      height: 2,
      backgroundColor: SKINCARE_BRAND_THEME.line,
      borderWidth: 0,
      borderRadius: 999,
      zIndex: 28,
    },
    {
      id: "skincare-footer-center-text",
      type: "text",
      x: 350,
      y: 1236,
      width: 380,
      height: 34,
      dataField: "footer_label",
      fallbackText: "LUXURY CARE",
      fontSize: 26,
      fontWeight: 900,
      textColor: SKINCARE_BRAND_THEME.text,
      textAlign: "center",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 4,
      borderWidth: 0,
      zIndex: 29,
    },
    {
      id: "skincare-footer-center-handle",
      type: "text",
      x: 350,
      y: 1280,
      width: 380,
      height: 24,
      dataField: "social_handle",
      fontSize: 18,
      fontWeight: 600,
      textColor: SKINCARE_BRAND_THEME.muted,
      textAlign: "center",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 2,
      borderWidth: 0,
      zIndex: 29,
    },
  ],

  () => [
    {
      id: "skincare-footer-minimal-handle",
      type: "text",
      x: 72,
      y: 1260,
      width: 360,
      height: 34,
      dataField: "social_handle",
      fontSize: 26,
      fontWeight: 700,
      textColor: SKINCARE_BRAND_THEME.text,
      textAlign: "left",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 0,
      borderWidth: 0,
      zIndex: 29,
    },
    {
      id: "skincare-footer-minimal-dot",
      type: "circle",
      x: 510,
      y: 1267,
      width: 10,
      height: 10,
      backgroundColor: SKINCARE_BRAND_THEME.accent,
      borderWidth: 0,
      zIndex: 29,
    },
    {
      id: "skincare-footer-minimal-url",
      type: "text",
      x: 570,
      y: 1260,
      width: 438,
      height: 34,
      dataField: "website",
      fontSize: 22,
      fontWeight: 700,
      textColor: SKINCARE_BRAND_THEME.muted,
      textAlign: "right",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 1,
      borderWidth: 0,
      zIndex: 29,
    },
  ],
];

const filteredLayouts =
  SKINCARE_POSTER_LAYOUT === "center-product" ||
  SKINCARE_POSTER_LAYOUT === "stacked-vertical"
    ? [footerLayouts[1], footerLayouts[2], footerLayouts[3]]
    : footerLayouts;

export const skincareFooterShapes = pick(filteredLayouts)();