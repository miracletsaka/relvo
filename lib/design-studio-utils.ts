import type { CampaignData, TemplateShape } from "@/lib/types";

export const PORTRAIT_W = 1080;
export const PORTRAIT_H = 1350;

const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || "";

function safeArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x || "").trim()).filter(Boolean);

  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x || "").trim()).filter(Boolean);
      }
    } catch {}
    if (v.includes(",")) return v.split(",").map((x) => x.trim()).filter(Boolean);
    if (v.includes("\n")) return v.split("\n").map((x) => x.trim()).filter(Boolean);
    return [v.trim()].filter(Boolean);
  }
  return [];
}

function safeHashtags(v: any): string {
  if (!v) return "";
  if (Array.isArray(v)) return v.map((x) => String(x || "").trim()).filter(Boolean).join(" ");
  return String(v || "").trim();
}

const safeSponsors = (v: any) =>
  Array.isArray(v)
    ? v
        .map((x) => ({
          name: (x?.name ?? "").toString(),
          logo_url: (x?.logo_url ?? "").toString(),
          website: (x?.website ?? "").toString(),
        }))
        .filter((x) => x.name || x.logo_url || x.website)
    : [];

const safeReviews = (v: any) =>
  Array.isArray(v)
    ? v
        .map((x) => ({
          author_name: (x?.author_name ?? "").toString(),
          rating: Number(x?.rating ?? 0),
          body: (x?.body ?? "").toString(),
          source: (x?.source ?? "").toString(),
          is_featured: Boolean(x?.is_featured),
          is_verified: Boolean(x?.is_verified),
          created_at: (x?.created_at ?? "").toString(),
        }))
        .filter((x) => x.author_name || x.body)
    : [];

const safeOffers = (v: any) =>
  Array.isArray(v)
    ? v
        .map((x) => ({
          title: (x?.title ?? "").toString(),
          description: (x?.description ?? "").toString(),
          cta_text: (x?.cta_text ?? "").toString(),
          cta_url: (x?.cta_url ?? "").toString(),
          expires_at: (x?.expires_at ?? "").toString(),
        }))
        .filter((x) => x.title || x.description)
    : [];

const safeAccreditations = (v: any) =>
  Array.isArray(v)
    ? v
        .map((x) => ({
          name: (x?.name ?? "").toString(),
          issuer: (x?.issuer ?? "").toString(),
          year: x?.year ? Number(x.year) : undefined,
          logo_url: (x?.logo_url ?? "").toString(),
        }))
        .filter((x) => x.name || x.issuer || x.logo_url)
    : [];

const safeMetadata = (v: any) =>
  Array.isArray(v)
    ? v
        .map((x) => ({
          key: (x?.key ?? "").toString(),
          value: (x?.value ?? "").toString(),
          category: (x?.category ?? "").toString(),
        }))
        .filter((x) => x.key || x.value)
    : [];


function isLikelyLogoImage(url: string, logo: string) {
  if (!url) return false;
  if (logo && url === logo) return true;

  const lowered = url.toLowerCase();

  return (
    lowered.includes("logo") ||
    lowered.endsWith(".svg") ||
    lowered.includes("favicon")
  );
}

async function fetchUnsplashImage(
  query: string,
  orientation: "portrait" | "landscape" | "squarish" = "portrait",
): Promise<string | null> {
  if (!UNSPLASH_ACCESS_KEY || !query.trim()) return null;

  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
        query,
      )}&orientation=${orientation}&content_filter=high`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      },
    );

    if (!res.ok) return null;

    const data = await res.json();

    return data?.urls?.regular ?? data?.urls?.full ?? null;
  } catch {
    return null;
  }
}

function buildUnsplashQueriesFromDraft(draft: any, s: any, campaignBase: any) {
  const values = [
    s?.image_prompt,
    s?.product_name,
    s?.service_name,
    s?.headline,
    s?.subheadline,
    s?.description,
    s?.business_type,
    campaignBase?.companyName && s?.product_name
      ? `${campaignBase.companyName} ${s.product_name}`
      : "",
    campaignBase?.companyName && s?.headline
      ? `${campaignBase.companyName} ${s.headline}`
      : "",
    draft?.body_text,
    "business automation technology",
    "professional customer service chatbot",
    "modern ai customer support",
  ];

  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  ).slice(0, 10);
}

async function resolveHeroImageFromDraft(
  draft: any,
  s: any,
  campaignBase: {
    logo: string;
    heroImage: string;
    imageSlots: Record<string, any>;
    companyName: string;
  },
) {
  const existing =
    campaignBase.imageSlots?.hero_person?.url ||
    campaignBase.imageSlots?.heroImage?.url ||
    campaignBase.heroImage ||
    s?.hero_image ||
    s?.image_url ||
    "";

  if (existing && !isLikelyLogoImage(existing, campaignBase.logo)) {
    return existing;
  }

  const queries = buildUnsplashQueriesFromDraft(draft, s, campaignBase);

  for (const query of queries) {
    const url = await fetchUnsplashImage(query, "portrait");
    if (url) return url;
  }

  return existing || "";
}


export async function buildCampaignDataFromDraft(draft: any): Promise<CampaignData> {
  const s = draft?.structured || {};

  const bullets = safeArray(s.bullets).length
    ? safeArray(s.bullets).map(String).slice(0, 3)
    : [s.feature_1, s.feature_2, s.feature_3]
        .map((v) => (v ?? "").toString())
        .filter(Boolean)
        .slice(0, 3);

  const links = Array.isArray(s.links)
    ? s.links
        .map((l: any) => ({
          label: (l?.label ?? "").toString(),
          url: (l?.url ?? "").toString(),
        }))
        .filter((l: any) => l.label || l.url)
    : [];

  const logo = (s.logo ?? s.logo_url ?? "").toString();

  const imageSlots: Record<string, any> = {
    ...(s.imageSlots || {}),
  };

  const companyName = (
    s.companyName ??
    s.company_name ??
    s.business_name ??
    "NeuroFlow AI"
  ).toString();

  const baseHeroImage = (
    s.heroImage ??
    s.hero_image ??
    s.image_url ??
    s.imageSlots?.hero_person?.url ??
    ""
  ).toString();

  const resolvedHeroImage = await resolveHeroImageFromDraft(draft, s, {
    logo,
    heroImage: baseHeroImage,
    imageSlots,
    companyName,
  });

  if (resolvedHeroImage) {
    imageSlots.hero_person = { url: resolvedHeroImage };
    imageSlots.heroImage = { url: resolvedHeroImage };
  }

  const productName = (
    s.product_name ??
    s.service_name ??
    s.offer_name ??
    s.product_label ??
    ""
  ).toString();

  const headline = (
    s.headline ??
    s.hook ??
    ""
  ).toString();

  const subheadline = (
    s.subheadline ??
    s.subheading ??
    s.short_description ??
    ""
  ).toString();

  const description = (
    s.short_description ??
    s.subheadline ??
    s.subheading ??
    s.description ??
    ""
  ).toString();

  const ctaText = (
    s.cta_text ??
    s.cta ??
    s.offer_cta ??
    ""
  ).toString();

  const feature1 = (
    s.feature_1 ??
    s.bullet_1 ??
    bullets?.[0] ??
    ""
  ).toString();

  const feature2 = (
    s.feature_2 ??
    s.bullet_2 ??
    bullets?.[1] ??
    ""
  ).toString();

  const feature3 = (
    s.feature_3 ??
    s.bullet_3 ??
    bullets?.[2] ??
    ""
  ).toString();

  return {
    campaign_label: (s.campaign_label ?? "").toString(),
    campaign_description: (s.campaign_description ?? s.description ?? "").toString(),

    collection_label: (s.collection_label ?? "").toString(),
    collection_description: (s.collection_description ?? s.subheadline ?? "").toString(),

    product_label: (s.product_label ?? productName).toString(),
    product_description: (s.product_description ?? description).toString(),

    hook: (s.hook ?? headline).toString(),
    subheading: (s.subheading ?? subheadline ?? description).toString(),
    bullets,

    proof: (s.proof ?? "").toString(),
    cta: (s.cta ?? ctaText).toString(),

    toneName: (s.tone_name ?? s.tone_label ?? "").toString(),

    logo: logo,
    heroImage: resolvedHeroImage || baseHeroImage || "",
    imageSlots: imageSlots,

    ctaLink: (s.ctaLink ?? s.cta_url ?? "").toString(),
    hashtags: safeHashtags(draft?.hashtags ?? s.hashtags ?? ""),

    companyName: companyName,
    location: (s.location ?? s.city ?? "MARKETING").toString(),

    links,

    sponsors: safeSponsors(s.sponsors),
    reviews: safeReviews(s.reviews),
    offers: safeOffers(s.offers),
    accreditations: safeAccreditations(s.accreditations),
    metadata: safeMetadata(s.metadata),

    businessInfo: {
      business_type: (s.business_type ?? "").toString(),
      founded_year: s.business_founded ?? s.founded_year,
      company_size: (s.business_size ?? s.company_size ?? "").toString(),
      website: (s.website ?? s.business_website ?? "").toString(),
      address: (s.address ?? s.business_address ?? "").toString(),
      tagline: (s.business_tagline ?? "").toString(),
      description: (s.business_description ?? "").toString(),

      email_primary: (s.email_primary ?? s.email ?? "").toString(),
      email_support: (s.email_support ?? "").toString(),
      phone_primary: (s.phone_primary ?? s.phone ?? "").toString(),
      phone_secondary: (s.phone_secondary ?? "").toString(),
      whatsapp: (s.whatsapp ?? "").toString(),

      country: (s.country ?? "").toString(),
      city: (s.city ?? "").toString(),
      state_province: (s.state_province ?? "").toString(),
      postal_code: (s.postal_code ?? "").toString(),
      map_url: (s.map_url ?? "").toString(),

      facebook_url: (s.facebook_url ?? "").toString(),
      instagram_url: (s.instagram_url ?? "").toString(),
      linkedin_url: (s.linkedin_url ?? "").toString(),
      twitter_url: (s.twitter_url ?? "").toString(),
      tiktok_url: (s.tiktok_url ?? "").toString(),
      youtube_url: (s.youtube_url ?? "").toString(),

      registration_no: (s.registration_no ?? "").toString(),
      vat_number: (s.vat_number ?? "").toString(),
    },
    review_text: (s.review_text ?? s.reviews?.[0]?.body ?? "").toString(),
    review_author: (s.review_author ?? s.reviews?.[0]?.author_name ?? "").toString(),
    offer_title: (s.offer_title ?? s.offers?.[0]?.title ?? "").toString(),
    offer_cta: (s.offer_cta ?? s.offers?.[0]?.cta_text ?? "").toString(),

    website: (s.website ?? s.business_website ?? "").toString(),
    address: (s.address ?? s.business_address ?? "").toString(),
    phone: (s.phone ?? s.phone_primary ?? "").toString(),
    email: (s.email ?? s.email_primary ?? "").toString(),
    whatsapp: (s.whatsapp ?? "").toString(),

    city: (s.city ?? "").toString(),
    country: (s.country ?? "").toString(),
    fullAddress: (s.fullAddress ?? "").toString(),

    registration_no: (s.registration_no ?? "").toString(),
    vat_number: (s.vat_number ?? "").toString(),

    facebook_url: (s.facebook_url ?? "").toString(),
    instagram_url: (s.instagram_url ?? "").toString(),
    linkedin_url: (s.linkedin_url ?? "").toString(),
    twitter_url: (s.twitter_url ?? "").toString(),
    tiktok_url: (s.tiktok_url ?? "").toString(),
    youtube_url: (s.youtube_url ?? "").toString(),
    map_url: (s.map_url ?? "").toString(),

    price_label: (s.price_label ?? "").toString(),
    fine_print: (s.fine_print ?? "").toString(),
    enroll_note: (s.enroll_note ?? "").toString(),

    hook_tag: (s.hook_tag ?? s.campaign_label ?? "").toString(),
    hook_pre: (s.hook_pre ?? "").toString(),
    hook_number: (s.hook_number ?? "").toString(),
    hook_label: (s.hook_label ?? "").toString(),
    hook_desc: (s.hook_desc ?? s.description ?? "").toString(),

    badge_icon: (s.badge_icon ?? "").toString(),
    deco_icon: (s.deco_icon ?? "").toString(),

    bullet_1: feature1,
    bullet_2: feature2,
    bullet_3: feature3,

    link_1_label: (s.link_1_label ?? links?.[0]?.label ?? "").toString(),
    link_1_url: (s.link_1_url ?? links?.[0]?.url ?? "").toString(),
    link_2_label: (s.link_2_label ?? links?.[1]?.label ?? "").toString(),
    link_2_url: (s.link_2_url ?? links?.[1]?.url ?? "").toString(),
    link_3_label: (s.link_3_label ?? links?.[2]?.label ?? "").toString(),
    link_3_url: (s.link_3_url ?? links?.[2]?.url ?? "").toString(),

    meta_1_key: (s.meta_1_key ?? s.metadata?.[0]?.key ?? "").toString(),
    meta_1_value: (s.meta_1_value ?? s.metadata?.[0]?.value ?? "").toString(),
    meta_2_key: (s.meta_2_key ?? s.metadata?.[1]?.key ?? "").toString(),
    meta_2_value: (s.meta_2_value ?? s.metadata?.[1]?.value ?? "").toString(),
    meta_3_key: (s.meta_3_key ?? s.metadata?.[2]?.key ?? "").toString(),
    meta_3_value: (s.meta_3_value ?? s.metadata?.[2]?.value ?? "").toString(),

    headline: headline,
    subheadline: subheadline,
    product_name: (s.product_name ?? s.companyName ?? "").toString(),
    description: description,

    footer_label: (s.footer_label ?? s.companyName ?? "").toString(),
    offer_value: (s.offer_value ?? "").toString(),
    offer_label: (s.offer_label ?? "").toString(),
    cta_text: ctaText,

    feature_1: feature1,
    feature_2: feature2,
    feature_3: feature3,

    // sponsor_logo_1: (s.sponsor_logo_1 ?? s.sponsors?.[0]?.logo_url ?? "").toString(),
    // sponsor_logo_2: (s.sponsor_logo_2 ?? s.sponsors?.[1]?.logo_url ?? "").toString(),
    // sponsor_logo_3: (s.sponsor_logo_3 ?? s.sponsors?.[2]?.logo_url ?? "").toString(),
  };
}

export function scaleTemplateShapes(
  shapes: TemplateShape[],
  fromW: number,
  fromH: number,
  toW: number,
  toH: number
): TemplateShape[] {
  const sx = toW / fromW;
  const sy = toH / fromH;
  const sFont = Math.min(sx, sy);

  return (shapes || []).map((sh) => {
    const anySh: any = sh;
    return {
      ...sh,
      x: (sh.x || 0) * sx,
      y: (sh.y || 0) * sy,
      width: (sh.width || 0) * sx,
      height: (sh.height || 0) * sy,

      fontSize: sh.fontSize ? Math.round(sh.fontSize * sFont) : sh.fontSize,
      padding: sh.padding ? Math.round(sh.padding * sFont) : sh.padding,

      borderWidth: sh.borderWidth ? Math.max(1, Math.round(sh.borderWidth * sFont)) : sh.borderWidth,
      borderRadius: sh.borderRadius ? Math.round(sh.borderRadius * sFont) : sh.borderRadius,

      shadowBlur: sh.shadowBlur ? Math.round(sh.shadowBlur * sFont) : sh.shadowBlur,
      shadowX: sh.shadowX ? Math.round(sh.shadowX * sx) : sh.shadowX,
      shadowY: sh.shadowY ? Math.round(sh.shadowY * sy) : sh.shadowY,

      radius: anySh.radius ? Math.round(anySh.radius * sFont) : anySh.radius,
      bulletSpacing: anySh.bulletSpacing ? Math.round(anySh.bulletSpacing * sFont) : anySh.bulletSpacing,
      bulletIndent: anySh.bulletIndent ? Math.round(anySh.bulletIndent * sFont) : anySh.bulletIndent,
    } as TemplateShape;
  });
}

export function pickRandom<T>(arr: T[]): T | null {
  if (!arr?.length) return null;
  const i = Math.floor(Math.random() * arr.length);
  return arr[i] ?? null;
}

export async function waitForNextPaint(times = 2) {
  let remaining = times;
  while (remaining > 0) {
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    remaining -= 1;
  }
}

export async function canvasToFile(canvas: HTMLCanvasElement, filename: string) {
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error("Failed to export canvas as PNG blob"));
        resolve(b);
      },
      "image/png",
      1.0
    );
  });

  return new File([blob], filename, { type: "image/png" });
}