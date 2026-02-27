// ─────────────────────────────────────────────────────────────────────────────
// Resolves the correct base URL whether running on server or client
// ─────────────────────────────────────────────────────────────────────────────
function getBaseUrl(): string {
  // Server-side (API routes, render-video, etc.)
  if (typeof window === "undefined") {
    return (
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      "http://localhost:3000"
    );
  }
  // Client-side (browser)
  return window.location.origin;
}

export async function uploadFileToSpaces(file: File): Promise<string> {
  const baseUrl = getBaseUrl();

  // 1) Ask server for signed URL — absolute URL works from both server and client
  const presignRes = await fetch(`${baseUrl}/api/uploads/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  });

  if (!presignRes.ok) throw new Error("Failed to presign upload");
  const { uploadUrl, publicUrl } = await presignRes.json();

  // 2) Upload directly to Spaces
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "x-amz-acl": "public-read",
    },
    body: file,
  });

  if (!putRes.ok) {
    const t = await putRes.text().catch(() => "");
    throw new Error(`Upload failed: ${putRes.status} ${t.slice(0, 200)}`);
  }

  // 3) Return public URL to store in DB
  return publicUrl as string;
}

export async function uploadGeneratedBackgroundToSpaces(
  imageUrl: string
): Promise<string> {
  let blob: Blob;

  // Handle base64 data URLs directly (from OpenAI response)
  if (imageUrl.startsWith("data:")) {
    // Split the data URL: "data:image/png;base64,<base64_data>"
    const [header, base64Data] = imageUrl.split(",");

    // Extract MIME type from header
    const mimeMatch = header.match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

    // Decode base64 string to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create Blob from binary data
    blob = new Blob([bytes], { type: mimeType });
  } else {
    // Handle regular HTTP URLs
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    blob = await response.blob();
  }

  // Create a File from Blob with timestamp for uniqueness
  const timestamp = Date.now();
  const file = new File([blob], `generated-background-${timestamp}.png`, {
    type: "image/png",
  });

  // Upload to DigitalOcean Spaces
  return await uploadFileToSpaces(file);
}
