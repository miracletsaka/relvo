"use client";

// ProjectStudio — NeuroFlow Video Studio
// Features:
//   - Scene types: AI video (media_asset), Webcam, B-Roll upload
//   - Webcam recording via TeleprompterModal
//   - B-Roll file upload per scene
//   - AI "Add Scene" — Gemini generates new scene in context of existing
//   - Voice-driven duration (word count estimate shown per scene)
//   - Media pool picker (manual swap optional)
//   - No captions/subtitles
//   - Veo3 aiPrompt stored per scene for render priority

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, ArrowUpRight, Check, ChevronDown, ChevronUp,
  Pause, Play, Plus, RefreshCw, Sparkles, Trash2, Video,
  Wand2, X, Mic, Upload, Monitor, Film, Eye,
} from "lucide-react";
import { attachMediaToContentItem } from "@/lib/api";
import TeleprompterModal, { type RecordedClip } from "@/app/studio/TeleprompterModal";

// ── API base ────────────────────────────────────────────────────
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

// ── Types ────────────────────────────────────────────────────────

type SceneMode = "media_asset" | "ai" | "webcam" | "broll";

interface SceneOverlay {
  id: string; type: "video" | "image";
  blobUrl?: string | null; url?: string | null;
  startSeconds: number; endSeconds: number;
  x: number; y: number; w: number; h: number; radius?: number;
}

interface StudioScene {
  id:                    string;
  index:                 number;
  screenText:            string;
  narration:             string;
  durationSeconds:       number;
  position:              "opening" | "middle" | "closing";
  sceneEnergy:           number;
  animationStyle:        string;
  templateHint:          string;
  beats:                 any[];
  mode:                  SceneMode;
  // Media asset (auto-assigned, swappable)
  mediaAssetId:          string | null;
  mediaAssetUrl:         string | null;
  mediaCategory:         string | null;
  // Veo3 AI prompt
  aiPrompt:              string;
  // Webcam / broll recorded blob
  recordedBlobUrl?:      string | null;
  recordedDurationSeconds?: number;
  // User-uploaded background
  uploadedBlobUrl?:      string | null;
  uploadedType?:         "video" | "image" | null;
  uploadedMimeType?:     string | null;
  // Overlays
  overlays?:             SceneOverlay[];
}

interface MediaAsset {
  id: string; url: string; filename: string;
  type: "video" | "image"; category: string;
}

// ── Constants ────────────────────────────────────────────────────

// Real ElevenLabs pre-made voice IDs — must match lib/elevenlabs.ts
const VOICE_OPTIONS = [
  // Female
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah — Female, calm (US)"        },
  { id: "FGY2WhTYpPnrIDTdsKH5", label: "Laura — Female, upbeat (US)"       },
  { id: "cgSgspJ2msm6clMCkdW9", label: "Jessica — Female, expressive (US)" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", label: "Alice — Female, professional (UK)" },
  { id: "pFZP5JQG7iQjIQuC4Bku", label: "Lily — Female, warm narrative (UK)"},
  { id: "XB0fDUnXU5powFXDhCwa", label: "Charlotte — Female, confident (UK)"},
  // Male
  { id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam — Male, clear articulate (US)"},
  { id: "bIHbv24MWmeRgasZH58o", label: "Will — Male, friendly (US)"         },
  { id: "CwhRBWXzGAHq8TQ4Fs17", label: "Roger — Male, assertive (US)"      },
  { id: "nPczCjzI2devNBz1zQrb", label: "Brian — Male, deep (US)"           },
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George — Male, warm (UK)"          },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel — Male, professional (UK)"  },
  { id: "IKne3meq5aSn9XLyUdCD", label: "Charlie — Male, casual (AU)"       },
];
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah

const SCENE_TYPE_OPTIONS: { mode: SceneMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { mode: "media_asset", label: "Media Clip",  icon: <Film  style={{ width: 13, height: 13 }} />, desc: "Use a clip from your media pool" },
  { mode: "ai",          label: "AI (Veo3)",   icon: <Wand2 style={{ width: 13, height: 13 }} />, desc: "Generate with Veo3 AI video" },
  { mode: "webcam",      label: "Webcam",      icon: <Mic   style={{ width: 13, height: 13 }} />, desc: "Record yourself on camera" },
  { mode: "broll",       label: "B-Roll",      icon: <Upload style={{ width: 13, height: 13 }} />, desc: "Upload your own footage" },
];

function uid() { return Math.random().toString(36).slice(2, 10); }

function positionColor(pos: string) {
  if (pos === "opening") return "#a78bfa";
  if (pos === "closing") return "#34d399";
  return "#60a5fa";
}

function estimateVoiceDur(narration: string): number {
  const words = narration.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(15, Math.max(4, Math.round((words / 140) * 60) + 1));
}

async function blobUrlToFile(blobUrl: string, filename: string): Promise<File> {
  const res  = await fetch(blobUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "video/webm" });
}

async function uploadMediaFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res  = await fetch("/api/studio/upload-media", { method: "POST", body: fd });
  const json = await res.json();
  if (!json?.url) throw new Error(json?.error || "Upload failed");
  return json.url as string;
}

// ── Mode badge ───────────────────────────────────────────────────

function ModeBadge({ mode }: { mode: SceneMode }) {
  const map: Record<SceneMode, { label: string; color: string }> = {
    media_asset: { label: "Clip",   color: "#60a5fa" },
    ai:          { label: "Veo3",   color: "#a78bfa" },
    webcam:      { label: "Webcam", color: "#34d399" },
    broll:       { label: "B-Roll", color: "#fbbf24" },
  };
  const m = map[mode] || map.media_asset;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, color: m.color,
      background: m.color + "20", border: `1px solid ${m.color}35`,
      padding: "2px 7px", borderRadius: 6,
      fontFamily: "DM Mono, monospace", letterSpacing: "0.08em",
      textTransform: "uppercase",
    }}>
      {m.label}
    </span>
  );
}

// ── Scene type selector ──────────────────────────────────────────

function SceneTypeSelector({
  current, onChange,
}: { current: SceneMode; onChange: (m: SceneMode) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {SCENE_TYPE_OPTIONS.map(opt => (
        <button
          key={opt.mode}
          onClick={() => onChange(opt.mode)}
          title={opt.desc}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 10px",
            background: current === opt.mode ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${current === opt.mode ? "rgba(124,58,237,0.45)" : "rgba(255,255,255,0.09)"}`,
            borderRadius: 8, cursor: "pointer",
            color: current === opt.mode ? "#c4b5fd" : "rgba(255,255,255,0.4)",
            fontSize: 10, fontWeight: 700, fontFamily: "Syne, sans-serif",
            transition: "all 0.15s",
          }}
        >
          {opt.icon}{opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Scene Card ───────────────────────────────────────────────────

function SceneCard({
  scene, index, total, isAddingScene,
  onEdit, onDelete, onMoveUp, onMoveDown,
  onSwapVideo, onRecord, onBrollUpload,
  mediaPool,
}: {
  scene:        StudioScene;
  index:        number;
  total:        number;
  isAddingScene:boolean;
  onEdit:       (p: Partial<StudioScene>) => void;
  onDelete:     () => void;
  onMoveUp:     () => void;
  onMoveDown:   () => void;
  onSwapVideo:  (a: MediaAsset) => void;
  onRecord:     () => void;
  onBrollUpload:(f: File) => void;
  mediaPool:    MediaAsset[];
}) {
  const [showPool,      setShowPool]      = useState(false);
  const [editNarration, setEditNarration] = useState(false);
  const [editText,      setEditText]      = useState(false);
  const [playing,       setPlaying]       = useState(false);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const brollRef  = useRef<HTMLInputElement>(null);
  const pColor    = positionColor(scene.position);
  const estDur    = estimateVoiceDur(scene.narration);

  // Determine preview source
  const previewUrl =
    scene.recordedBlobUrl  ||
    scene.uploadedBlobUrl  ||
    scene.mediaAssetUrl    ||
    null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else         { videoRef.current.play().catch(() => {}); setPlaying(true); }
  };

  const handleModeChange = (newMode: SceneMode) => {
    // When switching TO webcam or broll, clear media asset; keep recorded if switching back
    onEdit({ mode: newMode });
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column",
      transition: "border-color 0.18s, box-shadow 0.18s",
    }}
      onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = "rgba(255,255,255,0.13)"; d.style.boxShadow = "0 4px 28px rgba(0,0,0,0.3)"; }}
      onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = "rgba(255,255,255,0.08)"; d.style.boxShadow = "none"; }}
    >
      {/* Hidden file input — always mounted so brollRef.current is never null */}
      <input
        ref={brollRef}
        type="file"
        accept="video/*,image/jpeg,image/png,image/webp,image/gif"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) { onBrollUpload(f); e.target.value = ""; } }}
      />

      {/* ── Video preview area ── */}
      <div style={{ position: "relative", aspectRatio: "9/16", maxHeight: 240, background: "#06060a", overflow: "hidden", flexShrink: 0 }}>
        {previewUrl ? (
          <>
            {/* Uploaded image — render as <img> not <video> */}
            {scene.uploadedType === "image" && scene.uploadedBlobUrl ? (
              <img
                src={previewUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.82 }}
              />
            ) : (
              <video
                ref={videoRef}
                src={previewUrl}
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.82 }}
                loop muted playsInline
                onEnded={() => setPlaying(false)}
              />
            )}
            {/* Gradient overlay */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)", pointerEvents: "none" }} />
            {/* Uploaded file type badge */}
            {scene.uploadedBlobUrl && (
              <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(251,191,36,0.85)", borderRadius: 6, padding: "2px 7px", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#0c0c0f", fontFamily: "DM Mono, monospace", letterSpacing: "0.06em" }}>
                  {scene.uploadedType === "image" ? "📷 IMAGE" : "🎬 VIDEO"}
                </span>
              </div>
            )}

            {/* Screen text pill */}
            <div style={{ position: "absolute", bottom: 18, left: 10, right: 10, textAlign: "center", pointerEvents: "none" }}>
              <span style={{ display: "inline-block", background: "rgba(0,0,0,0.68)", backdropFilter: "blur(4px)", color: "white", fontWeight: 800, fontSize: 12, padding: "4px 12px", borderRadius: 8, fontFamily: "Syne, sans-serif", letterSpacing: "0.04em", lineHeight: 1.3 }}>
                {scene.screenText}
              </span>
            </div>
            {/* Play button — only for video, not static images */}
            {scene.uploadedType !== "image" && (
              <button onClick={togglePlay} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.58)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                {playing ? <Pause style={{ width: 13, height: 13 }} /> : <Play style={{ width: 13, height: 13, marginLeft: 1 }} fill="white" />}
              </button>
            )}
          </>
        ) : (
          /* ── Empty state by mode ── */
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "rgba(255,255,255,0.12)" }}>
            {scene.mode === "webcam" ? (
              <>
                <Mic style={{ width: 28, height: 28 }} />
                <button
                  onClick={onRecord}
                  style={{ padding: "8px 16px", background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 10, color: "#34d399", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}
                >
                  Record Webcam
                </button>
              </>
            ) : scene.mode === "broll" ? (
              <>
                <Upload style={{ width: 28, height: 28 }} />
                <button
                  onClick={() => brollRef.current?.click()}
                  style={{ padding: "8px 16px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.28)", borderRadius: 10, color: "#fbbf24", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}
                >
                  Upload Footage / Image
                </button>
              </>
            ) : scene.mode === "ai" ? (
              <>
                <Wand2 style={{ width: 28, height: 28 }} />
                <span style={{ fontSize: 10, fontFamily: "DM Mono, monospace", textAlign: "center", padding: "0 12px" }}>
                  Veo3 will generate<br />this scene
                </span>
              </>
            ) : (
              <>
                <Film style={{ width: 28, height: 28 }} />
                <button
                  onClick={() => setShowPool(true)}
                  style={{ padding: "7px 14px", background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.28)", borderRadius: 10, color: "#60a5fa", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}
                >
                  Pick Clip
                </button>
              </>
            )}
          </div>
        )}

        {/* Position badge */}
        <span style={{ position: "absolute", top: 8, left: 10, fontSize: 9, fontWeight: 700, color: pColor, background: pColor + "20", border: `1px solid ${pColor}35`, padding: "2px 8px", borderRadius: 7, fontFamily: "DM Mono, monospace", letterSpacing: "0.09em", textTransform: "uppercase", backdropFilter: "blur(4px)" }}>
          {scene.position}
        </span>
        {/* Scene number + mode */}
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", alignItems: "center", gap: 4, backdropFilter: "blur(4px)" }}>
          <ModeBadge mode={scene.mode} />
          <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.4)", background: "rgba(0,0,0,0.5)", padding: "2px 6px", borderRadius: 6, fontFamily: "DM Mono, monospace" }}>
            {index + 1}/{total}
          </span>
        </div>

        {/* Recorded indicator */}
        {scene.recordedBlobUrl && (
          <div style={{ position: "absolute", bottom: 48, left: "50%", transform: "translateX(-50%)", fontSize: 9, fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", padding: "2px 8px", borderRadius: 6, backdropFilter: "blur(4px)", whiteSpace: "nowrap" }}>
            ✓ Recorded {scene.recordedDurationSeconds ? `· ${scene.recordedDurationSeconds.toFixed(1)}s` : ""}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>

        {/* Scene type selector */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "DM Mono, monospace", marginBottom: 6 }}>
            Scene Type
          </div>
          <SceneTypeSelector current={scene.mode} onChange={handleModeChange} />
        </div>

        {/* Screen text */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "DM Mono, monospace", marginBottom: 4 }}>
            Screen Text
          </div>
          {editText ? (
            <input autoFocus value={scene.screenText}
              onChange={e => onEdit({ screenText: e.target.value.toUpperCase() })}
              onBlur={() => setEditText(false)}
              onKeyDown={e => e.key === "Enter" && setEditText(false)}
              style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(124,58,237,0.45)", borderRadius: 8, padding: "6px 10px", color: "#e4e4e7", fontSize: 12, fontWeight: 800, outline: "none", fontFamily: "Syne, sans-serif", boxSizing: "border-box" }}
            />
          ) : (
            <div onClick={() => setEditText(true)} title="Click to edit"
              style={{ fontSize: 12, fontWeight: 800, color: "#e4e4e7", cursor: "text", padding: "5px 8px", borderRadius: 8, border: "1px solid transparent", transition: "border-color 0.15s", minHeight: 28 }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.09)"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "transparent"}
            >
              {scene.screenText || <span style={{ opacity: 0.22 }}>Click to edit…</span>}
            </div>
          )}
        </div>

        {/* Narration */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "DM Mono, monospace" }}>Narration</span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontFamily: "DM Mono, monospace" }}>~{estDur}s voice</span>
          </div>
          {editNarration ? (
            <textarea autoFocus rows={4} value={scene.narration}
              onChange={e => onEdit({ narration: e.target.value, durationSeconds: estimateVoiceDur(e.target.value) })}
              onBlur={() => setEditNarration(false)}
              style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(124,58,237,0.45)", borderRadius: 8, padding: "7px 10px", color: "rgba(255,255,255,0.72)", fontSize: 11, resize: "none", outline: "none", fontFamily: "DM Mono, monospace", lineHeight: 1.55, boxSizing: "border-box" }}
            />
          ) : (
            <div onClick={() => setEditNarration(true)} title="Click to edit"
              style={{ fontSize: 11, color: "rgba(255,255,255,0.42)", cursor: "text", lineHeight: 1.6, padding: "5px 8px", borderRadius: 8, border: "1px solid transparent", transition: "border-color 0.15s", minHeight: 34 }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "transparent"}
            >
              {scene.narration || <span style={{ opacity: 0.22 }}>Click to edit narration…</span>}
            </div>
          )}
        </div>

        {/* Webcam / Broll action buttons (when mode selected but no clip yet) */}
        {scene.mode === "webcam" && previewUrl && (
          <button onClick={onRecord}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.28)", borderRadius: 9, color: "#34d399", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
            <Mic style={{ width: 11, height: 11 }} /> Re-record Webcam
          </button>
        )}
        {/* Upload / Replace button — visible on ALL modes so user can always swap to their own clip */}
        <button onClick={() => brollRef.current?.click()}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.22)", borderRadius: 9, color: "#fbbf24", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", transition: "background 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(251,191,36,0.18)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(251,191,36,0.08)")}
          title="Upload your own video or image for this scene"
        >
          <Upload style={{ width: 11, height: 11 }} />
          {scene.uploadedBlobUrl ? "Replace Upload" : "Upload Video / Image"}
        </button>

        {/* Action row */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "auto" }}>
          {/* Swap clip (only for media_asset mode) */}
          {(scene.mode === "media_asset" || !previewUrl) && (
            <button onClick={() => setShowPool(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: showPool ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${showPool ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.09)"}`, borderRadius: 8, color: showPool ? "#c4b5fd" : "rgba(255,255,255,0.38)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
              <Film style={{ width: 10, height: 10 }} />
              {scene.mediaAssetUrl ? "Swap clip" : "Pick clip"}
            </button>
          )}

          {/* Move up/down */}
          <button onClick={onMoveUp} disabled={index === 0}
            style={{ padding: "5px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "rgba(255,255,255,0.28)", cursor: index === 0 ? "not-allowed" : "pointer", opacity: index === 0 ? 0.3 : 1, display: "flex", alignItems: "center" }}>
            <ChevronUp style={{ width: 12, height: 12 }} />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1}
            style={{ padding: "5px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "rgba(255,255,255,0.28)", cursor: index === total - 1 ? "not-allowed" : "pointer", opacity: index === total - 1 ? 0.3 : 1, display: "flex", alignItems: "center" }}>
            <ChevronDown style={{ width: 12, height: 12 }} />
          </button>

          {/* Delete */}
          <button onClick={onDelete}
            style={{ marginLeft: "auto", padding: "5px 9px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <Trash2 style={{ width: 11, height: 11 }} />
          </button>
        </div>

        {/* Media pool picker */}
        {showPool && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.055)", paddingTop: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              Media pool ({mediaPool.length} clips)
            </div>
            {mediaPool.length === 0 ? (
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", fontStyle: "italic", margin: 0 }}>No clips — upload videos in Media Assets.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
                {mediaPool.slice(0, 12).map(asset => (
                  <div key={asset.id} onClick={() => { onSwapVideo(asset); setShowPool(false); }}
                    style={{ borderRadius: 8, overflow: "hidden", cursor: "pointer", aspectRatio: "9/16", background: "#08080d", border: scene.mediaAssetId === asset.id ? "2px solid #a78bfa" : "1px solid rgba(255,255,255,0.07)", position: "relative", transition: "border-color 0.15s" }}
                    onMouseEnter={e => { if (scene.mediaAssetId !== asset.id) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.22)"; }}
                    onMouseLeave={e => { if (scene.mediaAssetId !== asset.id) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
                  >
                    <video src={asset.url} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.75 }} muted playsInline />
                    {scene.mediaAssetId === asset.id && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(124,58,237,0.38)" }}>
                        <Check style={{ width: 16, height: 16, color: "white" }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ProjectStudio ────────────────────────────────────────────

export default function ProjectStudio(props: {
  initialConcept?:      string;
  autoGenerateOnMount?: boolean;
  draftId?:             string | null;
  chatId?:              string | null;
  storageKey?:          string;
  companyName?:         string;
  accentColor?:         string;
  brandId?:             string | null;
}) {
  const {
    initialConcept      = "",
    autoGenerateOnMount = false,
    draftId             = null,
    chatId              = null,
    storageKey          = "nf-studio-project",
    companyName         = "NeuroFlow",
    accentColor         = "#7c3aed",
    brandId             = null,
  } = props;

  const [scenes,        setScenes]        = useState<StudioScene[]>([]);
  const [concept,       setConcept]       = useState(initialConcept);
  const [voiceId,       setVoiceId]       = useState(DEFAULT_VOICE_ID);
  const [enableVoice,   setEnableVoice]   = useState(true);   // false = music only, no TTS
  const [mediaPool,     setMediaPool]     = useState<MediaAsset[]>([]);
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [isRendering,   setIsRendering]   = useState(false);
  const [genMeta,       setGenMeta]       = useState<{ category: string; videosUsed: number } | null>(null);
  const [err,           setErr]           = useState<string | null>(null);
  const [success,       setSuccess]       = useState<string | null>(null);
  const [renderUrl,     setRenderUrl]     = useState<string | null>(null);
  // Teleprompter modal
  const [recordSceneIdx, setRecordSceneIdx] = useState<number | null>(null);
  const autoStarted = useRef(false);

  // ── Load media pool ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/media-assets?type=video`);
        if (res.ok) setMediaPool(await res.json());
      } catch (e) {
        console.warn("[Studio] media pool fetch failed:", e);
      }
    })();
  }, []);

  // ── Restore from localStorage ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const p = JSON.parse(saved);
      if (Array.isArray(p.scenes)) setScenes(p.scenes);
      if (p.concept) setConcept(p.concept);
      if (p.voiceId) setVoiceId(p.voiceId);
      if (p.enableVoice !== undefined) setEnableVoice(p.enableVoice);
      if (p.lastRenderUrl) setRenderUrl(p.lastRenderUrl);
    } catch {}
  }, [storageKey]);

  const persist = useCallback((
    next: StudioScene[],
    renderUrlOverride?: string | null,
  ) => {
    setScenes(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        concept, voiceId, enableVoice, scenes: next,
        lastRenderUrl: renderUrlOverride !== undefined ? renderUrlOverride : renderUrl,
        savedAt: Date.now(),
      }));
    } catch {}
  }, [storageKey, concept, voiceId, renderUrl]);

  // ── Generate all scenes ──
  const generate = async (incomingConcept?: string) => {
    const c = (incomingConcept ?? concept).trim();
    if (!c) return;
    setIsGenerating(true); setErr(null); setSuccess(null);
    try {
      const res = await fetch("/api/studio/generate-scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: c, count: 4, companyName, accentColor, brandId }),
      });
      const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
      if (!json.ok) throw new Error(json.error || "Generation failed");
      persist(json.scenes.map((s: any) => ({ ...s, id: s.id || uid() })));
      if (json.meta) setGenMeta(json.meta);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!autoGenerateOnMount || !initialConcept.trim() || scenes.length || autoStarted.current) return;
    autoStarted.current = true;
    generate(initialConcept);
  }, [autoGenerateOnMount, initialConcept]);

  // ── Add ONE AI scene (synced to existing) ──
  const addScene = async () => {
    setIsAddingScene(true); setErr(null);
    try {
      // Send only lightweight fields — no blob URLs, no overlays
      const lightScenes = scenes.map(s => ({
        index:         s.index,
        position:      s.position,
        screenText:    s.screenText,
        narration:     s.narration,
        mode:          s.mode,
        mediaAssetId:  s.mediaAssetId,
        mediaCategory: s.mediaCategory,
      }));

      // Dedicated single-scene route — no ambiguity with addOne flag
      const res = await fetch("/api/studio/add-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept:        concept || companyName,
          companyName,
          accentColor,
          brandId,
          existingScenes: lightScenes,
        }),
      });
      const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
      if (!json.ok || !json.scene) throw new Error(json.error || "No scene returned");

      const newScene: StudioScene = { ...json.scene, id: json.scene.id || uid() };
      const next = [...scenes, newScene];
      next.forEach((s, i) => {
        s.index    = i;
        s.position = (i === 0 ? "opening" : i === next.length - 1 ? "closing" : "middle") as StudioScene["position"];
      });
      persist(next);
    } catch (e: any) {
      setErr(`Add scene: ${e.message}`);
    } finally {
      setIsAddingScene(false);
    }
  };

  const editScene = (idx: number, patch: Partial<StudioScene>) =>
    persist(scenes.map((s, i) => i === idx ? { ...s, ...patch } : s));

  const deleteScene = (idx: number) => {
    const next = scenes.filter((_, i) => i !== idx).map((s, i) => ({
      ...s, index: i,
      position: (i === 0 ? "opening" : i === scenes.length - 2 ? "closing" : "middle") as StudioScene["position"],
    }));
    persist(next);
  };

  const moveScene = (idx: number, dir: -1 | 1) => {
    const next  = [...scenes];
    const swap  = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    next.forEach((s, i) => {
      s.index    = i;
      s.position = (i === 0 ? "opening" : i === next.length - 1 ? "closing" : "middle") as StudioScene["position"];
    });
    persist(next);
  };

  const swapVideo = (sceneIdx: number, asset: MediaAsset) =>
    editScene(sceneIdx, { mediaAssetId: asset.id, mediaAssetUrl: asset.url, mediaCategory: asset.category, mode: "media_asset" });

  // ── Webcam recording ──
  const openRecorder  = (idx: number) => setRecordSceneIdx(idx);
  const closeRecorder = ()             => setRecordSceneIdx(null);

  const segmentsForRecorder = recordSceneIdx !== null && scenes[recordSceneIdx]
    ? [{ narration: scenes[recordSceneIdx].narration, screenText: scenes[recordSceneIdx].screenText, durationSeconds: scenes[recordSceneIdx].durationSeconds, preferWebcam: scenes[recordSceneIdx].mode === "webcam" }]
    : [];

  const onRecorderComplete = (clips: RecordedClip[]) => {
    if (recordSceneIdx === null) return;
    const clip = clips[0];
    if (!clip) { closeRecorder(); return; }

    // Revoke old blob if any
    const prev = scenes[recordSceneIdx]?.recordedBlobUrl;
    if (prev) { try { URL.revokeObjectURL(prev); } catch {} }

    const blobUrl = URL.createObjectURL(clip.blob);
    editScene(recordSceneIdx, {
      recordedBlobUrl:         blobUrl,
      recordedDurationSeconds: clip.durationSeconds,
      mode:                    clip.isWebcam ? "webcam" : "broll",
      durationSeconds:         clip.durationSeconds || estimateVoiceDur(scenes[recordSceneIdx].narration),
    });
    closeRecorder();
  };

  // ── B-Roll / image upload ──
  const onBrollUpload = (sceneIdx: number, file: File) => {
    const prev = scenes[sceneIdx]?.uploadedBlobUrl;
    if (prev) { try { URL.revokeObjectURL(prev); } catch {} }
    const blobUrl      = URL.createObjectURL(file);
    const uploadedType: "video" | "image" = file.type.startsWith("image/") ? "image" : "video";
    // Always switch mode to broll so render route picks uploadedUrl over mediaAssetUrl
    editScene(sceneIdx, {
      uploadedBlobUrl:  blobUrl,
      uploadedType,
      uploadedMimeType: file.type,   // store real MIME for correct extension at render
      mode:             "broll",
      mediaAssetUrl:    null,        // clear old asset so priority 2 wins cleanly
      mediaAssetId:     null,
    });
  };

  // ── Render ──
  const render = async () => {
    if (!scenes.length) return;
    setIsRendering(true); setErr(null); setSuccess(null);
    try {
      // Step 1: upload all local blob URLs to Spaces so the server has real URLs
      const recordedUrls: Record<number, string> = {};
      const uploadedUrls: Record<number, { url: string; type: "video" | "image" }> = {};
      const webcamClips: any[] = [];

      for (const s of scenes) {
        if (s.recordedBlobUrl) {
          const file = await blobUrlToFile(s.recordedBlobUrl, `scene-${s.index}-${s.mode}.webm`);
          const url  = await uploadMediaFile(file);
          recordedUrls[s.index] = url;
          webcamClips.push({
            segmentIndex:    s.index,
            url,
            hasAudio:        true,
            durationSeconds: s.recordedDurationSeconds || s.durationSeconds,
            isWebcam:        s.mode === "webcam",
          });
        }
        if (s.uploadedBlobUrl && s.uploadedType) {
          // Use real MIME type for correct extension — CDNs reject mismatched extensions
          const mimeExtMap: Record<string, string> = {
            "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
            "image/gif": "gif", "image/heic": "heic",
            "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
          };
          const ext  = s.uploadedMimeType
            ? (mimeExtMap[s.uploadedMimeType] ?? (s.uploadedType === "image" ? "jpg" : "mp4"))
            : (s.uploadedType === "image" ? "jpg" : "mp4");
          const file = await blobUrlToFile(s.uploadedBlobUrl, `scene-${s.index}-upload.${ext}`);
          const url  = await uploadMediaFile(file);
          uploadedUrls[s.index] = { url, type: s.uploadedType };
        }
      }

      // Step 2: build storyboardScenes — no blob URLs, only server-accessible URLs
      const storyboardScenes = scenes.map((s) => ({
        mode:          s.mode,
        aiPrompt:      s.aiPrompt      || null,
        mediaAssetUrl: s.mediaAssetUrl || null,
        mediaAssetId:  s.mediaAssetId  || null,
        mediaCategory: s.mediaCategory || null,
        recordedUrl:   recordedUrls[s.index] || null,
        uploadedUrl:   uploadedUrls[s.index]?.url  || null,
        uploadedType:  uploadedUrls[s.index]?.type || null,
        overlays:      s.overlays || null,
      }));

      // Step 3: preGeneratedScript from Studio scenes
      const preGeneratedScript = {
        segments: scenes.map((s) => ({
          screenText:        s.screenText,
          narration:         s.narration,
          durationSeconds:   s.durationSeconds,
          position:          s.position,
          sceneEnergy:       s.sceneEnergy,
          animationStyle:    s.animationStyle,
          templateHint:      s.templateHint,
          beats:             s.beats || [],
          preferWebcam:      s.mode === "webcam",
          visualDescription: s.aiPrompt || s.narration,
          pexelsQuery:       s.mediaCategory || "business professional",
          ctaText:           s.position === "closing" ? s.screenText : "",
          aiPrompt:          s.aiPrompt || "",
        })),
        fullNarration: scenes.map((s) => s.narration).join(" "),
        companyName,
        accentColor,
        voiceId,
        styleDNA: { primaryFont: "Syne", tone: "professional", cinematicMood: "cinematic" },
      };

      const res = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          accentColor,
          brandId,
          captionsMode:      "off",
          useVeo3:           false,
          voiceId,
          enableVoice,
          webcamClips,
          storyboardScenes,
          preGeneratedScript,
        }),
      });

      const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
      if (!json.ok) throw new Error(json.error || "Render failed");

      setRenderUrl(json.url);
      persist(scenes, json.url);

      if (draftId) {
        await attachMediaToContentItem(draftId, {
          media_type: "video", media_url: json.url,
          media_urls: [json.url], media_provider: "render_pipeline", media_caption: null,
        });
        setSuccess("Video rendered and attached to draft.");
      } else {
        setSuccess("Video rendered successfully.");
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setIsRendering(false);
    }
  };

  const totalEstDur  = scenes.reduce((a, s) => a + estimateVoiceDur(s.narration), 0);
  const missingClips = scenes.filter(s => !s.mediaAssetUrl && !s.aiPrompt && !s.recordedBlobUrl && !s.uploadedBlobUrl).length;

  // ── Styles ──
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');
    .stu *{box-sizing:border-box;}
    .stu{font-family:'Syne',sans-serif;background:#0c0c0f;min-height:100vh;color:#e4e4e7;}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
    .stu-fade{animation:fadeUp 0.22s ease both;}
    .stu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;}
    @media(max-width:560px){.stu-grid{grid-template-columns:repeat(2,1fr);gap:8px;}}
    .stu-select{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.65);font-family:'Syne',sans-serif;font-size:11px;font-weight:700;border-radius:10px;padding:8px 28px 8px 12px;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 9px center;outline:none;}
    .stu-select option{background:#1a1a2e;}
    .stu-ta{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:14px;padding:14px 16px;color:#e4e4e7;font-family:'DM Mono',monospace;font-size:13px;resize:none;outline:none;line-height:1.6;transition:border-color 0.15s;}
    .stu-ta:focus{border-color:rgba(124,58,237,0.5);}
    .stu-ta::placeholder{color:rgba(255,255,255,0.18);}
    .stu-spin{width:13px;height:13px;border:2px solid rgba(255,255,255,0.15);border-top-color:white;border-radius:50%;display:inline-block;animation:spin 0.7s linear infinite;}
    .stu-spin-v{width:12px;height:12px;border:2px solid rgba(124,58,237,0.3);border-top-color:#a78bfa;border-radius:50%;display:inline-block;animation:spin 0.7s linear infinite;}
  `;

  // ── Empty state ──
  if (!scenes.length && !isGenerating) {
    return (
      <>
        <style>{css}</style>
        <div className="stu" style={{ padding: "32px 24px" }}>
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(124,58,237,0.7)", marginBottom: 6, fontFamily: "DM Mono, monospace" }}>NeuroFlow · Studio</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px", lineHeight: 1.1 }}>Video Studio</h1>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 28 }}>
              Describe your video concept. Gemini writes the script — then record yourself, upload clips, or let AI generate the visuals.
            </p>

            {mediaPool.length > 0 ? (
              <div className="stu-fade" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.18)", borderRadius: 12, marginBottom: 18, fontSize: 11, color: "#34d399", fontWeight: 700 }}>
                <Check style={{ width: 12, height: 12 }} />
                {mediaPool.length} video clip{mediaPool.length !== 1 ? "s" : ""} ready in your media pool
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 12, marginBottom: 18, fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>
                <AlertTriangle style={{ width: 12, height: 12 }} />
                No video clips — upload in Media Assets, or use Webcam / AI scenes
              </div>
            )}

            <textarea className="stu-ta" rows={5} value={concept}
              onChange={e => setConcept(e.target.value)}
              placeholder={`Example: A premium ad for ${companyName} showing how we answer missed calls and book appointments automatically…`}
            />

            {err && (
              <div style={{ padding: "10px 14px", marginTop: 10, borderRadius: 12, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.08)", fontSize: 12, color: "#f87171" }}>{err}</div>
            )}

            <button onClick={() => generate()} disabled={!concept.trim()}
              style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", background: concept.trim() ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.06)", border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 800, cursor: concept.trim() ? "pointer" : "not-allowed", fontFamily: "Syne, sans-serif" }}>
              <Wand2 style={{ width: 14, height: 14 }} />
              Generate Scenes
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Generating skeleton ──
  if (isGenerating) {
    return (
      <>
        <style>{css}</style>
        <div className="stu" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", gap: 16 }}>
          <span className="stu-spin" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.45)" }}>Generating scenes…</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace" }}>Gemini is writing scripts + fetching your media clips</div>
        </div>
      </>
    );
  }

  // ── Main editor ──
  return (
    <>
      <style>{css}</style>
      <div className="stu">

        {/* ── Sticky header ── */}
        <div style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(12,12,15,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "14px 22px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9, color: "rgba(124,58,237,0.7)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "DM Mono, monospace" }}>Studio</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#e4e4e7", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 340 }}>
                {concept.slice(0, 65)}{concept.length > 65 ? "…" : ""}
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", marginTop: 2, fontFamily: "DM Mono, monospace" }}>
                {scenes.length} scenes · ~{totalEstDur}s
                {genMeta ? ` · ${genMeta.category} · ${genMeta.videosUsed} clips` : ""}
                {chatId  ? ` · chat ${chatId.slice(0, 8)}`   : ""}
                {draftId ? ` · draft ${draftId.slice(0, 8)}` : ""}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* ── Voice toggle + selector ── */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "5px 8px" }}>
                {/* Toggle pill */}
                <button
                  onClick={() => setEnableVoice(v => !v)}
                  title={enableVoice ? "Disable voice (music only)" : "Enable AI voiceover"}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
                    borderRadius: 7, border: "none", cursor: "pointer", transition: "all 0.18s",
                    background: enableVoice
                      ? "linear-gradient(135deg,rgba(124,58,237,0.35),rgba(79,70,229,0.35))"
                      : "rgba(255,255,255,0.05)",
                    color: enableVoice ? "#c4b5fd" : "rgba(255,255,255,0.3)",
                    fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700,
                    outline: enableVoice ? "1px solid rgba(124,58,237,0.4)" : "1px solid transparent",
                  }}
                >
                  {/* animated mic icon */}
                  <span style={{ position: "relative", width: 13, height: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="9" y="2" width="6" height="11" rx="3" />
                      <path d="M19 10a7 7 0 0 1-14 0" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                      <line x1="8"  y1="22" x2="16" y2="22" />
                    </svg>
                    {enableVoice && (
                      <span style={{ position: "absolute", top: -2, right: -2, width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", animation: "voxpulse 1.4s ease-in-out infinite" }} />
                    )}
                  </span>
                  {enableVoice ? "Voice ON" : "Music Only"}
                </button>

                {/* Voice selector — only shown when voice is enabled */}
                {enableVoice && (
                  <select
                    className="stu-select"
                    value={voiceId}
                    onChange={e => setVoiceId(e.target.value)}
                    style={{ maxWidth: 180 }}
                  >
                    <optgroup label="Female">
                      {VOICE_OPTIONS.filter(v => v.label.includes("Female")).map(v => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Male">
                      {VOICE_OPTIONS.filter(v => v.label.includes("Male")).map(v => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </optgroup>
                  </select>
                )}
              </div>

              {/* Add Scene (AI) */}
              <button onClick={addScene} disabled={isAddingScene}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 13px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, cursor: isAddingScene ? "wait" : "pointer", fontFamily: "Syne, sans-serif" }}>
                {isAddingScene ? <span className="stu-spin-v" /> : <Plus style={{ width: 12, height: 12 }} />}
                {isAddingScene ? "Writing…" : "Add Scene"}
              </button>

              {/* Regenerate */}
              <button onClick={() => generate()} disabled={isGenerating}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 13px", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 10, color: "#c4b5fd", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
                <RefreshCw style={{ width: 11, height: 11 }} />Regenerate
              </button>

              {/* Reset */}
              <button onClick={() => { setScenes([]); setRenderUrl(null); setSuccess(null); setErr(null); try { localStorage.removeItem(storageKey); } catch {} }}
                style={{ padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 10, color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
                Reset
              </button>

              {/* Render */}
              <button onClick={render} disabled={isRendering || !scenes.length}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: isRendering ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", borderRadius: 11, color: "#fff", fontSize: 12, fontWeight: 800, cursor: isRendering ? "not-allowed" : "pointer", fontFamily: "Syne, sans-serif" }}>
                {isRendering ? <span className="stu-spin" /> : <Sparkles style={{ width: 13, height: 13 }} />}
                {isRendering ? "Rendering…" : draftId ? "Render + Attach" : "Render Video"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Alerts ── */}
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 22px 0" }}>
          {missingClips > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 12, marginBottom: 10, fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>
              <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0 }} />
              {missingClips} scene{missingClips !== 1 ? "s" : ""} missing visuals — will render as color card
            </div>
          )}
          {err && (
            <div className="stu-fade" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 12, marginBottom: 10, fontSize: 12, color: "#f87171", fontWeight: 700 }}>
              <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} />{err}
              <button onClick={() => setErr(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.5, display: "flex" }}><X style={{ width: 11, height: 11 }} /></button>
            </div>
          )}
          {success && (
            <div className="stu-fade" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.22)", borderRadius: 12, marginBottom: 10, fontSize: 12, color: "#34d399", fontWeight: 700 }}>
              <Check style={{ width: 13, height: 13, flexShrink: 0 }} />{success}
              <button onClick={() => setSuccess(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.5, display: "flex" }}><X style={{ width: 11, height: 11 }} /></button>
            </div>
          )}
        </div>

        {/* ── Last render ── */}
        {renderUrl && (
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 22px 14px" }}>
            <div style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.14)", borderRadius: 16, padding: 16, display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
              <video src={renderUrl} controls playsInline style={{ borderRadius: 12, maxHeight: 300, maxWidth: "100%", background: "#000", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#34d399", marginBottom: 8 }}>Latest Render</div>
                <a href={renderUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#60a5fa", textDecoration: "none", fontWeight: 700 }}>
                  <ArrowUpRight style={{ width: 11, height: 11 }} />Open in new tab
                </a>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", marginTop: 8, fontFamily: "DM Mono, monospace", wordBreak: "break-all" }}>{renderUrl}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Scene grid ── */}
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 22px 48px" }}>
          <div className="stu-grid">
            {scenes.map((scene, i) => (
              <div key={scene.id} className="stu-fade" style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}>
                <SceneCard
                  scene={scene} index={i} total={scenes.length}
                  isAddingScene={isAddingScene}
                  onEdit={patch => editScene(i, patch)}
                  onDelete={() => deleteScene(i)}
                  onMoveUp={() => moveScene(i, -1)}
                  onMoveDown={() => moveScene(i, 1)}
                  onSwapVideo={asset => swapVideo(i, asset)}
                  onRecord={() => openRecorder(i)}
                  onBrollUpload={file => onBrollUpload(i, file)}
                  mediaPool={mediaPool}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Teleprompter / Webcam recording modal ── */}
      {recordSceneIdx !== null && (
        <TeleprompterModal
          segments={segmentsForRecorder as any}
          onComplete={onRecorderComplete}
          onSkip={closeRecorder}
          onClose={closeRecorder}
          accentColor={accentColor}
          companyName={companyName}
        />
      )}
    </>
  );
}