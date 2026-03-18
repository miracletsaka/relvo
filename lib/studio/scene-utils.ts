// lib/studio/scene-utils.ts
// Shared utilities used by both generate-scenes routes.

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// ── API base ─────────────────────────────────────────────────────────────────
export function getApiBase(): string {
  // Priority order:
  // 1. API_BASE_URL         — server-only env var (set this in production)
  // 2. NEXT_PUBLIC_API_BASE — works in dev when server restarts pick it up
  // 3. NEXT_PUBLIC_API_URL  — legacy fallback
  // 4. localhost:8000       — zero-config local dev fallback (FastAPI default port)
  //
  // NOTE: NEXT_PUBLIC_* vars are NOT reliably available in server-side API routes.
  // Always set API_BASE_URL in your .env.local AND in production environment.
  const base = process.env.NEXT_PUBLIC_API_BASE  ||
    process.env.NEXT_PUBLIC_API_URL   ||
    "http://localhost:8000"
  return base;
}

// ── Category matcher ──────────────────────────────────────────────────────────
export function matchCategory(_text: string): string { return "general"; }

// ── Estimate voice duration from word count (140 wpm + 1s pad) ───────────────
export function estimateDuration(narration: string): number {
  const words = narration.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(15, Math.max(4, Math.round((words / 140) * 60) + 1));
}

// ── Robust JSON extractor with truncation recovery ────────────────────────────
// Escape literal newlines/tabs inside JSON string values (Gemini sometimes emits these)
function fixLiteralNewlinesInStrings(s: string): string {
  let out = "";
  let inStr = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { out += ch; escaped = false; continue; }
    if (ch === "\\") { escaped = true; out += ch; continue; }
    if (ch === '"') { inStr = !inStr; out += ch; continue; }
    if (inStr) {
      if      (ch === "\n") { out += "\\n"; continue; }
      else if (ch === "\r") { out += "\\r"; continue; }
      else if (ch === "\t") { out += "\\t"; continue; }
    }
    out += ch;
  }
  return out;
}

export function extractJSON<T>(raw: string): T {
  let s = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.search(/[{[]/);
  if (start === -1) throw new Error("No JSON found in Gemini response");
  s = s.slice(start);

  // Fix literal newlines/tabs inside string values before any parsing attempt
  s = fixLiteralNewlinesInStrings(s);

  // 1. Try as-is first
  try { return JSON.parse(s) as T; } catch {}

  // 2. Find the last complete object boundary (last "}," or last "}")
  //    and try to close the array there — handles truncated last element
  const lastCompleteObj = s.lastIndexOf("},");
  if (lastCompleteObj !== -1) {
    try { return JSON.parse(s.slice(0, lastCompleteObj + 1) + "]") as T; } catch {}
  }

  const lastObj = s.lastIndexOf("}");
  if (lastObj !== -1) {
    const candidate = s.slice(0, lastObj + 1);
    try {
      const wrapped = candidate.trimStart().startsWith("[") ? candidate + "]" : "[" + candidate + "]";
      return JSON.parse(wrapped) as T;
    } catch {}
  }

  // 3. Strip any unterminated string at the end (the actual error case):
  //    find the last complete key:value pair before the truncation point
  //    Pattern: remove everything after the last complete "key": "value" or "key": number/bool
  let repaired = s;

  // Remove trailing incomplete string: , "key": "partial string without closing quote
  repaired = repaired.replace(/,\s*"[^"]*":\s*"[^"]*$/, "");
  // Remove trailing incomplete key (key started but value cut off)
  repaired = repaired.replace(/,\s*"[^"]*":\s*$/, "");
  // Remove trailing bare comma
  repaired = repaired.replace(/,\s*$/, "");

  // Close any unclosed brackets
  const opens  = (repaired.match(/[{[]/g) || []).length;
  const closes = (repaired.match(/[}\]]/g) || []).length;
  const diff   = opens - closes;
  // Close in reverse order of opening
  const stack: string[] = [];
  for (const ch of repaired) {
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  repaired += stack.reverse().join("");

  try { return JSON.parse(repaired) as T; } catch {}

  // 4. Last resort — return empty array so caller can use fallback
  throw new Error(`Could not parse JSON from Gemini response. Raw: ${s.slice(0, 120)}`);
}

export async function isVeo3Available(): Promise<boolean> {
  const key = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").trim();
  if (!key) return false;
 
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { method: "GET", signal: AbortSignal.timeout(5000) }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ── Portrait-only video filter ────────────────────────────────────────────────
// Drops landscape assets so they don't letterbox in 9:16 frame.
// Assets with no dimension data are kept (covered by object-fit: cover).
export function filterPortraitVideos(assets: any[]): any[] {
  return assets.filter((a: any) => {
    const w = Number(a.width  ?? a.video_width  ?? 0);
    const h = Number(a.height ?? a.video_height ?? 0);
    if (w > 0 && h > 0) return w <= h;
    return true;
  });
}

// ── Fetch video assets from media-assets API ──────────────────────────────────
export async function fetchVideoAssets(
  brandId: string,
  usedIds: Set<string> = new Set(),
): Promise<any[]> {
  const apiBase = getApiBase();
  if (!apiBase) { console.warn("[scene-utils] API base not set"); return []; }
  try {
    const url = `${apiBase}/media-assets?type=video&brand_id=${encodeURIComponent(brandId)}`;
    console.log(`[scene-utils] API base: "${apiBase}" | fetching: ${url}`);
    const res = await fetch(url);
    console.log(`[scene-utils] Response status: ${res.status} ${res.statusText}`);
    if (!res.ok) { console.warn(`[scene-utils] fetch failed: ${res.status}`); return []; }
    const raw  = await res.json();
    const data = Array.isArray(raw) ? raw : (raw?.items ?? raw?.assets ?? raw?.data ?? []);
    console.log(`[scene-utils] Raw pool size before portrait filter: ${data.length}`);
    const pool = filterPortraitVideos(data.length ? data : []);
    console.log(`[scene-utils] Got ${pool.length} portrait assets for brand "${brandId}"`);
    pool.slice(0, 4).forEach((a: any, i: number) => console.log(`  [${i}] id=${a.id} url=${a.url?.slice(0, 60)}`));
    const unused = pool.filter((a: any) => !usedIds.has(a.id));
    return (unused.length ? unused : pool).sort(() => Math.random() - 0.5);
  } catch (e) {
    console.warn("[scene-utils] fetchVideoAssets error:", e);
    return [];
  }
}

// ── Build a sanitised scene object ────────────────────────────────────────────
export function buildScene(
  raw: any,
  index: number,
  total: number,
  videoAsset: any | null,
  brandId: string,
  veo3Available = false,
): Record<string, any> {
  const narration = String(raw.narration || "").trim();

  // Mode priority:
  // 1. media_asset — DB asset found → instant visual, shown immediately in Studio
  // 2. ai          — No asset but Veo3 configured → will generate during render
  // 3. pexels      — No asset, no Veo3 → render route falls back to Pexels/Unsplash
  let mode: string;
  if (videoAsset) {
    mode = "media_asset";
  } else if (veo3Available) {
    mode = "ai";
  } else {
    mode = "pexels";
  }

  return {
    id:              Math.random().toString(36).slice(2, 10),
    index,
    screenText:      String(raw.screenText || "SCENE").toUpperCase().trim().slice(0, 60),
    narration,
    durationSeconds: estimateDuration(narration),
    mode,
    status:          "ready",
    position:        raw.position || (index === 0 ? "opening" : index === total - 1 ? "closing" : "middle"),
    sceneEnergy:     Math.min(1, Math.max(0, Number(raw.sceneEnergy) || 0.7)),
    animationStyle:  raw.animationStyle || "calm",
    templateHint:    raw.templateHint   || "generic",
    beats:           [],
    aiPrompt:        String(raw.aiPrompt || "").trim(),
    mediaAssetId:    videoAsset?.id       ?? null,
    mediaAssetUrl:   videoAsset?.url      ?? null,
    brandId,
    // Let Studio UI know this scene needs Veo3 generation
    veo3Queued:      !videoAsset && veo3Available,
  };
}

// ── Gemini helper ─────────────────────────────────────────────────────────────
// ── callGemini ────────────────────────────────────────────────────────────────
// Always use at least 512 tokens. The JSON schema for a single scene is ~150
// tokens, but Gemini 2.5-flash pads values if not constrained by the prompt.
// 800 is safe for a single-object response and still fast.

export async function callGemini(
  prompt: string,
  maxOutputTokens: number = 800,
): Promise<string> {
  const { text } = await generateText({
    model:       openai("gpt-4o-mini"),
    prompt,
    temperature: 0.7,
    maxOutputTokens,
  });

  console.log(`[callGemini→gpt-4o-mini] raw: ${(text ?? "").slice(0, 120)}`);
  return text ?? "";
}