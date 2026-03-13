// app/studio/[chatId]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ProjectStudio from "@/components/ProjectStudio";
import { getTopicChat, listTopicChatDrafts } from "@/lib/api";

function normStatus(s: any) {
  return String(s || "").toUpperCase().trim();
}

function hasVideo(d: any) {
  const mediaType = String(d?.media_type || "").toLowerCase().trim();
  const mediaUrl = String(d?.media_url || "").toLowerCase().trim();

  if (mediaType === "video") return true;
  if (mediaUrl.endsWith(".mp4") || mediaUrl.includes("video")) return true;

  if (Array.isArray(d?.media_urls)) {
    return d.media_urls.some((u: any) => String(u || "").toLowerCase().includes(".mp4"));
  }

  return false;
}

function pickRandom<T>(arr: T[]): T | null {
  if (!arr?.length) return null;
  const i = Math.floor(Math.random() * arr.length);
  return arr[i] ?? null;
}

function buildVideoConceptFromDraft(draft: any, chat: any) {
  const s = draft?.structured || {};

  return [
    `Create a short, premium marketing video for ${s.companyName || chat?.brand_id || "this business"}.`,
    chat?.topic ? `Campaign topic: ${chat.topic}` : "",
    s.hook ? `Hook: ${s.hook}` : "",
    s.subheading ? `Subheading: ${s.subheading}` : "",
    draft?.body_text ? `Main message: ${draft.body_text}` : "",
    Array.isArray(s?.bullets) && s.bullets.length ? `Key points: ${s.bullets.join(", ")}` : "",
    s.proof ? `Proof: ${s.proof}` : "",
    s.cta ? `Call to action: ${s.cta}` : "",
    draft?.hashtags ? `Style/theme keywords: ${draft.hashtags}` : "",
    `Make it suitable for social media, fast paced, visually strong, and conversion focused.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function ChatStudioPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const chatId = String((params as any)?.chatId || "");
  const requestedDraftId = searchParams.get("draftId");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [chat, setChat] = useState<any | null>(null);
  const [draft, setDraft] = useState<any | null>(null);

  useEffect(() => {
    if (!chatId) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setErr(null);

      try {
        const c = await getTopicChat(chatId);
        const ds = await listTopicChatDrafts(chatId);

        if (cancelled) return;

        const drafts = Array.isArray(ds) ? ds : [];

        let chosen: any | null = null;

        if (requestedDraftId) {
          chosen = drafts.find((d: any) => String(d.id) === String(requestedDraftId)) || null;
        }

        if (!chosen) {
          const pendingWithoutVideo = drafts.filter((d: any) => {
            const st = normStatus(d?.status);
            return st === "PENDING_APPROVAL" && !hasVideo(d);
          });

          chosen = pickRandom(pendingWithoutVideo);
        }

        if (!chosen) {
          const anyWithoutVideo = drafts.filter((d: any) => !hasVideo(d));
          chosen = pickRandom(anyWithoutVideo);
        }

        if (!chosen) {
          throw new Error("No usable draft found for video generation.");
        }

        setChat(c);
        setDraft(chosen);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load chat studio");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [chatId, requestedDraftId]);

  const initialConcept = useMemo(() => {
    if (!draft || !chat) return "";
    return buildVideoConceptFromDraft(draft, chat);
  }, [draft, chat]);

  const storageKey = useMemo(() => {
    if (!chatId) return "manual";
    return `chat:${chatId}:draft:${draft?.id || "auto"}`;
  }, [chatId, draft?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-sm opacity-80">Preparing video studio…</div>
      </div>
    );
  }

  if (err || !chat || !draft) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-xl w-full border border-white/10 rounded-xl p-6 bg-white/5">
          <div className="text-xl font-bold mb-2">Cannot open studio</div>
          <div className="text-sm opacity-80">{err || "Missing chat or draft."}</div>
        </div>
      </div>
    );
  }

  return (
    <ProjectStudio
      chatId={chatId}
      draftId={String(draft.id)}
      initialConcept={initialConcept}
      autoGenerateOnMount
      brandId={chat.brand_id}
      storageKey={storageKey}
      companyName={draft?.structured?.companyName || chat?.brand_id || "NeuroFlow"}
      accentColor="#7c3aed"
    />
  );
}