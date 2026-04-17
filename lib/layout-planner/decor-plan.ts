/**
 * layout-planner/decor-plan.ts
 * ──────────────────────────────
 * Pass 4: Generates decorative shapes.
 * Fix: Every org gets a completely different set of shape types,
 * edges, and sizes via the seeded RNG — not hardcoded arrays.
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type {
  AICreativeDirection, AICompositionPlan, NormalizedCampaignData,
  BrandFingerprint, AIDecorPlan, DecorShapeKind, DecorEdge,
} from "./types";
import { clamp, seededRng } from "./utils";

const ALL_KINDS: DecorShapeKind[] = [
  "circle","pill","bar","chip","ring","soft-card",
  "glow-blob","dot-grid","star","sparkle","cross",
  "arc","wave-line","hexagon",
];
const ALL_EDGES: DecorEdge[] = [
  "top-left","top-right","bottom-left","bottom-right",
  "left","right","top","bottom",
];

export function buildFallbackDecorPlan(
  direction: AICreativeDirection,
  brand: BrandFingerprint
): AIDecorPlan {
  // Unique RNG stream for decor
  const rng        = seededRng(brand.seed ^ 0xFACEFEED);
  const kindPool   = rng.shuffle(ALL_KINDS);
  const edgePool   = rng.shuffle(ALL_EDGES);

  const shapeCount = direction.decorIntensity > 0.38 ? 7
                   : direction.decorIntensity > 0.25 ? 5
                   : 4;

  const shapes: AIDecorPlan["shapes"] = [];

  // Always include one glow blob — position varies by seed
  shapes.push({
    kind:      "glow-blob",
    edge:      edgePool[0],
    size:      "lg",
    colorMode: "glow",
    opacity:   direction.useGlowEffect ? rng.next() * 0.20 + 0.16 : rng.next() * 0.08 + 0.04,
  });

  // Fill remaining slots from shuffled pools
  for (let i = 1; i < shapeCount; i++) {
    const colorModes: AIDecorPlan["shapes"][0]["colorMode"][] = ["accent","accent2","soft","glow"];
    shapes.push({
      kind:      kindPool[i % kindPool.length],
      edge:      edgePool[i % edgePool.length],
      size:      rng.pick(["sm","sm","md","lg"] as const),
      colorMode: rng.pick(colorModes),
      opacity:   clamp(rng.next() * 0.22 + 0.08, 0.06, 0.28),
    });
  }

  // Dot grid if bgPattern calls for it
  if (direction.bgPatternType === "dots" && shapes.length < 8) {
    shapes.push({
      kind: "dot-grid", edge: rng.pick(ALL_EDGES),
      size: "lg", colorMode: "soft",
      opacity: 0.07,
    });
  }

  return { shapes: shapes.slice(0, 8) };
}

export async function buildAIDecorPlan(
  direction: AICreativeDirection,
  composition: AICompositionPlan,
  campaign: NormalizedCampaignData,
  brand: BrandFingerprint
): Promise<AIDecorPlan> {
  const fallback = buildFallbackDecorPlan(direction, brand);
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      temperature: 1.2,
      prompt: `Design 4–7 decorative shapes for a premium ad. Use a MIX of different kinds.
decorIntensity: ${direction.decorIntensity}, mood: ${direction.mood}, useGlowEffect: ${direction.useGlowEffect}
Brand seed: ${brand.seed} — make choices radically different each call.
Kinds: ${ALL_KINDS.join(", ")}
Edges: ${ALL_EDGES.join(", ")}
Return JSON only: {"shapes":[{"kind":"...","edge":"...","size":"sm|md|lg","colorMode":"accent|accent2|soft|glow","opacity":0.12}]}`,
    });

    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (!Array.isArray(parsed.shapes)) return fallback;

    const safe = (parsed.shapes as unknown[])
      .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
      .map(s => ({
        kind:      ALL_KINDS.includes(s.kind as DecorShapeKind) ? s.kind as DecorShapeKind : "circle",
        edge:      ALL_EDGES.includes(s.edge as DecorEdge)      ? s.edge as DecorEdge      : "top-left",
        size:      (["sm","md","lg"] as const).includes(s.size as "sm"|"md"|"lg") ? s.size as "sm"|"md"|"lg" : "sm",
        colorMode: (["accent","accent2","soft","glow"] as const).includes(s.colorMode as "accent"|"accent2"|"soft"|"glow")
          ? s.colorMode as "accent"|"accent2"|"soft"|"glow" : "soft",
        opacity:   typeof s.opacity === "number" ? clamp(s.opacity, 0.04, 0.30) : 0.12,
      }))
      .slice(0, 8);

    return { shapes: safe.length >= 3 ? safe : fallback.shapes };
  } catch {
    return fallback;
  }
}
