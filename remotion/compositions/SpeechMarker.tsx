import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { StyleDNA } from "@/lib/generate-voiceover-script";

export type MarkerType = "stat" | "money" | "power" | "brand" | "emphasis";

export interface SpeechMarker {
  word:                string;
  relativeTimeSeconds: number; // seconds from this scene's start
  type:                MarkerType;
}

// Staggered position slots — alternate left/right to avoid overlap
const SLOTS = [
  { top: 165, right: 48,  left: null  },
  { top: 295, right: null, left: 48   },
  { top: 425, right: 48,  left: null  },
  { top: 555, right: null, left: 48   },
  { top: 685, right: 48,  left: null  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Single animated speech marker
// ─────────────────────────────────────────────────────────────────────────────
function SingleMarker({
  marker, slotIndex, accentColor, font, sceneDurationFrames,
}: {
  marker: SpeechMarker; slotIndex: number; accentColor: string;
  font: string; sceneDurationFrames: number;
}) {
  const frame = useCurrentFrame();
  const fps   = useVideoConfig().fps;

  const startFrame = Math.round(marker.relativeTimeSeconds * fps);
  const holdFrames = 54;
  const exitFrame  = startFrame + holdFrames;
  const local      = frame - startFrame;

  if (frame < startFrame || frame > Math.min(exitFrame, sceneDurationFrames - 4)) return null;

  const slot        = SLOTS[slotIndex % SLOTS.length];
  const alignRight  = slot.right !== null;

  // Shared entry/exit opacity
  const entryOpacity = interpolate(local, [0, 10], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const exitOpacity = interpolate(frame, [exitFrame - 10, exitFrame], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });
  const opacity = Math.min(entryOpacity, exitOpacity);

  const containerBase: React.CSSProperties = {
    position:        "absolute",
    top:             slot.top,
    ...(alignRight ? { right: slot.right! } : { left: slot.left! }),
    opacity,
    transformOrigin: alignRight ? "right center" : "left center",
    zIndex:          60,
  };

  // ── STAT: large bold number/percentage pop ───────────────────────────
  if (marker.type === "stat") {
    const scale = interpolate(local, [0, 14], [0.3, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(2.8)),
    });
    const pulse = interpolate((frame - startFrame) % 28, [0, 14, 28], [1, 1.07, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    return (
      <div style={{ ...containerBase, transform: `scale(${scale * pulse})` }}>
        <div style={{
          backgroundColor: accentColor,
          borderRadius:    18,
          padding:         "20px 38px",
          fontSize:        76,
          fontWeight:      900,
          fontFamily:      `"${font}", Impact, sans-serif`,
          color:           "#fff",
          letterSpacing:   "-3px",
          lineHeight:      1,
          boxShadow:       `0 10px 50px ${accentColor}80, 0 0 0 4px ${accentColor}30`,
          textShadow:      "0 3px 10px rgba(0,0,0,0.4)",
          whiteSpace:      "nowrap" as const,
        }}>
          {marker.word}
        </div>
      </div>
    );
  }

  // ── MONEY: gold treatment ────────────────────────────────────────────
  if (marker.type === "money") {
    const tx = interpolate(local, [0, 14], [alignRight ? 60 : -60, 0], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
    return (
      <div style={{ ...containerBase, transform: `translateX(${tx}px)` }}>
        <div style={{
          backgroundColor: "#140800",
          border:          "3px solid #D4AF37",
          borderRadius:    14,
          padding:         "18px 34px",
          fontSize:        62,
          fontWeight:      900,
          fontFamily:      `"${font}", Impact, sans-serif`,
          color:           "#D4AF37",
          letterSpacing:   "-1px",
          lineHeight:      1,
          boxShadow:       "0 6px 36px rgba(212,175,55,0.40)",
          whiteSpace:      "nowrap" as const,
        }}>
          {marker.word}
        </div>
      </div>
    );
  }

  // ── POWER: pill with shimmer ─────────────────────────────────────────
  if (marker.type === "power") {
    const scale = interpolate(local, [0, 10], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(3.2)),
    });
    const shimmerX = interpolate(frame % 48, [0, 48], [-80, 180], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    return (
      <div style={{ ...containerBase, transform: `scale(${scale})` }}>
        <div style={{
          position:        "relative",
          overflow:        "hidden",
          backgroundColor: accentColor,
          borderRadius:    60,
          padding:         "14px 42px",
          fontSize:        46,
          fontWeight:      900,
          fontFamily:      `"${font}", Impact, sans-serif`,
          color:           "#fff",
          letterSpacing:   "4px",
          lineHeight:      1,
          boxShadow:       `0 6px 32px ${accentColor}65`,
          whiteSpace:      "nowrap" as const,
          textTransform:   "uppercase" as const,
        }}>
          {marker.word}
          <div style={{
            position:   "absolute",
            top: 0, bottom: 0,
            left:       shimmerX,
            width:      64,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.38), transparent)",
            transform:  "skewX(-18deg)",
            pointerEvents: "none",
          }} />
        </div>
      </div>
    );
  }

  // ── BRAND: dark badge with dot ───────────────────────────────────────
  if (marker.type === "brand") {
    const ty = interpolate(local, [0, 12], [-22, 0], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    });
    return (
      <div style={{ ...containerBase, transform: `translateY(${ty}px)` }}>
        <div style={{
          display:         "flex",
          alignItems:      "center",
          gap:             10,
          backgroundColor: "rgba(0,0,0,0.68)",
          backdropFilter:  "blur(10px)",
          border:          `1.5px solid ${accentColor}70`,
          borderRadius:    10,
          padding:         "10px 26px",
          fontSize:        30,
          fontWeight:      700,
          fontFamily:      `"${font}", sans-serif`,
          color:           "#fff",
          letterSpacing:   "5px",
          whiteSpace:      "nowrap" as const,
          textTransform:   "uppercase" as const,
        }}>
          <div style={{
            width: 9, height: 9, borderRadius: "50%",
            backgroundColor: accentColor,
            boxShadow:       `0 0 10px ${accentColor}`,
            flexShrink:      0,
          }} />
          {marker.word}
        </div>
      </div>
    );
  }

  // ── EMPHASIS: underline reveal ───────────────────────────────────────
  const ty = interpolate(local, [0, 12], [18, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const barWidth = interpolate(local, [2, 20], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div style={{ ...containerBase, transform: `translateY(${ty}px)` }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <div style={{
          fontSize:      52,
          fontWeight:    800,
          fontFamily:    `"${font}", Impact, sans-serif`,
          color:         "#fff",
          letterSpacing: "-1px",
          textShadow:    "0 3px 18px rgba(0,0,0,0.85)",
          whiteSpace:    "nowrap" as const,
          textTransform: "uppercase" as const,
        }}>
          {marker.word}
        </div>
        <div style={{
          position:        "absolute",
          bottom:          -7,
          left:            0,
          height:          5,
          width:           `${barWidth}%`,
          backgroundColor: accentColor,
          borderRadius:    3,
          boxShadow:       `0 0 14px ${accentColor}`,
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SpeechMarkerLayer — renders all markers for one scene
// ─────────────────────────────────────────────────────────────────────────────
export function SpeechMarkerLayer({
  markers, styleDNA, accentColor,
}: {
  markers:     SpeechMarker[];
  styleDNA?:   StyleDNA;
  accentColor: string;
}) {
  const { durationInFrames } = useVideoConfig();
  const font = styleDNA?.primaryFont || "Oswald";

  if (!markers || markers.length === 0) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 55 }}>
      {markers.map((marker, i) => (
        <SingleMarker
          key={`${marker.word}-${i}`}
          marker={marker}
          slotIndex={i}
          accentColor={accentColor}
          font={font}
          sceneDurationFrames={durationInFrames}
        />
      ))}
    </AbsoluteFill>
  );
}