// lib/studio/projectStore.ts
import type { VideoProject } from "@/lib/studio/types";

const DEFAULT_KEY = "studio-project";

function key(scopeKey?: string) {
  return scopeKey ? `${DEFAULT_KEY}:${scopeKey}` : DEFAULT_KEY;
}

export function saveProject(project: VideoProject, scopeKey?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(scopeKey), JSON.stringify(project));
}

export function loadProject(scopeKey?: string): VideoProject | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key(scopeKey));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as VideoProject;
  } catch {
    return null;
  }
}

export function resetProject(scopeKey?: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key(scopeKey));
}

export function createNewProject(input: {
  companyName: string;
  accentColor: string;
  scenes: any[];
}): VideoProject {
  return {
    id: crypto.randomUUID(),
    companyName: input.companyName,
    accentColor: input.accentColor,
    scenes: input.scenes,
    createdAt: new Date().getTime(),
    updatedAt: new Date().getTime(),
    concept: "",
    captionsMode: "off",
    voiceId: "rachel",
  } as VideoProject;
}