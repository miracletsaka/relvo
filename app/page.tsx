import { cookies } from "next/headers";
import AiChatShell from "@/components/ai-chat/AiChatShell";
import PublicAiLandingChat from "@/components/ai-chat/PublicAiLandingChat";

const COOKIE_NAME = "nf_session";

export default async function Page() {
  const cookieStore = await cookies();

  const session = cookieStore.get(COOKIE_NAME)?.value;

  if (!session) {
    return <PublicAiLandingChat />;
  }

  return <AiChatShell />;
}