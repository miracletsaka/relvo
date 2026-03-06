// lib/studio/extractBeats.ts
/**
 * Pull out numbers that are "visually meaningful" so Remotion can animate them.
 * Examples:
 *  - 80%
 *  - £199
 *  - 24/7
 *  - 4.8/5
 */
export type Beat = {
  kind: "percent" | "money" | "ratio" | "fraction" | "number";
  value: string; // keep as string for rendering, parse later if needed
  start?: number; // optional: later you can align with word markers
};

export function extractBeats(text: string): Beat[] {
  const src = text || "";
  const beats: Beat[] = [];

  // 80%
  for (const m of src.matchAll(/\b(\d{1,3}(?:\.\d+)?)\s*%\b/g)) {
    beats.push({ kind: "percent", value: `${m[1]}%` });
  }

  // £199 / $199 / MK3000
  for (const m of src.matchAll(/\b(£|\$|MK)\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g)) {
    beats.push({ kind: "money", value: `${m[1]}${m[2]}` });
  }

  // 24/7
  for (const m of src.matchAll(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && b <= 10) {
      beats.push({ kind: "ratio", value: `${m[1]}/${m[2]}` });
    }
  }

  // plain numbers (keep only if 2+ digits)
  for (const m of src.matchAll(/\b(\d{2,})(?:\.\d+)?\b/g)) {
    const v = m[0];
    // avoid duplicates like "80" from "80%"
    if (beats.some((b) => b.value.includes(v))) continue;
    beats.push({ kind: "number", value: v });
  }

  return beats.slice(0, 6);
}