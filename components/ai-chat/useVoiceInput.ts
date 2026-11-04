"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000").replace(/\/$/, "");
const TARGET_RATE = 24000;
const FRAME_SAMPLES = (TARGET_RATE * 80) / 1000; // 80 ms = 1920 samples
const MAX_SECONDS = 60;

const WORKLET = `
class Capture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) this.port.postMessage(new Float32Array(ch));
    return true;
  }
}
registerProcessor("capture", Capture);
`;

type State = "idle" | "connecting" | "listening" | "finishing";

// Linear resampler: browser rate -> 24 kHz, returns 16-bit PCM
function makeResampler(inRate: number) {
  const ratio = inRate / TARGET_RATE;
  let carry = new Float32Array(0);
  let pos = 0;
  return (chunk: Float32Array): Int16Array => {
    const buf = new Float32Array(carry.length + chunk.length);
    buf.set(carry);
    buf.set(chunk, carry.length);
    const out: number[] = [];
    while (pos + 1 < buf.length) {
      const i = Math.floor(pos);
      const f = pos - i;
      out.push(buf[i] * (1 - f) + buf[i + 1] * f);
      pos += ratio;
    }
    const keep = Math.floor(pos);
    carry = buf.slice(keep);
    pos -= keep;
    const pcm = new Int16Array(out.length);
    for (let k = 0; k < out.length; k++) {
      const s = Math.max(-1, Math.min(1, out[k]));
      pcm[k] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm;
  };
}

export function useVoiceInput(onText: (text: string, final: boolean) => void) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(false);

  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  const pendingRef = useRef<Int16Array>(new Int16Array(0));
  const maxTimer = useRef<any>(null);
  const finishTimer = useRef<any>(null);

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof WebSocket !== "undefined" &&
        typeof AudioWorkletNode !== "undefined",
    );
  }, []);

  const stopCapture = useCallback(() => {
    clearTimeout(maxTimer.current);
    nodeRef.current?.disconnect();
    nodeRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  }, []);

  // Closes everything and ignores any late transcript
  const teardown = useCallback(() => {
    clearTimeout(finishTimer.current);
    stopCapture();
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState <= 1) ws.close();
    pendingRef.current = new Int16Array(0);
    setState("idle");
  }, [stopCapture]);

  const sendFrames = (pcm: Int16Array) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const merged = new Int16Array(pendingRef.current.length + pcm.length);
    merged.set(pendingRef.current);
    merged.set(pcm, pendingRef.current.length);
    let offset = 0;
    while (merged.length - offset >= FRAME_SAMPLES) {
      ws.send(merged.slice(offset, offset + FRAME_SAMPLES).buffer);
      offset += FRAME_SAMPLES;
    }
    pendingRef.current = merged.slice(offset);
  };

  // User pressed stop: flush the tail, ask for the final transcript, wait for it
  const stop = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return teardown();
    stopCapture();
    if (pendingRef.current.length) {
      const padded = new Int16Array(FRAME_SAMPLES);
      padded.set(pendingRef.current);
      ws.send(padded.buffer);
      pendingRef.current = new Int16Array(0);
    }
    ws.send(JSON.stringify({ type: "endStream" }));
    setState("finishing");
    finishTimer.current = setTimeout(teardown, 6000);
  }, [stopCapture, teardown]);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    setError("");
    setState("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const tRes = await fetch(`${API_BASE}/ai-chat/asr-ticket`, {
        method: "POST",
        credentials: "include",
      });
      if (!tRes.ok) throw new Error((await tRes.text().catch(() => "")) || "Voice input unavailable.");
      const { ticket } = await tRes.json();

      const wsUrl = `${API_BASE.replace(/^http/, "ws")}/ai-chat/asr?ticket=${encodeURIComponent(ticket)}`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      const startCapture = async () => {
        const ctx = new AudioContext();
        ctxRef.current = ctx;
        const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
        await ctx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);

        const source = ctx.createMediaStreamSource(stream);
        const node = new AudioWorkletNode(ctx, "capture");
        nodeRef.current = node;
        const resample = makeResampler(ctx.sampleRate);
        node.port.onmessage = (e) => sendFrames(resample(e.data as Float32Array));

        // Silent sink so the browser keeps pulling audio through the node
        const mute = ctx.createGain();
        mute.gain.value = 0;
        source.connect(node);
        node.connect(mute);
        mute.connect(ctx.destination);

        setState("listening");
        maxTimer.current = setTimeout(stop, MAX_SECONDS * 1000);
      };

      ws.onmessage = (e) => {
        if (typeof e.data !== "string") return;
        let ev: any;
        try { ev = JSON.parse(e.data); } catch { return; }
        if (ev.type === "ready") {
          startCapture().catch((err) => {
            setError(err?.message || "Could not start the microphone.");
            teardown();
          });
        } else if (ev.type === "transcript") {
          onTextRef.current(String(ev.transcript || ""), !!ev.final);
          if (ev.final) teardown();
        } else if (ev.type === "error") {
          setError(ev.message || "Voice input failed.");
          teardown();
        }
      };
      ws.onerror = () => {
        if (wsRef.current === ws) {
          setError("Could not reach voice service.");
          teardown();
        }
      };
      ws.onclose = () => {
        if (wsRef.current === ws) teardown();
      };
    } catch (e: any) {
      const denied = e?.name === "NotAllowedError";
      setError(denied ? "Microphone access was blocked." : e?.message || "Voice input failed.");
      teardown();
    }
  }, [state, stop, teardown]);

  // Drop everything on send or unmount; late transcripts are ignored
  const cancel = teardown;
  useEffect(() => teardown, [teardown]);

  return {
    supported,
    error,
    connecting: state === "connecting",
    listening: state === "listening",
    finishing: state === "finishing",
    start,
    stop,
    cancel,
  };
}