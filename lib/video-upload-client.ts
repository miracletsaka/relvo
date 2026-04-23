// lib/video-upload-client.ts
// ─────────────────────────────────────────────────────────────────────────────
// Safe upload helper for both browser and server-side usage.
//
// Keeps current working behavior:
//   - Server-side: presign directly with S3 SDK
//   - Client-side: call /api/uploads/presign
//
// Fixes added:
//   1. Longer presign expiry on server-side direct presign
//   2. One-time retry if PUT fails because the signed URL expired
//   3. credentials: "include" on browser presign call
//   4. safer file-name normalization
// ─────────────────────────────────────────────────────────────────────────────

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type PresignResult = {
  uploadUrl: string;
  publicUrl: string;
};

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isExpiredUploadError(status: number, bodyText: string): boolean {
  const t = (bodyText || "").toLowerCase();
  return (
    status === 403 &&
    (
      t.includes("request has expired") ||
      t.includes("<code>accessdenied</code>") ||
      t.includes("accessdenied") ||
      t.includes("expired")
    )
  );
}

// ── Server-side: generate presigned URL directly via S3 SDK ──────────────────
async function presignServer(
  fileName: string,
  contentType: string
): Promise<PresignResult> {
  const { s3, S3_BUCKET, S3_PUBLIC_URL } = await import("@/lib/s3-server");

  const safeName = sanitizeFileName(fileName);
  const key = `neuroflow/${Date.now()}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: "public-read",
  });

  // Increased from 300 to 600 for safer multi-step onboarding flows
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
  const publicUrl = `${S3_PUBLIC_URL}/${key}`;

  return { uploadUrl, publicUrl };
}

// ── Client-side: call the presign API route as before ────────────────────────
async function presignClient(
  fileName: string,
  contentType: string
): Promise<PresignResult> {
  const res = await fetch(`${window.location.origin}/api/uploads/presign`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: sanitizeFileName(fileName),
      contentType,
    }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      typeof json?.detail === "string"
        ? json.detail
        : "Failed to presign upload"
    );
  }

  return json as PresignResult;
}

async function presign(
  fileName: string,
  contentType: string
): Promise<PresignResult> {
  return typeof window === "undefined"
    ? presignServer(fileName, contentType)
    : presignClient(fileName, contentType);
}

async function putWithSignedUrl(
  uploadUrl: string,
  file: File,
  contentType: string
): Promise<Response> {
  return fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "x-amz-acl": "public-read",
    },
    body: file,
  });
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function uploadFileToSpaces(file: File): Promise<string> {
  const contentType = file.type || "application/octet-stream";

  // 1st attempt
  let { uploadUrl, publicUrl } = await presign(file.name, contentType);

  let putRes = await putWithSignedUrl(uploadUrl, file, contentType);

  if (putRes.ok) {
    return publicUrl;
  }

  let bodyText = await putRes.text().catch(() => "");

  // Retry once if the signed URL expired
  if (isExpiredUploadError(putRes.status, bodyText)) {
    console.warn("Signed upload URL expired. Re-presigning and retrying once...");

    const retryPresign = await presign(file.name, contentType);
    uploadUrl = retryPresign.uploadUrl;
    publicUrl = retryPresign.publicUrl;

    putRes = await putWithSignedUrl(uploadUrl, file, contentType);

    if (putRes.ok) {
      return publicUrl;
    }

    bodyText = await putRes.text().catch(() => "");
  }

  throw new Error(`Upload failed: ${putRes.status} ${bodyText.slice(0, 300)}`);
}

// ── Helper: download image URL / base64 and upload to Spaces ─────────────────
export async function uploadGeneratedBackgroundToSpaces(
  imageUrl: string
): Promise<string> {
  let blob: Blob;

  if (imageUrl.startsWith("data:")) {
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