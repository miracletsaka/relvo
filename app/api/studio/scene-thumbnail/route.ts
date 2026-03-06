import { NextRequest, NextResponse } from "next/server";
import path from "path";
import os from "os";
import fs from "fs";

import { fetchBestUnsplashImage } from "@/lib/unsplash";
import { getPremiumComponent, type PremiumComponentKey } from "@/lib/template-components";
import { resolveTemplateImages } from "@/lib/resolve-template-images";
import type { MultiSceneVideoProps } from "@/remotion/compositions/MultiSceneVideo";

export const runtime = "nodejs";
export const maxDuration = 60;

// Bundle cache: built once per process
let _bundleCache: string | null = null;
async function getBundleLocation(): Promise<string> {
  if (_bundleCache) return _bundleCache;
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
        if (!src || src.startsWith("blob:") || src.startsWith("nodedata:") || src.startsWith("data:"))
          return { ...s, src: null };
      }
      return s;
    })
    .filter((s) => !(s.type === "image" && !s.src));
}

function safeNum(v: any, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sceneIndex = Number(body.sceneIndex);
    const preGeneratedScript = body.preGeneratedScript;

    if (!preGeneratedScript?.segments?.length) {
      return NextResponse.json({ ok: false, error: "Missing preGeneratedScript.segments" }, { status: 400 });
    }
    const segments = preGeneratedScript.segments as any[];
    if (!Number.isFinite(sceneIndex) || sceneIndex < 0 || sceneIndex >= segments.length) {
      return NextResponse.json({ ok: false, error: "Invalid sceneIndex" }, { status: 400 });
    }

    const companyName: string = body.companyName || preGeneratedScript.companyName || "Brand";
    const accentColor: string = body.accentColor || preGeneratedScript.accentColor || "#7c3aed";

    // Optional clip url (used only for webcam visuals)
    const clips: any[] = Array.isArray(body.webcamClips) ? body.webcamClips : [];
    const clip = clips.find((c) => Number(c.segmentIndex) === sceneIndex);
    const clipUrl: string | null = clip?.url || null;
    const clipIsWebcam: boolean = clip?.isWebcam === true;

    let sceneVideoUrl: string | null = null;
    let sceneImageUrl: string | null = null;

    const seg = segments[sceneIndex];
    const preferWebcam = !!seg?.preferWebcam;

    if (preferWebcam && clipUrl && clipIsWebcam) {
      sceneVideoUrl = clipUrl;
    } else {
      try {
        const q1 = seg?.pexelsQuery || seg?.screenText || "";
        sceneImageUrl = await fetchBestUnsplashImage([q1, companyName], "portrait");
      } catch {
        sceneImageUrl = null;
      }
    }

    const campaignData = body.campaignData || {
      hook: body.hook || segments[0]?.screenText || "",
      subheading: body.subheading || segments[1]?.screenText || "",
      cta: body.cta || segments[segments.length - 1]?.ctaText || "",
      companyName,
      proof: body.proof || "",
      bullets: body.bullets || [],
      hashtags: body.hashtags || "",
      location: body.location || "",
      ctaLink: body.ctaLink || "",
    };

    let shapesForScene: any[] = [];
    try {
      const shapes = getPremiumComponent(pickTemplate(seg.position, sceneIndex), 1080, 1350);
      shapesForScene = sanitizeShapes(await resolveTemplateImages(shapes, campaignData));
    } catch {
      shapesForScene = [];
    }

    const n = segments.length;
    const sceneVideos = new Array(n).fill(null) as (string | null)[];
    const sceneImages = new Array(n).fill(null) as (string | null)[];
    const sceneShapes = new Array(n).fill(null).map(() => []) as any[][];
    const sceneIsWebcam = segments.map((s) => !!s?.preferWebcam);
    const sceneDurations = segments.map((s) => safeNum(s?.durationSeconds, 6));
    const sceneAudioUrls = new Array(n).fill(null) as (string | null)[];
    const brollAudioUrls = new Array(n).fill(null) as (string | null)[];
    const sceneSpeechMarkers = new Array(n).fill(null).map(() => []) as any[][];

    sceneVideos[sceneIndex] = sceneVideoUrl;
    sceneImages[sceneIndex] = sceneImageUrl;
    sceneShapes[sceneIndex] = shapesForScene;

    const inputProps: MultiSceneVideoProps = {
      segments: segments as any,
      sceneVideos,
      sceneImages,
      sceneShapes,
      sceneIsWebcam,
      sceneDurations,
      userRecordedVoice: false,
      campaignData: campaignData as any,
      accentColor,
      companyName,
      styleDNA: preGeneratedScript.styleDNA,
      voiceUrl: undefined,
      musicUrl: undefined,
      sceneAudioUrls,
      brollAudioUrls,
      sceneSpeechMarkers,
    };

    let startFrame = 0;
    for (let i = 0; i < sceneIndex; i++) startFrame += Math.round(sceneDurations[i] * 30);
    const thisFrames = Math.max(1, Math.round(sceneDurations[sceneIndex] * 30));
    const frame = startFrame + Math.floor(thisFrames * 0.45);

    const { renderStill, selectComposition } = await import("@remotion/renderer");
    const bundleLocation = await getBundleLocation();

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "MultiSceneVideo",
      inputProps,
    });

    const tmpPath = path.join(os.tmpdir(), `thumb-${Date.now()}-${sceneIndex}.png`);
    await renderStill({
      composition,
      serveUrl: bundleLocation,
      inputProps,
      frame,
      imageFormat: "png",
      output: tmpPath,
      scale: 0.35,
    });

    const buf = fs.readFileSync(tmpPath);
    try { fs.unlinkSync(tmpPath); } catch {}

    return NextResponse.json({ ok: true, dataUrl: `data:image/png;base64,${buf.toString("base64")}` });

  } catch (err: any) {
    console.error("[scene-thumbnail] Fatal:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Thumbnail failed" }, { status: 500 });
  }
}
