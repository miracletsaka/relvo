// app/api/studio/add-scene/route.ts
// Generates ONE new scene, contextually aware of existing scenes.
// POST body: { concept, companyName, accentColor?, existingScenes[] }
//
// existingScenes should be LIGHTWEIGHT — only:
//   { index, position, screenText, narration, mode, mediaAssetId, mediaCategory }
// Do NOT send blob URLs or heavy fields.

import { NextRequest, NextResponse } from "next/server";
import {
  matchCategory, fetchVideoAssets,
  extractJSON, buildScene, callGemini,
} from "@/lib/studio/scene-utils";

export const runtime     = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      concept        = "",
      companyName    = "Relvo",
      accentColor    = "#7c3aed",
      brandId        = "",
      existingScenes = [] as any[],
    } = body;

    console.log(`[add-scene] company="${companyName}" | existing=${existingScenes.length}`);

    const summary = existingScenes.length
      ? existingScenes
          .map((s: any, i: number) => `Scene ${i + 1} (${s.position}): "${s.screenText}" — ${s.narration}`)
          .join("\n")
      : "(none yet — this is the first scene)";

    const newIndex    = existingScenes.length;
    const newPosition = newIndex === 0 ? "opening" : "middle";

    const prompt = `You are a creative director adding ONE new scene to a video ad storyboard.

Company: "${companyName}"
Concept: """${concept || companyName}"""

EXISTING SCENES — do NOT repeat these ideas:
${summary}

Write exactly ONE scene that flows naturally after the above.
Keep narration under 22 words. Be specific to ${companyName}.

Return ONLY this JSON object — no array, no markdown, no extra text:
{"screenText":"HOOK (max 5 words, ALL CAPS)","narration":"Spoken sentence under 22 words.","animationStyle":"calm","templateHint":"generic","sceneEnergy":0.75,"aiPrompt":"Veo3 prompt: vertical 9:16 cinematic shot, 1 sentence."}`;

    const text = await callGemini(prompt, 800);

    let parsed: any;
    try {
      parsed = extractJSON<any>(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bad shape");
    } catch (e) {
      console.warn("[add-scene] parse error, using fallback:", e);
      parsed = {
        screenText:     "ONE MORE REASON",
        narration:      `${companyName} helps your business grow faster and smarter every day.`,
        animationStyle: "calm",
        templateHint:   "generic",
        sceneEnergy:    0.7,
        aiPrompt:       "Cinematic vertical close-up of a confident professional at a modern desk. 9:16.",
      };
    }

    // Pick a video asset not already used by existing scenes
    const usedIds  = new Set<string>(existingScenes.map((s: any) => s.mediaAssetId).filter(Boolean));
    const pool     = await fetchVideoAssets(brandId || companyName, usedIds);
    const video    = pool[0] ?? null;

    const scene = buildScene(parsed, newIndex, newIndex + 1, video, brandId);
    // Force position — buildScene uses total to infer, but for addOne we always want "middle"
    // unless it's truly the first scene
    scene.position = newPosition;

    console.log(`[add-scene] ✅ "${scene.screenText}" | mode:${scene.mode} | ~${scene.durationSeconds}s`);
    return NextResponse.json({ ok: true, scene });

  } catch (err: any) {
    console.error("[add-scene] Fatal:", err.message);
    return NextResponse.json({ ok: false, error: err.message || "Add scene failed" }, { status: 500 });
  }
}