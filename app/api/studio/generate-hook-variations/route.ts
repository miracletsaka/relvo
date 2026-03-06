import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

/**
 * Step 7 — Hook Variations (Agency workflow)
 *
 * Generates 3 alternative hooks for Scene 1 (opening).
 * Returns: { ok: true, hooks: [{ screenText, narration, durationSeconds }] }
 *
 * Uses the same AI stack as generate-voiceover-script.ts (ai-sdk/google + generateText).
 */

type Hook = {
  screenText: string;
  narration: string;
  durationSeconds: number;
};

function safeParseJsonArray(text: string): any[] | null {
  // Try direct JSON first
  try {
    const v = JSON.parse(text);
    if (Array.isArray(v)) return v;
    if (v && Array.isArray((v as any).hooks)) return (v as any).hooks;
  } catch {}
  // Try extracting a JSON array from a fenced block or extra text
  const m = text.match(/\[[\s\S]*\]/);
  if (m) {
    try {
      const v = JSON.parse(m[0]);
      if (Array.isArray(v)) return v;
    } catch {}
  }
  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeHook(x: any): Hook | null {
  if (!x) return null;
  const screenText = String(x.screenText ?? x.hook ?? "").trim();
  const narration  = String(x.narration ?? x.voice ?? x.line ?? "").trim();
  const duration   = Number(x.durationSeconds ?? x.duration ?? 5);

  if (!screenText || !narration) return null;

  return {
    screenText: screenText.slice(0, 80),
    narration:  narration.slice(0, 160),
    durationSeconds: Number.isFinite(duration) ? clamp(Math.round(duration), 4, 8) : 5,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyName = "Your Company",
      accentColor = "#7c3aed",
      currentScreenText = "",
      currentNarration  = "",
      productOrOffer = "",
      tone = "urgent",
    } = body || {};

    const system = `You are a top-tier performance creative director.
You write SHORT, punchy opening hooks for social ads (TikTok/Reels/Shorts).
You must generate hooks that feel HUMAN and specific, not generic AI.`;

    const prompt = `Generate 3 alternative opening hooks for an 8-scene short ad.

Brand: ${companyName}
Accent color: ${accentColor}
Offer context (if any): ${productOrOffer || "(not provided)"}
Preferred tone: ${tone}

Current scene 1 (for reference):
screenText: "${currentScreenText}"
narration: "${currentNarration}"

Rules:
- Output JSON array ONLY (no markdown, no extra text)
- Exactly 3 items
- Each item fields:
  - screenText (max 7 words, ALL CAPS preferred)
  - narration (max 2 short sentences, conversational)
  - durationSeconds (integer 4–6)
- Make each hook meaningfully different (angle/wording/energy).
`;

    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system,
      prompt,
      temperature: 0.9,
    });

    const arr = safeParseJsonArray(text) ?? [];
    const hooks = arr.map(normalizeHook).filter(Boolean) as Hook[];

    if (hooks.length >= 3) {
      return NextResponse.json({ ok: true, hooks: hooks.slice(0, 3) });
    }

    // Fallback if the model responds oddly
    const fallback: Hook[] = [
      { screenText: "STOP LOSING LEADS", narration: "Every missed call is lost money. Fix it today.", durationSeconds: 5 },
      { screenText: "ANSWER INSTANTLY", narration: "Customers won’t wait. We pick up and book for you.", durationSeconds: 5 },
      { screenText: "BOOK MORE JOBS", narration: "Turn calls into bookings automatically—24/7.", durationSeconds: 5 },
    ];
    return NextResponse.json({ ok: true, hooks: fallback });

  } catch (err: any) {
    console.error("[hook-variations] Error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Hook variations failed" }, { status: 500 });
  }
}
