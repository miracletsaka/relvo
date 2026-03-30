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

import type { SpeechMarker } from "@/remotion/compositions/SpeechMarker";
import type { MultiSceneVideoProps } from "@/remotion/compositions/MultiSceneVideo";
import type { CampaignData } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

// ─────────────────────────────────────────────────────────────────────────────
// Persistent job store
//
// Stored in module-level Map so it survives across requests in the same
// Next.js process. Jobs older than 2 hours are cleaned up automatically.
//
// Shape:
//   processing  — render is running in background
//   done        — render finished, video URL available
//   failed      — render crashed, error message available
// ─────────────────────────────────────────────────────────────────────────────

type RenderJob = {
  status:    "processing" | "done" | "failed";
  draftId?:  string | null;   // if set, server auto-attaches video to draft when done
  url?:      string;
  error?:    string;
  startedAt: number;
  updatedAt: number;
  meta?:     Record<string, any>;
};

const _jobs = new Map<string, RenderJob>();

// Clean up jobs older than 2 hours every 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, job] of _jobs) {
    if (job.startedAt < cutoff) _jobs.delete(id);
  }
}, 30 * 60 * 1000);


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/render-video?jobId=xxx  — status polling
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const job = _jobs.get(jobId);
  if (!job) {
    // Job not found — either expired or server restarted
    // Return a neutral "unknown" so client can handle gracefully
    return NextResponse.json({ status: "unknown", error: "Job not found or expired" }, { status: 404 });
  }

  return NextResponse.json({
    status:    job.status,
    url:       job.url,
    error:     job.error,
    draftId:   job.draftId,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
    meta:      job.meta,
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/render-video  — kick off render, return jobId immediately
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 }); }

  const jobId  = `render-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const draftId = body.draftId ?? body.draft_id ?? null;

  _jobs.set(jobId, {
    status:    "processing",
    draftId,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Fire render in background — do NOT await
  _runRender(jobId, body).catch((err) => {
    console.error("[render-video] Unhandled crash:", err);
    const existing = _jobs.get(jobId);
    _jobs.set(jobId, {
      ...existing,
      status:    "failed",
      error:     err?.message || "Unknown error",
      updatedAt: Date.now(),
      startedAt: existing?.startedAt ?? Date.now(),
    });
  });

  // Return jobId to client immediately — client polls GET
  return NextResponse.json({ ok: true, jobId, status: "processing" });
}


// ─────────────────────────────────────────────────────────────────────────────
// Server-side draft attachment
// Calls FastAPI PATCH /content/{draftId}/media directly from the server.
// This means the client does NOT need to be open when the render finishes.
// ─────────────────────────────────────────────────────────────────────────────

async function _attachToDraftOnServer(draftId: string, videoUrl: string): Promise<void> {
  const apiBase = (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "http://localhost:8000"
  ).replace(/\/$/, "");

  const res = await fetch(`${apiBase}/content/${draftId}/media`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type:     "video",
      media_url:      videoUrl,
      media_urls:     [videoUrl],
      media_provider: "render_pipeline",
      media_caption:  null,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Draft attachment failed: ${res.status} ${text.slice(0, 200)}`);
  }

  console.log(`[render-video] Auto-attached video to draft ${draftId}`);
}


// ─────────────────────────────────────────────────────────────────────────────
// Bundle cache — built once per process lifetime
// ─────────────────────────────────────────────────────────────────────────────

let _bundleCache: string | null = null;
async function getBundleLocation(): Promise<string> {
  if (_bundleCache) return _bundleCache;
  console.log("[render-video] Building Remotion bundle (one-time)...");
  const { bundle } = await import("@remotion/bundler");
  _bundleCache = await bundle({
    entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
    webpackOverride: (c) => c,
  });
  return _bundleCache;
}

function asFiniteSeconds(v: any, fallback = 6) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}


// ─────────────────────────────────────────────────────────────────────────────
// Studio scene shape
// ─────────────────────────────────────────────────────────────────────────────

interface StudioScene {
  mode?:          "webcam" | "broll" | "ai" | "media_asset";
  aiPrompt?:      string;
  mediaAssetUrl?: string | null;
  mediaAssetId?:  string | null;
  mediaCategory?: string | null;
  uploadedUrl?:   string | null;
  uploadedType?:  "video" | "image" | null;
  recordedUrl?:   string | null;
  overlays?: Array<{
    id: string; type: "video" | "image"; url?: string | null;
    startSeconds: number; endSeconds: number;
    x: number; y: number; w: number; h: number; radius?: number;
  }> | null;
}


// ─────────────────────────────────────────────────────────────────────────────
// _runRender — the actual render pipeline, runs in background
// ─────────────────────────────────────────────────────────────────────────────

async function _runRender(jobId: string, body: any): Promise<void> {
  const tempFiles: string[] = [];

  const _update = (patch: Partial<RenderJob>) => {
    const existing = _jobs.get(jobId) ?? { status: "processing" as const, startedAt: Date.now(), updatedAt: Date.now() };
    _jobs.set(jobId, { ...existing, ...patch, updatedAt: Date.now() });
  };

  try {
    const {
      body_text,
      companyName,
      accentColor,
      useVeo3       = false,
      voiceId       = "EXAVITQu4vr4xnSDxMaL" as VoiceId,
      enableVoice   = true,
      webcamClips   = [],
      preGeneratedScript,
      captionsMode  = "off",
    } = body;

    const draftId  = body.draftId ?? body.draft_id ?? null;
    const brandId  = body.brandId ?? body.brand_id ?? null;

    const studioScenes: StudioScene[] | null = Array.isArray(body.storyboardScenes)
      ? body.storyboardScenes : null;

    const uploadedSceneMediaFromBody: Array<{ index: number; url: string; type: "video" | "image" }> =
      Array.isArray(body.uploadedSceneMedia) ? body.uploadedSceneMedia : [];

    // ── 1) Script ─────────────────────────────────────────────────────────────
    let script: VoiceoverScript;
    if (preGeneratedScript?.segments?.length >= 1) {
      script = preGeneratedScript as VoiceoverScript;
      console.log("[render-video] Using pre-generated script from Studio");
    } else {
      script = await generateVoiceoverScript(body_text || "", companyName, accentColor);
    }
    console.log(`[render-video] ${script.segments.length} segs | font="${script.styleDNA?.primaryFont}"`);

    // ── 2) Campaign data ──────────────────────────────────────────────────────
    const campaignData: CampaignData = {
      hook:        body.hook       || script.segments[0]?.screenText || "",
      subheading:  body.subheading || script.segments[1]?.screenText || "",
      cta:         body.cta        || script.segments[script.segments.length - 1]?.ctaText || "",
      companyName: script.companyName,
      proof:       body.proof    || "",
      bullets:     body.bullets  || [],
      hashtags:    body.hashtags || "",
      location:    body.location || "",
      ctaLink:     body.ctaLink  || "",
    };

    // ── 3) Clip maps ──────────────────────────────────────────────────────────
    const webcamClipMap = new Map<number, { url: string; duration: number }>();
    const brollClipMap  = new Map<number, { url: string; duration: number }>();

    for (const c of webcamClips as any[]) {
      const segIdx = Number(c.segmentIndex);
      if (!Number.isFinite(segIdx)) continue;
      const entry = {
        url:      String(c.url || ""),
        duration: asFiniteSeconds(c.durationSeconds, 0) > 0
          ? asFiniteSeconds(c.durationSeconds, 6)
          : asFiniteSeconds(script.segments[segIdx]?.durationSeconds, 6),
      };
      if (!entry.url) continue;
      if (c.isWebcam) webcamClipMap.set(segIdx, entry);
      else            brollClipMap.set(segIdx, entry);
    }

    const hasAnyUserVoice = (webcamClips as any[]).some((c) => c?.hasAudio === true);

    // ── 4) Scene assets ───────────────────────────────────────────────────────
    const sceneAssets: { videoUrl: string | null; imageUrl: string | null; source: string }[] = [];

    for (let i = 0; i < script.segments.length; i++) {
      const seg      = script.segments[i];
      const studio   = studioScenes?.[i] ?? null;
      const mode     = studio?.mode ?? "media_asset";
      const aiPrompt = studio?.aiPrompt ?? "";

      let videoUrl: string | null = null;
      let imageUrl: string | null = null;
      let source = "color";

      if (!videoUrl && !imageUrl && studio?.recordedUrl) {
        videoUrl = studio.recordedUrl;
        source   = mode === "webcam" ? "webcam" : "broll-recorded";
      }
      if (!videoUrl && !imageUrl && (mode === "webcam" || mode === "broll")) {
        const wc = webcamClipMap.get(i) ?? brollClipMap.get(i);
        if (wc?.url) { videoUrl = wc.url; source = mode === "webcam" ? "webcam" : "broll-recorded"; }
      }
      if (!videoUrl && !imageUrl && studio?.uploadedUrl) {
        if (studio.uploadedType === "video") videoUrl = studio.uploadedUrl;
        else imageUrl = studio.uploadedUrl;
        source = "upload";
      }
      if (!videoUrl && !imageUrl) {
        const up = uploadedSceneMediaFromBody.find((u) => u.index === i);
        if (up?.url) {
          if (up.type === "video") videoUrl = up.url;
          else imageUrl = up.url;
          source = "upload";
        }
      }
      if (!videoUrl && !imageUrl && studio?.mediaAssetUrl) {
        videoUrl = studio.mediaAssetUrl;
        source   = "media_asset";
      }
      if (!videoUrl && !imageUrl && (mode === "ai" || useVeo3)) {
        try {
          const dur = Math.min(8, Math.max(4, asFiniteSeconds(seg.durationSeconds, 6))) as 4|5|6|7|8;
          const veoPrompt = mode === "ai" && aiPrompt
            ? `${aiPrompt}. Style: ${script.styleDNA?.cinematicMood || "cinematic"}`
            : `${seg.visualDescription}. Style: ${script.styleDNA?.cinematicMood || "cinematic"}`;
          const r = await generateVeo3Video(veoPrompt, dur, "9:16", script.veo3StyleHint);
          if (r.videoUrl) { videoUrl = r.videoUrl; source = mode === "ai" ? "veo3-ai" : "veo3"; }
        } catch (e) { console.warn(`[scene ${i+1}] Veo3 failed:`, e); }
      }
      if (!videoUrl && !imageUrl && mode !== "ai") {
        try {
          videoUrl = await fetchBestPexelsVideo([seg.pexelsQuery, `${script.companyName} ${seg.position}`, "business cinematic"]);
          if (videoUrl) source = "pexels";
        } catch (e) { console.warn(`[scene ${i+1}] Pexels:`, e); }
      }
      if (!videoUrl && !imageUrl) {
        try {
          imageUrl = await fetchBestUnsplashImage([seg.pexelsQuery, script.companyName], "portrait");
          source   = "image";
        } catch (e) { console.warn(`[scene ${i+1}] Unsplash:`, e); }
      }

      console.log(`[render-video] Scene ${i+1}: ${source}`);
      sceneAssets.push({ videoUrl, imageUrl, source });
    }

    // ── 5) Voice generation ───────────────────────────────────────────────────
    const sceneAudioUrls:    (string | null)[] = new Array(script.segments.length).fill(null);
    const brollAudioUrls:    (string | null)[] = new Array(script.segments.length).fill(null);
    const sceneSpeechMarkers: SpeechMarker[][]  = script.segments.map(() => []);
    const sceneIsWebcam = sceneAssets.map((a) => a.source === "webcam" || a.source === "broll-recorded");

    const recordedSceneIndices = new Set<number>();
    for (const clip of webcamClips as any[]) {
      const i = Number(clip.segmentIndex);
      if (Number.isFinite(i) && script.segments[i]) recordedSceneIndices.add(i);
    }
    if (studioScenes) {
      for (let i = 0; i < studioScenes.length; i++) {
        if (studioScenes[i]?.recordedUrl) recordedSceneIndices.add(i);
      }
    }

    const aiNeededIndices = script.segments.map((_, i) => i).filter((i) => !recordedSceneIndices.has(i));
    const perSceneAiVoice: (string | null)[] = new Array(script.segments.length).fill(null);

    if (enableVoice) {
      console.log(`[render-video] Generating ${aiNeededIndices.length} ElevenLabs clips...`);
      for (const i of aiNeededIndices) {
        const narration = script.segments[i].narration?.trim();
        if (!narration) continue;
        try {
          const { audioBuffer, durationSec } = await generateVoiceover(narration, voiceId);
          if (!audioBuffer) continue;
          const url = await uploadFileToSpaces(
            new File([new Uint8Array(audioBuffer)], `voice-scene${i}-${Date.now()}.mp3`, { type: "audio/mpeg" })
          );
          perSceneAiVoice[i]                 = url;
          script.segments[i].durationSeconds = Math.max(durationSec, 3);
          console.log(`[render-video] Scene ${i+1}: voice ${durationSec.toFixed(1)}s`);
        } catch (e) {
          console.error(`[render-video] Scene ${i+1}: voice failed`, e);
        }
      }
    } else {
      console.log("[render-video] Music-only mode — skipping TTS");
    }

    for (const i of aiNeededIndices) {
      if (perSceneAiVoice[i]) brollAudioUrls[i] = perSceneAiVoice[i];
    }

    // ── 6) Durations ──────────────────────────────────────────────────────────
    const sceneDurations = script.segments.map((seg, i) => {
      if (recordedSceneIndices.has(i)) {
        const d = webcamClipMap.get(i)?.duration ?? brollClipMap.get(i)?.duration;
        return asFiniteSeconds(d, asFiniteSeconds(seg?.durationSeconds, 6));
      }
      return asFiniteSeconds(seg?.durationSeconds, 4);
    });

    const totalDuration = sceneDurations.reduce((sum, d) => sum + d, 0);
    const totalFrames   = Math.max(1, Math.round(totalDuration * 30));
    console.log(`[render-video] ${totalDuration.toFixed(1)}s → ${totalFrames} frames`);

    // ── 7) Music ──────────────────────────────────────────────────────────────
    const musicMood = detectMusicMood(body_text || "", script.veo3StyleHint);
    const [musicPath] = await Promise.all([
      downloadBackgroundMusic(musicMood).catch((e) => { console.warn("[music]", e); return null; }),
    ]);

    if (musicPath) tempFiles.push(musicPath);
    let musicUrl: string | null = null;

    if (musicPath) {
      try {
        musicUrl = await uploadFileToSpaces(
          new File([fs.readFileSync(musicPath)], `music-${Date.now()}.mp3`, { type: "audio/mpeg" })
        );
        console.log("[render-video] Music uploaded:", musicUrl);
      } catch (e) { console.warn("[music upload] failed:", e); }
    }

    if (!musicUrl) {
      musicUrl = `https://neuroflow.lon1.digitaloceanspaces.com/music/Alegend%20-%20Titanium%20(freetouse.com).mp3`;
      console.log("[render-video] Using fallback music");
    }

    // ── 8) Overlays ───────────────────────────────────────────────────────────
    const uploadedOverlaysByScene: MultiSceneVideoProps["uploadedOverlaysByScene"] = {};
    if (studioScenes) {
      for (let i = 0; i < studioScenes.length; i++) {
        const sb = studioScenes[i];
        if (!sb?.overlays?.length) continue;
        uploadedOverlaysByScene[i] = sb.overlays
          .filter((o) => !!o.url)
          .map((o) => ({ id: o.id, type: o.type, url: o.url!, startSeconds: o.startSeconds, endSeconds: o.endSeconds, x: o.x, y: o.y, w: o.w, h: o.h, radius: o.radius }));
      }
    }

    // ── 9) Remotion render ────────────────────────────────────────────────────
    const inputProps = {
      segments:         script.segments,
      sceneVideos:      sceneAssets.map((a) => a.videoUrl),
      sceneImages:      sceneAssets.map((a) => a.imageUrl),
      sceneShapes:      script.segments.map(() => []),
      sceneIsWebcam,
      sceneDurations,
      userRecordedVoice: hasAnyUserVoice,
      campaignData:      campaignData as any,
      accentColor:       script.accentColor,
      companyName:       script.companyName,
      styleDNA:          script.styleDNA,
      musicUrl:          musicUrl ?? undefined,
      musicVolume:       enableVoice ? 0.15 : 0.55,
      voiceUrl:          undefined,
      sceneAudioUrls,
      brollAudioUrls,
      sceneSpeechMarkers,
      captionsMode:      "off" as const,
      uploadedOverlaysByScene: Object.keys(uploadedOverlaysByScene).length > 0 ? uploadedOverlaysByScene : undefined,
      uploadedSceneMedia: uploadedSceneMediaFromBody.length > 0 ? uploadedSceneMediaFromBody : undefined,
    };

    const { renderMedia, selectComposition } = await import("@remotion/renderer");
    const bundleLocation = await getBundleLocation();

    const composition = await selectComposition({ serveUrl: bundleLocation, id: "MultiSceneVideo", inputProps: inputProps as any });
    composition.durationInFrames = totalFrames;

    if (!Number.isFinite(composition.durationInFrames) || composition.durationInFrames <= 0) {
      throw new Error(`Invalid durationInFrames: ${composition.durationInFrames}`);
    }

    const outputPath = path.join(os.tmpdir(), `ad-${Date.now()}.mp4`);
    tempFiles.push(outputPath);

    console.log(`[render-video] Rendering ${totalFrames} frames...`);
    await renderMedia({
      composition,
      serveUrl:       bundleLocation,
      codec:          "h264",
      outputLocation: outputPath,
      inputProps:     inputProps as any,
    });

    // ── 10) Upload final video ────────────────────────────────────────────────
    const videoUrl = await uploadFileToSpaces(
      new File([fs.readFileSync(outputPath)], `ad-${Date.now()}.mp4`, { type: "video/mp4" })
    );
    console.log("[render-video] Done:", videoUrl);

    const meta = {
      segments:     script.segments.length,
      totalSeconds: totalDuration,
      sceneDurations,
      voiceMode:    !enableVoice ? "music-only" : hasAnyUserVoice ? "user-webcam+broll" : "ai-continuous",
      sources:      sceneAssets.map((a) => a.source),
    };

    // ── 11) Auto-attach to draft on server — client doesn't need to be open ──
    if (draftId) {
      try {
        await _attachToDraftOnServer(draftId, videoUrl);
        console.log(`[render-video] Draft ${draftId} updated with video`);
      } catch (attachErr: any) {
        // Non-fatal — video is still uploaded, just log the error
        console.error("[render-video] Draft attachment failed (non-fatal):", attachErr.message);
      }
    }

    // ── 12) Mark job done ─────────────────────────────────────────────────────
    _update({ status: "done", url: videoUrl, meta });

  } catch (err: any) {
    console.error("[render-video] Fatal:", err);
    _update({ status: "failed", error: err?.message || "Render failed" });
  } finally {
    for (const f of tempFiles) {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
    }
  }
}