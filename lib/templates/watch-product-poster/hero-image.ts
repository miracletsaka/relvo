import { WATCH_POSTER_LAYOUT } from "./layout";

const pick = <T,>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const palettes = [
  {
    halo: "rgba(255,255,255,0.045)",
    glow: "rgba(255,255,255,0.075)",
    beam: "rgba(255,255,255,0.055)",
    shadow: "rgba(0,0,0,0.45)",
    accent: "rgba(239,68,68,0.65)",
  },
  {
    halo: "rgba(239,68,68,0.055)",
    glow: "rgba(239,68,68,0.09)",
    beam: "rgba(239,68,68,0.055)",
    shadow: "rgba(0,0,0,0.5)",
    accent: "rgba(239,68,68,0.75)",
  },
  {
    halo: "rgba(250,204,21,0.045)",
    glow: "rgba(250,204,21,0.065)",
    beam: "rgba(250,204,21,0.045)",
    shadow: "rgba(0,0,0,0.48)",
    accent: "rgba(250,204,21,0.5)",
  },
];

const palette = pick(palettes);

let shapes: any[] = [];

if (WATCH_POSTER_LAYOUT === "editorial-left") {
  shapes = [
    {
      id: "watch-right-circle",
      type: "circle",
      x: 520,
      y: 280,
      width: 620,
      height: 620,
      backgroundColor: palette.halo,
      borderWidth: 0,
      opacity: 1,
      zIndex: 2,
    },
    {
      id: "watch-product-image",
      type: "image",
      x: 430,
      y: 240,
      width: 720,
      height: 720,
      dataField: "heroImage",
      fit: "contain",
      radius: 0,
      borderWidth: 0,
      zIndex: 15,
    },
    {
      id: "watch-ground-shadow",
      type: "circle",
      x: 610,
      y: 860,
      width: 360,
      height: 60,
      backgroundColor: palette.shadow,
      borderWidth: 0,
      opacity: 0.5,
      zIndex: 14,
    },
  ];
}

if (WATCH_POSTER_LAYOUT === "center-product") {
  shapes = [
    {
      id: "watch-main-halo",
      type: "circle",
      x: 180,
      y: 290,
      width: 720,
      height: 720,
      backgroundColor: palette.glow,
      borderWidth: 0,
      opacity: 1,
      zIndex: 2,
    },
    {
      id: "watch-product-image",
      type: "image",
      x: 110,
      y: 270,
      width: 860,
      height: 860,
      dataField: "heroImage",
      fit: "contain",
      radius: 0,
      borderWidth: 0,
      zIndex: 15,
    },
    {
      id: "watch-reflection",
      type: "rounded-rect",
      x: 330,
      y: 1110,
      width: 420,
      height: 6,
      backgroundColor: palette.accent,
      borderWidth: 0,
      borderRadius: 999,
      opacity: 0.32,
      zIndex: 16,
    },
  ];
}

if (WATCH_POSTER_LAYOUT === "minimal-luxury") {
  shapes = [
    {
      id: "watch-soft-halo",
      type: "circle",
      x: 390,
      y: 320,
      width: 500,
      height: 500,
      backgroundColor: palette.halo,
      borderWidth: 0,
      opacity: 0.9,
      zIndex: 2,
    },
    {
      id: "watch-product-image",
      type: "image",
      x: 320,
      y: 300,
      width: 620,
      height: 620,
      dataField: "heroImage",
      fit: "contain",
      radius: 0,
      borderWidth: 0,
      zIndex: 15,
    },
    {
      id: "watch-luxury-frame",
      type: "rounded-rect",
      x: 370,
      y: 360,
      width: 520,
      height: 520,
      backgroundColor: "transparent",
      borderColor: palette.accent,
      borderWidth: 1,
      borderRadius: 999,
      opacity: 0.24,
      zIndex: 3,
    },
  ];
}

if (WATCH_POSTER_LAYOUT === "bold-retail") {
  shapes = [
    {
      id: "watch-retail-beam",
      type: "rounded-rect",
      x: 580,
      y: -100,
      width: 160,
      height: 1600,
      backgroundColor: palette.beam,
      borderWidth: 0,
      borderRadius: 999,
      opacity: 0.4,
      rotation: -8,
      zIndex: 2,
    },
    {
      id: "watch-product-image",
      type: "image",
      x: 300,
      y: 260,
      width: 760,
      height: 760,
      dataField: "heroImage",
      fit: "contain",
      radius: 0,
      borderWidth: 0,
      zIndex: 15,
    },
    {
      id: "watch-retail-shadow",
      type: "circle",
      x: 470,
      y: 930,
      width: 380,
      height: 70,
      backgroundColor: palette.shadow,
      borderWidth: 0,
      opacity: 0.7,
      zIndex: 14,
    },
  ];
}

if (WATCH_POSTER_LAYOUT === "stacked-vertical") {
  shapes = [
    {
      id: "watch-vertical-halo",
      type: "circle",
      x: 260,
      y: 360,
      width: 620,
      height: 620,
      backgroundColor: palette.glow,
      borderWidth: 0,
      opacity: 1,
      zIndex: 2,
    },
    {
      id: "watch-product-image",
      type: "image",
      x: 180,
      y: 360,
      width: 720,
      height: 720,
      dataField: "heroImage",
      fit: "contain",
      radius: 0,
      borderWidth: 0,
      zIndex: 15,
    },
    {
      id: "watch-vertical-reflection",
      type: "rounded-rect",
      x: 360,
      y: 1080,
      width: 360,
      height: 5,
      backgroundColor: palette.accent,
      borderWidth: 0,
      borderRadius: 999,
      opacity: 0.24,
      zIndex: 16,
    },
  ];
}

export const watchPosterHeroImageShapes = shapes;