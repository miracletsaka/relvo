/**
 * layout-planner/decor-plan.ts
 * ──────────────────────────────
 * Pass 4: Generates decorative shapes.
 *
 * Every generation produces a genuinely different decor set:
 *  - Shape types drawn from full pool, shuffled by seed
 *  - Positions scattered across 20 distinct canvas zones
 *  - Sizes randomised within bounds
 *  - Colors cycle through accent / accent2 / glow / muted
 *  - Number of shapes varies: 4–8 per generation
 *  - NO fixed bar + NO fixed dots — everything is seeded
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

// 20 named zones — each run shuffled, so positions are never the same
const CANVAS_ZONES = [
  "top-left-corner",  "top-right-corner",
  "bottom-left-corner","bottom-right-corner",
  "top-left-mid",     "top-right-mid",
  "bottom-left-mid",  "bottom-right-mid",
  "left-upper",       "left-lower",
  "right-upper",      "right-lower",
  "center-top",       "center-bottom",
  "center-left",      "center-right",
  "mid-left-edge",    "mid-right-edge",
  "inner-top-left",   "inner-bottom-right",
] as const;

type Zone = typeof CANVAS_ZONES[number];

function zoneToEdge(zone: Zone): DecorEdge {
  const map: Record<Zone, DecorEdge> = {
    "top-left-corner":     "top-left",
    "top-right-corner":    "top-right",
    "bottom-left-corner":  "bottom-left",
    "bottom-right-corner": "bottom-right",
    "top-left-mid":        "top-left",
    "top-right-mid":       "top-right",
    "bottom-left-mid":     "bottom-left",
    "bottom-right-mid":    "bottom-right",
    "left-upper":          "left",
    "left-lower":          "left",
    "right-upper":         "right",
    "right-lower":         "right",
    "center-top":          "top",
    "center-bottom":       "bottom",
    "center-left":         "left",
    "center-right":        "right",
    "mid-left-edge":       "left",
    "mid-right-edge":      "right",
    "inner-top-left":      "top-left",
    "inner-bottom-right":  "bottom-right",
  };
  return map[zone] ?? "top-left";
}

export function buildFallbackDecorPlan(
  direction: AICreativeDirection,
  brand: BrandFingerprint
): AIDecorPlan {
  // Four independent RNG streams — so changing one param doesn't cascade
  const rngKind  = seededRng(brand.seed ^ 0xDEADBEEF);
  const rngEdge  = seededRng(brand.seed ^ 0xCAFE1234);
  const rngSize  = seededRng(brand.seed ^ 0xABCD5678);
  const rngColor = seededRng(brand.seed ^ 0xFACEFEED);
  const rngOpac  = seededRng(brand.seed ^ 0x11223344);

  // Shuffle all available kinds and zones independently
  const kindPool = rngKind.shuffle([...ALL_KINDS]);
  const zonePool = rngEdge.shuffle([...CANVAS_ZONES]);

  const shapeCount = direction.decorIntensity > 0.38 ? rngKind.nextInt(6, 8)
                   : direction.decorIntensity > 0.25 ? rngKind.nextInt(4, 6)
                   : rngKind.nextInt(3, 5);

  const colorModes: AIDecorPlan["shapes"][0]["colorMode"][] = ["accent","accent2","soft","glow"];
  const sizes: Array<"sm"|"md"|"lg"> = ["sm","sm","md","md","lg"];

  const shapes: AIDecorPlan["shapes"] = [];

  // Always include exactly one glow blob — zone is seeded
  shapes.push({
    kind:      "glow-blob",
    edge:      zoneToEdge(zonePool[0]),
    size:      "lg",
    colorMode: "glow",
    opacity:   direction.useGlowEffect
      ? rngOpac.next() * 0.18 + 0.14
      : rngOpac.next() * 0.08 + 0.04,
  });

  // Fill remaining slots — every shape from a different shuffled pool position
  for (let i = 1; i < shapeCount; i++) {
    shapes.push({
      kind:      kindPool[i % kindPool.length],
      edge:      zoneToEdge(zonePool[i % zonePool.length]),
      size:      rngSize.pick(sizes),
      colorMode: rngColor.pick(colorModes),
      opacity:   clamp(rngOpac.next() * 0.22 + 0.06, 0.05, 0.28),
    });
  }

  // If bgPattern is dots — add a dot-grid in a random zone not yet used
  if (direction.bgPatternType === "dots" && shapes.length < 8) {
    shapes.push({
      kind: "dot-grid",
      edge: zoneToEdge(zonePool[shapeCount % zonePool.length]),
      size: "lg", colorMode: "soft",
      opacity: clamp(rngOpac.next() * 0.06 + 0.04, 0.04, 0.09),
    });
  }

  // Deduplicate edge — no two shapes on the exact same edge
  const usedEdges = new Set<DecorEdge>();
  const deduped = shapes.filter(s => {
    if (usedEdges.has(s.edge) && s.kind !== "glow-blob") return false;
    usedEdges.add(s.edge);
    return true;
  });

  return { shapes: deduped.slice(0, 8) };
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
      temperature: 1.3,
      prompt: `Design 4–8 decorative shapes for a premium ad template.
decorIntensity: ${direction.decorIntensity.toFixed(2)}, mood: ${direction.mood}, useGlowEffect: ${direction.useGlowEffect}
Brand seed: ${brand.seed} — EVERY call must look completely different. Vary kinds, edges, and sizes radically.
Available kinds: ${ALL_KINDS.join(", ")}
Available edges: ${ALL_EDGES.join(", ")}
Sizes: sm, md, lg. Never use the same edge twice.
Return JSON only, no markdown:
{"shapes":[{"kind":"glow-blob","edge":"top-right","size":"lg","colorMode":"glow","opacity":0.18},{"kind":"ring","edge":"bottom-left","size":"sm","colorMode":"accent2","opacity":0.12}]}`,
    });

    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (!Array.isArray(parsed.shapes) || parsed.shapes.length < 3) return fallback;

    const usedEdges = new Set<DecorEdge>();
    const safe = (parsed.shapes as unknown[])
      .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
      .map(s => ({
        kind:      ALL_KINDS.includes(s.kind as DecorShapeKind) ? s.kind as DecorShapeKind : "circle",
        edge:      ALL_EDGES.includes(s.edge as DecorEdge)      ? s.edge as DecorEdge      : "top-left",
        size:      (["sm","md","lg"] as const).includes(s.size as "sm"|"md"|"lg") ? s.size as "sm"|"md"|"lg" : "sm",
        colorMode: (["accent","accent2","soft","glow"] as const).includes(s.colorMode as any)
          ? s.colorMode as "accent"|"accent2"|"soft"|"glow" : "soft",
        opacity:   typeof s.opacity === "number" ? clamp(s.opacity, 0.04, 0.28) : 0.12,
      }))
      .filter(s => {
        if (usedEdges.has(s.edge) && s.kind !== "glow-blob") return false;
        usedEdges.add(s.edge);
        return true;
      })
      .slice(0, 8);

    return { shapes: safe.length >= 3 ? safe : fallback.shapes };
  } catch {
    return fallback;
  }
}