const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

// ── Free voices available on all plans ──────────────────────────────────
export const VOICES = {
  rachel:  "21m00Tcm4TlvDq8ikWAM", // warm, professional female
  adam:    "pNInz6obpgDQGcFmaJgB", // deep, confident male
  bella:   "EXAVITQu4vr4xnSDxMaL", // soft, friendly female
  antoni:  "ErXwobaYiN019PkySvjV", // well-rounded male
  josh:    "TxGEqnHWrfWFTfGW9XjX", // deep, narrative male
  arnold:  "VR6AewLTigWG4xSOukaG", // strong, commanding
} as const;

export type VoiceId = keyof typeof VOICES;

export interface ElevenLabsResult {
  audioBuffer: Buffer | null;
  error?: string;
}

export async function generateVoiceover(
  text: string,
  voiceId: VoiceId = "rachel",
  stability     = 0.5,
  similarityBoost = 0.75
): Promise<ElevenLabsResult> {

  if (!ELEVENLABS_API_KEY) {
    console.warn("[elevenlabs] No API key — skipping voiceover");
    return { audioBuffer: null, error: "No API key" };
  }

  if (!text?.trim()) {
    return { audioBuffer: null, error: "No text provided" };
  }

  try {
    const voice = VOICES[voiceId];

    console.log(`[elevenlabs] Generating voiceover: "${text.slice(0, 60)}..."`);

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: "POST",
        headers: {
          "xi-api-key":   ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          "Accept":       "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2", // fastest + cheapest
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style:            0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = JSON.stringify(err);

      // Out of quota — skip gracefully
      if (res.status === 401 || res.status === 422) {
        console.warn("[elevenlabs] Auth/quota error:", msg);
        return { audioBuffer: null, error: `Auth: ${msg}` };
      }

      throw new Error(`ElevenLabs ${res.status}: ${msg}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    console.log(`[elevenlabs] ✅ Generated ${buffer.length} bytes`);
    return { audioBuffer: buffer };

  } catch (err: any) {
    console.warn("[elevenlabs] Error — skipping:", err.message);
    return { audioBuffer: null, error: err.message };
  }
}