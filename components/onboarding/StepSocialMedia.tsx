"use client";
/**
 * components/onboarding/StepSocialMedia.tsx
 * Step 5: Select which social platforms + optional profile URLs.
 */

import { useState } from "react";
import { StepShell } from "./StepShell";

type SocialData = {
  facebook_url:  string;
  instagram_url: string;
  linkedin_url:  string;
  twitter_url:   string;
  tiktok_url:    string;
  youtube_url:   string;
};

type PlatformKey = keyof SocialData;

const PLATFORMS: { key: PlatformKey; label: string; icon: string; placeholder: string; color: string }[] = [
  { key: "instagram_url", label: "Instagram",  icon: "📸", placeholder: "https://instagram.com/yourbrand",  color: "#e1306c" },
  { key: "facebook_url",  label: "Facebook",   icon: "👤", placeholder: "https://facebook.com/yourbrand",  color: "#1877f2" },
  { key: "linkedin_url",  label: "LinkedIn",   icon: "💼", placeholder: "https://linkedin.com/company/…",  color: "#0a66c2" },
  { key: "twitter_url",   label: "X / Twitter",icon: "🐦", placeholder: "https://x.com/yourbrand",          color: "#000000" },
  { key: "tiktok_url",    label: "TikTok",     icon: "🎵", placeholder: "https://tiktok.com/@yourbrand",   color: "#69c9d0" },
  { key: "youtube_url",   label: "YouTube",    icon: "▶️", placeholder: "https://youtube.com/@yourbrand",  color: "#ff0000" },
];

type Props = {
  initial?:  Partial<SocialData>;
  onNext:    (data: SocialData) => void;
  onBack:    () => void;
  stepIndex: number;
  loading?:  boolean;
};

export default function StepSocialMedia({ initial = {}, onNext, onBack, stepIndex, loading }: Props) {
  const [selected, setSelected] = useState<Set<PlatformKey>>(
    new Set(Object.entries(initial).filter(([, v]) => !!v).map(([k]) => k as PlatformKey))
  );
  const [urls, setUrls] = useState<SocialData>({
    facebook_url:  initial.facebook_url  || "",
    instagram_url: initial.instagram_url || "",
    linkedin_url:  initial.linkedin_url  || "",
    twitter_url:   initial.twitter_url   || "",
    tiktok_url:    initial.tiktok_url    || "",
    youtube_url:   initial.youtube_url   || "",
  });

  const togglePlatform = (key: PlatformKey) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const handleNext = () => {
    // Only include selected platforms
    const result: SocialData = {
      facebook_url:  selected.has("facebook_url")  ? urls.facebook_url  : "",
      instagram_url: selected.has("instagram_url") ? urls.instagram_url : "",
      linkedin_url:  selected.has("linkedin_url")  ? urls.linkedin_url  : "",
      twitter_url:   selected.has("twitter_url")   ? urls.twitter_url   : "",
      tiktok_url:    selected.has("tiktok_url")    ? urls.tiktok_url    : "",
      youtube_url:   selected.has("youtube_url")   ? urls.youtube_url   : "",
    };
    onNext(result);
  };

  return (
    <StepShell
      stepIndex={stepIndex}
      eyebrow="Step 5 of 6"
      headline="Where are you active online?"
      sub="Select the platforms you post on. Relvo will tailor content formats and scheduling for each."
      onNext={handleNext}
      onBack={onBack}
      nextLabel={loading ? "Saving…" : selected.size === 0 ? "Skip for now →" : `Continue with ${selected.size} platform${selected.size > 1 ? "s" : ""} →`}
      nextLoading={loading}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Platform grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {PLATFORMS.map(p => {
            const isOn = selected.has(p.key);
            return (
              <button key={p.key} type="button" onClick={() => togglePlatform(p.key)}
                style={{
                  padding: "18px 14px", borderRadius: 14, cursor: "pointer",
                  border: `1.5px solid ${isOn ? p.color + "60" : "rgba(255,255,255,0.07)"}`,
                  background: isOn ? `${p.color}14` : "rgba(255,255,255,0.03)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                  transition: "all 0.2s",
                  boxShadow: isOn ? `0 0 16px ${p.color}22` : "none",
                  position: "relative",
                }}>
                {/* Checkmark */}
                {isOn && (
                  <div style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: "50%", background: p.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
                <span style={{ fontSize: 30 }}>{p.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: isOn ? "#fff" : "rgba(255,255,255,0.4)", fontFamily: "'Syne', sans-serif" }}>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* URL inputs for selected */}
        {selected.size > 0 && (
          <div style={{ padding: "20px", background: "rgba(255,255,255,0.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", margin: "0 0 16px" }}>
              Profile URLs <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.15)" }}>— optional, paste your page links</span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {PLATFORMS.filter(p => selected.has(p.key)).map(p => (
                <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>{p.icon}</span>
                  <input
                    value={urls[p.key]}
                    onChange={e => setUrls(u => ({ ...u, [p.key]: e.target.value }))}
                    placeholder={p.placeholder}
                    style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.07)", borderRadius: 10, color: "#f1f5f9", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", transition: "border-color 0.2s" }}
                    onFocus={e => { e.target.style.borderColor = `${p.color}80`; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hint */}
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", margin: 0, textAlign: "center" }}>
          You can connect and add more platforms later in Settings
        </p>
      </div>
    </StepShell>
  );
}