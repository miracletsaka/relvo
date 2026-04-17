"use client";
/**
 * components/onboarding/StepShell.tsx
 * Shared wrapper for every onboarding step.
 * Handles animation, layout, back/next buttons.
 */

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  stepIndex:    number;
  eyebrow:      string;
  headline:     string;
  sub?:         string;
  children:     ReactNode;
  onNext:       () => void;
  onBack?:      () => void;
  nextDisabled?: boolean;
  nextLabel?:   string;
  nextLoading?: boolean;
};

export function StepShell({
  stepIndex, eyebrow, headline, sub, children,
  onNext, onBack, nextDisabled, nextLabel = "Continue →", nextLoading,
}: Props) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(18px)",
      transition: "opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1)",
      display: "flex", flexDirection: "column", width: "100%", gap: 0,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(167,139,250,0.65)", fontFamily: "DM Mono, monospace", display: "block", marginBottom: 10 }}>
          {eyebrow}
        </span>
        <h2 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 900, color: "#fff", margin: 0, lineHeight: 1.12, letterSpacing: "-0.8px", fontFamily: "'Syne', sans-serif" }}>
          {headline}
        </h2>
        {sub && (
          <p style={{ margin: "10px 0 0", fontSize: 15, color: "rgba(255,255,255,0.38)", lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>
            {sub}
          </p>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>{children}</div>

      {/* Navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 40, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {onBack ? (
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: "8px 0", transition: "color 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back
          </button>
        ) : <div />}

        <button
          onClick={onNext}
          disabled={nextDisabled || nextLoading}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "14px 32px",
            background: nextDisabled || nextLoading
              ? "rgba(255,255,255,0.06)"
              : "linear-gradient(135deg, #7c3aed, #4f46e5)",
            border: "none", borderRadius: 12,
            color: nextDisabled || nextLoading ? "rgba(255,255,255,0.25)" : "#fff",
            fontSize: 14, fontWeight: 800, cursor: nextDisabled || nextLoading ? "not-allowed" : "pointer",
            fontFamily: "'Syne', sans-serif", letterSpacing: "0.01em",
            boxShadow: nextDisabled || nextLoading ? "none" : "0 6px 24px rgba(124,58,237,0.4)",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { if (!nextDisabled && !nextLoading) { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 30px rgba(124,58,237,0.55)"; } }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = nextDisabled ? "none" : "0 6px 24px rgba(124,58,237,0.4)"; }}>
          {nextLoading
            ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />Processing…</>
            : nextLabel
          }
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Mono&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
