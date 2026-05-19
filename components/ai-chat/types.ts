import type { CampaignData, TemplateShape } from "@/lib/types";

export type ChatRole = "user" | "assistant" | "system";
export type ChatStatus = "idle" | "generating" | "ready" | "error";

export type Draft = {
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

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  status?: ChatStatus;
  messageType?: string;
  metadata?: Record<string, any>;
  draft?: Draft | null;
  campaignData?: CampaignData | null;
  shapes?: TemplateShape[];
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundImage?: string | null;
  topicChatId?: string | null;
};

export type ChatThread = {
  id: string;
  title: string;
  status?: string;
  brand_id?: string | null;
  tone_id?: string | null;
  created_at?: string;
  updated_at?: string;
};
