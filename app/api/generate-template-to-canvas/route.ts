import { NextRequest, NextResponse } from "next/server";
import type { CampaignData } from "@/lib/types";
import { buildOfferLayoutResult, type LayoutVariant } from "@/lib/layout-planner";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      campaignData,
      canvasWidth = 1080,
      canvasHeight = 1350,
      previousLayout = null,
      includeDebug = true,
    }: {
      campaignData?: Partial<CampaignData>;
      canvasWidth?: number;
      canvasHeight?: number;
      previousLayout?: LayoutVariant | null;
      includeDebug?: boolean;
    } = body || {};

    const safeCanvasWidth =
      typeof canvasWidth === "number" && Number.isFinite(canvasWidth) && canvasWidth > 0
        ? Math.round(canvasWidth) : 1080;

    const safeCanvasHeight =
      typeof canvasHeight === "number" && Number.isFinite(canvasHeight) && canvasHeight > 0
        ? Math.round(canvasHeight) : 1350;

    // ✅ Plan at actual canvas size — no post-scaling needed
    const result = await buildOfferLayoutResult(campaignData || {}, {
      canvasWidth: safeCanvasWidth,
      canvasHeight: safeCanvasHeight,
      previousLayout,
    });

    return NextResponse.json({
      success: true,
      shapes: result.shapes,
      campaignData: result.campaign,
      meta: {
        layout: result.composition.layout,
        palette: result.palette.name,
        score: result.score,
        brand: {
          seed: result.brand.seed,
          layoutBias: result.brand.layoutBias,
          cardStyle: result.brand.cardStyle,
          decorDensity: result.brand.decorDensity,
        },
      },
      ...(includeDebug
        ? {
            debug: {
              direction: result.direction,
              composition: result.composition,
              decorPlan: result.decorPlan,
              palette: result.palette,
              skeleton: result.skeleton,
              placements: result.placements,
              score: result.score,
            },
          }
        : {}),
    });
  } catch (error: any) {
    console.error("[generate-template-to-canvas] error:", error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to generate template" },
      { status: 500 }
    );
  }
}