/**
 * layout-planner/constants.ts
 * ────────────────────────────
 * Static constants: fonts, canvas sizes, layout maps, palettes, z-indices.
 *
 * FONT SYSTEM — 6 distinct families covering every ad tone:
 *   BEBAS_NEUE   — bold condensed display (TouchPeace / alert style)
 *   SYNE         — geometric modern (NeuroFlow landing / agency)
 *   PLAYFAIR     — editorial serif (luxury / magazine)
 *   BARLOW       — wide industrial (stats / milestone posts like Spotify)
 *   OSWALD       — tall condensed (street / KFC / retail)
 *   INTER        — clean body text (body copy, footers)
 */

import type { Orientation, LayoutVariant, PaletteName, Palette } from "./types";

// ── Font declarations ──────────────────────────────────────────────────────────
export const BEBAS_NEUE = "'Bebas Neue', Impact, 'Arial Narrow', sans-serif";
export const SYNE       = "'Syne', 'Futura', 'Century Gothic', sans-serif";
export const PLAYFAIR   = "'Playfair Display', 'Georgia', 'Times New Roman', serif";
export const BARLOW     = "'Barlow Condensed', 'Arial Narrow', Impact, sans-serif";
export const OSWALD     = "'Oswald', 'Franklin Gothic Medium', 'Arial Narrow', sans-serif";
export const INTER      = "'Inter', 'Helvetica Neue', Arial, sans-serif";

// Legacy aliases (keeps renderers/placements unchanged)
export const BEBAS = BEBAS_NEUE;
export const BODY  = INTER;

// ── Font size minimums (px at 1080-wide canvas) ───────────────────────────────
export const MIN_HOOK_SIZE    = 138;   // hook / headline — never below this
export const MIN_BODY_SIZE    = 37;    // subheading, bullets, proof, review, CTA
export const FOOTER_SIZE      = 16;    // footer / contact line — fixed small

// ── Tone → font family mapping ────────────────────────────────────────────────
// Each tone gets a display font that matches its visual energy.
export const TONE_FONTS: Record<string, string> = {
  inform:            SYNE,
  advertise:         BEBAS_NEUE,
  alert:             OSWALD,
  vacancy:           BARLOW,
  announce:          PLAYFAIR,
  educate:           SYNE,
  inspire:           PLAYFAIR,
  promote:           BEBAS_NEUE,
  testimonial:       PLAYFAIR,
  behind_the_scenes: SYNE,
  entertain:         OSWALD,
  default:           BEBAS_NEUE,
};

// ── All display fonts — for random selection when no tone is set ─────────────
export const DISPLAY_FONTS = [
  BEBAS_NEUE, SYNE, BARLOW, OSWALD, PLAYFAIR,
] as const;


// ── Tone → template shape rules ───────────────────────────────────────────────
// Defines which elements are REQUIRED for each tone (sparse is OK).
export type ToneTemplate = {
  requireHook:       boolean;
  requireSubheading: boolean;
  requireBullets:    boolean;
  requireCTA:        boolean;
  requireProof:      boolean;
  requireReview:     boolean;
  requireFooter:     true;       // always true — every template has a footer
  layoutBias:        "sparse" | "medium" | "dense";
  ctaVerb:           string;     // fallback CTA text if none provided
};

export const TONE_TEMPLATES: Record<string, ToneTemplate> = {
  inform: {
    requireHook: true, requireSubheading: true, requireBullets: true,
    requireCTA: false, requireProof: false, requireReview: false,
    requireFooter: true, layoutBias: "sparse", ctaVerb: "Learn More",
  },
  advertise: {
    requireHook: true, requireSubheading: true, requireBullets: false,
    requireCTA: true, requireProof: true, requireReview: false,
    requireFooter: true, layoutBias: "dense", ctaVerb: "Shop Now",
  },
  alert: {
    requireHook: true, requireSubheading: false, requireBullets: false,
    requireCTA: false, requireProof: false, requireReview: false,
    requireFooter: true, layoutBias: "sparse", ctaVerb: "Read More",
  },
  vacancy: {
    requireHook: true, requireSubheading: true, requireBullets: true,
    requireCTA: true, requireProof: false, requireReview: false,
    requireFooter: true, layoutBias: "medium", ctaVerb: "Apply Now",
  },
  announce: {
    requireHook: true, requireSubheading: true, requireBullets: false,
    requireCTA: false, requireProof: false, requireReview: false,
    requireFooter: true, layoutBias: "sparse", ctaVerb: "Read More",
  },
  educate: {
    requireHook: true, requireSubheading: true, requireBullets: true,
    requireCTA: false, requireProof: false, requireReview: false,
    requireFooter: true, layoutBias: "medium", ctaVerb: "Find Out More",
  },
  inspire: {
    requireHook: true, requireSubheading: false, requireBullets: false,
    requireCTA: false, requireProof: false, requireReview: false,
    requireFooter: true, layoutBias: "sparse", ctaVerb: "Join Us",
  },
  promote: {
    requireHook: true, requireSubheading: true, requireBullets: false,
    requireCTA: true, requireProof: true, requireReview: false,
    requireFooter: true, layoutBias: "dense", ctaVerb: "Get Yours",
  },
  testimonial: {
    requireHook: false, requireSubheading: false, requireBullets: false,
    requireCTA: false, requireProof: false, requireReview: true,
    requireFooter: true, layoutBias: "sparse", ctaVerb: "See More",
  },
  behind_the_scenes: {
    requireHook: true, requireSubheading: true, requireBullets: false,
    requireCTA: false, requireProof: false, requireReview: false,
    requireFooter: true, layoutBias: "medium", ctaVerb: "Follow Us",
  },
  entertain: {
    requireHook: true, requireSubheading: false, requireBullets: false,
    requireCTA: false, requireProof: false, requireReview: false,
    requireFooter: true, layoutBias: "sparse", ctaVerb: "See More",
  },
  default: {
    requireHook: true, requireSubheading: true, requireBullets: false,
    requireCTA: true, requireProof: false, requireReview: false,
    requireFooter: true, layoutBias: "medium", ctaVerb: "Get Started",
  },
};

// ── Canvas sizes ───────────────────────────────────────────────────────────────
export const CANVAS_SIZES: Record<Orientation, { width: number; height: number }> = {
  portrait:  { width: 1080, height: 1350 },
  landscape: { width: 1920, height: 1080 },
  square:    { width: 1080, height: 1080 },
};

export const LAYOUTS_BY_ORIENTATION: Record<Orientation, LayoutVariant[]> = {
  portrait: [
    "left-content-right-hero", "right-content-left-hero",
    "top-hero-bottom-content", "centered-content-bg-hero",
    "split-diagonal", "content-top-left-hero-corner",
    "editorial-center-stack", "hero-top-card-bottom",
  ],
  landscape: [
    "left-content-right-hero", "right-content-left-hero",
    "centered-content-bg-hero", "split-diagonal", "content-top-left-hero-corner",
  ],
  square: [
    "centered-content-bg-hero", "editorial-center-stack",
    "hero-top-card-bottom", "top-hero-bottom-content",
    "left-content-right-hero", "right-content-left-hero",
  ],
};

export const VALID_PALETTES: PaletteName[] = [
  "navy-gold","lavender-coral","emerald-white","midnight-blue",
  "rose-dark","slate-cyan","sand-brown","mono-lux",
  "forest-cream","obsidian-amber","arctic-fire","violet-lime",
];

// ── Z-layers ───────────────────────────────────────────────────────────────────
export const Z_BG        = 0;
export const Z_BG_GRAD   = 1;
export const Z_DECOR     = 2;
export const Z_SURFACE   = 3;
export const Z_HERO      = 4;
export const Z_SECONDARY = 5;
export const Z_CARD      = 6;
export const Z_TEXT      = 20;
export const Z_CTA       = 21;
export const Z_LOGO      = 22;

// ── Palettes ───────────────────────────────────────────────────────────────────
export const PALETTES: Record<PaletteName, Palette> = {
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