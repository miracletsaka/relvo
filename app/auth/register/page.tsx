"use client";
/**
 * app/auth/register/page.tsx
 * ───────────────────────────
 * Signup page — same Relvo dark studio aesthetic.
 * Updated to:
 * - first name + last name + email
 * - no password fields
 * - success message after submit
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

type Field = "first_name" | "last_name" | "email";

export default function SignUpPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [focused, setFocused] = useState<Field | null>(null);
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!firstName.trim()) return setErr("First name is required");
    if (!lastName.trim()) return setErr("Last name is required");
    if (!email.includes("@")) return setErr("Enter a valid email address");

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || json.message || "Registration failed");

      setSubmittedEmail(email.trim().toLowerCase());
      setSuccess(true);
    } catch (e: any) {
      setErr(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

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
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }

        .signup-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #141418 inset !important;
          -webkit-text-fill-color: #e4e4e7 !important;
        }

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

        .social-link {
          color: rgba(255,255,255,0.35);
          font-size: 12px;
          text-decoration: none;
          font-family: DM Mono, monospace;
          transition: color 0.15s;
        }
        .social-link:hover { color: #a78bfa; }

        .success-card {
          background: rgba(52,211,153,0.07);
          border: 1px solid rgba(52,211,153,0.22);
          border-radius: 16px;
          padding: 18px 18px;
          animation: fadeUp 0.25s ease both;
        }

        .success-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(52,211,153,0.12);
          border: 1px solid rgba(52,211,153,0.25);
          margin-bottom: 14px;
        }
      `}</style>

      {/* ── Background ── */}
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

      {/* ── Left panel — branding ── */}
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
              <img src="/logo.png" alt="Relvo" style={{ width: 50, height: "auto" }} />
            </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#e4e4e7", letterSpacing: "-0.02em" }}>
            Relvo
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
            What you get
          </div>

          {[
            { icon: "✦", title: "AI Content Generation", desc: "Write posts for every platform in seconds with GPT-4" },
            { icon: "◈", title: "Smart Scheduling", desc: "Auto-distribute across your calendar, perfectly timed" },
            { icon: "◉", title: "Video Studio", desc: "Generate cinematic short-form videos from a brief" },
            { icon: "◇", title: "Brand Management", desc: "Keep every brand's voice consistent across all content" },
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
            "Relvo cut our content production time by 80%. We went from 3 posts a week to 30."
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
              M
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7" }}>Mirriam Khingi</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace" }}>
                Student
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
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
              Create your account
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.5 }}>
              Start your free workspace. No credit card required.
            </p>
          </div>

          {!success ? (
            <>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
                      First Name
                    </label>
                    <input
                      className="signup-input"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onFocus={() => setFocused("first_name")}
                      onBlur={() => setFocused(null)}
                      placeholder="Alex"
                      autoComplete="given-name"
                      style={inputStyle("first_name")}
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
                      Last Name
                    </label>
                    <input
                      className="signup-input"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onFocus={() => setFocused("last_name")}
                      onBlur={() => setFocused(null)}
                      placeholder="Johnson"
                      autoComplete="family-name"
                      style={inputStyle("last_name")}
                    />
                  </div>
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
                    Work Email
                  </label>
                  <input
                    className="signup-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    placeholder="alex@company.com"
                    autoComplete="email"
                    style={inputStyle("email")}
                  />
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
                      Creating your account…
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      Get started free
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
                  We’ll send a verification email and a temporary password after signup.
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
                  already have an account?
                </span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
              </div>

              <a
                href="/auth/login"
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
                Sign in instead
              </a>

              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                {["No credit card", "Free forever", "Cancel anytime"].map((item) => (
                  <div
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      color: "rgba(255,255,255,0.2)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="success-card">
              <div className="success-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>

              <h2 style={{ margin: "0 0 10px", color: "#e4e4e7", fontSize: 20, fontWeight: 800 }}>
                Check your email
              </h2>

              <p style={{ margin: "0 0 12px", color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.6 }}>
                We’ve sent a verification email to:
              </p>

              <div
                style={{
                  marginBottom: 14,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#e4e4e7",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "DM Mono, monospace",
                  wordBreak: "break-word",
                }}
              >
                {submittedEmail}
              </div>

              <p style={{ margin: "0 0 10px", color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6 }}>
                We also sent your temporary password in that same email.
              </p>

              <p style={{ margin: "0 0 18px", color: "rgba(255,255,255,0.35)", fontSize: 13, lineHeight: 1.6 }}>
                Verify your email first, then sign in and change your password in settings.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <a
                  href="/auth/login"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px 14px",
                    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                    border: "none",
                    borderRadius: 12,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 800,
                    textDecoration: "none",
                    fontFamily: "Syne, sans-serif",
                  }}
                >
                  Go to sign in
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setErr(null);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "Syne, sans-serif",
                  }}
                >
                  Register another email
                </button>
              </div>
            </div>
          )}
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