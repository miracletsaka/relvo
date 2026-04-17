import type { CampaignData, TemplateShape } from "@/lib/types";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type Orientation = "portrait" | "landscape" | "square";

export type LayoutVariant =
  | "left-content-right-hero"
  | "right-content-left-hero"
  | "top-hero-bottom-content"
  | "centered-content-bg-hero"
  | "split-diagonal"
  | "content-top-left-hero-corner"
  | "editorial-center-stack"
  | "hero-top-card-bottom";

export type PaletteName =
  | "navy-gold"
  | "lavender-coral"
  | "emerald-white"
  | "midnight-blue"
  | "rose-dark"
  | "slate-cyan"
  | "sand-brown"
  | "mono-lux"
  | "forest-cream"
  | "obsidian-amber"
  | "arctic-fire"
  | "violet-lime";

export type StyleFamily =
  | "editorial"
  | "saas-premium"
  | "conversion-ad"
  | "poster"
  | "minimal"
  | "tech-dark";

export type Mood = "bold" | "clean" | "luxury" | "energetic" | "calm";
export type Density = "low" | "medium" | "high";
export type PaletteMode = "dark" | "light" | "mixed";
export type AlignmentBias = "left" | "center" | "right" | "mixed";
export type BulletDotStyle = "square" | "circle" | "dash" | "arrow" | "chevron";
export type HeadlineSize = "xl" | "lg" | "md";
export type CTAStyle = "filled" | "pill" | "outline" | "ghost" | "gradient";

export type Rect = { x: number; y: number; width: number; height: number };

export type GradientStop = { stop: number; color: string };

export type Palette = {
  name: PaletteName;
  bg: string;
  bgGradient: GradientStop[];
  bgGradientAngle: number;
  surface: string;
  surfaceOpacity: number;
  accent: string;
  accent2: string;
  accentGradient: GradientStop[];
  text: string;
  textEmphasis: string;
  muted: string;
  heroTint: string;
  heroTintGradient: GradientStop[];
  surfaceBorder: string;
  cardShadow: string;
  glowColor: string;
};

export type AICreativeDirection = {
  styleFamily: StyleFamily;
  mood: Mood;
  asymmetry: number;
  density: Density;
  paletteMode: PaletteMode;
  heroDominance: number;
  decorIntensity: number;
  textAlignmentBias: AlignmentBias;
  showSurfaceCard: boolean;
  headlineMultiColor: boolean;
  useGlowEffect: boolean;
  bgPatternType: "none" | "dots" | "lines" | "mesh" | "noise";
};

export type ElementSelection = {
  showHookTag: boolean;
  showHookPre: boolean;
  showDividerLine: boolean;
  showSubheading: boolean;
  showBullets: boolean;
  bulletCount: 2 | 3;
  showProof: boolean;
  showReview: boolean;
  showFooter: boolean;
  headlineSize: HeadlineSize;
  bulletDotStyle: BulletDotStyle;
  ctaStyle: CTAStyle;
  ctaSecondary: boolean;
  showSecondaryImage: boolean;
  showSponsors: boolean;
  showAccreditations: boolean;
  showBusinessMeta: boolean;
};

export type AICompositionPlan = {
  layout: LayoutVariant;
  paletteName: PaletteName;
  elements: ElementSelection;
};

export type AILayoutSkeleton = {
  canvas: { width: number; height: number };
  zones: {
    content: Rect;
    hero?: Rect;
    headline: Rect;
    subheading?: Rect;
    bullets?: Rect;
    proof?: Rect;
    review?: Rect;
    cta: Rect;
    secondaryImage?: Rect;
    footer?: Rect;
    sponsors?: Rect;
    accreditations?: Rect;
    businessMeta?: Rect;
  };
  rules: {
    minGap: number;
    safeMargin: number;
    textMustStayInside: boolean;
    allowOverlayTextOnHero: boolean;
  };
};

export type AIBlockPlacement = {
  field:
    | "hook_tag" | "hook_pre" | "hook" | "hook_emphasis"
    | "subheading" | "bullets" | "proof"
    | "review_text" | "review_author"
    | "cta" | "offer_cta"
    | "companyName" | "business_website" | "business_meta"
    | "sponsors" | "accreditations";
  rect: Rect;
  style: {
    fontSize?: number;
    fontWeight?: number;
    textAlign?: "left" | "center" | "right";
    color?: string;
    backgroundColor?: string;
    gradientColors?: GradientStop[];
    gradientAngle?: number;
    radius?: number;
    fontFamily?: string;
    fontStyle?: "normal" | "italic";
    lineHeight?: number;
    letterSpacing?: number;
    shadowBlur?: number;
    shadowColor?: string;
    glowIntensity?: number;
  };
};

export type LayoutScore = {
  overlapScore: number;
  hierarchyScore: number;
  readabilityScore: number;
  whitespaceScore: number;
  uniquenessScore: number;
  ctaVisibilityScore: number;
  total: number;
};

export type DecorShapeKind =
  | "circle" | "pill" | "bar" | "chip" | "ring" | "soft-card"
  | "glow-blob" | "dot-grid"
  | "star" | "sparkle" | "cross" | "arc" | "wave-line" | "hexagon";

export type DecorEdge =
  | "top-left" | "top-right" | "bottom-left" | "bottom-right"
  | "left" | "right" | "top" | "bottom";

export type AIDecorPlan = {
  shapes: Array<{
    kind: DecorShapeKind;
    edge: DecorEdge;
    size: "sm" | "md" | "lg";
    colorMode: "accent" | "accent2" | "soft" | "glow";
    opacity: number;
  }>;
};

type CampaignImageSlots = {
  logo?: string;
  hero_person?: string;
  dashboard_image?: string;
};

type PlacementMap = Partial<Record<AIBlockPlacement["field"], AIBlockPlacement>>;

type NormalizedCampaignData = CampaignData & {
  hook_pre: string; hook_tag: string;
  bullet_1: string; bullet_2: string; bullet_3: string;
  review_text: string; review_author: string;
  offer_title: string; offer_cta: string;
  price_label: string; business_website: string;
  business_tagline: string; business_description: string;
  business_type: string; fine_print: string;
  ctaLink: string; hashtags: string; location: string;
  companyName: string; logo: string; hero_person: string; dashboard_image: string;
  bullets: string[];
  sponsors: NonNullable<CampaignData["sponsors"]>;
  reviews: NonNullable<CampaignData["reviews"]>;
  offers: NonNullable<CampaignData["offers"]>;
  accreditations: NonNullable<CampaignData["accreditations"]>;
  metadata: NonNullable<CampaignData["metadata"]>;
  businessInfo: NonNullable<CampaignData["businessInfo"]>;
};

type BrandFingerprint = {
  seed: number;
  orgKey: string;
  displayFont: string;
  bodyFont: string;
  accentRotation: number;
  layoutBias: "left-heavy" | "right-heavy" | "centered" | "asymmetric";
  cardStyle: "sharp" | "soft" | "pill" | "none";
  decorDensity: number;
};

type RenderContext = {
  canvasW: number; canvasH: number;
  orientation: Orientation;
  palette: Palette;
  direction: AICreativeDirection;
  composition: AICompositionPlan;
  skeleton: AILayoutSkeleton;
  placements: PlacementMap;
  decorPlan: AIDecorPlan;
  campaign: NormalizedCampaignData;
  imageSlots: CampaignImageSlots;
  brand: BrandFingerprint;
};

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const BEBAS = "'Bebas Neue', Impact, sans-serif";
const BODY  = "'Inter', 'Helvetica Neue', sans-serif";

// Canvas sizes per orientation
const CANVAS_SIZES: Record<Orientation, { width: number; height: number }> = {
  portrait:  { width: 1080, height: 1350 },
  landscape: { width: 1920, height: 1080 },
  square:    { width: 1080, height: 1080 },
};

// Layouts that work well per orientation
const LAYOUTS_BY_ORIENTATION: Record<Orientation, LayoutVariant[]> = {
  portrait: [
    "left-content-right-hero",
    "right-content-left-hero",
    "top-hero-bottom-content",
    "centered-content-bg-hero",
    "split-diagonal",
    "content-top-left-hero-corner",
    "editorial-center-stack",
    "hero-top-card-bottom",
  ],
  landscape: [
    "left-content-right-hero",
    "right-content-left-hero",
    "centered-content-bg-hero",
    "split-diagonal",
    "content-top-left-hero-corner",
  ],
  square: [
    "centered-content-bg-hero",
    "editorial-center-stack",
    "hero-top-card-bottom",
    "top-hero-bottom-content",
    "left-content-right-hero",
    "right-content-left-hero",
  ],
};

const VALID_LAYOUTS: LayoutVariant[] = [
  "left-content-right-hero", "right-content-left-hero", "top-hero-bottom-content",
  "centered-content-bg-hero", "split-diagonal", "content-top-left-hero-corner",
  "editorial-center-stack", "hero-top-card-bottom",
];

const VALID_PALETTES: PaletteName[] = [
  "navy-gold", "lavender-coral", "emerald-white", "midnight-blue", "rose-dark",
  "slate-cyan", "sand-brown", "mono-lux", "forest-cream", "obsidian-amber",
  "arctic-fire", "violet-lime",
];

const PALETTES: Record<PaletteName, Palette> = {
  "navy-gold": {
    name: "navy-gold", bg: "#0f172a",
    bgGradient: [{ stop: 0, color: "#0f172a" }, { stop: 0.6, color: "#1e293b" }, { stop: 1, color: "#0a0f1e" }],
    bgGradientAngle: 135, surface: "#1e2d45", surfaceOpacity: 0.92,
    accent: "#f59e0b", accent2: "#3b82f6",
    accentGradient: [{ stop: 0, color: "#f59e0b" }, { stop: 1, color: "#ef4444" }],
    text: "#f8fafc", textEmphasis: "#fbbf24", muted: "#94a3b8",
    heroTint: "#0f172ab3",
    heroTintGradient: [{ stop: 0, color: "#0f172a00" }, { stop: 0.5, color: "#0f172a88" }, { stop: 1, color: "#0f172aee" }],
    surfaceBorder: "#334155", cardShadow: "rgba(0,0,0,0.6)", glowColor: "rgba(245,158,11,0.35)",
  },
  "lavender-coral": {
    name: "lavender-coral", bg: "#ede9fe",
    bgGradient: [{ stop: 0, color: "#ede9fe" }, { stop: 0.5, color: "#f5f3ff" }, { stop: 1, color: "#fce7f3" }],
    bgGradientAngle: 160, surface: "#ffffff", surfaceOpacity: 0.95,
    accent: "#f43f5e", accent2: "#7c3aed",
    accentGradient: [{ stop: 0, color: "#f43f5e" }, { stop: 1, color: "#ec4899" }],
    text: "#1e1b4b", textEmphasis: "#f43f5e", muted: "#6b7280",
    heroTint: "#ede9fe88",
    heroTintGradient: [{ stop: 0, color: "#ede9fe00" }, { stop: 0.6, color: "#ede9fe66" }, { stop: 1, color: "#ede9fecc" }],
    surfaceBorder: "#ddd6fe", cardShadow: "rgba(124,58,237,0.12)", glowColor: "rgba(244,63,94,0.25)",
  },
  "emerald-white": {
    name: "emerald-white", bg: "#ecfdf5",
    bgGradient: [{ stop: 0, color: "#ecfdf5" }, { stop: 0.5, color: "#f0fdf4" }, { stop: 1, color: "#d1fae5" }],
    bgGradientAngle: 145, surface: "#ffffff", surfaceOpacity: 0.96,
    accent: "#059669", accent2: "#1d4ed8",
    accentGradient: [{ stop: 0, color: "#059669" }, { stop: 1, color: "#10b981" }],
    text: "#064e3b", textEmphasis: "#059669", muted: "#6b7280",
    heroTint: "#ecfdf588",
    heroTintGradient: [{ stop: 0, color: "#ecfdf500" }, { stop: 0.6, color: "#ecfdf566" }, { stop: 1, color: "#ecfdf5bb" }],
    surfaceBorder: "#a7f3d0", cardShadow: "rgba(5,150,105,0.1)", glowColor: "rgba(5,150,105,0.2)",
  },
  "midnight-blue": {
    name: "midnight-blue", bg: "#163457",
    bgGradient: [{ stop: 0, color: "#0d2137" }, { stop: 0.5, color: "#163457" }, { stop: 1, color: "#0a1a2e" }],
    bgGradientAngle: 150, surface: "#1e3a5f", surfaceOpacity: 0.9,
    accent: "#fbbf24", accent2: "#60a5fa",
    accentGradient: [{ stop: 0, color: "#fbbf24" }, { stop: 1, color: "#f97316" }],
    text: "#ffffff", textEmphasis: "#fbbf24", muted: "#bfdbfe",
    heroTint: "#163457aa",
    heroTintGradient: [{ stop: 0, color: "#16345700" }, { stop: 0.5, color: "#16345777" }, { stop: 1, color: "#163457cc" }],
    surfaceBorder: "#3b82f6", cardShadow: "rgba(0,0,0,0.5)", glowColor: "rgba(251,191,36,0.3)",
  },
  "rose-dark": {
    name: "rose-dark", bg: "#fff1f2",
    bgGradient: [{ stop: 0, color: "#fff1f2" }, { stop: 0.5, color: "#fff5f7" }, { stop: 1, color: "#ffe4e6" }],
    bgGradientAngle: 140, surface: "#ffffff", surfaceOpacity: 0.97,
    accent: "#e11d48", accent2: "#9333ea",
    accentGradient: [{ stop: 0, color: "#e11d48" }, { stop: 1, color: "#f43f5e" }],
    text: "#1f2937", textEmphasis: "#e11d48", muted: "#9ca3af",
    heroTint: "#fff1f299",
    heroTintGradient: [{ stop: 0, color: "#fff1f200" }, { stop: 0.6, color: "#fff1f266" }, { stop: 1, color: "#fff1f2cc" }],
    surfaceBorder: "#fecdd3", cardShadow: "rgba(225,29,72,0.1)", glowColor: "rgba(225,29,72,0.2)",
  },
  "slate-cyan": {
    name: "slate-cyan", bg: "#0f172a",
    bgGradient: [{ stop: 0, color: "#0a0f1a" }, { stop: 0.5, color: "#0f172a" }, { stop: 1, color: "#0c1a2e" }],
    bgGradientAngle: 120, surface: "#1e293b", surfaceOpacity: 0.9,
    accent: "#06b6d4", accent2: "#8b5cf6",
    accentGradient: [{ stop: 0, color: "#06b6d4" }, { stop: 1, color: "#0ea5e9" }],
    text: "#f1f5f9", textEmphasis: "#06b6d4", muted: "#64748b",
    heroTint: "#0f172a99",
    heroTintGradient: [{ stop: 0, color: "#0f172a00" }, { stop: 0.5, color: "#0f172a77" }, { stop: 1, color: "#0f172acc" }],
    surfaceBorder: "#334155", cardShadow: "rgba(0,0,0,0.55)", glowColor: "rgba(6,182,212,0.3)",
  },
  "sand-brown": {
    name: "sand-brown", bg: "#fefce8",
    bgGradient: [{ stop: 0, color: "#fefce8" }, { stop: 0.5, color: "#fef9c3" }, { stop: 1, color: "#fde68a" }],
    bgGradientAngle: 155, surface: "#ffffff", surfaceOpacity: 0.96,
    accent: "#92400e", accent2: "#d97706",
    accentGradient: [{ stop: 0, color: "#92400e" }, { stop: 1, color: "#b45309" }],
    text: "#1c1917", textEmphasis: "#92400e", muted: "#78716c",
    heroTint: "#fefce899",
    heroTintGradient: [{ stop: 0, color: "#fefce800" }, { stop: 0.6, color: "#fefce866" }, { stop: 1, color: "#fefce8cc" }],
    surfaceBorder: "#fde68a", cardShadow: "rgba(146,64,14,0.1)", glowColor: "rgba(146,64,14,0.15)",
  },
  "mono-lux": {
    name: "mono-lux", bg: "#f8fafc",
    bgGradient: [{ stop: 0, color: "#ffffff" }, { stop: 0.5, color: "#f8fafc" }, { stop: 1, color: "#f1f5f9" }],
    bgGradientAngle: 160, surface: "#ffffff", surfaceOpacity: 1,
    accent: "#111827", accent2: "#4b5563",
    accentGradient: [{ stop: 0, color: "#111827" }, { stop: 1, color: "#374151" }],
    text: "#0f172a", textEmphasis: "#000000", muted: "#6b7280",
    heroTint: "#ffffff88",
    heroTintGradient: [{ stop: 0, color: "#ffffff00" }, { stop: 0.6, color: "#ffffff66" }, { stop: 1, color: "#ffffffcc" }],
    surfaceBorder: "#e5e7eb", cardShadow: "rgba(0,0,0,0.08)", glowColor: "rgba(0,0,0,0.1)",
  },
  "forest-cream": {
    name: "forest-cream", bg: "#f7f7ef",
    bgGradient: [{ stop: 0, color: "#f7f7ef" }, { stop: 0.5, color: "#f0f4ec" }, { stop: 1, color: "#e8f0e6" }],
    bgGradientAngle: 150, surface: "#ffffff", surfaceOpacity: 0.96,
    accent: "#1f5138", accent2: "#6b8f71",
    accentGradient: [{ stop: 0, color: "#1f5138" }, { stop: 1, color: "#2d6a4f" }],
    text: "#163020", textEmphasis: "#1f5138", muted: "#6b7280",
    heroTint: "#f7f7efaa",
    heroTintGradient: [{ stop: 0, color: "#f7f7ef00" }, { stop: 0.6, color: "#f7f7ef77" }, { stop: 1, color: "#f7f7efcc" }],
    surfaceBorder: "#d9e5db", cardShadow: "rgba(31,81,56,0.1)", glowColor: "rgba(31,81,56,0.15)",
  },
  "obsidian-amber": {
    name: "obsidian-amber", bg: "#0a0a0a",
    bgGradient: [{ stop: 0, color: "#0a0a0a" }, { stop: 0.5, color: "#111111" }, { stop: 1, color: "#0d0d0d" }],
    bgGradientAngle: 130, surface: "#1a1a1a", surfaceOpacity: 0.92,
    accent: "#f59e0b", accent2: "#ef4444",
    accentGradient: [{ stop: 0, color: "#f59e0b" }, { stop: 1, color: "#fbbf24" }],
    text: "#fafafa", textEmphasis: "#f59e0b", muted: "#737373",
    heroTint: "#0a0a0a99",
    heroTintGradient: [{ stop: 0, color: "#0a0a0a00" }, { stop: 0.5, color: "#0a0a0a88" }, { stop: 1, color: "#0a0a0add" }],
    surfaceBorder: "#262626", cardShadow: "rgba(0,0,0,0.8)", glowColor: "rgba(245,158,11,0.4)",
  },
  "arctic-fire": {
    name: "arctic-fire", bg: "#e0f2fe",
    bgGradient: [{ stop: 0, color: "#e0f2fe" }, { stop: 0.5, color: "#f0f9ff" }, { stop: 1, color: "#bae6fd" }],
    bgGradientAngle: 145, surface: "#ffffff", surfaceOpacity: 0.95,
    accent: "#ef4444", accent2: "#0284c7",
    accentGradient: [{ stop: 0, color: "#ef4444" }, { stop: 1, color: "#f97316" }],
    text: "#0c4a6e", textEmphasis: "#ef4444", muted: "#64748b",
    heroTint: "#e0f2fe88",
    heroTintGradient: [{ stop: 0, color: "#e0f2fe00" }, { stop: 0.6, color: "#e0f2fe66" }, { stop: 1, color: "#e0f2fecc" }],
    surfaceBorder: "#bae6fd", cardShadow: "rgba(2,132,199,0.12)", glowColor: "rgba(239,68,68,0.25)",
  },
  "violet-lime": {
    name: "violet-lime", bg: "#1a0533",
    bgGradient: [{ stop: 0, color: "#0d0120" }, { stop: 0.5, color: "#1a0533" }, { stop: 1, color: "#120228" }],
    bgGradientAngle: 140, surface: "#2d0f52", surfaceOpacity: 0.88,
    accent: "#a3e635", accent2: "#c084fc",
    accentGradient: [{ stop: 0, color: "#a3e635" }, { stop: 1, color: "#84cc16" }],
    text: "#f5f3ff", textEmphasis: "#a3e635", muted: "#a78bfa",
    heroTint: "#1a053399",
    heroTintGradient: [{ stop: 0, color: "#1a053300" }, { stop: 0.5, color: "#1a053377" }, { stop: 1, color: "#1a0533cc" }],
    surfaceBorder: "#4c1d95", cardShadow: "rgba(0,0,0,0.7)", glowColor: "rgba(163,230,53,0.35)",
  },
};

const Z_BG = 0;
const Z_BG_GRAD = 1;
const Z_DECOR = 2;
const Z_SURFACE = 3;
const Z_HERO = 4;
const Z_SECONDARY = 5;
const Z_CARD = 6;
const Z_TEXT = 20;
const Z_CTA = 21;
const Z_LOGO = 22;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pickRandom<T>(items: T[], exclude?: T): T {
  const pool = exclude === undefined ? items : items.filter((i) => i !== exclude);
  if (!pool.length) return items[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function rectRight(r: Rect) { return r.x + r.width; }
function rectBottom(r: Rect) { return r.y + r.height; }
function rectArea(r: Rect) { return Math.max(0, r.width) * Math.max(0, r.height); }

function overlapArea(a: Rect, b: Rect): number {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(rectRight(a), rectRight(b));
  const y2 = Math.min(rectBottom(a), rectBottom(b));
  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
}

function within(outer: Rect, inner: Rect, margin = 0): boolean {
  return (
    inner.x >= outer.x + margin &&
    inner.y >= outer.y + margin &&
    rectRight(inner) <= rectRight(outer) - margin &&
    rectBottom(inner) <= rectBottom(outer) - margin
  );
}

function expandRect(r: Rect, p: number): Rect {
  return { x: r.x - p, y: r.y - p, width: r.width + p * 2, height: r.height + p * 2 };
}

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

function readSlotUrl(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const url = (value as Record<string, unknown>).url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return undefined;
}

function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

/** Detect orientation from canvas dimensions */
function detectOrientation(w: number, h: number): Orientation {
  const ratio = w / h;
  if (ratio > 1.2) return "landscape";
  if (ratio < 0.85) return "portrait";
  return "square";
}

/**
 * Scale factor helpers — all layout math is done in portrait (1080×1350)
 * then scaled to the actual canvas to prevent overflow.
 */
function scaleRect(r: Rect, scaleX: number, scaleY: number): Rect {
  return {
    x: Math.round(r.x * scaleX),
    y: Math.round(r.y * scaleY),
    width: Math.round(r.width * scaleX),
    height: Math.round(r.height * scaleY),
  };
}

// ─────────────────────────────────────────────────────────────
// BRAND FINGERPRINT — entropy-seeded for variety
// ─────────────────────────────────────────────────────────────

function buildBrandFingerprint(
  campaign: NormalizedCampaignData,
  entropySeed = 0
): BrandFingerprint {
  const orgKey = [campaign.companyName, campaign.business_type, campaign.location]
    .filter(Boolean).join("|").toLowerCase();

  // XOR with a prime × entropy to force variety each call
  const baseSeed = hashString(orgKey || "default-org");
  const seed = (baseSeed ^ (entropySeed * 7919)) >>> 0;

  const layoutBiases: BrandFingerprint["layoutBias"][] = [
    "left-heavy", "right-heavy", "centered", "asymmetric",
  ];
  const cardStyles: BrandFingerprint["cardStyle"][] = ["sharp", "soft", "pill", "none"];

  return {
    seed,
    orgKey,
    displayFont: BEBAS,
    bodyFont: BODY,
    accentRotation: (seed % 12) * 30,
    layoutBias: layoutBiases[seed % layoutBiases.length],
    cardStyle: cardStyles[(seed >> 4) % cardStyles.length],
    decorDensity: ((seed % 100) / 100) * 0.6 + 0.2,
  };
}

// ─────────────────────────────────────────────────────────────
// NORMALIZE CAMPAIGN
// ─────────────────────────────────────────────────────────────

function normalizeCampaignData(input: Partial<CampaignData> = {}): NormalizedCampaignData {
  const reviews = Array.isArray(input.reviews) ? input.reviews : [];
  const offers = Array.isArray(input.offers) ? input.offers : [];
  const sponsors = Array.isArray(input.sponsors) ? input.sponsors : [];
  const accreditations = Array.isArray(input.accreditations) ? input.accreditations : [];
  const metadata = Array.isArray(input.metadata) ? input.metadata : [];
  const businessInfo =
    input.businessInfo && typeof input.businessInfo === "object" ? input.businessInfo : {};
  const firstReview = reviews[0];
  const firstOffer = offers[0];

  const bullets =
    Array.isArray(input.bullets) && input.bullets.length
      ? input.bullets.filter(
          (b): b is string => typeof b === "string" && b.trim().length > 0
        )
      : [];

  const heroImageFromSlots = readSlotUrl(input.imageSlots?.hero_person);
  const dashboardImageFromSlots = readSlotUrl(input.imageSlots?.dashboard_image);
  const logoFromSlots = readSlotUrl(input.imageSlots?.logo);

  return {
    hook: asText(input.hook) || "Grow Faster With Smart AI",
    subheading:
      asText(input.subheading) ||
      asText(businessInfo.description) ||
      "Everything you need to launch, grow, and scale.",
    bullets:
      bullets.length > 0
        ? bullets
        : [
            asText(input.bullet_1) || "Smart automation",
            asText(input.bullet_2) || "Faster response times",
            asText(input.bullet_3) || "More booked appointments",
          ],
    proof: asText(input.proof) || "Trusted by growing businesses",
    cta: asText(input.cta) || "Book Your Free Demo",
    logo: asText(input.logo) || logoFromSlots || "",
    heroImage:
      asText(input.heroImage) || asText(input.hero_person) || heroImageFromSlots || "",
    imageSlots: input.imageSlots || {},
    ctaLink: asText(input.ctaLink),
    hashtags: asText(input.hashtags),
    companyName: asText(input.companyName) || "YourBrand",
    location: asText(input.location),
    links: Array.isArray(input.links) ? input.links : [],
    sponsors, reviews, offers, accreditations, businessInfo, metadata,
    review_text: asText(input.review_text) || asText(firstReview?.body) || "",
    review_author: asText(input.review_author) || asText(firstReview?.author_name) || "",
    offer_title: asText(input.offer_title) || asText(firstOffer?.title) || "",
    offer_cta: asText(input.offer_cta) || asText(firstOffer?.cta_text) || "",
    hook_pre: asText(input.hook_pre) || asText(businessInfo.tagline) || "",
    hook_tag: asText(input.hook_tag),
    bullet_1: asText(input.bullet_1) || bullets[0] || "",
    bullet_2: asText(input.bullet_2) || bullets[1] || "",
    bullet_3: asText(input.bullet_3) || bullets[2] || "",
    price_label: asText(input.price_label),
    fine_print: asText(input.fine_print),
    business_website:
      asText(input.business_website) || asText(businessInfo.website),
    business_tagline:
      asText(input.business_tagline) || asText(businessInfo.tagline),
    business_description:
      asText(input.business_description) || asText(businessInfo.description),
    business_type:
      asText(input.business_type) || asText(businessInfo.business_type),
    hero_person:
      asText(input.hero_person) || heroImageFromSlots || asText(input.heroImage),
    dashboard_image:
      asText(input.dashboard_image) || dashboardImageFromSlots || "",
  };
}

function hasHeroImage(c: NormalizedCampaignData) {
  return isNonEmpty(c.hero_person) || isNonEmpty(c.heroImage);
}
function hasSecondaryImage(c: NormalizedCampaignData) {
  return isNonEmpty(c.dashboard_image);
}
function getAvailableBullets(c: NormalizedCampaignData) {
  return [c.bullet_1, c.bullet_2, c.bullet_3].filter(Boolean).slice(0, 3);
}
function getBusinessMetaLine(c: NormalizedCampaignData) {
  return [c.business_type, c.business_tagline, c.location].filter(Boolean).join(" • ");
}
function compactImageSlots(c: NormalizedCampaignData): CampaignImageSlots {
  const hero = readSlotUrl(c.imageSlots?.hero_person) ?? c.hero_person;
  const dashboard = readSlotUrl(c.imageSlots?.dashboard_image) ?? c.dashboard_image;
  const logo = readSlotUrl(c.imageSlots?.logo) ?? c.logo;
  return {
    logo: logo || undefined,
    hero_person: hero || undefined,
    dashboard_image: dashboard || undefined,
  };
}

// ─────────────────────────────────────────────────────────────
// PASS 1 — CREATIVE DIRECTION
// ─────────────────────────────────────────────────────────────

function buildFallbackCreativeDirection(
  campaign: NormalizedCampaignData,
  brand: BrandFingerprint
): AICreativeDirection {
  const hasHero = hasHeroImage(campaign);
  const longHeadline = campaign.hook.length > 60;
  const seed = brand.seed;

  const bgPatterns: AICreativeDirection["bgPatternType"][] = [
    "none", "dots", "lines", "mesh", "noise",
  ];
  const styleFamilies: StyleFamily[] = [
    "editorial", "saas-premium", "conversion-ad", "poster", "minimal", "tech-dark",
  ];
  const moods: Mood[] = ["bold", "clean", "luxury", "energetic", "calm"];

  return {
    styleFamily: styleFamilies[seed % styleFamilies.length],
    mood: moods[(seed >> 3) % moods.length],
    asymmetry: hasHero ? 0.55 + (seed % 40) / 100 : 0.38 + (seed % 20) / 100,
    density: longHeadline ? "medium" : "low",
    paletteMode:
      (seed % 3) === 0 ? "dark" : (seed % 3) === 1 ? "light" : "mixed",
    heroDominance: hasHero ? 0.55 + (seed % 30) / 100 : 0.22,
    decorIntensity: clamp(brand.decorDensity, 0.15, 0.50),
    textAlignmentBias:
      brand.layoutBias === "centered"
        ? "center"
        : (seed % 4) === 0
        ? "center"
        : "left",
    showSurfaceCard: brand.cardStyle !== "none",
    headlineMultiColor: (seed % 3) !== 0,
    useGlowEffect: (seed % 3) === 0,
    bgPatternType: bgPatterns[seed % bgPatterns.length],
  };
}

async function buildAICreativeDirection(
  campaign: NormalizedCampaignData,
  brand: BrandFingerprint,
  orientation: Orientation
): Promise<AICreativeDirection> {
  try {
    const prompt = `You are a premium ad art director. Return JSON only.
Campaign: ${JSON.stringify({ hook: campaign.hook, companyName: campaign.companyName, business_type: campaign.business_type }, null, 2)}
Brand seed: ${brand.seed}, layoutBias: ${brand.layoutBias}, cardStyle: ${brand.cardStyle}
Orientation: ${orientation}
Images: hasHero=${hasHeroImage(campaign)}, hasSecondary=${hasSecondaryImage(campaign)}
Entropy: ${brand.seed % 999} — use this to make bold, unexpected, VARIED choices. Do not default to saas-premium or bold every time.
Return: { "styleFamily":"editorial|saas-premium|conversion-ad|poster|minimal|tech-dark", "mood":"bold|clean|luxury|energetic|calm", "asymmetry":0.0, "density":"low|medium|high", "paletteMode":"dark|light|mixed", "heroDominance":0.0, "decorIntensity":0.0, "textAlignmentBias":"left|center|right|mixed", "showSurfaceCard":true, "headlineMultiColor":true, "useGlowEffect":false, "bgPatternType":"none|dots|lines|mesh|noise" }`;

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      temperature: 1.1,
    });
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const fallback = buildFallbackCreativeDirection(campaign, brand);

    return {
      styleFamily: ["editorial","saas-premium","conversion-ad","poster","minimal","tech-dark"].includes(parsed.styleFamily) ? parsed.styleFamily : fallback.styleFamily,
      mood: ["bold","clean","luxury","energetic","calm"].includes(parsed.mood) ? parsed.mood : fallback.mood,
      asymmetry: typeof parsed.asymmetry === "number" ? clamp(parsed.asymmetry, 0, 1) : fallback.asymmetry,
      density: ["low","medium","high"].includes(parsed.density) ? parsed.density : fallback.density,
      paletteMode: ["dark","light","mixed"].includes(parsed.paletteMode) ? parsed.paletteMode : fallback.paletteMode,
      heroDominance: typeof parsed.heroDominance === "number" ? clamp(parsed.heroDominance, 0, 1) : fallback.heroDominance,
      decorIntensity: typeof parsed.decorIntensity === "number" ? clamp(parsed.decorIntensity, 0.12, 0.50) : fallback.decorIntensity,
      textAlignmentBias: ["left","center","right","mixed"].includes(parsed.textAlignmentBias) ? parsed.textAlignmentBias : fallback.textAlignmentBias,
      showSurfaceCard: typeof parsed.showSurfaceCard === "boolean" ? parsed.showSurfaceCard : fallback.showSurfaceCard,
      headlineMultiColor: typeof parsed.headlineMultiColor === "boolean" ? parsed.headlineMultiColor : fallback.headlineMultiColor,
      useGlowEffect: typeof parsed.useGlowEffect === "boolean" ? parsed.useGlowEffect : fallback.useGlowEffect,
      bgPatternType: ["none","dots","lines","mesh","noise"].includes(parsed.bgPatternType) ? parsed.bgPatternType : fallback.bgPatternType,
    };
  } catch {
    return buildFallbackCreativeDirection(campaign, brand);
  }
}

// ─────────────────────────────────────────────────────────────
// PASS 2 — COMPOSITION
// ─────────────────────────────────────────────────────────────

function buildFallbackCompositionPlan(
  campaign: NormalizedCampaignData,
  direction: AICreativeDirection,
  brand: BrandFingerprint,
  orientation: Orientation,
  previousLayout?: LayoutVariant | null
): AICompositionPlan {
  const validLayouts = LAYOUTS_BY_ORIENTATION[orientation];
  let layoutPool = [...validLayouts];

  if (brand.layoutBias === "centered" || direction.textAlignmentBias === "center") {
    layoutPool = validLayouts.filter((l) =>
      ["editorial-center-stack","hero-top-card-bottom","top-hero-bottom-content","centered-content-bg-hero"].includes(l)
    );
    if (!layoutPool.length) layoutPool = validLayouts;
  } else if (brand.layoutBias === "right-heavy") {
    layoutPool = validLayouts.filter((l) =>
      ["right-content-left-hero","hero-top-card-bottom","top-hero-bottom-content"].includes(l)
    );
    if (!layoutPool.length) layoutPool = validLayouts;
  } else if (direction.heroDominance > 0.7 && hasHeroImage(campaign)) {
    layoutPool = validLayouts.filter((l) =>
      ["left-content-right-hero","right-content-left-hero","split-diagonal","centered-content-bg-hero","content-top-left-hero-corner"].includes(l)
    );
    if (!layoutPool.length) layoutPool = validLayouts;
  }

  const darkPool: PaletteName[] = ["navy-gold","midnight-blue","slate-cyan","obsidian-amber","violet-lime"];
  const lightPool: PaletteName[] = ["emerald-white","lavender-coral","rose-dark","sand-brown","mono-lux","forest-cream","arctic-fire"];

  const paletteName: PaletteName =
    direction.paletteMode === "dark"
      ? pickRandom(darkPool)
      : direction.paletteMode === "light"
      ? pickRandom(lightPool)
      : pickRandom(VALID_PALETTES);

  const layout = pickRandom(layoutPool, previousLayout ?? undefined);

  const ctaStyles: CTAStyle[] = ["filled","pill","outline","ghost","gradient"];
  const bulletStyles: BulletDotStyle[] = ["square","circle","dash","arrow","chevron"];

  return {
    layout, paletteName,
    elements: {
      showHookTag: isNonEmpty(campaign.hook_tag),
      showHookPre: isNonEmpty(campaign.hook_pre),
      showDividerLine: direction.styleFamily !== "minimal",
      showSubheading: isNonEmpty(campaign.subheading),
      showBullets: getAvailableBullets(campaign).length > 0,
      bulletCount: campaign.bullet_3 ? 3 : 2,
      showProof: isNonEmpty(campaign.proof),
      showReview: isNonEmpty(campaign.review_text),
      showFooter:
        isNonEmpty(campaign.companyName) || isNonEmpty(campaign.business_website),
      headlineSize:
        campaign.hook.length < 34 ? "xl" : campaign.hook.length < 62 ? "lg" : "md",
      bulletDotStyle: bulletStyles[brand.seed % bulletStyles.length],
      ctaStyle: ctaStyles[(brand.seed >> 2) % ctaStyles.length],
      ctaSecondary: !!campaign.offer_cta,
      showSecondaryImage: hasSecondaryImage(campaign),
      showSponsors: campaign.sponsors.length > 0,
      showAccreditations: campaign.accreditations.length > 0,
      showBusinessMeta: !!getBusinessMetaLine(campaign),
    },
  };
}

async function buildAICompositionPlan(
  campaign: NormalizedCampaignData,
  direction: AICreativeDirection,
  brand: BrandFingerprint,
  orientation: Orientation,
  previousLayout?: LayoutVariant | null
): Promise<AICompositionPlan> {
  const validLayouts = LAYOUTS_BY_ORIENTATION[orientation];
  try {
    const prompt = `You are a premium ad composition director. Return JSON only.
Direction: ${JSON.stringify(direction, null, 2)}
Brand: seed=${brand.seed}, layoutBias=${brand.layoutBias}
Campaign hook: "${campaign.hook}", companyName: "${campaign.companyName}"
Orientation: ${orientation}
Available layouts for this orientation: ${validLayouts.join(", ")}
Available palettes: ${VALID_PALETTES.join(", ")}
previousLayout: ${previousLayout ?? "none"} — you MUST pick a different layout.
Entropy: ${brand.seed % 999} — be bold and diverse in your choices.
Return: { "layout":"...", "paletteName":"...", "elements":{ "showHookTag":true, "showHookPre":false, "showDividerLine":true, "showSubheading":true, "showBullets":true, "bulletCount":3, "showProof":false, "showReview":true, "showFooter":true, "headlineSize":"xl", "bulletDotStyle":"circle", "ctaStyle":"pill", "ctaSecondary":false, "showSecondaryImage":true, "showSponsors":true, "showAccreditations":false, "showBusinessMeta":true } }`;

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      temperature: 1.1,
    });
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const fallback = buildFallbackCompositionPlan(
      campaign, direction, brand, orientation, previousLayout
    );

    let layout =
      typeof parsed.layout === "string" && validLayouts.includes(parsed.layout as LayoutVariant)
        ? (parsed.layout as LayoutVariant)
        : fallback.layout;
    if (previousLayout && layout === previousLayout) layout = fallback.layout;

    const paletteName =
      typeof parsed.paletteName === "string" &&
      VALID_PALETTES.includes(parsed.paletteName as PaletteName)
        ? (parsed.paletteName as PaletteName)
        : fallback.paletteName;

    const e =
      parsed.elements && typeof parsed.elements === "object"
        ? (parsed.elements as Record<string, unknown>)
        : {};
    const ctaStyles: CTAStyle[] = ["filled","pill","outline","ghost","gradient"];
    const bulletStyles: BulletDotStyle[] = ["square","circle","dash","arrow","chevron"];

    const safe: AICompositionPlan = {
      layout, paletteName,
      elements: {
        showHookTag: !!e.showHookTag, showHookPre: !!e.showHookPre,
        showDividerLine: !!e.showDividerLine, showSubheading: !!e.showSubheading,
        showBullets: !!e.showBullets,
        bulletCount: e.bulletCount === 2 ? 2 : 3,
        showProof: !!e.showProof, showReview: !!e.showReview, showFooter: !!e.showFooter,
        headlineSize:
          e.headlineSize === "md" ? "md" : e.headlineSize === "lg" ? "lg" : "xl",
        bulletDotStyle: bulletStyles.includes(e.bulletDotStyle as BulletDotStyle)
          ? (e.bulletDotStyle as BulletDotStyle) : "circle",
        ctaStyle: ctaStyles.includes(e.ctaStyle as CTAStyle)
          ? (e.ctaStyle as CTAStyle) : "filled",
        ctaSecondary: !!e.ctaSecondary, showSecondaryImage: !!e.showSecondaryImage,
        showSponsors: !!e.showSponsors, showAccreditations: !!e.showAccreditations,
        showBusinessMeta: !!e.showBusinessMeta,
      },
    };

    // Guard against missing data
    if (!campaign.hook_tag) safe.elements.showHookTag = false;
    if (!campaign.hook_pre) safe.elements.showHookPre = false;
    if (!campaign.subheading) safe.elements.showSubheading = false;
    if (!getAvailableBullets(campaign).length) safe.elements.showBullets = false;
    if (!campaign.proof) safe.elements.showProof = false;
    if (!campaign.review_text) safe.elements.showReview = false;
    if (!hasSecondaryImage(campaign)) safe.elements.showSecondaryImage = false;
    if (!campaign.sponsors.length) safe.elements.showSponsors = false;
    if (!campaign.accreditations.length) safe.elements.showAccreditations = false;
    if (!getBusinessMetaLine(campaign)) safe.elements.showBusinessMeta = false;
    if (!hasHeroImage(campaign) && safe.layout === "centered-content-bg-hero")
      safe.layout = fallback.layout;
    if (campaign.hook.length > 72) {
      safe.elements.headlineSize = "md";
      safe.elements.showReview = false;
      safe.elements.bulletCount = 2;
    }
    if (direction.styleFamily === "minimal") {
      safe.elements.showProof = false;
      safe.elements.showDividerLine = false;
    }

    return safe;
  } catch {
    return buildFallbackCompositionPlan(
      campaign, direction, brand, orientation, previousLayout
    );
  }
}

// ─────────────────────────────────────────────────────────────
// PASS 3 — SKELETON (orientation-aware, overflow-safe)
// ─────────────────────────────────────────────────────────────

function buildOrientationAwareSkeleton(
  composition: AICompositionPlan,
  direction: AICreativeDirection,
  campaign: NormalizedCampaignData,
  canvasW: number,
  canvasH: number,
  orientation: Orientation
): AILayoutSkeleton {
  const pad = Math.round(canvasW * (orientation === "landscape" ? 0.04 : 0.045));
  const minGap = direction.density === "low" ? 20 : direction.density === "medium" ? 14 : 10;

  // Safe zone: no element may go outside these bounds
  const safeX = pad;
  const safeY = pad;
  const safeW = canvasW - pad * 2;
  const safeH = canvasH - pad * 2;

  const zone = (x: number, y: number, w: number, h: number): Rect => ({
    x: Math.round(clamp(x, safeX, canvasW - safeX)),
    y: Math.round(clamp(y, safeY, canvasH - safeY)),
    width: Math.round(clamp(w, 40, canvasW - pad * 2)),
    height: Math.round(clamp(h, 20, canvasH - pad * 2)),
  });

  let content: Rect;
  let hero: Rect | undefined;
  let secondaryImage: Rect | undefined;

  // ── LANDSCAPE overrides: always side-by-side ──────────────
  if (orientation === "landscape") {
    switch (composition.layout) {
      case "right-content-left-hero":
        hero = zone(0, 0, canvasW * 0.50, canvasH);
        content = zone(canvasW * 0.52, safeY, canvasW * 0.44, safeH);
        secondaryImage = zone(canvasW * 0.54, canvasH - canvasH * 0.28, canvasW * 0.28, canvasH * 0.22);
        break;
      case "centered-content-bg-hero":
        hero = zone(0, 0, canvasW, canvasH);
        content = zone(safeX, safeY, canvasW * 0.55, safeH);
        secondaryImage = zone(canvasW * 0.72, canvasH * 0.55, canvasW * 0.22, canvasH * 0.30);
        break;
      case "split-diagonal":
        hero = zone(canvasW * 0.48, 0, canvasW * 0.52, canvasH);
        content = zone(safeX, safeY, canvasW * 0.44, safeH);
        secondaryImage = zone(canvasW * 0.50, canvasH * 0.60, canvasW * 0.26, canvasH * 0.28);
        break;
      case "content-top-left-hero-corner":
        content = zone(safeX, safeY, canvasW * 0.50, safeH * 0.65);
        hero = zone(canvasW * 0.54, safeY, canvasW * 0.40, safeH * 0.62);
        secondaryImage = zone(safeX, safeY + safeH * 0.68, canvasW * 0.40, safeH * 0.24);
        break;
      // default: left-content-right-hero for landscape
      default:
        hero = zone(canvasW * 0.52, 0, canvasW * 0.48, canvasH);
        content = zone(safeX, safeY, canvasW * 0.46, safeH);
        secondaryImage = zone(canvasW * 0.55, canvasH * 0.62, canvasW * 0.28, canvasH * 0.25);
        break;
    }
  }

  // ── SQUARE overrides ──────────────────────────────────────
  else if (orientation === "square") {
    switch (composition.layout) {
      case "editorial-center-stack":
        content = zone(canvasW * 0.08, safeY, canvasW * 0.84, safeH * 0.78);
        hero = hasHeroImage(campaign)
          ? zone(canvasW * 0.10, safeY + 30, canvasW * 0.80, canvasH * 0.28)
          : undefined;
        secondaryImage = zone(canvasW * 0.28, canvasH * 0.76, canvasW * 0.44, canvasH * 0.16);
        break;
      case "hero-top-card-bottom":
        hero = zone(0, 0, canvasW, canvasH * 0.40);
        content = zone(safeX, canvasH * 0.42, safeW, safeH * 0.50);
        secondaryImage = zone(canvasW * 0.62, canvasH * 0.68, canvasW * 0.22, canvasH * 0.18);
        break;
      case "centered-content-bg-hero":
        hero = zone(0, 0, canvasW, canvasH);
        content = zone(safeX, safeY, canvasW * 0.70, safeH);
        secondaryImage = zone(canvasW * 0.72, canvasH * 0.62, canvasW * 0.22, canvasH * 0.24);
        break;
      case "left-content-right-hero":
        content = zone(safeX, safeY, canvasW * 0.48, safeH);
        hero = zone(canvasW * 0.52, 0, canvasW * 0.48, canvasH);
        secondaryImage = zone(canvasW * 0.54, canvasH * 0.68, canvasW * 0.28, canvasH * 0.20);
        break;
      case "right-content-left-hero":
        hero = zone(0, 0, canvasW * 0.48, canvasH);
        content = zone(canvasW * 0.52, safeY, canvasW * 0.44, safeH);
        secondaryImage = zone(safeX, canvasH * 0.70, canvasW * 0.28, canvasH * 0.18);
        break;
      default:
        hero = zone(0, 0, canvasW, canvasH * 0.38);
        content = zone(safeX, canvasH * 0.40, safeW, safeH * 0.52);
        secondaryImage = zone(canvasW * 0.62, canvasH * 0.66, canvasW * 0.22, canvasH * 0.20);
        break;
    }
  }

  // ── PORTRAIT (original logic, overflow-clamped) ──────────
  else {
    switch (composition.layout) {
      case "left-content-right-hero":
        content = zone(safeX, safeY, canvasW * 0.46, safeH);
        hero = zone(canvasW * 0.54, 0, canvasW * 0.46, canvasH);
        secondaryImage = zone(canvasW * 0.57, canvasH - 330, canvasW * 0.30, 180);
        break;
      case "right-content-left-hero":
        content = zone(canvasW * 0.50, safeY, canvasW * 0.44, safeH);
        hero = zone(0, 0, canvasW * 0.46, canvasH);
        secondaryImage = zone(safeX + 16, canvasH - 330, canvasW * 0.30, 180);
        break;
      case "top-hero-bottom-content":
        hero = zone(0, 0, canvasW, canvasH * 0.40);
        content = zone(safeX, canvasH * 0.42, safeW, canvasH * 0.50);
        secondaryImage = zone(canvasW - 310, canvasH * 0.33, 220, 145);
        break;
      case "centered-content-bg-hero":
        hero = zone(0, 0, canvasW, canvasH);
        content = zone(safeX + 12, safeY + 12, canvasW * 0.62, safeH - 24);
        secondaryImage = zone(canvasW - 320, canvasH - 280, 220, 145);
        break;
      case "split-diagonal":
        hero = zone(canvasW * 0.42, 0, canvasW * 0.58, canvasH);
        content = zone(safeX, safeY, canvasW * 0.44, safeH);
        secondaryImage = zone(canvasW * 0.56, canvasH - 300, 250, 170);
        break;
      case "content-top-left-hero-corner":
        content = zone(safeX, safeY, canvasW * 0.54, canvasH * 0.52);
        hero = zone(canvasW * 0.58, canvasH * 0.08, canvasW * 0.33, canvasH * 0.46);
        secondaryImage = zone(safeX, canvasH * 0.64, canvasW * 0.42, canvasH * 0.18);
        break;
      case "editorial-center-stack":
        content = zone(canvasW * 0.10, safeY, canvasW * 0.80, canvasH * 0.72);
        hero = hasHeroImage(campaign)
          ? zone(canvasW * 0.12, 40, canvasW * 0.76, canvasH * 0.30)
          : undefined;
        secondaryImage = zone(canvasW * 0.30, canvasH * 0.74, canvasW * 0.40, 160);
        break;
      case "hero-top-card-bottom":
      default:
        hero = zone(0, 0, canvasW, canvasH * 0.36);
        content = zone(safeX + 12, canvasH * 0.38, safeW - 24, canvasH * 0.46);
        secondaryImage = zone(canvasW * 0.66, canvasH * 0.68, canvasW * 0.20, 130);
        break;
    }
  }

  // ── Content zones (all orientations) ─────────────────────
  // Scale font sizes relative to canvas width
  const fontScale = canvasW / 1080;
  const headlineFontPx =
    composition.elements.headlineSize === "xl"
      ? Math.round(120 * fontScale)
      : composition.elements.headlineSize === "lg"
      ? Math.round(92 * fontScale)
      : Math.round(72 * fontScale);

  // Landscape/square: reduce headline proportionally
  const headlineFontEffective =
    orientation === "landscape"
      ? Math.round(headlineFontPx * 0.70)
      : orientation === "square"
      ? Math.round(headlineFontPx * 0.82)
      : headlineFontPx;

  const headlineH = clamp(Math.round(headlineFontEffective * 2.2), 60, content.height * 0.40);
  const subheadingH = clamp(Math.round(26 * fontScale * 2.8), 36, content.height * 0.14);
  const bulletsH = clamp(
    getAvailableBullets(campaign).length * Math.round(40 * fontScale) + 10,
    40,
    content.height * 0.22
  );
  const proofH = Math.round(32 * fontScale);
  const reviewH = clamp(Math.round(22 * fontScale * 3.5), 36, content.height * 0.12);
  const ctaH = Math.round(62 * fontScale);
  const ctaW = clamp(Math.round(380 * fontScale), 160, content.width * 0.72);
  const footerH = Math.round(24 * fontScale);

  // Stack elements top→bottom within content zone, never overflowing
  const cx = content.x + Math.round(12 * fontScale);
  const cw = content.width - Math.round(24 * fontScale);
  const contentBottom = content.y + content.height;

  let cy = content.y + Math.round(20 * fontScale);

  function nextZone(height: number, gapAfter = minGap): Rect {
    const r: Rect = { x: cx, y: cy, width: cw, height };
    cy += height + gapAfter;
    return r;
  }

  const headlineZone = nextZone(headlineH, minGap + 4);
  const subheadingZone = nextZone(subheadingH, minGap);
  const bulletsZone = nextZone(bulletsH, minGap);
  const proofZone = nextZone(proofH, minGap - 4);
  const reviewZone = nextZone(reviewH, minGap - 4);
  const businessMetaZone = nextZone(Math.round(26 * fontScale), minGap - 4);

  // CTA: pin to bottom of content zone with safe margin
  const ctaY = clamp(
    contentBottom - ctaH - Math.round(40 * fontScale),
    cy,
    contentBottom - ctaH - 10
  );
  const ctaZone: Rect = { x: cx, y: ctaY, width: ctaW, height: ctaH };
  const footerZone: Rect = {
    x: cx,
    y: clamp(ctaY + ctaH + 8, ctaY + ctaH, contentBottom - footerH - 4),
    width: cw,
    height: footerH,
  };
  const sponsorsZone: Rect = {
    x: cx,
    y: clamp(ctaY + ctaH + footerH + 10, ctaY + ctaH + 4, contentBottom - 30),
    width: cw,
    height: Math.round(30 * fontScale),
  };
  const accreditationsZone: Rect = { ...sponsorsZone, y: sponsorsZone.y + 36 };

  // Clamp secondary image inside canvas
  if (secondaryImage) {
    secondaryImage = {
      x: clamp(secondaryImage.x, 0, canvasW - secondaryImage.width),
      y: clamp(secondaryImage.y, 0, canvasH - secondaryImage.height),
      width: clamp(secondaryImage.width, 80, canvasW * 0.35),
      height: clamp(secondaryImage.height, 50, canvasH * 0.28),
    };
  }

  return {
    canvas: { width: canvasW, height: canvasH },
    zones: {
      content,
      hero,
      headline: headlineZone,
      subheading: subheadingZone,
      bullets: bulletsZone,
      proof: proofZone,
      review: reviewZone,
      cta: ctaZone,
      secondaryImage,
      footer: footerZone,
      sponsors: sponsorsZone,
      accreditations: accreditationsZone,
      businessMeta: businessMetaZone,
    },
    rules: {
      minGap,
      safeMargin: pad,
      textMustStayInside: true,
      allowOverlayTextOnHero:
        composition.layout === "centered-content-bg-hero",
    },
  };
}

// ─────────────────────────────────────────────────────────────
// PASS 4 — DECOR PLAN (rich, seed-varied)
// ─────────────────────────────────────────────────────────────

function buildFallbackDecorPlan(
  direction: AICreativeDirection,
  brand: BrandFingerprint
): AIDecorPlan {
  const seed = brand.seed;

  const ALL_KINDS: DecorShapeKind[] = [
    "circle", "pill", "bar", "ring", "glow-blob", "dot-grid",
    "star", "sparkle", "cross", "arc", "wave-line", "hexagon",
  ];

  // Rotate through shape families based on seed so every org looks different
  const kindA = ALL_KINDS[seed % ALL_KINDS.length];
  const kindB = ALL_KINDS[(seed + 3) % ALL_KINDS.length];
  const kindC = ALL_KINDS[(seed + 7) % ALL_KINDS.length];
  const kindD = ALL_KINDS[(seed + 10) % ALL_KINDS.length];

  const edges: DecorEdge[] = [
    "top-left", "top-right", "bottom-left", "bottom-right",
    "left", "right", "top", "bottom",
  ];
  const edgeA = edges[seed % edges.length];
  const edgeB = edges[(seed + 2) % edges.length];
  const edgeC = edges[(seed + 5) % edges.length];
  const edgeD = edges[(seed + 7) % edges.length];

  const base: AIDecorPlan["shapes"] = [
    // 1. Dominant glow — corner varies by seed
    {
      kind: "glow-blob",
      edge: (seed % 2 === 0) ? "top-right" : "top-left",
      size: "lg",
      colorMode: "glow",
      opacity: direction.useGlowEffect ? 0.28 : 0.10,
    },
    // 2. Primary accent shape — unique per org
    {
      kind: kindA,
      edge: edgeA,
      size: "sm",
      colorMode: "accent",
      opacity: 0.18,
    },
    // 3. Secondary accent shape
    {
      kind: kindB,
      edge: edgeB,
      size: "md",
      colorMode: "accent2",
      opacity: 0.14,
    },
    // 4. Vertical accent bar on opposite side
    {
      kind: "bar",
      edge: (seed % 2 === 0) ? "left" : "right",
      size: "sm",
      colorMode: "accent2",
      opacity: 0.22,
    },
    // 5. Ring or sparkle
    {
      kind: (seed % 3 === 0) ? "ring" : "sparkle",
      edge: edgeC,
      size: "sm",
      colorMode: "soft",
      opacity: 0.16,
    },
  ];

  // Extra shapes at medium/high intensity
  if (direction.decorIntensity > 0.25) {
    base.push({
      kind: kindC,
      edge: edgeD,
      size: "sm",
      colorMode: "accent",
      opacity: 0.12,
    });
  }
  if (direction.decorIntensity > 0.38) {
    base.push({
      kind: "star",
      edge: (seed % 2 === 0) ? "bottom-right" : "top-right",
      size: "sm",
      colorMode: "glow",
      opacity: 0.20,
    });
  }
  if (direction.bgPatternType === "dots") {
    base.push({
      kind: "dot-grid",
      edge: "bottom-left",
      size: "lg",
      colorMode: "soft",
      opacity: 0.07,
    });
  }

  return { shapes: base.slice(0, 8) };
}

async function buildAIDecorPlan(
  direction: AICreativeDirection,
  composition: AICompositionPlan,
  campaign: NormalizedCampaignData,
  brand: BrandFingerprint
): Promise<AIDecorPlan> {
  try {
    const prompt = `Design 4–7 varied decorative shapes for a premium ad. Use a MIX of shape types. Return JSON only.
decorIntensity: ${direction.decorIntensity}, mood: ${direction.mood}, useGlowEffect: ${direction.useGlowEffect}
Entropy: ${brand.seed % 999} — vary your choices each call.
Available kinds: circle, pill, bar, chip, ring, soft-card, glow-blob, dot-grid, star, sparkle, cross, arc, wave-line, hexagon
Return: { "shapes": [{ "kind":"...", "edge":"top-left|top-right|bottom-left|bottom-right|left|right|top|bottom", "size":"sm|md|lg", "colorMode":"accent|accent2|soft|glow", "opacity":0.12 }] }`;

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      temperature: 1.1,
    });
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const fallback = buildFallbackDecorPlan(direction, brand);

    const validKinds: DecorShapeKind[] = [
      "circle","pill","bar","chip","ring","soft-card","glow-blob","dot-grid",
      "star","sparkle","cross","arc","wave-line","hexagon",
    ];
    const validEdges: DecorEdge[] = [
      "top-left","top-right","bottom-left","bottom-right","left","right","top","bottom",
    ];

    if (!Array.isArray(parsed.shapes)) return fallback;
    const safe = (parsed.shapes as unknown[])
      .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
      .map((s) => ({
        kind: validKinds.includes(s.kind as DecorShapeKind) ? (s.kind as DecorShapeKind) : "circle",
        edge: validEdges.includes(s.edge as DecorEdge) ? (s.edge as DecorEdge) : "top-left",
        size: (["sm","md","lg"] as const).includes(s.size as "sm"|"md"|"lg") ? (s.size as "sm"|"md"|"lg") : "sm",
        colorMode: (["accent","accent2","soft","glow"] as const).includes(s.colorMode as "accent"|"accent2"|"soft"|"glow")
          ? (s.colorMode as "accent"|"accent2"|"soft"|"glow") : "soft",
        opacity: typeof s.opacity === "number" ? clamp(s.opacity, 0.04, 0.30) : 0.12,
      }))
      .slice(0, 8);

    return { shapes: safe.length >= 3 ? safe : fallback.shapes };
  } catch {
    return buildFallbackDecorPlan(direction, brand);
  }
}

// ─────────────────────────────────────────────────────────────
// PASS 5 — BLOCK PLACEMENTS
// ─────────────────────────────────────────────────────────────

function defaultBlockPlacement(
  field: AIBlockPlacement["field"],
  rect: Rect,
  palette: Palette,
  composition: AICompositionPlan,
  direction: AICreativeDirection,
  brand: BrandFingerprint,
  fontScale: number
): AIBlockPlacement {
  const isCenter =
    composition.layout === "editorial-center-stack" ||
    direction.textAlignmentBias === "center";
  const align: "left" | "center" | "right" = isCenter ? "center" : "left";
  const DF = brand.displayFont;
  const BF = brand.bodyFont;
  const fs = (base: number) => Math.round(base * fontScale);

  switch (field) {
    case "hook_tag":
      return { field, rect, style: { fontSize: fs(22), fontWeight: 700, textAlign: align, color: palette.muted, fontFamily: DF, lineHeight: 1.15, letterSpacing: 0.4 } };
    case "hook_pre":
      return { field, rect, style: { fontSize: fs(30), fontWeight: 700, textAlign: align, color: palette.text, fontFamily: DF, lineHeight: 1.1, letterSpacing: 0.2 } };
    case "hook":
      return {
        field, rect,
        style: {
          fontSize: composition.elements.headlineSize === "xl" ? fs(112) : composition.elements.headlineSize === "lg" ? fs(86) : fs(68),
          fontWeight: 700, textAlign: align, color: palette.text, fontFamily: DF, lineHeight: 1.0, letterSpacing: 0,
          shadowBlur: direction.useGlowEffect ? 18 : 0, shadowColor: palette.glowColor,
        },
      };
    case "hook_emphasis":
      return {
        field, rect,
        style: {
          fontSize: composition.elements.headlineSize === "xl" ? fs(112) : composition.elements.headlineSize === "lg" ? fs(86) : fs(68),
          fontWeight: 700, textAlign: align, color: palette.textEmphasis, fontFamily: DF,
          lineHeight: 1.0, letterSpacing: 0,
          gradientColors: palette.accentGradient, gradientAngle: 90,
          shadowBlur: direction.useGlowEffect ? 24 : 0, shadowColor: palette.glowColor,
        },
      };
    case "subheading":
      return { field, rect, style: { fontSize: fs(24), fontWeight: 400, textAlign: align, color: palette.muted, fontFamily: BF, lineHeight: 1.36 } };
    case "bullets":
      return { field, rect, style: { fontSize: fs(24), fontWeight: 700, textAlign: align, color: palette.text, fontFamily: DF, lineHeight: 1.26 } };
    case "proof":
      return { field, rect, style: { fontSize: fs(20), fontWeight: 700, textAlign: align, color: palette.text, fontFamily: DF, lineHeight: 1.14, letterSpacing: 0.2 } };
    case "review_text":
      return { field, rect, style: { fontSize: fs(19), fontWeight: 400, textAlign: align, color: palette.muted, fontFamily: BF, fontStyle: "italic", lineHeight: 1.42 } };
    case "review_author":
      return { field, rect, style: { fontSize: fs(17), fontWeight: 700, textAlign: align, color: palette.text, fontFamily: DF, lineHeight: 1.15 } };
    case "cta":
      return {
        field, rect,
        style: {
          fontSize: fs(24), fontWeight: 700, textAlign: "center", fontFamily: DF, lineHeight: 1.1, letterSpacing: 0.25,
          color: ["filled","pill","gradient"].includes(composition.elements.ctaStyle) ? "#ffffff" : palette.accent,
          backgroundColor: ["filled","pill"].includes(composition.elements.ctaStyle) ? palette.accent : "transparent",
          gradientColors: composition.elements.ctaStyle === "gradient" ? palette.accentGradient : undefined,
          gradientAngle: 90,
          radius: composition.elements.ctaStyle === "pill" ? 999 : composition.elements.ctaStyle === "gradient" ? 18 : 14,
        },
      };
    case "offer_cta":
      return { field, rect, style: { fontSize: fs(20), fontWeight: 700, textAlign: align, color: palette.accent2, fontFamily: DF, lineHeight: 1.15 } };
    case "companyName":
      return { field, rect, style: { fontSize: fs(16), fontWeight: 700, textAlign: "left", color: palette.muted, fontFamily: DF, lineHeight: 1.15, letterSpacing: 0.2 } };
    case "business_website":
      return { field, rect, style: { fontSize: fs(16), fontWeight: 400, textAlign: "right", color: palette.muted, fontFamily: BF, lineHeight: 1.15 } };
    case "business_meta":
    case "sponsors":
    case "accreditations":
      return { field, rect, style: { fontSize: fs(16), fontWeight: 400, textAlign: align, color: palette.muted, fontFamily: BF, lineHeight: 1.2 } };
  }
}

function buildSequentialFallbackPlacements(
  composition: AICompositionPlan,
  direction: AICreativeDirection,
  palette: Palette,
  skeleton: AILayoutSkeleton,
  campaign: NormalizedCampaignData,
  brand: BrandFingerprint,
  orientation: Orientation
): PlacementMap {
  const placements: PlacementMap = {};
  const minGap = skeleton.rules.minGap;
  const zone = skeleton.zones.content;
  const fontScale = skeleton.canvas.width / 1080;

  // Reduce font scale for landscape (wider but shorter)
  const effectiveFontScale =
    orientation === "landscape"
      ? fontScale * 0.72
      : orientation === "square"
      ? fontScale * 0.84
      : fontScale;

  const contentBottom = zone.y + zone.height;
  let cy = skeleton.zones.headline.y;

  function tryPlace(height: number): Rect | null {
    if (cy + height > contentBottom - 80) return null; // leave room for CTA
    return { x: skeleton.zones.headline.x, y: cy, width: skeleton.zones.headline.width, height };
  }

  if (composition.elements.showHookTag && campaign.hook_tag) {
    const h = Math.round(28 * effectiveFontScale);
    const r = tryPlace(h);
    if (r) { placements.hook_tag = defaultBlockPlacement("hook_tag", r, palette, composition, direction, brand, effectiveFontScale); cy += h + minGap; }
  }
  if (composition.elements.showHookPre && campaign.hook_pre) {
    const h = Math.round(42 * effectiveFontScale);
    const r = tryPlace(h);
    if (r) { placements.hook_pre = defaultBlockPlacement("hook_pre", r, palette, composition, direction, brand, effectiveFontScale); cy += h + minGap; }
  }

  // Headline
  const hookLines = campaign.hook.includes("\n") ? campaign.hook.split("\n") : null;
  const headlineFontPx =
    composition.elements.headlineSize === "xl"
      ? Math.round(112 * effectiveFontScale)
      : composition.elements.headlineSize === "lg"
      ? Math.round(86 * effectiveFontScale)
      : Math.round(68 * effectiveFontScale);
  const hookH = clamp(Math.round(headlineFontPx * 1.05), 50, contentBottom - cy - 120);

  if (direction.headlineMultiColor && hookLines && hookLines.length >= 2) {
    const line1H = Math.round(hookH * 0.44);
    const line2H = Math.round(hookH * 0.56);
    const r1 = tryPlace(line1H);
    if (r1) {
      placements.hook = defaultBlockPlacement("hook", r1, palette, composition, direction, brand, effectiveFontScale);
      cy += line1H + 4;
    }
    const r2 = tryPlace(line2H);
    if (r2) {
      placements.hook_emphasis = defaultBlockPlacement("hook_emphasis", r2, palette, composition, direction, brand, effectiveFontScale);
      cy += line2H + 18;
    }
  } else {
    const r = tryPlace(hookH);
    if (r) {
      placements.hook = defaultBlockPlacement("hook", r, palette, composition, direction, brand, effectiveFontScale);
      cy += hookH + 18;
    }
  }

  if (composition.elements.showSubheading && campaign.subheading) {
    const h = clamp(
      Math.ceil(campaign.subheading.length / 38) * Math.round(26 * effectiveFontScale),
      36, Math.round(130 * effectiveFontScale)
    );
    const r = tryPlace(h);
    if (r) {
      placements.subheading = defaultBlockPlacement("subheading", r, palette, composition, direction, brand, effectiveFontScale);
      cy += h + minGap;
    }
  }

  if (composition.elements.showBullets && getAvailableBullets(campaign).length) {
    const count = getAvailableBullets(campaign).length;
    const lineH = Math.round(40 * effectiveFontScale);
    const h = clamp(count * lineH + 8, 40, Math.round(180 * effectiveFontScale));
    const r = tryPlace(h);
    if (r) {
      placements.bullets = defaultBlockPlacement("bullets", r, palette, composition, direction, brand, effectiveFontScale);
      cy += h + minGap;
    }
  }

  if (composition.elements.showProof && campaign.proof) {
    const h = Math.round(30 * effectiveFontScale);
    const r = tryPlace(h);
    if (r) {
      placements.proof = defaultBlockPlacement("proof", r, palette, composition, direction, brand, effectiveFontScale);
      cy += h + minGap;
    }
  }

  if (composition.elements.showReview && campaign.review_text) {
    const h = clamp(
      Math.ceil(campaign.review_text.length / 44) * Math.round(22 * effectiveFontScale),
      36, Math.round(90 * effectiveFontScale)
    );
    const r = tryPlace(h);
    if (r) {
      placements.review_text = defaultBlockPlacement("review_text", r, palette, composition, direction, brand, effectiveFontScale);
      cy += h + 8;
      if (campaign.review_author) {
        const r2 = tryPlace(Math.round(22 * effectiveFontScale));
        if (r2) placements.review_author = defaultBlockPlacement("review_author", r2, palette, composition, direction, brand, effectiveFontScale);
      }
    }
  }

  // CTA — always from skeleton (pre-pinned to bottom)
  placements.cta = defaultBlockPlacement("cta", skeleton.zones.cta, palette, composition, direction, brand, effectiveFontScale);

  if (composition.elements.ctaSecondary && campaign.offer_cta) {
    placements.offer_cta = defaultBlockPlacement(
      "offer_cta",
      { x: skeleton.zones.cta.x + skeleton.zones.cta.width + 20, y: skeleton.zones.cta.y + 18, width: Math.max(120, zone.width - skeleton.zones.cta.width - 36), height: Math.round(26 * effectiveFontScale) },
      palette, composition, direction, brand, effectiveFontScale
    );
  }

  if (composition.elements.showFooter && skeleton.zones.footer) {
    const fw = skeleton.zones.footer;
    if (campaign.companyName)
      placements.companyName = defaultBlockPlacement("companyName", { x: fw.x, y: fw.y, width: Math.round(fw.width * 0.48), height: fw.height }, palette, composition, direction, brand, effectiveFontScale);
    if (campaign.business_website)
      placements.business_website = defaultBlockPlacement("business_website", { x: fw.x + Math.round(fw.width * 0.54), y: fw.y, width: Math.round(fw.width * 0.42), height: fw.height }, palette, composition, direction, brand, effectiveFontScale);
  }

  if (composition.elements.showBusinessMeta && skeleton.zones.businessMeta)
    placements.business_meta = defaultBlockPlacement("business_meta", skeleton.zones.businessMeta, palette, composition, direction, brand, effectiveFontScale);
  if (composition.elements.showSponsors && skeleton.zones.sponsors && campaign.sponsors.length)
    placements.sponsors = defaultBlockPlacement("sponsors", skeleton.zones.sponsors, palette, composition, direction, brand, effectiveFontScale);
  if (composition.elements.showAccreditations && skeleton.zones.accreditations && campaign.accreditations.length)
    placements.accreditations = defaultBlockPlacement("accreditations", skeleton.zones.accreditations, palette, composition, direction, brand, effectiveFontScale);

  return placements;
}

// ─────────────────────────────────────────────────────────────
// PASS 6 — SCORE
// ─────────────────────────────────────────────────────────────

function scoreLayout(
  composition: AICompositionPlan,
  direction: AICreativeDirection,
  skeleton: AILayoutSkeleton,
  placements: PlacementMap
): LayoutScore {
  const rects = Object.values(placements)
    .filter(Boolean)
    .map((p) => (p as AIBlockPlacement).rect);
  const contentArea = rectArea(skeleton.zones.content);
  let overlapPenalty = 0;
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++)
      overlapPenalty += overlapArea(rects[i], rects[j]);
  const overlapScore = clamp(1 - overlapPenalty / Math.max(1, contentArea), 0, 1);
  const coverage = rects.reduce((s, r) => s + rectArea(r), 0) / Math.max(1, contentArea);
  const whitespaceScore = coverage < 0.22 ? 0.82 : coverage > 0.78 ? 0.62 : 0.95;
  const headline = placements.hook?.rect;
  const cta = placements.cta?.rect;
  const hierarchyScore = headline && cta && headline.height > cta.height ? 0.94 : 0.74;
  const ctaVisibilityScore = cta && within(skeleton.zones.content, cta, 0) ? 0.96 : 0.68;
  const readabilityScore = clamp((overlapScore + whitespaceScore) / 2, 0, 1);
  const uniquenessBase =
    composition.layout === "split-diagonal" ||
    composition.layout === "editorial-center-stack" ||
    direction.asymmetry > 0.65
      ? 0.95 : 0.82;
  const total =
    overlapScore * 0.24 + hierarchyScore * 0.18 + readabilityScore * 0.20 +
    whitespaceScore * 0.12 + uniquenessBase * 0.12 + ctaVisibilityScore * 0.14;
  return { overlapScore, hierarchyScore, readabilityScore, whitespaceScore, uniquenessScore: uniquenessBase, ctaVisibilityScore, total };
}

// ─────────────────────────────────────────────────────────────
// RENDERERS
// ─────────────────────────────────────────────────────────────

function buildBaseCanvasShapes(ctx: RenderContext): TemplateShape[] {
  const { canvasW, canvasH, palette } = ctx;
  const shapes: TemplateShape[] = [
    {
      id: makeId("bg-main"), type: "rectangle",
      x: 0, y: 0, width: canvasW, height: canvasH,
      backgroundColor: palette.bg,
      gradientColors: palette.bgGradient,
      gradientAngle: palette.bgGradientAngle,
      borderWidth: 0, zIndex: Z_BG,
    } as TemplateShape,
  ];

  if (ctx.direction.bgPatternType !== "none") {
    shapes.push({
      id: makeId("bg-pattern"), type: "pattern-overlay",
      x: 0, y: 0, width: canvasW, height: canvasH,
      patternType: ctx.direction.bgPatternType,
      patternColor: palette.text,
      patternOpacity: 0.04,
      borderWidth: 0, zIndex: Z_BG_GRAD,
    } as TemplateShape);
  }

  return shapes;
}

function buildDecorativeShapes(ctx: RenderContext): TemplateShape[] {
  const { palette, skeleton, placements, decorPlan, canvasW, canvasH } = ctx;
  const shapes: TemplateShape[] = [];

  // Buffer protected content rects so decor doesn't overlap text
  const protectedRects = [
    skeleton.zones.headline, skeleton.zones.subheading, skeleton.zones.bullets,
    skeleton.zones.proof, skeleton.zones.review, skeleton.zones.cta,
    skeleton.zones.footer, skeleton.zones.sponsors, skeleton.zones.accreditations,
    skeleton.zones.businessMeta,
    ...Object.values(placements).filter(Boolean).map((p) => (p as AIBlockPlacement).rect),
  ].filter((r): r is Rect => !!r).map((r) => expandRect(r, 20));

  function isSafe(rect: Rect): boolean {
    return !protectedRects.some((r) => overlapArea(r, rect) > 150);
  }

  function sizeToRect(edge: DecorEdge, size: "sm" | "md" | "lg"): Rect {
    const d =
      size === "sm" ? { w: 70, h: 70 } :
      size === "md" ? { w: 120, h: 48 } :
      { w: 190, h: 190 };
    const edgePad = 20;
    switch (edge) {
      case "top-left":    return { x: edgePad, y: edgePad, width: d.w, height: d.h };
      case "top-right":   return { x: canvasW - d.w - edgePad, y: edgePad, width: d.w, height: d.h };
      case "bottom-left": return { x: edgePad, y: canvasH - d.h - edgePad, width: d.w, height: d.h };
      case "bottom-right":return { x: canvasW - d.w - edgePad, y: canvasH - d.h - edgePad, width: d.w, height: d.h };
      case "left":        return { x: edgePad, y: Math.round(canvasH * 0.28), width: 10, height: 160 };
      case "right":       return { x: canvasW - edgePad - 10, y: Math.round(canvasH * 0.42), width: 10, height: 160 };
      case "top":         return { x: Math.round(canvasW * 0.12), y: edgePad, width: 130, height: 26 };
      case "bottom":
      default:            return { x: canvasW - 200, y: canvasH - edgePad - 26, width: 160, height: 26 };
    }
  }

  function fillFor(mode: string, opacity: number): string {
    if (mode === "glow") return palette.glowColor;
    if (mode === "accent2") return hexToRgba(palette.accent2, opacity);
    if (mode === "accent") return hexToRgba(palette.accent, opacity);
    return hexToRgba(palette.accent, Math.min(opacity, 0.10));
  }

  for (const item of decorPlan.shapes) {
    const rect = sizeToRect(item.edge, item.size);

    // Clamp rect inside canvas
    const safeRect: Rect = {
      x: clamp(rect.x, 0, canvasW - rect.width),
      y: clamp(rect.y, 0, canvasH - rect.height),
      width: clamp(rect.width, 10, canvasW),
      height: clamp(rect.height, 10, canvasH),
    };

    if (!isSafe(safeRect)) continue;
    const fill = fillFor(item.colorMode, item.opacity);

    switch (item.kind) {
      case "glow-blob":
        shapes.push({
          id: makeId("decor-glow"), type: "glow-blob",
          x: safeRect.x, y: safeRect.y,
          width: Math.min(safeRect.width, 210), height: Math.min(safeRect.height, 210),
          backgroundColor: palette.glowColor, glowRadius: 80,
          borderWidth: 0, zIndex: Z_DECOR,
        } as TemplateShape);
        break;

      case "dot-grid":
        shapes.push({
          id: makeId("decor-dots"), type: "dot-grid",
          x: safeRect.x, y: safeRect.y, width: safeRect.width, height: safeRect.height,
          backgroundColor: "transparent", dotColor: fill, dotSpacing: 18, dotRadius: 2,
          borderWidth: 0, zIndex: Z_DECOR,
        } as TemplateShape);
        break;

      case "circle":
        shapes.push({
          id: makeId("decor-circle"), type: "circle",
          x: safeRect.x, y: safeRect.y,
          width: Math.min(safeRect.width, 90), height: Math.min(safeRect.height, 90),
          backgroundColor: fill, borderWidth: 0, zIndex: Z_DECOR,
        } as TemplateShape);
        break;

      case "ring":
        shapes.push({
          id: makeId("decor-ring"), type: "circle",
          x: safeRect.x, y: safeRect.y,
          width: Math.min(safeRect.width, 80), height: Math.min(safeRect.height, 80),
          backgroundColor: "#00000000", borderWidth: 3, borderColor: fill, zIndex: Z_DECOR,
        } as TemplateShape);
        break;

      case "bar":
        shapes.push({
          id: makeId("decor-bar"), type: "rounded-rect",
          x: safeRect.x, y: safeRect.y, width: 10, height: Math.max(safeRect.height, 120),
          backgroundColor: fill, borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR,
        } as TemplateShape);
        break;

      case "soft-card":
        shapes.push({
          id: makeId("decor-softcard"), type: "rounded-rect",
          x: safeRect.x, y: safeRect.y,
          width: Math.min(safeRect.width, 120), height: Math.min(safeRect.height, 80),
          backgroundColor: fill, borderWidth: 0, borderRadius: 18, zIndex: Z_DECOR,
        } as TemplateShape);
        break;

      case "star":
        shapes.push({
          id: makeId("decor-star"), type: "star",
          x: safeRect.x, y: safeRect.y,
          width: Math.min(safeRect.width, 64), height: Math.min(safeRect.height, 64),
          points: 5, backgroundColor: fill, borderWidth: 0, zIndex: Z_DECOR,
        } as TemplateShape);
        break;

      case "sparkle":
        // 4-point sparkle from two rotated pill bars
        shapes.push({
          id: makeId("decor-sparkle-h"), type: "rounded-rect",
          x: safeRect.x, y: safeRect.y + Math.round(safeRect.height * 0.42),
          width: safeRect.width, height: Math.max(8, Math.round(safeRect.height * 0.16)),
          backgroundColor: fill, borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR,
        } as TemplateShape);
        shapes.push({
          id: makeId("decor-sparkle-v"), type: "rounded-rect",
          x: safeRect.x + Math.round(safeRect.width * 0.42), y: safeRect.y,
          width: Math.max(8, Math.round(safeRect.width * 0.16)), height: safeRect.height,
          backgroundColor: fill, borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR,
        } as TemplateShape);
        break;

      case "cross":
        shapes.push({
          id: makeId("decor-cross-h"), type: "rounded-rect",
          x: safeRect.x, y: safeRect.y + Math.round(safeRect.height * 0.40),
          width: safeRect.width, height: Math.max(6, Math.round(safeRect.height * 0.20)),
          backgroundColor: fill, borderWidth: 0, borderRadius: 3, zIndex: Z_DECOR,
        } as TemplateShape);
        shapes.push({
          id: makeId("decor-cross-v"), type: "rounded-rect",
          x: safeRect.x + Math.round(safeRect.width * 0.40), y: safeRect.y,
          width: Math.max(6, Math.round(safeRect.width * 0.20)), height: safeRect.height,
          backgroundColor: fill, borderWidth: 0, borderRadius: 3, zIndex: Z_DECOR,
        } as TemplateShape);
        break;

      case "hexagon":
        // Hexagon approximated as a rotated rounded-rect with high radius
        shapes.push({
          id: makeId("decor-hex"), type: "rounded-rect",
          x: safeRect.x, y: safeRect.y,
          width: Math.min(safeRect.width, 72), height: Math.min(safeRect.height, 72),
          backgroundColor: fill, borderWidth: 0, borderRadius: 18, zIndex: Z_DECOR,
          opacity: item.opacity,
        } as TemplateShape);
        break;

      case "arc":
        shapes.push({
          id: makeId("decor-arc"), type: "arc",
          x: safeRect.x, y: safeRect.y,
          width: Math.min(safeRect.width, 80), height: Math.min(safeRect.height, 80),
          backgroundColor: "transparent", borderWidth: 3, borderColor: fill,
          startAngle: -90, endAngle: 90, zIndex: Z_DECOR,
        } as TemplateShape);
        break;

      case "wave-line":
        shapes.push({
          id: makeId("decor-wave"), type: "wave-line",
          x: safeRect.x, y: safeRect.y,
          width: Math.min(safeRect.width, 180), height: 28,
          backgroundColor: "transparent",
          waveColor: fill, waveAmplitude: 7, waveFrequency: 3,
          borderWidth: 0, zIndex: Z_DECOR,
        } as TemplateShape);
        break;

      case "chip":
      case "pill":
      default:
        shapes.push({
          id: makeId("decor-pill"), type: "rounded-rect",
          x: safeRect.x, y: safeRect.y,
          width: Math.min(safeRect.width, 160), height: Math.min(safeRect.height, 36),
          backgroundColor: fill, borderWidth: 0, borderRadius: 999, zIndex: Z_DECOR,
        } as TemplateShape);
        break;
    }
  }

  return shapes;
}

function buildHeroShapes(ctx: RenderContext): TemplateShape[] {
  const { skeleton, palette, composition, imageSlots, brand, canvasW } = ctx;
  const shapes: TemplateShape[] = [];
  const fontScale = canvasW / 1080;

  // Surface card behind content
  if (ctx.direction.showSurfaceCard && skeleton.zones.content) {
    const cardRadius =
      brand.cardStyle === "sharp" ? 8 :
      brand.cardStyle === "pill" ? 40 :
      brand.cardStyle === "soft" ? 24 : 0;
    const p = Math.round(16 * fontScale);
    shapes.push({
      id: makeId("surface-card"), type: "rounded-rect",
      x: skeleton.zones.content.x - p, y: skeleton.zones.content.y - p,
      width: skeleton.zones.content.width + p * 2, height: skeleton.zones.content.height + p * 2,
      backgroundColor: palette.surface, opacity: palette.surfaceOpacity,
      borderWidth: 1, borderColor: palette.surfaceBorder, borderRadius: cardRadius,
      shadowBlur: 40, shadowX: 0, shadowY: 12, shadowColor: palette.cardShadow,
      zIndex: Z_CARD,
    } as TemplateShape);
  }

  // Hero image
  if (skeleton.zones.hero) {
    const heroRadius =
      composition.layout === "centered-content-bg-hero" ||
      composition.layout === "split-diagonal" ? 0 : Math.round(20 * fontScale);

    if (imageSlots.hero_person) {
      shapes.push({
        id: makeId("hero-image"), type: "image",
        x: skeleton.zones.hero.x, y: skeleton.zones.hero.y,
        width: skeleton.zones.hero.width, height: skeleton.zones.hero.height,
        src: undefined, fit: "cover", radius: heroRadius, zIndex: Z_HERO,
        slotKey: "hero_person", slotType: "image", slotRole: "hero", slotVisibleWhenEmpty: false,
      } as TemplateShape);
    } else if (composition.layout !== "editorial-center-stack") {
      shapes.push({
        id: makeId("hero-fallback"), type: "rounded-rect",
        x: skeleton.zones.hero.x, y: skeleton.zones.hero.y,
        width: skeleton.zones.hero.width, height: skeleton.zones.hero.height,
        backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.surfaceBorder,
        borderRadius: heroRadius, zIndex: Z_HERO,
      } as TemplateShape);
    }

    // Gradient tint
    if (
      composition.layout === "centered-content-bg-hero" ||
      composition.layout === "split-diagonal" ||
      composition.layout === "top-hero-bottom-content"
    ) {
      shapes.push({
        id: makeId("hero-tint"), type: "gradient-overlay",
        x: skeleton.zones.hero.x, y: skeleton.zones.hero.y,
        width: skeleton.zones.hero.width, height: skeleton.zones.hero.height,
        gradientColors: palette.heroTintGradient,
        gradientAngle: composition.layout === "split-diagonal" ? 90 : 180,
        backgroundColor: "transparent", borderWidth: 0, zIndex: Z_HERO + 1,
      } as TemplateShape);
    }
  }

  // Secondary image
  if (
    composition.elements.showSecondaryImage &&
    imageSlots.dashboard_image &&
    skeleton.zones.secondaryImage
  ) {
    const si = skeleton.zones.secondaryImage;
    shapes.push({
      id: makeId("secondary-card"), type: "rounded-rect",
      x: si.x - 8, y: si.y - 8, width: si.width + 16, height: si.height + 16,
      backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.surfaceBorder,
      borderRadius: Math.round(18 * fontScale), shadowBlur: 22, shadowX: 0, shadowY: 6,
      shadowColor: palette.cardShadow, zIndex: Z_SECONDARY,
    } as TemplateShape);
    shapes.push({
      id: makeId("secondary-image"), type: "image",
      x: si.x, y: si.y, width: si.width, height: si.height,
      src: undefined, fit: "cover", radius: Math.round(14 * fontScale),
      zIndex: Z_SECONDARY + 1,
      slotKey: "dashboard_image", slotType: "image", slotRole: "secondary", slotVisibleWhenEmpty: true,
    } as TemplateShape);
  }

  // Logo
  if (imageSlots.logo) {
    const logoW = Math.round(160 * fontScale);
    const logoH = Math.round(58 * fontScale);
    const logoX =
      composition.layout === "right-content-left-hero"
        ? skeleton.zones.content.x
        : composition.layout === "editorial-center-stack"
        ? skeleton.zones.content.x + Math.round(skeleton.zones.content.width * 0.35)
        : Math.round(48 * fontScale);
    const logoY =
      ["top-hero-bottom-content","hero-top-card-bottom"].includes(composition.layout)
        ? skeleton.zones.content.y + 6
        : Math.round(48 * fontScale);
    shapes.push({
      id: makeId("logo-image"), type: "image",
      x: logoX, y: logoY, width: logoW, height: logoH,
      src: undefined, fit: "contain", radius: 0, zIndex: Z_LOGO,
      slotKey: "logo", slotType: "logo", slotVisibleWhenEmpty: true,
    } as TemplateShape);
  }

  return shapes;
}

function buildDividerShape(
  placement: AIBlockPlacement,
  palette: Palette,
  brand: BrandFingerprint,
  fontScale: number
): TemplateShape {
  return {
    id: makeId("divider"), type: "gradient-line",
    x: placement.rect.x,
    y: placement.rect.y + placement.rect.height + Math.round(10 * fontScale),
    width: Math.round(80 * fontScale), height: Math.round(5 * fontScale),
    gradientColors: palette.accentGradient, gradientAngle: 90,
    backgroundColor: palette.accent, borderWidth: 0, borderRadius: 999, zIndex: Z_TEXT,
  } as TemplateShape;
}

function buildBulletMarkerShape(
  x: number, y: number,
  style: BulletDotStyle,
  color: string,
  fontScale: number
): TemplateShape {
  const ms = Math.round(12 * fontScale);
  switch (style) {
    case "dash":
      return { id: makeId("bullet-dash"), type: "rounded-rect", x, y: y + Math.round(6 * fontScale), width: Math.round(18 * fontScale), height: Math.round(4 * fontScale), backgroundColor: color, borderWidth: 0, borderRadius: 6, zIndex: Z_TEXT } as TemplateShape;
    case "arrow":
      return { id: makeId("bullet-arrow"), type: "text", x, y: y - Math.round(4 * fontScale), width: Math.round(20 * fontScale), height: Math.round(22 * fontScale), text: "→", fontSize: Math.round(20 * fontScale), fontWeight: 700, textColor: color, fontFamily: BEBAS, textAlign: "left", borderWidth: 0, zIndex: Z_TEXT } as TemplateShape;
    case "chevron":
      return { id: makeId("bullet-chevron"), type: "text", x, y: y - Math.round(4 * fontScale), width: Math.round(20 * fontScale), height: Math.round(24 * fontScale), text: "›", fontSize: Math.round(24 * fontScale), fontWeight: 700, textColor: color, fontFamily: BEBAS, textAlign: "left", borderWidth: 0, zIndex: Z_TEXT } as TemplateShape;
    case "circle":
      return { id: makeId("bullet-circle"), type: "circle", x, y, width: ms, height: ms, backgroundColor: color, borderWidth: 0, zIndex: Z_TEXT } as TemplateShape;
    case "square":
    default:
      return { id: makeId("bullet-square"), type: "rounded-rect", x, y, width: ms, height: ms, backgroundColor: color, borderWidth: 0, borderRadius: 3, zIndex: Z_TEXT } as TemplateShape;
  }
}

function buildCTAShapes(
  placement: AIBlockPlacement,
  text: string,
  palette: Palette,
  ctaStyle: CTAStyle,
  fontScale: number
): TemplateShape[] {
  const r = placement.style.radius ?? (ctaStyle === "pill" ? 999 : Math.round(14 * fontScale));
  const shapes: TemplateShape[] = [];

  if (ctaStyle === "gradient") {
    shapes.push({
      id: makeId("cta-bg"), type: "rounded-rect",
      x: placement.rect.x, y: placement.rect.y,
      width: placement.rect.width, height: placement.rect.height,
      backgroundColor: palette.accent, gradientColors: palette.accentGradient, gradientAngle: 90,
      borderWidth: 0, borderRadius: r,
      shadowBlur: 18, shadowX: 0, shadowY: 4, shadowColor: palette.glowColor, zIndex: Z_CTA,
    } as TemplateShape);
  } else if (ctaStyle === "filled" || ctaStyle === "pill") {
    shapes.push({
      id: makeId("cta-bg"), type: "rounded-rect",
      x: placement.rect.x, y: placement.rect.y,
      width: placement.rect.width, height: placement.rect.height,
      backgroundColor: placement.style.backgroundColor || palette.accent,
      borderWidth: 0, borderRadius: r,
      shadowBlur: 12, shadowX: 0, shadowY: 4, shadowColor: palette.glowColor, zIndex: Z_CTA,
    } as TemplateShape);
  } else {
    shapes.push({
      id: makeId("cta-bg"), type: "rounded-rect",
      x: placement.rect.x, y: placement.rect.y,
      width: placement.rect.width, height: placement.rect.height,
      backgroundColor: "#00000000", borderWidth: 2, borderColor: palette.accent,
      borderRadius: r, zIndex: Z_CTA,
    } as TemplateShape);
  }

  shapes.push({
    id: makeId("cta-text"), type: "text",
    x: placement.rect.x + Math.round(18 * fontScale),
    y: placement.rect.y + Math.round(placement.rect.height * 0.22),
    width: placement.rect.width - Math.round(36 * fontScale),
    height: Math.round(placement.rect.height * 0.58),
    text,
    fontSize: placement.style.fontSize ?? Math.round(24 * fontScale),
    fontWeight: placement.style.fontWeight ?? 700,
    textColor: placement.style.color || "#ffffff",
    textAlign: "center",
    fontFamily: placement.style.fontFamily || BEBAS,
    lineHeight: placement.style.lineHeight ?? 1.1,
    borderWidth: 0, dataField: "cta", zIndex: Z_CTA + 1,
  } as TemplateShape);

  return shapes;
}

function buildTextShape(
  placement: AIBlockPlacement,
  text: string,
  dataField?: string
): TemplateShape {
  return {
    id: makeId(`text-${placement.field}`),
    type: "text",
    x: placement.rect.x, y: placement.rect.y,
    width: placement.rect.width, height: placement.rect.height,
    text,
    fontSize: placement.style.fontSize ?? 22,
    fontWeight: placement.style.fontWeight ?? 400,
    textColor: placement.style.color || "#000000",
    textAlign: placement.style.textAlign ?? "left",
    fontFamily: placement.style.fontFamily || BEBAS,
    fontStyle: placement.style.fontStyle,
    lineHeight: placement.style.lineHeight,
    letterSpacing: placement.style.letterSpacing,
    shadowBlur: placement.style.shadowBlur ?? 0,
    shadowColor: placement.style.shadowColor,
    gradientColors: placement.style.gradientColors,
    gradientAngle: placement.style.gradientAngle,
    borderWidth: 0,
    dataField: dataField || placement.field,
    zIndex: Z_TEXT,
  } as TemplateShape;
}

function buildContentShapes(ctx: RenderContext): TemplateShape[] {
  const { placements, campaign, composition, palette, direction, brand, canvasW } = ctx;
  const fontScale = canvasW / 1080;
  const effectiveFontScale =
    ctx.orientation === "landscape" ? fontScale * 0.72 :
    ctx.orientation === "square" ? fontScale * 0.84 : fontScale;
  const shapes: TemplateShape[] = [];

  if (placements.hook_tag && campaign.hook_tag)
    shapes.push(buildTextShape(placements.hook_tag, campaign.hook_tag, "hook_tag"));

  if (placements.hook_pre && campaign.hook_pre)
    shapes.push(buildTextShape(placements.hook_pre, campaign.hook_pre, "hook_pre"));

  if (placements.hook) {
    const hookText =
      direction.headlineMultiColor && campaign.hook.includes("\n")
        ? campaign.hook.split("\n")[0]
        : campaign.hook || "Your Headline Here";
    shapes.push(buildTextShape(placements.hook, hookText, "hook"));
  }

  if (placements.hook_emphasis && direction.headlineMultiColor && campaign.hook.includes("\n")) {
    const emphasisText = campaign.hook.split("\n").slice(1).join(" ");
    shapes.push(buildTextShape(placements.hook_emphasis, emphasisText, "hook_emphasis"));
  }

  if (composition.elements.showDividerLine && placements.hook)
    shapes.push(buildDividerShape(placements.hook, palette, brand, effectiveFontScale));

  if (placements.subheading && campaign.subheading)
    shapes.push(buildTextShape(placements.subheading, campaign.subheading, "subheading"));

  if (placements.bullets) {
    const bullets = getAvailableBullets(campaign).slice(0, composition.elements.bulletCount);
    const lineStep = Math.max(
      Math.round(36 * effectiveFontScale),
      Math.round((placements.bullets.rect.height - 8) / Math.max(1, bullets.length))
    );
    bullets.forEach((bullet, idx) => {
      const by = placements.bullets!.rect.y + idx * lineStep;
      shapes.push(buildBulletMarkerShape(
        placements.bullets!.rect.x, by + Math.round(8 * effectiveFontScale),
        composition.elements.bulletDotStyle, palette.accent, effectiveFontScale
      ));
      shapes.push({
        id: makeId(`bullet-text-${idx}`), type: "text",
        x: placements.bullets!.rect.x + Math.round(32 * effectiveFontScale),
        y: by,
        width: placements.bullets!.rect.width - Math.round(32 * effectiveFontScale),
        height: lineStep,
        text: bullet,
        fontSize: placements.bullets!.style.fontSize ?? Math.round(24 * effectiveFontScale),
        fontWeight: placements.bullets!.style.fontWeight ?? 700,
        textColor: placements.bullets!.style.color || palette.text,
        textAlign: placements.bullets!.style.textAlign ?? "left",
        fontFamily: placements.bullets!.style.fontFamily || BEBAS,
        lineHeight: placements.bullets!.style.lineHeight,
        borderWidth: 0, dataField: `bullet_${idx + 1}`, zIndex: Z_TEXT,
      } as TemplateShape);
    });
  }

  if (placements.proof && campaign.proof)
    shapes.push(buildTextShape(placements.proof, campaign.proof, "proof"));

  if (placements.review_text && campaign.review_text)
    shapes.push(buildTextShape(placements.review_text, `"${campaign.review_text}"`, "review_text"));
  if (placements.review_author && campaign.review_author)
    shapes.push(buildTextShape(placements.review_author, `— ${campaign.review_author}`, "review_author"));

  if (placements.cta)
    shapes.push(...buildCTAShapes(placements.cta, campaign.cta || "Get Started", palette, composition.elements.ctaStyle, effectiveFontScale));

  if (placements.offer_cta && campaign.offer_cta)
    shapes.push(buildTextShape(placements.offer_cta, campaign.offer_cta, "offer_cta"));

  if (placements.companyName && campaign.companyName)
    shapes.push(buildTextShape(placements.companyName, campaign.companyName, "companyName"));
  if (placements.business_website && campaign.business_website)
    shapes.push(buildTextShape(placements.business_website, campaign.business_website, "business_website"));
  if (placements.business_meta)
    shapes.push(buildTextShape(placements.business_meta, getBusinessMetaLine(campaign), "business_meta"));
  if (placements.sponsors && campaign.sponsors.length)
    shapes.push(buildTextShape(placements.sponsors, campaign.sponsors.map((s) => s.name).slice(0, 3).join(" • "), "sponsors"));
  if (placements.accreditations && campaign.accreditations.length)
    shapes.push(buildTextShape(placements.accreditations, campaign.accreditations.map((a) => a.name).slice(0, 3).join(" • "), "accreditations"));

  return shapes;
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

export type GeneratedOfferLayoutResult = {
  shapes: TemplateShape[];
  campaign: NormalizedCampaignData;
  direction: AICreativeDirection;
  composition: AICompositionPlan;
  decorPlan: AIDecorPlan;
  palette: Palette;
  skeleton: AILayoutSkeleton;
  placements: PlacementMap;
  score: LayoutScore;
  brand: BrandFingerprint;
  orientation: Orientation;
};

export async function buildOfferLayoutResult(
  campaignData: Partial<CampaignData>,
  options?: {
    canvasWidth?: number;
    canvasHeight?: number;
    orientation?: Orientation;
    previousLayout?: LayoutVariant | null;
    entropySeed?: number;
  }
): Promise<GeneratedOfferLayoutResult> {
  // Resolve orientation and canvas size
  let orientation: Orientation = options?.orientation ?? "portrait";
  let canvasW = options?.canvasWidth;
  let canvasH = options?.canvasHeight;

  if (canvasW && canvasH && !options?.orientation) {
    orientation = detectOrientation(canvasW, canvasH);
  }

  if (!canvasW || !canvasH) {
    const defaults = CANVAS_SIZES[orientation];
    canvasW = canvasW ?? defaults.width;
    canvasH = canvasH ?? defaults.height;
  }

  const previousLayout = options?.previousLayout ?? null;
  // Use caller-supplied entropy, or generate from time so each run differs
  const entropySeed =
    options?.entropySeed !== undefined
      ? options.entropySeed
      : Math.floor(Date.now() / 1000) % 9973; // changes every second, prime mod

  const campaign = normalizeCampaignData(campaignData);
  const brand = buildBrandFingerprint(campaign, entropySeed);
  const direction = await buildAICreativeDirection(campaign, brand, orientation);
  const composition = await buildAICompositionPlan(campaign, direction, brand, orientation, previousLayout);
  const palette = PALETTES[composition.paletteName];
  const skeleton = buildOrientationAwareSkeleton(composition, direction, campaign, canvasW, canvasH, orientation);
  const decorPlan = await buildAIDecorPlan(direction, composition, campaign, brand);
  const placements = buildSequentialFallbackPlacements(composition, direction, palette, skeleton, campaign, brand, orientation);
  const score = scoreLayout(composition, direction, skeleton, placements);

  const ctx: RenderContext = {
    canvasW, canvasH, orientation, palette, direction, composition,
    skeleton, placements, decorPlan, campaign,
    imageSlots: compactImageSlots(campaign), brand,
  };

  const shapes = [
    ...buildBaseCanvasShapes(ctx),
    ...buildDecorativeShapes(ctx),
    ...buildHeroShapes(ctx),
    ...buildContentShapes(ctx),
  ];

  return {
    shapes, campaign, direction, composition, decorPlan,
    palette, skeleton, placements, score, brand, orientation,
  };
}

export async function buildOfferShapesWithAIPlannedBlocks(
  campaignData: Partial<CampaignData>,
  options?: {
    canvasWidth?: number;
    canvasHeight?: number;
    orientation?: Orientation;
    previousLayout?: LayoutVariant | null;
    entropySeed?: number;
  }
): Promise<TemplateShape[]> {
  const result = await buildOfferLayoutResult(campaignData, options);
  return result.shapes;
}

// Convenience helpers for common orientations
export async function buildPortraitLayout(
  campaignData: Partial<CampaignData>,
  previousLayout?: LayoutVariant | null
): Promise<GeneratedOfferLayoutResult> {
  return buildOfferLayoutResult(campaignData, { orientation: "portrait", previousLayout });
}

export async function buildLandscapeLayout(
  campaignData: Partial<CampaignData>,
  previousLayout?: LayoutVariant | null
): Promise<GeneratedOfferLayoutResult> {
  return buildOfferLayoutResult(campaignData, { orientation: "landscape", previousLayout });
}

export async function buildSquareLayout(
  campaignData: Partial<CampaignData>,
  previousLayout?: LayoutVariant | null
): Promise<GeneratedOfferLayoutResult> {
  return buildOfferLayoutResult(campaignData, { orientation: "square", previousLayout });
}