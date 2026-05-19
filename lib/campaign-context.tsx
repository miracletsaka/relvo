"use client";
/**
 * lib/campaign-context.tsx
 *
 * Strategy:
 *   DEFAULT_CAMPAIGN_DATA keeps all the rich demo/creative content as-is
 *   (hooks, bullets, reviews, sponsors, offers, images — everything that
 *   makes templates look good out of the box).
 *
 *   On mount we fetch ONLY the org identity fields — name, logo, contact,
 *   location, social links — and overlay them onto DEFAULT_CAMPAIGN_DATA.
 *   The rest (creative copy, demo reviews, demo sponsors, etc.) stays from
 *   DEFAULT_CAMPAIGN_DATA until a real draft is opened.
 *
 *   When a draft is opened: setCampaignData(draft) replaces everything.
 *   When a draft is closed: resetCampaignData() goes back to org-overlaid default.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CampaignData } from "./types";

// ── API helper ────────────────────────────────────────────────────────────────
const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT_CAMPAIGN_DATA
// Keep ALL the original demo content — hooks, reviews, sponsors, images, etc.
// Only the org-identity fields will be overwritten at runtime.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CAMPAIGN_DATA: CampaignData = {
  campaign_label: "AI AUTOMATION",
  collection_label: "BUSINESS GROWTH / 2026",

  headline: "AUTOMATE\nYOUR GROWTH",
  subheadline: "AI Lead Conversion System",

  product_name: "NeuroFlow AI",
  description:
    "AI voice, chat, and booking systems that capture leads, follow up automatically, and turn enquiries into appointments.",

  offer_value: "30% OFF",
  offer_label: "LIMITED TIME OFFER",
  cta_text: "BOOK FREE DEMO",
  cta: "BOOK FREE DEMO",

  footer_label: "LIMITED EDITION",

  feature_1: "AI Voice Receptionist",
  feature_2: "Automated Follow-Up",
  feature_3: "Calendar Booking",
  feature_4: "Lead Qualification",

  proof: "Trusted by modern service businesses",

  logo:
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",

  heroImage:
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",

  background_image:
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",

  imageSlots: {
    hero_person: {
      url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    },
    dashboard_image: {
      url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    },
    sponsor_1: {
      url: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    },
    sponsor_2: {
      url: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
    },
    sponsor_3: {
      url: "https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg",
    },
  },

  sponsors: [
    {
      name: "Amazon",
      logo_url: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
      website: "https://amazon.com",
    },
    {
      name: "Microsoft",
      logo_url: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
      website: "https://microsoft.com",
    },
  ],

  testimonial:
    "We started converting more enquiries almost immediately after switching to AI automation.",
  review_text:
    "We started converting more enquiries almost immediately after switching to AI automation.",
  review_author: "James R.",
  rating: "★★★★★",

  reviews: [
    {
      author_name: "James R.",
      rating: 5,
      body: "We started converting more enquiries almost immediately after switching to AI automation.",
      source: "Google",
    },
  ],

  offers: [
    {
      title: "Free AI Growth Consultation",
      description:
        "Book a free strategy session and discover how automation can improve your lead flow.",
      cta_text: "BOOK FREE DEMO",
      cta_url: "https://neuroflowai.co.uk/contact",
    },
  ],

  companyName: "NeuroFlow AI",
  social_handle: "@neuroflowai",

  website: "https://neuroflowai.co.uk",
  ctaLink: "https://neuroflowai.co.uk/contact",

  phone: "+44 7000 000000",
  email: "hello@neuroflowai.co.uk",
  whatsapp: "+44 7000 000000",

  address: "Canary Wharf Business Centre",
  location: "London, UK",
  city: "London",
  country: "United Kingdom",
  fullAddress: "Canary Wharf Business Centre, London, England, E14, United Kingdom",

  instagram_url: "https://instagram.com/neuroflowai",
  facebook_url: "https://facebook.com/neuroflowai",
  linkedin_url: "https://linkedin.com/company/neuroflowai",
  twitter_url: "https://x.com/neuroflowai",
  tiktok_url: "https://tiktok.com/@neuroflowai",
  youtube_url: "https://youtube.com/@neuroflowai",

  price_label: "From £99",
  original_price: "£149",
  discount_price: "£99",
  currency: "GBP",
  promo_code: "GROW30",

  fine_print: "Terms and conditions apply.",
  stock_label: "Limited spaces available",
  availability: "Available this month",

  businessInfo: {
    business_type: "AI Automation",
    founded_year: 2024,
    company_size: "11-50",
    website: "https://neuroflowai.co.uk",
    address: "Canary Wharf Business Centre",
    tagline: "Automate conversations. Scale with confidence.",
    description: "AI voice, chat, and booking systems for modern businesses.",
    email_primary: "hello@neuroflowai.co.uk",
    email_support: "support@neuroflowai.co.uk",
    phone_primary: "+44 7000 000000",
    phone_secondary: "+44 7000 000001",
    whatsapp: "+44 7000 000000",
    country: "United Kingdom",
    city: "London",
    state_province: "England",
    postal_code: "E14",
    facebook_url: "https://facebook.com/neuroflowai",
    instagram_url: "https://instagram.com/neuroflowai",
    linkedin_url: "https://linkedin.com/company/neuroflowai",
    twitter_url: "https://x.com/neuroflowai",
    tiktok_url: "https://tiktok.com/@neuroflowai",
    youtube_url: "https://youtube.com/@neuroflowai",
  },

  metadata: [
    { key: "industry", value: "AI Automation", category: "business" },
    { key: "service_1", value: "AI Voice Receptionist", category: "services" },
    { key: "service_2", value: "AI Chatbot", category: "services" },
    { key: "service_3", value: "Calendar Booking", category: "services" },
  ],

  hashtags: "#AI #Automation #LeadGeneration #BusinessGrowth",
};

// ─────────────────────────────────────────────────────────────────────────────
// Org identity fetch — ONLY the fields that identify the org.
// Everything else stays from DEFAULT_CAMPAIGN_DATA.
// ─────────────────────────────────────────────────────────────────────────────

type OrgIdentity = {
  name?:     string;
  logo_url?: string | null;
  slug?:     string;
};

type OrgBizInfo = {
  tagline?:         string;
  website?:         string;
  email_primary?:   string;
  email_support?:   string;
  phone_primary?:   string;
  phone_secondary?: string;
  whatsapp?:        string;
  address?:         string;
  city?:            string;
  state_province?:  string;
  postal_code?:     string;
  country?:         string;
  map_url?:         string;
  facebook_url?:    string;
  instagram_url?:   string;
  linkedin_url?:    string;
  twitter_url?:     string;
  tiktok_url?:      string;
  youtube_url?:     string;
  registration_no?: string;
  vat_number?:      string;
  founded_year?:    number;
  company_size?:    string;
  business_type?:   string;
  description?:     string;
};

/** Fetch org identity + biz info and overlay onto base CampaignData */
async function buildOrgOverlay(base: CampaignData): Promise<CampaignData> {
  const [orgRes, bizRes] = await Promise.allSettled([
    apiFetch<OrgIdentity>("/organisations/me"),
    apiFetch<OrgBizInfo>("/org-profile/business-info"),
  ]);

  const org = orgRes.status === "fulfilled" ? orgRes.value : null;
  const biz = bizRes.status === "fulfilled" ? bizRes.value : null;

  // Helper: use the real org value if it's non-empty, else keep the demo default
  const pick = (real: string | null | undefined, fallback: string) =>
    real && real.trim() ? real.trim() : fallback;

  // Build location string from real data if available
  const city    = biz?.city    || base.city;
  const country = biz?.country || base.country;
  const locationStr = [city, country].filter(Boolean).join(", ") || base.location;

  const fullAddr = [
    biz?.address        || base.address,
    biz?.city           || base.city,
    biz?.state_province || "",
    biz?.postal_code    || "",
    biz?.country        || base.country,
  ].filter(Boolean).join(", ") || base.fullAddress;

  return {
    // Spread the full demo base — keeps ALL creative/draft content intact
    ...base,

    // ── Overlay ONLY org identity fields ─────────────────────────────────────
    companyName: pick(org?.name, base.companyName as string),
    logo:        pick(org?.logo_url, base.logo as string),
    location:    locationStr,
    ctaLink:     pick(biz?.website, base.ctaLink as string),
    website:     pick(biz?.website, base.website as string),

    // Contact flat fields
    email:    pick(biz?.email_primary,  base.email as string),
    phone:    pick(biz?.phone_primary,  base.phone as string),
    whatsapp: pick(biz?.whatsapp,       base.whatsapp as string),
    address:  pick(biz?.address,        base.address as string),
    city,
    country,
    fullAddress: fullAddr,
    map_url:  pick(biz?.map_url,        base.map_url as string),

    // Social flat fields
    facebook_url:  pick(biz?.facebook_url,  base.facebook_url as string),
    instagram_url: pick(biz?.instagram_url, base.instagram_url as string),
    linkedin_url:  pick(biz?.linkedin_url,  base.linkedin_url as string),
    twitter_url:   pick(biz?.twitter_url,   base.twitter_url as string),
    tiktok_url:    pick(biz?.tiktok_url,    base.tiktok_url as string),
    youtube_url:   pick(biz?.youtube_url,   base.youtube_url as string),

    // Legal
    registration_no: pick(biz?.registration_no, base.registration_no as string),
    vat_number:      pick(biz?.vat_number,       base.vat_number as string),

    // Business info block — overlay only what the org has
    businessInfo: {
      ...base.businessInfo,
      ...(biz ? {
        website:         biz.website         || base.businessInfo?.website,
        email_primary:   biz.email_primary   || base.businessInfo?.email_primary,
        email_support:   biz.email_support   || base.businessInfo?.email_support,
        phone_primary:   biz.phone_primary   || base.businessInfo?.phone_primary,
        phone_secondary: biz.phone_secondary || base.businessInfo?.phone_secondary,
        whatsapp:        biz.whatsapp        || base.businessInfo?.whatsapp,
        address:         biz.address         || base.businessInfo?.address,
        city:            biz.city            || base.businessInfo?.city,
        state_province:  biz.state_province  || base.businessInfo?.state_province,
        postal_code:     biz.postal_code     || base.businessInfo?.postal_code,
        country:         biz.country         || base.businessInfo?.country,
        map_url:         biz.map_url         || base.businessInfo?.map_url,
        facebook_url:    biz.facebook_url    || base.businessInfo?.facebook_url,
        instagram_url:   biz.instagram_url   || base.businessInfo?.instagram_url,
        linkedin_url:    biz.linkedin_url    || base.businessInfo?.linkedin_url,
        twitter_url:     biz.twitter_url     || base.businessInfo?.twitter_url,
        tiktok_url:      biz.tiktok_url      || base.businessInfo?.tiktok_url,
        youtube_url:     biz.youtube_url     || base.businessInfo?.youtube_url,
        registration_no: biz.registration_no || base.businessInfo?.registration_no,
        vat_number:      biz.vat_number      || base.businessInfo?.vat_number,
        founded_year:    biz.founded_year    || base.businessInfo?.founded_year,
        company_size:    biz.company_size    || base.businessInfo?.company_size,
        business_type:   biz.business_type   || base.businessInfo?.business_type,
        description:     biz.description     || base.businessInfo?.description,
        tagline:         biz.tagline         || base.businessInfo?.tagline,
      } : {}),
      ...(org?.name     ? { tagline: biz?.tagline || base.businessInfo?.tagline } : {}),
    },

    // link_1_url mirrors website
    link_1_url: pick(biz?.website, base.link_1_url),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Context interface
// ─────────────────────────────────────────────────────────────────────────────

export interface CampaignContextType {
  campaignData:        CampaignData;
  setCampaignData:     (data: CampaignData) => void;
  updateCampaignField: (field: keyof CampaignData, value: string | string[]) => void;
  resetCampaignData:   () => void;
  logoUrl:             string | null;
  setLogoUrl:          (url: string | null) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context — module-level so it's a stable reference
// ─────────────────────────────────────────────────────────────────────────────

export const CampaignContext = createContext<CampaignContextType | undefined>(
  undefined
);

CampaignContext.displayName = "CampaignContext";

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function CampaignProvider({ children }: { children: ReactNode }) {
  // Start with full demo data — templates are renderable immediately
  const [campaignData, setCampaignDataState] = useState<CampaignData>(
    DEFAULT_CAMPAIGN_DATA
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(
    DEFAULT_CAMPAIGN_DATA.logo || null
  );
  // The org-overlaid version of DEFAULT_CAMPAIGN_DATA — used as the
  // "reset target" after a draft is closed
  const orgBaseRef = useRef<CampaignData>(DEFAULT_CAMPAIGN_DATA);
  const didInit    = useRef(false);

  // On mount: fetch org identity and overlay onto DEFAULT_CAMPAIGN_DATA
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    buildOrgOverlay(DEFAULT_CAMPAIGN_DATA)
      .then((overlaid) => {
        orgBaseRef.current = overlaid;
        setCampaignDataState(overlaid);
        setLogoUrl(overlaid.logo || null);
      })
      .catch(() => {
        // Not authenticated or network error — stay on DEFAULT_CAMPAIGN_DATA
      });
  }, []);

  // Replace entirely — called when opening a draft
  const setCampaignData = useCallback((data: CampaignData) => {
    setCampaignDataState(data);
    setLogoUrl(data.logo || null);
  }, []);

  // Edit a single field — called by inline canvas editors
  const updateCampaignField = useCallback(
    (field: keyof CampaignData, value: string | string[]) => {
      setCampaignDataState((prev) => ({ ...prev, [field]: value }));
      if (field === "logo") setLogoUrl((value as string) || null);
    },
    []
  );

  // Reset to org-overlaid default — called when closing a draft
  const resetCampaignData = useCallback(() => {
    setCampaignDataState(orgBaseRef.current);
    setLogoUrl(orgBaseRef.current.logo || null);
  }, []);

  return (
    <CampaignContext.Provider
      value={{
        campaignData,
        setCampaignData,
        updateCampaignField,
        resetCampaignData,
        logoUrl,
        setLogoUrl,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useCampaignData(): CampaignContextType {
  const ctx = useContext(CampaignContext);
  if (!ctx) {
    throw new Error(
      "useCampaignData must be called inside a <CampaignProvider>."
    );
  }
  return ctx;
}