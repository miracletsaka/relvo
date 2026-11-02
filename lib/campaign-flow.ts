import { buildAdShapes, W, H } from "@/lib/ad-layouts";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

async function post(path: string, body: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function runCampaign(prompt: string, productImageUrl: string) {
  const data = await post("/public-ai-chat/generate-campaign", {
    prompt, product_image_url: productImageUrl || null,
  });
  const shapes = await buildAdShapes(data.campaign_data, data.brief, data.background_image);
  return { campaignData: data.campaign_data, shapes, canvasWidth: W, canvasHeight: H, message: data.message };
}

export async function chatReply(message: string, history: { role: string; text: string }[]) {
  const data = await post("/public-ai-chat/reply", {
    message, history: history.slice(-10).map((m) => ({ role: m.role, text: m.text })),
  });
  return data.reply as string;
}