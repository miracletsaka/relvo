import {
  editorialLuxuryBackground,
  techFuturisticBackground,
  premiumRetailBackground,
  organicBeautyBackground,
  brutalistPosterBackground,
} from "@/lib/templates/shared/backgrounds";

const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

export const WATCH_BRAND_THEME = {
  name: "luxury-watch",

  bg: "#05070b",
  surface: "#111827",

  cream: "#f8f4ea",

  accent: "#facc15",
  accent2: "#fde68a",

  text: "#ffffff",

  muted: "rgba(255,255,255,0.62)",

  line: "rgba(250,204,21,0.22)",

  glow: "rgba(250,204,21,0.14)",
};

const watchBackgrounds = [
  editorialLuxuryBackground,
  techFuturisticBackground,
  premiumRetailBackground,
  organicBeautyBackground,
  brutalistPosterBackground,
];

export const watchPosterBackgroundShapes = pick(watchBackgrounds)({
  width: 1080,
  height: 1350,
  safe: 72,
  theme: WATCH_BRAND_THEME,
  direction: "luxury-watch",
});

