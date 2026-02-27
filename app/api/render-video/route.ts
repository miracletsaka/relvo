import { NextRequest, NextResponse } from "next/server";
import path from "path";
import os from "os";
import fs from "fs";
import { uploadFileToSpaces } from "@/lib/video-upload-client";
import { fetchBestPexelsVideo } from "@/lib/pexels";
import { fetchBestUnsplashImage } from "@/lib/unsplash";
import { generateVoiceoverScript } from "@/lib/generate-voiceover-script";
import { generateVeo3Video } from "@/lib/veo3";
import { generateVoiceover, type VoiceId } from "@/lib/elevenlabs";
import { downloadBackgroundMusic, detectMusicMood } from "@/lib/background-music";
import { mixAudioTracks } from "@/lib/mix-audio";
import { getPremiumComponent, type PremiumComponentKey } from "@/lib/template-components";
import { resolveTemplateImages } from "@/lib/resolve-template-images";
import type { MultiSceneVideoProps } from "@/remotion/compositions/MultiSceneVideo";
import type { CampaignData } from "@/lib/types";

export const runtime     = "nodejs";
export const maxDuration = 300;

// ── Template sequences per scene position ────────────────────────────────
const TEMPLATE_SEQUENCES: Record<string, PremiumComponentKey[]> = {
  opening: ["boldStatement", "lifestyleHero",     "fullBleedHero",   "hero"        ],
  middle:  ["splitColor",    "splitPhotoContent", "comparison",      "cdStatsShowcase"],
  closing: ["offer",         "flashSale",         "cdBrandVs",         "saasAd"      ],
};

function pickTemplate(
  position: "opening" | "middle" | "closing",
  index: number
): PremiumComponentKey {
  const options = TEMPLATE_SEQUENCES[position];
  return options[index % options.length];
}

export async function POST(req: NextRequest) {
  const tempFiles: string[] = [];

  try {
    const body = await req.json();
    const {
      body_text,
      companyName,
      accentColor,
      useVeo3  = true,
      voiceId  = "rachel" as VoiceId,
    } = body;

    // ── 1. Generate voiceover script with Gemini ──────────────────────
    console.log("[render-video] Generating script...");
    const script = await generateVoiceoverScript(
      body_text || body.hook || "",
      companyName || body.brand_name,
      accentColor
    );
    console.log(`[render-video] ${script.segments.length} segments — ${script.totalDurationSeconds}s`);
    console.log(`[render-video] Narration: "${script.fullNarration.slice(0, 80)}..."`);

    // ── 2. Build campaign data ────────────────────────────────────────
    const campaignData: CampaignData = {
      hook:        body.hook        || script.segments[0]?.screenText  || "",
      subheading:  body.subheading  || script.segments[1]?.screenText  || "",
      cta:         body.cta         || script.segments[script.segments.length - 1]?.ctaText || "",
      companyName: script.companyName,
      proof:       body.proof       || "",
      bullets:     body.bullets     || [],
      hashtags:    body.hashtags    || "",
      location:    body.location    || "",
      ctaLink:     body.ctaLink     || "",
    };

    // ── 3. Run voice + music + template shapes in parallel ────────────
    console.log("[render-video] Generating voice, music, templates in parallel...");

    const musicMood = detectMusicMood(body_text || "", script.veo3StyleHint);

    const [voiceResult, musicPath, sceneShapes] = await Promise.all([

      // 11Labs voiceover
      generateVoiceover(script.fullNarration, voiceId),

      // Background music
      downloadBackgroundMusic(musicMood),

      // Template shapes — different template per scene
      Promise.all(
        script.segments.map(async (segment, i) => {
          const templateKey = pickTemplate(segment.position, i);
          console.log(`[render-video] Scene ${i + 1} template: ${templateKey}`);
          const shapes   = getPremiumComponent(templateKey, 1080, 1350);
          const resolved = await resolveTemplateImages(shapes, campaignData);
          return resolved;
        })
      ),
    ]);

    // ── 4. Mix audio + upload to Spaces (Remotion needs HTTPS URL) ────
    let audioUrl: string | null = null;

    if (voiceResult.audioBuffer) {
      // Save voice to temp file
      const voicePath = path.join(os.tmpdir(), `voice-${Date.now()}.mp3`);
      fs.writeFileSync(voicePath, voiceResult.audioBuffer);
      tempFiles.push(voicePath);
      console.log("[render-video] ✅ Voiceover generated");

      let finalAudioPath = voicePath;

      // Mix with background music if available
      if (musicPath) {
        tempFiles.push(musicPath);
        const mixedPath = path.join(os.tmpdir(), `mixed-${Date.now()}.mp3`);
        await mixAudioTracks(voicePath, musicPath, mixedPath);
        tempFiles.push(mixedPath);
        finalAudioPath = mixedPath;
        console.log("[render-video] ✅ Voice + music mixed");
      } else {
        console.log("[render-video] ⚠️ No music — voice only");
      }

      // Upload to Spaces — Remotion cannot read file:// paths
      console.log("[render-video] Uploading audio to Spaces...");
      const audioBuffer = fs.readFileSync(finalAudioPath);
      const audioFile   = new File(
        [audioBuffer],
        `audio-${Date.now()}.mp3`,
        { type: "audio/mpeg" }
      );
      audioUrl = await uploadFileToSpaces(audioFile);
      console.log("[render-video] ✅ Audio URL:", audioUrl);

    } else if (musicPath) {
      // No voice but music available — upload music only
      tempFiles.push(musicPath);
      console.log("[render-video] ⚠️ No voiceover — uploading music only");
      const musicBuffer = fs.readFileSync(musicPath);
      const musicFile   = new File(
        [musicBuffer],
        `music-${Date.now()}.mp3`,
        { type: "audio/mpeg" }
      );
      audioUrl = await uploadFileToSpaces(musicFile);
      console.log("[render-video] 🎵 Music URL:", audioUrl);

    } else {
      console.log("[render-video] ⚠️ No audio — video will be silent");
    }

    // ── 5. Fetch video asset per scene ────────────────────────────────
    const sceneAssets: {
      videoUrl: string | null;
      imageUrl: string | null;
      source:   string;
    }[] = [];

    for (let i = 0; i < script.segments.length; i++) {
      const segment = script.segments[i];
      let videoUrl: string | null = null;
      let imageUrl: string | null = null;
      let source = "image";

      console.log(`\n[render-video] ── Scene ${i + 1}/${script.segments.length}: ${segment.position} ──`);
      console.log(`[render-video] Visual: "${segment.visualDescription.slice(0, 60)}..."`);

      // Try Veo3 first
      if (useVeo3) {
        const result = await generateVeo3Video(
          segment.visualDescription,
          Math.min(8, Math.max(4, segment.durationSeconds)) as 4 | 5 | 6 | 7 | 8,
          "9:16",
          script.veo3StyleHint
        );
        if (result.videoUrl) {
          videoUrl = result.videoUrl;
          source   = "veo3";
          console.log(`[render-video] Scene ${i + 1} ✅ Veo3 (${result.modelUsed})`);
        } else {
          console.log(`[render-video] Scene ${i + 1} Veo3 skipped: ${result.error}`);
        }
      }

      // Fallback: Pexels video
      if (!videoUrl) {
        videoUrl = await fetchBestPexelsVideo([
          segment.pexelsQuery,
          `${script.companyName} ${segment.position}`,
          "business professional cinematic",
        ]);
        if (videoUrl) {
          source = "pexels";
          console.log(`[render-video] Scene ${i + 1} 📹 Pexels`);
        }
      }

      // Final fallback: Unsplash image
      if (!videoUrl) {
        imageUrl = await fetchBestUnsplashImage(
          [segment.pexelsQuery, script.companyName],
          "portrait"
        );
        source = "image";
        console.log(`[render-video] Scene ${i + 1} 🖼 Unsplash`);
      }

      sceneAssets.push({ videoUrl, imageUrl, source });
    }

    // ── 6. Summary ────────────────────────────────────────────────────
    console.log("\n[render-video] Asset summary:");
    sceneAssets.forEach((a, i) =>
      console.log(`  Scene ${i + 1}: ${a.source} + ${sceneShapes[i]?.length ?? 0} template shapes`)
    );
    console.log(`  Audio: ${audioUrl ? (voiceResult.audioBuffer ? (musicPath ? "voice + music" : "voice only") : "music only") : "none"}`);

    // ── 7. Build Remotion input props ─────────────────────────────────
    const totalFrames = script.segments.reduce(
      (sum, s) => sum + s.durationSeconds * 30,
      0
    );

    const inputProps: MultiSceneVideoProps = {
      segments:     script.segments,
      sceneVideos:  sceneAssets.map((a) => a.videoUrl),
      sceneImages:  sceneAssets.map((a) => a.imageUrl),
      sceneShapes,
      campaignData: campaignData as any,
      accentColor:  script.accentColor,
      companyName:  script.companyName,
      audioPath:    audioUrl || undefined,  // HTTPS URL — Remotion compatible
    };

    // ── 8. Bundle Remotion ────────────────────────────────────────────
    console.log("\n[render-video] Bundling Remotion...");
    const { bundle } = await import("@remotion/bundler");
    const { renderMedia, selectComposition } =
      await import("@remotion/renderer");

    const bundleLocation = await bundle({
      entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
      webpackOverride: (config) => config,
    });

    // ── 9. Select composition + override duration ─────────────────────
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id:       "MultiSceneVideo",
      inputProps,
    });

    composition.durationInFrames = totalFrames;

    // ── 10. Render ────────────────────────────────────────────────────
    const outputPath = path.join(os.tmpdir(), `ad-video-${Date.now()}.mp4`);
    tempFiles.push(outputPath);

    console.log(`[render-video] Rendering ${totalFrames} frames (${totalFrames / 30}s)...`);

    await renderMedia({
      composition,
      serveUrl:       bundleLocation,
      codec:          "h264",
      outputLocation: outputPath,
      inputProps,
    });

    // ── 11. Upload final video to Spaces ──────────────────────────────
    console.log("[render-video] Uploading video to Spaces...");
    const videoBuffer = fs.readFileSync(outputPath);
    const videoFile   = new File(
      [videoBuffer],
      `ad-video-${Date.now()}.mp4`,
      { type: "video/mp4" }
    );
    const finalVideoUrl = await uploadFileToSpaces(videoFile);

    console.log("[render-video] ✅ Complete:", finalVideoUrl);

    // ── 12. Return ────────────────────────────────────────────────────
    return NextResponse.json({
      ok:  true,
      url: finalVideoUrl,
      meta: {
        segments:      script.segments.length,
        totalSeconds:  script.totalDurationSeconds,
        companyName:   script.companyName,
        fullNarration: script.fullNarration,
        hasVoice:      !!voiceResult.audioBuffer,
        hasMusic:      !!musicPath,
        musicMood,
        audioUrl,
        sources:   sceneAssets.map((a) => a.source),
        templates: script.segments.map((s, i) => pickTemplate(s.position, i)),
      },
    });

  } catch (err: any) {
    console.error("[render-video] Fatal:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Render failed" },
      { status: 500 }
    );

  } finally {
    // ── Cleanup all temp files ────────────────────────────────────
    for (const f of tempFiles) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch { /* ignore */ }
    }
  }
}