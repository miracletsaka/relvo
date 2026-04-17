"use client";
/**
 * components/onboarding/StepOrgName.tsx
 * Step 1: Collect organisation name + slug preview.
 */

import { useState, useEffect } from "react";
import { StepShell } from "./StepShell";

type Props = {
  initialValue?: string;
  onNext: (name: string) => void;
  onBack?: () => void;
  stepIndex: number;
};

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const BUSINESS_TYPES = [
  "Agency", "Startup", "Freelancer", "E-commerce", "SaaS", "Consultancy",
  "NGO / Non-profit", "Healthcare", "Education", "Hospitality", "Real Estate",
  "Finance", "Technology", "Media & Publishing", "Retail", "Other",
];

export default function StepOrgName({ initialValue = "", onNext, onBack, stepIndex }: Props) {
  const [name,  setName]  = useState(initialValue);
  const [type,  setType]  = useState("");
  const [error, setError] = useState("");
  const slug = slugify(name);

  useEffect(() => { if (name) setError(""); }, [name]);

  const handleNext = () => {
    if (name.trim().length < 2) { setError("Please enter a valid organisation name"); return; }
    onNext(name.trim());
  };

  return (
    <StepShell
      stepIndex={stepIndex}
      eyebrow="Step 1 of 6"
      headline="What's your organisation called?"
      sub="This will be the name of your workspace. You can always change it later."
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={name.trim().length < 2}
      nextLabel="Continue →"
    >
      {/* Org name input */}
      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>Organisation name</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleNext()}
          placeholder="e.g. Relvō  Marketing Co."
          style={{ ...inputStyle, ...(error ? { borderColor: "#f87171" } : {}) }}
          onFocus={e => { e.target.style.borderColor = "rgba(167,139,250,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
          onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
        />
        {error && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#f87171", fontFamily: "DM Mono, monospace" }}>{error}</p>}

        {/* Slug preview */}
        {slug.length > 0 && !error && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace" }}>PROFILE URL</span>
            <code style={{ fontSize: 11, color: "rgba(167,139,250,0.7)", fontFamily: "DM Mono, monospace", background: "rgba(124,58,237,0.08)", padding: "2px 8px", borderRadius: 5 }}>
              /biz/{slug}
            </code>
          </div>
        )}
      </div>

      {/* Business type */}
      <div>
        <label style={labelStyle}>Business type <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>(optional)</span></label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {BUSINESS_TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t === type ? "" : t)}
              style={{
                padding: "7px 16px",
                borderRadius: 20,
                border: `1px solid ${type === t ? "rgba(167,139,250,0.6)" : "rgba(255,255,255,0.07)"}`,
                background: type === t ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.03)",
                color: type === t ? "#a78bfa" : "rgba(255,255,255,0.45)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s",
              }}>
              {t}
            </button>
          ))}
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

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "14px 18px",
  background: "rgba(255,255,255,0.04)",
  border: "1.5px solid rgba(255,255,255,0.08)",
  borderRadius: 12, color: "#f1f5f9",
  fontSize: 16, fontFamily: "'DM Sans', sans-serif",
  outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
};
