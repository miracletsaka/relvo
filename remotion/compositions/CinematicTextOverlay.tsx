/**
 * CinematicTextOverlay.tsx
 * remotion/compositions/CinematicTextOverlay.tsx
 *
 * Replaces ALL sceneShapes text injection and SpeechMarker floating-word system.
 * One component, one text element per scene, zero overlap possible.
 *
 * Design:
 *  - screenText slides in from LEFT on a horizontal track (x-axis drift)
 *  - Smooth spring entrance + gentle continuous drift across the frame
 *  - Exits with fade-out + slight rightward slide
 *  - Single text element, bottom-third position, dark pill + accent left border
 *  - Clean, professional — matches high-end marketing video aesthetics
 */

import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";

interface Props {
  text: string;
  durationInFrames: number;
  accentColor?: string;
  /** "bottom" = lower-third (default), "middle" = center */
  position?: "bottom" | "middle";
}

export const CinematicTextOverlay: React.FC<Props> = ({
  text,
  durationInFrames,
  accentColor = "#7c3aed",
  position = "bottom",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!text?.trim()) return null;

  // ── Timing ────────────────────────────────────────────────────────────────
  const holdFrames   = Math.max(10, durationInFrames - 20);
  const fadeOutStart = holdFrames;

  // ── Spring entrance (x-axis slide in from left) ───────────────────────────
  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 22, stiffness: 140, mass: 0.9 },
    durationInFrames: 24,
  });

  // ── Continuous slow drift right while on screen ───────────────────────────
  const driftX = interpolate(
    frame,
    [0, holdFrames],
    [0, 40],
    { extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
  );

  // ── Fade-out ──────────────────────────────────────────────────────────────
  const opacity = interpolate(
    frame,
    [0, 6, fadeOutStart, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Combined x transform ──────────────────────────────────────────────────
  const slideInX  = interpolate(enterProgress, [0, 1], [-120, 0]);
  const translateX = slideInX + driftX;

  // ── Scale micro-pulse on entrance ─────────────────────────────────────────
  const scale = interpolate(
    enterProgress,
    [0, 0.6, 1],
    [0.92, 1.03, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Vertical position ─────────────────────────────────────────────────────
  const topPct = position === "middle" ? 45 : 72;

  return (
    <div
      style={{
        position:      "absolute",
        top:           `${topPct}%`,
        left:          0,
        right:         0,
        display:       "flex",
        justifyContent:"center",
        alignItems:    "center",
        pointerEvents: "none",
        zIndex:        50,
        opacity,
        transform:     `translateX(${translateX}px) scale(${scale})`,
      }}
    >
      {/* Pill container */}
      <div
        style={{
          display:        "inline-flex",
          alignItems:     "center",
          background:     "rgba(0,0,0,0.72)",
          backdropFilter: "blur(12px)",
          borderRadius:   14,
          paddingTop:     18,
          paddingBottom:  18,
          paddingLeft:    28,
          paddingRight:   36,
          borderLeft:     `5px solid ${accentColor}`,
          boxShadow:      `0 4px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)`,
          maxWidth:       "88%",
        }}
      >
        <span
          style={{
            fontFamily:   "'Inter', 'Helvetica Neue', Arial, sans-serif",
            fontWeight:   700,
            fontSize:     52,
            color:        "#ffffff",
            lineHeight:   1.15,
            letterSpacing:"-0.5px",
            textShadow:   "0 2px 12px rgba(0,0,0,0.6)",
            textAlign:    "left",
            whiteSpace:   "pre-wrap",
            wordBreak:    "break-word",
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};