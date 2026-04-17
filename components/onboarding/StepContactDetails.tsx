"use client";
/**
 * components/onboarding/StepContactDetails.tsx
 * Step 4: Email, phones, address, city, country.
 */

import { useState } from "react";
import { StepShell } from "./StepShell";

type ContactData = {
  email_primary:   string;
  email_support:   string;
  phone_primary:   string;
  phone_secondary: string;
  whatsapp:        string;
  address:         string;
  city:            string;
  country:         string;
  postal_code:     string;
};

type Props = {
  initial?:  Partial<ContactData>;
  onNext:    (data: ContactData) => void;
  onBack:    () => void;
  stepIndex: number;
};

const COUNTRIES = [
  "United Kingdom","United States","Australia","Canada","South Africa",
  "Nigeria","Kenya","Ghana","Zimbabwe","Zambia","Malawi","Tanzania","Uganda",
  "India","Pakistan","Singapore","Malaysia","Philippines",
  "United Arab Emirates","Saudi Arabia","Ireland","Germany","France","Netherlands",
  "New Zealand","Jamaica","Trinidad and Tobago",
];

const Field = ({ label, value, onChange, placeholder, type = "text", prefix }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; prefix?: string;
}) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <div style={{ position: "relative" }}>
      {prefix && <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none" }}>{prefix}</span>}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, ...(prefix ? { paddingLeft: 40 } : {}) }}
        onFocus={e => { e.target.style.borderColor = "rgba(167,139,250,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
        onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
      />
    </div>
  </div>
);

export default function StepContactDetails({ initial = {}, onNext, onBack, stepIndex }: Props) {
  const [data, setData] = useState<ContactData>({
    email_primary:   initial.email_primary   || "",
    email_support:   initial.email_support   || "",
    phone_primary:   initial.phone_primary   || "",
    phone_secondary: initial.phone_secondary || "",
    whatsapp:        initial.whatsapp        || "",
    address:         initial.address         || "",
    city:            initial.city            || "",
    country:         initial.country         || "",
    postal_code:     initial.postal_code     || "",
  });

  const set = (k: keyof ContactData) => (v: string) => setData(d => ({ ...d, [k]: v }));

  return (
    <StepShell
      stepIndex={stepIndex}
      eyebrow="Step 4 of 6"
      headline="How do customers reach you?"
      sub="Contact details appear on your public profile and are used in generated content."
      onNext={() => onNext(data)}
      onBack={onBack}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Email */}
        <div>
          <p style={sectionHeading}>Email Addresses</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Primary Email" value={data.email_primary} onChange={set("email_primary")} placeholder="hello@yourbrand.com" type="email" prefix="✉️" />
            <Field label="Support Email" value={data.email_support} onChange={set("email_support")} placeholder="support@yourbrand.com" type="email" prefix="🎧" />
          </div>
        </div>

        {/* Phone */}
        <div>
          <p style={sectionHeading}>Phone Numbers <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400, fontSize: 9 }}>(include country code, e.g. +44)</span></p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Field label="Primary Phone" value={data.phone_primary} onChange={set("phone_primary")} placeholder="+44 7911 123456" prefix="📞" />
            <Field label="Secondary Phone" value={data.phone_secondary} onChange={set("phone_secondary")} placeholder="+265 991 234567" prefix="📱" />
            <Field label="WhatsApp" value={data.whatsapp} onChange={set("whatsapp")} placeholder="+44 7911 123456" prefix="💬" />
          </div>
        </div>

        {/* Address */}
        <div>
          <p style={sectionHeading}>Physical Location</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Country</label>
              <select value={data.country} onChange={e => set("country")(e.target.value)}
                style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
                <option value="">Select country…</option>
                {COUNTRIES.map(c => <option className="text-black" key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Field label="City / Town" value={data.city} onChange={set("city")} placeholder="London" prefix="🏙️" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Street Address</label>
              <textarea value={data.address} onChange={e => set("address")(e.target.value)}
                placeholder="123 High Street, Westminster" rows={2}
                style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }}
                onFocus={e => { e.target.style.borderColor = "rgba(167,139,250,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }} />
            </div>
            <Field label="Postcode / ZIP" value={data.postal_code} onChange={set("postal_code")} placeholder="SW1A 1AA" />
          </div>
        </div>

      </div>
    </StepShell>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
  textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
  fontFamily: "DM Mono, monospace", marginBottom: 8,
};

const sectionHeading: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
  textTransform: "uppercase", color: "rgba(255,255,255,0.35)",
  fontFamily: "DM Mono, monospace", margin: "0 0 12px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "12px 14px",
  background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)",
  borderRadius: 11, color: "#f1f5f9", fontSize: 13,
  fontFamily: "'DM Sans', sans-serif", outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};
