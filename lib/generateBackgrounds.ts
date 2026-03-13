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
    `Create a high-quality advertising image for a technology automation service.

    The image should visually represent the main message from the marketing content below.

    STYLE:
    Photorealistic marketing ad, modern SaaS aesthetic, professional lighting, sharp focus, cinematic quality.

    SCENE RULES:
    • Use ONE clear subject only (either a real human using a smartphone or a phone showing the software interface).
    • The subject should demonstrate the product benefit visually.
    leave a space above or below to i can add text later, but do not include text in the image itself.
    • The phone screen should display a realistic UI related to the service.
    • The person should be smiling or engaged with the phone.

    BACKGROUND:
    • Dark textured background (charcoal, dark green, or black grain texture).
    • Subtle lighting glow behind the subject.
    • Clean, premium SaaS advertisement style.
    leave a space above or below to i can add text later, but do not include text in the image itself.

    LAYOUT:
    • Vertical social media ad format (1080x1350).
    • Leave clear space at the top and bottom for marketing text.
    • Minimal clutter.

    VISUAL ELEMENTS:
    • Smartphone showing chatbot, booking system, or automation dashboard.
    • Subtle floating icons related to automation (chat bubbles, calendar booking, AI assistant, phone calls).
    • Professional marketing style similar to SaaS ads.
    NO TEXT IN IMAGE ITSELF, but design with space for text overlay.

    TEXT STYLE:
    • Large bold headline area at the top
    • Supporting text area near bottom
    • Bright accent colors (green, yellow, white)

    IMPORTANT:
    No brand logos, no watermarks, no stock photo text artifacts.
    No text

    Marketing Content:
    ${basePrompt}`;

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