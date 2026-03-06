export type ScenePosition = "opening" | "middle" | "closing";

export type PlannedScene = {
  index: number;
  position: ScenePosition;
  /** default: even = webcam, odd = b-roll. Can be overridden later. */
  preferWebcam: boolean;
  /** target seconds */
  durationSeconds: number;
};

/**
 * A simple "agency-ish" pacing plan for long videos.
 * - Openings are punchy
 * - Middles are mostly b-roll with proof, numbers, features
 * - Closings tighten up + CTA
 */
export function buildScenePlan(sceneCount: number): PlannedScene[] {
  const n = Math.max(1, Math.min(120, Math.floor(sceneCount || 8)));
  const plan: PlannedScene[] = [];

  for (let i = 0; i < n; i++) {
    const position: ScenePosition =
      i < Math.max(1, Math.round(n * 0.2)) ? "opening" :
      i < Math.max(2, Math.round(n * 0.85)) ? "middle" :
      "closing";

    // Shorter at the start/end, steadier in the middle
    const base = position === "opening" ? 5 : position === "closing" ? 5 : 6;

    plan.push({
      index: i,
      position,
      preferWebcam: i % 2 === 0,
      durationSeconds: base,
    });
  }

  return plan;
}
