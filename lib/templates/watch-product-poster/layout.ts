const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export type WatchPosterLayoutName =
  | "editorial-left"
  | "center-product"
  | "bold-retail"
  | "minimal-luxury"
  | "stacked-vertical";

export const WATCH_POSTER_LAYOUT = pick([
  "editorial-left",
  "center-product",
  "bold-retail",
  "minimal-luxury",
  "stacked-vertical",
] as WatchPosterLayoutName[]);