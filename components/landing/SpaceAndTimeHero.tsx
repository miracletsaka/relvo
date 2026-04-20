"use client";
/**
 * app/page.tsx  (or app/(landing)/page.tsx)
 * Relvo AI — Marketing SaaS landing page
 *
 * Design direction: Dark editorial luxury.
 * Think: Vercel meets a premium creative agency.
 * Obsidian black, surgical typography, violet plasma accents,
 * grid-breaking asymmetry, cinematic section transitions.
 */

import { useEffect, useRef, useState } from "react";

const SIGNUP_URL  = "/auth/register";
const LOGIN_URL   = "/auth/login";
const DEMO_URL    = "/auth/register";

// ── Animated counter ───────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const step = to / 60;
      const t = setInterval(() => {
        start = Math.min(start + step, to);
        setVal(Math.round(start));
        if (start >= to) clearInterval(t);
      }, 16);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ── Noise overlay ──────────────────────────────────────────────────────────────
function Noise() {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999,
      opacity: 0.025,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundRepeat: "repeat",
      backgroundSize: "128px",
    }} />
  );
}

// ── Feature card ───────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, body, delay = 0 }: { icon: string; title: string; body: string; delay?: number }) {
  return (
    <div style={{
      padding: "28px 26px",
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 20,
      position: "relative",
      overflow: "hidden",
      animationDelay: `${delay}s`,
    }} className="feat-card">
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.6), transparent)",
      }} />
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: "rgba(124,58,237,0.12)",
        border: "1px solid rgba(124,58,237,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, marginBottom: 16,
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 800, color: "#e4e4e7", margin: "0 0 8px", fontFamily: "Syne, sans-serif", letterSpacing: "-0.01em" }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, margin: 0, fontFamily: "DM Mono, monospace" }}>
        {body}
      </p>
    </div>
  );
}

// ── Pricing card ───────────────────────────────────────────────────────────────
function PricingCard({ plan, price, period = "/mo", features, highlight, cta }: {
  plan: string; price: string; period?: string;
  features: string[]; highlight?: boolean; cta: string;
}) {
  return (
    <div style={{
      padding: "32px 28px",
      background: highlight ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.025)",
      border: `1px solid ${highlight ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 24,
      position: "relative",
      flex: 1,
      minWidth: 240,
      transition: "transform 0.2s, box-shadow 0.2s",
    }} className="price-card">
      {highlight && (
        <div style={{
          position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(90deg,#7c3aed,#4f46e5)",
          color: "white", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
          padding: "4px 14px", borderRadius: "0 0 10px 10px",
          fontFamily: "DM Mono, monospace", textTransform: "uppercase",
        }}>Most Popular</div>
      )}
      <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "DM Mono, monospace" }}>
        {plan}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
        <span style={{ fontSize: 40, fontWeight: 800, color: "#e4e4e7", fontFamily: "Syne, sans-serif", letterSpacing: "-0.03em" }}>{price}</span>
        {period && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace" }}>{period}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {features.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={highlight ? "#a78bfa" : "#34d399"} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontFamily: "DM Mono, monospace", lineHeight: 1.5 }}>{f}</span>
          </div>
        ))}
      </div>
      <a href={SIGNUP_URL} style={{
        display: "block", textAlign: "center", padding: "12px",
        background: highlight ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.06)",
        border: highlight ? "none" : "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12, color: "white", fontWeight: 800, fontSize: 13,
        textDecoration: "none", fontFamily: "Syne, sans-serif",
        transition: "opacity 0.15s",
      }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        {cta}
      </a>
    </div>
  );
}

// ── Testimonial card ───────────────────────────────────────────────────────────
function TestimonialCard({ quote, name, role, company }: { quote: string; name: string; role: string; company: string }) {
  const hue = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      padding: "24px 22px",
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 18,
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div style={{ fontSize: 28, color: "rgba(124,58,237,0.4)", fontFamily: "Georgia, serif", lineHeight: 1 }}>"</div>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.75, margin: 0, fontFamily: "DM Mono, monospace", flex: 1 }}>
        {quote}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(135deg,hsl(${hue},60%,45%),hsl(${hue},60%,30%))`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 800, color: "white", fontFamily: "Syne, sans-serif",
        }}>
          {name[0]}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7", fontFamily: "Syne, sans-serif" }}>{name}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace" }}>{role} · {company}</div>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div style={{ background: "#080810", color: "#e4e4e7", minHeight: "100vh", fontFamily: "Syne, sans-serif", overflowX: "hidden" }}>
      <Noise />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp   { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes float    { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-14px); } }
        @keyframes pulse    { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
        @keyframes spin     { to { transform:rotate(360deg); } }
        @keyframes gridMove { from { transform:translateY(0); } to { transform:translateY(48px); } }
        @keyframes plasma   { 0%,100% { transform:translate(0,0) scale(1); } 33% { transform:translate(30px,-20px) scale(1.08); } 66% { transform:translate(-20px,30px) scale(0.94); } }
        @keyframes shimmer  { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
        @keyframes marquee  { from { transform:translateX(0); } to { transform:translateX(-50%); } }
        @keyframes blink    { 0%,100% { opacity:1; } 50% { opacity:0; } }

        .fade-up  { animation: fadeUp  0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .fade-in  { animation: fadeIn  0.5s ease both; }

        .feat-card { transition: transform 0.2s, border-color 0.2s; }
        .feat-card:hover { transform: translateY(-4px); border-color: rgba(124,58,237,0.3) !important; }

        .price-card:hover { transform: translateY(-6px); box-shadow: 0 24px 60px rgba(0,0,0,0.4); }

        .nav-link { color: rgba(255,255,255,0.45); text-decoration: none; font-size: 13px; font-weight: 600; letter-spacing: 0.01em; transition: color 0.15s; }
        .nav-link:hover { color: #e4e4e7; }

        .cta-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          border: none; border-radius: 14px;
          color: white; font-size: 15px; font-weight: 800;
          text-decoration: none; cursor: pointer;
          font-family: Syne, sans-serif; letter-spacing: -0.01em;
          position: relative; overflow: hidden;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .cta-primary::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          background-size: 200% 100%;
          animation: shimmer 2.5s infinite;
        }
        .cta-primary:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(124,58,237,0.4); }

        .cta-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px; color: rgba(255,255,255,0.7);
          font-size: 15px; font-weight: 700; text-decoration: none;
          font-family: Syne, sans-serif;
          transition: all 0.15s;
        }
        .cta-ghost:hover { background: rgba(255,255,255,0.09); color: white; border-color: rgba(255,255,255,0.2); }

        .section { padding: 100px 0; }
        .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

        .gradient-text {
          background: linear-gradient(135deg, #e4e4e7 0%, #a78bfa 50%, #818cf8 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .stat-number {
          font-size: 52px; font-weight: 800; letter-spacing: -0.04em;
          background: linear-gradient(135deg, #e4e4e7, #a78bfa);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .pill {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 6px 14px; border-radius: 20px;
          background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.25);
          color: #a78bfa; font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          font-family: DM Mono, monospace;
        }

        .logo-mark {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          display: flex; align-items: center; justify-content: center;
        }

        .ticker-track {
          display: flex; gap: 32px; white-space: nowrap;
          animation: marquee 28s linear infinite;
        }
        .ticker-track:hover { animation-play-state: paused; }

        .workflow-line { position: absolute; left: 21px; top: 44px; bottom: 0; width: 1px; background: linear-gradient(to bottom, rgba(124,58,237,0.4), transparent); }

        @media (max-width: 768px) {
          .hero-title { font-size: clamp(36px, 10vw, 72px) !important; }
          .three-col { grid-template-columns: 1fr !important; }
          .two-col   { grid-template-columns: 1fr !important; }
          .pricing-row { flex-direction: column !important; }
          .hide-mobile { display: none !important; }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "16px 24px",
        background: scrolled ? "rgba(8,8,16,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        transition: "all 0.3s",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* logo image */}
        <div className="">
          <img src="/logo.png" alt="Relvo AI" style={{ width: 80, height: "auto" }} />
        </div>

        <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {[["#features","Features"],["#workflow","How it works"],["#pricing","Pricing"],["#testimonials","Stories"]].map(([href, label]) => (
            <a key={href} href={href} className="nav-link">{label}</a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href={LOGIN_URL} className="nav-link hide-mobile">Sign in</a>
          <a href={SIGNUP_URL} style={{
            padding: "9px 20px", background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
            borderRadius: 10, color: "white", fontSize: 13, fontWeight: 800,
            textDecoration: "none", letterSpacing: "-0.01em",
          }}>
            Start free
          </a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", position: "relative", overflow: "hidden", paddingTop: 80 }}>

        {/* Background grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
          animation: "gridMove 8s linear infinite",
          opacity: 0.5,
        }} />

        {/* Plasma orbs */}
        <div style={{
          position: "absolute", top: "15%", right: "8%", width: 500, height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
          animation: "plasma 14s ease-in-out infinite", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "10%", left: "5%", width: 400, height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)",
          animation: "plasma 18s ease-in-out infinite reverse", pointerEvents: "none",
        }} />

        <div className="container" style={{ position: "relative", zIndex: 1, padding: "80px 24px" }}>
          <div style={{ maxWidth: 800 }}>

            {/* Pill */}
            <div className="pill fade-up" style={{ marginBottom: 28 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", animation: "pulse 1.5s ease-in-out infinite" }} />
              AI-powered Full month content creator
            </div>

            {/* Headline */}
            <h1 className="hero-title fade-up" style={{
              fontSize: "clamp(44px, 7vw, 80px)",
              fontWeight: 800, lineHeight: 1.06,
              letterSpacing: "-0.03em", marginBottom: 24,
              animationDelay: "0.1s",
            }}>
              <span style={{ color: "#e4e4e7" }}>Your brand.</span>
              <br />
              <span className="gradient-text">Every platform.</span>
              <br />
              <span style={{ color: "#e4e4e7" }}>On autopilot.</span>
            </h1>

            {/* Subheading */}
            <p className="fade-up" style={{
              fontSize: 18, color: "rgba(255,255,255,0.45)", lineHeight: 1.75,
              maxWidth: 560, marginBottom: 40,
              fontFamily: "DM Mono, monospace", fontWeight: 400,
              animationDelay: "0.2s",
            }}>
              Relvo generates a full month of social content, schedules it
              across every platform, and renders cinematic videos — all from a
              single topic.
            </p>

            {/* CTAs */}
            <div className="fade-up" style={{ display: "flex", gap: 14, flexWrap: "wrap", animationDelay: "0.3s" }}>
              <a href={SIGNUP_URL} className="cta-primary">
                Start for free
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
              <a href={DEMO_URL} className="cta-ghost">
                Watch demo
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </a>
            </div>

            {/* Social proof strip */}
            <div className="fade-up" style={{ marginTop: 52, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", animationDelay: "0.4s" }}>
              <div style={{ display: "flex" }}>
                {["A","B","C","D","E"].map((l, i) => (
                  <div key={l} style={{
                    width: 32, height: 32, borderRadius: "50%",
                    border: "2px solid #080810",
                    background: `hsl(${i * 60 + 240},50%,40%)`,
                    marginLeft: i > 0 ? -10 : 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: "white",
                  }}>{l}</div>
                ))}
              </div>
              <div>
                <div style={{ display: "flex", gap: 2, marginBottom: 3 }}>
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "DM Mono, monospace" }}>
                  Trusted by 500+ marketing teams
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ──────────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "18px 0", overflow: "hidden",
        background: "rgba(255,255,255,0.015)",
      }}>
        <div className="ticker-track">
          {[...Array(2)].map((_, gi) => (
            <div key={gi} style={{ display: "flex", gap: 48, flexShrink: 0 }}>
              {["AI Content Generation","Video Studio","Smart Scheduling","Brand Management","Multi-tenant Teams","Review Collection","Campaign Goals","Social Publishing","Org Profiles","Analytics"].map(item => (
                <span key={item} style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "DM Mono, monospace", whiteSpace: "nowrap" }}>
                  {item}
                  <span style={{ marginLeft: 48, color: "rgba(124,58,237,0.4)" }}>◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS ───────────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, overflow: "hidden" }}>
            {[
              { n: 500, suffix: "+", label: "Marketing teams" },
              { n: 50000, suffix: "+", label: "Posts generated" },
              { n: 80, suffix: "%", label: "Time saved on content" },
              { n: 12, suffix: "x", label: "More content per month" },
            ].map(({ n, suffix, label }, i) => (
              <div key={label} style={{ padding: "40px 32px", background: "#080810", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <div className="stat-number">
                  <Counter to={n} suffix={suffix} />
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 6, fontFamily: "DM Mono, monospace" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section className="section" id="features">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div className="pill" style={{ marginBottom: 20, display: "inline-flex" }}>Features</div>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>
              Everything your marketing<br />team actually needs
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", fontFamily: "DM Mono, monospace", maxWidth: 500, margin: "0 auto" }}>
              One platform. Every channel. No agency required.
            </p>
          </div>

          <div className="three-col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {[
              { icon: "✦", title: "AI Content Generation", body: "Generate a full month of posts for every platform in seconds. GPT-4 trained on your brand voice, tone, and campaign goals.", delay: 0 },
              { icon: "◈", title: "Smart Scheduling", body: "Auto-distribute content across your calendar with optimal timing per platform. No gaps, no manual scheduling.", delay: 0.05 },
              { icon: "◉", title: "Video Studio", body: "Generate cinematic short-form videos from a topic brief. Voiceover, B-roll, music, captions — fully automated.", delay: 0.1 },
              { icon: "◇", title: "Multi-Brand Management", body: "Run unlimited brands under one account. Each brand has its own voice, platforms, templates, and media library.", delay: 0.15 },
              { icon: "▣", title: "Team Workspaces", body: "Invite your team with role-based access. Owner, Admin, Member, Viewer. Switch between org accounts instantly.", delay: 0.2 },
              { icon: "◐", title: "Media Asset Library", body: "Upload images, videos, and product media. Tag, search, price and attach to any post automatically.", delay: 0.25 },
              { icon: "◌", title: "Review Collection", body: "Send verified review requests to customers. Track opens, collect testimonials, and display them on your public profile.", delay: 0.3 },
              { icon: "◑", title: "Public Business Profile", body: "Every org gets a shareable /biz/slug page. Showcase gallery, offers, certifications, reviews and contact info.", delay: 0.35 },
              { icon: "◒", title: "Campaign Context AI", body: "Feed the AI your goals, accreditations, active offers and metadata. Every post knows your business deeply.", delay: 0.4 },
            ].map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW ─────────────────────────────────────────────────────────── */}
      <section className="section" id="workflow" style={{ background: "rgba(255,255,255,0.012)" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="two-col">
            <div>
              <div className="pill" style={{ marginBottom: 20, display: "inline-flex" }}>How it works</div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>
                From topic to published in minutes
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "DM Mono, monospace", lineHeight: 1.8, marginBottom: 40 }}>
                Relvo handles everything from ideation to publishing. You stay focused on strategy, not execution.
              </p>

              {[
                { n: "01", title: "Set your topic", body: "Enter a campaign topic and select your target month. Relvo calculates the optimal posting frequency." },
                { n: "02", title: "AI generates all content", body: "GPT-4 creates platform-specific posts for every slot — LinkedIn articles, Instagram captions, Facebook ads — each in your brand voice." },
                { n: "03", title: "Add visuals", body: "Upload media, generate AI backgrounds, or use the video studio to render a cinematic short-form video for each post." },
                { n: "04", title: "Review & approve", body: "Your team reviews drafts in the approval queue. Edit inline, approve in bulk, or reject with a reason." },
                { n: "05", title: "Publish & track", body: "Posts go live at the scheduled time. Track status — pending, published, failed — from one dashboard." },
              ].map((step, i) => (
                <div key={step.n} style={{ display: "flex", gap: 20, marginBottom: 28, position: "relative" }}>
                  {i < 4 && <div className="workflow-line" />}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: "#a78bfa",
                    fontFamily: "DM Mono, monospace",
                    position: "relative", zIndex: 1,
                  }}>
                    {step.n}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e4e4e7", marginBottom: 4, fontFamily: "Syne, sans-serif" }}>{step.title}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, fontFamily: "DM Mono, monospace" }}>{step.body}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Terminal mock */}
            <div style={{
              background: "#0d0d15", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20, overflow: "hidden",
              boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
            }}>
              {/* Title bar */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f87171" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fbbf24" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#34d399" }} />
                <span style={{ marginLeft: 8, fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace" }}>Relvo — content studio</span>
              </div>
              <div style={{ padding: 20 }}>
                {[
                  { t: "brand",   c: "#a78bfa", v: "Relvo  Agency · LinkedIn + Instagram" },
                  { t: "topic",   c: "#60a5fa", v: "Q1 Product Launch Campaign" },
                  { t: "posts",   c: "#34d399", v: "16 posts generated across 4 weeks" },
                  { t: "video",   c: "#fbbf24", v: "3 × 30s videos rendered" },
                  { t: "status",  c: "#34d399", v: "✓ All approved — publishing tomorrow 9:00 AM" },
                ].map(({ t, c, v }) => (
                  <div key={t} style={{ marginBottom: 12, fontFamily: "DM Mono, monospace", fontSize: 12 }}>
                    <span style={{ color: "rgba(255,255,255,0.2)" }}>$ </span>
                    <span style={{ color: c }}>{t}</span>
                    <span style={{ color: "rgba(255,255,255,0.2)" }}> → </span>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop: 20, padding: 16, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 12 }}>
                  <div style={{ fontSize: 10, color: "#34d399", fontFamily: "DM Mono, monospace", fontWeight: 700, marginBottom: 8 }}>✓ CAMPAIGN READY</div>
                  {[
                    "16 LinkedIn posts · educational tone",
                    "16 Instagram posts · visual-first",
                    "3 short-form videos · voiceover",
                    "Scheduled across 4 weeks",
                  ].map(l => (
                    <div key={l} style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "DM Mono, monospace", marginBottom: 4, display: "flex", gap: 8 }}>
                      <span style={{ color: "rgba(52,211,153,0.5)" }}>›</span>{l}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "#a78bfa", fontFamily: "DM Mono, monospace" }}>neuroflow:~$</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "DM Mono, monospace", borderRight: "1px solid rgba(255,255,255,0.4)", animation: "blink 1s step-end infinite", paddingRight: 2 }}>&nbsp;</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TONES ───────────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div className="pill" style={{ marginBottom: 20, display: "inline-flex" }}>Brand Tones</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>
              Write in any voice, on demand
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "DM Mono, monospace" }}>
              11 content tones. Each one tells the AI exactly how to write for your brand.
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {[
              ["✦ Inform",           "#60a5fa"],
              ["◈ Advertise",        "#a78bfa"],
              ["◉ Alert",            "#f87171"],
              ["◇ Vacancy",          "#34d399"],
              ["▣ Announce",         "#fbbf24"],
              ["◐ Educate",          "#60a5fa"],
              ["◌ Inspire",          "#c084fc"],
              ["◑ Promote",          "#34d399"],
              ["◒ Testimonial",      "#fbbf24"],
              ["◓ Behind the Scenes","#a78bfa"],
              ["◔ Entertain",        "#f87171"],
            ].map(([label, color]) => (
              <div key={label} style={{
                padding: "10px 18px",
                background: (color as string) + "10",
                border: `1px solid ${color as string}30`,
                borderRadius: 24,
                fontSize: 12, fontWeight: 700,
                color: color as string,
                fontFamily: "DM Mono, monospace",
                letterSpacing: "0.02em",
                transition: "all 0.15s",
                cursor: "default",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = (color as string) + "20";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = (color as string) + "10";
                  (e.currentTarget as HTMLElement).style.transform = "none";
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section className="section" id="pricing" style={{ background: "rgba(255,255,255,0.012)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div className="pill" style={{ marginBottom: 20, display: "inline-flex" }}>Pricing</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>
              Start free. Scale when ready.
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "DM Mono, monospace" }}>
              No credit card required. Upgrade or downgrade any time.
            </p>
          </div>

          <div className="pricing-row" style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
            <PricingCard
              plan="Free"
              price="£0"
              features={[
                "1 brand",
                "2 platforms",
                "20 AI drafts / month",
                "Public business profile",
                "Review collection",
                "Unlimited team members",
              ]}
              cta="Start free"
            />
            {/* <PricingCard
              plan="Starter"
              price="£49"
              highlight
              features={[
                "3 brands",
                "5 platforms",
                "200 AI drafts / month",
                "10 video renders / month",
                "Image generation",
                "Media asset library",
                "Campaign tone control",
              ]}
              cta="Start trial"
            />
            <PricingCard
              plan="Pro"
              price="£149"
              features={[
                "10 brands",
                "All platforms",
                "Unlimited AI drafts",
                "Unlimited video renders",
                "Priority support",
                "Advanced analytics",
                "Custom templates",
              ]}
              cta="Start trial"
            />
            <PricingCard
              plan="Agency"
              price="£299"
              features={[
                "Unlimited brands",
                "Multiple workspaces",
                "White label",
                "API access",
                "Dedicated support",
                "Everything in Pro",
                "Custom onboarding",
              ]}
              cta="Talk to us"
            /> */}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────────── */}
      <section className="section" id="testimonials">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div className="pill" style={{ marginBottom: 20, display: "inline-flex" }}>Stories</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Teams who switched to NeuroFlow
            </h2>
          </div>
          <div className="three-col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            <TestimonialCard
              quote="We went from posting 3 times a week to 30. Relvo generates a month of content in the time it used to take us to write one post."
              name="Sarah M."
              role="Head of Marketing"
              company="TechCo"
            />
            <TestimonialCard
              quote="The brand tone feature is remarkable. LinkedIn posts sound different from Instagram posts — automatically. It actually understands the platforms."
              name="James K."
              role="Agency Director"
              company="Klarity Digital"
            />
            <TestimonialCard
              quote="We manage 8 client brands from one workspace. The org switching and team permissions saved us hiring another coordinator."
              name="Priya R."
              role="Content Lead"
              company="Growth Studio"
            />
          </div>
        </div>
      </section>

      {/* ── CTA BAND ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 0", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(79,70,229,0.1))",
          borderTop: "1px solid rgba(124,58,237,0.2)",
          borderBottom: "1px solid rgba(124,58,237,0.2)",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div className="container" style={{ textAlign: "center", position: "relative" }}>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>
            Ready to put your content<br />on autopilot?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", fontFamily: "DM Mono, monospace", marginBottom: 36 }}>
            Free forever. No credit card. Up and running in 2 minutes.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={SIGNUP_URL} className="cta-primary" style={{ fontSize: 16, padding: "16px 32px" }}>
              Create free account
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap" }}>
            {["No credit card", "Free forever", "Cancel anytime"].map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 24px 32px" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 32, marginBottom: 48 }}>
            <div style={{ maxWidth: 280 }}>
              <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 14 }}>
                <div className="">
                  <img src="/logo.png" alt="Relvo" style={{ width: 80, height: "auto" }} />
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#e4e4e7" }}>Relvo</span>
              </a>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.7, fontFamily: "DM Mono, monospace" }}>
                AI-powered Full month content creator for modern businesses and agencies.
              </p>
            </div>

            <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
              {[
                { heading: "Product", links: [["Features","#features"],["Pricing","#pricing"],["Changelog","/changelog"],["Roadmap","/roadmap"]] },
                { heading: "Company", links: [["About","https://neuroflowai.co.uk/about-us"],["Blog","https://neuroflowai.co.uk/blog"],["Careers","https://neuroflowai.co.uk/careers"],["Contact","https://neuroflowai.co.uk/contact"]] },
              ].map(({ heading, links }) => (
                <div key={heading}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "DM Mono, monospace", marginBottom: 16 }}>{heading}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {links.map(([label, href]) => (
                      <a key={label} href={href} style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none", transition: "color 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#e4e4e7")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
                      >{label}</a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace" }}>
              © {new Date().getFullYear()} Relvo AI Ltd. All rights reserved.
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", fontFamily: "DM Mono, monospace" }}>
              Built for ambitious brands.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}