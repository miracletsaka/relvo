import { NextRequest, NextResponse } from "next/server";
import path from "path";
import os from "os";
import fs from "fs";

import { uploadFileToSpaces } from "@/lib/video-upload-client";
import { fetchBestPexelsVideo } from "@/lib/pexels";
import { fetchBestUnsplashImage } from "@/lib/unsplash";

import {
  generateVoiceoverScript,
  type VoiceoverScript,
} from "@/lib/generate-voiceover-script";

import { generateVeo3Video } from "@/lib/veo3";
import { generateVoiceover, type VoiceId } from "@/lib/elevenlabs";

import { downloadBackgroundMusic, detectMusicMood } from "@/lib/background-music";

import {
  getPremiumComponent,
  type PremiumComponentKey,
} from "@/lib/template-components";

import { resolveTemplateImages } from "@/lib/resolve-template-images";

import {
  extractSpeechMarkers,
  extractMarkersFromTimestamps,
  extractMarkersWithGemini,
} from "@/lib/extract-speech-markers";

import type { SpeechMarker } from "@/remotion/compositions/SpeechMarker";
import type { MultiSceneVideoProps } from "@/remotion/compositions/MultiSceneVideo";
import type { CampaignData } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

// ── Bundle cache: built ONCE per process, never per request ──────────────────
let _bundleCache: string | null = null;
async function getBundleLocation(): Promise<string> {
  if (_bundleCache) return _bundleCache;
  console.log("[render-video] Building bundle (one time)...");
  const { bundle } = await import("@remotion/bundler");
  _bundleCache = await bundle({
    entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
    webpackOverride: (c) => c,
  });
  return _bundleCache;
}

const TEMPLATE_SEQUENCES: Record<string, PremiumComponentKey[]> = {
  opening: ["boldStatement", "lifestyleHero", "fullBleedHero", "hero"],
  middle: ["splitColor", "splitPhotoContent", "comparison", "cdStatsShowcase"],
  closing: ["offer", "flashSale", "cdBrandVs", "saasAd"],
};

function pickTemplate(pos: "opening" | "middle" | "closing", i: number): PremiumComponentKey {
  return TEMPLATE_SEQUENCES[pos][i % TEMPLATE_SEQUENCES[pos].length];
}

function sanitizeShapes(shapes: any[]): any[] {
  return shapes
    .map((s) => {
      if (s.type === "image" || s.src) {
        const src = s.src || "";
        if (
          !src ||
          src.startsWith("blob:") ||
          src.startsWith("nodedata:") ||
          src.startsWith("data:")
        ) {
          return { ...s, src: null };
        }
      }
      return s;
    })
    .filter((s) => !(s.type === "image" && !s.src));
}

// ensures no NaN durations ever reach Remotion
function asFiniteSeconds(v: any, fallback = 6) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ── Storyboard scene shape (mirrors VideoScene in the studio) ─────────────────
// Field names must stay in sync with VideoScene in @/lib/studio/types.
interface StoryboardScene {
  mode?: "webcam" | "broll" | "ai";
  aiPrompt?: string;
  // Matches VideoScene.uploadedUrl / VideoScene.uploadedType
  uploadedUrl?: string | null;
  uploadedType?: "video" | "image" | null;
  // Overlays are passed as the full SceneOverlayMedia array
  overlays?: Array<{
    id: string;
    type: "video" | "image";
    url?: string | null;
    startSeconds: number;
    endSeconds: number;
    x: number;
    y: number;
    w: number;
    h: number;
    radius?: number;
  }> | null;
  captionsMode?: "off" | "kinetic";
}

export async function POST(req: NextRequest) {
  const tempFiles: string[] = [];

  try {
    const body = await req.json();

    const {
      body_text,
      companyName,
      accentColor,
      useVeo3 = true,
      voiceId = "rachel" as VoiceId,
      webcamClips = [],
      preGeneratedScript,
      // ── Captions default OFF ───────────────────────────────────────────────
      captionsMode = "off",
    } = body;

    // ── PATCH: read storyboard scenes + uploaded scene media ────────────────
    const storyboardScenes: StoryboardScene[] | null = Array.isArray(body.storyboardScenes)
      ? body.storyboardScenes
      : null;

    // Uploaded scene backgrounds passed directly from ProjectStudio
    const uploadedSceneMediaFromBody: Array<{ index: number; url: string; type: "video" | "image" }> =
      Array.isArray(body.uploadedSceneMedia) ? body.uploadedSceneMedia : [];

    // ── 1) Script ───────────────────────────────────────────────────────────
    let script: VoiceoverScript;

    if (preGeneratedScript?.segments?.length >= 1) {
      script = preGeneratedScript as VoiceoverScript;
      console.log("[render-video] Using pre-generated script");
    } else {
      script = await generateVoiceoverScript(body_text || "", companyName, accentColor);
    }

    console.log(
      `[render-video] ${script.segments.length} segs | font="${script.styleDNA?.primaryFont}" tone="${script.styleDNA?.tone}"`
    );

    // ── 2) Campaign data ────────────────────────────────────────────────────
    const campaignData: CampaignData = {
      hook: body.hook || script.segments[0]?.screenText || "",
      subheading: body.subheading || script.segments[1]?.screenText || "",
      cta: body.cta || script.segments[script.segments.length - 1]?.ctaText || "",
      companyName: script.companyName,
      proof: body.proof || "",
      bullets: body.bullets || [],
      hashtags: body.hashtags || "",
      location: body.location || "",
      ctaLink: body.ctaLink || "",
    };

    // ── 3) Clip maps (webcam video+audio vs b-roll audio-only) ─────────────
    const webcamClipMap = new Map<number, { url: string; duration: number }>();
    const brollClipMap = new Map<number, { url: string; duration: number }>();

    for (const c of webcamClips as any[]) {
      const segIdx = Number(c.segmentIndex);
      if (!Number.isFinite(segIdx)) continue;

      const entry = {
        url: String(c.url || ""),
        duration:
          asFiniteSeconds(c.durationSeconds, 0) > 0
            ? asFiniteSeconds(c.durationSeconds, 6)
            : asFiniteSeconds(script.segments[segIdx]?.durationSeconds, 6),
      };

      if (!entry.url) continue;

      if (c.isWebcam) webcamClipMap.set(segIdx, entry);
      else brollClipMap.set(segIdx, entry);
    }

    const hasAnyUserVoice = (webcamClips as any[]).some((c) => c?.hasAudio === true);
    console.log(
      `[render-video] Voice mode: ${
        hasAnyUserVoice ? "USER (webcam + broll audio)" : "AI ElevenLabs"
      }`
    );

    // ── 4) Scene assets (videoUrl/imageUrl selection) ──────────────────────
    const sceneAssets: { videoUrl: string | null; imageUrl: string | null; source: string }[] =
      [];

    for (let i = 0; i < script.segments.length; i++) {
      const seg = script.segments[i];
      let videoUrl: string | null = null;
      let imageUrl: string | null = null;
      let source = "image";

      // ── PATCH: storyboard overrides ──────────────────────────────────────
      const sbScene = storyboardScenes?.[i];
      const sceneMode = sbScene?.mode;
      const sceneAiPrompt = sbScene?.aiPrompt;

      // Priority 1: uploaded background from storyboard (VideoScene.uploadedUrl / uploadedType)
      if (sbScene?.uploadedUrl) {
        const bgType = sbScene.uploadedType ?? "video";
        if (bgType === "video") {
          videoUrl = sbScene.uploadedUrl;
        } else {
          imageUrl = sbScene.uploadedUrl;
        }
        source = "upload";
        console.log(`[render-video] Scene ${i + 1}: storyboard upload (${bgType})`);
      }

      // Priority 2: webcam clip — only for non-AI modes
      if (!videoUrl && !imageUrl && sceneMode !== "ai") {
        const wc = webcamClipMap.get(i);
        if (wc && seg.preferWebcam) {
          videoUrl = wc.url;
          source = "webcam";
        }
      }

      // Priority 3: Veo3 — always try for "ai" mode; normal useVeo3 flag otherwise
      if (!videoUrl && !imageUrl) {
        const shouldTryVeo = sceneMode === "ai" || useVeo3;
        if (shouldTryVeo) {
          try {
            const dur = Math.min(8, Math.max(4, asFiniteSeconds(seg.durationSeconds, 6))) as
              | 4 | 5 | 6 | 7 | 8;

            // AI mode uses the per-scene aiPrompt if available
            const veoPrompt = sceneMode === "ai" && sceneAiPrompt
              ? `${sceneAiPrompt}. Style: ${script.styleDNA?.cinematicMood || "cinematic"}`
              : `${seg.visualDescription}. Style: ${script.styleDNA?.cinematicMood || "cinematic"}`;

            const r = await generateVeo3Video(
              veoPrompt,
              dur,
              "9:16",
              script.veo3StyleHint
            );

            if (r.videoUrl) {
              videoUrl = r.videoUrl;
              source = sceneMode === "ai" ? "veo3-ai" : "veo3";
            }
          } catch (e) {
            console.warn(`[scene ${i}] Veo3:`, e);
          }
        }
      }

      // Priority 4: Pexels fallback (skip for AI mode — already tried Veo3 above)
      if (!videoUrl && !imageUrl && sceneMode !== "ai") {
        try {
          videoUrl = await fetchBestPexelsVideo([
            seg.pexelsQuery,
            `${script.companyName} ${seg.position}`,
            "business cinematic",
          ]);
          if (videoUrl) source = "pexels";
        } catch (e) {
          console.warn(`[scene ${i}] Pexels:`, e);
        }
      }

      // Priority 5: Unsplash image fallback
      if (!videoUrl && !imageUrl) {
        try {
          imageUrl = await fetchBestUnsplashImage([seg.pexelsQuery, script.companyName], "portrait");
          source = "image";
        } catch (e) {
          console.warn(`[scene ${i}] Unsplash:`, e);
        }
      }

      sceneAssets.push({ videoUrl, imageUrl, source });
      console.log(`[render-video] Scene ${i + 1}: ${source}`);
    }

    // ── 5) Durations (MUST be finite) ───────────────────────────────────────
    const sceneIsWebcam = sceneAssets.map((a) => a.source === "webcam");

    const sceneDurations = script.segments.map((seg, i) => {
      if (sceneIsWebcam[i]) {
        const d = webcamClipMap.get(i)?.duration;
        return asFiniteSeconds(d, asFiniteSeconds(seg?.durationSeconds, 6));
      }
      return asFiniteSeconds(seg?.durationSeconds, 6);
    });

    const totalDuration = sceneDurations.reduce((sum, d) => sum + asFiniteSeconds(d, 6), 0);
    const totalFrames = Math.max(1, Math.round(asFiniteSeconds(totalDuration, 6) * 30));
    console.log(`[render-video] Total: ${totalDuration.toFixed(1)}s → ${totalFrames} frames`);

    // ── 6) Music + template shapes ──────────────────────────────────────────
    const musicMood = detectMusicMood(body_text || "", script.veo3StyleHint);

    const [musicPath, sceneShapes] = await Promise.all([
      downloadBackgroundMusic(musicMood).catch((e) => {
        console.warn("[music]", e);
        return null;
      }),
      Promise.all(
        script.segments.map(async (seg, i) => {
          try {
            const shapes = getPremiumComponent(pickTemplate(seg.position, i), 1080, 1350);
            return sanitizeShapes(await resolveTemplateImages(shapes, campaignData));
          } catch (e) {
            console.warn(`[shapes ${i}]`, e);
            return [];
          }
        })
      ),
    ]);

    if (musicPath) tempFiles.push(musicPath);

    let musicUrl: string | null = null;
    if (musicPath) {
      try {
        musicUrl = await uploadFileToSpaces(
          new File([fs.readFileSync(musicPath)], `music-${Date.now()}.mp3`, { type: "audio/mpeg" })
        );
      } catch (e) {
        console.warn("[music upload]", e);
      }
    }

    // ── 7) AUDIO (3-cases logic) ────────────────────────────────────────────
    let voiceUrl: string | null = null;
    const sceneAudioUrls: (string | null)[] = new Array(script.segments.length).fill(null);
    const brollAudioUrls: (string | null)[] = new Array(script.segments.length).fill(null);
    const sceneSpeechMarkers: SpeechMarker[][] = script.segments.map(() => []);

    if (hasAnyUserVoice) {
      for (const clip of webcamClips as any[]) {
        const i = Number(clip.segmentIndex);
        const seg = script.segments[i];
        if (!Number.isFinite(i) || !seg) continue;

        if (clip.isWebcam) {
          sceneAudioUrls[i] = clip.url;
          console.log(`[render-video] Scene ${i + 1} webcam audio: ${clip.url}`);
        } else {
          brollAudioUrls[i] = clip.url;
          console.log(`[render-video] Scene ${i + 1} b-roll audio: ${clip.url}`);
        }

        sceneSpeechMarkers[i] = extractSpeechMarkers(
          seg.narration,
          asFiniteSeconds(clip.durationSeconds, asFiniteSeconds(sceneDurations[i], 6)),
          seg.sceneEnergy,
          script.companyName,
          4
        );
      }

      const missedBrollIndices = script.segments
        .map((_, i) => i)
        .filter((i) => !sceneIsWebcam[i] && !brollAudioUrls[i]);

      if (missedBrollIndices.length > 0) {
        console.log(
          `[render-video] ${missedBrollIndices.length} b-roll scene(s) missing audio — generating ElevenLabs fallback...`
        );

        const missedText = missedBrollIndices.map((i) => script.segments[i].narration).join(" ");

        try {
          const { audioBuffer, wordTimings } = await generateVoiceover(missedText, voiceId);

          if (audioBuffer) {
            const fallbackUrl = await uploadFileToSpaces(
              new File([audioBuffer], `voice-broll-fallback-${Date.now()}.mp3`, {
                type: "audio/mpeg",
              })
            );

            let cumFrames = 0;
            for (const i of missedBrollIndices) {
              const frames = Math.max(1, Math.round(asFiniteSeconds(sceneDurations[i], 6) * 30));
              const cumSecs = cumFrames / 30;

              brollAudioUrls[i] = JSON.stringify({
                url: fallbackUrl,
                startFrom: cumFrames,
                endAt: cumFrames + frames,
              });

              sceneSpeechMarkers[i] = wordTimings
                ? extractMarkersFromTimestamps(
                    script.segments[i].narration,
                    wordTimings,
                    cumSecs,
                    asFiniteSeconds(sceneDurations[i], 6),
                    script.companyName,
                    4
                  )
                : extractSpeechMarkers(
                    script.segments[i].narration,
                    asFiniteSeconds(sceneDurations[i], 6),
                    script.segments[i].sceneEnergy,
                    script.companyName,
                    4
                  );

              cumFrames += frames;
            }
          }
        } catch (e) {
          console.warn("[render-video] Fallback b-roll voice failed:", e);
        }
      }
    } else {
      const { audioBuffer, wordTimings } = await generateVoiceover(script.fullNarration, voiceId);

      if (audioBuffer) {
        voiceUrl = await uploadFileToSpaces(
          new File([audioBuffer], `voice-${Date.now()}.mp3`, { type: "audio/mpeg" })
        );
        console.log(`[render-video] AI voice full track: ${voiceUrl}`);
      }

      // Try Gemini markers for all scenes in parallel; fall back per-scene if needed
      let cumTime = 0;
      const geminiMarkerPromises = script.segments.map((seg, i) => {
        const dur = asFiniteSeconds(sceneDurations[i], 6);
        return extractMarkersWithGemini(
          seg.narration,
          seg.screenText,
          dur,
          script.companyName,
          3,
        ).catch(() => null); // null = use fallback
      });
      const geminiResults = await Promise.all(geminiMarkerPromises);

      for (let i = 0; i < script.segments.length; i++) {
        const seg = script.segments[i];
        const dur = asFiniteSeconds(sceneDurations[i], 6);

        if (geminiResults[i] && geminiResults[i]!.length > 0) {
          sceneSpeechMarkers[i] = geminiResults[i]!;
          console.log("[markers] Scene", i + 1, "Gemini:", geminiResults[i]!.map(m => m.word).join(", "));
        } else {
          sceneSpeechMarkers[i] = wordTimings
            ? extractMarkersFromTimestamps(seg.narration, wordTimings, cumTime, dur, script.companyName, 3)
            : extractSpeechMarkers(seg.narration, dur, seg.sceneEnergy, script.companyName, 3);
        }

        cumTime += dur;
      }
    }

    // ── 8) Build uploadedOverlaysByScene from storyboardScenes ───────────────
    // VideoScene.overlays is a SceneOverlayMedia[] — each entry already has
    // geometry, timing, and an uploaded url. We just pass them through.
    const uploadedOverlaysByScene: MultiSceneVideoProps["uploadedOverlaysByScene"] = {};

    if (storyboardScenes) {
      for (let i = 0; i < storyboardScenes.length; i++) {
        const sb = storyboardScenes[i];
        if (!sb?.overlays?.length) continue;

        uploadedOverlaysByScene[i] = sb.overlays
          .filter((o) => !!o.url)
          .map((o) => ({
            id: o.id,
            type: o.type,
            url: o.url!,
            startSeconds: o.startSeconds,
            endSeconds: o.endSeconds,
            x: o.x,
            y: o.y,
            w: o.w,
            h: o.h,
            radius: o.radius,
          }));
      }
    }

    // ── 9) Remotion props + render ───────────────────────────────────────────
    // Cast to any for Remotion — MultiSceneVideoProps is not indexable by string
    const inputProps = {
      segments: script.segments,
      sceneVideos: sceneAssets.map((a) => a.videoUrl),
      sceneImages: sceneAssets.map((a) => a.imageUrl),
      sceneShapes,
      sceneIsWebcam,
      sceneDurations,
      userRecordedVoice: hasAnyUserVoice,
      campaignData: campaignData as any,
      accentColor: script.accentColor,
      companyName: script.companyName,
      styleDNA: script.styleDNA,
      musicUrl: musicUrl ?? undefined,
      voiceUrl: voiceUrl ?? undefined,
      sceneAudioUrls,
      brollAudioUrls,
      sceneSpeechMarkers,
      // ── captions default OFF ────────────────────────────────────────────
      captionsMode: "off",
      // ── storyboard overlays ─────────────────────────────────────────────
      uploadedOverlaysByScene:
        Object.keys(uploadedOverlaysByScene).length > 0 ? uploadedOverlaysByScene : undefined,
      // ── uploaded scene backgrounds ──────────────────────────────────────
      uploadedSceneMedia:
        uploadedSceneMediaFromBody.length > 0 ? uploadedSceneMediaFromBody : undefined,
    };

    const { renderMedia, selectComposition } = await import("@remotion/renderer");
    const bundleLocation = await getBundleLocation();

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "MultiSceneVideo",
      inputProps: inputProps as any,
    });

    composition.durationInFrames = totalFrames;

    if (!Number.isFinite(composition.durationInFrames) || composition.durationInFrames <= 0) {
      throw new Error(`Invalid durationInFrames: ${composition.durationInFrames}`);
    }

    const outputPath = path.join(os.tmpdir(), `ad-${Date.now()}.mp4`);
    tempFiles.push(outputPath);

    console.log(`[render-video] Rendering ${totalFrames} frames...`);
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: inputProps as any,
    });

    const url = await uploadFileToSpaces(
      new File([fs.readFileSync(outputPath)], `ad-${Date.now()}.mp4`, { type: "video/mp4" })
    );

    console.log("[render-video] Done:", url);

    return NextResponse.json({
      ok: true,
      url,
      meta: {
        segments: script.segments.length,
        totalSeconds: totalDuration,
        sceneDurations,
        voiceMode: hasAnyUserVoice ? "user-webcam+broll" : "ai-continuous",
        sources: sceneAssets.map((a) => a.source),
        styleDNA: script.styleDNA,
        markerCounts: sceneSpeechMarkers.map((m) => m.length),
        captionsMode: "off",
      },
    });
  } catch (err: any) {
    console.error("[render-video] Fatal:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Render failed" },
      { status: 500 }
    );
  } finally {
    for (const f of tempFiles) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {}
    }
  }
}