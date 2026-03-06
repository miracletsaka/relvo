import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export type Beat = {
  kind: "stat" | "money" | "time" | "rating" | "count";
  raw: string;
  value?: number;
  label?: string;
};

function safeNum(v: any, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatBeat(b: Beat) {
  // Prefer raw, but if we have (value+label) we can re-compose
  if (b.kind === "money" && typeof b.value === "number") {
    const sym = b.label || "$";
    const v = b.value;
    // compact formatting for large numbers
    if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${sym}${Math.round(v).toLocaleString()}`;
    return `${sym}${v}`;
  }

  if (typeof b.value === "number" && b.label) return `${b.value}${b.label}`;
  return b.raw;
}

/**
 * Renders a single "agency-style" stat pop.
 *
 * IMPORTANT: All interpolate() inputs must be finite.
 */
export function StatBeatLayer({
  beats,
  accentColor,
}: {
  beats?: Beat[];
  accentColor: string;
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const d = Math.max(1, safeNum(durationInFrames, 150));
  const local = Math.max(0, Math.min(frame, d));

  const list = (beats || []).slice(0, 2);
  if (list.length === 0) return null;

  // pop window: early-to-mid scene
  const popIn = 10;
  const popHold = Math.min(70, Math.floor(d * 0.4));
  const popOut = Math.min(d - 1, popHold + 20);

  const opacity = interpolate(local, [popIn, popIn + 10, popOut - 10, popOut], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const y = interpolate(local, [popIn, popIn + 18], [28, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const scale = interpolate(local, [popIn, popIn + 18], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.4)),
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 40,
          right: 40,
          display: "flex",
          gap: 14,
          justifyContent: "center",
          opacity,
          transform: `translateY(${y}px) scale(${scale})`,
        }}
      >
        {list.map((b, i) => (
          <div
            key={i}
            style={{
              padding: "18px 22px",
              borderRadius: 18,
              background: "rgba(0,0,0,0.55)",
              border: `1px solid ${accentColor}55`,
              boxShadow: `0 18px 60px rgba(0,0,0,0.55), 0 0 50px ${accentColor}22`,
              minWidth: 180,
              textAlign: "center",
              backdropFilter: "blur(6px)",
            }}
          >
            <div
              style={{
                fontSize: 56,
                fontWeight: 900,
                letterSpacing: -1,
                color: "#fff",
                lineHeight: 1,
                textShadow: "0 10px 40px rgba(0,0,0,0.6)",
              }}
            >
              {formatBeat(b)}
            </div>
            <div style={{ marginTop: 8, fontSize: 16, color: "rgba(255,255,255,0.72)", fontWeight: 700 }}>
              {b.kind.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}
