/**
 * lib/org-campaign-enricher.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches ALL real org data and maps it to CampaignData so every template
 * field renders real content instead of DEFAULT_CAMPAIGN_DATA placeholders.
 *
 * Fields covered (maps 1:1 to DEFAULT_CAMPAIGN_DATA):
 *   hook, subheading, bullets, proof, cta, ctaLink
 *   logo, heroImage, imageSlots (cover/profile/gallery/sponsor/accreditation)
 *   location, companyName, hashtags
 *   reviews, sponsors, accreditations, offers, metadata, campaign_goals
 *   businessInfo (all 25+ fields: contact, location, social, legal)
 *   review_text, review_author, offer_title, offer_cta
 *   website, address, phone, email, whatsapp, city, country, fullAddress
 *   registration_no, vat_number, map_url
 *   all social URLs
 *   org logo_url (used as logo field)
 *
 * Usage:
 *   import { fetchRealCampaignData } from "@/lib/org-campaign-enricher";
 *   const data = await fetchRealCampaignData();
 *   // data is a fully-populated CampaignData — use in place of DEFAULT_CAMPAIGN_DATA
 *
 *   // OR enrich an existing draft (draft non-empty fields win):
 *   import { enrichCampaignData, fetchOrgCampaignData } from "@/lib/org-campaign-enricher";
 *   const org = await fetchOrgCampaignData();
 *   const enriched = enrichCampaignData(draftData, org);
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

// ── API response types ────────────────────────────────────────────────────────

export type OrgInfo = {
  id:       string;
  name:     string;
  slug:     string;
  logo_url?: string | null;
};

export type OrgBusinessInfo = {
  // identity
  tagline?:         string;
  description?:     string;
  business_type?:   string;
  founded_year?:    number;
  company_size?:    string;
  registration_no?: string;
  vat_number?:      string;
  // contact
  email_primary?:   string;
  email_support?:   string;
  phone_primary?:   string;
  phone_secondary?: string;
  whatsapp?:        string;
  website?:         string;
  // location
  address?:         string;
  city?:            string;
  state_province?:  string;
  postal_code?:     string;
  country?:         string;
  map_url?:         string;
  // social
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
    org:            orgRes.status        === "fulfilled" ? orgRes.value            : null,
    businessInfo:   bizRes.status        === "fulfilled" ? bizRes.value            : null,
    reviews:        reviewsRes.status    === "fulfilled" ? reviewsRes.value        : [],
    sponsors:       sponsorsRes.status   === "fulfilled" ? sponsorsRes.value.filter(s => s.is_active) : [],
    accreditations: accredRes.status     === "fulfilled" ? accredRes.value.filter(a => a.is_active)   : [],
    offers:         offersRes.status     === "fulfilled" ? offersRes.value.filter(o => o.is_active)   : [],
    goals:          goalsRes.status      === "fulfilled" ? goalsRes.value.selected.filter(g => g.is_active) : [],
    metadata:       metaRes.status       === "fulfilled" ? metaRes.value           : [],
    images:         imagesRes.status     === "fulfilled" ? imagesRes.value         : [],
  };
}

// ── Build a complete CampaignData from real org data ─────────────────────────
// Every field maps to the equivalent in DEFAULT_CAMPAIGN_DATA.
// Falls back to DEFAULT_CAMPAIGN_DATA value only when org has no data.

export function buildCampaignDataFromOrg(org: OrgCampaignData): CampaignData {
  const biz  = org.businessInfo;
  const info = org.org;

  // ── Images ────────────────────────────────────────────────────────────────
  const coverImage   = org.images.find(i => i.type === "cover");
  const profileImage = org.images.find(i => i.type === "profile");
  const galleryImages = org.images.filter(i => i.type === "gallery");

  // ── Reviews — ranked: featured+verified → verified → featured → rating ────
  const rankedReviews = [...org.reviews].sort((a, b) => {
    const score = (r: OrgReview) =>
      (r.is_featured ? 10 : 0) + (r.is_verified ? 5 : 0) + (r.rating || 0);
    return score(b) - score(a);
  });
  const bestReview = rankedReviews[0] ?? null;

  // ── Offers — active and not expired ──────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const activeOffers = org.offers.filter(o => !o.expires_at || o.expires_at >= today);
  const bestOffer    = activeOffers[0] ?? null;

  // ── Image slots ────────────────────────────────────────────────────────────
  const imageSlots: CampaignData["imageSlots"] = {};

  // Hero slots from org images
  if (coverImage?.url)   imageSlots.hero_person      = { url: coverImage.url };
  if (profileImage?.url) imageSlots.dashboard_image  = { url: profileImage.url };

  // Gallery slots
  galleryImages.slice(0, 3).forEach((img, i) => {
    imageSlots[`gallery_${i + 1}`] = { url: img.url };
  });

  // Sponsor slots
  org.sponsors.slice(0, 5).forEach((s, i) => {
    if (s.logo_url) imageSlots[`sponsor_${i + 1}`] = { url: s.logo_url };
  });

  // Accreditation slots
  org.accreditations.slice(0, 3).forEach((a, i) => {
    if (a.logo_url) imageSlots[`accreditation_${i + 1}`] = { url: a.logo_url };
  });

  // ── Location fields ────────────────────────────────────────────────────────
  const city     = biz?.city     || "";
  const country  = biz?.country  || "";
  const state    = biz?.state_province || "";
  const postal   = biz?.postal_code    || "";
  const address  = biz?.address        || "";

  const locationShort = [city, country].filter(Boolean).join(", ");
  const fullAddress   = [address, city, state, postal, country].filter(Boolean).join(", ");

  // ── Bullets from goals or fallback ────────────────────────────────────────
  const goalBullets = org.goals.slice(0, 3).map(g => g.label);
  const bullets = goalBullets.length >= 2 ? goalBullets : DEFAULT_CAMPAIGN_DATA.bullets;

  // ── Metadata flat fields ──────────────────────────────────────────────────
  const metaByKey: Record<string, string> = {};
  org.metadata.forEach(m => { metaByKey[m.key] = m.value; });

  // ── Hashtags from goals + business type ───────────────────────────────────
  const hashtagSources = [
    biz?.business_type,
    ...org.goals.slice(0, 3).map(g => g.label),
  ].filter(Boolean);
  const hashtags = hashtagSources.length
    ? hashtagSources.map(t => `#${(t as string).replace(/\s+/g, "")}`).join(" ")
    : DEFAULT_CAMPAIGN_DATA.hashtags;

  // ── Assemble ──────────────────────────────────────────────────────────────
  const name    = info?.name      || DEFAULT_CAMPAIGN_DATA.companyName;
  const tagline = biz?.tagline    || DEFAULT_CAMPAIGN_DATA.subheading;
  const desc    = biz?.description|| "";
  const logoUrl = info?.logo_url  || DEFAULT_CAMPAIGN_DATA.logo;
  const website = biz?.website    || DEFAULT_CAMPAIGN_DATA.website || "";

  return {
    // ── Core text ─────────────────────────────────────────────────────────
    hook:       biz?.tagline || DEFAULT_CAMPAIGN_DATA.hook,
    subheading: biz?.description
      ? biz.description.slice(0, 160)
      : DEFAULT_CAMPAIGN_DATA.subheading,
    bullets,
    proof: bestReview
      ? `${bestReview.author_name}${bestReview.source ? ` · ${bestReview.source}` : ""}`
      : DEFAULT_CAMPAIGN_DATA.proof,
    cta:     bestOffer?.cta_text || DEFAULT_CAMPAIGN_DATA.cta,
    ctaLink: bestOffer?.cta_url  || website || DEFAULT_CAMPAIGN_DATA.ctaLink,

    // ── Branding ──────────────────────────────────────────────────────────
    logo:      logoUrl,
    heroImage: coverImage?.url || profileImage?.url || logoUrl || DEFAULT_CAMPAIGN_DATA.heroImage,

    // ── Identity ──────────────────────────────────────────────────────────
    companyName: name,
    location:    locationShort || DEFAULT_CAMPAIGN_DATA.location,
    hashtags,

    // ── Image slots ───────────────────────────────────────────────────────
    imageSlots: Object.keys(imageSlots).length > 0 ? imageSlots : DEFAULT_CAMPAIGN_DATA.imageSlots,

    // ── Arrays ────────────────────────────────────────────────────────────
    reviews:        org.reviews,
    sponsors:       org.sponsors,
    accreditations: org.accreditations,
    offers:         activeOffers,
    metadata:       org.metadata,

    // ── Business info block ───────────────────────────────────────────────
    businessInfo: {
      business_type:   biz?.business_type   || "",
      founded_year:    biz?.founded_year,
      company_size:    biz?.company_size    || "",
      website:         biz?.website         || "",
      address:         biz?.address         || "",
      tagline:         biz?.tagline         || "",
      description:     biz?.description     || "",
      email_primary:   biz?.email_primary   || "",
      email_support:   biz?.email_support   || "",
      phone_primary:   biz?.phone_primary   || "",
      phone_secondary: biz?.phone_secondary || "",
      whatsapp:        biz?.whatsapp        || "",
      country:         biz?.country         || "",
      city:            biz?.city            || "",
      state_province:  biz?.state_province  || "",
      postal_code:     biz?.postal_code     || "",
      map_url:         biz?.map_url         || "",
      facebook_url:    biz?.facebook_url    || "",
      instagram_url:   biz?.instagram_url   || "",
      linkedin_url:    biz?.linkedin_url    || "",
      twitter_url:     biz?.twitter_url     || "",
      tiktok_url:      biz?.tiktok_url      || "",
      youtube_url:     biz?.youtube_url     || "",
      registration_no: biz?.registration_no || "",
      vat_number:      biz?.vat_number      || "",
    },

    // ── Flat review fields ────────────────────────────────────────────────
    review_text:   bestReview?.body        || DEFAULT_CAMPAIGN_DATA.review_text,
    review_author: bestReview?.author_name || DEFAULT_CAMPAIGN_DATA.review_author,

    // ── Flat offer fields ─────────────────────────────────────────────────
    offer_title: bestOffer?.title    || DEFAULT_CAMPAIGN_DATA.offer_title,
    offer_cta:   bestOffer?.cta_text || DEFAULT_CAMPAIGN_DATA.offer_cta,

    // ── Flat contact + location ───────────────────────────────────────────
    website,
    address,
    phone:     biz?.phone_primary || DEFAULT_CAMPAIGN_DATA.phone,
    email:     biz?.email_primary || DEFAULT_CAMPAIGN_DATA.email,
    whatsapp:  biz?.whatsapp      || DEFAULT_CAMPAIGN_DATA.whatsapp,
    city,
    country,
    fullAddress: fullAddress || DEFAULT_CAMPAIGN_DATA.fullAddress,
    map_url:   biz?.map_url       || DEFAULT_CAMPAIGN_DATA.map_url,

    // ── Legal ─────────────────────────────────────────────────────────────
    registration_no: biz?.registration_no || DEFAULT_CAMPAIGN_DATA.registration_no,
    vat_number:      biz?.vat_number      || DEFAULT_CAMPAIGN_DATA.vat_number,

    // ── Social ────────────────────────────────────────────────────────────
    facebook_url:  biz?.facebook_url  || DEFAULT_CAMPAIGN_DATA.facebook_url,
    instagram_url: biz?.instagram_url || DEFAULT_CAMPAIGN_DATA.instagram_url,
    linkedin_url:  biz?.linkedin_url  || DEFAULT_CAMPAIGN_DATA.linkedin_url,
    twitter_url:   biz?.twitter_url   || DEFAULT_CAMPAIGN_DATA.twitter_url,
    tiktok_url:    biz?.tiktok_url    || DEFAULT_CAMPAIGN_DATA.tiktok_url,
    youtube_url:   biz?.youtube_url   || DEFAULT_CAMPAIGN_DATA.youtube_url,

    // ── Hook / promo decomposed ───────────────────────────────────────────
    price_label: bestOffer
      ? bestOffer.title
      : DEFAULT_CAMPAIGN_DATA.price_label,
    fine_print:  DEFAULT_CAMPAIGN_DATA.fine_print,
    enroll_note: DEFAULT_CAMPAIGN_DATA.enroll_note,

    hook_tag:    biz?.business_type || DEFAULT_CAMPAIGN_DATA.hook_tag,
    hook_pre:    DEFAULT_CAMPAIGN_DATA.hook_pre,
    hook_number: DEFAULT_CAMPAIGN_DATA.hook_number,
    hook_label:  DEFAULT_CAMPAIGN_DATA.hook_label,
    hook_desc:   biz?.tagline || DEFAULT_CAMPAIGN_DATA.hook_desc,

    badge_icon: DEFAULT_CAMPAIGN_DATA.badge_icon,
    deco_icon:  DEFAULT_CAMPAIGN_DATA.deco_icon,

    // ── Bullets decomposed ────────────────────────────────────────────────
    bullet_1: bullets[0] || DEFAULT_CAMPAIGN_DATA.bullet_1,
    bullet_2: bullets[1] || DEFAULT_CAMPAIGN_DATA.bullet_2,
    bullet_3: bullets[2] || DEFAULT_CAMPAIGN_DATA.bullet_3,

    // ── CTA links ─────────────────────────────────────────────────────────
    link_1_label: "Website",
    link_1_url:   website || DEFAULT_CAMPAIGN_DATA.link_1_url,
    link_2_label: bestOffer?.cta_text || DEFAULT_CAMPAIGN_DATA.link_2_label,
    link_2_url:   bestOffer?.cta_url  || website || DEFAULT_CAMPAIGN_DATA.link_2_url,

    // ── Metadata decomposed ───────────────────────────────────────────────
    meta_1_key:   org.metadata[0]?.key   || DEFAULT_CAMPAIGN_DATA.meta_1_key,
    meta_1_value: org.metadata[0]?.value || DEFAULT_CAMPAIGN_DATA.meta_1_value,
    meta_2_key:   org.metadata[1]?.key   || DEFAULT_CAMPAIGN_DATA.meta_2_key,
    meta_2_value: org.metadata[1]?.value || DEFAULT_CAMPAIGN_DATA.meta_2_value,

    // ── Tone (preserved from caller context) ─────────────────────────────
    toneName: undefined,
  };
}

// ── Convenience: fetch + build in one call ────────────────────────────────────
// Drop-in replacement for DEFAULT_CAMPAIGN_DATA

export async function fetchRealCampaignData(): Promise<CampaignData> {
  const org = await fetchOrgCampaignData();
  return buildCampaignDataFromOrg(org);
}

// ── Enrich existing draft — draft non-empty fields ALWAYS win ─────────────────
// Use when you have a partially-filled draft and want to backfill
// org data for any blank fields.

export function enrichCampaignData(
  draftData: CampaignData,
  org: OrgCampaignData
): CampaignData {
  const base = buildCampaignDataFromOrg(org);

  // Helper: use draft value if non-empty, else use org-built value
  const win = (draft: any, built: any) =>
    draft !== undefined && draft !== null && String(draft).trim() !== ""
      ? draft
      : built;

  return {
    // Spread org-built base first
    ...base,

    // Then overlay draft fields — only where draft has actual content
    hook:        win(draftData.hook,        base.hook),
    subheading:  win(draftData.subheading,  base.subheading),
    bullets:     draftData.bullets?.length  ? draftData.bullets  : base.bullets,
    proof:       win(draftData.proof,       base.proof),
    cta:         win(draftData.cta,         base.cta),
    ctaLink:     win(draftData.ctaLink,     base.ctaLink),
    companyName: win(draftData.companyName, base.companyName),
    location:    win(draftData.location,    base.location),
    hashtags:    win(draftData.hashtags,    base.hashtags),

    // Logos — draft wins
    logo:      win(draftData.logo,      base.logo),
    heroImage: win(draftData.heroImage, base.heroImage),

    // Image slots — merge (draft slots win over org slots)
    imageSlots: { ...base.imageSlots, ...(draftData.imageSlots || {}) },

    // Arrays — prefer org (live data), fallback to draft
    reviews:        (base.reviews?.length ?? 0) > 0 ? base.reviews        : (draftData.reviews        ?? []),
    sponsors:       (base.sponsors?.length ?? 0) > 0 ? base.sponsors       : (draftData.sponsors       ?? []),
    accreditations: (base.accreditations?.length ?? 0) > 0 ? base.accreditations : (draftData.accreditations ?? []),
    offers:         (base.offers?.length ?? 0) > 0 ? base.offers         : (draftData.offers         ?? []),
    metadata:       (base.metadata?.length ?? 0) > 0 ? base.metadata       : (draftData.metadata       ?? []),

    // businessInfo — merge (draft fields win)
    businessInfo: { ...base.businessInfo, ...(draftData.businessInfo || {}) },

    // Flat fields — draft wins
    review_text:   win(draftData.review_text,   base.review_text),
    review_author: win(draftData.review_author, base.review_author),
    offer_title:   win(draftData.offer_title,   base.offer_title),
    offer_cta:     win(draftData.offer_cta,     base.offer_cta),
    website:       win(draftData.website,       base.website),
    address:       win(draftData.address,       base.address),
    phone:         win(draftData.phone,         base.phone),
    email:         win(draftData.email,         base.email),
    whatsapp:      win(draftData.whatsapp,      base.whatsapp),
    city:          win(draftData.city,          base.city),
    country:       win(draftData.country,       base.country),
    fullAddress:   win(draftData.fullAddress,   base.fullAddress),
    map_url:       win(draftData.map_url,       base.map_url),
    registration_no: win(draftData.registration_no, base.registration_no),
    vat_number:      win(draftData.vat_number,      base.vat_number),
    facebook_url:  win(draftData.facebook_url,  base.facebook_url),
    instagram_url: win(draftData.instagram_url, base.instagram_url),
    linkedin_url:  win(draftData.linkedin_url,  base.linkedin_url),
    twitter_url:   win(draftData.twitter_url,   base.twitter_url),
    tiktok_url:    win(draftData.tiktok_url,    base.tiktok_url),
    youtube_url:   win(draftData.youtube_url,   base.youtube_url),
    bullet_1:      win(draftData.bullet_1,      base.bullet_1),
    bullet_2:      win(draftData.bullet_2,      base.bullet_2),
    bullet_3:      win(draftData.bullet_3,      base.bullet_3),
    link_1_label:  win(draftData.link_1_label,  base.link_1_label),
    link_1_url:    win(draftData.link_1_url,    base.link_1_url),
    link_2_label:  win(draftData.link_2_label,  base.link_2_label),
    link_2_url:    win(draftData.link_2_url,    base.link_2_url),
    meta_1_key:    win(draftData.meta_1_key,    base.meta_1_key),
    meta_1_value:  win(draftData.meta_1_value,  base.meta_1_value),
    meta_2_key:    win(draftData.meta_2_key,    base.meta_2_key),
    meta_2_value:  win(draftData.meta_2_value,  base.meta_2_value),
    hook_tag:      win(draftData.hook_tag,      base.hook_tag),
    hook_desc:     win(draftData.hook_desc,     base.hook_desc),
    price_label:   win(draftData.price_label,   base.price_label),
    toneName:      win(draftData.toneName,      base.toneName),
  };
}