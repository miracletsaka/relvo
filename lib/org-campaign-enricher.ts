/**
 * lib/org-campaign-enricher.ts
 */

import type { CampaignData } from "@/lib/types";
import { DEFAULT_CAMPAIGN_DATA } from "@/lib/campaign-context";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Safe array helper — always returns T[], never undefined ───────────────────
function safeArr<T>(val: T[] | null | undefined): T[] {
  return Array.isArray(val) ? (val.filter(Boolean) as T[]) : [];
}

// ── API response types ────────────────────────────────────────────────────────

export type OrgInfo = {
  id:       string;
  name:     string;
  slug:     string;
  logo_url?: string | null;
};

export type OrgBusinessInfo = {
  tagline?:         string;
  description?:     string;
  business_type?:   string;
  founded_year?:    number;
  company_size?:    string;
  registration_no?: string;
  vat_number?:      string;
  email_primary?:   string;
  email_support?:   string;
  phone_primary?:   string;
  phone_secondary?: string;
  whatsapp?:        string;
  website?:         string;
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
};

export type OrgReview = {
  id:                  string;
  author_name:         string;
  rating:              number;
  body?:               string;
  source?:             string;
  is_featured:         boolean;
  is_verified:         boolean;
  created_at:          string;
  reviewer_photo_url?: string | null;
  product_image_url?:  string | null;
  card_image_url?:     string | null;
  card_status?:        string;
};

export type OrgSponsor = {
  id:        string;
  name:      string;
  logo_url?: string;
  website?:  string;
  sort_order: number;
  is_active: boolean;
};

export type OrgAccreditation = {
  id:       string;
  name:     string;
  issuer?:  string;
  year?:    number;
  logo_url?: string;
  is_active: boolean;
};

export type OrgOffer = {
  id:          string;
  title:       string;
  description?: string;
  cta_text?:   string;
  cta_url?:    string;
  expires_at?: string;
  is_active:   boolean;
};

export type OrgGoal = {
  id:       string;
  label:    string;
  is_active: boolean;
};

export type OrgMetadata = {
  id:       string;
  key:      string;
  value:    string;
  category?: string;
};

export type OrgImage = {
  id:      string;
  type:    "cover" | "profile" | "gallery";
  url:     string;
  caption?: string;
};

// ── Aggregated raw org data ───────────────────────────────────────────────────

export type OrgCampaignData = {
  org:            OrgInfo | null;
  businessInfo:   OrgBusinessInfo | null;
  reviews:        OrgReview[];
  sponsors:       OrgSponsor[];
  accreditations: OrgAccreditation[];
  offers:         OrgOffer[];
  goals:          OrgGoal[];
  metadata:       OrgMetadata[];
  images:         OrgImage[];
};

// ── Fetch everything in parallel ──────────────────────────────────────────────

export async function fetchOrgCampaignData(): Promise<OrgCampaignData> {
  const [
    orgRes,
    bizRes,
    reviewsRes,
    sponsorsRes,
    accredRes,
    offersRes,
    goalsRes,
    metaRes,
    imagesRes,
  ] = await Promise.allSettled([
    apiFetch<OrgInfo>("/organisations/me"),
    apiFetch<OrgBusinessInfo>("/org-profile/business-info"),
    apiFetch<OrgReview[]>("/org-profile/reviews"),
    apiFetch<OrgSponsor[]>("/org-profile/sponsors"),
    apiFetch<OrgAccreditation[]>("/org-profile/accreditations"),
    apiFetch<OrgOffer[]>("/org-profile/offers"),
    apiFetch<{ selected: OrgGoal[] }>("/org-profile/campaign-goals"),
    apiFetch<OrgMetadata[]>("/org-profile/metadata"),
    apiFetch<OrgImage[]>("/org-images"),
  ]);

  return {
    org:            orgRes.status      === "fulfilled" ? orgRes.value  : null,
    businessInfo:   bizRes.status      === "fulfilled" ? bizRes.value  : null,
    reviews:        reviewsRes.status  === "fulfilled" ? safeArr(reviewsRes.value)  : [],
    sponsors:       sponsorsRes.status === "fulfilled" ? safeArr(sponsorsRes.value).filter(s => s.is_active)  : [],
    accreditations: accredRes.status   === "fulfilled" ? safeArr(accredRes.value).filter(a => a.is_active)    : [],
    offers:         offersRes.status   === "fulfilled" ? safeArr(offersRes.value).filter(o => o.is_active)    : [],
    goals:          goalsRes.status    === "fulfilled" ? safeArr(goalsRes.value?.selected).filter(g => g.is_active) : [],
    metadata:       metaRes.status     === "fulfilled" ? safeArr(metaRes.value)     : [],
    images:         imagesRes.status   === "fulfilled" ? safeArr(imagesRes.value)   : [],
  };
}

// ── Build a complete CampaignData from real org data ─────────────────────────

export function buildCampaignDataFromOrg(org: OrgCampaignData): CampaignData {
  const biz  = org.businessInfo;
  const info = org.org;

  // ── Images — only items with a real url string ────────────────────────────
  const safeImages = safeArr(org.images).filter(
    (img): img is OrgImage =>
      typeof img === "object" && typeof img?.url === "string" && img.url.length > 0
  );

  const coverImage    = safeImages.find(i => i.type === "cover")   ?? null;
  const profileImage  = safeImages.find(i => i.type === "profile") ?? null;
  const galleryImages = safeImages.filter(i => i.type === "gallery");

  // ── Reviews ───────────────────────────────────────────────────────────────
  const safeReviews = safeArr(org.reviews);
  const rankedReviews = [...safeReviews].sort((a, b) => {
    const score = (r: OrgReview) =>
      (r.is_featured ? 10 : 0) + (r.is_verified ? 5 : 0) + (r.rating || 0);
    return score(b) - score(a);
  });
  const bestReview = rankedReviews[0] ?? null;

  // ── Offers ────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const safeOffers     = safeArr(org.offers);
  const activeOffers   = safeOffers.filter(o => !o.expires_at || o.expires_at >= today);
  const bestOffer      = activeOffers[0] ?? null;

  const safeSponsors       = safeArr(org.sponsors);
  const safeAccreditations = safeArr(org.accreditations);
  const safeGoals          = safeArr(org.goals);
  const safeMetadata       = safeArr(org.metadata);

  // ── Image slots ───────────────────────────────────────────────────────────
  const imageSlots: NonNullable<CampaignData["imageSlots"]> = {};

  if (coverImage?.url)   imageSlots.hero_person     = { url: coverImage.url };
  if (profileImage?.url) imageSlots.dashboard_image = { url: profileImage.url };

  galleryImages.slice(0, 3).forEach((img, i) => {
    imageSlots[`gallery_${i + 1}`] = { url: img.url };
  });

  safeSponsors.slice(0, 5).forEach((s, i) => {
    if (s?.logo_url) imageSlots[`sponsor_${i + 1}`] = { url: s.logo_url };
  });

  safeAccreditations.slice(0, 3).forEach((a, i) => {
    if (a?.logo_url) imageSlots[`accreditation_${i + 1}`] = { url: a.logo_url };
  });

  // ── Location ──────────────────────────────────────────────────────────────
  const city    = biz?.city           || "";
  const country = biz?.country        || "";
  const state   = biz?.state_province || "";
  const postal  = biz?.postal_code    || "";
  const address = biz?.address        || "";

  const locationShort = [city, country].filter(Boolean).join(", ");
  const fullAddress   = [address, city, state, postal, country].filter(Boolean).join(", ");

  // ── Bullets — guaranteed string[], never undefined ────────────────────────
  // DEFAULT_CAMPAIGN_DATA.bullets is typed as optional so guard it too.
  const defaultBullets: string[] = safeArr(DEFAULT_CAMPAIGN_DATA.bullets as string[] | undefined);
  const goalBullets: string[]    = safeArr(safeGoals.slice(0, 3).map(g => g.label));
  const bullets: string[]        = goalBullets.length >= 2 ? goalBullets : defaultBullets;

  // ── Hashtags ──────────────────────────────────────────────────────────────
  const hashtagSources = [
    biz?.business_type,
    ...safeGoals.slice(0, 3).map(g => g.label),
  ].filter(Boolean) as string[];

  const hashtags = hashtagSources.length
    ? hashtagSources.map(t => `#${t.replace(/\s+/g, "")}`).join(" ")
    : (DEFAULT_CAMPAIGN_DATA.hashtags || "");

  // ── Core identity ─────────────────────────────────────────────────────────
  const name    = info?.name     || DEFAULT_CAMPAIGN_DATA.companyName || "";
  const logoUrl = info?.logo_url || DEFAULT_CAMPAIGN_DATA.logo        || "";
  const website = biz?.website   || DEFAULT_CAMPAIGN_DATA.website     || "";

  // ── Assemble ──────────────────────────────────────────────────────────────
  return {
  // required CampaignData fields
  headline:
    biz?.tagline ||
    DEFAULT_CAMPAIGN_DATA.headline ||
    "",

  product_name: name,

  description:
    biz?.description ||
    DEFAULT_CAMPAIGN_DATA.description ||
    "",

  cta_text:
    bestOffer?.cta_text ||
    DEFAULT_CAMPAIGN_DATA.cta_text ||
    "",

  hashtags,

  companyName: name,

  location:
    locationShort ||
    DEFAULT_CAMPAIGN_DATA.location ||
    "",

  campaign_label:
    DEFAULT_CAMPAIGN_DATA.campaign_label || "",

  collection_label:
    DEFAULT_CAMPAIGN_DATA.collection_label || "",

  // optional text
  hook:
    biz?.tagline ||
    DEFAULT_CAMPAIGN_DATA.hook,

  subheading:
    biz?.description
      ? biz.description.slice(0, 160)
      : DEFAULT_CAMPAIGN_DATA.subheading,

  subheadline:
    DEFAULT_CAMPAIGN_DATA.subheadline,

  bullets,

  proof: bestReview
    ? `${bestReview.author_name}${
        bestReview.source
          ? ` · ${bestReview.source}`
          : ""
      }`
    : DEFAULT_CAMPAIGN_DATA.proof,

  cta:
    bestOffer?.cta_text ||
    DEFAULT_CAMPAIGN_DATA.cta,

  ctaLink:
    bestOffer?.cta_url ||
    website ||
    DEFAULT_CAMPAIGN_DATA.ctaLink,

  // branding
  logo: logoUrl,

  heroImage:
    coverImage?.url ||
    profileImage?.url ||
    logoUrl ||
    DEFAULT_CAMPAIGN_DATA.heroImage,

  social_handle: biz?.instagram_url
    ? biz.instagram_url
        .replace("https://instagram.com/", "@")
        .replace("https://www.instagram.com/", "@")
        .replace(/\/$/, "")
    : "",

  // image slots
  imageSlots:
    Object.keys(imageSlots).length > 0
      ? imageSlots
      : (DEFAULT_CAMPAIGN_DATA.imageSlots ?? {}),

  // arrays
  reviews: safeReviews,

  sponsors: safeSponsors,

  accreditations: safeAccreditations,

  offers: activeOffers,

  metadata: safeMetadata,

  // businessInfo
  businessInfo: {
    business_type:
      biz?.business_type || "",

    founded_year:
      biz?.founded_year,

    company_size:
      biz?.company_size || "",

    website:
      biz?.website || "",

    address:
      biz?.address || "",

    tagline:
      biz?.tagline || "",

    description:
      biz?.description || "",

    email_primary:
      biz?.email_primary || "",

    email_support:
      biz?.email_support || "",

    phone_primary:
      biz?.phone_primary || "",

    phone_secondary:
      biz?.phone_secondary || "",

    whatsapp:
      biz?.whatsapp || "",

    country:
      biz?.country || "",

    city:
      biz?.city || "",

    state_province:
      biz?.state_province || "",

    postal_code:
      biz?.postal_code || "",

    map_url:
      biz?.map_url || "",

    facebook_url:
      biz?.facebook_url || "",

    instagram_url:
      biz?.instagram_url || "",

    linkedin_url:
      biz?.linkedin_url || "",

    twitter_url:
      biz?.twitter_url || "",

    tiktok_url:
      biz?.tiktok_url || "",

    youtube_url:
      biz?.youtube_url || "",

    registration_no:
      biz?.registration_no || "",

    vat_number:
      biz?.vat_number || "",
  },

  // flat review / offer
  review_text:
    bestReview?.body ||
    DEFAULT_CAMPAIGN_DATA.review_text,

  review_author:
    bestReview?.author_name ||
    DEFAULT_CAMPAIGN_DATA.review_author,

  offer_title:
    bestOffer?.title ||
    DEFAULT_CAMPAIGN_DATA.offer_title,

  offer_cta:
    bestOffer?.cta_text ||
    DEFAULT_CAMPAIGN_DATA.offer_cta,

  offer_value:
    DEFAULT_CAMPAIGN_DATA.offer_value,

  offer_label:
    DEFAULT_CAMPAIGN_DATA.offer_label,

  // flat contact / location
  website,

  address,

  phone:
    biz?.phone_primary ||
    DEFAULT_CAMPAIGN_DATA.phone,

  email:
    biz?.email_primary ||
    DEFAULT_CAMPAIGN_DATA.email,

  whatsapp:
    biz?.whatsapp ||
    DEFAULT_CAMPAIGN_DATA.whatsapp,

  city,

  country,

  fullAddress:
    fullAddress ||
    DEFAULT_CAMPAIGN_DATA.fullAddress,

  map_url:
    biz?.map_url ||
    DEFAULT_CAMPAIGN_DATA.map_url,

  // legal
  registration_no:
    biz?.registration_no ||
    DEFAULT_CAMPAIGN_DATA.registration_no,

  vat_number:
    biz?.vat_number ||
    DEFAULT_CAMPAIGN_DATA.vat_number,

  // social
  facebook_url:
    biz?.facebook_url || "",

  instagram_url:
    biz?.instagram_url || "",

  linkedin_url:
    biz?.linkedin_url || "",

  twitter_url:
    biz?.twitter_url || "",

  tiktok_url:
    biz?.tiktok_url || "",

  youtube_url:
    biz?.youtube_url || "",

  // promo
  price_label:
    bestOffer?.title ||
    DEFAULT_CAMPAIGN_DATA.price_label,

  fine_print:
    DEFAULT_CAMPAIGN_DATA.fine_print,

  enroll_note:
    DEFAULT_CAMPAIGN_DATA.enroll_note,

  // hook decomposed
  hook_tag:
    biz?.business_type ||
    DEFAULT_CAMPAIGN_DATA.hook_tag,

  hook_pre:
    DEFAULT_CAMPAIGN_DATA.hook_pre,

  hook_number:
    DEFAULT_CAMPAIGN_DATA.hook_number,

  hook_label:
    DEFAULT_CAMPAIGN_DATA.hook_label,

  hook_desc:
    biz?.tagline ||
    DEFAULT_CAMPAIGN_DATA.hook_desc,

  badge_icon:
    DEFAULT_CAMPAIGN_DATA.badge_icon,

  deco_icon:
    DEFAULT_CAMPAIGN_DATA.deco_icon,

  // bullets decomposed
  bullet_1:
    bullets[0] ||
    DEFAULT_CAMPAIGN_DATA.bullet_1 ||
    "",

  bullet_2:
    bullets[1] ||
    DEFAULT_CAMPAIGN_DATA.bullet_2 ||
    "",

  bullet_3:
    bullets[2] ||
    DEFAULT_CAMPAIGN_DATA.bullet_3 ||
    "",

  // features
  feature_1:
    bullets[0] ||
    DEFAULT_CAMPAIGN_DATA.feature_1,

  feature_2:
    bullets[1] ||
    DEFAULT_CAMPAIGN_DATA.feature_2,

  feature_3:
    bullets[2] ||
    DEFAULT_CAMPAIGN_DATA.feature_3,

  // links
  link_1_label: "Website",

  link_1_url:
    website ||
    DEFAULT_CAMPAIGN_DATA.link_1_url,

  link_2_label:
    bestOffer?.cta_text ||
    DEFAULT_CAMPAIGN_DATA.link_2_label,

  link_2_url:
    bestOffer?.cta_url ||
    website ||
    DEFAULT_CAMPAIGN_DATA.link_2_url,

  // metadata decomposed
  meta_1_key:
    safeMetadata[0]?.key ||
    DEFAULT_CAMPAIGN_DATA.meta_1_key,

  meta_1_value:
    safeMetadata[0]?.value ||
    DEFAULT_CAMPAIGN_DATA.meta_1_value,

  meta_2_key:
    safeMetadata[1]?.key ||
    DEFAULT_CAMPAIGN_DATA.meta_2_key,

  meta_2_value:
    safeMetadata[1]?.value ||
    DEFAULT_CAMPAIGN_DATA.meta_2_value,

  // footer / identity
  footer_label: name,
  
  toneName: undefined,
};
}

// ── Convenience: fetch + build in one call ────────────────────────────────────

export async function fetchRealCampaignData(): Promise<CampaignData> {
  const org = await fetchOrgCampaignData();
  return buildCampaignDataFromOrg(org);
}

// ── Enrich existing draft — draft non-empty fields ALWAYS win ─────────────────

export function enrichCampaignData(
  draftData: CampaignData,
  org: OrgCampaignData,
): CampaignData {
  const base = buildCampaignDataFromOrg(org);

  const win = (draft: any, built: any) =>
    draft !== undefined && draft !== null && String(draft).trim() !== ""
      ? draft
      : built;

  const imageSlots = {
    ...(base.imageSlots ?? {}),
    ...(draftData.imageSlots ?? {}),
  };

  const bullets =
    Array.isArray(draftData.bullets) && draftData.bullets.length > 0
      ? draftData.bullets
      : Array.isArray(base.bullets)
        ? base.bullets
        : [];

  return {
    headline: win(draftData.headline, base.headline),
    hook: win(draftData.hook, base.hook),

    subheading: win(draftData.subheading, base.subheading),
    subheadline: win(draftData.subheadline, base.subheadline),
    description: win(
      draftData.description,
      draftData.subheadline || draftData.subheading || base.description,
    ),

    product_name: win(draftData.product_name, base.product_name),

    campaign_label: win(draftData.campaign_label, base.campaign_label),
    collection_label: win(draftData.collection_label, base.collection_label),
    footer_label: win(draftData.footer_label, base.footer_label),

    cta_text: win(draftData.cta_text, base.cta_text),
    cta: win(draftData.cta, base.cta),
    ctaLink: win(draftData.ctaLink, base.ctaLink),

    proof: win(draftData.proof, base.proof),
    hashtags: win(draftData.hashtags, base.hashtags),

    companyName: win(draftData.companyName, base.companyName),
    location: win(draftData.location, base.location),

    logo: win(draftData.logo, base.logo),

    heroImage:
      win(draftData.heroImage, "") ||
      imageSlots?.hero_person?.url ||
      imageSlots?.dashboard_image?.url ||
      base.heroImage ||
      base.logo ||
      "",

    imageSlots,

    bullets,

    bullet_1: win(draftData.bullet_1, bullets[0] || base.bullet_1),
    bullet_2: win(draftData.bullet_2, bullets[1] || base.bullet_2),
    bullet_3: win(draftData.bullet_3, bullets[2] || base.bullet_3),

    feature_1: win(draftData.feature_1, bullets[0] || base.feature_1),
    feature_2: win(draftData.feature_2, bullets[1] || base.feature_2),
    feature_3: win(draftData.feature_3, bullets[2] || base.feature_3),

    review_text: win(draftData.review_text, base.review_text),
    review_author: win(draftData.review_author, base.review_author),

    offer_value: win(draftData.offer_value, base.offer_value),
    offer_label: win(draftData.offer_label, base.offer_label),
    offer_title: win(draftData.offer_title, base.offer_title),
    offer_cta: win(draftData.offer_cta, base.offer_cta),
    price_label: win(draftData.price_label, base.price_label),

    website: win(draftData.website, base.website),
    phone: win(draftData.phone, base.phone),
    email: win(draftData.email, base.email),
    whatsapp: win(draftData.whatsapp, base.whatsapp),
    address: win(draftData.address, base.address),
    city: win(draftData.city, base.city),
    country: win(draftData.country, base.country),
    fullAddress: win(draftData.fullAddress, base.fullAddress),

    reviews:
      safeArr(draftData.reviews as any).length > 0
        ? safeArr(draftData.reviews as any)
        : safeArr(base.reviews as any),

    sponsors:
      safeArr(draftData.sponsors as any).length > 0
        ? safeArr(draftData.sponsors as any)
        : safeArr(base.sponsors as any),

    accreditations:
      safeArr(draftData.accreditations as any).length > 0
        ? safeArr(draftData.accreditations as any)
        : safeArr(base.accreditations as any),

    offers:
      safeArr(draftData.offers as any).length > 0
        ? safeArr(draftData.offers as any)
        : safeArr(base.offers as any),

    metadata:
      safeArr(draftData.metadata as any).length > 0
        ? safeArr(draftData.metadata as any)
        : safeArr(base.metadata as any),

    businessInfo: {
      ...(base.businessInfo ?? {}),
      ...(draftData.businessInfo ?? {}),
    },

    hook_tag: win(draftData.hook_tag, base.hook_tag),
    hook_desc: win(draftData.hook_desc, base.hook_desc),

    toneName: win(draftData.toneName, base.toneName),
  } as CampaignData;
}