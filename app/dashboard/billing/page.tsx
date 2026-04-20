"use client";
/**
 * app/dashboard/billing/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Billing page — fully designed, ready for future activation.
 * Current status: "Coming Soon" — all payment methods are UI-only.
 *
 * Payment methods:
 *   - TNM Mpamba (mobile money)
 *   - Airtel Money (mobile money)
 *   - Card (Visa / Mastercard)
 *
 * Plans: Free · Starter · Pro · Agency
 */

import { useState } from "react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:      "#07070d",
  surface: "rgba(255,255,255,0.03)",
  surfaceHi: "rgba(255,255,255,0.06)",
  border:  "rgba(255,255,255,0.07)",
  borderHi:"rgba(255,255,255,0.14)",
  text:    "#eeeef2",
  muted:   "rgba(255,255,255,0.38)",
  dim:     "rgba(255,255,255,0.16)",
  accent:  "#a78bfa",
  violet:  "#7c3aed",
  green:   "#34d399",
  amber:   "#fbbf24",
  red:     "#f87171",
  blue:    "#60a5fa",
};

// ── Plan definitions ──────────────────────────────────────────────────────────
type Plan = {
  id:       string;
  name:     string;
  price:    number;       // MWK per month
  usd:      number;       // approx USD
  badge?:   string;
  color:    string;
  features: string[];
  limit_drafts:   number | null;
  limit_brands:   number;
  limit_members:  number;
};

const PLANS: Plan[] = [
  {
    id: "free", name: "Free", price: 0, usd: 0,
    color: T.dim,
    features: [
      "1 brand",
      "20 AI drafts / month",
      "2 social platforms",
      "Public profile page",
      "Unlimited members",
    ],
    limit_drafts: 20, limit_brands: 1, limit_members: 99,
  },
  {
    id: "starter", name: "Starter", price: 15_000, usd: 9,
    color: T.blue,
    features: [
      "3 brands",
      "150 AI drafts / month",
      "All social platforms",
      "Verified review cards",
      "Priority support",
      "Custom tone library",
    ],
    limit_drafts: 150, limit_brands: 3, limit_members: 99,
  },
  {
    id: "pro", name: "Pro", price: 35_000, usd: 20,
    badge: "Most Popular",
    color: T.accent,
    features: [
      "10 brands",
      "500 AI drafts / month",
      "All social platforms",
      "AI template generation",
      "Advanced analytics",
      "White-label profiles",
      "API access (coming soon)",
    ],
    limit_drafts: 500, limit_brands: 10, limit_members: 99,
  },
  {
    id: "agency", name: "Agency", price: 90_000, usd: 52,
    color: T.green,
    features: [
      "Unlimited brands",
      "Unlimited AI drafts",
      "All platforms + API",
      "Multi-workspace",
      "Custom AI fine-tuning",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    limit_drafts: null, limit_brands: 999, limit_members: 999,
  },
];

// ── Payment methods ────────────────────────────────────────────────────────────
type PayMethod = "tnm" | "airtel" | "card";

const PAY_METHODS: { id: PayMethod; label: string; sub: string; icon: string; color: string }[] = [
  {
    id: "tnm", label: "TNM Mpamba", sub: "Dial *412# on TNM",
    icon: "📱", color: "#e63946",
  },
  {
    id: "airtel", label: "Airtel Money", sub: "Dial *211# on Airtel",
    icon: "💳", color: "#ef6c00",
  },
  {
    id: "card", label: "Debit / Credit Card", sub: "Visa · Mastercard",
    icon: "🏦", color: T.blue,
  },
];

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function fmt(n: number) {
  return `MK ${n.toLocaleString("en-MW")}`;
}

// ── Coming Soon Banner ────────────────────────────────────────────────────────
function ComingSoonBanner() {
  return (
    <div style={{
      position: "relative", overflow: "hidden",
      padding: "22px 28px",
      background: "linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(251,191,36,0.04) 100%)",
      border: "1.5px solid rgba(251,191,36,0.28)",
      borderRadius: 18,
      marginBottom: 36,
      display: "flex", alignItems: "flex-start", gap: 18,
    }}>
      {/* Pulsing dot */}
      <div style={{ position: "relative", flexShrink: 0, marginTop: 3 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: T.amber }} />
        <div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: `2px solid ${T.amber}`, animation: "pulse-ring 1.8s ease-out infinite", opacity: 0.6 }} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.amber, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.2px" }}>
            Billing is coming soon
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", color: T.amber, fontFamily: "DM Mono, monospace", letterSpacing: "0.08em" }}>
            IN PREPARATION
          </span>
        </div>
        <p style={{ fontSize: 12, color: "rgba(251,191,36,0.65)", lineHeight: 1.7, margin: 0, fontFamily: "'DM Sans', sans-serif", maxWidth: 560 }}>
          We're actively setting up payment processing for Malawi and beyond. You can explore the plans and methods below — once billing is live, you'll be the first to know via email. Everything you see here is ready and will activate immediately.
        </p>
      </div>

      {/* Corner decoration */}
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(251,191,36,0.06)", pointerEvents: "none" }} />
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({
  plan, selected, onSelect, currentPlan,
}: { plan: Plan; selected: boolean; onSelect: () => void; currentPlan: string }) {
  const isCurrent = plan.id === currentPlan;

  return (
    <div
      onClick={onSelect}
      style={{
        position: "relative", cursor: "pointer",
        padding: "24px 22px",
        borderRadius: 20,
        border: `1.5px solid ${selected ? plan.color + "70" : isCurrent ? "rgba(255,255,255,0.12)" : T.border}`,
        background: selected
          ? `radial-gradient(ellipse at top left, ${plan.color}10 0%, transparent 70%), rgba(255,255,255,0.04)`
          : isCurrent
          ? T.surfaceHi
          : T.surface,
        transition: "all 0.22s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: selected ? `0 0 0 1px ${plan.color}30, 0 8px 32px rgba(0,0,0,0.4)` : "none",
        animation: "slideUp 0.4s ease both",
      }}
    >
      {/* Popular badge */}
      {plan.badge && (
        <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", padding: "3px 12px", background: plan.color, borderRadius: 20, fontSize: 9, fontWeight: 800, color: "#000", fontFamily: "DM Mono, monospace", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
          ⭐ {plan.badge}
        </div>
      )}

      {/* Current badge */}
      {isCurrent && !plan.badge && (
        <div style={{ position: "absolute", top: -10, right: 16, padding: "2px 10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, fontSize: 9, fontWeight: 700, color: T.muted, fontFamily: "DM Mono, monospace" }}>
          CURRENT
        </div>
      )}

      {/* Plan name + price */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `${plan.color}18`, border: `1px solid ${plan.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: plan.color }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: T.text, fontFamily: "'Syne', sans-serif" }}>{plan.name}</span>
        </div>

        {plan.price === 0 ? (
          <div style={{ fontSize: 34, fontWeight: 900, color: T.text, letterSpacing: "-1.5px", fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>Free</div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: T.text, letterSpacing: "-1.5px", fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>
                {fmt(plan.price)}
              </span>
            </div>
            <div style={{ fontSize: 10, color: T.muted, fontFamily: "DM Mono, monospace", marginTop: 4 }}>
              / month · ~${plan.usd} USD
            </div>
          </>
        )}
      </div>

      {/* Feature list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
        {plan.features.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Select button */}
      <button
        style={{
          width: "100%", padding: "11px 0",
          background: selected
            ? `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`
            : isCurrent
            ? "rgba(255,255,255,0.06)"
            : "rgba(255,255,255,0.04)",
          border: `1px solid ${selected ? "transparent" : T.border}`,
          borderRadius: 12,
          color: selected ? "#fff" : isCurrent ? T.muted : T.muted,
          fontSize: 11, fontWeight: 800,
          fontFamily: "'Syne', sans-serif",
          cursor: "pointer",
          transition: "all 0.2s",
          letterSpacing: "0.04em",
        }}>
        {isCurrent ? "Current Plan" : selected ? "Selected ✓" : "Select Plan"}
      </button>
    </div>
  );
}

// ── Payment method selector ────────────────────────────────────────────────────
function PaymentMethodCard({
  method, selected, onSelect,
}: { method: typeof PAY_METHODS[0]; selected: boolean; onSelect: () => void }) {
  return (
    <div onClick={onSelect} style={{
      cursor: "pointer", padding: "16px 18px", borderRadius: 14,
      border: `1.5px solid ${selected ? method.color + "60" : T.border}`,
      background: selected ? `${method.color}0e` : T.surface,
      display: "flex", alignItems: "center", gap: 14,
      transition: "all 0.2s", boxShadow: selected ? `0 0 0 1px ${method.color}25` : "none",
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${method.color}18`, border: `1px solid ${method.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
        {method.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2, fontFamily: "'Syne', sans-serif" }}>{method.label}</div>
        <div style={{ fontSize: 10, color: T.dim, fontFamily: "DM Mono, monospace" }}>{method.sub}</div>
      </div>
      <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${selected ? method.color : T.borderHi}`, background: selected ? method.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
        {selected && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
    </div>
  );
}

// ── Phone input for mobile money ──────────────────────────────────────────────
function MobileMoneyForm({ method }: { method: PayMethod }) {
  const [phone, setPhone] = useState("");
  const label = method === "tnm" ? "TNM Mpamba Number" : "Airtel Money Number";
  const prefix = method === "tnm" ? "+265 88" : "+265 99";

  return (
    <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={labelStyle}>{label}</label>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.muted, fontFamily: "DM Mono, monospace", pointerEvents: "none" }}>{prefix}</span>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 7))}
            placeholder="1 234 567"
            style={{ ...inputStyle, paddingLeft: 72 }}
            onFocus={e => { e.target.style.borderColor = "rgba(167,139,250,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
            onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
          />
        </div>
        <p style={{ fontSize: 9, color: T.dim, fontFamily: "DM Mono, monospace", margin: "6px 0 0" }}>
          {method === "tnm"
            ? "You'll receive a push notification to authorise payment on your TNM line"
            : "You'll receive an Airtel Money authorisation prompt on your phone"
          }
        </p>
      </div>
    </div>
  );
}

// ── Card form ─────────────────────────────────────────────────────────────────
function CardForm() {
  const [num,   setNum]   = useState("");
  const [expiry,setExpiry]= useState("");
  const [cvv,   setCvv]   = useState("");
  const [name,  setName]  = useState("");

  const fmtCard = (v: string) =>
    v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  const fmtExpiry = (v: string) => {
    const d = v.replace(/\D/g,"").slice(0,4);
    return d.length >= 3 ? `${d.slice(0,2)}/${d.slice(2)}` : d;
  };

  return (
    <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={labelStyle}>Cardholder Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="John Banda"
          style={inputStyle}
          onFocus={e => { e.target.style.borderColor = "rgba(167,139,250,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
          onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }} />
      </div>
      <div>
        <label style={labelStyle}>Card Number</label>
        <div style={{ position: "relative" }}>
          <input value={num} onChange={e => setNum(fmtCard(e.target.value))} placeholder="4242 4242 4242 4242"
            style={{ ...inputStyle, paddingRight: 52, fontFamily: "DM Mono, monospace", letterSpacing: "0.08em" }}
            onFocus={e => { e.target.style.borderColor = "rgba(167,139,250,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
            onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }} />
          <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 4 }}>
            <div style={{ width: 26, height: 16, borderRadius: 3, background: "#1a1f71", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 7, fontWeight: 800, color: "#fff", fontFamily: "DM Mono, monospace" }}>VISA</span>
            </div>
            <div style={{ width: 26, height: 16, borderRadius: 3, background: "#252525", display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#eb001b" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f79e1b", marginLeft: -4 }} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Expiry</label>
          <input value={expiry} onChange={e => setExpiry(fmtExpiry(e.target.value))} placeholder="MM/YY"
            style={{ ...inputStyle, fontFamily: "DM Mono, monospace", letterSpacing: "0.08em" }}
            onFocus={e => { e.target.style.borderColor = "rgba(167,139,250,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
            onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }} />
        </div>
        <div>
          <label style={labelStyle}>CVV</label>
          <input type="password" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="•••"
            style={{ ...inputStyle, fontFamily: "DM Mono, monospace" }}
            onFocus={e => { e.target.style.borderColor = "rgba(167,139,250,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
            onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }} />
        </div>
      </div>
    </div>
  );
}

// ── Current plan summary ──────────────────────────────────────────────────────
function CurrentPlanSummary({ plan }: { plan: Plan }) {
  const renewDate = new Date();
  renewDate.setMonth(renewDate.getMonth() + 1);

  return (
    <div style={{ padding: "20px 22px", background: T.surfaceHi, border: `1px solid ${T.borderHi}`, borderRadius: 18, marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: T.dim, fontFamily: "DM Mono, monospace", marginBottom: 6, letterSpacing: "0.08em" }}>CURRENT PLAN</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: T.text, fontFamily: "'Syne', sans-serif" }}>{plan.name}</span>
            <span style={{ fontSize: 9, padding: "3px 10px", borderRadius: 20, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: T.green, fontFamily: "DM Mono, monospace", fontWeight: 700 }}>ACTIVE</span>
          </div>
          {plan.price > 0 && (
            <div style={{ fontSize: 11, color: T.muted, marginTop: 4, fontFamily: "DM Mono, monospace" }}>
              Renews {renewDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {fmt(plan.price)}/mo
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Drafts", used: 14, max: plan.limit_drafts },
            { label: "Brands", used: 1,  max: plan.limit_brands },
          ].map(({ label, used, max }) => (
            <div key={label} style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: T.dim, fontFamily: "DM Mono, monospace", marginBottom: 4 }}>{label.toUpperCase()}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text, fontFamily: "'Syne', sans-serif" }}>
                {used}<span style={{ fontSize: 10, color: T.dim }}>/{max === null ? "∞" : max}</span>
              </div>
              <div style={{ width: 60, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, background: T.accent, width: max ? `${Math.min(100, (used / max) * 100)}%` : "5%", transition: "width 0.6s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Notify me button ──────────────────────────────────────────────────────────
function NotifyButton() {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [email, setEmail] = useState("");
  const [show,  setShow]  = useState(false);

  const submit = () => {
    if (!email.trim()) return;
    setState("loading");
    setTimeout(() => setState("done"), 1200);
  };

  if (!show) {
    return (
      <button onClick={() => setShow(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", background: "rgba(251,191,36,0.1)", border: "1.5px solid rgba(251,191,36,0.28)", borderRadius: 12, color: T.amber, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", transition: "all 0.2s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.16)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.1)"; }}>
        <span style={{ fontSize: 16 }}>🔔</span> Notify me when billing is live
      </button>
    );
  }

  if (state === "done") {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", background: "rgba(52,211,153,0.1)", border: "1.5px solid rgba(52,211,153,0.25)", borderRadius: 12, color: T.green, fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
        ✓ You'll be notified at <strong>{email}</strong>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        placeholder="your@email.com"
        style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: `1.5px solid ${T.borderHi}`, borderRadius: 11, color: T.text, fontSize: 13, fontFamily: "DM Mono, monospace", outline: "none", width: 220 }}
        onFocus={e => { e.target.style.borderColor = "rgba(251,191,36,0.5)"; }}
        onBlur={e => { e.target.style.borderColor = T.borderHi; }} />
      <button onClick={submit} disabled={!email.trim() || state === "loading"}
        style={{ padding: "10px 20px", background: state === "loading" ? "rgba(255,255,255,0.04)" : "rgba(251,191,36,0.85)", border: "none", borderRadius: 11, color: state === "loading" ? T.dim : "#000", fontSize: 12, fontWeight: 800, cursor: state === "loading" ? "not-allowed" : "pointer", fontFamily: "'Syne', sans-serif", display: "flex", alignItems: "center", gap: 7, transition: "all 0.2s" }}>
        {state === "loading"
          ? <><span style={{ width: 13, height: 13, border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#000", borderRadius: "50%", display: "inline-block", animation: "bill-spin 0.6s linear infinite" }} />Saving…</>
          : "Notify Me"
        }
      </button>
    </div>
  );
}

// ── Billing history (empty state) ─────────────────────────────────────────────
function BillingHistory() {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18 }}>
      <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>🧾</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.muted, fontFamily: "'Syne', sans-serif", marginBottom: 6 }}>No billing history yet</div>
      <div style={{ fontSize: 11, color: T.dim, fontFamily: "DM Mono, monospace" }}>Your invoices will appear here once billing is active</div>
    </div>
  );
}

// ── FAQ item ──────────────────────────────────────────────────────────────────
function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: 0 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: "'Syne', sans-serif" }}>{q}</span>
        <span style={{ fontSize: 18, color: T.muted, flexShrink: 0, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(45deg)" : "none" }}>+</span>
      </button>
      {open && (
        <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.75, margin: "0 0 16px", fontFamily: "'DM Sans', sans-serif" }}>{a}</p>
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.1em", textTransform: "uppercase",
  color: T.dim, fontFamily: "DM Mono, monospace", marginBottom: 8,
};
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "12px 14px",
  background: "rgba(255,255,255,0.04)",
  border: `1.5px solid ${T.border}`,
  borderRadius: 11, color: T.text, fontSize: 14,
  fontFamily: "'DM Sans', sans-serif", outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const [selectedPlan,   setSelectedPlan]   = useState<string>("pro");
  const [selectedMethod, setSelectedMethod] = useState<PayMethod>("tnm");
  const [activeSection,  setActiveSection]  = useState<"plans" | "payment" | "history">("plans");

  const currentPlan = PLANS.find(p => p.id === "free")!;
  const chosenPlan  = PLANS.find(p => p.id === selectedPlan)!;

  const SECTIONS = [
    { id: "plans",   label: "Plans",          icon: "📦" },
    { id: "payment", label: "Payment Method", icon: "💳" },
    { id: "history", label: "Billing History",icon: "📄" },
  ] as const;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; }
        @keyframes bill-spin  { to { transform: rotate(360deg); } }
        @keyframes slideUp    { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-ring { 0% { transform:scale(0.9); opacity:0.8; } 100% { transform:scale(2); opacity:0; } }
        @keyframes fadeIn     { from { opacity:0; } to { opacity:1; } }
        .bill-tab:hover { background: rgba(255,255,255,0.06) !important; color: ${T.text} !important; }
        .plan-card:hover { transform: translateY(-2px); }
      `}</style>

      <div style={{ fontFamily: "'Syne', sans-serif", background: T.bg, minHeight: "100vh", color: T.text, padding: "32px 28px", maxWidth: 980, margin: "0 auto" }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(124,58,237,0.7)", fontFamily: "DM Mono, monospace", marginBottom: 6 }}>
            NeuroFlow · Workspace
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: T.text, margin: "0 0 8px", letterSpacing: "-0.8px" }}>Billing & Plans</h1>
          <p style={{ fontSize: 13, color: T.muted, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
            Manage your subscription, payment methods, and billing history
          </p>
        </div>

        {/* ── Coming soon banner ── */}
        <ComingSoonBanner />

        {/* ── Current plan ── */}
        <CurrentPlanSummary plan={currentPlan} />

        {/* ── Section tabs ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: `1px solid ${T.border}`, paddingBottom: 0 }}>
          {SECTIONS.map(s => {
            const active = activeSection === s.id;
            return (
              <button key={s.id} className="bill-tab"
                onClick={() => setActiveSection(s.id as any)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: "10px 10px 0 0", background: active ? T.surfaceHi : "transparent", border: "none", borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent", color: active ? T.accent : T.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", flexShrink: 0 }}>
                <span style={{ fontSize: 15 }}>{s.icon}</span>
                {s.label}
              </button>
            );
          })}
        </div>

        {/* ── Plans tab ── */}
        {activeSection === "plans" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 36 }}>
              {PLANS.map((plan, i) => (
                <div key={plan.id} className="plan-card" style={{ animationDelay: `${i * 0.07}s`, transition: "transform 0.2s" }}>
                  <PlanCard
                    plan={plan}
                    selected={selectedPlan === plan.id}
                    onSelect={() => setSelectedPlan(plan.id)}
                    currentPlan={currentPlan.id}
                  />
                </div>
              ))}
            </div>

            {/* Proceed CTA */}
            {selectedPlan !== currentPlan.id && (
              <div style={{ padding: "22px 24px", background: "rgba(124,58,237,0.07)", border: "1.5px solid rgba(124,58,237,0.2)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", animation: "slideUp 0.3s ease" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 }}>
                    Upgrade to <span style={{ color: T.accent }}>{chosenPlan.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, fontFamily: "DM Mono, monospace" }}>
                    {chosenPlan.price === 0 ? "Free forever" : `${fmt(chosenPlan.price)} / month`}
                  </div>
                </div>
                <button
                  onClick={() => setActiveSection("payment")}
                  style={{ padding: "12px 28px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "'Syne', sans-serif", boxShadow: "0 6px 24px rgba(124,58,237,0.4)", transition: "all 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; }}>
                  Continue to Payment →
                </button>
              </div>
            )}

            {/* FAQ */}
            <div style={{ marginTop: 44 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>Frequently Asked Questions</div>
              <div style={{ fontSize: 11, color: T.dim, fontFamily: "DM Mono, monospace", marginBottom: 20 }}>Everything you need to know about billing</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <FAQ q="When will billing be available?" a="We're finalising payment integrations for TNM Mpamba, Airtel Money, and international cards. You'll receive an email notification as soon as billing goes live. All plan prices and features are confirmed." />
                <FAQ q="Will my free tier data be preserved when I upgrade?" a="Yes — all your brands, templates, drafts, and review data carry over seamlessly when you upgrade to any paid plan." />
                <FAQ q="Can I pay in Malawian Kwacha (MWK)?" a="Absolutely. TNM Mpamba and Airtel Money payments are processed in MWK. Card payments support MWK, USD, and GBP." />
                <FAQ q="Is there a contract or can I cancel anytime?" a="All plans are month-to-month with no contracts. Cancel anytime from this billing page — your plan stays active until the end of the billing period." />
                <FAQ q="Do you offer NGO or educational discounts?" a="Yes — contact us directly once billing is live and we'll set up a custom discounted plan for qualifying organisations." />
              </div>
            </div>
          </div>
        )}

        {/* ── Payment Method tab ── */}
        {activeSection === "payment" && (
          <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 560 }}>

            <div style={{ padding: "16px 18px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.22)", borderRadius: 12, marginBottom: 28, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <p style={{ fontSize: 12, color: "rgba(251,191,36,0.75)", lineHeight: 1.65, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                Payment processing is not yet active. Your details below will not be charged. We're collecting preferences so activation is instant when we go live.
              </p>
            </div>

            {/* Selected plan summary */}
            <div style={{ padding: "14px 18px", background: T.surfaceHi, border: `1px solid ${T.borderHi}`, borderRadius: 13, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 10, color: T.dim, fontFamily: "DM Mono, monospace", marginBottom: 3 }}>SELECTED PLAN</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{chosenPlan.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: T.accent, fontFamily: "'Syne', sans-serif" }}>
                  {chosenPlan.price === 0 ? "Free" : fmt(chosenPlan.price)}
                </div>
                {chosenPlan.price > 0 && <div style={{ fontSize: 10, color: T.dim, fontFamily: "DM Mono, monospace" }}>/month</div>}
              </div>
            </div>

            {/* Payment method cards */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.dim, fontFamily: "DM Mono, monospace", marginBottom: 12 }}>
                Payment Method
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {PAY_METHODS.map(m => (
                  <PaymentMethodCard key={m.id} method={m} selected={selectedMethod === m.id} onSelect={() => setSelectedMethod(m.id)} />
                ))}
              </div>
            </div>

            {/* Method-specific form */}
            <div style={{ padding: "20px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, fontFamily: "DM Mono, monospace", marginBottom: 2, letterSpacing: "0.06em" }}>
                {selectedMethod === "tnm" ? "TNM MPAMBA" : selectedMethod === "airtel" ? "AIRTEL MONEY" : "CARD DETAILS"}
              </div>
              <div style={{ fontSize: 9, color: T.dim, fontFamily: "DM Mono, monospace", marginBottom: 14 }}>
                {selectedMethod === "card" ? "Your card details are encrypted and never stored" : "Mobile money push notification will be sent to your number"}
              </div>

              {(selectedMethod === "tnm" || selectedMethod === "airtel") && (
                <MobileMoneyForm method={selectedMethod} />
              )}
              {selectedMethod === "card" && <CardForm />}
            </div>

            {/* Pay button */}
            <button
              style={{ marginTop: 18, width: "100%", padding: "15px", background: "linear-gradient(135deg, rgba(124,58,237,0.6), rgba(79,70,229,0.6))", border: "1.5px solid rgba(124,58,237,0.4)", borderRadius: 14, color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 800, cursor: "not-allowed", fontFamily: "'Syne', sans-serif", letterSpacing: "0.02em", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              Confirm Subscription — Coming Soon
            </button>

            <p style={{ textAlign: "center", marginTop: 12, fontSize: 10, color: T.dim, fontFamily: "DM Mono, monospace" }}>
              No charges will be made until billing is officially activated
            </p>
          </div>
        )}

        {/* ── Billing History tab ── */}
        {activeSection === "history" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <BillingHistory />
          </div>
        )}

        {/* ── Notify me strip ── */}
        <div style={{ marginTop: 52, paddingTop: 28, borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 4 }}>Be the first to know</div>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>Get an email the moment billing goes live.</div>
          </div>
          <NotifyButton />
        </div>

      </div>
    </>
  );
}