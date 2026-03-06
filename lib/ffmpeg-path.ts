// lib/ffmpeg-path.ts
// Finds ffmpeg/ffprobe binary across all possible sources:
// 1. ffmpeg-static npm package
// 2. @remotion/renderer bundled ffmpeg
// 3. System PATH (Linux/Mac)
// Falls back gracefully on Windows if none found

import fs from "fs";
import path from "path";

function findInNodeModules(relPath: string): string | null {
  try {
    // Walk up from cwd looking for node_modules
    let dir = process.cwd();
    for (let i = 0; i < 6; i++) {
      const candidate = path.join(dir, "node_modules", relPath);
      if (fs.existsSync(candidate)) return candidate;
      dir = path.dirname(dir);
    }
  } catch {}
  return null;
}

export function getFfmpegBin(): string {
  // 1. ffmpeg-static
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const p = require("ffmpeg-static");
    if (p && fs.existsSync(p)) return p;
  } catch {}

  // 2. @remotion/renderer ships its own ffmpeg
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const remotionFfmpeg = require("@remotion/renderer").getLocalFfmpegPath?.();
    if (remotionFfmpeg && fs.existsSync(remotionFfmpeg)) return remotionFfmpeg;
  } catch {}

  // 3. Common Windows install locations
  if (process.platform === "win32") {
    const windowsPaths = [
      "C:\\ffmpeg\\bin\\ffmpeg.exe",
      "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
      "C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe",
      path.join(process.env.USERPROFILE || "C:\\Users\\User", "ffmpeg", "bin", "ffmpeg.exe"),
      path.join(process.env.LOCALAPPDATA || "", "ffmpeg", "bin", "ffmpeg.exe"),
    ];
    for (const p of windowsPaths) {
      if (fs.existsSync(p)) return p;
    }
    // Last resort: hope it's in PATH
    return "ffmpeg.exe";
  }

  // 4. Unix system ffmpeg
  return "ffmpeg";
}

export function getFfprobeBin(): string {
  // 1. ffprobe-static
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const p = require("ffprobe-static");
    if (p?.path && fs.existsSync(p.path)) return p.path;
    if (typeof p === "string" && fs.existsSync(p)) return p;
  } catch {}

  // 2. @remotion/renderer
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const remotionFfprobe = require("@remotion/renderer").getLocalFfprobePath?.();
    if (remotionFfprobe && fs.existsSync(remotionFfprobe)) return remotionFfprobe;
  } catch {}

  // 3. Same dir as ffmpeg (they're usually together)
  const ffmpegBin = getFfmpegBin();
  if (ffmpegBin !== "ffmpeg.exe" && ffmpegBin !== "ffmpeg") {
    const ffprobeCandidate = ffmpegBin
      .replace(/ffmpeg(\.exe)?$/i, process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
    if (fs.existsSync(ffprobeCandidate)) return ffprobeCandidate;
  }

  // 4. Windows common paths
  if (process.platform === "win32") {
    const windowsPaths = [
      "C:\\ffmpeg\\bin\\ffprobe.exe",
      "C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe",
      path.join(process.env.USERPROFILE || "C:\\Users\\User", "ffmpeg", "bin", "ffprobe.exe"),
    ];
    for (const p of windowsPaths) {
      if (fs.existsSync(p)) return p;
    }
    return "ffprobe.exe";
  }

  return "ffprobe";
}

// Log resolved paths on first use (dev only)
let logged = false;
export function logBinPaths() {
  if (logged || process.env.NODE_ENV !== "development") return;
  logged = true;
  console.log("[ffmpeg-path] ffmpeg:", getFfmpegBin());
  console.log("[ffmpeg-path] ffprobe:", getFfprobeBin());
}