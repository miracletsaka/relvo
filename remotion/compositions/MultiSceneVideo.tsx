/**
 * MultiSceneVideo.tsx
 * remotion/compositions/MultiSceneVideo.tsx
 *
 * v3 — Mind-blowing transitions + fully mixed voice routing.
 *
 * TRANSITIONS (6 types, cycling by scene index):
 *   0 → LightSweep    — white energy streak left→right
 *   1 → GlitchSlice   — RGB split + horizontal slices
 *   2 → ZoomBlur      — punch-in zoom from 128% + blur dissolve (wrapper)
 *   3 → ColorBurn     — brand accent radial flare from center
 *   4 → WipeReveal    — diagonal blade wipe with accent edge
 *   5 → ParticleFlash — stutter flash + particle burst
 *
 * VOICE ROUTING (fully mixed):
 *   - Webcam scene     → sceneAudioUrl  (recorded clip audio, clip muted=false)
 *   - Non-webcam scene → brollAudioUrl  (ElevenLabs slice for that scene)
 *   - Pure AI video    → global voiceUrl (single continuous ElevenLabs track)
 *   - Global voiceUrl is NEVER played on webcam scenes — no double voice
 *
 * VIDEO:
 *   - All clips loop automatically if shorter than scene duration
 *   - Webcam clip audio enabled; background clips muted
 */

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  Video,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";

import { CinematicTextOverlay } from "./CinematicTextOverlay";
import { SceneTransition, ZoomBlurWrapper, TRANSITION_FRAMES } from "./SceneTransitions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SceneSegment {
  screenText?:       string;
  narration?:        string;
  position?:         "opening" | "middle" | "closing";
  durationSeconds?:  number;
  sceneEnergy?:      "low" | "medium" | "high";
  ctaText?:          string;
  [key: string]:     any;
}

interface UploadedOverlay {
  id:            string;
  type:          "video" | "image";
  url:           string;
  startSeconds?: number;
  endSeconds?:   number;
  x:             number;
  y:             number;
  w:             number;
  h:             number;
  radius?:       number;
}

export interface MultiSceneVideoProps {
  segments:             SceneSegment[];
  sceneVideos:          (string | null)[];
  sceneImages:          (string | null)[];
  sceneDurations:       number[];
  sceneIsWebcam?:       boolean[];

  // Voice routing:
  // voiceUrl      = global AI track (ONLY when zero webcam scenes)
  // sceneAudioUrls= per-scene webcam recorded audio
  // brollAudioUrls= per-scene AI narration slice (mixed mode non-webcam scenes)
  voiceUrl?:            string;
  musicUrl?:            string;
  musicVolume?:         number;    // default 0.15; 0.55 when voice disabled
  sceneAudioUrls?:      (string | null)[];
  brollAudioUrls?:      (string | null)[];
  userRecordedVoice?:   boolean;

  // Backward-compat — ignored (CinematicTextOverlay handles text)
  sceneShapes?:         any[][];
  sceneSpeechMarkers?:  any[][];
  captionsMode?:        "off" | "kinetic";

  accentColor?:         string;
  companyName?:         string;
  styleDNA?:            Record<string, any>;
  campaignData?:        Record<string, any>;

  uploadedOverlaysByScene?: Record<number, UploadedOverlay[]>;
  uploadedSceneMedia?:      Array<{ index: number; url: string; type: "video" | "image" }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function asFiniteSeconds(v: any, fallback = 6): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ── Music track with ducking ──────────────────────────────────────────────────
function MusicTrack({ url, totalFrames, fullVol = 0.15, duckedVol = 0.04 }: {
  url: string; totalFrames: number; fullVol?: number; duckedVol?: number
}) {
  const frame = useCurrentFrame();
  const volume = interpolate(
    frame,
    [0, 15, totalFrames - 15, totalFrames],
    [fullVol, duckedVol, duckedVol, fullVol],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return <Audio src={url} volume={volume} />;
}

// ── Global voice track ────────────────────────────────────────────────────────
// voiceUrl is ONLY set in pure-AI mode (zero webcam scenes).
// In mixed mode, AI audio is in brollAudioUrls per scene instead.
// So this always plays at full volume — no muting logic needed.
function GlobalVoiceTrack({ url }: { url: string }) {
  return <Audio src={url} volume={1} />;
}

// ── Scene component ───────────────────────────────────────────────────────────

interface SceneProps {
  segment:        SceneSegment;
  sceneIndex:     number;
  videoUrl:       string | null;
  imageUrl:       string | null;
  durationFrames: number;
  accentColor:    string;
  isWebcam:       boolean;
  overlays?:      UploadedOverlay[];
  sceneAudioUrl?: string | null;
  brollAudioUrl?: string | null;
}

const SceneInner: React.FC<SceneProps> = ({
  segment,
  sceneIndex,
  videoUrl,
  imageUrl,
  durationFrames,
  accentColor,
  isWebcam,
  overlays,
  sceneAudioUrl,
  brollAudioUrl,
}) => {
  const screenText   = segment.screenText?.trim() ?? "";
  const useZoomBlur  = sceneIndex % 6 === 2; // ZoomBlur is a wrapper, applied here

  const content = (
    <AbsoluteFill style={{ backgroundColor: "#0c0c0f", overflow: "hidden" }}>

      {/* ── Background video ──────────────────────────────────────────── */}
      {/* Webcam clips: muted=false → embedded audio plays naturally       */}
      {/* B-roll/asset clips: muted=true → AI voice from brollAudioUrl     */}
      {videoUrl && (
        <Video
          src={videoUrl}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          loop={!isWebcam}
          muted={!isWebcam}
          volume={isWebcam ? 1 : 0}
        />
      )}

      {/* ── Background image fallback ──────────────────────────────────── */}
      {!videoUrl && imageUrl && (
        <Img
          src={imageUrl}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}

      {/* ── Gradient scrim — bottom-heavy, improves text legibility ───── */}
      <div style={{
        position:      "absolute",
        inset:         0,
        background:    "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.6) 100%)",
        pointerEvents: "none",
      }} />

      {/* Webcam audio is embedded in the video clip — no separate Audio tag needed */}

      {/* ── AI voice slice for this non-webcam scene ───────────────────── */}
      {/* AI voice for this scene — plain URL, plays from frame 0 of this Sequence */}
      {brollAudioUrl && <Audio src={brollAudioUrl} volume={1} />}

      {/* ── Uploaded overlays ──────────────────────────────────────────── */}
      {overlays?.map((o) => {
        const sf = Math.round((o.startSeconds ?? 0) * 30);
        const ef = Math.round((o.endSeconds   ?? durationFrames / 30) * 30);
        return (
          <Sequence key={o.id} from={sf} durationInFrames={ef - sf}>
            {o.type === "video" ? (
              <Video src={o.url} style={{
                position: "absolute", left: `${o.x}%`, top: `${o.y}%`,
                width: `${o.w}%`, height: `${o.h}%`,
                borderRadius: o.radius ? `${o.radius}%` : undefined, objectFit: "cover",
              }} />
            ) : (
              <Img src={o.url} style={{
                position: "absolute", left: `${o.x}%`, top: `${o.y}%`,
                width: `${o.w}%`, height: `${o.h}%`,
                borderRadius: o.radius ? `${o.radius}%` : undefined, objectFit: "contain",
              }} />
            )}
          </Sequence>
        );
      })}

      {/* ── Cinematic text (only text layer — no template shapes) ─────── */}
      {screenText && (
        <CinematicTextOverlay
          text={screenText}
          durationInFrames={durationFrames}
          accentColor={accentColor}
          position="bottom"
        />
      )}

      {/* ── Scene transition effect (entrance) ────────────────────────── */}
      <SceneTransition
        index={sceneIndex}
        durationInFrames={durationFrames}
        accentColor={accentColor}
      />

    </AbsoluteFill>
  );

  // ZoomBlur wraps the whole scene content with a zoom+blur spring entrance
  return useZoomBlur ? <ZoomBlurWrapper>{content}</ZoomBlurWrapper> : content;
};

// ── Main composition ──────────────────────────────────────────────────────────

export const MultiSceneVideo: React.FC<MultiSceneVideoProps> = ({
  segments,
  sceneVideos,
  sceneImages,
  sceneDurations,
  sceneIsWebcam     = [],
  voiceUrl,
  musicUrl,
  musicVolume       = 0.15,
  sceneAudioUrls    = [],
  brollAudioUrls    = [],
  accentColor       = "#7c3aed",
  uploadedOverlaysByScene = {},
  sceneShapes:         _s,
  sceneSpeechMarkers:  _m,
  captionsMode:        _c,
}) => {
  const { fps } = useVideoConfig();

  const startFrames: number[] = [];
  let cumulative = 0;
  for (const d of sceneDurations) {
    startFrames.push(cumulative);
    cumulative += Math.round(asFiniteSeconds(d, 6) * fps);
  }
  const totalFrames = Math.max(1, cumulative);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0c0f" }}>

      {/* voiceUrl intentionally unused — each AI scene has its own audio via brollAudioUrls */}

      {/* ── Background music with ducking ─────────────────────────────── */}
      {musicUrl && <MusicTrack url={musicUrl} totalFrames={totalFrames} fullVol={musicVolume} duckedVol={musicVolume > 0.3 ? musicVolume * 0.4 : 0.04} />}

      {/* ── Scenes ────────────────────────────────────────────────────── */}
      {segments.map((seg, i) => {
        const dur    = asFiniteSeconds(sceneDurations[i] ?? 6, 6);
        const frames = Math.round(dur * fps);

        return (
          <Sequence key={i} from={startFrames[i]} durationInFrames={frames}>
            <SceneInner
              segment={seg}
              sceneIndex={i}
              videoUrl={sceneVideos[i] ?? null}
              imageUrl={sceneImages[i] ?? null}
              durationFrames={frames}
              accentColor={accentColor}
              isWebcam={sceneIsWebcam[i] ?? false}
              overlays={uploadedOverlaysByScene[i]}
              sceneAudioUrl={sceneAudioUrls[i]}
              brollAudioUrl={brollAudioUrls[i]}
            />
          </Sequence>
        );
      })}

    </AbsoluteFill>
  );
};