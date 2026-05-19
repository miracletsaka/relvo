export type BrandTheme = {
  name?: string;
  bg: string;
  surface: string;
  cream: string;
  accent: string;
  accent2: string;
  text: string;
  muted: string;
  line: string;
  glow: string;
};

export type BackgroundContext = {
  width: number;
  height: number;
  safe?: number;
  theme: BrandTheme;
  direction?: string;
};

export type Shape = Record<string, any>;
export type BackgroundGenerator = (ctx: BackgroundContext) => Shape[];

export const pick = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

export const jitter = (base: number, amount: number) =>
  Math.round(base + (Math.random() * amount * 2 - amount));
