import { useRef, useState } from "react";
import { Image as ImageIcon, Video } from "lucide-react";
import type { MediaAssetType } from "./types";

export default function DropZone({
  type,
  onFiles,
}: {
  type: MediaAssetType;
  onFiles: (f: File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const ref = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);

        const files = Array.from(e.dataTransfer.files).filter((f) =>
          type === "image"
            ? f.type.startsWith("image/")
            : f.type.startsWith("video/")
        );

        if (files.length) onFiles(files);
      }}
      className={`
        cursor-pointer rounded-2xl border-2 border-dashed
        px-5 py-7 text-center
        transition-all duration-200
        ${
          dragging
            ? `
              border-violet-500
              bg-violet-500/[0.05]
            `
            : `
              border-black/10
              bg-black/[0.02]
              hover:border-black/15
              hover:bg-black/[0.03]
            `
        }
      `}
    >
      <input
        ref={ref}
        type="file"
        accept={type === "image" ? "image/*" : "video/*"}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            onFiles(Array.from(e.target.files));
          }
        }}
      />

      <div
        className="
          mx-auto mb-3
          flex h-11 w-11 items-center justify-center
          rounded-2xl
          border border-violet-200
          bg-violet-500/10
          text-violet-500
        "
      >
        {type === "image" ? (
          <ImageIcon className="h-5 w-5" />
        ) : (
          <Video className="h-5 w-5" />
        )}
      </div>

      <p className="mb-1 text-[13px] font-medium text-gray-500">
        Drop {type === "image" ? "images" : "videos"} here
      </p>

      <p className="text-[11px] text-gray-400">
        {type === "image"
          ? "JPG, PNG, WebP"
          : "MP4, MOV, WebM"}{" "}
        · or click to browse
      </p>
    </div>
  );
}