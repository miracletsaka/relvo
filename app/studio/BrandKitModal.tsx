"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BrandKit, DEFAULT_BRAND_KIT, clamp01, resetBrandKit, saveBrandKit } from "@/lib/studio/brandKitStore";

export default function BrandKitModal({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: BrandKit;
  onSave: (kit: BrandKit) => void;
  onClose: () => void;
}) {
  const [kit, setKit] = useState<BrandKit>(initial);

  useEffect(() => {
    if (open) setKit(initial);
  }, [open, initial]);

  const title = useMemo(() => `Brand Kit`, []);

  if (!open) return null;

  const set = (patch: Partial<BrandKit>) => setKit((k) => ({ ...k, ...patch }));

  const save = () => {
    const normalized: BrandKit = {
      ...kit,
      companyName: String(kit.companyName || DEFAULT_BRAND_KIT.companyName).trim(),
      accentColor: String(kit.accentColor || DEFAULT_BRAND_KIT.accentColor).trim(),
      secondaryColor: kit.secondaryColor ? String(kit.secondaryColor).trim() : undefined,
      primaryFont: kit.primaryFont ? String(kit.primaryFont).trim() : undefined,
      fontWeight: kit.fontWeight ? Math.max(100, Math.min(1000, Number(kit.fontWeight))) : undefined,
      letterSpacing: kit.letterSpacing === undefined ? undefined : Number(kit.letterSpacing),
      textTransform: kit.textTransform || "uppercase",
      overlayIntensity: clamp01(kit.overlayIntensity, DEFAULT_BRAND_KIT.overlayIntensity || 0.45),
      motionIntensity: clamp01(kit.motionIntensity, DEFAULT_BRAND_KIT.motionIntensity || 0.75),
      bgTint: kit.bgTint ? String(kit.bgTint).trim() : DEFAULT_BRAND_KIT.bgTint,
      voiceId: kit.voiceId ? String(kit.voiceId).trim() : DEFAULT_BRAND_KIT.voiceId,
    };

    saveBrandKit(normalized);
    onSave(normalized);
    onClose();
  };

  const reset = () => {
    resetBrandKit();
    onSave(DEFAULT_BRAND_KIT);
    onClose();
  };

  const Label = ({ children }: { children: any }) => (
    <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 900, marginBottom: 6 }}>{children}</div>
  );

  const Input = (props: any) => (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.04)",
        color: "#fff",
        outline: "none",
      }}
    />
  );

  const Range = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <div style={{ width: 48, textAlign: "right", fontSize: 12, opacity: 0.85, fontWeight: 900 }}>
        {value.toFixed(2)}
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2500,
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
            <div style={{ fontSize: 16, fontWeight: 950 }}>{title}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Set once → reused across every render. Makes output consistent like an agency.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={reset}
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
              Reset
            </button>

            <button
              onClick={save}
              style={{
                background: kit.accentColor || "#7c3aed",
                border: "none",
                color: "#fff",
                padding: "10px 12px",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 950,
              }}
            >
              Save Brand Kit
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

        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 12 }}>
              <Label>Company name</Label>
              <Input value={kit.companyName} onChange={(e: any) => set({ companyName: e.target.value })} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <div>
                  <Label>Primary color</Label>
                  <Input value={kit.accentColor} onChange={(e: any) => set({ accentColor: e.target.value })} />
                </div>
                <div>
                  <Label>Secondary color (optional)</Label>
                  <Input value={kit.secondaryColor || ""} onChange={(e: any) => set({ secondaryColor: e.target.value })} placeholder="#22c55e" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <div>
                  <Label>Primary font</Label>
                  <Input value={kit.primaryFont || ""} onChange={(e: any) => set({ primaryFont: e.target.value })} placeholder="Oswald" />
                </div>
                <div>
                  <Label>Voice ID / name</Label>
                  <Input value={kit.voiceId || ""} onChange={(e: any) => set({ voiceId: e.target.value })} placeholder="rachel" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
                <div>
                  <Label>Font weight</Label>
                  <Input type="number" value={kit.fontWeight ?? 900} onChange={(e: any) => set({ fontWeight: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Letter spacing</Label>
                  <Input type="number" value={kit.letterSpacing ?? -2} onChange={(e: any) => set({ letterSpacing: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Transform</Label>
                  <select
                    value={kit.textTransform ?? "uppercase"}
                    onChange={(e) => set({ textTransform: e.target.value as any })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#fff",
                      outline: "none",
                    }}
                  >
                    <option value="uppercase">UPPERCASE</option>
                    <option value="none">normal</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Label>Motion + Look Lock</Label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: kit.accentColor, boxShadow: `0 0 10px ${kit.accentColor}` }} />
                  <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>{kit.primaryFont || "Oswald"}</div>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <Label>Overlay intensity</Label>
                <Range value={clamp01(kit.overlayIntensity, 0.45)} onChange={(v) => set({ overlayIntensity: v })} />
              </div>

              <div style={{ marginTop: 10 }}>
                <Label>Motion intensity</Label>
                <Range value={clamp01(kit.motionIntensity, 0.75)} onChange={(v) => set({ motionIntensity: v })} />
              </div>

              <div style={{ marginTop: 10 }}>
                <Label>Background tint (rgba)</Label>
                <Input value={kit.bgTint || "rgba(0,0,0,0.45)"} onChange={(e: any) => set({ bgTint: e.target.value })} />
              </div>

              <div style={{ marginTop: 14, padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.30)" }}>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900, marginBottom: 8 }}>Preview</div>
                <div style={{ fontSize: 22, fontWeight: kit.fontWeight ?? 900, letterSpacing: (kit.letterSpacing ?? -2), textTransform: kit.textTransform ?? "uppercase", fontFamily: `"${kit.primaryFont || "Oswald"}", Impact, "Arial Black", sans-serif` as any }}>
                  {kit.companyName || "BRAND"}
                </div>
                <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: kit.accentColor, opacity: 0.9 }} />
                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, lineHeight: 1.6 }}>
                  This will lock your styling across renders so videos stop looking “random AI”.
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
            Next step after this: <b>Scene-by-scene preview thumbnails</b> + <b>selective re-record</b> becomes even more “agency”.
          </div>
        </div>
      </div>
    </div>
  );
}
