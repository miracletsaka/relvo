// remotion/compositions/KineticCaptions.tsx
// Word-by-word list reveal — matches Image 1 reference.
// Each phrase slides in from the left with the accent bar animating
// on the currently active line. Much more premium than chunk display.

import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SpeechMarker } from "./SpeechMarker";

type Props = {
  markers:           SpeechMarker[];
  accentColor:       string;
  styleDNA?:         any;
  bottom?:           number;
  maxLines?:         number;
  enabled?:          boolean;
};

function safeNum(v: any, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ── Group markers into display lines (max 3 words per line) ──────────────────
function buildLines(markers: SpeechMarker[]): Array<{
  text:               string;
  relativeTimeSeconds: number;
}> {
  if (markers.length === 0) return [];

  const lines: Array<{ text: string; relativeTimeSeconds: number }> = [];
  const WORDS_PER_LINE = 3;

  for (let i = 0; i < markers.length; i += WORDS_PER_LINE) {
    const chunk = markers.slice(i, i + WORDS_PER_LINE);
    lines.push({
      text:               chunk.map((m) => m.word).join(" "),
      relativeTimeSeconds: safeNum(chunk[0].relativeTimeSeconds, 0),
    });
  }
  return lines;
}

export default function KineticCaptions({
  markers,
  accentColor,
  styleDNA,
  bottom    = 120,
  maxLines  = 4,
  enabled   = true,
}: Props) {
  const frame               = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!enabled) return null;

  const t = frame / fps;

  const sorted = useMemo(() => {
    return (markers || [])
      .slice()
      .filter(Boolean)
      .sort((a, b) => safeNum(a.relativeTimeSeconds, 0) - safeNum(b.relativeTimeSeconds, 0));
  }, [markers]);

  if (sorted.length === 0) return null;

  const allLines = useMemo(() => buildLines(sorted), [sorted]);
  // Keep only lines that fit in the scene
  const lines = allLines.filter((l) => l.relativeTimeSeconds < durationInFrames / fps - 0.5).slice(0, maxLines);

  if (lines.length === 0) return null;

  // Active line = last line whose time has passed
  let activeIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (t >= lines[i].relativeTimeSeconds) activeIdx = i;
  }

  const font   = styleDNA?.primaryFont || "Oswald";
  const weight = styleDNA?.fontWeight  || 900;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position:  "absolute",
          left:      0,
          right:     0,
          bottom,
          display:   "flex",
          flexDirection: "column",
          alignItems:    "flex-start",
          gap:       10,
          paddingLeft: 52,
          paddingRight: 52,
        }}
      >
        {lines.map((line, i) => {
          const lineStartFrame = Math.round(line.relativeTimeSeconds * fps);
          const local          = frame - lineStartFrame;
          const isActive       = i === activeIdx;

          // Only render lines that have been reached
          if (frame < lineStartFrame) return null;

          // Exit: fade out when next line takes over (unless it's the last)
          const nextLineFrame =
            i < lines.length - 1
              ? Math.round(lines[i + 1].relativeTimeSeconds * fps)
              : durationInFrames;
          const fadeOutStart = Math.min(nextLineFrame - 4, durationInFrames - 8);

          const entryOpacity = interpolate(local, [0, 12], [0, 1], {
            extrapolateLeft:  "clamp",
            extrapolateRight: "clamp",
            easing:           Easing.out(Easing.cubic),
          });
          const exitOpacity = isActive
            ? 1
            : interpolate(frame, [fadeOutStart, fadeOutStart + 8], [1, 0.35], {
                extrapolateLeft:  "clamp",
                extrapolateRight: "clamp",
              });

          const opacity = Math.min(entryOpacity, exitOpacity);

          // Slide in from left
          const translateX = interpolate(local, [0, 14], [-48, 0], {
            extrapolateLeft:  "clamp",
            extrapolateRight: "clamp",
            easing:           Easing.out(Easing.cubic),
          });

          // Scale: active line is slightly larger
          const scale = isActive ? 1 : 0.88;

          // Accent bar height animates when line becomes active
          const barH = isActive
            ? interpolate(local, [0, 16], [0, 38], {
                extrapolateLeft:  "clamp",
                extrapolateRight: "clamp",
                easing:           Easing.out(Easing.cubic),
              })
            : 0;

          return (
            <div
              key={`${i}-${line.text}`}
              style={{
                display:       "flex",
                alignItems:    "center",
                gap:           14,
                opacity,
                transform:     `translateX(${translateX}px) scale(${scale})`,
                transformOrigin: "left center",
              }}
            >
              {/* Animated accent bar — only shows on active line */}
              <div
                style={{
                  width:        4,
                  height:       barH,
                  borderRadius: 2,
                  background:   accentColor,
                  flexShrink:   0,
                  boxShadow:    isActive ? `0 0 12px ${accentColor}` : "none",
                  transition:   "height 0.15s ease",
                }}
              />

              {/* Line text */}
              <div
                style={{
                  fontFamily:    `"${font}", Impact, "Arial Black", sans-serif`,
                  fontWeight:    weight,
                  fontSize:      isActive ? 46 : 38,
                  color:         isActive ? "#ffffff" : "rgba(255,255,255,0.65)",
                  letterSpacing: "-1px",
                  textTransform: styleDNA?.textTransform || "uppercase",
                  textShadow:    isActive
                    ? `0 4px 24px rgba(0,0,0,0.9), 0 0 40px ${accentColor}33`
                    : "0 3px 14px rgba(0,0,0,0.75)",
                  lineHeight: 1.05,
                  transition: "font-size 0.15s ease, color 0.15s ease",
                }}
              >
                {line.text}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}