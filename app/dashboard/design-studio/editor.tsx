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
import { getPremiumComponent, PremiumComponentKey } from "@/lib/template-components"
import { TemplateShape, CampaignData, Template } from "@/lib/types";
import { Download, Plus, RefreshCcw, Save, Grid3x3, Magnet, MousePointer2, Upload } from "lucide-react";
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
import { resolveTemplateImages } from "@/lib/resolve-template-images";

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

export default function EditorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);

  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [campaignData, setCampaignData] = useState<CampaignData>(DEFAULT_CAMPAIGN_DATA);
  const [shapes, setShapes] = useState<TemplateShape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [logoPlacement, setLogoPlacement] = useState<
    { url: string; x: number; y: number; width: number; height: number; opacity: number } | undefined
  >(undefined);

  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [snapToObjects, setSnapToObjects] = useState(true);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

   const fitCanvas = () => {
    setZoom(1) 
    setPan({ x: 0, y: 0 })
  }
  // ✅ Image upload dialog state
  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [pendingImageShapeId, setPendingImageShapeId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const safeBackground = useMemo(() => ensureBgString(backgroundImage), [backgroundImage]);

  const isEditingExisting = !!activeTemplate?.id;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
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
  };

  const handleSelectTemplate = (t: Template) => {
    setActiveTemplate(t);
    setShapes(t.shapes || []);
    setBackgroundImage(t.backgroundImage || null);
    setLogoPlacement(t.logoPlacement);
    setSelectedShapeId(null);
    setSelectedShapeIds([]);
  };

  // ✅ CRITICAL FIX: Better shape creation with visible defaults
  const handleAddShape = (type: TemplateShape["type"]) => {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;

    let width = 260;
    let height = 90;
    let x = centerX - 130;
    let y = centerY - 45;
    let textColor = "#000000";

    if (type === "circle") {
      width = 150;
      height = 150;
      x = centerX - 75;
      y = centerY - 75;
    } else if (type === "text") {
      width = 400;
      height = 100;
      x = centerX - 200; // ✅ CENTER THE TEXT
      y = 100;
      textColor = "#ffffff"; // ✅ WHITE TEXT (visible on dark bg)
    } else if (type === "button") {
      width = 200;
      height = 50;
      x = centerX - 100;
      y = centerY - 25;
      textColor = "#ffffff";
    } else if (type === "image") {
      // ✅ IMAGE: Show upload dialog immediately
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
        backgroundColor: "transparent",
        borderColor: "transparent",
        borderWidth: 0,
        src: undefined, // ✅ No image yet
        fit: "cover",
        radius: 8,
        shadowBlur: 0,
        shadowX: 0,
        shadowY: 0,
        shadowColor: "#000000",
      };

      setShapes((prev) => [...prev, newShape]);
      setSelectedShapeId(newShapeId);
      setPendingImageShapeId(newShapeId);
      setImageUploadOpen(true); // ✅ OPEN DIALOG
      return; // Don't continue with normal flow
    }

    const newShape: TemplateShape = {
      id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      x,
      y,
      width,
      height,
      zIndex: shapes.length + 1,
      opacity: 1,

      backgroundColor: type === "text" ? undefined : type === "button" ? "#3b82f6" : "#ffffff",
      borderColor: "#000000",
      borderWidth: type === "text" ? 0 : 1,
      borderRadius: type === "rounded-rect" ? 8 : type === "button" ? 6 : undefined,

      textColor,
      fontSize: type === "button" ? 16 : type === "text" ? 32 : 24, // ✅ BIGGER text
      fontFamily: "Arial",
      fontWeight: type === "button" ? 600 : type === "text" ? 700 : 400, // ✅ BOLD text
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

    console.log("✅ Adding shape:", type, {
      id: newShape.id,
      x: newShape.x,
      y: newShape.y,
      textColor: newShape.textColor,
      fontSize: newShape.fontSize,
      dataField: newShape.dataField,
    });

    setShapes((prev) => [...prev, newShape]);
    setSelectedShapeId(newShape.id);
    setSelectedShapeIds([]);
  };

  // ✅ Handle image upload
  const handleImageUpload = () => {
    if (!imageUrl.trim() || !pendingImageShapeId) return;

    const shape = shapes.find((s) => s.id === pendingImageShapeId);
    if (!shape) return;

    const updated = {
      ...shape,
      src: imageUrl.trim(),
    };

    setShapes((prev) => prev.map((s) => (s.id === pendingImageShapeId ? updated : s)));
    setImageUploadOpen(false);
    setImageUrl("");
    setPendingImageShapeId(null);
  };

  // ✅ Handle image upload via file picker
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

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

  const handleSelectShape = (id: string, multiSelect: boolean = false) => {
    if (!id) {
      // ✅ Deselect all
      setSelectedShapeId(null);
      setSelectedShapeIds([]);
      return;
    }
    if (multiSelect) {
      setSelectedShapeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
      selectedShapeIds.length > 0 ? selectedShapeIds : selectedShapeId ? [selectedShapeId] : [];

    if (idsToDup.length === 0) return;

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

  const handleAlign = (alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom") => {
    const ids = selectedShapeIds.length > 0 ? selectedShapeIds : selectedShapeId ? [selectedShapeId] : [];
    if (ids.length < 2) return;

    const aligned = alignShapes(shapes, ids, alignment);
    setShapes(aligned);
  };

  const handleDistribute = (direction: "horizontal" | "vertical") => {
    const ids = selectedShapeIds.length > 0 ? selectedShapeIds : selectedShapeId ? [selectedShapeId] : [];
    if (ids.length < 3) return;

    const distributed = distributeShapes(shapes, ids, direction);
    setShapes(distributed);
  };

  const handleReorder = (action: "front" | "forward" | "backward" | "back") => {
    if (!selectedShapeId) return;

    const reordered = reorderShape(shapes, selectedShapeId, action);
    setShapes(reordered);
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `campaign-${Date.now()}.png`;
    link.click();
  };

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

  const openSaveDialog = () => {
    setErr(null);
    setSaveName(activeTemplate?.name || "New Template");
    setSaveDesc(activeTemplate?.description || "");
    setSaveOpen(true);
  };

  const canvasToFile = async (canvas: HTMLCanvasElement, filename: string) => {

    fitCanvas()
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

  const fileBaseName = useMemo(() => {
      const company = campaignData?.companyName || "campaign";
      const date = new Date().toISOString().split("T")[0];
      return `${company}-${date}`;
    }, [campaignData?.companyName]);

  const doCreate = async () => {
    setErr(null);
    const name = saveName.trim();
    if (!name) {
      setErr("Template name is required.");
      return;
    }

    setSaving(true);
    fitCanvas();
    const file = await canvasToFile(canvasRef.current as HTMLCanvasElement, `${fileBaseName}.png`);
    const url = await uploadFileToSpaces(file);
    try {
      const payload = {
        name,
        description: saveDesc.trim() || null,
        shapes,
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        backgroundImage: safeBackground,
        logoPlacement: logoPlacement ?? null,
        thumbnail_url:url
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

    const file = await canvasToFile(canvasRef.current as HTMLCanvasElement, `${fileBaseName}.png`);
    const url = await uploadFileToSpaces(file);

    try {
      const payload = {
        name: activeTemplate.name,
        description: activeTemplate.description ?? null,
        shapes,
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        backgroundImage: safeBackground,
        logoPlacement: logoPlacement ?? null,
        thumbnail_url:url
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

  console.log("active template", activeTemplate)

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between p-4 max-w-full mx-auto">
          <div className="min-w-0">
            <h1 className="text-2xl font-serif font-bold text-foreground">
              Campaign Designer Pro
            </h1>
            <p className="text-xs text-muted-foreground">
              Professional design tools - Fixed drag, text visibility & image upload
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={resetToNewTemplate} className="bg-transparent">
              <RefreshCcw className="w-4 h-4 mr-2" />
              New Template
            </Button>

            <Button
              onClick={handleExportPNG}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PNG
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 p-4 max-w-full mx-auto">
        <div className="w-80 shrink-0 flex-none flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-100px)]">
          <Tabs defaultValue="design" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="design" className="text-xs">
                Design
              </TabsTrigger>
              <TabsTrigger value="data" className="text-xs">
                Content
              </TabsTrigger>
              <TabsTrigger value="templates" className="text-xs">
                Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="design" className="space-y-4">
              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Editor Controls</h3>
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

                  <div className="text-[10px] text-muted-foreground pt-1">
                    ✅ Fixed: Smooth drag, visible text, image upload dialog
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Background</h3>
                <ImageUploader
                  onImageSelect={(val: any) => {
                    if (isString(val)) setBackgroundImage(val);
                    else setErr("Background must be a URL or data URL string.");
                  }}
                  currentImage={safeBackground}
                />
              </Card>

              <LogoEditor logo={logoPlacement} onLogoChange={setLogoPlacement} />
              
              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Premium Components</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("offer")}>Offer/Discount</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("hero")}>Hero Product</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("skincare")}>Skincare Split</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("boldBrand")}>Bold Brand</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("flashSale")}>Flash Sale</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("testimonial")}>Testimonial</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("editorial")}>Editorial Blog</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("luxuryDark")}>Luxury Dark</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("splitColor")}>Split Color</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("instagramStory")}>IG Story</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("communityEvent")}>Community Event</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("albumCover")}>Album Cover</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("boldStatement")}>Bold Statement</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("fullBleedHero")}>Full Bleed Hero</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("massiveTypography")}>Massive Type</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("comparison")}>Old vs New</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("collageGrid")}>Collage Grid</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("singleHeroPhoto")}>Hero Photo</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("splitPhotoContent")}>Split Photo</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("magazinePhotoGrid")}>Magazine Grid</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("thoughtLeader")}>Thought Leader</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("lifestyleShowcase")}>Lifestyle Showcase</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("darkEditorial")}>Dark Editorial</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("lifestyleHero")}>Lifestyle Hero</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("productAbstract")}>Product Abstract</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("saasAd")}>SaaS Ad</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent("characterDashboard")}>3D Character</Button>
                </div>
              </Card>

              <Card className="p-4 border-border space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">✨ Clipdrop AI Templates</h3>
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    Uses AI Credits
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  These templates use Clipdrop to remove or replace image backgrounds automatically.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="text-xs border-purple-300 text-purple-700" onClick={() => insertPremiumComponent("cdProductFloat")}>
                    ✨ Product Float
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs border-purple-300 text-purple-700" onClick={() => insertPremiumComponent("cdStatsShowcase")}>
                    ✨ Stats Showcase
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs border-purple-300 text-purple-700" onClick={() => insertPremiumComponent("cdBrandVs")}>
                    ✨ Brand vs
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs border-purple-300 text-purple-700" onClick={() => insertPremiumComponent("cdPersonHero")}>
                    ✨ Person Hero
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs border-purple-300 text-purple-700 col-span-2" onClick={() => insertPremiumComponent("cdLifestyleScene")}>
                    ✨ Lifestyle Scene
                  </Button>
                </div>
              </Card>

              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Add Shape</h3>
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
                  <Button
                    onClick={() => handleAddShape("line")}
                    variant="outline"
                    size="sm"
                    className="text-xs col-span-2"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Line
                  </Button>
                </div>
              </Card>

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

              {selectedShapeId && (
                <PropertyInspector
                  shape={shapes.find((s) => s.id === selectedShapeId)!}
                  campaignData={campaignData}
                  onUpdate={handleUpdateShape}
                />
              )}
            </TabsContent>

            <TabsContent value="data" className="space-y-4">
              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Campaign Content</h3>
                <CampaignDataForm data={campaignData} onChange={setCampaignData} />
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <Card className="p-4 border-border space-y-3">
                <div className="text-sm font-semibold text-foreground">
                  {isEditingExisting ? "Editing existing template" : "New template"}
                </div>

                {isEditingExisting ? (
                  <Button onClick={doUpdate} disabled={saving} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Updating..." : "Update Template"}
                  </Button>
                ) : (
                  <Button onClick={openSaveDialog} disabled={saving} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </Button>
                )}
                <Button onClick={handleGeneratePremiumTemplate} className="bg-foreground text-background hover:bg-foreground/90 w-full">
                  Generate Premium Template
                </Button>

                {activeTemplate?.id && (
                  <div className="text-[11px] text-muted-foreground break-all">
                    Active Template ID: <span className="font-mono">{activeTemplate.id}</span>
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

        <div className="flex-1 min-w-0 flex flex-col gap-4">

          <Card className="flex-1 border-border bg-card p-4">
            <div className="w-full h-[70vh] bg-white rounded border border-border overflow-auto">
            {/* Give a real scroll content box */}
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

          <Card className="p-3 border-border">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Canvas: {CANVAS_WIDTH} × {CANVAS_HEIGHT}px</span>
              <span>{shapes.length} shape{shapes.length !== 1 ? "s" : ""}</span>
              <span>
                {selectedShapeIds.length > 0
                  ? `${selectedShapeIds.length} selected`
                  : selectedShapeId
                  ? "1 selected"
                  : "None selected"}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* ✅ IMAGE UPLOAD DIALOG */}
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
            <Button variant="outline" onClick={() => {
              setImageUploadOpen(false);
              setImageUrl("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleImageUpload} disabled={!imageUrl.trim()}>
              <Upload className="w-4 h-4 mr-2" />
              Add Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={saveOpen} onOpenChange={(o) => !saving && setSaveOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save template</DialogTitle>
            <DialogDescription>Name + description</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Name</div>
              <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Description</div>
              <Input value={saveDesc} onChange={(e) => setSaveDesc(e.target.value)} placeholder="Optional" />
            </div>

            {err && <div className="text-xs text-red-600">{err}</div>}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => { if (saving) return; setSaveOpen(false); }}>
              Cancel
            </Button>
            <Button onClick={doCreate} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}