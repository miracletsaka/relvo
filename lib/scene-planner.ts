import { CampaignData } from "@/lib/types";

export type SceneType =
  | "hook_opener"
  | "problem_agitate"
  | "benefit_showcase"
  | "social_proof"
  | "cta_closer"
  | "product_reveal"
  | "stat_highlight";

export interface ScenePlan {
  type: SceneType;
  durationFrames: number;   // at 30fps
  veo3Prompt: string;
  pexelsQuery: string;
  textOverlays: {
    text: string;
    fromFrame: number;
    fontSize: number;
    fontWeight: number;
    color: string;
    top: number;
    textAlign: "center" | "left" | "right";
  }[];
  accentColor: string;
  showCTA: boolean;
}

// ── Pick scenes based on campaign content ─────────────────────────────────
export function planScenes(
  campaignData: CampaignData,
  accentColor: string = "#6366f1",
  totalDurationSeconds: number = 15
): ScenePlan[] {
  const {
    hook,
    subheading,
    cta,
    companyName,
    proof,
    bullets = [],
    location,
  } = campaignData;

  const fps = 30;

  // Detect content type to choose best scene sequence
  const isProduct = /product|buy|shop|sale|offer|deal/i.test(
    `${hook} ${subheading}`
  );
  const isService = /service|agency|consulting|coaching|solution/i.test(
    `${hook} ${subheading}`
  );
  const isSaaS = /software|app|platform|tool|automat|AI|tech/i.test(
    `${hook} ${subheading}`
  );
  const isEvent = /event|join|register|webinar|workshop/i.test(
    `${hook} ${subheading}`
  );

  // ── Base scene templates ──────────────────────────────────────────────
  const HOOK_OPENER: ScenePlan = {
    type: "hook_opener",
    durationFrames: 3 * fps,  // 3 seconds
    veo3Prompt: `Cinematic slow-motion opening shot, ${location || "modern professional"} setting, 
      dramatic lighting, camera slowly pushing in, premium advertising style, 
      no text, photorealistic, vertical 9:16`,
    pexelsQuery: `${companyName} ${hook} professional cinematic`,
    textOverlays: [
      {
        text: companyName?.toUpperCase() || "",
        fromFrame: 10,
        fontSize: 28,
        fontWeight: 600,
        color: "rgba(255,255,255,0.7)",
        top: 80,
        textAlign: "center",
      },
      {
        text: hook,
        fromFrame: 20,
        fontSize: 82,
        fontWeight: 900,
        color: "#ffffff",
        top: 220,
        textAlign: "center",
      },
    ],
    accentColor,
    showCTA: false,
  };

  const PROBLEM_AGITATE: ScenePlan = {
    type: "problem_agitate",
    durationFrames: 3 * fps,
    veo3Prompt: `Person looking stressed and overwhelmed at desk, dramatic shadows, 
      moody lighting, cinematic, problems piling up feeling, vertical 9:16, 
      no text, photorealistic`,
    pexelsQuery: "stressed business person overwhelmed work",
    textOverlays: [
      {
        text: "Sound familiar?",
        fromFrame: 5,
        fontSize: 54,
        fontWeight: 700,
        color: "#ffffff",
        top: 200,
        textAlign: "center",
      },
      {
        text: subheading || "",
        fromFrame: 20,
        fontSize: 38,
        fontWeight: 400,
        color: "rgba(255,255,255,0.85)",
        top: 380,
        textAlign: "center",
      },
    ],
    accentColor,
    showCTA: false,
  };

  const BENEFIT_SHOWCASE: ScenePlan = {
    type: "benefit_showcase",
    durationFrames: 4 * fps,  // 4 seconds — more time for bullets
    veo3Prompt: `Professional person looking happy and relieved, bright modern office, 
      warm lighting, success feeling, cinematic slow motion, vertical 9:16, 
      no text, photorealistic`,
    pexelsQuery: "professional success happy productivity",
    textOverlays: [
      ...(bullets.slice(0, 3).map((bullet, i) => ({
        text: `✅  ${bullet}`,
        fromFrame: 10 + i * 18,
        fontSize: 34,
        fontWeight: 600,
        color: "#ffffff",
        top: 300 + i * 100,
        textAlign: "center" as const,
      }))),
    ],
    accentColor,
    showCTA: false,
  };

  const SOCIAL_PROOF: ScenePlan = {
    type: "social_proof",
    durationFrames: 3 * fps,
    veo3Prompt: `Happy diverse team of professionals celebrating success, 
      modern bright office, confetti or celebration mood, cinematic, 
      vertical 9:16, no text, photorealistic`,
    pexelsQuery: "team success celebration business results",
    textOverlays: [
      {
        text: proof || "Trusted by thousands",
        fromFrame: 15,
        fontSize: 52,
        fontWeight: 800,
        color: accentColor,
        top: 300,
        textAlign: "center",
      },
      {
        text: "Join them today",
        fromFrame: 30,
        fontSize: 36,
        fontWeight: 400,
        color: "rgba(255,255,255,0.8)",
        top: 480,
        textAlign: "center",
      },
    ],
    accentColor,
    showCTA: false,
  };

  const CTA_CLOSER: ScenePlan = {
    type: "cta_closer",
    durationFrames: 3 * fps,
    veo3Prompt: `Inspiring forward motion shot, person walking confidently toward 
      bright light, hopeful and empowering, cinematic slow motion, 
      vertical 9:16, no text, photorealistic`,
    pexelsQuery: "confident professional success future",
    textOverlays: [
      {
        text: hook,
        fromFrame: 10,
        fontSize: 72,
        fontWeight: 900,
        color: "#ffffff",
        top: 180,
        textAlign: "center",
      },
      {
        text: cta || "Get Started Today",
        fromFrame: 35,
        fontSize: 42,
        fontWeight: 900,
        color: "#ffffff",
        top: 900,
        textAlign: "center",
      },
    ],
    accentColor,
    showCTA: true,
  };

  const PRODUCT_REVEAL: ScenePlan = {
    type: "product_reveal",
    durationFrames: 3 * fps,
    veo3Prompt: `Elegant product reveal, rotating 360 degrees on clean studio surface, 
      dramatic lighting, luxury advertising style, 
      vertical 9:16, no text, photorealistic`,
    pexelsQuery: `${companyName} product reveal studio`,
    textOverlays: [
      {
        text: subheading || "",
        fromFrame: 20,
        fontSize: 46,
        fontWeight: 700,
        color: "#ffffff",
        top: 180,
        textAlign: "center",
      },
    ],
    accentColor,
    showCTA: false,
  };

  const STAT_HIGHLIGHT: ScenePlan = {
    type: "stat_highlight",
    durationFrames: 2 * fps,
    veo3Prompt: `Abstract data visualization, numbers and charts appearing, 
      dark premium background, cinematic, growth and success theme, 
      vertical 9:16, no text, photorealistic`,
    pexelsQuery: "data analytics business growth results",
    textOverlays: [
      {
        text: proof || "Results that speak",
        fromFrame: 10,
        fontSize: 60,
        fontWeight: 900,
        color: accentColor,
        top: 350,
        textAlign: "center",
      },
    ],
    accentColor,
    showCTA: false,
  };

  // ── Choose scene sequence based on content type ───────────────────────
  if (isProduct) {
    return [
      HOOK_OPENER,
      PRODUCT_REVEAL,
      BENEFIT_SHOWCASE,
      SOCIAL_PROOF,
      CTA_CLOSER,
    ];
  }

  if (isSaaS) {
    return [
      HOOK_OPENER,
      PROBLEM_AGITATE,
      BENEFIT_SHOWCASE,
      STAT_HIGHLIGHT,
      CTA_CLOSER,
    ];
  }

  if (isService || isEvent) {
    return [
      HOOK_OPENER,
      PROBLEM_AGITATE,
      BENEFIT_SHOWCASE,
      CTA_CLOSER,
    ];
  }

  // Default sequence — works for anything
  return [
    HOOK_OPENER,
    BENEFIT_SHOWCASE,
    SOCIAL_PROOF,
    CTA_CLOSER,
  ];
}