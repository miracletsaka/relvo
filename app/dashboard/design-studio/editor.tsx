"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  PanelGroup,
  Panel as ResizablePanel,
  PanelResizeHandle,
} from "react-resizable-panels";
import {
  ChevronDown,
  Circle,
  Download,
  Grid3x3,
  Image as ImageIcon,
  Layers,
  Magnet,
  Minus,
  MousePointer2,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  Square,
  Triangle,
  Type,
  Upload,
} from "lucide-react";

import TemplateCanvas from "@/components/template-canvas";
import PropertyInspector from "@/components/property-inspector";
import CampaignDataForm from "@/components/campaign-data-form";
import TemplateManagerV2 from "@/components/template-manager-v2";
import AdvancedShapeTools from "@/components/advanced-shape-tools";
import LogoEditor from "@/components/logo-editor";
import ImageUploader from "@/components/image-uploader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  getPremiumComponent,
  type PremiumComponentKey,
} from "@/lib/template-components";
import { alignShapes, distributeShapes, reorderShape } from "@/lib/alignment-utils";
import { createTemplate, updateTemplate } from "@/lib/template-storage";
import { uploadFileToSpaces } from "@/lib/upload-client";
import { resolveTemplateSlots } from "@/lib/resolve-template-slots";
import { type CampaignData, type Template, type TemplateShape } from "@/lib/types";
import { DEFAULT_CAMPAIGN_DATA } from "@/lib/campaign-context";

type Tone = {
  id: string;
  name: string;
  label: string;
  description?: string;
  emoji?: string;
  is_active: boolean;
  sort_order: number;
};

type BrandOption = {
  id: string;
  name?: string;
  display_name?: string;
};

type GenerateMode = "auto" | "product" | "offer" | "trust";
type Orientation = "portrait" | "landscape";
type EditorTab = "design" | "content" | "templates";
type AlignAction = "left" | "center-h" | "right" | "top" | "center-v" | "bottom";
type DistributeAction = "horizontal" | "vertical";
type ReorderAction = "front" | "forward" | "backward" | "back";

type LogoPlacement = {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
};

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

const T = {
  bg: "#090c09",
  bgPanel: "linear-gradient(160deg,#0a0f0a 0%,#0d1410 50%,#0a0a0a 100%)",
  border: "rgba(30,95,59,0.3)",
  accent: "#1e5f3b",
  accentLight: "#4ade80",
  accentGlow: "rgba(30,95,59,0.25)",
  text: "#e5e7eb",
  textMuted: "#6b7280",
  font: "'Bebas Neue', Impact, sans-serif",
  mono: "monospace",
};

const PREMIUM_GROUPS = [
  {
    label: "Tech & SaaS",
    items: [["characterDashboard", "3D Character"]],
  },
] as const;

const AI_TEMPLATES = [
  ["cdProductFloat", "Product Float"],
  ["cdStatsShowcase", "Stats Showcase"],
  ["cdBrandVs", "Brand vs"],
  ["cdPersonHero", "Person Hero"],
  ["cdLifestyleScene", "Lifestyle Scene"],
] as const;

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...((opts.headers as Record<string, string> | undefined) ?? {}),
    },
    ...opts,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as any)?.detail || (json as any)?.message || `Error ${res.status}`);
  }
  return json as T;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function ensureBgString(bg: unknown): string | null {
  return typeof bg === "string" && bg.trim() ? bg : null;
}

function makeShapeId() {
  return `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getBrandLabel(brand: BrandOption) {
  return brand.display_name || brand.name || brand.id;
}

export function getCanvasDimensions(orientation: Orientation) {
  return {
    width: 1080,
    height: orientation === "portrait" ? 1350 : 1080,
  };
}

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: T.bgPanel,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: 14,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PanelTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      {icon ? <span style={{ color: T.accentLight, opacity: 0.8, display: "flex" }}>{icon}</span> : null}
      <span
        style={{
          fontFamily: T.font,
          fontSize: 12,
          letterSpacing: "0.2em",
          color: T.accentLight,
          textTransform: "uppercase",
        }}
      >
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${T.border}, transparent)` }} />
    </div>
  );
}

function StudioButton({
  children,
  onClick,
  disabled,
  variant = "default",
  fullWidth,
  icon,
  size = "sm",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "accent" | "ghost" | "danger";
  fullWidth?: boolean;
  icon?: React.ReactNode;
  size?: "sm" | "md";
  type?: "button" | "submit";
}) {
  const [hovered, setHovered] = useState(false);

  const styles: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: T.mono,
    fontSize: size === "sm" ? 10 : 12,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    borderRadius: 5,
    padding: size === "sm" ? "5px 10px" : "8px 16px",
    width: fullWidth ? "100%" : undefined,
    transition: "all 0.15s",
    opacity: disabled ? 0.45 : 1,
    border: "1px solid",
    ...(variant === "accent"
      ? {
          background: hovered ? "#1e5f3b" : T.accentGlow,
          borderColor: hovered ? "#2d7a4f" : T.accent,
          color: "#4ade80",
          boxShadow: hovered ? "0 0 18px rgba(30,95,59,0.4)" : "none",
        }
      : variant === "outline"
        ? {
            background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
            borderColor: hovered ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
            color: hovered ? T.text : "#9ca3af",
          }
        : variant === "ghost"
          ? {
              background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
              borderColor: "transparent",
              color: hovered ? T.text : T.textMuted,
            }
          : variant === "danger"
            ? {
                background: hovered ? "rgba(239,68,68,0.15)" : "transparent",
                borderColor: hovered ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.2)",
                color: "#f87171",
              }
            : {
                background: hovered ? "#1e5f3b" : T.accentGlow,
                borderColor: T.accent,
                color: "#4ade80",
              }),
  };

  return (
    <button
      type={type}
      style={styles}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {icon ? <span style={{ display: "flex", opacity: 0.8 }}>{icon}</span> : null}
      {children}
    </button>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  icon,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: T.mono,
          fontSize: 10,
          color: T.textMuted,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {icon ? <span style={{ color: T.accentLight, opacity: 0.7 }}>{icon}</span> : null}
        {label}
      </span>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 32,
          height: 17,
          borderRadius: 9,
          background: checked ? T.accent : "rgba(255,255,255,0.08)",
          border: `1px solid ${checked ? "#2d7a4f" : "rgba(255,255,255,0.1)"}`,
          cursor: "pointer",
          position: "relative",
          transition: "all 0.2s",
          boxShadow: checked ? "0 0 10px rgba(30,95,59,0.4)" : "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 16 : 2,
            width: 11,
            height: 11,
            borderRadius: "50%",
            background: checked ? "#4ade80" : "#6b7280",
            transition: "left 0.2s, background 0.2s",
          }}
        />
      </div>
    </div>
  );
}

function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "5px 0",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            fontFamily: T.mono,
            fontSize: 9,
            color: T.textMuted,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
        <ChevronDown
          size={10}
          color={T.textMuted}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>
      {open ? <div style={{ paddingTop: 6 }}>{children}</div> : null}
    </div>
  );
}

function StudioSelect({
  value,
  onChange,
  options,
  placeholder,
  getLabel,
  getValue,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<any>;
  placeholder: string;
  getLabel: (item: any) => string;
  getValue: (item: any) => string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        color: T.text,
        fontSize: 12,
        padding: "8px 10px",
        outline: "none",
        fontFamily: T.mono,
        boxSizing: "border-box",
      }}
    >
      <option className="text-black" value="">{placeholder}</option>
      {options.map((item) => (
        <option className="text-black" key={getValue(item)} value={getValue(item)}>
          {getLabel(item)}
        </option>
      ))}
    </select>
  );
}

export default function EditorPage() {
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [campaignData, setCampaignData] = useState<CampaignData>(DEFAULT_CAMPAIGN_DATA);
  const [shapes, setShapes] = useState<TemplateShape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacement | undefined>(undefined);

  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [snapToObjects, setSnapToObjects] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [pendingImageShapeId, setPendingImageShapeId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("design");

  const [generatingAuto, setGeneratingAuto] = useState(false);
  const [generateMode, setGenerateMode] = useState<GenerateMode>("product");
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedToneId, setSelectedToneId] = useState("");
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [tones, setTones] = useState<Tone[]>([]);

  const templateId = searchParams.get("templateId");

  const canvasSize = useMemo(() => getCanvasDimensions(orientation), [orientation]);
  const CANVAS_WIDTH = canvasSize.width;
  const CANVAS_HEIGHT = canvasSize.height;
  const safeBackground = useMemo(() => ensureBgString(backgroundImage), [backgroundImage]);
  const isEditingExisting = !!activeTemplate?.id;
  const selectedShape = useMemo(
    () => shapes.find((shape) => shape.id === selectedShapeId) || null,
    [shapes, selectedShapeId],
  );
  const selectionIds = useMemo(
    () => (selectedShapeIds.length ? selectedShapeIds : selectedShapeId ? [selectedShapeId] : []),
    [selectedShapeId, selectedShapeIds],
  );
  const fileBaseName = useMemo(() => {
    const company = campaignData?.companyName || "campaign";
    const date = new Date().toISOString().split("T")[0];
    return `${company}-${date}`;
  }, [campaignData?.companyName]);

  const fitCanvas = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedShapeId(null);
    setSelectedShapeIds([]);
  }, []);

  const syncFromTemplate = useCallback(
    (template: Template) => {
      setActiveTemplate(template);
      setShapes(Array.isArray(template.shapes) ? template.shapes : []);
      setBackgroundImage(ensureBgString((template as any).backgroundImage));
      setLogoPlacement((template as any).logoPlacement || undefined);
      setSelectedBrandId((template as any).brand_id || "");
      setSelectedToneId((template as any).tone_id || "");
      setOrientation((template as any).orientation === "landscape" ? "landscape" : "portrait");
      resetSelection();
    },
    [resetSelection],
  );

  const fetchAndSetActiveTemplate = useCallback(async (id: string) => {
    try {
      const template = await apiFetch<Template>(`/templates/${id}`);
      if (!template || !(template as any).id) {
        throw new Error("Template not found");
      }
      syncFromTemplate(template);
    } catch (error) {
      console.error("Failed to fetch template:", error);
      setErr(error instanceof Error ? error.message : "Failed to fetch template");
    }
  }, [syncFromTemplate]);

  useEffect(() => {
    if (!templateId) return;
    void fetchAndSetActiveTemplate(templateId);
  }, [fetchAndSetActiveTemplate, templateId]);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [brandsRes, tonesRes] = await Promise.all([
          fetch(`${API_BASE}/brands?active_only=false`, { credentials: "include" }),
          apiFetch<Tone[]>(`/tones?active_only=false`),
        ]);

        const brandsData = await brandsRes.json().catch(() => []);
        setBrands(Array.isArray(brandsData) ? brandsData : brandsData?.items || []);
        setTones(Array.isArray(tonesRes) ? tonesRes : []);
      } catch (error) {
        console.error("Failed to load brands/tones", error);
      }
    };

    void loadMeta();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectionIds.length > 0) {
        e.preventDefault();
        setShapes((prev) => prev.filter((shape) => !selectionIds.includes(shape.id)));
        resetSelection();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setShapes((prev) => {
          const next = [...prev];
          const duplicates = prev
            .filter((shape) => selectionIds.includes(shape.id))
            .map((shape) => ({
              ...shape,
              id: makeShapeId(),
              x: (shape.x || 0) + 12,
              y: (shape.y || 0) + 12,
              zIndex: (shape.zIndex || 1) + 1,
            }));
          return [...next, ...duplicates];
        });
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedShapeIds(shapes.map((shape) => shape.id));
        setSelectedShapeId(null);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resetSelection, selectionIds, shapes]);

  const updateShape = useCallback((updatedShape: TemplateShape) => {
    setShapes((prev) => prev.map((shape) => (shape.id === updatedShape.id ? updatedShape : shape)));
  }, []);

  const createTextShape = useCallback(
    (dataField: string, overrides: Partial<TemplateShape> = {}) => {
      const id = makeShapeId();
      const nextShape: TemplateShape = {
        id,
        type: "text",
        x: 80,
        y: 80,
        width: 360,
        height: 80,
        zIndex: shapes.length + 1,
        opacity: 1,
        backgroundColor: undefined,
        borderColor: "#000000",
        borderWidth: 0,
        textColor: "#ffffff",
        fontSize: 32,
        fontFamily: "Bebas Neue",
        fontWeight: 700,
        textAlign: "left",
        padding: 10,
        dataField,
        customText: undefined,
        shadowBlur: 0,
        shadowX: 0,
        shadowY: 0,
        shadowColor: "#000000",
        ...overrides,
      } as TemplateShape;

      setShapes((prev) => [...prev, nextShape]);
      setSelectedShapeId(id);
      setSelectedShapeIds([]);
    },
    [shapes.length],
  );

  const createImageShape = useCallback(
    (slotKey: string, slotLabel?: string, overrides: Partial<TemplateShape> = {}) => {
      const id = makeShapeId();
      const nextShape: TemplateShape = {
        id,
        type: "image",
        x: 80,
        y: 80,
        width: 220,
        height: 220,
        zIndex: shapes.length + 1,
        opacity: 1,
        backgroundColor: "#f0f0f0",
        borderColor: "transparent",
        borderWidth: 0,
        src: undefined,
        fit: "contain",
        radius: 8,
        shadowBlur: 0,
        shadowX: 0,
        shadowY: 0,
        shadowColor: "#000000",
        slotKey,
        slotLabel: slotLabel || slotKey,
        slotType: slotKey.startsWith("sponsor")
          ? "sponsor"
          : slotKey.startsWith("accreditation")
            ? "accreditation"
            : slotKey.startsWith("review_avatar")
              ? "review"
              : "image",
        ...overrides,
      } as TemplateShape;

      setShapes((prev) => [...prev, nextShape]);
      setSelectedShapeId(id);
      setSelectedShapeIds([]);
    },
    [shapes.length],
  );

  const handleAddShape = useCallback(
    (type: TemplateShape["type"]) => {
      const cx = CANVAS_WIDTH / 2;
      const cy = CANVAS_HEIGHT / 2;
      const id = makeShapeId();

      if (type === "image") {
        const imageShape: TemplateShape = {
          id,
          type: "image",
          x: cx - 130,
          y: cy - 130,
          width: 260,
          height: 260,
          zIndex: shapes.length + 1,
          opacity: 1,
          backgroundColor: "transparent",
          borderColor: "transparent",
          borderWidth: 0,
          src: undefined,
          fit: "cover",
          radius: 8,
          shadowBlur: 0,
          shadowX: 0,
          shadowY: 0,
          shadowColor: "#000000",
        } as TemplateShape;

        setShapes((prev) => [...prev, imageShape]);
        setSelectedShapeId(id);
        setSelectedShapeIds([]);
        setPendingImageShapeId(id);
        setImageUploadOpen(true);
        return;
      }

      let nextShape: TemplateShape;

      if (type === "text") {
        nextShape = {
          id,
          type,
          x: cx - 200,
          y: 100,
          width: 400,
          height: 100,
          zIndex: shapes.length + 1,
          opacity: 1,
          textColor: "#1e5f3b",
          fontSize: 300,
          fontFamily: "Bebas Neue",
          fontWeight: 700,
          textAlign: "left",
          textTransform: "uppercase",
          borderWidth: 0,
          dataField: "hook",
          backgroundColor: undefined,
          borderColor: "#000000",
          shadowBlur: 0,
          shadowX: 0,
          shadowY: 0,
          shadowColor: "#000000",
        } as TemplateShape;
      } else if (type === "button") {
        nextShape = {
          id,
          type,
          x: cx - 100,
          y: cy - 25,
          width: 200,
          height: 50,
          zIndex: shapes.length + 1,
          opacity: 1,
          backgroundColor: "#1e5f3b",
          textColor: "#4ade80",
          fontSize: 16,
          fontFamily: "Bebas Neue",
          fontWeight: 700,
          textAlign: "center",
          borderWidth: 0,
          borderRadius: 6,
          buttonText: "Click Here",
          buttonLink: campaignData.ctaLink || "https://example.com",
          hoverColor: "#2d7a4f",
          borderColor: "#000000",
          shadowBlur: 0,
          shadowX: 0,
          shadowY: 0,
          shadowColor: "#000000",
        } as TemplateShape;
      } else if (type === "circle") {
        nextShape = {
          id,
          type,
          x: cx - 75,
          y: cy - 75,
          width: 150,
          height: 150,
          zIndex: shapes.length + 1,
          opacity: 1,
          backgroundColor: "#ffffff",
          borderWidth: 1,
          borderColor: "#000000",
          shadowBlur: 0,
          shadowX: 0,
          shadowY: 0,
          shadowColor: "#000000",
        } as TemplateShape;
      } else if (type === "bullet-group") {
        nextShape = {
          id,
          type,
          x: cx - 130,
          y: cy - 45,
          width: 260,
          height: 90,
          zIndex: shapes.length + 1,
          opacity: 1,
          fontSize: 20,
          fontFamily: "Bebas Neue",
          textColor: "#e5e7eb",
          borderWidth: 0,
          borderColor: "#000000",
          shadowBlur: 0,
          shadowX: 0,
          shadowY: 0,
          shadowColor: "#000000",
        } as TemplateShape;
      } else if (type === "line") {
        nextShape = {
          id,
          type,
          x: cx - 130,
          y: cy,
          width: 260,
          height: 6,
          zIndex: shapes.length + 1,
          opacity: 1,
          lineWidth: 6,
          lineDash: [],
          lineCap: "round",
          borderWidth: 0,
          borderColor: "#000000",
          shadowBlur: 0,
          shadowX: 0,
          shadowY: 0,
          shadowColor: "#000000",
        } as TemplateShape;
      } else {
        nextShape = {
          id,
          type,
          x: cx - 130,
          y: cy - 45,
          width: 260,
          height: 90,
          zIndex: shapes.length + 1,
          opacity: 1,
          backgroundColor: "#ffffff",
          borderWidth: 1,
          borderColor: "#000000",
          borderRadius: type === "rounded-rect" ? 8 : undefined,
          direction: type === "triangle" ? "up" : undefined,
          shadowBlur: 0,
          shadowX: 0,
          shadowY: 0,
          shadowColor: "#000000",
        } as TemplateShape;
      }

      setShapes((prev) => [...prev, nextShape]);
      setSelectedShapeId(id);
      setSelectedShapeIds([]);
    },
    [CANVAS_HEIGHT, CANVAS_WIDTH, campaignData.ctaLink, shapes.length],
  );

  const handleAutoGenerateToCanvas = useCallback(async () => {
    setErr(null);
    setGeneratingAuto(true);

    const org = await apiFetch<{ logo_url?: string; name: string }>("/organisations/me");

    try {
      const res = await fetch("/api/generate-template-to-canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignData,
          mode: generateMode,
          canvasWidth: CANVAS_WIDTH,
          canvasHeight: CANVAS_HEIGHT,
          includeDebug: true,
          logoUrl: org.logo_url || null,
        }),
      });

      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.error || "Failed to auto generate template");
      }

      const nextShapes = Array.isArray(data.shapes) ? data.shapes : [];
      const nextCampaignData = data.campaignData || campaignData;

      setShapes(nextShapes);
      setBackgroundImage(data.backgroundImage || null);
      setCampaignData(nextCampaignData);
      resetSelection();
      setActiveTemplate((prev) =>
        prev
          ? {
              ...prev,
              shapes: nextShapes,
              backgroundImage: data.backgroundImage || null,
            }
          : prev,
      );
    } catch (error) {
      console.error("Auto-generate failed:", error);
      setErr(error instanceof Error ? error.message : "Failed to auto generate template");
    } finally {
      setGeneratingAuto(false);
    }
  }, [CANVAS_HEIGHT, CANVAS_WIDTH, campaignData, generateMode, resetSelection]);

  const handleSelectTemplate = useCallback((template: Template) => {
    syncFromTemplate(template);
  }, [syncFromTemplate]);

  const handleSelectShape = useCallback((id: string, multiSelect = false) => {
    if (!id) {
      resetSelection();
      return;
    }

    if (multiSelect) {
      setSelectedShapeIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
      setSelectedShapeId(null);
      return;
    }

    setSelectedShapeId(id);
    setSelectedShapeIds([]);
  }, [resetSelection]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectionIds.length) return;
    setShapes((prev) => prev.filter((shape) => !selectionIds.includes(shape.id)));
    resetSelection();
  }, [resetSelection, selectionIds]);

  const handleDuplicateSelected = useCallback(() => {
    if (!selectionIds.length) return;
    setShapes((prev) => {
      const maxZ = prev.reduce((acc, shape) => Math.max(acc, shape.zIndex || 1), 1);
      const duplicates = prev
        .filter((shape) => selectionIds.includes(shape.id))
        .map((shape, index) => ({
          ...shape,
          id: makeShapeId(),
          x: (shape.x || 0) + 12,
          y: (shape.y || 0) + 12,
          zIndex: maxZ + index + 1,
        }));
      return [...prev, ...duplicates];
    });
  }, [selectionIds]);

  const handleAlign = useCallback((action: AlignAction) => {
    if (selectionIds.length < 2) return;
    setShapes((prev) => alignShapes(prev, selectionIds, action));
  }, [selectionIds]);

  const handleDistribute = useCallback((direction: DistributeAction) => {
    if (selectionIds.length < 3) return;
    setShapes((prev) => distributeShapes(prev, selectionIds, direction));
  }, [selectionIds]);

  const handleReorder = useCallback((action: ReorderAction) => {
    if (!selectedShapeId) return;
    setShapes((prev) => reorderShape(prev, selectedShapeId, action));
  }, [selectedShapeId]);

  const handleExportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `campaign-${Date.now()}.png`;
    link.click();
  }, []);

  const resetToNewTemplate = useCallback(() => {
    setErr(null);
    setActiveTemplate(null);
    setBackgroundImage(null);
    setCampaignData(DEFAULT_CAMPAIGN_DATA);
    setShapes([]);
    setLogoPlacement(undefined);
    setSaveName("");
    setSaveDesc("");
    setSelectedBrandId("");
    setSelectedToneId("");
    setOrientation("portrait");
    resetSelection();
  }, [resetSelection]);

  const openSaveDialog = useCallback(() => {
    setErr(null);
    setSaveName(activeTemplate?.name || "New Template");
    setSaveDesc((activeTemplate as any)?.description || "");
    setSaveOpen(true);
  }, [activeTemplate]);

  const canvasToFile = useCallback(async (canvas: HTMLCanvasElement, filename: string) => {
    fitCanvas();
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((value) => {
        if (!value) {
          reject(new Error("Failed to create PNG from canvas"));
          return;
        }
        resolve(value);
      }, "image/png", 1);
    });

    return new File([blob], filename, { type: "image/png" });
  }, [fitCanvas]);

  const persistTemplate = useCallback(async (mode: "create" | "update") => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setErr("Canvas not ready");
      return;
    }

    const name = saveName.trim() || activeTemplate?.name || "Untitled Template";
    if (!name) {
      setErr("Template name is required.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const file = await canvasToFile(canvas, `${fileBaseName}.png`);
      const thumbnailUrl = await uploadFileToSpaces(file);

      const payload = {
        name,
        description: saveDesc.trim() || null,
        shapes,
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        backgroundImage: safeBackground,
        logoPlacement: logoPlacement ?? null,
        thumbnail_url: thumbnailUrl,
        brand_id: selectedBrandId || null,
        tone_id: selectedToneId || null,
        orientation,
      } as any;

      if (mode === "create") {
        const res = await createTemplate(payload);
        if (!res?.ok) {
          throw new Error("Failed to create template");
        }

        setActiveTemplate({
          id: res.id,
          name,
          description: saveDesc.trim() || undefined,
          shapes,
          canvasWidth: CANVAS_WIDTH,
          canvasHeight: CANVAS_HEIGHT,
          backgroundImage: safeBackground,
          logoPlacement,
          brand_id: selectedBrandId || null,
          tone_id: selectedToneId || null,
          orientation,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any);
        setSaveOpen(false);
        return;
      }

      if (!activeTemplate?.id) {
        throw new Error("No template selected to update");
      }

      const res = await updateTemplate(activeTemplate.id, payload);
      if (!res?.ok) {
        throw new Error("Failed to update template");
      }

      setActiveTemplate((prev) =>
        prev
          ? ({
              ...prev,
              name,
              description: saveDesc.trim() || undefined,
              shapes,
              brand_id: selectedBrandId || null,
              tone_id: selectedToneId || null,
              orientation,
              backgroundImage: safeBackground,
              logoPlacement,
              updatedAt: new Date().toISOString(),
            } as any)
          : prev,
      );
    } catch (error) {
      setErr(error instanceof Error ? error.message : `Failed to ${mode} template`);
    } finally {
      setSaving(false);
    }
  }, [
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    activeTemplate,
    canvasToFile,
    fileBaseName,
    logoPlacement,
    orientation,
    safeBackground,
    saveDesc,
    saveName,
    selectedBrandId,
    selectedToneId,
    shapes,
  ]);

  const insertPremiumComponent = useCallback(
    (key: PremiumComponentKey) => {
      const newShapes = getPremiumComponent(key, CANVAS_WIDTH, CANVAS_HEIGHT);
      const resolvedShapes = resolveTemplateSlots(newShapes, campaignData);
      setShapes((prev) => {
        const maxZ = prev.reduce((acc, shape) => Math.max(acc, shape.zIndex || 1), 1);
        return [
          ...prev,
          ...resolvedShapes.map((shape, index) => ({
            ...shape,
            zIndex: maxZ + index + 1,
          })),
        ];
      });
      resetSelection();
    },
    [CANVAS_HEIGHT, CANVAS_WIDTH, campaignData, resetSelection],
  );

  const handleImageUpload = useCallback(() => {
    if (!imageUrl.trim() || !pendingImageShapeId) return;
    setShapes((prev) =>
      prev.map((shape) =>
        shape.id === pendingImageShapeId ? { ...shape, src: imageUrl.trim() } : shape,
      ),
    );
    setImageUploadOpen(false);
    setImageUrl("");
    setPendingImageShapeId(null);
  }, [imageUrl, pendingImageShapeId]);

  const handleImageFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageUrl(String(event.target?.result || ""));
    };
    reader.readAsDataURL(file);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#060806", overflow: "hidden", fontFamily: T.font }}>
      <div
        style={{
          padding: 12,
          borderBottom: `1px solid ${T.border}`,
          background: "linear-gradient(180deg,#0a0f0a 0%,#080b08 100%)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: T.accentGlow,
                border: `1px solid ${T.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Layers size={14} color={T.accentLight} />
            </div>
            <div>
              <div style={{ fontFamily: T.font, fontSize: 16, letterSpacing: "0.18em", color: T.text }}>
                CAMPAIGN DESIGNER
              </div>
              <div style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.1em" }}>
                {activeTemplate?.name ? `EDITING: ${activeTemplate.name.toUpperCase()}` : "NEW TEMPLATE"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <div
              style={{
                fontSize: 9,
                fontFamily: T.mono,
                color: T.textMuted,
                border: `1px solid ${T.border}`,
                borderRadius: 3,
                padding: "2px 8px",
                letterSpacing: "0.08em",
              }}
            >
              {CANVAS_WIDTH}×{CANVAS_HEIGHT}
            </div>
            <div
              style={{
                fontSize: 9,
                fontFamily: T.mono,
                color: shapes.length > 0 ? T.accentLight : T.textMuted,
                border: `1px solid ${shapes.length > 0 ? T.border : "rgba(255,255,255,0.06)"}`,
                borderRadius: 3,
                padding: "2px 8px",
                letterSpacing: "0.08em",
              }}
            >
              {shapes.length} SHAPE{shapes.length === 1 ? "" : "S"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <StudioButton onClick={resetToNewTemplate} variant="ghost" icon={<RefreshCcw size={12} />}>
            New
          </StudioButton>
          {isEditingExisting ? (
            <StudioButton onClick={() => void persistTemplate("update")} disabled={saving} variant="accent" icon={<Save size={12} />}>
              {saving ? "Saving…" : "Update"}
            </StudioButton>
          ) : (
            <StudioButton onClick={openSaveDialog} disabled={saving} variant="accent" icon={<Save size={12} />}>
              Save
            </StudioButton>
          )}
          <StudioButton onClick={handleExportPNG} icon={<Download size={12} />}>
            Export PNG
          </StudioButton>

          <div style={{ width: 1, alignSelf: "stretch", background: T.border, opacity: 0.7 }} />

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["product", "offer", "trust", "auto"] as GenerateMode[]).map((mode) => (
              <StudioButton
                key={mode}
                variant={generateMode === mode ? "accent" : "outline"}
                onClick={() => setGenerateMode(mode)}
                size="sm"
              >
                {mode}
              </StudioButton>
            ))}
          </div>

          <StudioButton
            onClick={() => void handleAutoGenerateToCanvas()}
            variant="accent"
            icon={<Sparkles size={12} />}
            size="md"
            disabled={generatingAuto}
          >
            {generatingAuto ? "Generating…" : "Auto Generate to Canvas"}
          </StudioButton>
        </div>
      </div>

      <PanelGroup direction="horizontal" style={{ flex: 1, minHeight: 0 }} autoSaveId="editor-layout">
        <ResizablePanel
          defaultSize={26}
          minSize={18}
          maxSize={38}
          style={{
            background: "linear-gradient(180deg,#0a0f0a 0%,#080b08 100%)",
            borderRight: `1px solid ${T.border}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: "rgba(0,0,0,0.3)", flexShrink: 0 }}>
            {(["design", "content", "templates"] as EditorTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  fontFamily: T.font,
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === tab ? `2px solid ${T.accentLight}` : "2px solid transparent",
                  color: activeTab === tab ? T.accentLight : T.textMuted,
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
            {activeTab === "design" ? (
              <>
                <Panel>
                  <PanelTitle icon={<Grid3x3 size={11} />}>Canvas</PanelTitle>
                  <ToggleRow label="Grid" checked={showGrid} onChange={setShowGrid} icon={<Grid3x3 size={10} />} />
                  <ToggleRow label="Snap to Grid" checked={snapToGrid} onChange={setSnapToGrid} icon={<Grid3x3 size={10} />} />
                  <ToggleRow label="Snap to Objects" checked={snapToObjects} onChange={setSnapToObjects} icon={<Magnet size={10} />} />
                </Panel>

                <Panel>
                  <PanelTitle icon={<Grid3x3 size={11} />}>Orientation</PanelTitle>
                  <div style={{ display: "flex", gap: 6 }}>
                    <StudioButton variant={orientation === "portrait" ? "accent" : "outline"} onClick={() => setOrientation("portrait")} size="sm" fullWidth>
                      Portrait
                    </StudioButton>
                    <StudioButton variant={orientation === "landscape" ? "accent" : "outline"} onClick={() => setOrientation("landscape")} size="sm" fullWidth>
                      Landscape
                    </StudioButton>
                  </div>
                </Panel>

                <Panel>
                  <PanelTitle icon={<ImageIcon size={11} />}>Background</PanelTitle>
                  <ImageUploader
                    onImageSelect={(value: unknown) => {
                      if (isString(value)) {
                        setBackgroundImage(value);
                        return;
                      }
                      setErr("Background must be a URL string.");
                    }}
                    currentImage={safeBackground}
                  />
                </Panel>

                <Panel>
                  <PanelTitle>Logo</PanelTitle>
                  <LogoEditor logo={logoPlacement} onLogoChange={setLogoPlacement} />
                </Panel>

                <Panel>
                  <PanelTitle icon={<Plus size={11} />}>Add Shape</PanelTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                    {[
                      ["text", "Text", <Type size={10} />],
                      ["rectangle", "Rect", <Square size={10} />],
                      ["circle", "Circle", <Circle size={10} />],
                      ["rounded-rect", "Rounded", <Square size={10} />],
                      ["triangle", "Triangle", <Triangle size={10} />],
                      ["image", "Image", <ImageIcon size={10} />],
                    ].map(([type, label, icon]) => (
                      <StudioButton key={String(type)} onClick={() => handleAddShape(type as TemplateShape["type"])} variant="outline" icon={icon}>
                        {String(label)}
                      </StudioButton>
                    ))}
                    <StudioButton onClick={() => handleAddShape("button")} variant="outline" icon={<MousePointer2 size={10} />} fullWidth>
                      Button
                    </StudioButton>
                    <StudioButton onClick={() => handleAddShape("bullet-group")} variant="outline" icon={<Plus size={10} />} fullWidth>
                      Bullet List
                    </StudioButton>
                    <StudioButton onClick={() => handleAddShape("line")} variant="outline" icon={<Minus size={10} />} fullWidth>
                      Line
                    </StudioButton>
                  </div>
                </Panel>

                <Panel>
                  <PanelTitle icon={<Layers size={11} />}>Assets</PanelTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Collapsible title="Brand Assets" defaultOpen>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                        <StudioButton variant="outline" size="sm" onClick={() => createImageShape("logo", "Logo", { width: 180, height: 80, fit: "contain", radius: 0 })}>
                          Logo
                        </StudioButton>
                        <StudioButton variant="outline" size="sm" onClick={() => createTextShape("companyName", { width: 280, height: 50, fontSize: 28, fontWeight: 700, textColor: "#ffffff" })}>
                          Company Name
                        </StudioButton>
                        <StudioButton variant="outline" size="sm" onClick={() => createTextShape("business_tagline", { width: 360, height: 70, fontSize: 24, fontWeight: 600, textColor: "#e5e7eb" })}>
                          Tagline
                        </StudioButton>
                        <StudioButton variant="outline" size="sm" onClick={() => createTextShape("location", { width: 220, height: 40, fontSize: 20, fontWeight: 500, textColor: "#d1d5db" })}>
                          Location
                        </StudioButton>
                      </div>
                    </Collapsible>

                    <Collapsible title="Visual Assets" defaultOpen>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                        <StudioButton variant="outline" size="sm" onClick={() => createImageShape("hero_person", "Hero Image", { width: 320, height: 320, fit: "cover", radius: 14 })}>
                          Hero Image
                        </StudioButton>
                        <StudioButton variant="outline" size="sm" onClick={() => createImageShape("dashboard_image", "Secondary Image", { width: 300, height: 220, fit: "cover", radius: 12 })}>
                          Secondary Image
                        </StudioButton>
                        <StudioButton variant="outline" size="sm" onClick={() => createImageShape("sponsor_1", "Sponsor Logo 1", { width: 140, height: 60, fit: "contain", radius: 0 })}>
                          Sponsor 1
                        </StudioButton>
                        <StudioButton variant="outline" size="sm" onClick={() => createImageShape("sponsor_2", "Sponsor Logo 2", { width: 140, height: 60, fit: "contain", radius: 0 })}>
                          Sponsor 2
                        </StudioButton>
                        <StudioButton variant="outline" size="sm" onClick={() => createImageShape("accreditation_1", "Accreditation", { width: 140, height: 60, fit: "contain", radius: 0 })}>
                          Accreditation
                        </StudioButton>
                        <StudioButton variant="outline" size="sm" onClick={() => createImageShape("review_avatar_1", "Review Avatar", { width: 90, height: 90, fit: "cover", radius: 45 })}>
                          Review Avatar
                        </StudioButton>
                      </div>
                    </Collapsible>

                    <Collapsible title="Content Assets" defaultOpen>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                        <StudioButton variant="outline" size="sm" onClick={() => createTextShape("review_text", { width: 380, height: 120, fontSize: 24, fontWeight: 600, textColor: "#ffffff" })}>
                          Review Text
                        </StudioButton>
                        <StudioButton variant="outline" size="sm" onClick={() => createTextShape("review_author", { width: 220, height: 40, fontSize: 18, fontWeight: 700, textColor: "#d1d5db" })}>
                          Review Author
                        </StudioButton>
                        <StudioButton variant="outline" size="sm" onClick={() => createTextShape("offer_title", { width: 320, height: 80, fontSize: 30, fontWeight: 800, textColor: "#ffffff" })}>
                          Offer Title
                        </StudioButton>
                        <StudioButton variant="outline" size="sm" onClick={() => createTextShape("offer_cta", { width: 220, height: 50, fontSize: 22, fontWeight: 800, textColor: "#ffffff" })}>
                          Offer CTA
                        </StudioButton>
                        <StudioButton variant="outline" size="sm" onClick={() => createTextShape("price_label", { width: 180, height: 30, fontSize: 18, fontWeight: 600, textColor: "#d1d5db" })}>
                          Price Label
                        </StudioButton>
                        <StudioButton variant="outline" size="sm" onClick={() => createTextShape("fine_print", { width: 340, height: 40, fontSize: 14, fontWeight: 400, textColor: "#9ca3af" })}>
                          Fine Print
                        </StudioButton>
                      </div>
                    </Collapsible>
                  </div>
                </Panel>

                <Panel>
                  <PanelTitle icon={<Layers size={11} />}>Components</PanelTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {PREMIUM_GROUPS.map((group) => (
                      <Collapsible key={group.label} title={group.label}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                          {group.items.map(([key, label]) => (
                            <StudioButton key={key} size="sm" variant="outline" onClick={() => insertPremiumComponent(key as PremiumComponentKey)}>
                              {label}
                            </StudioButton>
                          ))}
                        </div>
                      </Collapsible>
                    ))}

                    <Collapsible title="Clipdrop AI">
                      <div
                        style={{
                          fontSize: 9,
                          color: "#a78bfa",
                          marginBottom: 6,
                          padding: "4px 6px",
                          borderRadius: 4,
                          background: "rgba(167,139,250,0.08)",
                          border: "1px solid rgba(167,139,250,0.2)",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Uses AI credits
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                        {AI_TEMPLATES.map(([key, label]) => (
                          <StudioButton key={key} size="sm" variant="outline" onClick={() => insertPremiumComponent(key as PremiumComponentKey)}>
                            {label}
                          </StudioButton>
                        ))}
                      </div>
                    </Collapsible>
                  </div>
                </Panel>

                {err ? (
                  <div
                    style={{
                      fontSize: 10,
                      color: "#f87171",
                      padding: "6px 8px",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: 4,
                    }}
                  >
                    {err}
                  </div>
                ) : null}
              </>
            ) : null}

            {activeTab === "content" ? (
              <Panel>
                <PanelTitle>Campaign Content</PanelTitle>
                <CampaignDataForm data={campaignData} onChange={setCampaignData} />
              </Panel>
            ) : null}

            {activeTab === "templates" ? (
              <>
                <Panel>
                  <PanelTitle icon={<Save size={11} />}>Save</PanelTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", marginBottom: 5 }}>BRAND</div>
                      <StudioSelect
                        value={selectedBrandId}
                        onChange={setSelectedBrandId}
                        options={brands}
                        placeholder="Select Brand"
                        getLabel={getBrandLabel}
                        getValue={(item: BrandOption) => item.id}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", marginBottom: 5 }}>TONE</div>
                      <StudioSelect
                        value={selectedToneId}
                        onChange={setSelectedToneId}
                        options={tones}
                        placeholder="Select Tone"
                        getLabel={(item: Tone) => item.label || item.name}
                        getValue={(item: Tone) => item.id}
                      />
                    </div>

                    {isEditingExisting ? (
                      <StudioButton onClick={() => void persistTemplate("update")} disabled={saving} variant="accent" fullWidth icon={<Save size={12} />} size="md">
                        {saving ? "Updating…" : "Update Template"}
                      </StudioButton>
                    ) : (
                      <StudioButton onClick={openSaveDialog} disabled={saving} variant="accent" fullWidth icon={<Save size={12} />} size="md">
                        Save Template
                      </StudioButton>
                    )}

                    {activeTemplate?.id ? (
                      <div style={{ fontSize: 9, color: T.textMuted, wordBreak: "break-all", fontFamily: T.mono }}>
                        ID: {activeTemplate.id}
                      </div>
                    ) : null}

                    {err ? <div style={{ fontSize: 10, color: "#f87171" }}>{err}</div> : null}
                  </div>
                </Panel>

                <TemplateManagerV2 selectedTemplateId={activeTemplate?.id || null} onSelectTemplate={handleSelectTemplate} />
              </>
            ) : null}
          </div>
        </ResizablePanel>

        <PanelResizeHandle style={{ width: 4, background: T.border, cursor: "col-resize", flexShrink: 0 }} />

        <ResizablePanel defaultSize={selectedShape ? 49 : 74} minSize={30} style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "#060806", position: "relative", minWidth: 0, minHeight: 0 }}>
          <div
            style={{
              position: "absolute",
              zIndex: 50,
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              maxWidth: "min(520px, calc(100% - 24px))",
              height: 42,
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              gap: 12,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(8px)",
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.08em" }}>
              {selectedShapeIds.length > 0
                ? `${selectedShapeIds.length} SHAPES SELECTED`
                : selectedShape
                  ? `${selectedShape.type.toUpperCase()} SELECTED`
                  : "CANVAS"}
            </span>
            {selectionIds.length > 0 ? (
              <>
                <div style={{ width: 1, height: 24, background: T.border }} />
                <AdvancedShapeTools
                  selectedShapeIds={selectionIds}
                  onDuplicate={handleDuplicateSelected}
                  onDelete={handleDeleteSelected}
                  onAlign={handleAlign}
                  onDistribute={handleDistribute}
                  onReorder={handleReorder}
                />
              </>
            ) : null}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 9, color: T.textMuted }}>{Math.round(zoom * 100)}%</span>
          </div>

          <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "72px 24px 24px", minWidth: 0, minHeight: 0 }}>
            <div
              style={{
                background: "#fff",
                borderRadius: 4,
                boxShadow: "0 0 0 1px rgba(30,95,59,0.2), 0 24px 80px rgba(0,0,0,0.7)",
                overflow: "hidden",
                marginTop: 0,
              }}
            >
              <TemplateCanvas
                ref={canvasRef}
                shapes={shapes}
                zoom={zoom}
                setZoom={setZoom}
                pan={pan}
                setPan={setPan}
                backgroundImage={safeBackground}
                logoUrl={logoPlacement?.url}
                campaignData={campaignData}
                selectedShapeId={selectedShapeId}
                onShapeSelect={handleSelectShape}
                onShapeDrag={(id: string, x: number, y: number) => {
                  const shape = shapes.find((item) => item.id === id);
                  if (!shape) return;
                  updateShape({ ...shape, x, y });
                }}
                onShapeResize={(id: string, width: number, height: number) => {
                  const shape = shapes.find((item) => item.id === id);
                  if (!shape) return;
                  updateShape({ ...shape, width, height });
                }}
                canvasWidth={CANVAS_WIDTH}
                canvasHeight={CANVAS_HEIGHT}
                isEditable={true}
                showGrid={showGrid}
                snapToGrid={snapToGrid}
                snapToObjects={snapToObjects}
              />
            </div>
          </div>
        </ResizablePanel>

        {selectedShape ? (
          <>
            <PanelResizeHandle style={{ width: 4, background: T.border, cursor: "col-resize", flexShrink: 0 }} />
            <ResizablePanel
              defaultSize={25}
              minSize={18}
              maxSize={40}
              style={{
                background: "linear-gradient(180deg,#0a0f0a 0%,#080b08 100%)",
                borderLeft: `1px solid ${T.border}`,
                overflowY: "auto",
                padding: 12,
                minWidth: 0,
                minHeight: 0,
              }}
            >
              <PropertyInspector shape={selectedShape} campaignData={campaignData} onUpdate={updateShape} />
            </ResizablePanel>
          </>
        ) : null}
      </PanelGroup>

      <Dialog open={imageUploadOpen} onOpenChange={setImageUploadOpen}>
        <DialogContent style={{ background: "#0d1410", border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, maxWidth: 420 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: T.font, letterSpacing: "0.16em", color: T.accentLight }}>
              ADD IMAGE
            </DialogTitle>
            <DialogDescription style={{ fontSize: 11, color: T.textMuted }}>
              Upload from your computer or paste a URL
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", marginBottom: 6 }}>UPLOAD FILE</div>
              <input type="file" accept="image/*" onChange={handleImageFile} style={{ width: "100%", fontSize: 11, color: T.textMuted, cursor: "pointer", fontFamily: T.mono }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 1, background: T.border }} />
              <span style={{ fontSize: 9, color: T.textMuted }}>OR</span>
              <div style={{ flex: 1, height: 1, background: T.border }} />
            </div>

            <div>
              <div style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", marginBottom: 6 }}>IMAGE URL</div>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${T.border}`,
                  borderRadius: 4,
                  color: T.text,
                  fontSize: 12,
                  padding: "6px 10px",
                  outline: "none",
                  fontFamily: T.mono,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {imageUrl ? (
              <div style={{ borderRadius: 6, overflow: "hidden", border: `1px solid ${T.border}`, maxHeight: 160, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}>
                <img src={imageUrl} alt="Preview" style={{ maxHeight: 160, maxWidth: "100%", objectFit: "contain" }} />
              </div>
            ) : null}
          </div>

          <DialogFooter style={{ gap: 8, paddingTop: 8 }}>
            <StudioButton variant="outline" onClick={() => { setImageUploadOpen(false); setImageUrl(""); setPendingImageShapeId(null); }}>
              Cancel
            </StudioButton>
            <StudioButton variant="accent" onClick={handleImageUpload} disabled={!imageUrl.trim()} icon={<Upload size={12} />}>
              Add Image
            </StudioButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveOpen} onOpenChange={(open) => !saving && setSaveOpen(open)}>
        <DialogContent style={{ background: "#0d1410", border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, maxWidth: 420 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: T.font, letterSpacing: "0.16em", color: T.accentLight }}>
              SAVE TEMPLATE
            </DialogTitle>
            <DialogDescription style={{ fontSize: 11, color: T.textMuted }}>
              Name your template and link it to a brand and tone.
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", marginBottom: 5 }}>NAME</div>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="My Template"
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, fontSize: 12, padding: "6px 10px", outline: "none", fontFamily: T.mono, boxSizing: "border-box" }}
              />
            </div>

            <div>
              <div style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", marginBottom: 5 }}>DESCRIPTION</div>
              <input
                value={saveDesc}
                onChange={(e) => setSaveDesc(e.target.value)}
                placeholder="Optional description"
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, fontSize: 12, padding: "6px 10px", outline: "none", fontFamily: T.mono, boxSizing: "border-box" }}
              />
            </div>

            <div>
              <div style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", marginBottom: 5 }}>BRAND</div>
              <StudioSelect
                value={selectedBrandId}
                onChange={setSelectedBrandId}
                options={brands}
                placeholder="Select Brand"
                getLabel={getBrandLabel}
                getValue={(item: BrandOption) => item.id}
              />
            </div>

            <div>
              <div style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", marginBottom: 5 }}>TONE</div>
              <StudioSelect
                value={selectedToneId}
                onChange={setSelectedToneId}
                options={tones}
                placeholder="Select Tone"
                getLabel={(item: Tone) => item.label || item.name}
                getValue={(item: Tone) => item.id}
              />
            </div>

            {err ? <div style={{ fontSize: 10, color: "#f87171", padding: "4px 6px", background: "rgba(239,68,68,0.08)", borderRadius: 3 }}>{err}</div> : null}
          </div>

          <DialogFooter style={{ gap: 8, paddingTop: 8 }}>
            <StudioButton variant="outline" onClick={() => setSaveOpen(false)} disabled={saving}>
              Cancel
            </StudioButton>
            <StudioButton variant="accent" onClick={() => void persistTemplate("create")} disabled={saving || !saveName.trim()} icon={<Save size={12} />}>
              {saving ? "Saving…" : "Save Template"}
            </StudioButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
