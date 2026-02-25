import { TemplateShape } from "@/lib/types";
import { fetchBestUnsplashImage } from "@/lib/unsplash";
import { buildUnsplashQueries } from "@/lib/unsplash-queries";
import { removeBackground, replaceBackground } from "@/lib/clipdrop";
import { CampaignData } from "@/lib/types";

// ─────────────────────────────────────────────
// SLOT ORIENTATION
// ─────────────────────────────────────────────
const SLOT_ORIENTATION: Record<string, "portrait" | "landscape" | "squarish"> = {
  // existing unsplash slots
  "photo-left": "portrait",
  "photo-right": "squarish",
  "photo-bottom": "portrait",
  "hero-photo": "portrait",
  "photo": "landscape",
  "photo-top": "landscape",
  "photo-bl": "squarish",
  "photo-br": "squarish",
  "product-img": "squarish",
  // clipdrop slots
  "product-cutout": "squarish",
  "product-float": "squarish",
  "person-cutout": "portrait",
  "hero-cutout": "portrait",
  "object-cutout": "squarish",
  "lifestyle-scene": "portrait",
  "photo-scene": "landscape",
  "photo-hero-replaced": "portrait",
};

// ─────────────────────────────────────────────
// CLIPDROP — slots that need background REMOVED
// returns transparent PNG
// ─────────────────────────────────────────────
const CUTOUT_SLOTS = new Set([
  "product-cutout",
  "product-float",
  "person-cutout",
  "hero-cutout",
  "object-cutout",
]);

// ─────────────────────────────────────────────
// CLIPDROP — slots that need background REPLACED
// returns photo with AI-generated background
// ─────────────────────────────────────────────
const REPLACE_BG_SLOTS: Record<string, string> = {
  "photo-scene": "clean modern studio, soft gradient, professional photography",
  "lifestyle-scene": "bright airy lifestyle setting, natural warm light, blurred background",
  "photo-hero-replaced": "modern professional environment, soft bokeh, studio quality",
};

// ─────────────────────────────────────────────
// MAIN RESOLVER
// ─────────────────────────────────────────────
export async function resolveTemplateImages(
  shapes: TemplateShape[],
  campaignData: CampaignData
): Promise<TemplateShape[]> {

  const queries = buildUnsplashQueries(
    campaignData.companyName || "",
    campaignData.hook || "",
    campaignData.subheading || "",
    campaignData.location || ""
  );

  // Handle both __unsplash__ and __clipdrop__ prefixes
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

      // Build slot-aware queries
      const slotQueries = slot.includes("product") || slot.includes("cutout")
        ? [`${campaignData.companyName} product isolated white background`, ...queries]
        : slot.includes("person") || slot.includes("hero-cutout")
        ? ["professional person studio portrait plain background", ...queries]
        : slot.includes("lifestyle") || slot.includes("scene")
        ? ["lifestyle professional setting natural light", ...queries]
        : queries;

      // ── STEP 1: Fetch from Unsplash (same for both paths) ──
      const photoUrl = await fetchBestUnsplashImage(slotQueries, orientation);
      if (!photoUrl) return { id: shape.id, url: null };

      // ── STEP 2A: EXISTING UNSPLASH path — return as-is ──
      if (!isClipdrop) {
        return { id: shape.id, url: photoUrl };
      }

      // ── STEP 2B: CLIPDROP path — process image ──

      // Remove background → transparent PNG
      if (CUTOUT_SLOTS.has(slot)) {
        const transparent = await removeBackground(photoUrl);
        return { id: shape.id, url: transparent || photoUrl };
      }

      // Replace background → AI scene
      if (REPLACE_BG_SLOTS[slot]) {
        const prompt = `${REPLACE_BG_SLOTS[slot]}, ${campaignData.location || "professional"} style`;
        const replaced = await replaceBackground(photoUrl, prompt);
        return { id: shape.id, url: replaced || photoUrl };
      }

      // Clipdrop slot but no special processing needed — use raw photo
      return { id: shape.id, url: photoUrl };
    })
  );

  // Apply resolved URLs back to shapes
  const urlMap = Object.fromEntries(
    resolved
      .filter((r) => r.url !== null)
      .map((r) => [r.id, r.url])
  );

  return shapes.map((s) => {
    if (s.type === "image" && urlMap[s.id]) {
      return { ...s, src: urlMap[s.id] } as TemplateShape;
    }
    return s;
  });
}