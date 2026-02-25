// lib/generateBackgrounds.ts
export type GenerateBackgroundsInput = {
  topicChatId: string;
  prompts: string[];
};

export type GeneratedImage = {
  url: string; // data URL
  prompt: string; // original prompt
  revisedPrompt?: string;
  generatedAt: string;
};

function redact(s: string, max = 4000) {
  if (!s) return s;
  // avoid logging huge blobs; also avoid leaking secrets if any
  const trimmed = s.length > max ? s.slice(0, max) + "…(truncated)" : s;
  return trimmed.replace(/Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/g, "Bearer [REDACTED]");
}

async function readTextSafe(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export async function generateBackgrounds(
  input: GenerateBackgroundsInput,
  opts?: { timeoutMs?: number }
): Promise<GeneratedImage[]> {
  const { topicChatId, prompts } = input;

  if (!topicChatId || !prompts || !Array.isArray(prompts) || prompts.length === 0) {
    const err = new Error("Missing topicChatId or prompts array");
    // Attach a code to make it easy to identify
    (err as any).code = "BAD_REQUEST";
    throw err;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error("OPENAI_API_KEY not configured");
    (err as any).code = "NO_API_KEY";
    throw err;
  }

  const timeoutMs = opts?.timeoutMs ?? 90_000;

  // NOTE: This is your existing prompt enhancer (unchanged logic)
  const enhancedPrompts = prompts.map((prompt) => {
    const basePrompt = String(prompt ?? "").trim();

    const enhancedPrompt =
    `example of the outcome design: Soft light grey studio background, professional product photography lighting, 
    shallow depth of field, clean minimal commercial aesthetic, 
    scattered fresh olive branches and small green leaves naturally arranged, 
    warm golden hour side lighting casting soft shadows, 
    top-down and slight angle mixed perspective, 
    empty center space for product placement, 
    high-end beauty brand photography style, 
    no text, no people, photorealistic, 4:5 portrait. NO PEOPLE, No distructions to the text.` +
      `Dark green and black futuristic software development company ads background inspired by the glassmorphism + 3D illustration aesthetic. ` +
      `with glowing emerald gradient, soft vignette lighting, smooth layered rounded shapes, abstract glassmorphism panels, subtle spotlight glow in center, ` +
      `premium tech advertisement background, modern automation software branding, minimal noise, high depth, soft reflections, clean negative space for UI mockup, ` +
      `professional marketing poster background, cinematic composition, 3D lighting effect, background only, no text, no devices, no icons ` +
      `on ${basePrompt}, flat graphic design, background only, no text, no objects, no phone, empty center space, minimal design, no illustration style, no cartoon, ` +
      `solid colors only, clean minimal commercial advertisement background, professional social media post style, portrait orientation`;

    return enhancedPrompt;
  });

  const images = await Promise.all(
    enhancedPrompts.map(async (enhancedPrompt, index) => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);

      console.log("enhanced prompt, sending to OpenAI:", {
        index,
        originalPrompt: prompts[index],
        enhancedPrompt: redact(enhancedPrompt, 1200),
      });

      const requestBody = {
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1792",
        quality: "standard",
        style: "natural",
        response_format: "b64_json",
      };

      let res: Response | null = null;
      let resText = "";

      try {
        res = 
        await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        if (!res.ok) {
          resText = await readTextSafe(res);
          const requestId =
            res.headers.get("x-request-id") ||
            res.headers.get("request-id") ||
            res.headers.get("x-openai-request-id");

          console.error("[generateBackgrounds] OpenAI image generation failed", {
            index,
            status: res.status,
            statusText: res.statusText,
            requestId,
            responseText: redact(resText),
            originalPrompt: prompts[index],
            enhancedPrompt: redact(enhancedPrompt, 1200),
          });

          throw new Error(`OpenAI failed (${res.status}): ${res.statusText}`);
        }

        const data = await res.json();

        const base64 = data?.data?.[0]?.b64_json;
        if (!base64) {
          console.error("[generateBackgrounds] Missing b64_json in OpenAI response", {
            index,
            dataKeys: Object.keys(data ?? {}),
            dataPreview: redact(JSON.stringify(data), 1200),
          });
          throw new Error("OpenAI returned no image data (b64_json missing)");
        }

        const dataUrl = `data:image/png;base64,${base64}`;

        return {
          url: dataUrl,
          prompt: prompts[index],
          revisedPrompt: data?.data?.[0]?.revised_prompt,
          generatedAt: new Date().toISOString(),
        } as GeneratedImage;
      } catch (err: any) {
        const isAbort = err?.name === "AbortError";
        console.error("[generateBackgrounds] Error generating image", {
          index,
          isAbort,
          message: err?.message,
          code: err?.code,
          cause: err?.cause?.code || err?.cause?.message,
          originalPrompt: prompts[index],
          enhancedPrompt: redact(enhancedPrompt, 1200),
          openaiResponseText: redact(resText),
        });
        throw err;
      } finally {
        clearTimeout(t);
      }
    })
  );

  return images;
}