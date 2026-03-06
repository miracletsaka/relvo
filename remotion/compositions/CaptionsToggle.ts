export type CaptionsMode = "off" | "kinetic";

export function normalizeCaptionsMode(v: any): CaptionsMode {
  if (v === "kinetic") return "kinetic";
  return "off";
}
