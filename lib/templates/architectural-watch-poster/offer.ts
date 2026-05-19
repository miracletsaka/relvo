import { ARCH_POSTER_LAYOUT, ARCH_THEME } from "./layout";

const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const placements = {
  "gallery-right": { x: 72, y: 690, align: "left" },
  "center-pedestal": { x: 350, y: 1080, align: "center" },
  "editorial-arch": { x: 72, y: 700, align: "left" },
  "minimal-gallery": { x: 72, y: 725, align: "left" },
  "split-wall": { x: 72, y: 690, align: "left" },
} as const;

const p = placements[ARCH_POSTER_LAYOUT] || placements["gallery-right"];

const offerLayouts = [
  () => [
    {
      id: "arch-offer-line",
      type: "rounded-rect",
      x: p.x,
      y: p.y - 26,
      width: 190,
      height: 3,
      backgroundColor: ARCH_THEME.accent,
      borderWidth: 0,
      borderRadius: 999,
      opacity: 0.75,
      zIndex: 25,
    },
    {
      id: "arch-offer-main",
      type: "text",
      x: p.x,
      y: p.y,
      width: 360,
      height: 74,
      dataField: "offer_value",
      fontSize: 70,
      fontWeight: 900,
      textColor: ARCH_THEME.text,
      textAlign: p.align,
      fontFamily: "'Bebas Neue', Impact, sans-serif",
      lineHeight: 1,
      letterSpacing: 1,
      borderWidth: 0,
      zIndex: 25,
    },
    {
      id: "arch-offer-sub",
      type: "text",
      x: p.x,
      y: p.y + 76,
      width: 360,
      height: 28,
      dataField: "offer_label",
      fontSize: 18,
      fontWeight: 900,
      textColor: ARCH_THEME.muted,
      textAlign: p.align,
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 3,
      borderWidth: 0,
      zIndex: 25,
    },
  ],

  () => [
    {
      id: "arch-offer-card",
      type: "rounded-rect",
      x: p.x,
      y: p.y - 18,
      width: 310,
      height: 122,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderColor: ARCH_THEME.accent,
      borderWidth: 1,
      borderRadius: 22,
      zIndex: 24,
    },
    {
      id: "arch-offer-main",
      type: "text",
      x: p.x + 24,
      y: p.y + 16,
      width: 262,
      height: 54,
      dataField: "offer_value",
      fontSize: 54,
      fontWeight: 900,
      textColor: ARCH_THEME.text,
      textAlign: "center",
      fontFamily: "'Bebas Neue', Impact, sans-serif",
      lineHeight: 1,
      letterSpacing: 1,
      borderWidth: 0,
      zIndex: 25,
    },
    {
      id: "arch-offer-sub",
      type: "text",
      x: p.x + 24,
      y: p.y + 72,
      width: 262,
      height: 26,
      dataField: "offer_label",
      fontSize: 16,
      fontWeight: 900,
      textColor: ARCH_THEME.muted,
      textAlign: "center",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 2,
      borderWidth: 0,
      zIndex: 25,
    },
  ],
];

export const architecturalOfferShapes = pick(offerLayouts)();