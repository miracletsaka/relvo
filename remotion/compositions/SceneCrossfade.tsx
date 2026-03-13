/**
 * SceneCrossfade.tsx
 * remotion/compositions/SceneCrossfade.tsx
 *
 * Renders a cross-dissolve overlay at scene boundaries.
 * Place this at the START of each scene — it fades from black to transparent
 * over FADE_FRAMES, and at the END it fades back to black over FADE_FRAMES.
 *
 * Usage inside MultiSceneVideo scene loop:
 *
 *   <SceneCrossfade
 *     durationInFrames={sceneFrames}
 *     fadeFrames={8}
 *     color="#000000"
 *   />
 *
 * This creates a professional "cut with dip" transition between every scene.
 * No external dep — pure Remotion interpolate.
 */

import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Props {
  durationInFrames: number;
  /** Number of frames for fade-in AND fade-out. Default 8 (~267ms @30fps) */
  fadeFrames?: number;
  /** Color of the crossfade dip. Default black. */
  color?: string;
}

export const SceneCrossfade: React.FC<Props> = ({
  durationInFrames,
  fadeFrames = 8,
  color = "#000000",
}) => {
  const frame = useCurrentFrame();

  const fadeIn  = Math.min(fadeFrames, Math.floor(durationInFrames / 3));
  const fadeOut = Math.min(fadeFrames, Math.floor(durationInFrames / 3));
  const outStart = durationInFrames - fadeOut;

  // Fade in: black → transparent
  const fadeInOpacity = interpolate(
    frame,
    [0, fadeIn],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Fade out: transparent → black
  const fadeOutOpacity = interpolate(
    frame,
    [outStart, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // During hold: fully transparent
  const opacity = frame < fadeIn
    ? fadeInOpacity
    : frame > outStart
      ? fadeOutOpacity
      : 0;

  if (opacity <= 0) return null;

  return (
    <div
      style={{
        position:        "absolute",
        inset:           0,
        backgroundColor: color,
        opacity,
        pointerEvents:   "none",
        zIndex:          100, // above everything, below nothing
      }}
    />
  );
};