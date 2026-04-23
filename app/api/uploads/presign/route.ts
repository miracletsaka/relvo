import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET, S3_PUBLIC_URL } from "@/lib/s3-server";

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const rawFileName = String(body.fileName || "upload.bin");
    const contentType = String(body.contentType || "application/octet-stream");

    const safeFileName = sanitizeFileName(rawFileName);
    const key = `neuroflow/${Date.now()}-${safeFileName}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ACL: "public-read",
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 600,
    });

    const publicUrl = `${S3_PUBLIC_URL}/${key}`;

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
    });
  } catch (error: any) {
    console.error("Presign upload error:", error);

    return NextResponse.json(
      {
        detail: error?.message || "Failed to generate upload URL",
      },
      { status: 500 }
    );
  }
}