"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TemplateShape, CampaignData } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, RotateCw } from "lucide-react";

// ✅ FIXED: Proper font options
const FONT_OPTIONS = [
  // Sans-serif / UI
  { label: "Arial", value: "Arial" },
  { label: "Arial Black", value: "Arial Black" },
  { label: "Verdana", value: "Verdana" },
  { label: "Tahoma", value: "Tahoma" },
  { label: "Trebuchet MS", value: "Trebuchet MS" },
  { label: "Helvetica", value: "Helvetica" },
  { label: "Calibri", value: "Calibri" },
  { label: "Gill Sans", value: "Gill Sans" },
  { label: "Century Gothic", value: "Century Gothic" },
  { label: "Futura", value: "Futura" },
  // Serif / Editorial / Blog
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Georgia", value: "Georgia" },
  { label: "Palatino", value: "Palatino" },
  { label: "Garamond", value: "Garamond" },
  { label: "Book Antiqua", value: "Book Antiqua" },
  { label: "Baskerville", value: "Baskerville" },
  // Display / Marketing / Impact
  { label: "Impact", value: "Impact" },
  { label: "Oswald", value: "Oswald" },
  { label: "Anton", value: "Anton" },
  { label: "Bebas Neue", value: "Bebas Neue" },
  { label: "Rajdhani", value: "Rajdhani" },
  { label: "Barlow Condensed", value: "Barlow Condensed" },
  { label: "Black Han Sans", value: "Black Han Sans" },
  // E-commerce / Modern
  { label: "Montserrat", value: "Montserrat" },
  { label: "Poppins", value: "Poppins" },
  { label: "Lato", value: "Lato" },
  { label: "Nunito", value: "Nunito" },
  { label: "Raleway", value: "Raleway" },
  { label: "Open Sans", value: "Open Sans" },
  { label: "Roboto", value: "Roboto" },
  { label: "Inter", value: "Inter" },
  { label: "DM Sans", value: "DM Sans" },
  { label: "Outfit", value: "Outfit" },
  // Elegant / Luxury
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Cormorant Garamond", value: "Cormorant Garamond" },
  { label: "Libre Baskerville", value: "Libre Baskerville" },
  { label: "EB Garamond", value: "EB Garamond" },
  { label: "Cinzel", value: "Cinzel" },
  // Friendly / Creative
  { label: "Nunito Sans", value: "Nunito Sans" },
  { label: "Quicksand", value: "Quicksand" },
  { label: "Comic Sans MS", value: "Comic Sans MS" },
  { label: "Pacifico", value: "Pacifico" },
  { label: "Lobster", value: "Lobster" },
  // Monospace
  { label: "Courier New", value: "Courier New" },
  { label: "Inconsolata", value: "Inconsolata" },
];

interface PropertyInspectorProps {
  shape: TemplateShape;
  campaignData: CampaignData;
  onUpdate: (shape: TemplateShape) => void;
}

export default function PropertyInspector({
  shape,
  campaignData,
  onUpdate,
}: PropertyInspectorProps) {
  if (!shape) return null;

  const isText = shape.type === "text";
  const isButton = shape.type === "button";
  const isBulletGroup = shape.type === "bullet-group";
  const isImage = shape.type === "image";
  const isLine = shape.type === "line";

  const hasGeometryFill =
    shape.type === "rectangle" ||
    shape.type === "rounded-rect" ||
    shape.type === "circle" ||
    shape.type === "triangle" ||
    shape.type === "button" ||
    shape.type === "image";

  const hasBorderControls = hasGeometryFill || isLine;

  const handleChange = (updates: Partial<TemplateShape>) => {
    onUpdate({ ...shape, ...updates });
  };

  const dashMode = (() => {
    const d = (shape as any).lineDash;
    return Array.isArray(d) && d.length ? "dashed" : "solid";
  })();

  return (
    <Card className="p-4 border-border">
      <h3 className="text-sm font-semibold text-foreground mb-3">Properties</h3>

      <div className="space-y-3">
        {/* Position & Size */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">X</Label>
            <Input
              type="number"
              value={Math.round(shape.x)}
              onChange={(e) => handleChange({ x: parseFloat(e.target.value) })}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Y</Label>
            <Input
              type="number"
              value={Math.round(shape.y)}
              onChange={(e) => handleChange({ y: parseFloat(e.target.value) })}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Width</Label>
            <Input
              type="number"
              value={Math.round(shape.width)}
              onChange={(e) => handleChange({ width: parseFloat(e.target.value) })}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Height</Label>
            <Input
              type="number"
              value={Math.round(shape.height)}
              onChange={(e) => handleChange({ height: parseFloat(e.target.value) })}
              className="h-7 text-xs"
            />
          </div>
        </div>

        {/* ✅ NEW: ROTATION (for all shapes) */}
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <RotateCw className="w-3 h-3" />
            Rotation: {shape.rotation || 0}°
          </Label>
          <Slider
            value={[shape.rotation || 0]}
            onValueChange={([v]) => handleChange({ rotation: v })}
            min={0}
            max={360}
            step={1}
            className="py-2"
          />
          <div className="flex gap-1">
            <button
              onClick={() => handleChange({ rotation: 0 })}
              className="text-[10px] px-2 py-0.5 border rounded hover:bg-gray-50"
            >
              0°
            </button>
            <button
              onClick={() => handleChange({ rotation: 45 })}
              className="text-[10px] px-2 py-0.5 border rounded hover:bg-gray-50"
            >
              45°
            </button>
            <button
              onClick={() => handleChange({ rotation: 90 })}
              className="text-[10px] px-2 py-0.5 border rounded hover:bg-gray-50"
            >
              90°
            </button>
            <button
              onClick={() => handleChange({ rotation: 180 })}
              className="text-[10px] px-2 py-0.5 border rounded hover:bg-gray-50"
            >
              180°
            </button>
            <button
              onClick={() => handleChange({ rotation: 270 })}
              className="text-[10px] px-2 py-0.5 border rounded hover:bg-gray-50"
            >
              270°
            </button>
          </div>
        </div>

        <Separator />

        {/* LINE-SPECIFIC */}
        {isLine && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Line Thickness</Label>
              <Input
                type="number"
                value={(shape as any).lineWidth ?? 6}
                onChange={(e) => handleChange({ lineWidth: parseInt(e.target.value || "0", 10) } as any)}
                className="h-7 text-xs"
                min={1}
                max={80}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Line Style</Label>
              <Select
                value={dashMode}
                onValueChange={(v) =>
                  handleChange({
                    lineDash: v === "dashed" ? [12, 10] : [],
                  } as any)
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Line Cap</Label>
              <Select
                value={(shape as any).lineCap ?? "round"}
                onValueChange={(v) => handleChange({ lineCap: v } as any)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round">Round</SelectItem>
                  <SelectItem value="butt">Butt</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />
          </>
        )}

        {/* BUTTON-SPECIFIC */}
        {isButton && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Button Text</Label>
              <Input
                value={(shape as any).buttonText || ""}
                onChange={(e) => handleChange({ buttonText: e.target.value } as any)}
                className="h-7 text-xs"
                placeholder="Click Here"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Button Link (URL)
              </Label>
              <Input
                value={(shape as any).buttonLink || ""}
                onChange={(e) => handleChange({ buttonLink: e.target.value } as any)}
                className="h-7 text-xs"
                placeholder="https://example.com"
              />
            </div>

            <Separator />
          </>
        )}

        {/* Text/Button/Bullets Font Properties */}
        {(isText || isButton || isBulletGroup) && (
          <>
            {/* ✅ FIXED: Font Family dropdown with simple values */}
            <div className="space-y-1">
              <Label className="text-xs">Font Family</Label>
              <Select
                value={shape.fontFamily || "Arial"}
                onValueChange={(v) => handleChange({ fontFamily: v })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Font Size</Label>
              <Input
                type="number"
                value={shape.fontSize || 16}
                onChange={(e) => handleChange({ fontSize: parseInt(e.target.value) })}
                className="h-7 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Text Transform</Label>
              <Select
                value={(shape as any).textTransform || "none"}
                onValueChange={(v) => handleChange({ textTransform: v } as any)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (as typed)</SelectItem>
                  <SelectItem value="uppercase">UPPERCASE</SelectItem>
                  <SelectItem value="lowercase">lowercase</SelectItem>
                  <SelectItem value="capitalize">Capitalize Each Word</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Text Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={shape.textColor || "#000000"}
                  onChange={(e) => handleChange({ textColor: e.target.value })}
                  className="h-7 w-12 p-1"
                />
                <Input
                  value={shape.textColor || "#000000"}
                  onChange={(e) => handleChange({ textColor: e.target.value })}
                  className="h-7 text-xs flex-1"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Font Weight</Label>
              <Select
                value={String(shape.fontWeight || 400)}
                onValueChange={(v) => handleChange({ fontWeight: parseInt(v) })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">Light (300)</SelectItem>
                  <SelectItem value="400">Regular (400)</SelectItem>
                  <SelectItem value="600">Semibold (600)</SelectItem>
                  <SelectItem value="700">Bold (700)</SelectItem>
                  <SelectItem value="900">Black (900)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isBulletGroup && (
              <div className="space-y-1">
                <Label className="text-xs">Text Align</Label>
                <Select
                  value={shape.textAlign || "left"}
                  onValueChange={(v: any) => handleChange({ textAlign: v })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />
          </>
        )}

        {/* ✅ NEW: Data Source OR Custom Text (for text shapes) */}
        {isText && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Text Mode</Label>
              <Select
                value={shape.dataField ? "dynamic" : "custom"}
                onValueChange={(v) => {
                  if (v === "custom") {
                    // Switch to custom text mode
                    handleChange({ 
                      dataField: undefined,
                      customText: shape.customText || "Enter your text"
                    });
                  } else {
                    // Switch to dynamic mode
                    handleChange({ 
                      dataField: "hook",
                      customText: undefined
                    });
                  }
                }}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dynamic">Dynamic (from campaign data)</SelectItem>
                  <SelectItem value="custom">Custom (fixed text)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show data source selector if dynamic */}
            {shape.dataField && (
              <div className="space-y-1">
                <Label className="text-xs">Data Source</Label>
                <Select
                  value={shape.dataField}
                  onValueChange={(v) => handleChange({ dataField: v })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hook">Hook</SelectItem>
                    <SelectItem value="subheading">Subheading</SelectItem>
                    <SelectItem value="proof">Proof</SelectItem>
                    <SelectItem value="cta">CTA</SelectItem>
                    <SelectItem value="hashtags">Hashtags</SelectItem>
                    <SelectItem value="companyName">Company Name</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Show custom text input if custom mode */}
            {!shape.dataField && (
              <div className="space-y-1">
                <Label className="text-xs">Custom Text</Label>
                <Textarea
                  value={shape.customText || ""}
                  onChange={(e) => handleChange({ customText: e.target.value })}
                  className="text-xs min-h-[60px]"
                  placeholder="Enter your text here..."
                />
              </div>
            )}

            <Separator />
          </>
        )}

        {/* Geometry Fill Colors */}
        {hasGeometryFill && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={shape.backgroundColor || "#ffffff"}
                  onChange={(e) => handleChange({ backgroundColor: e.target.value })}
                  className="h-7 w-12 p-1"
                />
                <Input
                  value={shape.backgroundColor || "#ffffff"}
                  onChange={(e) => handleChange({ backgroundColor: e.target.value })}
                  className="h-7 text-xs flex-1"
                />
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Border / Stroke Controls */}
        {hasBorderControls && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">{isLine ? "Line Color" : "Border Color"}</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={shape.borderColor || "#000000"}
                  onChange={(e) => handleChange({ borderColor: e.target.value })}
                  className="h-7 w-12 p-1"
                />
                <Input
                  value={shape.borderColor || "#000000"}
                  onChange={(e) => handleChange({ borderColor: e.target.value })}
                  className="h-7 text-xs flex-1"
                />
              </div>
            </div>

            {!isLine && (
              <div className="space-y-1">
                <Label className="text-xs">Border Width</Label>
                <Input
                  type="number"
                  value={shape.borderWidth || 0}
                  onChange={(e) => handleChange({ borderWidth: parseInt(e.target.value) })}
                  className="h-7 text-xs"
                />
              </div>
            )}

            {(shape.type === "rounded-rect" || isButton) && (
              <div className="space-y-1">
                <Label className="text-xs">Border Radius</Label>
                <Input
                  type="number"
                  value={shape.borderRadius || 8}
                  onChange={(e) => handleChange({ borderRadius: parseInt(e.target.value) })}
                  className="h-7 text-xs"
                />
              </div>
            )}

            <Separator />
          </>
        )}

        {/* Image Properties */}
        {isImage && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Image URL</Label>
              <Input
                value={(shape as any).src || ""}
                onChange={(e) => handleChange({ src: e.target.value } as any)}
                className="h-7 text-xs"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Fit Mode</Label>
              <Select
                value={(shape as any).fit || "cover"}
                onValueChange={(v: any) => handleChange({ fit: v })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover (fill)</SelectItem>
                  <SelectItem value="contain">Contain (fit)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Corner Radius</Label>
              <Input
                type="number"
                value={(shape as any).radius || 0}
                onChange={(e) => handleChange({ radius: parseInt(e.target.value) } as any)}
                className="h-7 text-xs"
              />
            </div>

            <Separator />
          </>
        )}

        {/* Opacity */}
        <div className="space-y-1">
          <Label className="text-xs">Opacity: {Math.round((shape.opacity || 1) * 100)}%</Label>
          <Slider
            value={[(shape.opacity || 1) * 100]}
            onValueChange={([v]) => handleChange({ opacity: v / 100 })}
            min={0}
            max={100}
            step={5}
            className="py-2"
          />
        </div>

        {/* Shadow */}
        <Separator />
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Shadow</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Blur</Label>
              <Input
                type="number"
                value={shape.shadowBlur || 0}
                onChange={(e) => handleChange({ shadowBlur: parseInt(e.target.value) })}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Color</Label>
              <Input
                type="color"
                value={shape.shadowColor || "#000000"}
                onChange={(e) => handleChange({ shadowColor: e.target.value })}
                className="h-7 w-full p-1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Offset X</Label>
              <Input
                type="number"
                value={shape.shadowX || 0}
                onChange={(e) => handleChange({ shadowX: parseInt(e.target.value) })}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Offset Y</Label>
              <Input
                type="number"
                value={shape.shadowY || 0}
                onChange={(e) => handleChange({ shadowY: parseInt(e.target.value) })}
                className="h-7 text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}