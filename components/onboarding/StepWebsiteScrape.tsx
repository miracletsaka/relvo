"use client";
/**
 * components/onboarding/StepWebsiteScrape.tsx
 * Step 3: Collect website URL only — no scraping.
 */

import { useState } from "react";
import { StepShell } from "./StepShell";

type Props = {
  initial?:  string;
  onNext:    (url: string) => void;
  onBack:    () => void;
  stepIndex: number;
};

export default function StepWebsiteScrape({ initial = "", onNext, onBack, stepIndex }: Props) {
  const [url, setUrl] = useState(initial);

  const normalise = (v: string): string => {
    const t = v.trim();
    if (!t) return "";
    return t.startsWith("http") ? t : `https://${t}`;
  };

  return (
    <StepShell
      stepIndex={stepIndex}
      eyebrow="Step 3 of 6"
      headline="What's your website?"
      sub="Your website URL appears on your public profile and in generated content. You can fill it in later if needed."
      onNext={() => onNext(normalise(url))}
      onBack={onBack}
      nextLabel="Continue →"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        <div>
          <label style={labelStyle}>Website URL</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 17, pointerEvents: "none" }}>🌐</span>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") onNext(normalise(url)); }}
              placeholder="yourbrand.com"
              autoFocus
              style={{ ...inp, paddingLeft: 44 }}
              onFocus={e => { e.target.style.borderColor = "rgba(167,139,250,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
            />
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 10, color: "rgba(255,255,255,0.18)", fontFamily: "DM Mono, monospace" }}>
            https:// will be added automatically if omitted
          </p>
        </div>

        <div style={{ padding: "16px 20px", background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.18)", borderRadius: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>💡</span>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.65, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
            Your website link will be shown on your public business profile and included in AI-generated marketing content so customers can find you online.
          </p>
        </div>

        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => onNext("")}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.22)", fontSize: 12, cursor: "pointer", fontFamily: "DM Mono, monospace", letterSpacing: "0.06em", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.1)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.22)"; }}>
            I don't have a website yet, skip this step
          </button>
        </div>

      </div>
    </StepShell>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
  textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
  fontFamily: "DM Mono, monospace", marginBottom: 10,
};
const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "14px 16px",
  background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)",
  borderRadius: 12, color: "#f1f5f9", fontSize: 15,
  fontFamily: "'DM Sans', sans-serif", outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};