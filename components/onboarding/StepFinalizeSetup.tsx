"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TemplateCanvas from "@/components/template-canvas";
import { createTemplate, getTemplates } from "@/lib/template-storage";
import { uploadFileToSpaces } from "@/lib/video-upload-client";
import { DEFAULT_CAMPAIGN_DATA } from "@/lib/campaign-context";
import type { CampaignData, Template, TemplateShape } from "@/lib/types";
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
      typeof json.detail === "string" ? json.detail :
      typeof json.message === "string" ? json.message :
      `Error ${res.status}`
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

type Orientation = "portrait" | "landscape";

type Props = {
  orgName: string;
  brandId: string;
  logoUrl?: string;
  orientation?: Orientation;
  stepIndex: number;
  onBack: () => void;
  onDone: (templateId: string) => void;
};

function waitFrames(times = 4) {
  return new Promise<void>((resolve) => {
    let count = 0;
    const tick = () => {
      count += 1;
      if (count >= times) return resolve();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function toFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png", 1)
  );
  return new File([blob], name, { type: "image/png" });
}

function getCanvasDimensions(orientation: Orientation) {
  return {
    width: 1080,
    height: orientation === "portrait" ? 1350 : 1080,
  };
}

export default function StepFinalizeSetup({
  orgName,
  brandId,
  logoUrl = "",
  orientation = "landscape",
  stepIndex,
  onBack,
  onDone,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("Checking templates…");
  const [error, setError] = useState<string | null>(null);

  const [cvData, setCvData] = useState<CampaignData>(DEFAULT_CAMPAIGN_DATA as any);
  const [cvShapes, setCvShapes] = useState<TemplateShape[]>([]);
  const [cvBg, setCvBg] = useState<string | null>(null);

  const canvasSize = useMemo(() => getCanvasDimensions(orientation), [orientation]);
  const CANVAS_WIDTH = canvasSize.width;
  const CANVAS_HEIGHT = canvasSize.height;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        setProgress("Loading active tones…");
        const tones = await apiFetch<Tone[]>("/tones?active_only=true");

        setProgress("Loading existing templates…");
        const existingTemplates = await getTemplates(brandId);

        if (cancelled) return;

        const byTone = new Map<string, Template[]>();
        for (const t of existingTemplates as any[]) {
          const toneId = (t as any).tone_id || "";
          if (!toneId) continue;
          if (!byTone.has(toneId)) byTone.set(toneId, []);
          byTone.get(toneId)!.push(t);
        }

        const missingTones = tones.filter((tone) => {
          const items = byTone.get(tone.id) || [];
          return items.length === 0;
        });

        const validTemplates = existingTemplates.filter((t: any) => !!t.tone_id);

        // If everything already valid, go straight to first valid template
        if (missingTones.length === 0 && validTemplates.length > 0) {
          const firstTemplate = validTemplates[0];
          document.cookie = "nf_onboarding=complete; Path=/; SameSite=Lax";
          onDone(firstTemplate.id);
          return;
        }

        // Generate any missing tones automatically
        for (let i = 0; i < missingTones.length; i++) {
          const tone = missingTones[i];
          const label = tone.label || tone.name || tone.id;

          setProgress(`Generating missing "${label}" template… (${i + 1}/${missingTones.length})`);

          const res = await fetch("/api/generate-template-to-canvas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignData: {
                ...DEFAULT_CAMPAIGN_DATA,
                companyName: orgName.trim(),
              },
              logoUrl,
              canvasWidth: CANVAS_WIDTH,
              canvasHeight: CANVAS_HEIGHT,
              includeDebug: true,
            }),
          });

          const data = await res.json();
          if (!data.success) {
            throw new Error(`Generation failed for "${label}"`);
          }

          setCvShapes(data.shapes || []);
          setCvBg(data.backgroundImage || null);
          setCvData({
            ...(data.campaignData || DEFAULT_CAMPAIGN_DATA),
            companyName: orgName.trim(),
          });

          await waitFrames();

          if (!canvasRef.current) throw new Error("Canvas not ready");

          setProgress(`Uploading "${label}" thumbnail… (${i + 1}/${missingTones.length})`);
          const imgFile = await toFile(canvasRef.current, `${brandId}-${tone.id}-finalize.png`);
          const thumbUrl = await uploadFileToSpaces(imgFile);

          setProgress(`Saving "${label}" template… (${i + 1}/${missingTones.length})`);
          const saveRes = await createTemplate({
            name: `${orgName.trim()} — ${label}`,
            description: "Auto-generated during onboarding validation",
            shapes: data.shapes,
            backgroundImage: data.backgroundImage || null,
            thumbnail_url: thumbUrl,
            canvasWidth: CANVAS_WIDTH,
            canvasHeight: CANVAS_HEIGHT,
            brand_id: brandId,
            tone_id: tone.id,
            orientation,
          } as any);

          if (!saveRes?.ok) {
            throw new Error(`Failed to save template for "${label}"`);
          }
        }

        // Reload templates after generation
        setProgress("Final validation…");
        const finalTemplates = await getTemplates(brandId);
        const finalValidTemplates = (finalTemplates as any[]).filter((t) => !!t.tone_id);

        const finalByTone = new Map<string, any[]>();
        for (const t of finalValidTemplates) {
          const toneId = t.tone_id || "";
          if (!toneId) continue;
          if (!finalByTone.has(toneId)) finalByTone.set(toneId, []);
          finalByTone.get(toneId)!.push(t);
        }

        const stillMissing = tones.filter((tone) => {
          const items = finalByTone.get(tone.id) || [];
          return items.length === 0;
        });

        if (stillMissing.length > 0) {
          throw new Error(
            `Validation failed. Missing templates for: ${stillMissing
              .map((t) => t.label || t.name || t.id)
              .join(", ")}`
          );
        }

        if (!finalValidTemplates.length) {
          throw new Error("No valid templates were found after validation.");
        }

        const targetTemplate = finalValidTemplates[0];

        document.cookie = "nf_onboarding=complete; Path=/; SameSite=Lax";
        setProgress("All checks passed. Redirecting…");
        onDone(targetTemplate.id);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "Validation failed.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [brandId, orgName, logoUrl, orientation, onDone]);

  return (
    <>
      <div style={{ position: "fixed", left: -9999, top: -9999, pointerEvents: "none", opacity: 0 }}>
        <TemplateCanvas
          ref={canvasRef}
          shapes={cvShapes}
          zoom={1}
          setZoom={() => {}}
          pan={{ x: 0, y: 0 }}
          setPan={() => {}}
          backgroundImage={cvBg}
          campaignData={cvData}
          selectedShapeId={null}
          onShapeSelect={() => {}}
          onShapeDrag={() => {}}
          onShapeResize={() => {}}
          canvasWidth={CANVAS_WIDTH}
          canvasHeight={CANVAS_HEIGHT}
          isEditable={false}
        />
      </div>

      <StepShell
        stepIndex={stepIndex}
        eyebrow="Final step"
        headline="Validating your setup"
        sub="We’re making sure every active tone has a valid template for your brand. Any missing ones will be generated automatically."
        onNext={() => {}}
        onBack={onBack}
        nextLabel="Validating…"
        nextDisabled
        nextLoading={loading}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: 12,
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                border: "2px solid rgba(167,139,250,0.35)",
                borderTopColor: "#a78bfa",
                borderRadius: "50%",
                display: "inline-block",
                animation: "ob-spin 0.8s linear infinite",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: "rgba(167,139,250,0.82)",
                fontFamily: "DM Mono, monospace",
                lineHeight: 1.5,
              }}
            >
              {progress}
            </span>
          </div>

          {error && (
            <div
              style={{
                padding: "12px 15px",
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.25)",
                borderRadius: 12,
                fontSize: 13,
                color: "#f87171",
                fontFamily: "DM Mono, monospace",
                lineHeight: 1.6,
              }}
            >
              <strong style={{ display: "block", marginBottom: 4 }}>Validation error</strong>
              {error}
            </div>
          )}

          <div
            style={{
              padding: "13px 16px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
            }}
          >
          </div>
        </div>

        <style>{`@keyframes ob-spin { to { transform: rotate(360deg); } }`}</style>
      </StepShell>
    </>
  );
}