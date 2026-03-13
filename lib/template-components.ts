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

// ─────────────────────────────────────────────
// 1) OFFER / DISCOUNT (original)
// ─────────────────────────────────────────────
function offerLayoutBase(): TemplateShape[] {
  return [
    // SUBHEADING
    withDefaults({
      id: id("label"),
      type: "text",
      x: 72,
      y: 86,
      width: 760,
      height: 52,
      fontSize: 28,
      fontWeight: 800,
      letterSpacing: 1.8,
      lineHeight: 1.1,
      textColor: "#ffffff",
      opacity: 0.9,
      shadowBlur: 6,
      shadowX: 0,
      shadowY: 2,
      shadowColor: "rgba(0,0,0,0.25)",
      dataField: "subheading",
      zIndex: 3,
    }),

    // HEADLINE
    withDefaults({
      id: id("headline"),
      type: "text",
      x: 72,
      y: 150,
      width: 860,
      height: 470,
      fontSize: 112, // max size, should still be auto-fitted by renderer
      fontWeight: 900,
      letterSpacing: -1.8,
      lineHeight: 0.88,
      textColor: "#ffffff",
      shadowBlur: 24,
      shadowX: 0,
      shadowY: 10,
      shadowColor: "rgba(0,0,0,0.35)",
      dataField: "hook",
      zIndex: 4,
    }),

    // CTA BUTTON
    withDefaults({
      id: id("cta-btn"),
      type: "rounded-rect",
      x: 72,
      y: 1042,
      width: 380,
      height: 108,
      backgroundColor: "#081f44",
      borderWidth: 0,
      borderRadius: 54,
      shadowBlur: 20,
      shadowX: 0,
      shadowY: 10,
      shadowColor: "rgba(0,0,0,0.25)",
      zIndex: 2,
    }),

    // CTA TEXT
    withDefaults({
      id: id("cta-text"),
      type: "text",
      x: 106,
      y: 1076,
      width: 312,
      height: 36,
      fontSize: 30,
      fontWeight: 800,
      letterSpacing: 0.6,
      lineHeight: 1,
      textAlign: "center",
      textColor: "#ffffff",
      shadowBlur: 4,
      shadowX: 0,
      shadowY: 1,
      shadowColor: "rgba(0,0,0,0.18)",
      dataField: "cta",
      zIndex: 3,
    }),

    // BRAND / LOGO TEXT
    withDefaults({
      id: id("footer-brand"),
      type: "text",
      x: 72,
      y: 1288,
      width: 260,
      height: 28,
      fontSize: 20,
      fontWeight: 800,
      letterSpacing: 3,
      lineHeight: 1,
      textColor: "#ffffff",
      opacity: 0.72,
      shadowBlur: 4,
      shadowX: 0,
      shadowY: 1,
      shadowColor: "rgba(0,0,0,0.2)",
      dataField: "companyName",
      zIndex: 3,
    }),
  ];
}
// ─────────────────────────────────────────────
// 2) HERO PRODUCT (original)
// ─────────────────────────────────────────────
function heroProductBase(): TemplateShape[] {
  return [

    // BRAND (top center)
    withDefaults({
      id: id("brand"),
      type: "text",
      x: 340,
      y: 80,
      width: 400,
      height: 40,
      fontSize: 22,
      fontWeight: 900,
      letterSpacing: 3,
      textAlign: "center",
      textColor: "#1e5f3b",
      opacity: 0.8,
      dataField: "companyName",
      zIndex: 3
    }),

    // CATEGORY LABEL
    withDefaults({
      id: id("label"),
      type: "text",
      x: 240,
      y: 140,
      width: 600,
      height: 60,
      fontSize: 30,
      fontWeight: 800,
      letterSpacing: 2,
      textAlign: "center",
      textColor: "#1e5f3b",
      opacity: 0.85,
      dataField: "subheading",
      zIndex: 3
    }),

    // MAIN HERO HEADLINE (CENTERED)
    withDefaults({
      id: id("headline"),
      type: "text",
      x: 120,
      y: 210,
      width: 840,
      height: 320,
      fontSize: 120,
      fontWeight: 900,
      letterSpacing: -2,
      lineHeight: 0.9,
      textAlign: "center",
      textColor: "#1e5f3b",
      shadowBlur: 10,
      shadowX: 0,
      shadowY: 6,
      shadowColor: "rgba(0,0,0,0.15)",
      dataField: "hook",
      zIndex: 4
    }),

    // CTA BUTTON (CENTER)
    withDefaults({
      id: id("cta-btn"),
      type: "rounded-rect",
      x: 310,
      y: 1050,
      width: 460,
      height: 110,
      backgroundColor: "#1e5f3b",
      borderRadius: 60,
      shadowBlur: 16,
      shadowX: 0,
      shadowY: 10,
      shadowColor: "rgba(0,0,0,0.22)",
      zIndex: 2
    }),

    // CTA TEXT
    withDefaults({
      id: id("cta-text"),
      type: "text",
      x: 350,
      y: 1086,
      width: 380,
      height: 36,
      fontSize: 32,
      fontWeight: 800,
      letterSpacing: 0.6,
      lineHeight: 1,
      textAlign: "center",
      textColor: "#ffffff",
      dataField: "cta",
      zIndex: 3
    }),

  ];
}

// ─────────────────────────────────────────────
// 3) SKINCARE / PRODUCT SPLIT (hey bud. style)
//    Image left, content right, CTA pill bottom
// ─────────────────────────────────────────────
function skincareProductBase(): TemplateShape[] {
  return [
    withDefaults({
      id: id("top-copy"),
      type: "text",
      x: 34,
      y: 70,
      width: 520,
      height: 220,
      fontSize: 64,
      fontWeight: 900,
      letterSpacing: -1.2,
      lineHeight: 0.96,
      textColor: "#1e5f3b",
      shadowBlur: 6,
      shadowX: 0,
      shadowY: 3,
      shadowColor: "rgba(0,0,0,0.12)",
      dataField: "subheading",
      zIndex: 4,
    }),

    withDefaults({
      id: id("bottom-copy"),
      type: "text",
      x: 555,
      y: 960,
      width: 470,
      height: 280,
      fontSize: 66,
      fontWeight: 900,
      letterSpacing: -1.3,
      lineHeight: 0.95,
      textAlign: "left",
      textColor: "#1e5f3b",
      shadowBlur: 6,
      shadowX: 0,
      shadowY: 3,
      shadowColor: "rgba(0,0,0,0.12)",
      dataField: "hook",
      zIndex: 4,
    }),

    withDefaults({
      id: id("mini-cta"),
      type: "text",
      x: 38,
      y: 1208,
      width: 280,
      height: 42,
      fontSize: 20,
      fontWeight: 800,
      letterSpacing: 0.4,
      lineHeight: 1,
      textColor: "#1e5f3b",
      dataField: "cta",
      zIndex: 4,
    }),

    withDefaults({
      id: id("brand"),
      type: "text",
      x: 38,
      y: 1270,
      width: 300,
      height: 34,
      fontSize: 24,
      fontWeight: 900,
      letterSpacing: 1.5,
      lineHeight: 1,
      textColor: "#ffffff",
      dataField: "companyName",
      zIndex: 4,
    }),

    withDefaults({
      id: id("dots-left"),
      type: "line",
      x: 64,
      y: 1012,
      width: 190,
      height: 0,
      borderColor: "rgba(255,255,255,0.7)",
      lineWidth: 3,
      lineDash: [10, 10],
      lineCap: "round",
      zIndex: 2,
    }),

    withDefaults({
      id: id("dots-left-2"),
      type: "line",
      x: 64,
      y: 1038,
      width: 190,
      height: 0,
      borderColor: "rgba(255,255,255,0.58)",
      lineWidth: 3,
      lineDash: [10, 10],
      lineCap: "round",
      zIndex: 2,
    }),

    withDefaults({
      id: id("dots-left-3"),
      type: "line",
      x: 64,
      y: 1064,
      width: 190,
      height: 0,
      borderColor: "rgba(255,255,255,0.46)",
      lineWidth: 3,
      lineDash: [10, 10],
      lineCap: "round",
      zIndex: 2,
    }),
  ];
}

// ─────────────────────────────────────────────
// 4) BOLD BRAND / TWIST WITH OREO style
//    Huge centered text, bold brand wordmark
// ─────────────────────────────────────────────
function boldBrandBase(): TemplateShape[] {
  return [
    withDefaults({
      id: id("top-copy"),
      type: "text",
      x: 42,
      y: 84,
      width: 560,
      height: 190,
      fontSize: 58,
      fontWeight: 900,
      letterSpacing: -1,
      lineHeight: 0.97,
      textColor: "#1e5f3b",
      shadowBlur: 5,
      shadowX: 0,
      shadowY: 2,
      shadowColor: "rgba(0,0,0,0.1)",
      dataField: "subheading",
      zIndex: 4,
    }),

    withDefaults({
      id: id("mid-accent-line"),
      type: "line",
      x: 58,
      y: 320,
      width: 300,
      height: 0,
      borderColor: "rgba(30,95,59,0.25)",
      lineWidth: 4,
      lineDash: [14, 12],
      lineCap: "round",
      zIndex: 2,
    }),

    withDefaults({
      id: id("bottom-copy"),
      type: "text",
      x: 500,
      y: 930,
      width: 510,
      height: 320,
      fontSize: 70,
      fontWeight: 900,
      letterSpacing: -1.5,
      lineHeight: 0.94,
      textAlign: "left",
      textColor: "#1e5f3b",
      shadowBlur: 6,
      shadowX: 0,
      shadowY: 3,
      shadowColor: "rgba(0,0,0,0.12)",
      dataField: "hook",
      zIndex: 4,
    }),

    withDefaults({
      id: id("mini-cta"),
      type: "text",
      x: 42,
      y: 1214,
      width: 340,
      height: 34,
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: 0.3,
      lineHeight: 1,
      textColor: "#1e5f3b",
      dataField: "cta",
      zIndex: 4,
    }),

    withDefaults({
      id: id("brand"),
      type: "text",
      x: 42,
      y: 1272,
      width: 280,
      height: 30,
      fontSize: 23,
      fontWeight: 900,
      letterSpacing: 1.8,
      textColor: "#ffffff",
      dataField: "companyName",
      zIndex: 4,
    }),

    withDefaults({
      id: id("accent-dot"),
      type: "circle",
      x: 360,
      y: 116,
      width: 24,
      height: 24,
      backgroundColor: "rgba(30,95,59,0.7)",
      borderWidth: 0,
      zIndex: 2,
    }),
  ];
}

// ─────────────────────────────────────────────
// 5) E-COMMERCE SALE / FLASH DEAL
//    High contrast, big % off, urgency feel
// ─────────────────────────────────────────────
function flashSaleBase(): TemplateShape[] {
  return [
    withDefaults({
      id: id("top-copy"),
      type: "text",
      x: 36,
      y: 76,
      width: 540,
      height: 240,
      fontSize: 60,
      fontWeight: 900,
      letterSpacing: -1.4,
      lineHeight: 0.94,
      textColor: "#1e5f3b",
      shadowBlur: 5,
      shadowX: 0,
      shadowY: 2,
      shadowColor: "rgba(0,0,0,0.1)",
      dataField: "subheading",
      zIndex: 4,
    }),

    withDefaults({
      id: id("bottom-copy"),
      type: "text",
      x: 528,
      y: 946,
      width: 480,
      height: 330,
      fontSize: 74,
      fontWeight: 900,
      letterSpacing: -1.8,
      lineHeight: 0.92,
      textColor: "#1e5f3b",
      shadowBlur: 6,
      shadowX: 0,
      shadowY: 3,
      shadowColor: "rgba(0,0,0,0.12)",
      dataField: "hook",
      zIndex: 4,
    }),

    withDefaults({
      id: id("support-dot"),
      type: "circle",
      x: 382,
      y: 104,
      width: 22,
      height: 22,
      backgroundColor: "rgba(30,95,59,0.72)",
      borderWidth: 0,
      zIndex: 2,
    }),

    withDefaults({
      id: id("mini-cta"),
      type: "text",
      x: 42,
      y: 1208,
      width: 320,
      height: 36,
      fontSize: 20,
      fontWeight: 900,
      letterSpacing: 0.5,
      lineHeight: 1,
      textColor: "#1e5f3b",
      dataField: "cta",
      zIndex: 4,
    }),

    withDefaults({
      id: id("brand"),
      type: "text",
      x: 42,
      y: 1268,
      width: 320,
      height: 34,
      fontSize: 25,
      fontWeight: 900,
      letterSpacing: 1.6,
      textColor: "#ffffff",
      dataField: "companyName",
      zIndex: 4,
    }),

    withDefaults({
      id: id("short-line-1"),
      type: "line",
      x: 70,
      y: 1008,
      width: 155,
      height: 0,
      borderColor: "rgba(255,255,255,0.68)",
      lineWidth: 3,
      lineDash: [8, 10],
      lineCap: "round",
      zIndex: 2,
    }),

    withDefaults({
      id: id("short-line-2"),
      type: "line",
      x: 70,
      y: 1034,
      width: 155,
      height: 0,
      borderColor: "rgba(255,255,255,0.54)",
      lineWidth: 3,
      lineDash: [8, 10],
      lineCap: "round",
      zIndex: 2,
    }),
  ];
}

// ─────────────────────────────────────────────
// 6) TESTIMONIAL / SOCIAL PROOF
//    Quote + stars + name, clean minimal look
// ─────────────────────────────────────────────
function testimonialBase(): TemplateShape[] {
  return [
    withDefaults({
      id: id("top-copy"),
      type: "text",
      x: 28,
      y: 88,
      width: 560,
      height: 220,
      fontSize: 56,
      fontWeight: 900,
      letterSpacing: -1,
      lineHeight: 0.98,
      textColor: "#1e5f3b",
      shadowBlur: 4,
      shadowX: 0,
      shadowY: 2,
      shadowColor: "rgba(0,0,0,0.08)",
      dataField: "subheading",
      zIndex: 4,
    }),

    withDefaults({
      id: id("bottom-copy"),
      type: "text",
      x: 560,
      y: 916,
      width: 445,
      height: 350,
      fontSize: 68,
      fontWeight: 900,
      letterSpacing: -1.5,
      lineHeight: 0.93,
      textColor: "#1e5f3b",
      dataField: "hook",
      zIndex: 4,
    }),

    withDefaults({
      id: id("accent-bar"),
      type: "rectangle",
      x: 30,
      y: 1176,
      width: 10,
      height: 84,
      backgroundColor: "#1e5f3b",
      borderWidth: 0,
      zIndex: 3,
    }),

    withDefaults({
      id: id("mini-cta"),
      type: "text",
      x: 56,
      y: 1192,
      width: 300,
      height: 60,
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: 0.4,
      lineHeight: 1.05,
      textColor: "#1e5f3b",
      dataField: "cta",
      zIndex: 4,
    }),

    withDefaults({
      id: id("brand"),
      type: "text",
      x: 56,
      y: 1270,
      width: 280,
      height: 32,
      fontSize: 24,
      fontWeight: 900,
      letterSpacing: 1.8,
      textColor: "#ffffff",
      dataField: "companyName",
      zIndex: 4,
    }),

    withDefaults({
      id: id("accent-dot"),
      type: "circle",
      x: 366,
      y: 118,
      width: 20,
      height: 20,
      backgroundColor: "rgba(30,95,59,0.7)",
      borderWidth: 0,
      zIndex: 2,
    }),

    withDefaults({
      id: id("accent-line"),
      type: "line",
      x: 62,
      y: 334,
      width: 240,
      height: 0,
      borderColor: "rgba(30,95,59,0.28)",
      lineWidth: 4,
      lineDash: [12, 12],
      lineCap: "round",
      zIndex: 2,
    }),
  ];
}

// ─────────────────────────────────────────────
// 7) MINIMAL BLOG / EDITORIAL
//    Magazine layout, serif title, clean grid
// ─────────────────────────────────────────────
function editorialBase(): TemplateShape[] {
  return [
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#ffffff", borderWidth: 0, zIndex: 0 }),
    // Image panel top
    withDefaults({ id: id("img-panel"), type: "rectangle", x: 0, y: 0, width: 1080, height: 680, backgroundColor: "#e8e8e8", borderWidth: 0, zIndex: 1 }),
    withDefaults({ id: id("img-hint"), type: "text", x: 140, y: 310, width: 800, height: 60, fontSize: 26, fontWeight: 400, textAlign: "center", textColor: "#bbbbbb", customText: "Drop your image here", zIndex: 2 } as any),
    // Category tag
    withDefaults({ id: id("category-tag"), type: "rounded-rect", x: 60, y: 710, width: 220, height: 52, backgroundColor: "#111111", borderWidth: 0, borderRadius: 6, zIndex: 3 } as any),
    withDefaults({ id: id("category-text"), type: "text", x: 70, y: 722, width: 200, height: 32, fontSize: 22, fontWeight: 700, textAlign: "center", textColor: "#ffffff", dataField: "location", textTransform: "uppercase", zIndex: 4 } as any),
    // Headline serif
    withDefaults({ id: id("headline"), type: "text", x: 60, y: 790, width: 960, height: 280, fontSize: 86, fontWeight: 900, textAlign: "left", textColor: "#111111", fontFamily: "Playfair Display", dataField: "hook", zIndex: 3 }),
    // Thin rule
    withDefaults({ id: id("rule"), type: "rectangle", x: 60, y: 1090, width: 120, height: 6, backgroundColor: "#111111", borderWidth: 0, zIndex: 2 }),
    // Body / subheading
    withDefaults({ id: id("body"), type: "text", x: 60, y: 1116, width: 960, height: 130, fontSize: 32, fontWeight: 400, textAlign: "left", textColor: "#555555", fontFamily: "Georgia", dataField: "subheading", zIndex: 3 }),
    // Author / brand
    withDefaults({ id: id("author"), type: "text", x: 60, y: 1268, width: 500, height: 50, fontSize: 24, fontWeight: 600, textAlign: "left", textColor: "#999999", dataField: "companyName", textTransform: "uppercase", zIndex: 2 } as any),
    // Read more →
    withDefaults({ id: id("read-more"), type: "text", x: 700, y: 1268, width: 320, height: 50, fontSize: 24, fontWeight: 700, textAlign: "right", textColor: "#111111", dataField: "cta", zIndex: 2 }),
  ];
}

// ─────────────────────────────────────────────
// 8) LUXURY / DARK MODE
//    Premium dark background, gold accents
// ─────────────────────────────────────────────
function luxuryDarkBase(): TemplateShape[] {
  return [
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#0a0a0a", borderWidth: 0, zIndex: 0 }),
    // Gold top line
    withDefaults({ id: id("gold-line-top"), type: "rectangle", x: 80, y: 80, width: 920, height: 2, backgroundColor: "#c9a84c", borderWidth: 0, zIndex: 2 }),
    // Gold bottom line
    withDefaults({ id: id("gold-line-bot"), type: "rectangle", x: 80, y: 1268, width: 920, height: 2, backgroundColor: "#c9a84c", borderWidth: 0, zIndex: 2 }),
    // Brand tag top center
    withDefaults({ id: id("brand-tag"), type: "text", x: 90, y: 100, width: 900, height: 70, fontSize: 28, fontWeight: 400, textAlign: "center", textColor: "#c9a84c", fontFamily: "Georgia", dataField: "companyName", textTransform: "uppercase", zIndex: 3 } as any),
    // Decorative circle center
    withDefaults({ id: id("deco-circle"), type: "circle", x: 290, y: 220, width: 500, height: 500, backgroundColor: "rgba(201,168,76,0.06)", borderColor: "rgba(201,168,76,0.25)", borderWidth: 1, zIndex: 1 }),
    // Image panel inside circle area
    withDefaults({ id: id("product-panel"), type: "circle", x: 340, y: 270, width: 400, height: 400, backgroundColor: "#1a1a1a", borderWidth: 0, zIndex: 2 }),
    withDefaults({ id: id("img-hint"), type: "text", x: 90, y: 440, width: 900, height: 60, fontSize: 22, fontWeight: 400, textAlign: "center", textColor: "rgba(255,255,255,0.2)", customText: "Drop your product image here", zIndex: 3 } as any),
    // Headline
    withDefaults({ id: id("headline"), type: "text", x: 90, y: 760, width: 900, height: 240, fontSize: 90, fontWeight: 900, textAlign: "center", textColor: "#ffffff", fontFamily: "Playfair Display", dataField: "hook", zIndex: 3 }),
    // Gold divider
    withDefaults({ id: id("gold-div"), type: "text", x: 90, y: 1010, width: 900, height: 50, fontSize: 28, fontWeight: 400, textAlign: "center", textColor: "#c9a84c", customText: "— ✦ —", zIndex: 2 } as any),
    // Subheading
    withDefaults({ id: id("sub"), type: "text", x: 90, y: 1060, width: 900, height: 110, fontSize: 34, fontWeight: 300, textAlign: "center", textColor: "rgba(255,255,255,0.65)", fontFamily: "Georgia", dataField: "subheading", zIndex: 3 }),
    // Proof
    withDefaults({ id: id("proof"), type: "text", x: 90, y: 1168, width: 900, height: 60, fontSize: 26, fontWeight: 400, textAlign: "center", textColor: "#c9a84c", dataField: "proof", zIndex: 3 }),
    // CTA outline button
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 290, y: 1248, width: 500, height: 90, backgroundColor: "transparent", borderColor: "#c9a84c", borderWidth: 2, borderRadius: 45, zIndex: 3 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 310, y: 1270, width: 460, height: 50, fontSize: 28, fontWeight: 600, textAlign: "center", textColor: "#c9a84c", fontFamily: "Georgia", dataField: "cta", textTransform: "uppercase", zIndex: 4 } as any),
  ];
}

// ─────────────────────────────────────────────
// 9) SPLIT COLOR / TWO-TONE
//    Left dark, right light, bold contrast
// ─────────────────────────────────────────────
function splitColorBase(): TemplateShape[] {
  return [
    // Left dark half
    withDefaults({ id: id("left-bg"), type: "rectangle", x: 0, y: 0, width: 540, height: 1350, backgroundColor: "#1a1a2e", borderWidth: 0, zIndex: 0 }),
    // Right light half
    withDefaults({ id: id("right-bg"), type: "rectangle", x: 540, y: 0, width: 540, height: 1350, backgroundColor: "#f5f5f0", borderWidth: 0, zIndex: 0 }),
    // Brand name left vertical
    withDefaults({ id: id("brand-left"), type: "text", x: 60, y: 100, width: 420, height: 80, fontSize: 36, fontWeight: 700, textAlign: "left", textColor: "rgba(255,255,255,0.4)", dataField: "companyName", textTransform: "uppercase", zIndex: 2 } as any),
    // Big headline spans both halves
    withDefaults({ id: id("headline"), type: "text", x: 60, y: 220, width: 960, height: 480, fontSize: 100, fontWeight: 900, textAlign: "left", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "hook", zIndex: 4 }),
    // Hook color overlay on right side text  
    withDefaults({ id: id("headline-overlay"), type: "text", x: 60, y: 220, width: 960, height: 480, fontSize: 100, fontWeight: 900, textAlign: "left", textColor: "#1a1a2e", fontFamily: "Arial Black", dataField: "hook", opacity: 0, zIndex: 5 }),
    // Image placeholder right side
    withDefaults({ id: id("img-panel"), type: "rounded-rect", x: 560, y: 740, width: 480, height: 460, backgroundColor: "#ddd", borderWidth: 0, borderRadius: 16, zIndex: 2 } as any),
    withDefaults({ id: id("img-hint"), type: "text", x: 580, y: 950, width: 440, height: 50, fontSize: 22, fontWeight: 400, textAlign: "center", textColor: "#aaaaaa", customText: "Drop image here", zIndex: 3 } as any),
    // Subheading left side
    withDefaults({ id: id("sub"), type: "text", x: 60, y: 740, width: 460, height: 200, fontSize: 32, fontWeight: 400, textAlign: "left", textColor: "rgba(255,255,255,0.7)", dataField: "subheading", zIndex: 3 }),
    // Bullets left side
    withDefaults({ id: id("bullets"), type: "bullet-group", x: 60, y: 960, width: 460, height: 220, fontSize: 28, fontWeight: 500, textColor: "rgba(255,255,255,0.85)", zIndex: 3 }),
    // CTA right
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 560, y: 1240, width: 460, height: 90, backgroundColor: "#1a1a2e", borderWidth: 0, borderRadius: 8, zIndex: 3 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 580, y: 1262, width: 420, height: 50, fontSize: 28, fontWeight: 800, textAlign: "center", textColor: "#ffffff", dataField: "cta", zIndex: 4 }),
  ];
}

// ─────────────────────────────────────────────
// 10) INSTAGRAM STORY / VERTICAL STACK
//     Mobile-first, center-aligned, gradient feel
// ─────────────────────────────────────────────
function instagramStoryBase(): TemplateShape[] {
  return [
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#6c63ff", borderWidth: 0, zIndex: 0 }),
    // Decorative circles
    withDefaults({ id: id("deco1"), type: "circle", x: -120, y: -120, width: 500, height: 500, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 0, zIndex: 1 }),
    withDefaults({ id: id("deco2"), type: "circle", x: 700, y: 1000, width: 600, height: 600, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 0, zIndex: 1 }),
    withDefaults({ id: id("deco3"), type: "circle", x: 800, y: 100, width: 200, height: 200, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 0, zIndex: 1 }),
    // Swipe up / brand top
    withDefaults({ id: id("brand"), type: "text", x: 90, y: 100, width: 900, height: 60, fontSize: 28, fontWeight: 600, textAlign: "center", textColor: "rgba(255,255,255,0.7)", dataField: "companyName", textTransform: "uppercase", zIndex: 3 } as any),
    // Image block center
    withDefaults({ id: id("img-panel"), type: "rounded-rect", x: 120, y: 200, width: 840, height: 560, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 0, borderRadius: 28, zIndex: 2 } as any),
    withDefaults({ id: id("img-hint"), type: "text", x: 140, y: 460, width: 800, height: 60, fontSize: 24, fontWeight: 400, textAlign: "center", textColor: "rgba(255,255,255,0.4)", customText: "Drop your image here", zIndex: 3 } as any),
    // Headline
    withDefaults({ id: id("headline"), type: "text", x: 90, y: 810, width: 900, height: 260, fontSize: 88, fontWeight: 900, textAlign: "center", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "hook", zIndex: 3 }),
    // Subheading
    withDefaults({ id: id("sub"), type: "text", x: 90, y: 1080, width: 900, height: 100, fontSize: 32, fontWeight: 400, textAlign: "center", textColor: "rgba(255,255,255,0.8)", dataField: "subheading", zIndex: 3 }),
    // Swipe up CTA
    withDefaults({ id: id("swipe-btn"), type: "rounded-rect", x: 280, y: 1215, width: 520, height: 100, backgroundColor: "#ffffff", borderWidth: 0, borderRadius: 50, shadowBlur: 16, shadowX: 0, shadowY: 6, shadowColor: "rgba(0,0,0,0.25)", zIndex: 3 } as any),
    withDefaults({ id: id("swipe-text"), type: "text", x: 300, y: 1240, width: 480, height: 54, fontSize: 30, fontWeight: 800, textAlign: "center", textColor: "#6c63ff", dataField: "cta", zIndex: 4 }),
  ];
}

// ─────────────────────────────────────────────
// 12) ALBUM COVER / EDITORIAL PORTRAIT
//     Full-bleed photo, sparse large serif title
//     top, minimal bottom text — like a music drop
// ─────────────────────────────────────────────
function albumCoverBase(): TemplateShape[] {
  return [
    // Full background dark fallback
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#111111", borderWidth: 0, zIndex: 0 }),

    // Full-bleed portrait image
    withDefaults({ id: id("photo"), type: "image", x: 0, y: 0, width: 1080, height: 1350, src: "https://neuroflow.lon1.digitaloceanspaces.com/neuroflow/ChatGPT%20Image%20Feb%2019,%202026,%2010_20_27%20AM.png", fit: "cover", radius: 0, borderWidth: 0, opacity: 1, zIndex: 1 } as any),

    // Subtle dark vignette overlay top
    withDefaults({ id: id("vignette-top"), type: "rectangle", x: 0, y: 0, width: 1080, height: 400, backgroundColor: "rgba(0,0,0,0.45)", borderWidth: 0, zIndex: 2 }),

    // Subtle dark vignette overlay bottom
    withDefaults({ id: id("vignette-bot"), type: "rectangle", x: 0, y: 900, width: 1080, height: 450, backgroundColor: "rgba(0,0,0,0.55)", borderWidth: 0, zIndex: 2 }),

    // BIG sparse title top — like "REAL"
    withDefaults({ id: id("title"), type: "text", x: 60, y: 60, width: 960, height: 260, fontSize: 220, fontWeight: 300, textAlign: "center", textColor: "#ffffff", fontFamily: "Playfair Display", dataField: "hook", textTransform: "uppercase", zIndex: 4 } as any),

    // Thin rule under title
    withDefaults({ id: id("rule"), type: "rectangle", x: 200, y: 300, width: 680, height: 1, backgroundColor: "rgba(255,255,255,0.3)", borderWidth: 0, zIndex: 3 }),

    // Bottom left — company / artist name
    withDefaults({ id: id("artist"), type: "text", x: 60, y: 980, width: 700, height: 80, fontSize: 36, fontWeight: 400, textAlign: "left", textColor: "rgba(255,255,255,0.9)", fontFamily: "Playfair Display", dataField: "companyName", zIndex: 4 }),

    // Bottom left — subheading / release info
    withDefaults({ id: id("release"), type: "text", x: 60, y: 1060, width: 700, height: 60, fontSize: 26, fontWeight: 300, textAlign: "left", textColor: "rgba(255,255,255,0.55)", dataField: "subheading", zIndex: 4 }),

    // Bottom right — small CTA / label
    withDefaults({ id: id("cta-label"), type: "text", x: 760, y: 980, width: 260, height: 60, fontSize: 22, fontWeight: 600, textAlign: "right", textColor: "rgba(255,255,255,0.5)", dataField: "location", textTransform: "uppercase", zIndex: 4 } as any),

    // Proof / tagline center bottom
    withDefaults({ id: id("proof"), type: "text", x: 60, y: 1150, width: 960, height: 100, fontSize: 38, fontWeight: 700, textAlign: "center", textColor: "#ffffff", fontFamily: "Georgia", dataField: "proof", zIndex: 4 }),

    // Bottom accent thin line
    withDefaults({ id: id("bottom-line"), type: "rectangle", x: 60, y: 1278, width: 960, height: 1, backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 0, zIndex: 3 }),

    // CTA bottom center
    withDefaults({ id: id("cta-text"), type: "text", x: 60, y: 1292, width: 960, height: 50, fontSize: 22, fontWeight: 400, textAlign: "center", textColor: "rgba(255,255,255,0.45)", dataField: "cta", textTransform: "uppercase", zIndex: 4 } as any),
  ];
}

// ─────────────────────────────────────────────
// 11) COMMUNITY CHALLENGE / EVENT ANNOUNCEMENT
//     Purple gradient bg, bold small headline,
//     giant outlined ghost text behind it
// ─────────────────────────────────────────────
function communityEventBase(): TemplateShape[] {
  return [
    // Deep purple background
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#3a0068", borderWidth: 0, zIndex: 0 }),
    // Radial glow center (faked with a big soft circle)
    withDefaults({ id: id("glow"), type: "circle", x: 140, y: 200, width: 800, height: 800, backgroundColor: "rgba(160, 32, 240, 0.45)", borderWidth: 0, opacity: 0.8, zIndex: 1 }),
    // Second glow top-right
    withDefaults({ id: id("glow2"), type: "circle", x: 600, y: -100, width: 500, height: 500, backgroundColor: "rgba(200, 80, 255, 0.25)", borderWidth: 0, opacity: 0.7, zIndex: 1 }),

    // Small bold headline on top
    withDefaults({ id: id("small-headline"), type: "text", x: 60, y: 340, width: 960, height: 130, fontSize: 64, fontWeight: 900, textAlign: "left", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "hook", zIndex: 4 }),

    // GIANT ghost / outlined word behind
    // We fake "outlined text" by drawing white text at low opacity
    withDefaults({ id: id("ghost-word"), type: "text", x: -30, y: 460, width: 1140, height: 380, fontSize: 240, fontWeight: 900, textAlign: "left", textColor: "rgba(255,255,255,0.0)", fontFamily: "Arial Black", dataField: "subheading", zIndex: 2,
      // These two properties create the outlined look via a border-only rectangle underneath
    } as any),

    // Outlined ghost text rectangle (border-only, simulates stroke text)
    withDefaults({ id: id("ghost-outline-rect"), type: "rounded-rect", x: -30, y: 462, width: 1140, height: 350, backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.18)", borderWidth: 2, borderRadius: 0, zIndex: 2 } as any),

    // The ghost label itself in white low opacity so it reads as outline
    withDefaults({ id: id("ghost-label"), type: "text", x: -20, y: 470, width: 1120, height: 340, fontSize: 230, fontWeight: 900, textAlign: "left", textColor: "rgba(255,255,255,0.15)", fontFamily: "Arial Black", dataField: "subheading", zIndex: 3 }),

    // Subheading / details below ghost
    withDefaults({ id: id("details"), type: "text", x: 60, y: 860, width: 900, height: 120, fontSize: 36, fontWeight: 500, textAlign: "left", textColor: "rgba(255,255,255,0.75)", dataField: "proof", zIndex: 4 }),

    // Bullet list
    withDefaults({ id: id("bullets"), type: "bullet-group", x: 60, y: 1000, width: 900, height: 200, fontSize: 32, fontWeight: 600, textColor: "rgba(255,255,255,0.85)", zIndex: 4 }),

    // Bottom accent line
    withDefaults({ id: id("accent-line"), type: "rectangle", x: 60, y: 1240, width: 200, height: 6, backgroundColor: "#cc44ff", borderWidth: 0, zIndex: 3 }),

    // Brand / company name
    withDefaults({ id: id("brand"), type: "text", x: 60, y: 1265, width: 600, height: 60, fontSize: 30, fontWeight: 700, textAlign: "left", textColor: "rgba(255,255,255,0.6)", dataField: "companyName", textTransform: "uppercase", zIndex: 4 } as any),

    // CTA right side
    withDefaults({ id: id("cta-pill"), type: "rounded-rect", x: 700, y: 1258, width: 320, height: 76, backgroundColor: "#cc44ff", borderWidth: 0, borderRadius: 38, shadowBlur: 20, shadowX: 0, shadowY: 6, shadowColor: "rgba(180,0,255,0.5)", zIndex: 4 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 720, y: 1278, width: 280, height: 40, fontSize: 26, fontWeight: 800, textAlign: "center", textColor: "#ffffff", dataField: "cta", zIndex: 5 }),
  ];
}

// ─────────────────────────────────────────────
// 13) BOLD STATEMENT / GOAL ANNOUNCEMENT
//     Light bg, small label top, purple bold
//     accent line, massive black headline,
//     curved caption + product image bottom
// ─────────────────────────────────────────────
function boldStatementBase(): TemplateShape[] {
  return [
    // Light grey background
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#f0f0f0", borderWidth: 0, zIndex: 0 }),

    // Small top label — "IN 2026" style
    withDefaults({ id: id("year-label"), type: "text", x: 90, y: 100, width: 900, height: 110, fontSize: 72, fontWeight: 900, textAlign: "center", textColor: "#111111", fontFamily: "Arial Black", dataField: "location", textTransform: "uppercase", zIndex: 3 } as any),

    // Purple accent text with white outline simulation
    // White shadow/outline layer behind
    withDefaults({ id: id("accent-shadow"), type: "text", x: 44, y: 220, width: 992, height: 220, fontSize: 118, fontWeight: 900, textAlign: "center", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "subheading", textTransform: "uppercase", shadowBlur: 0, shadowX: 3, shadowY: 3, shadowColor: "#ffffff", zIndex: 3 } as any),
    // Purple accent main text
    withDefaults({ id: id("accent-text"), type: "text", x: 46, y: 222, width: 988, height: 216, fontSize: 116, fontWeight: 900, textAlign: "center", textColor: "#7c3aed", fontFamily: "Arial Black", dataField: "subheading", textTransform: "uppercase", shadowBlur: 8, shadowX: 0, shadowY: 0, shadowColor: "rgba(255,255,255,0.9)", zIndex: 4 } as any),

    // BIG black main headline below
    withDefaults({ id: id("headline"), type: "text", x: 60, y: 440, width: 960, height: 300, fontSize: 130, fontWeight: 900, textAlign: "center", textColor: "#111111", fontFamily: "Arial Black", dataField: "hook", textTransform: "uppercase", zIndex: 4 } as any),

    // Curved caption text (we fake arc with normal centered small text)
    withDefaults({ id: id("curved-caption"), type: "text", x: 200, y: 760, width: 680, height: 80, fontSize: 36, fontWeight: 400, textAlign: "center", textColor: "#444444", fontFamily: "Georgia", dataField: "proof", zIndex: 4 }),

    // Image placeholder bottom — product / chess piece area
    withDefaults({ id: id("product-img"), type: "image", x: 240, y: 820, width: 600, height: 460, src: "", fit: "contain", radius: 0, borderWidth: 0, opacity: 1, zIndex: 3 } as any),
    // Fallback hint if no image
    withDefaults({ id: id("img-hint"), type: "text", x: 260, y: 1010, width: 560, height: 60, fontSize: 22, fontWeight: 400, textAlign: "center", textColor: "#bbbbbb", customText: "Drop your product image here", zIndex: 2 } as any),

    // Bottom brand name
    withDefaults({ id: id("brand"), type: "text", x: 60, y: 1280, width: 960, height: 55, fontSize: 26, fontWeight: 700, textAlign: "center", textColor: "#888888", dataField: "companyName", textTransform: "uppercase", zIndex: 4 } as any),

    // Hashtags very bottom
    withDefaults({ id: id("hashtags"), type: "text", x: 60, y: 1310, width: 960, height: 40, fontSize: 20, fontWeight: 400, textAlign: "center", textColor: "#aaaaaa", dataField: "hashtags", zIndex: 3 }),
  ];
}

// ─────────────────────────────────────────────
// 14) FULL-BLEED HERO + BOTTOM TEXT
//     Full image background, large bold text
//     bottom-left, small brand avatar row
// ─────────────────────────────────────────────
function fullBleedHeroBase(): TemplateShape[] {
  return [
    // Dark bg fallback
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#0a1628", borderWidth: 0, zIndex: 0 }),

    // Full bleed hero image
    withDefaults({ id: id("hero-img"), type: "image", x: 0, y: 0, width: 1080, height: 1350, src: "", fit: "cover", radius: 0, borderWidth: 0, opacity: 1, zIndex: 1 } as any),

    // Top-right badge card
    withDefaults({ id: id("badge-card"), type: "rounded-rect", x: 580, y: 60, width: 460, height: 120, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 0, borderRadius: 20, shadowBlur: 20, shadowX: 0, shadowY: 8, shadowColor: "rgba(0,0,0,0.3)", zIndex: 4 } as any),
    withDefaults({ id: id("badge-title"), type: "text", x: 660, y: 78, width: 360, height: 44, fontSize: 28, fontWeight: 700, textAlign: "left", textColor: "#111111", dataField: "companyName", zIndex: 5 }),
    withDefaults({ id: id("badge-sub"), type: "text", x: 660, y: 122, width: 360, height: 36, fontSize: 22, fontWeight: 400, textAlign: "left", textColor: "#666666", dataField: "subheading", zIndex: 5 }),

    // Bottom dark gradient overlay
    withDefaults({ id: id("gradient-overlay"), type: "rectangle", x: 0, y: 800, width: 1080, height: 550, backgroundColor: "rgba(0,0,0,0.65)", borderWidth: 0, zIndex: 2 }),

    // Big bold headline bottom-left
    withDefaults({ id: id("headline"), type: "text", x: 50, y: 850, width: 980, height: 380, fontSize: 140, fontWeight: 900, textAlign: "left", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "hook", zIndex: 4 }),

    // Bottom brand row background
    withDefaults({ id: id("brand-row-bg"), type: "rectangle", x: 0, y: 1270, width: 1080, height: 80, backgroundColor: "rgba(0,0,0,0.5)", borderWidth: 0, zIndex: 3 }),

    // Brand avatar circle
    withDefaults({ id: id("avatar-circle"), type: "circle", x: 30, y: 1278, width: 64, height: 64, backgroundColor: "#7c3aed", borderColor: "#ffffff", borderWidth: 2, zIndex: 4 }),

    // Brand name
    withDefaults({ id: id("brand-name"), type: "text", x: 110, y: 1290, width: 500, height: 50, fontSize: 30, fontWeight: 700, textAlign: "left", textColor: "#ffffff", dataField: "companyName", zIndex: 5 }),

    // Hashtags right
    withDefaults({ id: id("hashtags"), type: "text", x: 600, y: 1290, width: 440, height: 50, fontSize: 22, fontWeight: 400, textAlign: "right", textColor: "rgba(255,255,255,0.6)", dataField: "hashtags", zIndex: 5 }),
  ];
}

// ─────────────────────────────────────────────
// 15) MASSIVE TYPOGRAPHY HERO
//     Silver/grey gradient bg, enormous black
//     headline filling top 60%, subtext below
//     with accent color keyword highlight
// ─────────────────────────────────────────────
function massiveTypographyBase(): TemplateShape[] {
  return [
    // Silver gradient bg
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#c8c8c8", borderWidth: 0, zIndex: 0 }),
    withDefaults({ id: id("bg-shine"), type: "circle", x: 100, y: -200, width: 900, height: 900, backgroundColor: "rgba(255,255,255,0.4)", borderWidth: 0, zIndex: 1 }),

    // Small top label / category
    withDefaults({ id: id("top-label"), type: "text", x: 60, y: 80, width: 960, height: 60, fontSize: 30, fontWeight: 400, textAlign: "center", textColor: "#555555", dataField: "location", zIndex: 3 }),

    // ENORMOUS headline — fills top half
    withDefaults({ id: id("big-headline"), type: "text", x: 40, y: 140, width: 1000, height: 680, fontSize: 200, fontWeight: 900, textAlign: "center", textColor: "#0a0a0a", fontFamily: "Arial Black", dataField: "hook", zIndex: 3 }),

    // Divider
    withDefaults({ id: id("divider"), type: "rectangle", x: 60, y: 840, width: 960, height: 3, backgroundColor: "rgba(0,0,0,0.12)", borderWidth: 0, zIndex: 2 }),

    // Subheading large — grey
    withDefaults({ id: id("sub-grey"), type: "text", x: 60, y: 870, width: 960, height: 200, fontSize: 48, fontWeight: 400, textAlign: "center", textColor: "#333333", dataField: "subheading", zIndex: 3 }),

    // Accent / highlight text — green keyword
    withDefaults({ id: id("accent-highlight"), type: "text", x: 60, y: 1080, width: 960, height: 160, fontSize: 58, fontWeight: 800, textAlign: "center", textColor: "#16a34a", fontFamily: "Arial Black", dataField: "proof", zIndex: 4 }),

    // Bottom brand
    withDefaults({ id: id("brand"), type: "text", x: 60, y: 1278, width: 960, height: 55, fontSize: 26, fontWeight: 600, textAlign: "center", textColor: "#888888", dataField: "companyName", textTransform: "uppercase", zIndex: 3 } as any),
  ];
}

// ─────────────────────────────────────────────
// 16) OLD WAY vs NEW WAY COMPARISON
//     Dark bg, two side-by-side cards,
//     ❌ list left, ✅ list right, CTA bottom
// ─────────────────────────────────────────────
function comparisonBase(): TemplateShape[] {
  return [
    // Dark navy background
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#0d1117", borderWidth: 0, zIndex: 0 }),

    // Headline top
    withDefaults({ id: id("headline"), type: "text", x: 60, y: 60, width: 960, height: 160, fontSize: 72, fontWeight: 900, textAlign: "center", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "hook", zIndex: 3 }),
    withDefaults({ id: id("sub"), type: "text", x: 60, y: 230, width: 960, height: 80, fontSize: 34, fontWeight: 400, textAlign: "center", textColor: "rgba(255,255,255,0.6)", dataField: "subheading", zIndex: 3 }),

    // ── LEFT CARD — Old Way ──
    withDefaults({ id: id("left-card"), type: "rounded-rect", x: 40, y: 340, width: 478, height: 680, backgroundColor: "#1c2333", borderColor: "#2d3748", borderWidth: 1, borderRadius: 20, zIndex: 2 } as any),
    // Left card header
    withDefaults({ id: id("left-header"), type: "text", x: 60, y: 370, width: 438, height: 50, fontSize: 28, fontWeight: 500, textAlign: "center", textColor: "rgba(255,255,255,0.5)", customText: "Old Way", zIndex: 4 } as any),
    // Left card tag
    withDefaults({ id: id("left-tag"), type: "rounded-rect", x: 100, y: 430, width: 358, height: 60, backgroundColor: "#3b4a6b", borderWidth: 0, borderRadius: 8, zIndex: 3 } as any),
    withDefaults({ id: id("left-tag-text"), type: "text", x: 110, y: 442, width: 338, height: 38, fontSize: 24, fontWeight: 600, textAlign: "center", textColor: "#93c5fd", customText: "Pixel Tracking </>", zIndex: 4 } as any),
    // Left ❌ bullets
    withDefaults({ id: id("left-b1"), type: "text", x: 70, y: 520, width: 430, height: 56, fontSize: 28, fontWeight: 600, textAlign: "left", textColor: "#f87171", customText: "❌  60% Data Blocked", zIndex: 4 } as any),
    withDefaults({ id: id("left-b2"), type: "text", x: 70, y: 590, width: 430, height: 56, fontSize: 28, fontWeight: 600, textAlign: "left", textColor: "#f87171", customText: "❌  42% Accuracy", zIndex: 4 } as any),
    withDefaults({ id: id("left-b3"), type: "text", x: 70, y: 660, width: 430, height: 56, fontSize: 28, fontWeight: 600, textAlign: "left", textColor: "#f87171", customText: "❌  0.4 ROAS", zIndex: 4 } as any),
    withDefaults({ id: id("left-b4"), type: "text", x: 70, y: 730, width: 430, height: 56, fontSize: 28, fontWeight: 600, textAlign: "left", textColor: "#f87171", customText: "❌  Unprofitable Ads", zIndex: 4 } as any),
    withDefaults({ id: id("left-b5"), type: "text", x: 70, y: 800, width: 430, height: 56, fontSize: 28, fontWeight: 600, textAlign: "left", textColor: "#f87171", customText: "❌  Wasted Budget", zIndex: 4 } as any),
    withDefaults({ id: id("left-b6"), type: "text", x: 70, y: 870, width: 430, height: 56, fontSize: 28, fontWeight: 600, textAlign: "left", textColor: "#f87171", customText: "❌  Guesswork Strategy", zIndex: 4 } as any),

    // ── RIGHT CARD — New Way ──
    withDefaults({ id: id("right-card"), type: "rounded-rect", x: 562, y: 340, width: 478, height: 680, backgroundColor: "#0f2b2b", borderColor: "#1a4a4a", borderWidth: 1, borderRadius: 20, zIndex: 2 } as any),
    // Right card header
    withDefaults({ id: id("right-header"), type: "text", x: 582, y: 370, width: 438, height: 50, fontSize: 28, fontWeight: 500, textAlign: "center", textColor: "rgba(255,255,255,0.5)", customText: "New Way", zIndex: 4 } as any),
    // Right card tag — brand name
    withDefaults({ id: id("right-tag"), type: "rounded-rect", x: 622, y: 430, width: 358, height: 60, backgroundColor: "#134e4a", borderWidth: 0, borderRadius: 8, zIndex: 3 } as any),
    withDefaults({ id: id("right-tag-text"), type: "text", x: 632, y: 442, width: 338, height: 38, fontSize: 24, fontWeight: 700, textAlign: "center", textColor: "#34d399", dataField: "companyName", zIndex: 4 }),
    // Right ✅ bullets
    withDefaults({ id: id("right-b1"), type: "text", x: 582, y: 520, width: 440, height: 56, fontSize: 28, fontWeight: 600, textAlign: "left", textColor: "#4ade80", customText: "✅  0% Data Blocked", zIndex: 4 } as any),
    withDefaults({ id: id("right-b2"), type: "text", x: 582, y: 590, width: 440, height: 56, fontSize: 28, fontWeight: 600, textAlign: "left", textColor: "#4ade80", customText: "✅  100% Accuracy", zIndex: 4 } as any),
    withDefaults({ id: id("right-b3"), type: "text", x: 582, y: 660, width: 440, height: 56, fontSize: 28, fontWeight: 600, textAlign: "left", textColor: "#4ade80", customText: "✅  4.9 ROAS", zIndex: 4 } as any),
    withDefaults({ id: id("right-b4"), type: "text", x: 582, y: 730, width: 440, height: 56, fontSize: 28, fontWeight: 600, textAlign: "left", textColor: "#4ade80", customText: "✅  Scalable Ads", zIndex: 4 } as any),
    withDefaults({ id: id("right-b5"), type: "text", x: 582, y: 800, width: 440, height: 56, fontSize: 28, fontWeight: 600, textAlign: "left", textColor: "#4ade80", customText: "✅  Real-Time Data", zIndex: 4 } as any),
    withDefaults({ id: id("right-b6"), type: "text", x: 582, y: 870, width: 440, height: 56, fontSize: 28, fontWeight: 600, textAlign: "left", textColor: "#4ade80", customText: "✅  Proven Strategy", zIndex: 4 } as any),

    // VS badge center
    withDefaults({ id: id("vs-circle"), type: "circle", x: 490, y: 650, width: 100, height: 100, backgroundColor: "#ffffff", borderWidth: 0, shadowBlur: 12, shadowX: 0, shadowY: 4, shadowColor: "rgba(0,0,0,0.4)", zIndex: 5 } as any),
    withDefaults({ id: id("vs-text"), type: "text", x: 490, y: 670, width: 100, height: 60, fontSize: 36, fontWeight: 900, textAlign: "center", textColor: "#111111", customText: "VS", zIndex: 6 } as any),

    // Proof line
    withDefaults({ id: id("proof"), type: "text", x: 60, y: 1060, width: 960, height: 80, fontSize: 32, fontWeight: 500, textAlign: "center", textColor: "rgba(255,255,255,0.6)", dataField: "proof", zIndex: 3 }),

    // CTA button
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 140, y: 1170, width: 800, height: 110, backgroundColor: "#3b82f6", borderWidth: 0, borderRadius: 16, shadowBlur: 20, shadowX: 0, shadowY: 8, shadowColor: "rgba(59,130,246,0.5)", zIndex: 4 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 160, y: 1198, width: 760, height: 58, fontSize: 34, fontWeight: 800, textAlign: "center", textColor: "#ffffff", dataField: "cta", zIndex: 5 }),

    // Hashtags
    withDefaults({ id: id("hashtags"), type: "text", x: 60, y: 1300, width: 960, height: 44, fontSize: 22, fontWeight: 400, textAlign: "center", textColor: "rgba(255,255,255,0.3)", dataField: "hashtags", zIndex: 3 }),
  ];
}

// ─────────────────────────────────────────────
// UNSPLASH URL HELPER
// ─────────────────────────────────────────────
function photoPlaceholder(slot: string): string {
  return `__unsplash__${slot}`;
}
// ─────────────────────────────────────────────
// 17) COLLAGE GRID (Grammarly style)
//     Dark bg, 3 overlapping photo cards,
//     bold headline top, pill CTA bottom
// ─────────────────────────────────────────────
function collageGridBase(): TemplateShape[] {
  return [
    // Dark teal background
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#0d2b22", borderWidth: 0, zIndex: 0 }),

    // TOP LEFT — large portrait photo
    withDefaults({ id: id("photo-left"), type: "image", x: 20, y: 280, width: 580, height: 680, src: photoPlaceholder("photo-left"), fit: "cover", radius: 20, borderWidth: 0, opacity: 1, zIndex: 2 } as any),

    // TOP RIGHT — smaller landscape photo
    withDefaults({ id: id("photo-right"), type: "image", x: 620, y: 280, width: 440, height: 320, src: photoPlaceholder("photo-right"), fit: "cover", radius: 20, borderWidth: 0, opacity: 1, zIndex: 2 } as any),

    // BOTTOM RIGHT — portrait photo overlapping
    withDefaults({ id: id("photo-bottom"), type: "image", x: 520, y: 620, width: 540, height: 540, src: photoPlaceholder("photo-bottom"), fit: "cover", radius: 20, borderWidth: 0, opacity: 1, zIndex: 3 } as any),

    // Dark overlay on bottom for text readability
    withDefaults({ id: id("bottom-overlay"), type: "rectangle", x: 0, y: 1100, width: 1080, height: 250, backgroundColor: "rgba(13,43,34,0.85)", borderWidth: 0, zIndex: 4 }),

    // Headline top
    withDefaults({ id: id("headline"), type: "text", x: 40, y: 60, width: 960, height: 200, fontSize: 82, fontWeight: 900, textAlign: "left", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "hook", zIndex: 5 }),

    // CTA pill button bottom left
    withDefaults({ id: id("cta-pill"), type: "rounded-rect", x: 40, y: 1150, width: 460, height: 90, backgroundColor: "#1db876", borderWidth: 0, borderRadius: 45, shadowBlur: 16, shadowX: 0, shadowY: 6, shadowColor: "rgba(0,0,0,0.4)", zIndex: 6 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 60, y: 1173, width: 420, height: 48, fontSize: 28, fontWeight: 700, textAlign: "center", textColor: "#ffffff", dataField: "cta", zIndex: 7 }),

    // Logo / brand circle bottom right
    withDefaults({ id: id("logo-circle"), type: "circle", x: 940, y: 1148, width: 96, height: 96, backgroundColor: "#ffffff", borderWidth: 0, zIndex: 6 }),
    withDefaults({ id: id("logo-text"), type: "text", x: 940, y: 1172, width: 96, height: 50, fontSize: 38, fontWeight: 900, textAlign: "center", textColor: "#0d2b22", dataField: "companyName", zIndex: 7 }),
  ];
}

// ─────────────────────────────────────────────
// 18) SINGLE HERO PHOTO + OVERLAY TEXT
//     Full bleed real person photo,
//     gradient overlay, text bottom
// ─────────────────────────────────────────────
function singleHeroPhotoBase(): TemplateShape[] {
  return [
    // Full bleed background photo
    withDefaults({ id: id("hero-photo"), type: "image", x: 0, y: 0, width: 1080, height: 1350, src: photoPlaceholder("hero"), fit: "cover", radius: 0, borderWidth: 0, opacity: 1, zIndex: 1 } as any),

    // Gradient overlay bottom 60%
    withDefaults({ id: id("gradient-top"), type: "rectangle", x: 0, y: 0, width: 1080, height: 300, backgroundColor: "rgba(0,0,0,0.4)", borderWidth: 0, zIndex: 2 }),
    withDefaults({ id: id("gradient-bot"), type: "rectangle", x: 0, y: 700, width: 1080, height: 650, backgroundColor: "rgba(0,0,0,0.72)", borderWidth: 0, zIndex: 2 }),

    // Brand top left
    withDefaults({ id: id("brand"), type: "text", x: 50, y: 60, width: 600, height: 60, fontSize: 32, fontWeight: 700, textAlign: "left", textColor: "rgba(255,255,255,0.85)", dataField: "companyName", textTransform: "uppercase", zIndex: 4 } as any),

    // Main headline
    withDefaults({ id: id("headline"), type: "text", x: 50, y: 780, width: 980, height: 280, fontSize: 96, fontWeight: 900, textAlign: "left", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "hook", zIndex: 4 }),

    // Subheading
    withDefaults({ id: id("sub"), type: "text", x: 50, y: 1070, width: 980, height: 100, fontSize: 36, fontWeight: 400, textAlign: "left", textColor: "rgba(255,255,255,0.8)", dataField: "subheading", zIndex: 4 }),

    // CTA pill
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 50, y: 1200, width: 420, height: 90, backgroundColor: "#ffffff", borderWidth: 0, borderRadius: 45, zIndex: 4 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 70, y: 1222, width: 380, height: 48, fontSize: 28, fontWeight: 800, textAlign: "center", textColor: "#111111", dataField: "cta", zIndex: 5 }),
  ];
}

// ─────────────────────────────────────────────
// 19) SPLIT PHOTO + CONTENT
//     Top half real photo, bottom half
//     solid color content block
// ─────────────────────────────────────────────
function splitPhotoContentBase(): TemplateShape[] {
  return [
    // Top photo half
    withDefaults({ id: id("photo"), type: "image", x: 0, y: 0, width: 1080, height: 680, src: photoPlaceholder("photo-left"), fit: "cover", radius: 0, borderWidth: 0, opacity: 1, zIndex: 1 } as any),

    // Bottom content half
    withDefaults({ id: id("content-bg"), type: "rectangle", x: 0, y: 660, width: 1080, height: 690, backgroundColor: "#111827", borderWidth: 0, zIndex: 2 }),

    // Overlap card bridging photo and content
    withDefaults({ id: id("overlap-card"), type: "rounded-rect", x: 60, y: 580, width: 960, height: 160, backgroundColor: "#1d4ed8", borderWidth: 0, borderRadius: 20, shadowBlur: 24, shadowX: 0, shadowY: 10, shadowColor: "rgba(0,0,0,0.5)", zIndex: 3 } as any),
    withDefaults({ id: id("overlap-text"), type: "text", x: 80, y: 618, width: 920, height: 88, fontSize: 44, fontWeight: 800, textAlign: "center", textColor: "#ffffff", dataField: "subheading", zIndex: 4 }),

    // Headline in content block
    withDefaults({ id: id("headline"), type: "text", x: 60, y: 780, width: 960, height: 220, fontSize: 80, fontWeight: 900, textAlign: "left", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "hook", zIndex: 4 }),

    // Bullet list
    withDefaults({ id: id("bullets"), type: "bullet-group", x: 60, y: 1010, width: 960, height: 200, fontSize: 32, fontWeight: 500, textColor: "rgba(255,255,255,0.8)", zIndex: 4 }),

    // CTA
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 60, y: 1230, width: 500, height: 90, backgroundColor: "#1d4ed8", borderWidth: 0, borderRadius: 12, zIndex: 4 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 80, y: 1252, width: 460, height: 48, fontSize: 28, fontWeight: 800, textAlign: "center", textColor: "#ffffff", dataField: "cta", zIndex: 5 }),
  ];
}

// ─────────────────────────────────────────────
// 20) MAGAZINE PHOTO GRID
//     4-photo mosaic layout, brand overlay
// ─────────────────────────────────────────────
function magazinePhotoGridBase(): TemplateShape[] {
  return [
    // White background
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#f8f8f8", borderWidth: 0, zIndex: 0 }),

    // Top full-width photo
    withDefaults({ id: id("photo-top"), type: "image", x: 20, y: 160, width: 1040, height: 420, src: photoPlaceholder("photo-top"), fit: "cover", radius: 16, borderWidth: 0, opacity: 1, zIndex: 2 } as any),

    // Bottom left photo
    withDefaults({ id: id("photo-bl"), type: "image", x: 20, y: 600, width: 500, height: 500, src: photoPlaceholder("photo-left"), fit: "cover", radius: 16, borderWidth: 0, opacity: 1, zIndex: 2 } as any),

    // Bottom right photo
    withDefaults({ id: id("photo-br"), type: "image", x: 540, y: 600, width: 540, height: 500, src: photoPlaceholder("photo-right"), fit: "cover", radius: 16, borderWidth: 0, opacity: 1, zIndex: 2 } as any),

    // Headline top
    withDefaults({ id: id("headline"), type: "text", x: 40, y: 30, width: 1000, height: 120, fontSize: 64, fontWeight: 900, textAlign: "left", textColor: "#111111", fontFamily: "Playfair Display", dataField: "hook", zIndex: 3 }),

    // Bottom content strip
    withDefaults({ id: id("content-strip"), type: "rectangle", x: 0, y: 1118, width: 1080, height: 232, backgroundColor: "#111111", borderWidth: 0, zIndex: 3 }),
    withDefaults({ id: id("strip-text"), type: "text", x: 40, y: 1140, width: 700, height: 80, fontSize: 36, fontWeight: 700, textAlign: "left", textColor: "#ffffff", dataField: "subheading", zIndex: 4 }),
    withDefaults({ id: id("strip-brand"), type: "text", x: 40, y: 1228, width: 500, height: 50, fontSize: 24, fontWeight: 400, textAlign: "left", textColor: "rgba(255,255,255,0.5)", dataField: "companyName", textTransform: "uppercase", zIndex: 4 } as any),

    // CTA pill right
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 720, y: 1158, width: 320, height: 80, backgroundColor: "#ffffff", borderWidth: 0, borderRadius: 40, zIndex: 4 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 740, y: 1178, width: 280, height: 44, fontSize: 24, fontWeight: 800, textAlign: "center", textColor: "#111111", dataField: "cta", zIndex: 5 }),
  ];
}

// ─────────────────────────────────────────────
// 21) BOLD QUOTE / THOUGHT LEADER
//     Large portrait photo left, bold quote
//     right with accent color, clean white bg
// ─────────────────────────────────────────────
function thoughtLeaderBase(): TemplateShape[] {
  return [
    // Clean white background
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#ffffff", borderWidth: 0, zIndex: 0 }),

    // Accent color block left behind photo
    withDefaults({ id: id("accent-block"), type: "rectangle", x: 0, y: 0, width: 480, height: 1350, backgroundColor: "#0f172a", borderWidth: 0, zIndex: 1 }),

    // Large portrait photo left
    withDefaults({ id: id("portrait-photo"), type: "image", x: 0, y: 0, width: 540, height: 1350, src: photoPlaceholder("photo-left"), fit: "cover", radius: 0, borderWidth: 0, opacity: 1, zIndex: 2 } as any),

    // Subtle gradient over photo bottom
    withDefaults({ id: id("photo-fade"), type: "rectangle", x: 0, y: 900, width: 540, height: 450, backgroundColor: "rgba(15,23,42,0.7)", borderWidth: 0, zIndex: 3 }),

    // Big quote mark accent
    withDefaults({ id: id("quote-mark"), type: "text", x: 560, y: 60, width: 460, height: 200, fontSize: 280, fontWeight: 900, textAlign: "left", textColor: "rgba(99,102,241,0.15)", fontFamily: "Georgia", customText: "\u201C", zIndex: 2 } as any),

    // Quote / hook text right side
    withDefaults({ id: id("quote-text"), type: "text", x: 580, y: 160, width: 460, height: 560, fontSize: 62, fontWeight: 800, textAlign: "left", textColor: "#0f172a", fontFamily: "Playfair Display", dataField: "hook", zIndex: 4 }),

    // Accent line
    withDefaults({ id: id("accent-line"), type: "rectangle", x: 580, y: 750, width: 80, height: 6, backgroundColor: "#6366f1", borderWidth: 0, zIndex: 4 }),

    // Subheading
    withDefaults({ id: id("sub"), type: "text", x: 580, y: 780, width: 460, height: 160, fontSize: 32, fontWeight: 400, textAlign: "left", textColor: "#475569", fontFamily: "Georgia", dataField: "subheading", zIndex: 4 }),

    // Company name
    withDefaults({ id: id("company"), type: "text", x: 580, y: 960, width: 460, height: 60, fontSize: 26, fontWeight: 700, textAlign: "left", textColor: "#6366f1", dataField: "companyName", textTransform: "uppercase", zIndex: 4 } as any),

    // Proof stat box
    withDefaults({ id: id("stat-box"), type: "rounded-rect", x: 580, y: 1040, width: 460, height: 140, backgroundColor: "#f1f5f9", borderWidth: 0, borderRadius: 16, zIndex: 3 } as any),
    withDefaults({ id: id("stat-text"), type: "text", x: 600, y: 1062, width: 420, height: 100, fontSize: 30, fontWeight: 600, textAlign: "left", textColor: "#334155", dataField: "proof", zIndex: 4 }),

    // CTA bottom right
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 580, y: 1220, width: 460, height: 90, backgroundColor: "#6366f1", borderWidth: 0, borderRadius: 12, shadowBlur: 20, shadowX: 0, shadowY: 8, shadowColor: "rgba(99,102,241,0.4)", zIndex: 4 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 600, y: 1242, width: 420, height: 50, fontSize: 28, fontWeight: 800, textAlign: "center", textColor: "#ffffff", dataField: "cta", zIndex: 5 }),

    // Bottom left photo overlay text
    withDefaults({ id: id("photo-brand"), type: "text", x: 30, y: 1260, width: 480, height: 60, fontSize: 26, fontWeight: 600, textAlign: "left", textColor: "rgba(255,255,255,0.7)", dataField: "location", zIndex: 4 }),
  ];
}

// ─────────────────────────────────────────────
// 22) LIFESTYLE PRODUCT SHOWCASE
//     3 stacked photos with bold text overlays,
//     vibrant color accents, Instagram feel
// ─────────────────────────────────────────────
function lifestyleShowcaseBase(): TemplateShape[] {
  return [
    // Off-white background
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#fafaf8", borderWidth: 0, zIndex: 0 }),

    // Top large hero photo
    withDefaults({ id: id("photo-hero"), type: "image", x: 0, y: 0, width: 1080, height: 560, src: photoPlaceholder("photo-top"), fit: "cover", radius: 0, borderWidth: 0, opacity: 1, zIndex: 1 } as any),

    // Dark overlay on hero photo
    withDefaults({ id: id("hero-overlay"), type: "rectangle", x: 0, y: 0, width: 1080, height: 560, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 0, zIndex: 2 }),

    // Hero headline on photo
    withDefaults({ id: id("hero-headline"), type: "text", x: 50, y: 160, width: 980, height: 280, fontSize: 110, fontWeight: 900, textAlign: "left", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "hook", textTransform: "uppercase", zIndex: 3 } as any),

    // Two bottom photos side by side
    withDefaults({ id: id("photo-bl"), type: "image", x: 0, y: 576, width: 524, height: 480, src: photoPlaceholder("photo-bl"), fit: "cover", radius: 0, borderWidth: 0, opacity: 1, zIndex: 1 } as any),
    withDefaults({ id: id("photo-br"), type: "image", x: 556, y: 576, width: 524, height: 480, src: photoPlaceholder("photo-br"), fit: "cover", radius: 0, borderWidth: 0, opacity: 1, zIndex: 1 } as any),

    // Gap between bottom photos
    withDefaults({ id: id("gap"), type: "rectangle", x: 520, y: 576, width: 40, height: 480, backgroundColor: "#fafaf8", borderWidth: 0, zIndex: 2 }),

    // Bottom left photo label
    withDefaults({ id: id("label-left"), type: "rectangle", x: 0, y: 956, width: 524, height: 100, backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 0, zIndex: 3 }),
    withDefaults({ id: id("label-left-text"), type: "text", x: 20, y: 970, width: 484, height: 72, fontSize: 30, fontWeight: 700, textAlign: "left", textColor: "#ffffff", dataField: "subheading", zIndex: 4 }),

    // Bottom right photo label
    withDefaults({ id: id("label-right"), type: "rectangle", x: 556, y: 956, width: 524, height: 100, backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 0, zIndex: 3 }),
    withDefaults({ id: id("label-right-text"), type: "text", x: 576, y: 970, width: 484, height: 72, fontSize: 30, fontWeight: 700, textAlign: "left", textColor: "#ffffff", dataField: "proof", zIndex: 4 }),

    // Bottom content strip
    withDefaults({ id: id("strip"), type: "rectangle", x: 0, y: 1072, width: 1080, height: 278, backgroundColor: "#111111", borderWidth: 0, zIndex: 2 }),

    // Strip headline
    withDefaults({ id: id("strip-headline"), type: "text", x: 50, y: 1096, width: 700, height: 90, fontSize: 42, fontWeight: 800, textAlign: "left", textColor: "#ffffff", dataField: "companyName", zIndex: 4 }),

    // Strip sub
    withDefaults({ id: id("strip-sub"), type: "text", x: 50, y: 1188, width: 700, height: 60, fontSize: 26, fontWeight: 400, textAlign: "left", textColor: "rgba(255,255,255,0.6)", dataField: "hashtags", zIndex: 4 }),

    // CTA pill strip right
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 760, y: 1120, width: 280, height: 80, backgroundColor: "#f59e0b", borderWidth: 0, borderRadius: 40, zIndex: 4 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 780, y: 1140, width: 240, height: 44, fontSize: 24, fontWeight: 800, textAlign: "center", textColor: "#111111", dataField: "cta", zIndex: 5 }),
  ];
}

// ─────────────────────────────────────────────
// 23) DARK EDITORIAL FEATURE
//     Moody full-bleed photo, horizontal
//     text bands, magazine cover energy
// ─────────────────────────────────────────────
function darkEditorialBase(): TemplateShape[] {
  return [
    // Dark fallback bg
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#080808", borderWidth: 0, zIndex: 0 }),

    // Full bleed moody photo — center focus
    withDefaults({ id: id("main-photo"), type: "image", x: 0, y: 0, width: 1080, height: 1350, src: photoPlaceholder("photo-left"), fit: "cover", radius: 0, borderWidth: 0, opacity: 0.7, zIndex: 1 } as any),

    // Top dark band
    withDefaults({ id: id("band-top"), type: "rectangle", x: 0, y: 0, width: 1080, height: 180, backgroundColor: "rgba(8,8,8,0.88)", borderWidth: 0, zIndex: 2 }),

    // Bottom dark band
    withDefaults({ id: id("band-bot"), type: "rectangle", x: 0, y: 880, width: 1080, height: 470, backgroundColor: "rgba(8,8,8,0.88)", borderWidth: 0, zIndex: 2 }),

    // Top band — issue / category label
    withDefaults({ id: id("issue-label"), type: "text", x: 50, y: 30, width: 500, height: 50, fontSize: 24, fontWeight: 400, textAlign: "left", textColor: "rgba(255,255,255,0.5)", dataField: "location", textTransform: "uppercase", zIndex: 4 } as any),

    // Top band — company name right
    withDefaults({ id: id("brand-top"), type: "text", x: 550, y: 30, width: 480, height: 50, fontSize: 24, fontWeight: 700, textAlign: "right", textColor: "#ffffff", dataField: "companyName", textTransform: "uppercase", zIndex: 4 } as any),

    // Top rule line
    withDefaults({ id: id("rule-top"), type: "rectangle", x: 50, y: 90, width: 980, height: 1, backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 0, zIndex: 3 }),

    // Top band — subheading tag
    withDefaults({ id: id("tag"), type: "text", x: 50, y: 108, width: 980, height: 60, fontSize: 28, fontWeight: 300, textAlign: "left", textColor: "rgba(255,255,255,0.6)", fontFamily: "Georgia", dataField: "subheading", zIndex: 4 }),

    // Main HUGE headline in bottom band
    withDefaults({ id: id("headline"), type: "text", x: 50, y: 900, width: 980, height: 300, fontSize: 118, fontWeight: 900, textAlign: "left", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "hook", zIndex: 4 }),

    // Accent color rule before proof
    withDefaults({ id: id("accent-rule"), type: "rectangle", x: 50, y: 1218, width: 60, height: 5, backgroundColor: "#ef4444", borderWidth: 0, zIndex: 4 }),

    // Proof line
    withDefaults({ id: id("proof"), type: "text", x: 50, y: 1236, width: 700, height: 60, fontSize: 28, fontWeight: 400, textAlign: "left", textColor: "rgba(255,255,255,0.7)", fontFamily: "Georgia", dataField: "proof", zIndex: 4 }),

    // CTA right side bottom
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 756, y: 1236, width: 280, height: 60, backgroundColor: "#ef4444", borderWidth: 0, borderRadius: 6, zIndex: 4 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 776, y: 1250, width: 240, height: 36, fontSize: 22, fontWeight: 800, textAlign: "center", textColor: "#ffffff", dataField: "cta", textTransform: "uppercase", zIndex: 5 } as any),

    // Bottom hashtags
    withDefaults({ id: id("hashtags"), type: "text", x: 50, y: 1308, width: 980, height: 40, fontSize: 20, fontWeight: 400, textAlign: "left", textColor: "rgba(255,255,255,0.3)", dataField: "hashtags", zIndex: 4 }),
  ];
}

// ─────────────────────────────────────────────
// ✨ CLIPDROP TEMPLATES
// These use AI background removal/replacement
// Credits used: 1 per image slot processed
// ─────────────────────────────────────────────

function cdProductFloatBase(): TemplateShape[] {
  return [
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#c084fc", borderWidth: 0, zIndex: 0 }),
    withDefaults({ id: id("glow"), type: "circle", x: 190, y: 340, width: 700, height: 700, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 0, zIndex: 1 }),
    withDefaults({ id: id("headline"), type: "text", x: 60, y: 60, width: 960, height: 160, fontSize: 82, fontWeight: 900, textAlign: "left", textColor: "#1e0030", fontFamily: "Arial Black", dataField: "hook", zIndex: 4 }),
    withDefaults({ id: id("sub"), type: "text", x: 60, y: 230, width: 700, height: 80, fontSize: 38, fontWeight: 400, textAlign: "left", textColor: "rgba(30,0,48,0.75)", fontFamily: "Georgia", dataField: "subheading", zIndex: 4 }),

    // ✨ CLIPDROP — bg removed, floats on color
    withDefaults({ id: id("product-cutout"), type: "image", x: 190, y: 360, width: 700, height: 700, src: clipdropPhoto("product-cutout"), fit: "contain", radius: 0, borderWidth: 0, opacity: 1, zIndex: 3 } as any),

    withDefaults({ id: id("ann1-line"), type: "line", x: 160, y: 480, width: 180, height: 0, borderColor: "#1e0030", lineWidth: 2, lineDash: [], zIndex: 4 } as any),
    withDefaults({ id: id("ann1-text"), type: "text", x: 20, y: 440, width: 260, height: 80, fontSize: 26, fontWeight: 500, textAlign: "left", textColor: "#1e0030", customText: "Good for your health", zIndex: 5 } as any),
    withDefaults({ id: id("ann2-line"), type: "line", x: 740, y: 460, width: 160, height: 0, borderColor: "#1e0030", lineWidth: 2, lineDash: [], zIndex: 4 } as any),
    withDefaults({ id: id("ann2-text"), type: "text", x: 760, y: 420, width: 280, height: 80, fontSize: 26, fontWeight: 500, textAlign: "left", textColor: "#1e0030", customText: "Scientifically proven", zIndex: 5 } as any),
    withDefaults({ id: id("ann3-text"), type: "text", x: 760, y: 900, width: 280, height: 80, fontSize: 26, fontWeight: 500, textAlign: "left", textColor: "#1e0030", dataField: "proof", zIndex: 5 }),
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 140, y: 1180, width: 800, height: 110, backgroundColor: "#1e0030", borderWidth: 0, borderRadius: 55, zIndex: 5 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 160, y: 1210, width: 760, height: 55, fontSize: 32, fontWeight: 800, textAlign: "center", textColor: "#ffffff", dataField: "cta", zIndex: 6 }),
    withDefaults({ id: id("hashtags"), type: "text", x: 60, y: 1310, width: 960, height: 40, fontSize: 22, fontWeight: 400, textAlign: "center", textColor: "rgba(30,0,48,0.5)", dataField: "hashtags", zIndex: 4 }),
  ];
}

function cdStatsShowcaseBase(): TemplateShape[] {
  return [
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#f43f5e", borderWidth: 0, zIndex: 0 }),
    withDefaults({ id: id("left-panel"), type: "rectangle", x: 0, y: 0, width: 560, height: 1350, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 0, zIndex: 1 }),

    // ✨ CLIPDROP — product floated right, bg removed
    withDefaults({ id: id("product-cutout"), type: "image", x: 460, y: 100, width: 680, height: 900, src: clipdropPhoto("product-float"), fit: "contain", radius: 0, borderWidth: 0, opacity: 1, zIndex: 3 } as any),

    withDefaults({ id: id("stat1-num"), type: "text", x: 50, y: 120, width: 420, height: 200, fontSize: 160, fontWeight: 900, textAlign: "left", textColor: "#ffffff", fontFamily: "Arial Black", customText: "40G", zIndex: 4 } as any),
    withDefaults({ id: id("stat1-label"), type: "text", x: 50, y: 310, width: 420, height: 60, fontSize: 34, fontWeight: 500, textAlign: "left", textColor: "rgba(255,255,255,0.8)", customText: "protein per serving", zIndex: 4 } as any),
    withDefaults({ id: id("stat2-num"), type: "text", x: 50, y: 420, width: 420, height: 180, fontSize: 140, fontWeight: 900, textAlign: "left", textColor: "#ffffff", fontFamily: "Arial Black", customText: "100%", zIndex: 4 } as any),
    withDefaults({ id: id("stat2-label"), type: "text", x: 50, y: 590, width: 420, height: 60, fontSize: 34, fontWeight: 500, textAlign: "left", textColor: "rgba(255,255,255,0.8)", customText: "plant-based", zIndex: 4 } as any),
    withDefaults({ id: id("stat3-num"), type: "text", x: 50, y: 700, width: 420, height: 160, fontSize: 130, fontWeight: 900, textAlign: "left", textColor: "#ffffff", fontFamily: "Arial Black", customText: "27", zIndex: 4 } as any),
    withDefaults({ id: id("stat3-label"), type: "text", x: 50, y: 850, width: 420, height: 60, fontSize: 30, fontWeight: 500, textAlign: "left", textColor: "rgba(255,255,255,0.8)", customText: "vitamins & minerals", zIndex: 4 } as any),
    withDefaults({ id: id("stat4-num"), type: "text", x: 50, y: 950, width: 420, height: 160, fontSize: 130, fontWeight: 900, textAlign: "left", textColor: "#ffffff", fontFamily: "Arial Black", customText: "300", zIndex: 4 } as any),
    withDefaults({ id: id("stat4-label"), type: "text", x: 50, y: 1100, width: 420, height: 60, fontSize: 30, fontWeight: 500, textAlign: "left", textColor: "rgba(255,255,255,0.8)", customText: "calories only", zIndex: 4 } as any),
    withDefaults({ id: id("headline"), type: "text", x: 50, y: 1180, width: 960, height: 90, fontSize: 48, fontWeight: 900, textAlign: "left", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "hook", textTransform: "uppercase", zIndex: 5 } as any),
    withDefaults({ id: id("cta-strip"), type: "rectangle", x: 0, y: 1280, width: 1080, height: 70, backgroundColor: "#ffffff", borderWidth: 0, zIndex: 5 }),
    withDefaults({ id: id("cta-text"), type: "text", x: 40, y: 1294, width: 1000, height: 44, fontSize: 28, fontWeight: 800, textAlign: "center", textColor: "#f43f5e", dataField: "cta", textTransform: "uppercase", zIndex: 6 } as any),
  ];
}

function cdBrandVsBase(): TemplateShape[] {
  return [
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#064e3b", borderWidth: 0, zIndex: 0 }),
    withDefaults({ id: id("glow"), type: "circle", x: 190, y: 60, width: 700, height: 700, backgroundColor: "rgba(16,185,129,0.12)", borderWidth: 0, zIndex: 1 }),
    withDefaults({ id: id("brand"), type: "text", x: 60, y: 60, width: 500, height: 80, fontSize: 56, fontWeight: 900, textAlign: "left", textColor: "#ffffff", fontFamily: "Arial", dataField: "companyName", zIndex: 4 }),
    withDefaults({ id: id("vs-label"), type: "text", x: 580, y: 68, width: 200, height: 60, fontSize: 36, fontWeight: 300, textAlign: "left", textColor: "rgba(255,255,255,0.4)", customText: "vs.", zIndex: 4 } as any),
    withDefaults({ id: id("competitor"), type: "text", x: 720, y: 60, width: 320, height: 80, fontSize: 52, fontWeight: 900, textAlign: "right", textColor: "rgba(255,255,255,0.3)", dataField: "location", zIndex: 4 }),

    // ✨ CLIPDROP — product center, bg removed
    withDefaults({ id: id("product-cutout"), type: "image", x: 240, y: 160, width: 600, height: 560, src: clipdropPhoto("product-cutout"), fit: "contain", radius: 0, borderWidth: 0, opacity: 1, zIndex: 3 } as any),

    withDefaults({ id: id("divider"), type: "rectangle", x: 60, y: 750, width: 960, height: 2, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 0, zIndex: 3 }),
    withDefaults({ id: id("headline"), type: "text", x: 60, y: 780, width: 960, height: 120, fontSize: 58, fontWeight: 900, textAlign: "center", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "hook", zIndex: 4 }),
    withDefaults({ id: id("bad-card"), type: "rounded-rect", x: 60, y: 920, width: 440, height: 340, backgroundColor: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderRadius: 16, zIndex: 3 } as any),
    withDefaults({ id: id("bad-title"), type: "text", x: 80, y: 940, width: 400, height: 50, fontSize: 24, fontWeight: 500, textAlign: "center", textColor: "rgba(255,255,255,0.4)", customText: "The Old Way", zIndex: 4 } as any),
    withDefaults({ id: id("bad-b1"), type: "text", x: 80, y: 1000, width: 400, height: 52, fontSize: 26, fontWeight: 600, textAlign: "left", textColor: "#f87171", customText: "❌  Slow and manual", zIndex: 4 } as any),
    withDefaults({ id: id("bad-b2"), type: "text", x: 80, y: 1060, width: 400, height: 52, fontSize: 26, fontWeight: 600, textAlign: "left", textColor: "#f87171", customText: "❌  Heavy and expensive", zIndex: 4 } as any),
    withDefaults({ id: id("bad-b3"), type: "text", x: 80, y: 1120, width: 400, height: 52, fontSize: 26, fontWeight: 600, textAlign: "left", textColor: "#f87171", customText: "❌  No smart features", zIndex: 4 } as any),
    withDefaults({ id: id("bad-b4"), type: "text", x: 80, y: 1180, width: 400, height: 52, fontSize: 26, fontWeight: 600, textAlign: "left", textColor: "#f87171", customText: "❌  Wastes your time", zIndex: 4 } as any),
    withDefaults({ id: id("good-card"), type: "rounded-rect", x: 580, y: 920, width: 440, height: 340, backgroundColor: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.3)", borderWidth: 1, borderRadius: 16, zIndex: 3 } as any),
    withDefaults({ id: id("good-title"), type: "text", x: 600, y: 940, width: 400, height: 50, fontSize: 24, fontWeight: 500, textAlign: "center", textColor: "rgba(255,255,255,0.5)", dataField: "companyName", zIndex: 4 }),
    withDefaults({ id: id("good-b1"), type: "text", x: 600, y: 1000, width: 400, height: 52, fontSize: 26, fontWeight: 600, textAlign: "left", textColor: "#4ade80", customText: "✅  Fast and automated", zIndex: 4 } as any),
    withDefaults({ id: id("good-b2"), type: "text", x: 600, y: 1060, width: 400, height: 52, fontSize: 26, fontWeight: 600, textAlign: "left", textColor: "#4ade80", customText: "✅  Lightweight design", zIndex: 4 } as any),
    withDefaults({ id: id("good-b3"), type: "text", x: 600, y: 1120, width: 400, height: 52, fontSize: 26, fontWeight: 600, textAlign: "left", textColor: "#4ade80", customText: "✅  AI-powered smart", zIndex: 4 } as any),
    withDefaults({ id: id("good-b4"), type: "text", x: 600, y: 1180, width: 400, height: 52, fontSize: 26, fontWeight: 600, textAlign: "left", textColor: "#4ade80", customText: "✅  Saves hours daily", zIndex: 4 } as any),
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 140, y: 1278, width: 800, height: 66, backgroundColor: "#10b981", borderWidth: 0, borderRadius: 33, zIndex: 5 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 160, y: 1295, width: 760, height: 36, fontSize: 26, fontWeight: 800, textAlign: "center", textColor: "#ffffff", dataField: "cta", zIndex: 6 }),
  ];
}

function cdPersonHeroBase(): TemplateShape[] {
  return [
    // Solid gradient bg
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#0f172a", borderWidth: 0, zIndex: 0 }),
    withDefaults({ id: id("bg-glow"), type: "circle", x: 100, y: 600, width: 880, height: 880, backgroundColor: "rgba(99,102,241,0.2)", borderWidth: 0, zIndex: 1 }),

    // ✨ CLIPDROP — person cutout, bg removed, placed right
    withDefaults({ id: id("person-cutout"), type: "image", x: 400, y: 200, width: 680, height: 1000, src: clipdropPhoto("person-cutout"), fit: "contain", radius: 0, borderWidth: 0, opacity: 1, zIndex: 3 } as any),

    // Content left side
    withDefaults({ id: id("tag"), type: "rounded-rect", x: 50, y: 120, width: 280, height: 56, backgroundColor: "#6366f1", borderWidth: 0, borderRadius: 28, zIndex: 4 } as any),
    withDefaults({ id: id("tag-text"), type: "text", x: 70, y: 134, width: 240, height: 32, fontSize: 22, fontWeight: 700, textAlign: "center", textColor: "#ffffff", dataField: "location", textTransform: "uppercase", zIndex: 5 } as any),
    withDefaults({ id: id("headline"), type: "text", x: 50, y: 210, width: 600, height: 420, fontSize: 96, fontWeight: 900, textAlign: "left", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "hook", zIndex: 4 }),
    withDefaults({ id: id("sub"), type: "text", x: 50, y: 650, width: 520, height: 140, fontSize: 34, fontWeight: 400, textAlign: "left", textColor: "rgba(255,255,255,0.7)", dataField: "subheading", zIndex: 4 }),
    withDefaults({ id: id("proof-box"), type: "rounded-rect", x: 50, y: 810, width: 420, height: 100, backgroundColor: "rgba(99,102,241,0.2)", borderColor: "rgba(99,102,241,0.4)", borderWidth: 1, borderRadius: 12, zIndex: 3 } as any),
    withDefaults({ id: id("proof-text"), type: "text", x: 70, y: 832, width: 380, height: 60, fontSize: 26, fontWeight: 600, textAlign: "left", textColor: "#a5b4fc", dataField: "proof", zIndex: 4 }),
    withDefaults({ id: id("bullets"), type: "bullet-group", x: 50, y: 940, width: 500, height: 240, fontSize: 28, fontWeight: 500, textColor: "rgba(255,255,255,0.8)", zIndex: 4 }),
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 50, y: 1210, width: 420, height: 100, backgroundColor: "#6366f1", borderWidth: 0, borderRadius: 50, shadowBlur: 20, shadowX: 0, shadowY: 8, shadowColor: "rgba(99,102,241,0.5)", zIndex: 5 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 70, y: 1238, width: 380, height: 50, fontSize: 28, fontWeight: 800, textAlign: "center", textColor: "#ffffff", dataField: "cta", zIndex: 6 }),
  ];
}

function cdLifestyleSceneBase(): TemplateShape[] {
  return [
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#fef3c7", borderWidth: 0, zIndex: 0 }),

    // ✨ CLIPDROP replace-bg — lifestyle photo with AI-replaced clean scene
    withDefaults({ id: id("photo-lifestyle"), type: "image", x: 0, y: 300, width: 1080, height: 740, src: clipdropPhoto("lifestyle-scene"), fit: "cover", radius: 0, borderWidth: 0, opacity: 1, zIndex: 2 } as any),

    // Top content
    withDefaults({ id: id("brand"), type: "text", x: 60, y: 50, width: 960, height: 70, fontSize: 38, fontWeight: 700, textAlign: "center", textColor: "#92400e", dataField: "companyName", zIndex: 4 }),
    withDefaults({ id: id("headline"), type: "text", x: 60, y: 130, width: 960, height: 160, fontSize: 76, fontWeight: 900, textAlign: "center", textColor: "#111111", fontFamily: "Playfair Display", dataField: "hook", zIndex: 4 }),

    // Bottom content strip
    withDefaults({ id: id("strip"), type: "rectangle", x: 0, y: 1050, width: 1080, height: 300, backgroundColor: "#111111", borderWidth: 0, zIndex: 3 }),
    withDefaults({ id: id("strip-sub"), type: "text", x: 60, y: 1076, width: 960, height: 80, fontSize: 34, fontWeight: 400, textAlign: "center", textColor: "rgba(255,255,255,0.75)", dataField: "subheading", zIndex: 4 }),
    withDefaults({ id: id("proof"), type: "text", x: 60, y: 1162, width: 960, height: 60, fontSize: 26, fontWeight: 400, textAlign: "center", textColor: "rgba(255,255,255,0.5)", dataField: "proof", zIndex: 4 }),
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 240, y: 1240, width: 600, height: 88, backgroundColor: "#f59e0b", borderWidth: 0, borderRadius: 44, zIndex: 5 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 260, y: 1262, width: 560, height: 48, fontSize: 28, fontWeight: 800, textAlign: "center", textColor: "#111111", dataField: "cta", zIndex: 6 }),
  ];
}

// ─────────────────────────────────────────────
// 27) SAMSUNG-STYLE LIFESTYLE HERO
//     Full bleed person photo, bold headline
//     top center, product name subtitle,
//     disclaimer bottom left
// ─────────────────────────────────────────────
function lifestyleHeroBase(): TemplateShape[] {
  return [
    // Soft grey-blue gradient background — visible behind cutout person
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#c8cdd6", borderWidth: 0, zIndex: 0 }),

    // Subtle radial glow center — gives Samsung's soft vignette feel
    withDefaults({ id: id("bg-glow"), type: "circle", x: 90, y: 200, width: 900, height: 1000, backgroundColor: "rgba(255,255,255,0.35)", borderWidth: 0, zIndex: 1 }),

    // Bottom darker gradient — grounds the person
    withDefaults({ id: id("bg-bottom"), type: "rectangle", x: 0, y: 900, width: 1080, height: 450, backgroundColor: "rgba(100,110,130,0.4)", borderWidth: 0, zIndex: 2 }),

    // PERSON CUTOUT — bg removed, floats over gradient
    // Using __clipdrop__ prefix triggers removeBackground() automatically
    withDefaults({ id: id("hero-cutout"), type: "image", x: 0, y: 0, width: 1080, height: 1350, src: clipdropPhoto("hero-cutout"), fit: "cover", radius: 0, borderWidth: 0, opacity: 1, zIndex: 3 } as any),

    // Headline top center — on top of person
    withDefaults({ id: id("headline"), type: "text", x: 60, y: 60, width: 960, height: 260, fontSize: 96, fontWeight: 800, textAlign: "center", textColor: "#ffffff", fontFamily: "Arial", dataField: "hook", shadowBlur: 12, shadowX: 0, shadowY: 4, shadowColor: "rgba(0,0,0,0.3)", zIndex: 5 }),

    // Product name subtitle
    withDefaults({ id: id("product-name"), type: "text", x: 60, y: 330, width: 960, height: 70, fontSize: 42, fontWeight: 600, textAlign: "center", textColor: "#ffffff", fontFamily: "Arial", dataField: "companyName", shadowBlur: 8, shadowX: 0, shadowY: 3, shadowColor: "rgba(0,0,0,0.25)", zIndex: 5 }),

    // Subheading below headline
    withDefaults({ id: id("sub"), type: "text", x: 60, y: 410, width: 960, height: 70, fontSize: 34, fontWeight: 400, textAlign: "center", textColor: "rgba(255,255,255,0.85)", dataField: "subheading", shadowBlur: 6, shadowX: 0, shadowY: 2, shadowColor: "rgba(0,0,0,0.2)", zIndex: 5 }),

    // CTA pill — bottom center, above person's body
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 240, y: 1180, width: 600, height: 96, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 0, borderRadius: 48, shadowBlur: 24, shadowX: 0, shadowY: 10, shadowColor: "rgba(0,0,0,0.3)", zIndex: 6 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 260, y: 1206, width: 560, height: 48, fontSize: 30, fontWeight: 800, textAlign: "center", textColor: "#111111", dataField: "cta", zIndex: 7 }),

    // Disclaimer bottom left
    withDefaults({ id: id("disclaimer"), type: "text", x: 40, y: 1300, width: 700, height: 44, fontSize: 18, fontWeight: 400, textAlign: "left", textColor: "rgba(255,255,255,0.5)", customText: "*Image simulated for illustrative purposes.", zIndex: 5 } as any),
  ];
}
// ─────────────────────────────────────────────
// 28) PRODUCT CUTOUT + ABSTRACT BG
//     Soft gradient bg, product PNG cutout
//     center-left, abstract wave/particle
//     effects right, headline top
// ─────────────────────────────────────────────
function productAbstractBase(): TemplateShape[] {
  return [
    // Soft lavender/grey gradient bg
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#e8e4f0", borderWidth: 0, zIndex: 0 }),

    // Gradient glow blob left
    withDefaults({ id: id("glow-left"), type: "circle", x: -200, y: 400, width: 900, height: 900, backgroundColor: "rgba(168,85,247,0.15)", borderWidth: 0, zIndex: 1 }),

    // Gradient glow blob right
    withDefaults({ id: id("glow-right"), type: "circle", x: 500, y: 200, width: 800, height: 800, backgroundColor: "rgba(99,102,241,0.12)", borderWidth: 0, zIndex: 1 }),

    // Abstract wave shape — faked with rotated rounded rect
    withDefaults({ id: id("wave1"), type: "rounded-rect", x: 200, y: 500, width: 700, height: 400, backgroundColor: "transparent", borderColor: "rgba(168,85,247,0.4)", borderWidth: 3, borderRadius: 200, rotation: -20, zIndex: 2 } as any),
    withDefaults({ id: id("wave2"), type: "rounded-rect", x: 280, y: 580, width: 600, height: 360, backgroundColor: "transparent", borderColor: "rgba(99,102,241,0.3)", borderWidth: 2, borderRadius: 180, rotation: -20, zIndex: 2 } as any),

    // Particle dots right side
    withDefaults({ id: id("dot1"), type: "circle", x: 820, y: 380, width: 28, height: 28, backgroundColor: "#a855f7", borderWidth: 0, opacity: 0.8, zIndex: 3 }),
    withDefaults({ id: id("dot2"), type: "circle", x: 900, y: 440, width: 18, height: 18, backgroundColor: "#818cf8", borderWidth: 0, opacity: 0.7, zIndex: 3 }),
    withDefaults({ id: id("dot3"), type: "circle", x: 960, y: 520, width: 22, height: 22, backgroundColor: "#60a5fa", borderWidth: 0, opacity: 0.6, zIndex: 3 }),
    withDefaults({ id: id("dot4"), type: "circle", x: 870, y: 600, width: 14, height: 14, backgroundColor: "#a855f7", borderWidth: 0, opacity: 0.5, zIndex: 3 }),
    withDefaults({ id: id("dot5"), type: "circle", x: 1000, y: 680, width: 30, height: 30, backgroundColor: "#818cf8", borderWidth: 0, opacity: 0.4, zIndex: 3 }),
    withDefaults({ id: id("dot6"), type: "circle", x: 820, y: 760, width: 12, height: 12, backgroundColor: "#60a5fa", borderWidth: 0, opacity: 0.6, zIndex: 3 }),
    withDefaults({ id: id("dot7"), type: "circle", x: 940, y: 820, width: 20, height: 20, backgroundColor: "#a855f7", borderWidth: 0, opacity: 0.5, zIndex: 3 }),

    // PRODUCT CUTOUT — center, slightly left
    withDefaults({ id: id("product-cutout"), type: "image", x: 140, y: 400, width: 680, height: 680, src: clipdropPhoto("product-cutout"), fit: "contain", radius: 0, borderWidth: 0, opacity: 1, zIndex: 4 } as any),

    // Headline top center
    withDefaults({ id: id("headline"), type: "text", x: 60, y: 60, width: 960, height: 220, fontSize: 80, fontWeight: 800, textAlign: "center", textColor: "#1e1b4b", fontFamily: "Arial", dataField: "hook", zIndex: 5 }),

    // Product name subtitle
    withDefaults({ id: id("product-name"), type: "text", x: 60, y: 290, width: 960, height: 70, fontSize: 38, fontWeight: 600, textAlign: "center", textColor: "#4c1d95", fontFamily: "Arial", dataField: "companyName", zIndex: 5 }),

    // Subheading bottom
    withDefaults({ id: id("sub"), type: "text", x: 60, y: 1110, width: 960, height: 100, fontSize: 36, fontWeight: 400, textAlign: "center", textColor: "#4c1d95", dataField: "subheading", zIndex: 5 }),

    // CTA pill
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 240, y: 1240, width: 600, height: 90, backgroundColor: "#7c3aed", borderWidth: 0, borderRadius: 45, shadowBlur: 24, shadowX: 0, shadowY: 10, shadowColor: "rgba(124,58,237,0.4)", zIndex: 5 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 260, y: 1262, width: 560, height: 48, fontSize: 30, fontWeight: 800, textAlign: "center", textColor: "#ffffff", dataField: "cta", zIndex: 6 }),

    // Disclaimer
    withDefaults({ id: id("disclaimer"), type: "text", x: 40, y: 1308, width: 700, height: 40, fontSize: 18, fontWeight: 400, textAlign: "left", textColor: "rgba(0,0,0,0.35)", customText: "*Image simulated for illustrative purposes.", zIndex: 4 } as any),
  ];
}

// ─────────────────────────────────────────────
// 29) CLOUDINARY-STYLE SaaS AD
//     Dark navy bg, logo+brand top center,
//     big headline, CTA button, screenshot
//     mockup bottom with play button overlay
// ─────────────────────────────────────────────
function saasAdBase(): TemplateShape[] {
  return [
    // Dark navy background
    withDefaults({ id: id("bg"), type: "rectangle", x: 0, y: 0, width: 1080, height: 1350, backgroundColor: "#0f172a", borderWidth: 0, zIndex: 0 }),

    // Subtle radial glow center
    withDefaults({ id: id("glow"), type: "circle", x: 140, y: 100, width: 800, height: 600, backgroundColor: "rgba(56,189,248,0.06)", borderWidth: 0, zIndex: 1 }),

    // Brand logo area top
    withDefaults({ id: id("logo-bg"), type: "rounded-rect", x: 460, y: 60, width: 160, height: 80, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 0, borderRadius: 12, zIndex: 3 } as any),
    withDefaults({ id: id("brand"), type: "text", x: 60, y: 70, width: 960, height: 70, fontSize: 38, fontWeight: 700, textAlign: "center", textColor: "#ffffff", dataField: "companyName", zIndex: 4 }),

    // BIG headline
    withDefaults({ id: id("headline"), type: "text", x: 60, y: 170, width: 960, height: 280, fontSize: 100, fontWeight: 900, textAlign: "center", textColor: "#ffffff", fontFamily: "Arial Black", dataField: "hook", zIndex: 4 }),

    // Subheading
    withDefaults({ id: id("sub"), type: "text", x: 60, y: 450, width: 960, height: 80, fontSize: 38, fontWeight: 400, textAlign: "center", textColor: "rgba(255,255,255,0.65)", dataField: "subheading", zIndex: 4 }),

    // CTA button — bright blue pill
    withDefaults({ id: id("cta-btn"), type: "rounded-rect", x: 240, y: 568, width: 600, height: 96, backgroundColor: "#38bdf8", borderWidth: 0, borderRadius: 48, shadowBlur: 28, shadowX: 0, shadowY: 10, shadowColor: "rgba(56,189,248,0.45)", zIndex: 4 } as any),
    withDefaults({ id: id("cta-text"), type: "text", x: 260, y: 592, width: 560, height: 52, fontSize: 30, fontWeight: 900, textAlign: "center", textColor: "#0f172a", dataField: "cta", textTransform: "uppercase", zIndex: 5 } as any),

    // Screenshot/mockup panel
    withDefaults({ id: id("mockup-shadow"), type: "rounded-rect", x: 80, y: 710, width: 920, height: 520, backgroundColor: "rgba(0,0,0,0.4)", borderWidth: 0, borderRadius: 20, shadowBlur: 40, shadowX: 0, shadowY: 20, shadowColor: "rgba(0,0,0,0.6)", zIndex: 2 } as any),
    withDefaults({ id: id("mockup-frame"), type: "rounded-rect", x: 80, y: 700, width: 920, height: 520, backgroundColor: "#1e293b", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderRadius: 20, zIndex: 3 } as any),

    // Screenshot image inside frame
    withDefaults({ id: id("screenshot"), type: "image", x: 90, y: 710, width: 900, height: 500, src: photoPlaceholder("photo-top"), fit: "cover", radius: 16, borderWidth: 0, opacity: 0.85, zIndex: 4 } as any),

    // Play button circle overlay on screenshot
    withDefaults({ id: id("play-circle"), type: "circle", x: 440, y: 890, width: 200, height: 200, backgroundColor: "rgba(0,0,0,0.75)", borderColor: "rgba(255,255,255,0.3)", borderWidth: 2, zIndex: 5 }),
    withDefaults({ id: id("play-icon"), type: "text", x: 440, y: 910, width: 200, height: 160, fontSize: 80, fontWeight: 900, textAlign: "center", textColor: "#ffffff", customText: "▶", zIndex: 6 } as any),

    // URL strip bottom
    withDefaults({ id: id("url-strip"), type: "rounded-rect", x: 60, y: 1248, width: 960, height: 80, backgroundColor: "#38bdf8", borderWidth: 0, borderRadius: 12, zIndex: 4 } as any),
    withDefaults({ id: id("url-text"), type: "text", x: 80, y: 1264, width: 920, height: 50, fontSize: 28, fontWeight: 600, textAlign: "center", textColor: "#0f172a", dataField: "proof", zIndex: 5 }),
  ];
}

// ─────────────────────────────────────────────
// 30) 3D CHARACTER + DASHBOARD (Clickly style)
//     Dark gradient bg, big question headline,
//     bold red CTA, 3D character cutout center,
//     dashboard screenshot behind, price badge
// ─────────────────────────────────────────────
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
    withDefaults({ id: id("dashboard-img"), type: "image", x: 70, y: 530, width: 940, height: 560, src: clipdropPhoto("photo-top"), fit: "cover", radius: 12, borderWidth: 0, opacity: 0.7, zIndex: 3 } as any),

    // 3D CHARACTER CUTOUT — overlapping everything, center-bottom
    withDefaults({ id: id("character-cutout"), type: "image", x: 240, y: 460, width: 600, height: 780, src: clipdropPhoto("person-cutout"), fit: "contain", radius: 0, borderWidth: 0, opacity: 1, zIndex: 6 } as any),

    // Price badge — yellow circle bottom left
    withDefaults({ id: id("price-circle"), type: "circle", x: 40, y: 880, width: 280, height: 280, backgroundColor: "#fbbf24", borderWidth: 0, shadowBlur: 20, shadowX: 0, shadowY: 8, shadowColor: "rgba(0,0,0,0.4)", zIndex: 7 }),
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
  | "offer" | "hero" | "skincare" | "boldBrand" | "flashSale" | "albumCover" | "thoughtLeader" | "lifestyleShowcase" | "darkEditorial" | "lifestyleHero" | "productAbstract" | "saasAd" | "characterDashboard"
  | "testimonial" | "editorial" | "luxuryDark" | "splitColor"  | "boldStatement" | "collageGrid" | "singleHeroPhoto" | "splitPhotoContent" | "magazinePhotoGrid"
  | "instagramStory" | "communityEvent" | "fullBleedHero" | "massiveTypography" | "comparison"| "cdProductFloat" | "cdStatsShowcase" | "cdBrandVs" | "cdPersonHero" | "cdLifestyleScene"; // ← add this


export function getPremiumComponent(
  key: PremiumComponentKey,
  canvasWidth: number,
  canvasHeight: number
): TemplateShape[] {
  const map: Record<PremiumComponentKey, () => TemplateShape[]> = {
    offer: offerLayoutBase,
    hero: heroProductBase,
    skincare: skincareProductBase,
    boldBrand: boldBrandBase,
    flashSale: flashSaleBase,
    testimonial: testimonialBase,
    editorial: editorialBase,
    luxuryDark: luxuryDarkBase,
    splitColor: splitColorBase,
    instagramStory: instagramStoryBase,
    communityEvent: communityEventBase,
    albumCover: albumCoverBase,
    boldStatement: boldStatementBase,
    fullBleedHero: fullBleedHeroBase,
    massiveTypography: massiveTypographyBase,
    comparison: comparisonBase,
    collageGrid: collageGridBase,
    singleHeroPhoto: singleHeroPhotoBase,
    splitPhotoContent: splitPhotoContentBase,
    magazinePhotoGrid: magazinePhotoGridBase,
    thoughtLeader: thoughtLeaderBase,
    lifestyleShowcase: lifestyleShowcaseBase,
    darkEditorial: darkEditorialBase,
    cdProductFloat: cdProductFloatBase,
    cdStatsShowcase: cdStatsShowcaseBase,
    cdBrandVs: cdBrandVsBase,
    cdPersonHero: cdPersonHeroBase,
    cdLifestyleScene: cdLifestyleSceneBase,
    lifestyleHero: lifestyleHeroBase,
    productAbstract: productAbstractBase,
    saasAd: saasAdBase,
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