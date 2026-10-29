export type UploadResult = {
  success: boolean;
  key?: string;
  url?: string | null; // public CDN url if configured
  error?: string;
};

export async function uploadFileToSpaces(
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
  // fetch() handles data: URLs natively, no manual atob needed
  const blob = await (await fetch(imageUrl)).blob();
  return uploadFile(blob, `generated-background-${Date.now()}.png`);
}

// Turn a stored key into something displayable
export async function getViewUrl(key: string): Promise<string> {
  const res = await fetch("/api/uploads/view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) throw new Error("Failed to get view URL");
  return (await res.json()).url;
}