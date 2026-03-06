import type { TemplateHint } from "@/lib/template-hints";

export type SceneMode = "webcam" | "broll" | "ai";
export type SceneStatus = "ready" | "recorded";

/**
 * Where the visual background for the scene comes from.
 * - recorded: from Teleprompter webcam recording (video+audio)
 * - uploaded: user uploaded a file (video/image) for this scene
 * - stock: Veo3/Pexels/Unsplash fallback chosen by the renderer
 */
export type SceneSource = "recorded" | "uploaded" | "stock";

export type SceneOverlayMedia = {
  id: string;
  type: "image" | "video";

  // Local preview URL (blob:) saved in browser
  blobUrl?: string;

  // Uploaded URL (Spaces) used during render
  url?: string;

  startSeconds: number;
  endSeconds: number;

  // Normalized placement (0..1) in 1080x1350
  x: number;
  y: number;
  w: number;
  h: number;

  radius?: number;
};

export type VideoScene = {
  id: string;
  index: number;

  screenText: string;
  narration: string;
  durationSeconds: number;

  uploadedBackgroundUrl?: string;
  uploadedBackgroundType?: "video" | "image";
  overlayUrl?: string;
  // "webcam" = video+audio, "broll" = audio-only, "ai" = Veo3 generated
  mode: SceneMode;
  status: SceneStatus;

  // Hint to the recorder/renderer that this scene prefers webcam framing
  preferWebcam?: boolean;

  // recording (local preview)
  recordedBlobUrl?: string;
  recordedDurationSeconds?: number;

  // Uploaded scene background media (video/image)
  source?: SceneSource; // default: "recorded" if recorded exists, else "stock"
  uploadedBlobUrl?: string;   // local preview (blob:)
  uploadedUrl?: string;       // Spaces URL for render
  uploadedType?: "video" | "image";
  uploadedDurationSeconds?: number;

  // Inline overlay media (PIP / demo / image pop)
  overlays?: SceneOverlayMedia[];

  // Smart template hint override
  templateHint?: TemplateHint;

  // AI scene generation — per-scene Veo3 prompt override
  aiPrompt?: string;

  // ── Enrichment / motion knobs (set by mergeGeneratedScenes / AI) ──────────
  /** Named beat markers for this scene (e.g. ["hook", "stat", "cta"]) */
  beats?: string[];
  /** High-level intent label (e.g. "problem", "solution", "offer") */
  intent?: string;
  /** 0–1 confidence the AI has in the intent label */
  intentConfidence?: number;
  /** Named motion preset (e.g. "energetic", "calm", "dramatic") */
  motionPreset?: string;
  /** 0–1 scalar applied to all motion amplitudes for this scene */
  motionIntensity?: number;
  /** 0–1 opacity of the atmospheric overlay tint for this scene */
  overlayIntensity?: number;
  /** CSS color string for the background tint (overrides styleDNA.bgTint) */
  bgTint?: string;
  /** Text animation variant override for this scene */
  animVariant?: "slideUp" | "slideLeft" | "zoomIn" | "fadeScale";
  /** Per-scene captions override (inherits from project captionsMode if absent) */
  captionsMode?: "off" | "kinetic";

  // Scene preview thumb
  thumbnailDataUrl?: string;
  thumbnailUpdatedAt?: number;
};

export type BrandKit = {
  companyName: string;
  accentColor: string;
  // default voice for this project
  voiceId?: string;
  // project concept / brief used for AI scene generation
  concept?: string;
  logoUrl?: string;
  styleDNA?: any;
};

export type VideoProject = {
  id: string;
  createdAt: number;
  companyName: string;
  accentColor: string;
  // default voice for this project (falls back to brandKit.voiceId)
  voiceId?: string;
  // project concept / brief used for AI scene generation
  concept?: string;

  scenes: VideoScene[];

  brandKit?: BrandKit;
  styleDNA?: any;
  ctaText?: string;

  captionsMode?: "off" | "kinetic";

  lastRenderUrl?: string;
  lastRenderMeta?: any;
};