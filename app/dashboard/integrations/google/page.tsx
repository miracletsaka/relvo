"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Link2,
  LinkIcon,
  Unlink,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

type GoogleStatus = {
  connected: boolean;
  google_email?: string;
  scopes?: string;
  expires_at?: string;
};

const cardCls = [
  "rounded-2xl bg-white/65 border border-black/[0.07]",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_10px_rgba(0,0,0,0.05)]",
].join(" ");

const labelCls =
  "text-[9px] font-bold uppercase tracking-[0.15em] text-black/30";

function PrimaryBtn({
  children,
  onClick,
  disabled,
  href,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  href?: string;
}) {
  const cls = [
    "inline-flex items-center gap-2 px-5 py-2.5 rounded-[16px]",
    "text-[12px] font-bold cursor-pointer font-[Inter,sans-serif]",
    "border border-[rgba(168,85,247,0.45)] bg-[rgba(168,85,247,0.18)] text-[#5b21b6]",
    "shadow-[0_2px_14px_rgba(168,85,247,0.2),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.08)]",
    "hover:bg-[rgba(168,85,247,0.28)] hover:border-[rgba(168,85,247,0.65)]",
    "hover:shadow-[0_4px_22px_rgba(168,85,247,0.35),inset_0_1px_0_rgba(255,255,255,0.55)] hover:-translate-y-px",
    "active:translate-y-0 transition-all duration-150",
    "disabled:opacity-35 disabled:cursor-not-allowed disabled:transform-none",
  ].join(" ");

  if (href) return <a href={href} className={cls}>{children}</a>;

  return (
    <button onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

function DangerBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center gap-2 px-5 py-2.5 rounded-[16px]",
        "text-[12px] font-bold cursor-pointer font-[Inter,sans-serif]",
        "border border-red-200 bg-red-50 text-red-500",
        "hover:bg-red-100 hover:border-red-300 hover:-translate-y-px",
        "active:translate-y-0 transition-all duration-150",
        "disabled:opacity-35 disabled:cursor-not-allowed disabled:transform-none",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border",
        connected
          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
          : "bg-black/[0.05] text-black/35 border-black/[0.08]",
      ].join(" ")}
    >
      <span
        className={[
          "w-1.5 h-1.5 rounded-full",
          connected ? "bg-emerald-500" : "bg-black/20",
        ].join(" ")}
      />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

function DocCard({
  doc,
  reading,
  onClick,
}: {
  doc: any;
  reading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left p-3.5 rounded-[16px]",
        "bg-white/55 border border-black/[0.06]",
        "hover:bg-white/85 hover:border-black/[0.1]",
        "hover:translate-x-0.5 active:translate-x-0",
        "transition-all duration-150 cursor-pointer",
        "flex items-center gap-3",
      ].join(" ")}
    >
      <div className="w-8 h-8 rounded-[10px] bg-[rgba(124,85,246,0.08)] border border-[rgba(124,85,246,0.18)] flex items-center justify-center flex-shrink-0">
        {reading ? (
          <Loader2 size={14} className="text-[#7c55f6] animate-spin" />
        ) : (
          <FileText size={14} className="text-[#7c55f6]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#1a1a2e] truncate leading-tight">
          {doc.name}
        </p>
        <p className="text-[10.5px] text-black/35 font-medium mt-0.5">
          {reading ? "Summarising document…" : `Modified: ${doc.modifiedTime || "unknown"}`}
        </p>
      </div>

      <ChevronRight size={13} className="text-black/20 flex-shrink-0" />
    </button>
  );
}

export default function GoogleIntegrationPage() {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSummary, setSelectedSummary] = useState<any | null>(null);
  const [readingDocId, setReadingDocId] = useState<string | null>(null);
  const [resummarising, setResummarising] = useState(false);

  async function loadStatus() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/google/status`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) throw new Error(await res.text());

      setStatus(await res.json());
    } catch (e: any) {
      setError(e?.message || "Failed to load Google status");
    } finally {
      setLoading(false);
    }
  }

  async function loadDocs() {
    setDocsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/google-docs/files?page_size=10`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setDocs(data.files || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load Google Docs");
    } finally {
      setDocsLoading(false);
    }
  }

  async function disconnect() {
    setError("");

    try {
      const res = await fetch(`${API}/google/disconnect`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error(await res.text());

      setDocs([]);
      setSelectedSummary(null);
      await loadStatus();
    } catch (e: any) {
      setError(e?.message || "Failed to disconnect Google");
    }
  }

  async function summarizeDoc(fileId: string, force = false) {
    setReadingDocId(fileId);
    setResummarising(force);
    setError("");

    try {
      const res = await fetch(
        `${API}/google-docs/files/${fileId}/summarize${force ? "?force=true" : ""}`,
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        },
      );

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setSelectedSummary(data.summary);
    } catch (e: any) {
      setError(e?.message || "Failed to summarise Google Doc");
    } finally {
      setReadingDocId(null);
      setResummarising(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  return (
    <div className="min-h-screen font-[Inter,sans-serif]" style={{ background: "#f4f4f6" }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(124,85,246,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(124,85,246,0.025) 1px,transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className={`${labelCls} mb-2`}>Integrations</p>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-white/80 border border-black/[0.08] flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-[#7c55f6]" />
            </div>

            <div>
              <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-[#1a1a2e] leading-none">
                Google Docs
              </h1>
              <p className="text-[11px] text-black/35 font-medium mt-0.5">
                Summarise documents and save business knowledge for this organisation
              </p>
            </div>
          </div>
        </div>

        <div className={`${cardCls} mb-5`}>
          <div className="px-5 py-4 border-b border-black/[0.06] bg-white/40 flex items-center justify-between">
            <p className="text-[13px] font-extrabold text-[#1a1a2e] tracking-[-0.01em]">
              Connection Status
            </p>
            {status && <StatusBadge connected={status.connected} />}
          </div>

          <div className="p-5">
            {loading ? (
              <div className="flex items-center gap-2.5 text-[13px] text-black/40 font-medium">
                <Loader2 size={14} className="animate-spin text-[#7c55f6]" />
                Checking connection…
              </div>
            ) : status?.connected ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-[9px] bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                    <LinkIcon size={13} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[11px] text-black/30 font-medium">Connected as</p>
                    <p className="text-[13px] font-bold text-[#1a1a2e]">
                      {status.google_email}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 flex-wrap">
                  <PrimaryBtn onClick={loadDocs} disabled={docsLoading}>
                    {docsLoading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Loading docs…
                      </>
                    ) : (
                      <>
                        <RefreshCw size={13} />
                        List Docs
                      </>
                    )}
                  </PrimaryBtn>

                  <DangerBtn onClick={disconnect}>
                    <Unlink size={13} />
                    Disconnect
                  </DangerBtn>
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] text-black/45 font-medium leading-relaxed mb-4">
                  Connect a Google account so Relvo can summarise selected Google Docs for this organisation.
                </p>

                <PrimaryBtn href={`${API}/google/connect`}>
                  <Link2 size={13} />
                  Connect Google
                </PrimaryBtn>
              </>
            )}

            {error && (
              <div className="mt-4 flex items-start gap-2.5 px-3.5 py-3 rounded-[13px] bg-red-50 border border-red-200">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-px" />
                <p className="text-[12px] text-red-500 font-medium leading-relaxed">
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>

        {docs.length > 0 && (
          <div className={`${cardCls} mb-5`}>
            <div className="px-5 py-4 border-b border-black/[0.06] bg-white/40">
              <p className="text-[13px] font-extrabold text-[#1a1a2e] tracking-[-0.01em]">
                Recent Documents
              </p>
              <p className="text-[10.5px] text-black/30 font-medium mt-0.5">
                {docs.length} document{docs.length !== 1 ? "s" : ""} found — click to summarise
              </p>
            </div>

            <div className="p-3 flex flex-col gap-1.5">
              {docs.map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  reading={readingDocId === doc.id}
                  onClick={() => summarizeDoc(doc.id)}
                />
              ))}
            </div>
          </div>
        )}

        {selectedSummary && (
          <div className={cardCls}>
            <div className="px-5 py-4 border-b border-black/[0.06] bg-white/40 flex items-center justify-between gap-4">
              <div>
                <p className={`${labelCls} mb-0.5`}>AI Document Summary</p>
                <p className="text-[13px] font-extrabold text-[#1a1a2e] tracking-[-0.01em]">
                  {selectedSummary.title || "Untitled document"}
                </p>
                {selectedSummary.summarized_at && (
                  <p className="text-[10.5px] text-black/30 font-medium mt-0.5">
                    Summarised: {new Date(selectedSummary.summarized_at).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedSummary.web_view_link && (
                  <a
                    href={selectedSummary.web_view_link}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-[10px] bg-white/70 border border-black/[0.06] flex items-center justify-center hover:bg-white"
                  >
                    <ExternalLink size={13} className="text-black/35" />
                  </a>
                )}

                <button
                  onClick={() => summarizeDoc(selectedSummary.google_file_id, true)}
                  disabled={resummarising}
                  className="inline-flex items-center gap-2 rounded-[12px] border border-black/[0.06] bg-white/70 px-3 py-2 text-[11px] font-bold text-black/45 hover:bg-white disabled:opacity-40"
                >
                  {resummarising ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  Re-summarise
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-[13px] bg-white/50 border border-black/[0.06] p-4">
                <p className="text-[12.5px] leading-relaxed text-black/60 font-medium">
                  {selectedSummary.summary}
                </p>
              </div>

              {Array.isArray(selectedSummary.key_points) &&
                selectedSummary.key_points.length > 0 && (
                  <div>
                    <p className={`${labelCls} mb-2`}>Key Points</p>
                    <div className="space-y-2">
                      {selectedSummary.key_points.map((point: string, i: number) => (
                        <div
                          key={`${point}-${i}`}
                          className="rounded-[12px] bg-white/55 border border-black/[0.06] px-3 py-2 text-[12px] text-black/55 font-medium"
                        >
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {Array.isArray(selectedSummary.action_items) &&
                selectedSummary.action_items.length > 0 && (
                  <div>
                    <p className={`${labelCls} mb-2`}>Action Items</p>
                    <div className="space-y-2">
                      {selectedSummary.action_items.map((item: string, i: number) => (
                        <div
                          key={`${item}-${i}`}
                          className="rounded-[12px] bg-[rgba(124,85,246,0.06)] border border-[rgba(124,85,246,0.14)] px-3 py-2 text-[12px] text-[#5b21b6] font-medium"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}