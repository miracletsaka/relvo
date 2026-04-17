"use client";
/**
 * app/biz/[slug]/page.tsx
 * Public business profile — no login required.
 * URL: /biz/{slug}
 */

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail?.message || json.detail || json.message || `Error ${res.status}`);
  return json as T;
}

type BizInfo = {
  business_type?: string;
  founded_year?: number;
  company_size?: string;
  website?: string;
  address?: string;
  tagline?: string;
  description?: string;

  email_primary?: string;
  email_support?: string;
  phone_primary?: string;
  phone_secondary?: string;
  whatsapp?: string;

  country?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  map_url?: string;

  facebook_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  tiktok_url?: string;
  youtube_url?: string;

  registration_no?: string;
  vat_number?: string;
};
type Review = {
  id:                  string;
  author_name:         string;
  rating:              number;
  body?:               string;
  source?:             string;
  is_featured:         boolean;
  is_verified:         boolean;
  created_at:          string;
  // NEW fields
  reviewer_photo_url?: string;
  product_image_url?:  string;
  card_image_url?:     string;    // generated review card
  card_status?:        string;    // 'pending' | 'generated' | 'failed'
};
 
type Sponsor    = { id: string; name: string; logo_url?: string; website?: string };
type Accredi    = { id: string; name: string; issuer?: string; year?: number; logo_url?: string };
type Offer      = { id: string; title: string; description?: string; cta_text?: string; cta_url?: string; expires_at?: string };
type Goal       = { id: string; label: string };
type OrgImage   = { id: string; type: string; url: string; caption?: string };
type RatingSumm = { average: number | null; total_reviews: number; verified_count: number };
type Profile    = {
  org: { id: string; name: string; slug: string };
  business_info: BizInfo | null;
  cover_image: OrgImage | null;
  profile_image: OrgImage | null;
  gallery: OrgImage[];
  rating_summary: RatingSumm;
  reviews: Review[];
  sponsors: Sponsor[];
  accreditations: Accredi[];
  offers: Offer[];
  campaign_goals: Goal[];
};

function cleanUrl(url?: string) {
  if (!url) return "";
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function makeWebsiteHref(url?: string) {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function joinLocationParts(...parts: Array<string | number | undefined | null>) {
  return parts.filter(Boolean).join(", ");
}

// ── Stars ─────────────────────────────────────────────────────────────────────
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? "#f59e0b" : "none"}
          stroke={i <= Math.round(rating) ? "#f59e0b" : "#d1d5db"}
          strokeWidth="1.5">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </span>
  );
}

// ── Rating bar ────────────────────────────────────────────────────────────────
function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: "#9ca3af", width: 8 }}>{star}</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
      <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 99 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#f59e0b", borderRadius: 99, transition: "width 1s cubic-bezier(0.16,1,0.3,1)" }} />
      </div>
      <span style={{ fontSize: 11, color: "#d1d5db", width: 20, textAlign: "right" }}>{count}</span>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const hue = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `hsl(${hue},45%,92%)`, border: `1.5px solid hsl(${hue},45%,80%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.42, fontWeight: 700, color: `hsl(${hue},45%,40%)`, flexShrink: 0 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Sec({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} style={{ marginBottom: 64 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.3px" }}>{title}</h2>
        <div style={{ flex: 1, height: 1, background: "#f3f4f6" }} />
      </div>
      {children}
    </section>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Sk({ w = "100%", h = 16, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "#f3f4f6", animation: "sk 1.4s ease-in-out infinite alternate" }} />;
}

// ── Email step ────────────────────────────────────────────────────────────────
function ReviewEmailStep({ slug, orgName, onSent }: { slug: string; orgName: string; onSent: () => void }) {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState<string | null>(null);
  const [done, setDone]       = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("Please enter a valid email address"); return;
    }
    setLoading(true); setErr(null);
    try {
      await apiFetch(`/public/biz/${slug}/request-review`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setDone(true);
    } catch (ex: any) {
      const code = ex.message?.includes("ALREADY_REVIEWED") ? "already" : null;
      setErr(code === "already" ? "You've already reviewed this business. Thank you!" : ex.message);
    } finally { setLoading(false); }
  };

  if (done) return (
    <div style={{ textAlign: "center", padding: "32px 0" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>✓</div>
      <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Check your inbox</p>
      <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>We sent a review link to <strong>{email}</strong>.<br/>It expires in 48 hours.</p>
    </div>
  );

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, margin: 0 }}>
        Enter your email to receive a secure, one-time review link. One review per email address.
      </p>
      <input
        type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        style={{ padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none", color: "#111827", fontFamily: "inherit", transition: "border-color 0.15s" }}
        onFocus={e => { e.target.style.borderColor = "#6366f1"; }}
        onBlur={e => { e.target.style.borderColor = "#e5e7eb"; }}
      />
      {err && <p style={{ margin: 0, fontSize: 13, color: "#dc2626" }}>{err}</p>}
      <button type="submit" disabled={loading}
        style={{ padding: "12px", background: loading ? "#e5e7eb" : "#111827", border: "none", borderRadius: 10, color: loading ? "#9ca3af" : "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {loading && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
        {loading ? "Sending…" : "Send Review Link"}
      </button>
    </form>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BizProfilePage() {
  const params = useParams();
  const slug   = params?.slug as string;
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId");

  const [draftPreview, setDraftPreview] = useState<any | null>(null);
  const [draftPanelOpen, setDraftPanelOpen] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);

  const [data,     setData]     = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    apiFetch<Profile>(`/public/biz/${slug}`)
      .then(setData)
      .catch(e => { if (e.message.includes("404") || e.message.toLowerCase().includes("not found")) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [slug]);


  useEffect(() => {
  if (!draftId) {
    setDraftPreview(null);
    setDraftPanelOpen(false);
    return;
  }

  setDraftLoading(true);

  apiFetch<any>(`/content/draft/${draftId}`)
    .then((data) => {
      setDraftPreview(data);
      setDraftPanelOpen(true);
    })
    .catch(() => {
      setDraftPreview(null);
      setDraftPanelOpen(false);
    })
    .finally(() => setDraftLoading(false));
}, [draftId]);

  const biz  = data?.business_info;
  const rs   = data?.rating_summary;
  const dist = [5,4,3,2,1].map(s => ({ star: s, count: data?.reviews.filter(r => Math.round(r.rating) === s).length ?? 0 }));
  const fullLocation = joinLocationParts(
  biz?.city,
  biz?.state_province,
  biz?.country
);

const fullAddress = joinLocationParts(
  biz?.address,
  biz?.city,
  biz?.state_province,
  biz?.postal_code,
  biz?.country
);

const socialLinks = [
  { label: "Facebook", url: biz?.facebook_url },
  { label: "Instagram", url: biz?.instagram_url },
  { label: "LinkedIn", url: biz?.linkedin_url },
  { label: "Twitter", url: biz?.twitter_url },
  { label: "TikTok", url: biz?.tiktok_url },
  { label: "YouTube", url: biz?.youtube_url },
].filter(x => !!x.url);

  if (notFound) return (
    <div style={{ minHeight: "100vh", background: "#fafaf8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Instrument Sans', sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 48, margin: "0 0 16px" }}>🔍</p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Page not found</h1>
        <p style={{ color: "#6b7280" }}>This business profile doesn't exist or has been removed.</p>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600;700&family=DM+Mono&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fafaf8; }
        @keyframes sk   { from { opacity:.6 } to { opacity:1 } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }
        .fade-up  { animation: fadeUp  0.5s ease both; }
        .scale-in { animation: scaleIn 0.4s ease both; }
        .hover-lift { transition: transform 0.2s, box-shadow 0.2s; }
        .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.1) !important; }
        .gallery-img { cursor: zoom-in; transition: transform 0.3s, box-shadow 0.3s; }
        .gallery-img:hover { transform: scale(1.02); box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
      `}</style>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={lightbox} alt="" style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 12 }} />
          <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 24, right: 28, background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", width: 40, height: 40, borderRadius: "50%", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
      )}

      <div style={{ fontFamily: "'Instrument Sans', sans-serif", minHeight: "100vh", background: "#fafaf8" }}>

        {/* ── Hero / Cover ── */}
        <div style={{ position: "relative", height: loading ? 280 : data?.cover_image ? 360 : 240, background: data?.cover_image ? "#000" : "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", overflow: "hidden" }}>
          {data?.cover_image && (
            <img src={data.cover_image.url} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.75 }} />
          )}
          {!data?.cover_image && !loading && (
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 20% 50%, rgba(99,102,241,0.3) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(167,139,250,0.2) 0%, transparent 50%)" }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
        </div>

        {/* ── Profile header ── */}
        <div  style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
          <div  style={{ display: "flex", alignItems: "flex-end", gap: 20, marginTop: -56, marginBottom: 32, flexWrap: "wrap" }}>
            {/* Profile image */}
            <div className="z-50" style={{ width: 112, height: 112, borderRadius: 20, border: "4px solid #fafaf8", overflow: "hidden", background: "#e5e7eb", flexShrink: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
              {loading ? (
                <div style={{ width: "100%", height: "100%", background: "#e5e7eb" }} />
              ) : data?.profile_image ? (
                <img src={data.profile_image.url} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #6366f1, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, fontWeight: 800, color: "#fff" }}>
                  {data?.org.name?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>

            {/* email */}

            <div style={{ flex: 1, paddingBottom: 8, minWidth: 200 }}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Sk w={220} h={32} r={8} />
                  <Sk w={160} h={18} />
                </div>
              ) : (
                <div className="fade-up">
                  {biz?.business_type && (
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6366f1", fontFamily: "DM Mono, monospace", display: "block", marginBottom: 6 }}>
                      {biz.business_type}
                    </span>
                  )}
                  <h1 style={{ fontSize: 30, fontWeight: 700, color: "#111827", letterSpacing: "-0.5px", lineHeight: 1.15, marginBottom: 4 }}>
                    {data?.org.name}
                  </h1>
                  {biz?.tagline && (
                    <p style={{ fontSize: 15, color: "#6b7280", fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}>
                      {biz.tagline}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Rating pill */}
            {!loading && rs && rs.total_reviews > 0 && (
              <a href="#reviews" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 40, textDecoration: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", transition: "box-shadow 0.2s", marginBottom: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-0.5px" }}>{rs.average}</span>
                <div>
                  <Stars rating={rs.average || 0} size={13} />
                  <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{rs.total_reviews} review{rs.total_reviews !== 1 ? "s" : ""}</p>
                </div>
              </a>
            )}
          </div>

          {/* ── Meta strip ── */}
          {/* ── Meta strip ── */}
          {/* ── Meta strip ── */}
          {!loading && biz && (
            <div
              className="fade-up"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 20,
                marginBottom: 48,
                paddingBottom: 32,
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              {biz.website && (
                <a
                  href={makeWebsiteHref(biz.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#6b7280", textDecoration: "none" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z" />
                  </svg>
                  {cleanUrl(biz.website)}
                </a>
              )}

              {fullLocation && (
                <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#6b7280" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {fullLocation}
                </span>
              )}

              {biz.founded_year && (
                <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#6b7280" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Est. {biz.founded_year}
                </span>
              )}

              {biz.company_size && (
                <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#6b7280" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {biz.company_size}
                </span>
              )}

              {biz.phone_primary && (
                <a
                  href={`tel:${biz.phone_primary}`}
                  style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#6b7280", textDecoration: "none" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.61 2.61a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6.09 6.09l1.47-1.22a2 2 0 0 1 2.11-.45c.84.28 1.71.49 2.61.61A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {biz.phone_primary}
                </a>
              )}
              {biz.email_primary && (
                <a
                  href={`mailto:${biz.email_primary}`}
                  style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#6b7280", textDecoration: "none" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 4h16v16H4z" />
                    <path d="M22 6l-10 7L2 6" />
                  </svg>
                  {biz.email_primary}
                </a>
              )}
            </div>
          )}

          {/* ── About ── */}
          {!loading && biz?.description && (
            <Sec title="About">
              <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.8, maxWidth: 680 }}>{biz.description}</p>
            </Sec>
          )}

          {/* ── Business Information ── */}
          {!loading && biz && (
            <Sec title="Business Information">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 14,
                }}
              >
                {[
                  biz.business_type ? { label: "Business Type", value: biz.business_type } : null,
                  biz.founded_year ? { label: "Founded Year", value: String(biz.founded_year) } : null,
                  biz.company_size ? { label: "Company Size", value: biz.company_size } : null,
                  biz.registration_no ? { label: "Registration No.", value: biz.registration_no } : null,
                  biz.vat_number ? { label: "VAT Number", value: biz.vat_number } : null,
                  biz.phone_primary ? { label: "Primary Phone", value: biz.phone_primary, href: `tel:${biz.phone_primary}` } : null,
                  biz.phone_secondary ? { label: "Secondary Phone", value: biz.phone_secondary, href: `tel:${biz.phone_secondary}` } : null,
                  biz.whatsapp ? { label: "WhatsApp", value: biz.whatsapp, href: `https://wa.me/${biz.whatsapp.replace(/[^\d]/g, "")}` } : null,
                  biz.email_primary ? { label: "Primary Email", value: biz.email_primary, href: `mailto:${biz.email_primary}` } : null,
                  biz.email_support ? { label: "Support Email", value: biz.email_support, href: `mailto:${biz.email_support}` } : null,
                  biz.website ? { label: "Website", value: cleanUrl(biz.website), href: makeWebsiteHref(biz.website) } : null,
                  fullAddress ? { label: "Address", value: fullAddress } : null,
                ]
                  .filter(Boolean)
                  .map((item: any) => (
                    <div
                      key={item.label}
                      style={{
                        background: "#fff",
                        border: "1px solid #f3f4f6",
                        borderRadius: 16,
                        padding: "16px 18px",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#9ca3af",
                          marginBottom: 8,
                          fontFamily: "DM Mono, monospace",
                        }}
                      >
                        {item.label}
                      </p>

                      {item.href ? (
                        <a
                          href={item.href}
                          target={item.href.startsWith("http") ? "_blank" : undefined}
                          rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#111827",
                            textDecoration: "none",
                            wordBreak: "break-word",
                          }}
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#111827",
                            lineHeight: 1.6,
                            wordBreak: "break-word",
                          }}
                        >
                          {item.value}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </Sec>
          )}

          {/* ── Location & Socials ── */}
          {!loading && biz && (fullAddress || biz.map_url || socialLinks.length > 0) && (
            <Sec title="Location & Socials">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 0.8fr",
                  gap: 18,
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #f3f4f6",
                    borderRadius: 18,
                    padding: "22px",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 10 }}>Visit us</p>

                  {fullAddress && (
                    <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.75, marginBottom: 14 }}>
                      {fullAddress}
                    </p>
                  )}

                  {biz.map_url && (
                    <a
                      href={biz.map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        padding: "10px 16px",
                        background: "#111827",
                        color: "#fff",
                        borderRadius: 999,
                        textDecoration: "none",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      Open Map →
                    </a>
                  )}
                </div>

                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #f3f4f6",
                    borderRadius: 18,
                    padding: "22px",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Connect with us</p>

                  {socialLinks.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#9ca3af" }}>No social links added yet.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {socialLinks.map((item) => (
                        <a
                          key={item.label}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "10px 12px",
                            border: "1px solid #f3f4f6",
                            borderRadius: 12,
                            textDecoration: "none",
                            color: "#374151",
                            fontSize: 13,
                            fontWeight: 600,
                            background: "#fafaf8",
                          }}
                        >
                          <span>{item.label}</span>
                          <span style={{ color: "#9ca3af", fontWeight: 500 }}>{cleanUrl(item.url)}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Sec>
          )}

          {/* ── Gallery ── */}
          {!loading && data?.gallery && data.gallery.length > 0 && (
            <Sec title="Gallery">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {data.gallery.map((img, i) => (
                  <div key={img.id} className="gallery-img scale-in" style={{ animationDelay: `${i * 0.06}s`, borderRadius: 14, overflow: "hidden", aspectRatio: "4/3", background: "#f3f4f6" }}
                    onClick={() => setLightbox(img.url)}>
                    <img src={img.url} alt={img.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            </Sec>
          )}

          {/* ── Offers ── */}
          {!loading && data?.offers && data?.offers.length > 0 && (
            <Sec title="Current Offers">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
                {data!.offers.map((offer, i) => (
                  <div key={offer.id} className="hover-lift scale-in" style={{ animationDelay: `${i * 0.06}s`, background: "#fff", border: "1px solid #f3f4f6", borderRadius: 16, padding: "22px 22px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8, lineHeight: 1.3 }}>{offer.title}</p>
                    {offer.description && <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 14 }}>{offer.description}</p>}
                    {offer.expires_at && <p style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, marginBottom: 10, fontFamily: "DM Mono, monospace" }}>Expires {offer.expires_at}</p>}
                    {offer.cta_text && (
                      <a href={offer.cta_url || "#"} target={offer.cta_url ? "_blank" : undefined} rel="noopener noreferrer"
                        style={{ display: "inline-block", padding: "8px 18px", background: "#111827", color: "#fff", borderRadius: 20, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                        {offer.cta_text} →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Sec>
          )}

          {/* ── Sponsors ── */}
          {!loading && data?.sponsors && data.sponsors.length > 0 && (
            <Sec title="Partners">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {data!.sponsors.map(s => (
                  <a key={s.id} href={s.website || "#"} target={s.website ? "_blank" : undefined} rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: "#fff", border: "1px solid #f3f4f6", borderRadius: 12, textDecoration: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "box-shadow 0.15s" }}>
                    {s.logo_url
                      ? <img src={s.logo_url} alt={s.name} style={{ height: 28, objectFit: "contain", maxWidth: 110 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      : <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{s.name}</span>
                    }
                  </a>
                ))}
              </div>
            </Sec>
          )}

          {/* ── Accreditations ── */}
          {!loading && data?.accreditations && data.accreditations.length > 0 && (
            <Sec title="Certifications">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {data!.accreditations.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", background: "#fff", border: "1px solid #f3f4f6", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    {a.logo_url
                      ? <img src={a.logo_url} alt={a.name} style={{ height: 32, objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      : <span style={{ fontSize: 22 }}>🏅</span>
                    }
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{a.name}</p>
                      {(a.issuer || a.year) && <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{[a.issuer, a.year].filter(Boolean).join(" · ")}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Sec>
          )}

          {/* ── Goals ── */}
          {!loading && data?.campaign_goals && data.campaign_goals.length > 0 && (
            <Sec title="What We Do">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {data!.campaign_goals.map(g => (
                  <span key={g.id} style={{ padding: "6px 16px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#0369a1" }}>{g.label}</span>
                ))}
              </div>
            </Sec>
          )}

          {/* ── Reviews ── */}
          {!loading && (
            <Sec title="Reviews" id="reviews">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 36 }}>

                {/* Summary */}
                <div style={{ background: "#fff", border: "1px solid #f3f4f6", borderRadius: 20, padding: "28px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 52, fontWeight: 800, color: "#111827", letterSpacing: "-2px", lineHeight: 1 }}>{rs?.average ?? "—"}</span>
                    <span style={{ fontSize: 16, color: "#d1d5db" }}>/ 5</span>
                  </div>
                  <div style={{ marginBottom: 4 }}><Stars rating={rs?.average || 0} size={16} /></div>
                  <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 20 }}>
                    {rs?.total_reviews ?? 0} review{(rs?.total_reviews ?? 0) !== 1 ? "s" : ""}
                    {(rs?.verified_count ?? 0) > 0 && ` · ${rs!.verified_count} verified`}
                  </p>
                  {dist.map(d => <RatingBar key={d.star} star={d.star} count={d.count} total={rs?.total_reviews ?? 0} />)}
                </div>

                {/* Review request form */}
                <div style={{ background: "#fff", border: "1px solid #f3f4f6", borderRadius: 20, padding: "28px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Invite a review</p>
                  <ReviewEmailStep slug={slug} orgName={data?.org.name as string} onSent={() => {}} />
                </div>
              </div>

              {/* Review cards */}
              {data!.reviews.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 20px", background: "#fff", borderRadius: 16, border: "1px solid #f3f4f6" }}>
                  <p style={{ fontSize: 32, marginBottom: 10 }}>⭐</p>
                  <p style={{ fontWeight: 700, color: "#374151" }}>No reviews yet</p>
                  <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Be the first to leave a verified review.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {data!.reviews.map((r, i) => (
                  <div
                    key={r.id}
                    className="fade-up"
                    style={{
                      animationDelay: `${i * 0.04}s`,
                      background: "#fff",
                      border: `1px solid ${r.is_featured ? "#e0e7ff" : "#f3f4f6"}`,
                      borderLeft: `3px solid ${r.is_featured ? "#6366f1" : r.is_verified ? "#10b981" : "#f3f4f6"}`,
                      borderRadius: 16,
                      overflow: "hidden",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    }}
                  >
                    {r.card_image_url && (
                      <div
                        style={{ width: "100%", background: "#f3f4f6", cursor: "pointer" }}
                        onClick={() => setLightbox(r.card_image_url!)}
                      >
                        <img
                          src={r.card_image_url}
                          alt={`Review by ${r.author_name}`}
                          style={{
                            width: "100%",
                            display: "block",
                            borderRadius: "13px 13px 0 0",
                            objectFit: "cover",
                            maxHeight: 320,
                          }}
                        />
                      </div>
                    )}

                    <div style={{ padding: "18px 22px 20px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: r.body ? 12 : 0,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {r.reviewer_photo_url ? (
                            <img
                              src={r.reviewer_photo_url}
                              alt={r.author_name}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                objectFit: "cover",
                                flexShrink: 0,
                                border: "1.5px solid #f3f4f6",
                              }}
                            />
                          ) : (
                            <Avatar name={r.author_name} size={40} />
                          )}

                          <div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 3 }}>
                              {r.author_name}
                            </p>

                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Stars rating={r.rating} size={12} />

                              {r.is_verified && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#10b981",
                                    background: "#d1fae5",
                                    padding: "2px 7px",
                                    borderRadius: 6,
                                    fontFamily: "DM Mono, monospace",
                                  }}
                                >
                                  ✓ VERIFIED
                                </span>
                              )}

                              {r.is_featured && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#6366f1",
                                    background: "#e0e7ff",
                                    padding: "2px 7px",
                                    borderRadius: 6,
                                    fontFamily: "DM Mono, monospace",
                                  }}
                                >
                                  FEATURED
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: 11,
                            color: "#d1d5db",
                            fontFamily: "DM Mono, monospace",
                            flexShrink: 0,
                            marginTop: 4,
                          }}
                        >
                          {r.created_at
                            ? new Date(r.created_at).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : ""}
                        </span>
                      </div>

                      {r.body && (
                        <p
                          style={{
                            fontSize: 14,
                            color: "#4b5563",
                            lineHeight: 1.75,
                            margin: 0,
                            paddingLeft: r.card_image_url ? 0 : 52,
                          }}
                        >
                          "{r.body}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              )}
            </Sec>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingTop: 40 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Sk w={140} h={22} />
                  <Sk h={16} />
                  <Sk w="80%" h={16} />
                  <Sk w="60%" h={16} />
                </div>
              ))}
            </div>
          )}

          
      {draftPanelOpen && (
        <div
          onClick={() => setDraftPanelOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17,24,39,0.18)",
            zIndex: 9997,
          }}
        />
      )}

      {/* ── Draft share panel ── */}
      {draftPanelOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "min(460px, 100vw)",
            height: "100vh",
            background: "#ffffff",
            borderLeft: "1px solid #e5e7eb",
            boxShadow: "-12px 0 40px rgba(0,0,0,0.12)",
            zIndex: 9998,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              padding: "18px 18px 14px",
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              position: "sticky",
              top: 0,
              background: "#fff",
              zIndex: 2,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#6366f1",
                  fontFamily: "DM Mono, monospace",
                  marginBottom: 4,
                }}
              >
                Shared Draft
              </p>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>
                {draftPreview?.title || draftPreview?.hook || "Campaign Preview"}
              </h3>
            </div>

            <button
              onClick={() => setDraftPanelOpen(false)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
                fontSize: 18,
                color: "#6b7280",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: 18 }}>
            {draftLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Sk h={20} w="70%" />
                <Sk h={180} />
                <Sk h={16} />
                <Sk h={16} w="85%" />
                <Sk h={16} w="60%" />
              </div>
            ) : !draftPreview ? (
              <p style={{ fontSize: 14, color: "#6b7280" }}>Draft preview not available.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {(draftPreview.thumbnail_url || draftPreview.media_url || draftPreview.media_urls?.[0]) && (
                  <div
                    style={{
                      borderRadius: 16,
                      overflow: "hidden",
                      background: "#f3f4f6",
                      border: "1px solid #f3f4f6",
                    }}
                  >
                    <img
                      src={
                        draftPreview.thumbnail_url ||
                        draftPreview.media_url ||
                        draftPreview.media_urls?.[0]
                      }
                      alt={draftPreview.title || "Draft preview"}
                      style={{ width: "100%", display: "block", objectFit: "cover" }}
                    />
                  </div>
                )}

                <div
                  style={{
                    background: "#fafaf8",
                    border: "1px solid #f3f4f6",
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  {draftPreview.platform && (
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#9ca3af",
                        marginBottom: 8,
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {draftPreview.platform}
                    </p>
                  )}

                  <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", lineHeight: 1.4, marginBottom: 10 }}>
                    {draftPreview.hook || draftPreview.title || ""}
                  </p>

                  {draftPreview.body_text && (
                    <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {draftPreview.body_text}
                    </p>
                  )}

                  {draftPreview.hashtags && (
                    <p style={{ fontSize: 13, color: "#6366f1", lineHeight: 1.6, marginTop: 12 }}>
                      {draftPreview.hashtags}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {biz?.website && (
                    <a
                      href={makeWebsiteHref(biz.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        padding: "11px 18px",
                        background: "#111827",
                        color: "#fff",
                        borderRadius: 999,
                        textDecoration: "none",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      Visit Website →
                    </a>
                  )}

                  {biz?.phone_primary && (
                    <a
                      href={`tel:${biz.phone_primary}`}
                      style={{
                        display: "inline-block",
                        padding: "11px 18px",
                        background: "#fff",
                        color: "#111827",
                        borderRadius: 999,
                        textDecoration: "none",
                        fontSize: 13,
                        fontWeight: 700,
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      Call Now
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: "1px solid #f3f4f6", padding: "28px 24px", textAlign: "center", marginTop: 40 }}>
          <p style={{ fontSize: 12, color: "#d1d5db", fontFamily: "DM Mono, monospace" }}>
            Powered by <strong style={{ color: "#6366f1" }}>Relvō</strong>
          </p>
        </div>
      </div>
    </>
  );
}