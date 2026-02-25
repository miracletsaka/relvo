const CLIPDROP_API_KEY = process.env.NEXT_PUBLIC_CLIPDROP_API_KEY!;

export async function removeBackground(imageUrl: string): Promise<string | null> {
  try {
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) return null;
    const imageBlob = await imageRes.blob();

    const formData = new FormData();
    formData.append("image_file", imageBlob, "image.jpg");

    const res = await fetch("https://clipdrop-api.co/remove-background/v1", {
      method: "POST",
      headers: { "x-api-key": CLIPDROP_API_KEY },
      body: formData,
    });

    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function replaceBackground(
  imageUrl: string,
  backgroundPrompt: string
): Promise<string | null> {
  try {
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) return null;
    const imageBlob = await imageRes.blob();

    const formData = new FormData();
    formData.append("image_file", imageBlob, "image.jpg");
    formData.append("prompt", backgroundPrompt);

    const res = await fetch("https://clipdrop-api.co/replace-background/v1", {
      method: "POST",
      headers: { "x-api-key": CLIPDROP_API_KEY },
      body: formData,
    });

    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}