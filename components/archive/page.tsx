"use client";
/**
 * app/onboarding/page.tsx
 * ────────────────────────────────────────────────────────────────
 * Intelligent onboarding flow:
 *   1. No org          → Create org step
 *   2. Org, no brand   → Create brand step
 *   3. One org + brand → Redirect to /dashboard
 *   4. Multi-org       → Org picker
 *
 * Updated:
 *   - Brand creation now follows the editor approach
 *   - Generates templates automatically for all active tones
 *   - Renders hidden TemplateCanvas
 *   - Uploads thumbnail to Spaces
 *   - Saves templates with brand_id, tone_id, orientation
 * ────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useRef, useState } from "react";
import TemplateCanvas from "@/components/template-canvas";
import { useRouter } from "next/navigation";
import { DEFAULT_CAMPAIGN_DATA } from "@/lib/campaign-context";
import { createTemplate } from "@/lib/template-storage";
import { uploadFileToSpaces } from "@/lib/upload-client";
import type { CampaignData, Template, TemplateShape } from "@/lib/types";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

// ── tiny API helpers ──────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...((opts.headers as any) || {}) },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail || json.message || `Error ${res.status}`);
  return json as T;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

async function waitForCanvasPaint() {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function ensureBgString(bg: any): string | null {
  if (!bg) return null;
  if (typeof bg === "string") return bg;
  return null;
}

// ── types ─────────────────────────────────────────────────────────────────────
type Org = { id: string; name: string; slug: string; role: string };
type Brand = { id: string; display_name: string; is_active: boolean };

type Tone = {
  id: string;
  name: string;
  label?: string;
  description?: string;
  emoji?: string;
  is_active?: boolean;
  sort_order?: number;
};

type LayoutVariant = any;

// ── Step indicators ───────────────────────────────────────────────────────────
const STEPS = ["Account", "Workspace", "Brand", "Done"];

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 48 }}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;

        return (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              flex: i < STEPS.length - 1 ? 1 : "none",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: done
                    ? "#34d399"
                    : active
                    ? "linear-gradient(135deg,#818cf8,#6366f1)"
                    : "rgba(255,255,255,0.06)",
                  border: `2px solid ${
                    done ? "#34d399" : active ? "#818cf8" : "rgba(255,255,255,0.1)"
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                  boxShadow: active ? "0 0 20px rgba(99,102,241,0.4)" : "none",
                }}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0c0c0f" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: active ? "#fff" : "rgba(255,255,255,0.2)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {i + 1}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: active ? "#818cf8" : done ? "#34d399" : "rgba(255,255,255,0.2)",
                  fontFamily: "DM Mono, monospace",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: done
                    ? "linear-gradient(90deg,#34d399,rgba(52,211,153,0.3))"
                    : "rgba(255,255,255,0.06)",
                  margin: "0 8px",
                  marginBottom: 22,
                  transition: "background 0.6s ease",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Floating particles ────────────────────────────────────────────────────────
function Particles() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            borderRadius: "50%",
            background: i % 3 === 0 ? "#818cf8" : i % 3 === 1 ? "#34d399" : "#f472b6",
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.4 + 0.1,
            animation: `float-${i % 4} ${6 + Math.random() * 8}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 6}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes float-0 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-30px) translateX(10px)} }
        @keyframes float-1 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(20px) translateX(-15px)} }
        @keyframes float-2 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-20px) translateX(-10px)} }
        @keyframes float-3 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(25px) translateX(20px)} }
      `}</style>
    </div>
  );
}

// ── Card wrapper with entrance animation ──────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
    className="space-y-2"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        padding: 36,
        backdropFilter: "blur(20px)",
        animation: "cardIn 0.5s cubic-bezier(0.34,1.2,0.64,1) both",
      }}
    >
      {children}
      <style>{`@keyframes cardIn { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
function Input({ value, onChange, placeholder, autoFocus, onKeyDown, disabled }: any) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
      disabled={disabled}
      style={{
        width: "100%",
        boxSizing: "border-box",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 14,
        padding: "14px 18px",
        color: "#f1f5f9",
        fontSize: 15,
        fontWeight: 600,
        fontFamily: "Syne, sans-serif",
        outline: "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "rgba(129,140,248,0.6)";
        e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "rgba(255,255,255,0.1)";
        e.target.style.boxShadow = "none";
      }}
    />
  );
}

// ── Primary button ────────────────────────────────────────────────────────────
function PrimaryBtn({ onClick, disabled, loading, children }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: "100%",
        padding: "14px 24px",
        background: disabled || loading ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#818cf8,#6366f1)",
        border: "none",
        borderRadius: 14,
        color: "#fff",
        fontSize: 14,
        fontWeight: 800,
        fontFamily: "Syne, sans-serif",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        transition: "all 0.2s",
        letterSpacing: "0.02em",
        boxShadow: disabled || loading ? "none" : "0 4px 20px rgba(99,102,241,0.35)",
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {loading && (
        <span
          style={{
            width: 15,
            height: 15,
            border: "2px solid rgba(255,255,255,0.2)",
            borderTopColor: "#fff",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.7s linear infinite",
          }}
        />
      )}
      {children}
    </button>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────
function ErrBanner({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 15px",
        background: "rgba(239,68,68,0.1)",
        border: "1px solid rgba(239,68,68,0.25)",
        borderRadius: 12,
        fontSize: 12,
        color: "#fca5a5",
        marginBottom: 16,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span style={{ flex: 1 }}>{msg}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          opacity: 0.6,
          padding: 2,
          display: "flex",
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Hint box ──────────────────────────────────────────────────────────────────
function HintBox({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "16px 18px",
        background: "rgba(129,140,248,0.06)",
        border: "1px solid rgba(129,140,248,0.15)",
        borderRadius: 14,
        marginBottom: 24,
      }}
    >
      <div style={{ flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{body}</div>
      </div>
    </div>
  );
}

// ── ORG PICKER step ───────────────────────────────────────────────────────────
function OrgPickerStep({
  orgs,
  onPick,
  onCreateNew,
}: {
  orgs: Org[];
  onPick: (org: Org) => void;
  onCreateNew: () => void;
}) {
  const [picking, setPicking] = useState<string | null>(null);

  const pick = async (org: Org) => {
    setPicking(org.id);
    try {
      await apiFetch(`/organisations/switch/${org.id}`, { method: "POST" });
      onPick(org);
    } catch {
      setPicking(null);
    }
  };

  return (
    <div style={{ animation: "cardIn 0.5s cubic-bezier(0.34,1.2,0.64,1) both" }}>
      <HintBox
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        }
        title="Choose your workspace"
        body="You belong to multiple organisations. Select the one you'd like to enter, or create a new workspace below."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {orgs.map((org, i) => (
          <button
            key={org.id}
            onClick={() => pick(org)}
            disabled={!!picking}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "16px 20px",
              background: picking === org.id ? "rgba(129,140,248,0.15)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${
                picking === org.id ? "rgba(129,140,248,0.4)" : "rgba(255,255,255,0.08)"
              }`,
              borderRadius: 16,
              cursor: picking ? "not-allowed" : "pointer",
              textAlign: "left",
              transition: "all 0.2s",
              animation: `cardIn 0.4s cubic-bezier(0.34,1.2,0.64,1) ${i * 0.07}s both`,
            }}
            onMouseEnter={(e) => {
              if (!picking) {
                (e.currentTarget as HTMLElement).style.background = "rgba(129,140,248,0.08)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(129,140,248,0.25)";
              }
            }}
            onMouseLeave={(e) => {
              if (picking !== org.id) {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
              }
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                flexShrink: 0,
                background: `hsl(${Array.from(org.id).reduce((a, c) => a + c.charCodeAt(0), 0) % 360},55%,55%)22`,
                border: `1px solid hsl(${Array.from(org.id).reduce((a, c) => a + c.charCodeAt(0), 0) % 360},55%,55%)44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 800,
                color: `hsl(${Array.from(org.id).reduce((a, c) => a + c.charCodeAt(0), 0) % 360},60%,65%)`,
                fontFamily: "Syne, sans-serif",
              }}
            >
              {org.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{org.name}</div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "DM Mono, monospace",
                  marginTop: 2,
                }}
              >
                {org.role} · {org.slug}
              </div>
            </div>
            {picking === org.id ? (
              <span
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid rgba(255,255,255,0.15)",
                  borderTopColor: "#818cf8",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.7s linear infinite",
                }}
              />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </button>
        ))}
      </div>
      <button
        onClick={onCreateNew}
        style={{
          width: "100%",
          padding: "12px 20px",
          background: "none",
          border: "1px dashed rgba(255,255,255,0.12)",
          borderRadius: 14,
          color: "rgba(255,255,255,0.35)",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "Syne, sans-serif",
          transition: "all 0.2s",
          letterSpacing: "0.04em",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(129,140,248,0.3)";
          (e.currentTarget as HTMLElement).style.color = "#a5b4fc";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
          (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)";
        }}
      >
        + Create new workspace
      </button>
    </div>
  );
}

// ── CREATE ORG step ───────────────────────────────────────────────────────────
function CreateOrgStep({ onDone }: { onDone: (org: Org) => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const slug = slugify(name);

  const submit = async () => {
    if (!name.trim()) {
      setErr("Workspace name is required");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const json = await apiFetch<{ ok: boolean; organisation: Org }>("/organisations", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), slug }),
      });
      onDone(json.organisation);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <HintBox
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        }
        title="Create your workspace"
        body="A workspace is your organisation's home in NeuroFlow. Your team, brands, and content all live here. You can always create more workspaces later."
      />

      <label
        style={{
          display: "block",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)",
          fontFamily: "DM Mono, monospace",
          marginBottom: 8,
        }}
      >
        Workspace Name
      </label>
      <div style={{ marginBottom: 16 }}>
        <Input
          value={name}
          onChange={setName}
          placeholder="Relvo  Marketing Agency"
          autoFocus
          onKeyDown={(e: any) => e.key === "Enter" && submit()}
          disabled={loading}
        />
        {slug && (
          <div style={{ marginTop: 8, fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace" }}>
            URL: <span style={{ color: "#818cf8" }}>Relvo.neuroflowai.co.uk/business/{slug}</span>
          </div>
        )}
      </div>

      <div
        style={{
          marginBottom: 20,
          padding: "14px 16px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(255,255,255,0.3)",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: "DM Mono, monospace",
          }}
        >
          Free plan includes
        </div>
        {["1 brand", "2 social platforms", "20 AI drafts / month", "Unlimited team members"].map((f) => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{f}</span>
          </div>
        ))}
      </div>

      {err && <ErrBanner msg={err} onClose={() => setErr(null)} />}
      <PrimaryBtn onClick={submit} loading={loading} disabled={!name.trim()}>
        {loading ? "Creating…" : "Create Workspace →"}
      </PrimaryBtn>
    </Card>
  );
}

// ── CREATE BRAND step ─────────────────────────────────────────────────────────
function CreateBrandStep({
  org,
  onDone,
  onSkip,
}: {
  org: Org;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  const [err, setErr] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [campaignData, setCampaignData] = useState<CampaignData>(DEFAULT_CAMPAIGN_DATA as any);
  const [shapes, setShapes] = useState<TemplateShape[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  const [tones, setTones] = useState<any[]>([]);
  const [progressText, setProgressText] = useState("");

  const autoId = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const CANVAS_WIDTH = orientation === "portrait" ? 1080 : 1080;
  const CANVAS_HEIGHT = orientation === "portrait" ? 1350 : 1080;

  useEffect(() => {
    apiFetch<any[]>(`/tones?active_only=true`)
      .then(setTones)
      .catch(() => {});
  }, []);

  const canvasToFile = async (canvas: HTMLCanvasElement, filename: string) => {
    const blob: Blob = await new Promise((res, rej) => {
      canvas.toBlob((b) => (b ? res(b) : rej("fail")), "image/png", 1);
    });
    return new File([blob], filename, { type: "image/png" });
  };

  const waitForPaint = async () => {
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
  };

  const submit = async () => {
    if (!name.trim()) return setErr("Brand name required");

    setLoading(true);
    setErr(null);

    try {
      // 1. Create brand
      await apiFetch("/brands", {
        method: "POST",
        body: JSON.stringify({
          id: autoId,
          display_name: name,
          is_active: true,
        }),
      });

      const activeTones = tones.length
        ? tones
        : await apiFetch<any[]>(`/tones?active_only=true`);

      if (!activeTones.length) throw new Error("No tones found");

      // 2. PRE-OPEN TABS (CRITICAL FOR BROWSER)
      const tabRefs: Window[] = [];

      for (let i = 0; i < activeTones.length; i++) {
        const tone = activeTones[i];

        const tab = window.open("", "_blank");

        if (tab) {
          tab.document.write(`
            <html>
              <body style="
                font-family:sans-serif;
                display:flex;
                align-items:center;
                justify-content:center;
                height:100vh;
                background:#0b0b0f;
                color:white;
              ">
                <div>Generating ${tone.name} template...</div>
              </body>
            </html>
          `);

          tabRefs.push(tab);

          if (i === 0) tab.focus();
        }
      }

      // 3. GENERATE + SAVE + REDIRECT EACH TAB
      for (let i = 0; i < activeTones.length; i++) {
        const tone = activeTones[i];

        setProgressText(`Generating ${tone.name}...`);

        const res = await fetch("/api/generate-template-to-canvas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignData: {
              ...DEFAULT_CAMPAIGN_DATA,
              companyName: name,
              toneName: tone.name,
            },
            canvasWidth: CANVAS_WIDTH,
            canvasHeight: CANVAS_HEIGHT,
          }),
        });

        const data = await res.json();
        if (!data.success) throw new Error("Generation failed");

        setShapes(data.shapes);
        setBackgroundImage(data.backgroundImage);
        setCampaignData(data.campaignData);

        await waitForPaint();

        if (!canvasRef.current) throw new Error("Canvas not ready");

        // Thumbnail
        const file = await canvasToFile(
          canvasRef.current,
          `${autoId}-${tone.id}.png`
        );

        const thumbnailUrl = await uploadFileToSpaces(file);

        // Save template
        const saveRes = await createTemplate({
          name: `${name} - ${tone.name}`,
          description: `Auto template`,
          shapes: data.shapes,
          canvasWidth: CANVAS_WIDTH,
          canvasHeight: CANVAS_HEIGHT,
          backgroundImage: data.backgroundImage,
          thumbnail_url: thumbnailUrl,
          brand_id: autoId,
          tone_id: tone.id,
          orientation,
        } as any);

        if (!saveRes?.ok) throw new Error("Save failed");

        // 🚀 Redirect corresponding tab
        const tab = tabRefs[i];

        if (tab) {
          tab.location.href = `/dashboard/design-studio/admin/template?templateId=${saveRes.id}`;
        }
      }

      setProgressText("Done");

      onDone(); // optional
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Hidden Canvas for thumbnail */}
      <div style={{ position: "fixed", left: -9999, top: -9999 }}>
        <TemplateCanvas
          ref={canvasRef}
          shapes={shapes}
          zoom={1}
          setZoom={() => {}}
          pan={{ x: 0, y: 0 }}
          setPan={() => {}}
          backgroundImage={backgroundImage}
          campaignData={campaignData}
          selectedShapeId={null}
          onShapeSelect={() => {}}
          onShapeDrag={() => {}}
          onShapeResize={() => {}}
          canvasWidth={CANVAS_WIDTH}
          canvasHeight={CANVAS_HEIGHT}
          isEditable={false}
        />
      </div>

      <Card>
        <Input
          value={name}
          onChange={setName}
          placeholder="Brand name"
        />

        {err && <ErrBanner msg={err} onClose={() => setErr(null)} />}

        <PrimaryBtn onClick={submit} loading={loading}>
          Create Brand
        </PrimaryBtn>

        {progressText && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#aaa" }}>
            {progressText}
          </div>
        )}
      </Card>
    </>
  );
}

// ── SUCCESS animation ─────────────────────────────────────────────────────────
function SuccessStep() {
  return (
    <div style={{ textAlign: "center", padding: "20px 0", animation: "cardIn 0.5s ease both" }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "rgba(52,211,153,0.12)",
          border: "2px solid rgba(52,211,153,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          animation: "popIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: "0 0 8px", fontFamily: "Syne, sans-serif" }}>
        You're all set!
      </h2>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>Redirecting you to your dashboard…</p>
      <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#818cf8",
              animation: `bounce 1s ease ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes popIn { from { transform:scale(0.5); opacity:0; } to { transform:scale(1); opacity:1; } }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>
    </div>
  );
}

// ── LOADING skeleton ──────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <div
        style={{
          width: 48,
          height: 48,
          border: "3px solid rgba(129,140,248,0.15)",
          borderTopColor: "#818cf8",
          borderRadius: "50%",
          animation: "spin 0.9s linear infinite",
          margin: "0 auto 16px",
        }}
      />
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "Syne, sans-serif" }}>
        Checking your account…
      </p>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
type FlowStep = "loading" | "pick-org" | "create-org" | "create-brand" | "done";

export default function OnboardingPage() {
  const router = useRouter(); // kept for parity if needed later
  void router;

  const [flowStep, setFlowStep] = useState<FlowStep>("loading");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Org | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const myOrgs = await apiFetch<Org[]>("/organisations/my-orgs");

        if (myOrgs.length === 0) {
          setFlowStep("create-org");
          return;
        }

        if (myOrgs.length > 1) {
          setOrgs(myOrgs);
          setFlowStep("pick-org");
          return;
        }

        const org = myOrgs[0];
        setCurrentOrg(org);

        await apiFetch(`/organisations/switch/${org.id}`, { method: "POST" });

        const brands = await apiFetch<Brand[]>(`/brands?active_only=false`);
        if (brands.length > 0) {
          setFlowStep("done");
          setTimeout(() => {
            window.location.href = "/dashboard/create";
          }, 800);
        } else {
          setFlowStep("create-brand");
        }
      } catch {
        window.location.href = "/auth/login";
      }
    })();
  }, []);

  const handleOrgPicked = async (org: Org) => {
    setCurrentOrg(org);
    try {
      const brands = await apiFetch<Brand[]>(`/brands?active_only=false`);
      if (brands.length > 0) {
        setFlowStep("done");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 800);
      } else {
        setFlowStep("create-brand");
      }
    } catch {
      setFlowStep("create-brand");
    }
  };

  const handleOrgCreated = (org: Org) => {
    setCurrentOrg(org);
    setFlowStep("create-brand");
  };

  const handleBrandDone = () => {
    setFlowStep("done");
    setTimeout(() => {
      window.location.href = "/dashboard/create";
    }, 1400);
  };

  const stepIdx =
    flowStep === "loading" || flowStep === "pick-org" || flowStep === "create-org"
      ? 1
      : flowStep === "create-brand"
      ? 2
      : 3;

  const headings: Record<FlowStep, { title: string; sub: string }> = {
    loading: { title: "Welcome back", sub: "Checking your account…" },
    "pick-org": { title: "Choose a workspace", sub: "Select the organisation you want to enter" },
    "create-org": { title: "Set up your workspace", sub: "Create your organisation to get started" },
    "create-brand": { title: "Add your first brand", sub: `Setting up ${currentOrg?.name || "your workspace"}` },
    done: { title: "All set!", sub: "Taking you to your dashboard" },
  };

  const { title, sub } = headings[flowStep];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080810",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Syne, sans-serif",
        position: "relative",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes cardIn { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        body { margin: 0; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: "60%",
            height: "60%",
            background: "radial-gradient(ellipse,rgba(99,102,241,0.12) 0%,transparent 70%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-20%",
            right: "-10%",
            width: "60%",
            height: "60%",
            background: "radial-gradient(ellipse,rgba(52,211,153,0.08) 0%,transparent 70%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "30%",
            right: "20%",
            width: "40%",
            height: "40%",
            background: "radial-gradient(ellipse,rgba(244,114,182,0.06) 0%,transparent 70%)",
            borderRadius: "50%",
          }}
        />
      </div>

      <Particles />

      <div style={{ width: "100%", maxWidth: 500, padding: "0 20px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: "linear-gradient(135deg,#818cf8,#6366f1)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>
              Relvo
            </span>
          </div>

          {flowStep !== "loading" && flowStep !== "done" && (
            <div style={{ animation: "cardIn 0.4s ease both" }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", margin: "0 0 6px", letterSpacing: "-0.03em" }}>
                {title}
              </h1>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0 }}>{sub}</p>
            </div>
          )}
        </div>

        {flowStep !== "loading" && flowStep !== "done" && <StepBar current={stepIdx} />}

        {flowStep === "loading" && <LoadingScreen />}

        {flowStep === "pick-org" && (
          <OrgPickerStep
            orgs={orgs}
            onPick={handleOrgPicked}
            onCreateNew={() => setFlowStep("create-org")}
          />
        )}

        {flowStep === "create-org" && <CreateOrgStep onDone={handleOrgCreated} />}

        {flowStep === "create-brand" && currentOrg && (
          <CreateBrandStep org={currentOrg} onDone={handleBrandDone} onSkip={handleBrandDone} />
        )}

        {flowStep === "done" && <SuccessStep />}
      </div>
    </div>
  );
}