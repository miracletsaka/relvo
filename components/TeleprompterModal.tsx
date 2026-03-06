"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceSegment } from "@/lib/generate-voiceover-script";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RecordedClip {
  segmentIndex:    number;
  blob:            Blob;
  durationSeconds: number;
  hasAudio:        boolean; // always true — mic is always on
  isWebcam:        boolean; // true = video+audio blob | false = audio-only blob
}

interface TeleprompterModalProps {
  segments:    VoiceSegment[];
  onComplete:  (clips: RecordedClip[]) => void;
  onSkip:      () => void;
  onClose:     () => void;
  accentColor: string;
  companyName: string;
}

type Phase = "idle" | "countdown" | "recording" | "between" | "done";

const COUNTDOWN_SECS = 3;
const BETWEEN_SECS   = 2;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TeleprompterModal({
  segments,
  onComplete,
  onSkip,
  onClose,
  accentColor,
  companyName,
}: TeleprompterModalProps) {

  const videoRef     = useRef<HTMLVideoElement>(null);
  const narrationRef = useRef<HTMLDivElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  // Ref so onstop closure always reads the latest clips array
  const clipsRef     = useRef<RecordedClip[]>([]);

  const [phase,       setPhase]       = useState<Phase>("idle");
  const [sceneIndex,  setSceneIndex]  = useState(0);
  const [countdown,   setCountdown]   = useState(COUNTDOWN_SECS);
  const [between,     setBetween]     = useState(BETWEEN_SECS);
  const [elapsed,     setElapsed]     = useState(0);
  const [scrollPos,   setScrollPos]   = useState(0);
  const [clips,       setClips]       = useState<RecordedClip[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const totalScenes = segments.length;
  const seg         = segments[sceneIndex];
  // Even indices (0,2,4,6) = webcam; odd (1,3,5,7) = b-roll audio only
  // Falls back to preferWebcam flag from the script segment
  const isWebcam    = seg?.preferWebcam ?? (sceneIndex % 2 === 0);
  const targetDur   = seg?.durationSeconds ?? 6;
  const progress    = Math.min(elapsed / targetDur, 1);
  const overTime    = elapsed > targetDur + 2;

  // ── Camera + mic init ──────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted     = true;
        }
        setCameraReady(true);
      } catch {
        setError("Camera and microphone access required. Please allow access and reload.");
      }
    })();
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { beginRecording(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── Between-scenes pause ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "between") return;
    if (between <= 0) { advanceScene(); return; }
    const t = setTimeout(() => setBetween(b => b - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, between]);

  // ── Elapsed clock ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => {
      setElapsed((Date.now() - startTimeRef.current) / 1000);
    }, 80);
    return () => clearInterval(t);
  }, [phase]);

  // ── Teleprompter auto-scroll ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "recording" || !seg) return;
    setScrollPos(0);
    let i       = 0;
    const steps = 80;
    const t = setInterval(() => {
      i++;
      setScrollPos(Math.min(i / steps, 1));
      if (i >= steps) clearInterval(t);
    }, (seg.durationSeconds * 1000) / steps);
    return () => clearInterval(t);
  }, [phase, sceneIndex]);

  // ── Sync scroll position to DOM ────────────────────────────────────────────
  useEffect(() => {
    if (!narrationRef.current) return;
    const el  = narrationRef.current;
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTop = scrollPos * max;
  }, [scrollPos]);

  // ── Begin recording one scene ──────────────────────────────────────────────
  const beginRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    // CORE DESIGN:
    // Webcam scene  → full stream (video + audio)
    //                 → blob = video file, used for BOTH visual + voice in that scene
    // B-roll scene  → audio tracks only (camera preview stays on full stream)
    //                 → blob = audio file, played under template animation
    const recordStream = isWebcam
      ? stream
      : new MediaStream(stream.getAudioTracks());

    // Pick best supported mime type — video types only offered for webcam scenes
    const mimeType = [
      isWebcam ? "video/webm;codecs=vp9,opus" : null,
      isWebcam ? "video/webm;codecs=vp8,opus" : null,
      isWebcam ? "video/webm"                 : null,
      "audio/webm;codecs=opus",
      "audio/webm",
    ]
      .filter((t): t is string => t !== null && MediaRecorder.isTypeSupported(t))
      .shift() ?? "";

    const recorder = new MediaRecorder(
      recordStream,
      mimeType ? { mimeType } : undefined,
    );

    chunksRef.current    = [];
    startTimeRef.current = Date.now();
    setElapsed(0);
    setScrollPos(0);

    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const durationSeconds = Math.max(0.5, (Date.now() - startTimeRef.current) / 1000);
      const blob = new Blob(chunksRef.current, {
        type: mimeType || (isWebcam ? "video/webm" : "audio/webm"),
      });

      const clip: RecordedClip = {
        segmentIndex: sceneIndex,
        blob,
        durationSeconds,
        hasAudio: true,  // mic is always recording
        isWebcam,        // tells render pipeline what kind of blob this is
      };

      // Update ref immediately — closure captures this synchronously
      const updated = [...clipsRef.current];
      updated[sceneIndex] = clip;
      clipsRef.current    = updated;

      setClips(prev => {
        const next = [...prev];
        next[sceneIndex] = clip;
        return next;
      });

      // Last scene → hand everything back to parent
      if (sceneIndex === totalScenes - 1) {
        setTimeout(() => onComplete(clipsRef.current.filter(Boolean)), 120);
      }
    };

    recorder.start(100);
    recorderRef.current = recorder;
    setPhase("recording");
  }, [sceneIndex, isWebcam, totalScenes, onComplete]);

  // ── Stop current scene ─────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    recorderRef.current = null;

    if (sceneIndex < totalScenes - 1) {
      setPhase("between");
      setBetween(BETWEEN_SECS);
    } else {
      setPhase("done");
    }
  }, [sceneIndex, totalScenes]);

  // ── Move to next scene after between-pause ─────────────────────────────────
  const advanceScene = useCallback(() => {
    setSceneIndex(i => i + 1);
    setCountdown(COUNTDOWN_SECS);
    setPhase("countdown");
  }, []);

  const handleStart = () => {
    setPhase("countdown");
    setCountdown(COUNTDOWN_SECS);
  };

  // ── Error screen ───────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.96)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:"#1a0a0a", border:"1px solid #ff4444", borderRadius:16, padding:40, maxWidth:480, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>📷</div>
        <div style={{ color:"#ff6666", fontSize:18, marginBottom:24 }}>{error}</div>
        <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
          <button
            onClick={onSkip}
            style={{ background:"#333", color:"#fff", border:"none", borderRadius:8, padding:"12px 32px", fontSize:16, cursor:"pointer" }}
          >
            Use AI voice instead
          </button>
          <button
            onClick={onClose}
            style={{ background:"transparent", color:"rgba(255,255,255,0.4)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, padding:"12px 24px", fontSize:16, cursor:"pointer" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position:"fixed", inset:0, background:"#000", zIndex:1000, display:"flex", flexDirection:"column" }}>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"14px 24px",
        background:"rgba(0,0,0,0.85)",
        borderBottom:"1px solid rgba(255,255,255,0.07)",
        flexShrink:0,
      }}>
        {/* Brand dot + name */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:accentColor, boxShadow:`0 0 10px ${accentColor}` }} />
          <span style={{ color:"rgba(255,255,255,0.9)", fontWeight:700, fontSize:15, letterSpacing:2 }}>
            {companyName.toUpperCase()}
          </span>
        </div>

        {/* Scene progress pills */}
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          {segments.map((s, i) => (
            <div
              key={i}
              title={`Scene ${i + 1}: ${s.preferWebcam ? "Camera" : "Audio only"}`}
              style={{
                width:       i === sceneIndex ? 28 : 10,
                height:      10,
                borderRadius:5,
                background:  i < sceneIndex
                  ? accentColor
                  : i === sceneIndex
                  ? (phase === "recording" ? accentColor : "rgba(255,255,255,0.35)")
                  : "rgba(255,255,255,0.12)",
                transition:  "all 0.3s ease",
                boxShadow:   i === sceneIndex && phase === "recording" ? `0 0 8px ${accentColor}` : "none",
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:8 }}>
          <button
            onClick={onSkip}
            style={{ color:"rgba(255,255,255,0.35)", background:"none", border:"none", fontSize:13, cursor:"pointer", padding:"6px 10px" }}
          >
            Skip → AI voice
          </button>
          <button
            onClick={onClose}
            style={{ color:"rgba(255,255,255,0.25)", background:"none", border:"none", fontSize:20, lineHeight:1, cursor:"pointer", padding:"2px 8px" }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* Camera preview */}
        <div style={{ flex:"0 0 55%", position:"relative", background:"#080808" }}>

          {/* Always-on camera — even during b-roll so user can see themselves */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)", display:"block" }}
          />

          {/* B-roll dim overlay — camera off badge */}
          {!isWebcam && (
            <div style={{
              position:"absolute", inset:0, background:"rgba(0,0,0,0.80)",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:18,
            }}>
              <div style={{ fontSize:60 }}>🎙️</div>
              <div style={{ color:"#fff", fontSize:22, fontWeight:800, letterSpacing:3 }}>AUDIO ONLY</div>
              <div style={{ color:"rgba(255,255,255,0.42)", fontSize:14, textAlign:"center", maxWidth:260, lineHeight:1.65 }}>
                Camera off for this scene.<br />
                Just speak — your voice continues<br />
                over the template animation.
              </div>
            </div>
          )}

          {/* REC indicator */}
          {phase === "recording" && (
            <div style={{
              position:"absolute", top:20, left:20,
              display:"flex", alignItems:"center", gap:8,
              background:"rgba(0,0,0,0.52)", borderRadius:20, padding:"6px 14px",
            }}>
              <div style={{
                width:10, height:10, borderRadius:"50%", background:"#ff2d2d",
                animation:"recPulse 1s infinite", boxShadow:"0 0 10px #ff2d2d",
              }} />
              <span style={{ color:"#fff", fontSize:13, fontWeight:700, letterSpacing:1 }}>
                {isWebcam ? "RECORDING" : "RECORDING AUDIO"}
              </span>
            </div>
          )}

          {/* Time progress bar */}
          {phase === "recording" && (
            <div style={{ position:"absolute", bottom:20, left:20, right:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>{elapsed.toFixed(1)}s</span>
                <span style={{ color: overTime ? "#ff6060" : "rgba(255,255,255,0.35)", fontSize:13 }}>
                  {overTime ? "⚠ over time" : `target ${targetDur}s`}
                </span>
              </div>
              <div style={{ height:4, background:"rgba(255,255,255,0.1)", borderRadius:2 }}>
                <div style={{
                  height:"100%", width:`${progress * 100}%`,
                  background: overTime ? "#ff6060" : accentColor,
                  borderRadius:2, transition:"width 0.08s linear",
                  boxShadow: overTime ? "0 0 8px #ff6060" : `0 0 10px ${accentColor}`,
                }} />
              </div>
            </div>
          )}

          {/* Countdown overlay */}
          {phase === "countdown" && (
            <div style={{
              position:"absolute", inset:0, background:"rgba(0,0,0,0.80)",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14,
            }}>
              <div style={{
                fontSize:100, fontWeight:900, color:accentColor,
                textShadow:`0 0 50px ${accentColor}`, lineHeight:1,
                animation:"countPop 0.25s ease",
              }}>
                {countdown === 0 ? "GO" : countdown}
              </div>
              <div style={{ color:"rgba(255,255,255,0.55)", fontSize:16, letterSpacing:3, fontWeight:600 }}>
                {isWebcam ? "LOOK AT CAMERA" : "READY TO SPEAK"}
              </div>
            </div>
          )}

          {/* Between-scenes overlay */}
          {phase === "between" && (
            <div style={{
              position:"absolute", inset:0, background:"rgba(0,0,0,0.90)",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20,
            }}>
              <div style={{ color:"rgba(255,255,255,0.9)", fontSize:20, fontWeight:700 }}>
                Scene {sceneIndex + 1} ✓
              </div>
              <div style={{ color:"rgba(255,255,255,0.4)", fontSize:14, textAlign:"center" }}>
                Next → Scene {sceneIndex + 2}:{" "}
                <span style={{ color:"rgba(255,255,255,0.75)", fontWeight:600 }}>
                  {segments[sceneIndex + 1]?.preferWebcam ? "On camera" : "Audio only"}
                </span>
              </div>
              <div style={{
                width:56, height:56, borderRadius:"50%",
                border:`3px solid ${accentColor}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:26, fontWeight:900, color:accentColor,
              }}>
                {between}
              </div>
            </div>
          )}
        </div>

        {/* ── Teleprompter panel ──────────────────────────────────────────── */}
        <div style={{
          flex:1, display:"flex", flexDirection:"column",
          background:"#0c0c0c", borderLeft:"1px solid rgba(255,255,255,0.05)",
          overflow:"hidden",
        }}>

          {/* Scene header */}
          <div style={{ padding:"18px 26px 0", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{
                background:   isWebcam ? accentColor : "rgba(255,255,255,0.12)",
                color:        "#fff", borderRadius:6,
                padding:      "4px 14px", fontSize:11, fontWeight:700, letterSpacing:2,
              }}>
                {isWebcam ? "📹 ON CAMERA" : "🎙️ VOICE ONLY"}
              </div>
              <span style={{ color:"rgba(255,255,255,0.25)", fontSize:13 }}>
                Scene {sceneIndex + 1} / {totalScenes}
              </span>
              <span style={{ color:accentColor, fontSize:13, marginLeft:"auto" }}>
                ~{targetDur}s
              </span>
            </div>

            {/* Screen text that will appear on the rendered video */}
            <div style={{
              fontWeight:900, fontSize:26, color:"#fff",
              letterSpacing:-1, lineHeight:1.1, marginBottom:6,
              textTransform:"uppercase",
            }}>
              {seg?.screenText}
            </div>
          </div>

          {/* Scrolling narration text */}
          <div
            ref={narrationRef}
            style={{ flex:1, padding:"10px 26px 20px", overflowY:"auto", scrollBehavior:"smooth" }}
          >
            <div style={{
              fontSize:21, lineHeight:1.8,
              color:      phase === "recording" ? "#ffffff" : "rgba(255,255,255,0.52)",
              fontWeight: 400, transition:"color 0.3s",
            }}>
              {seg?.narration}
            </div>

            {/* Preview of next scene */}
            {sceneIndex < totalScenes - 1 && (
              <div style={{ marginTop:32, paddingTop:18, borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ color:"rgba(255,255,255,0.18)", fontSize:11, letterSpacing:3, marginBottom:8 }}>
                  COMING UP — SCENE {sceneIndex + 2}
                </div>
                <div style={{ color:"rgba(255,255,255,0.28)", fontSize:14, lineHeight:1.6 }}>
                  {segments[sceneIndex + 1]?.narration?.slice(0, 90)}…
                </div>
              </div>
            )}
          </div>

          {/* ── Controls ──────────────────────────────────────────────────── */}
          <div style={{
            padding:"18px 26px", borderTop:"1px solid rgba(255,255,255,0.05)",
            display:"flex", flexDirection:"column", gap:12, flexShrink:0,
          }}>

            {phase === "idle" && (
              <button
                onClick={handleStart}
                disabled={!cameraReady}
                style={{
                  width:"100%", padding:"18px",
                  background:    cameraReady ? accentColor : "rgba(255,255,255,0.08)",
                  color:         "#fff", border:"none", borderRadius:12,
                  fontSize:18, fontWeight:800, letterSpacing:1,
                  cursor:        cameraReady ? "pointer" : "not-allowed",
                  boxShadow:     cameraReady ? `0 6px 28px ${accentColor}55` : "none",
                  transition:    "all 0.2s",
                }}
              >
                {cameraReady ? "▶  START RECORDING" : "Setting up camera…"}
              </button>
            )}

            {phase === "recording" && (
              <button
                onClick={stopRecording}
                style={{
                  width:"100%", padding:"18px",
                  background:"rgba(255,40,40,0.12)", border:"2px solid #ff2d2d",
                  color:"#ff5555", borderRadius:12,
                  fontSize:18, fontWeight:800, letterSpacing:1, cursor:"pointer",
                }}
              >
                ⏹  DONE — NEXT SCENE
              </button>
            )}

            {(phase === "countdown" || phase === "between") && (
              <div style={{
                width:"100%", padding:"18px",
                background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
                borderRadius:12, textAlign:"center", color:"rgba(255,255,255,0.35)", fontSize:15,
              }}>
                {phase === "countdown" ? `Starting in ${countdown}…` : `Next scene in ${between}s…`}
              </div>
            )}

            {phase === "done" && (
              <div style={{ textAlign:"center", color:"rgba(255,255,255,0.55)", fontSize:16, padding:"10px 0" }}>
                ✓ All {totalScenes} scenes recorded — processing…
              </div>
            )}

            {/* Scene status grid */}
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {segments.map((s, i) => {
                const done      = !!clips[i];
                const isCurrent = i === sceneIndex;
                const isRec     = isCurrent && phase === "recording";
                return (
                  <div key={i} style={{
                    flex:"1 0 auto", padding:"5px 8px",
                    background: done  ? `${accentColor}1a` : isRec ? "rgba(255,40,40,0.12)" : "rgba(255,255,255,0.03)",
                    border:`1px solid ${done ? `${accentColor}55` : isRec ? "rgba(255,40,40,0.35)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius:6, textAlign:"center", fontSize:11, fontWeight:600,
                    color: done ? accentColor : isRec ? "#ff5555" : "rgba(255,255,255,0.25)",
                  }}>
                    {done ? "✓" : isRec ? "●" : "○"} S{i + 1}
                    <div style={{ fontSize:9, marginTop:1, opacity:0.6 }}>
                      {s.preferWebcam ? "cam" : "mic"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes recPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes countPop { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  );
}