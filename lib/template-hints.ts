export type TemplateHint =
  | "auto"
  | "hero"
  | "stats"
  | "comparison"
  | "offer"
  | "saas"
  | "split"
  | "testimonial";

const STAT_RE = /(\b\d{1,3}\s?%\b|\bpercent\b|\bstatistics\b|\bstats\b|\bresults\b|\bdata\b|\bROI\b|\bproof\b)/i;
const COMP_RE = /(\bvs\b|\bversus\b|\bcompare\b|\bcomparison\b|\bbetter than\b|\bthis not that\b)/i;
const OFFER_RE = /(\boffer\b|\bdeal\b|\bsale\b|\bdiscount\b|\b% off\b|\bfree\b|\blimited\b|\bbonus\b|\bpromotion\b)/i;
const SAAS_RE  = /(\bsoftware\b|\bsaas\b|\bdashboard\b|\bplatform\b|\bworkflow\b|\bautomate\b|\bautomation\b)/i;
const SPLIT_RE = /(\bproblem\b|\bpain\b|\bissue\b|\bsolution\b|\bhow it works\b|\bstep\b)/i;
const TEST_RE  = /(\btestimonial\b|\breview\b|\bcase study\b|\bclient said\b|\bthey said\b|\btrusted\b)/i;

export function inferTemplateHint(
  text: string,
  position?: "opening" | "middle" | "closing"
): TemplateHint {
  const t = (text || "").trim();

  if (!t) {
    // If we have no text, choose a safe default per position
    return position === "opening" ? "hero" : position === "closing" ? "offer" : "split";
  }

  // Strong signals first
  if (STAT_RE.test(t)) return "stats";
  if (COMP_RE.test(t)) return "comparison";
  if (OFFER_RE.test(t)) return "offer";
  if (TEST_RE.test(t)) return "testimonial";
  if (SAAS_RE.test(t)) return "saas";

  // Softer signals by position
  if (position === "opening") return "hero";
  if (position === "closing") return "offer";
  if (SPLIT_RE.test(t)) return "split";

  return "auto";
}
