"use client";
/**
 * Two exports from this file:
 *
 * 1. ReviewsTab  — drop-in for the org-profile page Reviews tab.
 *    Shows each review's generated card image with:
 *      - Full-width card image preview
 *      - Download button
 *      - Share to WhatsApp, Facebook, Twitter/X, LinkedIn, copy link
 *      - Review text + meta below
 *
 * 2. MobileDesktopGuard — wrap around the editor page.
 *    On screens < 1024px wide shows a full-screen blocker:
 *      - Explains the page needs a desktop
 *      - Back button
 *      - "Send link to yourself" via Email or WhatsApp
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ── Shared design tokens (matches org-profile-page) ──────────────────────────
const C = {
  bg:       "#0c0c0f",
  surface:  "rgba(255,255,255,0.025)",
  border:   "rgba(255,255,255,0.07)",
  borderHi: "rgba(124,58,237,0.45)",
  text:     "#e4e4e7",
  muted:    "rgba(255,255,255,0.35)",
  dim:      "rgba(255,255,255,0.15)",
  accent:   "#a78bfa",
  violet:   "#7c3aed",
  green:    "#34d399",
  red:      "#f87171",
  yellow:   "#fbbf24",
};

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.neuroflowai.co.uk").replace(/\/$/, "");

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...((opts.headers as any) || {}) },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail || json.message || `Error ${res.status}`);
  return json as T;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Review = {
  id:                  string;
  author_name:         string;
  rating:              number;
  body?:               string;
  source?:             string;
  review_date?:        string;
  is_featured:         boolean;
  is_verified:         boolean;
  reviewer_photo_url?: string | null;
  product_image_url?:  string | null;
  card_image_url?:     string | null;
  card_status?:        string;
  created_at?:         string;
};

// ── Minimal shared primitives (matches the page's existing Card/Btn/etc) ──────
function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ fontSize: 13, letterSpacing: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? C.yellow : C.dim }}>★</span>
      ))}
    </span>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: color + "18", border: `1px solid ${color}35`, color, fontFamily: "DM Mono, monospace", letterSpacing: "0.06em" }}>
      {label}
    </span>
  );
}

// ── Copy to clipboard helper ──────────────────────────────────────────────────
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed"; el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  }
}

// ── Share button row ──────────────────────────────────────────────────────────
function ShareRow({
  cardUrl,
  reviewUrl,
  authorName,
  reviewBody,
}: {
  cardUrl: string;
  reviewUrl: string;
  authorName: string;
  reviewBody?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [dlDone, setDlDone] = useState(false);

  const cleanBody = (reviewBody || "").trim();
  const shareText = cleanBody
    ? `Review from ${authorName}: "${cleanBody.slice(0, 140)}${cleanBody.length > 140 ? "…" : ""}"`
    : `Check out this review by ${authorName}!`;

  // Share the public review PAGE, not the raw image URL.
  // The /review/[id] page carries the OG tags so WhatsApp/Facebook can show the card image + review content.
  const text = encodeURIComponent(shareText);
  const url  = encodeURIComponent(reviewUrl);

  const shareLinks = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.549 4.116 1.508 5.849L0 24l6.304-1.488A11.937 11.937 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.88 9.88 0 01-5.031-1.374l-.361-.214-3.742.882.897-3.664-.234-.376A9.848 9.848 0 012.118 12c0-5.449 4.433-9.882 9.882-9.882 5.449 0 9.882 4.433 9.882 9.882 0 5.449-4.433 9.882-9.882 9.882z"/>
        </svg>
      ),
      color: "#25d366",
      href: `https://wa.me/?text=${text}%20${url}`,
    },
    {
      id: "facebook",
      label: "Facebook",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      color: "#1877f2",
      href: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    },
    {
      id: "twitter",
      label: "X",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      color: "#000",
      href: `https://x.com/intent/tweet?text=${text}&url=${url}`,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      color: "#0a66c2",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    },
  ];

  const handleDownload = async () => {
    try {
      const res   = await fetch(cardUrl);
      const blob  = await res.blob();
      const bUrl  = URL.createObjectURL(blob);
      const a     = document.createElement("a");
      a.href      = bUrl;
      a.download  = `review-${authorName.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(bUrl);
      setDlDone(true);
      setTimeout(() => setDlDone(false), 2000);
    } catch {
      window.open(cardUrl, "_blank");
    }
  };

  const handleCopy = async () => {
    const ok = await copyText(reviewUrl);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
      {/* Share platform buttons */}
      {shareLinks.map(s => (
        <a
          key={s.id}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          title={`Share on ${s.label}`}
          style={{
            width: 34, height: 34, borderRadius: 9,
            background: `${s.color}18`,
            border: `1px solid ${s.color}35`,
            color: s.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            textDecoration: "none", transition: "all 0.15s", flexShrink: 0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${s.color}30`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${s.color}18`; }}
        >
          {s.icon}
        </a>
      ))}

      <div style={{ width: 1, height: 22, background: C.border, flexShrink: 0 }} />

      {/* Copy link */}
      <button
        onClick={handleCopy}
        title="Copy review link"
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: copied ? "rgba(52,211,153,0.12)" : C.surface, border: `1px solid ${copied ? "rgba(52,211,153,0.3)" : C.border}`, borderRadius: 9, color: copied ? C.green : C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "DM Mono, monospace", transition: "all 0.15s", whiteSpace: "nowrap" }}>
        {copied
          ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Copied!</>
          : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy link</>
        }
      </button>

      {/* Download */}
      <button
        onClick={handleDownload}
        title="Download card image"
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: dlDone ? "rgba(52,211,153,0.12)" : "rgba(124,58,237,0.12)", border: `1px solid ${dlDone ? "rgba(52,211,153,0.3)" : "rgba(124,58,237,0.25)"}`, borderRadius: 9, color: dlDone ? C.green : C.accent, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "DM Mono, monospace", transition: "all 0.15s", whiteSpace: "nowrap" }}>
        {dlDone
          ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Saved!</>
          : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</>
        }
      </button>
    </div>
  );
}

// ── Review card item ───────────────────────────────────────────────────────────
function ReviewCardItem({
  r, onToggleFeatured, onRemove, i,
}: { r: Review; onToggleFeatured: () => void; onRemove: () => void; i: number }) {
  const [imgExpanded, setImgExpanded] = useState(false);

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${r.is_featured ? "rgba(251,191,36,0.2)" : C.border}`,
        borderRadius: 16, overflow: "hidden",
        animation: `op-fadein 0.3s ease ${i * 0.04}s both`,
        boxShadow: r.is_featured ? "0 0 0 1px rgba(251,191,36,0.08)" : "none",
      }}
    >
      {/* Generated card image — full width */}
      {r.card_image_url && (
        <div style={{ position: "relative", background: "#0a0a12" }}>
          <img
            src={r.card_image_url}
            alt={`Review card by ${r.author_name}`}
            onClick={() => setImgExpanded(true)}
            style={{
              width: "100%", display: "block",
              maxHeight: imgExpanded ? "none" : 220,
              objectFit: imgExpanded ? "contain" : "cover",
              objectPosition: "top",
              cursor: "zoom-in",
              transition: "max-height 0.3s ease",
            }}
          />
          {/* Expand/collapse button */}
          <button
            onClick={() => setImgExpanded(v => !v)}
            style={{ position: "absolute", bottom: 8, right: 8, padding: "4px 10px", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "DM Mono, monospace", backdropFilter: "blur(4px)" }}>
            {imgExpanded ? "↑ Collapse" : "↓ Expand"}
          </button>

          {/* Card status badge */}
          {r.card_status && (
            <div style={{ position: "absolute", top: 8, left: 8, padding: "3px 9px", background: r.card_status === "generated" ? "rgba(52,211,153,0.85)" : "rgba(251,191,36,0.85)", borderRadius: 6, fontSize: 9, fontWeight: 800, color: "#000", fontFamily: "DM Mono, monospace", backdropFilter: "blur(4px)" }}>
              {r.card_status === "generated" ? "✓ CARD READY" : r.card_status === "pending" ? "⏳ GENERATING" : "✗ FAILED"}
            </div>
          )}
        </div>
      )}

      {/* Placeholder when no card yet */}
      {!r.card_image_url && (
        <div style={{ padding: "14px 18px 0", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ padding: "5px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 10, color: C.dim, fontFamily: "DM Mono, monospace" }}>
            No card image — submitted without photo upload
          </div>
        </div>
      )}

      {/* Review meta */}
      <div style={{ padding: "14px 18px 16px" }}>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: r.body ? 10 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>

            {/* Reviewer photo avatar */}
            {r.reviewer_photo_url ? (
              <img src={r.reviewer_photo_url} alt={r.author_name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1.5px solid ${C.border}` }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `hsl(${r.author_name.charCodeAt(0) * 17 % 360},45%,25%)`, border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: `hsl(${r.author_name.charCodeAt(0) * 17 % 360},55%,65%)`, flexShrink: 0 }}>
                {r.author_name.charAt(0).toUpperCase()}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.author_name}</span>
                {r.is_featured && <Badge label="Featured" color={C.yellow} />}
                {r.is_verified && <Badge label="✓ Verified" color={C.green} />}
                {r.source && <Badge label={r.source} color={C.accent} />}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Stars rating={r.rating} />
                {r.created_at && (
                  <span style={{ fontSize: 9, color: C.dim, fontFamily: "DM Mono, monospace" }}>
                    {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              onClick={onToggleFeatured}
              style={{ padding: "5px 11px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHi; (e.currentTarget as HTMLElement).style.color = C.accent; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.color = C.muted; }}>
              {r.is_featured ? "Unfeature" : "Feature"}
            </button>
            <button
              onClick={onRemove}
              style={{ padding: "5px 11px", background: "transparent", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, color: C.red, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.08)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              Remove
            </button>
          </div>
        </div>

        {/* Review body */}
        {r.body && (
          <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px", lineHeight: 1.7, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            "{r.body}"
          </p>
        )}

        {/* Share row — only if card image exists */}
        {r.card_image_url && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.dim, fontFamily: "DM Mono, monospace", marginBottom: 6 }}>
              Share this review
            </div>
            <ShareRow
              cardUrl={r.card_image_url}
              reviewUrl={`${APP_URL}/review/${r.id}`}
              authorName={r.author_name}
              reviewBody={r.body}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 1: ReviewsTab
// ─────────────────────────────────────────────────────────────────────────────
export function ReviewsTabMore({ toast }: { toast: (ok: boolean, msg: string) => void }) {
  const [items,    setItems]    = useState<Review[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ author_name: "", rating: "5", body: "", source: "", review_date: "", is_featured: false });
  const [adding,   setAdding]   = useState(false);
  const [filter,   setFilter]   = useState<"all" | "with-card" | "verified" | "featured">("all");

  const SOURCES = ["Google","Trustpilot","Facebook","Yelp","Clutch","G2","Capterra","Other"];

  const load = useCallback(async () => {
    try { setItems(await api<Review[]>("/org-profile/reviews")); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);


  const remove = async (id: string) => {
    try { await api(`/org-profile/reviews/${id}`, { method: "DELETE" }); await load(); toast(true, "Removed"); }
    catch (e: any) { toast(false, e.message); }
  };

  const toggleFeatured = async (item: Review) => {
    try { await api(`/org-profile/reviews/${item.id}`, { method: "PATCH", body: JSON.stringify({ is_featured: !item.is_featured }) }); await load(); }
    catch (e: any) { toast(false, e.message); }
  };

  // Filter
  const filtered = items.filter(r => {
    if (filter === "with-card") return !!r.card_image_url;
    if (filter === "verified")  return r.is_verified;
    if (filter === "featured")  return r.is_featured;
    return true;
  });

  const cardsCount    = items.filter(r => !!r.card_image_url).length;
  const verifiedCount = items.filter(r => r.is_verified).length;

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[1,2,3].map(i => <div key={i} style={{ height: 280, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }} />)}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, fontFamily: "Syne, sans-serif" }}>Reviews</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, fontFamily: "DM Mono, monospace" }}>
            {items.length} total · {cardsCount} with card · {verifiedCount} verified
          </div>
        </div>
      </div>

      {/* Filter chips */}
      {items.length > 0 && (
        <div style={{ display: "flex", gap: 7, marginBottom: 18, flexWrap: "wrap" }}>
          {([
            { id: "all",       label: `All (${items.length})` },
            { id: "with-card", label: `With Card (${cardsCount})` },
            { id: "verified",  label: `Verified (${verifiedCount})` },
            { id: "featured",  label: `Featured (${items.filter(r => r.is_featured).length})` },
          ] as { id: typeof filter; label: string }[]).map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ padding: "5px 13px", borderRadius: 20, border: `1px solid ${filter === f.id ? "rgba(167,139,250,0.5)" : C.border}`, background: filter === f.id ? "rgba(124,58,237,0.15)" : "transparent", color: filter === f.id ? C.accent : C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "DM Mono, monospace", transition: "all 0.15s" }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.4 }}>⭐</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, fontFamily: "Syne, sans-serif" }}>
            {filter === "all" ? "No reviews yet" : `No ${filter.replace("-", " ")} reviews`}
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 4, fontFamily: "DM Mono, monospace" }}>
            {filter === "all" ? "Send review requests to customers to collect verified reviews" : "Try a different filter"}
          </div>
        </div>
      )}

      {/* Review list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map((r, i) => (
          <ReviewCardItem
            key={r.id}
            r={r}
            i={i}
            onToggleFeatured={() => toggleFeatured(r)}
            onRemove={() => remove(r.id)}
          />
        ))}
      </div>

      <style>{`
        @keyframes op-fadein { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes op-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Shared input styles ───────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: `1px solid ${C.border}`,
  borderRadius: 10, padding: "10px 13px",
  color: C.text, fontSize: 12,
  fontFamily: "DM Mono, monospace", outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
};
function focusIn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = "rgba(124,58,237,0.5)";
  e.target.style.boxShadow   = "0 0 0 3px rgba(124,58,237,0.1)";
}
function blurIn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = "rgba(255,255,255,0.07)";
  e.target.style.boxShadow   = "none";
}


// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 2: MobileDesktopGuard
// Wrap the editor page with this. Shows a full-screen blocker on screens < 1024px.
// ─────────────────────────────────────────────────────────────────────────────

type MobileGuardProps = {
  children: React.ReactNode;
  /** The full URL of the editor page (defaults to window.location.href) */
  pageUrl?: string;
  /** Page title shown in the blocker */
  pageTitle?: string;
};

export function MobileDesktopGuard({ children, pageUrl, pageTitle = "Design Studio" }: MobileGuardProps) {
  const [isSmall,  setIsSmall]  = useState(false);
  const [checked,  setChecked]  = useState(false);

  useEffect(() => {
    const check = () => {
      setIsSmall(window.innerWidth < 1024);
      setChecked(true);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!checked) return null; // avoid flash during SSR hydration
  if (!isSmall)  return <>{children}</>;

  return <MobileBlocker pageUrl={pageUrl || (typeof window !== "undefined" ? window.location.href : "")} pageTitle={pageTitle} />;
}

// ── Mobile blocker screen ─────────────────────────────────────────────────────
function MobileBlocker({ pageUrl, pageTitle }: { pageUrl: string; pageTitle: string }) {
  const [sendMethod, setSendMethod] = useState<"email" | "whatsapp" | null>(null);
  const [contact,    setContact]    = useState("");
  const [sending,    setSending]    = useState(false);
  const [sent,       setSent]       = useState(false);
  const [copyDone,   setCopyDone]   = useState(false);

  const handleSend = async () => {
    if (!contact.trim()) return;
    setSending(true);

    if (sendMethod === "whatsapp") {
      const msg = encodeURIComponent(`Here's your NeuroFlow editor link — open on your desktop:\n\n${pageUrl}`);
      // If it looks like a number, use wa.me; otherwise treat as WhatsApp link
      const num = contact.replace(/\D/g, "");
      window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
      setSent(true);
    } else {
      // Email — use mailto as fallback (real implementation would call an API)
      const subject = encodeURIComponent(`Your NeuroFlow ${pageTitle} link`);
      const body    = encodeURIComponent(`Here's your link — open it on a desktop computer:\n\n${pageUrl}`);
      window.open(`mailto:${contact}?subject=${subject}&body=${body}`, "_blank");
      setSent(true);
    }

    setSending(false);
  };

  const handleCopyLink = async () => {
    const ok = await copyText(pageUrl);
    if (ok) { setCopyDone(true); setTimeout(() => setCopyDone(false), 2500); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07070d; overflow: hidden; }
        @keyframes mb-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes mb-fade  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{ position: "fixed", inset: 0, background: "#07070d", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 24px", fontFamily: "'Syne', sans-serif", zIndex: 99999, overflowY: "auto" }}>

        {/* Ambient glow */}
        <div style={{ position: "fixed", top: "10%", left: "50%", transform: "translateX(-50%)", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 380, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 0, position: "relative", zIndex: 1 }}>

          {/* Animated icon */}
          <div style={{ fontSize: 56, marginBottom: 24, animation: "mb-float 3s ease-in-out infinite", userSelect: "none" }}>🖥️</div>

          {/* Heading */}
          <div style={{ textAlign: "center", marginBottom: 28, animation: "mb-fade 0.5s ease both" }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.8px", lineHeight: 1.15, marginBottom: 12 }}>
              Desktop only
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>
              <strong style={{ color: "rgba(167,139,250,0.85)" }}>{pageTitle}</strong> requires a full desktop screen to work properly. The editor is too complex for mobile or tablet devices.
            </p>
          </div>

          {/* Requirements strip */}
          <div style={{ width: "100%", padding: "14px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, marginBottom: 28, animation: "mb-fade 0.5s 0.1s ease both" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", marginBottom: 10 }}>REQUIRES</div>
            {[
              { icon: "🖥️", text: "Desktop or laptop computer" },
              { icon: "📐", text: "Screen width of 1024px or wider" },
              { icon: "🖱️", text: "Mouse or trackpad for precision editing" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Send link section */}
          {!sent ? (
            <div style={{ width: "100%", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 16, padding: "18px", marginBottom: 20, animation: "mb-fade 0.5s 0.2s ease both" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,139,250,0.85)", marginBottom: 4 }}>📨 Send this link to yourself</div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.6, marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>
                Open it on your PC or laptop to continue editing.
              </p>

              {/* Method selector */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {([
                  { id: "email",    label: "📧 Email",    placeholder: "you@email.com" },
                  { id: "whatsapp", label: "💬 WhatsApp", placeholder: "+265 991 234567" },
                ] as { id: "email" | "whatsapp"; label: string; placeholder: string }[]).map(m => (
                  <button key={m.id} onClick={() => { setSendMethod(m.id); setContact(""); }}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1.5px solid ${sendMethod === m.id ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.08)"}`, background: sendMethod === m.id ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.03)", color: sendMethod === m.id ? "#a78bfa" : "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", transition: "all 0.15s" }}>
                    {m.label}
                  </button>
                ))}
              </div>

              {sendMethod && (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type={sendMethod === "email" ? "email" : "tel"}
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder={sendMethod === "email" ? "your@email.com" : "+265 991 234567"}
                    autoFocus
                    style={{ flex: 1, padding: "10px 13px", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#f1f5f9", fontSize: 13, fontFamily: "DM Mono, monospace", outline: "none", transition: "border-color 0.15s" }}
                    onFocus={e => { e.target.style.borderColor = "rgba(167,139,250,0.6)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  />
                  <button onClick={handleSend} disabled={!contact.trim() || sending}
                    style={{ padding: "10px 16px", background: !contact.trim() ? "rgba(255,255,255,0.04)" : "rgba(124,58,237,0.85)", border: "none", borderRadius: 10, color: !contact.trim() ? "rgba(255,255,255,0.2)" : "#fff", fontSize: 12, fontWeight: 700, cursor: !contact.trim() ? "not-allowed" : "pointer", fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap", transition: "all 0.15s" }}>
                    {sending ? "…" : "Send"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ width: "100%", padding: "16px 18px", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 14, marginBottom: 20, textAlign: "center", animation: "mb-fade 0.3s ease" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>✅</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>Link sent!</div>
              <div style={{ fontSize: 11, color: "rgba(52,211,153,0.6)", marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>Open it on your desktop to continue.</div>
            </div>
          )}

          {/* Copy link button */}
          <button onClick={handleCopyLink}
            style={{ width: "100%", padding: "12px", background: copyDone ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${copyDone ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, color: copyDone ? "#34d399" : "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s", marginBottom: 14, animation: "mb-fade 0.5s 0.3s ease both" }}>
            {copyDone
              ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Link Copied!</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy Page Link</>
            }
          </button>

          {/* Back button */}
          <button
            onClick={() => window.location.href = "/dashboard/create"}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 22px", background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", transition: "all 0.15s", animation: "mb-fade 0.5s 0.35s ease both" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Go Back
          </button>

        </div>
      </div>
    </>
  );
}