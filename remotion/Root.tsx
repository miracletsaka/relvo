import React from "react";
import { Composition } from "remotion";
import { AdVideo } from "./compositions/AdVideo";
import { MultiSceneVideo } from "./compositions/MultiSceneVideo";
import type { AdVideoProps } from "./compositions/AdVideo";
import type { MultiSceneVideoProps } from "./compositions/MultiSceneVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AdVideo"
        component={AdVideo}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={{
          hook: "Unlock the Power of AI",
          subheading: "Streamline Your Business Today",
          cta: "Get Started Free",
          companyName: "NEUROFLOW",
          proof: "500+ businesses automated",
          accentColor: "#6366f1",
          bullets: [],
        } satisfies AdVideoProps}
      />

      <Composition
        id="MultiSceneVideo"
        component={MultiSceneVideo}
        durationInFrames={480}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={{
          segments:     [],
          sceneVideos:  [],
          sceneImages:  [],
          sceneShapes:  [],
          campaignData: {},
          accentColor:  "#6366f1",
          companyName:  "NEUROFLOW",
          audioPath:    undefined,   // ← ADD
        } satisfies MultiSceneVideoProps}
      />
    </>
  );
};