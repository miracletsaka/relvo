const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY!;

export async function fetchUnsplashImage(
  query: string,
  orientation: "portrait" | "landscape" | "squarish" = "portrait"
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=${orientation}&content_filter=high`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Use regular size — good quality, not too heavy
    return data?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

// Search multiple queries and return first result
export async function fetchBestUnsplashImage(
  queries: string[],
  orientation: "portrait" | "landscape" | "squarish" = "portrait"
): Promise<string | null> {
  for (const query of queries) {
    const url = await fetchUnsplashImage(query, orientation);
    if (url) return url;
  }
  return null;
}