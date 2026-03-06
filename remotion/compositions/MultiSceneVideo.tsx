import React from "react";
import {
  AbsoluteFill, Audio, Easing, Img, interpolate,
  OffthreadVideo, Sequence, Series,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import OverlayMediaLayer from "./OverlayMediaLayer";
import type { VoiceSegment } from "@/lib/generate-voiceover-script";
import type { StyleDNA } from "@/lib/generate-voiceover-script";
import type { TemplateShape } from "@/lib/types";
import { AnimatedTemplate } from "./AnimatedTemplate";
import { SpeechMarkerLayer, type SpeechMarker } from "./SpeechMarker";
import { BeatOverlay } from "./BeatOverlay";
import CaptionLayer from "./CaptionLayer";
// DemoOverlayCard and LowerThirdBadge available for future use

// ── Props — must stay in sync with route.ts inputProps ───────────────────────
export interface MultiSceneVideoProps {
  segments:            VoiceSegment[];
  sceneVideos:         (string | null)[];
  sceneImages:         (string | null)[];
  sceneShapes:         TemplateShape[][];
  sceneIsWebcam:       boolean[];
  sceneDurations:      number[];
  userRecordedVoice:   boolean;
  campaignData:        Record<string, any>;
  accentColor:         string;
  companyName:         string;
  styleDNA?:           StyleDNA;
  musicUrl?:           string;
  voiceUrl?:           string;
  sceneAudioUrls:      (string | null)[];   // webcam clip audio per-scene (CASE A)
  brollAudioUrls:      (string | null)[];   // b-roll recorded audio per-scene (CASE A)
  sceneSpeechMarkers?: SpeechMarker[][];    // word-sync keyword chips
  captionsMode?:       "off" | "kinetic";   // global captions mode (default: "off")
  audioPath?:          string;              // legacy fallback
  uploadedSceneMedia?: Array<{ index: number; url: string; type: "video" | "image" }>;
  sceneCampaignData?:  Record<string, any>[];
  uploadedOverlaysByScene?: Record<number, Array<{
    id: string;
    type: "video" | "image";
    url: string;
    startSeconds: number;
    endSeconds: number;
    x: number;
    y: number;
    w: number;
    h: number;
    radius?: number;
  }>>;
}

// ── B-roll audio may be plain URL or JSON slice { url, startFrom, endAt } ────
function parseBrollAudio(raw: string): { url: string; startFrom?: number; endAt?: number } {
  if (raw.startsWith("{")) {
    try { return JSON.parse(raw); } catch {}
  }
  return { url: raw };
}

// ── Animation helpers ─────────────────────────────────────────────────────────
type AnimVariant = "slideUp" | "slideLeft" | "zoomIn" | "fadeScale";

function resolveAnimVariant(segment: VoiceSegment, styleDNA?: StyleDNA): AnimVariant {
  if (styleDNA?.textAnimStyle === "slide-left")  return "slideLeft";
  if (styleDNA?.textAnimStyle === "zoom-in")     return "zoomIn";
  if (styleDNA?.textAnimStyle === "typewriter")  return "slideUp";
  if (segment.animationStyle  === "energetic")   return "zoomIn";
  if (segment.animationStyle  === "calm")        return "fadeScale";
  if (segment.animationStyle  === "dramatic")    return "slideLeft";
  return "slideUp";
}

function useTextAnim(frame: number, dur: number, variant: AnimVariant, delay = 9, amp = 1.0) {
  const tf      = frame - delay;
  const opacity = interpolate(tf, [0, 14, dur - 14, dur - 4], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  let transform = "";
  if (variant === "slideUp")   transform = `translateY(${interpolate(tf,[0,14],[36*amp,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp",easing:Easing.out(Easing.cubic)})}px)`;
  if (variant === "slideLeft") transform = `translateX(${interpolate(tf,[0,14],[48*amp,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp",easing:Easing.out(Easing.cubic)})}px)`;
  if (variant === "zoomIn")    transform = `scale(${interpolate(tf,[0,14],[1-0.22*amp,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp",easing:Easing.out(Easing.back(1.3))})})`;
  if (variant === "fadeScale") transform = `scale(${interpolate(tf,[0,14],[1+0.1*amp,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp",easing:Easing.out(Easing.quad)})})`;
  return { opacity, transform };
}

// ── AdScene ───────────────────────────────────────────────────────────────────
// Clean layering — nothing overlaps:
//   Layer 0: background video/image/gradient
//   Layer 1: dark tint
//   Layer 2: overlay media (PIP)
//   Layer 3: scene text — ONE block only, positioned by scene type
//   Layer 4: brand badge (top-left, small)
//   Layer 5: CTA button (closing scenes only, centered)
//   Layer 6: speech marker chips (non-intrusive, sides only)
function AdScene({
  segment,
  sceneIndex,
  videoUrl,
  imageUrl,
  shapes,
  campaignData,
  sceneCampaignDataItem, // add back
  accentColor,
  companyName,
  isWebcam,
  styleDNA,
  speechMarkers,
  captionsMode,
  overlays,
  uploadedSceneMedia,
}: {
  segment: VoiceSegment;
  sceneIndex: number;
  videoUrl: string | null;
  imageUrl: string | null;
  shapes: TemplateShape[];
  sceneCampaignDataItem?: Record<string, any>; // add back
  campaignData: Record<string, any>;
  accentColor: string;
  companyName: string;
  isWebcam: boolean;
  styleDNA?: StyleDNA;
  speechMarkers: SpeechMarker[];
  captionsMode?: "off" | "kinetic";
  overlays?: Array<{
    id: string;
    type: "video" | "image";
    url: string;
    startSeconds: number;
    endSeconds: number;
    x: number;
    y: number;
    w: number;
    h: number;
    radius?: number;
  }>;
  uploadedSceneMedia?: Array<{
    index: number;
    url: string;
    type: "video" | "image";
  }>; // added back
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const safeDuration =
    Number.isFinite(durationInFrames) && durationInFrames > 0
      ? durationInFrames
      : 150;

  const sceneEnergy = safeNum((segment as any).sceneEnergy, 0.6);
  const overlayInt = safeNum((styleDNA as any)?.overlayIntensity, 0.45);
  const motionInt = safeNum((styleDNA as any)?.motionIntensity, 0.75);

  const font = styleDNA?.primaryFont || "Oswald";
  const fontWeight = styleDNA?.fontWeight || 900;
  const letterSpacing = styleDNA?.letterSpacing ?? -2;
  const textTransform = styleDNA?.textTransform || "uppercase";
  const bgTint = styleDNA?.bgTint || "rgba(0,0,0,0.45)";
  const overlayOp = overlayInt;
  const motionAmp = motionInt * sceneEnergy;
  const animVariant = resolveAnimVariant(segment, styleDNA);

  const sceneOp = Math.min(
    interpolate(frame, [0, 10], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(frame, [safeDuration - 10, safeDuration], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const bgScale = interpolate(frame, [0, safeDuration], [1, 1 + 0.07 * sceneEnergy], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const mainAnim = useTextAnim(frame, safeDuration, animVariant, 9, motionAmp);

  const ctaStart = Math.max(0, safeDuration - 42);

  const ctaOp = interpolate(frame - ctaStart, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ctaScale = interpolate(frame - ctaStart, [0, 16], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.3)),
  });

  const barP = interpolate(frame, [9, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const brandOp = interpolate(frame, [6, 22], [0, 0.92], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const textStyle: React.CSSProperties = {
    fontFamily: `"${font}", Impact, "Arial Black", sans-serif`,
    fontWeight,
    letterSpacing: `${letterSpacing}px`,
    textTransform: textTransform as any,
  };

  // added back from old version
  const uploadedMedia = uploadedSceneMedia?.find((m) => m.index === sceneIndex);
  const resolvedVideoUrl = uploadedMedia
    ? uploadedMedia.type === "video"
      ? uploadedMedia.url
      : null
    : videoUrl;
  const resolvedImageUrl = uploadedMedia
    ? uploadedMedia.type === "image"
      ? uploadedMedia.url
      : null
    : imageUrl;

  const showCTA = !!segment.showCTA && !!segment.ctaText;
  const mainBottom = showCTA ? (isWebcam ? 300 : 250) : isWebcam ? 120 : 140;

  return (
    <AbsoluteFill style={{ opacity: sceneOp }}>
      {/* Background */}
      {resolvedVideoUrl ? (
        <OffthreadVideo
          src={resolvedVideoUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          volume={0}
        />
      ) : resolvedImageUrl ? (
        <Img
          src={resolvedImageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${bgScale})`,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)",
          }}
        />
      )}

      {/* Atmospheric tint */}
      <AbsoluteFill style={{ backgroundColor: bgTint, opacity: overlayOp }} />

      {isWebcam ? (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at center,transparent 45%,rgba(0,0,0,.42) 100%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 340,
              background: "linear-gradient(to top,rgba(0,0,0,.85) 0%,transparent 100%)",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 52,
              left: 52,
              opacity: brandOp,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: accentColor,
                boxShadow: `0 0 10px ${accentColor}`,
              }}
            />
            <span
              style={{
                ...textStyle,
                fontSize: 20,
                color: "rgba(255,255,255,.92)",
                letterSpacing: "4px",
              }}
            >
              {companyName.toUpperCase()}
            </span>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: mainBottom,
              left: 60,
              right: 60,
              ...mainAnim,
              ...textStyle,
              fontSize: 54,
              color: "#fff",
              textAlign: "center",
              lineHeight: 1.08,
              textShadow: "0 4px 24px rgba(0,0,0,.92)",
              zIndex: 50,
            }}
          >
            {segment.screenText}
          </div>

          <div
            style={{
              position: "absolute",
              bottom: mainBottom - 30,
              left: "50%",
              transform: "translateX(-50%)",
              width: `${barP * 120}px`,
              height: 4,
              backgroundColor: accentColor,
              borderRadius: 999,
              boxShadow: `0 0 20px ${accentColor}60`,
              zIndex: 45,
            }}
          />

          {showCTA && (
            <div
              style={{
                position: "absolute",
                bottom: 120,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                opacity: ctaOp,
                transform: `scale(${ctaScale})`,
                zIndex: 100,
              }}
            >
              <div
                style={{
                  backgroundColor: accentColor,
                  borderRadius: 60,
                  padding: "22px 52px",
                  ...textStyle,
                  fontSize: 32,
                  color: "#fff",
                  boxShadow: `0 12px 40px rgba(0,0,0,.5),0 0 60px ${accentColor}40`,
                  whiteSpace: "nowrap",
                  maxWidth: "88%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {segment.ctaText}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <AbsoluteFill
            style={{
              backgroundColor: `rgba(0,0,0,${
                segment.position === "opening"
                  ? 0.22
                  : segment.position === "closing"
                  ? 0.48
                  : 0.35
              })`,
            }}
          />

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 520,
              background: "linear-gradient(to top,rgba(0,0,0,.88) 0%,transparent 100%)",
            }}
          />

          {shapes.length > 0 && (
            <AnimatedTemplate
              shapes={shapes}
              campaignData={campaignData}
              styleDNA={styleDNA}
              templateOpacity={interpolate(frame, [8, 26], [0, 0.9], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}
            />
          )}

          <div
            style={{
              position: "absolute",
              bottom: mainBottom - 34,
              left: 60,
              width: `${barP * 110}px`,
              height: 4,
              backgroundColor: accentColor,
              borderRadius: 2,
              boxShadow: `0 0 20px ${accentColor}60`,
              zIndex: 40,
            }}
          />

          {segment.screenText && (
            <div
              style={{
                position: "absolute",
                bottom: mainBottom,
                left: 60,
                right: 60,
                ...mainAnim,
                ...textStyle,
                fontSize: segment.position === "opening" ? 82 : 66,
                color: "#fff",
                textAlign: "center",
                lineHeight: 1.08,
                textShadow: "0 6px 32px rgba(0,0,0,.92)",
                zIndex: 50,
              }}
            >
              {segment.screenText}
            </div>
          )}

          {showCTA && (
            <div
              style={{
                position: "absolute",
                bottom: 120,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                opacity: ctaOp,
                transform: `scale(${ctaScale})`,
                zIndex: 100,
              }}
            >
              <div
                style={{
                  backgroundColor: accentColor,
                  borderRadius: 60,
                  padding: "24px 56px",
                  ...textStyle,
                  fontSize: 34,
                  color: "#fff",
                  boxShadow: `0 12px 40px rgba(0,0,0,.5),0 0 80px ${accentColor}50`,
                  whiteSpace: "nowrap",
                  maxWidth: "88%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {segment.ctaText}
              </div>
            </div>
          )}
        </>
      )}

      <OverlayMediaLayer overlays={overlays} />
      <BeatOverlay segment={segment as any} accentColor={accentColor} />

      {captionsMode === "kinetic" ? (
        <CaptionLayer
          mode="kinetic"
          markers={speechMarkers}
          accentColor={accentColor}
          styleDNA={styleDNA}
        />
      ) : null}

      <SpeechMarkerLayer
        markers={speechMarkers}
        styleDNA={styleDNA}
        accentColor={accentColor}
      />
    </AbsoluteFill>
  );
}

// ── Root composition ──────────────────────────────────────────────────────────
export const MultiSceneVideo: React.FC<MultiSceneVideoProps> = ({
  segments, sceneVideos, sceneImages, sceneShapes,
  sceneIsWebcam, sceneDurations, userRecordedVoice,
  campaignData, accentColor, companyName,
  styleDNA, musicUrl, voiceUrl,
  sceneAudioUrls, brollAudioUrls,
  sceneSpeechMarkers, audioPath,
  uploadedSceneMedia,
  uploadedOverlaysByScene,
  sceneCampaignData,
}) => {
  const fps = 30;

  // Cumulative start frames — used for <Sequence from> positioning
  const sceneStartFrames: number[] = [];
  let acc = 0;
  for (const d of (sceneDurations ?? [])) {
    sceneStartFrames.push(acc);
    acc += Math.round(d * fps);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {musicUrl && <Audio src={musicUrl} volume={0.12} />}

      {!userRecordedVoice && voiceUrl && (
        <Audio src={voiceUrl} volume={1} />
      )}

      {userRecordedVoice && (sceneAudioUrls ?? []).map((audioUrl, i) => {
        if (!audioUrl) return null;
        const startFrame     = sceneStartFrames[i] ?? 0;
        const durationFrames = Math.round((sceneDurations?.[i] ?? 6) * fps);
        return (
          <Sequence key={`wc-audio-${i}`} from={startFrame} durationInFrames={durationFrames}>
            <Audio src={audioUrl} volume={1} />
          </Sequence>
        );
      })}

      {userRecordedVoice && (brollAudioUrls ?? []).map((raw, i) => {
        if (!raw) return null;
        const startFrame     = sceneStartFrames[i] ?? 0;
        const durationFrames = Math.round((sceneDurations?.[i] ?? 6) * fps);
        const { url, startFrom, endAt } = parseBrollAudio(raw);
        return (
          <Sequence key={`broll-audio-${i}`} from={startFrame} durationInFrames={durationFrames}>
            <Audio
              src={url}
              volume={1}
              startFrom={startFrom}
              endAt={endAt}
            />
          </Sequence>
        );
      })}

      {/* Legacy audioPath fallback */}
      {!musicUrl && !voiceUrl && audioPath && <Audio src={audioPath} volume={1} />}

      {/* ── Video scenes ──────────────────────────────────────────────────── */}
      <Series>
        {segments.map((segment, i) => {
          const dSecs   = sceneDurations?.[i] ?? segment.durationSeconds;
          const dFrames = Math.max(1, Math.round(dSecs * fps));
          return (
            <Series.Sequence key={i} durationInFrames={dFrames}>
              <AdScene
                segment={segment}
                sceneIndex={i}
                overlays={uploadedOverlaysByScene?.[i]}
                uploadedSceneMedia={uploadedSceneMedia}
                videoUrl={sceneVideos[i] ?? null}
                imageUrl={sceneImages[i] ?? null}
                shapes={sceneShapes[i] ?? []}
                campaignData={sceneCampaignData?.[i] ?? campaignData}
                sceneCampaignDataItem={sceneCampaignData?.[i]}
                accentColor={accentColor}
                companyName={companyName}
                isWebcam={sceneIsWebcam[i] ?? false}
                styleDNA={styleDNA}
                speechMarkers={sceneSpeechMarkers?.[i] ?? []}
              />
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
function safeNum(value: any, defaultValue: number): number {
  if (typeof value === 'number' && isFinite(value)) {
    return value;
  }
  return defaultValue;
}
