// lib/studio/enrichSegments.ts
// Enriches segments with beats + templateHint + sceneEnergy.
// Preserves beats already set by Gemini — only extracts if missing.

import { extractBeats, type Beat } from "./extractBeats";

export type TemplateHint =
  | "stats" | "comparison" | "testimonial" | "offer" | "hero" | "generic";

export type EnrichedSegment = {
  narration:          string;
  screenText:         string;
  durationSeconds:    number;
  preferWebcam?:      boolean;
  position?:          "opening" | "middle" | "closing";
  beats?:             Beat[];
  templateHint?:      TemplateHint;
  sceneEnergy?:       number;
  animationStyle?:    string;
};

function pickTemplateHint(narration: string, screenText: string): TemplateHint {
  const t = `${screenText} ${narration}`.toLowerCase();
  if (/(\b%\b|percent|roi|save|saved|increase|decrease|faster|x\b|\d+\/\d+)/.test(t)) return "stats";
  if (/(versus|vs\b|compare|comparison|better than|instead of)/.test(t))               return "comparison";
  if (/(review|testimonial|they said|client said|rated|stars?)/.test(t))               return "testimonial";
  if (/(discount|offer|limited|sale|today only|bonus|free)/.test(t))                   return "offer";
  if (/(stop|introducing|meet|this is|welcome|new)/.test(t))                           return "hero";
  return "generic";
}

function pickSceneEnergy(
  seg: EnrichedSegment,
  index: number,
  total: number,
): number {
  if (typeof (seg as any).sceneEnergy === "number") return (seg as any).sceneEnergy;
  const pos = seg.position ?? (index === 0 ? "opening" : index === total - 1 ? "closing" : "middle");
  if (pos === "opening") return 0.9;
  if (pos === "closing") return 0.85;
  return 0.65;
}

export function enrichSegments<T extends EnrichedSegment>(segments: T[], total?: number): T[] {
  const n = total ?? segments.length;
  return segments.map((s, i) => {
    // Preserve Gemini-provided beats; only extract if missing/empty
    const beats: Beat[] =
      Array.isArray((s as any).beats) && (s as any).beats.length > 0
        ? (s as any).beats
        : extractBeats(`${s.screenText} ${s.narration}`);

    const templateHint =
      (s.templateHint as TemplateHint) || pickTemplateHint(s.narration, s.screenText);

    const sceneEnergy = pickSceneEnergy(s, i, n);

    return {
      ...s,
      beats,
      templateHint,
      sceneEnergy,
    } as T;
  });
}