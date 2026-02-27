import { NextResponse } from "next/server";
import { generateVeo3Video } from "@/lib/veo3";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  const result = await generateVeo3Video(
    "Professional person walking confidently in modern office, cinematic slow motion",
      5,
    "9:16",
  
  );
  return NextResponse.json(result);
}