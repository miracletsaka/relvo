import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedShape } from "./AnimatedShape";
import type { TemplateShape } from "@/lib/types";
import type { StyleDNA } from "@/lib/generate-voiceover-script";

const CANVAS_WIDTH  = 1080;
const CANVAS_HEIGHT = 1350;
const MAX_SHAPES    = 5;

function shapePriority(shape: TemplateShape, campaignData?: Record<string,any>): number {
  const s = shape as any;
  if (shape.type === "rectangle" && shape.width > 800)         return 0; // full-width bg
  if (shape.type === "rectangle" && shape.height < 20)         return 1; // accent bar
  if (shape.type === "circle"    && shape.width < 200)         return 1; // decorative
  if (shape.type === "text"      && s.dataField === "hook")    return 2; // hero text
  if (shape.type === "text"      && s.dataField === "cta")     return 2; // cta text
  if (shape.type === "button")                                  return 2;
  if (shape.type === "text")                                    return 3;
  if (shape.type === "image")                                   return 3;
  if (shape.type === "bullet-group")                            return 4;
  return 3;
}

// Only protect the actual lower-third text zone — bottom 280px
// (was incorrectly 420px = 31% of canvas, removed too much)
function isInLowerThird(shape: TemplateShape): boolean {
  const LOWER_ZONE = CANVAS_HEIGHT - 280;
  return shape.y > LOWER_ZONE;
}

// Only block top-left corner where brand badge sits
function isInBrandBadgeArea(shape: TemplateShape): boolean {
  return shape.y < 80 && shape.x < 300;
}

function hasVisibleText(shape: TemplateShape, campaignData?: Record<string, any>): boolean {
  if (shape.type !== "text" && shape.type !== "button" && shape.type !== "bullet-group") return true;
  const s = shape as any;
  // Check direct text
  if ((s.text || s.customText || s.buttonText || "").trim().length > 0) return true;
  // Check dataField resolution — THIS WAS THE BUG: text was filtered before campaignData checked
  if (s.dataField && campaignData?.[s.dataField]) {
    const resolved = String(campaignData[s.dataField]).trim();
    if (resolved.length > 0) return true;
  }
  // Bullet group with bullets
  if (shape.type === "bullet-group") {
    const bullets = s.customBullets || campaignData?.bullets || [];
    return Array.isArray(bullets) && bullets.length > 0;
  }
  return false;
}

function selectShapes(shapes: TemplateShape[], campaignData?: Record<string, any>): TemplateShape[] {
  return shapes
    .filter(s => s.width > 20 && s.height > 20)
    .filter(s => !isInLowerThird(s))
    .filter(s => !isInBrandBadgeArea(s))
    .filter(s => hasVisibleText(s, campaignData)) // ← fixed: pass campaignData
    .sort((a, b) => shapePriority(a, campaignData) - shapePriority(b, campaignData))
    .slice(0, MAX_SHAPES)
    .sort((a, b) => ((a as any).zIndex || 0) - ((b as any).zIndex || 0));
}

export function AnimatedTemplate({
  shapes,
  campaignData,
  styleDNA,
  templateOpacity = 1,
}: {
  shapes:           TemplateShape[];
  campaignData:     Record<string, any>;
  styleDNA?:        StyleDNA;
  templateOpacity?: number;
}) {
  const frame                               = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const scaleX   = width  / CANVAS_WIDTH;
  const scaleY   = height / CANVAS_HEIGHT;
  const selected = selectShapes(shapes, campaignData);

  if (selected.length === 0) return null;

  return (
    <div style={{
      position:      "absolute",
      inset:         0,
      opacity:       templateOpacity,
      pointerEvents: "none",
    }}>
      {selected.map((shape, i) => (
        <AnimatedShape
          key={shape.id || i}
          shape={shape}
          index={i}
          sceneFrame={frame}
          totalFrames={durationInFrames}
          campaignData={campaignData}
          styleDNA={styleDNA}
          scaleX={scaleX}
          scaleY={scaleY}
        />
      ))}
    </div>
  );
}