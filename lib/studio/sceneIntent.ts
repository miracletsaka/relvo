/**
 * Scene intent + motion directing (deterministic).
 *
 * Goal:
 *  - Turn script text into a *scene intent* (e.g. "problem", "stats", "offer")
 *  - Produce motion / overlay / typography suggestions that Remotion can use
 *  - Keep everything predictable (no random at render time) unless you choose to.
 *
 * This is designed so you can later swap in an LLM that returns the same schema.
 */

export type SceneIntent =
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

export type MotionPreset =
  | "calm"
  | "confident"
  | "energetic"
  | "dramatic";

export type AnimVariant =
  | "fadeUp"
  | "slideUp"
  | "zoomIn"
  | "pop"
  | "typewriter"
  | "kinetic";

export type SceneDirectives = {
  intent: SceneIntent;
  confidence: number; // 0..1
  templateHint?: string; // e.g. "cdStatsShowcase", "comparison", "offer", "hero", etc.
  motionPreset: MotionPreset;

  // Remotion-friendly numeric knobs (safe finite values)
  motionIntensity: number;  // 0..1
  overlayIntensity: number; // 0..1
  bgTint?: string;          // rgba(...) string
  animVariant?: AnimVariant;

  // Optional: emphasize keywords (can later drive captions/typography)
  keywords?: string[];
};

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function hasAny(text: string, needles: string[]) {
  const t = text.toLowerCase();
  return needles.some((n) => t.includes(n));
}

function extractKeywords(text: string): string[] {
  const t = text.toLowerCase();
  const hits: string[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/\b(24\/7|always|anytime)\b/i, "24/7"],
    [/\b(book|booking|schedule|appointment)\b/i, "book"],
    [/\b(save|saving|cut costs|reduce)\b/i, "save"],
    [/\b(free|no contract|cancel)\b/i, "risk-free"],
    [/\b(guarantee|guaranteed)\b/i, "guarantee"],
    [/\b(trusted|reviews|rated)\b/i, "reviews"],
    [/\b(offer|discount|% off|deal)\b/i, "offer"],
    [/\b(vs|versus|compare|comparison)\b/i, "compare"],
    [/\b(problem|issue|struggle|pain)\b/i, "problem"],
    [/\b(solution|fix|we handle|we do)\b/i, "solution"],
    [/\b(proof|results|case study)\b/i, "proof"],
  ];
  for (const [re, tag] of patterns) if (re.test(t)) hits.push(tag);
  return Array.from(new Set(hits)).slice(0, 8);
}

/**
 * Deterministic intent inference.
 * Uses narration + screenText + optional "beats" hints if available.
 */
export function inferSceneDirectives(input: {
  narration: string;
  screenText?: string;
  position?: "opening" | "middle" | "closing";
  beats?: Array<{ type: string; value?: any }>;
}): SceneDirectives {
  const narration = (input.narration || "").trim();
  const screenText = (input.screenText || "").trim();
  const text = `${screenText}\n${narration}`.trim().toLowerCase();

  const hasBeats = (input.beats?.length || 0) > 0;
  const hasPercentOrNumber = /(\b\d+(\.\d+)?\s*%|\b\d{1,4}\b|\$\s?\d+|£\s?\d+)/i.test(text);

  // Score intents
  const scores: Record<SceneIntent, number> = {
    hook: 0,
    problem: 0,
    solution: 0,
    proof: 0,
    stats: 0,
    comparison: 0,
    offer: 0,
    cta: 0,
    brand: 0,
    generic: 0.2,
  };

  if (input.position === "opening") scores.hook += 0.3;
  if (input.position === "closing") scores.cta += 0.25;

  if (hasAny(text, ["stop", "imagine", "what if", "tired of", "missing", "warning"])) scores.hook += 0.5;
  if (hasAny(text, ["problem", "issue", "struggle", "pain", "losing", "wasting"])) scores.problem += 0.6;
  if (hasAny(text, ["we", "our", "solution", "fix", "handle", "automate", "instant"])) scores.solution += 0.55;
  if (hasAny(text, ["proof", "results", "case study", "trusted", "reviews", "rated"])) scores.proof += 0.55;
  if (hasPercentOrNumber || hasBeats) scores.stats += 0.5;
  if (hasAny(text, ["vs", "versus", "compare", "comparison", "instead of"])) scores.comparison += 0.55;
  if (hasAny(text, ["offer", "discount", "save", "deal", "limited", "today only", "free"])) scores.offer += 0.55;
  if (hasAny(text, ["book", "call", "tap", "click", "get started", "demo", "sign up"])) scores.cta += 0.65;
  if (hasAny(text, ["brand", "company", "we are", "introducing"])) scores.brand += 0.25;

  // Pick best intent
  let intent: SceneIntent = "generic";
  let best = -1;
  for (const k of Object.keys(scores) as SceneIntent[]) {
    if (scores[k] > best) { best = scores[k]; intent = k; }
  }

  const confidence = clamp01(best);

  // Map intent -> templateHint + motion preset
  let templateHint: string | undefined = undefined;
  let motionPreset: MotionPreset = "confident";
  let animVariant: AnimVariant | undefined = undefined;

  switch (intent) {
    case "hook":
      templateHint = "hero";
      motionPreset = "energetic";
      animVariant = "pop";
      break;
    case "problem":
      templateHint = "boldStatement";
      motionPreset = "dramatic";
      animVariant = "slideUp";
      break;
    case "solution":
      templateHint = "splitPhotoContent";
      motionPreset = "confident";
      animVariant = "fadeUp";
      break;
    case "proof":
      templateHint = "lifestyleHero";
      motionPreset = "confident";
      animVariant = "fadeUp";
      break;
    case "stats":
      templateHint = "cdStatsShowcase";
      motionPreset = "energetic";
      animVariant = "kinetic";
      break;
    case "comparison":
      templateHint = "comparison";
      motionPreset = "confident";
      animVariant = "slideUp";
      break;
    case "offer":
      templateHint = "flashSale";
      motionPreset = "energetic";
      animVariant = "pop";
      break;
    case "cta":
      templateHint = "offer";
      motionPreset = "energetic";
      animVariant = "zoomIn";
      break;
    case "brand":
      templateHint = "saasAd";
      motionPreset = "calm";
      animVariant = "fadeUp";
      break;
    default:
      templateHint = undefined;
      motionPreset = "confident";
      animVariant = "fadeUp";
  }

  // Numeric knobs
  const presetKnobs: Record<MotionPreset, { motion: number; overlay: number; tint: string }> = {
    calm:      { motion: 0.35, overlay: 0.42, tint: "rgba(0,0,0,0.40)" },
    confident: { motion: 0.60, overlay: 0.45, tint: "rgba(0,0,0,0.45)" },
    energetic: { motion: 0.82, overlay: 0.38, tint: "rgba(0,0,0,0.38)" },
    dramatic:  { motion: 0.72, overlay: 0.58, tint: "rgba(0,0,0,0.55)" },
  };

  const knobs = presetKnobs[motionPreset];

  return {
    intent,
    confidence,
    templateHint,
    motionPreset,
    motionIntensity: clamp01(knobs.motion),
    overlayIntensity: clamp01(knobs.overlay),
    bgTint: knobs.tint,
    animVariant,
    keywords: extractKeywords(text),
  };
}
