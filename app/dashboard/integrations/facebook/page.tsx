"use client";

import { useEffect, useState } from "react";
import {
  Facebook,
  Link2,
  Loader2,
  RefreshCw,
  Unlink,
  CheckCircle2,
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

export default function FacebookIntegrationPage() {
  const [status, setStatus] = useState<FacebookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function loadStatus() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/facebook/status`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) throw new Error(await res.text());

      setStatus(await res.json());
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
      const res = await fetch(`${API}/facebook/select-page/${pageId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error(await res.text());

      await loadStatus();
    } catch (e: any) {
      setError(e?.message || "Failed to select Facebook page");
    } finally {
      setWorking(false);
    }
  }

  async function disconnect() {
    setWorking(true);
    setError("");

    try {
      const res = await fetch(`${API}/facebook/disconnect`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error(await res.text());

      await loadStatus();
    } catch (e: any) {
      setError(e?.message || "Failed to disconnect Facebook");
    } finally {
      setWorking(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

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
                  <p className="text-[11px] font-medium text-black/35">
                    Connected as
                  </p>
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

              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#101828]">
                    Available Pages
                  </p>
                  <p className="text-xs text-[#667085]">
                    Select the Page you want to publish generated campaigns to.
                  </p>
                </div>

                <button
                  onClick={loadStatus}
                  disabled={working}
                  className="inline-flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-3 py-2 text-xs font-semibold text-[#667085] hover:bg-gray-50"
                >
                  <RefreshCw size={13} />
                  Refresh
                </button>
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
                        <p className="text-sm font-semibold text-[#344054]">
                          {page.name}
                        </p>
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
                    No Facebook Pages were returned. Make sure your Facebook account manages at least one Page and the app has Page permissions.
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="mb-5 text-sm leading-[1.7] text-[#667085]">
                Connect Facebook so Relvo can list your Pages and later publish generated campaign posts directly to the selected Page.
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