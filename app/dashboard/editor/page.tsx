"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
import { resolveTemplateImages } from "@/lib/resolve-template-images";
import {
  Download,
  Plus,
  RefreshCcw,
  Save,
  Grid3x3,
  Magnet,
  MousePointer2,
  Upload,
  Video,
} from "lucide-react";
import { alignShapes, distributeShapes, reorderShape } from "@/lib/alignment-utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { createTemplate, updateTemplate } from "@/lib/template-storage";
import { uploadFileToSpaces } from "@/lib/upload-client";

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;

const DEFAULT_CAMPAIGN_DATA: CampaignData = {
  hook: "Unlock the Power of AI",
  subheading: "Streamline Your Content Creation",
  bullets: [
    "Save time with AI automation",
    "Engage your audience effortlessly",
    "Transform your approach",
  ],
  proof: "Businesses using AI create 60% more content",
  cta: "Get Started Today",
  hashtags: "#AI #Innovation #Automation",
  companyName: "NEUROFLOW",
  location: "MARKETING",
  ctaLink: "https://example.com",
};

function isString(x: any): x is string {
  return typeof x === "string";
}

function ensureBgString(bg: any): string | null {
  if (!bg) return null;
  if (typeof bg === "string") return bg;
  return null;
}

// ─── Premium component labels ───────────────────────────────────────────────
const PREMIUM_COMPONENTS: { key: PremiumComponentKey; label: string }[] = [
  { key: "offer",              label: "Offer / Discount"     },
  { key: "hero",               label: "Hero Product"         },
  { key: "skincare",           label: "Skincare Split"       },
  { key: "boldBrand",          label: "Bold Brand"           },
  { key: "flashSale",          label: "Flash Sale"           },
  { key: "testimonial",        label: "Testimonial"          },
  { key: "editorial",          label: "Editorial Blog"       },
  { key: "luxuryDark",         label: "Luxury Dark"          },
  { key: "splitColor",         label: "Split Color"          },
  { key: "instagramStory",     label: "IG Story"             },
  { key: "communityEvent",     label: "Community Event"      },
  { key: "albumCover",         label: "Album Cover"          },
  { key: "boldStatement",      label: "Bold Statement"       },
  { key: "fullBleedHero",      label: "Full Bleed Hero"      },
  { key: "massiveTypography",  label: "Massive Type"         },
  { key: "comparison",         label: "Old vs New"           },
  { key: "collageGrid",        label: "Collage Grid"         },
  { key: "singleHeroPhoto",    label: "Hero Photo"           },
  { key: "splitPhotoContent",  label: "Split Photo"          },
  { key: "magazinePhotoGrid",  label: "Magazine Grid"        },
  { key: "thoughtLeader",      label: "Thought Leader"       },
  { key: "lifestyleShowcase",  label: "Lifestyle Showcase"   },
  { key: "darkEditorial",      label: "Dark Editorial"       },
  { key: "productFloat",       label: "Product Float"        },
  { key: "statsShowcase",      label: "Stats Showcase"       },
  { key: "brandVs",            label: "Brand Vs"             },
  { key: "lifestyleHero",      label: "Lifestyle Hero"       },
  { key: "productAbstract",    label: "Product Abstract"     },
  { key: "saasAd",             label: "SaaS Ad"              },
  { key: "characterDashboard", label: "3D Character"         },
];

export default function EditorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [campaignData, setCampaignData] = useState<CampaignData>(DEFAULT_CAMPAIGN_DATA);
  const [shapes, setShapes] = useState<TemplateShape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [logoPlacement, setLogoPlacement] = useState<
    | { url: string; x: number; y: number; width: number; height: number; opacity: number }
    | undefined
  >(undefined);

  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [snapToObjects, setSnapToObjects] = useState(true);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Image upload dialog
  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [pendingImageShapeId, setPendingImageShapeId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  // Save dialog
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ── Video render state ──────────────────────────────────────────────────
  const [renderingVideo, setRenderingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const safeBackground = useMemo(() => ensureBgString(backgroundImage), [backgroundImage]);
  const isEditingExisting = !!activeTemplate?.id;

  const fitCanvas = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          (e.target as HTMLElement).isContentEditable
        )
          return;
        if (selectedShapeId || selectedShapeIds.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        handleDuplicateSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        setSelectedShapeIds(shapes.map((s) => s.id));
        setSelectedShapeId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shapes, selectedShapeId, selectedShapeIds]);

  // ── Reset ────────────────────────────────────────────────────────────────
  const resetToNewTemplate = () => {
    setErr(null);
    setActiveTemplate(null);
    setBackgroundImage(null);
    setShapes([]);
    setSelectedShapeId(null);
    setSelectedShapeIds([]);
    setLogoPlacement(undefined);
    setSaveName("");
    setSaveDesc("");
    setVideoUrl(null);
  };

  // ── Load template ────────────────────────────────────────────────────────
  const handleSelectTemplate = (t: Template) => {
    setActiveTemplate(t);
    setShapes(t.shapes || []);
    setBackgroundImage(t.backgroundImage || null);
    setLogoPlacement(t.logoPlacement);
    setSelectedShapeId(null);
    setSelectedShapeIds([]);
  };

  // ── Add shape ────────────────────────────────────────────────────────────
  const handleAddShape = (type: TemplateShape["type"]) => {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;

    let width = 260;
    let height = 90;
    let x = centerX - 130;
    let y = centerY - 45;
    let textColor = "#000000";

    if (type === "circle") {
      width = 150; height = 150;
      x = centerX - 75; y = centerY - 75;
    } else if (type === "text") {
      width = 400; height = 100;
      x = centerX - 200; y = 100;
      textColor = "#ffffff";
    } else if (type === "button") {
      width = 200; height = 50;
      x = centerX - 100; y = centerY - 25;
      textColor = "#ffffff";
    } else if (type === "image") {
      const newShapeId = `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newShape: TemplateShape = {
        id: newShapeId,
        type: "image",
        x: centerX - 130,
        y: centerY - 130,
        width: 260,
        height: 260,
        zIndex: shapes.length + 1,
        opacity: 1,
        backgroundColor: "#f0f0f0",
        borderColor: "transparent",
        borderWidth: 0,
        src: undefined,
        fit: "cover",
        radius: 8,
        shadowBlur: 0,
        shadowX: 0,
        shadowY: 0,
        shadowColor: "#000000",
      } as any;
      setShapes((prev) => [...prev, newShape]);
      setSelectedShapeId(newShapeId);
      setPendingImageShapeId(newShapeId);
      setImageUploadOpen(true);
      return;
    }

    const newShape: TemplateShape = {
      id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      x, y, width, height,
      zIndex: shapes.length + 1,
      opacity: 1,
      backgroundColor:
        type === "text" ? undefined : type === "button" ? "#3b82f6" : "#ffffff",
      borderColor: "#000000",
      borderWidth: type === "text" ? 0 : 1,
      borderRadius: type === "rounded-rect" ? 8 : type === "button" ? 6 : undefined,
      textColor,
      fontSize: type === "button" ? 16 : type === "text" ? 32 : 24,
      fontFamily: "Arial",
      fontWeight: type === "button" ? 600 : type === "text" ? 700 : 400,
      textAlign: type === "button" ? "center" : type === "text" ? "center" : "left",
      padding: 10,
      dataField: type === "text" ? "hook" : undefined,
      direction: type === "triangle" ? "up" : undefined,
      buttonText: type === "button" ? "Click Here" : undefined,
      buttonLink: type === "button" ? campaignData.ctaLink || "https://example.com" : undefined,
      hoverColor: type === "button" ? "#2563eb" : undefined,
      lineWidth: type === "line" ? 6 : undefined,
      lineDash: type === "line" ? [] : undefined,
      lineCap: type === "line" ? "round" : undefined,
      shadowBlur: 0,
      shadowX: 0,
      shadowY: 0,
      shadowColor: "#000000",
    };

    setShapes((prev) => [...prev, newShape]);
    setSelectedShapeId(newShape.id);
    setSelectedShapeIds([]);
  };

  // ── Image upload dialog handlers ─────────────────────────────────────────
  const handleImageUpload = () => {
    if (!imageUrl.trim() || !pendingImageShapeId) return;
    const shape = shapes.find((s) => s.id === pendingImageShapeId);
    if (!shape) return;
    setShapes((prev) =>
      prev.map((s) =>
        s.id === pendingImageShapeId ? { ...s, src: imageUrl.trim() } : s
      )
    );
    setImageUploadOpen(false);
    setImageUrl("");
    setPendingImageShapeId(null);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setImageUrl(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Generate premium AI template ─────────────────────────────────────────
  const handleGeneratePremiumTemplate = async () => {
    setErr(null);
    try {
      const res = await synthesizeAndSaveTemplate({
        brand_id: "neuroflow",
        canvas_width: CANVAS_WIDTH,
        canvas_height: CANVAS_HEIGHT,
      });
      if (!res.ok) throw new Error(res.error || "Synthesis failed");
      if (res.template) {
        setShapes(res.template.shapes || []);
        setBackgroundImage(res.template.backgroundImage || null);
        setLogoPlacement(res.template.logoPlacement || undefined);
        setActiveTemplate(res.template);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to generate template");
    }
  };

  // ── Insert premium component (with Unsplash/Clipdrop image resolution) ──
  const insertPremiumComponent = async (key: PremiumComponentKey) => {
    const newShapes = getPremiumComponent(key, CANVAS_WIDTH, CANVAS_HEIGHT);
    const resolvedShapes = await resolveTemplateImages(newShapes, campaignData);
    setShapes((prev) => {
      const maxZ = prev.reduce((m, s) => Math.max(m, s.zIndex || 1), 1);
      return [
        ...prev,
        ...resolvedShapes.map((s, i) => ({ ...s, zIndex: maxZ + i + 1 })),
      ];
    });
    setSelectedShapeId(null);
    setSelectedShapeIds([]);
  };

  // ── Shape interaction handlers ───────────────────────────────────────────
  const handleSelectShape = (id: string, multiSelect: boolean = false) => {
    if (!id) {
      setSelectedShapeId(null);
      setSelectedShapeIds([]);
      return;
    }
    if (multiSelect) {
      setSelectedShapeIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
      setSelectedShapeId(null);
    } else {
      setSelectedShapeId(id);
      setSelectedShapeIds([]);
    }
  };

  const handleUpdateShape = (shape: TemplateShape) => {
    setShapes((prev) => prev.map((s) => (s.id === shape.id ? shape : s)));
  };

  const handleShapeDrag = (id: string, x: number, y: number) => {
    const shape = shapes.find((s) => s.id === id);
    if (!shape) return;
    handleUpdateShape({ ...shape, x, y });
  };

  const handleShapeResize = (id: string, width: number, height: number) => {
    const shape = shapes.find((s) => s.id === id);
    if (!shape) return;
    handleUpdateShape({ ...shape, width, height });
  };

  const handleDeleteSelected = () => {
    if (selectedShapeId) {
      setShapes((prev) => prev.filter((s) => s.id !== selectedShapeId));
      setSelectedShapeId(null);
    }
    if (selectedShapeIds.length > 0) {
      setShapes((prev) => prev.filter((s) => !selectedShapeIds.includes(s.id)));
      setSelectedShapeIds([]);
    }
  };

  const handleDuplicateSelected = () => {
    const idsToDup =
      selectedShapeIds.length > 0
        ? selectedShapeIds
        : selectedShapeId
        ? [selectedShapeId]
        : [];
    if (!idsToDup.length) return;
    const newShapes: TemplateShape[] = [];
    idsToDup.forEach((id) => {
      const s = shapes.find((x) => x.id === id);
      if (!s) return;
      newShapes.push({
        ...s,
        id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        x: s.x + 12,
        y: s.y + 12,
        zIndex: (s.zIndex || 1) + 1,
      });
    });
    setShapes((prev) => [...prev, ...newShapes]);
  };

  const handleAlign = (
    alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom"
  ) => {
    const ids =
      selectedShapeIds.length > 0
        ? selectedShapeIds
        : selectedShapeId
        ? [selectedShapeId]
        : [];
    if (ids.length < 2) return;
    setShapes(alignShapes(shapes, ids, alignment));
  };

  const handleDistribute = (direction: "horizontal" | "vertical") => {
    const ids =
      selectedShapeIds.length > 0
        ? selectedShapeIds
        : selectedShapeId
        ? [selectedShapeId]
        : [];
    if (ids.length < 3) return;
    setShapes(distributeShapes(shapes, ids, direction));
  };

  const handleReorder = (action: "front" | "forward" | "backward" | "back") => {
    if (!selectedShapeId) return;
    setShapes(reorderShape(shapes, selectedShapeId, action));
  };

  // ── Export PNG ───────────────────────────────────────────────────────────
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `campaign-${Date.now()}.png`;
    link.click();
  };

  // ── Render Video ─────────────────────────────────────────────────────────
  const handleRenderVideo = async () => {
  setRenderingVideo(true);
  setVideoUrl(null);

  try {
    // ── 1. Export current canvas template as PNG ──────────────────
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Canvas not ready");

    // Get PNG as base64
    const templatePng = canvas.toDataURL("image/png", 1.0);

    // ── 2. Upload template PNG to Spaces first ────────────────────
    console.log("Uploading template PNG...");
    const pngBlob = await (await fetch(templatePng)).blob();
    const pngFile = new File(
      [pngBlob],
      `template-${Date.now()}.png`,
      { type: "image/png" }
    );
    const templateImageUrl = await uploadFileToSpaces(pngFile);
    console.log("Template PNG uploaded:", templateImageUrl);

    // ── 3. Send to render API with template URL ───────────────────
    const res = await fetch("/api/render-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Campaign content
        body_text: [
          campaignData.hook,
          campaignData.subheading,
          ...(campaignData.bullets || []),
          campaignData.proof,
          campaignData.cta,
        ]
          .filter(Boolean)
          .join("\n"),
        companyName:  campaignData.companyName,
        accentColor:  "#6366f1",

        // ✅ Template PNG — used as brand overlay on every scene
        templateImageUrl,

        // Optional: use Veo3 or just Pexels
        useVeo3: true,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      setVideoUrl(data.url);
    } else {
      setErr(data.error || "Render failed");
    }
  } catch (e: any) {
    setErr(e?.message || "Export failed");
  } finally {
    setRenderingVideo(false);
  }
};

  // ── Canvas to file helper ────────────────────────────────────────────────
  const fileBaseName = useMemo(() => {
    const company = campaignData?.companyName || "campaign";
    const date = new Date().toISOString().split("T")[0];
    return `${company}-${date}`;
  }, [campaignData?.companyName]);

  const canvasToFile = async (
    canvas: HTMLCanvasElement,
    filename: string
  ): Promise<File> => {
    fitCanvas();
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) return reject(new Error("Failed to export canvas as PNG blob"));
          resolve(b);
        },
        "image/png",
        1.0
      );
    });
    return new File([blob], filename, { type: "image/png" });
  };

  // ── Apply template ───────────────────────────────────────────────────────
  const applyTemplateToEditor = (t: Template) => {
    setErr(null);
    setActiveTemplate(t);
    setBackgroundImage(ensureBgString((t as any).backgroundImage));
    setShapes(Array.isArray(t.shapes) ? t.shapes : []);
    setLogoPlacement(t.logoPlacement);
    setSelectedShapeId(null);
    setSelectedShapeIds([]);
    setSaveName(t.name || "");
    setSaveDesc(t.description || "");
  };

  // ── Save / Update dialogs ────────────────────────────────────────────────
  const openSaveDialog = () => {
    setErr(null);
    setSaveName(activeTemplate?.name || "New Template");
    setSaveDesc(activeTemplate?.description || "");
    setSaveOpen(true);
  };

  const doCreate = async () => {
    setErr(null);
    const name = saveName.trim();
    if (!name) { setErr("Template name is required."); return; }
    setSaving(true);
    fitCanvas();
    try {
      const file = await canvasToFile(
        canvasRef.current as HTMLCanvasElement,
        `${fileBaseName}.png`
      );
      const url = await uploadFileToSpaces(file);
      const payload = {
        name,
        description: saveDesc.trim() || null,
        shapes,
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        backgroundImage: safeBackground,
        logoPlacement: logoPlacement ?? null,
        thumbnail_url: url,
      };
      const res = await createTemplate(payload as any);
      if (!res?.ok) throw new Error("Failed to create template");
      setActiveTemplate({
        id: res.id,
        name,
        description: saveDesc.trim() || undefined,
        shapes,
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        backgroundImage: safeBackground,
        logoPlacement,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setSaveOpen(false);
    } catch (e: any) {
      setErr(e?.message || "Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  const doUpdate = async () => {
    if (!activeTemplate?.id) return;
    setErr(null);
    setSaving(true);
    try {
      const file = await canvasToFile(
        canvasRef.current as HTMLCanvasElement,
        `${fileBaseName}.png`
      );
      const url = await uploadFileToSpaces(file);
      const payload = {
        name: activeTemplate.name,
        description: activeTemplate.description ?? null,
        shapes,
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        backgroundImage: safeBackground,
        logoPlacement: logoPlacement ?? null,
        thumbnail_url: url,
      };
      const res = await updateTemplate(activeTemplate.id, payload as any);
      if (!res?.ok) throw new Error("Failed to update template");
      setActiveTemplate((prev) =>
        prev
          ? {
              ...prev,
              shapes,
              backgroundImage: safeBackground,
              logoPlacement,
              updatedAt: new Date().toISOString(),
            }
          : prev
      );
    } catch (e: any) {
      setErr(e?.message || "Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background">
      {/* ── TOP NAV ── */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between p-4 max-w-full mx-auto">
          <div className="min-w-0">
            <h1 className="text-2xl font-serif font-bold text-foreground">
              Campaign Designer Pro
            </h1>
            <p className="text-xs text-muted-foreground">
              Professional design tools — drag, resize, export PNG &amp; MP4
            </p>
          </div>

        <Button
          onClick={async () => {
            const res = await fetch("/api/test-veo3");
            const data = await res.json();
            console.log("Veo3 test:", data);
            alert(JSON.stringify(data, null, 2));
          }}
          variant="outline"
        >
          Test Veo3
        </Button>

          <div className="flex gap-2 flex-wrap">
            {/* New Template */}
            <Button
              variant="outline"
              onClick={resetToNewTemplate}
              className="bg-transparent"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              New
            </Button>

            {/* Export PNG */}
            <Button
              onClick={handleExportPNG}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PNG
            </Button>

            {/* Export Video */}
            <Button
              onClick={handleRenderVideo}
              disabled={renderingVideo}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {renderingVideo ? (
                <>
                  <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                  Rendering…
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Export Video
                </>
              )}
            </Button>

            {/* Download MP4 — appears after render */}
            {videoUrl && (
              <a
                href={videoUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download MP4
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="flex gap-4 p-4 max-w-full mx-auto">
        {/* ── LEFT PANEL ── */}
        <div className="w-80 shrink-0 flex-none flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-100px)]">
          <Tabs defaultValue="design" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="design" className="text-xs">Design</TabsTrigger>
              <TabsTrigger value="data"   className="text-xs">Content</TabsTrigger>
              <TabsTrigger value="templates" className="text-xs">Templates</TabsTrigger>
            </TabsList>

            {/* ── DESIGN TAB ── */}
            <TabsContent value="design" className="space-y-4">

              {/* Editor controls */}
              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Editor Controls
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-grid" className="text-xs flex items-center gap-2">
                      <Grid3x3 className="w-3.5 h-3.5" />
                      Show Grid
                    </Label>
                    <Switch
                      id="show-grid"
                      checked={showGrid}
                      onCheckedChange={setShowGrid}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="snap-objects" className="text-xs flex items-center gap-2">
                      <Magnet className="w-3.5 h-3.5" />
                      Snap to Objects
                    </Label>
                    <Switch
                      id="snap-objects"
                      checked={snapToObjects}
                      onCheckedChange={setSnapToObjects}
                    />
                  </div>
                </div>
              </Card>

              {/* Background */}
              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Background
                </h3>
                <ImageUploader
                  onImageSelect={(val: any) => {
                    if (isString(val)) setBackgroundImage(val);
                    else setErr("Background must be a URL or data URL string.");
                  }}
                  currentImage={safeBackground}
                />
              </Card>

              {/* Logo */}
              <LogoEditor logo={logoPlacement} onLogoChange={setLogoPlacement} />

              {/* Premium Components */}
              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Premium Components
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {PREMIUM_COMPONENTS.map(({ key, label }) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => insertPremiumComponent(key)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Add Shape */}
              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Add Shape
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => handleAddShape("text")} variant="outline" size="sm" className="text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Text
                  </Button>
                  <Button onClick={() => handleAddShape("rectangle")} variant="outline" size="sm" className="text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Rectangle
                  </Button>
                  <Button onClick={() => handleAddShape("circle")} variant="outline" size="sm" className="text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Circle
                  </Button>
                  <Button onClick={() => handleAddShape("rounded-rect")} variant="outline" size="sm" className="text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Rounded
                  </Button>
                  <Button onClick={() => handleAddShape("triangle")} variant="outline" size="sm" className="text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Triangle
                  </Button>
                  <Button onClick={() => handleAddShape("image")} variant="outline" size="sm" className="text-xs">
                    <Upload className="w-3 h-3 mr-1" /> Image
                  </Button>
                  <Button onClick={() => handleAddShape("button")} variant="outline" size="sm" className="text-xs col-span-2">
                    <MousePointer2 className="w-3 h-3 mr-1" /> Clickable Button
                  </Button>
                  <Button onClick={() => handleAddShape("bullet-group")} variant="outline" size="sm" className="text-xs col-span-2">
                    <Plus className="w-3 h-3 mr-1" /> Bullet List
                  </Button>
                  <Button onClick={() => handleAddShape("line")} variant="outline" size="sm" className="text-xs col-span-2">
                    <Plus className="w-3 h-3 mr-1" /> Line
                  </Button>
                </div>
              </Card>

              {/* Advanced shape tools */}
              {(selectedShapeId || selectedShapeIds.length > 0) && (
                <AdvancedShapeTools
                  selectedShapeIds={
                    selectedShapeIds.length > 0
                      ? selectedShapeIds
                      : selectedShapeId
                      ? [selectedShapeId]
                      : []
                  }
                  onDuplicate={handleDuplicateSelected}
                  onDelete={handleDeleteSelected}
                  onAlign={handleAlign}
                  onDistribute={handleDistribute}
                  onReorder={handleReorder}
                />
              )}

              {/* Property inspector */}
              {selectedShapeId && (
                <PropertyInspector
                  shape={shapes.find((s) => s.id === selectedShapeId)!}
                  campaignData={campaignData}
                  onUpdate={handleUpdateShape}
                />
              )}
            </TabsContent>

            {/* ── CONTENT TAB ── */}
            <TabsContent value="data" className="space-y-4">
              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Campaign Content
                </h3>
                <CampaignDataForm data={campaignData} onChange={setCampaignData} />
              </Card>
            </TabsContent>

            {/* ── TEMPLATES TAB ── */}
            <TabsContent value="templates" className="space-y-4">
              <Card className="p-4 border-border space-y-3">
                <div className="text-sm font-semibold text-foreground">
                  {isEditingExisting ? "Editing existing template" : "New template"}
                </div>

                {isEditingExisting ? (
                  <Button
                    onClick={doUpdate}
                    disabled={saving}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Updating…" : "Update Template"}
                  </Button>
                ) : (
                  <Button
                    onClick={openSaveDialog}
                    disabled={saving}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </Button>
                )}

                <Button
                  onClick={handleGeneratePremiumTemplate}
                  className="bg-foreground text-background hover:bg-foreground/90 w-full"
                >
                  Generate Premium Template
                </Button>

                {activeTemplate?.id && (
                  <div className="text-[11px] text-muted-foreground break-all">
                    Active ID:{" "}
                    <span className="font-mono">{activeTemplate.id}</span>
                  </div>
                )}

                {err && <div className="text-xs text-red-600">{err}</div>}
              </Card>

              <TemplateManagerV2
                selectedTemplateId={activeTemplate?.id || null}
                onSelectTemplate={handleSelectTemplate}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* ── CANVAS AREA ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <Card className="flex-1 border-border bg-card p-4">
            <div className="w-full h-[70vh] bg-white rounded border border-border overflow-auto">
              <div className="min-w-max min-h-max p-3">
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
          </Card>

          {/* Status bar */}
          <Card className="p-3 border-border">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Canvas: {CANVAS_WIDTH} × {CANVAS_HEIGHT}px</span>
              <span>
                {shapes.length} shape{shapes.length !== 1 ? "s" : ""}
              </span>
              <span>
                {selectedShapeIds.length > 0
                  ? `${selectedShapeIds.length} selected`
                  : selectedShapeId
                  ? "1 selected"
                  : "None selected"}
              </span>
              {videoUrl && (
                <span className="text-violet-600 font-medium">
                  ✅ Video ready
                </span>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── IMAGE UPLOAD DIALOG ── */}
      <Dialog open={imageUploadOpen} onOpenChange={setImageUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Image</DialogTitle>
            <DialogDescription>
              Choose an image file or enter an image URL
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Upload from computer</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageFile}
                className="cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="flex-1 border-t" />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            {imageUrl && (
              <div className="p-2 border rounded">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="max-h-40 mx-auto"
                  onError={() => setErr("Invalid image URL")}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImageUploadOpen(false);
                setImageUrl("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleImageUpload} disabled={!imageUrl.trim()}>
              <Upload className="w-4 h-4 mr-2" />
              Add Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── SAVE TEMPLATE DIALOG ── */}
      <Dialog
        open={saveOpen}
        onOpenChange={(o) => !saving && setSaveOpen(o)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save template</DialogTitle>
            <DialogDescription>Name + description</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Name</div>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Description</div>
              <Input
                value={saveDesc}
                onChange={(e) => setSaveDesc(e.target.value)}
                placeholder="Optional"
              />
            </div>
            {err && <div className="text-xs text-red-600">{err}</div>}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (saving) return;
                setSaveOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={doCreate} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}