import BizProfilePage from "@/components/BizProfileClient";
import type { Metadata } from "next";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "https://api.neuroflowai.co.uk").replace(/\/$/, "");
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://neuroflowai.co.uk";

async function getBizProfile(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/public/biz/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getContentDraft(id?: string | null) {
  if (!id) return null;
  try {
    const res = await fetch(`${API_BASE}/content/draft/${id}`, {
      cache: "no-store",
      credentials: "omit",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function resolveDraftImage(draft: any): string | null {
  const candidates = [
    draft?.thumbnail_url,
    draft?.media_url,
    Array.isArray(draft?.media_urls) ? draft.media_urls[0] : null,
  ];

  for (const url of candidates) {
    if (url && typeof url === "string" && url.startsWith("http")) {
      return url;
    }
  }
  return null;
}

function resolveBizImage(profile: any): string | null {
  const candidates = [
    profile?.cover_image?.url,
    profile?.profile_image?.url,
    Array.isArray(profile?.gallery) ? profile.gallery[0]?.url : null,
  ];

  for (const url of candidates) {
    if (url && typeof url === "string" && url.startsWith("http")) {
      return url;
    }
  }
  return null;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ draftId?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { draftId } = await searchParams;

  const [profile, draft] = await Promise.all([
    getBizProfile(slug),
    getContentDraft(draftId),
  ]);

  if (!profile) {
    return {
      title: "Business Profile",
      description: "Public business profile",
    };
  }

  const biz = profile.business_info;
  const businessName = profile.org?.name || "Business Profile";

  const title =
    draft?.title ||
    draft?.hook ||
    businessName;

  const description =
    draft?.body_text?.slice(0, 180) ||
    draft?.subheading?.slice(0, 180) ||
    biz?.tagline ||
    biz?.description?.slice(0, 180) ||
    `View ${businessName}`;

  const image = resolveDraftImage(draft) || resolveBizImage(profile);

  const url = draftId
    ? `${SITE_URL}/biz/${slug}?draftId=${draftId}`
    : `${SITE_URL}/biz/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: businessName,
      title,
      description,
      url,
      images: image
        ? [
            {
              url: image,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : [],
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function page() {
  return <BizProfilePage />;
}