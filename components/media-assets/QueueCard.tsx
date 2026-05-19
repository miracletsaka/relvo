import { useState, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import type { Brand, QueueItem } from "./types";
import { brandColor, fmtBytes } from "./helpers";

const AVAILABILITY = [
  { value: "available", label: "Available" },
  { value: "limited", label: "Limited stock" },
  { value: "sold_out", label: "Sold out" },
  { value: "coming_soon", label: "Coming soon" },
  { value: "hidden", label: "Hidden" },
] as const;

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function QueueCard({
  item,
  brands,
  onRemove,
  onTagsChange,
  onFeaturesChange,
  onBrandChange,
  onPatch,
}: {
  item: QueueItem;
  brands: Brand[];
  onRemove: () => void;
  onTagsChange: (tags: string[]) => void;
  onFeaturesChange: (features: string[]) => void;
  onBrandChange: (brandId: string, brandName: string) => void;
  onPatch: (patch: Partial<QueueItem>) => void;
}) {
  const [tagInput, setTagInput] = useState("");
  const [featureInput, setFeatureInput] = useState("");
  const [showBrandDrop, setShowBrandDrop] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const selectedBrand = brands.find((b) => b.id === item.brand_id);

  const addTag = (value: string) => {
    const t = value.trim().toLowerCase().replace(/^#+/, "");
    if (t && !item.tags.includes(t)) {
      onTagsChange([...item.tags, t]);
    }
  };

  const addFeature = (value: string) => {
    const f = value.trim();
    if (f && !item.features.includes(f)) {
      onFeaturesChange([...item.features, f]);
    }
  };

  const borderColor =
    item.status === "done"
      ? "border-emerald-500/20"
      : item.status === "error"
      ? "border-red-500/20"
      : item.status === "uploading"
      ? "border-violet-500/20"
      : "border-white/10";

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white/[0.04] backdrop-blur-xl ${borderColor}`}
    >
      {/* Preview */}
      <div className="relative h-24 overflow-hidden bg-black/30">
        {item.preview ? (
          <img
            src={item.preview}
            alt=""
            className="h-full w-full object-cover opacity-75"
          />
        ) : item.file.type.startsWith("video/") ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            <Video className="h-7 w-7" />
          </div>
        ) : null}

        {item.status === "uploading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />
          </div>
        )}

        {item.status === "done" && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/15">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400">
              <Check className="h-4 w-4 text-white" />
            </div>
          </div>
        )}

        {item.status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/15">
            <X className="h-5 w-5 text-red-400" />
          </div>
        )}

        {item.status !== "uploading" && (
          <button
            onClick={onRemove}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/60 text-gray-400 transition hover:bg-black/80 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 p-3">
        {/* File info */}
        <div>
          <p className="truncate font-mono text-[10px] text-gray-400">
            {item.file.name}
          </p>

          <p className="mt-1 font-mono text-[9px] text-gray-500">
            {fmtBytes(item.file.size)}
          </p>
        </div>

        {item.status === "pending" && (
          <>
            {/* Brand */}
            <div className="relative">
              <button
                onClick={() => setShowBrandDrop((v) => !v)}
                className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-[11px] font-semibold text-gray-300 transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                {selectedBrand && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: brandColor(selectedBrand),
                    }}
                  />
                )}

                <span className="flex-1 truncate">
                  {selectedBrand?.display_name || "Assign to brand"}
                </span>

                <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              </button>

              {showBrandDrop && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#111114] shadow-2xl backdrop-blur-xl">
                  {brands.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        onBrandChange(b.id, b.display_name);
                        setShowBrandDrop(false);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold transition ${
                        item.brand_id === b.id
                          ? "bg-violet-500/10 text-white"
                          : "text-gray-400 hover:bg-white/[0.04]"
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          background: brandColor(b),
                        }}
                      />

                      <span className="flex-1 truncate">
                        {b.display_name}
                      </span>

                      {item.brand_id === b.id && (
                        <Check className="h-3 w-3" />
                      )}
                    </button>
                  ))}

                  {brands.length === 0 && (
                    <p className="px-3 py-3 text-[11px] italic text-gray-500">
                      No brands yet
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Details toggle */}
            <button
              onClick={() => setDetailsOpen((v) => !v)}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-[11px] font-bold transition ${
                detailsOpen
                  ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                  : "border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.05]"
              }`}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                Product / Offer Details
              </span>

              <ChevronDown
                className={`h-3.5 w-3.5 transition ${
                  detailsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Details */}
            {detailsOpen && (
              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                <Field label="Title">
                  <input
                    className="ma-input"
                    value={item.title}
                    onChange={(e) =>
                      onPatch({ title: e.target.value })
                    }
                    placeholder="Product or service name"
                  />
                </Field>

                <Field label="Description">
                  <textarea
                    className="ma-textarea"
                    value={item.description}
                    onChange={(e) =>
                      onPatch({ description: e.target.value })
                    }
                    placeholder="Short sales description"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Price">
                    <input
                      className="ma-input"
                      value={item.price}
                      onChange={(e) =>
                        onPatch({ price: e.target.value })
                      }
                      placeholder="25000"
                    />
                  </Field>

                  <Field label="Currency">
                    <input
                      className="ma-input"
                      value={item.price_currency}
                      onChange={(e) =>
                        onPatch({
                          price_currency:
                            e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="MWK"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Old price">
                    <input
                      className="ma-input"
                      value={item.compare_at_price}
                      onChange={(e) =>
                        onPatch({
                          compare_at_price: e.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Discount">
                    <input
                      className="ma-input"
                      value={item.discount_label}
                      onChange={(e) =>
                        onPatch({
                          discount_label: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>

                <Field label="CTA">
                  <input
                    className="ma-input"
                    value={item.cta_text}
                    onChange={(e) =>
                      onPatch({ cta_text: e.target.value })
                    }
                  />
                </Field>

                <Field label="Availability">
                  <select
                    className="ma-select"
                    value={item.availability}
                    onChange={(e) =>
                      onPatch({
                        availability: e.target.value as any,
                      })
                    }
                  >
                    {AVAILABILITY.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Features */}
                <div>
                  {item.features.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {item.features.map((feature) => (
                        <span
                          key={feature}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-[10px] text-emerald-300"
                        >
                          {feature}

                          <button
                            onClick={() =>
                              onFeaturesChange(
                                item.features.filter(
                                  (f) => f !== feature,
                                ),
                              )
                            }
                            className="text-gray-400 hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <input
                    className="ma-input"
                    value={featureInput}
                    onChange={(e) =>
                      setFeatureInput(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" ||
                        e.key === ","
                      ) {
                        e.preventDefault();
                        addFeature(featureInput);
                        setFeatureInput("");
                      }
                    }}
                    placeholder="+ feature"
                  />
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              {item.tags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-gray-300"
                    >
                      #{tag}

                      <button
                        onClick={() =>
                          onTagsChange(
                            item.tags.filter(
                              (t) => t !== tag,
                            ),
                          )
                        }
                        className="text-gray-500 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <input
                className="ma-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" ||
                    e.key === ","
                  ) {
                    e.preventDefault();
                    addTag(tagInput);
                    setTagInput("");
                  }
                }}
                placeholder="+ add tag"
              />
            </div>
          </>
        )}

        {item.error && (
          <p className="font-mono text-[10px] text-red-400">
            {item.error}
          </p>
        )}
      </div>
    </div>
  );
}