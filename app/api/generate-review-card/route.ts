/**
 * app/api/generate-review-card/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates review card shapes. Images are baked into `src` at build time
 * so NO slot resolution is required — the canvas renders them immediately.
 *
 * POST body:
 *   authorName        string
 *   rating            number (1–5)
 *   body              string
 *   reviewerPhotoUrl? string  (already-uploaded URL)
 *   productImageUrl?  string  (already-uploaded URL)
 *   orgName?          string
 *   primaryColor?     string  hex
 *   accentColor?      string  hex
 *
 * Response:
 *   { ok: true, shapes, canvasWidth, canvasHeight, campaignData }
 */

import { NextResponse } from "next/server";
import {
  buildReviewCardShapes,
  REVIEW_CARD_W,
  REVIEW_CARD_H,
  type ReviewCardData,
} from "@/lib/review-card-builder";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      authorName,
      rating,
      body: reviewBody,
      reviewerPhotoUrl,
      productImageUrl,
      orgName,
      primaryColor,
      accentColor,
    } = body;

    if (!authorName || !rating) {
      return NextResponse.json(
        { ok: false, error: "authorName and rating are required" },
        { status: 400 }
      );
    }

    const data: ReviewCardData = {
      authorName,
      rating:           Number(rating),
      body:             reviewBody  || "",
      reviewerPhotoUrl: reviewerPhotoUrl || null,
      productImageUrl:  productImageUrl  || null,
      orgName:          orgName          || undefined,
      primaryColor:     primaryColor     || undefined,
      accentColor:      accentColor      || undefined,
    };

    // Images are injected as `src` in the shapes themselves — no slot resolution needed
    const shapes = buildReviewCardShapes(data);

    // Minimal campaignData for text dataField binding on canvas
    const campaignData = {
      companyName:   orgName    || "",
      review_text:   reviewBody || "",
      review_author: authorName,
      // No imageSlots needed — images go via shape.src
    };

    return NextResponse.json({
      ok:          true,
      shapes,
      canvasWidth:  REVIEW_CARD_W,
      canvasHeight: REVIEW_CARD_H,
      campaignData,
    });
  } catch (err: any) {
    console.error("[generate-review-card]", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to generate review card" },
      { status: 500 }
    );
  }
}