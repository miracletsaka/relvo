"use client";

import { Bot, Loader2, User } from "lucide-react";
import AiChatCanvasPreview from "./AiChatCanvasPreview";
import type { ChatMessage, Draft } from "./types";
import { PORTRAIT_H, PORTRAIT_W } from "@/lib/design-studio-utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Download, RefreshCcw } from "lucide-react";

function BusinessAnalysisCard({ data }: { data: any }) {
  if (!data) return null;

  const chart = data.charts?.[0];
  const table = data.table;

  return (
    <div className="mt-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-500">
        Business Analysis
      </div>

      {data.summary?.overall_score !== undefined && (
        <div className="mb-4">
          <div className="text-2xl font-semibold text-gray-800">
            {data.summary.overall_score}%
          </div>
          <div className="text-xs text-gray-400">Overall AI readiness score</div>
        </div>
      )}

      {chart?.data?.length ? (
        <div className="mb-5 space-y-3">
          <div className="text-xs font-semibold text-gray-500">{chart.title}</div>

          {chart.data.map((item: any) => (
            <div key={item.label}>
              <div className="mb-1 flex justify-between text-[11px] text-gray-500">
                <span>{item.label}</span>
                <span>{item.value}%</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{ width: `${Math.max(0, Math.min(100, item.value))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {table?.rows?.length ? (
        <div className="overflow-hidden rounded-xl border border-black/5">
          <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
            {table.title}
          </div>

          <div className="divide-y divide-black/5">
            {table.rows.map((row: any[], idx: number) => (
              <div key={idx} className="grid grid-cols-[90px_60px_1fr] gap-2 px-3 py-2 text-[11px]">
                <div className="font-semibold text-gray-700">{row[0]}</div>
                <div className="text-violet-700">{row[1]}</div>
                <div className="text-gray-500">{row[2]}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getDraftTitle(draft: Draft | null | undefined) {
  const s = draft?.structured || {};
  return s.headline || s.hook || draft?.body_text?.slice(0, 90) || "Generated campaign";
}

function getDraftCaption(draft: Draft | null | undefined) {
  return [draft?.body_text, draft?.hashtags].filter(Boolean).join("\n\n");
}

export default function AiChatMessages({
  messages,
  running,
  progressText,
  activeEditableMessageId,
  selectedShapeId,
  onStartEditing,
  onCopyMessageCaption,
  onDownloadMessageImage,
  onRegenerateMessageImage,
  onSelectShape,
  onPromptClick,
  onOpenFullEditor,
  onRegenerateMessage,
  onPatchMessageShapes,
  endRef,
}: {
  messages: ChatMessage[];
  running: boolean;
  onPromptClick: (prompt: string) => void;
  onRegenerateMessage: (messageId: string) => void;
  onOpenFullEditor: (messageId: string) => void;
  progressText: string;
  activeEditableMessageId: string | null;
  onDownloadMessageImage: (messageId: string) => void;
  onCopyMessageCaption: (messageId: string) => void;
  onRegenerateMessageImage: (messageId: string) => void;
  selectedShapeId: string | null;
  onStartEditing: (messageId: string) => void;
  onSelectShape: (shapeId: string | null) => void;
  onPatchMessageShapes: (messageId: string, updater: (prev: any[]) => any[]) => void;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  const isEmpty = messages.length === 0;

  const quickPrompts = [
  "Generate a branded post about our main service",
  "Create an ad image for lead conversion",
  "Plan this month’s content calendar",
  "Summarise a Google Doc",
];

const systemPrompts = [
  { icon: "✦", label: "Explain where I manage Google Docs", prompt: "Where do I connect and read Google Docs in the platform?" },
  { icon: "✦", label: "Review my business profile setup", prompt: "Where do I update organisation profile data and why does it matter?" },
  { icon: "✦", label: "Create a full month of content", prompt: "Generate a full month of content for my brand" },
  { icon: "✦", label: "Improve my brand generation setup", prompt: "How should I use brands, tones, media, and reviews to improve generated posts?" },
];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        .msg-scroll::-webkit-scrollbar {
          width: 3px;
        }

        .msg-scroll::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 4px;
        }
      `}</style>

      <div className="flex flex-1 flex-col overflow-hidden bg-[#f4f4f6] font-[Inter,sans-serif]">
        {/* Empty state */}
        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-6 pt-12 text-center">
            <div className="mb-7 text-[28px] font-medium leading-[1.15] tracking-[-0.03em] text-gray-500">
              What can I{" "}
              <span className="bg-gradient-to-br from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                create
              </span>{" "}
              for you?
            </div>

            <div className="mb-7 flex flex-wrap justify-center gap-2">
              {quickPrompts.map((s) => (
                <button
                  key={s}
                  onClick={() => onPromptClick(s)}
                  className="rounded-full border border-black/5 bg-white/70 px-4 py-2 text-xs font-medium text-gray-500 transition-all duration-150 hover:border-violet-200 hover:bg-violet-500/5 hover:text-violet-700"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex w-full max-w-[560px] flex-col gap-0.5">
             {systemPrompts.map((item, i, arr) => (
                <div key={item.label}>
                  <button
                    onClick={() => onPromptClick(item.prompt)}
                    className="flex w-full items-center justify-between gap-3 rounded-[14px] border border-transparent px-4 py-[13px] text-left transition-all duration-150 hover:border-black/5 hover:bg-white/70"
                  >
                    <div className="flex items-center gap-2.5 text-[13px] font-normal text-gray-500">
                      <span className="text-sm text-violet-400">{item.icon}</span>
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
          <div className="msg-scroll flex-1 overflow-y-auto px-6 py-7">
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    message.role === "user"
                      ? "ml-auto flex-row-reverse"
                      : ""
                  }`}
                >
                  <div
                    className={`
                      grid h-8 w-8 shrink-0 place-items-center rounded-[11px]
                      ${
                        message.role === "user"
                          ? "bg-white shadow text-violet-700"
                          : "text-gray-400"
                      }
                    `}
                  >
                    {message.role === "user" ? (
                      <User size={15} />
                    ) : (
                      <Bot size={15} />
                    )}
                  </div>

                  <div
                    className={`
                      max-w-[600px] rounded-[18px] px-4 py-[13px]
                      ${
                        message.role === "user"
                          ? "rounded-br-[5px] bg-white shadow text-gray-700"
                          : "rounded-bl-[5px] bg-transparent"
                      }
                    `}
                  >
                    <div
                      className={`
                        whitespace-pre-wrap font-normal text-[13.5px] leading-[1.6]
                        ${
                          message.role === "user"
                            ? "text-gray-600"
                            : "text-gray-500"
                        }
                      `}
                    >
                      {message.status === "generating" && (
                        <Loader2
                          size={13}
                          className="mr-[7px] inline-block animate-spin text-violet-500"
                        />
                      )}

                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
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
                    </div>

                    <BusinessAnalysisCard data={message.metadata?.business_analysis} />

                    {message.messageType === "generated_month" && (
                      <div className="mt-[11px]">
                        <a
                          href="/dashboard/design-studio/ai-chat/planner"
                          className="
                            inline-flex rounded-full
                            border border-violet-200
                            bg-violet-500/5
                            px-[13px] py-[7px]
                            text-[11px] font-medium text-violet-700
                            transition-all duration-150
                            hover:bg-violet-500/10
                          "
                        >
                          Open Planner
                        </a>
                      </div>
                    )}

                    {message.campaignData && message.shapes?.length ? (
                      <>
                      <div data-message-canvas={message.id}>

                        <AiChatCanvasPreview
                          campaignData={message.campaignData}
                          shapes={message.shapes}
                          canvasWidth={message.canvasWidth || PORTRAIT_W}
                          canvasHeight={message.canvasHeight || PORTRAIT_H}
                          backgroundImage={message.backgroundImage || null}
                          isEditable={activeEditableMessageId === message.id}
                          selectedShapeId={
                            activeEditableMessageId === message.id
                              ? selectedShapeId
                              : null
                          }
                          onSelectShape={onSelectShape}
                          onPatchShapes={(updater) =>
                            onPatchMessageShapes(message.id, updater)
                          }
                        />
                          </div>

                        <div className="mt-[11px] flex flex-wrap gap-[7px]">
                          <button
                            className="
                              rounded-full border border-violet-200
                              bg-violet-500/5 px-[13px] py-[7px]
                              text-[11px] font-medium text-violet-700
                              transition-all duration-150
                              hover:bg-violet-500/10
                            "
                            onClick={() => onOpenFullEditor(message.id)}
                          >
                            Edit Fullscreen
                          </button>

                          <button
                            className="
                              rounded-full border border-black/5
                              bg-white/70 px-[13px] py-[7px]
                              text-[11px] font-medium text-gray-500
                              transition-all duration-150
                              hover:bg-white
                              hover:text-gray-700
                            "
                            onClick={() => onRegenerateMessage(message.id)}
                          >
                            Regenerate
                          </button>
                          <button
                            className="
                              rounded-full border border-black/5
                              bg-white/70 px-[13px] py-[7px]
                              text-[11px] font-medium text-gray-500
                              transition-all duration-150
                              hover:bg-white hover:text-gray-700
                            "
                            onClick={() => onDownloadMessageImage(message.id)}
                          >
                            <Download size={12} className="mr-1 inline-block" />
                            Download
                          </button>

                          <button
                            className="
                              rounded-full border border-black/5
                              bg-white/70 px-[13px] py-[7px]
                              text-[11px] font-medium text-gray-500
                              transition-all duration-150
                              hover:bg-white hover:text-gray-700
                            "
                            onClick={() => onCopyMessageCaption(message.id)}
                          >
                            <Copy size={12} className="mr-1 inline-block" />
                            Copy caption
                          </button>

                          <button
                            className="
                              rounded-full border border-black/5
                              bg-white/70 px-[13px] py-[7px]
                              text-[11px] font-medium text-gray-500
                              transition-all duration-150
                              hover:bg-white hover:text-gray-700
                            "
                            onClick={() => onRegenerateMessageImage(message.id)}
                          >
                            <RefreshCcw size={12} className="mr-1 inline-block" />
                            Regenerate image
                          </button>
                        </div>

                        <div className="mt-3 text-sm font-medium text-gray-500">
                          {getDraftTitle(message.draft)}
                        </div>

                        {getDraftCaption(message.draft) && (
                          <div className="mt-2.5 border-t border-black/5 pt-2.5 text-xs leading-[1.58] whitespace-pre-wrap text-gray-400">
                            {getDraftCaption(message.draft)}
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              ))}

              <div ref={endRef} />
            </div>
          </div>
        )}

        {isEmpty && <div ref={endRef} />}
      </div>
    </>
  );
}