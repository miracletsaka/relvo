// frontend/lib/upload-client.ts
// Browser upload helper: presigned PUT to S3.

export type UploadResult = {
  success: boolean;
  key?: string;
  url?: string | null; // public CDN url if S3_PUBLIC_BASE_URL is configured
  error?: string;
};

// ── Core: returns a result object, never throws ──────────────────────────────
export async function uploadFile(
  file: File | Blob,
  fileName?: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  try {
    const name = fileName ?? (file instanceof File ? file.name : "upload.bin");
    const contentType = file.type || "application/octet-stream";

    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: name, contentType, size: file.size }),
    });
    if (!presignRes.ok) {
      const e = await presignRes.json().catch(() => ({}));
      throw new Error(e.error || "Failed to presign upload");
    }
    const { uploadUrl, key, publicUrl } = await presignRes.json();

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", contentType); // must match the signed value
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText.slice(0, 200)}`));
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(file);
    });

    return { success: true, key, url: publicUrl };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Upload failed" };
  }
}

// Generated image (data URL or http URL) -> S3
export async function uploadGeneratedBackground(imageUrl: string): Promise<UploadResult> {
  try {
    // fetch() handles data: URLs natively, no manual atob needed
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to download image: ${res.statusText}`);
    const blob = await res.blob();
    return uploadFile(blob, `generated-background-${Date.now()}.png`);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Upload failed" };
  }
}

// Turn a stored key into something displayable (private bucket)
export async function getViewUrl(key: string): Promise<string> {
  const res = await fetch("/api/uploads/view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) throw new Error("Failed to get view URL");
  return (await res.json()).url;
}

// ── Legacy names: same signature the old pages expect (return a string, throw on error)
// Returns the public URL when S3_PUBLIC_BASE_URL is set, otherwise the S3 key.
export async function uploadFileToSpaces(file: File): Promise<string> {
  const result = await uploadFile(file);
  if (!result.success || !result.key) throw new Error(result.error || "Upload failed");
  return result.url ?? result.key;
}

export async function uploadGeneratedBackgroundToSpaces(imageUrl: string): Promise<string> {
  const result = await uploadGeneratedBackground(imageUrl);
  if (!result.success || !result.key) throw new Error(result.error || "Upload failed");
  return result.url ?? result.key;
}