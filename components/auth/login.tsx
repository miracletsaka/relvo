"use client";
/**
 * app/auth/login/page.tsx
 * ───────────────────────
 * Login page — matches Relvō register page aesthetic.
 */
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser } from "@/lib/api";

type Field = "email" | "password";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/onboarding";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState<Field | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null);

    if (!email.trim()) return setErr("Email is required");
    if (!email.includes("@")) return setErr("Enter a valid email address");
    if (!password.trim()) return setErr("Password is required");

    setLoading(true);
    try {
      await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      window.location.href = next;
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (field: Field) => ({
    width: "100%",
    background: focused === field ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${focused === field ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 12,
    padding: "13px 16px",
    color: "#e4e4e7",
    fontSize: 14,
    outline: "none",
    fontFamily: "DM Mono, monospace",
    transition: "all 0.2s",
    boxSizing: "border-box" as const,
    boxShadow: focused === field ? "0 0 0 3px rgba(124,58,237,0.12)" : "none",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0c0c0f",
        display: "flex",
        fontFamily: "Syne, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        @keyframes gridFade {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.06; }
        }
        @keyframes floatA {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.05); }
        }
        @keyframes floatB {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 30px) scale(0.95); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        .login-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #141418 inset !important;
          -webkit-text-fill-color: #e4e4e7 !important;
        }

        .pw-toggle {
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.3);
          padding: 0;
          display: flex;
          align-items: center;
          transition: color 0.15s;
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
        }
        .pw-toggle:hover { color: rgba(255,255,255,0.7); }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          border: none;
          border-radius: 12px;
          color: white;
          font-family: Syne, sans-serif;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          letter-spacing: 0.03em;
          position: relative;
          overflow: hidden;
          transition: opacity 0.2s, transform 0.15s;
        }
        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          background-size: 200% 100%;
          animation: shimmer 2.5s infinite;
        }
        .submit-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .submit-btn:active:not(:disabled) { transform: scale(0.985); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .ghost-link {
          color: rgba(167,139,250,0.8);
          text-decoration: none;
          transition: color 0.15s;
        }
        .ghost-link:hover { color: #c4b5fd; }
      `}</style>

      {/* Background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          animation: "gridFade 8s ease-in-out infinite",
        }}
      />

      <div
        style={{
          position: "fixed",
          top: "-20%",
          left: "-10%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
          animation: "floatA 12s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "-20%",
          right: "-5%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)",
          animation: "floatB 15s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Left panel */}
      <div
        style={{
          display: "none",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 56px",
          width: "42%",
          flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.05)",
          position: "relative",
        }}
        className="left-panel"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
           <div className="">
              <img src="/logo.png" alt="Relvō AI" style={{ width: 50, height: "auto" }} />
            </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#e4e4e7", letterSpacing: "-0.02em" }}>
            Relvō
          </span>
        </div>

        <div style={{ animation: "fadeUp 0.6s ease both" }}>
          <div
            style={{
              fontSize: 11,
              color: "rgba(124,58,237,0.7)",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: "DM Mono, monospace",
              marginBottom: 20,
            }}
          >
            Why teams use Relvō
          </div>

          {[
            { icon: "✦", title: "Fast content production", desc: "Generate social content and campaigns in a fraction of the usual time." },
            { icon: "◈", title: "Brand consistency", desc: "Keep every asset aligned with the right tone, style, and messaging." },
            { icon: "◉", title: "Smarter publishing", desc: "Organise drafts, media, and scheduling from one clean workspace." },
            { icon: "◇", title: "Multi-workspace setup", desc: "Manage multiple organisations and switch cleanly between them." },
          ].map((f, i) => (
            <div
              key={f.title}
              style={{
                display: "flex",
                gap: 16,
                marginBottom: 24,
                animation: `fadeUp 0.5s ease ${0.1 + i * 0.08}s both`,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  background: "rgba(124,58,237,0.1)",
                  border: "1px solid rgba(124,58,237,0.2)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  color: "#a78bfa",
                }}
              >
                {f.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e4e4e7", marginBottom: 3 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: "16px 20px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14,
            animation: "fadeUp 0.6s ease 0.4s both",
          }}
        >
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 12, fontStyle: "italic" }}>
            "Relvō gives us a much cleaner workflow for content, assets, drafts, and team collaboration."
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                color: "white",
              }}
            >
              T
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7" }}>Travor Panaya</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace" }}>
                Internal Auditor
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            animation: "fadeUp 0.5s ease both",
          }}
        >

          <div style={{ marginBottom: 32 }}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#e4e4e7",
                margin: "0 0 8px",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
              }}
            >
              Sign in to your account
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.5 }}>
              Access your workspace, manage content, and continue where you left off.
            </p>
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.35)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontFamily: "DM Mono, monospace",
                  marginBottom: 8,
                }}
              >
                Email
              </label>
              <input
                className="login-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                placeholder="you@company.com"
                autoComplete="email"
                style={inputStyle("email")}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.35)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontFamily: "DM Mono, monospace",
                  marginBottom: 8,
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="login-input"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ ...inputStyle("password"), paddingRight: 44 }}
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)}>
                  {showPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -2 }}>
              <a
                href="/auth/forgot-password"
                className="ghost-link"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "DM Mono, monospace",
                }}
              >
                Forgot your password?
              </a>
            </div>

            {err && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 14px",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "#f87171",
                  fontFamily: "DM Mono, monospace",
                  animation: "fadeUp 0.2s ease both",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {err}
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 15,
                      height: 15,
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderTopColor: "white",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                      display: "inline-block",
                    }}
                  />
                  Signing you in…
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  Sign in
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              )}
            </button>

            <p
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.2)",
                textAlign: "center",
                lineHeight: 1.6,
                fontFamily: "DM Mono, monospace",
                margin: 0,
              }}
            >
              Use the email you registered with and the password sent to you or the one you later changed.
            </p>
          </form>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "24px 0",
            }}
          >
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace" }}>
              new here?
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          </div>

          <a
            href="/auth/register"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              color: "rgba(255,255,255,0.5)",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              transition: "all 0.15s",
              fontFamily: "Syne, sans-serif",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.15)";
              (e.currentTarget as HTMLAnchorElement).style.color = "#e4e4e7";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.5)";
            }}
          >
            Create an account
          </a>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}