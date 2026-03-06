import { NextResponse } from "next/server";
import { uploadFileToSpaces } from "@/lib/video-upload-client";

/**
 * Upload ANY media (video/image/audio) to Spaces. Returns { ok, url }.
 * Expects multipart/form-data with `file`.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    const name = (file as any).name || `upload-${Date.now()}`;
    const type = (file as any).type || "application/octet-stream";

    const arrayBuffer = await file.arrayBuffer();
    const f = new File([arrayBuffer], name, { type });

    const url = await uploadFileToSpaces(f);
    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    console.error("[upload-media] error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Upload failed" }, { status: 500 });
  }
}
