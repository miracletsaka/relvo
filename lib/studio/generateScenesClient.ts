// lib/studio/generateScenesClient.ts
// Calls /api/studio/generate-scenes which uses Gemini server-side.

import type { VideoScene } from "./types";

export async function generateScenes({
  concept,
  count = 4,
  companyName,
  accentColor,
}: {
  concept:      string;
  count?:       number;
  companyName:  string;
  accentColor?: string;
}): Promise<{ scenes: Partial<VideoScene>[] }> {
  const res = await fetch("/api/studio/generate-scenes", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ concept, count, companyName, accentColor }),
  });

  const json = await res.json();
  if (!json?.ok || !Array.isArray(json?.scenes)) {
    throw new Error(json?.error || "Scene generation failed");
  }

  return { scenes: json.scenes };
}