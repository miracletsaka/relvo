const PEXELS_API_KEY = process.env.PEXELS_API_KEY!;

export async function fetchPexelsVideo(
  query: string,
  orientation: "portrait" | "landscape" | "square" = "portrait"
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(
        query
      )}&orientation=${orientation}&per_page=10&size=medium`,
      {
        headers: { Authorization: PEXELS_API_KEY },
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const videos = data.videos || [];
    if (!videos.length) return null;

    const pick =
      videos[Math.floor(Math.random() * Math.min(5, videos.length))];

    const file =
      pick.files.find(
        (f: any) => f.quality === "hd" && f.height > f.width
      ) ||
      pick.files.find((f: any) => f.quality === "hd") ||
      pick.files[0];

    return file?.link || null;
  } catch {
    return null;
  }
}

export async function fetchBestPexelsVideo(
  queries: string[]
): Promise<string | null> {
  for (const query of queries) {
    const url = await fetchPexelsVideo(query);
    if (url) return url;
  }
  return null;
}