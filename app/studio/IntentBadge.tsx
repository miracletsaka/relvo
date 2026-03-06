"use client";

import React from "react";

export default function IntentBadge({
  intent,
  confidence,
  accentColor,
}: {
  intent?: string;
  confidence?: number;
  accentColor: string;
}) {
  if (!intent) return null;

  const c = typeof confidence === "number" ? confidence : undefined;
  const pct = c != null ? Math.round(c * 100) : null;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.25)",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.88)",
      }}
      title={pct != null ? `Intent confidence: ${pct}%` : undefined}
    >
      <span style={{ width: 8, height: 8, borderRadius: 99, background: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />
      {intent}
      {pct != null ? <span style={{ opacity: 0.55, fontWeight: 700 }}>{pct}%</span> : null}
    </div>
  );
}
