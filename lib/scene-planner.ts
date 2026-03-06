// lib/studio/scenePlan.ts
import type { VoiceSegment } from "@/lib/generate-voiceover-script";

/**
 * A simple, free, zero-API generator.
 * Swap this later with an LLM call if you want.
 */
export function planScenes(opts: {
  prompt: string;
  companyName: string;
  accentColor: string;
  sceneCount: number;
  alternateWebcam: boolean;
  minSeconds: number;
  maxSeconds: number;
}): VoiceSegment[] {
  const {
    prompt,
    companyName,
    sceneCount,
    alternateWebcam,
    minSeconds,
    maxSeconds,
  } = opts;

  const clampDur = (n: number) => Math.max(minSeconds, Math.min(maxSeconds, n));

  // A light “agency-style” scaffold that scales up to 60 scenes:
  // Hook → Problem → Consequence → Solution → Proof/Stats → Offer → CTA
  const buckets = buildBuckets(sceneCount);

  const segments: VoiceSegment[] = buckets.map((b, i) => {
    const preferWebcam = alternateWebcam ? i % 2 === 0 : b.preferWebcam;
    const baseDur =
      b.kind === "hook" ? 5 : b.kind === "cta" ? 5 : b.kind === "stat" ? 6 : 6;

    const narration = renderNarration(b.kind, {
      companyName,
      prompt,
      index: i + 1,
      total: sceneCount,
    });

    const screenText = renderScreenText(b.kind, {
      companyName,
      prompt,
      index: i + 1,
      total: sceneCount,
    });

    return {
      position: b.position,
      narration,
      screenText,
      durationSeconds: clampDur(baseDur),
      preferWebcam,
      // fields your renderer already likes having
      showCTA: b.kind === "cta",
      ctaText: b.kind === "cta" ? "Book now" : "",
      sceneEnergy: b.kind === "hook" ? 0.9 : b.kind === "cta" ? 0.8 : 0.6,
      visualDescription: b.kind === "stat" ? "clean stats overlay" : "cinematic b-roll",
      pexelsQuery: guessPexelsQuery(prompt) || "business",
    } as any;
  });

  return segments;
}

function buildBuckets(n: number): { kind: string; position: any; preferWebcam: boolean }[] {
  if (n <= 8) {
    return [
      { kind: "hook", position: "opening", preferWebcam: true },
      { kind: "problem", position: "opening", preferWebcam: false },
      { kind: "problem2", position: "middle", preferWebcam: true },
      { kind: "solution", position: "middle", preferWebcam: false },
      { kind: "stat", position: "middle", preferWebcam: true },
      { kind: "proof", position: "middle", preferWebcam: false },
      { kind: "offer", position: "closing", preferWebcam: true },
      { kind: "cta", position: "closing", preferWebcam: false },
    ].slice(0, n);
  }

  // For 60 scenes: start strong, then repeat value beats, end strong
  const out: any[] = [];
  out.push({ kind: "hook", position: "opening", preferWebcam: true });
  out.push({ kind: "problem", position: "opening", preferWebcam: false });
  out.push({ kind: "solution", position: "opening", preferWebcam: true });

  const middleCount = Math.max(0, n - 6);
  for (let i = 0; i < middleCount; i++) {
    const kind =
      i % 5 === 0 ? "stat" : i % 5 === 1 ? "feature" : i % 5 === 2 ? "benefit" : i % 5 === 3 ? "proof" : "offer";
    out.push({ kind, position: "middle", preferWebcam: i % 2 === 0 });
  }

  out.push({ kind: "offer", position: "closing", preferWebcam: true });
  out.push({ kind: "cta", position: "closing", preferWebcam: false });
  out.push({ kind: "cta2", position: "closing", preferWebcam: true });

  return out.slice(0, n);
}

function renderScreenText(kind: string, ctx: any) {
  const { companyName } = ctx;
  switch (kind) {
    case "hook":
      return "STOP losing customers";
    case "problem":
      return "They call someone else";
    case "problem2":
      return "Seconds matter";
    case "solution":
      return `${companyName} fixes it`;
    case "stat":
      return "80% faster response";
    case "feature":
      return "24/7 answering";
    case "benefit":
      return "More booked jobs";
    case "proof":
      return "Rated 4.8/5";
    case "offer":
      return "Limited offer";
    case "cta":
    case "cta2":
      return "Book your demo";
    default:
      return "Upgrade your growth";
  }
}

function renderNarration(kind: string, ctx: any) {
  const { companyName, prompt } = ctx;
  switch (kind) {
    case "hook":
      return `If you're still missing calls, you're losing money every day.`;
    case "problem":
      return `When you don't answer immediately, people choose a competitor.`;
    case "problem2":
      return `Most customers decide in under 30 seconds.`;
    case "solution":
      return `${companyName} answers instantly and books the job automatically.`;
    case "stat":
      return `Teams see up to 80% faster response times and more conversions.`;
    case "feature":
      return `It works 24/7, qualifies leads, and schedules appointments.`;
    case "benefit":
      return `That means more booked jobs — without hiring extra staff.`;
    case "proof":
      return `Clients rate the experience 4.8 out of 5 on average.`;
    case "offer":
      return `For a limited time, get setup included when you start this week.`;
    case "cta":
    case "cta2":
      return `Book a demo now and stop losing revenue to missed calls.`;
    default:
      return `Here’s how ${companyName} helps: ${prompt || "faster response, better conversion, more revenue."}`;
  }
}

function guessPexelsQuery(prompt: string) {
  const p = (prompt || "").toLowerCase();
  if (p.includes("plumb")) return "plumber repair";
  if (p.includes("roof")) return "roofing construction";
  if (p.includes("dent")) return "dental clinic";
  if (p.includes("real estate")) return "luxury home";
  return "";
}