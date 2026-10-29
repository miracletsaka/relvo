// lib/video-upload-client.ts
// Works in the browser and on the server. Uploads to S3 via presigned PUT.

type PresignResult = {
  uploadUrl: string;
  key: string;
  publicUrl: string | null; // null unless S3_PUBLIC_BASE_URL (CloudFront) is set
};

export type UploadedFile = { key: string; url: string | null };

// ── Server-side: presign directly (no HTTP hop) ──────────────────────────────
async function presignServer(file: File, contentType: string): Promise<PresignResult> {
  // Dynamic import keeps the AWS SDK out of the browser bundle
  const { createPresignedUpload } = await import("@/lib/s3-presign");
  return createPresignedUpload({ fileName: file.name, contentType, size: file.size });
}

// ── Client-side: call the API route ──────────────────────────────────────────
async function presignClient(file: File, contentType: string): Promise<PresignResult> {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType,
      size: file.size, // required by the route
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || json?.detail || `Presign failed (${res.status})`);
  }
  return json as PresignResult;
}

function presign(file: File, contentType: string) {
  return typeof window === "undefined"
    ? presignServer(file, contentType)
    : presignClient(file, contentType);
}

function putWithSignedUrl(uploadUrl: string, file: File, contentType: string) {
  return fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType }, // must match the signed value; no ACL header
    body: file,
  });
}

function isExpired(status: number, bodyText: string) {
  return status === 403 && bodyText.toLowerCase().includes("expired");
}

// ── Main: returns key + optional public URL ──────────────────────────────────
export async function uploadFile(file: File): Promise<UploadedFile> {
  const contentType = file.type || "application/octet-stream";

  let { uploadUrl, key, publicUrl } = await presign(file, contentType);
  let putRes = await putWithSignedUrl(uploadUrl, file, contentType);

  if (!putRes.ok) {
    let bodyText = await putRes.text().catch(() => "");

    // Retry once if the signed URL expired
    if (isExpired(putRes.status, bodyText)) {
      ({ uploadUrl, key, publicUrl } = await presign(file, contentType));
      putRes = await putWithSignedUrl(uploadUrl, file, contentType);
      if (putRes.ok) return { key, url: publicUrl };
      bodyText = await putRes.text().catch(() => "");
    }

    throw new Error(`Upload failed: ${putRes.status} ${bodyText.slice(0, 300)}`);
  }

  return { key, url: publicUrl };
}

// ── Legacy name, so existing callers keep working ────────────────────────────
// Returns the public URL if CloudFront is configured, otherwise the S3 key.
// Prefer uploadFile() and store the key in your DB.
export async function uploadFileToSpaces(file: File): Promise<string> {
  const { key, url } = await uploadFile(file);
  return url ?? key;
}

// ── Generated image (data URL or http URL) -> S3 ─────────────────────────────
export async function uploadGeneratedBackgroundToSpaces(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl); // fetch handles data: URLs natively
  if (!res.ok) throw new Error(`Failed to download image: ${res.statusText}`);
  const blob = await res.blob();

  const file = new File([blob], `generated-background-${Date.now()}.png`, {
    type: blob.type || "image/png",
  });
  return uploadFileToSpaces(file);
}