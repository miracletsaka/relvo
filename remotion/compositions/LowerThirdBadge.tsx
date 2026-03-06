// remotion/compositions/LowerThirdBadge.tsx
// Animated lower-third name/title card for webcam scenes.
// Slides up from bottom-left, stays visible, fades out near end.
// Data pulled from campaignData or props.

import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface LowerThirdBadgeProps {
  name:        string;   // e.g. "John Smith" or companyName
  title?:      string;   // e.g. "Plumber • Manchester" or tagline
  accentColor: string;
  /** Frame to appear. Default 20 */
  startFrame?: number;
  /** How long to stay visible in frames. Default 90 */
  holdFrames?: number;
}

export function LowerThirdBadge({
  name,
  title,
  accentColor,
  startFrame = 20,
  holdFrames = 90,
}: LowerThirdBadgeProps) {
  const frame              = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const exitFrame = Math.min(startFrame + holdFrames, durationInFrames - 10);
  const local     = frame - startFrame;

  const entryProgress = interpolate(local, [0, 18], [0, 1], {
    extrapolateLeft:  "clamp",
    extrapolateRight: "clamp",
    easing:           Easing.out(Easing.cubic),
  });
  const exitProgress = interpolate(frame, [exitFrame - 12, exitFrame], [1, 0], {
    extrapolateLeft:  "clamp",
    extrapolateRight: "clamp",
    easing:           Easing.in(Easing.quad),
  });

  const opacity    = Math.min(entryProgress, exitProgress);
  const translateY = interpolate(entryProgress, [0, 1], [40, 0], {
    extrapolateLeft:  "clamp",
    extrapolateRight: "clamp",
    easing:           Easing.out(Easing.cubic),
  });

  // Bar width animates in after the card
  const barW = interpolate(local, [8, 26], [0, 1], {
    extrapolateLeft:  "clamp",
    extrapolateRight: "clamp",
    easing:           Easing.out(Easing.cubic),
  });

  if (frame < startFrame || opacity <= 0) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position:  "absolute",
          bottom:    88,
          left:      0,
          right:     0,
          opacity,
          transform: `translateY(${translateY}px)`,
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            position:     "absolute",
            left:         52,
            bottom:       "calc(100% + 8px)",
            height:       4,
            width:        `${barW * 120}px`,
            background:   accentColor,
            borderRadius: 2,
            boxShadow:    `0 0 16px ${accentColor}`,
          }}
        />

        {/* Badge */}
        <div
          style={{
            marginLeft:     52,
            display:        "inline-flex",
            flexDirection:  "column",
            background:     "rgba(0,0,0,0.72)",
            backdropFilter: "blur(12px)",
            borderLeft:     `4px solid ${accentColor}`,
            borderRadius:   "0 10px 10px 0",
            padding:        "10px 20px 10px 16px",
            boxShadow:      "0 8px 32px rgba(0,0,0,0.55)",
          }}
        >
          <span
            style={{
              fontFamily:    "Oswald, Impact, Arial Black, sans-serif",
              fontWeight:    900,
              fontSize:      30,
              color:         "#fff",
              letterSpacing: "1px",
              textTransform: "uppercase",
              lineHeight:    1.1,
            }}
          >
            {name}
          </span>
          {title && (
            <span
              style={{
                fontFamily: "Arial, sans-serif",
                fontWeight: 400,
                fontSize:   15,
                color:      "rgba(255,255,255,0.72)",
                marginTop:  3,
                letterSpacing: "0.5px",
              }}
            >
              {title}
            </span>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
}
