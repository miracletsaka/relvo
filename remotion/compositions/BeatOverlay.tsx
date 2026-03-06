import React from "react";
import { StatBeatLayer } from "./StatBeatLayer";

/**
 * Drop-in overlay: put inside ANY scene component.
 *
 * Usage:
 *  <BeatOverlay segment={segment} accentColor={accentColor} />
 */
export function BeatOverlay({
  segment,
  accentColor,
}: {
  segment: any;
  accentColor: string;
}) {
  const beats = (segment?.beats || segment?.beatMarkers || []) as any[];
  if (!beats || beats.length === 0) return null;
  return <StatBeatLayer beats={beats} accentColor={accentColor} />;
}
