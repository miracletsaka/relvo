"use client";
import { uploadFileToSpaces } from "@/lib/upload-client";
/**
 * app/dashboard/org-profile/reviews/page.tsx
 * Re-themed to Relvō dark studio aesthetic.
 * Added: file upload support for all image slots.
 */
import { useEffect, useState, useCallback, useRef } from "react";

const API     = (process.env.NEXT_PUBLIC_API_BASE     || "").replace(/\/$/, "");
const UPLOADS = (process.env.NEXT_PUBLIC_UPLOADS_BASE || `${API}/upload`).replace(/\/$/, "");

// ── API helper ─────────────────────────────────────────────────────────────────
async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res  = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...((opts.headers as any) || {}) },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail || json.message || `Error ${res.status}`);
  return json as T;
}

// ── Types ──────────────────────────────────────────────────────────────────────
type OrgImage  = { id: string; type: string; url: string; caption?: string; sort_order: number };
type ReviewReq = { id: string; email: string; sent_at: string; opened_at?: string; reviewed_at?: string; status: string };

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ msg, onClose }: { msg: { ok: boolean; text: string }; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  const ok = msg.ok;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 18px", borderRadius: 14,
      background: ok ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)",
      border: `1px solid ${ok ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.3)"}`,
      color: ok ? "#34d399" : "#f87171",
      fontSize: 13, fontWeight: 700, fontFamily: "Syne, sans-serif",
      backdropFilter: "blur(12px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      animation: "tfade 0.25s ease",
    }}>
      {ok
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      }
      {msg.text}
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.4, fontSize: 16, lineHeight: 1 }}>✕</button>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = {
    reviewed: { color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)",  label: "✓ Reviewed" },
    opened:   { color: "#60a5fa", bg: "rgba(96,165,250,0.1)",  border: "rgba(96,165,250,0.25)",  label: "↗ Opened"  },
    sent:     { color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", label: "→ Sent" },
  }[status] ?? { color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", label: status };

  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
      fontFamily: "DM Mono, monospace", letterSpacing: "0.06em", whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}

// ── UploadZone — file drag-drop or URL input ───────────────────────────────────
function UploadZone({ onUrl, compact = false }: { onUrl: (url: string) => void; compact?: boolean }) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [tab,     setTab]     = useState<"upload" | "url">("upload");
  const [url,     setUrl]     = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    setProgress(20);
    try {
      // Simulate progress while uploading
      const interval = setInterval(() => setProgress(p => Math.min(p + 15, 85)), 300);
      const publicUrl = await uploadFileToSpaces(file);
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => { setProgress(0); setUploading(false); onUrl(publicUrl); }, 400);
    } catch {
      setUploading(false);
      setProgress(0);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const tabStyle = (active: boolean) => ({
    flex: 1, padding: "6px 0", background: active ? "rgba(124,58,237,0.15)" : "transparent",
    border: `1px solid ${active ? "rgba(124,58,237,0.35)" : "transparent"}`,
    borderRadius: 8, color: active ? "#c4b5fd" : "rgba(255,255,255,0.3)",
    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif",
    transition: "all 0.15s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
        <button style={tabStyle(tab === "upload")} onClick={() => setTab("upload")}>⬆ Upload</button>
        <button style={tabStyle(tab === "url")}    onClick={() => setTab("url")}>🔗 URL</button>
      </div>

      {tab === "upload" ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 12, padding: compact ? "14px 10px" : "22px 10px",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
            background: dragging ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)",
            cursor: uploading ? "wait" : "pointer", transition: "all 0.2s",
          }}
        >
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

          {uploading ? (
            <>
              <div style={{ width: "100%", maxWidth: 120, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#7c3aed,#4f46e5)", borderRadius: 2, transition: "width 0.3s ease" }} />
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "DM Mono, monospace" }}>Uploading…</span>
            </>
          ) : (
            <>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "DM Mono, monospace" }}>
                {dragging ? "Drop to upload" : "Click or drag image"}
              </span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace" }}>PNG, JPG, WEBP · Max 10MB</span>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={url} onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && url.trim()) { onUrl(url.trim()); setUrl(""); } }}
            placeholder="https://…"
            style={{
              flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 10, padding: "9px 12px", color: "#e4e4e7", fontSize: 12,
              outline: "none", fontFamily: "DM Mono, monospace",
            }}
          />
          <button
            onClick={() => { if (url.trim()) { onUrl(url.trim()); setUrl(""); } }}
            disabled={!url.trim()}
            style={{ padding: "9px 14px", background: url.trim() ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${url.trim() ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, color: url.trim() ? "#c4b5fd" : "rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 700, cursor: url.trim() ? "pointer" : "default", fontFamily: "Syne, sans-serif" }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

// ── ImageSlot ──────────────────────────────────────────────────────────────────
function ImageSlot({ type, label, desc, image, onAdd, onRemove }: {
  type: string; label: string; desc: string;
  image?: OrgImage;
  onAdd:    (url: string, caption?: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm]   = useState(false);
  const [caption,  setCaption]    = useState("");
  const [saving,   setSaving]     = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const submit = async (url: string) => {
    setSaving(true);
    try { await onAdd(url, caption.trim() || undefined); setCaption(""); setPendingUrl(null); setShowForm(false); }
    finally { setSaving(false); }
  };

  const handleUrl = (url: string) => {
    if (type === "gallery") { setPendingUrl(url); }
    else { submit(url); }
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
      {/* Preview */}
      <div style={{ position: "relative", height: type === "cover" ? 130 : 90, background: image ? "#000" : "rgba(255,255,255,0.02)", overflow: "hidden" }}>
        {image ? (
          <img src={image.url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
        ) : (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", fontFamily: "DM Mono, monospace", letterSpacing: "0.1em" }}>NO IMAGE</span>
          </div>
        )}
        {image && (
          <button onClick={() => onRemove(image.id)} style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 8, background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.4)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.7)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>

      <div style={{ padding: "14px 16px" }}>
        {label && (
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7", margin: "0 0 3px" }}>{label}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", margin: 0 }}>{desc}</p>
          </div>
        )}

        {!showForm ? (
          <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "rgba(124,58,237,0.08)", border: "1px dashed rgba(124,58,237,0.3)", borderRadius: 9, color: "rgba(167,139,250,0.7)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", transition: "all 0.15s", width: "100%" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.15)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.5)"; (e.currentTarget as HTMLElement).style.color = "#c4b5fd"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.08)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.3)"; (e.currentTarget as HTMLElement).style.color = "rgba(167,139,250,0.7)"; }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {image ? "Replace" : "Add"} Image
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <UploadZone onUrl={handleUrl} compact />

            {/* Caption (gallery only) + pending URL confirm */}
            {type === "gallery" && pendingUrl && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ padding: "8px 10px", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 9, fontSize: 10, color: "#34d399", fontFamily: "DM Mono, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  ✓ {pendingUrl.split("/").pop()}
                </div>
                <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption (optional)"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 9, padding: "8px 12px", color: "#e4e4e7", fontSize: 12, outline: "none", fontFamily: "DM Mono, monospace" }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setPendingUrl(null); setCaption(""); }} style={{ flex: 1, padding: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
                    Back
                  </button>
                  <button onClick={() => submit(pendingUrl)} disabled={saving} style={{ flex: 2, padding: "8px", background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 9, color: "#34d399", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    {saving ? <><span style={{ width: 10, height: 10, border: "1.5px solid rgba(52,211,153,0.3)", borderTopColor: "#34d399", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> Saving…</> : "Save Image"}
                  </button>
                </div>
              </div>
            )}

            {type !== "gallery" && (
              <button onClick={() => setShowForm(false)} style={{ padding: "7px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, color: "rgba(255,255,255,0.25)", fontSize: 11, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
                Cancel
              </button>
            )}

            {type === "gallery" && !pendingUrl && (
              <button onClick={() => setShowForm(false)} style={{ padding: "7px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, color: "rgba(255,255,255,0.25)", fontSize: 11, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────────
function Spin() {
  return <span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />;
}

// ── Input style ────────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px",
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 10, color: "#e4e4e7", fontSize: 13, outline: "none",
  fontFamily: "DM Mono, monospace", transition: "border-color 0.15s, box-shadow 0.15s",
  boxSizing: "border-box",
};

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ReviewsManagerPage() {
  const [images,   setImages]   = useState<OrgImage[]>([]);
  const [requests, setRequests] = useState<ReviewReq[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState<{ ok: boolean; text: string } | null>(null);
  const [reqEmail,   setReqEmail]   = useState("");
  const [reqMessage, setReqMessage] = useState("");
  const [sending,    setSending]    = useState(false);

  const showToast = (ok: boolean, text: string) => setToast({ ok, text });

  const loadAll = useCallback(async () => {
    try {
      const [imgs, reqs] = await Promise.all([
        api<OrgImage[]>("/org-images"),
        api<ReviewReq[]>("/review-requests"),
      ]);
      setImages(imgs);
      setRequests(reqs);
    } catch (e: any) { showToast(false, e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addImage = async (type: string, url: string, caption?: string) => {
    try {
      await api("/org-images", { method: "POST", body: JSON.stringify({ type, url, caption, sort_order: 0 }) });
      await loadAll();
      showToast(true, `${type.charAt(0).toUpperCase() + type.slice(1)} image saved`);
    } catch (e: any) { showToast(false, e.message); }
  };

  const removeImage = async (id: string) => {
    try {
      await api(`/org-images/${id}`, { method: "DELETE" });
      await loadAll();
      showToast(true, "Image removed");
    } catch (e: any) { showToast(false, e.message); }
  };

  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reqEmail)) {
      showToast(false, "Enter a valid email address"); return;
    }
    setSending(true);
    try {
      await api("/review-requests/send", { method: "POST", body: JSON.stringify({ email: reqEmail.trim(), message: reqMessage.trim() || null }) });
      setReqEmail(""); setReqMessage("");
      await loadAll();
      showToast(true, `Review request sent to ${reqEmail}`);
    } catch (e: any) { showToast(false, e.message); }
    finally { setSending(false); }
  };

  const coverImage    = images.find(i => i.type === "cover");
  const profileImage  = images.find(i => i.type === "profile");
  const galleryImages = images.filter(i => i.type === "gallery");

  const reviewed = requests.filter(r => r.status === "reviewed").length;
  const pending  = requests.filter(r => r.status !== "reviewed").length;

  return (
    <div className="w-full"  style={{ minHeight: "100vh",  color: "#e4e4e7", fontFamily: "Syne, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes tfade  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        input:focus, textarea:focus {
          border-color: rgba(124,58,237,0.5) !important;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.1) !important;
        }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #141418 inset !important;
          -webkit-text-fill-color: #e4e4e7 !important;
        }
        .row-hover:hover { background: rgba(255,255,255,0.025) !important; }
        .resend-btn:hover { border-color: rgba(124,58,237,0.4) !important; color: #c4b5fd !important; }
      `}</style>

      <div className="w-full" style={{ margin: "0 auto", padding: "36px 24px" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 36, animation: "fadeUp 0.4s ease both" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(124,58,237,0.7)", fontFamily: "DM Mono, monospace", marginBottom: 8 }}>
            Organisation · Profile
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#e4e4e7", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
            Profile & Reviews
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0, lineHeight: 1.6 }}>
            Manage your public business profile images and collect verified customer reviews.
          </p>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 40, animation: "fadeUp 0.4s ease 0.05s both" }}>
          {[
            { label: "Total Requests",   value: requests.length,      color: "#a78bfa", icon: "📨" },
            { label: "Reviews Received", value: reviewed,             color: "#34d399", icon: "⭐" },
            { label: "Pending",          value: pending,              color: "#fbbf24", icon: "⏳" },
            { label: "Gallery Images",   value: galleryImages.length, color: "#60a5fa", icon: "🖼️" },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: "16px 18px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, animation: `fadeUp 0.4s ease ${0.08 * i}s both` }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: "-0.02em", marginBottom: 3 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Business Images ── */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#e4e4e7", margin: 0 }}>Business Images</h2>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
            <ImageSlot type="cover"   label="Cover Image"   desc="Profile banner · 1200×400px recommended"
              image={coverImage}   onAdd={(u, c) => addImage("cover", u, c)}   onRemove={removeImage} />
            <ImageSlot type="profile" label="Profile Image" desc="Logo or brand photo · 400×400px recommended"
              image={profileImage} onAdd={(u, c) => addImage("profile", u, c)} onRemove={removeImage} />
          </div>

          {/* Gallery */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#e4e4e7", margin: "0 0 4px" }}>Gallery</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", margin: 0 }}>Showcase your work, team, or spaces</p>
              </div>
              {/* Compact add gallery image */}
              <div style={{ minWidth: 220 }}>
                <ImageSlot type="gallery" label="" desc="" onAdd={(u, c) => addImage("gallery", u, c)} onRemove={removeImage} />
              </div>
            </div>

            {galleryImages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>📷</div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", margin: 0 }}>No gallery images yet</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
                {galleryImages.map(img => (
                  <div key={img.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "4/3", background: "rgba(255,255,255,0.04)" }}>
                    <img src={img.url} alt={img.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {img.caption && (
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)", padding: "5px 8px", backdropFilter: "blur(4px)" }}>
                        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "DM Mono, monospace" }}>{img.caption}</p>
                      </div>
                    )}
                    <button onClick={() => removeImage(img.id)}
                      style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: 6, background: "rgba(0,0,0,0.7)", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.5)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.7)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Send Review Requests ── */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#e4e4e7", margin: 0 }}>Request Reviews</h2>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Send form */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "24px" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#e4e4e7", margin: "0 0 6px" }}>Send Review Link</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "0 0 22px", lineHeight: 1.6, fontFamily: "DM Mono, monospace" }}>
                Send a secure, one-time review link to any customer.
              </p>
              <form onSubmit={sendRequest} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", marginBottom: 7 }}>Customer Email *</label>
                  <input type="email" value={reqEmail} onChange={e => setReqEmail(e.target.value)} placeholder="customer@example.com" style={inp} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", marginBottom: 7 }}>Personal Note (optional)</label>
                  <textarea value={reqMessage} onChange={e => setReqMessage(e.target.value)} placeholder="Thank you for choosing us! We'd love your feedback…" rows={3}
                    style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
                </div>
                <button type="submit" disabled={sending}
                  style={{ padding: "12px", background: sending ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", borderRadius: 11, color: sending ? "rgba(255,255,255,0.3)" : "white", fontSize: 13, fontWeight: 800, cursor: sending ? "not-allowed" : "pointer", fontFamily: "Syne, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {sending && <Spin />}
                  {sending ? "Sending…" : "Send Review Request"}
                </button>
              </form>
            </div>

            {/* How it works */}
            <div style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 16, padding: "24px" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#c4b5fd", margin: "0 0 20px" }}>How Verified Reviews Work</p>
              {[
                { n: "1", t: "You send the invite",    d: "Enter the customer's email. We send a personalised review link." },
                { n: "2", t: "They click the link",    d: "A unique, one-time link lands in their inbox. Expires in 48 hours." },
                { n: "3", t: "They leave a review",    d: "Name, star rating, and their experience — tied to their verified email." },
                { n: "4", t: "Verified badge appears", d: "Their review shows a ✓ Verified badge on your public profile." },
              ].map(s => (
                <div key={s.n} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)", color: "#c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                    {s.n}
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7", margin: "0 0 3px" }}>{s.t}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.55, margin: 0, fontFamily: "DM Mono, monospace" }}>{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Requests table ── */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#e4e4e7", margin: 0 }}>Sent Requests</h2>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace" }}>{requests.length} total</span>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 56, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }} />)}
            </div>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>📬</div>
              <p style={{ fontWeight: 700, color: "rgba(255,255,255,0.4)", margin: "0 0 5px" }}>No requests sent yet</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", margin: 0 }}>Send your first review request above.</p>
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
              {requests.map((r, i) => (
                <div key={r.id} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: i < requests.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", transition: "background 0.15s" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: r.status === "reviewed" ? "rgba(52,211,153,0.12)" : r.status === "opened" ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${r.status === "reviewed" ? "rgba(52,211,153,0.25)" : r.status === "opened" ? "rgba(96,165,250,0.25)" : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                    {r.status === "reviewed" ? "✓" : r.status === "opened" ? "👁" : "→"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "0 0 3px" }}>{r.email}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", margin: 0 }}>
                      Sent {new Date(r.sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {r.reviewed_at && ` · Reviewed ${new Date(r.reviewed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                  {r.status !== "reviewed" && (
                    <button className="resend-btn"
                      onClick={async () => {
                        try {
                          await api("/review-requests/send", { method: "POST", body: JSON.stringify({ email: r.email }) });
                          await loadAll();
                          showToast(true, `Resent to ${r.email}`);
                        } catch (e: any) { showToast(false, e.message); }
                      }}
                      style={{ padding: "6px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", flexShrink: 0, transition: "all 0.15s" }}>
                      Resend
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}