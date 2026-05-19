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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .composer-card {
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 2px 12px rgba(0, 0, 0, 0.06);
          transition: box-shadow 0.15s, border-color 0.15s;
        }

        .composer-card:focus-within {
          border-color: rgba(124, 85, 246, 0.35);
          box-shadow:
            0 0 0 3px rgba(124, 85, 246, 0.09),
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 4px 16px rgba(124, 85, 246, 0.08);
        }

        .composer-send {
          background: linear-gradient(145deg, #7c3aed, #4f46e5);
          box-shadow:
            0 3px 14px rgba(99, 102, 241, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.22),
            inset 0 -1px 0 rgba(0, 0, 0, 0.18);
          transition: all 0.18s ease;
        }

        .composer-send:not(:disabled):hover {
          background: linear-gradient(145deg, #8b5cf6, #6366f1);
          box-shadow:
            0 5px 20px rgba(99, 102, 241, 0.48),
            inset 0 1px 0 rgba(255,255,255,0.22);
          transform: translateY(-1px);
        }

        .composer-send:not(:disabled):active {
          transform: translateY(0);
        }

        .composer-mode,
        .composer-attach,
        .composer-kbd {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
        }

        .composer-kbd {
          box-shadow: inset 0 -1px 0 rgba(0,0,0,0.07);
        }
      `}</style>

      <div
        className={`relative w-full bg-transparent font-[Inter,sans-serif] ${
          isEmpty
            ? "mx-auto w-full max-w-[620px] p-0"
            : "bg-[rgba(244,244,246,0.92)] px-5 pb-4 pt-3"
        }`}
      >
        {!isEmpty && (
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.95) 50%, transparent 95%)",
            }}
          />
        )}

        <div className={isEmpty ? undefined : "mx-auto w-full max-w-[720px]"}>
          <div className="composer-card overflow-hidden rounded-[20px] bg-[rgba(255,255,255,0.78)]">
            <textarea
              className="block max-h-[160px] min-h-[52px] w-full resize-none border-none bg-transparent px-4 pb-1 pt-4 text-[13.5px] font-normal leading-[1.55] text-[#1a1a2e] outline-none placeholder:text-black/50 disabled:cursor-not-allowed disabled:opacity-45"
              value={prompt}
              disabled={running}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder={
                isEmpty
                  ? "Ask anything…"
                  : "Generate a premium ad for AI lead conversion, focused on booking more appointments…"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSend();
              }}
            />

            <div className="flex items-center justify-between gap-2 px-3 pb-[10px] pt-2">
              <div className="flex items-center gap-1.5">
                <button
                  className="
                    composer-mode
                    inline-flex items-center gap-[5px]
                    rounded-full border border-black/10
                    bg-white/60 px-[10px] py-1
                    text-[11px] font-semibold text-black/40
                    transition-all duration-150
                    hover:bg-white/90 hover:text-black/60
                  "
                >
                  <Sparkles size={10} />
                  AI
                </button>
              </div>

              <button
                className="
                  composer-send
                  grid h-[34px] w-[34px] shrink-0 place-items-center
                  rounded-xl text-white
                  disabled:cursor-not-allowed disabled:opacity-35
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

          <div className="mt-[9px] flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-black/30">
              Chat, generate images, or plan a full month of content.
            </div>

            <div className="flex items-center gap-1 text-[10px] font-semibold text-black/20">
              <span
                className="
                  composer-kbd
                  inline-flex items-center gap-0.5
                  rounded-[5px] border border-black/10
                  bg-white/75 px-[5px] py-[2px]
                  text-[9.5px] font-bold text-black/30
                "
              >
                <Command size={8} />⏎
              </span>
              to send
            </div>
          </div>
        </div>
      </div>
    </>
  );
}