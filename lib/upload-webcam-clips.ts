import { uploadFileToSpaces } from "@/lib/video-upload-client";
import type { WebcamClip } from "@/components/TeleprompterModal";

export interface UploadedClip {
  segmentIndex:    number;
  url:             string;
  durationSeconds: number;
}

export async function uploadWebcamClips(
  clips: WebcamClip[]
): Promise<UploadedClip[]> {
  console.log(`[webcam] Uploading ${clips.length} clips...`);

  const uploaded = await Promise.all(
    clips.map(async (clip, i) => {
      const file = new File(
        [clip.blob],
        `webcam-${clip.segmentIndex}-${Date.now()}.webm`,
        { type: clip.blob.type || "video/webm" }
      );

      const url = await uploadFileToSpaces(file);
      console.log(`[webcam] Clip ${i + 1} uploaded: ${url}`);

      return {
        segmentIndex:    clip.segmentIndex,
        url,
        durationSeconds: clip.durationSeconds,
      };
    })
  );

  return uploaded;
}