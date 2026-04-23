/**
 * components/TemplateReadyBanner.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown on /dashboard/create when a new user has just onboarded.
 *
 * Behaviour:
 *  - If user has 0 templates AND was just onboarded → shows "generating…" banner
 *  - Polls every 4 seconds for up to 60 seconds
 *  - When templates appear → shows "ready" banner with a refresh button
 *  - If polling times out → shows "try manually" fallback
 *  - If user already has templates → renders nothing
 *
 * Integration:
 *   Drop this at the top of your dashboard/create page:
 *   <TemplateReadyBanner onTemplatesReady={() => void fetchTemplates()} />
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

type BannerState =
  | "hidden"      // user has templates — don't show
  | "generating"  // polling, no templates yet
  | "ready"       // templates appeared!
  | "timeout"     // gave up polling — manual fallback
  | "loading";    // initial check

interface Props {
  /** Called when new templates are detected — use to refresh your template list */
  onTemplatesReady?: () => void;
}

export function TemplateReadyBanner({ onTemplatesReady }: Props) {
  const [state,     setState]     = useState<BannerState>("loading");
  const [dismissed, setDismissed] = useState(false);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const attempts = useRef(0);
  const MAX_POLLS = 15; // 15 × 4s = 60s timeout

  const checkTemplates = useCallback(async (): Promise<number> => {
    try {
      const res = await fetch(`${API}/templates?limit=1`, { credentials: "include" });
      if (!res.ok) return 0;
      const data = await res.json().catch(() => ({ items: [], total: 0 }));
      // Handle both array and paginated response shapes
      if (Array.isArray(data)) return data.length;
      return data.total ?? data.items?.length ?? 0;
    } catch {
      return 0;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const count = await checkTemplates();
      if (cancelled) return;

      if (count > 0) {
        // User already has templates — stay hidden
        setState("hidden");
        return;
      }

      // No templates yet — start polling
      setState("generating");

      pollRef.current = setInterval(async () => {
        if (cancelled) return;
        attempts.current++;

        const n = await checkTemplates();
        if (cancelled) return;

        if (n > 0) {
          clearInterval(pollRef.current!);
          setState("ready");
          onTemplatesReady?.();
          return;
        }

        if (attempts.current >= MAX_POLLS) {
          clearInterval(pollRef.current!);
          setState("timeout");
        }
      }, 4000);
    };

    void init();

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkTemplates, onTemplatesReady]);

  if (state === "hidden" || state === "loading" || dismissed) return null;

  const colors = {
    generating: {
      bg:     "rgba(124,58,237,0.08)",
      border: "rgba(124,58,237,0.25)",
      icon:   "#a78bfa",
      text:   "#a78bfa",
    },
    ready: {
      bg:     "rgba(52,211,153,0.08)",
      border: "rgba(52,211,153,0.25)",
      icon:   "#34d399",
      text:   "#34d399",
    },
    timeout: {
      bg:     "rgba(251,191,36,0.07)",
      border: "rgba(251,191,36,0.22)",
      icon:   "#fbbf24",
      text:   "#fbbf24",
    },
  }[state];

  const messages = {
    generating: "Generating your starter templates in the background…",
    ready:      "Your templates are ready! Refresh to load them.",
    timeout:    "Template generation is taking longer than usual. Use Generate AI Template to create one manually.",
  }[state];

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 16px",
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      marginBottom: 16,
      fontFamily: "DM Mono, monospace",
      fontSize: 12,
      color: colors.text,
      lineHeight: 1.5,
    }}>
      {/* Icon */}
      {state === "generating" ? (
        <span style={{
          width: 14, height: 14, flexShrink: 0,
          border: "2px solid rgba(167,139,250,0.3)",
          borderTopColor: "#a78bfa",
          borderRadius: "50%",
          display: "inline-block",
          animation: "banner-spin 0.8s linear infinite",
        }} />
      ) : state === "ready" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" style={{ flexShrink: 0 }}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      )}

      <span style={{ flex: 1 }}>{messages}</span>

      {/* Action button */}
      {state === "ready" && (
        <button
          onClick={() => { onTemplatesReady?.(); setDismissed(true); }}
          style={{
            padding: "5px 12px",
            background: "rgba(52,211,153,0.12)",
            border: "1px solid rgba(52,211,153,0.3)",
            borderRadius: 8,
            color: "#34d399",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "DM Mono, monospace",
            cursor: "pointer",
            letterSpacing: "0.05em",
            flexShrink: 0,
          }}
        >
          Load templates
        </button>
      )}

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.4, padding: "2px 4px", fontSize: 14, flexShrink: 0 }}
      >
        ×
      </button>

      <style>{`@keyframes banner-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}