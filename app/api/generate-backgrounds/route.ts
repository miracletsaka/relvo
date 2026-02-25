import { NextRequest, NextResponse } from "next/server";
import { generateBackgrounds } from "@/lib/generateBackgrounds";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = await req.json();
    const { topicChatId, prompts } = body ?? {};

    const images = await generateBackgrounds({ topicChatId, prompts }, { timeoutMs: 90_000 });

    return NextResponse.json({ images });
  } catch (error: any) {
    const ms = Date.now() - startedAt;

    // BEST LOG: includes message + cause + stack
    console.error("[api/generate-backgrounds] Failed", {
      ms,
      message: error?.message,
      code: error?.code,
      cause: error?.cause?.code || error?.cause?.message,
      stack: error?.stack,
    });

    // Map known errors to proper status codes
    const status =
      error?.code === "BAD_REQUEST" ? 400 :
      error?.code === "NO_API_KEY" ? 500 :
      500;

    return NextResponse.json(
      { error: error?.message || "Failed to generate backgrounds" },
      { status }
    );
  }
}