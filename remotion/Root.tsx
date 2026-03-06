import React from "react";
import { Composition } from "remotion";
import { MultiSceneVideo } from "./compositions/MultiSceneVideo";
import type { MultiSceneVideoProps } from "./compositions/MultiSceneVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MultiSceneVideo"
      component={MultiSceneVideo}
      durationInFrames={480}
      fps={30}
      width={1080}
      height={1350}
      defaultProps={{
        segments:            [],
        sceneVideos:         [],
        sceneImages:         [],
        sceneShapes:         [],
        sceneIsWebcam:       [],
        sceneDurations:      [],
        userRecordedVoice:   false,
        campaignData:        {},
        accentColor:         "#6366f1",
        companyName:         "BRAND",
        styleDNA:            undefined,
        musicUrl:            undefined,
        voiceUrl:            undefined,
        sceneAudioUrls:      [],
        brollAudioUrls:      [],
        sceneSpeechMarkers:  [],
        audioPath:           undefined,
      } satisfies MultiSceneVideoProps}
    />
  );
};