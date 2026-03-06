"use client";

import React from "react";
import type { VideoProject } from "@/lib/studio/types";

export default function CaptionsSwitch({
  project,
  setProject,
}: {
  project: VideoProject;
  setProject: (next: VideoProject) => void;
}) {
  const value = project.captionsMode ?? "kinetic";
  const accentColor = project.accentColor;

  const onChange = (v: "off" | "kinetic") => {
    setProject({ ...project, captionsMode: v });
  };

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>Captions</div>

      <button
        onClick={() => onChange("off")}
        style={{
          border: "1px solid rgba(255,255,255,0.14)",
          background: value === "off" ? "rgba(255,255,255,0.10)" : "transparent",
          color: value === "off" ? "#fff" : "rgba(255,255,255,0.75)",
          padding: "8px 12px",
          borderRadius: 999,
          cursor: "pointer",
          fontWeight: 800,
          fontSize: 12,
        }}
      >
        Off
      </button>

      <button
        onClick={() => onChange("kinetic")}
        style={{
          border: `1px solid ${value === "kinetic" ? `${accentColor}aa` : "rgba(255,255,255,0.14)"}`,
          background: value === "kinetic" ? `${accentColor}22` : "transparent",
          color: value === "kinetic" ? "#fff" : "rgba(255,255,255,0.75)",
          padding: "8px 12px",
          borderRadius: 999,
          cursor: "pointer",
          fontWeight: 900,
          fontSize: 12,
          boxShadow: value === "kinetic" ? `0 0 22px ${accentColor}33` : "none",
        }}
      >
        Kinetic
      </button>
    </div>
  );
}