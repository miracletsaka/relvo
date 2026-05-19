"use client";

import { Upload } from "lucide-react";
import type { Brand, MediaAssetType, QueueItem } from "./types";
import BrandSelector from "./BrandSelector";
import DropZone from "./DropZone";
import QueueCard from "./QueueCard";

export default function UploadPanel({
  brands,
  assetType,
  setAssetType,
  uploadBrandId,
  setUploadBrandId,
  setUploadBrandName,
  queue,
  uploading,
  pendingCount,
  onFiles,
  onClearQueue,
  onUploadAll,
  onRemove,
  onPatch,
}: {
  brands: Brand[];
  assetType: MediaAssetType;
  setAssetType: (type: MediaAssetType) => void;
  uploadBrandId: string;
  setUploadBrandId: (id: string) => void;
  setUploadBrandName: (name: string) => void;
  queue: QueueItem[];
  uploading: boolean;
  pendingCount: number;
  onFiles: (files: File[]) => void;
  onClearQueue: () => void;
  onUploadAll: () => void;
  onRemove: (id: string) => void;
  onPatch: (id: string, patch: Partial<QueueItem>) => void;
}) {
  return (
    <div className="sticky top-5 flex flex-col gap-3">
      {/* Upload Config */}
      <div
        className="
          overflow-hidden rounded-2xl
          border border-black/5
          bg-white/70
          backdrop-blur-xl
        "
      >
        <BrandSelector
          brands={brands}
          selectedId={uploadBrandId}
          onSelect={(b) => {
            setUploadBrandId(b.id);
            setUploadBrandName(b.display_name);
          }}
        />

        <div className="flex flex-col gap-3 p-3.5">
          {/* Type Toggle */}
          <div className="flex gap-1.5">
            {(["image", "video"] as MediaAssetType[]).map((t) => {
              const active = assetType === t;

              return (
                <button
                  key={t}
                  onClick={() => setAssetType(t)}
                  className={`
                    flex flex-1 items-center justify-center
                    rounded-xl border
                    px-3 py-2
                    text-[11px] font-medium
                    transition-all duration-150
                    ${
                      active
                        ? `
                          border-violet-200
                          bg-violet-500/10
                          text-violet-600
                        `
                        : `
                          border-transparent
                          bg-black/[0.03]
                          text-gray-500
                          hover:border-black/5
                          hover:bg-white
                          hover:text-gray-600
                        `
                    }
                  `}
                >
                  {t === "image" ? "Images" : "Videos"}
                </button>
              );
            })}
          </div>

          <DropZone type={assetType} onFiles={onFiles} />
        </div>
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div
          className="
            overflow-hidden rounded-2xl
            border border-black/5
            bg-white/70
            backdrop-blur-xl
          "
        >
          {/* Header */}
          <div
            className="
              flex items-center justify-between
              border-b border-black/5
              px-3.5 py-3
            "
          >
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-gray-500">
                Upload Queue
              </span>

              <span
                className="
                  rounded-full
                  border border-violet-200
                  bg-violet-500/10
                  px-2 py-0.5
                  text-[10px] font-semibold
                  text-violet-600
                "
              >
                {queue.length}
              </span>
            </div>

            {!uploading && (
              <button
                onClick={onClearQueue}
                className="
                  text-[11px] font-medium
                  text-gray-400
                  transition-colors
                  hover:text-gray-600
                "
              >
                Clear all
              </button>
            )}
          </div>

          {/* Queue Grid */}
          <div
            className="
              grid grid-cols-2 gap-2
              overflow-y-auto
              p-2.5
            "
            style={{ maxHeight: 520 }}
          >
            {queue.map((item) => (
              <QueueCard
                key={item.id}
                item={item}
                brands={brands}
                onRemove={() => onRemove(item.id)}
                onTagsChange={(tags) =>
                  onPatch(item.id, { tags })
                }
                onFeaturesChange={(features) =>
                  onPatch(item.id, { features })
                }
                onBrandChange={(brandId, brandName) =>
                  onPatch(item.id, {
                    brand_id: brandId,
                    brand_name: brandName,
                  })
                }
                onPatch={(patch) => onPatch(item.id, patch)}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-black/5 p-3.5">
            <button
              onClick={onUploadAll}
              disabled={uploading || pendingCount === 0}
              className="
                flex w-full items-center justify-center gap-2
                rounded-xl
                border border-violet-200
                bg-violet-500/10
                px-4 py-3
                text-[12px] font-medium
                text-violet-600
                transition-all duration-150
                hover:bg-violet-500/15
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              {uploading ? (
                <>
                  <div
                    className="
                      h-3.5 w-3.5
                      animate-spin rounded-full
                      border-2 border-violet-200
                      border-t-violet-500
                    "
                  />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  Upload {pendingCount} file
                  {pendingCount !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}