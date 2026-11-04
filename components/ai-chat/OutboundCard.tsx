"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, PhoneOutgoing, XCircle } from "lucide-react";
import { startCalls, type CallResult, type Lead } from "@/lib/outbound-api";

type Props = { leads: Lead[]; testMode: boolean; notes?: string };

export default function OutboundCard({ leads, testMode, notes = "" }: Props) {
  const [picked, setPicked] = useState<Set<number>>(new Set(leads.map((_, i) => i)));
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<CallResult[] | null>(null);
  const [error, setError] = useState("");

  const toggle = (i: number) =>
    setPicked((p) => {
      const n = new Set(p);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });

  async function run() {
    setBusy(true);
    setError("");
    try {
      const chosen = leads.filter((_, i) => picked.has(i));
      const r = await startCalls(chosen, notes);
      setResults(r.results);
    } catch (e: any) {
      setError(e?.message || "Could not start the calls.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-500">
        Outbound calls
      </div>

      {testMode && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Test mode is on. The calls go to <b>your test numbers</b>, not to these businesses. The agent will still
          use each business name, so you can hear how the pitch sounds.
        </div>
      )}

      <div className="space-y-2">
        {leads.map((l, i) => {
          const r = results?.find((x) => x.phone === l.phone);
          return (
            <label
              key={`${l.phone}-${i}`}
              className="flex items-start gap-3 rounded-xl border border-black/5 bg-gray-50 px-3 py-2 text-xs"
            >
              <input
                type="checkbox"
                checked={picked.has(i)}
                onChange={() => toggle(i)}
                disabled={!!results}
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[#344054]">{l.name || "Business"}</span>
                <span className="block text-[#98a2b3]">
                  {l.phone}
                  {l.address ? ` · ${l.address}` : ""}
                </span>
                {r && (
                  <span className={`mt-1 flex items-center gap-1 ${r.ok ? "text-emerald-600" : "text-red-500"}`}>
                    {r.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {r.ok ? `Call started (${r.status})` : r.error}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {!results && (
        <button
          onClick={run}
          disabled={busy || picked.size === 0}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <PhoneOutgoing size={13} />}
          Call {picked.size} {picked.size === 1 ? "business" : "businesses"}
        </button>
      )}

      {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
    </div>
  );
}
