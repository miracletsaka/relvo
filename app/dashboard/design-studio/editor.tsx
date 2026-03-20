"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TemplateCanvas from "@/components/template-canvas";
import PropertyInspector from "@/components/property-inspector";
import CampaignDataForm from "@/components/campaign-data-form";
import TemplateManagerV2 from "@/components/template-manager-v2";
import AdvancedShapeTools from "@/components/advanced-shape-tools";
import LogoEditor from "@/components/logo-editor";
import ImageUploader from "@/components/image-uploader";
import { synthesizeAndSaveTemplate } from "@/lib/api";
import { getPremiumComponent, PremiumComponentKey } from "@/lib/template-components";
import { TemplateShape, CampaignData, Template } from "@/lib/types";
import {
  Download, Plus, RefreshCcw, Save, Grid3x3, Magnet,
  MousePointer2, Upload, Sparkles, ChevronDown, X, Layers,
  Image as ImageIcon, Type, Square, Circle, Triangle, Minus,
} from "lucide-react";
import { alignShapes, distributeShapes, reorderShape } from "@/lib/alignment-utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { createTemplate, updateTemplate } from "@/lib/template-storage";
import { uploadFileToSpaces } from "@/lib/upload-client";
import { resolveTemplateImages } from "@/lib/resolve-template-images";

const CANVAS_WIDTH  = 1080;
const CANVAS_HEIGHT = 1350;

const DEFAULT_CAMPAIGN_DATA: CampaignData = {
  hook:        "Unlock the Power of AI",
  subheading:  "Streamline Your Content Creation",
  bullets:     ["Save time with AI automation", "Engage your audience effortlessly", "Transform your approach"],
  proof:       "Businesses using AI create 60% more content",
  cta:         "Get Started Today",
  hashtags:    "#AI #Innovation #Automation",
  companyName: "NEUROFLOW",
  location:    "MARKETING",
  ctaLink:     "https://example.com",
};

function isString(x: any): x is string { return typeof x === "string"; }
function ensureBgString(bg: any): string | null {
  if (!bg) return null;
  if (typeof bg === "string") return bg;
  return null;
}

// ── Design tokens matching PropertyInspector ─────────────────────────────────
const T = {
  bg:          "#090c09",
  bgPanel:     "linear-gradient(160deg,#0a0f0a 0%,#0d1410 50%,#0a0a0a 100%)",
  border:      "rgba(30,95,59,0.3)",
  borderHover: "rgba(30,95,59,0.6)",
  accent:      "#1e5f3b",
  accentLight: "#4ade80",
  accentGlow:  "rgba(30,95,59,0.25)",
  text:        "#e5e7eb",
  textMuted:   "#6b7280",
  textDim:     "#374151",
  font:        "'Bebas Neue', Impact, sans-serif",
  mono:        "monospace",
};

// ── Shared styled primitives ──────────────────────────────────────────────────

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: T.bgPanel,
      border: `1px solid ${T.border}`,
      borderRadius: 10,
      padding: "14px",
      boxShadow: "0 0 0 1px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function PanelTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      {icon && <span style={{ color: T.accentLight, opacity: 0.8, display: "flex" }}>{icon}</span>}
      <span style={{
        fontFamily: T.font, fontSize: 12, letterSpacing: "0.2em",
        color: T.accentLight, textTransform: "uppercase" as const,
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right,${T.border},transparent)` }} />
    </div>
  );
}

function StudioButton({
  children, onClick, disabled, variant = "default", fullWidth, icon, size = "sm",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "accent" | "ghost" | "danger";
  fullWidth?: boolean;
  icon?: React.ReactNode;
  size?: "sm" | "md";
}) {
  const [hovered, setHovered] = useState(false);

  const styles: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 6, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: T.mono, fontSize: size === "sm" ? 10 : 12,
    letterSpacing: "0.05em", textTransform: "uppercase" as const,
    borderRadius: 5, padding: size === "sm" ? "5px 10px" : "8px 16px",
    width: fullWidth ? "100%" : undefined,
    transition: "all 0.15s", opacity: disabled ? 0.45 : 1,
    border: "1px solid",
    ...(variant === "accent" ? {
      background: hovered ? "#1e5f3b" : T.accentGlow,
      borderColor: hovered ? "#2d7a4f" : T.accent,
      color: "#4ade80",
      boxShadow: hovered ? `0 0 18px rgba(30,95,59,0.4)` : "none",
    } : variant === "outline" ? {
      background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
      borderColor: hovered ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
      color: hovered ? T.text : "#9ca3af",
    } : variant === "ghost" ? {
      background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
      borderColor: "transparent",
      color: hovered ? T.text : T.textMuted,
    } : variant === "danger" ? {
      background: hovered ? "rgba(239,68,68,0.15)" : "transparent",
      borderColor: hovered ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.2)",
      color: "#f87171",
    } : {
      background: hovered ? "#1e5f3b" : T.accentGlow,
      borderColor: T.accent,
      color: "#4ade80",
    }),
  };

  return (
    <button
      style={styles}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {icon && <span style={{ display: "flex", opacity: 0.8 }}>{icon}</span>}
      {children}
    </button>
  );
}

function ToggleRow({ label, checked, onChange, icon }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; icon?: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "6px 0",
    }}>
      <span style={{
        display: "flex", alignItems: "center", gap: 6,
        fontFamily: T.mono, fontSize: 10, color: T.textMuted,
        letterSpacing: "0.06em", textTransform: "uppercase" as const,
      }}>
        {icon && <span style={{ color: T.accentLight, opacity: 0.7 }}>{icon}</span>}
        {label}
      </span>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 32, height: 17, borderRadius: 9,
          background: checked ? T.accent : "rgba(255,255,255,0.08)",
          border: `1px solid ${checked ? "#2d7a4f" : "rgba(255,255,255,0.1)"}`,
          cursor: "pointer", position: "relative", transition: "all 0.2s",
          boxShadow: checked ? `0 0 10px rgba(30,95,59,0.4)` : "none",
        }}
      >
        <div style={{
          position: "absolute", top: 2,
          left: checked ? 16 : 2,
          width: 11, height: 11, borderRadius: "50%",
          background: checked ? "#4ade80" : "#6b7280",
          transition: "left 0.2s, background 0.2s",
        }} />
      </div>
    </div>
  );
}

// Premium component groups
const PREMIUM_GROUPS = [
  {
    label: "Marketing",
    items: [
      ["offer","Offer/Discount"],["flashSale","Flash Sale"],["hero","Hero Product"],
      ["boldStatement","Bold Statement"],["fullBleedHero","Full Bleed Hero"],
      ["massiveTypography","Massive Type"],["comparison","Old vs New"],
    ],
  },
  {
    label: "Editorial",
    items: [
      ["editorial","Editorial Blog"],["thoughtLeader","Thought Leader"],
      ["darkEditorial","Dark Editorial"],["magazinePhotoGrid","Magazine Grid"],
      ["collageGrid","Collage Grid"],
    ],
  },
  {
    label: "Lifestyle",
    items: [
      ["lifestyleHero","Lifestyle Hero"],["lifestyleShowcase","Lifestyle Showcase"],
      ["skincare","Skincare Split"],["splitPhotoContent","Split Photo"],
      ["singleHeroPhoto","Hero Photo"],["instagramStory","IG Story"],
    ],
  },
  {
    label: "Brand",
    items: [
      ["boldBrand","Bold Brand"],["luxuryDark","Luxury Dark"],
      ["splitColor","Split Color"],["testimonial","Testimonial"],
      ["communityEvent","Community Event"],["albumCover","Album Cover"],
    ],
  },
  {
    label: "Tech & SaaS",
    items: [
      ["saasAd","SaaS Ad"],["characterDashboard","3D Character"],["productAbstract","Product Abstract"],
    ],
  },
] as const;

const AI_TEMPLATES = [
  ["cdProductFloat","Product Float"],["cdStatsShowcase","Stats Showcase"],
  ["cdBrandVs","Brand vs"],["cdPersonHero","Person Hero"],["cdLifestyleScene","Lifestyle Scene"],
] as const;

// Collapsible section
function Collapsible({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "5px 0", background: "transparent", border: "none", cursor: "pointer",
        }}
      >
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
          {title}
        </span>
        <ChevronDown size={10} color={T.textMuted} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </button>
      {open && <div style={{ paddingTop: 6 }}>{children}</div>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EditorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTemplate, setActiveTemplate]   = useState<Template | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [campaignData, setCampaignData]       = useState<CampaignData>(DEFAULT_CAMPAIGN_DATA);
  const [shapes, setShapes]                   = useState<TemplateShape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [logoPlacement, setLogoPlacement]     = useState<{ url: string; x: number; y: number; width: number; height: number; opacity: number } | undefined>(undefined);

  const [showGrid, setShowGrid]           = useState(false);
  const [snapToGrid, setSnapToGrid]       = useState(false);
  const [snapToObjects, setSnapToObjects] = useState(true);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan]   = useState({ x: 0, y: 0 });

  const [imageUploadOpen, setImageUploadOpen]       = useState(false);
  const [pendingImageShapeId, setPendingImageShapeId] = useState<string | null>(null);
  const [imageUrl, setImageUrl]                     = useState("");

  const [saveOpen, setSaveOpen]   = useState(false);
  const [saveName, setSaveName]   = useState("");
  const [saveDesc, setSaveDesc]   = useState("");
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("design");

  const safeBackground    = useMemo(() => ensureBgString(backgroundImage), [backgroundImage]);
  const isEditingExisting = !!activeTemplate?.id;
  const fileBaseName      = useMemo(() => {
    const company = campaignData?.companyName || "campaign";
    const date    = new Date().toISOString().split("T")[0];
    return `${company}-${date}`;
  }, [campaignData?.companyName]);

  const fitCanvas = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
      if ((e.key === "Delete" || e.key === "Backspace") && (selectedShapeId || selectedShapeIds.length > 0)) {
        e.preventDefault(); handleDeleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); handleDuplicateSelected(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") { e.preventDefault(); setSelectedShapeIds(shapes.map((s) => s.id)); setSelectedShapeId(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shapes, selectedShapeId, selectedShapeIds]);

  const resetToNewTemplate = () => {
    setErr(null); setActiveTemplate(null); setBackgroundImage(null);
    setShapes([]); setSelectedShapeId(null); setSelectedShapeIds([]);
    setLogoPlacement(undefined); setSaveName(""); setSaveDesc("");
  };

  const handleSelectTemplate = (t: Template) => {
    setActiveTemplate(t); setShapes(t.shapes || []);
    setBackgroundImage(t.backgroundImage || null);
    setLogoPlacement(t.logoPlacement);
    setSelectedShapeId(null); setSelectedShapeIds([]);
  };

  const handleAddShape = (type: TemplateShape["type"]) => {
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;

    if (type === "image") {
      const id = `shape-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
      setShapes((p) => [...p, {
        id, type: "image", x: cx-130, y: cy-130, width: 260, height: 260,
        zIndex: shapes.length+1, opacity: 1, backgroundColor: "transparent",
        borderColor: "transparent", borderWidth: 0,
        src: undefined, fit: "cover", radius: 8,
        shadowBlur: 0, shadowX: 0, shadowY: 0, shadowColor: "#000000",
      }]);
      setSelectedShapeId(id);
      setPendingImageShapeId(id);
      setImageUploadOpen(true);
      return;
    }

    const base: Partial<TemplateShape> = {
      id:         `shape-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,
      type,
      zIndex:     shapes.length + 1,
      opacity:    1,
      shadowBlur: 0, shadowX: 0, shadowY: 0, shadowColor: "#000000",
      borderColor: "#000000",
    };

    let extra: Partial<TemplateShape> = {};

    if (type === "text") {
      extra = {
        x: cx-200, y: 100, width: 400, height: 100,
        textColor:     "#1e5f3b",
        fontSize:      300,
        fontFamily:    "Bebas Neue",
        fontWeight:    700,
        textAlign:     "left",
        textTransform: "uppercase",
        borderWidth:   0,
        dataField:     "hook",
        backgroundColor: undefined,
      };
    } else if (type === "button") {
      extra = {
        x: cx-100, y: cy-25, width: 200, height: 50,
        backgroundColor: "#1e5f3b", textColor: "#4ade80",
        fontSize: 16, fontFamily: "Bebas Neue", fontWeight: 700,
        textAlign: "center", borderWidth: 0, borderRadius: 6,
        buttonText: "Click Here",
        buttonLink: campaignData.ctaLink || "https://example.com",
        hoverColor: "#2d7a4f",
      };
    } else if (type === "circle") {
      extra = { x: cx-75, y: cy-75, width: 150, height: 150, backgroundColor: "#ffffff", borderWidth: 1 };
    } else if (type === "bullet-group") {
      extra = { x: cx-130, y: cy-45, width: 260, height: 90, fontSize: 20, fontFamily: "Bebas Neue", textColor: "#e5e7eb", borderWidth: 0 };
    } else if (type === "line") {
      extra = { x: cx-130, y: cy, width: 260, height: 6, lineWidth: 6, lineDash: [], lineCap: "round", borderWidth: 0 };
    } else {
      extra = {
        x: cx-130, y: cy-45, width: 260, height: 90,
        backgroundColor: "#ffffff", borderWidth: 1,
        borderRadius: type === "rounded-rect" ? 8 : undefined,
        direction: type === "triangle" ? "up" : undefined,
      };
    }

    setShapes((p) => [...p, { ...base, ...extra } as TemplateShape]);
    setSelectedShapeId(base.id as string);
    setSelectedShapeIds([]);
  };

  const handleImageUpload = () => {
    if (!imageUrl.trim() || !pendingImageShapeId) return;
    setShapes((p) => p.map((s) => s.id === pendingImageShapeId ? { ...s, src: imageUrl.trim() } : s));
    setImageUploadOpen(false); setImageUrl(""); setPendingImageShapeId(null);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleGeneratePremiumTemplate = async () => {
    setErr(null);
    try {
      const res = await synthesizeAndSaveTemplate({ brand_id: "neuroflow", canvas_width: CANVAS_WIDTH, canvas_height: CANVAS_HEIGHT });
      if (!res.ok) throw new Error(res.error || "Synthesis failed");
      if (res.template) {
        setShapes(res.template.shapes || []); setBackgroundImage(res.template.backgroundImage || null);
        setLogoPlacement(res.template.logoPlacement || undefined); setActiveTemplate(res.template);
      }
    } catch (e: any) { setErr(e?.message || "Failed to generate template"); }
  };

  const handleSelectShape = (id: string, multiSelect = false) => {
    if (!id) { setSelectedShapeId(null); setSelectedShapeIds([]); return; }
    if (multiSelect) { setSelectedShapeIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]); setSelectedShapeId(null); }
    else { setSelectedShapeId(id); setSelectedShapeIds([]); }
  };

  const handleUpdateShape = (shape: TemplateShape) =>
    setShapes((p) => p.map((s) => s.id === shape.id ? shape : s));

  const handleShapeDrag   = (id: string, x: number, y: number) => {
    const s = shapes.find((s) => s.id === id); if (!s) return; handleUpdateShape({ ...s, x, y });
  };
  const handleShapeResize = (id: string, width: number, height: number) => {
    const s = shapes.find((s) => s.id === id); if (!s) return; handleUpdateShape({ ...s, width, height });
  };

  const handleDeleteSelected = () => {
    if (selectedShapeId)         { setShapes((p) => p.filter((s) => s.id !== selectedShapeId)); setSelectedShapeId(null); }
    if (selectedShapeIds.length) { setShapes((p) => p.filter((s) => !selectedShapeIds.includes(s.id))); setSelectedShapeIds([]); }
  };

  const handleDuplicateSelected = () => {
    const ids = selectedShapeIds.length ? selectedShapeIds : selectedShapeId ? [selectedShapeId] : [];
    if (!ids.length) return;
    const duped: TemplateShape[] = [];
    ids.forEach((id) => {
      const s = shapes.find((x) => x.id === id); if (!s) return;
      duped.push({ ...s, id: `shape-${Date.now()}-${Math.random().toString(36).slice(2,9)}`, x: s.x+12, y: s.y+12, zIndex: (s.zIndex||1)+1 });
    });
    setShapes((p) => [...p, ...duped]);
  };

  const handleAlign      = (a: "left"|"center-h"|"right"|"top"|"center-v"|"bottom") => {
    const ids = selectedShapeIds.length ? selectedShapeIds : selectedShapeId ? [selectedShapeId] : [];
    if (ids.length < 2) return; setShapes(alignShapes(shapes, ids, a));
  };
  const handleDistribute = (d: "horizontal"|"vertical") => {
    const ids = selectedShapeIds.length ? selectedShapeIds : selectedShapeId ? [selectedShapeId] : [];
    if (ids.length < 3) return; setShapes(distributeShapes(shapes, ids, d));
  };
  const handleReorder    = (a: "front"|"forward"|"backward"|"back") => {
    if (!selectedShapeId) return; setShapes(reorderShape(shapes, selectedShapeId, a));
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png"); link.download = `campaign-${Date.now()}.png`; link.click();
  };

  const openSaveDialog = () => {
    setErr(null); setSaveName(activeTemplate?.name || "New Template"); setSaveDesc(activeTemplate?.description || ""); setSaveOpen(true);
  };

  const canvasToFile = async (canvas: HTMLCanvasElement, filename: string) => {
    fitCanvas();
    const blob: Blob = await new Promise((res, rej) => {
      canvas.toBlob((b) => { if (!b) rej(new Error("Failed")); else res(b); }, "image/png", 1.0);
    });
    return new File([blob], filename, { type: "image/png" });
  };

  const doCreate = async () => {
    setErr(null); const name = saveName.trim(); if (!name) { setErr("Template name is required."); return; }
    setSaving(true); fitCanvas();
    const file = await canvasToFile(canvasRef.current!, `${fileBaseName}.png`);
    const url  = await uploadFileToSpaces(file);
    try {
      const res = await createTemplate({ name, description: saveDesc.trim()||null, shapes, canvasWidth: CANVAS_WIDTH, canvasHeight: CANVAS_HEIGHT, backgroundImage: safeBackground, logoPlacement: logoPlacement??null, thumbnail_url: url } as any);
      if (!res?.ok) throw new Error("Failed to create template");
      setActiveTemplate({ id: res.id, name, description: saveDesc.trim()||undefined, shapes, canvasWidth: CANVAS_WIDTH, canvasHeight: CANVAS_HEIGHT, backgroundImage: safeBackground, logoPlacement, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      setSaveOpen(false);
    } catch (e: any) { setErr(e?.message||"Failed to create template"); } finally { setSaving(false); }
  };

  const doUpdate = async () => {
    if (!activeTemplate?.id) return; setErr(null); setSaving(true);
    const file = await canvasToFile(canvasRef.current!, `${fileBaseName}.png`);
    const url  = await uploadFileToSpaces(file);
    try {
      const res = await updateTemplate(activeTemplate.id, { name: activeTemplate.name, description: activeTemplate.description??null, shapes, canvasWidth: CANVAS_WIDTH, canvasHeight: CANVAS_HEIGHT, backgroundImage: safeBackground, logoPlacement: logoPlacement??null, thumbnail_url: url } as any);
      if (!res?.ok) throw new Error("Failed to update template");
      setActiveTemplate((p) => p ? { ...p, shapes, backgroundImage: safeBackground, logoPlacement, updatedAt: new Date().toISOString() } : p);
    } catch (e: any) { setErr(e?.message||"Failed to update template"); } finally { setSaving(false); }
  };

  const insertPremiumComponent = async (key: PremiumComponentKey) => {
    const newShapes    = getPremiumComponent(key, CANVAS_WIDTH, CANVAS_HEIGHT);
    const resolved     = await resolveTemplateImages(newShapes, campaignData);
    setShapes((prev) => {
      const maxZ = prev.reduce((m, s) => Math.max(m, s.zIndex||1), 1);
      return [...prev, ...resolved.map((s, i) => ({ ...s, zIndex: maxZ+i+1 }))];
    });
    setSelectedShapeId(null); setSelectedShapeIds([]);
  };

  const selectedShape = shapes.find((s) => s.id === selectedShapeId);

  return (
    <div style={{ height: "100vh", overflow: "hidden", background: T.bg, color: T.text, fontFamily: T.mono, display: "flex", flexDirection: "column" }}>

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(180deg,#0d1410 0%,#090c09 100%)",
        borderBottom: `1px solid ${T.border}`,
        padding: "0 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 52,
        boxShadow: "0 1px 0 rgba(0,0,0,0.4)",
      }}>
        {/* Logo / title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: T.accentGlow, border: `1px solid ${T.accent}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
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

        {/* Status chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            fontSize: 9, fontFamily: T.mono, color: T.textMuted,
            border: `1px solid ${T.border}`, borderRadius: 3,
            padding: "2px 8px", letterSpacing: "0.08em",
          }}>
            {CANVAS_WIDTH}×{CANVAS_HEIGHT}
          </div>
          <div style={{
            fontSize: 9, fontFamily: T.mono,
            color: shapes.length > 0 ? T.accentLight : T.textMuted,
            border: `1px solid ${shapes.length > 0 ? T.border : "rgba(255,255,255,0.06)"}`,
            borderRadius: 3, padding: "2px 8px", letterSpacing: "0.08em",
          }}>
            {shapes.length} SHAPE{shapes.length !== 1 ? "S" : ""}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <StudioButton onClick={resetToNewTemplate} variant="ghost" icon={<RefreshCcw size={12} />}>
            New
          </StudioButton>
          {isEditingExisting ? (
            <StudioButton onClick={doUpdate} disabled={saving} variant="accent" icon={<Save size={12} />}>
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
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left panel ────────────────────────────────────────────────────── */}
        <div style={{
          width: 400, flexShrink: 0,
          background: "linear-gradient(180deg,#0a0f0a 0%,#080b08 100%)",
          borderRight: `1px solid ${T.border}`,
          display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}>

          {/* Tab nav — sticky so it stays visible when panel content scrolls */}
          <div style={{
            display: "flex", borderBottom: `1px solid ${T.border}`,
            background: "rgba(0,0,0,0.3)",
            position: "sticky", top: 0, zIndex: 10,
            flexShrink: 0,
          }}>
            {(["design","content","templates"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: "10px 0",
                  fontFamily: T.font, fontSize: 10, letterSpacing: "0.14em",
                  textTransform: "uppercase" as const, cursor: "pointer",
                  background: "transparent", border: "none",
                  borderBottom: activeTab === tab ? `2px solid ${T.accentLight}` : "2px solid transparent",
                  color: activeTab === tab ? T.accentLight : T.textMuted,
                  transition: "all 0.15s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>

            {/* ── DESIGN TAB ─────────────────────────────────────────────────── */}
            {activeTab === "design" && (
              <>
                {/* Canvas controls */}
                <Panel>
                  <PanelTitle icon={<Grid3x3 size={11} />}>Canvas</PanelTitle>
                  <ToggleRow label="Grid" checked={showGrid}    onChange={setShowGrid}    icon={<Grid3x3 size={10} />} />
                  <ToggleRow label="Snap to Objects" checked={snapToObjects} onChange={setSnapToObjects} icon={<Magnet size={10} />} />
                </Panel>

                {/* Background */}
                <Panel>
                  <PanelTitle icon={<ImageIcon size={11} />}>Background</PanelTitle>
                  <ImageUploader
                    onImageSelect={(val: any) => {
                      if (isString(val)) setBackgroundImage(val);
                      else setErr("Background must be a URL string.");
                    }}
                    currentImage={safeBackground}
                  />
                </Panel>

                {/* Logo */}
                <Panel>
                  <PanelTitle>Logo</PanelTitle>
                  <LogoEditor logo={logoPlacement} onLogoChange={setLogoPlacement} />
                </Panel>

                {/* Add shapes */}
                <Panel>
                  <PanelTitle icon={<Plus size={11} />}>Add Shape</PanelTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                    {[
                      ["text",         "Text",      <Type size={10} />],
                      ["rectangle",    "Rect",      <Square size={10} />],
                      ["circle",       "Circle",    <Circle size={10} />],
                      ["rounded-rect", "Rounded",   <Square size={10} />],
                      ["triangle",     "Triangle",  <Triangle size={10} />],
                      ["image",        "Image",     <ImageIcon size={10} />],
                    ].map(([type, label, icon]) => (
                      <StudioButton key={type as string} onClick={() => handleAddShape(type as any)} variant="outline" icon={icon as React.ReactNode}>
                        {label as string}
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

                {/* Premium components */}
                <Panel>
                  <PanelTitle icon={<Layers size={11} />}>Components</PanelTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {PREMIUM_GROUPS.map((g) => (
                      <Collapsible key={g.label} title={g.label}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                          {g.items.map(([key, label]) => (
                            <StudioButton key={key} size="sm" variant="outline" onClick={() => insertPremiumComponent(key as PremiumComponentKey)}>
                              {label}
                            </StudioButton>
                          ))}
                        </div>
                      </Collapsible>
                    ))}

                    <Collapsible title="✦ Clipdrop AI">
                      <div style={{
                        fontSize: 9, color: "#a78bfa", marginBottom: 6,
                        padding: "4px 6px", borderRadius: 4,
                        background: "rgba(167,139,250,0.08)",
                        border: "1px solid rgba(167,139,250,0.2)",
                        letterSpacing: "0.05em",
                      }}>
                        Uses AI credits
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                        {AI_TEMPLATES.map(([key, label]) => (
                          <StudioButton key={key} size="sm" variant="outline" onClick={() => insertPremiumComponent(key as PremiumComponentKey)}
                            style={{ borderColor: "rgba(167,139,250,0.3)", color: "#c4b5fd" } as any}
                          >
                            {label}
                          </StudioButton>
                        ))}
                      </div>
                    </Collapsible>
                  </div>
                </Panel>

                {/* Generate */}
                <StudioButton onClick={handleGeneratePremiumTemplate} variant="accent" fullWidth icon={<Sparkles size={12} />} size="md">
                  Generate AI Template
                </StudioButton>

                {err && (
                  <div style={{
                    fontSize: 10, color: "#f87171", padding: "6px 8px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)", borderRadius: 4,
                  }}>
                    {err}
                  </div>
                )}
              </>
            )}

            {/* ── CONTENT TAB ─────────────────────────────────────────────────── */}
            {activeTab === "content" && (
              <Panel>
                <PanelTitle>Campaign Content</PanelTitle>
                <CampaignDataForm data={campaignData} onChange={setCampaignData} />
              </Panel>
            )}

            {/* ── TEMPLATES TAB ───────────────────────────────────────────────── */}
            {activeTab === "templates" && (
              <>
                <Panel>
                  <PanelTitle icon={<Save size={11} />}>Save</PanelTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {isEditingExisting ? (
                      <StudioButton onClick={doUpdate} disabled={saving} variant="accent" fullWidth icon={<Save size={12} />} size="md">
                        {saving ? "Updating…" : "Update Template"}
                      </StudioButton>
                    ) : (
                      <StudioButton onClick={openSaveDialog} disabled={saving} variant="accent" fullWidth icon={<Save size={12} />} size="md">
                        Save Template
                      </StudioButton>
                    )}
                    {activeTemplate?.id && (
                      <div style={{ fontSize: 9, color: T.textMuted, wordBreak: "break-all", fontFamily: T.mono }}>
                        ID: {activeTemplate.id}
                      </div>
                    )}
                    {err && <div style={{ fontSize: 10, color: "#f87171" }}>{err}</div>}
                  </div>
                </Panel>

                <TemplateManagerV2
                  selectedTemplateId={activeTemplate?.id || null}
                  onSelectTemplate={handleSelectTemplate}
                />
              </>
            )}
          </div>
        </div>

        {/* ── Canvas area ───────────────────────────────────────────────────── */}
        <div className="relative" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#060806" }}>
          {/* Canvas toolbar */}
          <div className="absolute z-50 top-10 left-1/2 transform -translate-x-1/2 bg-white" style={{
            height: 36, borderBottom: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", padding: "0 14px", gap: 12,
            background: "rgba(0,0,0,0.3)",
          }}>
            <span style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.08em" }}>
              {selectedShapeIds.length > 0
                ? `${selectedShapeIds.length} SHAPES SELECTED`
                : selectedShape
                ? `${selectedShape.type.toUpperCase()} SELECTED`
                : "CANVAS"}
            </span>
            {(selectedShapeId || selectedShapeIds.length > 0) && (
              <>
                <div style={{ width: 1, height: 40, background: T.border }} />
                <AdvancedShapeTools
                  selectedShapeIds={selectedShapeIds.length ? selectedShapeIds : selectedShapeId ? [selectedShapeId] : []}
                  onDuplicate={handleDuplicateSelected}
                  onDelete={handleDeleteSelected}
                  onAlign={handleAlign}
                  onDistribute={handleDistribute}
                  onReorder={handleReorder}
                />
              </>
            )}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 9, color: T.textMuted }}>{Math.round(zoom * 100)}%</span>
          </div>

          {/* Canvas */}
          <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{
              background: "#fff",
              borderRadius: 4,
              boxShadow: `0 0 0 1px rgba(30,95,59,0.2), 0 24px 80px rgba(0,0,0,0.7)`,
              overflow: "hidden",
            }}>
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
                onShapeDrag={handleShapeDrag}
                onShapeResize={handleShapeResize}
                canvasWidth={CANVAS_WIDTH}
                canvasHeight={CANVAS_HEIGHT}
                isEditable={true}
                showGrid={showGrid}
                snapToGrid={snapToGrid}
                snapToObjects={snapToObjects}
              />
            </div>
          </div>
        </div>

        {/* ── Right panel — Properties ───────────────────────────────────────── */}
        {selectedShape && (
          <div style={{
            width: 400, flexShrink: 0,
            background: "linear-gradient(180deg,#0a0f0a 0%,#080b08 100%)",
            borderLeft: `1px solid ${T.border}`,
            overflowY: "auto", padding: 12,
          }}>
            <PropertyInspector
              shape={selectedShape}
              campaignData={campaignData}
              onUpdate={handleUpdateShape}
            />
          </div>
        )}
      </div>

      {/* ── Image Upload Dialog ──────────────────────────────────────────────── */}
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
              <input type="file" accept="image/*" onChange={handleImageFile}
                style={{ width: "100%", fontSize: 11, color: T.textMuted, cursor: "pointer", fontFamily: T.mono }}
              />
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
                style={{ ...{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, fontSize: 12, padding: "6px 10px", outline: "none", fontFamily: T.mono, boxSizing: "border-box" as const } }}
                onFocus={(e) => { e.currentTarget.style.borderColor = T.accent; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = T.border; }}
              />
            </div>
            {imageUrl && (
              <div style={{ borderRadius: 6, overflow: "hidden", border: `1px solid ${T.border}`, maxHeight: 160, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}>
                <img src={imageUrl} alt="Preview" style={{ maxHeight: 160, maxWidth: "100%", objectFit: "contain" }} />
              </div>
            )}
          </div>

          <DialogFooter style={{ gap: 8, paddingTop: 8 }}>
            <StudioButton variant="outline" onClick={() => { setImageUploadOpen(false); setImageUrl(""); }}>
              Cancel
            </StudioButton>
            <StudioButton variant="accent" onClick={handleImageUpload} disabled={!imageUrl.trim()} icon={<Upload size={12} />}>
              Add Image
            </StudioButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Save Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={saveOpen} onOpenChange={(o) => !saving && setSaveOpen(o)}>
        <DialogContent style={{ background: "#0d1410", border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, maxWidth: 360 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: T.font, letterSpacing: "0.16em", color: T.accentLight }}>
              SAVE TEMPLATE
            </DialogTitle>
            <DialogDescription style={{ fontSize: 11, color: T.textMuted }}>
              Name your template to save it to the library
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["NAME", saveName, setSaveName, "My Template"],
              ["DESCRIPTION", saveDesc, setSaveDesc, "Optional description"],
            ].map(([label, val, setter, ph]) => (
              <div key={label as string}>
                <div style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", marginBottom: 5 }}>{label as string}</div>
                <input
                  value={val as string}
                  onChange={(e) => (setter as any)(e.target.value)}
                  placeholder={ph as string}
                  style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, fontSize: 12, padding: "6px 10px", outline: "none", fontFamily: T.mono, boxSizing: "border-box" as const }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = T.accent; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = T.border; }}
                />
              </div>
            ))}
            {err && <div style={{ fontSize: 10, color: "#f87171", padding: "4px 6px", background: "rgba(239,68,68,0.08)", borderRadius: 3 }}>{err}</div>}
          </div>

          <DialogFooter style={{ gap: 8, paddingTop: 8 }}>
            <StudioButton variant="outline" onClick={() => { if (!saving) setSaveOpen(false); }}>Cancel</StudioButton>
            <StudioButton variant="accent" onClick={doCreate} disabled={saving} icon={<Save size={12} />}>
              {saving ? "Saving…" : "Save"}
            </StudioButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}