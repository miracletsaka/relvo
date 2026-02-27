import { TemplateShape } from "@/lib/types";
import { fetchBestUnsplashImage } from "@/lib/unsplash";
import { buildUnsplashQueries } from "@/lib/unsplash-queries";
import { removeBackground, replaceBackground } from "@/lib/clipdrop";
import { CampaignData } from "@/lib/types";

// ─────────────────────────────────────────────
// SLOT ORIENTATION
// ─────────────────────────────────────────────
const SLOT_ORIENTATION: Record<string, "portrait" | "landscape" | "squarish"> = {
  // ── Standard Unsplash photo slots ──
  "photo-left":            "portrait",
  "photo-right":           "squarish",
  "photo-bottom":          "portrait",
  "hero-photo":            "portrait",
  "photo":                 "landscape",
  "photo-top":             "landscape",
  "photo-bl":              "squarish",
  "photo-br":              "squarish",
  "product-img":           "squarish",

  // ── Clipdrop cutout slots (bg removed → transparent PNG) ──
  "product-cutout":        "squarish",
  "product-float":         "squarish",
  "person-cutout":         "portrait",
  "hero-cutout":           "portrait",     // Samsung lifestyle hero
  "object-cutout":         "squarish",
  "character-cutout":      "portrait",     // 3D character / Clickly style

  // ── Clipdrop replace-bg slots (AI background injected) ──
  "lifestyle-scene":       "portrait",
  "photo-scene":           "landscape",
  "photo-hero-replaced":   "portrait",

  // ── SaaS Ad specific ──
  "screenshot":            "landscape",    // dashboard mockup screenshot
};

// ─────────────────────────────────────────────
// CUTOUT SLOTS — background REMOVED → transparent PNG
// ─────────────────────────────────────────────
const CUTOUT_SLOTS = new Set([
  "product-cutout",
  "product-float",
  "person-cutout",
  "hero-cutout",
  "object-cutout",
  "character-cutout",      // ← NEW: 3D character cutout for Clickly-style
]);

// ─────────────────────────────────────────────
// REPLACE BG SLOTS — fetch photo → AI replaces background
// ─────────────────────────────────────────────
const REPLACE_BG_SLOTS: Record<string, string> = {
  "photo-scene":           "clean modern studio, soft gradient, professional photography",
  "lifestyle-scene":       "bright airy lifestyle setting, natural warm light, blurred background",
  "photo-hero-replaced":   "modern professional environment, soft bokeh, studio quality",
};

// ─────────────────────────────────────────────
// SLOT-AWARE QUERY BUILDER
// ─────────────────────────────────────────────
function buildSlotQueries(
  slot: string,
  baseQueries: string[],
  campaignData: CampaignData
): string[] {
  const company = campaignData.companyName || "";

  // Product / object cutouts — want clean white/plain bg for best removal
  if (
    slot === "product-cutout" ||
    slot === "product-float" ||
    slot === "object-cutout"
  ) {
    return [
      `${company} product isolated white background`,
      "product photography white background studio",
      ...baseQueries,
    ];
  }

  // Person cutouts — want plain studio portrait for best removal
  if (
    slot === "person-cutout" ||
    slot === "hero-cutout" ||
    slot === "character-cutout"
  ) {
    return [
      "professional person studio portrait plain white background",
      "business person isolated background",
      ...baseQueries,
    ];
  }

  // Lifestyle / scene replacements
  if (
    slot === "lifestyle-scene" ||
    slot === "photo-scene" ||
    slot === "photo-hero-replaced"
  ) {
    return [
      "lifestyle professional setting natural light",
      "modern workspace professional",
      ...baseQueries,
    ];
  }

  // Samsung-style full bleed hero — wants real lifestyle person photo
  if (slot === "hero-photo") {
    return [
      "lifestyle person smiling professional natural",
      "confident professional portrait lifestyle",
      ...baseQueries,
    ];
  }

  // Dashboard / SaaS screenshots
  if (slot === "screenshot" || slot === "photo-top") {
    return [
      "software dashboard UI screenshot",
      "web app interface modern design",
      "SaaS product screenshot",
      ...baseQueries,
    ];
  }

  // Collage / editorial multi-photo slots
  if (slot === "photo-left" || slot === "photo-bl") {
    return [
      "professional smiling person portrait",
      ...baseQueries,
    ];
  }

  if (slot === "photo-right" || slot === "photo-br") {
    return [
      "business professional working laptop",
      ...baseQueries,
    ];
  }

  if (slot === "photo-bottom") {
    return [
      "diverse professional team",
      ...baseQueries,
    ];
  }

  // Default — use base queries as-is
  return baseQueries;
}

// ─────────────────────────────────────────────
// MAIN RESOLVER
// ─────────────────────────────────────────────
export async function resolveTemplateImages(
  shapes: TemplateShape[],
  campaignData: CampaignData
): Promise<TemplateShape[]> {

  const baseQueries = buildUnsplashQueries(
    campaignData.companyName || "",
    campaignData.hook || "",
    campaignData.subheading || "",
    campaignData.location || ""
  );

  // Find all placeholder image shapes
  const imageShapes = shapes.filter(
    (s) =>
      s.type === "image" &&
      typeof (s as any).src === "string" &&
      (
        (s as any).src.startsWith("__unsplash__") ||
        (s as any).src.startsWith("__clipdrop__")
      )
  );

  const resolved = await Promise.all(
    imageShapes.map(async (shape) => {
      const src = (shape as any).src as string;
      const isClipdrop = src.startsWith("__clipdrop__");
      const slot = src
        .replace("__unsplash__", "")
        .replace("__clipdrop__", "");

      const orientation = SLOT_ORIENTATION[slot] || "squarish";
      const slotQueries = buildSlotQueries(slot, baseQueries, campaignData);

      // ── STEP 1: Fetch photo from Unsplash ──
      const photoUrl = await fetchBestUnsplashImage(slotQueries, orientation);
      if (!photoUrl) return { id: shape.id, url: null };

      // ── STEP 2A: Plain Unsplash slot — return as-is ──
      if (!isClipdrop) {
        return { id: shape.id, url: photoUrl };
      }

      // ── STEP 2B: Clipdrop cutout — remove background ──
      if (CUTOUT_SLOTS.has(slot)) {
        const transparent = await removeBackground(photoUrl);
        return { id: shape.id, url: transparent || photoUrl };
      }

      // ── STEP 2C: Clipdrop replace-bg — swap background with AI scene ──
      if (REPLACE_BG_SLOTS[slot]) {
        const prompt = `${REPLACE_BG_SLOTS[slot]}, ${campaignData.location || "professional"} style`;
        const replaced = await replaceBackground(photoUrl, prompt);
        return { id: shape.id, url: replaced || photoUrl };
      }

      // ── STEP 2D: Clipdrop slot but no special processing ──
      return { id: shape.id, url: photoUrl };
    })
  );

  // Apply resolved URLs back to shapes
  const urlMap = Object.fromEntries(
    resolved
      .filter((r) => r.url !== null)
      .map((r) => [r.id, r.url as string])
  );

  return shapes.map((s) => {
    if (s.type === "image" && urlMap[s.id]) {
      return { ...s, src: urlMap[s.id] } as TemplateShape;
    }
    return s;
  });
}