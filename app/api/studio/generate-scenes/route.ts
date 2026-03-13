// app/api/studio/generate-scenes/route.ts
// Generates a FULL set of scenes (4 by default) from a concept brief.
//
// Improvements:
// 1. Veo3 availability checked BEFORE generation — scenes get mode="ai" only
//    if Veo3 is configured, otherwise they get mode="pexels" immediately.
// 2. Media assets are portrait-filtered (handled in fetchVideoAssets).
// 3. Each scene arrives in the Studio already carrying a mediaAssetUrl if
//    available — user sees a real video clip from the first render, not a grey card.

import { NextRequest, NextResponse } from "next/server";
import {
  matchCategory, fetchVideoAssets,
  extractJSON, buildScene, callGemini, isVeo3Available,
} from "@/lib/studio/scene-utils";

export const runtime     = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      concept     = "",
      count       = 4,
      companyName = "NeuroFlow",
      accentColor = "#7c3aed",
      brandId     = "",
    } = body;

    // ── Check Veo3 BEFORE building scenes ──────────────────────────────────
    // If Veo3 is available, scenes with no media asset get mode="ai"
    // (will generate video during render).
    // If not, they get mode="pexels" (render falls back to Pexels/Unsplash).
    const veo3Available = isVeo3Available();
    console.log(`[generate-scenes] Veo3 available: ${veo3Available}`);

    // ── Fetch media assets first ────────────────────────────────────────────
    console.log(`[generate-scenes] brand="${brandId || "(none)"}" company="${companyName}" | Veo3=${veo3Available}`);
    const videoPool = await fetchVideoAssets(brandId || companyName);
    console.log(`[generate-scenes] videoPool FINAL: ${videoPool.length} clips`);

    // ── Generate scene scripts via Gemini ───────────────────────────────────
    const prompt = `You are a creative director writing a vertical video ad storyboard.

Company: "${companyName}"
Brief: """${concept || `A premium ad for ${companyName}`}"""

Generate exactly ${count} scenes as a JSON array. Return ONLY valid JSON, no markdown.

Each scene object:
{"index":0,"screenText":"HOOK (max 5 words, ALL CAPS)","narration":"Natural spoken sentence under 22 words. Specific to ${companyName}.","position":"opening","sceneEnergy":0.9,"animationStyle":"energetic","templateHint":"hero","aiPrompt":"Veo3 prompt: vertical 9:16, cinematic shot description, 1-2 sentences."}

RULES:
- index 0="opening", last index=${count - 1}="closing", rest="middle"
- screenText: max 5 words, ALL CAPS, punchy, no generic filler
- narration: under 22 words, specific to ${companyName}
- animationStyle: "energetic"|"calm"|"dramatic"
- templateHint: "hero"|"stats"|"comparison"|"offer"|"testimonial"|"generic"
- sceneEnergy: 0.6-1.0
- aiPrompt: rich Veo3 shot description, vertical 9:16
- Do NOT include a "beats" field`;

    const text = await callGemini(prompt, 2048);

    let rawScenes: any[];
    try {
      rawScenes = extractJSON<any[]>(text);
      if (!Array.isArray(rawScenes)) throw new Error("not an array");
    } catch (e: any) {
      console.error("[generate-scenes] JSON parse failed:", e.message, "\nRaw:", text.slice(0, 200));
      throw new Error(`Gemini returned invalid JSON: ${e.message}`);
    }

    // ── Build scenes — each gets a media asset OR Veo3 mode ────────────────
    const usedIds = new Set<string>();
    const scenes  = rawScenes.slice(0, count).map((s, i) => {
      // Assign UNIQUE media assets — avoid reusing the same clip in the same video
      let video: any | null = null;
      if (videoPool.length > 0) {
        // Try to find an unused asset first
        const unused = videoPool.filter((a: any) => !usedIds.has(a.id));
        video = unused.length > 0
          ? unused[i % unused.length]
          : videoPool[i % videoPool.length]; // fallback to cycling if all used
        if (video?.id) usedIds.add(video.id);
      }

      return buildScene(
        s,
        i,
        Math.min(rawScenes.length, count),
        video,
        brandId,
        veo3Available,
      );
    });

    const mediaCount = scenes.filter((s) => s.mode === "media_asset").length;
    const veo3Count  = scenes.filter((s) => s.veo3Queued).length;
    const pexelsCount= scenes.filter((s) => s.mode === "pexels").length;

    console.log(
      `[generate-scenes] ✅ ${scenes.length} scenes | ` +
      `media_asset:${mediaCount} veo3_queued:${veo3Count} pexels:${pexelsCount} | ` +
      `company:"${companyName}" brand:${brandId}`
    );

    return NextResponse.json({
      ok: true,
      scenes,
      meta: {
        videosUsed:   videoPool.length,
        veo3Available,
        breakdown:    { mediaCount, veo3Count, pexelsCount },
      },
    });

  } catch (err: any) {
    console.error("[generate-scenes] Fatal:", err.message);
    return NextResponse.json({ ok: false, error: err.message || "Generation failed" }, { status: 500 });
  }
}