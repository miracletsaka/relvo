import { S3Client } from "@aws-sdk/client-s3";

export const S3_BUCKET = process.env.S3_BUCKET!;
export const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL; // optional

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  // Without this, SDK >= 3.729 adds CRC32 params that break browser PUTs
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  // On AWS (Lambda/ECS/EC2) omit credentials and use the IAM role.
  // On Vercel or elsewhere, pass the env keys:
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
});

export function publicUrlForKey(key: string): string | null {
  return S3_PUBLIC_BASE_URL ? `${S3_PUBLIC_BASE_URL}/${key}` : null;
}