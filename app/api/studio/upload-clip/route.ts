// app/api/studio/upload-clip/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadFileToSpaces } from "@/lib/video-upload-client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    // uploadFileToSpaces should return a public URL
    const url = await uploadFileToSpaces(file);

    return NextResponse.json({ ok: true, url });
  } catch (err: any) {
    console.error("[upload-clip] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
