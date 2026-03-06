// remotion/compositions/DemoOverlayCard.tsx
// Floating "app UI demo" card — like Image 2 reference.
// Renders a realistic search/results UI card that floats over the webcam scene.
// Animates in with a spring, stays visible, fades out near scene end.

import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface DemoCardRow {
  label:      string;
  sublabel?:  string;
  avatarUrl?: string; // optional thumbnail
  accentDot?: boolean;
}

export interface DemoOverlayCardProps {
  /** Text shown in the fake search bar */
  searchQuery:  string;
  /** Result rows shown below the search bar */
  rows:         DemoCardRow[];
  accentColor:  string;
  /** Normalized x position (0–1). Default: 0.54 (right side) */
  x?:           number;
  /** Normalized y position (0–1). Default: 0.08 (near top) */
  y?:           number;
  /** Normalized width (0–1). Default: 0.40 */
  w?:           number;
  /** Frame to start appearing. Default: 18 */
  startFrame?:  number;
  /** Frame to start disappearing. Default: durationInFrames - 20 */
  exitFrame?:   number;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function DemoOverlayCard({
  searchQuery,
  rows,
  accentColor,
  x           = 0.54,
  y           = 0.08,
  w           = 0.40,
  startFrame  = 18,
  exitFrame,
}: DemoOverlayCardProps) {
  const frame                  = useCurrentFrame();
  const { width, height, durationInFrames, fps } = useVideoConfig();

  const exit = exitFrame ?? durationInFrames - 20;

  // ── Spring-like entry ──────────────────────────────────────────────────────
  const entryProgress = interpolate(frame, [startFrame, startFrame + 22], [0, 1], {
    extrapolateLeft:  "clamp",
    extrapolateRight: "clamp",
    easing:           Easing.out(Easing.back(1.6)),
  });
  const exitProgress = interpolate(frame, [exit, exit + 16], [1, 0], {
    extrapolateLeft:  "clamp",
    extrapolateRight: "clamp",
    easing:           Easing.in(Easing.quad),
  });
  const progress = Math.min(entryProgress, exitProgress);
  if (progress <= 0) return null;

  const translateY = interpolate(entryProgress, [0, 1], [-28, 0], {
    extrapolateLeft:  "clamp",
    extrapolateRight: "clamp",
  });

  // ── Row stagger ────────────────────────────────────────────────────────────
  const cardX = clamp01(x) * width;
  const cardY = clamp01(y) * height;
  const cardW = clamp01(w) * width;

  const ROW_H    = 64;
  const PADDING  = 16;
  const HEADER_H = 56;
  const cardH    = HEADER_H + rows.length * ROW_H + PADDING * 2;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position:     "absolute",
          left:         cardX,
          top:          cardY,
          width:        cardW,
          opacity:      progress,
          transform:    `translateY(${translateY}px)`,
          borderRadius: 20,
          overflow:     "hidden",
          background:   "rgba(255,255,255,0.96)",
          backdropFilter: "blur(20px)",
          boxShadow:    `0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.12)`,
        }}
      >
        {/* Search bar row */}
        <div
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        10,
            padding:    "12px 16px",
            background: "rgba(255,255,255,1)",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          {/* Search icon */}
          <div style={{ color: "rgba(0,0,0,0.35)", fontSize: 15, flexShrink: 0 }}>⌕</div>
          <div
            style={{
              flex:       1,
              fontSize:   14,
              fontWeight: 500,
              color:      "#111",
              fontFamily: "Arial, sans-serif",
              whiteSpace: "nowrap",
              overflow:   "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {searchQuery}
          </div>
          {/* X button */}
          <div
            style={{
              width:        22,
              height:       22,
              borderRadius: "50%",
              background:   "rgba(0,0,0,0.08)",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              fontSize:     11,
              color:        "rgba(0,0,0,0.45)",
              flexShrink:   0,
            }}
          >
            ✕
          </div>
          {/* Search button */}
          <div
            style={{
              width:          32,
              height:         32,
              borderRadius:   10,
              background:     accentColor,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontSize:       14,
              color:          "#fff",
              flexShrink:     0,
            }}
          >
            ⌕
          </div>
        </div>

        {/* Result rows */}
        <div style={{ padding: `${PADDING / 2}px 0` }}>
          {rows.map((row, i) => {
            const rowDelay    = startFrame + 12 + i * 6;
            const rowProgress = interpolate(frame, [rowDelay, rowDelay + 14], [0, 1], {
              extrapolateLeft:  "clamp",
              extrapolateRight: "clamp",
              easing:           Easing.out(Easing.cubic),
            });
            const rowOpacity = rowProgress * progress;
            const rowX       = interpolate(rowProgress, [0, 1], [-20, 0], {
              extrapolateLeft:  "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  display:     "flex",
                  alignItems:  "center",
                  gap:         12,
                  padding:     "10px 16px",
                  opacity:     rowOpacity,
                  transform:   `translateX(${rowX}px)`,
                  borderBottom: i < rows.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                }}
              >
                {/* Avatar / thumbnail */}
                <div
                  style={{
                    width:        44,
                    height:       44,
                    borderRadius: 10,
                    overflow:     "hidden",
                    flexShrink:   0,
                    background:   `${accentColor}22`,
                    display:      "flex",
                    alignItems:   "center",
                    justifyContent: "center",
                  }}
                >
                  {row.avatarUrl ? (
                    <Img
                      src={row.avatarUrl}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width:        28,
                        height:       28,
                        borderRadius: "50%",
                        background:   accentColor,
                        opacity:      0.7,
                      }}
                    />
                  )}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize:     13,
                      fontWeight:   600,
                      color:        "#111",
                      fontFamily:   "Arial, sans-serif",
                      whiteSpace:   "nowrap",
                      overflow:     "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.label}
                  </div>
                  {row.sublabel && (
                    <div
                      style={{
                        fontSize:   11,
                        color:      "rgba(0,0,0,0.45)",
                        fontFamily: "Arial, sans-serif",
                        marginTop:  2,
                        whiteSpace: "nowrap",
                        overflow:   "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.sublabel}
                    </div>
                  )}
                </div>

                {/* Accent dot */}
                {row.accentDot && (
                  <div
                    style={{
                      width:        8,
                      height:       8,
                      borderRadius: "50%",
                      background:   accentColor,
                      flexShrink:   0,
                      boxShadow:    `0 0 8px ${accentColor}`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Helper: build DemoCardRows from campaign/segment data ────────────────────
export function buildDemoRows(
  segment: { narration: string; screenText: string },
  companyName: string,
): DemoCardRow[] {
  // Generate 2 contextual result rows from the narration
  const words = segment.narration.split(" ").filter((w) => w.length > 4);
  const label1 = words.slice(0, 4).join(" ") || `${companyName} feature`;
  const label2 = words.slice(4, 8).join(" ") || "Learn more";

  return [
    { label: label1, sublabel: companyName, accentDot: true },
    { label: label2, sublabel: "Recommended", accentDot: false },
  ];
}
