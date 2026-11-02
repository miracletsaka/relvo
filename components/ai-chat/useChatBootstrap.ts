"use client";

import { useEffect, useState } from "react";
import { Brand, listBrands, getBrandProfile, type BrandProfile } from "@/lib/api";
import type { Tone } from "@/lib/types";
import { apiFetch } from "@/lib/tone";
import { fetchOrgCampaignData, type OrgCampaignData } from "@/lib/org-campaign-enricher";
import { createThread, listThreads, getMessages } from "@/lib/ai-chat-api";
import { dbMessageToChatMessage } from "@/lib/ai-chat-mappers";
import type { ChatMessage, ChatThread } from "./types";

export type CurrentUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  org_id: string | null;
  role: string | null;
  is_email_verified: boolean;
};

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function useChatBootstrap() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [tones, setTones] = useState<Tone[]>([]);
  const [orgData, setOrgData] = useState<OrgCampaignData | null>(null);
  const [brandId, setBrandId] = useState("");
  const [toneId, setToneId] = useState("");
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // One sequential load: user/brands/tones first, then the thread (so a new
  // thread is created with the real brand and tone, not empty ones).
  useEffect(() => {
    (async () => {
      try {
        const [user, brandRows, toneRows, org] = await Promise.all([
          apiFetch<CurrentUser>("/auth/me"),
          listBrands(true).catch(() => []),
          apiFetch<Tone[]>("/tones?active_only=false").catch(() => []),
          fetchOrgCampaignData().catch(() => null),
        ]);

        const brandList = asArray<Brand>(brandRows);
        const toneList = asArray<Tone>(toneRows);
        setCurrentUser(user);
        setBrands(brandList);
        setTones(toneList);
        setOrgData(org);

        const threadList = asArray<ChatThread>(await listThreads());
        let thread: ChatThread | undefined = threadList[0];
        const nextBrand = thread?.brand_id || brandList[0]?.id || "";
        const nextTone = thread?.tone_id || toneList[0]?.id || "";

        if (!thread) {
          thread = await createThread({
            title: "New marketing chat",
            brand_id: nextBrand || null,
            tone_id: nextTone || null,
          });
          threadList.unshift(thread);
        }

        setThreads(threadList);
        setSelectedThreadId(thread.id);
        setBrandId(nextBrand);
        setToneId(nextTone);

        const rows = asArray<any>(await getMessages(thread.id));
        setMessages(rows.map(dbMessageToChatMessage));
      } catch (err) {
        console.error("[ai-chat] bootstrap failed", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!brandId) return;
    getBrandProfile(brandId)
      .then(setBrandProfile)
      .catch(() => setBrandProfile(null));
  }, [brandId]);

  return {
    currentUser, brands, tones, orgData, brandProfile,
    brandId, setBrandId, toneId, setToneId,
    threads, setThreads, selectedThreadId, setSelectedThreadId,
    messages, setMessages,
  };
}
