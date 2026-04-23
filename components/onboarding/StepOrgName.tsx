"use client";
/**
 * components/onboarding/StepOrgName.tsx
 * Step 1: Collect organisation name + slug preview + optional org logo.
 */

import { useState, useEffect } from "react";
import { StepShell } from "./StepShell";

type OrgNameStepData = {
  name: string;
  business_type: string;
  org_logo_file: File | null;
  org_logo_url: string;
};

type Props = {
  initialValue?: string;
  initialBusinessType?: string;
  initialLogoUrl?: string;
  onNext: (data: OrgNameStepData) => void;
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

export default function StepOrgName({
  initialValue = "",
  initialBusinessType = "",
  initialLogoUrl = "",
  onNext,
  onBack,
  stepIndex,
}: Props) {
  const [name, setName] = useState(initialValue);
  const [type, setType] = useState(initialBusinessType);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [logoPreview, setLogoPreview] = useState(initialLogoUrl);

  const slug = slugify(name);

  useEffect(() => {
    if (name) setError("");
  }, [name]);

  const pickFile = (file: File | null) => {
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview((e.target?.result as string) || "");
    reader.readAsDataURL(file);
    setLogoUrl("");
  };

  const handleUrlInput = (v: string) => {
    setLogoUrl(v);
    setLogoFile(null);
    setLogoPreview(v);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoUrl("");
    setLogoPreview("");
  };

  const handleNext = () => {
    if (name.trim().length < 2) {
      setError("Please enter a valid organisation name");
      return;
    }

    onNext({
      name: name.trim(),
      business_type: type,
      org_logo_file: logoFile,
      org_logo_url: logoFile ? "" : logoUrl.trim(),
    });
  };

  return (
    <StepShell
      stepIndex={stepIndex}
      eyebrow="Step 1 of 6"
      headline="What's your organisation called?"
      sub="This will be the name of your workspace. You can also add your organisation logo now."
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
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleNext()}
          placeholder="e.g. Relvo Marketing Co."
          style={{ ...inputStyle, ...(error ? { borderColor: "#f87171" } : {}) }}
          onFocus={(e) => {
            e.target.style.borderColor = "rgba(167,139,250,0.7)";
            e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "rgba(255,255,255,0.08)";
            e.target.style.boxShadow = "none";
          }}
        />
        {error && (
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 12,
              color: "#f87171",
              fontFamily: "DM Mono, monospace",
            }}
          >
            {error}
          </p>
        )}

        {/* Slug preview */}
        {slug.length > 0 && !error && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.2)",
                fontFamily: "DM Mono, monospace",
              }}
            >
              PROFILE URL
            </span>
            <code
              style={{
                fontSize: 11,
                color: "rgba(167,139,250,0.7)",
                fontFamily: "DM Mono, monospace",
                background: "rgba(124,58,237,0.08)",
                padding: "2px 8px",
                borderRadius: 5,
              }}
            >
              /biz/{slug}
            </code>
          </div>
        )}
      </div>

      {/* Org logo */}
      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>
          Organisation logo{" "}
          <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>(optional)</span>
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 96px",
            gap: 12,
            alignItems: "start",
          }}
        >
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f?.type.startsWith("image/")) pickFile(f);
              }}
              onClick={() => document.getElementById("org-logo-input")?.click()}
              style={{
                padding: "18px 14px",
                borderRadius: 12,
                cursor: "pointer",
                textAlign: "center",
                border: `2px dashed ${
                  dragOver ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.1)"
                }`,
                background: dragOver ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.03)",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>📁</div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.35)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {logoFile ? logoFile.name : "Drop or click to upload"}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.15)",
                  fontFamily: "DM Mono, monospace",
                  marginTop: 4,
                }}
              >
                PNG · SVG · JPG
              </div>

              <input
                id="org-logo-input"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => pickFile(e.target.files?.[0] || null)}
              />
            </div>

            <div style={{ marginTop: 10 }}>
              <p
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.18)",
                  fontFamily: "DM Mono, monospace",
                  margin: "0 0 6px",
                  letterSpacing: "0.06em",
                }}
              >
                OR PASTE IMAGE URL
              </p>
              <input
                value={logoUrl}
                onChange={(e) => handleUrlInput(e.target.value)}
                placeholder="https://yourcompany.com/logo.png"
                disabled={!!logoFile}
                style={{ ...inputStyle, opacity: logoFile ? 0.4 : 1, fontSize: 13 }}
                onFocus={(e) => {
                  if (!logoFile) {
                    e.target.style.borderColor = "rgba(167,139,250,0.7)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)";
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {(logoFile || logoUrl || logoPreview) && (
              <button
                type="button"
                onClick={removeLogo}
                style={{
                  marginTop: 8,
                  background: "none",
                  border: "none",
                  color: "rgba(248,113,113,0.65)",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "DM Mono, monospace",
                  padding: 0,
                }}
              >
                ✕ Remove logo
              </button>
            )}
          </div>

          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 14,
              border: "1.5px solid rgba(255,255,255,0.08)",
              background: logoPreview ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Organisation logo preview"
                style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }}
                onError={() => setLogoPreview("")}
              />
            ) : (
              <span style={{ fontSize: 28 }}>🏢</span>
            )}
          </div>
        </div>
      </div>

      {/* Business type */}
      <div>
        <label style={labelStyle}>
          Business type <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>(optional)</span>
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {BUSINESS_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t === type ? "" : t)}
              style={{
                padding: "7px 16px",
                borderRadius: 20,
                border: `1px solid ${
                  type === t ? "rgba(167,139,250,0.6)" : "rgba(255,255,255,0.07)"
                }`,
                background: type === t ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.03)",
                color: type === t ? "#a78bfa" : "rgba(255,255,255,0.45)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </StepShell>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.3)",
  fontFamily: "DM Mono, monospace",
  marginBottom: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 18px",
  background: "rgba(255,255,255,0.04)",
  border: "1.5px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  color: "#f1f5f9",
  fontSize: 16,
  fontFamily: "'DM Sans', sans-serif",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};