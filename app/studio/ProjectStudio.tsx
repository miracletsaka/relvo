"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { VideoProject, VideoScene, SceneOverlayMedia } from "@/lib/studio/types";
import {
  createNewProject,
  loadProject,
  resetProject,
  saveProject,
} from "@/lib/studio/projectStore";
import SceneCard from "./SceneCard";
import TeleprompterModal, { type RecordedClip } from "./TeleprompterModal";
import { buildPreGeneratedScript } from "@/lib/studio/buildPreGeneratedScript";
import { generateScenes } from "@/lib/studio/generateScenesClient";
import {
  addScene as addSceneMut,
  deleteScene as deleteSceneMut,
  duplicateScene as duplicateSceneMut,
  updateScene as updateSceneMut,
  mergeGeneratedScenes,
  addOverlayToScene,
} from "@/lib/studio/projectMutations";
import { generateThumbnailForScene } from "@/lib/studio/generateThumbnailForScene";

type VoiceSegmentLike = {
  narration: string;
  screenText: string;
  durationSeconds: number;
  preferWebcam?: boolean;
};

// ── Robust blob → File: fetch first, XHR fallback ─────────────────────────────
async function blobUrlToFile(blobUrl: string, filename: string): Promise<File> {
  try {
    const res = await fetch(blobUrl);
    if (!res.ok) throw new Error("fetch not ok");
    const blob = await res.blob();
    const type = blob.type || (filename.endsWith(".webm") ? "video/webm" : "application/octet-stream");
    return new File([blob], filename, { type });
  } catch {
    const blob: Blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", blobUrl, true);
      xhr.responseType = "blob";
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new Error("Failed to load blob URL"));
      xhr.send();
    });
    const type = blob.type || (filename.endsWith(".webm") ? "video/webm" : "application/octet-stream");
    return new File([blob], filename, { type });
  }
}

// ── Upload helper (uses /api/studio/upload-media) ─────────────────────────────
async function uploadMediaFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/studio/upload-media", { method: "POST", body: fd });
  const json = await res.json();
  if (!json?.ok || !json?.url) throw new Error(json?.error || "Upload failed");
  return json.url as string;
}

export default function ProjectStudio() {
  const [project, setProject] = useState<VideoProject | null>(null);

  // Concept entry (shown when there is no project yet)
  const [concept, setConcept] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // which scene is being recorded (null = no recorder open)
  const [recordSceneIndex, setRecordSceneIndex] = useState<number | null>(null);

  // render state
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const existing = loadProject();
    if (existing) {
      setProject(existing);
      setConcept(existing.concept || "");
      return;
    }
    setProject(null);
  }, []);

  // Build ONE segment for the selected scene (so we record just that scene)
  const segmentsForRecorder: VoiceSegmentLike[] = useMemo(() => {
    if (!project || recordSceneIndex === null) return [];
    const s = project.scenes[recordSceneIndex];
    if (!s) return [];
    return [
      {
        narration: s.narration,
        screenText: s.screenText,
        durationSeconds: s.durationSeconds,
        preferWebcam: s.mode === "webcam",
      },
    ];
  }, [project, recordSceneIndex]);

  // ── Persist helper ──────────────────────────────────────────────────────────
  const persist = (next: VideoProject) => {
    saveProject(next);
    setProject(next);
  };

  // ── Concept → project creation ──────────────────────────────────────────────
  const createProjectFromConcept = async () => {
    setGenError(null);
    setIsGenerating(true);
    try {
      const companyName = "NeuroFlow";
      const accentColor = "#7c3aed";

      const { scenes } = await generateScenes({
        concept,
        count: 4,
        companyName,
        accentColor,
      });

      const starter = createNewProject({
        companyName,
        accentColor,
        scenes: scenes.map((s: any, i: number) => ({
          ...s,
          index:         i,
          mode:          "ai" as const,
          status:        "ready" as const,
          aiPrompt:      s.aiPrompt,
          beats:         s.beats         ?? [],
          sceneEnergy:   s.sceneEnergy   ?? 0.7,
          animationStyle:s.animationStyle ?? "calm",
          templateHint:  s.templateHint  ?? "generic",
          position:      s.position      ?? (i === 0 ? "opening" : i === scenes.length - 1 ? "closing" : "middle"),
        })),
      });

      const nextProject: VideoProject = {
        ...starter,
        concept,
        voiceId:      "rachel",
        captionsMode: "off",
      };

      persist(nextProject);
    } catch (e: any) {
      setGenError(e?.message || "Failed to generate scenes");
    } finally {
      setIsGenerating(false);
    }
  };

  const onReset = () => {
    resetProject();
    setProject(null);
  };

  // ── Scene mutations ─────────────────────────────────────────────────────────
  const onEditScene = (sceneIndex: number, patch: Partial<VideoScene>) => {
    if (!project) return;
    persist(updateSceneMut(project, sceneIndex, patch));
  };

  const openRecorder  = (sceneIndex: number) => setRecordSceneIndex(sceneIndex);
  const closeRecorder = () => setRecordSceneIndex(null);
  const onSkipRecorder = () => setRecordSceneIndex(null);

  const onRecorderComplete = (clips: RecordedClip[]) => {
    if (!project || recordSceneIndex === null) return;

    const clip = clips[0];
    if (!clip) {
      setRecordSceneIndex(null);
      return;
    }

    const blobUrl = URL.createObjectURL(clip.blob);

    // Revoke previous preview URL to avoid memory leaks
    const prev = project.scenes[recordSceneIndex]?.recordedBlobUrl;
    if (prev) { try { URL.revokeObjectURL(prev); } catch {} }

    persist(
      updateSceneMut(project, recordSceneIndex, {
        status: "recorded",
        mode: clip.isWebcam ? "webcam" : "broll",
        source: "recorded",
        recordedBlobUrl: blobUrl,
        recordedDurationSeconds: clip.durationSeconds,
      })
    );
    setRecordSceneIndex(null);
  };

  // Add a scene and regenerate all captions to keep flow consistent
  const addSceneAndRegenerate = async () => {
    if (!project) return;
    const next1 = addSceneMut(project, "ai");
    persist(next1);

    try {
      const { scenes } = await generateScenes({
        concept: next1.concept || concept,
        count: next1.scenes.length,
        companyName: next1.companyName,
        accentColor: next1.accentColor,
      });
      persist(mergeGeneratedScenes(next1, scenes.map((s: any, i: number) => ({
        ...s,
        index:         i,
        mode:          s.mode ?? "ai",
        status:        "ready",
        aiPrompt:      s.aiPrompt,
        beats:         s.beats         ?? [],
        sceneEnergy:   s.sceneEnergy   ?? 0.7,
        animationStyle:s.animationStyle ?? "calm",
        templateHint:  s.templateHint  ?? "generic",
      }))));
    } catch (e) {
      // keep added scene as-is if generation fails
      console.warn(e);
    }
  };

  const deleteScene    = (index: number) => { if (!project) return; persist(deleteSceneMut(project, index)); };
  const duplicateScene = (index: number) => { if (!project) return; persist(duplicateSceneMut(project, index)); };

  // ── Upload scene background ─────────────────────────────────────────────────
  const onUploadSceneMedia = async (sceneIndex: number, file: File) => {
    if (!project) return;
    const blobUrl = URL.createObjectURL(file);

    const prev = project.scenes[sceneIndex]?.uploadedBlobUrl;
    if (prev) { try { URL.revokeObjectURL(prev); } catch {} }

    const uploadedType: "video" | "image" = file.type.startsWith("image/") ? "image" : "video";

    const next = updateSceneMut(project, sceneIndex, {
      source: "uploaded",
      uploadedBlobUrl: blobUrl,
      uploadedType,
    });
    persist(next);

    // Auto-regenerate thumbnail
    try {
      const thumb = await generateThumbnailForScene(next, sceneIndex);
      persist(updateSceneMut(next, sceneIndex, { thumbnailDataUrl: thumb, thumbnailUpdatedAt: Date.now() }));
    } catch {}
  };

  // ── Add overlay (PIP) — default top-right, full scene duration ──────────────
  const onAddOverlay = async (sceneIndex: number, file: File) => {
    if (!project) return;
    const blobUrl = URL.createObjectURL(file);
    const type: "video" | "image" = file.type.startsWith("image/") ? "image" : "video";
    const scene = project.scenes[sceneIndex];
    const dur = scene?.durationSeconds || 6;

    const overlay: Omit<SceneOverlayMedia, "id"> = {
      type,
      blobUrl,
      startSeconds: 0,
      endSeconds: Math.max(1, dur),
      x: 0.58,
      y: 0.10,
      w: 0.36,
      h: 0.36,
      radius: 18,
    };

    persist(addOverlayToScene(project, sceneIndex, overlay));
  };

  // ── Refresh thumbnail ───────────────────────────────────────────────────────
  const refreshPreview = async (index: number) => {
    if (!project) return;
    const thumb = await generateThumbnailForScene(project, index);
    persist(updateSceneMut(project, index, { thumbnailDataUrl: thumb, thumbnailUpdatedAt: Date.now() }));
  };

  // ── Render Draft ────────────────────────────────────────────────────────────
  // 1) Upload recorded clips
  // 2) Upload uploaded scene backgrounds
  // 3) Upload overlays
  // 4) Call /api/render-video
  const renderDraft = async () => {
    if (!project) return;
    setRenderError(null);
    setIsRendering(true);

    try {
      const webcamClips: any[] = [];
      const uploadedSceneMedia: Array<{ index: number; url: string; type: "video" | "image" }> = [];
      const uploadedOverlaysByScene: Record<
        number,
        Array<{
          id: string;
          type: "video" | "image";
          url: string;
          startSeconds: number;
          endSeconds: number;
          x: number;
          y: number;
          w: number;
          h: number;
          radius?: number;
        }>
      > = {};

      for (const s of project.scenes) {
        // Recorded webcam / b-roll clip
        if (s.recordedBlobUrl) {
          const file = await blobUrlToFile(s.recordedBlobUrl, `scene-${s.index + 1}-${s.mode}.webm`);
          const url  = await uploadMediaFile(file);
          webcamClips.push({
            segmentIndex: s.index,
            url,
            hasAudio: true,
            durationSeconds: s.recordedDurationSeconds || s.durationSeconds || 6,
            isWebcam: s.mode === "webcam",
          });
        }

        // Uploaded scene background
        if (s.source === "uploaded" && s.uploadedBlobUrl && s.uploadedType) {
          const ext  = s.uploadedType === "image" ? "png" : "webm";
          const file = await blobUrlToFile(s.uploadedBlobUrl, `scene-${s.index + 1}-uploaded.${ext}`);
          const url  = await uploadMediaFile(file);
          uploadedSceneMedia.push({ index: s.index, url, type: s.uploadedType });
        }

        // Per-scene overlays
        if (s.overlays && s.overlays.length > 0) {
          for (const o of s.overlays) {
            if (!o.blobUrl) continue;
            const ext  = o.type === "image" ? "png" : "webm";
            const file = await blobUrlToFile(o.blobUrl, `scene-${s.index + 1}-overlay-${o.id}.${ext}`);
            const url  = await uploadMediaFile(file);

            uploadedOverlaysByScene[s.index] = uploadedOverlaysByScene[s.index] || [];
            uploadedOverlaysByScene[s.index].push({
              id: o.id,
              type: o.type,
              url,
              startSeconds: o.startSeconds,
              endSeconds: o.endSeconds,
              x: o.x,
              y: o.y,
              w: o.w,
              h: o.h,
              radius: o.radius,
            });
          }
        }
      }

      const preGeneratedScript = buildPreGeneratedScript(project);

      const res = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body_text: project.scenes.map((s) => s.narration).join(" "),
          companyName: project.companyName,
          accentColor: project.accentColor,
          useVeo3: true,
          voiceId: project.voiceId || project.brandKit?.voiceId || "rachel",
          webcamClips,
          preGeneratedScript,
          // uploaded backgrounds + overlays
          uploadedSceneMedia,
          uploadedOverlaysByScene,
          // captions off by default
          captionsMode: "off",
          // full storyboard so server knows mode per scene (ai / webcam / broll)
          storyboardScenes: project.scenes,
        }),
      });

      const json = await res.json();
      if (!json?.ok || !json?.url) throw new Error(json?.error || "Render failed");

      persist({ ...project, lastRenderUrl: json.url, lastRenderMeta: json.meta });
    } catch (e: any) {
      setRenderError(e?.message || "Render failed");
    } finally {
      setIsRendering(false);
    }
  };

  // ── No project: concept entry ───────────────────────────────────────────────
  if (!project) {
    return (
      <div style={{ background: "#0b0b0b", minHeight: "100vh", color: "#fff", padding: 24 }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Create a new video</div>
          <div style={{ opacity: 0.7, marginBottom: 18 }}>
            Write the concept/brief. We'll generate 2 AI scenes (Veo) with captions, then you can add more scenes.
          </div>

          <textarea
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Example: A premium ad for Relvo that answers missed calls and books appointments automatically for plumbers in the UK…"
            rows={6}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: 14,
              color: "#fff",
              outline: "none",
              lineHeight: 1.5,
            }}
          />

          {genError && (
            <div style={{ padding: 14, marginTop: 12, borderRadius: 12, border: "1px solid rgba(255,80,80,0.35)", background: "rgba(255,50,50,0.08)" }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Generate failed</div>
              <div style={{ opacity: 0.85, fontSize: 13 }}>{genError}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              onClick={createProjectFromConcept}
              disabled={isGenerating || !concept.trim()}
              style={{
                background: isGenerating || !concept.trim() ? "rgba(255,255,255,0.08)" : "#7c3aed",
                border: "none",
                color: "#fff",
                padding: "12px 16px",
                borderRadius: 12,
                cursor: isGenerating || !concept.trim() ? "not-allowed" : "pointer",
                fontWeight: 900,
              }}
            >
              {isGenerating ? "Generating…" : "Generate scenes"}
            </button>

            <button
              onClick={() => { resetProject(); setProject(null); }}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.8)",
                padding: "12px 16px",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Project view ────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#0b0b0b", minHeight: "100vh", color: "#fff" }}>
      {/* Header */}
      <div
        style={{
          padding: 20,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.2 }}>Studio Storyboard</div>
          <div style={{ fontSize: 12, opacity: 0.65 }}>
            {project.companyName} • {project.scenes.length} scenes •{" "}
            {new Date(project.createdAt).toLocaleString()}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={addSceneAndRegenerate}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.92)",
              padding: "10px 14px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            + Add Scene (AI) + Regenerate
          </button>

          <button
            onClick={renderDraft}
            disabled={isRendering}
            style={{
              background: isRendering ? "rgba(255,255,255,0.08)" : project.accentColor,
              border: "none",
              color: "#fff",
              padding: "10px 14px",
              borderRadius: 10,
              cursor: isRendering ? "not-allowed" : "pointer",
              fontWeight: 900,
            }}
          >
            {isRendering ? "Rendering…" : "Render Draft"}
          </button>

          <button
            onClick={onReset}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.8)",
              padding: "10px 14px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            Reset Project
          </button>
        </div>
      </div>

      {/* Render error */}
      {renderError && (
        <div style={{ padding: 16, margin: 20, borderRadius: 12, border: "1px solid rgba(255,80,80,0.35)", background: "rgba(255,50,50,0.08)" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Render failed</div>
          <div style={{ opacity: 0.85, fontSize: 13 }}>{renderError}</div>
        </div>
      )}

      {/* Latest render preview */}
      {project.lastRenderUrl && (
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>Latest render</div>
          <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, overflow: "hidden", background: "rgba(0,0,0,0.35)" }}>
            <video src={project.lastRenderUrl} controls playsInline style={{ width: "100%", maxHeight: 520, display: "block" }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7, wordBreak: "break-all" }}>
            {project.lastRenderUrl}
          </div>
        </div>
      )}

      {/* Scene grid */}
      <div style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {project.scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              accentColor={project.accentColor}
              onEdit={(patch) => onEditScene(scene.index, patch)}
              onRecord={() => openRecorder(scene.index)}
              onDelete={() => deleteScene(scene.index)}
              onDuplicate={() => duplicateScene(scene.index)}
              onUploadSceneMedia={(file) => onUploadSceneMedia(scene.index, file)}
              onAddOverlay={(file) => onAddOverlay(scene.index, file)}
              onRefreshPreview={() => refreshPreview(scene.index)}
            />
          ))}
        </div>
      </div>

      {/* Recorder modal (records ONE selected scene) */}
      {recordSceneIndex !== null && (
        <TeleprompterModal
          segments={segmentsForRecorder as any}
          onComplete={onRecorderComplete}
          onSkip={onSkipRecorder}
          onClose={closeRecorder}
          accentColor={project.accentColor}
          companyName={project.companyName}
        />
      )}
    </div>
  );
}