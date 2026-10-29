import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET } from "@/lib/s3-server";

export async function POST(req: Request) {
  // TODO: authenticate, and check the user owns this key
  const { key } = await req.json().catch(() => ({}));
  if (typeof key !== "string" || key.includes("..")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    { expiresIn: 3600 }
  );
  return NextResponse.json({ url });
}