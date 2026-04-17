import type { TemplateShape } from "@/lib/types";

const BASE_W = 1080;
const BASE_H = 1350;

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function withDefaults(s: Partial<TemplateShape>): TemplateShape {
  return {
    id: s.id || id("shape"),
    type: s.type as any,
    x: s.x ?? 50,
    y: s.y ?? 50,
    width: s.width ?? 200,
    height: s.height ?? 80,
    backgroundColor: s.backgroundColor,
    borderColor: s.borderColor ?? "#000000",
    borderWidth: s.borderWidth ?? 0,
    textColor: s.textColor ?? "#111111",
    fontSize: s.fontSize ?? 36,
    fontFamily: s.fontFamily ?? "Arial",
    fontWeight: s.fontWeight ?? 700,
    textAlign: s.textAlign ?? "left",
    padding: s.padding ?? 10,
    opacity: s.opacity ?? 1,
    shadowBlur: s.shadowBlur ?? 0,
    shadowX: s.shadowX ?? 0,
    shadowY: s.shadowY ?? 0,
    shadowColor: s.shadowColor ?? "#000000",
    zIndex: s.zIndex ?? 1,
    dataField: s.dataField as any,
    customText: s.customText as any,
    borderRadius: s.borderRadius as any,
    radius: (s as any).radius,
    src: (s as any).src,
    fit: (s as any).fit,
    lineWidth: (s as any).lineWidth,
    lineDash: (s as any).lineDash,
    lineHeight: s.lineHeight ?? 1.1,
    letterSpacing: s.letterSpacing ?? 0,
    lineCap: (s as any).lineCap,
    direction: (s as any).direction,
    rotation: s.rotation,
    textTransform: (s as any).textTransform,
    slotKey: (s as any).slotKey,
    slotLabel: (s as any).slotLabel,
    slotType: (s as any).slotType,
    slotRole: (s as any).slotRole,
    slotRequired: (s as any).slotRequired,
    slotMaxItems: (s as any).slotMaxItems,
    slotSource: (s as any).slotSource,
    slotVisibleWhenEmpty: (s as any).slotVisibleWhenEmpty,
    aiHint: (s as any).aiHint,
  } as TemplateShape;
}

function scaleShapes(
  shapes: TemplateShape[],
  toW: number,
  toH: number,
  fromW: number = BASE_W,
  fromH: number = BASE_H
) {
  const sx = toW / fromW;
  const sy = toH / fromH;
  return shapes.map((s) => ({
    ...s,
    x: Math.round(s.x * sx),
    y: Math.round(s.y * sy),
    width: Math.round(s.width * sx),
    height: Math.round(s.height * sy),
    fontSize: s.fontSize ? Math.max(10, Math.round(s.fontSize * Math.min(sx, sy))) : s.fontSize,
    padding: s.padding ? Math.max(4, Math.round(s.padding * Math.min(sx, sy))) : s.padding,
  }));
}


function characterDashboardBase(): TemplateShape[] {
  return [
    // Dark maroon/brown gradient bg
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#1a0a0a", borderWidth: 0, zIndex: 0 }),

    // Radial glow center
    withDefaults({ id: id("glow-center"), type: "circle", x: 90, y: 300, width: 900, height: 900, backgroundColor: "rgba(180,30,30,0.25)", borderWidth: 0, zIndex: 1 }),
    withDefaults({ id: id("glow-top"), type: "circle", x: 290, y: -200, width: 500, height: 500, backgroundColor: "rgba(200,50,50,0.15)", borderWidth: 0, zIndex: 1 }),

    // BIG question headline top
    withDefaults({ id: id("headline"), type: "text", x: 60, y: 60, width: 960, height: 280, fontSize: 104, fontWeight: 900, textAlign: "center", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "hook", zIndex: 4 }),

    // Red CTA button — high contrast
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 140, y: 360, width: 800, height: 110, backgroundColor: "#dc2626", borderWidth: 0, borderRadius: 55, shadowBlur: 30, shadowX: 0, shadowY: 12, shadowColor: "rgba(220,38,38,0.55)", zIndex: 4 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 160, y: 388, width: 760, height: 58, fontSize: 36, fontWeight: 900, textAlign: "center", textColor: "#ffffff", dataField: "cta", zIndex: 5 }),

    // Dashboard screenshot behind character
    withDefaults({ id: id("dashboard-frame"), type: "rounded-rect", x: 60, y: 520, width: 960, height: 580, backgroundColor: "#1e293b", borderColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderRadius: 16, shadowBlur: 30, shadowX: 0, shadowY: 15, shadowColor: "rgba(0,0,0,0.6)", zIndex: 2 } as any),
    withDefaults({
  id: id("dashboard-img"),
  type: "image",
  x: 70,
  y: 530,
  width: 940,
  height: 560,
  src: undefined,
  fit: "cover",
  radius: 12,
  borderWidth: 0,
  opacity: 0.7,
  zIndex: 3,

  slotKey: "dashboard_image",
  slotLabel: "Dashboard / Product Image",
  slotType: "image",
  slotRole: "secondary",
  slotRequired: false,
  slotSource: "media_asset",
  slotVisibleWhenEmpty: true,
  aiHint: "Use a clean product, dashboard, or branded image that supports the offer",
} as any),

    // 3D CHARACTER CUTOUT — overlapping everything, center-bottom
   withDefaults({
  id: id("character-cutout"),
  type: "image",
  x: 240,
  y: 460,
  width: 600,
  height: 780,
  src: undefined,
  fit: "contain",
  radius: 0,
  borderWidth: 0,
  opacity: 1,
  zIndex: 6,

  slotKey: "hero_person",
  slotLabel: "Main Hero Image",
  slotType: "image",
  slotRole: "hero",
  slotRequired: true,
  slotSource: "media_asset",
  slotVisibleWhenEmpty: true,
  aiHint: "Use the strongest product, founder, or hero visual for the post",
} as any),

    // Price badge — yellow circle bottom left
    withDefaults({
  id: id("price-circle"),
  type: "circle",
  x: 40,
  y: 880,
  width: 280,
  height: 280,
  backgroundColor: "#fbbf24",
  borderWidth: 0,
  shadowBlur: 20,
  shadowX: 0,
  shadowY: 8,
  shadowColor: "rgba(0,0,0,0.4)",
  zIndex: 7,
  slotKey: "price_block",
  slotType: "text",
  slotVisibleWhenEmpty: false,
} as any),
withDefaults({
  id: id("sponsor-1"),
  type: "image",
  x: 760,
  y: 1185,
  width: 110,
  height: 55,
  src: undefined,
  fit: "contain",
  radius: 0,
  borderWidth: 0,
  opacity: 1,
  zIndex: 7,
  slotKey: "sponsor_1",
  slotLabel: "Sponsor Logo 1",
  slotType: "sponsor",
  slotRole: "logo",
  slotRequired: false,
  slotSource: "org_profile",
  slotVisibleWhenEmpty: false,
} as any),

withDefaults({
  id: id("sponsor-2"),
  type: "image",
  x: 885,
  y: 1185,
  width: 110,
  height: 55,
  src: undefined,
  fit: "contain",
  radius: 0,
  borderWidth: 0,
  opacity: 1,
  zIndex: 7,
  slotKey: "sponsor_2",
  slotLabel: "Sponsor Logo 2",
  slotType: "sponsor",
  slotRole: "logo",
  slotRequired: false,
  slotSource: "org_profile",
  slotVisibleWhenEmpty: false,
} as any),
withDefaults({
  id: id("review-text"),
  type: "text",
  x: 350,
  y: 1115,
  width: 360,
  height: 90,
  fontSize: 24,
  fontWeight: 700,
  textAlign: "center",
  textColor: "#ffffff",
  dataField: "review_text",
  zIndex: 7,
  slotKey: "review_block",
  slotType: "review",
  slotVisibleWhenEmpty: false,
} as any),
    withDefaults({ id: id("price-label"), type: "text", x: 50, y: 900, width: 260, height: 50, fontSize: 26, fontWeight: 700, textAlign: "center", textColor: "#1a0a0a", customText: "LIMITED TIME", zIndex: 8 } as any),
    withDefaults({ id: id("price-label2"), type: "text", x: 50, y: 950, width: 260, height: 50, fontSize: 24, fontWeight: 600, textAlign: "center", textColor: "#1a0a0a", customText: "OFFER", zIndex: 8 } as any),
    withDefaults({ id: id("price-amount"), type: "text", x: 50, y: 1000, width: 260, height: 100, fontSize: 80, fontWeight: 900, textAlign: "center", textColor: "#1a0a0a", fontFamily: "Arial Black", dataField: "proof", zIndex: 8 }),
    withDefaults({ id: id("price-term"), type: "text", x: 50, y: 1092, width: 260, height: 50, fontSize: 26, fontWeight: 700, textAlign: "center", textColor: "#1a0a0a", customText: "LIFETIME", zIndex: 8 } as any),

    // Bottom brand strip
    withDefaults({ id: id("brand-strip"), type: "rectangle", x: 0, y: 1278, width: 1080, height: 72, backgroundColor: "rgba(0,0,0,0.5)", borderWidth: 0, zIndex: 6 }),
    withDefaults({ id: id("brand-text"), type: "text", x: 60, y: 1290, width: 960, height: 52, fontSize: 30, fontWeight: 700, textAlign: "center", textColor: "rgba(255,255,255,0.7)", dataField: "companyName", zIndex: 7 }),
  ];
}
// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
export type PremiumComponentKey =
  "characterDashboard"


export function getPremiumComponent(
  key: PremiumComponentKey,
  canvasWidth: number,
  canvasHeight: number
): TemplateShape[] {
  const map: Record<PremiumComponentKey, () => TemplateShape[]> = {

    characterDashboard: characterDashboardBase,
  };
  const fn = map[key];
  if (!fn) return [];
  return scaleShapes(fn(), canvasWidth, canvasHeight);
}

// Different prefix so resolver knows to use Clipdrop
function clipdropPhoto(slot: string): string {
  return `__clipdrop__${slot}`;
}