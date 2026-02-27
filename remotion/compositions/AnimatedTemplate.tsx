import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedShape } from "./AnimatedShape";
import type { TemplateShape } from "@/lib/types";

// Canvas is 1080×1350, video is also 1080×1350 — scale = 1
// But if video dimensions differ, scaling is handled here
const CANVAS_WIDTH  = 1080;
const CANVAS_HEIGHT = 1350;

export function AnimatedTemplate({
  shapes,
  campaignData,
  templateOpacity = 1,
}: {
  shapes: TemplateShape[];
  campaignData: Record<string, any>;
  templateOpacity?: number;
}) {
  const frame               = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const scaleX = width  / CANVAS_WIDTH;
  const scaleY = height / CANVAS_HEIGHT;

  // Sort by zIndex so layers render correctly
  const sorted = [...shapes].sort(
    (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
  );

  return (
    <div style={{
      position: "absolute",
      inset:    0,
      opacity:  templateOpacity,
    }}>
      {sorted.map((shape, i) => (
        <AnimatedShape
          key={shape.id}
          shape={shape}
          index={i}
          sceneFrame={frame}
          totalFrames={durationInFrames}
          campaignData={campaignData}
          scaleX={scaleX}
          scaleY={scaleY}
        />
      ))}
    </div>
  );
}