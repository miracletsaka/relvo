"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Facebook,
  Link2,
  Loader2,
  RefreshCw,
  Unlink,
  X,
} from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

type FacebookPage = {
  id: string;
  facebook_page_id: string;
  name: string;
  category?: string;
  is_selected: boolean;
};

type FacebookStatus = {
  connected: boolean;
  facebook_name?: string;
  facebook_user_id?: string;
  pages: FacebookPage[];
};

type Scheduled = {
  id: string;
  caption: string;
  post_at: string;
  status: string;
  page_name: string;
};

async function call<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    cache: "no-store",
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

const OAUTH_ERRORS: Record<string, string> = {
  denied: "Facebook login was cancelled or denied. Please try again.",
  failed: "Facebook login failed. Please try again.",
};

export default function FacebookIntegrationPage() {
  const [status, setStatus] = useState<FacebookStatus | null>(null);
  const [queue, setQueue] = useState<Scheduled[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function loadQueue() {
    try {
      setQueue(await call<Scheduled[]>("/social/scheduled"));
    } catch {
      setQueue([]); // queue is optional, never block the page
    }
  }

  async function loadStatus() {
    setLoading(true);
    setError("");
    try {
      const data = await call<FacebookStatus>("/facebook/status");

      // Only one Page and none selected: select it automatically
      if (data.connected && data.pages?.length === 1 && !data.pages[0].is_selected) {
        await call(`/facebook/select-page/${data.pages[0].id}`, { method: "POST" });
        data.pages[0].is_selected = true;
      }

      setStatus(data);
      if (data.connected) void loadQueue();
    } catch (e: any) {
      setError(e?.message || "Failed to load Facebook status");
    } finally {
      setLoading(false);
    }
  }

  async function selectPage(pageId: string) {
    setWorking(true);
    setError("");
    try {
      await call(`/facebook/select-page/${pageId}`, { method: "POST" });
      await loadStatus();
    } catch (e: any) {
      setError(e?.message || "Failed to select Facebook page");
    } finally {
      setWorking(false);
    }
  }

  async function disconnect() {
    const ok = window.confirm(
      "Disconnect Facebook? Posts already scheduled on Facebook will stay scheduled there, " +
        "but you will no longer see or cancel them here.",
    );
    if (!ok) return;

    setWorking(true);
    setError("");
    try {
      await call("/facebook/disconnect", { method: "POST" });
      setQueue([]);
      await loadStatus();
    } catch (e: any) {
      setError(e?.message || "Failed to disconnect Facebook");
    } finally {
      setWorking(false);
    }
  }

  async function cancelPost(id: string) {
    setWorking(true);
    setError("");
    try {
      await call(`/social/scheduled/${id}`, { method: "DELETE" });
      await loadQueue();
    } catch (e: any) {
      setError(e?.message || "Failed to cancel the scheduled post");
    } finally {
      setWorking(false);
    }
  }

  useEffect(() => {
    // Error sent back by the backend callback, e.g. ?error=denied
    const code = new URLSearchParams(window.location.search).get("error");
    if (code) {
      setError(OAUTH_ERRORS[code] || "Facebook connection failed.");
      window.history.replaceState({}, "", window.location.pathname);
    }
    void loadStatus();
  }, []);

  const selected = status?.pages?.find((p) => p.is_selected);

  return (
    <div className="min-h-screen bg-[#f4f4f6] px-6 py-10 font-[Inter,sans-serif]">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-black/30">
            Integrations
          </p>

          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-black/5 bg-white shadow-sm">
              <Facebook size={20} className="text-[#1877F2]" />
            </div>
            <div>
              <h1 className="text-[28px] font-extrabold tracking-[-0.04em] text-[#101828]">
                Facebook Pages
              </h1>
              <p className="text-sm text-[#667085]">
                Connect a Facebook account and choose the Page Relvo should publish to.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[#667085]">
              <Loader2 size={16} className="animate-spin text-violet-500" />
              Checking Facebook connection...
            </div>
          ) : status?.connected ? (
            <>
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium text-black/35">Connected as</p>
                  <p className="text-sm font-semibold text-[#344054]">
                    {status.facebook_name || "Facebook user"}
                  </p>
                </div>

                <button
                  onClick={disconnect}
                  disabled={working}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  <Unlink size={13} />
                  Disconnect
                </button>
              </div>

              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#101828]">Available Pages</p>
                  <p className="text-xs text-[#667085]">
                    Select the Page you want to publish generated campaigns to.
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={loadStatus}
                    disabled={working}
                    className="inline-flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-3 py-2 text-xs font-semibold text-[#667085] hover:bg-gray-50"
                  >
                    <RefreshCw size={13} />
                    Refresh
                  </button>
                  {/* Re-run login to grant access to more Pages */}
                  <a
                    href={`${API}/facebook/connect`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-3 py-2 text-xs font-semibold text-[#667085] hover:bg-gray-50"
                  >
                    <Link2 size={13} />
                    Add Pages
                  </a>
                </div>
              </div>

              <div className="space-y-2">
                {status.pages?.length ? (
                  status.pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => selectPage(page.id)}
                      disabled={working}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                        page.is_selected
                          ? "border-violet-200 bg-violet-50"
                          : "border-black/5 bg-gray-50 hover:bg-white"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#344054]">{page.name}</p>
                        <p className="text-xs text-[#98a2b3]">
                          {page.category || "Facebook Page"}
                        </p>
                      </div>
                      {page.is_selected && (
                        <CheckCircle2 size={18} className="text-violet-600" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-black/10 bg-gray-50 p-5 text-sm text-[#667085]">
                    No Facebook Pages were returned. Click “Add Pages”, and when Facebook asks
                    which Pages to allow, tick your Page. You must be an admin of that Page.
                  </div>
                )}
              </div>

              {status.pages?.length > 0 && !selected && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-700">
                  Select a Page above before scheduling posts.
                </div>
              )}

              {/* Scheduled queue */}
              <div className="mt-8">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#101828]">
                  <CalendarClock size={15} className="text-violet-500" />
                  Scheduled posts
                </p>

                {queue.length ? (
                  <div className="space-y-2">
                    {queue.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-black/5 bg-gray-50 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#344054]">
                            {q.caption?.split("\n")[0] || "Campaign post"}
                          </p>
                          <p className="text-xs text-[#98a2b3]">
                            {q.page_name} · {new Date(q.post_at).toLocaleString()} · {q.status}
                          </p>
                        </div>

                        {q.status === "scheduled" && (
                          <button
                            onClick={() => cancelPost(q.id)}
                            disabled={working}
                            title="Cancel"
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#98a2b3]">
                    Nothing scheduled yet. Generate an ad in the AI chat and tap “Schedule”.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="mb-5 text-sm leading-[1.7] text-[#667085]">
                Connect Facebook so Relvo can list your Pages and publish generated campaign
                posts to the selected Page, at the time the AI picks.
              </p>

              <a
                href={`${API}/facebook/connect`}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1877F2] px-5 py-3 text-sm font-semibold text-white hover:bg-[#166fe5]"
              >
                <Link2 size={15} />
                Connect Facebook
              </a>
            </>
          )}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}