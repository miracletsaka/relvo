
"use client";
import React from "react";

export default function ScriptEditorPanel({ project, setProject }: any) {
  if (!project) return null;

  const updateScene = (index:number, patch:any) => {
    const scenes = [...project.scenes];
    scenes[index] = { ...scenes[index], ...patch };
    setProject({ ...project, scenes });
  };

  return (
    <div style={{ padding:16, border:"1px solid rgba(255,255,255,0.1)", borderRadius:12 }}>
      <h3 style={{ marginBottom:12 }}>Script Editor</h3>

      <div style={{ display:"grid", gap:12 }}>
        {project.scenes.map((s:any,i:number)=>(
          <div key={i} style={{ border:"1px solid rgba(255,255,255,0.05)", padding:10, borderRadius:8 }}>
            <div style={{ fontSize:12, opacity:0.6 }}>Scene {i+1}</div>

            <textarea
              value={s.screenText || ""}
              placeholder="Screen text"
              onChange={(e)=>updateScene(i,{ screenText:e.target.value })}
              style={{ width:"100%", marginTop:6 }}
            />

            <textarea
              value={s.narration || ""}
              placeholder="Narration"
              onChange={(e)=>updateScene(i,{ narration:e.target.value })}
              style={{ width:"100%", marginTop:6 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
