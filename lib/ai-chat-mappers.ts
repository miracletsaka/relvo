import type { CampaignData } from "@/lib/types";
import type { ChatMessage } from "@/components/ai-chat/types";
import { PORTRAIT_H, PORTRAIT_W } from "@/lib/design-studio-utils";

function safeArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function normalizeLinks(links: any) {
  return safeArray(links)
    .map((item: any) => {
      if (typeof item === "string") {
        return {
          label: item,
          url: item,
        };
      }

      return {
        label: item?.label || item?.url || "Link",
        url: item?.url || "",
      };
    })
    .filter((x: any) => x.url);
}

export function buildCampaignDataFromDraft(draft: any): CampaignData {
  const s = draft?.structured || {};

  return {
    hook: (s.hook ?? s.headline ?? "").toString(),
    subheading: (s.subheading ?? s.subheadline ?? "").toString(),
    bullets: safeArray(s.bullets).slice(0, 4),
    proof: (s.proof ?? "").toString(),
    cta: (s.cta_text ?? s.cta ?? "").toString(),
    ctaLink: (s.ctaLink ?? "").toString(),

    headline: (s.headline ?? "").toString(),
    subheadline: (s.subheadline ?? "").toString(),
    product_name: (s.product_name ?? "").toString(),
    description: (s.description ?? "").toString(),

    campaign_label: (s.campaign_label ?? "").toString(),
    collection_label: (s.collection_label ?? "").toString(),
    footer_label: (s.footer_label ?? "").toString(),

    offer_label: (s.offer_label ?? "").toString(),
    offer_value: (s.offer_value ?? "").toString(),

    feature_1: (s.feature_1 ?? "").toString(),
    feature_2: (s.feature_2 ?? "").toString(),
    feature_3: (s.feature_3 ?? "").toString(),
    feature_4: (s.feature_4 ?? "").toString(),

    phone: (s.phone ?? s.phone_primary ?? "").toString(),
    email: (s.email ?? s.email_primary ?? "").toString(),
    whatsapp: (s.whatsapp ?? "").toString(),
    website: (s.website ?? s.business_website ?? "").toString(),

    city: (s.city ?? "").toString(),
    country: (s.country ?? "").toString(),
    address: (s.address ?? "").toString(),

    review_text: (s.review_text ?? "").toString(),
    review_author: (s.review_author ?? "").toString(),

    companyName: (s.companyName ?? "NeuroFlow AI").toString(),
    location: (s.location ?? "London").toString(),

    hashtags: safeArray(s.hashtags),

    sponsors: safeArray(s.sponsors),
    reviews: safeArray(s.reviews),
    offers: safeArray(s.offers),
    accreditations: safeArray(s.accreditations),

    links: normalizeLinks(s.links),

    imageSlots: s.imageSlots || {},
    heroImage: s.heroImage || s.hero_image || null,
    logo: s.logo || null,
  } as CampaignData;
}

export function dbMessageToChatMessage(row: any): ChatMessage {
  const metadata = row.metadata || {};

  if (row.message_type === "generated_image") {
    return {
      id: row.id,
      role: row.role,
      text: row.content,
      status: "ready",
      messageType: row.message_type,
      metadata,
      draft: metadata.draft || null,
      campaignData: metadata.campaign_data || null,
      shapes: Array.isArray(metadata.shapes) ? metadata.shapes : [],
      canvasWidth: metadata.canvas_width || PORTRAIT_W,
      canvasHeight: metadata.canvas_height || PORTRAIT_H,
      backgroundImage: metadata.background_image || null,
      topicChatId: metadata.topic_chat_id || null,
    };
  }

  if (row.message_type === "generated_month") {
    return {
      id: row.id,
      role: row.role,
      text: row.content,
      status: "ready",
      messageType: row.message_type,
      metadata,
    };
  }

  return {
    id: row.id,
    role: row.role,
    text: row.content,
    status: "ready",
    messageType: row.message_type,
    metadata,
  };
}
