"use client";

import { useRef, useState } from "react";
import { Bot, ImagePlus, Loader2, Send, User, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { uploadFileToSpaces } from "@/lib/video-upload-client";
import { runCampaign, chatReply } from "@/lib/campaign-flow";
import CampaignCard from "../CampaignCard";

type PublicMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  prompt?: string;
  campaignData?: any;
  shapes?: any[];
  canvasWidth?: number;
  canvasHeight?: number;
};

const STARTER_PROMPTS = [
  "How can AI help my business get more leads?",
  "How would AI understand my business documents?",
  "How can customer reviews improve marketing?",
  "What kind of business tasks can AI automate?",
];

const EMPTY_STATE_PROMPTS = [
  {
    label: "Understand AI-powered content generation",
    prompt: "Explain how AI can generate branded posts, ads, and marketing content for a business",
  },
  {
    label: "Learn how reviews become social proof",
    prompt: "Explain how customer reviews can become marketing assets and improve trust",
  },
  {
    label: "See how business documents help AI",
    prompt: "How can connecting Google Docs help AI understand a business better?",
  },
  {
    label: "Explore business automation possibilities",
    prompt: "What business workflows and repetitive tasks can AI automate?",
  },
];

// Questions go to chat. Only "make me an ad"-style requests go to the campaign flow.
const isCampaignRequest = (t: string) =>
  !/^\s*(how|what|why|explain|can|does)\b/i.test(t) &&
  /\b(generate|create|design|make|write)\b[^?]*\b(ads?|posters?|flyers?|campaigns?|posts?|images?)\b/i.test(t);

const mdComponents = {
  p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: any) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
  li: ({ children }: any) => <li>{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold text-gray-700">{children}</strong>,
  code: ({ children }: any) => (
    <code className="rounded bg-black/5 px-1 py-0.5 text-[12px] text-gray-700">{children}</code>
  ),
  a: ({ href, children }: any) => (
    <a
      href={href}
      target={href?.startsWith("/") ? "_self" : "_blank"}
      rel="noopener noreferrer"
      className="font-medium text-violet-700 underline underline-offset-2"
    >
      {children}
    </a>
  ),
};

export default function PublicAiLandingChat() {
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [input, setInput] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [hasUploadedFile, setHasUploadedFile] = useState(false);
  const [showImageField, setShowImageField] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollDown = () =>
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    setError("");
    try {
      const url = await uploadFileToSpaces(file);
      setProductImageUrl(url);
      setHasUploadedFile(true);
      setShowImageField(true);
    } catch (e) {
      console.error(e);
      setError("Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function sendMessage(custom?: string) {
    const text = (custom || input).trim();
    if (!text || running) return;

    setInput("");
    setError("");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
    setRunning(true);

    try {
      if (isCampaignRequest(text)) {
        const c = await runCampaign(text, productImageUrl.trim());
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            prompt: text,
            ...c,
            text: `${c.message}\n\n[Sign in to save, edit, or export](/auth/login)`,
          },
        ]);
      } else {
        const reply = await chatReply(text, messages);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", text: reply },
        ]);
      }
      scrollDown();
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  async function regenerate(msg: PublicMessage) {
    if (!msg.prompt || running) return;
    setRunning(true);
    setError("");
    try {
      const c = await runCampaign(msg.prompt, productImageUrl.trim());
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...c } : m)));
    } catch (e: any) {
      setError(e?.message || "Failed to regenerate.");
    } finally {
      setRunning(false);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f4f4f6] font-[Inter,sans-serif] text-gray-700">
      {/* Header */}
      <header className="flex h-[64px] shrink-0 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" style={{ width: 26, height: "auto" }} />
          <h3>Relvo</h3>
        </div>
        <a
          href="/auth/login"
          className="rounded-full border border-black/5 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm transition hover:bg-violet-50 hover:text-violet-700"
        >
          Sign in
        </a>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-6 pt-12 text-center">
            <div className="mb-7 text-[28px] font-medium leading-[1.15] tracking-[-0.03em] text-gray-500">
              What can I{" "}
              <span className="bg-gradient-to-br from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                help
              </span>{" "}
              you build?
            </div>

            <div className="mb-7 flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={running}
                  className="rounded-full border border-black/5 bg-white/70 px-4 py-2 text-xs font-medium text-gray-500 transition-all duration-150 hover:border-violet-200 hover:bg-violet-500/5 hover:text-violet-700"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="flex w-full max-w-[560px] flex-col gap-0.5">
              {EMPTY_STATE_PROMPTS.map((item, i, arr) => (
                <div key={item.label}>
                  <button
                    onClick={() => sendMessage(item.prompt)}
                    className="flex w-full items-center justify-between gap-3 rounded-[14px] border border-transparent px-4 py-[13px] text-left transition-all duration-150 hover:border-black/5 hover:bg-white/70"
                  >
                    <div className="flex items-center gap-2.5 text-[13px] font-normal text-gray-500">
                      <span className="text-sm text-violet-400">✦</span>
                      {item.label}
                    </div>
                    <span className="text-gray-300">›</span>
                  </button>
                  {i < arr.length - 1 && <div className="mx-1 my-0.5 h-px bg-black/5" />}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="msg-scroll flex-1 overflow-y-auto px-6 py-7">
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    message.role === "user" ? "ml-auto flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-[11px] ${
                      message.role === "user" ? "bg-white text-violet-700 shadow" : "text-gray-400"
                    }`}
                  >
                    {message.role === "user" ? <User size={15} /> : <Bot size={15} />}
                  </div>

                  <div
                    className={`max-w-[600px] rounded-[18px] px-4 py-[13px] ${
                      message.role === "user"
                        ? "rounded-br-[5px] bg-white text-gray-700 shadow"
                        : "rounded-bl-[5px] bg-transparent"
                    }`}
                  >
                    <div
                      className={`text-[13.5px] font-normal leading-[1.6] ${
                        message.role === "user" ? "text-gray-600" : "text-gray-500"
                      }`}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                        {message.text || ""}
                      </ReactMarkdown>

                      {message.campaignData && message.shapes?.length ? (
                        <CampaignCard message={message} onRegenerate={regenerate} busy={running} />
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}

              {running && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadingImage ? "Uploading image..." : "Thinking..."}
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="mx-auto w-full max-w-[720px] px-4 pb-5">
          <div className="rounded-[22px] border border-black/5 bg-white/80 p-3 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowImageField((p) => !p)}
                className={`grid h-10 w-10 place-items-center rounded-xl border transition ${
                  showImageField || productImageUrl
                    ? "border-violet-200 bg-violet-50 text-violet-700"
                    : "border-black/5 bg-white text-gray-400 hover:text-violet-700"
                }`}
                title="Add product image"
              >
                <ImagePlus size={16} />
              </button>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask about automation, or say: create an ad for my bakery..."
                className="flex-1 bg-transparent px-2 text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />

              <button
                onClick={() => sendMessage()}
                disabled={running || uploadingImage}
                className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500 text-white transition hover:bg-violet-600 disabled:opacity-50"
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
              </button>
            </div>

            {showImageField && (
              <div className="mt-3 rounded-2xl border border-black/5 bg-white/70 p-3">
                <div className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-violet-200 hover:text-violet-700">
                    <ImagePlus size={14} />
                    {uploadingImage
                      ? "Uploading..."
                      : hasUploadedFile
                        ? "Replace product image"
                        : "Upload product image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await handleImageUpload(file);
                      }}
                    />
                  </label>

                  <input
                    type="url"
                    value={productImageUrl}
                    onChange={(e) => {
                      setHasUploadedFile(false);
                      setProductImageUrl(e.target.value);
                    }}
                    placeholder="Or paste image URL"
                    className="flex-1 bg-transparent text-xs text-gray-600 outline-none placeholder:text-gray-400"
                  />

                  {productImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setHasUploadedFile(false);
                        setProductImageUrl("");
                      }}
                      className="grid h-7 w-7 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {productImageUrl && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-black/5 bg-gray-50">
                <img src={productImageUrl} alt="" className="h-32 w-full object-cover" />
              </div>
            )}
          </div>

          {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
        </div>
      </main>
    </div>
  );
}