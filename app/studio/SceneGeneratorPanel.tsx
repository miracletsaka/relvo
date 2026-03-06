"use client";

import React, { useState } from "react";
import type { VideoProject } from "@/lib/studio/types";
import { generateScenes } from "@/lib/studio/generateScenesClient";
import { addSceneAfter, replaceScenes } from "@/lib/studio/projectMutations";
import { saveProject } from "@/lib/studio/projectStore";

export default function SceneGeneratorPanel({
  project,
  setProject,
}: {
  project: VideoProject;
  setProject: (p: VideoProject) => void;
}) {
  const [sceneCount, setSceneCount] = useState<number>(project.scenes?.length || 8);
  const [brief, setBrief] = useState<string>(project.scenes?.map((s: any) => s.narration).join(" ") || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onGenerate = async () => {
    setErr(null);
    setLoading(true);
    try {
      const segments = await generateScenes({
        body_text: brief,
        companyName: project.companyName,
        accentColor: project.accentColor,
        sceneCount,
      });

      // IMPORTANT: We replace storyboard, but we keep brand kit + library metadata
      const next = replaceScenes(project, segments as any);
      saveProject(next);
      setProject(next);
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const onAddScene = () => {
    const next = addSceneAfter(project, project.scenes.length - 1);
    saveProject(next);
    setProject(next);
    setSceneCount(next.scenes.length);
  };

  return (
    <div
      style={{
        padding: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        background: "rgba(0,0,0,0.25)",
        margin: "20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 14 }}>Scene Generator</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            Generate narration + screen text for any number of scenes (e.g. 60).
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Scenes</span>
            <input
              value={sceneCount}
              type="number"
              min={1}
              max={120}
              onChange={(e) => setSceneCount(Number(e.target.value || 8))}
              style={{
                width: 90,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 10,
                padding: "8px 10px",
                color: "#fff",
                outline: "none",
              }}
            />
          </div>

          <button
            onClick={onAddScene}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.85)",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            + Add Scene
          </button>

          <button
            onClick={onGenerate}
            disabled={loading}
            style={{
              background: loading ? "rgba(255,255,255,0.08)" : project.accentColor,
              border: "none",
              color: "#fff",
              padding: "10px 14px",
              borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 900,
            }}
          >
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Brief / offer / key facts</div>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={4}
          placeholder={`Example: We are a 24/7 AI receptionist for plumbers. We answer calls instantly, book jobs, and reduce missed calls by 80%.`}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 12,
            padding: 12,
            color: "#fff",
            outline: "none",
            resize: "vertical",
            lineHeight: 1.4,
          }}
        />
      </div>

      {err && (
        <div style={{ marginTop: 10, color: "#ff8a8a", fontSize: 12 }}>
          {err}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.65 }}>
        Tip: include numbers (like <b>80%</b>, <b>£199</b>, <b>24/7</b>) — the renderer will auto-animate them.
      </div>
    </div>
  );
}
