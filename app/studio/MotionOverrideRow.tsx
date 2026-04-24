"use client";

import React from "react";

const PRESETS = ["calm", "confident", "energetic", "dramatic"] as const;

export default function MotionOverrideRow({
  motionPreset,
  templateHint,
  onChange,
}: {
  motionPreset?: string;
  templateHint?: string;
  onChange: (patch: { motionPreset?: string; templateHint?: string }) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <label style={{ fontSize: 11, opacity: 0.65 }}>Motion</label>
      <select
        value={motionPreset || ""}
        onChange={(e) => onChange({ motionPreset: e.target.value || undefined })}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#fff",
          borderRadius: 10,
          padding: "8px 10px",
          fontSize: 12,
          outline: "none",
        }}
      >
        <option className="text-black" value="">Auto</option>
        {PRESETS.map((p) => (
          <option className="text-black" key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <label style={{ fontSize: 11, opacity: 0.65 }}>Template</label>
      <input
        value={templateHint || ""}
        onChange={(e) => onChange({ templateHint: e.target.value || undefined })}
        placeholder="Auto"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#fff",
          borderRadius: 10,
          padding: "8px 10px",
          fontSize: 12,
          outline: "none",
          minWidth: 160,
        }}
      />
    </div>
  );
}
