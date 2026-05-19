"use client";

import type { TemplateShape } from "@/lib/types";
import type { ChatMessage } from "./types";

function getShapeLabel(shape: any) {
  if (!shape) return "No shape";
  return (shape.dataField || shape.slotKey || shape.text || shape.type || shape.id || "Shape").toString();
}

export default function AiChatEditSidebar({
  message,
  selectedShapeId,
  onSelectShape,
  onPatchShape,
  onClose,
}: {
  message?: ChatMessage | null;
  selectedShapeId: string | null;
  onSelectShape: (shapeId: string | null) => void;
  onPatchShape: (patch: Partial<TemplateShape>) => void;
  onClose: () => void;
}) {
  const shapes = message?.shapes || [];
  const selectedShape = shapes.find((s: any) => s.id === selectedShapeId) as any;

  const field = (label: string, node: React.ReactNode) => (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {node}
    </div>
  );

  return (
    <aside style={{ width: 340, flex: "0 0 340px", borderLeft: "1px solid rgba(255,255,255,0.08)", background: "rgba(8,8,12,0.96)", padding: 18, overflowY: "auto", height: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Edit Canvas</div>
          <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, marginTop: 3 }}>Select a layer, then adjust it manually.</div>
        </div>
        <button onClick={onClose} style={smallButton}>Close</button>
      </div>

      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>Layers</div>
        <div style={{ display: "grid", gap: 7, maxHeight: 230, overflowY: "auto" }}>
          {[...shapes].sort((a: any, b: any) => Number(b.zIndex || 0) - Number(a.zIndex || 0)).map((shape: any) => (
            <button key={shape.id} onClick={() => onSelectShape(shape.id)} style={{ textAlign: "left", borderRadius: 10, border: selectedShapeId === shape.id ? "1px solid rgba(167,139,250,0.8)" : "1px solid rgba(255,255,255,0.06)", background: selectedShapeId === shape.id ? "rgba(124,58,237,0.22)" : "rgba(255,255,255,0.035)", color: "white", padding: "9px 10px", cursor: "pointer", fontSize: 11 }}>
              <div style={{ fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{getShapeLabel(shape)}</div>
              <div style={{ color: "rgba(255,255,255,0.36)", marginTop: 3 }}>{shape.type} · z{shape.zIndex ?? 0}</div>
            </button>
          ))}
        </div>
      </div>

      {!selectedShape ? (
        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.55 }}>Click a shape on the canvas or select one from layers.</div>
      ) : (
        <>
          <div style={cardStyle}>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>{getShapeLabel(selectedShape)}</div>

            {field("Position", <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input style={inputStyle} type="number" value={Number(selectedShape.x || 0)} onChange={(e) => onPatchShape({ x: Number(e.target.value) } as any)} /><input style={inputStyle} type="number" value={Number(selectedShape.y || 0)} onChange={(e) => onPatchShape({ y: Number(e.target.value) } as any)} /></div>)}
            {field("Size", <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input style={inputStyle} type="number" value={Number(selectedShape.width || 0)} onChange={(e) => onPatchShape({ width: Number(e.target.value) } as any)} /><input style={inputStyle} type="number" value={Number(selectedShape.height || 0)} onChange={(e) => onPatchShape({ height: Number(e.target.value) } as any)} /></div>)}
            {field("Layer", <input style={inputStyle} type="number" value={Number(selectedShape.zIndex || 0)} onChange={(e) => onPatchShape({ zIndex: Number(e.target.value) } as any)} />)}

            {selectedShape.type === "text" && (
              <>
                {field("Text", <textarea style={{ ...inputStyle, minHeight: 92, resize: "vertical" }} value={(selectedShape.text || "").toString()} onChange={(e) => onPatchShape({ text: e.target.value } as any)} />)}
                {field("Font Size", <input style={inputStyle} type="number" value={Number(selectedShape.fontSize || 24)} onChange={(e) => onPatchShape({ fontSize: Number(e.target.value) } as any)} />)}
                {field("Text Color", <input style={inputStyle} value={(selectedShape.textColor || "#ffffff").toString()} onChange={(e) => onPatchShape({ textColor: e.target.value } as any)} />)}
                {field("Align", <select style={inputStyle} value={(selectedShape.textAlign || "left").toString()} onChange={(e) => onPatchShape({ textAlign: e.target.value } as any)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>)}
              </>
            )}

            {selectedShape.type !== "text" && (
              <>
                {field("Background", <input style={inputStyle} value={(selectedShape.backgroundColor || "transparent").toString()} onChange={(e) => onPatchShape({ backgroundColor: e.target.value } as any)} />)}
                {field("Opacity", <input style={inputStyle} type="number" min={0} max={1} step={0.05} value={Number(selectedShape.opacity ?? 1)} onChange={(e) => onPatchShape({ opacity: Number(e.target.value) } as any)} />)}
              </>
            )}
          </div>
          <button onClick={() => onSelectShape(null)} style={{ ...smallButton, width: "100%", padding: "12px 14px" }}>Clear Selection</button>
        </>
      )}
    </aside>
  );
}

const cardStyle: React.CSSProperties = { border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 12, background: "rgba(255,255,255,0.03)", marginBottom: 14 };
const inputStyle: React.CSSProperties = { width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.045)", color: "#fff", padding: "10px 11px", outline: "none", fontSize: 12 };
const labelStyle: React.CSSProperties = { display: "block", marginBottom: 6, color: "rgba(255,255,255,0.42)", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" };
const smallButton: React.CSSProperties = { border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "white", borderRadius: 10, padding: "8px 10px", cursor: "pointer", fontWeight: 850 };
