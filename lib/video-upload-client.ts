// lib/video-upload-client.ts
// ─────────────────────────────────────────────────────────────────────────────
// FIX: server-side (render-video route) calls S3 directly instead of
//      fetching /api/uploads/presign over HTTP.
//
// WHY: uploadFileToSpaces is called from the render-video API route (server-side).
//      The old code did fetch(`${NEXT_PUBLIC_APP_URL}/api/uploads/presign`) which
//      on the droplet resolved to http://localhost:3000/... — a self-fetch that
//      either failed or didn't carry the right env vars, causing "Failed to presign".
//
//      Media uploads from the browser still use the /api/uploads/presign route
//      as before — zero change to that path.
// ─────────────────────────────────────────────────────────────────────────────

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ── Server-side: generate presigned URL directly via S3 SDK ──────────────────
async function presignServer(
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  // Dynamic import keeps the S3 SDK out of the browser bundle entirely
  const { s3, S3_BUCKET, S3_PUBLIC_URL } = await import("@/lib/s3-server");
  const key = `neuroflow/${Date.now()}-${fileName}`.replace(/\s+/g, "_");
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: "public-read",
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = `${S3_PUBLIC_URL}/${key}`;
  return { uploadUrl, publicUrl };
}

// ── Client-side: call the presign API route as before ────────────────────────
async function presignClient(
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const res = await fetch(`${window.location.origin}/api/uploads/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, contentType }),
  });
  if (!res.ok) throw new Error("Failed to presign upload");
  return res.json();
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function uploadFileToSpaces(file: File): Promise<string> {
  const contentType = file.type || "application/octet-stream";

  // Server-side (API routes, render-video): go direct to S3, no HTTP self-fetch
  // Client-side (browser): use the presign API route as before
  const { uploadUrl, publicUrl } =
    typeof window === "undefined"
      ? await presignServer(file.name, contentType)
      : await presignClient(file.name, contentType);

  // Upload file bytes directly to Spaces via the presigned URL
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "x-amz-acl": "public-read",
    },
    body: file,
  });

  if (!putRes.ok) {
    const t = await putRes.text().catch(() => "");
    throw new Error(`Upload failed: ${putRes.status} ${t.slice(0, 200)}`);
  }

  return publicUrl;
}

// ── Helper: download image URL / base64 and upload to Spaces ─────────────────
export async function uploadGeneratedBackgroundToSpaces(
  imageUrl: string
): Promise<string> {
  let blob: Blob;

  if (imageUrl.startsWith("data:")) {
    // base64 data URL (e.g. from OpenAI image generation)
    const [header, base64Data] = imageUrl.split(",");
    const mimeMatch = header.match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    blob = new Blob([bytes], { type: mimeType });
  } else {
    // Regular HTTP URL — download first
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    blob = await response.blob();
  }

  const file = new File(
    [blob],
    `generated-background-${Date.now()}.png`,
    { type: "image/png" }
  );
  return uploadFileToSpaces(file);
}