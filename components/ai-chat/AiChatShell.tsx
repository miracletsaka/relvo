"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import {
  createThread, listThreads, getMessages, replyToThread, updateMessage, updateThread,
} from "@/lib/ai-chat-api";
import { dbMessageToChatMessage } from "@/lib/ai-chat-mappers";
import { generateMonthFromAssistant } from "@/lib/ai-chat-generation";
import { runCampaign } from "@/lib/campaign-flow";
import { looksOutbound, detectIntent, searchBusinesses } from "@/lib/outbound-api";
import AiChatFullEditorDialog from "./AiChatFullEditorDialog";
import AiChatSidebar from "./AiChatSidebar";
import AiChatMessages from "./AiChatMessages";
import AiChatComposer from "./AiChatComposer";
import AiChatEditSidebar from "./AiChatEditSidebar";
import type { ChatMessage, ChatThread } from "./types";
import { useChatBootstrap } from "./useChatBootstrap";
import { useVoiceInput } from "./useVoiceInput";
import { uid, copyCaption, downloadCanvas, findPromptFor } from "@/lib/chat-utils";

// Questions go to chat. Only "make me an ad"-style requests go to the campaign flow.
const isCampaignRequest = (t: string) =>
  !/^\s*(how|what|why|explain|can|does)\b/i.test(t) &&
  /\b(generate|create|design|make|write)\b[^?]*\b(ads?|posters?|flyers?|campaigns?|posts?|images?)\b/i.test(t);

// Saves a runCampaign result in the metadata shape the full editor already uses.
const campaignMetadata = (c: any, topic: string) => ({
  generation_prompt: topic,
  campaign_data: c.campaignData,
  shapes: c.shapes,
  background_image: c.backgroundImage ?? null,
  canvas_width: c.canvasWidth,
  canvas_height: c.canvasHeight,
});

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

  // Used by the Facebook schedule panel and as brand context for campaign prompts
  const businessContext = useMemo(
    () =>
      [(selectedBrand as any)?.name, (brandProfile as any)?.description]
        .filter(Boolean)
        .join(". "),
    [selectedBrand, brandProfile],
  );

  const campaignPrompt = (topic: string) =>
    businessContext ? `${topic}\n\nBusiness: ${businessContext}` : topic;

  // ── Voice input ──
  // Transcripts are cumulative, so each update replaces the text after what was already typed.
  const voiceBase = useRef("");
  const voice = useVoiceInput((text) => {
    const base = voiceBase.current.replace(/\s+$/, "");
    setPrompt(base ? `${base} ${text}` : text);
  });
  const toggleMic = () => {
    if (voice.listening) return voice.stop();
    voiceBase.current = prompt;
    void voice.start();
  };

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

  // Shared args for the month generator
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
      } catch (e: any) {
        console.error("[outbound] intent failed:", e);
        appendMessage({ id: uid("user"), role: "user", text: topic });
        systemError(`Call feature error: ${e?.message || "intent check failed"}`);
        setPrompt("");
        return true;
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
    voice.cancel(); // stop the mic so a late transcript can't refill the input
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
      } else if (saved.message_type === "generate_image" || isCampaignRequest(topic)) {
        setProgressText("Designing your campaign…");
        const c: any = await runCampaign(campaignPrompt(topic), "");
        const metadata = campaignMetadata(c, topic);
        const updated = await updateMessage(saved.id, {
          content: c.message || "Generated campaign image.",
          message_type: "generated_image",
          metadata,
          ...(c.draft?.id ? { draft_id: c.draft.id } : {}),
        });
        patchMessage(saved.id, {
          id: updated.id, text: updated.content, status: "ready",
          messageType: "generated_image", metadata,
          draft: c.draft, campaignData: c.campaignData, shapes: c.shapes,
          canvasWidth: c.canvasWidth, canvasHeight: c.canvasHeight,
          backgroundImage: c.backgroundImage ?? null,
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
      const c: any = await runCampaign(campaignPrompt(topic), "");
      const metadata = campaignMetadata(c, topic);
      patchMessage(messageId, {
        draft: c.draft, campaignData: c.campaignData, shapes: c.shapes,
        canvasWidth: c.canvasWidth, canvasHeight: c.canvasHeight,
        backgroundImage: c.backgroundImage ?? null, metadata,
      });
      // Keep the new design after a page reload
      updateMessage(messageId, {
        metadata, ...(c.draft?.id ? { draft_id: c.draft.id } : {}),
      }).catch(() => {});
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
            {voice.error && (
              <div className="px-4 pt-2 text-xs text-red-500">{voice.error}</div>
            )}
            {(voice.listening || voice.finishing) && (
              <div className="px-4 pt-2 text-xs text-violet-600">
                {voice.listening ? "Listening… tap the square to finish." : "Finishing transcript…"}
              </div>
            )}
            <div className="flex items-center gap-2 pr-4">
              <div className="min-w-0 flex-1">
                <AiChatComposer
                  prompt={prompt}
                  running={running}
                  onPromptChange={setPrompt}
                  onSend={sendMessage}
                />
              </div>
              {voice.supported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={running || voice.connecting || voice.finishing}
                  title={voice.listening ? "Stop and transcribe" : "Speak instead of typing"}
                  aria-label={voice.listening ? "Stop recording" : "Start voice input"}
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition disabled:opacity-50 ${
                    voice.listening
                      ? "animate-pulse border-red-200 bg-red-500 text-white"
                      : "border-black/5 bg-white text-gray-500 hover:text-violet-700"
                  }`}
                >
                  {voice.connecting || voice.finishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : voice.listening ? (
                    <Square size={14} fill="currentColor" />
                  ) : (
                    <Mic size={16} />
                  )}
                </button>
              )}
            </div>
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