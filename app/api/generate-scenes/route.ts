// app/api/studio/generate-scenes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export const runtime    = "nodejs";
export const maxDuration = 30;

function extractJSON<T>(raw: string): T {
  const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = clean.search(/[{[]/);
  if (start === -1) throw new Error("No JSON found");
  return JSON.parse(clean.slice(start)) as T;
}

export async function POST(req: NextRequest) {
  try {
    const { concept, count = 4, companyName, accentColor } = await req.json();

    const prompt = `
You are a creative director writing storyboard scenes for a vertical video ad.

Company: "${companyName}"
Concept / brief:
"""
${concept || `A premium ad for ${companyName}`}
"""

Generate exactly ${count} storyboard scenes as JSON. Return ONLY valid JSON, no markdown.

[
  {
    "index": 0,
    "screenText": "SHORT PUNCHY HOOK (max 5 words, ALL CAPS)",
    "narration": "1-2 sentences spoken aloud. Specific to ${companyName}. Natural, conversational.",
    "durationSeconds": 6,
    "mode": "ai",
    "position": "opening",
    "sceneEnergy": 0.9,
    "animationStyle": "energetic",
    "templateHint": "hero",
    "aiPrompt": "Detailed Veo3 video prompt for this scene. 9:16 vertical, cinematic, specific.",
    "beats": [{"kind":"stat","raw":"80%","value":80,"label":"%"}]
  }
]

RULES:
- index: 0 to ${count - 1}
- position: index 0 = "opening", last = "closing", rest = "middle"
- screenText: max 5 words, ALL CAPS, punchy and SPECIFIC to ${companyName}
- narration: natural spoken words. NO generic filler like "our product is great". Be specific.
- mode: "ai" for all (user will change to webcam/broll if they record)
- durationSeconds: 5-7
- sceneEnergy: 0.6-1.0
- animationStyle: "energetic" | "calm" | "dramatic"
- templateHint: "hero" | "stats" | "comparison" | "offer" | "testimonial" | "generic"
- aiPrompt: rich cinematic Veo3 prompt — shot type, lighting, movement, subject, mood. Vertical 9:16.
- beats: real numbers/stats from narration ([] if none)
  kinds: "stat" | "money" | "time" | "rating" | "count"
- Opening scene: high energy hook
- Closing scene: strong call to action for ${companyName}
`;

    const { text } = await generateText({
      model:       google("gemini-2.5-flash"),
      prompt,
      temperature: 0.9,
    });
    const raw = text;
    const scenes = extractJSON<any[]>(raw);

    if (!Array.isArray(scenes)) throw new Error("Expected array");

    // Sanitize
    const sanitized = scenes.map((s: any, i: number) => ({
      index:         i,
      screenText:    String(s.screenText || "NEW SCENE").trim().slice(0, 80),
      narration:     String(s.narration  || "").trim(),
      durationSeconds: Math.min(12, Math.max(4, Number(s.durationSeconds) || 6)),
      mode:          "ai",
      status:        "ready",
      position:      s.position || (i === 0 ? "opening" : i === scenes.length - 1 ? "closing" : "middle"),
      sceneEnergy:   Math.min(1, Math.max(0, Number(s.sceneEnergy) || 0.7)),
      animationStyle: s.animationStyle || "calm",
      templateHint:  s.templateHint   || "generic",
      aiPrompt:      String(s.aiPrompt || s.narration || "").trim(),
      beats:         Array.isArray(s.beats) ? s.beats : [],
    }));

    console.log(`[generate-scenes] ✅ ${sanitized.length} scenes for "${companyName}"`);
    return NextResponse.json({ ok: true, scenes: sanitized });
  } catch (err: any) {
    console.error("[generate-scenes]", err);
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}