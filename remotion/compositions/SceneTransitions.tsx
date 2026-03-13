/**
 * SceneTransitions.tsx
 * remotion/compositions/SceneTransitions.tsx
 *
 * 6 cinematic transition effects, each rendered as a Remotion component.
 * Place at the START of each scene — they handle both their own entrance
 * AND overlap with the previous scene's exit.
 *
 * Transitions rotate by scene index so every cut looks different:
 *   0 → LightSweep     (white streak across the frame — energy burst)
 *   1 → GlitchSlice    (RGB split + horizontal slice — techy/modern)
 *   2 → ZoomBlur       (radial zoom-in blur punch — cinematic impact)
 *   3 → ColorBurn      (accent color flare from center — brand moment)
 *   4 → WipeReveal     (diagonal wipe left→right — premium editorial)
 *   5 → ParticleFlash  (rapid stutter flash — hype/social)
 *   repeat cycling...
 *
 * Usage in MultiSceneVideo:
 *   <SceneTransition index={i} durationInFrames={frames} accentColor={accentColor} />
 */

import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from "remotion";

const TRANSITION_FRAMES = 18; // ~600ms at 30fps — long enough to feel but not drag

// ── 1. Light Sweep ────────────────────────────────────────────────────────────
// A blazing white streak sweeps left→right as the scene snaps in.
const LightSweep: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Streak position: -20% → 120% across width
  const x = interpolate(progress, [0, 1], [-20, 120]);

  // Flash brightness on entrance
  const flashOpacity = interpolate(frame, [0, 3, 8, TRANSITION_FRAMES], [0.9, 0.6, 0.1, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <>
      {/* White flash */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundColor: "#ffffff",
        opacity: flashOpacity,
        pointerEvents: "none", zIndex: 90,
      }} />
      {/* Light streak */}
      <div style={{
        position: "absolute", top: 0, bottom: 0,
        left: `${x}%`,
        width: "30%",
        background: `linear-gradient(90deg, transparent 0%, ${accentColor}99 30%, #ffffff 50%, ${accentColor}99 70%, transparent 100%)`,
        opacity: interpolate(progress, [0, 0.3, 0.8, 1], [0, 1, 0.8, 0]),
        pointerEvents: "none", zIndex: 91,
        filter: "blur(8px)",
        transform: "skewX(-12deg)",
      }} />
    </>
  );
};

// ── 2. Glitch Slice ───────────────────────────────────────────────────────────
// RGB channel split + horizontal slices — techy, digital, modern.
const GlitchSlice: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();

  const glitchActive = frame < 12;
  const intensity = interpolate(frame, [0, 6, 12], [1, 0.6, 0], { extrapolateRight: "clamp" });

  if (!glitchActive) return null;

  const slices = [0, 1, 2, 3, 4];

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 90, pointerEvents: "none" }}>
      {/* RGB offset layers */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundColor: "#ff000033",
        transform: `translateX(${intensity * 12}px)`,
        mixBlendMode: "screen",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        backgroundColor: "#0000ff33",
        transform: `translateX(${-intensity * 12}px)`,
        mixBlendMode: "screen",
      }} />
      {/* Horizontal scan slices */}
      {slices.map((s) => {
        const top    = (s / slices.length) * 100;
        const shift  = (s % 2 === 0 ? 1 : -1) * intensity * (8 + s * 4);
        const height = 100 / slices.length;
        return (
          <div key={s} style={{
            position:   "absolute",
            top:        `${top}%`,
            left:       0, right: 0,
            height:     `${height}%`,
            overflow:   "hidden",
            transform:  `translateX(${shift}px)`,
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(90deg, ${accentColor}22 0%, transparent 100%)`,
              opacity: intensity * 0.6,
            }} />
          </div>
        );
      })}
    </div>
  );
};

// ── 3. Zoom Blur ──────────────────────────────────────────────────────────────
// Scene punches in from 130% scale with a blur, settling to normal.
// Applied as a wrapper transform — the most cinematic of all transitions.
export const ZoomBlurWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 180, mass: 0.7 },
    durationInFrames: TRANSITION_FRAMES,
    from: 1.28,
    to: 1.0,
  });

  const blur = interpolate(frame, [0, TRANSITION_FRAMES * 0.6, TRANSITION_FRAMES], [14, 4, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  const opacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      transform: `scale(${scale})`,
      filter: `blur(${blur}px)`,
      opacity,
      transformOrigin: "center center",
    }}>
      {children}
    </div>
  );
};

// ── 4. Color Burn ─────────────────────────────────────────────────────────────
// Brand accent color radiates from center like a lens flare, then dissolves.
const ColorBurn: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();

  const progress = spring({
    frame,
    fps: 30,
    config: { damping: 24, stiffness: 200, mass: 0.5 },
    durationInFrames: TRANSITION_FRAMES,
    from: 0,
    to: 1,
  });

  const opacity = interpolate(
    frame,
    [0, 4, TRANSITION_FRAMES * 0.5, TRANSITION_FRAMES],
    [1, 0.8, 0.3, 0],
    { extrapolateRight: "clamp" }
  );

  const size = interpolate(progress, [0, 1], [0, 300]);

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 90, pointerEvents: "none",
      opacity,
    }}>
      {/* Outer glow ring */}
      <div style={{
        width: `${size}%`,
        height: `${size}%`,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${accentColor}ff 0%, ${accentColor}88 30%, ${accentColor}22 60%, transparent 80%)`,
        position: "absolute",
        filter: "blur(20px)",
        mixBlendMode: "screen",
      }} />
      {/* Core flash */}
      <div style={{
        width: `${size * 0.3}%`,
        height: `${size * 0.3}%`,
        borderRadius: "50%",
        backgroundColor: "#ffffff",
        position: "absolute",
        filter: "blur(4px)",
        opacity: interpolate(frame, [0, 3, 10], [1, 0.7, 0], { extrapolateRight: "clamp" }),
      }} />
    </div>
  );
};

// ── 5. Wipe Reveal ────────────────────────────────────────────────────────────
// A diagonal blade wipes across revealing the new scene — premium editorial feel.
const WipeReveal: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Clip path: diagonal wipe from top-left to bottom-right
  const wipeX = interpolate(progress, [0, 1], [-100, 110]);

  return (
    <div style={{
      position: "absolute", inset: 0,
      zIndex: 90, pointerEvents: "none",
      overflow: "hidden",
    }}>
      {/* Leading edge blade */}
      <div style={{
        position: "absolute",
        top: 0, bottom: 0,
        left: `${wipeX - 8}%`,
        width: "16%",
        background: `linear-gradient(90deg, transparent 0%, ${accentColor}dd 40%, #ffffff 55%, ${accentColor}dd 70%, transparent 100%)`,
        transform: "skewX(-8deg)",
        filter: "blur(3px)",
        opacity: interpolate(progress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
      }} />
      {/* Black cover that recedes as wipe passes */}
      <div style={{
        position: "absolute",
        top: 0, bottom: 0,
        right: 0,
        left: `${wipeX + 4}%`,
        backgroundColor: "#000000",
        opacity: 0.85,
      }} />
    </div>
  );
};

// ── 6. Particle Flash ────────────────────────────────────────────────────────
// Fast stutter flash with particle dots — hype/social energy.
const ParticleFlash: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();

  // 3 rapid flashes in first 10 frames
  const flash1 = frame === 0 || frame === 1 ? 1 : 0;
  const flash2 = frame === 4 || frame === 5 ? 0.7 : 0;
  const flash3 = frame === 8 ? 0.4 : 0;
  const flashOpacity = Math.max(flash1, flash2, flash3);

  // Random particle positions (deterministic based on frame)
  const particles = Array.from({ length: 12 }, (_, i) => ({
    x: ((i * 37 + frame * 13) % 100),
    y: ((i * 53 + frame * 7)  % 100),
    size: 2 + (i % 4),
    opacity: interpolate(frame, [0, 12], [1, 0], { extrapolateRight: "clamp" }) * (0.5 + (i % 3) * 0.3),
  }));

  if (frame > 14) return null;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 90, pointerEvents: "none" }}>
      {/* Stutter flash */}
      {flashOpacity > 0 && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundColor: "#ffffff",
          opacity: flashOpacity * 0.85,
        }} />
      )}
      {/* Accent particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left:     `${p.x}%`,
          top:      `${p.y}%`,
          width:    `${p.size}px`,
          height:   `${p.size}px`,
          borderRadius: "50%",
          backgroundColor: i % 3 === 0 ? accentColor : i % 3 === 1 ? "#ffffff" : "#a78bfa",
          opacity:  p.opacity,
          filter:   "blur(1px)",
        }} />
      ))}
    </div>
  );
};

// ── Main export: picks transition by scene index ───────────────────────────────

interface TransitionProps {
  /** Scene index — used to cycle through transition types */
  index:            number;
  durationInFrames: number;
  accentColor?:     string;
}

export const SceneTransition: React.FC<TransitionProps> = ({
  index,
  durationInFrames,
  accentColor = "#7c3aed",
}) => {
  const frame = useCurrentFrame();

  // Don't render transition after it's done
  if (frame >= TRANSITION_FRAMES) return null;

  const type = index % 6;

  switch (type) {
    case 0: return <LightSweep    accentColor={accentColor} />;
    case 1: return <GlitchSlice   accentColor={accentColor} />;
    // case 2 is ZoomBlurWrapper — applied as a scene wrapper, not here
    case 2: return <ColorBurn     accentColor={accentColor} />;
    case 3: return <WipeReveal    accentColor={accentColor} />;
    case 4: return <ParticleFlash accentColor={accentColor} />;
    case 5: return <LightSweep    accentColor={accentColor} />; // double for extra energy on closing
    default: return null;
  }
};

export { TRANSITION_FRAMES };