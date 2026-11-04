"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PhoneOutgoing, Save, ShieldCheck, XCircle } from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

type Settings = {
  api_key_set: boolean;
  key_hint: string;
  agent_id: string;
  from_number: string;
  pitch: string;
  test_mode: boolean;
  test_numbers: string[];
  calling_start: string;
  calling_end: string;
  max_calls_per_run: number;
  ready: boolean;
};

type TestResult = {
  ok: boolean;
  agent: { ok: boolean; message: string };
  number: { ok: boolean; message: string };
};

async function call<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const raw = await res.text();
    let msg = raw;
    try {
      const j = JSON.parse(raw);
      msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail ?? j);
    } catch {}
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return res.json();
}

const input =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#344054] outline-none focus:border-violet-300";
const label = "mb-1.5 block text-xs font-semibold text-[#344054]";
const hint = "mt-1 text-[11px] text-[#98a2b3]";

export default function VoiceAgentSettingsPage() {
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [test, setTest] = useState<TestResult | null>(null);

  const [apiKey, setApiKey] = useState("");
  const [keyHint, setKeyHint] = useState("");
  const [keySet, setKeySet] = useState(false);
  const [agentId, setAgentId] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [pitch, setPitch] = useState("");
  const [testMode, setTestMode] = useState(true);
  const [testNumbers, setTestNumbers] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [maxCalls, setMaxCalls] = useState(5);
  const [ready, setReady] = useState(false);

  function apply(s: Settings) {
    setKeySet(s.api_key_set);
    setKeyHint(s.key_hint);
    setAgentId(s.agent_id);
    setFromNumber(s.from_number);
    setPitch(s.pitch);
    setTestMode(s.test_mode);
    setTestNumbers(s.test_numbers.join("\n"));
    setStart(s.calling_start);
    setEnd(s.calling_end);
    setMaxCalls(s.max_calls_per_run);
    setReady(s.ready);
  }

  useEffect(() => {
    call<Settings>("/outbound/settings")
      .then(apply)
      .catch((e) => setError(e?.message || "Failed to load settings"))
      .finally(() => setLoaded(true));
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    setNote("");
    setTest(null);
    try {
      const s = await call<Settings>("/outbound/settings", {
        method: "PUT",
        body: JSON.stringify({
          api_key: apiKey,
          agent_id: agentId,
          from_number: fromNumber,
          pitch,
          test_mode: testMode,
          test_numbers: testNumbers.split(/[\n,]+/).map((n) => n.trim()).filter(Boolean),
          calling_start: start,
          calling_end: end,
          max_calls_per_run: Number(maxCalls),
        }),
      });
      apply(s);
      setApiKey("");
      setNote("Saved.");
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function runTest() {
    setTesting(true);
    setError("");
    setNote("");
    try {
      setTest(await call<TestResult>("/outbound/settings/test", { method: "POST" }));
    } catch (e: any) {
      setError(e?.message || "Test failed");
    } finally {
      setTesting(false);
    }
  }

  if (!loaded) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f4f6]">
        <Loader2 className="animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f6] px-6 py-10 font-[Inter,sans-serif]">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-black/30">Settings</p>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-black/5 bg-white shadow-sm">
              <PhoneOutgoing size={20} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-[28px] font-extrabold tracking-[-0.04em] text-[#101828]">Voice agent</h1>
              <p className="text-sm text-[#667085]">
                Connect your Retell agent so Relvo can make outbound calls to qualify leads.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
              ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {ready ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {ready ? "Ready to call" : "Not set up yet"}
          </div>

          {/* Credentials */}
          <section className="space-y-4">
            <div>
              <label className={label}>Retell API key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={keySet ? `Saved (ends in ${keyHint || "••••"}). Leave blank to keep it.` : "key_..."}
                autoComplete="off"
                className={input}
              />
              <p className={hint}>Retell dashboard, then API Keys. It is stored encrypted and never shown again.</p>
            </div>

            <div>
              <label className={label}>Retell agent ID</label>
              <input
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="agent_..."
                className={input}
              />
              <p className={hint}>The outbound agent that will make the calls.</p>
            </div>

            <div>
              <label className={label}>From number</label>
              <input
                value={fromNumber}
                onChange={(e) => setFromNumber(e.target.value)}
                placeholder="+1 415 555 0123"
                className={input}
              />
              <p className={hint}>A US number in your Retell account. US numbers only for now.</p>
            </div>

            <div>
              <label className={label}>What the agent is calling about</label>
              <textarea
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                rows={3}
                placeholder="e.g. We help local businesses get more leads with AI-generated social media ads."
                className={`${input} resize-none`}
              />
            </div>
          </section>

          {/* Safety */}
          <section className="space-y-4 rounded-2xl border border-black/5 bg-gray-50 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-[#101828]">
              <ShieldCheck size={15} className="text-violet-500" />
              Safety rules
            </p>

            <label className="flex items-start gap-3 text-sm text-[#344054]">
              <input
                type="checkbox"
                checked={testMode}
                onChange={(e) => setTestMode(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">Test mode</span>
                <span className="block text-xs text-[#667085]">
                  Only the numbers below can be called. Turn it off only when you are ready for real prospects.
                </span>
              </span>
            </label>

            <div>
              <label className={label}>Test numbers (one per line)</label>
              <textarea
                value={testNumbers}
                onChange={(e) => setTestNumbers(e.target.value)}
                rows={3}
                placeholder={"+1 415 555 0123"}
                className={`${input} resize-none`}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={label}>Calls from</label>
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Calls until</label>
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Max per run</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxCalls}
                  onChange={(e) => setMaxCalls(Number(e.target.value))}
                  className={input}
                />
              </div>
            </div>
            <p className={hint}>Calling hours are in the business&apos;s local time.</p>
          </section>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save
            </button>
            <button
              onClick={runTest}
              disabled={testing || saving || !ready}
              className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#344054] hover:bg-gray-50 disabled:opacity-50"
            >
              {testing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Test connection
            </button>
            {note && <span className="text-xs font-medium text-emerald-600">{note}</span>}
          </div>

          {test && (
            <div className="space-y-1 rounded-2xl border border-black/5 bg-gray-50 p-4 text-xs">
              {[
                ["Agent", test.agent],
                ["From number", test.number],
              ].map(([name, r]: any) => (
                <div key={name} className="flex items-center gap-2">
                  {r.ok ? (
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  ) : (
                    <XCircle size={14} className="text-red-500" />
                  )}
                  <span className="font-semibold text-[#344054]">{name}:</span>
                  <span className="text-[#667085]">{r.message}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}