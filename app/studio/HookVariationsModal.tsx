"use client";

import React, { useMemo, useState } from "react";

type Hook = {
  screenText: string;
  narration: string;
  durationSeconds: number;
};

export default function HookVariationsModal({
  open,
  accentColor,
  companyName,
  currentScreenText,
  currentNarration,
  onPick,
  onClose,
}: {
  open: boolean;
  accentColor: string;
  companyName: string;
  currentScreenText: string;
  currentNarration: string;
  onPick: (hook: Hook) => void;
  onClose: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hooks, setHooks] = useState<Hook[]>([]);

  const canShow = open;

  const title = useMemo(() => `${companyName} • Hook Variations`, [companyName]);

  const generate = async () => {
    setErr(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/studio/generate-hook-variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          accentColor,
          currentScreenText,
          currentNarration,
          tone: "urgent",
        }),
      });
      const json = await res.json();
      if (!json?.ok || !Array.isArray(json?.hooks)) {
        throw new Error(json?.error || "Failed to generate hooks");
      }
      setHooks(json.hooks);
    } catch (e: any) {
      setErr(e?.message || "Failed to generate hooks");
    } finally {
      setIsLoading(false);
    }
  };

  if (!canShow) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        style={{
          width: "min(980px, 100%)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(10,10,10,0.98)",
          overflow: "hidden",
          boxShadow: "0 20px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* header */}
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Generate 3 opening hooks. Pick one → it updates Scene 1 only.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={generate}
              disabled={isLoading}
              style={{
                background: isLoading ? "rgba(255,255,255,0.08)" : accentColor,
                border: "none",
                color: "#fff",
                padding: "10px 12px",
                borderRadius: 12,
                cursor: isLoading ? "not-allowed" : "pointer",
                fontWeight: 900,
              }}
            >
              {isLoading ? "Generating…" : hooks.length ? "Regenerate" : "Generate hooks"}
            </button>

            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.8)",
                padding: "10px 12px",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* body */}
        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900, marginBottom: 6 }}>
                Current Scene 1
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>
                {currentScreenText || "—"}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, opacity: 0.9, whiteSpace: "pre-wrap" }}>
                {currentNarration || "—"}
              </div>
            </div>

            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900, marginBottom: 8 }}>
                Tips (agency style)
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85, lineHeight: 1.6, fontSize: 13 }}>
                <li>Use a hard claim (“STOP LOSING…”) or a pain (“MISSING CALLS?”).</li>
                <li>Keep narration conversational (2 short sentences).</li>
                <li>Pick the hook that matches the audience’s biggest fear.</li>
              </ul>
            </div>
          </div>

          {err && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,80,80,0.35)",
                background: "rgba(255,50,50,0.08)",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 4 }}>Couldn’t generate hooks</div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>{err}</div>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900, marginBottom: 8 }}>
              Variations
            </div>

            {!hooks.length ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  border: "1px dashed rgba(255,255,255,0.18)",
                  opacity: 0.75,
                  background: "rgba(0,0,0,0.25)",
                }}
              >
                Click <b>Generate hooks</b> to get 3 options.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                {hooks.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.03)",
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Hook {i + 1}</div>
                      <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 800 }}>{h.durationSeconds}s</div>
                    </div>

                    <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: -0.2 }}>
                      {h.screenText}
                    </div>

                    <div style={{ fontSize: 13, lineHeight: 1.55, opacity: 0.9, whiteSpace: "pre-wrap" }}>
                      {h.narration}
                    </div>

                    <button
                      onClick={() => onPick(h)}
                      style={{
                        marginTop: "auto",
                        background: accentColor,
                        border: "none",
                        color: "#fff",
                        padding: "10px 12px",
                        borderRadius: 12,
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      Use this hook (Scene 1)
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
            After picking a hook, just <b>Re-record Scene 1</b> — everything else stays.
          </div>
        </div>
      </div>
    </div>
  );
}
