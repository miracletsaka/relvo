"use client";

import { useEffect, useState } from "react";
import OnboardingProgress, { ONBOARDING_STEPS } from "@/components/onboarding/OnboardingProgress";
import WelcomeScreen from "@/components/onboarding/WelcomeScreen";
import StepOrgName from "@/components/onboarding/StepOrgName";
import StepDescribeBusiness from "@/components/onboarding/StepDescribeBusiness";
import StepWebsiteScrape from "@/components/onboarding/StepWebsiteScrape";
import StepContactDetails from "@/components/onboarding/StepContactDetails";
import StepSocialMedia from "@/components/onboarding/StepSocialMedia";
import StepBranding from "@/components/onboarding/StepBranding";
import StepFinalizeSetup from "@/components/onboarding/StepFinalizeSetup";
import { uploadFileToSpaces } from "@/lib/video-upload-client";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...((opts.headers as Record<string, string> | undefined) ?? {}),
    },
    ...opts,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (Array.isArray((json as any).detail)) {
      throw new Error(
        (json as any).detail
          .map((e: any) =>
            `${Array.isArray(e.loc) ? e.loc.join(" → ") : e.loc}: ${e.msg}`,
          )
          .join("; ") || `Error ${res.status}`,
      );
    }

    throw new Error(
      typeof (json as any).detail === "string"
        ? (json as any).detail
        : typeof (json as any).message === "string"
          ? (json as any).message
          : `Error ${res.status}`,
    );
  }

  return json as T;
}

type Brand = {
  id: string;
  display_name: string;
  is_active: boolean;
  logo_url?: string | null;
};

type Org = {
  id: string;
  name: string;
  slug?: string;
  role?: string;
  logo_url?: string | null;
};

type Orientation = "portrait" | "landscape";

type FormData = {
  org_name: string;
  business_type: string;
  org_logo_file: File | null;
  org_logo_url: string;
  tagline: string;
  description: string;
  founded_year: string;
  company_size: string;
  website: string;
  email_primary: string;
  email_support: string;
  phone_primary: string;
  phone_secondary: string;
  whatsapp: string;
  address: string;
  city: string;
  country: string;
  postal_code: string;
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  twitter_url: string;
  tiktok_url: string;
  youtube_url: string;
};

const EMPTY: FormData = {
  org_name: "",
  business_type: "",
  org_logo_file: null,
  org_logo_url: "",
  tagline: "",
  description: "",
  founded_year: "",
  company_size: "",
  website: "",
  email_primary: "",
  email_support: "",
  phone_primary: "",
  phone_secondary: "",
  whatsapp: "",
  address: "",
  city: "",
  country: "",
  postal_code: "",
  facebook_url: "",
  instagram_url: "",
  linkedin_url: "",
  twitter_url: "",
  tiktok_url: "",
  youtube_url: "",
};

type Screen = "loading" | "welcome" | "step";

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`))
      ?.split("=")[1] || ""
  );
}

export default function OnboardingPage() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<FormData>(EMPTY);
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  const [createdBrandId, setCreatedBrandId] = useState("");
  const [createdBrandLogoUrl, setCreatedBrandLogoUrl] = useState("");
  const [createdBrandOrientation, setCreatedBrandOrientation] = useState<Orientation>("landscape");

  const markDone = (i: number) => setCompleted((prev) => new Set([...prev, i]));

  const goNext = () => {
    markDone(stepIndex);
    setStepIndex((i) => i + 1);
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const patch = (data: Partial<FormData>) =>
    setFormData((prev) => ({
      ...prev,
      ...data,
    }));

  const clean = (obj: Record<string, any>) =>
    Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined && v !== null),
    );

  async function resolveCurrentOrg() {
    const current = await apiFetch<Org>("/organisations/current").catch(() => null);

    if (current?.id) {
      return current;
    }

    const orgs = await apiFetch<Org[]>("/organisations/my-orgs").catch(() => []);

    if (!orgs.length) {
      return null;
    }

    const cookieOrgId = getCookie("nf_org");
    const cookieOrg = orgs.find((org) => org.id === cookieOrgId);
    const fallbackOrg = cookieOrg || orgs[0];

    await apiFetch(`/organisations/switch/${fallbackOrg.id}`, {
      method: "POST",
    }).catch(() => {});

    return fallbackOrg;
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const currentOrg = await resolveCurrentOrg();

        if (cancelled) return;

        if (!currentOrg) {
          setScreen("welcome");
          return;
        }

        setFormData((prev) => ({
          ...prev,
          org_name: currentOrg.name || "",
          org_logo_url: currentOrg.logo_url || "",
        }));

        const brands = await apiFetch<Brand[]>("/brands?active_only=false").catch(() => []);

        if (cancelled) return;

        if (brands.length > 0) {
          const brand = brands[0];

          setCreatedBrandId(brand.id);
          setCreatedBrandLogoUrl(brand.logo_url || currentOrg.logo_url || "");
          setCompleted(new Set([0, 1, 2, 3, 4, 5]));
          setStepIndex(6);
          setScreen("step");
          return;
        }

        setCompleted(new Set([0, 1, 2, 3, 4]));
        setStepIndex(5);
        setScreen("step");
      } catch {
        if (!cancelled) {
          setScreen("welcome");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleBeforeBranding = async () => {
    setOrgSaving(true);
    setOrgError(null);

    try {
      const existingOrg = await apiFetch<Org>("/organisations/current").catch(() => null);

      if (existingOrg?.id) {
        if (formData.org_name.trim()) {
          await apiFetch("/organisations/me", {
            method: "PATCH",
            body: JSON.stringify({
              name: formData.org_name.trim(),
            }),
          }).catch(() => {});
        }
      } else {
        await apiFetch<{ id: string; slug: string }>("/organisations", {
          method: "POST",
          body: JSON.stringify({
            name: formData.org_name,
          }),
        });
      }

      let finalOrgLogoUrl: string | null = formData.org_logo_url?.trim() || null;

      if (formData.org_logo_file) {
        finalOrgLogoUrl = await uploadFileToSpaces(formData.org_logo_file);
      }

      if (finalOrgLogoUrl) {
        await apiFetch("/organisations/me", {
          method: "PATCH",
          body: JSON.stringify({
            logo_url: finalOrgLogoUrl,
          }),
        }).catch(() => {});
      }

      await apiFetch("/org-profile/business-info", {
        method: "PUT",
        body: JSON.stringify(
          clean({
            tagline: formData.tagline,
            description: formData.description,
            business_type: formData.business_type,
            company_size: formData.company_size,
            founded_year: formData.founded_year ? parseInt(formData.founded_year, 10) : undefined,
            website: formData.website,
            email_primary: formData.email_primary,
            email_support: formData.email_support,
            phone_primary: formData.phone_primary,
            phone_secondary: formData.phone_secondary,
            whatsapp: formData.whatsapp,
            address: formData.address,
            city: formData.city,
            country: formData.country,
            postal_code: formData.postal_code,
            facebook_url: formData.facebook_url,
            instagram_url: formData.instagram_url,
            linkedin_url: formData.linkedin_url,
            twitter_url: formData.twitter_url,
            tiktok_url: formData.tiktok_url,
            youtube_url: formData.youtube_url,
            auto_enrich: !!formData.website,
          }),
        ),
      });

      goNext();
    } catch (e: any) {
      setOrgError(e?.message || "Failed to save. Please try again.");
    } finally {
      setOrgSaving(false);
    }
  };

  if (screen === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#080810",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.5)",
          fontFamily: "DM Mono, monospace",
          fontSize: 13,
        }}
      >
        Restoring onboarding…
      </div>
    );
  }

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
          <div>
            <img src="/logo.png" alt="Relvo AI" style={{ width: 50, height: "auto" }} />
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", letterSpacing: "0.06em" }}>
            SETUP · {stepIndex + 1} of 7
          </span>
        </header>

        <div style={{ padding: "0 40px 32px", flexShrink: 0, position: "relative", zIndex: 10 }}>
          <OnboardingProgress currentStep={Math.min(stepIndex, ONBOARDING_STEPS.length - 1)} completedSteps={completed} />
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "0 24px 80px", position: "relative", zIndex: 10 }}>
          <div style={{ width: "100%", maxWidth: 620 }}>
            {stepIndex === 0 && (
              <StepOrgName
                stepIndex={0}
                initialValue={formData.org_name}
                initialBusinessType={formData.business_type}
                initialLogoUrl={formData.org_logo_url}
                onNext={(data) => {
                  patch({
                    org_name: data.name,
                    business_type: data.business_type,
                    org_logo_file: data.org_logo_file,
                    org_logo_url: data.org_logo_url,
                  });
                  goNext();
                }}
              />
            )}

            {stepIndex === 1 && (
              <StepDescribeBusiness
                stepIndex={1}
                initial={{
                  tagline: formData.tagline,
                  description: formData.description,
                  founded_year: formData.founded_year,
                  company_size: formData.company_size,
                }}
                onNext={(data) => {
                  patch(data);
                  goNext();
                }}
                onBack={goBack}
              />
            )}

            {stepIndex === 2 && (
              <StepWebsiteScrape
                stepIndex={2}
                initial={formData.website}
                onNext={(url) => {
                  patch({ website: url });
                  goNext();
                }}
                onBack={goBack}
              />
            )}

            {stepIndex === 3 && (
              <StepContactDetails
                stepIndex={3}
                initial={{
                  email_primary: formData.email_primary,
                  email_support: formData.email_support,
                  phone_primary: formData.phone_primary,
                  phone_secondary: formData.phone_secondary,
                  whatsapp: formData.whatsapp,
                  address: formData.address,
                  city: formData.city,
                  country: formData.country,
                  postal_code: formData.postal_code,
                }}
                onNext={(data) => {
                  patch(data);
                  goNext();
                }}
                onBack={goBack}
              />
            )}

            {stepIndex === 4 && (
              <StepSocialMedia
                stepIndex={4}
                initial={{
                  facebook_url: formData.facebook_url,
                  instagram_url: formData.instagram_url,
                  linkedin_url: formData.linkedin_url,
                  twitter_url: formData.twitter_url,
                  tiktok_url: formData.tiktok_url,
                  youtube_url: formData.youtube_url,
                }}
                onNext={(data) => {
                  patch(data);
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
                onBack={goBack}
                onNext={({ brandId, logoUrl, orientation }) => {
                  setCreatedBrandId(brandId);
                  setCreatedBrandLogoUrl(logoUrl);
                  setCreatedBrandOrientation(orientation);
                  goNext();
                }}
              />
            )}

            {stepIndex === 6 && createdBrandId && (
              <StepFinalizeSetup
                stepIndex={6}
                orgName={formData.org_name}
                brandId={createdBrandId}
                logoUrl={createdBrandLogoUrl}
                orientation={createdBrandOrientation}
                onBack={goBack}
                onDone={() => {
                  window.location.href = "/";
                }}
              />
            )}

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
