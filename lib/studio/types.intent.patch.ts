/**
 * Patch types for Studio + render pipeline.
 * Copy these type additions into your existing `lib/studio/types.ts`.
 *
 * (We keep this file as a reference so you can diff easily.)
 */

export type StudioSceneIntent =
  | "hook"
  | "problem"
  | "solution"
  | "proof"
  | "stats"
  | "comparison"
  | "offer"
  | "cta"
  | "brand"
  | "generic";

export type MotionPreset = "calm" | "confident" | "energetic" | "dramatic";

export type StudioScene = {
  // existing fields...
  templateHint?: string;

  // NEW:
  intent?: StudioSceneIntent;
  intentConfidence?: number;

  motionPreset?: MotionPreset;
  motionIntensity?: number;
  overlayIntensity?: number;
  bgTint?: string;
  animVariant?: string;
  keywords?: string[];
};
