/**
 * lib/review-card-builder.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds canvas shapes for a review card (1200×628).
 *
 * ROOT CAUSE OF BLANK CARD (fixed here):
 *   Previous version used slotKey + slotRole for images. resolveTemplateSlots()
 *   only resolves keys it knows about from imageSlots (hero_person,
 *   dashboard_image, sponsor_N, etc). Custom keys "reviewer_photo" and
 *   "product_image" were never resolved → blank shapes.
 *
 *   FIX: inject `src` directly at shape build time. No slot resolution needed.
 *   Images render immediately when the canvas draws these shapes.
 *
 * Layout:
 *   ┌──────────────────────────┬──────────────────────────────┐
 *   │  Navy panel (left 44%)   │  Product image (right 56%)   │
 *   │  [photo] [name] [stars]  │  full-bleed cover            │
 *   │  "Italic quote text…"    │                              │
 *   │  [org name] [✓VERIFIED]  │                              │
 *   └──────────────────────────┴──────────────────────────────┘
 */

import type { TemplateShape } from "@/lib/types";

export type ReviewCardData = {
  authorName:        string;
  rating:            number;        // 1–5
  body:              string;
  reviewerPhotoUrl?: string | null; // direct image URL
  productImageUrl?:  string | null; // direct image URL
  orgName?:          string;
  primaryColor?:     string;        // defaults #1a2f4e
  accentColor?:      string;        // defaults #f59e0b
};

export const REVIEW_CARD_W = 1200;
export const REVIEW_CARD_H = 628;

const PANEL_W   = Math.round(REVIEW_CARD_W * 0.44);  // 528px
const PRODUCT_X = PANEL_W;

function uid(p: string) {
  return `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function dimHex(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const r = clamp(parseInt(h.slice(0, 2), 16) + amt);
  const g = clamp(parseInt(h.slice(2, 4), 16) + amt);
  const b = clamp(parseInt(h.slice(4, 6), 16) + amt);
  return "#" + [r,g,b].map(v => v.toString(16).padStart(2,"0")).join("");
}

export function buildReviewCardShapes(data: ReviewCardData): TemplateShape[] {
  const S: TemplateShape[] = [];

  const navy   = data.primaryColor || "#1a2f4e";
  const accent = data.accentColor  || "#f59e0b";
  const white  = "#ffffff";

  // ── 1. Outer rounded bg ──────────────────────────────────────────────────
  S.push({ id: uid("outer"), type: "rounded-rect", x: 0, y: 0, width: REVIEW_CARD_W, height: REVIEW_CARD_H, backgroundColor: "#f0eeeb", borderWidth: 0, borderRadius: 28, zIndex: 0 });

  // ── 2. White inner card ──────────────────────────────────────────────────
  S.push({ id: uid("card"), type: "rounded-rect", x: 18, y: 18, width: REVIEW_CARD_W - 36, height: REVIEW_CARD_H - 36, backgroundColor: white, borderWidth: 0, borderRadius: 20, zIndex: 1 });

  // ── 3. Navy left panel ───────────────────────────────────────────────────
  S.push({
    id: uid("panel"), type: "rounded-rect",
    x: 18, y: 18, width: PANEL_W - 18, height: REVIEW_CARD_H - 36,
    backgroundColor: navy,
    gradientColors: [{ stop: 0, color: navy }, { stop: 1, color: dimHex(navy, -22) }],
    gradientAngle: 145,
    borderWidth: 0, borderRadius: 20, zIndex: 2,
  });

  // ── 4. Product image — src injected directly ─────────────────────────────
  if (data.productImageUrl) {
    S.push({
      id: uid("product"), type: "image",
      x: PRODUCT_X, y: 18,
      width: REVIEW_CARD_W - PRODUCT_X - 18, height: REVIEW_CARD_H - 36,
      src: data.productImageUrl,      // ← DIRECT URL — no slot needed
      fit: "cover", radius: 20, zIndex: 2,
    });
    // Left-edge fade to blend with panel
    S.push({
      id: uid("blend"), type: "gradient-overlay",
      x: PRODUCT_X, y: 18, width: 90, height: REVIEW_CARD_H - 36,
      gradientColors: [{ stop: 0, color: navy }, { stop: 1, color: `${navy}00` }],
      gradientAngle: 90, backgroundColor: "transparent", borderWidth: 0, zIndex: 3,
    });
  } else {
    // Light grey fallback right panel
    S.push({ id: uid("pfb"), type: "rounded-rect", x: PRODUCT_X, y: 18, width: REVIEW_CARD_W - PRODUCT_X - 18, height: REVIEW_CARD_H - 36, backgroundColor: "#e8e6e2", borderWidth: 0, borderRadius: 20, zIndex: 2 });
  }

  // ── 5. Reviewer photo — src injected directly ────────────────────────────
  const photoSize = 160;
  const photoX    = 44;
  const photoY    = 48;

  if (data.reviewerPhotoUrl) {
    // White frame
    S.push({ id: uid("pfr"), type: "rounded-rect", x: photoX - 5, y: photoY - 5, width: photoSize + 10, height: photoSize + 10, backgroundColor: white, borderWidth: 0, borderRadius: 18, zIndex: 4 });
    S.push({
      id: uid("photo"), type: "image",
      x: photoX, y: photoY, width: photoSize, height: photoSize,
      src: data.reviewerPhotoUrl,     // ← DIRECT URL — no slot needed
      fit: "cover", radius: 14, zIndex: 5,
    });
  } else {
    // Initials avatar
    const initials = (data.authorName || "?").split(" ").map(w => w[0] || "").slice(0, 2).join("").toUpperCase();
    S.push({ id: uid("av-bg"), type: "rounded-rect", x: photoX, y: photoY, width: photoSize, height: photoSize, backgroundColor: accent, borderWidth: 0, borderRadius: 14, zIndex: 4 });
    S.push({ id: uid("av-txt"), type: "text", x: photoX, y: photoY + Math.round(photoSize * 0.20), width: photoSize, height: Math.round(photoSize * 0.60), text: initials, fontSize: 56, fontWeight: 900, textColor: navy, textAlign: "center", fontFamily: "'Inter','Helvetica Neue',sans-serif", borderWidth: 0, zIndex: 5 });
  }

  // ── 6. Author name ────────────────────────────────────────────────────────
  const nameY = photoY + photoSize + 20;
  S.push({ id: uid("name"), type: "text", x: photoX, y: nameY, width: PANEL_W - photoX - 28, height: 66, text: data.authorName || "", fontSize: 42, fontWeight: 800, textColor: white, textAlign: "left", fontFamily: "'Inter','Helvetica Neue',sans-serif", lineHeight: 1.1, borderWidth: 0, dataField: "review_author", zIndex: 6 });

  // ── 7. Stars ──────────────────────────────────────────────────────────────
  const starsY   = nameY + 70;
  const starSize = 34;
  for (let i = 0; i < 5; i++) {
    S.push({ id: uid(`s${i}`), type: "text", x: photoX + i * (starSize + 5), y: starsY, width: starSize, height: starSize + 4, text: "★", fontSize: starSize, fontWeight: 700, textColor: i < Math.round(data.rating) ? accent : `${accent}35`, textAlign: "center", fontFamily: "'Inter',sans-serif", borderWidth: 0, zIndex: 6 });
  }

  // ── 8. Review body ────────────────────────────────────────────────────────
  const bodyY    = starsY + starSize + 20;
  const bodyText = data.body ? `\u201c${data.body}\u201d` : "";
  S.push({ id: uid("body"), type: "text", x: photoX, y: bodyY, width: PANEL_W - photoX - 28, height: Math.max(80, REVIEW_CARD_H - bodyY - 88), text: bodyText, fontSize: 26, fontWeight: 700, textColor: white, textAlign: "left", fontFamily: "'Georgia',serif", fontStyle: "italic", lineHeight: 1.52, borderWidth: 0, dataField: "review_text", zIndex: 6 });

  // ── 9. Org name (bottom-left of panel) ───────────────────────────────────
  if (data.orgName) {
    S.push({ id: uid("org"), type: "text", x: photoX, y: REVIEW_CARD_H - 60, width: PANEL_W - photoX - 130, height: 36, text: data.orgName, fontSize: 17, fontWeight: 700, textColor: "rgba(255,255,255,0.42)", textAlign: "left", fontFamily: "'Inter',sans-serif", letterSpacing: 1.2, borderWidth: 0, zIndex: 6 });
  }

  // ── 10. Verified badge ────────────────────────────────────────────────────
  S.push({ id: uid("vbg"), type: "rounded-rect", x: PANEL_W - 132, y: REVIEW_CARD_H - 62, width: 118, height: 34, backgroundColor: `${accent}1e`, borderWidth: 1, borderColor: `${accent}55`, borderRadius: 17, zIndex: 6 });
  S.push({ id: uid("vtxt"), type: "text", x: PANEL_W - 128, y: REVIEW_CARD_H - 57, width: 110, height: 22, text: "✓ VERIFIED", fontSize: 12, fontWeight: 800, textColor: accent, textAlign: "center", fontFamily: "'Inter',monospace", letterSpacing: 0.8, borderWidth: 0, zIndex: 7 });

  return S;
}