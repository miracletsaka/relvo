/**
 * AssetCard component — drop-in replacement.
 * Added: price display + inline price editor.
 * Everything else unchanged from your original.
 */
import { useState } from "react";
import { Check, Trash2, X, Tag } from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function fmtPrice(price: number | null | undefined, currency = "USD") {
  if (price === null || price === undefined) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", minimumFractionDigits: 2 }).format(price);
}

// ── BrandBadge (keep your existing one, this is a fallback) ──────────────────
function BrandBadge({ name, size = "xs" }: { name?: string | null; size?: string }) {
  if (!name) return null;
  return (
    <span style={{ fontSize: 9, fontFamily: "DM Mono, monospace", color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.08)" }}>
      {name}
    </span>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface MediaAsset {
  id:             string;
  url:            string;
  filename:       string;
  type:           "image" | "video";
  brand_id?:      string | null;
  brand_name?:    string | null;
  tags?:          string[];
  size_bytes?:    number | null;
  mime_type?:     string | null;
  width?:         number | null;
  height?:        number | null;
  price?:         number | null;
  price_currency?: string | null;
  created_at:     string;
  updated_at:     string;
}

// ── PriceEditor ───────────────────────────────────────────────────────────────
function PriceEditor({
  asset,
  onUpdated,
}: {
  asset:      MediaAsset;
  onUpdated:  (price: number | null, currency: string) => void;
}) {
  const [open,     setOpen]     = useState(false);
  const [price,    setPrice]    = useState(asset.price?.toString() ?? "");
  const [currency, setCurrency] = useState(asset.price_currency || "USD");
  const [saving,   setSaving]   = useState(false);

  const hasPrice = asset.price !== null && asset.price !== undefined;

  const save = async () => {
    setSaving(true);
    try {
      const priceVal = price.trim() === "" || parseFloat(price) <= 0 ? null : parseFloat(price);
      const res = await fetch(`${API}/media-assets/${asset.id}/price`, {
        method:      "PATCH",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body: JSON.stringify({ price: priceVal, price_currency: currency }),
      });
      if (!res.ok) throw new Error("Failed");
      onUpdated(priceVal, currency);
      setOpen(false);
    } catch {}
    finally { setSaving(false); }
  };

  const clear = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/media-assets/${asset.id}/price`, {
        method:      "PATCH",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body: JSON.stringify({ price: null, price_currency: currency }),
      });
      setPrice("");
      onUpdated(null, currency);
      setOpen(false);
    } catch {}
    finally { setSaving(false); }
  };

  if (!open) {
    return (
      <button
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        title={hasPrice ? "Edit price" : "Add price"}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "2px 7px", borderRadius: 6,
          background: hasPrice ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${hasPrice ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.08)"}`,
          color: hasPrice ? "#34d399" : "rgba(255,255,255,0.25)",
          fontSize: 9, fontWeight: 700, cursor: "pointer",
          fontFamily: "DM Mono, monospace", transition: "all 0.15s",
        }}
        onMouseEnter={e => { (e.currentTarget.style.borderColor = hasPrice ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.2)"); }}
        onMouseLeave={e => { (e.currentTarget.style.borderColor = hasPrice ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.08)"); }}
      >
        <Tag style={{ width: 8, height: 8 }} />
        {hasPrice ? fmtPrice(asset.price, asset.price_currency ?? "USD") : "Add price"}
      </button>
    );
  }

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: "absolute", bottom: "100%", left: 0, right: 0, zIndex: 20,
        background: "#1a1a22", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10, padding: 10, marginBottom: 4,
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 7 }}>
        Product Price
      </div>
      <div style={{ display: "flex", gap: 5, marginBottom: 7 }}>
        {/* Currency */}
        <select
          value={currency}
          onChange={e => setCurrency(e.target.value)}
          style={{
            width: 58, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 7, padding: "5px 6px", color: "#e4e4e7", fontSize: 11,
            fontFamily: "DM Mono, monospace", outline: "none", cursor: "pointer",
          }}
        >
          {["USD","GBP","EUR","ZAR","NGN","KES","GHS","UGX","TZS"].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {/* Amount */}
        <input
        className="w-20"
          autoFocus
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={e => setPrice(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setOpen(false); }}
          placeholder="0.00"
          style={{
            flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 7, padding: "5px 8px", color: "#e4e4e7", fontSize: 12,
            fontFamily: "DM Mono, monospace", outline: "none",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {hasPrice && (
          <button onClick={clear} disabled={saving} style={{ flex: 1, padding: "5px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, color: "#f87171", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
            Clear
          </button>
        )}
        <button onClick={() => setOpen(false)} disabled={saving} style={{ padding: "5px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "rgba(255,255,255,0.3)", fontSize: 10, cursor: "pointer" }}>
          <X style={{ width: 10, height: 10 }} />
        </button>
        <button onClick={save} disabled={saving} style={{ flex: 2, padding: "5px", background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 7, color: "#34d399", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          {saving
            ? <div style={{ width: 9, height: 9, border: "1.5px solid rgba(52,211,153,0.3)", borderTopColor: "#34d399", borderRadius: "50%", animation: "maspin 0.6s linear infinite" }} />
            : <><Check style={{ width: 10, height: 10 }} /> Save</>
          }
        </button>
      </div>
    </div>
  );
}

// ── AssetCard ─────────────────────────────────────────────────────────────────
export function AssetCard({ asset: initialAsset, onDelete }: { asset: MediaAsset; onDelete: () => void }) {
  const [asset,      setAsset]      = useState<MediaAsset>(initialAsset);
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const deleteAsset = async () => {
    setDeleting(true);
    try {
      await fetch(`${API}/media-assets/${asset.id}`, { method: "DELETE", credentials: "include" });
      onDelete();
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  const onPriceUpdated = (price: number | null, currency: string) => {
    setAsset(prev => ({ ...prev, price, price_currency: currency }));
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14, overflow: "hidden", transition: "border-color 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
    >
      {/* Thumbnail */}
      <div style={{ height: 120, background: "rgba(0,0,0,0.3)", position: "relative", overflow: "hidden" }}>
        {asset.type === "image" ? (
          <img src={asset.url} alt={asset.filename}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <video src={asset.url} muted playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}

        {/* Delete button */}
        <div style={{ position: "absolute", top: 6, right: 6 }}>
          {!confirming ? (
            <button onClick={() => setConfirming(true)} style={{
              width: 26, height: 26, borderRadius: 8, background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.3)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.6)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; }}
            >
              <Trash2 style={{ width: 12, height: 12 }} />
            </button>
          ) : (
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={deleteAsset} disabled={deleting} style={{
                width: 26, height: 26, borderRadius: 8, background: "rgba(239,68,68,0.3)",
                border: "1px solid rgba(239,68,68,0.4)", color: "#f87171",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {deleting
                  ? <div style={{ width: 10, height: 10, border: "1.5px solid rgba(255,255,255,0.2)", borderTopColor: "#f87171", borderRadius: "50%", animation: "maspin 0.6s linear infinite" }} />
                  : <Check style={{ width: 11, height: 11 }} />}
              </button>
              <button onClick={() => setConfirming(false)} style={{
                width: 26, height: 26, borderRadius: 8, background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <X style={{ width: 11, height: 11 }} />
              </button>
            </div>
          )}
        </div>

        {/* Brand badge */}
        <div style={{ position: "absolute", bottom: 6, left: 6 }}>
          <BrandBadge name={asset.brand_name} size="xs" />
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
        <p style={{ fontSize: 10, fontFamily: "DM Mono, monospace", color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
          {asset.filename}
        </p>

        {/* Price editor — inline, relative container */}
        <div style={{ position: "relative" }}>
          <PriceEditor asset={asset} onUpdated={onPriceUpdated} />
        </div>

        {/* Tags */}
        {asset.tags && asset.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {asset.tags.slice(0, 4).map(t => (
              <span key={t} style={{ fontSize: 8, fontFamily: "DM Mono, monospace", color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 4 }}>
                #{t}
              </span>
            ))}
            {asset.tags.length > 4 && (
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>+{asset.tags.length - 4}</span>
            )}
          </div>
        )}

        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", margin: 0 }}>
          {fmtDate(asset.created_at)}
        </p>
      </div>
    </div>
  );
}

export default AssetCard;