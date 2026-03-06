import React from "react";
import KineticCaptions from "./KineticCaptions";
import type { SpeechMarker } from "./SpeechMarker";
import { normalizeCaptionsMode } from "./CaptionsToggle";

export default function CaptionLayer({
  mode,
  markers,
  accentColor,
  styleDNA,
}: {
  mode?: any;
  markers: SpeechMarker[];
  accentColor: string;
  styleDNA?: any;
}) {
  const m = normalizeCaptionsMode(mode);

  if (m === "off") return null;

  if (m === "kinetic") {
    return <KineticCaptions markers={markers} accentColor={accentColor} styleDNA={styleDNA} enabled />;
  }

  return null;
}
