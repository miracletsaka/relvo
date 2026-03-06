"use client";

// Local, zero-backend render library.
// Stores render history in localStorage so you can:
// - keep multiple outputs per project
// - compare versions
// - generate a shareable review link (video URL in query string)

export type RenderLibraryItem = {
  id: string;
  projectId: string;
  projectName: string;
  accentColor?: string;
  url: string;
  poster?: string | null;
  meta?: any;
  createdAt: string; // ISO
};

const KEY = "studio_render_library_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uid(): string {
  // Browser + Node 18+ have crypto.randomUUID
  try {
    // @ts-ignore
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export function getRenderLibrary(): RenderLibraryItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<RenderLibraryItem[]>(window.localStorage.getItem(KEY), []);
}

export function setRenderLibrary(items: RenderLibraryItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export function addRenderToLibrary(input: {
  projectId: string;
  projectName: string;
  accentColor?: string;
  url: string;
  poster?: string | null;
  meta?: any;
}): RenderLibraryItem {
  const items = getRenderLibrary();
  const item: RenderLibraryItem = {
    id: uid(),
    projectId: input.projectId,
    projectName: input.projectName,
    accentColor: input.accentColor,
    url: input.url,
    poster: input.poster ?? null,
    meta: input.meta,
    createdAt: new Date().toISOString(),
  };

  // newest first
  const next = [item, ...items].slice(0, 200);
  setRenderLibrary(next);
  return item;
}

export function deleteRenderFromLibrary(id: string) {
  const next = getRenderLibrary().filter((x) => x.id !== id);
  setRenderLibrary(next);
}

export function clearRenderLibrary() {
  setRenderLibrary([]);
}

export function buildReviewLink(url: string): string {
  // Review page reads ?url=
  const u = new URL(typeof window !== "undefined" ? window.location.href : "http://localhost");
  return `${u.origin}/review?url=${encodeURIComponent(url)}`;
}
