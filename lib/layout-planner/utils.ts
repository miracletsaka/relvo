/**
 * layout-planner/utils.ts
 * ─────────────────────────
 * Pure utility functions — math, text helpers, image slot readers.
 * No side effects. No imports from other layout-planner modules.
 */

import type { Rect, NormalizedCampaignData, CampaignImageSlots, GradientStop } from "./types";
import type { CampaignData } from "@/lib/types";

// ── ID generation ──────────────────────────────────────────────────────────────
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Text helpers ───────────────────────────────────────────────────────────────
export function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// ── Math helpers ───────────────────────────────────────────────────────────────
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ── Seeded random: NEVER use Math.random() for layout decisions ───────────────
// Using a pure LCG so the same seed always gives the same sequence,
// but different seeds give completely different results.
export function seededRng(seed: number) {
  let s = seed >>> 0;
  return {
    next(): number {
      // LCG: multiplier from Knuth, mod 2^32
      s = Math.imul(1664525, s) + 1013904223 >>> 0;
      return s / 0x100000000;
    },
    nextInt(min: number, max: number): number {
      return min + Math.floor(this.next() * (max - min + 1));
    },
    pick<T>(arr: T[]): T {
      return arr[Math.floor(this.next() * arr.length)];
    },
    pickExcluding<T>(arr: T[], exclude: T): T {
      const pool = arr.filter(x => x !== exclude);
      return pool.length ? this.pick(pool) : arr[0];
    },
    shuffle<T>(arr: T[]): T[] {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

// ── Hash ───────────────────────────────────────────────────────────────────────
export function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

// ── Rect helpers ───────────────────────────────────────────────────────────────
export function rectRight(r: Rect)  { return r.x + r.width; }
export function rectBottom(r: Rect) { return r.y + r.height; }
export function rectArea(r: Rect)   { return Math.max(0, r.width) * Math.max(0, r.height); }

export function overlapArea(a: Rect, b: Rect): number {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(rectRight(a), rectRight(b));
  const y2 = Math.min(rectBottom(a), rectBottom(b));
  return (x2 <= x1 || y2 <= y1) ? 0 : (x2 - x1) * (y2 - y1);
}

export function within(outer: Rect, inner: Rect, margin = 0): boolean {
  return (
    inner.x >= outer.x + margin &&
    inner.y >= outer.y + margin &&
    rectRight(inner) <= rectRight(outer) - margin &&
    rectBottom(inner) <= rectBottom(outer) - margin
  );
}

export function expandRect(r: Rect, p: number): Rect {
  return { x: r.x - p, y: r.y - p, width: r.width + p * 2, height: r.height + p * 2 };
}

// ── Image slots ────────────────────────────────────────────────────────────────
export function readSlotUrl(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const url = (value as Record<string, unknown>).url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return undefined;
}

// ── Color helpers ──────────────────────────────────────────────────────────────
export function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

// ── Orientation detection ──────────────────────────────────────────────────────
export function detectOrientation(w: number, h: number) {
  const ratio = w / h;
  if (ratio > 1.2) return "landscape" as const;
  if (ratio < 0.85) return "portrait" as const;
  return "square" as const;
}

// ── Campaign data helpers ──────────────────────────────────────────────────────
export function hasHeroImage(c: NormalizedCampaignData): boolean {
  return isNonEmpty(c.hero_person) || isNonEmpty(c.heroImage);
}

export function hasSecondaryImage(c: NormalizedCampaignData): boolean {
  return isNonEmpty(c.dashboard_image);
}

export function getAvailableBullets(c: NormalizedCampaignData): string[] {
  return [c.bullet_1, c.bullet_2, c.bullet_3].filter(Boolean).slice(0, 3);
}

export function getBusinessMetaLine(c: NormalizedCampaignData): string {
  return [c.business_type, c.business_tagline, c.location].filter(Boolean).join(" • ");
}

export function compactImageSlots(c: NormalizedCampaignData): CampaignImageSlots {
  const hero      = readSlotUrl(c.imageSlots?.hero_person) ?? c.hero_person;
  const dashboard = readSlotUrl(c.imageSlots?.dashboard_image) ?? c.dashboard_image;
  const logo      = readSlotUrl(c.imageSlots?.logo) ?? c.logo;
  return {
    logo:             logo || undefined,
    hero_person:      hero || undefined,
    dashboard_image:  dashboard || undefined,
  };
}

// ── Normalize campaign ────────────────────────────────────────────────────────
export function normalizeCampaignData(input: Partial<CampaignData> = {}): NormalizedCampaignData {
  const reviews        = Array.isArray(input.reviews)        ? input.reviews        : [];
  const offers         = Array.isArray(input.offers)         ? input.offers         : [];
  const sponsors       = Array.isArray(input.sponsors)       ? input.sponsors       : [];
  const accreditations = Array.isArray(input.accreditations) ? input.accreditations : [];
  const metadata       = Array.isArray(input.metadata)       ? input.metadata       : [];
  const businessInfo   = (input.businessInfo && typeof input.businessInfo === "object")
    ? input.businessInfo : {};

  const firstReview = reviews[0];
  const firstOffer  = offers[0];
  const bullets = Array.isArray(input.bullets) && input.bullets.length
    ? input.bullets.filter((b): b is string => typeof b === "string" && b.trim().length > 0)
    : [];

  const heroImageFromSlots      = readSlotUrl(input.imageSlots?.hero_person);
  const dashboardImageFromSlots = readSlotUrl(input.imageSlots?.dashboard_image);
  const logoFromSlots           = readSlotUrl(input.imageSlots?.logo);

  return {
    hook:       asText(input.hook)       || "Grow Faster With Smart AI",
    subheading: asText(input.subheading) || asText(businessInfo.description) || "Everything you need to launch, grow, and scale.",
    bullets: bullets.length > 0 ? bullets : [
      asText(input.bullet_1) || "Smart automation",
      asText(input.bullet_2) || "Faster response times",
      asText(input.bullet_3) || "More booked appointments",
    ],
    proof:         asText(input.proof)   || "Trusted by growing businesses",
    cta:           asText(input.cta)     || "Book Your Free Demo",
    logo:          asText(input.logo)    || logoFromSlots || "",
    heroImage:     asText(input.heroImage) || asText(input.hero_person) || heroImageFromSlots || "",
    imageSlots:    input.imageSlots || {},
    ctaLink:       asText(input.ctaLink),
    hashtags:      asText(input.hashtags),
    companyName:   asText(input.companyName) || "YourBrand",
    location:      asText(input.location),
    links:         Array.isArray(input.links) ? input.links : [],
    sponsors, reviews, offers, accreditations, businessInfo, metadata,
    review_text:   asText(input.review_text)  || asText(firstReview?.body)      || "",
    review_author: asText(input.review_author)|| asText(firstReview?.author_name)|| "",
    offer_title:   asText(input.offer_title)  || asText(firstOffer?.title)       || "",
    offer_cta:     asText(input.offer_cta)    || asText(firstOffer?.cta_text)    || "",
    hook_pre:      asText(input.hook_pre)     || asText(businessInfo.tagline)    || "",
    hook_tag:      asText(input.hook_tag),
    bullet_1:      asText(input.bullet_1) || bullets[0] || "",
    bullet_2:      asText(input.bullet_2) || bullets[1] || "",
    bullet_3:      asText(input.bullet_3) || bullets[2] || "",
    price_label:         asText(input.price_label),
    fine_print:          asText(input.fine_print),
    business_website:    asText(input.business_website)    || asText(businessInfo.website),
    business_tagline:    asText(input.business_tagline)    || asText(businessInfo.tagline),
    business_description:asText(input.business_description)|| asText(businessInfo.description),
    business_type:       asText(input.business_type)       || asText(businessInfo.business_type),
    hero_person:     asText(input.hero_person)    || heroImageFromSlots      || asText(input.heroImage),
    dashboard_image: asText(input.dashboard_image)|| dashboardImageFromSlots || "",
  };
}
