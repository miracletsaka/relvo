/**
 * layout-planner/types.ts
 * ─────────────────────────
 * All shared types for the layout planner pipeline.
 * Import from here — never duplicate types across files.
 */

import type { CampaignData, TemplateShape } from "@/lib/types";

export type { CampaignData, TemplateShape };

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
  | "navy-gold" | "lavender-coral" | "emerald-white" | "midnight-blue"
  | "rose-dark" | "slate-cyan" | "sand-brown" | "mono-lux"
  | "forest-cream" | "obsidian-amber" | "arctic-fire" | "violet-lime";

export type StyleFamily =
  | "editorial" | "saas-premium" | "conversion-ad" | "poster" | "minimal" | "tech-dark";

export type Mood         = "bold" | "clean" | "luxury" | "energetic" | "calm";
export type Density      = "low" | "medium" | "high";
export type PaletteMode  = "dark" | "light" | "mixed";
export type AlignmentBias = "left" | "center" | "right" | "mixed";
export type BulletDotStyle = "square" | "circle" | "dash" | "arrow" | "chevron";
export type HeadlineSize = "xl" | "lg" | "md";
export type CTAStyle     = "filled" | "pill" | "outline" | "ghost" | "gradient";

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
  | "glow-blob" | "dot-grid" | "star" | "sparkle" | "cross"
  | "arc" | "wave-line" | "hexagon";

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

export type NormalizedCampaignData = CampaignData & {
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

export type CampaignImageSlots = {
  logo?: string;
  hero_person?: string;
  dashboard_image?: string;
};

export type PlacementMap = Partial<Record<AIBlockPlacement["field"], AIBlockPlacement>>;

export type BrandFingerprint = {
  seed: number;
  orgKey: string;
  displayFont: string;
  bodyFont: string;
  accentRotation: number;
  layoutBias: "left-heavy" | "right-heavy" | "centered" | "asymmetric";
  cardStyle: "sharp" | "soft" | "pill" | "none";
  decorDensity: number;
};

export type RenderContext = {
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
