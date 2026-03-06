import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig, Video, Img } from "remotion";

// Accepts both the runtime shape from MultiSceneVideoProps (url: string, required)
// and SceneOverlayMedia from the studio (url?: string, blobUrl?: string).
// The component resolves whichever src is available and skips entries with none.
export interface OverlayItem {
  id: string;
  type: "video" | "image";
  url?: string;       // Spaces CDN URL — set after upload, used at render time
  blobUrl?: string;   // Local blob preview — browser only, never reaches Remotion
  startSeconds: number;
  endSeconds: number;
  /** Normalized 0–1 relative to composition dimensions */
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
}

export default function OverlayMediaLayer({
  overlays,
}: {
  overlays?: OverlayItem[] | null;
}) {
  const { fps, width, height } = useVideoConfig();
  const list = overlays || [];
  if (list.length === 0) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {list.map((o) => {
        // At render time only o.url is available (blobs don't survive server-side bundling)
        const src = o.url || o.blobUrl;
        if (!src) return null;

        const start = Math.max(0, Math.floor(o.startSeconds * fps));
        const end   = Math.max(start + 1, Math.floor(o.endSeconds * fps));
        const dur   = end - start;

        return (
          <Sequence key={o.id} from={start} durationInFrames={dur}>
            <div
              style={{
                position:     "absolute",
                left:         clamp01(o.x) * width,
                top:          clamp01(o.y) * height,
                width:        clamp01(o.w) * width,
                height:       clamp01(o.h) * height,
                borderRadius: typeof o.radius === "number" ? o.radius : 18,
                overflow:     "hidden",
                boxShadow:    "0 20px 60px rgba(0,0,0,0.45)",
                border:       "1px solid rgba(255,255,255,0.12)",
                background:   "rgba(0,0,0,0.15)",
                zIndex:       10,
              }}
            >
              {o.type === "video" ? (
                <Video
                  src={src}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  volume={0}
                />
              ) : (
                <Img
                  src={src}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

function clamp01(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}