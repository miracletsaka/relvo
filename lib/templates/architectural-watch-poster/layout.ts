const pick = <T,>(items: readonly T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

export const ARCH_CANVAS = {
  width: 1080,
  height: 1350,
  safe: 72,
};

export const architecturalLayouts = [
  "gallery-right",
  "center-pedestal",
  "editorial-arch",
  "minimal-gallery",
  "split-wall",
] as const;

export type ArchitecturalLayout = (typeof architecturalLayouts)[number];

export const ARCH_POSTER_LAYOUT: ArchitecturalLayout = pick(architecturalLayouts);

export const ARCH_DIRECTION = pick([
  "gallery-luxury",
  "museum-minimal",
  "hard-light",
  "editorial-premium",
  "monochrome-gold",
] as const);

export const ARCH_THEME = pick([
  {
    name: "warm-gallery",
    bg: "#e8dfd4",
    wall: "#efe8df",
    dark: "#090b0f",
    pedestal: "#6a6258",
    pedestalTop: "#84796c",
    accent: "#c99a4a",
    accent2: "#f2d49b",
    text: "#111111",
    inverseText: "#ffffff",
    muted: "rgba(17,17,17,0.58)",
    inverseMuted: "rgba(255,255,255,0.62)",
    line: "rgba(17,17,17,0.16)",
    glow: "rgba(255,255,255,0.20)",
    shadow: "rgba(0,0,0,0.20)",
  },
  {
    name: "stone-black",
    bg: "#d8d0c5",
    wall: "#eee7de",
    dark: "#0d0d0d",
    pedestal: "#5b554f",
    pedestalTop: "#746b62",
    accent: "#d4a94f",
    accent2: "#f6d889",
    text: "#121212",
    inverseText: "#ffffff",
    muted: "rgba(18,18,18,0.56)",
    inverseMuted: "rgba(255,255,255,0.60)",
    line: "rgba(18,18,18,0.14)",
    glow: "rgba(255,255,255,0.18)",
    shadow: "rgba(0,0,0,0.22)",
  },
  {
    name: "cream-charcoal",
    bg: "#f1e7da",
    wall: "#f8f1e8",
    dark: "#111317",
    pedestal: "#70665c",
    pedestalTop: "#928679",
    accent: "#b9893b",
    accent2: "#eac179",
    text: "#0f0f0f",
    inverseText: "#ffffff",
    muted: "rgba(15,15,15,0.54)",
    inverseMuted: "rgba(255,255,255,0.56)",
    line: "rgba(15,15,15,0.13)",
    glow: "rgba(255,255,255,0.22)",
    shadow: "rgba(0,0,0,0.18)",
  },
] as const);
