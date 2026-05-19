"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  preloadFonts,
  createRenderer,
  type Renderer,
  type CanvasSegment as RendererCanvasSegment,
} from "@/lib/canvas-renderer";
import type { CampaignData, TemplateShape } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type PlannerItem = {
  id: string;
  title: string;
  platform: string;
  status: string;
  scheduled_at?: string | null;
  caption?: string;
  metadata?: any;
};

const C = {
  muted: "rgba(255,255,255,0.48)",
  mono: "'DM Mono', monospace",
};

function getCampaignValueFromData(data: CampaignData, field: string): string {
  const d = (data || {}) as any;
  const direct = d[field];

  if (typeof direct === "string") return direct;
  if (typeof direct === "number") return String(direct);

  if (field === "headline") return d.headline || d.hook || "";
  if (field === "subheadline") return d.subheadline || d.subheading || "";
  if (field === "description") return d.description || d.subheading || "";
  if (field === "product_name") return d.product_name || d.companyName || "";

  if (field === "campaign_label") return d.campaign_label || d.hook_tag || "";
  if (field === "collection_label") return d.collection_label || "";
  if (field === "footer_label") return d.footer_label || d.companyName || "";

  if (field === "cta_text") return d.cta_text || d.cta || d.offer_cta || "";
  if (field === "offer_value") return d.offer_value || d.price_label || "";
  if (field === "offer_label") return d.offer_label || d.hook_tag || "";

  if (field === "proof") return d.proof || "";

  if (field === "feature_1") return d.feature_1 || d.bullet_1 || d.bullets?.[0] || "";
  if (field === "feature_2") return d.feature_2 || d.bullet_2 || d.bullets?.[1] || "";
  if (field === "feature_3") return d.feature_3 || d.bullet_3 || d.bullets?.[2] || "";
  if (field === "feature_4") return d.feature_4 || d.metadata?.[0]?.value || "";

  if (field === "phone") return d.phone || d.businessInfo?.phone_primary || "";
  if (field === "website") return d.website || d.businessInfo?.website || "";
  if (field === "email") return d.email || d.businessInfo?.email_primary || "";
  if (field === "whatsapp") return d.whatsapp || d.businessInfo?.whatsapp || "";

  if (field === "business_website") return d.website || d.businessInfo?.website || "";

  if (field === "contact_row1") {
    const company = d.companyName || "NeuroFlow";
    const phone = d.phone || d.businessInfo?.phone_primary || "";
    const email = d.email || d.businessInfo?.email_primary || "";
    return [company, phone, email].filter(Boolean).join(" · ");
  }

  if (field === "contact_row2") {
    const city = d.city || d.businessInfo?.city || "";
    const country = d.country || d.businessInfo?.country || "";
    const instagram = d.instagram_url ? "IG: @neuroflowai" : "";
    return [city, country, instagram].filter(Boolean).join(" · ");
  }

  if (field === "review_text") return d.review_text || d.reviews?.[0]?.body || "";
  if (field === "review_author") return d.review_author || d.reviews?.[0]?.author_name || "";
  if (field === "review_rating") return d.reviews?.[0]?.rating ? "★★★★★" : "";

  if (field === "offer_title") return d.offer_title || d.offers?.[0]?.title || "";
  if (field === "offer_description") return d.offer_description || d.offers?.[0]?.description || "";
  if (field === "price") return d.price_label || "";
  if (field === "discount_label") return d.hook_tag || d.offer_label || "";
  if (field === "social_handle") return d.social_handle || "@neuroflowai";

  return "";
}

function getSlotUrlFromData(
  data: CampaignData,
  slotKey: string,
  logoUrl: string | null,
): string | null {
  const d = (data || {}) as any;

  if (slotKey === "logo") return logoUrl || d.logo || d.imageSlots?.logo?.url || null;

  const slotUrl = d.imageSlots?.[slotKey]?.url;
  if (slotUrl) return slotUrl;

  if (slotKey === "hero_person") return d.heroImage || d.imageSlots?.heroImage?.url || null;
  if (slotKey === "heroImage") return d.heroImage || d.imageSlots?.hero_person?.url || null;
  if (slotKey === "dashboard_image") return d.dashboard_image || d.imageSlots?.dashboard_image?.url || null;

  if (slotKey === "sponsor_1") return d.sponsor_logo_1 || d.sponsors?.[0]?.logo_url || null;
  if (slotKey === "sponsor_2") return d.sponsor_logo_2 || d.sponsors?.[1]?.logo_url || null;
  if (slotKey === "sponsor_3") return d.sponsor_logo_3 || d.sponsors?.[2]?.logo_url || null;

  return null;
}

function sanitizeShapes(shapes: TemplateShape[]): TemplateShape[] {
  return (Array.isArray(shapes) ? shapes : [])
    .filter(Boolean)
    .map((shape: any, index: number) => ({
      ...shape,
      id: shape.id || `shape-${index}`,
      type: shape.type || "rectangle",
      x: Number.isFinite(Number(shape.x)) ? Number(shape.x) : 0,
      y: Number.isFinite(Number(shape.y)) ? Number(shape.y) : 0,
      width: Number.isFinite(Number(shape.width)) ? Number(shape.width) : 100,
      height: Number.isFinite(Number(shape.height)) ? Number(shape.height) : 100,
      zIndex: Number.isFinite(Number(shape.zIndex)) ? Number(shape.zIndex) : index,
      borderWidth: Number.isFinite(Number(shape.borderWidth)) ? Number(shape.borderWidth) : 0,
      borderRadius: Number.isFinite(Number(shape.borderRadius)) ? Number(shape.borderRadius) : 0,
      radius: Number.isFinite(Number(shape.radius)) ? Number(shape.radius) : 0,
      opacity: shape.opacity === undefined ? 1 : Number(shape.opacity),
      backgroundColor:
        shape.backgroundColor ??
        (shape.type === "text" || shape.type === "image" ? "transparent" : "rgba(255,255,255,0)"),
      textColor: shape.textColor ?? "#ffffff",
      borderColor: shape.borderColor ?? "transparent",
      fontFamily: shape.fontFamily || "'Montserrat', sans-serif",
      fontSize: Number.isFinite(Number(shape.fontSize)) ? Number(shape.fontSize) : 24,
      fontWeight: shape.fontWeight ?? 700,
      textAlign: shape.textAlign || "left",
      lineHeight: Number.isFinite(Number(shape.lineHeight)) ? Number(shape.lineHeight) : 1.15,
      letterSpacing: Number.isFinite(Number(shape.letterSpacing)) ? Number(shape.letterSpacing) : 0,
      fit: shape.fit || "cover",
      gradientColors: Array.isArray(shape.gradientColors)
        ? shape.gradientColors.filter((g: any) => g && typeof g.color === "string")
        : undefined,
    })) as TemplateShape[];
}

function CanvasPreview({
  campaignData,
  shapes,
  canvasWidth,
  canvasHeight,
}: {
  campaignData: CampaignData;
  shapes: TemplateShape[];
  canvasWidth: number;
  canvasHeight: number;
  backgroundImage?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [fontsReady, setFontsReady] = useState(false);

  const zoom = 0.34;
  const safeShapes = useMemo(() => sanitizeShapes(shapes), [shapes]);

  useEffect(() => {
    preloadFonts().then(() => setFontsReady(true)).catch(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    rendererRef.current?.destroy();

    rendererRef.current = createRenderer(canvasRef.current, {
      getCampaignValue: (field: string) => getCampaignValueFromData(campaignData, field),
      getSlotUrl: (slotKey: string, logoUrl: string | null) =>
        getSlotUrlFromData(campaignData, slotKey, logoUrl),
    });

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [campaignData]);

  useEffect(() => {
    if (!rendererRef.current) return;

    const segment: RendererCanvasSegment = {
      id: "planner-composed",
      instanceId: "planner-composed",
      name: "Planner Preview",
      description: "Monthly planner canvas preview",
      segment_type: "campaign_composition",
      internal_segment_type: "campaign_composition",
      requested_type: "campaign_composition",
      y: 0,
      segment_height: canvasHeight,
      shapes: safeShapes as any[],
    };

    void rendererRef.current.draw(
      [segment],
      "#7c3aed",
      ((campaignData as any)?.logo || null) as string | null,
      null,
      null,
    );
  }, [campaignData, safeShapes, canvasHeight, fontsReady]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
          color: C.muted,
          fontSize: 11,
          fontFamily: C.mono,
          width: canvasWidth * zoom,
        }}
      >
        <span>
          FULL CANVAS · {canvasWidth}x{canvasHeight}
        </span>
        <span>{safeShapes.length} shapes</span>
      </div>

      <div
        style={{
          width: canvasWidth * zoom,
          height: canvasHeight * zoom,
          borderRadius: 14,
          overflow: "hidden",
          background: "#05070b",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.7)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            width: canvasWidth * zoom,
            height: canvasHeight * zoom,
            display: "block",
          }}
        />
      </div>
    </div>
  );
}

export default function AiChatPlannerPage() {
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selected = useMemo(
    () => items.find((x) => x.id === selectedId) || items[0] || null,
    [items, selectedId],
  );

  useEffect(() => {
    async function loadPlannerItems() {
      setLoading(true);

      try {
        const threadsRes = await fetch(`${API_BASE}/ai-chat/threads`, {
          credentials: "include",
        });

        const threads = threadsRes.ok ? await threadsRes.json() : [];
        const threadId = threads?.[0]?.id;

        if (!threadId) {
          setItems([]);
          return;
        }

        const messagesRes = await fetch(
          `${API_BASE}/ai-chat/threads/${threadId}/messages`,
          { credentials: "include" },
        );

        const messages = messagesRes.ok ? await messagesRes.json() : [];

        const generatedMonthMessages = messages.filter(
          (m: any) => m.message_type === "generated_month",
        );

        const monthItems = generatedMonthMessages.flatMap((m: any) => {
          const metadata = m.metadata || {};
          const posts = metadata.items || [];

          return posts.map((post: any, index: number) => ({
            id: `${m.id}-${index}`,
            title:
              post?.draft?.structured?.headline ||
              post?.draft?.structured?.hook ||
              post?.draft?.body_text?.slice(0, 60) ||
              `Post ${index + 1}`,
            platform: post?.draft?.platform || "social",
            status: post?.draft?.status || "draft",
            scheduled_at: post?.draft?.scheduled_at || null,
            caption: [post?.draft?.body_text, post?.draft?.hashtags]
              .filter(Boolean)
              .join("\n\n"),
            metadata: post,
          }));
        });

        setItems(monthItems);
        setSelectedId(monthItems?.[0]?.id || null);
      } finally {
        setLoading(false);
      }
    }

    void loadPlannerItems();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#07070b",
        color: "white",
        display: "grid",
        gridTemplateColumns: "360px minmax(0, 1fr) 360px",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid rgba(255,255,255,0.08)",
          padding: 18,
          overflowY: "auto",
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 14 }}>
          Monthly Planner
        </h2>

        {loading && <p style={{ opacity: 0.5 }}>Loading...</p>}

        {!loading && items.length === 0 && (
          <p style={{ opacity: 0.5 }}>
            No monthly content generated yet.
          </p>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              style={{
                textAlign: "left",
                borderRadius: 16,
                border:
                  selected?.id === item.id
                    ? "1px solid rgba(167,139,250,0.8)"
                    : "1px solid rgba(255,255,255,0.08)",
                background:
                  selected?.id === item.id
                    ? "rgba(124,58,237,0.22)"
                    : "rgba(255,255,255,0.035)",
                color: "white",
                padding: 14,
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 13 }}>
                {item.title}
              </div>
              <div style={{ opacity: 0.45, fontSize: 11, marginTop: 6 }}>
                {item.platform} · {item.status}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section
        style={{
          padding: 24,
          overflow: "auto",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        {selected?.metadata?.campaign_data ? (
          <CanvasPreview
            campaignData={selected.metadata.campaign_data}
            shapes={selected.metadata.shapes || []}
            canvasWidth={selected.metadata.canvas_width || 1080}
            canvasHeight={selected.metadata.canvas_height || 1350}
            backgroundImage={selected.metadata.background_image || null}
          />
        ) : (
          <div
            style={{
              width: 420,
              height: 525,
              borderRadius: 18,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "grid",
              placeItems: "center",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            Select a post
          </div>
        )}
      </section>

      <aside
        style={{
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          padding: 18,
          overflowY: "auto",
        }}
      >
        {selected ? (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 900 }}>
              {selected.title}
            </h3>

            <p style={{ opacity: 0.45, fontSize: 12 }}>
              {selected.platform} · {selected.status}
            </p>

            {selected.scheduled_at && (
              <p style={{ opacity: 0.42, fontSize: 12 }}>
                Scheduled: {selected.scheduled_at}
              </p>
            )}

            <pre
              style={{
                whiteSpace: "pre-wrap",
                marginTop: 18,
                fontSize: 13,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.7)",
                fontFamily: "inherit",
              }}
            >
              {selected.caption || "No caption yet."}
            </pre>

            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              <button>Edit</button>
              <button>Approve</button>
              <button>Schedule</button>
            </div>
          </>
        ) : (
          <p style={{ opacity: 0.45 }}>Select a post.</p>
        )}
      </aside>
    </main>
  );
}
