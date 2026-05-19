import { WATCH_POSTER_LAYOUT } from "./layout";

const jitter = (base: number, amount: number) => {
  return Math.round(base + (Math.random() * amount * 2 - amount));
};

const pick = <T,>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const CANVAS_W = 1080;
const CANVAS_H = 1350;
const MEMORY_KEY = "watchPosterHeroDirectorLastCombo";

type TextAlign = "left" | "center" | "right";
type DirectorModeName = "luxury" | "retail" | "editorial" | "minimal" | "bold";

const FORCED_MODE: DirectorModeName | null = null;

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Shape = Record<string, any>;

type TypographySystem = {
  name: string;
  headlineFont: string;
  headlineWeight: number;
  headlineLineHeight: number;
  headlineLetterSpacing: number;
  scriptFont: string;
  scriptWeight: number;
  scriptLetterSpacing: number;
};

type ColorSystem = {
  name: string;
  headline: string;
  headlineAlt: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  frame: string;
  headlineGradient: string[];
  scriptGradient: string[];
};

type CompositionSystem = {
  name: string;
  align: TextAlign;
  headingX: number;
  headingY: number;
  headingW: number;
  headingH: number;
  headingSize: number;
  scriptX: number;
  scriptY: number;
  scriptW: number;
  scriptH: number;
  scriptSize: number;
};

type DirectorMode = {
  name: DirectorModeName;
  density: "low" | "medium" | "high";
  compositions: CompositionSystem[];
  colors: ColorSystem[];
  typography: TypographySystem[];
  allowedDecorations: string[];
  useGradientChance: number;
  useStrokeChance: number;
};

const PRODUCT_SAFE_ZONE: Rect = {
  x: 390,
  y: 330,
  width: 620,
  height: 760,
};

const colorSystems: ColorSystem[] = [
  {
    name: "red-luxury",
    headline: "#ffffff",
    headlineAlt: "#fee2e2",
    accent: "#ef4444",
    accentSoft: "rgba(239,68,68,0.13)",
    accentGlow: "rgba(239,68,68,0.3)",
    frame: "rgba(239,68,68,0.42)",
    headlineGradient: ["#ffffff", "#fee2e2", "#ef4444"],
    scriptGradient: ["#fecaca", "#ef4444", "#991b1b"],
  },
  {
    name: "red-gold",
    headline: "#ffffff",
    headlineAlt: "#fef3c7",
    accent: "#facc15",
    accentSoft: "rgba(250,204,21,0.13)",
    accentGlow: "rgba(250,204,21,0.34)",
    frame: "rgba(250,204,21,0.38)",
    headlineGradient: ["#ffffff", "#fef3c7", "#facc15"],
    scriptGradient: ["#fef3c7", "#facc15", "#f59e0b"],
  },
  {
    name: "champagne-red",
    headline: "#fff7ed",
    headlineAlt: "#ffffff",
    accent: "#f5d38a",
    accentSoft: "rgba(245,211,138,0.13)",
    accentGlow: "rgba(245,211,138,0.3)",
    frame: "rgba(245,211,138,0.42)",
    headlineGradient: ["#ffffff", "#fff7ed", "#f5d38a"],
    scriptGradient: ["#fff7ed", "#f5d38a", "#d9a441"],
  },
  {
    name: "ice-editorial",
    headline: "#f8fafc",
    headlineAlt: "#ffffff",
    accent: "#e5e7eb",
    accentSoft: "rgba(229,231,235,0.1)",
    accentGlow: "rgba(229,231,235,0.2)",
    frame: "rgba(229,231,235,0.28)",
    headlineGradient: ["#ffffff", "#e5e7eb", "#94a3b8"],
    scriptGradient: ["#ffffff", "#e5e7eb", "#94a3b8"],
  },
];

const typographySystems: TypographySystem[] = [
  {
    name: "luxury-serif",
    headlineFont: "Georgia, serif",
    headlineWeight: 900,
    headlineLineHeight: 0.9,
    headlineLetterSpacing: -1,
    scriptFont: "'Brush Script MT', cursive",
    scriptWeight: 400,
    scriptLetterSpacing: 0,
  },
  {
    name: "modern-agency",
    headlineFont: "'Syne', sans-serif",
    headlineWeight: 900,
    headlineLineHeight: 0.92,
    headlineLetterSpacing: -4,
    scriptFont: "'Syne', sans-serif",
    scriptWeight: 800,
    scriptLetterSpacing: -2,
  },
  {
    name: "poster-bold",
    headlineFont: "'Bebas Neue', Impact, sans-serif",
    headlineWeight: 400,
    headlineLineHeight: 0.84,
    headlineLetterSpacing: 2,
    scriptFont: "Georgia, serif",
    scriptWeight: 700,
    scriptLetterSpacing: 0,
  },
  {
    name: "fashion-editorial",
    headlineFont: "'Bebas Neue', serif",
    headlineWeight: 900,
    headlineLineHeight: 0.9,
    headlineLetterSpacing: -2,
    scriptFont: "'Segoe Script', cursive",
    scriptWeight: 400,
    scriptLetterSpacing: -1,
  },
];

const compositionSystems: CompositionSystem[] = [
  {
    name: "left-classic",
    align: "left",
    headingX: 72,
    headingY: 115,
    headingW: 470,
    headingH: 210,
    headingSize: 112,
    scriptX: 72,
    scriptY: 355,
    scriptW: 430,
    scriptH: 90,
    scriptSize: 62,
  },
  {
    name: "left-compact",
    align: "left",
    headingX: 72,
    headingY: 150,
    headingW: 430,
    headingH: 190,
    headingSize: 96,
    scriptX: 76,
    scriptY: 350,
    scriptW: 390,
    scriptH: 80,
    scriptSize: 54,
  },
  {
    name: "top-left-small",
    align: "left",
    headingX: 72,
    headingY: 80,
    headingW: 560,
    headingH: 170,
    headingSize: 90,
    scriptX: 76,
    scriptY: 265,
    scriptW: 390,
    scriptH: 70,
    scriptSize: 48,
  },
  {
    name: "bottom-left",
    align: "left",
    headingX: 72,
    headingY: 870,
    headingW: 470,
    headingH: 150,
    headingSize: 78,
    scriptX: 76,
    scriptY: 1030,
    scriptW: 390,
    scriptH: 70,
    scriptSize: 44,
  },
  {
    name: "center-safe-top",
    align: "center",
    headingX: 120,
    headingY: 72,
    headingW: 840,
    headingH: 170,
    headingSize: 96,
    scriptX: 220,
    scriptY: 240,
    scriptW: 640,
    scriptH: 80,
    scriptSize: 54,
  },
  {
    name: "stacked-center",
    align: "center",
    headingX: 120,
    headingY: 90,
    headingW: 840,
    headingH: 190,
    headingSize: 88,
    scriptX: 220,
    scriptY: 315,
    scriptW: 640,
    scriptH: 80,
    scriptSize: 58,
  },
];

const layoutCompositionMap: Record<string, CompositionSystem[]> = {
  "editorial-left": [
    compositionSystems[0],
    compositionSystems[1],
    compositionSystems[2],
  ],

  "center-product": [
    compositionSystems[4],
    compositionSystems[5],
  ],

  "bold-retail": [
    compositionSystems[0],
    compositionSystems[1],
    compositionSystems[3],
  ],

  "minimal-luxury": [
    compositionSystems[1],
    compositionSystems[2],
    compositionSystems[4],
  ],

  "stacked-vertical": [
    compositionSystems[4],
    compositionSystems[5],
  ],
};

const modeList: DirectorMode[] = [
  {
    name: "luxury",
    density: "medium",
    compositions: [compositionSystems[0], compositionSystems[1], compositionSystems[2]],
    colors: [colorSystems[1], colorSystems[2], colorSystems[3]],
    typography: [typographySystems[0], typographySystems[3]],
    allowedDecorations: ["line", "frame", "tag", "corner", "serial"],
    useGradientChance: 0.6,
    useStrokeChance: 0.15,
  },
  {
    name: "retail",
    density: "high",
    compositions: [compositionSystems[0], compositionSystems[1], compositionSystems[3]],
    colors: [colorSystems[0], colorSystems[1]],
    typography: [typographySystems[1], typographySystems[2]],
    allowedDecorations: ["tag", "bar", "dots", "highlight", "underline"],
    useGradientChance: 0.5,
    useStrokeChance: 0.35,
  },
  {
    name: "editorial",
    density: "low",
    compositions: [compositionSystems[2], compositionSystems[4], compositionSystems[0]],
    colors: [colorSystems[2], colorSystems[3]],
    typography: [typographySystems[0], typographySystems[3]],
    allowedDecorations: ["line", "serial", "corner", "frame"],
    useGradientChance: 0.35,
    useStrokeChance: 0.1,
  },
  {
    name: "minimal",
    density: "low",
    compositions: [compositionSystems[2], compositionSystems[4], compositionSystems[1]],
    colors: [colorSystems[2], colorSystems[3]],
    typography: [typographySystems[0], typographySystems[1]],
    allowedDecorations: ["line", "serial"],
    useGradientChance: 0.25,
    useStrokeChance: 0.05,
  },
  {
    name: "bold",
    density: "high",
    compositions: [compositionSystems[0], compositionSystems[1], compositionSystems[3]],
    colors: [colorSystems[0], colorSystems[1]],
    typography: [typographySystems[1], typographySystems[2]],
    allowedDecorations: ["bar", "tag", "dots", "highlight", "underline", "frame"],
    useGradientChance: 0.6,
    useStrokeChance: 0.45,
  },
];

function chance(value: number) {
  return Math.random() < value;
}

function getLastCombo() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(MEMORY_KEY);
}

function saveCombo(combo: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MEMORY_KEY, combo);
}

function overlaps(a: Rect, b: Rect) {
  return !(
    a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height
  );
}

function safeX(x: number, width: number) {
  return Math.max(48, Math.min(CANVAS_W - width - 48, x));
}

function safeY(y: number, height: number) {
  return Math.max(48, Math.min(CANVAS_H - height - 48, y));
}

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

function pickMode() {
  if (FORCED_MODE) {
    return modeList.find((m) => m.name === FORCED_MODE) || modeList[0];
  }

  return pick(modeList);
}

function generateCandidate() {
  const last = getLastCombo();

  const mode = pickMode();
  const color = pick(mode.colors);
  const typography = pick(mode.typography);

  const layoutCompositions =
    layoutCompositionMap[WATCH_POSTER_LAYOUT] || mode.compositions;

  const composition = pick(layoutCompositions);

  const combo = `${WATCH_POSTER_LAYOUT}-${mode.name}-${color.name}-${typography.name}-${composition.name}`;

  const headingX = safeX(jitter(composition.headingX, 18), composition.headingW);
  const headingY = safeY(jitter(composition.headingY, 18), composition.headingH);

  const minScriptY = headingY + composition.headingH + 16;
  const scriptX = safeX(jitter(composition.scriptX, 16), composition.scriptW);
  const scriptY = safeY(Math.max(jitter(composition.scriptY, 16), minScriptY), composition.scriptH);

  const headingRect = rect(headingX, headingY, composition.headingW, composition.headingH);
  const scriptRect = rect(scriptX, scriptY, composition.scriptW, composition.scriptH);

  const decorationCount =
    mode.density === "low" ? 1 : mode.density === "medium" ? pick([1, 2]) : pick([2, 3]);

  const selectedDecorationKinds = [...mode.allowedDecorations]
    .sort(() => Math.random() - 0.5)
    .slice(0, decorationCount);

  const headingGradient = chance(mode.useGradientChance) ? color.headlineGradient : undefined;
  const scriptGradient = chance(mode.useGradientChance) ? color.scriptGradient : undefined;
  const useStroke = chance(mode.useStrokeChance);

  return {
    mode,
    color,
    typography,
    composition,
    combo,
    isRepeat: combo === last,
    headingX,
    headingY,
    scriptX,
    scriptY,
    headingRect,
    scriptRect,
    selectedDecorationKinds,
    headingGradient,
    scriptGradient,
    useStroke,
  };
}

function scoreCandidate(candidate: ReturnType<typeof generateCandidate>) {
  let score = 100;

  if (candidate.isRepeat) score -= 40;

  if (WATCH_POSTER_LAYOUT !== "center-product" && WATCH_POSTER_LAYOUT !== "stacked-vertical") {
    if (overlaps(candidate.headingRect, PRODUCT_SAFE_ZONE)) score -= 40;
    if (overlaps(candidate.scriptRect, PRODUCT_SAFE_ZONE)) score -= 32;
  }

  if (overlaps(candidate.headingRect, candidate.scriptRect)) score -= 50;

  if (candidate.headingX < 60) score -= 8;
  if (candidate.headingY < 60) score -= 8;

  if (WATCH_POSTER_LAYOUT === "editorial-left" && candidate.composition.name.includes("left")) score += 18;
  if (WATCH_POSTER_LAYOUT === "center-product" && candidate.composition.align === "center") score += 18;
  if (WATCH_POSTER_LAYOUT === "stacked-vertical" && candidate.composition.align === "center") score += 18;
  if (WATCH_POSTER_LAYOUT === "minimal-luxury" && candidate.mode.name === "minimal") score += 14;
  if (WATCH_POSTER_LAYOUT === "bold-retail" && candidate.mode.name === "bold") score += 14;

  if (candidate.headingGradient) score += 6;
  if (candidate.scriptGradient) score += 4;

  if (candidate.selectedDecorationKinds.length > 0) score += 8;
  if (candidate.selectedDecorationKinds.length > 2) score -= 6;

  return score;
}

function selectBestCandidate() {
  const candidates = Array.from({ length: 20 }, generateCandidate);
  candidates.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));

  const best = candidates[0];
  saveCombo(best.combo);

  return best;
}

const selected = selectBestCandidate();

function makeDecoration(kind: string): Shape[] {
  const { color, composition, headingX, headingY, scriptX, scriptY } = selected;

  if (kind === "line") {
    return [
      {
        id: "hero-accent-line",
        type: "rounded-rect",
        x: headingX,
        y: safeY(headingY - 26, 8),
        width: jitter(180, 45),
        height: pick([4, 5, 6]),
        backgroundColor: color.accent,
        borderRadius: 999,
        borderWidth: 0,
        zIndex: 19,
      },
    ];
  }

  if (kind === "bar") {
    return [
      {
        id: "hero-left-bar",
        type: "rounded-rect",
        x: safeX(headingX - 24, 8),
        y: headingY,
        width: pick([5, 7, 9]),
        height: jitter(190, 35),
        backgroundColor: color.accent,
        borderRadius: 999,
        borderWidth: 0,
        zIndex: 19,
      },
    ];
  }

  if (kind === "tag") {
    return [
      {
        id: "hero-premium-tag-bg",
        type: "rounded-rect",
        x: headingX,
        y: safeY(headingY - 50, 40),
        width: pick([210, 235, 260]),
        height: 40,
        backgroundColor: color.accentSoft,
        borderColor: color.accent,
        borderWidth: 1,
        borderRadius: 999,
        zIndex: 19,
      },
      {
        id: "hero-premium-tag-text",
        type: "text",
        x: headingX + 16,
        y: safeY(headingY - 38, 24),
        width: 220,
        height: 24,
        dataField: "campaign_label",
        fontSize: pick([17, 18, 20]),
        fontWeight: 800,
        textColor: color.accent,
        textAlign: "center",
        fontFamily: "'Syne', sans-serif",
        lineHeight: 1,
        letterSpacing: 2,
        borderWidth: 0,
        zIndex: 22,
      },
    ];
  }

  if (kind === "frame") {
    return [
      {
        id: "hero-outline-frame",
        type: "rounded-rect",
        x: safeX(headingX - 20, composition.headingW + 34),
        y: safeY(headingY - 24, composition.headingH + 150),
        width: jitter(composition.headingW + 34, 26),
        height: jitter(scriptY - headingY + composition.scriptH + 30, 28),
        backgroundColor: "transparent",
        borderColor: color.frame,
        borderWidth: 1,
        borderRadius: pick([0, 12, 18, 28]),
        opacity: 0.5,
        zIndex: 18,
      },
    ];
  }

  if (kind === "corner") {
    return [
      {
        id: "hero-corner-line-top",
        type: "rounded-rect",
        x: headingX,
        y: safeY(headingY - 22, 5),
        width: jitter(110, 24),
        height: 5,
        backgroundColor: color.accent,
        borderRadius: 999,
        borderWidth: 0,
        zIndex: 19,
      },
      {
        id: "hero-corner-line-side",
        type: "rounded-rect",
        x: headingX,
        y: safeY(headingY - 22, 110),
        width: 5,
        height: jitter(110, 24),
        backgroundColor: color.accent,
        borderRadius: 999,
        borderWidth: 0,
        zIndex: 19,
      },
    ];
  }

  if (kind === "dots") {
    return [
      {
        id: "hero-dot-1",
        type: "circle",
        x: safeX(headingX + composition.headingW + 18, 10),
        y: safeY(headingY + 18, 10),
        width: 10,
        height: 10,
        backgroundColor: color.accent,
        borderWidth: 0,
        zIndex: 19,
      },
      {
        id: "hero-dot-2",
        type: "circle",
        x: safeX(headingX + composition.headingW + 42, 8),
        y: safeY(headingY + 18, 8),
        width: 8,
        height: 8,
        backgroundColor: color.accent,
        borderWidth: 0,
        opacity: 0.65,
        zIndex: 19,
      },
    ];
  }

  if (kind === "highlight") {
    return [
      {
        id: "hero-heading-highlight",
        type: "rounded-rect",
        x: safeX(headingX - 14, composition.headingW + 26),
        y: safeY(headingY + composition.headingH * 0.46, 58),
        width: Math.min(composition.headingW, jitter(420, 50)),
        height: 58,
        backgroundColor: color.accentSoft,
        borderWidth: 0,
        borderRadius: 12,
        opacity: 0.82,
        zIndex: 17,
      },
    ];
  }

  if (kind === "underline") {
    return [
      {
        id: "hero-script-underline",
        type: "rounded-rect",
        x: scriptX,
        y: safeY(scriptY + composition.scriptH - 20, 6),
        width: jitter(240, 70),
        height: 5,
        backgroundColor: color.accent,
        borderRadius: 999,
        borderWidth: 0,
        opacity: 0.72,
        zIndex: 19,
      },
    ];
  }

  if (kind === "serial") {
    return [
      {
        id: "hero-micro-serial",
        type: "text",
        x: selected.headingX,
        y: safeY(selected.headingY - 42, 24),
        width: 260,
        height: 24,
        dataField: "collection_label",
        fontSize: 17,
        fontWeight: 800,
        textColor: selected.color.accent,
        textAlign: selected.composition.align,
        fontFamily: "'Syne', sans-serif",
        lineHeight: 1,
        letterSpacing: 3,
        borderWidth: 0,
        zIndex: 22,
      },
    ];
  }

  return [];
}

const decorations = selected.selectedDecorationKinds.flatMap(makeDecoration);

export const WATCH_POSTER_HERO_TEXT_DEBUG = {
  layout: WATCH_POSTER_LAYOUT,
  mode: selected.mode.name,
  color: selected.color.name,
  typography: selected.typography.name,
  composition: selected.composition.name,
  combo: selected.combo,
  score: scoreCandidate(selected),
};

export const watchPosterHeroTextShapes = [
  ...decorations,

  {
    id: "watch-heading",
    type: "text",
    x: selected.headingX,
    y: selected.headingY,
    width: selected.composition.headingW,
    height: selected.composition.headingH,
    dataField: "headline",
    fontSize: jitter(selected.composition.headingSize, 9),
    fontWeight: selected.typography.headlineWeight,
    textColor: selected.color.headline,
    textGradientColors: selected.headingGradient,
    textAlign: selected.composition.align,
    fontFamily: selected.typography.headlineFont,
    lineHeight: selected.typography.headlineLineHeight,
    letterSpacing: selected.typography.headlineLetterSpacing + pick([-1, 0, 1]),
    borderWidth: 0,
    textStrokeWidth: selected.useStroke ? pick([1, 2]) : 0,
    textStrokeColor: selected.useStroke ? "rgba(0,0,0,0.55)" : "transparent",
    shadowColor: pick(["rgba(255,255,255,0.14)", selected.color.accentGlow, "rgba(0,0,0,0.42)"]),
    shadowBlur: pick([0, 4, 8, 12]),
    zIndex: 20,
  },

  {
    id: "watch-script-title",
    type: "text",
    x: selected.scriptX,
    y: selected.scriptY,
    width: selected.composition.scriptW,
    height: selected.composition.scriptH,
    dataField: "product_name",
    fontSize: jitter(selected.composition.scriptSize, 7),
    fontWeight: selected.typography.scriptWeight,
    textColor: selected.color.accent,
    textGradientColors: selected.scriptGradient,
    textAlign: selected.composition.align,
    fontFamily: selected.typography.scriptFont,
    lineHeight: 1,
    letterSpacing: selected.typography.scriptLetterSpacing + pick([-1, 0, 1]),
    borderWidth: 0,
    shadowColor: selected.color.accentGlow,
    shadowBlur: pick([0, 5, 9]),
    zIndex: 21,
  },
];