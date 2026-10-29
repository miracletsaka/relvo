import { NextResponse } from "next/server";
import { createPresignedUpload, UploadValidationError } from "@/lib/s3-presign";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // TODO: authenticate here and pass userId
    const body = await req.json().catch(() => ({}));

    const result = await createPresignedUpload({
      fileName: String(body.fileName || "upload"),
      contentType: String(body.contentType || ""),
      size: Number(body.size || 0),
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Presign upload error:", err);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}