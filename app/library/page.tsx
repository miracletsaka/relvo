"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildReviewLink,
  clearRenderLibrary,
  deleteRenderFromLibrary,
  getRenderLibrary,
  type RenderLibraryItem,
} from "@/lib/studio/renderLibrary";

export default function LibraryPage() {
  const [items, setItems] = useState<RenderLibraryItem[]>([]);

  useEffect(() => {
    setItems(getRenderLibrary());
  }, []);

  const byProject = useMemo(() => {
    const map = new Map<string, RenderLibraryItem[]>();
    for (const it of items) {
      const key = `${it.projectId}::${it.projectName}`;
      map.set(key, [...(map.get(key) ?? []), it]);
    }
    return [...map.entries()];
  }, [items]);

  const refresh = () => setItems(getRenderLibrary());

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff" }}>
      <div style={{ padding: 20, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>📚 Render Library</div>
          <div style={{ fontSize: 12, opacity: 0.65 }}>All your renders saved locally in this browser.</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link
            href="/studio"
            style={{ textDecoration: "none", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", padding: "10px 14px", borderRadius: 10, fontWeight: 900, fontSize: 13 }}
          >
            ← Back to Studio
          </Link>
          <button
            onClick={() => {
              if (confirm("Clear all saved renders from this browser?")) {
                clearRenderLibrary();
                refresh();
              }
            }}
            style={{ background: "rgba(255,60,60,0.12)", border: "1px solid rgba(255,80,80,0.35)", color: "#ffb3b3", padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 900, fontSize: 13 }}
          >
            Clear
          </button>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {items.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No renders saved yet. Render a draft in Studio and it will appear here.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {byProject.map(([key, group]) => {
              const [projectId, projectName] = key.split("::");
              return (
                <div key={key} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, overflow: "hidden", background: "rgba(0,0,0,0.35)" }}>
                  <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{projectName}</div>
                      <div style={{ fontSize: 12, opacity: 0.6 }}>{group.length} render(s) • Project ID: {projectId}</div>
                    </div>
                    <button
                      onClick={() => {
                        // Just refresh localStorage
                        refresh();
                      }}
                      style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)", color: "#fff", padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontWeight: 900, fontSize: 12 }}
                    >
                      Refresh
                    </button>
                  </div>

                  <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                    {group.map((it) => (
                      <div key={it.id} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, overflow: "hidden", background: "rgba(0,0,0,0.25)" }}>
                        <div style={{ padding: 10, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <div style={{ fontSize: 12, opacity: 0.75 }}>{new Date(it.createdAt).toLocaleString()}</div>
                          <button
                            onClick={() => {
                              if (confirm("Delete this render from library?")) {
                                deleteRenderFromLibrary(it.id);
                                refresh();
                              }
                            }}
                            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)", padding: "6px 10px", borderRadius: 10, cursor: "pointer", fontWeight: 900, fontSize: 12 }}
                          >
                            Delete
                          </button>
                        </div>

                        <div style={{ padding: 10, paddingTop: 0 }}>
                          <video src={it.url} controls playsInline poster={it.poster ?? undefined} style={{ width: "100%", borderRadius: 12, display: "block" }} />
                          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7, wordBreak: "break-all" }}>{it.url}</div>

                          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(it.url);
                                alert("Copied video URL");
                              }}
                              style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)", color: "#fff", padding: "8px 10px", borderRadius: 10, cursor: "pointer", fontWeight: 900, fontSize: 12 }}
                            >
                              Copy URL
                            </button>

                            <button
                              onClick={async () => {
                                const link = buildReviewLink(it.url);
                                await navigator.clipboard.writeText(link);
                                alert("Copied review link");
                              }}
                              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.85)", padding: "8px 10px", borderRadius: 10, cursor: "pointer", fontWeight: 900, fontSize: 12 }}
                            >
                              Copy Review Link
                            </button>

                            <a
                              href={buildReviewLink(it.url)}
                              target="_blank"
                              rel="noreferrer"
                              style={{ textDecoration: "none", background: "transparent", border: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.85)", padding: "8px 10px", borderRadius: 10, cursor: "pointer", fontWeight: 900, fontSize: 12, display: "inline-flex", alignItems: "center" }}
                            >
                              Open Review
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
