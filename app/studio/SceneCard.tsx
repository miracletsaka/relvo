"use client";

import React, { useRef } from "react";
import type { VideoScene } from "@/lib/studio/types";

export default function SceneCard({
  scene,
  accentColor,
  onEdit,
  onRecord,
  onDelete,
  onDuplicate,
  onUploadSceneMedia,
  onAddOverlay,
  onRefreshPreview,
}: {
  scene: VideoScene;
  accentColor: string;
  onEdit: (patch: Partial<VideoScene>) => void;
  onRecord: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUploadSceneMedia: (file: File) => Promise<void>;
  onAddOverlay: (file: File) => Promise<void>;
  onRefreshPreview: () => void;
}) {
  const sceneFileRef = useRef<HTMLInputElement>(null);
  const overlayFileRef = useRef<HTMLInputElement>(null);

  const pickSceneFile = () => sceneFileRef.current?.click();
  const pickOverlayFile = () => overlayFileRef.current?.click();

  const modeLabel =
    scene.mode === "webcam" ? "Webcam" : scene.mode === "broll" ? "B-roll audio" : "AI (Veo)";
  const statusLabel = scene.status === "recorded" ? "Recorded" : "Ready";
  const badgeBg =
    scene.mode === "webcam"
      ? accentColor
      : scene.mode === "broll"
      ? "rgba(255,255,255,0.14)"
      : "rgba(124,58,237,0.35)";

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.35)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {/* ── Thumbnail ────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "9 / 16", background: "#0b0b0b" }}>
        {scene.thumbnailDataUrl ? (
          <img
            src={scene.thumbnailDataUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.35)",
              fontWeight: 800,
            }}
          >
            No preview
          </div>
        )}

        {/* Top badges */}
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 8 }}>
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: badgeBg,
              color: "#fff",
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            {modeLabel}
          </div>
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.9)",
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            Scene {scene.index + 1}
          </div>
        </div>

        {/* Bottom status + preview button */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            right: 10,
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.85)",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {statusLabel} • ~{scene.durationSeconds}s
          </div>

          <button
            onClick={onRefreshPreview}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.85)",
              fontSize: 11,
              fontWeight: 900,
              cursor: "pointer",
            }}
            title="Generate / refresh thumbnail"
          >
            Preview ↻
          </button>
        </div>
      </div>

      {/* ── Editor ───────────────────────────────────────────────────────── */}
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>SCREEN TEXT</div>
        <input
          value={scene.screenText}
          onChange={(e) => onEdit({ screenText: e.target.value })}
          style={inputStyle}
        />

        <div style={{ fontSize: 12, opacity: 0.7, margin: "12px 0 6px" }}>NARRATION</div>
        <textarea
          value={scene.narration}
          onChange={(e) => onEdit({ narration: e.target.value })}
          rows={4}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.4 }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>MODE</div>
            <select
              value={scene.mode}
              onChange={(e) => onEdit({ mode: e.target.value as any })}
              style={{ ...inputStyle, fontWeight: 800 }}
            >
              <option className="text-black" value="webcam">Webcam (video+audio)</option>
              <option className="text-black" value="broll">B-roll (audio only)</option>
              <option className="text-black" value="ai">AI (Veo scene)</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>DURATION</div>
            <input
              type="number"
              min={3}
              max={12}
              value={scene.durationSeconds}
              onChange={(e) => onEdit({ durationSeconds: Number(e.target.value || 6) })}
              style={{ ...inputStyle, fontWeight: 800 }}
            />
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {/* Record */}
          <button
            onClick={onRecord}
            style={{
              flex: "1 1 150px",
              background: accentColor,
              border: "none",
              color: "#fff",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            {scene.mode === "webcam"
              ? "Record webcam"
              : scene.mode === "broll"
              ? "Record b-roll audio"
              : "Record (optional)"}
          </button>

          {/* Upload scene background */}
          <button onClick={pickSceneFile} style={ghostBtn}>
            Upload Scene
          </button>

          {/* Add overlay */}
          <button onClick={pickOverlayFile} style={ghostBtn}>
            Add Overlay
          </button>

          {/* Duplicate */}
          <button onClick={onDuplicate} style={ghostBtn} title="Duplicate scene">
            Duplicate
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            style={{
              background: "rgba(255,60,60,0.10)",
              border: "1px solid rgba(255,80,80,0.35)",
              color: "#ff6b6b",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 900,
            }}
            title="Delete scene"
          >
            Delete
          </button>
        </div>

        {/* ── Hidden file inputs ──────────────────────────────────────────── */}
        <input
          ref={sceneFileRef}
          type="file"
          accept="video/*,image/*"
          style={{ display: "none" }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            await onUploadSceneMedia(f);
          }}
        />

        <input
          ref={overlayFileRef}
          type="file"
          accept="video/*,image/*"
          style={{ display: "none" }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            await onAddOverlay(f);
          }}
        />

        {/* ── Overlays list ───────────────────────────────────────────────── */}
        {(scene.overlays?.length || 0) > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>OVERLAYS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {scene.overlays!.map((o) => (
                <div
                  key={o.id}
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 12,
                    padding: 10,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    {o.type.toUpperCase()} • {o.startSeconds}s → {o.endSeconds}s
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>
                    pos: ({o.x.toFixed(2)}, {o.y.toFixed(2)}) size: ({o.w.toFixed(2)}, {o.h.toFixed(2)})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#fff",
  outline: "none",
};

const ghostBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.9)",
  padding: "10px 12px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 900,
};