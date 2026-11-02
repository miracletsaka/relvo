import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AiChatShell from "@/components/ai-chat/AiChatShell";
import PublicAiLandingChat from "@/components/ai-chat/PublicAiLandingChat";

export default async function Page() {
  const cookieStore = await cookies();
  const session = cookieStore.get("nf_session")?.value;
  const orgId = cookieStore.get("nf_org")?.value;

  if (!session) return <PublicAiLandingChat />;
  if (!orgId) redirect("/onboarding");

  return <AiChatShell />;
}