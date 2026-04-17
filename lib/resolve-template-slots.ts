import type { CampaignData, TemplateShape } from "@/lib/types";

export function resolveTemplateSlots(
  shapes: TemplateShape[],
  campaignData: CampaignData
): TemplateShape[] {
  const hasProof = !!String(campaignData.proof || "").trim();

  return shapes.map((shape) => {
    // image slots
    if (shape.type === "image" && shape.slotKey) {
      const slot = campaignData.imageSlots?.[shape.slotKey];

      if (slot?.url) {
        return {
          ...shape,
          src: slot.url,
          opacity: 1,
        };
      }

      // hide empty optional image slots
      return {
        ...shape,
        opacity: shape.slotVisibleWhenEmpty ? shape.opacity ?? 1 : 0,
      };
    }

    // hide price block if no proof/price
    if (shape.slotKey === "price_block" && !hasProof) {
      return { ...shape, opacity: 0 };
    }

    // hide proof text if missing
    if (shape.type === "text" && shape.dataField === "proof" && !hasProof) {
      return { ...shape, opacity: 0 };
    }

    // hide optional review block
    if (
      shape.slotKey === "review_block" &&
      !String(campaignData.review_text || "").trim()
    ) {
      return { ...shape, opacity: 0 };
    }

    // hide optional sponsor block
    if (
      shape.slotKey?.startsWith("sponsor_") &&
      !campaignData.imageSlots?.[shape.slotKey]?.url
    ) {
      return { ...shape, opacity: 0 };
    }

    return shape;
  });
}