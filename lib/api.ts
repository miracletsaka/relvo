// frontend/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

if (!API_BASE) {
  throw new Error("NEXT_PUBLIC_API_BASE is not set. Add it in .env.local");
}

export type Platform = string;
export type ContentType = "text" | "image" | "video";

export type Status =
  | "TOPIC_INGESTED"
  | "GENERATING"
  | "DRAFT_READY"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SCHEDULED"
  | "QUEUED"
  | "PUBLISHED"
  | "FAILED";


export async function listTemplates(params?: { brand_id?: string; platform?: string }) {
  const qs = new URLSearchParams();
  if (params?.brand_id) qs.set("brand_id", params.brand_id);
  if (params?.platform) qs.set("platform", params.platform);

  const res = await fetch(`/api/templates?${qs.toString()}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to list templates");
  }

  return res.json();
}

export interface ContentItem {
  id: string;
  topic_id: string;
  brand_id?: string;
  platform: Platform;
  content_type: ContentType;
  status: Status;

  title?: string | null;

  // 기존 caption/body
  body_text?: string | null;
  hashtags?: string | null;

  // ✅ NEW: structured fields
  hook?: string | null;
  subheading?: string | null;
  bullets?: string[] | null;     // JSONB in DB
  proof?: string | null;
  cta?: string | null;

  // Catch-all structured JSON (if you store additional layout blocks)
  structured?: Record<string, any> | null; // JSONB in DB

  scheduled_at?: string | null;
  published_at?: string | null;
  published_url?: string | null;

  last_error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  // ✅ media
  media_type?: "image" | "video" | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
  media_provider?: string | null;
  media_caption?: string | null;
}

export type DraftItem = {
  id: string;
  topic_chat_id: string;

  topic: string;
  brand_id: string;
  target_month: string;
  posts_per_week: number;

  platform: string;
  status: string;
  body_text?: string | null;
  hashtags?: string | null;
  structured?: any;
  scheduled_at?: string | null;

  media_type?: "image" | "video" | null;
  media_url?: string | null;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  media_provider?: string | null;
  media_caption?: string | null;

  last_error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function getAllDrafts(limit = 200) {
  return api<DraftItem[]>(`/drafts?limit=${limit}`);
}

export type Brand = {
  id: string;
  display_name: string;
  is_active: boolean;
};

export type PlatformRow = {
  id: string;
  display_name: string;
  is_active: boolean;
};

export type OverviewStats = {
  by_status: { status: string; count: number }[];
  by_platform: { platform: string; count: number }[];
  by_brand: { brand_id: string; count: number }[];
};

export type BrandProfile = {
  brand_id: string
  website_url?: string | null
  status: "IDLE" | "SCRAPING" | "READY" | "FAILED" | string
  last_error?: string | null
  last_scraped_at?: string | null
  pages_scraped?: string[]
  profile_summary?: string | null
  profile_json?: any
  colors?: any[]
  tone_tags?: string[]
  services?: any[]
  audiences?: any[]
  notes_manual_override?: string | null
}

export type UserRow = {
  id: string;
  email: string;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
};

export type Me = { id: string; email: string; is_email_verified: boolean };

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include", 
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}

export function apiMe() {
  return api<Me>("/auth/me");
}

export function listUsers() {
  return api<UserRow[]>(`/users`, {
    method: "GET",
    credentials: "include",
  });
}

export function previewTopicChat(payload: {
  brand_id: string;
  topic: string;
  target_month: string;
  posts_per_week: number;
}) {
  return api<{ will_generate: number }>("/topic-chats/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function synthesizeAndSaveTemplate(payload?: {
  brand_id?: string;
  canvas_width?: number;
  canvas_height?: number;
}) {
  return api<{
    ok: boolean;
    template?: any;
    used_templates?: string[];
    error?: string;
  }>("/templates/synthesize-and-save", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(payload || {}),
  });
}

export function synthesizeTemplate() {
  return api<{ ok: boolean; template?: any; error?: string; used_templates?: string[] }>(
    "/templates/synthesize",
    { method: "POST", credentials: "include"
 }
  );
}

// src/lib/api.ts
export type TopicChat = {
  id: string;
  brand_id: string;
  topic: string;
  target_month: string;
  posts_per_week: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ContentDraft = {
  id: string;
  topic_chat_id: string;
  brand_id: string;
  platform: string;
  status: string;
  body_text?: string | null;
  hashtags?: string | null;
  structured?: any;
  scheduled_at?: string | null;
  last_error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function generateBackgrounds(
  topicChatId: string,
  prompts: string[]
): Promise<{
  images: Array<{
    url: string;
    prompt: string;
    generatedAt: string;
  }>;
}> {
  const response = await fetch("/api/generate-backgrounds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topicChatId, prompts }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate backgrounds");
  }

  return response.json();
}

// Save uploaded background image URLs for a topic chat
export async function saveChatBackgrounds(payload: {
  topic_chat_id: string
  urls: string[]
}) {
  return api<{ ok: boolean; count: number; background_images: string[] }>(
    `/topic-chats/${payload.topic_chat_id}/backgrounds`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // ✅ send what backend expects
        background_images: payload.urls, // OR background_images: payload.urls
      }),
    }
  )
}

export async function getDraftById(id: string) {
  // your drafts are served via "content" routes in your system
  return api<any>(`/drafts/${id}`, { method: "GET" });
}

export async function getTemplateById(id: string) {
  return api<any>(`/templates/${id}`, { method: "GET" });
}

// Fetch background images for a topic chat
export async function getChatBackgrounds(topicChatId: string) {
  return api<{ id: string; image_url: string }[]>(
    `/chat-backgrounds?topic_chat_id=${topicChatId}`
  )
}


export async function getTopicChat(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/topic-chats/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to load topic chat (${res.status})`);
  }

  return res.json();
}

// --- Topic Chats  ---

export async function listTopicChats(limit: number = 50) {
  const safe = Math.max(1, Math.min(50, Number(limit || 50)));
  return api<any[]>(`/topic-chats?limit=${safe}`, { method: "GET" });
}


// optional if you want pagination later
export async function listTopicChatsAll() {
  return api<any[]>(`/topic-chats`, { method: "GET" });
}

export async function listTopicChatDrafts(topicChatId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/topic-chats/${topicChatId}/drafts`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to load topic chat drafts (${res.status})`);
  }

  return res.json();
}


// optional
export async function regenerateTopicChat(chatId: string, payload: {
  brand_profile_summary?: string;
  brand_profile_json?: any;
  client_now?: string;
  timezone?: string;
  posting_hour_local?: number;
}) {
  return api<{ created: number; generated: number; failed?: number }>(
    `/topic-chats/${chatId}/regenerate`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

// editing a draft (you likely already have something like this)
export async function updateDraft(draftId: string, payload: Partial<{
  hook: string;
  subheading: string;
  bullets: string[];
  proof: string;
  cta: string;
  body_text: string;
  hashtags: string;
  scheduled_at: string; // ISO
  platform: string;
  status: string;
  structured: any;
}>) {
  return api<{ ok: boolean; id: string; updated_at?: string }>(
    `/content-drafts/${draftId}`,
    { method: "PATCH", body: JSON.stringify(payload) }
  );
}

export type TopicChatCreatePayload = {
  brand_id: string;
  topic: string;
  mode?: "monthly";           // V2 is basically monthly planner
  target_month: string;       // "YYYY-MM"
  posts_per_week: number;
  brand_profile_summary?: string;
  brand_profile_json?: any;
  client_now?: string;        // ISO from browser
  timezone?: string;          // "Europe/London"
  posting_hour_local?: number; // 9
  // Optional: if you allow user to choose which platform pages are active later (Option A doesn’t need it)
};

export type TopicChatCreateResponse = {
  ok?: boolean;
  topic_chat_id: string;
  created: number;
  generated: number;
  failed?: number;
  note?: string;
};

export function createTopicChatAndGenerate(payload: TopicChatCreatePayload) {
  // this route should hit your new router: POST /topic-chats
  return api<TopicChatCreateResponse>("/topic-chats", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


export function changePassword(payload: { current_password: string; new_password: string }) {
  return api<{ ok: boolean }>(`/auth/change-password`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function registerUser(payload: { email: string; }) {
  return api<{ ok: boolean; message: string }>(`/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: { email: string; password: string }) {
  return api<{ ok: boolean; user: { id: string; email: string; is_email_verified: boolean } }>(`/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function logoutUser() {
  return api<{ ok: boolean }>(`/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
}

export function getMe() {
  return api<{ id: string; email: string; is_email_verified: boolean }>(`/auth/me`);
}

export function verifyEmail(token: string) {
  return api<{ ok: boolean; message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export function upsertBrandProfile(
  brand_id: string,
  payload: {
    notes_manual_override?: string | null
    profile_summary?: string | null
    profile_json?: any
  }
) {
  return api<{ ok: boolean; brand_id: string }>(`/brand-profiles/${encodeURIComponent(brand_id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export function getBrandProfile(brand_id: string) {
  return api<BrandProfile>(`/brand-profiles/${encodeURIComponent(brand_id)}`)
}

export function startBrandScrape(payload: { brand_id: string; website_url: string }) {
  return api<{ ok: boolean; brand_id: string; status: string }>(`/brand-profiles/scrape`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/* =========================
   ✅ MEDIA GENERATION (Make)
   ========================= */

/**
 * ✅ Correct route (your backend):
 * POST /media/generate
 * body: { content_item_ids: [...] }
 */
export async function generateMediaViaMake(draft_ids: string[]) {
  return api<{ generated: number; skipped?: number; skipped_items?: any[] }>(`/media/generate`, {
    method: "POST",
    body: JSON.stringify({ draft_ids }),
  });
}

/**
 * Optional (only if you built /media/attach)
 * If you're using Make -> /media/ingest then you may not need this.
 */
export async function attachMedia(payload: {
  content_item_id: string;
  media_url: string;
  media_type: "image" | "video";
  thumbnail_url?: string;
  media_provider?: string;
}) {
  return api<{ ok: boolean; id: string; media_url: string; media_type: string }>(`/media/attach`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* =========================
   ✅ PUBLISHING (Make)
   ========================= */

export async function publishViaMake(draft_ids: string[]) {
  return api<{ sent: number; skipped?: number; skipped_items?: any[] }>(`/make/publish`, {
    method: "POST",
    body: JSON.stringify({ draft_ids }),
  });
}

export async function markPublished(content_item_ids: string[], published_url?: string) {
  return api<{
    published: number;
    skipped?: number;
    skipped_items?: { id: string; status: string; reason: string }[];
  }>(`/publishing/mark-published`, {
    method: "POST",
    body: JSON.stringify({ content_item_ids, published_url }),
  });
}

export async function undoQueued(content_item_ids: string[]) {
  return api<{
    reverted: number;
    skipped?: number;
    skipped_items?: { id: string; status: string; reason: string }[];
  }>(`/publishing/undo-queued`, {
    method: "POST",
    body: JSON.stringify({ content_item_ids }),
  });
}

export async function attachMediaToContentItem(contentItemId: string, payload: {
  media_type?: "image" | "video";
  media_url?: string | null;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  media_provider?: string | null;
  media_caption?: string | null;
}) {
  return api<{ ok: boolean }> (`/content/${contentItemId}/media`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}


// ✅ Update editable fields (you need backend PATCH route)
export function updateContentItem(id: string, patch: any) {
  return api(`/content/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// ✅ Upload media (recommended: presigned upload OR backend upload endpoint)
// For V1 simplest: backend endpoint accepts multipart and returns { url }
export async function uploadMediaFile(file: File) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/media/upload`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ url: string }>;
}


export async function retryFailed(content_item_ids: string[]) {
  return api<{ retried: number }>(`/publishing/retry-failed`, {
    method: "POST",
    body: JSON.stringify({ content_item_ids }),
  });
}

/* =========================
   ✅ CONTENT LISTS
   ========================= */

export async function getPublishedContent(limit = 50) {
  return api<ContentItem[]>(`/content/published?limit=${limit}`);
}

export async function getFailedContent(limit = 50) {
  return api<ContentItem[]>(`/content/failed?limit=${limit}`);
}

export async function getQueuedContent() {
  return api<ContentItem[]>(`/content/queued`);
}

export async function getScheduledContent() {
  return api<ContentItem[]>(`/content/scheduled`);
}

export async function getApprovedContent(params?: { brand_id?: string; platform?: string; content_type?: string }) {
  const qs = new URLSearchParams();
  if (params?.brand_id) qs.set("brand_id", params.brand_id);
  if (params?.platform) qs.set("platform", params.platform);
  if (params?.content_type) qs.set("content_type", params.content_type);
  const q = qs.toString();
  return api<ContentItem[]>(`/content/approved${q ? `?${q}` : ""}`);
}

export function getPendingApproval() {
  return api<ContentItem[]>("/content/pending-approval");
}

export function getAllContent() {
  return api<ContentItem[]>("/content/all");
}

export function getRecentContent(limit = 8) {
  return api<ContentItem[]>(`/content/recent?limit=${limit}`);
}

/* =========================
   ✅ SCHEDULING
   ========================= */

export async function bulkSchedule(payload: { content_item_ids: string[]; scheduled_at: string }) {
  return api<{ scheduled: number; scheduled_at: string }>("/schedule/bulk", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* =========================
   ✅ EXPORT / QUEUE
   ========================= */

export async function downloadBufferCSV(params?: {
  brand_id?: string;
  platform?: string;
  from_dt?: string;
  to_dt?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.brand_id) qs.set("brand_id", params.brand_id);
  if (params?.platform) qs.set("platform", params.platform);
  if (params?.from_dt) qs.set("from_dt", params.from_dt);
  if (params?.to_dt) qs.set("to_dt", params.to_dt);

  const res = await fetch(`${API_BASE}/export/buffer.csv?${qs.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  return blob;
}

export async function markQueued(content_item_ids: string[]) {
  return api<{
    queued: number;
    skipped?: number;
    skipped_items?: { id: string; status: string; reason: string }[];
  }>(`/export/mark-queued`, {
    method: "POST",
    body: JSON.stringify({ content_item_ids }),
  });
}

/* =========================
   ✅ PLATFORMS / BRANDS
   ========================= */

export async function listPlatforms(active_only = true) {
  return api<PlatformRow[]>(`/platforms?active_only=${active_only ? "true" : "false"}`);
}

export async function createPlatform(payload: { id: string; display_name: string; is_active?: boolean }) {
  return api<PlatformRow>("/platforms", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePlatform(platformId: string, payload: { display_name?: string; is_active?: boolean }) {
  return api<PlatformRow>(`/platforms/${platformId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function listBrands(active_only = true) {
  return api<Brand[]>(`/brands?active_only=${active_only ? "true" : "false"}`);
}

export function createBrand(payload: { id: string; display_name: string; is_active?: boolean }) {
  return api<Brand>("/brands", { method: "POST", body: JSON.stringify(payload) });
}

export function updateBrand(brandId: string, payload: { display_name?: string; is_active?: boolean }) {
  return api<Brand>(`/brands/${brandId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

/* =========================
   ✅ TOPICS + APPROVAL ACTIONS
   ========================= */

   export async function autoScheduleMonth(payload: {
  brand_id: string;
  plan_month: string;   // "YYYY-MM"
  time_of_day?: string; // "09:00"
  dry_run?: boolean;
}) {
  return api<{
    scheduled: number;
    plan_month: string;
    times_per_week: number;
    preview?: { id: string; scheduled_at: string }[];
  }>("/planner/auto-schedule-month", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createTopics(payload: {
  topics: string[];
  brand_id: string;
  platforms: Platform[];
  plan_month: string;       // "YYYY-MM"
  times_per_week: number;
}) {
  return api<{ content_items_created: number }>("/topics", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function moveToPending(id: string) {
  return api<{ id: string; status: string }>(`/content/${id}/move-to-pending`, {
    method: "POST",
  });
}

export function bulkApprove(ids: string[]) {
  return api<{ approved: number }>("/approvals/approve", {
    method: "POST",
    body: JSON.stringify({ content_item_ids: ids }),
  });
}

export function bulkReject(ids: string[], reason?: string) {
  return api<{ rejected: number }>("/approvals/reject", {
    method: "POST",
    body: JSON.stringify({ content_item_ids: ids, reason }),
  });
}

/* =========================
   ✅ TEXT GENERATION
   ========================= */

export function generateTextDrafts(payload: {
  brand_id: string;
  mode?: "new" | "rejected" | "monthly";
  platforms?: Platform[];          // ✅ add
  target_month?: string;           // ✅ add "YYYY-MM"
  posts_per_week?: number;         // ✅ add
  brand_profile_summary?: string;
  brand_profile_json?: any;
  client_now?: string;          // ISO
  timezone?: string;            // IANA
  posting_hour_local?: number;  
}) {
  return api<{ generated?: number; created?: number; note?: string }>("/generation/text", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generateNewText(
  brand_id = "neuroflow-ai",
  platform?: "facebook" | "instagram" | "linkedin",
  content_type: "text" | "image" | "video" = "text"
) {
  return generateTextDrafts({ brand_id, mode: "new", platform, content_type });
}

export function regenerateRejectedText(
  brand_id = "neuroflow-ai",
  platform?: "facebook" | "instagram" | "linkedin",
  content_type: "text" | "image" | "video" = "text"
) {
  return generateTextDrafts({ brand_id, mode: "rejected", platform, content_type });
}

export function generateTextForSelected(
  ids: string[],
  brand_id = "neuroflow-ai",
  platform?: "facebook" | "instagram" | "linkedin",
  content_type: "text" | "image" | "video" = "text"
) {
  return generateTextDrafts({ brand_id, content_item_ids: ids, platform, content_type });
}

export function getOverviewStats() {
  return api<OverviewStats>("/stats/overview");
}
