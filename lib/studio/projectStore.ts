import type { VideoProject, VideoScene } from "@/lib/studio/types";

const KEY = "studio_project_v1";

function uid() {
  return Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

export function createNewProject(
  input?: Partial<Pick<VideoProject, "companyName" | "accentColor">> & { scenes?: Partial<VideoScene>[] }
): VideoProject {
  const scenes: VideoScene[] = (input?.scenes?.length ? input.scenes : defaultScenes()).map((s, idx) => ({
    id: s.id || uid(),
    index: Number.isFinite(s.index as any) ? (s.index as number) : idx,
    screenText: s.screenText || "",
    narration: s.narration || "",
    durationSeconds: typeof s.durationSeconds === "number" ? s.durationSeconds : 6,
    status: (s.status as any) || "ready",
    mode: (s.mode as any) || (idx % 2 === 0 ? "webcam" : "broll"),
    recordedBlobUrl: s.recordedBlobUrl,
    recordedDurationSeconds: s.recordedDurationSeconds,
    thumbnailDataUrl: (s as any).thumbnailDataUrl,
    thumbnailUpdatedAt: (s as any).thumbnailUpdatedAt,
  }));

  return {
    id: uid(),
    createdAt: Date.now(),
    companyName: input?.companyName || "Relvo",
    accentColor: input?.accentColor || "#7c3aed",
    scenes,
  };
}

function defaultScenes(): Partial<VideoScene>[] {
  return new Array(8).fill(null).map((_, i) => ({
    index: i,
    screenText: i === 0 ? "STOP missing calls" : `Scene ${i + 1}`,
    narration: i === 0 ? "Still missing customer calls every day?" : "Replace this narration.",
    durationSeconds: i === 0 ? 5 : 6,
    status: "ready",
    mode: i % 2 === 0 ? "webcam" : "broll",
  }));
}

export function loadProject(): VideoProject | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as VideoProject;
  } catch {
    return null;
  }
}

export function saveProject(project: VideoProject) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(project));
}

export function resetProject() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function updateScene(project: VideoProject, sceneIndex: number, patch: Partial<VideoScene>): VideoProject {
  const scenes = project.scenes.map((s) => (s.index === sceneIndex ? { ...s, ...patch } : s));
  return { ...project, scenes };
}
