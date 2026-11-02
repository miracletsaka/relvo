"use client";
import { useRef } from "react";
import { Copy, Download, RefreshCcw } from "lucide-react";
import AiChatCanvasPreview from "./ai-chat/AiChatCanvasPreview";

const btn = "inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50";

export default function CampaignCard({ message, onRegenerate, busy }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const d = message.campaignData;

  const download = () => {
    const c = ref.current?.querySelector("canvas");
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `relvo-ad-${Date.now()}.png`;
    a.click();
  };
  const caption = () =>
    navigator.clipboard.writeText([d.headline, d.description, d.offer_value || d.price_label, d.cta_text].filter(Boolean).join("\n\n"));

  return (
    <div className="mt-3">
      <div ref={ref}>
        <AiChatCanvasPreview campaignData={d} shapes={message.shapes}
          canvasWidth={message.canvasWidth} canvasHeight={message.canvasHeight} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={download} className={btn}><Download size={13} />Download</button>
        <button onClick={caption} className={btn}><Copy size={13} />Copy caption</button>
        <button onClick={() => onRegenerate(message)} disabled={busy} className={btn}>
          <RefreshCcw size={13} />New design
        </button>
      </div>
    </div>
  );
}