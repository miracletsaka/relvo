import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_AI_API_KEY}`
  );
  const data = await res.json();

  // Filter only video-related models
  const videoModels = (data.models || []).filter((m: any) =>
    m.name.includes("veo") ||
    m.name.includes("video") ||
    m.supportedGenerationMethods?.includes("predictLongRunning")
  );

  return NextResponse.json({
    videoModels,
    allModelNames: (data.models || []).map((m: any) => m.name),
  });
}