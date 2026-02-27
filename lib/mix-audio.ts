import { execSync } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";

export async function mixAudioTracks(
  voicePath:     string,      // voiceover MP3
  musicPath:     string,      // background music MP3
  outputPath:    string,      // output mixed MP3
  musicVolume:   number = 0.12 // music at 12% — voice stays clear
): Promise<boolean> {
  try {
    console.log("[mix-audio] Mixing voice + music...");

    // FFmpeg: mix voice (full volume) + music (low volume), trim to voice length
    const cmd = [
      "ffmpeg -y",
      `-i "${voicePath}"`,
      `-i "${musicPath}"`,
      `-filter_complex`,
      `"[1:a]volume=${musicVolume},aloop=loop=-1:size=2e+09[music];[0:a][music]amix=inputs=2:duration=first:dropout_transition=2[out]"`,
      `-map "[out]"`,
      `-c:a libmp3lame -q:a 2`,
      `"${outputPath}"`,
    ].join(" ");

    execSync(cmd, { stdio: "pipe" });
    console.log("[mix-audio] ✅ Mixed successfully");
    return true;

  } catch (err: any) {
    console.warn("[mix-audio] FFmpeg failed — using voice only:", err.message);
    // Copy voice to output as fallback
    fs.copyFileSync(voicePath, outputPath);
    return false;
  }
}