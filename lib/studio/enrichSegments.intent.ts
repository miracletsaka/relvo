import type { VoiceSegment } from "@/lib/generate-voiceover-script";
import { inferSceneDirectives } from "./sceneIntent";

/**
 * Adds deterministic "directives" to segments, so Remotion can animate based on meaning.
 * This is intentionally separate so you can call it:
 *  - after AI script generation
 *  - after user edits
 *  - after beat extraction
 */
export function enrichSegmentsWithIntent<T extends VoiceSegment & any>(segments: T[]): T[] {
  return segments.map((seg) => {
    const directives = inferSceneDirectives({
      narration: seg.narration || "",
      screenText: seg.screenText || "",
      position: (seg as any).position,
      beats: (seg as any).beats,
    });

    return {
      ...seg,
      templateHint: (seg as any).templateHint ?? directives.templateHint,
      intent: directives.intent,
      intentConfidence: directives.confidence,
      motionPreset: (seg as any).motionPreset ?? directives.motionPreset,
      motionIntensity: (seg as any).motionIntensity ?? directives.motionIntensity,
      overlayIntensity: (seg as any).overlayIntensity ?? directives.overlayIntensity,
      bgTint: (seg as any).bgTint ?? directives.bgTint,
      animVariant: (seg as any).animVariant ?? directives.animVariant,
      keywords: (seg as any).keywords ?? directives.keywords,
    };
  });
}
