"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import TeleprompterModal, { RecordedClip } from "@/components/TeleprompterModal";
import type { VoiceoverScript } from "@/lib/generate-voiceover-script";
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
  Download, Plus, RefreshCcw, Save,
  Grid3x3, Magnet, MousePointer2, Upload, Video,
} from "lucide-react";
import { alignShapes, distributeShapes, reorderShape } from "@/lib/alignment-utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createTemplate, updateTemplate } from "@/lib/template-storage";
import { uploadFileToSpaces } from "@/lib/upload-client";
import { DEFAULT_CAMPAIGN_DATA } from "@/lib/campaign-context";

const CANVAS_WIDTH  = 1080;
const CANVAS_HEIGHT = 1350;

function isString(x: any): x is string { return typeof x === "string"; }
function ensureBgString(bg: any): string | null {
  if (!bg) return null;
  if (typeof bg === "string") return bg;
  return null;
}

const PREMIUM_COMPONENTS: { key: PremiumComponentKey; label: string }[] = [
  { key: "characterDashboard", label: "3D Character"       },
];

export default function EditorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTemplate,    setActiveTemplate]    = useState<Template | null>(null);
  const [backgroundImage,   setBackgroundImage]   = useState<string | null>(null);
  const [campaignData,      setCampaignData]      = useState<CampaignData>(DEFAULT_CAMPAIGN_DATA);
  const [shapes,            setShapes]            = useState<TemplateShape[]>([]);
  const [selectedShapeId,   setSelectedShapeId]   = useState<string | null>(null);
  const [selectedShapeIds,  setSelectedShapeIds]  = useState<string[]>([]);
  const [logoPlacement,     setLogoPlacement]     = useState<{ url: string; x: number; y: number; width: number; height: number; opacity: number } | undefined>(undefined);

  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [pendingScript,    setPendingScript]    = useState<VoiceoverScript | null>(null);
  const [showGrid,         setShowGrid]         = useState(false);
  const [snapToGrid,       setSnapToGrid]       = useState(false);
  const [snapToObjects,    setSnapToObjects]    = useState(true);
  const [zoom,             setZoom]             = useState(1);
  const [pan,              setPan]              = useState({ x: 0, y: 0 });

  const [imageUploadOpen,      setImageUploadOpen]      = useState(false);
  const [pendingImageShapeId,  setPendingImageShapeId]  = useState<string | null>(null);
  const [imageUrl,             setImageUrl]             = useState("");

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState<string | null>(null);

  const [renderingVideo, setRenderingVideo] = useState(false);
  const [videoUrl,       setVideoUrl]       = useState<string | null>(null);

  const safeBackground    = useMemo(() => ensureBgString(backgroundImage), [backgroundImage]);
  const isEditingExisting = !!activeTemplate?.id;

  const fitCanvas = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // ── Build body text from campaign data ────────────────────────────────────
  const buildBodyText = () =>
    [campaignData.hook, campaignData.subheading, ...(campaignData.bullets || []), campaignData.proof, campaignData.cta]
      .filter(Boolean).join("\n");

  // ── STEP 1: Generate script once → store → open teleprompter ─────────────
  // Script is generated ONCE here. The same object is sent to render-video later.
  // This guarantees the user records to exactly what gets rendered.
  const handleRenderVideo = async () => {
    setRenderingVideo(true);
    setVideoUrl(null);
    setErr(null);

    try {
      const res = await fetch("/api/generate-script", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body_text:   buildBodyText(),
          companyName: campaignData.companyName,
          accentColor: "#6366f1",
        }),
      });

      const { script, ok, error } = await res.json();
      if (!ok || !script) throw new Error(error || "Failed to generate script");

      console.log(`[page] Script: ${script.segments.length} segs | font="${script.styleDNA?.primaryFont}" tone="${script.styleDNA?.tone}"`);

      setPendingScript(script);
      setRenderingVideo(false);
      setShowTeleprompter(true);

    } catch (e: any) {
      setErr(e?.message || "Failed to generate script");
      setRenderingVideo(false);
    }
  };

  // ── STEP 2: Teleprompter done → upload clips → render ────────────────────
  //
  // AUDIO DESIGN — no AI voice when user recorded:
  //   clip.isWebcam = true  → video+audio blob  → used as webcam scene video AND voice
  //   clip.isWebcam = false → audio-only blob   → used under template animation for that scene
  //
  // render-video route receives both arrays and uses them directly.
  // voiceUrl (ElevenLabs) is only generated if clips array is empty (user skipped).
  const handleTeleprompterComplete = async (clips: RecordedClip[]) => {
    setShowTeleprompter(false);
    setRenderingVideo(true);
    setErr(null);

    try {
      // Upload every clip — webcam clips as video/webm, b-roll clips as audio/webm
      const uploadedClips = await Promise.all(
        clips.map(async (clip) => {
          const ext  = clip.blob.type.includes("mp4") ? "mp4" : "webm";
          const name = `${clip.isWebcam ? "webcam" : "broll-audio"}-${clip.segmentIndex}-${Date.now()}.${ext}`;
          const file = new File([clip.blob], name, {
            type: clip.blob.type || (clip.isWebcam ? "video/webm" : "audio/webm"),
          });
          const url = await uploadFileToSpaces(file);
          console.log(`[page] Uploaded clip ${clip.segmentIndex} (${clip.isWebcam ? "webcam" : "broll-audio"}): ${clip.durationSeconds.toFixed(2)}s → ${url}`);
          return {
            segmentIndex:    clip.segmentIndex,
            url,
            durationSeconds: clip.durationSeconds,
            hasAudio:        clip.hasAudio,   // always true
            isWebcam:        clip.isWebcam,   // render route uses this to split webcam vs broll
          };
        })
      );

      const res = await fetch("/api/render-video", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body_text:          buildBodyText(),
          companyName:        campaignData.companyName,
          accentColor:        "#6366f1",
          webcamClips:        uploadedClips,   // contains both webcam + broll audio clips
          preGeneratedScript: pendingScript,   // exact same script user recorded to
          useVeo3:            true,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setVideoUrl(data.url);
        console.log(`[page] ✅ Video ready (${data.meta?.voiceMode}):`, data.url);
      } else {
        setErr(data.error || "Render failed");
      }
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setRenderingVideo(false);
    }
  };

  // ── STEP 3: User skipped teleprompter → render with AI voice only ─────────
  // Passes empty clips array → render route sees hasAnyUserVoice = false
  // → uses ElevenLabs for full continuous voiceover track
  const handleTeleprompterSkip = async () => {
    setShowTeleprompter(false);
    await handleTeleprompterComplete([]);
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
        if (selectedShapeId || selectedShapeIds.length > 0) { e.preventDefault(); handleDeleteSelected(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); handleDuplicateSelected(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") { e.preventDefault(); setSelectedShapeIds(shapes.map((s) => s.id)); setSelectedShapeId(null); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shapes, selectedShapeId, selectedShapeIds]);

  const resetToNewTemplate = () => {
    setErr(null); setActiveTemplate(null); setBackgroundImage(null); setShapes([]);
    setSelectedShapeId(null); setSelectedShapeIds([]); setLogoPlacement(undefined);
    setSaveName(""); setSaveDesc(""); setVideoUrl(null);
  };

  const handleSelectTemplate = (t: Template) => {
    setActiveTemplate(t); setShapes(t.shapes || []); setBackgroundImage(t.backgroundImage || null);
    setLogoPlacement(t.logoPlacement); setSelectedShapeId(null); setSelectedShapeIds([]);
  };

  const handleAddShape = (type: TemplateShape["type"]) => {
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    let width = 260, height = 90, x = cx - 130, y = cy - 45, textColor = "#000000";

    if (type === "circle")       { width = 150; height = 150; x = cx - 75; y = cy - 75; }
    else if (type === "text")    { width = 400; height = 100; x = cx - 200; y = 100; textColor = "#ffffff"; }
    else if (type === "button")  { width = 200; height = 50;  x = cx - 100; y = cy - 25; textColor = "#ffffff"; }
    else if (type === "image") {
      const id = `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setShapes((prev) => [...prev, { id, type: "image", x: cx - 130, y: cy - 130, width: 260, height: 260, zIndex: shapes.length + 1, opacity: 1, backgroundColor: "#f0f0f0", borderColor: "transparent", borderWidth: 0, src: undefined, fit: "cover", radius: 8, shadowBlur: 0, shadowX: 0, shadowY: 0, shadowColor: "#000000" } as any]);
      setSelectedShapeId(id); setPendingImageShapeId(id); setImageUploadOpen(true); return;
    }

    const newShape: TemplateShape = {
      id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type, x, y, width, height, zIndex: shapes.length + 1, opacity: 1,
      backgroundColor: type === "text" ? undefined : type === "button" ? "#3b82f6" : "#ffffff",
      borderColor: "#000000", borderWidth: type === "text" ? 0 : 1,
      borderRadius: type === "rounded-rect" ? 8 : type === "button" ? 6 : undefined,
      textColor, fontSize: type === "button" ? 16 : type === "text" ? 32 : 24,
      fontFamily: "Arial", fontWeight: type === "button" ? 600 : type === "text" ? 700 : 400,
      textAlign: type === "button" ? "center" : type === "text" ? "center" : "left",
      padding: 10, dataField: type === "text" ? "hook" : undefined,
      direction: type === "triangle" ? "up" : undefined,
      buttonText: type === "button" ? "Click Here" : undefined,
      buttonLink: type === "button" ? campaignData.ctaLink || "https://example.com" : undefined,
      hoverColor: type === "button" ? "#2563eb" : undefined,
      lineWidth: type === "line" ? 6 : undefined, lineDash: type === "line" ? [] : undefined,
      lineCap: type === "line" ? "round" : undefined,
      shadowBlur: 0, shadowX: 0, shadowY: 0, shadowColor: "#000000",
    };
    setShapes((prev) => [...prev, newShape]);
    setSelectedShapeId(newShape.id); setSelectedShapeIds([]);
  };

  const handleImageUpload = () => {
    if (!imageUrl.trim() || !pendingImageShapeId) return;
    setShapes((prev) => prev.map((s) => s.id === pendingImageShapeId ? { ...s, src: imageUrl.trim() } : s));
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

  const insertPremiumComponent = async (key: PremiumComponentKey) => {
    const newShapes      = getPremiumComponent(key, CANVAS_WIDTH, CANVAS_HEIGHT);
    const resolvedShapes = await resolveTemplateImages(newShapes, campaignData);
    setShapes((prev) => {
      const maxZ = prev.reduce((m, s) => Math.max(m, s.zIndex || 1), 1);
      return [...prev, ...resolvedShapes.map((s, i) => ({ ...s, zIndex: maxZ + i + 1 }))];
    });
    setSelectedShapeId(null); setSelectedShapeIds([]);
  };

  const handleSelectShape   = (id: string, multi = false) => {
    if (!id) { setSelectedShapeId(null); setSelectedShapeIds([]); return; }
    if (multi) { setSelectedShapeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]); setSelectedShapeId(null); }
    else { setSelectedShapeId(id); setSelectedShapeIds([]); }
  };
  const handleUpdateShape   = (shape: TemplateShape) => setShapes((prev) => prev.map((s) => s.id === shape.id ? shape : s));
  const handleShapeDrag     = (id: string, x: number, y: number) => { const s = shapes.find((s) => s.id === id); if (s) handleUpdateShape({ ...s, x, y }); };
  const handleShapeResize   = (id: string, w: number, h: number) => { const s = shapes.find((s) => s.id === id); if (s) handleUpdateShape({ ...s, width: w, height: h }); };
  const handleDeleteSelected = () => {
    if (selectedShapeId) { setShapes((p) => p.filter((s) => s.id !== selectedShapeId)); setSelectedShapeId(null); }
    if (selectedShapeIds.length) { setShapes((p) => p.filter((s) => !selectedShapeIds.includes(s.id))); setSelectedShapeIds([]); }
  };
  const handleDuplicateSelected = () => {
    const ids = selectedShapeIds.length > 0 ? selectedShapeIds : selectedShapeId ? [selectedShapeId] : [];
    if (!ids.length) return;
    const dups: TemplateShape[] = [];
    ids.forEach((id) => { const s = shapes.find((x) => x.id === id); if (s) dups.push({ ...s, id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, x: s.x + 12, y: s.y + 12, zIndex: (s.zIndex || 1) + 1 }); });
    setShapes((p) => [...p, ...dups]);
  };
  const handleAlign      = (alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom") => {
    const ids = selectedShapeIds.length > 0 ? selectedShapeIds : selectedShapeId ? [selectedShapeId] : [];
    if (ids.length < 2) return; setShapes(alignShapes(shapes, ids, alignment));
  };
  const handleDistribute = (dir: "horizontal" | "vertical") => {
    const ids = selectedShapeIds.length > 0 ? selectedShapeIds : selectedShapeId ? [selectedShapeId] : [];
    if (ids.length < 3) return; setShapes(distributeShapes(shapes, ids, dir));
  };
  const handleReorder    = (action: "front" | "forward" | "backward" | "back") => {
    if (!selectedShapeId) return; setShapes(reorderShape(shapes, selectedShapeId, action));
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `campaign-${Date.now()}.png`; link.click();
  };

  const fileBaseName = useMemo(() => {
    return `${campaignData?.companyName || "campaign"}-${new Date().toISOString().split("T")[0]}`;
  }, [campaignData?.companyName]);

  const canvasToFile = async (canvas: HTMLCanvasElement, filename: string): Promise<File> => {
    fitCanvas();
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => b ? res(b) : rej(new Error("Canvas export failed")), "image/png", 1.0));
    return new File([blob], filename, { type: "image/png" });
  };

  const applyTemplateToEditor = (t: Template) => {
    setErr(null); setActiveTemplate(t); setBackgroundImage(ensureBgString((t as any).backgroundImage));
    setShapes(Array.isArray(t.shapes) ? t.shapes : []); setLogoPlacement(t.logoPlacement);
    setSelectedShapeId(null); setSelectedShapeIds([]); setSaveName(t.name || ""); setSaveDesc(t.description || "");
  };

  const openSaveDialog = () => { setErr(null); setSaveName(activeTemplate?.name || "New Template"); setSaveDesc(activeTemplate?.description || ""); setSaveOpen(true); };

  const doCreate = async () => {
    setErr(null); const name = saveName.trim(); if (!name) { setErr("Name required"); return; }
    setSaving(true); fitCanvas();
    try {
      const file = await canvasToFile(canvasRef.current!, `${fileBaseName}.png`);
      const url  = await uploadFileToSpaces(file);
      const res  = await createTemplate({ name, description: saveDesc.trim() || null, shapes, canvasWidth: CANVAS_WIDTH, canvasHeight: CANVAS_HEIGHT, backgroundImage: safeBackground, logoPlacement: logoPlacement ?? null, thumbnail_url: url } as any);
      if (!res?.ok) throw new Error("Failed to create template");
      setActiveTemplate({ id: res.id, name, description: saveDesc.trim() || undefined, shapes, canvasWidth: CANVAS_WIDTH, canvasHeight: CANVAS_HEIGHT, backgroundImage: safeBackground, logoPlacement, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      setSaveOpen(false);
    } catch (e: any) { setErr(e?.message || "Failed"); } finally { setSaving(false); }
  };

  const doUpdate = async () => {
    if (!activeTemplate?.id) return; setErr(null); setSaving(true);
    try {
      const file = await canvasToFile(canvasRef.current!, `${fileBaseName}.png`);
      const url  = await uploadFileToSpaces(file);
      const res  = await updateTemplate(activeTemplate.id, { name: activeTemplate.name, description: activeTemplate.description ?? null, shapes, canvasWidth: CANVAS_WIDTH, canvasHeight: CANVAS_HEIGHT, backgroundImage: safeBackground, logoPlacement: logoPlacement ?? null, thumbnail_url: url } as any);
      if (!res?.ok) throw new Error("Failed to update template");
      setActiveTemplate((prev) => prev ? { ...prev, shapes, backgroundImage: safeBackground, logoPlacement, updatedAt: new Date().toISOString() } : prev);
    } catch (e: any) { setErr(e?.message || "Failed"); } finally { setSaving(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background">

      {/* Teleprompter modal — rendered at root level */}
      {showTeleprompter && pendingScript && (
        <TeleprompterModal
          segments={pendingScript.segments}
          companyName={pendingScript.companyName}
          accentColor="#6366f1"
          onComplete={handleTeleprompterComplete}
          onSkip={handleTeleprompterSkip}
          onClose={() => {
            setShowTeleprompter(false);
            setRenderingVideo(false);
          }}
        />
      )}

      {/* TOP NAV */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between p-4 max-w-full mx-auto">
          <div className="min-w-0">
            <h1 className="text-2xl font-serif font-bold text-foreground">Campaign Designer Pro</h1>
            <p className="text-xs text-muted-foreground">Professional design tools — drag, resize, export PNG &amp; MP4</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={resetToNewTemplate} className="bg-transparent">
              <RefreshCcw className="w-4 h-4 mr-2" />New
            </Button>
            <Button onClick={handleExportPNG} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Download className="w-4 h-4 mr-2" />Export PNG
            </Button>
            <Button
              onClick={handleRenderVideo}
              disabled={renderingVideo}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {renderingVideo
                ? <><RefreshCcw className="w-4 h-4 mr-2 animate-spin" />Rendering…</>
                : <><Video className="w-4 h-4 mr-2" />Export Video</>}
            </Button>
            {videoUrl && (
              <a href={videoUrl} download target="_blank" rel="noopener noreferrer">
                <Button variant="outline"><Download className="w-4 h-4 mr-2" />Download MP4</Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {err && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700 flex items-center justify-between">
          {err}
          <button onClick={() => setErr(null)} className="ml-4 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Video ready banner */}
      {videoUrl && (
        <div className="bg-violet-50 border-b border-violet-200 px-4 py-2 text-sm text-violet-700 flex items-center justify-between">
          ✅ Video ready —{" "}
          <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="underline ml-1">Open MP4</a>
          <button onClick={() => setVideoUrl(null)} className="ml-4 text-violet-400 hover:text-violet-600">✕</button>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="flex gap-4 p-4 max-w-full mx-auto">

        {/* LEFT PANEL */}
        <div className="w-80 shrink-0 flex-none flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-100px)]">
          <Tabs defaultValue="design" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="design"    className="text-xs">Design</TabsTrigger>
              <TabsTrigger value="data"      className="text-xs">Content</TabsTrigger>
              <TabsTrigger value="templates" className="text-xs">Templates</TabsTrigger>
            </TabsList>

            {/* DESIGN TAB */}
            <TabsContent value="design" className="space-y-4">
              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Editor Controls</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-grid" className="text-xs flex items-center gap-2"><Grid3x3 className="w-3.5 h-3.5" />Show Grid</Label>
                    <Switch id="show-grid" checked={showGrid} onCheckedChange={setShowGrid} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="snap-objects" className="text-xs flex items-center gap-2"><Magnet className="w-3.5 h-3.5" />Snap to Objects</Label>
                    <Switch id="snap-objects" checked={snapToObjects} onCheckedChange={setSnapToObjects} />
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Background</h3>
                <ImageUploader
                  onImageSelect={(val: any) => {
                    if (isString(val)) setBackgroundImage(val);
                    else setErr("Background must be a URL string.");
                  }}
                  currentImage={safeBackground}
                />
              </Card>
              <LogoEditor logo={logoPlacement} onLogoChange={setLogoPlacement} />
              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Premium Components</h3>
                <div className="grid grid-cols-2 gap-2">
                  {PREMIUM_COMPONENTS.map(({ key, label }) => (
                    <Button key={key} variant="outline" size="sm" className="text-xs" onClick={() => insertPremiumComponent(key)}>
                      {label}
                    </Button>
                  ))}
                </div>
              </Card>
              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Add Shape</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(["text","rectangle","circle","rounded-rect","triangle"] as TemplateShape["type"][]).map((t) => (
                    <Button key={t} onClick={() => handleAddShape(t)} variant="outline" size="sm" className="text-xs">
                      <Plus className="w-3 h-3 mr-1" />{t}
                    </Button>
                  ))}
                  <Button onClick={() => handleAddShape("image")} variant="outline" size="sm" className="text-xs">
                    <Upload className="w-3 h-3 mr-1" />Image
                  </Button>
                  <Button onClick={() => handleAddShape("button")} variant="outline" size="sm" className="text-xs col-span-2">
                    <MousePointer2 className="w-3 h-3 mr-1" />Clickable Button
                  </Button>
                  <Button onClick={() => handleAddShape("bullet-group")} variant="outline" size="sm" className="text-xs col-span-2">
                    <Plus className="w-3 h-3 mr-1" />Bullet List
                  </Button>
                  <Button onClick={() => handleAddShape("line")} variant="outline" size="sm" className="text-xs col-span-2">
                    <Plus className="w-3 h-3 mr-1" />Line
                  </Button>
                </div>
              </Card>
              {(selectedShapeId || selectedShapeIds.length > 0) && (
                <AdvancedShapeTools
                  selectedShapeIds={selectedShapeIds.length > 0 ? selectedShapeIds : selectedShapeId ? [selectedShapeId] : []}
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

            {/* CONTENT TAB */}
            <TabsContent value="data" className="space-y-4">
              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Campaign Content</h3>
                <CampaignDataForm data={campaignData} onChange={setCampaignData} />
              </Card>
            </TabsContent>

            {/* TEMPLATES TAB */}
            <TabsContent value="templates" className="space-y-4">
              <Card className="p-4 border-border space-y-3">
                <div className="text-sm font-semibold text-foreground">
                  {isEditingExisting ? "Editing existing template" : "New template"}
                </div>
                {isEditingExisting ? (
                  <Button onClick={doUpdate} disabled={saving} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Save className="w-4 h-4 mr-2" />{saving ? "Updating…" : "Update Template"}
                  </Button>
                ) : (
                  <Button onClick={openSaveDialog} disabled={saving} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Save className="w-4 h-4 mr-2" />Save Template
                  </Button>
                )}
                <Button onClick={handleGeneratePremiumTemplate} className="bg-foreground text-background hover:bg-foreground/90 w-full">
                  Generate Premium Template
                </Button>
                {activeTemplate?.id && (
                  <div className="text-[11px] text-muted-foreground break-all">
                    Active ID: <span className="font-mono">{activeTemplate.id}</span>
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

        {/* CANVAS */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <Card className="flex-1 border-border bg-card p-4">
            <div className="w-full h-[70vh] bg-white rounded border border-border overflow-auto">
              <div className="min-w-max min-h-max p-3">
                <TemplateCanvas
                  ref={canvasRef}
                  shapes={shapes}
                  zoom={zoom} setZoom={setZoom}
                  pan={pan} setPan={setPan}
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
                  : selectedShapeId ? "1 selected" : "None selected"}
              </span>
              {videoUrl && <span className="text-violet-600 font-medium">✅ Video ready</span>}
            </div>
          </Card>
        </div>
      </div>

      {/* IMAGE UPLOAD DIALOG */}
      <Dialog open={imageUploadOpen} onOpenChange={setImageUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Image</DialogTitle>
            <DialogDescription>Choose a file or enter a URL</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Upload from computer</Label>
              <Input type="file" accept="image/*" onChange={handleImageFile} className="cursor-pointer" />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t" /><span className="text-xs text-muted-foreground">OR</span><div className="flex-1 border-t" />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" />
            </div>
            {imageUrl && (
              <div className="p-2 border rounded">
                <img src={imageUrl} alt="Preview" className="max-h-40 mx-auto" onError={() => setErr("Invalid image URL")} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImageUploadOpen(false); setImageUrl(""); }}>Cancel</Button>
            <Button onClick={handleImageUpload} disabled={!imageUrl.trim()}>
              <Upload className="w-4 h-4 mr-2" />Add Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SAVE TEMPLATE DIALOG */}
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
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { if (!saving) setSaveOpen(false); }}>Cancel</Button>
            <Button onClick={doCreate} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}