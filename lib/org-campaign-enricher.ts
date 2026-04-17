/**
 * lib/org-campaign-enricher.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches real org profile data from the API (reviews, sponsors,
 * accreditations, offers, business info) and merges it into a CampaignData
 * object so templates always render real data — not AI hallucinations.
 *
 * Usage:
 *   const orgData = await fetchOrgCampaignData();   // call once per dialog open
 *   const enriched = enrichCampaignData(draftData, orgData);
 */

import type { CampaignData } from "@/lib/types";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Shapes of what the API returns ───────────────────────────────────────────

export type OrgReview = {
  id: string;
  author_name: string;
  rating: number;
  body?: string;
  source?: string;
  is_featured: boolean;
  is_verified: boolean;
};

export type OrgSponsor = {
  id: string;
  name: string;
  logo_url?: string;
  website?: string;
  sort_order: number;
};

export type OrgAccreditation = {
  id: string;
  name: string;
  issuer?: string;
  year?: number;
  logo_url?: string;
};

export type OrgOffer = {
  id: string;
  title: string;
  description?: string;
  cta_text?: string;
  cta_url?: string;
  expires_at?: string;
};

export type OrgBusinessInfo = {
  business_type?: string;
  founded_year?: number;
  company_size?: string;
  website?: string;
  address?: string;
  tagline?: string;
  description?: string;
};

export type OrgMetadata = {
  key: string;
  value: string;
  category?: string;
};

export type OrgCampaignData = {
  reviews:        OrgReview[];
  sponsors:       OrgSponsor[];
  accreditations: OrgAccreditation[];
  offers:         OrgOffer[];
  businessInfo:   OrgBusinessInfo | null;
  metadata:       OrgMetadata[];
};

// ── Fetch all org profile data in parallel ────────────────────────────────────

export async function fetchOrgCampaignData(): Promise<OrgCampaignData> {
  const [
    reviews,
    sponsors,
    accreditations,
    offers,
    businessInfo,
    metadata,
  ] = await Promise.allSettled([
    apiFetch<OrgReview[]>("/org-profile/reviews"),
    apiFetch<OrgSponsor[]>("/org-profile/sponsors"),
    apiFetch<OrgAccreditation[]>("/org-profile/accreditations"),
    apiFetch<OrgOffer[]>("/org-profile/offers"),
    apiFetch<OrgBusinessInfo>("/org-profile/business-info"),
    apiFetch<OrgMetadata[]>("/org-profile/metadata"),
  ]);

  return {
    reviews:        reviews.status        === "fulfilled" ? reviews.value        : [],
    sponsors:       sponsors.status       === "fulfilled" ? sponsors.value       : [],
    accreditations: accreditations.status === "fulfilled" ? accreditations.value : [],
    offers:         offers.status         === "fulfilled" ? offers.value         : [],
    businessInfo:   businessInfo.status   === "fulfilled" ? businessInfo.value   : null,
    metadata:       metadata.status       === "fulfilled" ? metadata.value       : [],
  };
}

// ── Merge org data into campaign data ─────────────────────────────────────────
//
// Rules:
//  - Existing non-empty values on draftData are NEVER overwritten
//  - Org data fills gaps only
//  - imageSlots are extended with sponsor/accreditation logos
//  - Featured/verified reviews are preferred over plain ones

export function enrichCampaignData(
  draftData: CampaignData,
  org: OrgCampaignData
): CampaignData {
  const biz = org.businessInfo;

  // ── Best review — featured+verified first, then by rating ────────────────
  const sortedReviews = [...org.reviews].sort((a, b) => {
    const score = (r: OrgReview) =>
      (r.is_featured ? 10 : 0) + (r.is_verified ? 5 : 0) + (r.rating || 0);
    return score(b) - score(a);
  });
  const bestReview = sortedReviews[0] ?? null;

  // ── Best active offer ─────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const activeOffers = org.offers.filter(
    (o) => !o.expires_at || o.expires_at >= today
  );
  const bestOffer = activeOffers[0] ?? null;

  // ── Sponsor slots — auto-inject up to 3 ──────────────────────────────────
  const sponsorSlots: Record<string, { url: string }> = {};
  org.sponsors.slice(0, 3).forEach((s, i) => {
    if (s.logo_url) sponsorSlots[`sponsor_${i + 1}`] = { url: s.logo_url };
  });

  // ── Accreditation slots — auto-inject up to 3 ────────────────────────────
  const accredSlots: Record<string, { url: string }> = {};
  org.accreditations.slice(0, 3).forEach((a, i) => {
    if (a.logo_url) accredSlots[`accreditation_${i + 1}`] = { url: a.logo_url };
  });

  // ── Merge imageSlots — existing slots win, org slots fill gaps ────────────
  const mergedSlots: CampaignData["imageSlots"] = {
    ...sponsorSlots,
    ...accredSlots,
    ...(draftData.imageSlots || {}),   // draft/hero slots always win
  };

  // ── Helper: use existing if non-empty, else fall back ────────────────────
  const fill = (existing: string | undefined, fallback: string | undefined): string =>
    (existing || "").trim() || (fallback || "").trim() || "";

  return {
    ...draftData,

    // ── Business info ────────────────────────────────────────────────────────
    companyName: fill(draftData.companyName, biz?.tagline),
    location:    fill(draftData.location, biz?.address),

    businessInfo: {
      ...(biz || {}),
      ...(draftData.businessInfo || {}),   // draft-level overrides win
    },

    // ── Review — from org DB, not AI ─────────────────────────────────────────
    review_text:   fill(draftData.review_text,   bestReview?.body),
    review_author: fill(draftData.review_author, bestReview?.author_name),

    // ── Offer — from org DB ──────────────────────────────────────────────────
    offer_title: fill(draftData.offer_title, bestOffer?.title),
    offer_cta:   fill(draftData.offer_cta,   bestOffer?.cta_text),

    // ── Full arrays — always from org DB (richer than draft structured data) ─
    reviews:        org.reviews.length        > 0 ? org.reviews        : (draftData.reviews        || []),
    sponsors:       org.sponsors.length       > 0 ? org.sponsors       : (draftData.sponsors       || []),
    accreditations: org.accreditations.length > 0 ? org.accreditations : (draftData.accreditations || []),
    offers:         activeOffers.length       > 0 ? activeOffers       : (draftData.offers         || []),
    metadata:       org.metadata.length       > 0 ? org.metadata       : (draftData.metadata       || []),

    // ── Image slots ──────────────────────────────────────────────────────────
    imageSlots: mergedSlots,
  };
}