import { NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      draftData,
      template,
      mediaAssets,
      sponsorsCount = 0,
      reviewsCount = 0,
    } = body || {};

    const prompt = `
You are selecting the best asset setup for a social media design template.

Return ONLY valid JSON.
No markdown.
No explanation.

Goal:
Choose:
1. the best hero asset
2. the best secondary asset if needed
3. whether to show price
4. whether to show sponsors
5. whether to show review
6. short proof text

Rules:
- A template is already selected. Do NOT choose a template.
- Prefer product/media assets with price for product promos
- Prefer assets tagged hero or featured for hero image
- Use secondary asset only if it improves the design
- Show sponsors only if useful for trust
- Show review only if useful for trust
- proofText should be short
- If no price is useful, return empty proofText
- If no secondary asset is needed, return null for secondaryAssetId

Draft data:
${JSON.stringify(draftData, null, 2)}

Template:
${JSON.stringify(template, null, 2)}

Media assets:
${JSON.stringify(mediaAssets, null, 2)}

Sponsors count: ${sponsorsCount}
Reviews count: ${reviewsCount}

Return JSON in this exact shape:
{
  "heroAssetId": "asset-id-or-null",
  "secondaryAssetId": "asset-id-or-null",
  "showPrice": true,
  "showSponsors": false,
  "showReview": false,
  "proofText": "USD 49.99"
}
`;

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      temperature: 0.3,
    });

    const parsed = JSON.parse(text);

    return NextResponse.json({
      ok: true,
      decision: {
        heroAssetId: parsed.heroAssetId || undefined,
        secondaryAssetId: parsed.secondaryAssetId || undefined,
        showPrice: !!parsed.showPrice,
        showSponsors: !!parsed.showSponsors,
        showReview: !!parsed.showReview,
        proofText: typeof parsed.proofText === "string" ? parsed.proofText : "",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "AI decision failed",
      },
      { status: 500 }
    );
  }
}