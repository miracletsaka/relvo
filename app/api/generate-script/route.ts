import { NextRequest, NextResponse } from "next/server";
import { generateVoiceoverScript } from "@/lib/generate-voiceover-script";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { body_text, companyName, accentColor } = await req.json();

    const script = await generateVoiceoverScript(
      body_text || "",
      companyName,
      accentColor
    );

    return NextResponse.json({ ok: true, script });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}