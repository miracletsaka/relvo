// lib/generate-voiceover-script.ts
// Full Gemini-powered implementation.

export type StyleDNA = {
  primaryFont?:      string;
  fontWeight?:       number;
  letterSpacing?:    number;
  textTransform?:    string;
  bgTint?:           string;
  overlayIntensity?: number;
  motionIntensity?:  number;
  textAnimStyle?:    "slide-left" | "zoom-in" | "typewriter" | "slideUp";
  cinematicMood?:    string;
  tone?:             string;
};

export type VoiceSegment = {
  position:          "opening" | "middle" | "closing";
  narration:         string;
  screenText:        string;
  visualDescription: string;
  pexelsQuery:       string;
  durationSeconds:   number;
  preferWebcam?:     boolean;
  sceneEnergy?:      number;
  showCTA?:          boolean;
  ctaText?:          string;
  animationStyle?:   "energetic" | "calm" | "dramatic";
  templateHint?:     string;
  aiPrompt?:         string;
  beats?:            Array<{ kind: string; raw: string; value?: number; label?: string }>;
};

export type VoiceoverScript = {
  companyName:    string;
  accentColor:    string;
  fullNarration:  string;
  veo3StyleHint?: string;
  styleDNA?:      StyleDNA;
  segments:       VoiceSegment[];
};

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

// ── JSON extraction (strips markdown fences) ──────────────────────────────────
function extractJSON<T>(raw: string): T {
  const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = clean.search(/[{[]/);
  if (start === -1) throw new Error("No JSON in Gemini response");
  return JSON.parse(clean.slice(start)) as T;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export async function generateVoiceoverScript(
  bodyText:     string,
  companyName:  string,
  accentColor?: string,
): Promise<VoiceoverScript> {
  const color = accentColor || "#7c3aed";

  const prompt = `
You are a world-class video ad scriptwriter and creative director specialising in high-converting social media ads.

Write a complete vertical video ad script for the company: "${companyName}".

Brief:
"""
${bodyText || `A premium ad for ${companyName} showcasing their core value proposition.`}
"""

Return ONLY valid JSON — zero markdown, zero explanation outside the JSON. Schema:

{
  "styleDNA": {
    "primaryFont": "Oswald",
    "fontWeight": 900,
    "letterSpacing": -2,
    "textTransform": "uppercase",
    "bgTint": "rgba(0,0,0,0.45)",
    "overlayIntensity": 0.45,
    "motionIntensity": 0.8,
    "textAnimStyle": "slideUp",
    "cinematicMood": "cinematic dark premium moody",
    "tone": "premium"
  },
  "veo3StyleHint": "cinematic 9:16 vertical premium dark moody slow motion",
  "segments": [
    {
      "position": "opening",
      "screenText": "HOOK IN CAPS MAX 5 WORDS",
      "narration": "1-2 punchy sentences spoken aloud. Specific to ${companyName}. Hook the viewer instantly.",
      "visualDescription": "Cinematic shot description. Specific setting, lighting, camera movement.",
      "pexelsQuery": "3 word stock search",
      "aiPrompt": "Detailed Veo3 prompt: exact shot, subject, lighting, camera motion, atmosphere, 9:16 vertical format.",
      "durationSeconds": 5,
      "preferWebcam": false,
      "sceneEnergy": 0.9,
      "animationStyle": "energetic",
      "templateHint": "hero",
      "showCTA": false,
      "ctaText": null,
      "beats": [{"kind":"stat","raw":"80%","value":80,"label":"%"}]
    }
  ]
}

STRICT RULES:
1. Generate exactly 5 segments: 1 opening, 3 middle, 1 closing.
2. screenText: MAX 5 words, ALL CAPS, punchy, about ${companyName}'s specific value — NOT generic.
3. narration: 1-2 natural spoken sentences. Reference real business context. No filler.
4. visualDescription: specific cinematic description with lighting and camera.
5. aiPrompt: rich Veo3 prompt — include shot type (close-up/wide/medium), lighting (golden hour/studio/neon), camera movement (slow push-in/orbit/static), subject, mood, colour palette. Always vertical 9:16.
6. pexelsQuery: 3 words matching the visual.
7. durationSeconds: 5-7.
8. animationStyle: "energetic" (opening/closing) | "calm" | "dramatic".
9. templateHint: "hero" | "stats" | "comparison" | "offer" | "testimonial" | "generic".
10. beats: extract REAL numbers/stats from narration+screenText into Beat objects. [] if none.
    - kind: "stat" | "money" | "time" | "rating" | "count"
    - raw: exact string as it appears (e.g. "80%", "£199", "24/7", "4.9★")
    - value: numeric part, label: unit/symbol
11. sceneEnergy: 0.6–1.0.
12. Last segment: showCTA true, ctaText a strong specific CTA for ${companyName}.
13. NEVER use placeholder text like "HOOK HERE" or "Your narration". Be creative and specific.
`;

  let raw: string;
  try {
    const { text } = await generateText({
      model:       openai("gpt-4o-mini"),
      prompt,
      temperature: 0.85,
    });
    raw = text;
  } catch (e) {
    console.warn("[voiceover] Gemini failed:", e);
    return buildFallback(bodyText, companyName, color);
  }

  let parsed: { styleDNA: StyleDNA; veo3StyleHint: string; segments: VoiceSegment[] };
  try {
    parsed = extractJSON(raw);
  } catch (e) {
    console.warn("[voiceover] JSON parse failed:", e, "\n", raw.slice(0, 500));
    return buildFallback(bodyText, companyName, color);
  }

  if (!Array.isArray(parsed.segments) || parsed.segments.length === 0) {
    return buildFallback(bodyText, companyName, color);
  }

  const n = parsed.segments.length;
  const segments: VoiceSegment[] = parsed.segments.map((s, i) => ({
    position:          s.position ?? (i === 0 ? "opening" : i === n - 1 ? "closing" : "middle"),
    narration:         String(s.narration  || "").trim(),
    screenText:        String(s.screenText || "").trim().slice(0, 80),
    visualDescription: String(s.visualDescription || s.pexelsQuery || "cinematic business").trim(),
    pexelsQuery:       String(s.pexelsQuery || "business cinematic").trim(),
    aiPrompt:          String(s.aiPrompt   || s.visualDescription || "").trim(),
    durationSeconds:   Math.min(12, Math.max(4, Number(s.durationSeconds) || 6)),
    preferWebcam:      Boolean(s.preferWebcam),
    sceneEnergy:       Math.min(1, Math.max(0, Number(s.sceneEnergy) || 0.7)),
    animationStyle:    (["energetic","calm","dramatic"].includes(s.animationStyle as string)
                        ? s.animationStyle : "calm") as VoiceSegment["animationStyle"],
    templateHint:      s.templateHint || "generic",
    showCTA:           Boolean(s.showCTA),
    ctaText:           s.ctaText ? String(s.ctaText).trim() : undefined,
    beats:             Array.isArray(s.beats) ? s.beats : [],
  }));

  const styleDNA: StyleDNA = {
    primaryFont:      parsed.styleDNA?.primaryFont      ?? "Oswald",
    fontWeight:       parsed.styleDNA?.fontWeight        ?? 900,
    letterSpacing:    parsed.styleDNA?.letterSpacing     ?? -2,
    textTransform:    parsed.styleDNA?.textTransform     ?? "uppercase",
    bgTint:           parsed.styleDNA?.bgTint            ?? "rgba(0,0,0,0.45)",
    overlayIntensity: parsed.styleDNA?.overlayIntensity  ?? 0.45,
    motionIntensity:  parsed.styleDNA?.motionIntensity   ?? 0.75,
    textAnimStyle:    parsed.styleDNA?.textAnimStyle     ?? "slideUp",
    cinematicMood:    parsed.styleDNA?.cinematicMood     ?? "cinematic premium dark",
    tone:             parsed.styleDNA?.tone              ?? "premium",
  };

  console.log(`[voiceover] ✅ Gemini OK — ${segments.length} scenes | tone="${styleDNA.tone}" | mood="${styleDNA.cinematicMood}"`);

  return {
    companyName,
    accentColor: color,
    fullNarration: segments.map((s) => s.narration).join(" ").trim(),
    veo3StyleHint: parsed.veo3StyleHint || styleDNA.cinematicMood,
    styleDNA,
    segments,
  };
}

// ── Fallback (Gemini unavailable / parse error) ───────────────────────────────
function buildFallback(bodyText: string, companyName: string, accentColor: string): VoiceoverScript {
  console.warn("[voiceover] Using rule-based fallback");

  const lines = (bodyText || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (lines.length === 0) {
    lines.push(
      `Stop losing customers to missed calls`,
      `${companyName} answers every call, instantly`,
      `Books appointments automatically — 24/7`,
      `No setup, no stress, just results`,
      `Try ${companyName} free for 14 days`,
    );
  }

  const n = lines.length;
  const segments: VoiceSegment[] = lines.map((line, i) => {
    const position: VoiceSegment["position"] =
      i === 0 ? "opening" : i === n - 1 ? "closing" : "middle";
    return {
      position,
      narration:         line,
      screenText:        line.split(" ").slice(0, 5).join(" ").toUpperCase(),
      visualDescription: "Cinematic business scene, dramatic lighting, slow camera movement",
      pexelsQuery:       "business professional cinematic",
      aiPrompt:          `Vertical 9:16 cinematic ad scene: ${line}. Dark premium atmosphere, slow push-in, professional lighting.`,
      durationSeconds:   6,
      preferWebcam:      i % 2 === 0,
      sceneEnergy:       position === "opening" ? 0.9 : position === "closing" ? 0.85 : 0.65,
      animationStyle:    position === "opening" ? "energetic" : position === "closing" ? "dramatic" : "calm",
      templateHint:      position === "closing" ? "offer" : position === "opening" ? "hero" : "generic",
      showCTA:           i === n - 1,
      ctaText:           i === n - 1 ? `Book a demo — ${companyName}` : undefined,
      beats:             [],
    };
  });

  return {
    companyName,
    accentColor,
    fullNarration: segments.map((s) => s.narration).join(" "),
    veo3StyleHint: "cinematic 9:16 vertical premium dark moody",
    styleDNA: {
      primaryFont:      "Oswald",
      fontWeight:       900,
      letterSpacing:    -2,
      textTransform:    "uppercase",
      bgTint:           "rgba(0,0,0,0.45)",
      overlayIntensity: 0.45,
      motionIntensity:  0.75,
      textAnimStyle:    "slideUp",
      cinematicMood:    "cinematic premium dark moody",
      tone:             "premium",
    },
    segments,
  };
}