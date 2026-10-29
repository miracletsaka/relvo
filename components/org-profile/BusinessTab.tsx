"use client";

import { useEffect, useState } from "react";
import { api, C, BUSINESS_TYPES, COMPANY_SIZES, COUNTRIES, SOCIAL_PLATFORMS, type BusinessInfo, Card, SectionHeading, LogoSection, Inp, Sel, Textarea, PhoneInp, Btn, LoadingCards } from "./shared";

export function BusinessTab() {
  const [data,    setData]    = useState<BusinessInfo>({});
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showToast = (ok: boolean, msg: string) => setToast({ type: ok ? "ok" : "err", text: msg });

  useEffect(() => {
    Promise.all([
      api<BusinessInfo>("/org-profile/business-info").catch(() => ({} as BusinessInfo)),
      api<{ logo_url?: string | null }>("/organisations/me").catch(() => ({})),
    ]).then(([biz, org]) => {
      setData(biz);
      setOrgLogo(org?.logo_url || null);
    }).finally(() => setLoading(false));
  }, []);

  const set = (field: keyof BusinessInfo, value: any) => setData(d => ({ ...d, [field]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api<BusinessInfo>("/org-profile/business-info", { method: "PUT", body: JSON.stringify(data) });
      setData(updated);
      showToast(true, "Business info saved");
    } catch (e: any) { showToast(false, e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingCards />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Identity */}
      <Card>
        <SectionHeading title="Identity" sub="How your business presents itself" />
        <LogoSection currentLogoUrl={orgLogo} onSaved={url => setOrgLogo(url)} toast={toast} />
        <Inp label="Tagline" value={data.tagline} onChange={(v: string) => set("tagline", v)} placeholder="Transforming brands through intelligent content" />
        <Textarea label="Description" value={data.description} onChange={(v: string) => set("description", v)} placeholder="Tell us about your business…" rows={4} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Sel label="Business Type" value={data.business_type || ""} onChange={v => set("business_type", v)} options={BUSINESS_TYPES} />
          <Sel label="Company Size"  value={data.company_size  || ""} onChange={v => set("company_size",  v)} options={COMPANY_SIZES}  />
          <Inp label="Founded Year" type="number" value={data.founded_year} onChange={(v: string) => set("founded_year", v ? parseInt(v) : undefined)} placeholder="2019" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Inp label="Registration / Company Number" value={data.registration_no} onChange={(v: string) => set("registration_no", v)} placeholder="12345678" />
          <Inp label="VAT Number" value={data.vat_number} onChange={(v: string) => set("vat_number", v)} placeholder="GB123456789" />
        </div>
      </Card>

      {/* Contact */}
      <Card>
        <SectionHeading title="Contact Details" sub="How customers and partners can reach you" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Inp label="Primary Email" type="email" value={data.email_primary} onChange={(v: string) => set("email_primary", v)} placeholder="hello@yourbrand.com" />
          <Inp label="Support Email"  type="email" value={data.email_support} onChange={(v: string) => set("email_support", v)} placeholder="support@yourbrand.com" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <PhoneInp label="Primary Phone"   value={data.phone_primary}   onChange={v => set("phone_primary",   v)} placeholder="+44 7911 123456" />
          <PhoneInp label="Secondary Phone" value={data.phone_secondary} onChange={v => set("phone_secondary", v)} placeholder="+265 991 234567" />
          <PhoneInp label="WhatsApp"        value={data.whatsapp}        onChange={v => set("whatsapp",        v)} placeholder="+44 7911 123456" />
        </div>
        <Inp label="Website" value={data.website} onChange={(v: string) => set("website", v)} placeholder="https://yourbrand.com" />
      </Card>

      {/* Location */}
      <Card>
        <SectionHeading title="Location" sub="Your physical or registered business address" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Sel label="Country" value={data.country || ""} onChange={v => set("country", v)} options={COUNTRIES} />
          <Inp label="City" value={data.city} onChange={(v: string) => set("city", v)} placeholder="London" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Inp label="State / Province" value={data.state_province} onChange={(v: string) => set("state_province", v)} placeholder="England" />
          <Inp label="Postcode / ZIP"   value={data.postal_code}    onChange={(v: string) => set("postal_code",    v)} placeholder="SW1A 1AA" />
        </div>
        <Textarea label="Street Address" value={data.address} onChange={(v: string) => set("address", v)} placeholder="123 High Street, Westminster" rows={2} />
        <Inp label="Google Maps URL" value={data.map_url} onChange={(v: string) => set("map_url", v)} placeholder="https://maps.google.com/?q=…" />
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", margin: "-8px 0 0", fontFamily: "DM Mono, monospace" }}>Paste a Google Maps share link — shown as a map button on your public profile</p>
      </Card>

      {/* Social */}
      <Card>
        <SectionHeading title="Social Media" sub="Your brand's online presence" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {SOCIAL_PLATFORMS.map(({ key, label, placeholder, icon }) => (
            <div key={key}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", fontFamily: "DM Mono, monospace", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{icon}</span> {label}
              </div>
              <input type="url" value={(data as any)[key] ?? ""} onChange={e => set(key as keyof BusinessInfo, e.target.value)} placeholder={placeholder}
                style={{ width: "100%", boxSizing: "border-box" as const, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 13px", color: "#f1f5f9", fontSize: 12, fontFamily: "DM Mono, monospace", outline: "none" }}
                onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)"; }}
                onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.boxShadow = "none"; }} />
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: 8 }}>
        <Btn onClick={save} loading={saving}>Save Business Info</Btn>
      </div>
    </div>
  );
}
