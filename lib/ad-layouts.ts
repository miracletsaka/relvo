import { preloadFonts } from "@/lib/canvas-renderer";

export const W = 1080, H = 1350;
type Box = [number, number, number, number]; // x,y,w,h as fractions

const RECIPES: Record<string, { text: Box; img: Box; scrim: Box; angle: number; darkAtStart: boolean; align: "left" | "center" }> = {
  "left-stack":  { text: [.07, .10, .50, .80], img: [.60, .30, .34, .40], scrim: [0, 0, .75, 1],  angle: 0,  darkAtStart: true,  align: "left" },
  "bottom-band": { text: [.07, .58, .86, .36], img: [.30, .08, .40, .40], scrim: [0, .40, 1, .60], angle: 90, darkAtStart: false, align: "left" },
  "top-band":    { text: [.07, .06, .86, .36], img: [.30, .50, .40, .40], scrim: [0, 0, 1, .60],   angle: 90, darkAtStart: true,  align: "center" },
};

const FONT_PAIRS: Record<string, [string, string][]> = {
  bold:    [["Anton", "Outfit"], ["Bebas Neue", "Montserrat"], ["Oswald", "DM Sans"]],
  luxury:  [["Playfair Display", "Outfit"], ["Cormorant Garamond", "Montserrat"]],
  playful: [["Syne", "DM Sans"], ["Montserrat", "Raleway"]],
  clean:   [["Space Grotesk", "DM Sans"], ["Outfit", "Raleway"]],
};
const HEAD_WEIGHT: Record<string, number> = {
  Anton: 400, "Bebas Neue": 400, "Cormorant Garamond": 600, "Playfair Display": 700,
  Oswald: 700, Syne: 800, Montserrat: 800, "Space Grotesk": 700, Outfit: 700,
};

const ctx = () => document.createElement("canvas").getContext("2d")!;

function countLines(c: CanvasRenderingContext2D, text: string, maxW: number) {
  let lines = 1, cur = "";
  for (const word of text.split(" ")) {
    const t = cur ? `${cur} ${word}` : word;
    if (c.measureText(t).width <= maxW) cur = t; else { lines++; cur = word; }
  }
  return lines;
}

/** Shrinks the font until the text fits in maxLines — no overflow, ever. */
function fit(font: string, weight: number, text: string, w: number, max: number, min: number, maxLines: number, lh: number) {
  const c = ctx();
  for (let s = max; s >= min; s -= 2) {
    c.font = `${weight} ${s}px "${font}"`;
    const n = countLines(c, text, w);
    if (n <= maxLines) return { size: s, h: n * s * lh };
  }
  return { size: min, h: maxLines * min * lh };
}

export async function buildAdShapes(data: any, brief: any, bg: string | null) {
  await preloadFonts();
  const r = RECIPES[brief?.layout] || RECIPES["left-stack"];
  const pairs = FONT_PAIRS[brief?.mood] || FONT_PAIRS.clean;
  const [head, body] = pairs[Math.floor(Math.random() * pairs.length)];
  const [p0 = "#111827", p1 = "#1f2937", accent = "#C9A84C"] = brief?.palette || [];
  const upper = brief?.mood === "bold";
  const shapes: any[] = [];

  // Layer 0: Muse background (or gradient fallback)
  shapes.push(bg
    ? { id: "bg", type: "image", src: bg, x: 0, y: 0, width: W, height: H, zIndex: -10, fit: "cover" }
    : { id: "bg", type: "rectangle", x: 0, y: 0, width: W, height: H, zIndex: -10,
        gradientColors: [{ stop: 0, color: p0 }, { stop: 1, color: p1 }] });

  // Optional product photo
  if (data?.heroImage) {
    const [ix, iy, iw, ih] = r.img;
    shapes.push({ id: "product", type: "image", src: data.heroImage, x: ix * W, y: iy * H,
      width: iw * W, height: ih * H, radius: 28, zIndex: -5, fit: "cover" });
  }

  // Layer 1: scrim behind the text
  const [sx, sy, sw, sh] = r.scrim;
  const dark = "rgba(5,7,11,0.78)", clear = "rgba(5,7,11,0)";
  shapes.push({ id: "scrim", type: "gradient-overlay", x: sx * W, y: sy * H, width: sw * W, height: sh * H,
    zIndex: -4, gradientAngle: r.angle,
    gradientColors: [{ stop: 0, color: r.darkAtStart ? dark : clear }, { stop: 1, color: r.darkAtStart ? clear : dark }] });

  // Layer 2: exact text
  const tx = r.text[0] * W, tw = r.text[2] * W;
  let y = r.text[1] * H;
  const text = (id: string, field: string, value: string, font: string, weight: number,
    size: number, h: number, color: string, extra: any = {}) => {
    shapes.push({ id, type: "text", dataField: field, x: tx, y, width: tw, height: h, fontFamily: font,
      fontSize: size, fontWeight: weight, lineHeight: 1.05, textAlign: r.align, textColor: color,
      shadowBlur: 14, shadowColor: "rgba(0,0,0,0.45)", zIndex: 10, ...extra });
    y += h + 28;
  };

  if (data.headline) {
    const f = fit(head, HEAD_WEIGHT[head] || 700, upper ? data.headline.toUpperCase() : data.headline, tw, 120, 56, 3, 1.05);
    text("headline", "headline", data.headline, head, HEAD_WEIGHT[head] || 700, f.size, f.h, "#ffffff",
      upper ? { textTransform: "uppercase" } : {});
  }
  if (data.offer_value) {
    const f = fit(head, HEAD_WEIGHT[head] || 700, data.offer_value, tw, 90, 40, 1, 1.05);
    text("offer", "offer_value", data.offer_value, head, HEAD_WEIGHT[head] || 700, f.size, f.h, accent);
  }
  if (data.subheadline) {
    const f = fit(body, 400, data.subheadline, tw, 38, 26, 3, 1.3);
    text("sub", "subheadline", data.subheadline, body, 400, f.size, f.h, "rgba(255,255,255,0.88)", { lineHeight: 1.3 });
  }
  if (data.price_label) {
    text("price", "price_label", data.price_label, body, 600, 40, 48, "#ffffff");
  }
  if (data.cta_text) {
    const bw = Math.min(tw, 400), bh = 84, bx = r.align === "center" ? tx + (tw - bw) / 2 : tx;
    shapes.push({ id: "cta-bg", type: "rounded-rect", x: bx, y, width: bw, height: bh, borderRadius: 42,
      backgroundColor: accent, zIndex: 9 });
    shapes.push({ id: "cta", type: "text", dataField: "cta_text", x: bx, y: y + (bh - 30 * 0.72) / 2,
      width: bw, height: bh, fontFamily: body, fontSize: 30, fontWeight: 600, textAlign: "center",
      textColor: "#0b0b0b", zIndex: 10 });
  }
  return shapes;
}