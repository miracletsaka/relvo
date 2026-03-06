"use client";

import React from "react";
import type { VoiceSegment } from "@/lib/generate-voiceover-script";
import { SceneCard, type SceneClipStatus } from "./SceneCard";

type UploadedClip = {
  segmentIndex: number;
  url: string;
  durationSeconds: number;
  hasAudio: boolean;
  isWebcam: boolean;
};

function computeStatus(segments: VoiceSegment[], clips: UploadedClip[]): SceneClipStatus[] {
  const status: SceneClipStatus[] = segments.map(() => ({ hasWebcamVideo: false, hasBrollAudio: false }));

  for (const c of clips ?? []) {
    const i = c.segmentIndex;
    if (i == null || i < 0 || i >= status.length) continue;
    if (c.isWebcam) status[i].hasWebcamVideo = true;
    else status[i].hasBrollAudio = true;
  }

  return status;
}

export function StoryboardModal({
  open,
  segments,
  uploadedClips,
  onClose,
  onReRecord,
  onRender,
}: {
  open: boolean;
  segments: VoiceSegment[];
  uploadedClips: UploadedClip[];
  onClose: () => void;
  onReRecord: (sceneIndex: number) => void;
  onRender: () => void;
}) {
  if (!open) return null;

  const status = computeStatus(segments, uploadedClips);
  const missing = segments
    .map((s, i) => ({ s, i }))
    .filter(({ s, i }) => (s.preferWebcam ? !status[i].hasWebcamVideo : !status[i].hasBrollAudio))
    .map(({ i }) => i);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(1100px, 96vw)",
          maxHeight: "92vh",
          overflow: "hidden",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
          boxShadow: "0 30px 120px rgba(0,0,0,0.55)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ color: "rgba(255,255,255,0.95)", fontWeight: 900, fontSize: 16 }}>
              Storyboard
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              8 scenes • Re-record any single scene • Then render final
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {missing.length > 0 ? (
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                Missing scenes: <b style={{ color: "#fff" }}>{missing.map((i) => i + 1).join(", ")}</b>
              </div>
            ) : (
              <div style={{ color: "rgb(34,197,94)", fontSize: 12, fontWeight: 800 }}>
                All scenes ready ✓
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.35)",
                color: "rgba(255,255,255,0.8)",
                borderRadius: 12,
                padding: "10px 12px",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Close
            </button>

            <button
              onClick={onRender}
              disabled={missing.length > 0}
              style={{
                border: "none",
                background: missing.length > 0 ? "rgba(255,255,255,0.10)" : "rgba(99,102,241,0.90)",
                color: missing.length > 0 ? "rgba(255,255,255,0.35)" : "#fff",
                borderRadius: 12,
                padding: "10px 14px",
                cursor: missing.length > 0 ? "not-allowed" : "pointer",
                fontWeight: 900,
                letterSpacing: 0.5,
              }}
              title={missing.length > 0 ? "Record the missing scenes first" : "Render final video"}
            >
              Render final
            </button>
          </div>
        </div>

        {/* Grid */}
        <div style={{ padding: 16, overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            {segments.map((seg, i) => (
              <SceneCard
                key={i}
                index={i}
                segment={seg}
                status={status[i]}
                onReRecord={onReRecord}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
