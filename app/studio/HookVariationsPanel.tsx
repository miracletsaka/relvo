
"use client";
import React from "react";

const hooks = [
  "STOP losing customers",
  "You are missing calls right now",
  "Your competitors answer faster",
  "Every missed call costs money"
];

export default function HookVariationsPanel({ project, setProject }: any) {
  if (!project) return null;

  const applyHook = (text:string) => {
    const scenes = [...project.scenes];
    if (!scenes[0]) return;
    scenes[0] = { ...scenes[0], screenText:text };
    setProject({ ...project, scenes });
  };

  return (
    <div style={{ padding:16, border:"1px solid rgba(255,255,255,0.1)", borderRadius:12 }}>
      <h3 style={{ marginBottom:10 }}>Hook Variations</h3>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {hooks.map((h,i)=>(
          <button
            key={i}
            onClick={()=>applyHook(h)}
            style={{ padding:"8px 10px", borderRadius:8, cursor:"pointer" }}
          >
            {h}
          </button>
        ))}
      </div>
    </div>
  );
}
