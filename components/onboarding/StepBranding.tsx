"use client";
/**
 * components/onboarding/StepBranding.tsx
 *
 * Branding step now:
 *  1. uploads/saves org logo
 *  2. creates brand
 *  3. saves starter mixed-poster DB sections using the working section pipeline
 *  4. moves to finalize
 *
 * No orientation UI. Canonical canvas is always 1080 x 1350.
 */

import { useEffect, useState } from "react";
import { uploadFileToSpaces } from "@/lib/video-upload-client";
import { saveGeneratedSections } from "@/lib/save-generated-sections";
import { MIXED_POSTER_SECTIONS } from "@/lib/templates/mixed-poster";
import { StepShell } from "./StepShell";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

const CANVAS_W = 1080;
const CANVAS_H = 1350;
const FIXED_ORIENTATION = "portrait" as const;

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...((opts.headers as Record<string, string> | undefined) ?? {}),
    },
    ...opts,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (Array.isArray((json as any).detail)) {
      throw new Error(
        (json as any).detail
          .map((e: any) =>
            `${Array.isArray(e.loc) ? e.loc.join(" → ") : e.loc}: ${e.msg}`,
          )
          .join("; ") || `Error ${res.status}`,
      );
    }

    throw new Error(
      typeof (json as any).detail === "string"
        ? (json as any).detail
        : typeof (json as any).message === "string"
          ? (json as any).message
          : `Error ${res.status}`,
    );
  }

  return json as T;
}

type Tone = {
  id: string;
  name?: string;
  label?: string;
  emoji?: string;
};

export type Orientation = typeof FIXED_ORIENTATION;

type Props = {
  orgName: string;
  onNext: (payload: {
    brandId: string;
    logoUrl: string;
    orientation: Orientation;
  }) => void;
  onBack: () => void;
  stepIndex: number;
};

const PRESET_COLORS = [
  "#7c3aed",
  "#4f46e5",
  "#dc2626",
  "#059669",
  "#0284c7",
  "#d97706",
  "#db2777",
  "#0d9488",
];

export default function StepBranding({
  orgName,
  onNext,
  onBack,
  stepIndex,
}: Props) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [color, setColor] = useState("#7c3aed");
  const [dragOver, setDragOver] = useState(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeTones, setActiveTones] = useState<Tone[]>([]);

  useEffect(() => {
    apiFetch<Tone[]>("/tones?active_only=true")
      .then(setActiveTones)
      .catch(() => {});
  }, []);

  const pickFile = (file: File | null) => {
    if (!file) return;

    setLogoFile(file);

    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview((e.target?.result as string) || "");
    reader.readAsDataURL(file);

    setLogoUrl("");
  };

  const handleUrlInput = (value: string) => {
    setLogoUrl(value);
    setLogoFile(null);
    setLogoPreview(value);
  };

  const submit = async () => {
    if (!orgName.trim()) {
      setError("Organisation name missing");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let finalLogoUrl = logoUrl.trim() || "";

      if (logoFile) {
        setProgress("Uploading logo…");
        finalLogoUrl = await uploadFileToSpaces(logoFile);
      }

      if (finalLogoUrl) {
        setProgress("Saving organisation logo…");

        await apiFetch("/organisations/me", {
          method: "PATCH",
          body: JSON.stringify({
            logo_url: finalLogoUrl,
          }),
        }).catch(() => {});
      }

      setProgress("Creating brand…");

      const createdBrand = await apiFetch<{ id: string; display_name?: string }>("/brands", {
        method: "POST",
        body: JSON.stringify({
          display_name: orgName.trim(),
          is_active: true,
          logo_url: finalLogoUrl || null,
          primary_color: color || "#7c3aed",
        }),
      });

      const brandId = createdBrand.id;

      setProgress("Saving starter design sections…");

      /*
       * This is the working pipeline from the segment composer:
       * it saves mixed-poster sections, including background, into DB.
       * Do not call /segments/generate for background here.
       */
      await saveGeneratedSections({
        templateFamily: "mixed-poster",
        generationSource: "onboarding-branding",
        sections: MIXED_POSTER_SECTIONS,
        brandId,
        tags: [
          "onboarding",
          "branding",
          "starter",
          "mixed-poster",
          FIXED_ORIENTATION,
          `${CANVAS_W}x${CANVAS_H}`,
        ],
      } as any);

      setProgress("Brand foundation ready. Moving to final validation…");

      await new Promise((resolve) => setTimeout(resolve, 500));

      onNext({
        brandId,
        logoUrl: finalLogoUrl,
        orientation: FIXED_ORIENTATION,
      });
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const preview = logoPreview || logoUrl;

  return (
    <StepShell
      stepIndex={stepIndex}
      eyebrow="Step 6 of 7"
      headline="Set up your brand"
      sub="Add your logo and choose your brand colour. We’ll save the first mixed-poster section library, then the final step will add more variations."
      onNext={submit}
      onBack={onBack}
      nextLabel={loading ? "Setting up…" : "Continue →"}
      nextLoading={loading}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(167,139,250,0.18)",
            background: "rgba(124,58,237,0.07)",
            color: "rgba(255,255,255,0.58)",
            fontFamily: "DM Mono, monospace",
            fontSize: 11,
            lineHeight: 1.55,
          }}
        >
          Active workspace:{" "}
          <strong style={{ color: "rgba(216,180,254,0.95)" }}>
            {orgName || "Current organisation"}
          </strong>
          <br />
          Canvas: {CANVAS_W} × {CANVAS_H}
        </div>

        <div>
          <label style={L}>Logo</label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 88px",
              gap: 12,
              alignItems: "start",
            }}
          >
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);

                const file = e.dataTransfer.files[0];

                if (file?.type.startsWith("image/")) {
                  pickFile(file);
                }
              }}
              onClick={() => document.getElementById("ob-logo-input")?.click()}
              style={{
                padding: "18px 14px",
                borderRadius: 12,
                cursor: "pointer",
                textAlign: "center",
                border: `2px dashed ${
                  dragOver
                    ? "rgba(167,139,250,0.7)"
                    : "rgba(255,255,255,0.1)"
                }`,
                background: dragOver
                  ? "rgba(124,58,237,0.08)"
                  : "rgba(255,255,255,0.03)",
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
                id="ob-logo-input"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => pickFile(e.target.files?.[0] || null)}
              />
            </div>

            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 14,
                border: "1.5px solid rgba(255,255,255,0.08)",
                background: preview
                  ? "rgba(255,255,255,0.95)"
                  : "rgba(255,255,255,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {preview ? (
                <img
                  src={preview}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    padding: 7,
                  }}
                  onError={() => setLogoPreview("")}
                />
              ) : (
                <span style={{ fontSize: 28 }}>🏢</span>
              )}
            </div>
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
              placeholder="https://yourbrand.com/logo.png"
              disabled={!!logoFile}
              style={{
                ...I,
                opacity: logoFile ? 0.4 : 1,
              }}
            />

            {logoFile && (
              <button
                onClick={() => {
                  setLogoFile(null);
                  setLogoPreview("");
                }}
                style={{
                  marginTop: 5,
                  background: "none",
                  border: "none",
                  color: "rgba(248,113,113,0.65)",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "DM Mono, monospace",
                }}
              >
                ✕ Remove file
              </button>
            )}
          </div>
        </div>

        <div>
          <label style={L}>Primary brand colour</label>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setColor(preset)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: preset,
                  border: `2.5px solid ${color === preset ? "#fff" : "transparent"}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow: color === preset ? `0 0 12px ${preset}99` : "none",
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 9,
                border: "1.5px solid rgba(255,255,255,0.1)",
                padding: 3,
                background: "none",
                cursor: "pointer",
              }}
            />

            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              maxLength={9}
              style={{
                ...I,
                width: 110,
                fontFamily: "DM Mono, monospace",
                fontSize: 13,
              }}
            />

            <div
              style={{
                width: 48,
                height: 42,
                borderRadius: 9,
                background: color,
                border: "1.5px solid rgba(255,255,255,0.08)",
                flexShrink: 0,
              }}
            />
          </div>
        </div>

        {activeTones.length > 0 && (
          <div
            style={{
              padding: "13px 16px",
              background: "rgba(124,58,237,0.07)",
              border: "1px solid rgba(124,58,237,0.18)",
              borderRadius: 11,
              display: "flex",
              gap: 11,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚡</span>

            <p
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.32)",
                lineHeight: 1.65,
                margin: 0,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              We’ll save the starter mixed-poster section library now, including background
              sections. The final validation step will create more variations.
            </p>
          </div>
        )}

        {loading && progress && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "11px 15px",
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: 11,
            }}
          >
            <span
              style={{
                width: 13,
                height: 13,
                border: "2px solid rgba(167,139,250,0.3)",
                borderTopColor: "#a78bfa",
                borderRadius: "50%",
                display: "inline-block",
                animation: "ob-spin 0.7s linear infinite",
                flexShrink: 0,
              }}
            />

            <span
              style={{
                fontSize: 12,
                color: "rgba(167,139,250,0.8)",
                fontFamily: "DM Mono, monospace",
              }}
            >
              {progress}
            </span>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "11px 15px",
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.25)",
              borderRadius: 11,
              fontSize: 13,
              color: "#f87171",
              fontFamily: "DM Mono, monospace",
              lineHeight: 1.55,
            }}
          >
            <strong style={{ display: "block", marginBottom: 3 }}>Error</strong>
            {error}
          </div>
        )}
      </div>

      <style>{`@keyframes ob-spin { to { transform: rotate(360deg); } }`}</style>
    </StepShell>
  );
}

const L: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.3)",
  fontFamily: "DM Mono, monospace",
  marginBottom: 10,
};

const I: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  background: "rgba(255,255,255,0.04)",
  border: "1.5px solid rgba(255,255,255,0.08)",
  borderRadius: 11,
  color: "#f1f5f9",
  fontSize: 13,
  fontFamily: "'DM Sans', sans-serif",
  outline: "none",
  transition: "border-color 0.2s",
};
