"use client";
/**
 * components/onboarding/OnboardingProgress.tsx
 * Minimal step progress indicator shared across all onboarding steps.
 */

export type Step = {
  id: string;
  label: string;
  icon: string;
};

export const ONBOARDING_STEPS: Step[] = [
  { id: "org-name",       label: "Organisation",  icon: "🏢" },
  { id: "describe",       label: "About",         icon: "📝" },
  { id: "website",        label: "Website",       icon: "🌐" },
  { id: "contact",        label: "Contact",       icon: "📞" },
  { id: "social",         label: "Socials",       icon: "📲" },
  { id: "branding",       label: "Branding",      icon: "🎨" },
];

type Props = {
  currentStep: number; // 0-indexed
  completedSteps: Set<number>;
};

export default function OnboardingProgress({ currentStep, completedSteps }: Props) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 0,
      padding: "0 24px",
    }}>
      {ONBOARDING_STEPS.map((step, i) => {
        const isCompleted = completedSteps.has(i);
        const isCurrent   = i === currentStep;
        const isPast      = i < currentStep;
        const isLast      = i === ONBOARDING_STEPS.length - 1;

        return (
          <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
            {/* Node */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                background: isCompleted || isPast
                  ? "linear-gradient(135deg, #a78bfa, #7c3aed)"
                  : isCurrent
                  ? "rgba(167,139,250,0.18)"
                  : "rgba(255,255,255,0.04)",
                border: isCurrent
                  ? "2px solid rgba(167,139,250,0.8)"
                  : isCompleted || isPast
                  ? "2px solid transparent"
                  : "2px solid rgba(255,255,255,0.08)",
                boxShadow: isCurrent ? "0 0 16px rgba(167,139,250,0.4)" : "none",
                fontSize: 15,
              }}>
                {isCompleted || isPast
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  : <span style={{ fontSize: 14 }}>{step.icon}</span>
                }
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: isCurrent ? "rgba(167,139,250,0.9)" : isPast || isCompleted ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.18)",
                fontFamily: "DM Mono, monospace",
                whiteSpace: "nowrap",
              }}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div style={{
                width: 48, height: 2, marginBottom: 22,
                background: isPast || isCompleted
                  ? "linear-gradient(90deg, #7c3aed, #a78bfa)"
                  : "rgba(255,255,255,0.07)",
                borderRadius: 1,
                transition: "background 0.4s ease",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
