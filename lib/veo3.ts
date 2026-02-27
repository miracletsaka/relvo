import { GoogleGenAI } from "@google/genai";
import { uploadFileToSpaces } from "@/lib/video-upload-client";

const VEO3_API_KEY = process.env.GOOGLE_AI_API_KEY!;

// ── Remove veo-2.0 — requires GCP billing ───────────────────────────────
const VEO_MODELS = [
  "models/veo-3.1-generate-preview",
  "models/veo-3.1-fast-generate-preview",
  "models/veo-3.0-generate-001",
  "models/veo-3.0-fast-generate-001",
];

export interface Veo3Result {
  videoUrl: string | null;
  source: "veo3" | "pexels" | "image";
  error?: string;
  modelUsed?: string;
}

async function tryGenerateWithModel(
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  durationSeconds: number,
  aspectRatio: "9:16" | "16:9" | "1:1"
): Promise<string | null> {
  try {
    console.log(`[veo3] Trying: ${model}`);

    let operation = await ai.models.generateVideos({
      model,
      prompt,
      config: {
        durationSeconds,
        aspectRatio,
        numberOfVideos: 1,
      } as any,
    });

    const maxAttempts = 36;
    let attempts = 0;

    while (!operation.done) {
      if (attempts >= maxAttempts) {
        console.warn(`[veo3] Timed out`);
        return null;
      }
      await sleep(5000);
      operation = await ai.operations.getVideosOperation({
        operation,
      });
      attempts++;
      console.log(`[veo3] Poll ${attempts}/${maxAttempts}: ${operation.done ? "done ✅" : "processing..."}`);
    }

    const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      console.warn("[veo3] No URI in response");
      return null;
    }

    return `${uri}${uri.includes("?") ? "&" : "?"}key=${VEO3_API_KEY}`;

  } catch (err: any) {
    // ✅ Log the FULL raw error so we can see exactly what's happening
    const msg = err?.message || String(err);
    console.error(`[veo3] FULL ERROR for ${model}:`, msg);

    // Try to parse if it's a JSON string inside the message
    try {
      const parsed = JSON.parse(msg);
      console.error(`[veo3] Error code: ${parsed?.error?.code}`);
      console.error(`[veo3] Error status: ${parsed?.error?.status}`);
      console.error(`[veo3] Error message: ${parsed?.error?.message}`);
    } catch {
      // not JSON — already logged above
    }

    // Billing required — stop trying all models immediately
    if (
      msg.includes("FAILED_PRECONDITION") ||
      msg.includes("billing")
    ) {
      throw new Error(`BILLING:${msg}`);
    }

    // Quota — stop trying
    if (
      msg.includes("429")                ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("PERMISSION_DENIED")
    ) {
      throw new Error(`QUOTA:${msg}`);
    }

    // Anything else — try next model
    console.warn(`[veo3] Model ${model} rejected — trying next`);
    return null;
  }
}

export async function generateVeo3Video(
  prompt: string,
  durationSeconds: 4 |5 | 6 | 7 | 8 = 4,
  aspectRatio: "9:16" | "16:9" | "1:1" = "9:16",
  styleHint?: string   // ← appended to PROMPT text, never to config
): Promise<Veo3Result> {

  if (!VEO3_API_KEY) {
    console.warn("[veo3] No API key");
    return { videoUrl: null, source: "pexels", error: "No API key" };
  }

  // ✅ Style hint goes INTO the prompt text, NOT into config
  const fullPrompt = styleHint
    ? `${prompt}, ${styleHint}`
    : prompt;

  console.log(`[veo3] Prompt: "${fullPrompt.slice(0, 100)}..."`);
  console.log(`[veo3] aspectRatio: ${aspectRatio}, duration: ${durationSeconds}s`);

  try {
    const ai = new GoogleGenAI({});

    for (const model of VEO_MODELS) {
      try {
        const uri = await tryGenerateWithModel(
          ai,
          model,
          fullPrompt,
          durationSeconds,
          aspectRatio   // ← always "9:16"
        );

        if (uri) {
          console.log(`[veo3] ✅ Success — ${model}`);
          return { videoUrl: uri, source: "veo3", modelUsed: model };
        }
      } catch (err: any) {
        const msg = err?.message || "";
        // Billing/quota errors — no point trying other models
        if (msg.startsWith("BILLING:") || msg.startsWith("QUOTA:")) {
          console.warn("[veo3] Stopping — billing/quota:", msg);
          return { videoUrl: null, source: "pexels", error: msg };
        }
        // Otherwise continue to next model
      }
    }

    console.warn("[veo3] All models exhausted — falling back");
    return { videoUrl: null, source: "pexels", error: "All models failed" };

  } catch (err: any) {
    const msg = err?.message || String(err);
    console.warn("[veo3] Fatal:", msg);
    return { videoUrl: null, source: "pexels", error: msg };
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}