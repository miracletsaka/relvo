import { apiFetch } from "@/lib/tone";

export type SocialAccount = { id: string; page_id: string; page_name: string; is_selected: boolean };
export type Suggestion = { post_at_unix: number; post_at_local: string; reason: string };
export type ScheduledPost = {
  id: string;
  caption: string;
  post_at: string;
  status: string;
  reason: string | null;
  page_name: string;
};

const json = (method: string, body?: unknown) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

// Uses your existing /facebook/status endpoint
export async function listAccounts(): Promise<SocialAccount[]> {
  const s = await apiFetch<{
    connected: boolean;
    pages: { id: string; facebook_page_id: string; name: string; is_selected: boolean }[];
  }>("/facebook/status");
  return (s.pages || []).map((p) => ({
    id: p.id,
    page_id: p.facebook_page_id,
    page_name: p.name,
    is_selected: p.is_selected,
  }));
}

export const suggestTime = (body: { context: string; caption: string; timezone?: string }) =>
  apiFetch<Suggestion>("/social/suggest-time", json("POST", body));

export const schedulePost = (body: {
  account_id: string;
  image_base64: string;
  caption: string;
  post_at_unix: number;
  reason?: string | null;
}) => apiFetch<{ id: string; fb_post_id: string; post_at: string }>("/social/schedule", json("POST", body));

export const listScheduled = () => apiFetch<ScheduledPost[]>("/social/scheduled");

export const cancelScheduled = (id: string) =>
  apiFetch<{ ok: boolean }>(`/social/scheduled/${id}`, json("DELETE"));