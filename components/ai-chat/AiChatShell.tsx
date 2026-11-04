"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createThread, listThreads, getMessages, replyToThread, updateMessage, updateThread,
} from "@/lib/ai-chat-api";
import { dbMessageToChatMessage } from "@/lib/ai-chat-mappers";
import { generateSingleImageFromAssistant, generateMonthFromAssistant } from "@/lib/ai-chat-generation";
import { looksOutbound, detectIntent, searchBusinesses } from "@/lib/outbound-api";
import AiChatFullEditorDialog from "./AiChatFullEditorDialog";
import AiChatSidebar from "./AiChatSidebar";
import AiChatMessages from "./AiChatMessages";
import AiChatComposer from "./AiChatComposer";
import AiChatEditSidebar from "./AiChatEditSidebar";
import type { ChatMessage, ChatThread } from "./types";
import { useChatBootstrap } from "./useChatBootstrap";
import { uid, copyCaption, downloadCanvas, findPromptFor } from "@/lib/chat-utils";

export default function AiChatShell() {
  const endRef = useRef<HTMLDivElement | null>(null);
  const {
    currentUser, brands, tones, orgData, brandProfile,
    brandId, setBrandId, toneId, setToneId,
    threads, setThreads, selectedThreadId, setSelectedThreadId,
    messages, setMessages,
  } = useChatBootstrap();

  const [prompt, setPrompt] = useState("");
  const [progressText, setProgressText] = useState("");
  const [running, setRunning] = useState(false);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [fullEditorId, setFullEditorId] = useState<string | null>(null);

  const selectedBrand = useMemo(() => brands.find((b) => b.id === brandId) || null, [brands, brandId]);
  const selectedTone = useMemo(() => tones.find((t) => t.id === toneId) || null, [tones, toneId]);
  const activeEditMessage = useMemo(() => messages.find((m) => m.id === activeEditId) || null, [messages, activeEditId]);
  const fullEditorMessage = useMemo(() => messages.find((m) => m.id === fullEditorId) || null, [messages, fullEditorId]);

  // Used by the Facebook schedule panel so the AI can pick a good posting time
  const businessContext = useMemo(
    () =>
      [(selectedBrand as any)?.name, (brandProfile as any)?.description]
        .filter(Boolean)
        .join(". "),
    [selectedBrand, brandProfile],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, progressText, running]);

  // ── Message helpers ──
  const appendMessage = (msg: ChatMessage) => setMessages((p) => [...p, msg]);
  const patchMessage = (id: string, patch: Partial<ChatMessage>) =>
    setMessages((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const systemError = (text: string) =>
    appendMessage({ id: uid("system"), role: "system", text, status: "error" });
  const reloadThreads = () =>
    listThreads().then((r) => setThreads(Array.isArray(r) ? r : [])).catch(() => {});

  // Shared args for the generator
  const genArgs = (topic: string, savedAssistant: any) => ({
    topic, savedAssistant, brandId, toneId, brandProfile, orgData, setProgressText,
  });

  // ── Threads ──
  const handleNewChat = async () => {
    const thread = await createThread({
      title: "New marketing chat", brand_id: brandId || null, tone_id: toneId || null,
    });
    setSelectedThreadId(thread.id);
    setThreads((p) => [thread, ...p]);
    setMessages([]);
    setActiveEditId(null);
    setSelectedShapeId(null);
  };

  const handleOpenThread = async (thread: ChatThread) => {
    setSelectedThreadId(thread.id);
    if (thread.brand_id) setBrandId(thread.brand_id);
    if (thread.tone_id) setToneId(thread.tone_id);
    const rows = await getMessages(thread.id);
    setMessages(Array.isArray(rows) ? rows.map(dbMessageToChatMessage) : []);
  };

  const handleBrandChange = async (next: string) => {
    setBrandId(next);
    if (!selectedThreadId) return;
    const updated = await updateThread(selectedThreadId, { brand_id: next, tone_id: toneId || null });
    setThreads((p) => p.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
  };

  // ── Shape editing ──
  const patchMessageShapes = (messageId: string, updater: (prev: any[]) => any[]) =>
    setMessages((p) =>
      p.map((m) => {
        if (m.id !== messageId) return m;
        const shapes = updater(m.shapes || []);
        return { ...m, shapes, metadata: { ...(m.metadata || {}), shapes } };
      }),
    );

  const patchSelectedShape = (patch: any) => {
    if (!activeEditId || !selectedShapeId) return;
    patchMessageShapes(activeEditId, (prev) =>
      prev.map((s: any) => (s.id === selectedShapeId ? { ...s, ...patch } : s)),
    );
  };

  // ── Outbound calls ──
  // Returns true when the message was handled as an outbound-call request.
  const tryOutbound = async (topic: string): Promise<boolean> => {
    if (!looksOutbound(topic)) return false;

    setRunning(true);
    try {
      let intent;
      try {
        intent = await detectIntent(topic);
      } catch {
        return false; // fall back to the normal chat flow
      }
      if (intent.intent === "none") return false;

      setPrompt("");
      appendMessage({ id: uid("user"), role: "user", text: topic });
      const botId = uid("assistant");
      appendMessage({ id: botId, role: "assistant", text: "Working on it…", status: "generating" });
      const done = (patch: any) => patchMessage(botId, { status: "ready", ...patch });

      if (!intent.ready) {
        done({ text: "Your voice agent isn't set up yet. [Open settings](/dashboard/settings/voice-agent)" });
        return true;
      }
      try {
        if (intent.intent === "call_number") {
          const leads = (intent.phones || []).map((phone) => ({ name: "Direct call", phone }));
          done({
            text: "Ready to call. Confirm below.",
            metadata: { outbound: { leads, testMode: intent.test_mode, notes: intent.notes || "" } },
          });
        } else {
          const found = await searchBusinesses({
            business_type: intent.business_type || "",
            city: intent.city || "",
            count: intent.count || 5,
          });
          done(
            found.leads.length
              ? {
                  text: found.matched
                    ? `Found ${found.leads.length} registered businesses. Choose who to call:`
                    : `No exact match, so here are ${found.leads.length} registered businesses. Choose who to call:`,
                  metadata: {
                    outbound: { leads: found.leads, testMode: found.test_mode, notes: intent.notes || "" },
                  },
                }
              : { text: "No registered businesses with a phone number were found yet." },
          );
        }
      } catch (e: any) {
        done({ text: e?.message || "Search failed.", status: "error" });
      }
      return true;
    } finally {
      setRunning(false);
    }
  };

  // ── Send ──
  const sendMessage = async (overrideText?: string) => {
    const topic = String(typeof overrideText === "string" ? overrideText : prompt).trim();
    if (!topic || running) return;
    if (await tryOutbound(topic)) return;
    if (!brandId) return systemError("Please select a brand first.");
    if (!selectedThreadId) return systemError("Chat thread is not ready yet.");

    setPrompt("");
    setRunning(true);
    setProgressText("");

    const userTempId = uid("user");
    const botTempId = uid("assistant");
    appendMessage({ id: userTempId, role: "user", text: topic });
    appendMessage({ id: botTempId, role: "assistant", text: "Thinking…", status: "generating" });

    try {
      const reply = await replyToThread(selectedThreadId, {
        content: topic, brand_id: brandId, tone_id: toneId || null,
      });
      const savedUser = reply.user_message;
      const saved = reply.assistant_message;

      patchMessage(userTempId, { id: savedUser.id, text: savedUser.content, status: "ready" });
      patchMessage(botTempId, {
        id: saved.id, text: saved.content, status: "ready",
        messageType: saved.message_type, metadata: saved.metadata || {},
      });

      if (saved.message_type === "generate_month_content") {
        const result = await generateMonthFromAssistant(genArgs(topic, saved));
        const updated = await updateMessage(saved.id, {
          content: `Generated ${result.items.length} monthly posts. Open the planner to review them.`,
          message_type: "generated_month",
          metadata: result.metadata,
        });
        patchMessage(saved.id, {
          id: updated.id, text: updated.content, status: "ready",
          messageType: "generated_month", metadata: result.metadata,
        });
      } else if (saved.message_type === "generate_image") {
        const result = await generateSingleImageFromAssistant(genArgs(topic, saved));
        const updated = await updateMessage(saved.id, {
          content: "Generated campaign image.",
          message_type: "generated_image",
          metadata: result.metadata,
          draft_id: result.draft.id,
        });
        patchMessage(saved.id, {
          id: updated.id, text: updated.content, status: "ready",
          messageType: "generated_image", metadata: result.metadata,
          draft: result.draft, campaignData: result.campaignData, shapes: result.shapes,
          canvasWidth: result.canvasWidth, canvasHeight: result.canvasHeight,
          backgroundImage: result.backgroundImage, topicChatId: result.topicChatId,
        });
      }
      await reloadThreads();
    } catch (err: any) {
      console.error(err);
      patchMessage(botTempId, { text: err?.message || "Something went wrong.", status: "error" });
    } finally {
      setProgressText("");
      setRunning(false);
    }
  };

  // ── Regenerate (one handler for both buttons) ──
  const handleRegenerate = async (messageId: string) => {
    const topic = findPromptFor(messages, messageId);
    if (!topic || running) return;

    setRunning(true);
    setProgressText("Regenerating campaign…");
    try {
      const rebuilt = await generateSingleImageFromAssistant(
        genArgs(topic, { metadata: { generation_prompt: topic } }),
      );
      patchMessage(messageId, {
        draft: rebuilt.draft, campaignData: rebuilt.campaignData, shapes: rebuilt.shapes,
        canvasWidth: rebuilt.canvasWidth, canvasHeight: rebuilt.canvasHeight,
        backgroundImage: rebuilt.backgroundImage, metadata: rebuilt.metadata,
      });
      // Keep the new design after a page reload
      updateMessage(messageId, { metadata: rebuilt.metadata, draft_id: rebuilt.draft.id }).catch(() => {});
    } catch (err) {
      console.error(err);
      systemError("Could not regenerate this image. Please try again.");
    } finally {
      setRunning(false);
      setProgressText("");
    }
  };

  // ── Render ──
  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f4f4f6]">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");
        html, body { background: #f4f4f6; }
        html, body, * { font-family: "Inter", sans-serif; }
      `}</style>

      <AiChatSidebar
        threads={threads}
        selectedThreadId={selectedThreadId}
        brands={brands}
        currentUser={currentUser}
        brandId={brandId}
        selectedBrand={selectedBrand}
        selectedTone={selectedTone}
        orgData={orgData}
        running={running}
        onNewChat={handleNewChat}
        onOpenThread={handleOpenThread}
        onBrandChange={handleBrandChange}
      />

      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f4f4f6]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(124,85,246,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(124,85,246,0.025) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden pt-20 lg:pt-0">
          <AiChatMessages
            messages={messages}
            running={running}
            progressText={progressText}
            endRef={endRef}
            businessContext={businessContext}
            onRegenerateMessage={handleRegenerate}
            onRegenerateMessageImage={handleRegenerate}
            onOpenFullEditor={setFullEditorId}
            onDownloadMessageImage={downloadCanvas}
            onCopyMessageCaption={(id: string) => copyCaption(messages.find((m) => m.id === id))}
            onPromptClick={(p: string) => void sendMessage(p)}
            activeEditableMessageId={activeEditId}
            selectedShapeId={selectedShapeId}
            onStartEditing={(id: string) => {
              setActiveEditId(id);
              setSelectedShapeId(null);
            }}
            onSelectShape={setSelectedShapeId}
            onPatchMessageShapes={patchMessageShapes}
          />

          <div className="relative z-20 border-t border-black/5 bg-white/60 backdrop-blur-xl">
            <AiChatComposer
              prompt={prompt}
              running={running}
              onPromptChange={setPrompt}
              onSend={sendMessage}
            />
          </div>
        </div>
      </section>

      {activeEditId && (
        <aside className="hidden h-screen w-[340px] flex-shrink-0 border-l border-black/5 bg-[#f4f4f6]/95 backdrop-blur-3xl xl:flex">
          <AiChatEditSidebar
            message={activeEditMessage}
            selectedShapeId={selectedShapeId}
            onSelectShape={setSelectedShapeId}
            onPatchShape={patchSelectedShape}
            onClose={() => {
              setActiveEditId(null);
              setSelectedShapeId(null);
            }}
          />
        </aside>
      )}

      {fullEditorMessage?.campaignData && fullEditorMessage?.shapes?.length ? (
        <AiChatFullEditorDialog
          open={!!fullEditorId}
          onOpenChange={(open) => !open && setFullEditorId(null)}
          campaignData={fullEditorMessage.campaignData}
          shapes={fullEditorMessage.shapes}
          backgroundImage={fullEditorMessage.backgroundImage || null}
          canvasWidth={fullEditorMessage.canvasWidth || 1080}
          canvasHeight={fullEditorMessage.canvasHeight || 1350}
          onSave={(p) => {
            const m = fullEditorMessage;
            const bg = p.backgroundImage || null;
            const w = p.canvasWidth || m.canvasWidth;
            const h = p.canvasHeight || m.canvasHeight;
            patchMessage(m.id, {
              campaignData: p.campaignData, shapes: p.shapes, backgroundImage: bg,
              canvasWidth: w, canvasHeight: h,
              metadata: {
                ...(m.metadata || {}),
                campaign_data: p.campaignData, shapes: p.shapes,
                background_image: bg, canvas_width: w, canvas_height: h,
              },
            });
          }}
        />
      ) : null}
    </main>
  );
}