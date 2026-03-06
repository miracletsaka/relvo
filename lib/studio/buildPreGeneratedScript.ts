// lib/studio/buildPreGeneratedScript.ts
import type { VoiceoverScript, VoiceSegment } from "@/lib/generate-voiceover-script";
import type { VideoProject, VideoScene } from "@/lib/studio/types";

// ── Enrich a single segment with beats extracted from its text ────────────────
function extractBeatsFromText(
  text: string,
): Array<{ kind: string; raw: string; value?: number; label?: string }> {
  const beats: Array<{ kind: string; raw: string; value?: number; label?: string }> = [];

  // Money: £/$€ amounts
  for (const m of text.matchAll(/([£$€])(\d[\d,]*(?:\.\d+)?(?:k|m|K|M)?)/g)) {
    const val = parseFloat(m[2].replace(/,/g, "").replace(/k|K/i, "000").replace(/m|M/i, "000000"));
    beats.push({ kind: "money", raw: `${m[1]}${m[2]}`, value: val, label: m[1] });
  }
  // Percentages
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)) {
    beats.push({ kind: "stat", raw: `${m[1]}%`, value: parseFloat(m[1]), label: "%" });
  }
  // Time patterns: 24/7, 48h, 2hrs, 30min
  for (const m of text.matchAll(/(\d+\/\d+|\d+\s*(?:hr|hrs|hour|hours|min|mins|h|days?|weeks?))/gi)) {
    beats.push({ kind: "time", raw: m[0].trim() });
  }
  // Ratings: 4.9★, 5-star
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*[★*]|(\d)-star/gi)) {
    beats.push({ kind: "rating", raw: m[0].trim() });
  }
  // Plain large numbers (10,000+ or 500+)
  for (const m of text.matchAll(/(\d[\d,]{2,})\+?/g)) {
    const val = parseInt(m[1].replace(/,/g, ""), 10);
    if (val >= 100) beats.push({ kind: "count", raw: m[0].trim(), value: val });
  }

  return beats.slice(0, 2); // max 2 beats per scene
}

// ── position helper ───────────────────────────────────────────────────────────
function resolvePosition(
  scene: VideoScene,
  scenes: VideoScene[],
): "opening" | "middle" | "closing" {
  if ((scene as any).position) return (scene as any).position;
  if (scene.index === 0) return "opening";
  if (scene.index === scenes.length - 1) return "closing";
  return "middle";
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function buildPreGeneratedScript(project: VideoProject): VoiceoverScript {
  const sorted = [...project.scenes].sort((a, b) => a.index - b.index);

  const segments: VoiceSegment[] = sorted.map((s) => {
    const position = resolvePosition(s, sorted);
    const isLast   = s.index === sorted.length - 1;

    // Beats: prefer scene-stored beats, fall back to extraction
    const beats =
      (s as any).beats?.length > 0
        ? (s as any).beats
        : extractBeatsFromText(`${s.screenText} ${s.narration}`);

    const seg: VoiceSegment = {
      position,
      narration:         s.narration  || "",
      screenText:        s.screenText || "",
      // Use aiPrompt if set, otherwise generate a basic visual description
      visualDescription: (s as any).aiPrompt || (s as any).visualDescription
        || `Cinematic scene: ${s.narration?.slice(0, 80) || "business b-roll"}. Premium dark atmosphere.`,
      pexelsQuery:       (s as any).pexelsQuery || `${project.companyName} ${position} cinematic`,
      aiPrompt:          (s as any).aiPrompt || s.narration || "",
      durationSeconds:   s.durationSeconds || 6,
      preferWebcam:      s.mode === "webcam",
      sceneEnergy:       (s as any).sceneEnergy ?? (position === "opening" ? 0.9 : 0.7),
      animationStyle:    (s as any).animationStyle
        ?? (position === "opening" ? "energetic" : position === "closing" ? "dramatic" : "calm"),
      templateHint:      (s as any).templateHint ?? (position === "closing" ? "offer" : position === "opening" ? "hero" : "generic"),
      showCTA:           isLast,
      ctaText:           isLast ? ((s as any).ctaText || `Book a demo with ${project.companyName}`) : undefined,
      beats,
    };

    return seg;
  });

  const fullNarration = segments.map((s) => s.narration).join(" ").trim();

  // Build a per-project styleDNA — use stored one if available
  const styleDNA = (project as any).styleDNA ?? {
    primaryFont:      "Oswald",
    fontWeight:       900,
    letterSpacing:    -2,
    textTransform:    "uppercase",
    bgTint:           "rgba(0,0,0,0.45)",
    overlayIntensity: 0.45,
    motionIntensity:  0.75,
    textAnimStyle:    "slideUp",
    cinematicMood:    "cinematic premium dark",
    tone:             "premium",
  };

  return {
    companyName:   project.companyName,
    accentColor:   project.accentColor,
    fullNarration,
    veo3StyleHint: (project as any).veo3StyleHint || styleDNA.cinematicMood,
    styleDNA,
    segments,
  } as VoiceoverScript;
}