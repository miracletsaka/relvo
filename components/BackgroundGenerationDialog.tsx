"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, RefreshCw, X, Wand2 } from "lucide-react";

interface GeneratedImage {
  url: string;
  prompt: string;
  generatedAt: string;
}

interface BackgroundGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatedImages: GeneratedImage[];
  selectedImageUrls: string[];
  onSelectImage: (url: string) => void;
  onSave: () => void;
  onRegenerate: () => void;
  isLoading?: boolean;
  isSaving?: boolean;
  error?: string | null;
}

export function BackgroundGenerationDialog({
  open, onOpenChange, generatedImages, selectedImageUrls,
  onSelectImage, onSave, onRegenerate,
  isLoading = false, isSaving = false, error = null,
}: BackgroundGenerationDialogProps) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .bg-dialog-content {
          background: #141418 !important;
          border: 1px solid rgba(255,255,255,0.09) !important;
          border-radius: 20px !important;
          font-family: 'Syne', sans-serif;
          color: #e4e4e7;
          max-width: 740px !important;
        }
        .bg-img-card {
          border-radius: 14px;
          overflow: hidden;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          background: rgba(255,255,255,0.03);
        }
        .bg-img-card:hover { border-color: rgba(139,92,246,0.4); }
        .bg-img-card.selected { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(139,92,246,0.2); }
        .bg-img-overlay {
          position: absolute; inset: 0;
          background: rgba(124,58,237,0.35);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(1px);
        }
        .bg-prompt-text {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-top: 8px;
        }
        .bg-action-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 18px;
          border-radius: 10px;
          font-family: 'Syne', sans-serif;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer; transition: all 0.15s; border: none;
        }
        .bg-btn-primary { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; }
        .bg-btn-primary:hover:not(:disabled) { opacity: 0.85; }
        .bg-btn-outline { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.55); }
        .bg-btn-outline:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); }
        .bg-action-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .bg-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.1); border-top-color: #a78bfa; border-radius: 50%; animation: bgspin 0.7s linear infinite; display: inline-block; }
        @keyframes bgspin { to { transform: rotate(360deg); } }
        .pulse-dot { width: 8px; height: 8px; background: #a78bfa; border-radius: 50%; animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.8); } }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-dialog-content">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Wand2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <DialogTitle style={{ color: "#e4e4e7", fontSize: 16, fontWeight: 700, fontFamily: "Syne, sans-serif" }}>
                  AI Background Generator
                </DialogTitle>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                  Select images to attach to your content library
                </p>
              </div>
            </div>
          </DialogHeader>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#f87171" }}>
              {error}
            </div>
          )}

          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 16 }}>
              <div style={{ position: "relative", width: 56, height: 56 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(139,92,246,0.15)" }} />
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#7c3aed", animation: "bgspin 1s linear infinite" }} />
                <div style={{ position: "absolute", inset: 8, borderRadius: "50%", background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Wand2 className="w-4 h-4" style={{ color: "#a78bfa" }} />
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#e4e4e7" }}>Generating backgrounds…</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Creating 3 unique images from your content prompts</p>
              </div>
            </div>
          ) : generatedImages.length > 0 ? (
            <div className="py-2">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                  {selectedImageUrls.length > 0
                    ? <span style={{ color: "#a78bfa", fontWeight: 700 }}>{selectedImageUrls.length} selected</span>
                    : "Click images to select"}
                </span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace" }}>
                  {generatedImages.length} generated
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {generatedImages.map((img, idx) => {
                  const isSelected = selectedImageUrls.includes(img.url);
                  return (
                    <div key={idx}>
                      <div
                        className={`bg-img-card ${isSelected ? "selected" : ""}`}
                        onClick={() => onSelectImage(img.url)}
                      >
                        <img
                          src={img.url}
                          alt={`Generated ${idx + 1}`}
                          style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
                        />
                        {isSelected && (
                          <div className="bg-img-overlay">
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(124,58,237,0.5)" }}>
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        )}
                        {/* Index badge */}
                        <div style={{ position: "absolute", top: 8, left: 8, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>
                          {idx + 1}
                        </div>
                      </div>
                      <p className="bg-prompt-text">{img.prompt}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: 12, color: "rgba(255,255,255,0.2)" }}>
              <Wand2 className="w-10 h-10 opacity-20" />
              <p style={{ fontSize: 13, fontWeight: 600 }}>No images yet</p>
              <p style={{ fontSize: 11, textAlign: "center", maxWidth: 220 }}>Click Regenerate to create backgrounds from your content</p>
            </div>
          )}

          <DialogFooter>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8 }}>
              <button className="bg-action-btn bg-btn-outline" onClick={onRegenerate} disabled={isSaving || isLoading}>
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="bg-action-btn bg-btn-outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  className="bg-action-btn bg-btn-primary"
                  onClick={onSave}
                  disabled={selectedImageUrls.length === 0 || isSaving}
                >
                  {isSaving ? <><span className="bg-spinner" />Saving…</> : <><Check className="w-3.5 h-3.5" />Save {selectedImageUrls.length > 0 ? `(${selectedImageUrls.length})` : ""}</>}
                </button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}