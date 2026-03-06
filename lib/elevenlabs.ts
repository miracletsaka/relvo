export type VoiceId = "rachel" | "adam" | "bella" | "josh" | "elli" | "antoni" | "domi" | "thomas";

const VOICE_MAP: Record<VoiceId, string> = {
  rachel:  "21m00Tcm4TlvDq8ikWAM",
  adam:    "pNInz6obpgDQGcFmaJgB",
  bella:   "EXAVITQu4vr4xnSDxMaL",
  josh:    "TxGEqnHWrfWFTfGW9XjX",
  elli:    "MF3mGyEYCl7XYWbV9V6O",
  antoni:  "ErXwobaYiN019PkySvjV",
  domi:    "AZnzlk1XvdvUeBnXmlld",
  thomas:  "GBv7mTt0atIp3Br8iCZE",
};

const API_KEY = process.env.ELEVENLABS_API_KEY!;
const BASE    = "https://api.elevenlabs.io/v1";

export interface WordTiming {
  word:       string;
  start_time: number;
  end_time:   number;
}

export interface GenerateVoiceoverResult {
  audioBuffer:  ArrayBuffer | null;
  wordTimings:  WordTiming[] | null;
  durationSecs: number | null;
}

export async function generateVoiceover(
  text:    string,
  voiceId: VoiceId = "rachel",
): Promise<GenerateVoiceoverResult> {

  const id = VOICE_MAP[voiceId] ?? VOICE_MAP.rachel;
  const body = {
    text,
    model_id:       "eleven_turbo_v2",
    voice_settings: { stability: 0.45, similarity_boost: 0.82, style: 0.35, use_speaker_boost: true },
  };

  // ── Try /with-timestamps first — gives word-level sync ───────────────
  try {
    const res = await fetch(`${BASE}/text-to-speech/${id}/with-timestamps`, {
      method:  "POST",
      headers: { "xi-api-key": API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
      body:    JSON.stringify(body),
    });

    if (res.ok) {
      const json: {
        audio_base64: string;
        alignment: {
          characters:                     string[];
          character_start_times_seconds:  number[];
          character_end_times_seconds:    number[];
        };
      } = await res.json();

      // base64 → ArrayBuffer
      const bin   = atob(json.audio_base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      const wordTimings  = charAlignmentToWords(json.alignment, text);
      const endTimes     = json.alignment?.character_end_times_seconds ?? [];
      const durationSecs = endTimes.length > 0 ? endTimes[endTimes.length - 1] : null;

      console.log(`[elevenlabs] ✅ with-timestamps: ${wordTimings.length} words, ${durationSecs?.toFixed(1)}s`);
      return { audioBuffer: bytes.buffer, wordTimings, durationSecs };
    }
  } catch (e) {
    console.warn("[elevenlabs] with-timestamps failed, falling back to plain TTS:", e);
  }

  // ── Fallback: plain audio ─────────────────────────────────────────────
  try {
    const res = await fetch(`${BASE}/text-to-speech/${id}`, {
      method:  "POST",
      headers: { "xi-api-key": API_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body:    JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[elevenlabs] plain TTS error:", res.status);
      return { audioBuffer: null, wordTimings: null, durationSecs: null };
    }
    const audioBuffer = await res.arrayBuffer();
    console.log(`[elevenlabs] ✅ plain audio: ${(audioBuffer.byteLength/1024).toFixed(0)}KB`);
    return { audioBuffer, wordTimings: null, durationSecs: null };
  } catch (e) {
    console.error("[elevenlabs] fatal:", e);
    return { audioBuffer: null, wordTimings: null, durationSecs: null };
  }
}

// ── Parse character alignment → word timings ────────────────────────────────
function charAlignmentToWords(
  alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] },
  _originalText: string,
): WordTiming[] {
  if (!alignment?.characters) return [];

  const { characters: chars, character_start_times_seconds: starts, character_end_times_seconds: ends } = alignment;
  const words: WordTiming[] = [];

  let wordChars = "";
  let wordStart = 0;
  let wordEnd   = 0;
  let inWord    = false;

  const flush = () => {
    const w = wordChars.trim();
    if (w.length > 0) words.push({ word: w, start_time: wordStart, end_time: wordEnd });
    wordChars = "";
    inWord    = false;
  };

  for (let i = 0; i < chars.length; i++) {
    const ch        = chars[i];
    const isWordCh  = /[\w'$%\-]/.test(ch);

    if (isWordCh) {
      if (!inWord) { wordStart = starts[i] ?? 0; inWord = true; }
      wordChars += ch;
      wordEnd    = ends[i] ?? wordStart;
    } else {
      flush();
    }
  }
  flush();
  return words;
}