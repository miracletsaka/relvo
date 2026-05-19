"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TemplateShape, CampaignData } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ExternalLink, RotateCw, Type, Square, Image, Minus, AlignLeft, Layers, Sliders } from "lucide-react";

const FONT_OPTIONS = [
  { label: "Bebas Neue", value: "Bebas Neue" },
  { label: "Anton", value: "Anton" },
  { label: "Oswald", value: "Oswald" },
  { label: "Impact", value: "Impact" },
  { label: "Barlow Condensed", value: "Barlow Condensed" },
  { label: "Black Han Sans", value: "Black Han Sans" },
  { label: "Rajdhani", value: "Rajdhani" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Poppins", value: "Poppins" },
  { label: "Inter", value: "Inter" },
  { label: "DM Sans", value: "DM Sans" },
  { label: "Outfit", value: "Outfit" },
  { label: "Lato", value: "Lato" },
  { label: "Nunito", value: "Nunito" },
  { label: "Raleway", value: "Raleway" },
  { label: "Open Sans", value: "Open Sans" },
  { label: "Roboto", value: "Roboto" },
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
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Georgia", value: "Georgia" },
  { label: "Garamond", value: "Garamond" },
  { label: "Baskerville", value: "Baskerville" },
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Cormorant Garamond", value: "Cormorant Garamond" },
  { label: "Cinzel", value: "Cinzel" },
  { label: "Libre Baskerville", value: "Libre Baskerville" },
  { label: "EB Garamond", value: "EB Garamond" },
  { label: "Pacifico", value: "Pacifico" },
  { label: "Lobster", value: "Lobster" },
  { label: "Quicksand", value: "Quicksand" },
  { label: "Comic Sans MS", value: "Comic Sans MS" },
  { label: "Courier New", value: "Courier New" },
  { label: "Inconsolata", value: "Inconsolata" },
];

const TEXT_DATA_FIELD_GROUPS = [
  {
    group: "Campaign Copy",
    items: [
      ["headline", "Headline"],
      ["subheadline", "Subheadline"],
      ["description", "Description"],
      ["product_name", "Product / Service Name"],
      ["campaign_label", "Campaign Label"],
      ["collection_label", "Collection Label"],
      ["footer_label", "Footer Label"],
      ["proof", "Proof"],
      ["cta_text", "CTA Text"],
      ["cta", "CTA"],
      ["ctaLink", "CTA Link"],
      ["hashtags", "Hashtags"],
    ],
  },
  {
    group: "Offer",
    items: [
      ["offer_label", "Offer Label"],
      ["offer_value", "Offer Value"],
      ["offer_title", "Offer Title"],
      ["offer_description", "Offer Description"],
      ["price", "Price"],
      ["discount_label", "Discount Label"],
    ],
  },
  {
    group: "Features",
    items: [
      ["feature_1", "Feature 1"],
      ["feature_2", "Feature 2"],
      ["feature_3", "Feature 3"],
      ["feature_4", "Feature 4"],
    ],
  },
  {
    group: "Review",
    items: [
      ["review_text", "Review Text"],
      ["review_author", "Review Author"],
      ["review_rating", "Review Rating"],
    ],
  },
  {
    group: "Business",
    items: [
      ["companyName", "Company Name"],
      ["business_tagline", "Business Tagline"],
      ["business_description", "Business Description"],
      ["business_type", "Business Type"],
      ["business_size", "Business Size"],
      ["business_founded", "Business Founded"],
      ["business_website", "Business Website"],
      ["website", "Website"],
      ["phone", "Phone"],
      ["phone_primary", "Primary Phone"],
      ["phone_secondary", "Secondary Phone"],
      ["email", "Email"],
      ["email_primary", "Primary Email"],
      ["email_support", "Support Email"],
      ["whatsapp", "WhatsApp"],
      ["address", "Address"],
      ["business_address", "Business Address"],
      ["city", "City"],
      ["country", "Country"],
      ["fullAddress", "Full Address"],
      ["location", "Location"],
    ],
  },
  {
    group: "Contact Rows",
    items: [
      ["contact_row1", "Contact Row 1"],
      ["contact_row2", "Contact Row 2"],
    ],
  },
  {
    group: "Social",
    items: [
      ["social_handle", "Social Handle"],
      ["facebook_url", "Facebook URL"],
      ["instagram_url", "Instagram URL"],
      ["linkedin_url", "LinkedIn URL"],
      ["twitter_url", "Twitter URL"],
      ["tiktok_url", "TikTok URL"],
      ["youtube_url", "YouTube URL"],
      ["map_url", "Map URL"],
    ],
  },
  {
    group: "Links",
    items: [
      ["link_1_label", "Link 1 Label"],
      ["link_1_url", "Link 1 URL"],
      ["link_2_label", "Link 2 Label"],
      ["link_2_url", "Link 2 URL"],
    ],
  },
  {
    group: "Metadata",
    items: [
      ["meta_1_key", "Meta 1 Key"],
      ["meta_1_value", "Meta 1 Value"],
      ["meta_2_key", "Meta 2 Key"],
      ["meta_2_value", "Meta 2 Value"],
    ],
  },
] as const;

const IMAGE_ROLE_OPTIONS = [
  { value: "custom", label: "Custom", slotType: "image" },
  { value: "hero_person", label: "Hero Image", slotType: "image" },
  { value: "heroImage", label: "Hero Image Field", slotType: "image" },
  { value: "logo", label: "Logo", slotType: "image" },
  { value: "dashboard_image", label: "Dashboard / Secondary Image", slotType: "image" },
  { value: "background_image", label: "Background Image", slotType: "image" },
  { value: "sponsor_1", label: "Sponsor Logo 1", slotType: "sponsor" },
  { value: "sponsor_2", label: "Sponsor Logo 2", slotType: "sponsor" },
  { value: "sponsor_3", label: "Sponsor Logo 3", slotType: "sponsor" },
  { value: "sponsor_logo_1", label: "Sponsor Logo Field 1", slotType: "sponsor" },
  { value: "sponsor_logo_2", label: "Sponsor Logo Field 2", slotType: "sponsor" },
  { value: "sponsor_logo_3", label: "Sponsor Logo Field 3", slotType: "sponsor" },
  { value: "accreditation_1", label: "Accreditation Logo 1", slotType: "accreditation" },
  { value: "accreditation_2", label: "Accreditation Logo 2", slotType: "accreditation" },
  { value: "review_avatar_1", label: "Review Avatar", slotType: "review" },
] as const;

interface PropertyInspectorProps {
  shape: TemplateShape;
  campaignData: CampaignData;
  onUpdate: (shape: TemplateShape) => void;
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function SectionLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      {icon && <span className="text-[#4ade80] opacity-80">{icon}</span>}
      <span
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: 11,
          letterSpacing: "0.18em",
          color: "#4ade80",
          textTransform: "uppercase" as const,
          opacity: 0.9,
        }}
      >
        {children}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-[#1e5f3b]/60 to-transparent ml-1" />
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 10,
          color: "#6b7280",
          textTransform: "uppercase" as const,
          letterSpacing: "0.06em",
          minWidth: 56,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement> & { onChange?: any }) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 4,
        color: "#e5e7eb",
        fontSize: 12,
        padding: "4px 8px",
        height: 28,
        outline: "none",
        fontFamily: "monospace",
        transition: "border-color 0.15s",
        ...props.style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#1e5f3b";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        props.onBlur?.(e);
      }}
    />
  );
}

function StyledSelect({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 4,
          color: "#e5e7eb",
          fontSize: 12,
          height: 28,
          fontFamily: "monospace",
        }}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        style={{
          background: "#111",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6,
          color: "#e5e7eb",
          fontSize: 12,
        }}
      >
        {children}
      </SelectContent>
    </Select>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <FieldRow label={label}>
      <div className="flex gap-2 items-center">
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            border: "2px solid rgba(255,255,255,0.12)",
            background: value,
            flexShrink: 0,
            position: "relative",
            overflow: "hidden",
            cursor: "pointer",
          }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              cursor: "pointer",
              width: "100%",
              height: "100%",
            }}
          />
        </div>
        <StyledInput
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          style={{ fontFamily: "monospace", fontSize: 11 }}
        />
      </div>
    </FieldRow>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PropertyInspector({
  shape,
  campaignData,
  onUpdate,
}: PropertyInspectorProps) {
  if (!shape) return null;

  const isText        = shape.type === "text";
  const isButton      = shape.type === "button";
  const isBulletGroup = shape.type === "bullet-group";
  const isImage       = shape.type === "image";
  const isLine        = shape.type === "line";

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

  const shapeIcon =
    isText ? <Type size={11} /> :
    isImage ? <Image size={11} /> :
    isLine ? <Minus size={11} /> :
    <Square size={11} />;

  return (
    <div
      style={{
        background: "linear-gradient(160deg, #0a0f0a 0%, #0d1410 50%, #0a0a0a 100%)",
        border: "1px solid rgba(30,95,59,0.35)",
        borderRadius: 10,
        padding: "14px 14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
        fontFamily: "monospace",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 5,
              background: "rgba(30,95,59,0.25)",
              border: "1px solid rgba(30,95,59,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4ade80",
            }}
          >
            {shapeIcon}
          </div>
          <span
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: 13,
              letterSpacing: "0.22em",
              color: "#f3f4f6",
              textTransform: "uppercase" as const,
            }}
          >
            {shape.type.replace("-", " ")}
          </span>
        </div>
        <div
          style={{
            fontSize: 9,
            fontFamily: "monospace",
            color: "rgba(30,95,59,0.7)",
            letterSpacing: "0.1em",
            border: "1px solid rgba(30,95,59,0.25)",
            borderRadius: 3,
            padding: "1px 6px",
          }}
        >
          PROPERTIES
        </div>
      </div>

      {/* ── GEOMETRY ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <SectionLabel icon={<Sliders size={10} />}>Geometry</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {(["x","y","width","height"] as const).map((field) => (
            <FieldRow key={field} label={field.toUpperCase()}>
              <StyledInput
                type="number"
                value={Math.round((shape as any)[field])}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange({ [field]: parseFloat(e.target.value) })
                }
              />
            </FieldRow>
          ))}
        </div>

        {/* Rotation */}
        <FieldRow label="ROTATE">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Slider
                value={[shape.rotation || 0]}
                onValueChange={([v]) => handleChange({ rotation: v })}
                min={0}
                max={360}
                step={1}
                className="py-1"
              />
            </div>
            <span style={{ fontSize: 11, color: "#9ca3af", minWidth: 36, textAlign: "right" }}>
              {shape.rotation || 0}°
            </span>
          </div>
        </FieldRow>
        <div className="flex gap-1 flex-wrap">
          {[0, 45, 90, 180, 270].map((deg) => (
            <button
              key={deg}
              onClick={() => handleChange({ rotation: deg })}
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 3,
                border: `1px solid ${shape.rotation === deg ? "rgba(30,95,59,0.8)" : "rgba(255,255,255,0.08)"}`,
                background: shape.rotation === deg ? "rgba(30,95,59,0.25)" : "transparent",
                color: shape.rotation === deg ? "#4ade80" : "#6b7280",
                cursor: "pointer",
                fontFamily: "monospace",
                transition: "all 0.12s",
              }}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>

      {/* ── LINE ──────────────────────────────────────────────────────────── */}
      {isLine && (
        <div className="flex flex-col gap-2">
          <SectionLabel icon={<Minus size={10} />}>Line</SectionLabel>
          <FieldRow label="THICK">
            <StyledInput
              type="number"
              value={(shape as any).lineWidth ?? 6}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange({ lineWidth: parseInt(e.target.value || "0", 10) } as any)
              }
              min={1}
              max={80}
            />
          </FieldRow>
          <FieldRow label="STYLE">
            <StyledSelect
              value={dashMode}
              onValueChange={(v) =>
                handleChange({ lineDash: v === "dashed" ? [12, 10] : [] } as any)
              }
            >
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="dashed">Dashed</SelectItem>
            </StyledSelect>
          </FieldRow>
          <FieldRow label="CAP">
            <StyledSelect
              value={(shape as any).lineCap ?? "round"}
              onValueChange={(v) => handleChange({ lineCap: v } as any)}
            >
              <SelectItem value="round">Round</SelectItem>
              <SelectItem value="butt">Butt</SelectItem>
              <SelectItem value="square">Square</SelectItem>
            </StyledSelect>
          </FieldRow>
        </div>
      )}

      {/* ── BUTTON ────────────────────────────────────────────────────────── */}
      {isButton && (
        <div className="flex flex-col gap-2">
          <SectionLabel icon={<Square size={10} />}>Button</SectionLabel>
          <FieldRow label="TEXT">
            <StyledInput
              value={(shape as any).buttonText || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange({ buttonText: e.target.value } as any)
              }
              placeholder="Click Here"
            />
          </FieldRow>
          <FieldRow label="LINK">
            <StyledInput
              value={(shape as any).buttonLink || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange({ buttonLink: e.target.value } as any)
              }
              placeholder="https://example.com"
            />
          </FieldRow>
        </div>
      )}

      {/* ── TYPOGRAPHY ────────────────────────────────────────────────────── */}
      {(isText || isButton || isBulletGroup) && (
        <div className="flex flex-col gap-2">
          <SectionLabel icon={<Type size={10} />}>Typography</SectionLabel>

          <FieldRow label="FONT">
            <StyledSelect
              value={shape.fontFamily || "Bebas Neue"}
              onValueChange={(v) => handleChange({ fontFamily: v })}
            >
              {FONT_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </StyledSelect>
          </FieldRow>

          <FieldRow label="SIZE">
            <StyledInput
              type="number"
              value={shape.fontSize ?? 300}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange({ fontSize: parseInt(e.target.value) })
              }
            />
          </FieldRow>

          <FieldRow label="WEIGHT">
            <StyledSelect
              value={String(shape.fontWeight || 400)}
              onValueChange={(v) => handleChange({ fontWeight: parseInt(v) })}
            >
              <SelectItem value="300">Light (300)</SelectItem>
              <SelectItem value="400">Regular (400)</SelectItem>
              <SelectItem value="600">Semibold (600)</SelectItem>
              <SelectItem value="700">Bold (700)</SelectItem>
              <SelectItem value="900">Black (900)</SelectItem>
            </StyledSelect>
          </FieldRow>

          <FieldRow label="CASE">
            <StyledSelect
              value={(shape as any).textTransform || "none"}
              onValueChange={(v) => handleChange({ textTransform: v } as any)}
            >
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="uppercase">UPPERCASE</SelectItem>
              <SelectItem value="lowercase">lowercase</SelectItem>
              <SelectItem value="capitalize">Capitalize</SelectItem>
            </StyledSelect>
          </FieldRow>

          {!isBulletGroup && (
            <FieldRow label="ALIGN">
              <StyledSelect
                value={shape.textAlign || "left"}
                onValueChange={(v: any) => handleChange({ textAlign: v })}
              >
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </StyledSelect>
            </FieldRow>
          )}

          <ColorField
            label="COLOR"
            value={shape.textColor || "#1e5f3b"}
            onChange={(v) => handleChange({ textColor: v })}
          />
        </div>
      )}

      {/* ── TEXT CONTENT ──────────────────────────────────────────────────── */}
      {isText && (
        <div className="flex flex-col gap-2">
          <SectionLabel icon={<AlignLeft size={10} />}>Content</SectionLabel>

          <FieldRow label="MODE">
            <StyledSelect
              value={shape.dataField ? "dynamic" : "custom"}
              onValueChange={(v) => {
                if (v === "custom") {
                  handleChange({ dataField: undefined, customText: shape.customText || "Enter your text" });
                } else {
                  handleChange({ dataField: "headline", customText: undefined });
                }
              }}
            >
              <SelectItem value="dynamic">Dynamic</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </StyledSelect>
          </FieldRow>

          {shape.dataField && (
            <FieldRow label="SOURCE">
              <StyledSelect
                value={shape.dataField}
                onValueChange={(v) => handleChange({ dataField: v })}
              >
                {TEXT_DATA_FIELD_GROUPS.map((group) => (
                  <div key={group.group}>
                    <SelectItem
                      value={`__label_${group.group}`}
                      disabled
                      className="text-xs uppercase tracking-widest opacity-50"
                    >
                      {group.group}
                    </SelectItem>

                    {group.items.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </StyledSelect>
            </FieldRow>
          )}

          {!shape.dataField && (
            <textarea
              value={shape.customText || ""}
              onChange={(e) => handleChange({ customText: e.target.value })}
              placeholder="Enter your text here..."
              rows={3}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 4,
                color: "#e5e7eb",
                fontSize: 12,
                padding: "6px 8px",
                resize: "vertical",
                outline: "none",
                fontFamily: "monospace",
                lineHeight: 1.5,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#1e5f3b"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            />
          )}
        </div>
      )}

      {/* ── FILL ──────────────────────────────────────────────────────────── */}
      {hasGeometryFill && (
        <div className="flex flex-col gap-2">
          <SectionLabel icon={<Square size={10} />}>Fill</SectionLabel>
          <ColorField
            label="BG"
            value={shape.backgroundColor || "#ffffff"}
            onChange={(v) => handleChange({ backgroundColor: v })}
          />
        </div>
      )}

      {/* ── BORDER ────────────────────────────────────────────────────────── */}
      {hasBorderControls && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Border</SectionLabel>
          <ColorField
            label={isLine ? "COLOR" : "COLOR"}
            value={shape.borderColor || "#000000"}
            onChange={(v) => handleChange({ borderColor: v })}
          />
          {!isLine && (
            <FieldRow label="WIDTH">
              <StyledInput
                type="number"
                value={shape.borderWidth || 0}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange({ borderWidth: parseInt(e.target.value) })
                }
              />
            </FieldRow>
          )}
          {(shape.type === "rounded-rect" || isButton) && (
            <FieldRow label="RADIUS">
              <StyledInput
                type="number"
                value={shape.borderRadius || 8}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange({ borderRadius: parseInt(e.target.value) })
                }
              />
            </FieldRow>
          )}
        </div>
      )}

      {/* ── IMAGE ─────────────────────────────────────────────────────────── */}
      {isImage && (
        <div className="flex flex-col gap-2">
          <SectionLabel icon={<Image size={10} />}>Image</SectionLabel>

          <FieldRow label="ROLE">
            <StyledSelect
              value={shape.slotKey || "custom"}
              onValueChange={(v) => {
                if (v === "custom") {
                  handleChange({
                    slotKey: undefined,
                    slotLabel: undefined,
                    slotType: "image",
                    dataField: undefined,
                  } as any);
                  return;
                }

                const selected = IMAGE_ROLE_OPTIONS.find((item) => item.value === v);

                handleChange({
                  slotKey: v,
                  dataField: v,
                  slotLabel: selected?.label || v,
                  slotType: selected?.slotType || "image",
                } as any);
              }}
            >
              {IMAGE_ROLE_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </StyledSelect>
          </FieldRow>

          <FieldRow label="SRC">
            <StyledInput
              value={(shape as any).src || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange({ src: e.target.value } as any)
              }
              placeholder="https://..."
            />
          </FieldRow>

          <FieldRow label="FIT">
            <StyledSelect
              value={(shape as any).fit || "cover"}
              onValueChange={(v: any) => handleChange({ fit: v })}
            >
              <SelectItem value="cover">Cover</SelectItem>
              <SelectItem value="contain">Contain</SelectItem>
            </StyledSelect>
          </FieldRow>

          <FieldRow label="RADIUS">
            <StyledInput
              type="number"
              value={(shape as any).radius || 0}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange({ radius: parseInt(e.target.value) } as any)
              }
            />
          </FieldRow>
        </div>
      )}

      {/* ── APPEARANCE ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <SectionLabel icon={<Layers size={10} />}>Appearance</SectionLabel>

        <FieldRow label="OPACITY">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Slider
                value={[(shape.opacity ?? 1) * 100]}
                onValueChange={([v]) => handleChange({ opacity: v / 100 })}
                min={0}
                max={100}
                step={1}
                className="py-1"
              />
            </div>
            <span style={{ fontSize: 11, color: "#9ca3af", minWidth: 36, textAlign: "right" }}>
              {Math.round((shape.opacity ?? 1) * 100)}%
            </span>
          </div>
        </FieldRow>
      </div>

      {/* ── SHADOW ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Shadow</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <FieldRow label="BLUR">
            <StyledInput
              type="number"
              value={shape.shadowBlur || 0}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange({ shadowBlur: parseInt(e.target.value) })
              }
            />
          </FieldRow>
          <FieldRow label="X">
            <StyledInput
              type="number"
              value={shape.shadowX || 0}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange({ shadowX: parseInt(e.target.value) })
              }
            />
          </FieldRow>
          <FieldRow label="Y">
            <StyledInput
              type="number"
              value={shape.shadowY || 0}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange({ shadowY: parseInt(e.target.value) })
              }
            />
          </FieldRow>
          <FieldRow label="CLR">
            <div
              style={{
                width: "100%",
                height: 28,
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.08)",
                background: shape.shadowColor || "#000000",
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <input
                type="color"
                value={shape.shadowColor || "#000000"}
                onChange={(e) => handleChange({ shadowColor: e.target.value })}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  cursor: "pointer",
                  width: "100%",
                  height: "100%",
                }}
              />
            </div>
          </FieldRow>
        </div>
      </div>

      {/* Footer accent */}
      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg, rgba(30,95,59,0.6) 0%, rgba(30,95,59,0.1) 60%, transparent 100%)",
          marginTop: 2,
        }}
      />
    </div>
  );
}