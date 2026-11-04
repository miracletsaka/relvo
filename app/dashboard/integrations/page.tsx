"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Facebook, PhoneOutgoing } from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

async function get<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

type Status = { label: string; tone: "ok" | "off" | "unknown" };

type Integration = {
  key: string;
  name: string;
  description: string;
  href: string; // CHANGE if your page lives at a different path
  icon: React.ReactNode;
  status: () => Promise<Status>;
};

const INTEGRATIONS: Integration[] = [
  {
    key: "facebook",
    name: "Facebook Pages",
    description: "Connect a Page and schedule AI-generated posts at the best time.",
    href: "/dashboard/integrations/facebook",
    icon: <Facebook size={20} className="text-[#1877F2]" />,
    status: async () => {
      const s = await get<{ connected: boolean; pages?: { name: string; is_selected: boolean }[] }>(
        "/facebook/status",
      );
      if (!s.connected) return { label: "Not connected", tone: "off" };
      const page = s.pages?.find((p) => p.is_selected);
      return { label: page ? `Connected · ${page.name}` : "Connected · select a Page", tone: "ok" };
    },
  },
  {
    key: "google",
    name: "Google",
    description: "Connect Google Docs so the AI can learn your business.",
    href: "/dashboard/integrations/google",
    icon: <span className="text-lg font-extrabold text-[#4285F4]">G</span>,
    status: async () => {
      const s = await get<{ connected: boolean }>("/google/status"); // CHANGE if your endpoint differs
      return s.connected ? { label: "Connected", tone: "ok" } : { label: "Not connected", tone: "off" };
    },
  },
  {
    key: "voice",
    name: "Voice agent (Retell)",
    description: "Set up the AI caller that qualifies leads over the phone.",
    href: "/dashboard/settings/voice-agent",
    icon: <PhoneOutgoing size={20} className="text-violet-600" />,
    status: async () => {
      const s = await get<{ ready: boolean }>("/outbound/settings");
      return s.ready ? { label: "Ready to call", tone: "ok" } : { label: "Not set up", tone: "off" };
    },
  },
];

const badge: Record<Status["tone"], string> = {
  ok: "bg-emerald-50 text-emerald-700",
  off: "bg-gray-100 text-gray-500",
  unknown: "bg-transparent text-transparent",
};

export default function IntegrationsPage() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});

  useEffect(() => {
    INTEGRATIONS.forEach((item) => {
      item
        .status()
        .then((s) => setStatuses((p) => ({ ...p, [item.key]: s })))
        .catch(() => setStatuses((p) => ({ ...p, [item.key]: { label: "", tone: "unknown" } })));
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f4f6] px-6 py-10 font-[Inter,sans-serif]">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-black/30">Settings</p>
          <h1 className="text-[28px] font-extrabold tracking-[-0.04em] text-[#101828]">Integrations</h1>
          <p className="text-sm text-[#667085]">Connect the tools Relvo uses to publish, learn and call.</p>
        </div>

        <div className="space-y-3">
          {INTEGRATIONS.map((item) => {
            const s = statuses[item.key];
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-4 rounded-[24px] border border-black/5 bg-white p-5 shadow-sm transition hover:border-violet-200 hover:shadow"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/5 bg-white">
                  {item.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#101828]">{item.name}</p>
                  <p className="text-xs text-[#667085]">{item.description}</p>
                </div>

                {s?.label ? (
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${badge[s.tone]}`}>
                    {s.label}
                  </span>
                ) : null}

                <ChevronRight size={16} className="shrink-0 text-gray-300" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}