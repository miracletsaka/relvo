"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import {
  Sparkles,
  Save,
  Layers,
  Image as ImageIcon,
  Type,
  Square,
  Circle,
  Zap,
  Star,
  Users,
  MessageCircle,
  Layout,
  Footprints,
  Trash2,
  Download,
  MousePointer2,
  Move,
  SlidersHorizontal,
  Plus,
  Minus,
  Maximize2,
  BringToFront,
  SendToBack,
} from "lucide-react";

import { DEFAULT_CAMPAIGN_DATA } from "@/lib/campaign-context";
import {
  preloadFonts,
  createRenderer,
  getSelectedShape,
  hitTestShape,
  getResizeHandleAtPoint,
  type Renderer,
  type CanvasSegment as RendererCanvasSegment,
  type SelectedShapeRef,
  type DragMode,
} from "@/lib/canvas-renderer";
import { MIXED_POSTER_TEMPLATE } from "@/lib/templates/mixed-poster";

import { saveGeneratedSections } from "@/lib/save-generated-sections"
import {
  MIXED_POSTER_SECTIONS,
} from "@/lib/templates/mixed-poster";
import { composeRandomTemplateFromDb } from "@/lib/compose-random-template";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

const CANVAS_W = 1080;
const CANVAS_H = 1350;

const C = {
  bg: "#08080c",
  panel: "#0e0e14",
  border: "rgba(255,255,255,0.08)",
  surface: "rgba(255,255,255,0.04)",
  accent: "#7c3aed",
  accentLt: "#a78bfa",
  text: "#e4e4e7",
  muted: "rgba(255,255,255,0.48)",
  dim: "rgba(255,255,255,0.24)",
  green: "#34d399",
  cyan: "#22d3ee",
  red: "#f87171",
  mono: "'DM Mono', monospace",
  sans: "'Syne', sans-serif",
};

const SEGMENT_TYPES = [
  { key: "campaign_composition", label: "Campaign", icon: Sparkles, height: 1080, color: "#f97316" },
  { key: "hero_media", label: "Hero Image", icon: ImageIcon, height: 1080, color: "#06b6d4" },
  { key: "hero", label: "Hero Text", icon: Type, height: 860, color: "#7c3aed" },
  { key: "headline", label: "Headline", icon: Type, height: 260, color: "#4f46e5" },
  { key: "offer", label: "Offer", icon: Zap, height: 300, color: "#dc2626" },
  { key: "price", label: "Price", icon: Star, height: 220, color: "#059669" },
  { key: "features", label: "Features", icon: Layout, height: 340, color: "#0284c7" },
  { key: "review", label: "Review", icon: MessageCircle, height: 260, color: "#d97706" },
  { key: "cta", label: "CTA", icon: Square, height: 180, color: "#7c3aed" },
  { key: "sponsor", label: "Sponsors", icon: Users, height: 180, color: "#0d9488" },
  { key: "product_card", label: "Product", icon: Circle, height: 340, color: "#db2777" },
  { key: "footer", label: "Footer", icon: Footprints, height: 190, color: "#6366f1" },
] as const;

type SegmentTypeKey = typeof SEGMENT_TYPES[number]["key"];

const DB_SECTION_OPTIONS = [
  "background",
  "scene",
  "hero-image",
  "header",
  "hero-text",
  "offer",
  "cta",
  "footer",
  "features",
  "sponsors",
  "contact",
  "social",
  "trust-badges",
  "testimonial",
  "price",
  "qr-code",
];

type Brand = {
  id: string;
  display_name?: string;
  name?: string;
  primary_color?: string;
  logo_url?: string | null;
};

type Tone = {
  id: string;
  name: string;
  label?: string;
};

type GeneratedSegment = {
  id?: string;
  name: string;
  description: string;
  segment_type: string;
  internal_segment_type?: string;
  segment_height: number;
  shapes: any[];
};

type CanvasSegment = GeneratedSegment & {
  instanceId: string;
  requested_type: SegmentTypeKey;
  y: number;
};

type DragState = {
  mode: DragMode;
  segmentId: string;
  shapeId: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
};

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...((opts.headers as any) || {}),
    },
    ...opts,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((json as any).detail || (json as any).error || `${res.status} ${res.statusText}`);
  }

  return json;
}

function getCampaignValue(field: string): string {
  const data = DEFAULT_CAMPAIGN_DATA as any;

  const direct = data[field];
  if (typeof direct === "string") return direct;

  if (field === "sponsor_logo_1") {
    return data.sponsor_logo_1 || data.imageSlots?.sponsor_1?.url || "";
  }

  if (field === "sponsor_logo_2") {
    return data.sponsor_logo_2 || data.imageSlots?.sponsor_2?.url || "";
  }

  if (field === "sponsor_logo_3") {
    return data.sponsor_logo_3 || data.imageSlots?.sponsor_3?.url || "";
  }

  if (field === "logo") {
    return data.logo || "";
  }

  if (field === "heroImage") {
    return data.heroImage || "";
  }

  if (field === "background_image") {
    return data.background_image || "";
  }

  if (field === "headline") {
    return data.headline || data.hook || "Why Choose NeuroFlow AI";
  }

  if (field === "product_name") {
    return data.product_name || data.companyName || "";
  }

  if (field === "description") {
    return data.description || data.subheading || "";
  }

  if (field === "cta_text") {
    return data.cta_text || data.cta || data.offer_cta || "Book Your Free Demo";
  }

  if (field === "offer_value") {
    return data.offer_value || data.price_label || "50% OFF";
  }

  if (field === "offer_label") {
    return data.offer_label || data.hook_tag || "Limited Offer";
  }

  if (field === "campaign_label") {
    return data.campaign_label || data.hook_tag || "Premium Collection";
  }

  if (field === "collection_label") {
    return data.collection_label || "2026 Collection";
  }

  if (field === "footer_label") {
    return data.footer_label || data.companyName || "Premium Collection";
  }

  if (field === "business_website") {
    return data.website || data.businessInfo?.website || "";
  }

  if (field === "phone") {
    return data.phone || data.businessInfo?.phone_primary || "";
  }

  if (field === "website") {
    return data.website || data.businessInfo?.website || "";
  }

  if (field === "contact_row1") {
    const company = data.companyName || "NeuroFlow";
    const phone = data.phone || data.businessInfo?.phone_primary || "";
    const email = data.email || data.businessInfo?.email_primary || "";

    return `${company} · ${phone} · ${email}`;
  }

  if (field === "contact_row2") {
    const city = data.city || data.businessInfo?.city || "";
    const country = data.country || data.businessInfo?.country || "";
    const instagram = data.instagram_url ? "IG: @neuroflowai" : "";

    return [city, country, instagram].filter(Boolean).join(" · ");
  }

  if (field === "review_text") {
    return data.reviews?.[0]?.body || data.review_text || "";
  }

  if (field === "review_author") {
    return data.reviews?.[0]?.author_name || data.review_author || "";
  }

  if (field === "review_rating") {
    return "★★★★★";
  }

  if (field === "offer_title") {
    return data.offers?.[0]?.title || data.offer_title || "";
  }

  if (field === "offer_description") {
    return data.offers?.[0]?.description || data.offer_description || "";
  }

  if (field === "price") {
    return data.price_label || "From £99";
  }

  if (field === "compare_at_price") {
    return "";
  }

  if (field === "discount_label") {
    return data.hook_tag || "Limited Offer";
  }

  if (field === "proof") {
    return data.proof || "";
  }

  if (field === "feature_1") {
    return data.bullet_1 || data.bullets?.[0] || "";
  }

  if (field === "feature_2") {
    return data.bullet_2 || data.bullets?.[1] || "";
  }

  if (field === "feature_3") {
    return data.bullet_3 || data.bullets?.[2] || "";
  }

  if (field === "feature_4") {
    return data.metadata?.[0]?.value || "";
  }

  if (field === "social_handle") {
    return data.social_handle || "@neuroflowai";
  }

  return "";
}

function getSlotUrl(slotKey: string, logoUrl: string | null): string | null {
  const data = DEFAULT_CAMPAIGN_DATA as any;

  if (slotKey === "logo") return logoUrl || data.logo || null;

  const slotUrl = data.imageSlots?.[slotKey]?.url;
  if (slotUrl) return slotUrl;

  if (slotKey === "hero_person") return data.heroImage || null;
  if (slotKey === "dashboard_image") return data.imageSlots?.dashboard_image?.url || null;

  if (slotKey?.startsWith("sponsor_")) {
    const idx = Number(slotKey.replace("sponsor_", "")) - 1;
    return data.sponsors?.[idx]?.logo_url || data.imageSlots?.[slotKey]?.url || null;
  }

  return null;
}

function shapeGlobalRect(segment: CanvasSegment, shape: any) {
  return {
    x: Number(shape.x || 0),
    y: Number(segment.y || 0) + Number(shape.y || 0),
    width: Number(shape.width || 0),
    height: Number(shape.height || 0),
  };
}

function clampShapeToSegment(shape: any, segmentHeight: number) {
  const x = Math.max(0, Math.min(Number(shape.x || 0), CANVAS_W - 10));
  const y = Math.max(0, Math.min(Number(shape.y || 0), segmentHeight - 10));
  const width = Math.max(10, Math.min(Number(shape.width || 10), CANVAS_W - x));
  const height = Math.max(10, Math.min(Number(shape.height || 10), segmentHeight - y));

  return {
    ...shape,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function resizeShapeFromDrag(shape: any, segmentHeight: number, drag: DragState, dx: number, dy: number) {
  let x = drag.startX;
  let y = drag.startY;
  let width = drag.startW;
  let height = drag.startH;

  if (drag.mode.includes("e")) width = drag.startW + dx;
  if (drag.mode.includes("s")) height = drag.startH + dy;

  if (drag.mode.includes("w")) {
    x = drag.startX + dx;
    width = drag.startW - dx;
  }

  if (drag.mode.includes("n")) {
    y = drag.startY + dy;
    height = drag.startH - dy;
  }

  if (width < 10) {
    if (drag.mode.includes("w")) x = drag.startX + drag.startW - 10;
    width = 10;
  }

  if (height < 10) {
    if (drag.mode.includes("n")) y = drag.startY + drag.startH - 10;
    height = 10;
  }

  return clampShapeToSegment({ ...shape, x, y, width, height }, segmentHeight);
}

function layoutSegments(input: CanvasSegment[]): CanvasSegment[] {
  const segments = [...input];

  const composition = segments.find((s) => s.requested_type === "campaign_composition");
  if (composition) {
    return [
      {
        ...composition,
        y: 0,
        segment_height: CANVAS_H,
      },
    ];
  }

  const heroMedia = segments.find((s) => s.requested_type === "hero_media");
  const hero = segments.find((s) => s.requested_type === "hero");
  const footer = segments.find((s) => s.requested_type === "footer");

  const middle = segments.filter(
    (s) =>
      s.requested_type !== "hero_media" &&
      s.requested_type !== "hero" &&
      s.requested_type !== "footer",
  );

  let cursor = 0;
  const placed: CanvasSegment[] = [];

  if (heroMedia) {
    placed.push({
      ...heroMedia,
      y: 0,
      shapes: heroMedia.shapes.map((shape) => ({
        ...shape,
        zIndex: Math.min(Number(shape.zIndex || 0), 18),
      })),
    });
    cursor = Math.max(cursor, Math.min(heroMedia.segment_height, CANVAS_H));
  }

  if (hero) {
    placed.push({
      ...hero,
      y: 0,
      shapes: hero.shapes.map((shape) => ({
        ...shape,
        zIndex: shape.type === "text" ? Math.max(Number(shape.zIndex || 20), 20) : Number(shape.zIndex || 12),
      })),
    });
    cursor = Math.max(cursor, Math.min(hero.segment_height, CANVAS_H));
  }

  for (const seg of middle) {
    const footerHeight = footer?.segment_height || 0;
    const maxY = CANVAS_H - footerHeight;
    const y = Math.min(cursor, Math.max(0, maxY - seg.segment_height));
    placed.push({ ...seg, y });
    cursor = y + seg.segment_height;
  }

  if (footer) {
    placed.push({ ...footer, y: CANVAS_H - footer.segment_height });
  }

  return placed.sort((a, b) => {
    if (a.requested_type === "hero_media" && b.requested_type !== "hero_media") return -1;
    if (b.requested_type === "hero_media" && a.requested_type !== "hero_media") return 1;

    if (a.y !== b.y) return a.y - b.y;

    return 0;
  });
}

function Spin({ size = 14 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: "2px solid rgba(255,255,255,0.16)",
        borderTopColor: C.accentLt,
        borderRadius: 999,
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

export default function SegmentComposerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exportRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const rendererRef = useRef<Renderer | null>(null);

  const [fontsReady, setFontsReady] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [tones, setTones] = useState<Tone[]>([]);
  const [brandId, setBrandId] = useState("");
  const [toneId, setToneId] = useState("");
  const [segmentType, setSegmentType] = useState<SegmentTypeKey>("campaign_composition");
  const [selectedDbSections, setSelectedDbSections] = useState<string[]>([
  "background",
  "hero-image",
  "hero-text",
  "cta",
  "footer",
]);
  const [segments, setSegments] = useState<CanvasSegment[]>([
    MIXED_POSTER_TEMPLATE as CanvasSegment,
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedShape, setSelectedShape] = useState<SelectedShapeRef | null>(null);
  const [composingFromDb, setComposingFromDb] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const hasSavedGeneration = useRef(false);

  useEffect(() => {
  if (hasSavedGeneration.current) return;

  hasSavedGeneration.current = true;

  const run = async () => {
    try {
      console.log("Saving generated sections...");

      const result = await saveGeneratedSections({
        templateFamily: "mixed-poster",

        generationSource: "runtime-refresh",

        sections: MIXED_POSTER_SECTIONS,

        tags: [
          "mixed",
          "runtime",
          "generated",
        ],
      });

      console.log("Saved:", result);
    } catch (err) {
      console.error("SAVE FAILED", err);
    }
  };

  void run();
}, []);

  const toggleDbSection = useCallback((section: string) => {
  setSelectedDbSections((prev) => {
    if (prev.includes(section)) {
      return prev.filter((item) => item !== section);
    }

    return [...prev, section];
  });
}, []);

  const selectedBrand = useMemo(
    () => brands.find((b) => b.id === brandId) || null,
    [brands, brandId],
  );

  const selectedSegment = useMemo(
    () => segments.find((s) => s.instanceId === selectedId) || null,
    [segments, selectedId],
  );

  const selectedShapeData = useMemo(
    () => getSelectedShape(segments as RendererCanvasSegment[], selectedShape),
    [segments, selectedShape],
  );

  const brandColor = selectedBrand?.primary_color || "#7c3aed";
  const logoUrl = selectedBrand?.logo_url || (DEFAULT_CAMPAIGN_DATA as any).logo || null;

  const zoom = 0.34;

  const updateShape = useCallback((shapeId: string, patch: any) => {
    if (!selectedId) return;

    setSegments((prev) =>
      prev.map((segment) => {
        if (segment.instanceId !== selectedId) return segment;

        return {
          ...segment,
          shapes: segment.shapes.map((shape) => {
            if (shape.id !== shapeId) return shape;
            return clampShapeToSegment({ ...shape, ...patch }, segment.segment_height);
          }),
        };
      }),
    );
  }, [selectedId]);

  const composeFromDb = useCallback(async () => {
  setComposingFromDb(true);
  setError(null);
  setMessage(null);

  try {
    const template = await composeRandomTemplateFromDb(
      "mixed-poster",
      selectedDbSections,
    );

    setSegments([
      {
        ...(template as any),
        instanceId: `db-composed-${Date.now()}`,
        requested_type: "campaign_composition",
        y: 0,
        segment_height: CANVAS_H,
      },
    ]);

    setSelectedId(null);
    setSelectedShape(null);

    setMessage("Generated image from saved database sections.");
  } catch (e: any) {
    setError(e.message || "Failed to compose image from database.");
  } finally {
    setComposingFromDb(false);
  }
}, [selectedDbSections]);
  

  const updateSelectedShape = useCallback((patch: any) => {
    if (!selectedShape) return;
    updateShape(selectedShape.shapeId, patch);
  }, [selectedShape, updateShape]);

  const removeSelectedShape = useCallback(() => {
    if (!selectedShape) return;

    setSegments((prev) =>
      prev.map((segment) => {
        if (segment.instanceId !== selectedShape.segmentId) return segment;

        return {
          ...segment,
          shapes: segment.shapes.filter((shape) => shape.id !== selectedShape.shapeId),
        };
      }),
    );

    setSelectedShape(null);
  }, [selectedShape]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [bs, ts] = await Promise.all([
          apiFetch<Brand[]>("/brands?active_only=false"),
          apiFetch<Tone[]>("/tones?active_only=false"),
        ]);

        const brandList = Array.isArray(bs) ? bs : (bs as any).items || [];
        const toneList = Array.isArray(ts) ? ts : [];

        setBrands(brandList);
        setTones(toneList);

        if (brandList.length) setBrandId(brandList[0].id);
        if (toneList.length) setToneId(toneList[0].id);
      } catch (e: any) {
        setError(e.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    rendererRef.current = createRenderer(canvasRef.current, {
      getCampaignValue,
      getSlotUrl,
    });

    preloadFonts().then(() => setFontsReady(true));

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.draw(
      segments as RendererCanvasSegment[],
      brandColor,
      logoUrl,
      selectedId,
      selectedShape,
    );
  }, [segments, brandColor, logoUrl, selectedId, selectedShape, fontsReady]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!selectedShapeData || !selectedShape) return;

      const active = document.activeElement;
      if (active && ["INPUT", "SELECT", "TEXTAREA"].includes(active.tagName)) return;

      const step = event.shiftKey ? 10 : 1;
      const shape = selectedShapeData.shape;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelectedShape();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        updateSelectedShape({ x: Number(shape.x || 0) - step });
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        updateSelectedShape({ x: Number(shape.x || 0) + step });
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        updateSelectedShape({ y: Number(shape.y || 0) - step });
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        updateSelectedShape({ y: Number(shape.y || 0) + step });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedShapeData, selectedShape, removeSelectedShape, updateSelectedShape]);

  const generateSegment = useCallback(async () => {
    if (!brandId) {
      setError("Select a brand first");
      return;
    }

    setGenerating(true);
    setError(null);
    setMessage(null);

    try {
      const res = await apiFetch<{
        ok?: boolean;
        success?: boolean;
        saved: boolean;
        segment: GeneratedSegment;
      }>("/segments/generate", {
        method: "POST",
        body: JSON.stringify({
          segment_type: segmentType,
          brand_id: brandId,
          tone_id: toneId || null,
          canvas_width: CANVAS_W,
          segment_height: segmentType === "campaign_composition" ? CANVAS_H : null,
          orientation: "landscape",
          save: false,
        }),
      });

      const seg = res.segment;

      if (!seg?.shapes?.length) {
        throw new Error("AI generated an empty segment.");
      }

      const instance: CanvasSegment = {
        ...seg,
        instanceId: `${segmentType}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        requested_type: segmentType,
        y: 0,
      };

      setSegments((prev) => {
        if (segmentType === "campaign_composition") {
          return layoutSegments([instance]);
        }

        const withoutComposition = prev.filter((s) => s.requested_type !== "campaign_composition");
        const withoutSame = withoutComposition.filter((s) => s.requested_type !== segmentType);

        return layoutSegments([...withoutSame, instance]);
      });

      setSelectedId(instance.instanceId);
      setSelectedShape(null);

      setMessage(`${SEGMENT_TYPES.find((s) => s.key === segmentType)?.label || "Segment"} placed on canvas`);
    } catch (e: any) {
      setError(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [brandId, toneId, segmentType]);

  const removeSelected = useCallback(() => {
    if (!selectedId) return;

    setSegments((prev) => layoutSegments(prev.filter((s) => s.instanceId !== selectedId)));
    setSelectedId(null);
    setSelectedShape(null);
  }, [selectedId]);

  const clearCanvas = useCallback(() => {
    setSegments([]);
    setSelectedId(null);
    setSelectedShape(null);
  }, []);

  const saveSelectedSegment = useCallback(async () => {
    if (!selectedSegment) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await apiFetch<any>("/segments", {
        method: "POST",
        body: JSON.stringify({
          segment_type_key: selectedSegment.requested_type,
          name: selectedSegment.name,
          description: selectedSegment.description,
          shapes: selectedSegment.shapes,
          segment_height: selectedSegment.segment_height,
          compatible_tones: toneId ? [toneId] : [],
          thumbnail_url: null,
          color_variant: "brand",
          tags: [selectedSegment.requested_type, "ai-generated"],
        }),
      });

      setMessage("Selected segment saved");
    } catch (e: any) {
      setError(e.message || "Save route not ready yet");
    } finally {
      setSaving(false);
    }
  }, [selectedSegment, toneId]);

  const downloadFullImage = useCallback(async () => {
    if (!exportRef.current) return;

    const exportRenderer = createRenderer(exportRef.current, {
      getCampaignValue,
      getSlotUrl,
    });

    await exportRenderer.draw(
      segments as RendererCanvasSegment[],
      brandColor,
      logoUrl,
      null,
      null,
    );

    exportRenderer.destroy();

    const a = document.createElement("a");
    a.href = exportRef.current.toDataURL("image/png", 1);
    a.download = `segment-composition-${Date.now()}.png`;
    a.click();
  }, [segments, brandColor, logoUrl]);

  const getCanvasPoint = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const point = getCanvasPoint(event);
      if (!point) return;

      if (selectedShape) {
        const selected = getSelectedShape(segments as RendererCanvasSegment[], selectedShape);

        if (selected) {
          const handleMode = getResizeHandleAtPoint(
            selected.segment,
            selected.shape,
            point.x,
            point.y,
          );

          if (handleMode) {
            dragRef.current = {
              mode: handleMode,
              segmentId: selected.segment.instanceId,
              shapeId: selected.shape.id,
              startClientX: event.clientX,
              startClientY: event.clientY,
              startX: Number(selected.shape.x || 0),
              startY: Number(selected.shape.y || 0),
              startW: Number(selected.shape.width || 0),
              startH: Number(selected.shape.height || 0),
            };
            return;
          }
        }
      }

      const shapeHit = hitTestShape(segments as RendererCanvasSegment[], point.x, point.y);

      if (shapeHit) {
        const found = getSelectedShape(segments as RendererCanvasSegment[], shapeHit);
        if (!found) return;

        setSelectedId(shapeHit.segmentId);
        setSelectedShape(shapeHit);

        dragRef.current = {
          mode: "move",
          segmentId: shapeHit.segmentId,
          shapeId: shapeHit.shapeId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startX: Number(found.shape.x || 0),
          startY: Number(found.shape.y || 0),
          startW: Number(found.shape.width || 0),
          startH: Number(found.shape.height || 0),
        };

        return;
      }

      const segHit = [...segments].reverse().find(
        (seg) => point.y >= seg.y && point.y <= seg.y + seg.segment_height,
      );

      setSelectedId(segHit?.instanceId || null);
      setSelectedShape(null);
    },
    [getCanvasPoint, segments, selectedShape],
  );

  const handlePointerMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dx = ((event.clientX - drag.startClientX) / rect.width) * CANVAS_W;
    const dy = ((event.clientY - drag.startClientY) / rect.height) * CANVAS_H;

    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.instanceId !== drag.segmentId) return seg;

        return {
          ...seg,
          shapes: seg.shapes.map((shape) => {
            if (shape.id !== drag.shapeId) return shape;

            if (drag.mode === "move") {
              return clampShapeToSegment(
                {
                  ...shape,
                  x: drag.startX + dx,
                  y: drag.startY + dy,
                },
                seg.segment_height,
              );
            }

            return resizeShapeFromDrag(shape, seg.segment_height, drag, dx, dy);
          }),
        };
      }),
    );
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const selectedCursor = useMemo(() => {
    const mode = dragRef.current?.mode;

    if (!mode) return "pointer";
    if (mode === "move") return "grabbing";
    if (mode === "resize-n" || mode === "resize-s") return "ns-resize";
    if (mode === "resize-e" || mode === "resize-w") return "ew-resize";
    if (mode === "resize-nw" || mode === "resize-se") return "nwse-resize";

    return "nesw-resize";
  }, [segments]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: C.bg, color: C.text, fontFamily: C.sans }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=Bebas+Neue&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        button { font-family: ${C.sans}; }
      `}</style>

      <aside style={{ width: 300, flexShrink: 0, background: C.panel, borderRight: `1px solid ${C.border}`, overflowY: "auto" }}>
        <div style={{ padding: 20, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: `linear-gradient(135deg,${C.accent},#4f46e5)`, display: "grid", placeItems: "center" }}>
              <Layers size={18} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>Segment Composer</div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono }}>generate · stack · resize · edit</div>
            </div>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <label style={labelStyle}>Brand</label>
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)} style={selectStyle}>
            <option value="">Select brand...</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.display_name || b.name || b.id}
              </option>
            ))}
          </select>

          <div style={{ height: 12 }} />

          <label style={labelStyle}>Tone</label>
          <select value={toneId} onChange={(e) => setToneId(e.target.value)} style={selectStyle}>
            <option value="">Any tone</option>
            {tones.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label || t.name}
              </option>
            ))}
          </select>

          <div style={{ height: 16 }} />

          <label style={labelStyle}>SECTION CHOICES</label>
    
              <div style={{ marginTop: 14 }}>
  <label style={labelStyle}>DB Sections</label>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
    }}
  >
    {DB_SECTION_OPTIONS.map((section) => {
      const active = selectedDbSections.includes(section);

      return (
        <button
          key={section}
          type="button"
          onClick={() => toggleDbSection(section)}
          style={{
            borderRadius: 10,
            border: `1px solid ${
              active ? "rgba(245,208,160,0.5)" : C.border
            }`,
            background: active
              ? "rgba(245,208,160,0.14)"
              : C.surface,
            color: active ? "#f5d0a0" : C.muted,
            padding: "8px 9px",
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 900,
            textAlign: "center",
          }}
        >
          {section}
        </button>
      );
    })}
  </div>
</div>
          <button
            disabled={generating || loading || !brandId}
            onClick={() => void generateSegment()}
            style={{
              width: "100%",
              marginTop: 16,
              border: 0,
              borderRadius: 14,
              padding: "14px 16px",
              background: `linear-gradient(135deg,${C.accent},#4f46e5)`,
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: generating || !brandId ? 0.6 : 1,
            }}
          >
            {generating ? <><Spin /> Generating...</> : <><Sparkles size={15} /> Generate + Place</>}
          </button>

          <button disabled={!segments.length} onClick={() => void downloadFullImage()} style={secondaryButtonStyle}>
            <Download size={14} /> Download Full Image
          </button>

          <button disabled={!segments.length} onClick={clearCanvas} style={{ ...secondaryButtonStyle, color: C.red }}>
            <Trash2 size={14} /> Clear Canvas
          </button>

          {error && <div style={errorStyle}>{error}</div>}
          {message && <div style={successStyle}>{message}</div>}

          <div style={{ marginTop: 18, padding: 12, border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface }}>
            <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 8 }}>Selected Segment</div>
            {!selectedSegment ? (
              <div style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>Click a section on the canvas</div>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{selectedSegment.name}</div>
                <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono, marginTop: 4 }}>
                  {selectedSegment.requested_type} · y={selectedSegment.y}px · {selectedSegment.segment_height}px · {selectedSegment.shapes.length} shapes
                </div>

                <button
                  onClick={() => void saveSelectedSegment()}
                  disabled={saving}
                  style={{
                    width: "100%",
                    marginTop: 12,
                    border: "1px solid rgba(52,211,153,0.35)",
                    background: "rgba(52,211,153,0.12)",
                    color: C.green,
                    borderRadius: 10,
                    padding: "10px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontWeight: 800,
                  }}
                >
                  {saving ? <><Spin /> Saving...</> : <><Save size={14} /> Save This Segment</>}
                </button>

                <button
                  onClick={removeSelected}
                  style={{
                    width: "100%",
                    marginTop: 8,
                    border: "1px solid rgba(248,113,113,0.25)",
                    background: "rgba(248,113,113,0.08)",
                    color: C.red,
                    borderRadius: 10,
                    padding: "9px 12px",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  Remove From Canvas
                </button>
              </>
            )}
          </div>

          <div style={{ marginTop: 18 }}>
            <label style={labelStyle}>Canvas Stack</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {segments.length === 0 ? (
                <div style={{ fontSize: 11, color: C.dim, fontFamily: C.mono }}>No sections yet.</div>
              ) : (
                segments.map((seg) => (
                  <button
                    key={seg.instanceId}
                    onClick={() => {
                      setSelectedId(seg.instanceId);
                      setSelectedShape(null);
                    }}
                    style={{
                      textAlign: "left",
                      padding: "9px 10px",
                      borderRadius: 10,
                      border: `1px solid ${selectedId === seg.instanceId ? C.accentLt : C.border}`,
                      background: selectedId === seg.instanceId ? "rgba(124,58,237,0.14)" : C.surface,
                      color: C.text,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800 }}>
                      {seg.requested_type === "hero_media" ? "hero image" : seg.requested_type}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono }}>
                      y={seg.y}px · h={seg.segment_height}px
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      <main
  style={{
    overflow: "auto",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: 24,
    flex: 1,
    minWidth: 0,
  }}
>
  <div>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 10,
        color: C.muted,
        fontSize: 11,
        fontFamily: C.mono,
        width: CANVAS_W * zoom,
      }}
    >
      <span>FULL CANVAS · {CANVAS_W}x{CANVAS_H}</span>
      <span>{segments.length} sections</span>
      <button
  disabled={composingFromDb}
  onClick={() => void composeFromDb()}
  style={{
    width: "100%",
    marginTop: 10,
    border: "1px solid rgba(245,208,160,0.35)",
    background: "rgba(245,208,160,0.12)",
    color: "#f5d0a0",
    borderRadius: 12,
    padding: "12px 14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 900,
  }}
>
  {composingFromDb ? "Composing..." : "Generate From DB"}
</button>

    </div>

    <div
      style={{
        width: CANVAS_W * zoom,
        height: CANVAS_H * zoom,
        borderRadius: 10,
        overflow: "hidden",
        background: "#05070b",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.7)",
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        style={{
          width: CANVAS_W * zoom,
          height: CANVAS_H * zoom,
          display: "block",
          cursor: selectedCursor,
        }}
      />
    </div>
  </div>
</main>

      <aside style={{ width: 300, flexShrink: 0, background: C.panel, borderLeft: `1px solid ${C.border}`, overflowY: "auto" }}>
        <div style={{ padding: 18, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SlidersHorizontal size={16} color={C.accentLt} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>Shape Inspector</div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono }}>move · resize · style</div>
            </div>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          {!selectedShapeData ? (
            <div style={{ padding: 16, border: `1px dashed ${C.border}`, borderRadius: 12, color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
              <MousePointer2 size={18} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 800, color: C.text }}>Select a shape</div>
              <div>Click a text, background, line, image, or decoration on the canvas. Drag to move. Drag green handles to resize.</div>
            </div>
          ) : (
            <ShapeInspector
              selected={selectedShapeData as any}
              updateSelectedShape={updateSelectedShape}
              removeSelectedShape={removeSelectedShape}
            />
          )}
        </div>
      </aside>

      {!fontsReady && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(124,58,237,0.95)",
            backdropFilter: "blur(12px)",
            color: "#fff",
            padding: "10px 22px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.06em",
            display: "flex",
            alignItems: "center",
            gap: 10,
            zIndex: 9999,
            boxShadow: "0 8px 40px rgba(124,58,237,0.35), 0 2px 12px rgba(0,0,0,0.5)",
            pointerEvents: "none",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "#fff",
              borderRadius: 999,
              animation: "spin 0.7s linear infinite",
              display: "inline-block",
            }}
          />
          Loading Bebas Neue + Syne…
        </div>
      )}

      <canvas ref={exportRef} style={{ display: "none" }} />
    </div>
  );
}

function ShapeInspector({
  selected,
  updateSelectedShape,
  removeSelectedShape,
}: {
  selected: { segment: CanvasSegment; shape: any };
  updateSelectedShape: (patch: any) => void;
  removeSelectedShape: () => void;
}) {
  const shape = selected.shape;
  const type = String(shape.type || "shape");

  const patchNumber = (key: string, value: string) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    updateSelectedShape({ [key]: number });
  };

  const bringForward = () => updateSelectedShape({ zIndex: Number(shape.zIndex || 0) + 1 });
  const sendBackward = () => updateSelectedShape({ zIndex: Number(shape.zIndex || 0) - 1 });

  return (
    <div>
      <div style={{ padding: 12, border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 900 }}>{type}</div>
        <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono, marginTop: 4 }}>
          {shape.dataField ? `field: ${shape.dataField}` : shape.slotKey ? `slot: ${shape.slotKey}` : shape.id}
        </div>
      </div>

      <label style={labelStyle}>Position / Bounding Box</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label="X" value={shape.x || 0} onChange={(v) => patchNumber("x", v)} />
        <Field label="Y" value={shape.y || 0} onChange={(v) => patchNumber("y", v)} />
        <Field label="Width" value={shape.width || 0} onChange={(v) => patchNumber("width", v)} />
        <Field label="Height" value={shape.height || 0} onChange={(v) => patchNumber("height", v)} />
      </div>

      <div style={{ height: 14 }} />

      <label style={labelStyle}>Layer / Opacity</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label="zIndex" value={shape.zIndex || 1} onChange={(v) => patchNumber("zIndex", v)} />
        <Field label="Opacity" value={shape.opacity ?? 1} step="0.05" onChange={(v) => patchNumber("opacity", v)} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <NudgeButton icon={<BringToFront size={13} />} label="Forward" onClick={bringForward} />
        <NudgeButton icon={<SendToBack size={13} />} label="Back" onClick={sendBackward} />
      </div>

      {(type === "image" || shape.rotation !== undefined) && (
        <>
          <div style={{ height: 18 }} />
          <label style={labelStyle}>Image</label>
          <Field label="Rotation" value={shape.rotation || 0} step="1" onChange={(v) => patchNumber("rotation", v)} />
          <div style={{ height: 10 }} />
          <Field label="Radius" value={shape.radius || 0} step="1" onChange={(v) => patchNumber("radius", v)} />
          <div style={{ height: 10 }} />
          <label style={labelStyle}>Fit</label>
          <select value={shape.fit || "cover"} onChange={(e) => updateSelectedShape({ fit: e.target.value })} style={selectStyle}>
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
          </select>
        </>
      )}

      {type === "text" && (
        <>
          <div style={{ height: 18 }} />
          <label style={labelStyle}>Typography</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Font size" value={shape.fontSize || 24} onChange={(v) => patchNumber("fontSize", v)} />
            <Field label="Weight" value={shape.fontWeight || 700} onChange={(v) => patchNumber("fontWeight", v)} />
            <Field label="Line height" value={shape.lineHeight || 1} step="0.05" onChange={(v) => patchNumber("lineHeight", v)} />
            <Field label="Spacing" value={shape.letterSpacing || 0} step="0.5" onChange={(v) => patchNumber("letterSpacing", v)} />
          </div>

          <div style={{ height: 10 }} />

          <label style={labelStyle}>Font Family</label>
          <select
            value={shape.fontFamily || "Bebas Neue"}
            onChange={(e) => updateSelectedShape({ fontFamily: e.target.value })}
            style={selectStyle}
          >
            <option value="Bebas Neue">Bebas Neue</option>
            <option value="Syne">Syne</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Inter">Inter</option>
            <option value="Arial">Arial</option>
          </select>

          <div style={{ height: 10 }} />

          <label style={labelStyle}>Align</label>
          <select
            value={shape.textAlign || "left"}
            onChange={(e) => updateSelectedShape({ textAlign: e.target.value })}
            style={selectStyle}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>

          <div style={{ height: 10 }} />

          <ColorField label="Text Color" value={shape.textColor || "#ffffff"} onChange={(v) => updateSelectedShape({ textColor: v })} />
        </>
      )}

      {(type === "rounded-rect" || type === "rectangle" || type === "circle") && (
        <>
          <div style={{ height: 18 }} />
          <label style={labelStyle}>Shape Style</label>
          <ColorField label="Background" value={shape.backgroundColor || "#05070b"} onChange={(v) => updateSelectedShape({ backgroundColor: v })} />
          <div style={{ height: 10 }} />
          <Field label="Radius" value={shape.borderRadius || 0} onChange={(v) => patchNumber("borderRadius", v)} />
        </>
      )}

      <div style={{ height: 18 }} />

      <label style={labelStyle}>Quick Adjust</label>
      <div style={{ display: "flex", gap: 8 }}>
        <NudgeButton icon={<Move size={13} />} label="-1 X" onClick={() => updateSelectedShape({ x: Number(shape.x || 0) - 1 })} />
        <NudgeButton icon={<Move size={13} />} label="+1 X" onClick={() => updateSelectedShape({ x: Number(shape.x || 0) + 1 })} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <NudgeButton icon={<Maximize2 size={13} />} label="W +" onClick={() => updateSelectedShape({ width: Number(shape.width || 100) + 10 })} />
        <NudgeButton icon={<Maximize2 size={13} />} label="H +" onClick={() => updateSelectedShape({ height: Number(shape.height || 100) + 10 })} />
      </div>

      {type === "text" && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <NudgeButton icon={<Minus size={13} />} label="Font -" onClick={() => updateSelectedShape({ fontSize: Math.max(8, Number(shape.fontSize || 24) - 2) })} />
          <NudgeButton icon={<Plus size={13} />} label="Font +" onClick={() => updateSelectedShape({ fontSize: Number(shape.fontSize || 24) + 2 })} />
        </div>
      )}

      <button
        onClick={removeSelectedShape}
        style={{
          width: "100%",
          marginTop: 16,
          border: "1px solid rgba(248,113,113,0.25)",
          background: "rgba(248,113,113,0.08)",
          color: C.red,
          borderRadius: 10,
          padding: "10px 12px",
          cursor: "pointer",
          fontWeight: 900,
        }}
      >
        Delete Shape
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <div>
      <label style={{ ...labelStyle, marginBottom: 5 }}>{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const safeHex = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#ffffff";

  return (
    <div>
      <label style={{ ...labelStyle, marginBottom: 5 }}>{label}</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="color"
          value={safeHex}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 42, height: 36, border: 0, borderRadius: 8, background: "transparent" }}
        />
        <input value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
      </div>
    </div>
  );
}

function NudgeButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        border: `1px solid ${C.border}`,
        background: C.surface,
        color: C.muted,
        borderRadius: 10,
        padding: "8px 10px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontWeight: 800,
        fontSize: 11,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.25)",
  fontFamily: C.mono,
  marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  color: "#e4e4e7",
  padding: "10px 12px",
  fontSize: 12,
  outline: "none",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  color: "#e4e4e7",
  padding: "9px 10px",
  fontSize: 12,
  outline: "none",
  fontFamily: C.mono,
};

const secondaryButtonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: C.muted,
  borderRadius: 12,
  padding: "11px 12px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontWeight: 800,
};

const errorStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(248,113,113,0.25)",
  background: "rgba(248,113,113,0.08)",
  color: C.red,
  fontSize: 11,
  fontFamily: C.mono,
};

const successStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(52,211,153,0.25)",
  background: "rgba(52,211,153,0.08)",
  color: C.green,
  fontSize: 11,
  fontFamily: C.mono,
};