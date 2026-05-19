/**
 * AssetCard — full schema display + inline edit drawer.
 * Light glass theme. Tailwind + custom CSS for animations.
 */
"use client";

import { useState } from "react";
import {
  Check, Trash2, X, Tag, Pencil, MapPin,
  Layers, ShoppingBag, ExternalLink, ChevronDown,
} from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

const CURRENCIES = ["MWK","USD","GBP","EUR","ZAR","NGN","KES","GHS","UGX","TZS"];
const AVAILABILITY_OPTIONS = ["available","out_of_stock","limited","coming_soon","discontinued"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function fmtPrice(price: number | null | undefined, currency = "MWK") {
  if (price === null || price === undefined) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: currency || "MWK", minimumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

function availabilityColor(val?: string | null) {
  switch (val) {
    case "available":    return "text-emerald-600 bg-emerald-50 border-emerald-200";
    case "out_of_stock": return "text-red-500 bg-red-50 border-red-200";
    case "limited":      return "text-amber-600 bg-amber-50 border-amber-200";
    case "coming_soon":  return "text-blue-500 bg-blue-50 border-blue-200";
    case "discontinued": return "text-black/35 bg-black/05 border-black/10";
    default:             return "text-black/35 bg-black/05 border-black/10";
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MediaAsset {
  id:               string;
  url:              string;
  filename:         string;
  type:             "image" | "video";
  brand_id?:        string | null;
  brand_name?:      string | null;
  tags?:            string[];
  size_bytes?:      number | null;
  mime_type?:       string | null;
  width?:           number | null;
  height?:          number | null;
  price?:           number | null;
  price_currency?:  string | null;
  compare_at_price?: number | null;
  discount_label?:  string | null;
  title?:           string | null;
  description?:     string | null;
  offer_title?:     string | null;
  offer_description?: string | null;
  cta_text?:        string | null;
  cta_url?:         string | null;
  availability?:    string | null;
  product_category?: string | null;
  service_area?:    string | null;
  features?:        string[];
  created_at:       string;
  updated_at:       string;
}

type EditDraft = Partial<MediaAsset>;

// ── Shared input styles ───────────────────────────────────────────────────────

const inputCls = `
  w-full text-[11px] bg-white/70 border border-black/08 rounded-lg
  px-2 py-1.5 text-black/75 outline-none font-[Inter,sans-serif]
  shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
  focus:border-violet-400/50
  focus:shadow-[0_0_0_3px_rgba(124,85,246,0.09),inset_0_1px_0_rgba(255,255,255,0.9)]
  placeholder:text-black/25 transition-all
`;

const labelCls = "block text-[9px] font-bold uppercase tracking-widest text-black/30 mb-1";

// ── BrandBadge ────────────────────────────────────────────────────────────────

function BrandBadge({ name }: { name?: string | null }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wide bg-white/75 text-black/50 border border-black/10 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      {name}
    </span>
  );
}

// ── EditDrawer ────────────────────────────────────────────────────────────────

function EditDrawer({
  asset,
  onClose,
  onSaved,
}: {
  asset:   MediaAsset;
  onClose: () => void;
  onSaved: (updated: Partial<MediaAsset>) => void;
}) {
  const [draft,   setDraft]   = useState<EditDraft>({
    title:             asset.title           ?? "",
    description:       asset.description     ?? "",
    price:             asset.price           ?? undefined,
    price_currency:    asset.price_currency  ?? "MWK",
    compare_at_price:  asset.compare_at_price ?? undefined,
    discount_label:    asset.discount_label  ?? "",
    offer_title:       asset.offer_title     ?? "",
    offer_description: asset.offer_description ?? "",
    cta_text:          asset.cta_text        ?? "",
    cta_url:           asset.cta_url         ?? "",
    availability:      asset.availability    ?? "available",
    product_category:  asset.product_category ?? "",
    service_area:      asset.service_area    ?? "",
    features:          asset.features        ?? [],
  });
  const [featInput, setFeatInput] = useState("");
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState<string | null>(null);

  const set = (key: keyof EditDraft, val: any) =>
    setDraft((prev) => ({ ...prev, [key]: val }));

  const addFeature = () => {
    const v = featInput.trim();
    if (!v) return;
    set("features", [...(draft.features ?? []), v]);
    setFeatInput("");
  };

  const removeFeature = (i: number) =>
    set("features", (draft.features ?? []).filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      const body: Record<string, any> = {
        title:             draft.title             || null,
        description:       draft.description       || null,
        price:             draft.price             ?? null,
        price_currency:    draft.price_currency    || "MWK",
        compare_at_price:  draft.compare_at_price  ?? null,
        discount_label:    draft.discount_label    || null,
        offer_title:       draft.offer_title       || null,
        offer_description: draft.offer_description || null,
        cta_text:          draft.cta_text          || null,
        cta_url:           draft.cta_url           || null,
        availability:      draft.availability      || "available",
        product_category:  draft.product_category  || null,
        service_area:      draft.service_area      || null,
        features:          draft.features          ?? [],
      };
      const res = await fetch(`${API}/media-assets/${asset.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      onSaved(body);
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm flex flex-col ac-drawer">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/06 flex-shrink-0">
          <div>
            <p className="text-[11px] font-bold text-black/30 uppercase tracking-widest mb-0.5">Editing</p>
            <p className="text-[13px] font-700 text-black/80 truncate max-w-[220px] font-[Inter,sans-serif] font-bold">
              {asset.title || asset.filename}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/05 border border-black/07 text-black/35 hover:bg-black/08 hover:text-black/55 transition-all cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4 ac-scroll">

          {/* ── Section: Basic Info ── */}
          <Section label="Basic Info">
            <Field label="Title">
              <input className={inputCls} value={draft.title ?? ""} onChange={e => set("title", e.target.value)} placeholder="Product or asset title" />
            </Field>
            <Field label="Description">
              <textarea className={`${inputCls} resize-none`} rows={3} value={draft.description ?? ""} onChange={e => set("description", e.target.value)} placeholder="Describe this asset…" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Category">
                <input className={inputCls} value={draft.product_category ?? ""} onChange={e => set("product_category", e.target.value)} placeholder="e.g. Electronics" />
              </Field>
              <Field label="Service Area">
                <input className={inputCls} value={draft.service_area ?? ""} onChange={e => set("service_area", e.target.value)} placeholder="e.g. Lilongwe" />
              </Field>
            </div>
            <Field label="Availability">
              <select className={inputCls} value={draft.availability ?? "available"} onChange={e => set("availability", e.target.value)}>
                {AVAILABILITY_OPTIONS.map(o => (
                  <option key={o} value={o}>{o.replace(/_/g, " ")}</option>
                ))}
              </select>
            </Field>
          </Section>

          {/* ── Section: Pricing ── */}
          <Section label="Pricing">
            <div className="flex gap-2">
              <Field label="Currency" className="w-20 flex-shrink-0">
                <select className={inputCls} value={draft.price_currency ?? "MWK"} onChange={e => set("price_currency", e.target.value)}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Price" className="flex-1">
                <input type="number" min="0" step="0.01" className={inputCls} value={draft.price ?? ""} onChange={e => set("price", e.target.value === "" ? undefined : parseFloat(e.target.value))} placeholder="0.00" />
              </Field>
              <Field label="Compare At" className="flex-1">
                <input type="number" min="0" step="0.01" className={inputCls} value={draft.compare_at_price ?? ""} onChange={e => set("compare_at_price", e.target.value === "" ? undefined : parseFloat(e.target.value))} placeholder="0.00" />
              </Field>
            </div>
            <Field label="Discount Label">
              <input className={inputCls} value={draft.discount_label ?? ""} onChange={e => set("discount_label", e.target.value)} placeholder="e.g. 20% OFF · Flash Sale" />
            </Field>
          </Section>

          {/* ── Section: Offer ── */}
          <Section label="Offer / Promotion">
            <Field label="Offer Title">
              <input className={inputCls} value={draft.offer_title ?? ""} onChange={e => set("offer_title", e.target.value)} placeholder="Limited-time offer headline" />
            </Field>
            <Field label="Offer Description">
              <textarea className={`${inputCls} resize-none`} rows={2} value={draft.offer_description ?? ""} onChange={e => set("offer_description", e.target.value)} placeholder="Details of the offer…" />
            </Field>
          </Section>

          {/* ── Section: CTA ── */}
          <Section label="Call to Action">
            <div className="grid grid-cols-2 gap-2">
              <Field label="CTA Text">
                <input className={inputCls} value={draft.cta_text ?? ""} onChange={e => set("cta_text", e.target.value)} placeholder="Shop Now" />
              </Field>
              <Field label="CTA URL">
                <input className={inputCls} value={draft.cta_url ?? ""} onChange={e => set("cta_url", e.target.value)} placeholder="https://…" />
              </Field>
            </div>
          </Section>

          {/* ── Section: Features ── */}
          <Section label="Features / Bullet Points">
            <div className="flex gap-2">
              <input
                className={`${inputCls} flex-1`}
                value={featInput}
                onChange={e => setFeatInput(e.target.value)}
                placeholder="Add a feature…"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
              />
              <button
                onClick={addFeature}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-violet-50 border border-violet-200 text-violet-600 hover:bg-violet-100 cursor-pointer transition-all flex-shrink-0"
              >
                Add
              </button>
            </div>
            {(draft.features ?? []).length > 0 && (
              <div className="flex flex-col gap-1 mt-1">
                {(draft.features ?? []).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/60 border border-black/06 group/feat">
                    <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    <span className="flex-1 text-[11px] text-black/65">{f}</span>
                    <button onClick={() => removeFeature(i)} className="opacity-0 group-hover/feat:opacity-100 w-5 h-5 flex items-center justify-center rounded text-black/30 hover:text-red-400 transition-all cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {err && (
            <p className="text-[11px] text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-black/06 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[12px] font-bold bg-white/60 border border-black/08 text-black/45 hover:bg-white/90 cursor-pointer transition-all">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold bg-violet-500/10 border border-violet-400/30 text-violet-700 hover:bg-violet-500/18 disabled:opacity-40 cursor-pointer transition-all"
          >
            {saving ? <div className="ac-spinner-violet" /> : <><Check className="w-3.5 h-3.5" /> Save Changes</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Section / Field wrappers ──────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-black/28 mb-2">{label}</p>
      <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/55 border border-black/06 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

// ── AssetCard ─────────────────────────────────────────────────────────────────

export function AssetCard({ asset: initialAsset, onDelete }: { asset: MediaAsset; onDelete: () => void }) {
  const [asset,      setAsset]      = useState<MediaAsset>(initialAsset);
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [editing,    setEditing]    = useState(false);

  const deleteAsset = async () => {
    setDeleting(true);
    try {
      await fetch(`${API}/media-assets/${asset.id}`, { method: "DELETE", credentials: "include" });
      onDelete();
    } finally { setDeleting(false); setConfirming(false); }
  };

  const onSaved = (updated: Partial<MediaAsset>) => {
    setAsset((prev) => ({ ...prev, ...updated }));
  };

  const hasOffer  = asset.offer_title || asset.discount_label;
  const hasCta    = asset.cta_text && asset.cta_url;
  const hasPrice  = asset.price !== null && asset.price !== undefined;

  return (
    <>
      <style>{`
        @keyframes ac-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .ac-spinner       { width:10px;height:10px;border:1.5px solid rgba(239,68,68,0.2);border-top-color:#ef4444;border-radius:50%;animation:ac-spin .6s linear infinite; }
        .ac-spinner-violet{ width:10px;height:10px;border:1.5px solid rgba(124,85,246,0.2);border-top-color:#7c55f6;border-radius:50%;animation:ac-spin .6s linear infinite; }
        .ac-drawer {
          background: rgba(248,248,250,0.96);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border-left: 1px solid rgba(255,255,255,0.9);
          box-shadow: -8px 0 40px rgba(0,0,0,0.1), inset 1px 0 0 rgba(255,255,255,0.8);
          animation: ac-slidein 0.22s cubic-bezier(0.32,0.72,0,1);
        }
        @keyframes ac-slidein {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .ac-scroll::-webkit-scrollbar { width: 3px; }
        .ac-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
      `}</style>

      {/* Edit drawer */}
      {editing && (
        <EditDrawer asset={asset} onClose={() => setEditing(false)} onSaved={onSaved} />
      )}

      <div className="group rounded-2xl overflow-hidden bg-white/65 border border-black/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_10px_rgba(0,0,0,0.05)] hover:bg-white/85 hover:border-black/10 hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_4px_18px_rgba(0,0,0,0.08)] transition-all duration-150 flex flex-col">

        {/* ── Thumbnail ── */}
        <div className="relative h-32 bg-black/[0.04] overflow-hidden flex-shrink-0">
          {asset.type === "image"
            ? <img src={asset.url} alt={asset.filename} className="w-full h-full object-cover" />
            : <video src={asset.url} muted playsInline className="w-full h-full object-cover" />
          }

          {/* Overlay controls */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150" />

          {/* Top-right: delete + edit */}
          <div className="absolute top-1.5 right-1.5 flex gap-1">
            {/* Edit button */}
            <button
              onClick={() => setEditing(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer bg-white/75 backdrop-blur-sm border border-black/08 text-black/40 opacity-0 group-hover:opacity-100 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600 transition-all duration-150"
              title="Edit asset"
            >
              <Pencil className="w-3 h-3" />
            </button>

            {/* Delete */}
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer bg-white/75 backdrop-blur-sm border border-black/08 text-black/35 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all duration-150"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            ) : (
              <div className="flex gap-1">
                <button onClick={deleteAsset} disabled={deleting} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer bg-red-50/90 border border-red-200 text-red-500 hover:bg-red-100 backdrop-blur-sm disabled:opacity-50 transition-all">
                  {deleting ? <div className="ac-spinner" /> : <Check className="w-3 h-3" />}
                </button>
                <button onClick={() => setConfirming(false)} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer bg-white/75 backdrop-blur-sm border border-black/08 text-black/40 hover:bg-white/90 transition-all">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Bottom-left: brand + availability */}
          <div className="absolute bottom-1.5 left-1.5 flex flex-wrap gap-1">
            <BrandBadge name={asset.brand_name} />
            {asset.availability && asset.availability !== "available" && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-bold border capitalize ${availabilityColor(asset.availability)}`}>
                {asset.availability.replace(/_/g, " ")}
              </span>
            )}
          </div>

          {/* Discount badge (top-left) */}
          {asset.discount_label && (
            <div className="absolute top-1.5 left-1.5">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-red-500 text-white shadow-sm">
                {asset.discount_label}
              </span>
            </div>
          )}
        </div>

        {/* ── Card body ── */}
        <div className="p-2.5 flex flex-col gap-1.5 flex-1">

          {/* Title or filename */}
          <p className="text-[12px] font-bold text-black/75 leading-tight line-clamp-1 m-0">
            {asset.title || asset.filename}
          </p>

          {/* Category + service area */}
          {(asset.product_category || asset.service_area) && (
            <div className="flex flex-wrap gap-1">
              {asset.product_category && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-black/40 bg-black/04 border border-black/06 rounded px-1.5 py-0.5">
                  <ShoppingBag className="w-2.5 h-2.5" />
                  {asset.product_category}
                </span>
              )}
              {asset.service_area && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-black/40 bg-black/04 border border-black/06 rounded px-1.5 py-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {asset.service_area}
                </span>
              )}
            </div>
          )}

          {/* Description (truncated) */}
          {asset.description && (
            <p className="text-[10px] text-black/40 leading-relaxed line-clamp-2 m-0">
              {asset.description}
            </p>
          )}

          {/* Price row */}
          {hasPrice && (
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-[13px] font-bold text-black/80">
                {fmtPrice(asset.price, asset.price_currency ?? "MWK")}
              </span>
              {asset.compare_at_price && (
                <span className="text-[10px] font-medium text-black/30 line-through">
                  {fmtPrice(asset.compare_at_price, asset.price_currency ?? "MWK")}
                </span>
              )}
            </div>
          )}

          {/* Offer title */}
          {asset.offer_title && (
            <div className="px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-[10px] font-bold text-amber-700 m-0 leading-tight">{asset.offer_title}</p>
              {asset.offer_description && (
                <p className="text-[9px] text-amber-600/70 m-0 mt-0.5 line-clamp-1">{asset.offer_description}</p>
              )}
            </div>
          )}

          {/* Features (first 3) */}
          {asset.features && asset.features.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {asset.features.slice(0, 3).map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Check className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-[10px] text-black/50 truncate">{f}</span>
                </div>
              ))}
              {asset.features.length > 3 && (
                <span className="text-[9px] text-black/28 font-mono ml-4">+{asset.features.length - 3} more</span>
              )}
            </div>
          )}

          {/* Tags */}
          {asset.tags && asset.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {asset.tags.slice(0, 3).map((t) => (
                <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-violet-50 border border-violet-100 text-violet-400">
                  #{t}
                </span>
              ))}
              {asset.tags.length > 3 && (
                <span className="text-[8px] text-black/25 font-mono self-center">+{asset.tags.length - 3}</span>
              )}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer: CTA link + date */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/05">
            {hasCta ? (
              <a
                href={asset.cta_url!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[9px] font-bold text-violet-600 hover:text-violet-700 transition-colors"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                {asset.cta_text}
              </a>
            ) : (
              <span />
            )}
            <span className="text-[9px] font-mono text-black/25">{fmtDate(asset.created_at)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default AssetCard;