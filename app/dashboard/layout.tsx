import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { SERVER_API_BASE } from "@/lib/backend-url";

type OnboardingResult =
  | { kind: "complete" }
  | { kind: "incomplete" }
  | { kind: "logged-out" }
  | { kind: "unreachable" };

async function getOnboardingStatus(): Promise<OnboardingResult> {
  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // Render's free server can take a while to wake up, so never wait forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${SERVER_API_BASE}/organisations/onboarding-status`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) return { kind: "logged-out" };
    if (res.status >= 500) return { kind: "unreachable" };
    if (!res.ok) return { kind: "incomplete" };

    const data = await res.json();
    return data?.complete ? { kind: "complete" } : { kind: "incomplete" };
  } catch {
    return { kind: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // redirect() throws internally, so it must stay outside any try/catch.
  const status = await getOnboardingStatus();

  if (status.kind === "logged-out") {
    redirect("/auth/login");
  }

  if (status.kind === "incomplete") {
    redirect("/onboarding");
  }

  // "complete" or "unreachable": show the dashboard.
  // If the backend is just waking up, the pages load their own data once it answers,
  // instead of wrongly sending a finished user back to onboarding.
  return <DashboardShell>{children}</DashboardShell>;
}