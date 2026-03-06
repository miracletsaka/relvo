// lib/extract-speech-markers.ts
// Gemini-powered keyword extraction with regex fallback.
// Replaces the old regex-only implementation.

import type { SpeechMarker, MarkerType } from "@/remotion/compositions/SpeechMarker";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";

function extractJSON<T>(raw: string): T {
  const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = clean.search(/[{[]/);
  if (start === -1) throw new Error("No JSON");
  return JSON.parse(clean.slice(start)) as T;
}

// ── Gemini marker extraction ──────────────────────────────────────────────────
export async function extractMarkersWithGemini(
  narration:   string,
  screenText:  string,
  duration:    number,
  companyName: string,
  maxMarkers = 3,
): Promise<SpeechMarker[]> {
  const prompt = `
You are a video editor choosing which words to highlight as animated pop-ups in a video ad.

Company: "${companyName}"
Scene narration: "${narration}"
Screen text: "${screenText}"
Scene duration: ${duration} seconds

Pick the ${maxMarkers} most impactful words or short phrases (max 3 words) to highlight as animated chips.
Focus on: numbers/stats, money amounts, power words, brand name, time claims, benefit words.
Avoid: filler words, conjunctions, generic words like "this" "that" "the".

Return ONLY JSON array, no markdown:
[
  { "word": "80%", "type": "stat", "relativeTimeSeconds": 1.2 },
  { "word": "FREE", "type": "power", "relativeTimeSeconds": 3.5 }
]

Types: "stat" | "money" | "power" | "brand" | "emphasis"
relativeTimeSeconds: when in the scene this word is spoken (0 to ${duration - 0.5})
Space them at least 1.5 seconds apart.
Return [] if no strong words exist.
`;

  const { text } = await generateText({
    model:       google("gemini-2.5-flash"),
    prompt,
    temperature: 0.3,
  });
  const raw = text;
  const markers = extractJSON<Array<{ word: string; type: string; relativeTimeSeconds: number }>>(raw);

  if (!Array.isArray(markers)) return [];

  return markers
    .filter((m) => m.word && typeof m.relativeTimeSeconds === "number")
    .slice(0, maxMarkers)
    .map((m) => ({
      word:                String(m.word).trim().toUpperCase(),
      type:                (["stat","money","power","brand","emphasis"].includes(m.type)
                            ? m.type : "emphasis") as MarkerType,
      relativeTimeSeconds: Math.max(0, Math.min(duration - 0.3, m.relativeTimeSeconds)),
    }));
}

// ── Regex fallback (client-safe, no Gemini) ───────────────────────────────────
export function extractSpeechMarkers(
  narration:   string,
  duration:    number,
  sceneEnergy  = 0.7,
  companyName  = "",
  maxMarkers   = 3,
): SpeechMarker[] {
  const markers: SpeechMarker[] = [];
  const text = narration.toLowerCase();

  // Money amounts
  for (const m of narration.matchAll(/([£$€]\d[\d,]*(?:k|m)?|\d+(?:\.\d+)?(?:k|m)?\s*(?:pounds?|dollars?))/gi)) {
    markers.push({ word: m[0].trim().toUpperCase(), type: "money", relativeTimeSeconds: 0 });
  }
  // Percentages
  for (const m of narration.matchAll(/\d+(?:\.\d+)?\s*%/g)) {
    markers.push({ word: m[0].trim(), type: "stat", relativeTimeSeconds: 0 });
  }
  // Time/ratio patterns
  for (const m of narration.matchAll(/\d+\/\d+|\d+\s*(?:hr|hrs|hours?|min|mins|days?|weeks?|x\b)/gi)) {
    markers.push({ word: m[0].trim().toUpperCase(), type: "stat", relativeTimeSeconds: 0 });
  }
  // Brand name
  if (companyName && text.includes(companyName.toLowerCase())) {
    markers.push({ word: companyName.toUpperCase(), type: "brand", relativeTimeSeconds: 0 });
  }
  // Power words
  const powerWords = ["free","instant","guaranteed","proven","exclusive","stop","now","fast","boost","double","triple","never","always","only"];
  for (const pw of powerWords) {
    if (text.includes(pw)) {
      markers.push({ word: pw.toUpperCase(), type: "power", relativeTimeSeconds: 0 });
      break; // only first match
    }
  }

  // Remove duplicates, cap at maxMarkers
  const seen  = new Set<string>();
  const deduped = markers.filter((m) => {
    if (seen.has(m.word)) return false;
    seen.add(m.word);
    return true;
  }).slice(0, maxMarkers);

  // Space out timestamps evenly across scene duration
  const step = duration / (deduped.length + 1);
  return deduped.map((m, i) => ({
    ...m,
    relativeTimeSeconds: Math.min(duration - 0.5, step * (i + 1)),
  }));
}

// ── Timestamp-based markers (from ElevenLabs word timings) ───────────────────
// Normalised WordTiming — handles multiple ElevenLabs response shapes
export type WordTiming = {
  word?:      string;
  character?: string;
  start?:     number; startTime?: number; start_time?: number;
  end?:       number; endTime?:   number; end_time?:   number;
};
function normalizeWordTiming(wt: WordTiming): { word: string; start: number; end: number } | null {
  const word  = (wt.word || wt.character || "").trim();
  const start = wt.start ?? wt.startTime ?? wt.start_time ?? null;
  const end   = wt.end   ?? wt.endTime   ?? wt.end_time   ?? null;
  if (!word || start === null || end === null) return null;
  return { word, start, end };
}

export function extractMarkersFromTimestamps(
  narration:    string,
  wordTimings:  WordTiming[] | any[],
  sceneOffset:  number,
  duration:     number,
  companyName   = "",
  maxMarkers    = 3,
): SpeechMarker[] {
  if (!wordTimings?.length) {
    return extractSpeechMarkers(narration, duration, 0.7, companyName, maxMarkers);
  }

  const HIGHLIGHT_PATTERNS = [
    { re: /^[£$€]\d|^\d+%$|^\d+\/\d+$/,           type: "stat"     as MarkerType },
    { re: /^(free|instant|stop|boost|guaranteed)$/i, type: "power"   as MarkerType },
    { re: new RegExp(`^${companyName}$`, "i"),       type: "brand"   as MarkerType },
    { re: /^[£$€]/,                                  type: "money"   as MarkerType },
  ];

  const markers: SpeechMarker[] = [];

  const normalised = wordTimings.map(normalizeWordTiming).filter(Boolean) as {word:string;start:number;end:number}[];
  for (const wt of normalised) {
    const relTime = wt.start - sceneOffset;
    if (relTime < 0 || relTime > duration) continue;

    for (const { re, type } of HIGHLIGHT_PATTERNS) {
      if (re.test(wt.word.trim())) {
        markers.push({
          word:                wt.word.trim().toUpperCase(),
          type,
          relativeTimeSeconds: relTime,
        });
        break;
      }
    }
    if (markers.length >= maxMarkers) break;
  }

  return markers.length > 0
    ? markers
    : extractSpeechMarkers(narration, duration, 0.7, companyName, maxMarkers);
}