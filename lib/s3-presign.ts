
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET, publicUrlForKey } from "@/lib/s3-server";

export const MAX_BYTES = 500 * 1024 * 1024; // 500 MB, raise if needed

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "application/pdf": "pdf",
};

export class UploadValidationError extends Error {}

function buildKey(contentType: string, originalName: string, userId: string) {
  const ext = EXT_BY_TYPE[contentType];
  const base = originalName
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  const d = new Date();
  const datePath = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  return `neuroflow/uploads/${userId}/${datePath}/${randomUUID()}${base ? `-${base}` : ""}.${ext}`;
}

export async function createPresignedUpload(input: {
  fileName: string;
  contentType: string;
  size: number;
  userId?: string;
}) {
  const { fileName, contentType, size, userId = "anon" } = input;

  if (!EXT_BY_TYPE[contentType]) {
    throw new UploadValidationError(`File type not allowed: ${contentType}`);
  }
  if (!Number.isFinite(size) || size <= 0) {
    throw new UploadValidationError("File size is missing");
  }
  if (size > MAX_BYTES) {
    throw new UploadValidationError("File too large");
  }

  const key = buildKey(contentType, fileName, userId);

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    { expiresIn: 900 } // 15 min, enough for slow multi-step onboarding
  );

  return { uploadUrl, key, publicUrl: publicUrlForKey(key) };
}