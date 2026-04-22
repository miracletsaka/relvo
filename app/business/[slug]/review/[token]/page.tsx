"use client";
/**
 * app/biz/[slug]/review/[token]/page.tsx
 * Uses raw Canvas 2D — no TemplateCanvas, no TemplateShape, no slot resolution.
 */

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { drawReviewCard, CARD_W, CARD_H } from "@/lib/review-card-canvas";
import { uploadFileToSpaces } from "@/lib/video-upload-client";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail?.message || json.detail || json.message || `Error ${res.status}`);
  return json as T;
}

type TokenData = {
  ok: boolean; email: string;
  org: { name: string; slug: string };
  business_info: { tagline?: string; primary_color?: string } | null;
  profile_image: { url: string } | null;
};

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 2, transition: "transform 0.1s", transform: n === (hover || value) ? "scale(1.2)" : "scale(1)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24"
            fill={n <= (hover || value) ? "#f59e0b" : "none"}
            stroke={n <= (hover || value) ? "#f59e0b" : "#d1d5db"} strokeWidth="1.5"
            style={{ transition: "fill 0.12s, stroke 0.12s" }}>
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
          </svg>
        </button>
      ))}
    </div>
  );
}

function ImgZone({ label, hint, value, onChange }: {
  label: string; hint: string; value: File | null; onChange: (f: File | null) => void;
}) {
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const pick = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    onChange(file);
    const r = new FileReader();
    r.onload = e => setPreview(e.target?.result as string);
    r.readAsDataURL(file);
  };
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 7, fontFamily: "DM Mono, monospace" }}>
        {label} <span style={{ fontWeight: 400, color: "#d1d5db" }}>(optional)</span>
      </label>
      <div onClick={() => ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        style={{ border: `2px dashed ${drag ? "#6366f1" : preview ? "#86efac" : "#e5e7eb"}`, borderRadius: 13, padding: "14px 16px", cursor: "pointer", background: drag ? "rgba(99,102,241,0.04)" : preview ? "rgba(134,239,172,0.04)" : "#fafaf8", display: "flex", alignItems: "center", gap: 14, transition: "all 0.2s" }}>
        {preview
          ? <img src={preview} alt="" style={{ width: 68, height: 68, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: "1.5px solid #e5e7eb" }} />
          : <div style={{ width: 68, height: 68, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 26 }}>📷</div>
        }
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: preview ? "#059669" : "#374151", marginBottom: 2 }}>{preview ? "Image ready ✓" : "Click or drag to upload"}</p>
          <p style={{ fontSize: 11, color: "#9ca3af", fontFamily: "DM Mono, monospace" }}>{hint}</p>
        </div>
        {preview && <button type="button" onClick={e => { e.stopPropagation(); onChange(null); setPreview(""); }} style={{ background: "none", border: "none", color: "#f87171", fontSize: 16, cursor: "pointer", padding: "4px 8px" }}>✕</button>}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={e => pick(e.target.files?.[0] || null)} />
    </div>
  );
}

export default function ReviewPage() {
  const params    = useParams();
  const slug      = params?.slug  as string;
  const token     = params?.token as string;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [tokenData,   setTokenData]   = useState<TokenData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError,   setPageError]   = useState<string | null>(null);
  const [name,          setName]          = useState("");
  const [rating,        setRating]        = useState(0);
  const [body,          setBody]          = useState("");
  const [reviewerPhoto, setReviewerPhoto] = useState<File | null>(null);
  const [productImage,  setProductImage]  = useState<File | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [progress,      setProgress]      = useState("");
  const [saveErr,       setSaveErr]       = useState<string | null>(null);
  const [done,          setDone]          = useState(false);
  const [cardImageUrl,  setCardImageUrl]  = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !token) return;
    apiFetch<TokenData>(`/public/biz/${slug}/review/${token}`)
      .then(setTokenData)
      .catch(e => setPageError(e.message))
      .finally(() => setPageLoading(false));
  }, [slug, token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setSaveErr("Please enter your name"); return; }
    if (rating < 1)   { setSaveErr("Please select a rating"); return; }
    setSaving(true); setSaveErr(null);
    try {
      let reviewerPhotoUrl: string | null = null;
      if (reviewerPhoto) { setProgress("Uploading your photo…"); reviewerPhotoUrl = await uploadFileToSpaces(reviewerPhoto); }
      let productImageUrl: string | null = null;
      if (productImage)  { setProgress("Uploading product image…"); productImageUrl = await uploadFileToSpaces(productImage); }

      setProgress("Submitting review…");
      const reviewRes = await apiFetch<{ ok: boolean; review: { id: string } }>(
        `/public/biz/${slug}/review/${token}`,
        { method: "POST", body: JSON.stringify({ author_name: name.trim(), rating, body: body.trim() || null, reviewer_photo_url: reviewerPhotoUrl, product_image_url: productImageUrl }) }
      );

      // Draw card with raw Canvas 2D
      setProgress("Creating your review card…");
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not found");

      await drawReviewCard(canvas, {
        authorName:       name.trim(),
        rating,
        body:             body.trim(),
        reviewerPhotoUrl: reviewerPhotoUrl ?? undefined,
        productImageUrl:  productImageUrl  ?? undefined,
        orgName:          tokenData?.org.name,
        primaryColor:     tokenData?.business_info?.primary_color || "#1a2f4e",
      });

      setProgress("Saving your review card…");
      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob(b => b ? res(b) : rej(new Error("toBlob failed")), "image/png", 1)
      );
      const cardFile    = new File([blob], `review-${Date.now()}.png`, { type: "image/png" });
      const uploadedUrl = await uploadFileToSpaces(cardFile);
      setCardImageUrl(uploadedUrl);

      await fetch(`${API}/public/biz/${slug}/review-card`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_id: reviewRes.review?.id, card_image_url: uploadedUrl }),
      }).catch(() => {});

      setProgress(""); setDone(true);
    } catch (ex: any) { setSaveErr(ex.message); }
    finally { setSaving(false); }
  };

  const inp: React.CSSProperties = { width: "100%", padding: "13px 16px", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: 15, color: "#111827", fontFamily: "inherit", outline: "none", transition: "border-color 0.15s, box-shadow 0.15s", background: "#fafaf8" };

  if (pageLoading) return (<div style={{ minHeight: "100vh", background: "#fafaf8", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /><style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style></div>);

  if (pageError) return (
    <><style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;} @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&display=swap');`}</style>
    <div style={{ minHeight: "100vh", background: "#fafaf8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Instrument Sans',sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 400, textAlign: "center" }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>🔒</p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 10 }}>{pageError.includes("ALREADY_USED") ? "Already submitted" : pageError.includes("EXPIRED") ? "Link expired" : "Invalid link"}</h1>
        <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.65 }}>{pageError.includes("ALREADY_USED") ? "You've already used this link. Thank you!" : pageError.includes("EXPIRED") ? "This link expired. Request a new one from the business page." : "This link is invalid or has been revoked."}</p>
        {slug && <a href={`/biz/${slug}`} style={{ display: "inline-block", marginTop: 20, padding: "11px 24px", background: "#111827", color: "#fff", borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>← Back to profile</a>}
      </div>
    </div></>
  );

  return (
    <>
      {/* Plain offscreen canvas — JUST a <canvas>, not TemplateCanvas */}
      <canvas ref={canvasRef} width={CARD_W} height={CARD_H} style={{ position: "fixed", left: -9999, top: -9999, pointerEvents: "none", opacity: 0 }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600;700&family=DM+Mono&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin   {to{transform:rotate(360deg);}}
        @keyframes fadeUp {from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        @keyframes popIn  {from{opacity:0;transform:scale(0.9);}to{opacity:1;transform:scale(1);}}
        @keyframes slideUp{from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);}}
        input:focus,textarea:focus{border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,0.1)!important;}
      `}</style>

      <div style={{ minHeight: "100vh", background: "#fafaf8", fontFamily: "'Instrument Sans',sans-serif" }}>

        {done && (
          <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", gap: 32 }}>
            <div style={{ textAlign: "center", animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#d1fae5,#a7f3d0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 20px", boxShadow: "0 4px 24px rgba(16,185,129,0.2)" }}>✓</div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", letterSpacing: "-0.5px", marginBottom: 8 }}>Thank you, {name}!</h1>
              <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.7 }}>Your verified review for <strong>{tokenData?.org.name}</strong> is live.</p>
            </div>
            {cardImageUrl && (
              <div style={{ maxWidth: 660, width: "100%", animation: "slideUp 0.6s 0.2s ease both" }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af", fontFamily: "DM Mono,monospace", marginBottom: 12, textAlign: "center" }}>Your Review Card</p>
                <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.14)", border: "1px solid #f3f4f6" }}>
                  <img src={cardImageUrl} alt="Review card" style={{ width: "100%", display: "block" }} />
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 18, justifyContent: "center", flexWrap: "wrap" }}>
                  <a href={cardImageUrl} download="my-review.png" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "12px 22px", background: "#111827", color: "#fff", borderRadius: 12, textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download Card
                  </a>
                  <button onClick={async () => { try { await navigator.clipboard.writeText(cardImageUrl); } catch {} }} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "12px 22px", background: "#fff", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy Link
                  </button>
                </div>
                <p style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#d1d5db", fontFamily: "DM Mono,monospace" }}>Share on social media to help others discover {tokenData?.org.name}</p>
              </div>
            )}
            <a href={`/biz/${slug}`} style={{ fontSize: 13, color: "#6366f1", textDecoration: "none", fontWeight: 600 }}>← View full business profile</a>
          </div>
        )}

        {!done && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "40px 20px" }}>
            <div style={{ maxWidth: 560, width: "100%", animation: "fadeUp 0.5s ease both" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
                <div style={{ width: 58, height: 58, borderRadius: 14, overflow: "hidden", background: "linear-gradient(135deg,#6366f1,#4f46e5)", flexShrink: 0, boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}>
                  {tokenData?.profile_image ? <img src={tokenData.profile_image.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff" }}>{tokenData?.org.name?.charAt(0)}</div>}
                </div>
                <div>
                  <p style={{ fontSize: 19, fontWeight: 700, color: "#111827", letterSpacing: "-0.3px", marginBottom: 2 }}>{tokenData?.org.name}</p>
                  {tokenData?.business_info?.tagline && <p style={{ fontSize: 13, color: "#9ca3af", fontFamily: "'Instrument Serif',serif", fontStyle: "italic" }}>{tokenData.business_info.tagline}</p>}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #f3f4f6", borderRadius: 24, padding: "36px 34px 32px", boxShadow: "0 2px 20px rgba(0,0,0,0.07)" }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: "-0.3px", marginBottom: 6 }}>Leave a Review</h2>
                <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 28 }}>Reviewing as <strong style={{ color: "#6b7280" }}>{tokenData?.email}</strong></p>
                <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 8, fontFamily: "DM Mono,monospace" }}>Your Name *</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={inp} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 10, fontFamily: "DM Mono,monospace" }}>Rating *</label>
                    <StarPicker value={rating} onChange={setRating} />
                    {rating > 0 && <p style={{ fontSize: 14, color: "#6b7280", marginTop: 8, fontFamily: "'Instrument Serif',serif", fontStyle: "italic" }}>{STAR_LABELS[rating]}</p>}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 8, fontFamily: "DM Mono,monospace" }}>Your Experience</label>
                    <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Tell others what you loved…" rows={4} maxLength={2000} style={{ ...inp, resize: "vertical", lineHeight: 1.7 }} />
                    <p style={{ fontSize: 11, color: "#d1d5db", marginTop: 5, textAlign: "right" }}>{body.length} / 2000</p>
                  </div>
                  <div style={{ padding: "20px 18px 16px", background: "#fafaf8", border: "1px solid #f3f4f6", borderRadius: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 3 }}>📸 Enhance your review</p>
                    <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6, marginBottom: 18 }}>Upload your photo and a product image — we'll generate a shareable review card.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <ImgZone label="Your photo" hint="Your face or identity image" value={reviewerPhoto} onChange={setReviewerPhoto} />
                      <ImgZone label="Product image" hint="The product or service you're reviewing" value={productImage} onChange={setProductImage} />
                    </div>
                    {(reviewerPhoto || productImage) && (
                      <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 10, display: "flex", gap: 9 }}>
                        <span style={{ fontSize: 14, flexShrink: 0 }}>✨</span>
                        <p style={{ fontSize: 11, color: "#6366f1", lineHeight: 1.6, margin: 0, fontFamily: "DM Mono,monospace" }}>A branded review card will be generated after submission.</p>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10 }}>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>🔒</span>
                    <p style={{ fontSize: 12, color: "#166534", lineHeight: 1.6, margin: 0 }}>Your review will be marked as <strong>Verified</strong>. One review per email per business.</p>
                  </div>
                  {saveErr && <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, fontSize: 13, color: "#dc2626" }}>{saveErr}</div>}
                  {saving && progress && (
                    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 15px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10 }}>
                      <span style={{ width: 14, height: 14, border: "2px solid rgba(99,102,241,0.25)", borderTopColor: "#6366f1", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "#6366f1", fontFamily: "DM Mono,monospace" }}>{progress}</span>
                    </div>
                  )}
                  <button type="submit" disabled={saving || rating < 1}
                    style={{ padding: "15px", background: saving || rating < 1 ? "#f3f4f6" : "#111827", border: "none", borderRadius: 12, color: saving || rating < 1 ? "#9ca3af" : "#fff", fontSize: 15, fontWeight: 700, cursor: saving || rating < 1 ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.15s" }}>
                    {saving ? <><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Processing…</> : "Submit Verified Review"}
                  </button>
                </form>
              </div>
              <p style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#d1d5db", fontFamily: "DM Mono,monospace" }}>Powered by Relvo · Verified Reviews</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}