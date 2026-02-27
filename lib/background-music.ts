import fs from "fs";
import path from "path";
import os from "os";

// ── Free royalty-free tracks from Pixabay ───────────────────────────────
// These are direct MP3 URLs — free for commercial use
const MUSIC_TRACKS = {
  corporate: [
    "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
    "https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb749d236.mp3",
  ],
  inspiring: [
    "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1fca.mp3",
    "https://cdn.pixabay.com/download/audio/2023/03/28/audio_0391e17b56.mp3",
  ],
  upbeat: [
    "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b866a23.mp3",
    "https://cdn.pixabay.com/download/audio/2023/06/07/audio_0c42a7e1de.mp3",
  ],
  cinematic: [
    "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3",
    "https://cdn.pixabay.com/download/audio/2023/01/26/audio_37c7bc4a96.mp3",
  ],
} as const;

export type MusicMood = keyof typeof MUSIC_TRACKS;

export async function downloadBackgroundMusic(
  mood: MusicMood = "corporate"
): Promise<string | null> {
  try {
    const tracks = MUSIC_TRACKS[mood];
    // Pick random track
    const url = tracks[Math.floor(Math.random() * tracks.length)];

    console.log(`[music] Downloading ${mood} track...`);

    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[music] Failed to download: ${res.status}`);
      return null;
    }

    const buffer   = Buffer.from(await res.arrayBuffer());
    const tmpPath  = path.join(os.tmpdir(), `music-${Date.now()}.mp3`);
    fs.writeFileSync(tmpPath, buffer);

    console.log(`[music] ✅ Downloaded to ${tmpPath}`);
    return tmpPath;

  } catch (err: any) {
    console.warn("[music] Error — skipping:", err.message);
    return null;
  }
}

export function detectMusicMood(
  bodyText: string,
  emotionalTone?: string
): MusicMood {
  const lower = (bodyText + " " + (emotionalTone || "")).toLowerCase();

  if (/luxury|premium|exclusive|elegant/i.test(lower))   return "cinematic";
  if (/urgent|fast|quick|now|limited/i.test(lower))      return "upbeat";
  if (/inspire|dream|future|vision|transform/i.test(lower)) return "inspiring";
  return "corporate";
}