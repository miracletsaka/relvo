import { ARCH_POSTER_LAYOUT, ARCH_THEME } from "./layout";

const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const placements = {
  "gallery-right": { x: 72, y: 850, width: 330 },
  "center-pedestal": { x: 315, y: 1190, width: 450 },
  "editorial-arch": { x: 72, y: 860, width: 340 },
  "minimal-gallery": { x: 72, y: 875, width: 320 },
  "split-wall": { x: 72, y: 850, width: 340 },
} as const;

const p = placements[ARCH_POSTER_LAYOUT] || placements["gallery-right"];

const ctaLayouts = [
  () => [
    {
      id: "arch-cta-outline",
      type: "rounded-rect",
      x: p.x,
      y: p.y,
      width: p.width,
      height: 78,
      backgroundColor: "transparent",
      borderColor: ARCH_THEME.accent,
      borderWidth: 2,
      borderRadius: 999,
      zIndex: 25,
    },
    {
      id: "arch-cta-fill",
      type: "rounded-rect",
      x: p.x + 10,
      y: p.y + 10,
      width: p.width - 20,
      height: 58,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderWidth: 0,
      borderRadius: 999,
      zIndex: 24,
    },
    {
      id: "arch-cta-text",
      type: "text",
      x: p.x,
      y: p.y + 25,
      width: p.width,
      height: 32,
      dataField: "cta_text",
      fontSize: 28,
      fontWeight: 900,
      textColor: ARCH_THEME.text,
      textAlign: "center",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 2,
      borderWidth: 0,
      zIndex: 26,
    },
  ],

  () => [
    {
      id: "arch-cta-solid",
      type: "rounded-rect",
      x: p.x,
      y: p.y,
      width: p.width,
      height: 82,
      backgroundColor: ARCH_THEME.dark,
      borderColor: ARCH_THEME.accent,
      borderWidth: 1,
      borderRadius: 18,
      zIndex: 25,
    },
    {
      id: "arch-cta-solid-line",
      type: "rounded-rect",
      x: p.x + 24,
      y: p.y + 18,
      width: 72,
      height: 2,
      backgroundColor: ARCH_THEME.accent,
      borderWidth: 0,
      borderRadius: 999,
      zIndex: 26,
    },
    {
      id: "arch-cta-solid-text",
      type: "text",
      x: p.x + 24,
      y: p.y + 44,
      width: p.width - 48,
      height: 30,
      dataField: "cta_text",
      fontSize: 24,
      fontWeight: 900,
      textColor: ARCH_THEME.inverseText,
      textAlign: "left",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 2,
      borderWidth: 0,
      zIndex: 27,
    },
  ],

  () => [
    {
      id: "arch-cta-minimal-line",
      type: "rounded-rect",
      x: p.x,
      y: p.y + 76,
      width: p.width,
      height: 2,
      backgroundColor: ARCH_THEME.accent,
      borderWidth: 0,
      borderRadius: 999,
      zIndex: 25,
    },
    {
      id: "arch-cta-minimal-text",
      type: "text",
      x: p.x,
      y: p.y + 24,
      width: p.width,
      height: 34,
      dataField: "cta_text",
      fontSize: 28,
      fontWeight: 900,
      textColor: ARCH_THEME.text,
      textAlign: "left",
      fontFamily: "'Syne', sans-serif",
      lineHeight: 1,
      letterSpacing: 2,
      borderWidth: 0,
      zIndex: 26,
    },
  ],
];

export const architecturalCtaShapes = pick(ctaLayouts)();