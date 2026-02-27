import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { TemplateShape } from "@/lib/types";

// ── Animation styles per shape type ─────────────────────────────────────
type AnimStyle =
  | "fade-up"
  | "fade-in"
  | "slide-left"
  | "slide-right"
  | "scale-in"
  | "bounce-in"
  | "none";

function getAnimStyle(shape: TemplateShape, index: number): AnimStyle {
  // Text shapes
  if (shape.type === "text") {
    // Alternate slide directions for visual interest
    return index % 2 === 0 ? "fade-up" : "slide-left";
  }
  // Buttons — bounce in
  if (shape.type === "button" || shape.type === "rounded-rect") {
    return "bounce-in";
  }
  // Images — scale in
  if (shape.type === "image") {
    return "scale-in";
  }
  // Rectangles, circles — fade in
  return "fade-in";
}

// ── Get text content from shape ──────────────────────────────────────────
function getShapeText(
  shape: TemplateShape,
  campaignData: Record<string, any>
): string {
  const s = shape as any;
  if (s.customText) return s.customText;
  if (s.dataField && campaignData[s.dataField]) {
    return campaignData[s.dataField];
  }
  return s.text || s.buttonText || "";
}

// ── Single animated shape ────────────────────────────────────────────────
export function AnimatedShape({
  shape,
  index,
  sceneFrame,       // frame within this scene
  totalFrames,      // total frames in this scene
  campaignData,
  scaleX,           // canvas → video scale
  scaleY,
}: {
  shape: TemplateShape;
  index: number;
  sceneFrame: number;
  totalFrames: number;
  campaignData: Record<string, any>;
  scaleX: number;
  scaleY: number;
}) {
  const animStyle = getAnimStyle(shape, index);

  // Stagger: each shape enters 4 frames after the previous
  const staggerDelay = Math.min(index * 4, 40);
  const localFrame   = sceneFrame - staggerDelay;

  // ── Entrance animations ──────────────────────────────────────────────
  const entranceDuration = 18;

  const opacity = (() => {
    // All shapes fade out near scene end
    const exitStart = totalFrames - 12;
    const exitOpacity = interpolate(
      sceneFrame, [exitStart, totalFrames], [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    // Entrance
    const entryOpacity = interpolate(
      localFrame, [0, entranceDuration], [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return Math.min(entryOpacity, exitOpacity);
  })();

  const translateY = (() => {
    if (animStyle !== "fade-up") return 0;
    return interpolate(localFrame, [0, entranceDuration], [50, 0], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  })();

  const translateX = (() => {
    if (animStyle === "slide-left") {
      return interpolate(localFrame, [0, entranceDuration], [-80, 0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
    }
    if (animStyle === "slide-right") {
      return interpolate(localFrame, [0, entranceDuration], [80, 0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
    }
    return 0;
  })();

  const scale = (() => {
    if (animStyle === "scale-in") {
      return interpolate(localFrame, [0, entranceDuration], [0.85, 1], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
    }
    if (animStyle === "bounce-in") {
      return interpolate(localFrame, [0, entranceDuration], [0.6, 1], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
        easing: Easing.out(Easing.back(2)),
      });
    }
    return 1;
  })();

  // ── Continuous animations — subtle movement while visible ────────────
  // Floating effect for images
  const floatY = (() => {
    if (shape.type !== "image") return 0;
    return interpolate(
      sceneFrame % 60,
      [0, 30, 60],
      [0, -8, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  })();

  // Pulse for CTA buttons
  const pulse = (() => {
    if ((shape as any).dataField !== "cta" && shape.type !== "button") return 1;
    return interpolate(
      sceneFrame % 45,
      [0, 22, 45],
      [1, 1.04, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  })();

  // ── Scale shape coords from canvas to video ──────────────────────────
  const x      = shape.x      * scaleX;
  const y      = shape.y      * scaleY;
  const width  = shape.width  * scaleX;
  const height = shape.height * scaleY;
  const s      = shape as any;

  const transform = [
    `translateX(${translateX}px)`,
    `translateY(${translateY + floatY}px)`,
    `scale(${scale * pulse})`,
  ].join(" ");

  const baseStyle: React.CSSProperties = {
    position:  "absolute",
    left:      x,
    top:       y,
    width,
    height,
    opacity:   opacity * (s.opacity ?? 1),
    transform,
    zIndex:    s.zIndex ?? 1,
    transformOrigin: "center center",
  };

  // ── Render by shape type ─────────────────────────────────────────────

  // Rectangle / rounded-rect
  if (shape.type === "rectangle" || shape.type === "rounded-rect") {
    return (
      <div style={{
        ...baseStyle,
        backgroundColor: s.backgroundColor || "transparent",
        borderRadius:    s.borderRadius     || (shape.type === "rounded-rect" ? 12 : 0),
        border:          s.borderWidth > 0
          ? `${s.borderWidth * scaleX}px solid ${s.borderColor || "#000"}`
          : "none",
        boxShadow:       s.shadowBlur > 0
          ? `${s.shadowX}px ${s.shadowY}px ${s.shadowBlur}px ${s.shadowColor || "#000"}`
          : "none",
      }} />
    );
  }

  // Circle
  if (shape.type === "circle") {
    return (
      <div style={{
        ...baseStyle,
        backgroundColor: s.backgroundColor || "transparent",
        borderRadius:    "50%",
        border:          s.borderWidth > 0
          ? `${s.borderWidth * scaleX}px solid ${s.borderColor || "#000"}`
          : "none",
      }} />
    );
  }

  // Text
  if (shape.type === "text") {
    const text = getShapeText(shape, campaignData);
    if (!text) return null;

    return (
      <div style={{
        ...baseStyle,
        fontSize:       (s.fontSize || 24) * scaleX,
        fontWeight:     s.fontWeight    || 400,
        color:          s.textColor     || "#ffffff",
        textAlign:      s.textAlign     || "left",
        fontFamily:     s.fontFamily    || "Arial, sans-serif",
        lineHeight:     1.2,
        textShadow:     "0 2px 12px rgba(0,0,0,0.6)",
        textTransform:  s.textTransform || "none",
        display:        "flex",
        alignItems:     "center",
        justifyContent:
          s.textAlign === "center" ? "center" :
          s.textAlign === "right"  ? "flex-end" : "flex-start",
        padding:        `${(s.padding || 0) * scaleY}px`,
      }}>
        {text}
      </div>
    );
  }

  // Button
  if (shape.type === "button") {
    const text = getShapeText(shape, campaignData);
    return (
      <div style={{
        ...baseStyle,
        backgroundColor: s.backgroundColor || "#3b82f6",
        borderRadius:    (s.borderRadius    || 6) * scaleX,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontSize:       (s.fontSize || 16) * scaleX,
        fontWeight:     s.fontWeight || 600,
        color:          s.textColor  || "#ffffff",
        fontFamily:     "Arial, sans-serif",
        boxShadow:      "0 4px 20px rgba(0,0,0,0.3)",
      }}>
        {text}
      </div>
    );
  }

  // Image
  if (shape.type === "image" && s.src) {
    return (
      <div style={{
        ...baseStyle,
        borderRadius: (s.radius || s.borderRadius || 0) * scaleX,
        overflow:     "hidden",
        border:       s.borderWidth > 0
          ? `${s.borderWidth * scaleX}px solid ${s.borderColor || "#000"}`
          : "none",
        boxShadow:    s.shadowBlur > 0
          ? `${s.shadowX}px ${s.shadowY}px ${s.shadowBlur}px ${s.shadowColor}`
          : "none",
      }}>
        <Img
          src={s.src}
          style={{
            width:      "100%",
            height:     "100%",
            objectFit:  s.fit || "cover",
          }}
        />
      </div>
    );
  }

  // Bullet group
  if (shape.type === "bullet-group") {
    const bullets: string[] = s.customBullets ||
      campaignData.bullets || [];
    return (
      <div style={{ ...baseStyle, flexDirection: "column", display: "flex", gap: 8 * scaleY }}>
        {bullets.slice(0, 4).map((b: string, bi: number) => {
          const bulletDelay = bi * 6;
          const bulletLocal = localFrame - bulletDelay;
          const bulletOpacity = interpolate(bulletLocal, [0, 15], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const bulletX = interpolate(bulletLocal, [0, 15], [-30, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          return (
            <div key={bi} style={{
              opacity:   bulletOpacity,
              transform: `translateX(${bulletX}px)`,
              fontSize:  (s.fontSize || 20) * scaleX,
              fontWeight: 600,
              color:     s.textColor || "#ffffff",
              fontFamily: "Arial, sans-serif",
              textShadow: "0 2px 8px rgba(0,0,0,0.7)",
            }}>
              ✅ {b}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}