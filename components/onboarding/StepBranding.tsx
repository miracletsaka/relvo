"use client";
/**
 * components/onboarding/StepBranding.tsx
 * Step 6: Logo upload/URL, brand colour, content tone.
 *
 * On finish:
 *   1. Upload logo file (if picked) via uploadFileToSpaces
 *   2. POST /brands  →  { id, display_name, is_active, logo_url, primary_color }
 *   3. For each active tone → generate template → upload thumbnail → save template
 *   4. onNext()
 */

import { useEffect, useRef, useState } from "react";
import TemplateCanvas from "@/components/template-canvas";
import { createTemplate } from "@/lib/template-storage";
import { uploadFileToSpaces } from "@/lib/video-upload-client";
import { DEFAULT_CAMPAIGN_DATA } from "@/lib/campaign-context";
import type { CampaignData, TemplateShape } from "@/lib/types";
import { StepShell } from "./StepShell";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (Array.isArray(json.detail)) {
      throw new Error(
        json.detail.map((e: any) =>
          `${Array.isArray(e.loc) ? e.loc.join(" → ") : e.loc}: ${e.msg}`
        ).join("; ") || `Error ${res.status}`
      );
    }
    throw new Error(
      typeof json.detail  === "string" ? json.detail  :
      typeof json.message === "string" ? json.message :
      `Error ${res.status}`
    );
  }
  return json as T;
}

type Tone = { id: string; name?: string; label?: string; emoji?: string };

type Props = {
  orgName:   string;
  onNext:    () => void;
  onBack:    () => void;
  stepIndex: number;
};

const TONE_CARDS = [
  { id: "professional", label: "Professional", desc: "Authoritative & trustworthy",  icon: "🏛️" },
  { id: "friendly",     label: "Friendly",      desc: "Warm, approachable & human",   icon: "😊" },
  { id: "bold",         label: "Bold",           desc: "High-energy & impactful",       icon: "⚡" },
  { id: "educational",  label: "Educational",   desc: "Informative & clear",           icon: "🎓" },
  { id: "luxurious",    label: "Luxurious",      desc: "Premium & exclusive",           icon: "💎" },
  { id: "playful",      label: "Playful",        desc: "Fun, quirky & creative",        icon: "🎨" },
];

const PRESET_COLORS = ["#7c3aed","#4f46e5","#dc2626","#059669","#0284c7","#d97706","#db2777","#0d9488"];

const CW = 1080;
const CH = 1080;

function toBrandId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

async function waitFrames() {
  for (let i = 0; i < 4; i++) await new Promise(r => requestAnimationFrame(r));
}

async function toFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error("toBlob failed")), "image/png", 1)
  );
  return new File([blob], name, { type: "image/png" });
}

export default function StepBranding({ orgName, onNext, onBack, stepIndex }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [logoFile,    setLogoFile]    = useState<File | null>(null);
  const [logoUrl,     setLogoUrl]     = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [color,       setColor]       = useState("#7c3aed");
  const [tone,        setTone]        = useState("");
  const [dragOver,    setDragOver]    = useState(false);

  const [loading,   setLoading]   = useState(false);
  const [progress,  setProgress]  = useState("");
  const [error,     setError]     = useState<string | null>(null);

  const [cvData,   setCvData]   = useState<CampaignData>(DEFAULT_CAMPAIGN_DATA as any);
  const [cvShapes, setCvShapes] = useState<TemplateShape[]>([]);
  const [cvBg,     setCvBg]     = useState<string | null>(null);

  const [activeTones, setActiveTones] = useState<Tone[]>([]);
  useEffect(() => {
    apiFetch<Tone[]>("/tones?active_only=true").then(setActiveTones).catch(() => {});
  }, []);

  const pickFile = (file: File | null) => {
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = e => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setLogoUrl("");
  };

  const handleUrlInput = (v: string) => {
    setLogoUrl(v);
    setLogoFile(null);
    setLogoPreview(v);
  };

  const submit = async () => {
    if (!orgName.trim()) { setError("Organisation name missing"); return; }
    setLoading(true); setError(null);

    const brandId = toBrandId(orgName);

    try {
      // 1. Upload logo file if chosen
      let finalLogoUrl: string | null = logoUrl.trim() || null;
      if (logoFile) {
        setProgress("Uploading logo…");
        finalLogoUrl = await uploadFileToSpaces(logoFile);
      }

      // 2. Create brand — exact fields the backend expects
      setProgress("Creating brand…");
      await apiFetch("/brands", {
        method: "POST",
        body: JSON.stringify({
          id:            brandId,
          display_name:  orgName.trim(),
          is_active:     true,
          logo_url:      finalLogoUrl,
          primary_color: color || "#7c3aed",
        }),
      });

      // 3. Fetch tones (already loaded, refetch as fallback)
      const toneList = activeTones.length
        ? activeTones
        : await apiFetch<Tone[]>("/tones?active_only=true").catch(() => []);

      if (!toneList.length) {
        setProgress("Done");
        await new Promise(r => setTimeout(r, 400));
        onNext();
        return;
      }

      // Pre-open all tabs synchronously (browsers block if after an await)
      const tabRefs: (Window | null)[] = toneList.map((t, i) => {
        const tab = window.open("", "_blank");
        if (tab) {
          const label = t.label || t.name || t.id;
          tab.document.write(
            `<html><body style="font-family:sans-serif;display:flex;align-items:center;` +
            `justify-content:center;height:100vh;background:#0b0b0f;color:white;margin:0">` +
            `<div style="text-align:center"><div style="opacity:.4;font-size:11px;letter-spacing:.1em;margin-bottom:10px">Relvō</div>` +
            `<div>Generating ${label} template…</div></div></body></html>`
          );
          if (i === 0) tab.focus();
        }
        return tab;
      });

      // Generate + render + save each template
      for (let i = 0; i < toneList.length; i++) {
        const t = toneList[i];
        const label = t.label || t.name || t.id;
        setProgress(`Generating "${label}" template… (${i + 1}/${toneList.length})`);

        const res = await fetch("/api/generate-template-to-canvas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignData: {
              ...DEFAULT_CAMPAIGN_DATA,
              companyName: orgName.trim(),
              toneName:    label,
              logo:        finalLogoUrl || "",
            },
            canvasWidth:  CW,
            canvasHeight: CH,
          }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(`Generation failed for "${label}"`);

        setCvShapes(data.shapes || []);
        setCvBg(data.backgroundImage || null);
        setCvData({ ...(data.campaignData || DEFAULT_CAMPAIGN_DATA), companyName: orgName.trim() });

        await waitFrames();

        if (!canvasRef.current) throw new Error("Canvas not ready");

        setProgress(`Exporting "${label}" thumbnail… (${i + 1}/${toneList.length})`);
        const imgFile    = await toFile(canvasRef.current, `${brandId}-${t.id}.png`);
        const thumbUrl   = await uploadFileToSpaces(imgFile);

        setProgress(`Saving "${label}" template… (${i + 1}/${toneList.length})`);
        const saveRes = await createTemplate({
          name:            `${orgName.trim()} — ${label}`,
          description:     "Auto-generated during onboarding",
          shapes:          data.shapes,
          canvasWidth:     CW,
          canvasHeight:    CH,
          backgroundImage: data.backgroundImage || null,
          thumbnail_url:   thumbUrl,
          brand_id:        brandId,
          tone_id:         t.id,
          orientation:     "square",
        } as any);

        if (!saveRes?.ok) throw new Error(`Failed to save template for "${label}"`);

        const tab = tabRefs[i];
        if (tab && !tab.closed) {
          tab.location.href = `/dashboard/design-studio/admin/template?templateId=${saveRes.id}`;
        }
      }

      setProgress("All done! 🎉");
      await new Promise(r => setTimeout(r, 700));
      onNext();

    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const preview = logoPreview || logoUrl;

  return (
    <>
      {/* Hidden rendering canvas */}
      <div style={{ position: "fixed", left: -9999, top: -9999, pointerEvents: "none", opacity: 0 }}>
        <TemplateCanvas
          ref={canvasRef}
          shapes={cvShapes} zoom={1} setZoom={() => {}} pan={{ x: 0, y: 0 }} setPan={() => {}}
          backgroundImage={cvBg} campaignData={cvData}
          selectedShapeId={null} onShapeSelect={() => {}}
          onShapeDrag={() => {}} onShapeResize={() => {}}
          canvasWidth={CW} canvasHeight={CH} isEditable={false}
        />
      </div>

      <StepShell
        stepIndex={stepIndex}
        eyebrow="Step 6 of 6"
        headline="Set up your brand"
        sub="Add your logo and choose your brand colour. We'll auto-generate your first templates."
        onNext={submit}
        onBack={onBack}
        nextLabel={loading ? "Setting up…" : "Finish Setup 🎉"}
        nextLoading={loading}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>

          {/* Logo */}
          <div>
            <label style={L}>Logo</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 88px", gap: 12, alignItems: "start" }}>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) pickFile(f); }}
                onClick={() => document.getElementById("ob-logo-input")?.click()}
                style={{ padding: "18px 14px", borderRadius: 12, cursor: "pointer", textAlign: "center", border: `2px dashed ${dragOver ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.1)"}`, background: dragOver ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.03)", transition: "all 0.2s" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>📁</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif" }}>
                  {logoFile ? logoFile.name : "Drop or click to upload"}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", fontFamily: "DM Mono, monospace", marginTop: 4 }}>PNG · SVG · JPG</div>
                <input id="ob-logo-input" type="file" accept="image/*" style={{ display: "none" }} onChange={e => pickFile(e.target.files?.[0] || null)} />
              </div>

              {/* Preview */}
              <div style={{ width: 88, height: 88, borderRadius: 14, border: "1.5px solid rgba(255,255,255,0.08)", background: preview ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {preview
                  ? <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 7 }} onError={() => setLogoPreview("")} />
                  : <span style={{ fontSize: 28 }}>🏢</span>
                }
              </div>
            </div>

            {/* URL input */}
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontFamily: "DM Mono, monospace", margin: "0 0 6px", letterSpacing: "0.06em" }}>OR PASTE IMAGE URL</p>
              <input value={logoUrl} onChange={e => handleUrlInput(e.target.value)}
                placeholder="https://yourbrand.com/logo.png" disabled={!!logoFile}
                style={{ ...I, opacity: logoFile ? 0.4 : 1 }}
                onFocus={e => { if (!logoFile) e.target.style.borderColor = "rgba(167,139,250,0.7)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }} />
              {logoFile && <button onClick={() => { setLogoFile(null); setLogoPreview(""); }}
                style={{ marginTop: 5, background: "none", border: "none", color: "rgba(248,113,113,0.65)", fontSize: 11, cursor: "pointer", fontFamily: "DM Mono, monospace" }}>✕ Remove file</button>}
            </div>
          </div>

          {/* Colour */}
          <div>
            <label style={L}>Primary brand colour</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  style={{ width: 36, height: 36, borderRadius: 9, background: c, border: `2.5px solid ${color === c ? "#fff" : "transparent"}`, cursor: "pointer", transition: "all 0.15s", boxShadow: color === c ? `0 0 12px ${c}99` : "none" }} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                style={{ width: 42, height: 42, borderRadius: 9, border: "1.5px solid rgba(255,255,255,0.1)", padding: 3, background: "none", cursor: "pointer" }} />
              <input type="text" value={color} onChange={e => setColor(e.target.value)} maxLength={9}
                style={{ ...I, width: 110, fontFamily: "DM Mono, monospace", fontSize: 13 }}
                onFocus={e => { e.target.style.borderColor = "rgba(167,139,250,0.7)"; }} onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }} />
              <div style={{ width: 48, height: 42, borderRadius: 9, background: color, border: "1.5px solid rgba(255,255,255,0.08)", flexShrink: 0 }} />
            </div>
          </div>

          {/* Tone */}
          <div>
            <label style={L}>Content tone <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.18)" }}>(optional)</span></label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9 }}>
              {TONE_CARDS.map(t => {
                const on = tone === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => setTone(on ? "" : t.id)}
                    style={{ padding: "14px 11px", borderRadius: 13, cursor: "pointer", textAlign: "left", position: "relative", transition: "all 0.18s", border: `1.5px solid ${on ? "rgba(167,139,250,0.6)" : "rgba(255,255,255,0.07)"}`, background: on ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.03)" }}>
                    {on && (
                      <div style={{ position: "absolute", top: 7, right: 7, width: 15, height: 15, borderRadius: "50%", background: "linear-gradient(135deg,#a78bfa,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{t.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: on ? "#fff" : "rgba(255,255,255,0.5)", fontFamily: "'Syne', sans-serif", marginBottom: 3 }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: on ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.16)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info */}
          {activeTones.length > 0 && (
            <div style={{ padding: "13px 16px", background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.18)", borderRadius: 11, display: "flex", gap: 11, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚡</span>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", lineHeight: 1.65, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                We'll auto-generate <strong style={{ color: "rgba(167,139,250,0.75)" }}>{activeTones.length} design{activeTones.length > 1 ? "s" : ""}</strong> and open each in a new tab for you to review.
              </p>
            </div>
          )}

          {/* Progress */}
          {loading && progress && (
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 15px", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 11 }}>
              <span style={{ width: 13, height: 13, border: "2px solid rgba(167,139,250,0.3)", borderTopColor: "#a78bfa", borderRadius: "50%", display: "inline-block", animation: "ob-spin 0.7s linear infinite", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "rgba(167,139,250,0.8)", fontFamily: "DM Mono, monospace" }}>{progress}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: "11px 15px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 11, fontSize: 13, color: "#f87171", fontFamily: "DM Mono, monospace", lineHeight: 1.55 }}>
              <strong style={{ display: "block", marginBottom: 3 }}>Error</strong>{error}
            </div>
          )}

        </div>
        <style>{`@keyframes ob-spin { to { transform: rotate(360deg); } }`}</style>
      </StepShell>
    </>
  );
}


const L: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace", marginBottom: 10 };
const I: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "12px 13px", background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 11, color: "#f1f5f9", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", transition: "border-color 0.2s" };