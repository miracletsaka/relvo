import { TemplateShape } from "@/lib/types";
import { fetchBestUnsplashImage } from "@/lib/unsplash";
import { buildUnsplashQueries } from "@/lib/unsplash-queries";
import { removeBackground, replaceBackground } from "@/lib/clipdrop";
import { CampaignData } from "@/lib/types";

const SLOT_ORIENTATION: Record<string, "portrait" | "landscape" | "squarish"> = {
  "photo-left":          "portrait",
  "photo-right":         "squarish",
  "photo-bottom":        "portrait",
  "hero-photo":          "portrait",
  "photo":               "landscape",
  "photo-top":           "landscape",
  "photo-bl":            "squarish",
  "photo-br":            "squarish",
  "product-img":         "squarish",
  "product-cutout":      "squarish",
  "product-float":       "squarish",
  "person-cutout":       "portrait",
  "hero-cutout":         "portrait",
  "object-cutout":       "squarish",
  "character-cutout":    "portrait",
  "lifestyle-scene":     "portrait",
  "photo-scene":         "landscape",
  "photo-hero-replaced": "portrait",
  "screenshot":          "landscape",
};

const CUTOUT_SLOTS = new Set([
  "product-cutout", "product-float", "person-cutout",
  "hero-cutout", "object-cutout", "character-cutout",
]);

const REPLACE_BG_SLOTS: Record<string, string> = {
  "photo-scene":           "clean modern studio, soft gradient, professional photography",
  "lifestyle-scene":       "bright airy lifestyle setting, natural warm light, blurred background",
  "photo-hero-replaced":   "modern professional environment, soft bokeh, studio quality",
};

function buildSlotQueries(slot: string, baseQueries: string[], campaignData: CampaignData): string[] {
  const company = campaignData.companyName || "";

  if (["product-cutout","product-float","object-cutout"].includes(slot)) {
    return [`${company} product isolated white background`, "product photography white background", ...baseQueries];
  }
  if (["person-cutout","hero-cutout","character-cutout"].includes(slot)) {
    return ["professional person studio portrait plain white", "business person isolated background", ...baseQueries];
  }
  if (["lifestyle-scene","photo-scene","photo-hero-replaced"].includes(slot)) {
    return ["lifestyle professional setting natural light", "modern workspace professional", ...baseQueries];
  }
  if (slot === "hero-photo") {
    return ["lifestyle person smiling professional natural", "confident professional portrait", ...baseQueries];
  }
  if (["screenshot","photo-top"].includes(slot)) {
    return ["software dashboard UI screenshot", "web app interface modern", "SaaS product screenshot", ...baseQueries];
  }
  if (["photo-left","photo-bl"].includes(slot)) {
    return ["professional smiling person portrait", ...baseQueries];
  }
  if (["photo-right","photo-br"].includes(slot)) {
    return ["business professional working laptop", ...baseQueries];
  }
  if (slot === "photo-bottom") {
    return ["diverse professional team", ...baseQueries];
  }
  return baseQueries;
}

export async function resolveTemplateImages(
  shapes:       TemplateShape[],
  campaignData: CampaignData
): Promise<TemplateShape[]> {

  const baseQueries = buildUnsplashQueries(
    campaignData.companyName || "",
    campaignData.hook        || "",
    campaignData.subheading  || "",
    campaignData.location    || ""
  );

  const imageShapes = shapes.filter(s =>
    s.type === "image" &&
    typeof (s as any).src === "string" &&
    ((s as any).src.startsWith("__unsplash__") || (s as any).src.startsWith("__clipdrop__"))
  );

  // ── KEY FIX: allSettled — a single Clipdrop/Unsplash failure ──────────
  // no longer rejects the entire batch and loses all images
  const results = await Promise.allSettled(
    imageShapes.map(async (shape) => {
      const src        = (shape as any).src as string;
      const isClipdrop = src.startsWith("__clipdrop__");
      const slot       = src.replace("__unsplash__", "").replace("__clipdrop__", "");
      const orientation= SLOT_ORIENTATION[slot] || "squarish";
      const slotQueries= buildSlotQueries(slot, baseQueries, campaignData);

      // Step 1: fetch photo
      const photoUrl = await fetchBestUnsplashImage(slotQueries, orientation);
      if (!photoUrl) return { id: shape.id, url: null };

      // Step 2: plain Unsplash
      if (!isClipdrop) return { id: shape.id, url: photoUrl };

      // Step 2b: cutout
      if (CUTOUT_SLOTS.has(slot)) {
        try {
          const transparent = await removeBackground(photoUrl);
          return { id: shape.id, url: transparent || photoUrl };
        } catch {
          return { id: shape.id, url: photoUrl }; // degrade gracefully
        }
      }

      // Step 2c: replace-bg
      if (REPLACE_BG_SLOTS[slot]) {
        try {
          const prompt   = `${REPLACE_BG_SLOTS[slot]}, ${campaignData.location || "professional"} style`;
          const replaced = await replaceBackground(photoUrl, prompt);
          return { id: shape.id, url: replaced || photoUrl };
        } catch {
          return { id: shape.id, url: photoUrl }; // degrade gracefully
        }
      }

      return { id: shape.id, url: photoUrl };
    })
  );

  // Collect only fulfilled results
  const urlMap: Record<string, string> = {};
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.url) {
      urlMap[result.value.id] = result.value.url;
    } else if (result.status === "rejected") {
      console.warn("[resolve-template-images] Shape resolution failed:", result.reason);
    }
  }

  return shapes.map(s => {
    if (s.type === "image" && urlMap[s.id]) {
      return { ...s, src: urlMap[s.id] } as TemplateShape;
    }
    return s;
  });
}