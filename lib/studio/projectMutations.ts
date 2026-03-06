import type { SceneOverlayMedia, VideoProject, VideoScene, SceneMode } from "@/lib/studio/types";

function uid() {
  return Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

function normalizeSceneIndices(scenes: VideoScene[]): VideoScene[] {
  return scenes
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((s, i) => ({ ...s, index: i }));
}

// ── Add ───────────────────────────────────────────────────────────────────────
export function addScene(project: VideoProject, mode: SceneMode = "ai"): VideoProject {
  const nextIndex = project.scenes.length;
  const scene: VideoScene = {
    id: uid(),
    index: nextIndex,
    screenText: "NEW SCENE",
    narration: "Describe what should happen in this scene.",
    durationSeconds: 6,
    mode,
    status: "ready",
  };
  return { ...project, scenes: [...project.scenes, scene] };
}

// ── Update ────────────────────────────────────────────────────────────────────
export function updateScene(
  project: VideoProject,
  sceneIndex: number,
  patch: Partial<VideoScene>,
): VideoProject {
  const scenes = project.scenes.map((s) => (s.index === sceneIndex ? { ...s, ...patch } : s));
  return { ...project, scenes };
}

// ── Delete ────────────────────────────────────────────────────────────────────
export function deleteScene(project: VideoProject, sceneIndex: number): VideoProject {
  const filtered = project.scenes.filter((s) => s.index !== sceneIndex);
  return { ...project, scenes: normalizeSceneIndices(filtered) };
}

// ── Duplicate ─────────────────────────────────────────────────────────────────
// Uses File 2's safer behaviour: clears all recorded/uploaded media on the clone
// so the user explicitly re-records or re-uploads for the new scene.
// Overlay shape is preserved but blob/url handles are cleared.
export function duplicateScene(project: VideoProject, sceneIndex: number): VideoProject {
  const scenesSorted = [...project.scenes].sort((a, b) => a.index - b.index);
  const original = scenesSorted.find((s) => s.index === sceneIndex);
  if (!original) return project;

  const clone: VideoScene = {
    ...original,
    id: uid(),
    index: original.index + 1, // will be reindexed below
    status: "ready",

    // clear recording
    recordedBlobUrl: undefined,
    recordedDurationSeconds: undefined,

    // clear uploaded background
    source: "stock",
    uploadedBlobUrl: undefined,
    uploadedUrl: undefined,
    uploadedType: undefined,
    uploadedDurationSeconds: undefined,

    // clear overlay media handles but preserve geometry / timing
    overlays: (original.overlays || []).map((o) => ({
      ...o,
      id: uid(),
      blobUrl: undefined,
      url: undefined,
    })),

    // clear thumbnail so it gets regenerated fresh
    thumbnailDataUrl: undefined,
    thumbnailUpdatedAt: undefined,
  };

  const inserted: VideoScene[] = [];
  for (const s of scenesSorted) {
    inserted.push(s);
    if (s.index === sceneIndex) inserted.push(clone);
  }

  return { ...project, scenes: normalizeSceneIndices(inserted) };
}

// ── Add overlay ───────────────────────────────────────────────────────────────
export function addOverlayToScene(
  project: VideoProject,
  sceneIndex: number,
  overlay: Omit<SceneOverlayMedia, "id">,
): VideoProject {
  const id = uid();
  const scenes = project.scenes.map((s) => {
    if (s.index !== sceneIndex) return s;
    return { ...s, overlays: [...(s.overlays || []), { ...overlay, id }] };
  });
  return { ...project, scenes };
}

// ── Merge generated scenes ────────────────────────────────────────────────────
// Merges regenerated script/caption data back into an existing project
// WITHOUT clobbering any recorded/uploaded media, overlays, or user overrides.
//
// Updated fields:  screenText, narration, durationSeconds, templateHint,
//                  aiPrompt, and any enrichment knobs listed below.
// Preserved fields: recordedBlobUrl, uploadedBackgroundUrl, overlays,
//                   mode, status (unless the generated scene explicitly sets them).
export function mergeGeneratedScenes(
  project: VideoProject,
  generated: VideoScene[],
): VideoProject {
  const byIdx = new Map<number, VideoScene>(generated.map((s) => [s.index, s]));

  const ENRICHMENT_KEYS = [
    "beats",
    "intent",
    "intentConfidence",
    "motionPreset",
    "motionIntensity",
    "overlayIntensity",
    "bgTint",
    "animVariant",
    "captionsMode",
  ] as const;

  const merged = project.scenes.map((s) => {
    const g = byIdx.get(s.index);
    if (!g) return s;
    return {
      ...s,
      screenText: g.screenText,
      narration: g.narration,
      durationSeconds: g.durationSeconds,
      templateHint: g.templateHint ?? s.templateHint,
      aiPrompt: g.aiPrompt ?? s.aiPrompt,
      // carry enrichment fields only when present on the generated scene
      ...(Object.fromEntries(
        Object.entries(g).filter(([k]) => (ENRICHMENT_KEYS as readonly string[]).includes(k)),
      ) as any),
    } as VideoScene;
  });

  // Append brand-new scenes that weren't in the project at all
  const extra: VideoScene[] = generated
    .filter((g) => !project.scenes.some((s) => s.index === g.index))
    .map((g) => ({
      ...g,
      id: g.id || uid(),
      mode: g.mode || "ai",
      status: "ready",
    } as VideoScene));

  return { ...project, scenes: normalizeSceneIndices([...merged, ...extra]) };
}