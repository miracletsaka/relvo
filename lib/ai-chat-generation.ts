import {
  createTopicChatAndGenerate,
  listTopicChatDrafts,
} from "@/lib/api";

import {
  buildCampaignDataFromDraft,
  PORTRAIT_H,
  PORTRAIT_W,
} from "@/lib/design-studio-utils";

import {
  enrichCampaignData,
  type OrgCampaignData,
} from "@/lib/org-campaign-enricher";

import { composeRandomTemplateFromDb } from "@/lib/compose-random-template";
import type { CampaignData, TemplateShape } from "@/lib/types";
import type { BrandProfile } from "@/lib/api";
import { improveCampaignDesignShapes } from "@/lib/campaign-design-intelligence";

const TEMPLATE_FAMILY = "mixed-poster";

const DEFAULT_SECTIONS = [
  "background",
  "hero-image",
  "hero-text",
  "features",
  "cta",
  "footer",
];

type Draft = {
  id: string;
  platform: string;
  status: string;
  body_text?: string;
  hashtags?: string;
  org_slug?: string;
  scheduled_at?: string;
  structured?: Record<string, any>;
  media_url?: string;
  media_urls?: any[];
};

type GenerateArgs = {
  topic: string;
  savedAssistant: any;
  brandId: string;
  toneId: string;
  brandProfile?: BrandProfile | null;
  orgData?: OrgCampaignData | null;
  setProgressText: (text: string) => void;
};

function sanitizeShapes(shapes: TemplateShape[]): TemplateShape[] {
  return (Array.isArray(shapes) ? shapes : [])
    .filter(Boolean)
    .map((shape: any, index: number) => ({
      ...shape,
      id: shape.id || `shape-${index}`,
      type: shape.type || "rectangle",
      x: Number.isFinite(Number(shape.x)) ? Number(shape.x) : 0,
      y: Number.isFinite(Number(shape.y)) ? Number(shape.y) : 0,
      width: Number.isFinite(Number(shape.width)) ? Number(shape.width) : 100,
      height: Number.isFinite(Number(shape.height)) ? Number(shape.height) : 100,
      zIndex: Number.isFinite(Number(shape.zIndex)) ? Number(shape.zIndex) : index,
      borderWidth: Number.isFinite(Number(shape.borderWidth))
        ? Number(shape.borderWidth)
        : 0,
      borderRadius: Number.isFinite(Number(shape.borderRadius))
        ? Number(shape.borderRadius)
        : 0,
      radius: Number.isFinite(Number(shape.radius)) ? Number(shape.radius) : 0,
      opacity: shape.opacity === undefined ? 1 : Number(shape.opacity),
      backgroundColor:
        shape.backgroundColor ??
        (shape.type === "text" || shape.type === "image"
          ? "transparent"
          : "rgba(255,255,255,0)"),
      textColor: shape.textColor ?? "#ffffff",
      borderColor: shape.borderColor ?? "transparent",
      fontFamily: shape.fontFamily || "'Montserrat', sans-serif",
      fontSize: Number.isFinite(Number(shape.fontSize))
        ? Number(shape.fontSize)
        : 24,
      fontWeight: shape.fontWeight ?? 700,
      textAlign: shape.textAlign || "left",
      lineHeight: Number.isFinite(Number(shape.lineHeight))
        ? Number(shape.lineHeight)
        : 1.15,
      letterSpacing: Number.isFinite(Number(shape.letterSpacing))
        ? Number(shape.letterSpacing)
        : 0,
      fit: shape.fit || "cover",
      gradientColors: Array.isArray(shape.gradientColors)
        ? shape.gradientColors.filter(
            (g: any) => g && typeof g.color === "string",
          )
        : undefined,
    })) as TemplateShape[];
}

function getComposedShapes(composed: any): TemplateShape[] {
  const shapes =
    composed?.shapes ||
    composed?.template_shapes ||
    composed?.layout?.shapes;

  return Array.isArray(shapes) ? (shapes as TemplateShape[]) : [];
}

async function safeGenerateWithFallback(
  params: Parameters<typeof createTopicChatAndGenerate>[0],
  onChatIdKnown: (id: string) => void,
  onProgress?: (draftsCount: number) => void,
): Promise<{
  generated: number;
  failed: number;
  topic_chat_id: string | null;
}> {
  const res = await createTopicChatAndGenerate(params);

  const topicChatId: string | null = (res as any)?.topic_chat_id ?? null;

  if (!topicChatId) {
    throw new Error("No topic_chat_id returned from server");
  }

  onChatIdKnown(topicChatId);

  const serverStatus = (res as any)?.status;

  if (serverStatus !== "processing") {
    return {
      generated: (res as any)?.generated ?? 0,
      failed: (res as any)?.failed ?? 0,
      topic_chat_id: topicChatId,
    };
  }

  const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
  const POLL_INTERVAL = 4000;
  const POLL_TIMEOUT = 900_000;
  const pollStart = Date.now();

  while (Date.now() - pollStart < POLL_TIMEOUT) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

    try {
      const pollRes = await fetch(`${API}/topic-chats/${topicChatId}/status`, {
        credentials: "include",
      });

      const poll = await pollRes.json();

      if (poll.drafts_so_far !== undefined) {
        onProgress?.(poll.drafts_so_far);
      }

      if (poll.status === "done") {
        return {
          generated: poll.generated ?? 0,
          failed: poll.failed ?? 0,
          topic_chat_id: topicChatId,
        };
      }

      if (poll.status === "failed") {
        throw new Error(poll.error || "Generation failed on server");
      }
    } catch (pollErr: any) {
      if (pollErr?.message?.includes("Generation failed")) {
        throw pollErr;
      }
    }
  }

  const drafts: Draft[] = await listTopicChatDrafts(topicChatId).catch(() => []);

  return {
    generated: drafts.filter((draft) => draft.status !== "FAILED").length,
    failed: drafts.filter((draft) => draft.status === "FAILED").length,
    topic_chat_id: topicChatId,
  };
}

function buildSafeDraft(usableDraft: Draft): Draft {
  return {
    ...usableDraft,
    media_url: usableDraft.media_url ?? undefined,
    media_urls: Array.isArray(usableDraft.media_urls)
      ? usableDraft.media_urls
      : [],
    structured: usableDraft.structured ?? {},
  };
}

function buildSafeOrgData(orgData?: OrgCampaignData | null) {
  if (!orgData) return null;

  return {
    ...(orgData as any),
    sponsors: (orgData as any).sponsors || [],
    reviews: (orgData as any).reviews || [],
    offers: (orgData as any).offers || [],
    accreditations: (orgData as any).accreditations || [],
    metadata: (orgData as any).metadata || [],
  };
}

async function buildPostFromGeneratedDraft({
  topicChatId,
  orgData,
}: {
  topicChatId: string;
  orgData?: OrgCampaignData | null;
}) {
  const draftResponse = await listTopicChatDrafts(topicChatId);

  const drafts: Draft[] = Array.isArray(draftResponse)
    ? draftResponse
    : Array.isArray((draftResponse as any)?.drafts)
      ? (draftResponse as any).drafts
      : [];

  if (!drafts.length) {
    throw new Error("Generation completed, but no drafts were returned.");
  }

  const usableDraft =
    drafts.find((draft) => draft.status !== "FAILED") || drafts[0];

  if (!usableDraft) {
    throw new Error("No usable generated draft was returned.");
  }

  const safeDraft = buildSafeDraft(usableDraft);
  const draftData = await buildCampaignDataFromDraft(safeDraft);

  const safeOrgData = buildSafeOrgData(orgData);

  const campaignData: CampaignData = safeOrgData
    ? enrichCampaignData(draftData, safeOrgData)
    : draftData;

  const composed = await composeRandomTemplateFromDb(
    TEMPLATE_FAMILY,
    DEFAULT_SECTIONS,
  );

  const shapes = sanitizeShapes(getComposedShapes(composed));

  if (!shapes.length) {
    throw new Error("DB segment composer returned no shapes");
  }

  const canvasWidth = Number(
    composed?.canvasWidth || composed?.canvas_width || PORTRAIT_W,
  );

  const canvasHeight = Number(
    composed?.canvasHeight || composed?.canvas_height || PORTRAIT_H,
  );

  return {
    draft: safeDraft,
    campaignData,
    shapes,
    canvasWidth,
    canvasHeight,
    backgroundImage: composed?.backgroundImage || null,
  };
}

export async function generateSingleImageFromAssistant({
  topic,
  savedAssistant,
  brandId,
  toneId,
  brandProfile,
  orgData,
  setProgressText,
}: GenerateArgs) {
  setProgressText("Starting campaign generation...");

  let topicChatId: string | null = null;

  const generationPrompt =
    savedAssistant?.metadata?.generation_prompt || topic;

  console.log("[AI CHAT] generationPrompt", generationPrompt);

  const genRes = await safeGenerateWithFallback(
    {
      brand_id: brandId,

      // Backend randomly selects active tone
      tone_id: null,

      topic: generationPrompt,
      mode: "single",
      target_month: undefined,
      posts_per_week: 1,

      brand_profile_summary: brandProfile?.profile_summary ?? undefined,

      brand_profile_json: brandProfile?.profile_json ?? undefined,

      client_now: new Date().toISOString(),

      timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        "Europe/London",

      posting_hour_local: 9,
    } as any,

    (id) => {
      topicChatId = id;

      console.log("[AI CHAT] topicChatId", id);

      setProgressText(`Campaign chat created: ${id.slice(0, 10)}...`);
    },

    (count) => {
      console.log("[AI CHAT] generatedDraftCount", count);

      setProgressText(`Drafts generated so far: ${count}`);
    },
  );

  const selectedTone =
    (genRes as any)?.draft?.tone || (genRes as any)?.tone || null;

  console.log("[AI CHAT] selectedTone", selectedTone);
  console.log("[AI CHAT] generationResponse", genRes);

  if (!genRes.topic_chat_id) {
    throw new Error("Generation finished but no topic_chat_id was returned");
  }

  topicChatId = genRes.topic_chat_id;

  setProgressText("Fetching generated draft data...");

  const built = await buildPostFromGeneratedDraft({
    topicChatId,
    orgData,
  });

  const improvedShapes = improveCampaignDesignShapes(
    built.shapes,
    built.campaignData,
  );

  const missingFields = (improvedShapes || [])
    .filter(
      (shape: any) =>
        shape?.dataField && !built?.campaignData?.[shape.dataField],
    )
    .map((shape: any) => ({
      shapeId: shape.id,
      field: shape.dataField,
      type: shape.type,
    }));

  console.log("[AI CHAT] missingFields", missingFields);

  const metadata = {
    ...(savedAssistant?.metadata || {}),

    topic_chat_id: topicChatId,

    selected_tone: selectedTone,

    tone_id: selectedTone?.id || toneId || null,

    draft: built.draft,

    campaign_data: built.campaignData,

    shapes: improvedShapes,

    canvas_width: built.canvasWidth,

    canvas_height: built.canvasHeight,

    background_image: built.backgroundImage,
  };

  console.log("[AI CHAT] finalMetadata", metadata);

  return {
    metadata,

    selectedTone,

    draft: built.draft,

    campaignData: built.campaignData,

    shapes: improvedShapes,

    canvasWidth: built.canvasWidth,

    canvasHeight: built.canvasHeight,

    backgroundImage: built.backgroundImage,

    topicChatId,
  };
}

export async function generateMonthFromAssistant({
  topic,
  savedAssistant,
  brandId,
  toneId,
  brandProfile,
  orgData,
  setProgressText,
}: GenerateArgs) {
  const monthItems: any[] = [];

  for (let i = 0; i < 4; i++) {
    setProgressText(`Generating post ${i + 1} of 4...`);

    let topicChatId: string | null = null;

    const basePrompt =
      savedAssistant?.metadata?.generation_prompt || topic;

    const genRes = await safeGenerateWithFallback(
      {
        brand_id: brandId,

        // Backend randomly selects active tone
        tone_id: null,

        topic: `${basePrompt}. Monthly campaign post ${
          i + 1
        }. Make this post unique.`,

        mode: "single",

        target_month: undefined,

        posts_per_week: 1,

        brand_profile_summary: brandProfile?.profile_summary ?? undefined,

        brand_profile_json: brandProfile?.profile_json ?? undefined,

        client_now: new Date().toISOString(),

        timezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          "Europe/London",

        posting_hour_local: 9,
      } as any,

      (id) => {
        topicChatId = id;
      },

      (count) => {
        setProgressText(`Post ${i + 1}: drafts generated ${count}`);
      },
    );

    if (!genRes.topic_chat_id) {
      continue;
    }

    topicChatId = genRes.topic_chat_id;

    const selectedTone =
      (genRes as any)?.draft?.tone || (genRes as any)?.tone || null;

    try {
      const built = await buildPostFromGeneratedDraft({
        topicChatId,
        orgData,
      });

      const improvedShapes = improveCampaignDesignShapes(
        built.shapes,
        built.campaignData,
      );

      monthItems.push({
        topic_chat_id: topicChatId,

        selected_tone: selectedTone,

        tone_id: selectedTone?.id || toneId || null,

        draft: built.draft,

        campaign_data: built.campaignData,

        shapes: improvedShapes,

        canvas_width: built.canvasWidth,

        canvas_height: built.canvasHeight,

        background_image: built.backgroundImage,
      });
    } catch (err) {
      console.warn(
        "[generateMonthFromAssistant] skipped failed monthly item",
        err,
      );
    }
  }

  const metadata = {
    ...(savedAssistant?.metadata || {}),
    items: monthItems,
  };

  return {
    items: monthItems,
    metadata,
  };
}