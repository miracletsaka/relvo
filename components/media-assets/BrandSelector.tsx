import { Check } from "lucide-react";
import type { Brand } from "./types";
import { brandColor } from "./helpers";

export default function BrandSelector({
  brands,
  selectedId,
  onSelect,
}: {
  brands: Brand[];
  selectedId: string;
  onSelect: (brand: Brand) => void;
}) {
  return (
    <div className="border-b border-black/5 px-4 py-3.5">
      <div
        className="
          mb-2.5
          text-[10px] font-semibold uppercase
          tracking-[0.1em]
          text-gray-400
        "
      >
        Assign to Brand
      </div>

      <div className="flex flex-col gap-1">
        {brands.map((b) => {
          const active = selectedId === b.id;

          return (
            <button
              key={b.id}
              onClick={() => onSelect(b)}
              className="
                flex items-center gap-2.5
                rounded-xl
                px-2.5 py-2
                text-left
                transition-all duration-150
              "
              style={{
                background: active
                  ? `${brandColor(b)}18`
                  : "transparent",
                outline: active
                  ? `1px solid ${brandColor(b)}40`
                  : "1px solid transparent",
              }}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: brandColor(b),
                }}
              />

              <span
                className={`
                  flex-1
                  text-[11px] font-medium
                  ${
                    active
                      ? "text-gray-600"
                      : "text-gray-500"
                  }
                `}
              >
                {b.display_name}
              </span>

              {active && (
                <Check
                  className="h-3 w-3 shrink-0"
                  style={{
                    color: brandColor(b),
                  }}
                />
              )}
            </button>
          );
        })}

        {brands.length === 0 && (
          <p
            className="
              px-1 py-1.5
              text-[11px] italic
              text-gray-400
            "
          >
            No brands yet — create one in Brands.
          </p>
        )}
      </div>
    </div>
  );
}