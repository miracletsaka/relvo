"use client";

import { Loader2, Send, Sparkles, Command } from "lucide-react";

export default function AiChatComposer({
  prompt,
  running,
  isEmpty,
  onPromptChange,
  onSend,
}: {
  prompt: string;
  running: boolean;
  isEmpty?: boolean;
  onPromptChange: (value: string) => void;
  onSend: () => void | Promise<void>;
}) {
  return (
    <div
      className={`relative w-full font-['Inter'] ${
        isEmpty
          ? "mx-auto max-w-[620px] p-0"
          : "bg-[#f4f4f6]/90 px-4 pb-4 pt-3 sm:px-5"
      }`}
    >
      {!isEmpty && (
        <div
          className="
            pointer-events-none absolute left-0 right-0 top-0 h-px
            bg-[linear-gradient(90deg,transparent_5%,rgba(255,255,255,0.95)_50%,transparent_95%)]
          "
        />
      )}

      <div className={isEmpty ? "" : "mx-auto w-full max-w-[720px]"}>
        <div
          className="
            overflow-hidden rounded-[22px]
            border border-black/5
            bg-white/75
            backdrop-blur-2xl
            transition-all duration-150
            shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_12px_rgba(0,0,0,0.06)]
            focus-within:border-[#7c55f6]/35
            focus-within:shadow-[0_0_0_3px_rgba(124,85,246,0.09),inset_0_1px_0_rgba(255,255,255,0.95),0_4px_16px_rgba(124,85,246,0.08)]
          "
        >
          <textarea
            className="
              block w-full resize-none border-none bg-transparent
              px-4 pt-4 pb-1
              text-[13.5px] font-normal leading-[1.55]
              text-[#1a1a2e]
              outline-none
              placeholder:text-black/45
              disabled:cursor-not-allowed
              disabled:opacity-45
              min-h-[54px]
              max-h-[180px]
            "
            value={prompt}
            disabled={running}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder={
              isEmpty
                ? "Ask anything…"
                : "Generate a premium ad for AI lead conversion, focused on booking more appointments…"
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                onSend();
              }
            }}
          />

          <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-2">
            {/* Left */}
            <div className="flex items-center gap-2">
              <button
                className="
                  inline-flex items-center gap-1.5
                  rounded-full
                  border border-black/10
                  bg-white/65
                  px-3 py-1
                  text-[11px] font-semibold
                  text-black/45
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
                  transition-all duration-150
                  hover:bg-white/95
                  hover:text-black/70
                "
              >
                <Sparkles size={10} />
                AI
              </button>
            </div>

            {/* Right */}
            <button
              className="
                grid h-[36px] w-[36px] shrink-0 place-items-center
                rounded-xl text-white
                transition-all duration-200
                disabled:cursor-not-allowed
                disabled:opacity-35
                bg-[linear-gradient(145deg,#7c3aed,#4f46e5)]
                shadow-[0_3px_14px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.18)]
                hover:bg-[linear-gradient(145deg,#8b5cf6,#6366f1)]
                hover:translate-y-[-1px]
                hover:shadow-[0_5px_20px_rgba(99,102,241,0.48),inset_0_1px_0_rgba(255,255,255,0.22)]
                active:translate-y-0
              "
              disabled={running || !prompt.trim()}
              onClick={onSend}
              title="Send (⌘↵)"
            >
              {running ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </button>
          </div>
        </div>

        {/* Bottom helper */}
        <div className="mt-2.5 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[10.5px] font-medium text-black/30">
            Chat, generate images, or plan a full month of content.
          </div>

          <div className="flex items-center gap-1 text-[10px] font-semibold text-black/20">
            <span
              className="
                inline-flex items-center gap-0.5
                rounded-[5px]
                border border-black/10
                bg-white/80
                px-[5px] py-[2px]
                text-[9.5px] font-bold text-black/35
                shadow-[inset_0_-1px_0_rgba(0,0,0,0.07)]
              "
            >
              <Command size={8} />
              ⏎
            </span>

            to send
          </div>
        </div>
      </div>
    </div>
  );
}