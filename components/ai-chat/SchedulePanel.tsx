"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Facebook, Loader2, Sparkles } from "lucide-react";
import {
  listAccounts,
  schedulePost,
  suggestTime,
  type SocialAccount,
} from "@/lib/social-api";

type Props = {
  messageId: string;        // same id used in data-message-canvas="..."
  defaultCaption: string;
  businessContext: string;  // e.g. brand name + what the business does + location
  onConnect?: () => void;   // opens your existing "Connect Facebook" flow
};

const btn =
  "inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50";

// unix seconds -> value for <input type="datetime-local"> in the browser's time zone
function toLocalInput(unix: number) {
  const d = new Date(unix * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function SchedulePanel({ messageId, defaultCaption, businessContext, onConnect }: Props) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [caption, setCaption] = useState(defaultCaption);
  const [when, setWhen] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    listAccounts()
      .then((rows) => {
        setAccounts(rows);
        const pick = rows.find((r) => r.is_selected) || rows[0];
        if (pick) setAccountId(pick.id);
      })
      .catch(() => {});
  }, []);

  async function suggest() {
    try {
      setBusy("suggest");
      setNote("");
      const s = await suggestTime({ context: businessContext, caption });
      setWhen(toLocalInput(s.post_at_unix));
      setReason(s.reason);
    } catch (e: any) {
      setNote(e?.message || "Could not get a suggestion.");
    } finally {
      setBusy("");
    }
  }

  async function schedule() {
    const canvas = document
      .querySelector(`[data-message-canvas="${messageId}"]`)
      ?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return setNote("Image not ready yet.");
    if (!accountId) return setNote("Connect a Facebook Page first.");
    if (!when) return setNote("Pick a time, or tap “Let AI pick”.");

    try {
      setBusy("schedule");
      setNote("");
      await schedulePost({
        account_id: accountId,
        image_base64: canvas.toDataURL("image/png"),
        caption,
        post_at_unix: Math.floor(new Date(when).getTime() / 1000),
        reason,
      });
      setNote("Scheduled on Facebook ✓");
    } catch (e: any) {
      setNote(e?.message || "Scheduling failed.");
    } finally {
      setBusy("");
    }
  }

  if (!accounts.length) {
    return (
      <div className="mt-3">
        <button
          onClick={onConnect ?? (() => { window.location.href = "/dashboard/integrations/facebook"; })}
          className={btn}
        >
          <Facebook size={13} />
          Connect a Facebook Page to schedule
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-500">
        Schedule on Facebook
      </div>

      <select
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className="mb-2 w-full rounded-xl border border-black/5 bg-white px-3 py-2 text-xs text-gray-700"
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.page_name}
          </option>
        ))}
      </select>

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={3}
        className="mb-2 w-full resize-none rounded-xl border border-black/5 px-3 py-2 text-xs text-gray-700 outline-none"
        placeholder="Caption"
      />

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="rounded-xl border border-black/5 px-3 py-2 text-xs text-gray-700"
        />
        <button onClick={suggest} disabled={!!busy} className={btn}>
          {busy === "suggest" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          Let AI pick
        </button>
        <button onClick={schedule} disabled={!!busy} className={btn}>
          {busy === "schedule" ? <Loader2 size={13} className="animate-spin" /> : <CalendarClock size={13} />}
          Schedule
        </button>
      </div>

      {reason && <div className="mt-2 text-xs text-violet-600">✦ {reason}</div>}
      {note && <div className="mt-2 text-xs text-gray-500">{note}</div>}
    </div>
  );
}