import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Series,
  useCurrentFrame,
  useVideoConfig,
  Video,
  Audio,  
} from "remotion";
import type { VoiceSegment } from "@/lib/generate-voiceover-script";
import type { TemplateShape } from "@/lib/types";
import { AnimatedTemplate } from "./AnimatedTemplate";

export interface MultiSceneVideoProps {
  segments:     VoiceSegment[];
  sceneVideos:  (string | null)[];
  sceneImages:  (string | null)[];
  sceneShapes:  TemplateShape[][];
  campaignData: Record<string, any>;
  accentColor:  string;
  companyName:  string;
  audioPath?: string;  // ← NEW
}

function AdScene({
  segment,
  videoUrl,
  imageUrl,
  shapes,           // ← NOW shapes array, not PNG
  campaignData,
  accentColor,
  companyName,
}: {
  segment: VoiceSegment;
  videoUrl: string | null;
  imageUrl: string | null;
  shapes: TemplateShape[];
  campaignData: Record<string, any>;
  accentColor: string;
  companyName: string;
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fps = 30;

  const fadeIn  = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const sceneOpacity = Math.min(fadeIn, fadeOut);

  const bgScale = interpolate(frame, [0, durationInFrames], [1, 1.07], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Template fades in after bg settles
  const templateOpacity = interpolate(frame, [10, 28], [0, 0.92], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Narration subtitle
  const textDelay = Math.floor(fps * 0.4);
  const tf        = frame - textDelay;
  const subOpacity = interpolate(
    tf,
    [5, 20, durationInFrames - 15, durationInFrames - 5],
    [0, 0.8, 0.8, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // CTA pill
  const ctaStart   = durationInFrames - Math.floor(fps * 1.5);
  const ctaFrame   = frame - ctaStart;
  const ctaOpacity = interpolate(ctaFrame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const ctaScale = interpolate(ctaFrame, [0, 18], [0.8, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  const overlayStrength =
    segment.position === "opening" ? 0.3 :
    segment.position === "closing" ? 0.5 : 0.4;

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>

      {/* ── LAYER 1: VIDEO/IMAGE BACKGROUND ── */}
      {videoUrl ? (
        <Video
          src={videoUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          volume={0}
        />
      ) : imageUrl ? (
        <Img
          src={imageUrl}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            transform: `scale(${bgScale})`,
            transformOrigin: "center center",
          }}
        />
      ) : (
        <div style={{
          width: "100%", height: "100%",
          background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        }} />
      )}

      {/* ── LAYER 2: DARK OVERLAY ── */}
      <AbsoluteFill
        style={{ backgroundColor: `rgba(0,0,0,${overlayStrength})` }}
      />

      {/* ── LAYER 3: ANIMATED TEMPLATE SHAPES ── */}
      {shapes.length > 0 && (
        <AnimatedTemplate
          shapes={shapes}
          campaignData={campaignData}
          templateOpacity={templateOpacity}
        />
      )}

      {/* ── LAYER 4: BOTTOM GRADIENT for subtitle readability ── */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0, height: 400,
        background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)",
        // Only show if no template shapes covering the bottom
        opacity: shapes.length > 0 ? 0.5 : 1,
      }} />

      {/* ── LAYER 5: NARRATION SUBTITLE ── */}
      <div style={{
        position: "absolute",
        bottom: segment.showCTA ? 220 : 60,
        left: 80, right: 80,
        opacity: subOpacity,
        fontSize: 26,
        fontWeight: 500,
        color: "rgba(255,255,255,0.9)",
        textAlign: "center" as const,
        fontFamily: "Arial, sans-serif",
        lineHeight: 1.45,
        textShadow: "0 2px 16px rgba(0,0,0,1)",
        zIndex: 100,
      }}>
        {segment.narration}
      </div>

      {/* ── LAYER 6: CTA PILL (closing scene) ── */}
      {segment.showCTA && segment.ctaText && (
        <div style={{
          position: "absolute",
          bottom: 80,
          left: 0, right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: ctaOpacity,
          transform: `scale(${ctaScale})`,
          zIndex: 100,
        }}>
          <div style={{
            backgroundColor: accentColor,
            borderRadius: 60,
            paddingLeft: 70, paddingRight: 70,
            paddingTop: 30,  paddingBottom: 30,
            fontSize: 38,
            fontWeight: 900,
            color: "#ffffff",
            fontFamily: "Arial Black, Arial",
            boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 0 3px rgba(255,255,255,0.15)`,
            whiteSpace: "nowrap" as const,
          }}>
            {segment.ctaText}
          </div>
        </div>
      )}

    </AbsoluteFill>
  );
}

export const MultiSceneVideo: React.FC<MultiSceneVideoProps> = ({
  segments,
  sceneVideos,
  sceneImages,
  sceneShapes,
  campaignData,
  accentColor,
  companyName,
  audioPath,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>

      {/* ── GLOBAL AUDIO — plays across all scenes ── */}
      {audioPath && (
        <Audio
          src={audioPath}
          volume={1}
          startFrom={0}
        />
      )}

      <Series>
        {segments.map((segment, i) => (
          <Series.Sequence
            key={i}
            durationInFrames={segment.durationSeconds * 30}
          >
            <AdScene
              segment={segment}
              videoUrl={sceneVideos[i] ?? null}
              imageUrl={sceneImages[i] ?? null}
              shapes={sceneShapes[i] ?? []}
              campaignData={campaignData}
              accentColor={accentColor}
              companyName={companyName}
            />
          </Series.Sequence>
        ))}
      </Series>

    </AbsoluteFill>
  );
};