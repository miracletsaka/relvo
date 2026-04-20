"use client";
/**
 * app/onboarding/page.tsx
 * ──────────────────────────────────────────────────────────────────────
 * Onboarding orchestrator.
 *
 * Steps:
 *   WelcomeScreen → StepOrgName → StepDescribeBusiness →
 *   StepWebsiteScrape → StepContactDetails →
 *   StepSocialMedia → StepBranding → /dashboard
 *
 * StepBranding now owns the full brand creation + template generation.
 * OnboardingPage only saves org + business info, then hands off to StepBranding.
 */

import { useState } from "react";
import OnboardingProgress, { ONBOARDING_STEPS } from "@/components/onboarding/OnboardingProgress";
import WelcomeScreen        from "@/components/onboarding/WelcomeScreen";
import StepOrgName          from "@/components/onboarding/StepOrgName";
import StepDescribeBusiness from "@/components/onboarding/StepDescribeBusiness";
import StepWebsiteScrape    from "@/components/onboarding/StepWebsiteScrape";
import StepContactDetails   from "@/components/onboarding/StepContactDetails";
import StepSocialMedia      from "@/components/onboarding/StepSocialMedia";
import StepBranding         from "@/components/onboarding/StepBranding";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res  = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (Array.isArray(json.detail)) {
      throw new Error(
        json.detail.map((e: any) =>
          `${Array.isArray(e.loc) ? e.loc.join(" → ") : e.loc}: ${e.msg}`
        ).join("; ") || `Error ${res.status}`
      );
    }
    throw new Error(
      typeof json.detail  === "string" ? json.detail  :
      typeof json.message === "string" ? json.message :
      `Error ${res.status}`
    );
  }
  return json as T;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type FormData = {
  org_name:        string;
  business_type:   string;
  tagline:         string;
  description:     string;
  founded_year:    string;
  company_size:    string;
  website:         string;
  email_primary:   string;
  email_support:   string;
  phone_primary:   string;
  phone_secondary: string;
  whatsapp:        string;
  address:         string;
  city:            string;
  country:         string;
  postal_code:     string;
  facebook_url:    string;
  instagram_url:   string;
  linkedin_url:    string;
  twitter_url:     string;
  tiktok_url:      string;
  youtube_url:     string;
};

const EMPTY: FormData = {
  org_name: "", business_type: "",
  tagline: "", description: "", founded_year: "", company_size: "",
  website: "",
  email_primary: "", email_support: "", phone_primary: "",
  phone_secondary: "", whatsapp: "", address: "", city: "",
  country: "", postal_code: "",
  facebook_url: "", instagram_url: "", linkedin_url: "",
  twitter_url: "", tiktok_url: "", youtube_url: "",
};

type Screen = "welcome" | "step";

export default function OnboardingPage() {
  const [screen,    setScreen]    = useState<Screen>("welcome");
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [formData,  setFormData]  = useState<FormData>(EMPTY);
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgError,  setOrgError]  = useState<string | null>(null);

  const markDone = (i: number) => setCompleted(prev => new Set([...prev, i]));
  const goNext   = () => { markDone(stepIndex); setStepIndex(i => i + 1); };
  const goBack   = () => setStepIndex(i => Math.max(0, i - 1));
  const patch    = (data: Partial<FormData>) => setFormData(d => ({ ...d, ...data }));

  const clean = (obj: Record<string, any>) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined && v !== null));

  // ── Steps 0–4 just accumulate data locally.
  // ── At step 5 (StepBranding) we push everything to the API at once.

  const handleBeforeBranding = async () => {
    // Called after StepSocialMedia — save org + business info before entering StepBranding
    setOrgSaving(true); setOrgError(null);
    try {
      // 1. Create org
      await apiFetch<{ id: string; slug: string }>("/organisations", {
        method: "POST",
        body: JSON.stringify({ name: formData.org_name }),
      });

      // 2. Save business info
      await apiFetch("/org-profile/business-info", {
        method: "PUT",
        body: JSON.stringify(clean({
          tagline:         formData.tagline,
          description:     formData.description,
          business_type:   formData.business_type,
          company_size:    formData.company_size,
          founded_year:    formData.founded_year ? parseInt(formData.founded_year) : undefined,
          website:         formData.website,
          email_primary:   formData.email_primary,
          email_support:   formData.email_support,
          phone_primary:   formData.phone_primary,
          phone_secondary: formData.phone_secondary,
          whatsapp:        formData.whatsapp,
          address:         formData.address,
          city:            formData.city,
          country:         formData.country,
          postal_code:     formData.postal_code,
          facebook_url:    formData.facebook_url,
          instagram_url:   formData.instagram_url,
          linkedin_url:    formData.linkedin_url,
          twitter_url:     formData.twitter_url,
          tiktok_url:      formData.tiktok_url,
          youtube_url:     formData.youtube_url,
        })),
      });

      // Advance to StepBranding
      goNext();
    } catch (e: any) {
      setOrgError(e.message || "Failed to save. Please try again.");
    } finally {
      setOrgSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (screen === "welcome") {
    return <WelcomeScreen onStart={() => setScreen("step")} />;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080810; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#080810", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>

        <div style={{ position: "fixed", top: "-15%", right: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "fixed", bottom: "5%", left: "5%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

        <header style={{ padding: "22px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "relative", zIndex: 10 }}>
          <div className="">
            <img src="/logo.png" alt="Relvo AI" style={{ width: 50, height: "auto" }} />
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", letterSpacing: "0.06em" }}>
            SETUP · {stepIndex + 1} of {ONBOARDING_STEPS.length}
          </span>
        </header>

        <div style={{ padding: "0 40px 32px", flexShrink: 0, position: "relative", zIndex: 10 }}>
          <OnboardingProgress currentStep={stepIndex} completedSteps={completed} />
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "0 24px 80px", position: "relative", zIndex: 10 }}>
          <div style={{ width: "100%", maxWidth: 620 }}>

            {stepIndex === 0 && (
              <StepOrgName
                stepIndex={0}
                initialValue={formData.org_name}
                onNext={name => { patch({ org_name: name }); goNext(); }}
              />
            )}

            {stepIndex === 1 && (
              <StepDescribeBusiness
                stepIndex={1}
                initial={{ tagline: formData.tagline, description: formData.description, founded_year: formData.founded_year, company_size: formData.company_size }}
                onNext={data => { patch(data); goNext(); }}
                onBack={goBack}
              />
            )}

            {stepIndex === 2 && (
              <StepWebsiteScrape
                stepIndex={2}
                initial={formData.website}
                onNext={url => { patch({ website: url }); goNext(); }}
                onBack={goBack}
              />
            )}

            {stepIndex === 3 && (
              <StepContactDetails
                stepIndex={3}
                initial={{ email_primary: formData.email_primary, email_support: formData.email_support, phone_primary: formData.phone_primary, phone_secondary: formData.phone_secondary, whatsapp: formData.whatsapp, address: formData.address, city: formData.city, country: formData.country, postal_code: formData.postal_code }}
                onNext={data => { patch(data); goNext(); }}
                onBack={goBack}
              />
            )}

            {stepIndex === 4 && (
              <StepSocialMedia
                stepIndex={4}
                initial={{ facebook_url: formData.facebook_url, instagram_url: formData.instagram_url, linkedin_url: formData.linkedin_url, twitter_url: formData.twitter_url, tiktok_url: formData.tiktok_url, youtube_url: formData.youtube_url }}
                onNext={data => {
                  patch(data);
                  // Save org + business info then advance to branding
                  handleBeforeBranding();
                }}
                onBack={goBack}
                loading={orgSaving}
              />
            )}

            {stepIndex === 5 && (
              <StepBranding
                stepIndex={5}
                orgName={formData.org_name}
                onNext={() => { window.location.href = "/dashboard"; }}
                onBack={goBack}
              />
            )}

            {/* Org-save error (shown between social + branding) */}
            {orgError && stepIndex < 5 && (
              <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 12, fontSize: 13, color: "#f87171", fontFamily: "DM Mono, monospace", lineHeight: 1.55 }}>
                <strong style={{ display: "block", marginBottom: 4 }}>Error saving workspace</strong>
                {orgError}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}