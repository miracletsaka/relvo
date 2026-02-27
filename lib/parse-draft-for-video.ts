import Anthropic from "@anthropic-ai/sdk";

export interface VideoScriptData {
  hook: string;
  subheading: string;
  cta: string;
  companyName: string;
  proof: string;
  bullets: string[];
  location: string;
  hashtags: string;
  accentColor: string;
  contentType: "saas" | "product" | "service" | "event" | "general";
  emotionalTone: "inspiring" | "urgent" | "professional" | "playful" | "luxury";
  veo3StyleHint: string; // injected into every Veo3 prompt
}

export async function parseDraftForVideo(
  bodyText: string,
  companyName?: string
): Promise<VideoScriptData> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are extracting structured video script data from a social media ad caption.

CAPTION:
"""
${bodyText}
"""

Extract and return ONLY valid JSON with this exact structure:
{
  "hook": "The most attention-grabbing headline from the text (max 8 words, punchy)",
  "subheading": "Supporting sentence that expands the hook (max 12 words)",
  "cta": "The call to action phrase (max 6 words)",
  "companyName": "The brand or company name mentioned",
  "proof": "The strongest result, stat or social proof mentioned (max 10 words)",
  "bullets": ["benefit 1 (max 6 words)", "benefit 2", "benefit 3"],
  "location": "Industry or niche of the business (e.g. AI Automation, E-commerce, Healthcare)",
  "hashtags": "3-5 relevant hashtags",
  "accentColor": "A hex color that matches the brand tone (vibrant, not white or black)",
  "contentType": "one of: saas | product | service | event | general",
  "emotionalTone": "one of: inspiring | urgent | professional | playful | luxury",
  "veo3StyleHint": "A short cinematic style description for video backgrounds e.g. 'modern tech office, blue tones, cinematic' or 'luxury lifestyle, warm golden hour'"
}

Rules:
- hook must be SHORT and punchy — max 8 words
- bullets must be max 3 items, each max 6 words
- companyName: use "${companyName || "the company"}" if not found in text
- accentColor: pick something vibrant that fits the brand mood
- Return ONLY the JSON object, no explanation, no markdown backticks`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    // Strip any accidental markdown fences
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Validate and fill defaults for any missing fields
    return {
      hook: parsed.hook || "Transform Your Business",
      subheading: parsed.subheading || "AI-powered solutions for growth",
      cta: parsed.cta || "Get Started Today",
      companyName: parsed.companyName || companyName || "NeuroFlow",
      proof: parsed.proof || "Results guaranteed",
      bullets: Array.isArray(parsed.bullets)
        ? parsed.bullets.slice(0, 3)
        : ["Save time daily", "Grow faster", "Reduce costs"],
      location: parsed.location || "Business",
      hashtags: parsed.hashtags || "#AI #Automation #Business",
      accentColor: parsed.accentColor || "#6366f1",
      contentType: parsed.contentType || "general",
      emotionalTone: parsed.emotionalTone || "inspiring",
      veo3StyleHint: parsed.veo3StyleHint || "modern professional, cinematic lighting",
    };
  } catch {
    // If Claude somehow returns bad JSON — safe defaults
    console.warn("[parseDraft] JSON parse failed, using defaults");
    return {
      hook: "Transform Your Business",
      subheading: "AI solutions that actually work",
      cta: "Get Started Today",
      companyName: companyName || "NeuroFlow",
      proof: "Results in 30 days",
      bullets: ["Save 5 hours daily", "Automate instantly", "Grow revenue"],
      location: "Business Automation",
      hashtags: "#AI #Business #Automation",
      accentColor: "#6366f1",
      contentType: "saas",
      emotionalTone: "inspiring",
      veo3StyleHint: "modern tech office, blue tones, cinematic",
    };
  }
}