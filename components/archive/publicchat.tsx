"use client";

import { useMemo, useRef, useState } from "react";
import {
  Bot,
  ImagePlus,
  Loader2,
  Send,
  User,
  X,
  Copy,
  Download,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import AiChatCanvasPreview from "./AiChatCanvasPreview";
import { uploadFileToSpaces } from "@/lib/video-upload-client";
import { PORTRAIT_H, PORTRAIT_W } from "@/lib/design-studio-utils";
import { MIXED_POSTER_SECTIONS } from "@/lib/templates/mixed-poster";
import { improveCampaignDesignShapes } from "@/lib/campaign-design-intelligence";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

type PublicMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  campaignData?: any;
  shapes?: any[];
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundImage?: string | null;
  refinedImageUrl?: string | null;
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
    prompt:
      "Explain how AI can generate branded posts, ads, and marketing content for a business",
  },
  {
    label: "Learn how reviews become social proof",
    prompt:
      "Explain how customer reviews can become marketing assets and improve trust",
  },
  {
    label: "See how business documents help AI",
    prompt:
      "How can connecting Google Docs help AI understand a business better?",
  },
  {
    label: "Explore business automation possibilities",
    prompt:
      "What business workflows and repetitive tasks can AI automate?",
  },
];

const PUBLIC_SECTION_CHOICES = [
  "background",
  "scene",
  "hero-image",
  "hero-text",
  "offer",
  "cta",
  "footer",
  "features",
  "price",
  "testimonial",
  "contact",
  "social",
];

function isCampaignRequest(text: string) {
  return /generate|create|design|ad|advert|post|campaign|image|poster|flyer|promo|promotion/i.test(
    text,
  );
}

function getSectionType(section: any) {
  return String(
    section?.requested_type ||
      section?.segment_type ||
      section?.internal_segment_type ||
      section?.type ||
      "",
  );
}

function getSectionKey(section: any) {
  return String(
    section?.section_type ||
      section?.sectionType ||
      section?.key ||
      section?.name ||
      getSectionType(section),
  )
    .toLowerCase()
    .replace(/_/g, "-")
    .trim();
}

function normalizeSection(section: any, index: number) {
  const shapes = Array.isArray(section?.shapes) ? section.shapes : [];

  return {
    ...section,
    instanceId:
      section?.instanceId ||
      section?.id ||
      `public-section-${index}-${Math.random().toString(36).slice(2)}`,
    requested_type:
      section?.requested_type || section?.segment_type || "campaign_composition",
    y: Number(section?.y || 0),
    segment_height: Number(section?.segment_height || section?.height || PORTRAIT_H),
    shapes,
  };
}

function pickMixedPosterSection(campaignData: any) {
  const sections = Array.isArray(MIXED_POSTER_SECTIONS)
    ? MIXED_POSTER_SECTIONS
    : [];

  if (!sections.length) return [];

  const hasOffer =
    Boolean(campaignData?.offer_value) ||
    Boolean(campaignData?.offer_label) ||
    Boolean(campaignData?.offer_title) ||
    Boolean(campaignData?.price_label);

  const hasImage =
    Boolean(campaignData?.heroImage) ||
    Boolean(campaignData?.imageSlots?.hero_person?.url);

  const wanted = new Set(PUBLIC_SECTION_CHOICES);

  if (!hasOffer) {
    wanted.delete("offer");
    wanted.delete("price");
  }

  if (!hasImage) {
    wanted.delete("hero-image");
    wanted.delete("scene");
  }

  const campaignCompositions = sections.filter((section: any) => {
    const type = getSectionType(section);
    return type === "campaign_composition";
  });

  if (campaignCompositions.length) {
    return [
      normalizeSection(
        campaignCompositions[Math.floor(Math.random() * campaignCompositions.length)],
        0,
      ),
    ];
  }

  const matchingSections = sections.filter((section: any) => {
    const key = getSectionKey(section);
    const type = getSectionType(section).replace(/_/g, "-");

    return wanted.has(key) || wanted.has(type);
  });

  const source = matchingSections.length ? matchingSections : sections;

  const picked = [...source]
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
    .map((section, index) => normalizeSection(section, index));

  return picked.length ? picked : [normalizeSection(source[0], 0)];
}

function enrichPublicCampaignData(campaignData: any, productImageUrl: string) {
  const imageUrl =
    productImageUrl ||
    campaignData?.heroImage ||
    campaignData?.imageSlots?.hero_person?.url ||
    "";

  return {
    ...campaignData,
    heroImage: imageUrl,
    imageSlots: {
      ...(campaignData?.imageSlots || {}),
      ...(imageUrl
        ? {
            hero_person: { url: imageUrl },
            heroImage: { url: imageUrl },
          }
        : {}),
    },
    cta: campaignData?.cta || campaignData?.cta_text || "Get started",
    cta_text: campaignData?.cta_text || campaignData?.cta || "Get started",
    subheading:
      campaignData?.subheading ||
      campaignData?.subheadline ||
      campaignData?.description ||
      "",
    subheadline:
      campaignData?.subheadline ||
      campaignData?.subheading ||
      campaignData?.description ||
      "",
    product_label: campaignData?.product_label || campaignData?.product_name || "",
    product_description:
      campaignData?.product_description || campaignData?.description || "",
    bullet_1:
      campaignData?.bullet_1 ||
      campaignData?.feature_1 ||
      campaignData?.bullets?.[0] ||
      "",
    bullet_2:
      campaignData?.bullet_2 ||
      campaignData?.feature_2 ||
      campaignData?.bullets?.[1] ||
      "",
    bullet_3:
      campaignData?.bullet_3 ||
      campaignData?.feature_3 ||
      campaignData?.bullets?.[2] ||
      "",
    feature_1:
      campaignData?.feature_1 ||
      campaignData?.bullet_1 ||
      campaignData?.bullets?.[0] ||
      "",
    feature_2:
      campaignData?.feature_2 ||
      campaignData?.bullet_2 ||
      campaignData?.bullets?.[1] ||
      "",
    feature_3:
      campaignData?.feature_3 ||
      campaignData?.bullet_3 ||
      campaignData?.bullets?.[2] ||
      "",
    companyName:
      campaignData?.companyName || campaignData?.company_name || "Your Business",
    location: campaignData?.location || "Online",
  };
}

function getPostCaption(data: any) {
  return [data.headline, data.description, data.offer_value || data.price_label, data.cta_text]
    .filter(Boolean)
    .join("\n\n");
}

export default function PublicAiLandingChat() {
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [input, setInput] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [showImageField, setShowImageField] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [running, setRunning] = useState(false);
  const [refiningIds, setRefiningIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  const endRef = useRef<HTMLDivElement | null>(null);
  const canvasRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const imagePreviewUrl = useMemo(() => productImageUrl || "", [productImageUrl]);

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    setError("");

    try {
      const uploadedUrl = await uploadFileToSpaces(file);
      setProductImage(file);
      setProductImageUrl(uploadedUrl);
      setShowImageField(true);
    } catch (e) {
      console.error(e);
      setError("Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function generatePublicCampaign(prompt: string) {
    const res = await fetch(`${API_BASE}/public-ai-chat/generate-campaign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        product_image_url: productImageUrl.trim() || null,
      }),
    });

    if (!res.ok) throw new Error(await res.text());

    return res.json();
  }

  async function refineMessageImage(messageId: string) {
    const root = canvasRefs.current[messageId];
    const canvas = root?.querySelector("canvas");

    if (!canvas) {
      setError("Canvas is not ready for refinement yet.");
      return;
    }

    setError("");
    setRefiningIds((prev) => ({ ...prev, [messageId]: true }));

    try {
      const imageBase64 = (canvas as HTMLCanvasElement).toDataURL("image/png", 1);

      const res = await fetch(`${API_BASE}/public-ai-chat/refine-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: imageBase64,
          prompt:
            "Refine this campaign poster into a polished premium marketing image. Keep the same message, offer, CTA, layout intention, and product. Improve typography, contrast, spacing, image balance, background harmony, and readability. Do not add fake logos or unrelated text.",
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                refinedImageUrl: data.image_base64 || null,
              }
            : msg,
        ),
      );
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to refine image.");
    } finally {
      setRefiningIds((prev) => ({ ...prev, [messageId]: false }));
    }
  }

  async function refineAfterRender(messageId: string) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void refineMessageImage(messageId);
      });
    });
  }

  async function copyCaption(data: any) {
    await navigator.clipboard.writeText(getPostCaption(data));
  }

  function downloadMessageImage(message: PublicMessage) {
    if (message.refinedImageUrl) {
      const link = document.createElement("a");
      link.href = message.refinedImageUrl;
      link.download = `relvo-refined-campaign-${Date.now()}.png`;
      link.click();
      return;
    }

    const root = canvasRefs.current[message.id];
    const canvas = root?.querySelector("canvas");

    if (!canvas) return;

    const link = document.createElement("a");
    link.href = (canvas as HTMLCanvasElement).toDataURL("image/png", 1);
    link.download = `relvo-campaign-${Date.now()}.png`;
    link.click();
  }

  function regenerateCampaignVisuals(messageId: string) {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId || !msg.campaignData) return msg;

        const pickedSections = pickMixedPosterSection(msg.campaignData);

        const rawShapes = pickedSections.flatMap((section: any) =>
          Array.isArray(section.shapes) ? section.shapes : [],
        );

        const shapes = improveCampaignDesignShapes(rawShapes, msg.campaignData);

        const updated = {
          ...msg,
          shapes,
          refinedImageUrl: null,
        };

        return updated;
      }),
    );

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void refineMessageImage(messageId);
      });
    });
  }

  async function sendMessage(custom?: string) {
    const text = typeof custom === "string" ? custom.trim() : input.trim();

    if (!text || running) return;

    setInput("");
    setError("");

    const userMsg: PublicMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setRunning(true);

    try {
      if (isCampaignRequest(text)) {
        const data = await generatePublicCampaign(text);

        const campaignData = enrichPublicCampaignData(
          data.campaign_data || {},
          productImageUrl.trim(),
        );

        const pickedSections = pickMixedPosterSection(campaignData);

        const rawShapes =
          Array.isArray(data.shapes) && data.shapes.length
            ? data.shapes
            : pickedSections.flatMap((section: any) =>
                Array.isArray(section.shapes) ? section.shapes : [],
              );

        const shapes = improveCampaignDesignShapes(rawShapes, campaignData);

        const assistantId = crypto.randomUUID();

        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            text:
              `${data.message || "Campaign preview generated."}\n\n` +
              `[Sign in to save, edit, or export this campaign](/auth/login)`,
            campaignData,
            shapes,
            canvasWidth: data.canvas_width || PORTRAIT_W,
            canvasHeight: data.canvas_height || PORTRAIT_H,
            backgroundImage: data.background_image || null,
            refinedImageUrl: null,
          },
        ]);

        requestAnimationFrame(() => {
          endRef.current?.scrollIntoView({ behavior: "smooth" });
        });

        await refineAfterRender(assistantId);

        return;
      }

      const res = await fetch(`${API_BASE}/public-ai-chat/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10),
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text:
            data.reply ||
            "I can help with business automation, marketing, content, and AI systems. Sign in here: [Sign in](/auth/login).",
        },
      ]);

      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f4f4f6] font-[Inter,sans-serif] text-gray-700">
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

                  {i < arr.length - 1 && (
                    <div className="mx-1 my-0.5 h-px bg-black/5" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
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
                      message.role === "user"
                        ? "bg-white text-violet-700 shadow"
                        : "text-gray-400"
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
                      className={`font-normal text-[13.5px] leading-[1.6] ${
                        message.role === "user" ? "text-gray-600" : "text-gray-500"
                      }`}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => <li>{children}</li>,
                          strong: ({ children }) => (
                            <strong className="font-semibold text-gray-700">
                              {children}
                            </strong>
                          ),
                          code: ({ children }) => (
                            <code className="rounded bg-black/5 px-1 py-0.5 text-[12px] text-gray-700">
                              {children}
                            </code>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target={href?.startsWith("/") ? "_self" : "_blank"}
                              rel="noopener noreferrer"
                              className="font-medium text-violet-700 underline underline-offset-2"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {message.text || ""}
                      </ReactMarkdown>

                      {message.campaignData && message.shapes?.length ? (
                        <div className="mt-3">
                          {message.refinedImageUrl ? (
                            <img
                              src={message.refinedImageUrl}
                              alt="Refined campaign"
                              className="w-full rounded-2xl border border-black/5 bg-white shadow-sm"
                            />
                          ) : (
                            <div
                              ref={(node) => {
                                canvasRefs.current[message.id] = node;
                              }}
                            >
                              <AiChatCanvasPreview
                                campaignData={message.campaignData}
                                shapes={message.shapes}
                                canvasWidth={message.canvasWidth || PORTRAIT_W}
                                canvasHeight={message.canvasHeight || PORTRAIT_H}
                                backgroundImage={message.backgroundImage || null}
                                isEditable={false}
                                selectedShapeId={null}
                                onSelectShape={() => {}}
                                onPatchShapes={() => {}}
                              />
                            </div>
                          )}

                          {message.refinedImageUrl && (
                            <div
                              ref={(node) => {
                                canvasRefs.current[message.id] = node;
                              }}
                              className="hidden"
                            >
                              <AiChatCanvasPreview
                                campaignData={message.campaignData}
                                shapes={message.shapes}
                                canvasWidth={message.canvasWidth || PORTRAIT_W}
                                canvasHeight={message.canvasHeight || PORTRAIT_H}
                                backgroundImage={message.backgroundImage || null}
                                isEditable={false}
                                selectedShapeId={null}
                                onSelectShape={() => {}}
                                onPatchShapes={() => {}}
                              />
                            </div>
                          )}

                          {refiningIds[message.id] && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-violet-500">
                              <Loader2 size={13} className="animate-spin" />
                              Refining image with AI…
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={() => downloadMessageImage(message)}
                              className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                            >
                              <Download size={13} />
                              Download image
                            </button>

                            <button
                              onClick={() => copyCaption(message.campaignData)}
                              className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                            >
                              <Copy size={13} />
                              Copy caption
                            </button>

                            <button
                              onClick={() => refineMessageImage(message.id)}
                              disabled={!!refiningIds[message.id]}
                              className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-45"
                            >
                              {refiningIds[message.id] ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Sparkles size={13} />
                              )}
                              Refine with AI
                            </button>

                            <button
                              onClick={() => regenerateCampaignVisuals(message.id)}
                              className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                            >
                              <RefreshCcw size={13} />
                              Regenerate image
                            </button>
                          </div>
                        </div>
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

        <div className="mx-auto w-full max-w-[720px] px-4 pb-5">
          <div className="rounded-[22px] border border-black/5 bg-white/80 p-3 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowImageField((prev) => !prev)}
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
                placeholder="Ask about automation, Google Docs, marketing, leads..."
                className="flex-1 bg-transparent px-2 text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />

              <button
                onClick={() => sendMessage()}
                disabled={running || uploadingImage}
                className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500 text-white transition hover:bg-violet-600 disabled:opacity-50"
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>

            {showImageField && (
              <div className="mt-3 rounded-2xl border border-black/5 bg-white/70 p-3">
                <div className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-violet-200 hover:text-violet-700">
                    <ImagePlus size={14} />
                    {uploadingImage
                      ? "Uploading..."
                      : productImage
                        ? "Replace product image"
                        : "Upload product image"}

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        await handleImageUpload(file);
                      }}
                    />
                  </label>

                  <input
                    type="url"
                    value={productImageUrl}
                    onChange={(event) => {
                      setProductImage(null);
                      setProductImageUrl(event.target.value);
                    }}
                    placeholder="Or paste image URL"
                    className="flex-1 bg-transparent text-xs text-gray-600 outline-none placeholder:text-gray-400"
                  />

                  {productImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setProductImage(null);
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

            {imagePreviewUrl && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-black/5 bg-gray-50">
                <img
                  src={imagePreviewUrl}
                  alt=""
                  className="h-32 w-full object-cover"
                />
              </div>
            )}
          </div>

          {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
        </div>
      </main>
    </div>
  );
}