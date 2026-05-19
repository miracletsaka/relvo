import { applyLayoutSafety } from "@/lib/campaign-layout-safety";

export type CampaignDesignMood =
  | "fitness"
  | "luxury"
  | "beauty"
  | "tech"
  | "food"
  | "corporate"
  | "general";

export function detectCampaignDesignMood(data: any): CampaignDesignMood {
  const text = [
    data?.headline,
    data?.hook,
    data?.subheading,
    data?.description,
    data?.product_name,
    data?.product_description,
    data?.campaign_label,
    data?.offer_label,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/gym|fitness|workout|training|muscle|energy|transformation|coach/.test(text)) {
    return "fitness";
  }

  if (/luxury|premium|elegant|exclusive|high-end|prestige|elite/.test(text)) {
    return "luxury";
  }

  if (/beauty|skin|serum|glow|skincare|hair|salon|cosmetic/.test(text)) {
    return "beauty";
  }

  if (/ai|automation|software|saas|tech|dashboard|system|crm|booking/.test(text)) {
    return "tech";
  }

  if (/restaurant|burger|food|meal|drink|coffee|kitchen|pizza/.test(text)) {
    return "food";
  }

  if (/consulting|finance|legal|agency|business|professional|service/.test(text)) {
    return "corporate";
  }

  return "general";
}

function isText(shape: any) {
  return shape?.type === "text";
}

function isPanel(shape: any) {
  return ["rectangle", "rounded-rect", "circle"].includes(String(shape?.type));
}

function lower(value: any) {
  return String(value || "").toLowerCase();
}
function hasLightColor(color: string) {
  const c = String(color || "").trim();

  if (!c.startsWith("#") || c.length < 7) return false;

  const r = parseInt(c.slice(1, 3), 16);
  const g = parseInt(c.slice(3, 5), 16);
  const b = parseInt(c.slice(5, 7), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.68;
}

function moodFontSystem(mood: CampaignDesignMood) {
  if (mood === "fitness") {
    return {
      headline: "Bebas Neue",
      display: "Bebas Neue",
      body: "Syne",
      weight: 900,
    };
  }

  if (mood === "luxury" || mood === "beauty") {
    return {
      headline: "Georgia, serif",
      display: "Georgia, serif",
      body: "Syne",
      weight: 700,
    };
  }

  if (mood === "tech" || mood === "corporate") {
    return {
      headline: "Syne",
      display: "Syne",
      body: "Syne",
      weight: 900,
    };
  }

  return {
    headline: "Bebas Neue",
    display: "Syne",
    body: "Syne",
    weight: 900,
  };
}

function improveTextShape(shape: any, mood: CampaignDesignMood) {
  const field = lower(shape.dataField);
  const fonts = moodFontSystem(mood);

  const isHeadline =
    field === "headline" ||
    field === "hook" ||
    field.includes("headline");

  const isLabel =
    field.includes("label") ||
    field.includes("tag") ||
    field.includes("price") ||
    field.includes("offer");

  if (isHeadline) {
    return {
      ...shape,
      fontFamily: shape.fontFamily || fonts.headline,
      fontWeight: shape.fontWeight || fonts.weight,
      letterSpacing:
        shape.letterSpacing ??
        (mood === "luxury" || mood === "beauty" ? -1.2 : -0.5),
      lineHeight: shape.lineHeight || 0.95,
      textColor: shape.textColor || "#ffffff",
      shadowBlur: shape.shadowBlur ?? 8,
      shadowColor: shape.shadowColor || "rgba(0,0,0,0.28)",
    };
  }

  if (isLabel) {
    return {
      ...shape,
      fontFamily: shape.fontFamily || fonts.display,
      fontWeight: shape.fontWeight || 900,
      letterSpacing: shape.letterSpacing ?? 1,
      textColor: shape.textColor || "#f5d0a0",
    };
  }

  return {
    ...shape,
    fontFamily: shape.fontFamily || fonts.body,
    fontWeight: shape.fontWeight || 700,
    lineHeight: shape.lineHeight || 1.18,
    textColor: shape.textColor || "rgba(255,255,255,0.78)",
  };
}

function improveCtaShape(shape: any) {
  const field = lower(shape.dataField);
  const id = lower(shape.id);

  if (field.includes("cta") || id.includes("cta")) {
    if (shape.type === "text") {
      return {
        ...shape,
        fontFamily: shape.fontFamily || "Syne",
        fontWeight: shape.fontWeight || 900,
        letterSpacing: shape.letterSpacing ?? 0.5,
        textColor: shape.textColor || "#ffffff",
      };
    }

    if (isPanel(shape)) {
      return {
        ...shape,
        backgroundColor: shape.backgroundColor || "#7c3aed",
        borderRadius: shape.borderRadius ?? 999,
        opacity: shape.opacity ?? 1,
      };
    }
  }

  return shape;
}

function improvePanels(shape: any, mood: CampaignDesignMood) {
  if (!isPanel(shape)) return shape;

  const bg = String(shape.backgroundColor || "");

  if (mood === "fitness" || mood === "tech") {
    if (!bg || hasLightColor(bg)) {
      return {
        ...shape,
        backgroundColor: "rgba(0,0,0,0.42)",
      };
    }
  }

  if (mood === "luxury" || mood === "beauty") {
    return {
      ...shape,
      borderColor: shape.borderColor || "rgba(245,208,160,0.24)",
    };
  }

  return shape;
}

export function improveCampaignDesignShapes(
  shapes: any[],
  campaignData: any,
): any[] {
  const mood = detectCampaignDesignMood(campaignData);

  return (shapes || []).map((shape) => {
    let next = { ...shape };

    next = improvePanels(next, mood);
    next = improveTextShape(next, mood);
    next = improveCtaShape(next);

    return next;
  });
}