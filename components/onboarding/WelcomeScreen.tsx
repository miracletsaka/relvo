"use client";
/**
 * components/onboarding/WelcomeScreen.tsx
 * First screen: plays a demo video, then invites user to start onboarding.
 */

import { useState, useRef } from "react";

type Props = {
  onStart: () => void;
};

export default function WelcomeScreen({ onStart }: Props) {
  const [videoEnded, setVideoEnded]   = useState(false);
  const [videoPaused, setVideoPaused] = useState(true);
  const [hasPlayed, setHasPlayed]     = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setVideoPaused(false);
    setHasPlayed(true);
    videoRef.current?.play();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080810", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", overflow: "hidden" }}>

      {/* Ambient background glows */}
      <div style={{ position: "absolute", top: "-20%", left: "10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.10) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 780, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 0, position: "relative", zIndex: 1 }}>

        {/* Logo mark */}
        <div className="">
              <img src="/logo.png" alt="Relvo AI" style={{ width: 50, height: "auto" }} />
            </div>

        {/* Headline */}
        <div style={{ textAlign: "center", marginBottom: 16, animation: "fadeUp 0.7s ease both" }}>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 54px)", fontWeight: 900, color: "#fff", lineHeight: 1.1, letterSpacing: "-1.5px", fontFamily: "'Syne', sans-serif", margin: 0 }}>
            Your AI Content
            <span style={{ display: "block", background: "linear-gradient(135deg, #a78bfa, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Studio is Almost Ready
            </span>
          </h1>
        </div>


        {/* Video container */}
        <div style={{ width: "100%", maxWidth: 720, position: "relative", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(167,139,250,0.1)", animation: "fadeUp 0.7s 0.2s ease both", background: "#0d0d1a", aspectRatio: "16/9" }}>

          {/* Replace /videos/neuroflow-demo.mp4 with your actual video path */}
          <video
            ref={videoRef}
            src="https://neuroflow.lon1.digitaloceanspaces.com/videos/cinematic-onboarding-visuals-for-a-social-content-_1.mp4"
            poster="/images/video-poster.jpg"
            playsInline
            onEnded={() => setVideoEnded(true)}
            autoPlay
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />

          {/* Play overlay */}
          {(videoPaused || !hasPlayed) && (
            <div
              onClick={handlePlay}
              style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: hasPlayed ? "rgba(0,0,0,0.45)" : "rgba(8,8,16,0.6)", gap: 14, transition: "background 0.2s" }}>
              {/* Play button */}
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(124,58,237,0.9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(124,58,237,0.5)", transition: "transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.08)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 56px rgba(124,58,237,0.7)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(124,58,237,0.5)"; }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", fontFamily: "DM Mono, monospace", letterSpacing: "0.08em" }}>WATCH DEMO · 2 MIN</span>
            </div>
          )}

          {/* Skip overlay — top right */}
          {hasPlayed && (
            <button onClick={() => setVideoEnded(true)} style={{ position: "absolute", top: 12, right: 12, padding: "5px 12px", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 700, fontFamily: "DM Mono, monospace", cursor: "pointer", letterSpacing: "0.06em" }}>
              SKIP
            </button>
          )}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, animation: "fadeUp 0.7s 0.3s ease both" }}>
          <button
            onClick={onStart}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 40px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "'Syne', sans-serif", letterSpacing: "-0.2px", boxShadow: "0 8px 32px rgba(124,58,237,0.45)", transition: "transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(124,58,237,0.6)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(124,58,237,0.45)"; }}>
            Set Up My Workspace
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", fontFamily: "DM Mono, monospace", letterSpacing: "0.06em" }}>
            Takes about 3 minutes · No credit card
          </span>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Mono&family=DM+Sans:wght@400;500&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
