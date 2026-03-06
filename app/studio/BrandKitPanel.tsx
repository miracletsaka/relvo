
"use client";
import React from "react";

export default function BrandKitPanel({ project, setProject }: any) {
  if (!project) return null;

  const update = (patch: any) => {
    setProject({ ...project, ...patch });
  };

  return (
    <div style={{ padding:16, border:"1px solid rgba(255,255,255,0.1)", borderRadius:12 }}>
      <h3 style={{ marginBottom:10 }}>Brand Kit</h3>

      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:12, opacity:0.7 }}>Company Name</div>
          <input
            value={project.companyName || ""}
            onChange={(e)=>update({ companyName:e.target.value })}
            style={{ padding:8, borderRadius:6 }}
          />
        </div>

        <div>
          <div style={{ fontSize:12, opacity:0.7 }}>Accent Color</div>
          <input
            value={project.accentColor || ""}
            onChange={(e)=>update({ accentColor:e.target.value })}
            style={{ padding:8, borderRadius:6 }}
          />
        </div>
      </div>
    </div>
  );
}
