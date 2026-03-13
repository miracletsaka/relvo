/**
 * lib/elevenlabs.ts
 * ─────────────────
 * Full ElevenLabs TTS integration.
 *
 * Uses the v1 Text-to-Speech API:
 *   POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
 *
 * Env required:
 *   ELEVENLABS_API_KEY=your_key_here
 */

const ELEVEN_BASE = "https://api.elevenlabs.io/v1";

// ── Voice catalogue ───────────────────────────────────────────────────────────
// Real ElevenLabs pre-made voice IDs (stable, no cloning needed).
// https://elevenlabs.io/docs/voices/pre-made-voices
export const ELEVENLABS_VOICES = [
  // Female
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah",    gender: "female", accent: "American",  style: "Calm, conversational"  },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura",    gender: "female", accent: "American",  style: "Upbeat, positive"       },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", gender: "female", accent: "English",   style: "Seductive, confident"  },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice",    gender: "female", accent: "British",   style: "Confident, professional"},
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica",  gender: "female", accent: "American",  style: "Expressive, forward"   },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily",     gender: "female", accent: "British",   style: "Warm, narrative"        },
  // Male
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger",    gender: "male",   accent: "American",  style: "Confident, assertive"  },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie",  gender: "male",   accent: "Australian",style: "Natural, casual"        },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George",   gender: "male",   accent: "British",   style: "Warm, narrative"        },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum",   gender: "male",   accent: "Transatlantic", style: "Intense, character"  },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam",     gender: "male",   accent: "American",  style: "Clear, articulate"     },
  { id: "bIHbv24MWmeRgasZH58o", name: "Will",     gender: "male",   accent: "American",  style: "Friendly, relatable"   },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian",    gender: "male",   accent: "American",  style: "Deep, authoritative"   },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel",   gender: "male",   accent: "British",   style: "Deep, professional"    },
  { id: "pqHfZKP75CvOlQylNhV4", name: "Bill",     gender: "male",   accent: "American",  style: "Trustworthy, ground"   },
] as const;

export type VoiceId = typeof ELEVENLABS_VOICES[number]["id"] | string;

// Default — Sarah (calm American female, great for marketing)
export const DEFAULT_VOICE_ID: VoiceId = "EXAVITQu4vr4xnSDxMaL";

// ── Model options ─────────────────────────────────────────────────────────────
export type ElevenLabsModel =
  | "eleven_multilingual_v2"   // best quality, supports 29 languages
  | "eleven_turbo_v2_5"        // fast, low latency, English + major langs
  | "eleven_flash_v2_5"        // ultra-fast, lowest cost

export const DEFAULT_MODEL: ElevenLabsModel = "eleven_multilingual_v2";

// ── Voice settings interface ──────────────────────────────────────────────────
export interface VoiceSettings {
  stability:        number   // 0–1  (0 = expressive, 1 = very stable)
  similarity_boost: number   // 0–1  (higher = closer to original voice)
  style?:           number   // 0–1  (amplify style, default 0)
  use_speaker_boost?: boolean
}

const DEFAULT_SETTINGS: VoiceSettings = {
  stability:        0.5,
  similarity_boost: 0.75,
  style:            0.0,
  use_speaker_boost: true,
};

// ── Core generate function ────────────────────────────────────────────────────
export interface GenerateVoiceoverOptions {
  voiceId?:   VoiceId
  model?:     ElevenLabsModel
  settings?:  Partial<VoiceSettings>
  outputFormat?: "mp3_44100_128" | "mp3_22050_32" | "pcm_16000" | "pcm_22050"
}

export interface GenerateVoiceoverResult {
  audioBuffer:   ArrayBuffer
  durationSec:   number          // estimated from byte size (128kbps MP3)
  voiceId:       VoiceId
  characterCount: number
}

export async function generateVoiceover(
  text:    string,
  voiceId: VoiceId = DEFAULT_VOICE_ID,
  options: GenerateVoiceoverOptions = {},
): Promise<GenerateVoiceoverResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  const {
    model        = DEFAULT_MODEL,
    settings     = {},
    outputFormat = "mp3_44100_128",
  } = options;

  const mergedSettings: VoiceSettings = { ...DEFAULT_SETTINGS, ...settings };

  // Trim and sanitise text
  const cleanText = text
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 5000); // ElevenLabs max ~5000 chars per request

  if (!cleanText) throw new Error("Empty text — cannot generate voiceover");

  const url = `${ELEVEN_BASE}/text-to-speech/${voiceId}`;

  const res = await fetch(url, {
    method:  "POST",
    headers: {
      "xi-api-key":    apiKey,
      "Content-Type":  "application/json",
      "Accept":        "audio/mpeg",
    },
    body: JSON.stringify({
      text:           cleanText,
      model_id:       model,
      voice_settings: mergedSettings,
      output_format:  outputFormat,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`ElevenLabs API error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const audioBuffer  = await res.arrayBuffer();
  const bytes        = new Uint8Array(audioBuffer);
  // 128kbps MP3 = 16,000 bytes/sec
  const durationSec  = bytes.byteLength / 16_000;

  return {
    audioBuffer,
    durationSec,
    voiceId,
    characterCount: cleanText.length,
  };
}

// ── Batch generate for multiple scenes ───────────────────────────────────────
// Generates per-scene clips concurrently (up to 3 at a time to avoid rate limits).
export interface SceneVoiceResult {
  index:      number
  url:        string | null
  durationSec: number
  error?:     string
}

export async function generateSceneVoiceovers(
  scenes: Array<{ index: number; narration: string }>,
  voiceId: VoiceId,
  uploadFn: (file: File) => Promise<string>,
  concurrency = 3,
): Promise<SceneVoiceResult[]> {
  const results: SceneVoiceResult[] = scenes.map(s => ({
    index: s.index, url: null, durationSec: 0,
  }));

  // Process in batches
  for (let i = 0; i < scenes.length; i += concurrency) {
    const batch = scenes.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map(async (scene) => {
        if (!scene.narration?.trim()) return { index: scene.index, url: null, durationSec: 0 };

        const { audioBuffer, durationSec } = await generateVoiceover(
          scene.narration, voiceId,
        );
        const bytes = new Uint8Array(audioBuffer);
        const url   = await uploadFn(
          new File([bytes], `voice-scene${scene.index}-${Date.now()}.mp3`, { type: "audio/mpeg" })
        );
        return { index: scene.index, url, durationSec };
      })
    );

    settled.forEach((result, j) => {
      const sceneIndex = batch[j].index;
      const ri = results.findIndex(r => r.index === sceneIndex);
      if (result.status === "fulfilled") {
        results[ri] = result.value;
      } else {
        results[ri].error = String(result.reason);
        console.error(`[elevenlabs] Scene ${sceneIndex + 1} failed:`, result.reason);
      }
    });
  }

  return results;
}

// ── List available voices (from your ElevenLabs account) ─────────────────────
export interface ElevenLabsVoice {
  voice_id:     string
  name:         string
  category:     string
  preview_url?: string
  labels?:      Record<string, string>
}

export async function listVoices(): Promise<ElevenLabsVoice[]> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  const res = await fetch(`${ELEVEN_BASE}/voices`, {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) throw new Error(`ElevenLabs list voices failed: ${res.status}`);
  const data = await res.json();
  return data.voices ?? [];
}

// ── Get remaining character quota ─────────────────────────────────────────────
export async function getCharacterQuota(): Promise<{
  used: number; total: number; remaining: number
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  const res = await fetch(`${ELEVEN_BASE}/user/subscription`, {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) throw new Error(`ElevenLabs quota check failed: ${res.status}`);
  const data = await res.json();
  return {
    used:      data.character_count       ?? 0,
    total:     data.character_limit       ?? 0,
    remaining: (data.character_limit ?? 0) - (data.character_count ?? 0),
  };
}