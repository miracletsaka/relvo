/**
 * layout-planner/skeleton.ts
 * ───────────────────────────
 * Pass 3: Geometric layout zones. Footer zone is always computed.
 */

import type {
  AICompositionPlan, AICreativeDirection, NormalizedCampaignData,
  AILayoutSkeleton, Orientation, Rect,
} from "./types";
import { clamp, hasHeroImage, getAvailableBullets } from "./utils";
import { FOOTER_SIZE, MIN_HOOK_SIZE, MIN_BODY_SIZE } from "./constants";

export function buildOrientationAwareSkeleton(
  composition: AICompositionPlan,
  direction:   AICreativeDirection,
  campaign:    NormalizedCampaignData,
  canvasW:     number,
  canvasH:     number,
  orientation: Orientation
): AILayoutSkeleton {
  const pad    = Math.round(canvasW * (orientation === "landscape" ? 0.04 : 0.045));
  const minGap = direction.density === "low" ? 22 : direction.density === "medium" ? 16 : 12;

  const safeX = pad;
  const safeY = pad;
  const safeW = canvasW - pad * 2;
  const safeH = canvasH - pad * 2;
  // Reserve bottom strip for contact block (always rendered)
  const contactStripH = Math.round(canvasH * 0.18);

  // Footer height — always reserved at bottom of canvas
  const FOOTER_H = Math.round(FOOTER_SIZE * 2.5 + 16); // 56px at 1080

  const zone = (x: number, y: number, w: number, h: number): Rect => ({
    x:      Math.round(clamp(x, safeX, canvasW - safeX)),
    y:      Math.round(clamp(y, safeY, canvasH - safeY)),
    width:  Math.round(clamp(w, 40, canvasW - pad * 2)),
    height: Math.round(clamp(h, 20, canvasH - pad * 2)),
  });

  // Footer zone — pinned to very bottom of canvas
  const footerZone: Rect = {
    x: 0, y: canvasH - FOOTER_H,
    width: canvasW, height: FOOTER_H,
  };

  let content:        Rect;
  let hero:           Rect | undefined;
  let secondaryImage: Rect | undefined;

  // ── Landscape ─────────────────────────────────────────────────────────────
  if (orientation === "landscape") {
    switch (composition.layout) {
      case "right-content-left-hero":
        hero          = zone(0, 0, canvasW * 0.50, canvasH - FOOTER_H);
        content       = zone(canvasW * 0.52, safeY, canvasW * 0.44, canvasH - FOOTER_H - safeY);
        secondaryImage= zone(canvasW * 0.54, canvasH - FOOTER_H - canvasH * 0.28, canvasW * 0.28, canvasH * 0.22);
        break;
      case "centered-content-bg-hero":
        hero          = zone(0, 0, canvasW, canvasH - FOOTER_H);
        content       = zone(safeX, safeY, canvasW * 0.55, canvasH - FOOTER_H - safeY);
        secondaryImage= zone(canvasW * 0.72, (canvasH - FOOTER_H) * 0.55, canvasW * 0.22, (canvasH - FOOTER_H) * 0.30);
        break;
      case "split-diagonal":
        hero          = zone(canvasW * 0.48, 0, canvasW * 0.52, canvasH - FOOTER_H);
        content       = zone(safeX, safeY, canvasW * 0.44, canvasH - FOOTER_H - safeY);
        break;
      default:
        hero          = zone(canvasW * 0.52, 0, canvasW * 0.48, canvasH - FOOTER_H);
        content       = zone(safeX, safeY, canvasW * 0.46, canvasH - FOOTER_H - safeY);
    }
  }

  // ── Square ────────────────────────────────────────────────────────────────
  else if (orientation === "square") {
    switch (composition.layout) {
      case "editorial-center-stack":
        content       = zone(canvasW * 0.08, safeY, canvasW * 0.84, (canvasH - FOOTER_H) * 0.78);
        hero          = hasHeroImage(campaign)
          ? zone(canvasW * 0.10, safeY + 30, canvasW * 0.80, canvasH * 0.28) : undefined;
        break;
      case "hero-top-card-bottom":
        hero          = zone(0, 0, canvasW, (canvasH - FOOTER_H) * 0.40);
        content       = zone(safeX, (canvasH - FOOTER_H) * 0.42, safeW, (canvasH - FOOTER_H) * 0.50);
        break;
      case "centered-content-bg-hero":
        hero          = zone(0, 0, canvasW, canvasH - FOOTER_H);
        content       = zone(safeX, safeY, canvasW * 0.70, canvasH - FOOTER_H - safeY);
        break;
      default:
        content       = zone(safeX, safeY, canvasW * 0.48, canvasH - FOOTER_H - safeY);
        hero          = zone(canvasW * 0.52, 0, canvasW * 0.48, canvasH - FOOTER_H);
    }
  }

  // ── Portrait ──────────────────────────────────────────────────────────────
  else {
    const contentH = canvasH - FOOTER_H;
    switch (composition.layout) {
      case "left-content-right-hero":
        content       = zone(safeX, safeY, canvasW * 0.46, contentH - safeY);
        hero          = zone(canvasW * 0.54, 0, canvasW * 0.46, contentH);
        secondaryImage= zone(canvasW * 0.57, contentH - 330, canvasW * 0.30, 180);
        break;
      case "right-content-left-hero":
        content       = zone(canvasW * 0.50, safeY, canvasW * 0.44, contentH - safeY);
        hero          = zone(0, 0, canvasW * 0.46, contentH);
        secondaryImage= zone(safeX + 16, contentH - 330, canvasW * 0.30, 180);
        break;
      case "top-hero-bottom-content":
        hero          = zone(0, 0, canvasW, contentH * 0.40);
        content       = zone(safeX, contentH * 0.42, safeW, contentH * 0.50);
        break;
      case "centered-content-bg-hero":
        hero          = zone(0, 0, canvasW, contentH);
        content       = zone(safeX + 12, safeY + 12, canvasW * 0.62, contentH - safeY - 24);
        break;
      case "split-diagonal":
        hero          = zone(canvasW * 0.42, 0, canvasW * 0.58, contentH);
        content       = zone(safeX, safeY, canvasW * 0.44, contentH - safeY);
        break;
      case "content-top-left-hero-corner":
        content       = zone(safeX, safeY, canvasW * 0.54, contentH * 0.52);
        hero          = zone(canvasW * 0.58, contentH * 0.08, canvasW * 0.33, contentH * 0.46);
        break;
      case "editorial-center-stack":
        content       = zone(canvasW * 0.10, safeY, canvasW * 0.80, contentH * 0.72);
        hero          = hasHeroImage(campaign)
          ? zone(canvasW * 0.12, 40, canvasW * 0.76, contentH * 0.30) : undefined;
        break;
      case "hero-top-card-bottom":
      default:
        hero          = zone(0, 0, canvasW, contentH * 0.36);
        content       = zone(safeX + 12, contentH * 0.38, safeW - 24, contentH * 0.46);
    }
  }

  // ── Font-driven zone heights ──────────────────────────────────────────────
  const fontScale = canvasW / 1080;
  const efs = fontScale * (orientation === "landscape" ? 0.72 : orientation === "square" ? 0.84 : 1.0);

  const hookH       = Math.max(Math.round(MIN_HOOK_SIZE * efs * 1.1), 100);
  const bodyH       = Math.max(Math.round(MIN_BODY_SIZE * efs * 1.2), 44);
  const ctaH        = Math.round(72 * efs);

  const cx           = content.x + Math.round(12 * efs);
  const cw           = content.width - Math.round(24 * efs);
  const contentBottom= content.y + content.height;

  let cy = content.y + Math.round(22 * efs);

  function next(h: number, gap = minGap): Rect {
    const r: Rect = { x: cx, y: cy, width: cw, height: h };
    cy += h + gap;
    return r;
  }

  const headlineZone    = next(hookH, minGap + 6);
  const subheadingZone  = next(bodyH * 2, minGap);
  const bulletsZone     = next(bodyH * 3, minGap);
  const proofZone       = next(bodyH, minGap - 4);
  const reviewZone      = next(bodyH * 2, minGap - 4);
  const businessMetaZone= next(bodyH, minGap - 4);

  const ctaY = clamp(contentBottom - ctaH - Math.round(44 * efs), cy, contentBottom - ctaH - 10);
  const ctaZone: Rect = { x: cx, y: ctaY, width: Math.round(420 * efs), height: ctaH };

  const sponsorsZone: Rect = { x: cx, y: clamp(ctaY + ctaH + 8, ctaY + ctaH, contentBottom - 30), width: cw, height: bodyH };
  const accreditationsZone: Rect = { ...sponsorsZone, y: sponsorsZone.y + bodyH + 6 };

  if (secondaryImage) {
    secondaryImage = {
      x:      clamp(secondaryImage.x, 0, canvasW - secondaryImage.width),
      y:      clamp(secondaryImage.y, 0, canvasH - FOOTER_H - secondaryImage.height),
      width:  clamp(secondaryImage.width, 80, canvasW * 0.35),
      height: clamp(secondaryImage.height, 50, (canvasH - FOOTER_H) * 0.28),
    };
  }

  return {
    canvas: { width: canvasW, height: canvasH },
    zones: {
      content, hero,
      headline:       headlineZone,
      subheading:     subheadingZone,
      bullets:        bulletsZone,
      proof:          proofZone,
      review:         reviewZone,
      cta:            ctaZone,
      secondaryImage,
      footer:         footerZone,
      sponsors:       sponsorsZone,
      accreditations: accreditationsZone,
      businessMeta:   businessMetaZone,
    },
    rules: {
      minGap, safeMargin: pad,
      textMustStayInside: true,
      allowOverlayTextOnHero: composition.layout === "centered-content-bg-hero",
    },
  };
}