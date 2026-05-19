"use client";
/**
 * components/onboarding/StepFinalizeSetup.tsx
 *
 * Final step now:
 *  1. saves extra mixed-poster DB section variations using the working section pipeline
 *  2. marks onboarding complete
 *  3. sends user to AI chat
 *
 * No /segments/generate background call.
 */

import { useEffect, useState } from "react";
import { saveGeneratedSections } from "@/lib/save-generated-sections";
import { MIXED_POSTER_SECTIONS } from "@/lib/templates/mixed-poster";
import { StepShell } from "./StepShell";

const CANVAS_W = 1080;
const CANVAS_H = 1350;
const FIXED_ORIENTATION = "portrait" as const;
const EXTRA_VARIATION_ROUNDS = 3;

type Props = {
  orgName: string;
  brandId: string;
  logoUrl?: string;
  orientation?: typeof FIXED_ORIENTATION;
  stepIndex: number;
  onBack: () => void;
  onDone: () => void;
};

export default function StepFinalizeSetup({
  orgName,
  brandId,
  logoUrl = "",
  orientation = FIXED_ORIENTATION,
  stepIndex,
  onBack,
  onDone,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("Preparing brand section library…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        /*
         * Intentional variation generation.
         * This uses the working runtime-refresh section-saving approach from the segment composer.
         * It saves backgrounds and all mixed-poster sections to DB.
         */
        for (let round = 0; round < EXTRA_VARIATION_ROUNDS; round++) {
          if (cancelled) return;

          setProgress(
            `Saving design variation ${round + 1}/${EXTRA_VARIATION_ROUNDS}…`,
          );

          await saveGeneratedSections({
            templateFamily: "mixed-poster",
            generationSource: `onboarding-finalize-round-${round + 1}`,
            sections: MIXED_POSTER_SECTIONS,
            brandId,
            tags: [
              "onboarding",
              "finalize",
              "variation",
              "mixed-poster",
              FIXED_ORIENTATION,
              `${CANVAS_W}x${CANVAS_H}`,
              `round-${round + 1}`,
            ],
          } as any);
        }

        if (cancelled) return;

        document.cookie = "nf_onboarding=complete; Path=/; SameSite=Lax";
        setProgress("Section library ready. Opening AI chat…");

        onDone();
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Section library preparation failed.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [brandId, orgName, logoUrl, orientation, onDone]);

  return (
    <StepShell
      stepIndex={stepIndex}
      eyebrow="Final step"
      headline="Building your design library"
      sub="We’re saving extra mixed-poster section variations, including backgrounds, so AI chat has more creative room when generating posts."
      onNext={() => {}}
      onBack={onBack}
      nextLabel="Preparing…"
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

        <div
          style={{
            padding: "13px 16px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.42)",
              fontFamily: "DM Mono, monospace",
              lineHeight: 1.7,
            }}
          >
            Active workspace: {orgName || "Current organisation"}
            <br />
            Canvas: {CANVAS_W} × {CANVAS_H}
            <br />
            Extra variation rounds: {EXTRA_VARIATION_ROUNDS}
          </div>
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
            <strong style={{ display: "block", marginBottom: 4 }}>
              Section library error
            </strong>
            {error}
          </div>
        )}

        <style>{`
          @keyframes ob-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </StepShell>
  );
}
