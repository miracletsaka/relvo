/**
 * Brand Kit (Step 8)
 *
 * Goal:
 * - Save brand choices once (companyName, colors, font, motion/overlay intensity, voice).
 * - Apply them to every project / render so videos feel consistent like an agency.
 *
 * Storage: localStorage
 */

export type BrandKit = {
  companyName: string;
  accentColor: string;

  // Optional secondary color (future use)
  secondaryColor?: string;

  // Typography & motion "lock"
  primaryFont?: string;       // e.g. "Oswald"
  fontWeight?: number;        // e.g. 900
  letterSpacing?: number;     // e.g. -2
  textTransform?: "uppercase" | "none";

  overlayIntensity?: number;  // 0..1
  motionIntensity?: number;   // 0..1
  bgTint?: string;            // rgba(...) string

  // Voice
  voiceId?: string;           // ElevenLabs voice id/name used by your backend
};

const KEY = "studio_brandkit_v1";

export const DEFAULT_BRAND_KIT: BrandKit = {
  companyName: "NeuroFlow",
  accentColor: "#7c3aed",
  secondaryColor: "#22c55e",
  primaryFont: "Oswald",
  fontWeight: 900,
  letterSpacing: -2,
  textTransform: "uppercase",
  overlayIntensity: 0.45,
  motionIntensity: 0.75,
  bgTint: "rgba(0,0,0,0.45)",
  voiceId: "rachel",
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadBrandKit(): BrandKit {
  if (typeof window === "undefined") return DEFAULT_BRAND_KIT;
  const stored = safeParse<BrandKit>(window.localStorage.getItem(KEY));
  return { ...DEFAULT_BRAND_KIT, ...(stored || {}) };
}

export function saveBrandKit(kit: BrandKit) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(kit));
}

export function resetBrandKit() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function clamp01(n: any, fallback: number) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(1, v));
}
