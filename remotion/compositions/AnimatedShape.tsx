import React from "react";
import { Easing, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { TemplateShape } from "@/lib/types";
import type { StyleDNA } from "@/lib/generate-voiceover-script";

type AnimStyle = "fade-up" | "fade-in" | "slide-left" | "slide-right" | "scale-in" | "bounce-in" | "none";

function getAnimStyle(shape: TemplateShape, index: number): AnimStyle {
  if (shape.type === "text")                                         return index % 2 === 0 ? "fade-up" : "slide-left";
  if (shape.type === "button" || shape.type === "rounded-rect")      return "bounce-in";
  if (shape.type === "image")                                        return "scale-in";
  return "fade-in";
}

function getShapeText(shape: TemplateShape, campaignData: Record<string, any>): string {
  const s = shape as any;
  if (s.customText) return s.customText;
  if (s.dataField && campaignData[s.dataField]) return String(campaignData[s.dataField]);
  return s.text || s.buttonText || "";
}

export function AnimatedShape({
  shape, index, sceneFrame, totalFrames, campaignData, styleDNA, scaleX, scaleY,
}: {
  shape:        TemplateShape;
  index:        number;
  sceneFrame:   number;
  totalFrames:  number;
  campaignData: Record<string, any>;
  styleDNA?:    StyleDNA;
  scaleX:       number;
  scaleY:       number;
}) {
  const animStyle        = getAnimStyle(shape, index);
  const staggerDelay     = Math.min(index * 4, 40);
  const localFrame       = sceneFrame - staggerDelay;
  const entranceDuration = 18;
  const motionAmp        = styleDNA?.motionIntensity ?? 0.75;

  // Font from StyleDNA — override template's default font for brand consistency
  const brandFont    = styleDNA?.primaryFont || null;
  const brandWeight  = styleDNA?.fontWeight  || null;

  const opacity = (() => {
    const exitStart   = totalFrames - 12;
    const exitOpacity = interpolate(sceneFrame, [exitStart, totalFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const entryOpacity= interpolate(localFrame,  [0, entranceDuration],   [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return Math.min(entryOpacity, exitOpacity);
  })();

  const translateY = animStyle !== "fade-up" ? 0 : interpolate(localFrame, [0, entranceDuration], [50 * motionAmp, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const translateX = (() => {
    if (animStyle === "slide-left")  return interpolate(localFrame, [0, entranceDuration], [-80 * motionAmp, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    if (animStyle === "slide-right") return interpolate(localFrame, [0, entranceDuration], [ 80 * motionAmp, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    return 0;
  })();
  const scale = (() => {
    if (animStyle === "scale-in")  return interpolate(localFrame, [0, entranceDuration], [0.85, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    if (animStyle === "bounce-in") return interpolate(localFrame, [0, entranceDuration], [0.6,  1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });
    return 1;
  })();

  const floatY = shape.type !== "image" ? 0 : interpolate(sceneFrame % 60, [0, 30, 60], [0, -8 * motionAmp, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse  = (shape as any).dataField !== "cta" && shape.type !== "button" ? 1 : interpolate(sceneFrame % 45, [0, 22, 45], [1, 1 + 0.04 * motionAmp, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
    position: "absolute", left: x, top: y, width, height,
    opacity: opacity * (s.opacity ?? 1),
    transform,
    zIndex: s.zIndex ?? 1,
    transformOrigin: "center center",
  };

  if (shape.type === "rectangle" || shape.type === "rounded-rect") {
    return <div style={{ ...baseStyle, backgroundColor: s.backgroundColor || "transparent", borderRadius: s.borderRadius || (shape.type === "rounded-rect" ? 12 : 0), border: s.borderWidth > 0 ? `${s.borderWidth * scaleX}px solid ${s.borderColor || "#000"}` : "none", boxShadow: s.shadowBlur > 0 ? `${s.shadowX}px ${s.shadowY}px ${s.shadowBlur}px ${s.shadowColor || "#000"}` : "none" }} />;
  }

  if (shape.type === "circle") {
    return <div style={{ ...baseStyle, backgroundColor: s.backgroundColor || "transparent", borderRadius: "50%", border: s.borderWidth > 0 ? `${s.borderWidth * scaleX}px solid ${s.borderColor || "#000"}` : "none" }} />;
  }

  if (shape.type === "text") {
    const text = getShapeText(shape, campaignData);
    if (!text) return null;
    return (
      <div style={{
        ...baseStyle,
        fontSize:       (s.fontSize || 24) * scaleX,
        fontWeight:     brandWeight  || s.fontWeight || 700, // StyleDNA weight
        color:          s.textColor  || "#ffffff",
        textAlign:      s.textAlign  || "left",
        fontFamily:     brandFont    ? `"${brandFont}", ${s.fontFamily || "Arial, sans-serif"}` : (s.fontFamily || "Arial, sans-serif"),
        lineHeight:     1.2,
        textShadow:     "0 2px 12px rgba(0,0,0,0.6)",
        textTransform:  styleDNA?.textTransform || s.textTransform || "none",
        display:        "flex",
        alignItems:     "center",
        justifyContent: s.textAlign === "center" ? "center" : s.textAlign === "right" ? "flex-end" : "flex-start",
        padding:        `${(s.padding || 0) * scaleY}px`,
      }}>
        {text}
      </div>
    );
  }

  if (shape.type === "button") {
    const text = getShapeText(shape, campaignData);
    return (
      <div style={{
        ...baseStyle,
        backgroundColor: s.backgroundColor || styleDNA?.accentColor || "#3b82f6",
        borderRadius:    (s.borderRadius || 6) * scaleX,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize:   (s.fontSize || 16) * scaleX,
        fontWeight: brandWeight || s.fontWeight || 600,
        color:      s.textColor || "#ffffff",
        fontFamily: brandFont ? `"${brandFont}", Arial, sans-serif` : "Arial, sans-serif",
        boxShadow:  `0 4px 20px rgba(0,0,0,0.3)`,
      }}>
        {text}
      </div>
    );
  }

  if (shape.type === "image" && s.src) {
    return (
      <div style={{ ...baseStyle, borderRadius: (s.radius || s.borderRadius || 0) * scaleX, overflow: "hidden", border: s.borderWidth > 0 ? `${s.borderWidth * scaleX}px solid ${s.borderColor || "#000"}` : "none", boxShadow: s.shadowBlur > 0 ? `${s.shadowX}px ${s.shadowY}px ${s.shadowBlur}px ${s.shadowColor}` : "none" }}>
        <Img src={s.src} style={{ width: "100%", height: "100%", objectFit: s.fit || "cover" }} />
      </div>
    );
  }

  if (shape.type === "bullet-group") {
    const bullets: string[] = s.customBullets || campaignData.bullets || [];
    return (
      <div style={{ ...baseStyle, flexDirection: "column", display: "flex", gap: 8 * scaleY }}>
        {bullets.slice(0, 4).map((b: string, bi: number) => {
          const bulletDelay   = bi * 6;
          const bulletLocal   = localFrame - bulletDelay;
          const bulletOpacity = interpolate(bulletLocal, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const bulletX       = interpolate(bulletLocal, [0, 15], [-30 * motionAmp, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          return (
            <div key={bi} style={{
              opacity:   bulletOpacity,
              transform: `translateX(${bulletX}px)`,
              fontSize:  (s.fontSize || 20) * scaleX,
              fontWeight: brandWeight || 600,
              color:     s.textColor || "#ffffff",
              fontFamily: brandFont ? `"${brandFont}", Arial, sans-serif` : "Arial, sans-serif",
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