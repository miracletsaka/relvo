import type { Metadata } from "next";

/**
 * app/review/[id]/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated OG page for a single review.
 *
 * Purpose:
 *   When a review card image is shared on WhatsApp / Facebook / Twitter /
 *   LinkedIn, the platform's crawler hits this URL and reads the <meta> tags.
 *   The OG image is the generated review card (card_image_url).
 *   The title and description describe the review.
 *
 *   Human visitors are immediately redirected to the business public profile
 *   page at /biz/[slug] via a client-side script (same pattern as content/[id]).
 *
 * Share URL format:
 *   https://app.neuroflowai.co.uk/review/{review_id}
 *
 * Backend endpoint needed:
 *   GET /public/review/{id}/og
 *   Returns: { id, author_name, rating, body, card_image_url, org_name, org_slug }
 */

const API_BASE    = process.env.NEXT_PUBLIC_API_BASE    || "https://api.neuroflowai.co.uk";
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL     || "https://app.neuroflowai.co.uk";
const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || "https://neuroflowai.co.uk";

// ── Fetch review data (server-side, no auth needed — public endpoint) ─────────

async function getReviewOgData(id: string): Promise<{
  author_name:    string;
  rating:         number;
  body?:          string;
  card_image_url?: string;
  org_name:       string;
  org_slug:       string;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/public/review/${id}/og`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Star string helper ────────────────────────────────────────────────────────

function starsText(rating: number): string {
  const full  = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}

// ── generateMetadata — read by Next.js for <head> ─────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id }   = await params;
  const review   = await getReviewOgData(id);

  if (!review) {
    return {
      title: "Verified Review · NeuroFlow AI",
      description: "A verified customer review powered by NeuroFlow AI.",
    };
  }

  const title = `${review.author_name} reviewed ${review.org_name} ${starsText(review.rating)}`;
  const description = review.body
    ? `"${review.body.slice(0, 200)}"${review.body.length > 200 ? "…" : ""}`
    : `${starsText(review.rating)} — Verified review for ${review.org_name}`;
  const pageUrl = `${APP_URL}/review/${id}`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type:        "article",
      siteName:    "NeuroFlow AI",
      title,
      description,
      url:         pageUrl,
      images: review.card_image_url
        ? [
            {
              url:    review.card_image_url,
              width:  900,
              height: 1200,
              alt:    title,
            },
          ]
        : [],
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
      images: review.card_image_url ? [review.card_image_url] : [],
    },
  };
}

// ── Page component — humans get redirected, bots read the meta ────────────────

export default async function ReviewOgPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }  = await params;
  const review  = await getReviewOgData(id);

  // Redirect human visitors to the business profile.
  // Bots (WhatsApp, Facebook, Twitter, etc.) ignore the script and read meta.
  const bizProfileUrl = review?.org_slug
    ? `${APP_URL}/business/${review.org_slug}`
    : LANDING_URL;

  const redirectScript = [
    "(function() {",
    "  var ua = navigator.userAgent || '';",
    "  var botPattern = /facebookexternalhit|LinkedInBot|Twitterbot|Slackbot|WhatsApp|TelegramBot|Discordbot|Googlebot|bingbot|Baiduspider|YandexBot|DuckDuckBot|Applebot/i;",
    "  if (!botPattern.test(ua)) {",
    `    window.location.replace('${bizProfileUrl}');`,
    "  }",
    "})();",
  ].join("\n");

  const title       = review
    ? `${review.author_name} reviewed ${review.org_name} ${starsText(review.rating)}`
    : "Verified Review · NeuroFlow AI";
  const description = review?.body
    ? `"${review.body.slice(0, 200)}"`
    : `Verified review powered by NeuroFlow AI`;
  const pageUrl     = `${APP_URL}/review/${id}`;

  return (
    <html lang="en-GB">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* ── Open Graph ── */}
        <meta property="og:type"        content="article" />
        <meta property="og:site_name"   content="NeuroFlow AI" />
        <meta property="og:title"       content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url"         content={pageUrl} />

        {review?.card_image_url && (
          <>
            <meta property="og:image"            content={review.card_image_url} />
            <meta property="og:image:secure_url" content={review.card_image_url} />
            <meta property="og:image:width"      content="900" />
            <meta property="og:image:height"     content="1200" />
            <meta property="og:image:type"       content="image/png" />
            <meta property="og:image:alt"        content={title} />
          </>
        )}

        {/* ── Twitter / X card ── */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={title} />
        <meta name="twitter:description" content={description} />
        {review?.card_image_url && (
          <meta name="twitter:image" content={review.card_image_url} />
        )}

        {/* WhatsApp reads og:image — no extra tag needed */}

        {/* ── Redirect humans to the biz profile ── */}
        <script dangerouslySetInnerHTML={{ __html: redirectScript }} />
      </head>

      {/*
        Body is only ever seen by:
          - Bots that render HTML (very rare)
          - Users with JS disabled
        In practice, JS users are redirected before this paints.
      */}
      <body
        style={{
          fontFamily:  "system-ui, sans-serif",
          maxWidth:    "540px",
          margin:      "0 auto",
          padding:     "32px 20px",
          background:  "#fafaf8",
          color:       "#1c1917",
        }}
      >
        {/* Review card image */}
        {review?.card_image_url && (
          <div style={{ marginBottom: "24px" }}>
            <img
              src={review.card_image_url}
              alt={title}
              style={{ width: "100%", borderRadius: "16px", display: "block", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
            />
          </div>
        )}

        {/* Review content */}
        <header style={{ marginBottom: "20px" }}>
          <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(28,25,23,0.4)", marginBottom: "6px", fontFamily: "monospace" }}>
            Verified Review · {review?.org_name || "NeuroFlow AI"}
          </p>
          <h1 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 8px", lineHeight: 1.3 }}>
            {review?.author_name || "A customer"} says:
          </h1>
          <div style={{ fontSize: "22px", letterSpacing: "2px", color: "#f59e0b", marginBottom: "12px" }}>
            {review ? starsText(review.rating) : "★★★★★"}
          </div>
          {review?.body && (
            <p style={{ fontSize: "15px", color: "rgba(28,25,23,0.65)", lineHeight: "1.75", fontStyle: "italic", margin: 0 }}>
              "{review.body}"
            </p>
          )}
        </header>

        {/* CTA to business profile */}
        <footer style={{ marginTop: "32px", textAlign: "center" }}>
          <a
            href={bizProfileUrl}
            style={{
              display:         "inline-block",
              backgroundColor: "#1c1917",
              color:           "#fff",
              padding:         "12px 28px",
              borderRadius:    "999px",
              textDecoration:  "none",
              fontSize:        "13px",
              fontWeight:      "600",
              letterSpacing:   "-0.01em",
            }}
          >
            View {review?.org_name || "Business"} Profile →
          </a>
          <p style={{ marginTop: "16px", fontSize: "11px", color: "rgba(28,25,23,0.3)", fontFamily: "monospace" }}>
            Powered by NeuroFlow AI · Verified Reviews
          </p>
        </footer>
      </body>
    </html>
  );
}