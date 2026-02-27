import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export interface VoiceSegment {
  narration: string;
  screenText: string;
  durationSeconds: number;
  visualDescription: string;
  pexelsQuery: string;
  position: "opening" | "middle" | "closing";
  showCTA: boolean;
  ctaText?: string;
}

export interface VoiceoverScript {
  segments: VoiceSegment[];
  totalDurationSeconds: number;
  companyName: string;
  accentColor: string;
  veo3StyleHint: string;
  fullNarration: string;
}

export async function generateVoiceoverScript(
  bodyText: string,
  companyName?: string,
  brandColor?: string
): Promise<VoiceoverScript> {

  const systemPrompt = `You are a professional TV commercial scriptwriter.
Transform social media ad copy into a timed voiceover script for a 15-second video ad.

RULES:
- Write natural SPOKEN language — how a real person says it on TV
- NOT heading/subheading structure — flowing narrative speech
- Split into exactly 4 segments, each 3-4 seconds when spoken aloud
- Each segment has a matching cinematic visual scene
- screenText = absolute minimum — 2-3 words only, like a billboard
- Opening: hook viewer in first 3 seconds
- Middle: build story naturally  
- Closing: strong CTA, urgent but not pushy
- Respond ONLY with valid JSON. No markdown. No explanation.`;

  const userPrompt = `Transform this ad copy into a voiceover script:

"""
${bodyText}
"""

Company: ${companyName || "the company"}

Return this exact JSON:
{
  "companyName": "company name",
  "accentColor": "vibrant hex color matching brand mood",
  "veo3StyleHint": "cinematic style hint appended to every scene prompt e.g. 'warm golden hour, documentary, 4K'",
  "fullNarration": "complete script as one flowing paragraph",
  "segments": [
    {
      "narration": "Spoken words for this scene. Natural speech, 1-2 sentences.",
      "screenText": "2-3 words MAX",
      "durationSeconds": 4,
      "visualDescription": "Detailed cinematic scene. Camera movement, mood, lighting. No text in scene.",
      "pexelsQuery": "3-4 word stock footage search",
      "position": "opening",
      "showCTA": false
    },
    {
      "narration": "...",
      "screenText": "...",
      "durationSeconds": 4,
      "visualDescription": "...",
      "pexelsQuery": "...",
      "position": "middle",
      "showCTA": false
    },
    {
      "narration": "...",
      "screenText": "...",
      "durationSeconds": 4,
      "visualDescription": "...",
      "pexelsQuery": "...",
      "position": "middle",
      "showCTA": false
    },
    {
      "narration": "...",
      "screenText": "...",
      "durationSeconds": 4,
      "visualDescription": "...",
      "pexelsQuery": "...",
      "position": "closing",
      "showCTA": true,
      "ctaText": "short CTA phrase max 5 words"
    }
  ]
}`;

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      prompt: userPrompt,
    });

    // Strip any accidental markdown fences
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const segments: VoiceSegment[] = (parsed.segments || []).map(
      (s: any, i: number): VoiceSegment => ({
        narration:         s.narration         || "",
        screenText:        s.screenText        || "",
        durationSeconds:   Number(s.durationSeconds) || 4,
        visualDescription: s.visualDescription || "cinematic professional setting",
        pexelsQuery:       s.pexelsQuery        || "business professional",
        position:
          s.position ||
          (i === 0
            ? "opening"
            : i === (parsed.segments.length - 1)
            ? "closing"
            : "middle"),
        showCTA:  !!s.showCTA,
        ctaText:  s.ctaText || undefined,
      })
    );

    return {
      segments,
      totalDurationSeconds: segments.reduce((sum, s) => sum + s.durationSeconds, 0),
      companyName:   parsed.companyName   || companyName  || "NeuroFlow",
      accentColor:   parsed.accentColor   || brandColor   || "#6366f1",
      veo3StyleHint: parsed.veo3StyleHint || "cinematic professional, warm lighting",
      fullNarration: parsed.fullNarration || segments.map((s) => s.narration).join(" "),
    };

  } catch (err: any) {
    console.error("[voiceover] Gemini failed:", err.message, "— using fallback");
    return buildFallbackScript(bodyText, companyName, brandColor);
  }
}

function buildFallbackScript(
  bodyText: string,
  companyName?: string,
  brandColor?: string
): VoiceoverScript {
  const lines = bodyText.split("\n").map((l) => l.trim()).filter(Boolean);

  const segments: VoiceSegment[] = [
    {
      narration:         lines[0] || "What if your business could run itself?",
      screenText:        "Sound familiar?",
      durationSeconds:   4,
      visualDescription: "Person looking stressed at desk, dramatic moody lighting, slow motion",
      pexelsQuery:       "stressed business person overwhelmed",
      position:          "opening",
      showCTA:           false,
    },
    {
      narration:         lines[1] || "Every day, businesses are losing time and money.",
      screenText:        "Every day.",
      durationSeconds:   4,
      visualDescription: "Busy office chaos, clock ticking, people rushing, cinematic",
      pexelsQuery:       "busy office time pressure",
      position:          "middle",
      showCTA:           false,
    },
    {
      narration:         lines[2] || "Until they found a smarter way.",
      screenText:        "Until now.",
      durationSeconds:   4,
      visualDescription: "Sunrise breakthrough, person looking relieved, warm light",
      pexelsQuery:       "business breakthrough success",
      position:          "middle",
      showCTA:           false,
    },
    {
      narration:         `${companyName || "We"} changed everything. Now it's your turn.`,
      screenText:        "Your turn.",
      durationSeconds:   4,
      visualDescription: "Confident professional walking forward, bright inspiring light",
      pexelsQuery:       "confident professional success",
      position:          "closing",
      showCTA:           true,
      ctaText:           "Get Started Today",
    },
  ];

  return {
    segments,
    totalDurationSeconds: 16,
    companyName:   companyName || "NeuroFlow",
    accentColor:   brandColor  || "#6366f1",
    veo3StyleHint: "cinematic documentary style, warm professional lighting",
    fullNarration: segments.map((s) => s.narration).join(" "),
  };
}