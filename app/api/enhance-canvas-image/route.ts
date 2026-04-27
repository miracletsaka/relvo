import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = (
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

const OPENAI_IMAGE_MODEL = process.env.OPENAI_API_KEY || "gpt-image-2";
const OPENAI_FALLBACK_IMAGE_MODEL = process.env.OPENAI_API_KEY || "gpt-image-1";

const PAID_PLANS = new Set(["starter", "pro", "agency"]);

type SubscriptionPayload = {
  subscription?: Record<string, any> | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function isPaidSubscription(payload: SubscriptionPayload | null): boolean {
  const sub = payload?.subscription;
  if (!sub) return false;

  const plan = String(sub.plan_id || sub.org_plan || "").toLowerCase();
  const status = String(sub.status || sub.plan_status || "").toLowerCase();
  const expiresAt = sub.current_period_end || sub.plan_expires_at;

  if (!PAID_PLANS.has(plan)) return false;
  if (status && !["active", "paid", "trialing"].includes(status)) return false;

  if (expiresAt) {
    const expiry = new Date(expiresAt).getTime();
    if (Number.isFinite(expiry) && expiry < Date.now()) return false;
  }

  return true;
}

async function requirePaidSubscription(request: NextRequest) {
  const cookie = request.headers.get("cookie") || "";

  // First verify the session. This mirrors the existing app pattern that uses /auth/me.
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    headers: { cookie, accept: "application/json" },
    cache: "no-store",
    credentials: "include",
  });

  if (!meRes.ok) {
    return { ok: false as const, status: 401, message: "Not authenticated" };
  }

  // Then check the billing/subscription state from your FastAPI billing router.
  const subRes = await fetch(`${API_BASE}/billing/subscription`, {
    method: "GET",
    headers: { cookie, accept: "application/json" },
    cache: "no-store",
    credentials: "include",
  });

  if (!subRes.ok) {
    return { ok: false as const, status: 403, message: "Billing subscription could not be verified" };
  }

  const subPayload = (await subRes.json().catch(() => null)) as SubscriptionPayload | null;

  if (!isPaidSubscription(subPayload)) {
    return { ok: false as const, status: 403, message: "AI Final Polish requires an active paid plan" };
  }

  return { ok: true as const };
}

async function callOpenAIImageEdit(params: {
  model: string;
  image: File;
  prompt: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const form = new FormData();
  form.append("model", params.model);
  form.append("image", params.image, params.image.name || "canvas.png");
  form.append("prompt", params.prompt);
  form.append("n", "1");
  form.append("size", "auto");
  form.append("quality", "high");
  form.append("output_format", "png");
  form.append("input_fidelity", "high");

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const contentType = res.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const message = typeof payload === "string"
      ? payload
      : payload?.error?.message || payload?.message || "OpenAI image edit failed";
    throw new Error(message);
  }

  const b64 = payload?.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image data");

  return Buffer.from(b64, "base64");
}

export async function POST(request: NextRequest) {
  try {
    const paid = await requirePaidSubscription(request);
    if (!paid.ok) return jsonError(paid.message, paid.status);

    const data = await request.formData();
    const image = data.get("image");

    if (!(image instanceof File)) {
      return jsonError("Missing image file", 400);
    }

    if (!image.type.startsWith("image/")) {
      return jsonError("Uploaded file must be an image", 400);
    }

    if (image.size > 50 * 1024 * 1024) {
      return jsonError("Image is too large. Maximum size is 50MB.", 413);
    }

    const prompt = `Improve this completed social media advertisement while preserving all readable text, logo placement, layout structure, brand identity, and core composition.

Make the final image more premium, polished, realistic, high-converting, and visually unique.

Important constraints:
- Do not change, rewrite, remove, or add any written words.
- Do not add random text.
- Do not remove or distort logos.
- Do not distort faces, people, products, dashboards, charts, UI mockups, or brand marks.
- Keep the same aspect ratio, same framing, and same design hierarchy.
- Treat this as a final commercial polish pass, not a redesign.`;

    let output: Buffer;

    try {
      output = await callOpenAIImageEdit({ model: OPENAI_IMAGE_MODEL, image, prompt });
    } catch (primaryError) {
      // Keep this endpoint resilient while still defaulting to the latest model.
      if (!OPENAI_FALLBACK_IMAGE_MODEL || OPENAI_FALLBACK_IMAGE_MODEL === OPENAI_IMAGE_MODEL) {
        throw primaryError;
      }
      output = await callOpenAIImageEdit({ model: OPENAI_FALLBACK_IMAGE_MODEL, image, prompt });
    }

    return new NextResponse(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[ai/enhance-canvas-image]", error);
    return jsonError(error?.message || "AI Final Polish failed", 500);
  }
}
