"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Brand, listBrands, getBrandProfile, type BrandProfile } from "@/lib/api";
import { Tone } from "@/lib/types";
import { apiFetch } from "@/lib/tone";
import { fetchOrgCampaignData, type OrgCampaignData } from "@/lib/org-campaign-enricher";
import { createThread, listThreads, getMessages, replyToThread, updateMessage, updateThread } from "@/lib/ai-chat-api";
import { dbMessageToChatMessage } from "@/lib/ai-chat-mappers";
import { generateSingleImageFromAssistant, generateMonthFromAssistant } from "@/lib/ai-chat-generation";
import AiChatFullEditorDialog from "./AiChatFullEditorDialog";
import AiChatSidebar from "./AiChatSidebar";
import AiChatMessages from "./AiChatMessages";
import AiChatComposer from "./AiChatComposer";
import AiChatEditSidebar from "./AiChatEditSidebar";
import type { ChatMessage, ChatThread } from "./types";
import { composeRandomTemplateFromDb } from "@/lib/compose-random-template";
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

function uid(prefix = "msg") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AiChatShell() {
  const endRef = useRef<HTMLDivElement | null>(null);
  const [prompt, setPrompt] = useState("");
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState("");
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [tones, setTones] = useState<Tone[]>([]);
  const [toneId, setToneId] = useState("");
  const [orgData, setOrgData] = useState<OrgCampaignData | null>(null);
  const [progressText, setProgressText] = useState("");
  const [running, setRunning] = useState(false);
  const [activeEditableMessageId, setActiveEditableMessageId] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [fullEditorMessageId, setFullEditorMessageId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const selectedBrand = useMemo(() => brands.find((b) => b.id === brandId) || null, [brands, brandId]);
  const selectedTone = useMemo(() => tones.find((t) => t.id === toneId) || null, [tones, toneId]);
  const activeEditableMessage = useMemo(() => messages.find((m) => m.id === activeEditableMessageId) || null, [messages, activeEditableMessageId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, progressText, running]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [brandRows, toneRows, org] = await Promise.all([
          listBrands(true),
          apiFetch<Tone[]>("/tones?active_only=false").catch(() => []),
          fetchOrgCampaignData().catch(() => null),
        ]);
        setBrands(Array.isArray(brandRows) ? brandRows : []);
        setTones(Array.isArray(toneRows) ? toneRows : []);
        setOrgData(org);
        if (Array.isArray(brandRows) && brandRows.length > 0) setBrandId((prev) => prev || brandRows[0].id);
        if (Array.isArray(toneRows) && toneRows.length > 0) setToneId((prev) => prev || toneRows[0].id);
      } catch (err) {
        console.error("[ai-chat] initial data load failed", err);
      }
    }
    void loadInitialData();
  }, []);

  useEffect(() => {
    async function loadOrCreateThread() {
      try {
        const rows = await listThreads();
        setThreads(Array.isArray(rows) ? rows : []);
        let threadId: string | null = null;
        const first = Array.isArray(rows) ? rows[0] : null;
        if (first?.id) {
          threadId = first.id;
          setSelectedThreadId(first.id);
          if (first.brand_id) setBrandId(first.brand_id);
          if (first.tone_id) setToneId(first.tone_id);
        } else {
          const thread = await createThread({ title: "New marketing chat", brand_id: brandId || null, tone_id: toneId || null });
          threadId = thread.id;
          setSelectedThreadId(thread.id);
          setThreads([thread]);
        }
        if (threadId) {
          const messageRows = await getMessages(threadId);
          if (Array.isArray(messageRows) && messageRows.length > 0) setMessages(messageRows.map(dbMessageToChatMessage));
        }
      } catch (err) {
        console.error("[ai-chat] thread load/create failed", err);
      }
    }
    void loadOrCreateThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!brandId) return;
    getBrandProfile(brandId).then(setBrandProfile).catch(() => setBrandProfile(null));
  }, [brandId]);

  const fullEditorMessage = useMemo(
    () => messages.find((m) => m.id === fullEditorMessageId) || null,
    [messages, fullEditorMessageId],
  );

  function getCaptionFromMessage(message: any) {
  const draft = message.draft;
  return [
    draft?.body_text,
    draft?.hashtags,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function copyMessageCaption(messageId: string) {
  const message = messages.find((m) => m.id === messageId);
  if (!message) return;

  const caption = getCaptionFromMessage(message);
  await navigator.clipboard.writeText(caption || message.text || "");
}

function downloadMessageImage(messageId: string) {
  const root = document.querySelector(`[data-message-canvas="${messageId}"]`);
  const canvas = root?.querySelector("canvas");

  if (!canvas) return;

  const link = document.createElement("a");
  link.href = (canvas as HTMLCanvasElement).toDataURL("image/png", 1);
  link.download = `relvo-campaign-${Date.now()}.png`;
  link.click();
}

async function regenerateMessageImage(messageId: string) {
  const message = messages.find((m) => m.id === messageId);

  if (!message?.campaignData) return;

  try {
    const composed = await composeRandomTemplateFromDb(
      TEMPLATE_FAMILY,
      DEFAULT_SECTIONS,
    );

    const rawShapes =
      composed?.shapes ||
      composed?.template_shapes ||
      composed?.layout?.shapes ||
      [];

    const improvedShapes = improveCampaignDesignShapes(
      rawShapes,
      message.campaignData,
    );

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              shapes: improvedShapes,
              canvasWidth: Number(composed?.canvasWidth || composed?.canvas_width || m.canvasWidth),
              canvasHeight: Number(composed?.canvasHeight || composed?.canvas_height || m.canvasHeight),
              backgroundImage: composed?.backgroundImage || m.backgroundImage || null,
            }
          : m,
      ),
    );
  } catch (err) {
    console.error(err);
    appendMessage({
      id: uid("system"),
      role: "system",
      text: "Could not regenerate this image. Please try again.",
      status: "error",
    });
  }
}

  const appendMessage = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);
  const patchMessage = (id: string, patch: Partial<ChatMessage>) =>
    setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, ...patch } : msg)));
  const reloadThreads = async () => {
    const rows = await listThreads();
    setThreads(Array.isArray(rows) ? rows : []);
  };

  const handleNewChat = async () => {
    const thread = await createThread({ title: "New marketing chat", brand_id: brandId || null, tone_id: toneId || null });
    setSelectedThreadId(thread.id);
    setThreads((prev) => [thread, ...prev]);
   
    setActiveEditableMessageId(null);
    setSelectedShapeId(null);
  };

  const handleOpenThread = async (thread: ChatThread) => {
    setSelectedThreadId(thread.id);
    if (thread.brand_id) setBrandId(thread.brand_id);
    if (thread.tone_id) setToneId(thread.tone_id);
    const rows = await getMessages(thread.id);
    setMessages(Array.isArray(rows) && rows.length > 0 ? rows.map(dbMessageToChatMessage) : []);
  };

  const handleBrandChange = async (nextBrandId: string) => {
    setBrandId(nextBrandId);
    if (selectedThreadId) {
      const updated = await updateThread(selectedThreadId, { brand_id: nextBrandId, tone_id: toneId || null });
      setThreads((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    }
  };

  const patchActiveMessageShapes = (messageId: string, updater: (prev: any[]) => any[]) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const nextShapes = updater(msg.shapes || []);
        return { ...msg, shapes: nextShapes, metadata: { ...(msg.metadata || {}), shapes: nextShapes } };
      }),
    );
  };

  const patchSelectedShape = (patch: any) => {
    if (!activeEditableMessageId || !selectedShapeId) return;
    patchActiveMessageShapes(activeEditableMessageId, (prev) =>
      prev.map((shape: any) => (shape.id === selectedShapeId ? { ...shape, ...patch } : shape)),
    );
  };

  const sendMessage = async (overrideText?: string) => {
    const topic =
    typeof overrideText === "string"
      ? overrideText.trim()
      : String(prompt || "").trim();
    if (!topic || running) return;
    if (!brandId) return appendMessage({ id: uid("system"), role: "system", text: "Please select a brand first.", status: "error" });
    if (!selectedThreadId) return appendMessage({ id: uid("system"), role: "system", text: "Chat thread is not ready yet.", status: "error" });

    setPrompt("");
    setRunning(true);
    setProgressText("");
    const optimisticUserId = uid("user");
    const optimisticAssistantId = uid("assistant");
    appendMessage({ id: optimisticUserId, role: "user", text: topic });
    appendMessage({ id: optimisticAssistantId, role: "assistant", text: "Thinking…", status: "generating" });

    try {
      const replyData = await replyToThread(selectedThreadId, { content: topic, brand_id: brandId, tone_id: toneId || null });
      const savedUser = replyData.user_message;
      const savedAssistant = replyData.assistant_message;
      patchMessage(optimisticUserId, { id: savedUser.id, text: savedUser.content, status: "ready" });
      patchMessage(optimisticAssistantId, { id: savedAssistant.id, text: savedAssistant.content, status: "ready", messageType: savedAssistant.message_type, metadata: savedAssistant.metadata || {} });

      if (savedAssistant.message_type !== "generate_image" && savedAssistant.message_type !== "generate_month_content") {
        await reloadThreads().catch(() => {});
        return;
      }

      if (savedAssistant.message_type === "generate_month_content") {
        const result = await generateMonthFromAssistant({ topic, savedAssistant, brandId, toneId, brandProfile, orgData, setProgressText });
        const updatedAssistant = await updateMessage(savedAssistant.id, {
          content: `Generated ${result.items.length} monthly posts. Open the planner to review them.`,
          message_type: "generated_month",
          metadata: result.metadata,
        });
        patchMessage(savedAssistant.id, { id: updatedAssistant.id, text: updatedAssistant.content, status: "ready", messageType: "generated_month", metadata: result.metadata });
        await reloadThreads().catch(() => {});
        return;
      }

      const result = await generateSingleImageFromAssistant({ topic, savedAssistant, brandId, toneId, brandProfile, orgData, setProgressText });
      const updatedAssistant = await updateMessage(savedAssistant.id, {
        content: "Generated campaign image.",
        message_type: "generated_image",
        metadata: result.metadata,
        draft_id: result.draft.id,
      });
      patchMessage(savedAssistant.id, {
        id: updatedAssistant.id,
        text: updatedAssistant.content,
        status: "ready",
        messageType: "generated_image",
        metadata: result.metadata,
        draft: result.draft,
        campaignData: result.campaignData,
        shapes: result.shapes,
        canvasWidth: result.canvasWidth,
        canvasHeight: result.canvasHeight,
        backgroundImage: result.backgroundImage,
        topicChatId: result.topicChatId,
      });
      await reloadThreads().catch(() => {});
    } catch (err: any) {
      console.error(err);
      patchMessage(optimisticAssistantId, { text: err?.message || "Something went wrong.", status: "error" });
    } finally {
      setProgressText("");
      setRunning(false);
    }
  };

  const handleRegenerateMessage = async (messageId: string) => {
    const target = messages.find((m) => m.id === messageId);
    if (!target) return;
    try {
      setRunning(true);
      setProgressText("Regenerating campaign…");
      const generationPrompt = target.metadata?.generation_prompt || target.text;
      const rebuilt = await generateSingleImageFromAssistant({
        topic: generationPrompt,
        savedAssistant: { metadata: { generation_prompt: generationPrompt } } as any,
        brandId: selectedBrand?.id || "",
        toneId: selectedTone?.id || "",
        brandProfile,
        orgData,
        setProgressText,
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, draft: rebuilt.draft, campaignData: rebuilt.campaignData, shapes: rebuilt.shapes, canvasWidth: rebuilt.canvasWidth, canvasHeight: rebuilt.canvasHeight, backgroundImage: rebuilt.backgroundImage, metadata: rebuilt.metadata }
            : msg,
        ),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
      setProgressText("");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .ai-chat-root {
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          background: #f0f0f3;
          display: grid;
        }

        .ai-chat-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #f4f4f6;
          position: relative;
        }

        /* Subtle grid texture on main area */
        .ai-chat-main::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(124, 85, 246, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124, 85, 246, 0.025) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 0;
        }

        .ai-chat-main > * {
          position: relative;
          z-index: 1;
        }

        /* Edit sidebar panel */
        .ai-edit-sidebar-panel {
          height: 100vh;
          background: rgba(244, 244, 246, 0.96);
          backdrop-filter: blur(40px) saturate(200%) brightness(1.04);
          -webkit-backdrop-filter: blur(40px) saturate(200%) brightness(1.04);
          border-left: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow:
            -4px 0 24px rgba(0, 0, 0, 0.05),
            inset 1px 0 0 rgba(255, 255, 255, 0.7);
        }
      `}</style>

      <main
        className="ai-chat-root"
        style={{
          gridTemplateColumns: activeEditableMessageId
            ? "240px minmax(0, 1fr) 320px"
            : "240px minmax(0, 1fr)",
        }}
      >
        <AiChatSidebar
          threads={threads}
          selectedThreadId={selectedThreadId}
          brands={brands}
          brandId={brandId}
          selectedBrand={selectedBrand}
          selectedTone={selectedTone}
          orgData={orgData}
          running={running}
          onNewChat={handleNewChat}
          onOpenThread={handleOpenThread}
          onBrandChange={handleBrandChange}
        />

        <section className="ai-chat-main">
          <AiChatMessages
            onRegenerateMessage={handleRegenerateMessage}
            onOpenFullEditor={setFullEditorMessageId}
            messages={messages}
            running={running}
            onDownloadMessageImage={downloadMessageImage}
            onCopyMessageCaption={copyMessageCaption}
            onRegenerateMessageImage={regenerateMessageImage}
            progressText={progressText}
            onPromptClick={(prompt) => {
              setPrompt(prompt);
              void sendMessage(prompt);
            }}
            activeEditableMessageId={activeEditableMessageId}
            selectedShapeId={selectedShapeId}
            onStartEditing={(id) => { setActiveEditableMessageId(id); setSelectedShapeId(null); }}
            onSelectShape={setSelectedShapeId}
            onPatchMessageShapes={patchActiveMessageShapes}
            endRef={endRef}
          />
          <AiChatComposer
            prompt={prompt}
            running={running}
            onPromptChange={setPrompt}
            onSend={sendMessage}
          />
        </section>

        {activeEditableMessageId && (
          <div className="ai-edit-sidebar-panel">
            <AiChatEditSidebar
              message={activeEditableMessage}
              selectedShapeId={selectedShapeId}
              onSelectShape={setSelectedShapeId}
              onPatchShape={patchSelectedShape}
              onClose={() => { setActiveEditableMessageId(null); setSelectedShapeId(null); }}
            />
          </div>
        )}

        {fullEditorMessage?.campaignData && fullEditorMessage?.shapes?.length ? (
          <AiChatFullEditorDialog
            open={!!fullEditorMessageId}
            onOpenChange={(open) => { if (!open) setFullEditorMessageId(null); }}
            campaignData={fullEditorMessage.campaignData}
            shapes={fullEditorMessage.shapes}
            backgroundImage={fullEditorMessage.backgroundImage || null}
            canvasWidth={fullEditorMessage.canvasWidth || 1080}
            canvasHeight={fullEditorMessage.canvasHeight || 1350}
            onSave={(payload) => {
              patchMessage(fullEditorMessage.id, {
                campaignData: payload.campaignData,
                shapes: payload.shapes,
                backgroundImage: payload.backgroundImage || null,
                canvasWidth: payload.canvasWidth || fullEditorMessage.canvasWidth,
                canvasHeight: payload.canvasHeight || fullEditorMessage.canvasHeight,
                metadata: {
                  ...(fullEditorMessage.metadata || {}),
                  campaign_data: payload.campaignData,
                  shapes: payload.shapes,
                  background_image: payload.backgroundImage || null,
                  canvas_width: payload.canvasWidth || fullEditorMessage.canvasWidth,
                  canvas_height: payload.canvasHeight || fullEditorMessage.canvasHeight,
                },
              });
            }}
          />
        ) : null}
      </main>
    </>
  );
}