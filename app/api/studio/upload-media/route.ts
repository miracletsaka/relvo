// app/api/studio/upload-media/route.ts
//
// Receives a file (video or image) from ProjectStudio.
// For .webm files: transcodes to .mp4 (H.264/AAC) with ffmpeg BEFORE uploading.
//   - Browser MediaRecorder produces webm with no duration metadata in the header.
//   - Remotion's <Video> component calls delayRender() waiting to seek the file,
//     then times out after 28s because webm is not seekable without a duration atom.
//   - Re-muxing to mp4 with ffmpeg adds the moov atom at the front (faststart),
//     making it fully seekable. This is the only reliable fix.
//
// For images and already-mp4 files: uploads directly, no transcoding.

import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join }        from "path";
import { execFile }    from "child_process";
import { promisify }   from "util";
import { uploadFileToSpaces } from "@/lib/video-upload-client";

const execFileAsync = promisify(execFile);
const TMP = "/tmp/neuroflow-upload";

// Resolve ffmpeg binary
async function resolveFfmpeg(): Promise<string> {
  for (const cmd of ["ffmpeg", "/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"]) {
    try {
      await execFileAsync(process.platform === "win32" ? "where" : "which", [cmd]);
      return cmd;
    } catch {}
  }
  // Try direct path existence check
  for (const p of ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"]) {
    if (existsSync(p)) return p;
  }
  throw new Error("ffmpeg not found — run: sudo apt install ffmpeg");
}

export async function POST(req: NextRequest) {
  try {
    const fd   = await req.formData();
    const file = fd.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const bytes    = await file.arrayBuffer();
    const buffer   = Buffer.from(bytes);
    const origName = file.name ?? "upload";
    const mime     = file.type ?? "";

    // Images — upload directly, no transcoding needed
    if (mime.startsWith("image/")) {
      const url = await uploadFileToSpaces(
        new File([buffer], origName, { type: mime })
      );
      return NextResponse.json({ url });
    }

    // Already mp4 from user upload — still run through faststart fix
    // so moov atom is at front. WebM from MediaRecorder — full transcode.
    const isWebm  = origName.endsWith(".webm") || mime === "video/webm";
    const isMov   = origName.endsWith(".mov")  || mime === "video/quicktime";
    const needsTranscode = isWebm || isMov;

    if (!needsTranscode && origName.endsWith(".mp4")) {
      // Run faststart fix only (fast, no re-encode)
      await mkdir(TMP, { recursive: true });
      const inPath  = join(TMP, `in-${Date.now()}.mp4`);
      const outPath = join(TMP, `out-${Date.now()}.mp4`);
      await writeFile(inPath, buffer);
      try {
        const ffmpeg = await resolveFfmpeg();
        await execFileAsync(ffmpeg, [
          "-i", inPath,
          "-c", "copy",
          "-movflags", "+faststart",
          "-y", outPath,
        ], { timeout: 30_000 });
        const outBuf = await readFile(outPath);
        const url = await uploadFileToSpaces(
          new File([outBuf], origName, { type: "video/mp4" })
        );
        return NextResponse.json({ url });
      } finally {
        await unlink(inPath).catch(() => {});
        await unlink(outPath).catch(() => {});
      }
    }

    if (!needsTranscode) {
      // Unknown video type — upload as-is
      const url = await uploadFileToSpaces(new File([buffer], origName, { type: mime }));
      return NextResponse.json({ url });
    }

    // ── WebM → MP4 transcode ──────────────────────────────────────────────────
    await mkdir(TMP, { recursive: true });
    const ts      = Date.now();
    const inPath  = join(TMP, `in-${ts}.webm`);
    const outPath = join(TMP, `out-${ts}.mp4`);

    await writeFile(inPath, buffer);
    console.log(`[upload-media] Transcoding ${origName} (${(buffer.length / 1024).toFixed(0)} KB) → mp4`);

    const ffmpeg = await resolveFfmpeg();

    try {
      // H.264 video + AAC audio, moov at front for instant seeking
      // -preset ultrafast  — minimal CPU, fast transcode (trade: slightly larger file)
      // -crf 23            — good quality
      // -movflags faststart — moov atom at START of file, Remotion can seek immediately
      await execFileAsync(ffmpeg, [
        "-i",         inPath,
        "-c:v",       "libx264",
        "-preset",    "ultrafast",
        "-crf",       "23",
        "-c:a",       "aac",
        "-b:a",       "128k",
        "-movflags",  "+faststart",
        "-pix_fmt",   "yuv420p",        // broadest compatibility
        "-y",         outPath,
      ], { timeout: 120_000 }); // 2 min max for a long take

      const outBuf  = await readFile(outPath);
      const outName = origName.replace(/\.(webm|mov)$/i, ".mp4");
      console.log(`[upload-media] Transcoded → ${(outBuf.length / 1024).toFixed(0)} KB`);

      const url = await uploadFileToSpaces(
        new File([outBuf], outName, { type: "video/mp4" })
      );
      console.log(`[upload-media] Uploaded: ${url}`);
      return NextResponse.json({ url });

    } finally {
      await unlink(inPath).catch(() => {});
      await unlink(outPath).catch(() => {});
    }

  } catch (err: any) {
    console.error("[upload-media] Error:", err);
    return NextResponse.json({ error: err?.message ?? "Upload failed" }, { status: 500 });
  }
}