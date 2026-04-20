/**
 * lib/get-shape-text.ts
 * ─────────────────────
 * Drop-in replacement for getShapeText() in TemplateCanvas.
 *
 * Every dataField in template-styles.ts resolves here.
 * If a field has no data, it returns "" — no blanks rendered.
 *
 * LABEL FIELDS (icon + label + value):
 *   These emit a formatted string: "📞 +44 7000 000000"
 *   So the canvas shows a clean labeled contact line.
 *
 *   contact_row1  → "Company · 📞 phone · ✉ email · 🌐 website"
 *   contact_row2  → "📍 address · fb · ig · reg · vat"
 *   phone         → "📞 phone_primary"
 *   email         → "✉ email_primary"
 *   whatsapp      → "💬 whatsapp"
 *   address       → "📍 address, city, country"
 *   business_website → website (clean, no https://)
 *   map_url       → map_url
 *   meta_N_key    → label text (CALL US, EMAIL, etc.)
 *   meta_N_value  → the actual contact value for that slot
 */

import type { CampaignData, TemplateShape } from "@/lib/types";

export function getShapeText(shape: TemplateShape, campaignData: CampaignData): string {
  if (shape.type !== "text") return "";

  const field = (shape as any).dataField as string | undefined;
  const customText = (shape as any).customText as string | undefined;
  const rawText    = (shape as any).text as string | undefined;

  // If no dataField — use custom text or raw text
  if (!field) {
    return applyTransform(String(customText || rawText || ""), shape);
  }

  const cd  = campaignData;
  const biz = cd.businessInfo || {};

  // Helper: first non-empty value
  const first = (...vals: Array<string | undefined | null>): string =>
    vals.find(v => v && v.trim()) ?? "";

  // Helper: clean website for display
  const cleanWeb = (url?: string | null) =>
    url ? url.replace(/^https?:\/\//i, "").replace(/\/$/, "") : "";

  let text = "";

  switch (field) {

    // ── Core content fields ────────────────────────────────────────────────
    case "hook":        text = cd.hook        || ""; break;
    case "subheading":  text = cd.subheading  || ""; break;
    case "proof":       text = cd.proof       || ""; break;
    case "cta":         text = cd.cta         || ""; break;
    case "hashtags":    text = cd.hashtags    || ""; break;
    case "companyName": text = cd.companyName || ""; break;
    case "location":    text = cd.location    || first(biz.city, biz.country) || ""; break;

    // ── Hook variants ──────────────────────────────────────────────────────
    case "hook_tag":    text = (cd as any).hook_tag    || ""; break;
    case "hook_pre":    text = (cd as any).hook_pre    || biz.tagline || ""; break;
    case "hook_number": text = (cd as any).hook_number || ""; break;
    case "hook_label":  text = (cd as any).hook_label  || ""; break;
    case "hook_desc":   text = (cd as any).hook_desc   || ""; break;
    case "badge_icon":  text = (cd as any).badge_icon  || ""; break;
    case "deco_icon":   text = (cd as any).deco_icon   || ""; break;

    // ── Bullets ────────────────────────────────────────────────────────────
    case "bullet_1":    text = (cd as any).bullet_1 || cd.bullets?.[0] || ""; break;
    case "bullet_2":    text = (cd as any).bullet_2 || cd.bullets?.[1] || ""; break;
    case "bullet_3":    text = (cd as any).bullet_3 || cd.bullets?.[2] || ""; break;

    // ── Business info fields ───────────────────────────────────────────────
    case "business_tagline":
      text = first(biz.tagline, (cd as any).business_tagline); break;
    case "business_description":
      text = first(biz.description, (cd as any).business_description); break;
    case "business_type":
      text = first(biz.business_type, (cd as any).business_type); break;

    case "business_website":
      text = cleanWeb(first(biz.website, cd.website, (cd as any).business_website)); break;

    case "business_meta":
      text = [
        first(biz.business_type, (cd as any).business_type),
        first(biz.tagline, (cd as any).business_tagline),
        first(cd.location, biz.city, biz.country),
      ].filter(Boolean).join(" • ");
      break;

    // ── Contact fields — labeled output ───────────────────────────────────
    case "phone":
      text = first(cd.phone, biz.phone_primary, biz.phone_secondary);
      if (text) text = `📞  ${text}`;
      break;

    case "email":
      text = first(cd.email, biz.email_primary, biz.email_support);
      if (text) text = `✉  ${text}`;
      break;

    case "whatsapp":
      text = first(cd.whatsapp, biz.whatsapp);
      if (text) text = `💬  ${text}`;
      break;

    case "address":
      text = [
        first(biz.address, cd.address),
        first(biz.city, cd.city),
        first(biz.country, cd.country),
      ].filter(Boolean).join(", ");
      if (text) text = `📍  ${text}`;
      break;

    case "map_url":
      text = first(biz.map_url, cd.map_url);
      if (text) text = `🗺  ${cleanWeb(text)}`;
      break;

    // ── Social fields ──────────────────────────────────────────────────────
    case "facebook_url":
      text = first(biz.facebook_url, cd.facebook_url);
      if (text) text = `FB: ${text.replace(/.*facebook\.com\//, "")}`;
      break;
    case "instagram_url":
      text = first(biz.instagram_url, cd.instagram_url);
      if (text) text = `IG: @${text.replace(/.*instagram\.com\//, "").replace(/\/$/, "")}`;
      break;
    case "linkedin_url":
      text = first(biz.linkedin_url, cd.linkedin_url);
      if (text) text = `LI: ${text.replace(/.*linkedin\.com\/company\//, "")}`;
      break;
    case "tiktok_url":
      text = first(biz.tiktok_url, cd.tiktok_url);
      if (text) text = `TT: @${text.replace(/.*tiktok\.com\/@/, "").replace(/\/$/, "")}`;
      break;
    case "youtube_url":
      text = first(biz.youtube_url, cd.youtube_url);
      if (text) text = `YT: ${text.replace(/.*youtube\.com\/(channel\/|@)?/, "")}`;
      break;
    case "twitter_url":
      text = first(biz.twitter_url, cd.twitter_url);
      if (text) text = `X: @${text.replace(/.*x\.com\//, "").replace(/.*twitter\.com\//, "")}`;
      break;

    // ── Registration / legal ───────────────────────────────────────────────
    case "registration_no":
      text = first(biz.registration_no, cd.registration_no);
      if (text) text = `Reg: ${text}`;
      break;
    case "vat_number":
      text = first(biz.vat_number, cd.vat_number);
      if (text) text = `VAT: ${text}`;
      break;

    // ── Composite contact rows (used in contact strip) ─────────────────────
    // contact_row1: identity + primary contacts on one line
    case "contact_row1": {
      const parts: string[] = [];
      const name  = first(cd.companyName);
      const phone = first(cd.phone, biz.phone_primary);
      const email = first(cd.email, biz.email_primary);
      const web   = cleanWeb(first(biz.website, cd.website));
      if (name)  parts.push(name.toUpperCase());
      if (phone) parts.push(`📞 ${phone}`);
      if (email) parts.push(`✉ ${email}`);
      if (web)   parts.push(`🌐 ${web}`);
      text = parts.join("  ·  ");
      break;
    }

    // contact_row2: address + socials + legal on second line
    case "contact_row2": {
      const parts: string[] = [];
      const addr = [first(biz.city, cd.city), first(biz.country, cd.country)].filter(Boolean).join(", ");
      const wa   = first(cd.whatsapp, biz.whatsapp);
      const fb   = first(biz.facebook_url, cd.facebook_url);
      const ig   = first(biz.instagram_url, cd.instagram_url);
      const li   = first(biz.linkedin_url, cd.linkedin_url);
      const tt   = first(biz.tiktok_url, cd.tiktok_url);
      const reg  = first(biz.registration_no, cd.registration_no);
      const vat  = first(biz.vat_number, cd.vat_number);
      if (addr) parts.push(`📍 ${addr}`);
      if (wa)   parts.push(`💬 ${wa}`);
      if (fb)   parts.push(`FB: ${fb.replace(/.*facebook\.com\//, "")}`);
      if (ig)   parts.push(`IG: @${ig.replace(/.*instagram\.com\//, "").replace(/\/$/, "")}`);
      if (li)   parts.push(`LI: ${li.replace(/.*linkedin\.com\/company\//, "")}`);
      if (tt)   parts.push(`TT: @${tt.replace(/.*tiktok\.com\/@/, "").replace(/\/$/, "")}`);
      if (reg)  parts.push(`Reg: ${reg}`);
      if (vat)  parts.push(`VAT: ${vat}`);
      text = parts.join("  ·  ");
      break;
    }

    // ── Review fields ──────────────────────────────────────────────────────
    case "review_text":
      text = first(cd.review_text, cd.reviews?.[0]?.body); break;
    case "review_author":
      text = first(cd.review_author, cd.reviews?.[0]?.author_name); break;
    case "review_rating": {
      const r = cd.reviews?.[0]?.rating ?? 5;
      text = "★".repeat(Math.max(0, Math.min(5, Math.round(r)))) +
             "☆".repeat(5 - Math.max(0, Math.min(5, Math.round(r))));
      break;
    }
    case "deco_icon":
      // Used as a ghost quotation mark — return the char directly
      text = (cd as any).deco_icon || "\u201C"; break;

    // ── Offer / price fields ───────────────────────────────────────────────
    case "offer_title":
      text = first(cd.offer_title, cd.offers?.[0]?.title); break;
    case "offer_cta":
      text = first(cd.offer_cta, cd.offers?.[0]?.cta_text); break;
    case "price_label":
      text = (cd as any).price_label || ""; break;
    case "fine_print":
      text = (cd as any).fine_print || ""; break;
    case "enroll_note":
      text = (cd as any).enroll_note || ""; break;

    // ── Metadata rows (used in contact-showcase grid labels) ───────────────
    // meta_N_key → the LABEL for that contact field (CALL US, EMAIL, etc.)
    // meta_N_value → the actual VALUE for that contact field
    // In contact-showcase style, we emit these as label→value pairs.
    case "meta_1_key":   text = (cd as any).meta_1_key   || "CALL US";     break;
    case "meta_1_value": text = (cd as any).meta_1_value || first(cd.phone, biz.phone_primary); break;
    case "meta_2_key":   text = (cd as any).meta_2_key   || "WHATSAPP";    break;
    case "meta_2_value": text = (cd as any).meta_2_value || first(cd.whatsapp, biz.whatsapp); break;
    case "meta_3_key":   text = (cd as any).meta_3_key   || "EMAIL";       break;
    case "meta_3_value": text = (cd as any).meta_3_value || first(cd.email, biz.email_primary); break;
    case "meta_4_key":   text = (cd as any).meta_4_key   || "WEBSITE";     break;
    case "meta_4_value": text = (cd as any).meta_4_value || cleanWeb(first(biz.website, cd.website)); break;
    case "meta_5_key":   text = (cd as any).meta_5_key   || "FIND US";     break;
    case "meta_5_value": text = (cd as any).meta_5_value || [first(biz.address, cd.address), first(biz.city)].filter(Boolean).join(", "); break;
    case "meta_6_key":   text = (cd as any).meta_6_key   || "MAP";         break;
    case "meta_6_value": text = (cd as any).meta_6_value || cleanWeb(first(biz.map_url, cd.map_url)); break;

    // ── Sponsors / accreditations ──────────────────────────────────────────
    case "sponsors":
      text = (cd.sponsors || []).map(s => s.name).filter(Boolean).slice(0, 3).join("  ·  "); break;
    case "accreditations":
      text = (cd.accreditations || []).map(a => a.name).filter(Boolean).slice(0, 3).join("  ·  "); break;

    // ── Legacy / fallback ──────────────────────────────────────────────────
    default: {
      // Try direct campaignData property first
      const direct = (cd as any)[field];
      if (direct !== undefined && direct !== null && String(direct).trim()) {
        text = String(direct);
      } else {
        // Try businessInfo
        const bizVal = (biz as any)[field];
        if (bizVal !== undefined && bizVal !== null && String(bizVal).trim()) {
          text = String(bizVal);
        } else {
          // Last resort: raw shape text or customText
          text = String(customText || rawText || "");
        }
      }
      break;
    }
  }

  return applyTransform(text, shape);
}

function applyTransform(text: string, shape: TemplateShape): string {
  const transform = (shape as any).textTransform || "none";
  if (!text) return "";
  if (transform === "uppercase")   return text.toUpperCase();
  if (transform === "lowercase")   return text.toLowerCase();
  if (transform === "capitalize")  return text.replace(/\b\w/g, c => c.toUpperCase());
  return text;
}

/**
 * resolveImageSlotSrc — companion to getShapeText for IMAGE shapes.
 * Call this when shape.type === "image" to resolve the src URL.
 * This fixes logo not rendering by pulling from campaignData.logo directly.
 */
export function resolveImageSlotSrc(shape: TemplateShape, campaignData: CampaignData): string | null {
  // Explicit src always wins
  if ((shape as any).src && (shape as any).src !== "undefined") {
    return (shape as any).src;
  }

  const slotKey = (shape as any).slotKey as string | undefined;
  if (!slotKey) return null;

  const cd  = campaignData;
  const biz = cd.businessInfo || {};

  switch (slotKey) {
    case "logo":
      // Try campaignData.logo first, then imageSlots.logo
      return (cd.logo as string) || cd.imageSlots?.logo?.url || null;

    case "hero_person":
      return cd.imageSlots?.hero_person?.url
        || (cd as any).heroImage
        || (cd as any).hero_person
        || null;

    case "dashboard_image":
      return cd.imageSlots?.dashboard_image?.url
        || (cd as any).dashboard_image
        || null;

    default:
      // Generic imageSlots lookup
      return cd.imageSlots?.[slotKey]?.url || null;
  }
}