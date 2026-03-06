import type { VideoProject, VideoScene } from "./types";

// Creates a thumbnail dataURL in the browser (no server calls).
// Priority:
// 1) uploadedUrl       (uploaded background, Spaces CDN URL)
// 2) uploadedBlobUrl   (uploaded background, local blob preview)
// 3) recordedBlobUrl   (webcam / broll recording)
// 4) first overlay url / blobUrl
// 5) AI placeholder
//
// Accepts either:
//   generateThumbnailForScene(scene: VideoScene)
//   generateThumbnailForScene(project: VideoProject, index: number)
export async function generateThumbnailForScene(
  sceneOrProject: VideoScene | VideoProject,
  index?: number,
): Promise<string | undefined> {
  const scene: VideoScene | undefined =
    index !== undefined
      ? (sceneOrProject as VideoProject).scenes[index]
      : (sceneOrProject as VideoScene);

  if (!scene) return undefined;

  const firstOverlay = scene.overlays?.find((o) => o.url || o.blobUrl);

  const src: string | null =
    scene.uploadedUrl ||
    scene.uploadedBlobUrl ||
    scene.recordedBlobUrl ||
    firstOverlay?.url ||
    firstOverlay?.blobUrl ||
    null;

  // AI placeholder (no media yet)
  if (!src && scene.mode === "ai") {
    return createPlaceholder(scene.screenText || "AI");
  }
  if (!src) return undefined;

  // If src is a blob: URL it may be revoked — try fetch first, fall back to
  // loading directly into a <video>/<img> element.
  if (src.startsWith("blob:")) {
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error("blob fetch not ok");
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      const out = await drawMediaToCanvas(obj, scene);
      URL.revokeObjectURL(obj);
      return out ?? undefined;
    } catch {
      // fallback: use src directly
      return (await drawMediaToCanvas(src, scene)) ?? undefined;
    }
  }

  return (await drawMediaToCanvas(src, scene)) ?? undefined;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function drawMediaToCanvas(
  src: string,
  scene: VideoScene,
): Promise<string | null> {
  const isVideo =
    scene.uploadedType === "video" ||
    scene.mode === "webcam" ||
    src.endsWith(".webm") ||
    src.endsWith(".mp4") ||
    src.includes("video");

  if (isVideo) return thumbnailFromVideo(src);
  return thumbnailFromImage(src);
}

function createPlaceholder(label: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 540;
  canvas.height = 960;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, "#111827");
  g.addColorStop(1, "#0b0b0b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(124,58,237,0.25)";
  ctx.fillRect(40, 60, canvas.width - 80, 140);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 38px Arial";
  ctx.fillText("AI SCENE", 60, 120);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "bold 30px Arial";
  ctx.fillText((label || "").slice(0, 22), 60, 175);
  return canvas.toDataURL("image/jpeg", 0.86);
}

async function thumbnailFromImage(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 540;
      canvas.height = 960;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      // cover-fit
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function thumbnailFromVideo(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = src;

    const cleanup = () => {
      try { video.pause(); } catch {}
      video.removeAttribute("src");
      video.load();
    };

    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.12, video.duration || 0.12);
      } catch {}
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 540;
      canvas.height = 960;
      const ctx = canvas.getContext("2d");
      if (!ctx) { cleanup(); return resolve(null); }
      // cover-fit
      const vw = video.videoWidth || 540;
      const vh = video.videoHeight || 960;
      const scale = Math.max(canvas.width / vw, canvas.height / vh);
      const w = vw * scale;
      const h = vh * scale;
      ctx.drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      const out = canvas.toDataURL("image/jpeg", 0.86);
      cleanup();
      resolve(out);
    };

    video.onerror = () => { cleanup(); resolve(null); };
  });
}