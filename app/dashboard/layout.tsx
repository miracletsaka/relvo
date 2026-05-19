import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function getOnboardingStatus() {
  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch(
    `${API_BASE}/organisations/onboarding-status`,
    {
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    },
  );

  if (!res.ok) return null;

  return res.json();
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = await getOnboardingStatus();

  if (!status?.complete) {
    redirect("/onboarding");
  }

  return <DashboardShell>{children}</DashboardShell>;
}