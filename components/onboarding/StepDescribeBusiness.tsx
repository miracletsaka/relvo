"use client";
/**
 * components/onboarding/StepDescribeBusiness.tsx
 * Step 2: Business description, tagline, founding year, company size.
 */

import { useState } from "react";
import { StepShell } from "./StepShell";

type Props = {
  initial?: { tagline?: string; description?: string; founded_year?: string; company_size?: string };
  onNext:  (data: { tagline: string; description: string; founded_year: string; company_size: string }) => void;
  onBack:  () => void;
  stepIndex: number;
};

const SIZES = ["1–5", "6–20", "21–50", "51–200", "200–500", "500+"];
const YEARS = Array.from({ length: 50 }, (_, i) => String(new Date().getFullYear() - i));

export default function StepDescribeBusiness({ initial = {}, onNext, onBack, stepIndex }: Props) {
  const [tagline,     setTagline]     = useState(initial.tagline     || "");
  const [description, setDescription] = useState(initial.description || "");
  const [foundedYear, setFoundedYear] = useState(initial.founded_year || "");
  const [companySize, setCompanySize] = useState(initial.company_size || "");
  const [error, setError] = useState("");

  const handleNext = () => {
    if (description.trim().length < 20) {
      setError("Please write at least a short description (20+ characters)");
      return;
    }
    onNext({ tagline: tagline.trim(), description: description.trim(), founded_year: foundedYear, company_size: companySize });
  };

  const descLength = description.length;
  const descStrength = descLength < 20 ? 0 : descLength < 60 ? 1 : descLength < 120 ? 2 : 3;
  const strengthColors = ["#374151", "#ef4444", "#f59e0b", "#34d399"];
  const strengthLabels = ["", "Too short", "Getting there", "Great!"];

  return (
    <StepShell
      stepIndex={stepIndex}
      eyebrow="Step 2 of 6"
      headline="Tell us about your business"
      sub="Help Relvo understand your brand so it generates content that sounds like you."
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={description.trim().length < 20}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Tagline */}
        <div>
          <label style={labelStyle}>Tagline <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>(optional)</span></label>
          <input
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            placeholder="e.g. Transforming brands through intelligent content"
            maxLength={120}
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "rgba(167,139,250,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Business description *</label>
          <textarea
            value={description}
            onChange={e => { setDescription(e.target.value); setError(""); }}
            placeholder="What does your business do? Who are your customers? What makes you different? The more detail you give, the better Relvo will understand your brand voice."
            rows={5}
            maxLength={800}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
            onFocus={e => { e.target.style.borderColor = "rgba(167,139,250,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
            onBlur={e => { e.target.style.borderColor = error ? "#f87171" : "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
          />
          {/* Strength bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${[0, 33, 66, 100][descStrength]}%`, background: strengthColors[descStrength], borderRadius: 2, transition: "all 0.4s ease" }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: strengthColors[descStrength], fontFamily: "DM Mono, monospace", minWidth: 80, textAlign: "right" }}>
              {descStrength > 0 && strengthLabels[descStrength]}
            </span>
          </div>
          {error && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#f87171", fontFamily: "DM Mono, monospace" }}>{error}</p>}
        </div>

        {/* Founded year + company size */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Founded year</label>
            <select
             
              value={foundedYear}
              onChange={e => setFoundedYear(e.target.value)}
              style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
              <option  value="">Select year…</option>
              {YEARS.map(y => <option  className="text-black" key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Team size</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SIZES.map(s => (
                <button key={s} type="button" onClick={() => setCompanySize(companySize === s ? "" : s)}
                  style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${companySize === s ? "rgba(167,139,250,0.6)" : "rgba(255,255,255,0.07)"}`, background: companySize === s ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.03)", color: companySize === s ? "#a78bfa" : "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "DM Mono, monospace", transition: "all 0.15s" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
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
  padding: "13px 16px",
  background: "rgba(255,255,255,0.04)",
  border: "1.5px solid rgba(255,255,255,0.08)",
  borderRadius: 12, color: "#f1f5f9",
  fontSize: 14, fontFamily: "'DM Sans', sans-serif",
  outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
};
