import { ChatMessage } from "@/components/ai-chat/types";

export const uid = (prefix = "msg") =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export async function copyCaption(message?: ChatMessage) {
  if (!message) return;
  const draft = (message as any).draft;
  const caption = [draft?.body_text, draft?.hashtags].filter(Boolean).join("\n\n");
  await navigator.clipboard.writeText(caption || message.text || "");
}

export function downloadCanvas(messageId: string) {
  const canvas = document
    .querySelector(`[data-message-canvas="${messageId}"]`)
    ?.querySelector("canvas");
  if (!canvas) return;
  const a = document.createElement("a");
  a.href = (canvas as HTMLCanvasElement).toDataURL("image/png", 1);
  a.download = `relvo-campaign-${Date.now()}.png`;
  a.click();
}

/** The prompt that produced an assistant message = the user message just before it. */
export function findPromptFor(messages: ChatMessage[], assistantId: string): string {
  const i = messages.findIndex((m) => m.id === assistantId);
  const target: any = messages[i];
  if (target?.metadata?.generation_prompt) return target.metadata.generation_prompt;
  for (let j = i - 1; j >= 0; j--) {
    if (messages[j].role === "user") return messages[j].text;
  }
  return "";
}
