"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createBrand,
  listBrands,
  updateBrand,
  deleteBrand,
  getBrandProfile,
  startBrandScrape,
  type Brand as ApiBrand,
  type BrandProfile,
} from "@/lib/api";
import {
  RefreshCcw,
  Plus,
  Building2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Check,
  Globe,
  Wand2,
  ChevronDown,
  ChevronUp,
  Clock,
  X,
  Trash2,
  Palette,
  Image as ImageIcon,
  CalendarDays,
  Layers3,
  Pencil,
  Save,
  Upload,
} from "lucide-react";
import { uploadFileToSpaces } from "@/lib/video-upload-client";

/* ─────────────────────────────────────────────────────────────────────────────
   Local brand shape
   Keeps compatibility even if api Brand type is older / partial
───────────────────────────────────────────────────────────────────────────── */
type Brand = ApiBrand & {
  logo_url?: string | null;
  primary_color?: string | null;
  tones?: string[] | null;
  created_at?: string | null;
  org_id?: string | null;
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtRelative(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(iso);
}

function normalizeHex(v: string) {
  const s = (v || "").trim();
  if (!s) return "#7c3aed";
  return s.startsWith("#") ? s : `#${s}`;
}

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  READY: { color: "#34d399", label: "Ready" },
  SCRAPING: { color: "#a78bfa", label: "Scraping" },
  FAILED: { color: "#f87171", label: "Failed" },
  IDLE: { color: "#6b7280", label: "Idle" },
};

function scfg(s?: string) {
  return STATUS_CFG[(s || "").toUpperCase()] ?? {
    color: "#6b7280",
    label: s || "Unknown",
  };
}

function BrandAvatar({
  id,
  logoUrl,
  size = 42,
}: {
  id: string;
  logoUrl?: string | null;
  size?: number;
}) {
  const letter = id.charAt(0).toUpperCase();
  const hue = Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const color = `hsl(${hue},55%,60%)`;

  if (logoUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(255,255,255,0.1)",
          overflow: "hidden",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={logoUrl}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            padding: 6,
            display: "block",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: color + "20",
        border: `1px solid ${color}40`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        fontSize: size * 0.44,
        fontWeight: 800,
        fontFamily: "Syne, sans-serif",
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 9px",
        borderRadius: 999,
        background: color ? `${color}14` : "rgba(255,255,255,0.04)",
        border: `1px solid ${color ? `${color}2e` : "rgba(255,255,255,0.08)"}`,
        fontSize: 10,
        fontWeight: 700,
        color: color || "rgba(255,255,255,0.45)",
        fontFamily: "DM Mono, monospace",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      <span style={{ opacity: 0.8 }}>{label}</span>
      <span style={{ color: "#e4e4e7" }}>{value}</span>
    </div>
  );
}

/* ─── Brand Card ──────────────────────────────────────────────────────────── */

function BrandCard({
  b,
  onToggle,
  toggling,
  onDelete,
  onUpdated,
}: {
  b: Brand;
  onToggle: (b: Brand) => void;
  toggling: boolean;
  onDelete: () => void;
  onUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(b.display_name || "");
  const [editLogoUrl, setEditLogoUrl] = useState(b.logo_url || "");
  const [editPrimaryColor, setEditPrimaryColor] = useState(b.primary_color || "#7c3aed");
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState(b.logo_url || "");
  const [savingBrand, setSavingBrand] = useState(false);

  useEffect(() => {
    setEditName(b.display_name || "");
    setEditLogoUrl(b.logo_url || "");
    setEditPrimaryColor(b.primary_color || "#7c3aed");
    setEditLogoFile(null);
    setEditLogoPreview(b.logo_url || "");
  }, [b.id, b.display_name, b.logo_url, b.primary_color]);

  const hue = Array.from(b.id).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const accentColor = b.primary_color || `hsl(${hue},55%,60%)`;

  const loadProfile = async () => {
    if (profile) return;
    setLoadingProfile(true);
    try {
      const p = await getBrandProfile(b.id);
      setProfile(p);
      setWebsiteUrl((p as any).website_url || "");
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "Failed to load profile" });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) loadProfile();
  };

  const scrapeNow = async () => {
    const url = websiteUrl.trim();
    if (!url) {
      setMsg({ type: "err", text: "Website URL is required." });
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setMsg({ type: "err", text: "URL must start with http:// or https://" });
      return;
    }

    setScraping(true);
    setMsg(null);

    try {
      const res = await startBrandScrape({ brand_id: b.id, website_url: url });

      setProfile((p) =>
        p
          ? { ...p, website_url: url, status: "SCRAPING", last_error: null }
          : ({ brand_id: b.id, website_url: url, status: "SCRAPING" } as BrandProfile)
      );

      setMsg({ type: "ok", text: `Scrape started — status: ${res.status}` });

      setTimeout(async () => {
        try {
          const p = await getBrandProfile(b.id);
          setProfile(p);
        } catch {}
      }, 1500);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "Failed to start scrape" });
    } finally {
      setScraping(false);
    }
  };

  const cfg = scfg((profile as any)?.status);
  const tones = Array.isArray(b.tones) ? b.tones.filter(Boolean) : [];

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBrand(b.id);
      onDelete();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "Failed to delete brand" });
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const pickEditLogoFile = (file: File | null) => {
    if (!file) return;
    setEditLogoFile(file);
    setEditLogoUrl("");

    const reader = new FileReader();
    reader.onload = (e) => setEditLogoPreview((e.target?.result as string) || "");
    reader.readAsDataURL(file);
  };

  const handleEditLogoUrl = (value: string) => {
    setEditLogoUrl(value);
    setEditLogoFile(null);
    setEditLogoPreview(value);
  };

  const resetEditForm = () => {
    setEditName(b.display_name || "");
    setEditLogoUrl(b.logo_url || "");
    setEditPrimaryColor(b.primary_color || "#7c3aed");
    setEditLogoFile(null);
    setEditLogoPreview(b.logo_url || "");
    setEditing(false);
    setMsg(null);
  };

  const saveBrandChanges = async () => {
    const cleanName = editName.trim();
    if (!cleanName) {
      setMsg({ type: "err", text: "Brand name is required." });
      return;
    }

    setSavingBrand(true);
    setMsg(null);

    try {
      let finalLogoUrl: string | null = editLogoUrl.trim() || null;

      if (editLogoFile) {
        finalLogoUrl = await uploadFileToSpaces(editLogoFile);
      }

      await updateBrand(b.id, {
        display_name: cleanName,
        logo_url: finalLogoUrl,
        primary_color: normalizeHex(editPrimaryColor),
      } as any);

      setEditing(false);
      setEditLogoFile(null);
      setMsg({ type: "ok", text: "Brand updated successfully." });
      onUpdated();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "Failed to update brand" });
    } finally {
      setSavingBrand(false);
    }
  };

  return (
    <div
      style={{
        background:
          expanded
            ? `linear-gradient(180deg, ${accentColor}10 0%, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0.02) 100%)`
            : "rgba(255,255,255,0.025)",
        border: `1px solid ${
          expanded ? `${accentColor}30` : "rgba(255,255,255,0.07)"
        }`,
        borderRadius: 20,
        overflow: "hidden",
        transition: "border-color 0.2s, background 0.2s",
        boxShadow: expanded ? `0 8px 28px ${accentColor}10` : "none",
      }}
    >
      {/* top accent */}
      <div
        style={{
          height: 3,
          width: "100%",
          background: accentColor || "#7c3aed",
          opacity: 0.95,
        }}
      />

      <div className="brand-card-header">
        <BrandAvatar id={b.id} logoUrl={b.logo_url} size={42} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: b.is_active ? "#f5f5f5" : "rgba(255,255,255,0.35)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginBottom: 3,
            }}
          >
            {b.display_name}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.22)",
                fontFamily: "DM Mono, monospace",
              }}
            >
              {b.id}
            </span>

            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: b.is_active ? "#34d399" : "rgba(255,255,255,0.3)",
                background: b.is_active ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${
                  b.is_active ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.08)"
                }`,
                padding: "1px 6px",
                borderRadius: 6,
                fontFamily: "DM Mono, monospace",
                letterSpacing: "0.06em",
              }}
            >
              {b.is_active ? "ACTIVE" : "INACTIVE"}
            </span>

            {(profile as any)?.status && (
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: cfg.color,
                  background: cfg.color + "18",
                  border: `1px solid ${cfg.color}30`,
                  padding: "1px 6px",
                  borderRadius: 6,
                  fontFamily: "DM Mono, monospace",
                  letterSpacing: "0.06em",
                }}
              >
                {cfg.label}
              </span>
            )}
          </div>
        </div>

        <div className="brand-card-actions">
          <button
            onClick={() => onToggle(b)}
            disabled={toggling}
            style={{
              background: "none",
              border: "none",
              cursor: toggling ? "not-allowed" : "pointer",
              padding: 0,
              display: "flex",
              opacity: toggling ? 0.4 : 1,
            }}
            title={b.is_active ? "Disable" : "Enable"}
          >
            {b.is_active ? (
              <ToggleRight style={{ width: 24, height: 24, color: "#34d399" }} />
            ) : (
              <ToggleLeft style={{ width: 24, height: 24, color: "rgba(255,255,255,0.18)" }} />
            )}
          </button>

          <button
            onClick={() => setEditing((v) => !v)}
            title="Edit brand"
            style={{
              background: editing ? accentColor + "18" : "rgba(255,255,255,0.05)",
              border: `1px solid ${editing ? accentColor + "35" : "rgba(255,255,255,0.09)"}`,
              borderRadius: 8,
              padding: 5,
              cursor: "pointer",
              display: "flex",
              color: editing ? accentColor : "rgba(255,255,255,0.35)",
              transition: "all 0.15s",
            }}
          >
            <Pencil style={{ width: 13, height: 13 }} />
          </button>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete brand"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                color: "rgba(255,255,255,0.2)",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#f87171")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.2)")}
            >
              <Trash2 style={{ width: 13, height: 13 }} />
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  borderRadius: 7,
                  color: "#f87171",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: deleting ? "not-allowed" : "pointer",
                  fontFamily: "Syne, sans-serif",
                }}
              >
                {deleting ? (
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderTopColor: "#f87171",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "brandspin 0.6s linear infinite",
                    }}
                  />
                ) : (
                  <Check style={{ width: 10, height: 10 }} />
                )}
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 7,
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                }}
              >
                <X style={{ width: 10, height: 10 }} />
              </button>
            </div>
          )}

          <button
            onClick={handleExpand}
            style={{
              background: expanded ? accentColor + "18" : "rgba(255,255,255,0.05)",
              border: `1px solid ${expanded ? accentColor + "35" : "rgba(255,255,255,0.09)"}`,
              borderRadius: 10,
              padding: "6px 9px",
              cursor: "pointer",
              color: expanded ? accentColor : "rgba(255,255,255,0.4)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "Syne, sans-serif",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            <Globe style={{ width: 11, height: 11, flexShrink: 0 }} />
            <span className="brand-profile-label">Profile</span>
            {expanded ? (
              <ChevronUp style={{ width: 10, height: 10 }} />
            ) : (
              <ChevronDown style={{ width: 10, height: 10 }} />
            )}
          </button>
        </div>
      </div>

      {/* brand metadata strip */}
      <div
        style={{
          padding: "0 16px 14px",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <StatPill
          icon={<Palette style={{ width: 11, height: 11 }} />}
          label="color"
          value={b.primary_color || "#7c3aed"}
          color={b.primary_color || accentColor}
        />
        <StatPill
          icon={<Layers3 style={{ width: 11, height: 11 }} />}
          label="tones"
          value={String(tones.length)}
        />
        <StatPill
          icon={<CalendarDays style={{ width: 11, height: 11 }} />}
          label="created"
          value={fmtRelative(b.created_at)}
        />
        {b.logo_url && (
          <StatPill
            icon={<ImageIcon style={{ width: 11, height: 11 }} />}
            label="logo"
            value="set"
          />
        )}
      </div>

      {/* tones */}
      {tones.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.22)",
              fontFamily: "DM Mono, monospace",
              marginBottom: 8,
            }}
          >
            Tones
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {tones.map((tone, i) => (
              <span
                key={`${tone}-${i}`}
                style={{
                  padding: "5px 8px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {tone}
              </span>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "16px 18px",
            background: "rgba(124,58,237,0.045)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(167,139,250,0.8)",
                  fontFamily: "DM Mono, monospace",
                  marginBottom: 4,
                }}
              >
                Brand settings
              </div>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.32)", lineHeight: 1.55 }}>
                Update the brand name, replace the logo, or change the primary colour used by future templates and content.
              </p>
            </div>
          </div>

          <div className="brand-edit-grid">
            <div>
              <span className="brand-field-label">Brand name</span>
              <input
                className="brand-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Brand name"
                disabled={savingBrand}
              />
            </div>

            <div>
              <span className="brand-field-label">Primary colour</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 42px 42px", gap: 8 }}>
                <input
                  className="brand-input"
                  value={editPrimaryColor}
                  onChange={(e) => setEditPrimaryColor(e.target.value)}
                  placeholder="#7c3aed"
                  disabled={savingBrand}
                />
                <input
                  type="color"
                  value={normalizeHex(editPrimaryColor)}
                  onChange={(e) => setEditPrimaryColor(e.target.value)}
                  disabled={savingBrand}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "none",
                    padding: 2,
                    cursor: savingBrand ? "not-allowed" : "pointer",
                  }}
                />
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: normalizeHex(editPrimaryColor),
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="brand-edit-logo-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="brand-field-label">Logo URL</span>
              <input
                className="brand-input"
                value={editLogoUrl}
                onChange={(e) => handleEditLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                disabled={savingBrand || !!editLogoFile}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="brand-btn brand-btn-outline"
                  onClick={() => document.getElementById(`brand-logo-file-${b.id}`)?.click()}
                  disabled={savingBrand}
                >
                  <Upload style={{ width: 12, height: 12 }} />
                  Upload new logo
                </button>

                {(editLogoUrl || editLogoFile || editLogoPreview) && (
                  <button
                    type="button"
                    className="brand-btn brand-btn-outline"
                    onClick={() => {
                      setEditLogoFile(null);
                      setEditLogoUrl("");
                      setEditLogoPreview("");
                    }}
                    disabled={savingBrand}
                    style={{ color: "rgba(248,113,113,0.78)" }}
                  >
                    <X style={{ width: 12, height: 12 }} />
                    Remove logo
                  </button>
                )}
              </div>

              <input
                id={`brand-logo-file-${b.id}`}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => pickEditLogoFile(e.target.files?.[0] || null)}
              />

              {editLogoFile && (
                <p style={{ margin: "8px 0 0", fontSize: 10, color: "rgba(167,139,250,0.75)", fontFamily: "DM Mono, monospace" }}>
                  Selected file: {editLogoFile.name}
                </p>
              )}
            </div>

            <div
              style={{
                width: 92,
                height: 92,
                borderRadius: 16,
                background: editLogoPreview ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {editLogoPreview ? (
                <img
                  src={editLogoPreview}
                  alt="Logo preview"
                  style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }}
                  onError={() => setEditLogoPreview("")}
                />
              ) : (
                <ImageIcon style={{ width: 28, height: 28, color: "rgba(255,255,255,0.2)" }} />
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="brand-btn brand-btn-primary"
              onClick={saveBrandChanges}
              disabled={savingBrand}
            >
              {savingBrand ? (
                <span
                  style={{
                    width: 13,
                    height: 13,
                    border: "2px solid rgba(255,255,255,0.2)",
                    borderTopColor: "white",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "brandspin 0.7s linear infinite",
                  }}
                />
              ) : (
                <Save style={{ width: 12, height: 12 }} />
              )}
              {savingBrand ? "Saving…" : "Save changes"}
            </button>

            <button className="brand-btn brand-btn-outline" onClick={resetEditForm} disabled={savingBrand}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "16px 18px",
            background: "rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* overview panel */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
            className="brand-overview-grid"
          >
            <div
              style={{
                padding: "12px 14px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.25)",
                  fontFamily: "DM Mono, monospace",
                  marginBottom: 6,
                }}
              >
                Created
              </div>
              <div style={{ fontSize: 12, color: "#e4e4e7", fontWeight: 700 }}>
                {fmtDate(b.created_at)}
              </div>
            </div>

            <div
              style={{
                padding: "12px 14px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.25)",
                  fontFamily: "DM Mono, monospace",
                  marginBottom: 6,
                }}
              >
                Primary colour
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 6,
                    background: b.primary_color || "#7c3aed",
                    border: "1px solid rgba(255,255,255,0.12)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ fontSize: 12, color: "#e4e4e7", fontWeight: 700 }}>
                  {b.primary_color || "#7c3aed"}
                </div>
              </div>
            </div>
          </div>

          {loadingProfile ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "rgba(255,255,255,0.3)",
                fontSize: 11,
              }}
            >
              <span
                style={{
                  width: 13,
                  height: 13,
                  border: "2px solid rgba(255,255,255,0.1)",
                  borderTopColor: accentColor,
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "brandspin 0.7s linear infinite",
                }}
              />
              Loading profile…
            </div>
          ) : (
            <>
              <div className="brand-scrape-row" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.25)",
                      fontFamily: "DM Mono, monospace",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Website URL
                  </span>
                  <input
                    className="brand-input"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && scrapeNow()}
                    placeholder="https://example.com"
                    disabled={scraping}
                  />
                </div>

                <button
                  onClick={scrapeNow}
                  disabled={scraping}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 16px",
                    background: scraping ? "rgba(255,255,255,0.04)" : `${accentColor}22`,
                    border: `1px solid ${scraping ? "rgba(255,255,255,0.07)" : accentColor + "45"}`,
                    borderRadius: 11,
                    color: scraping ? "rgba(255,255,255,0.25)" : accentColor,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: scraping ? "not-allowed" : "pointer",
                    fontFamily: "Syne, sans-serif",
                    flexShrink: 0,
                  }}
                >
                  {scraping ? (
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        border: "2px solid rgba(255,255,255,0.1)",
                        borderTopColor: accentColor,
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "brandspin 0.7s linear infinite",
                      }}
                    />
                  ) : (
                    <Wand2 style={{ width: 12, height: 12 }} />
                  )}
                  {scraping ? "Scraping…" : "Scrape Now"}
                </button>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.25)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    Profile Summary
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 9,
                      color: "rgba(255,255,255,0.2)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    <Clock style={{ width: 9, height: 9 }} />
                    {fmtDate((profile as any)?.last_scraped_at)}
                  </span>
                </div>

                {(profile as any)?.profile_summary ? (
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.55)",
                      lineHeight: 1.65,
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {(profile as any).profile_summary}
                  </p>
                ) : (
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.2)",
                      margin: 0,
                      fontStyle: "italic",
                    }}
                  >
                    No summary yet — enter a URL and click Scrape Now.
                  </p>
                )}

                {(profile as any)?.last_error && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 10px",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: 9,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 10,
                        color: "#f87171",
                        margin: 0,
                        fontFamily: "DM Mono, monospace",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {(profile as any).last_error}
                    </p>
                  </div>
                )}
              </div>

              {msg && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "8px 12px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    background:
                      msg.type === "ok"
                        ? "rgba(52,211,153,0.1)"
                        : "rgba(239,68,68,0.1)",
                    border: `1px solid ${
                      msg.type === "ok"
                        ? "rgba(52,211,153,0.22)"
                        : "rgba(239,68,68,0.22)"
                    }`,
                    color: msg.type === "ok" ? "#34d399" : "#f87171",
                  }}
                >
                  {msg.type === "ok" ? (
                    <Check style={{ width: 12, height: 12, flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0 }} />
                  )}
                  {msg.text}
                  <button
                    onClick={() => setMsg(null)}
                    style={{
                      marginLeft: "auto",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "inherit",
                      opacity: 0.5,
                      padding: 2,
                      display: "flex",
                    }}
                  >
                    <X style={{ width: 11, height: 11 }} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [isActive, setIsActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const autoId = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const refresh = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setMsg(null);
    try {
      const data = (await listBrands(false)) as Brand[];
      setBrands(data);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onCreate = async () => {
    const cleanName = displayName.trim();
    if (!cleanName) {
      setMsg({ type: "err", text: "Display name is required." });
      return;
    }
    if (!autoId) {
      setMsg({ type: "err", text: "Name must contain at least one letter or number." });
      return;
    }

    setCreating(true);
    setMsg(null);

    try {
      await createBrand({
        id: autoId,
        display_name: cleanName,
        is_active: isActive,
        logo_url: logoUrl.trim() || null,
        primary_color: normalizeHex(primaryColor),
      } as any);

      setDisplayName("");
      setLogoUrl("");
      setPrimaryColor("#7c3aed");
      setIsActive(true);
      setShowForm(false);

      await refresh(true);
      setMsg({ type: "ok", text: `Brand "${cleanName}" created.` });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (b: Brand) => {
    setToggling(b.id);
    try {
      await updateBrand(b.id, { is_active: !b.is_active });
      await refresh(true);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setToggling(null);
    }
  };

  const active = useMemo(() => brands.filter((b) => b.is_active), [brands]);
  const inactive = useMemo(() => brands.filter((b) => !b.is_active), [brands]);

  const totalTones = useMemo(
    () =>
      brands.reduce((acc, b) => acc + (Array.isArray(b.tones) ? b.tones.length : 0), 0),
    [brands]
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');

        .brands-root {
          font-family: 'Syne', sans-serif;
          background:
            radial-gradient(circle at top right, rgba(124,58,237,0.08), transparent 28%),
            radial-gradient(circle at bottom left, rgba(79,70,229,0.06), transparent 24%),
            #0c0c0f;
          min-height: 100vh;
          color: #e4e4e7;
          padding: 22px 16px;
        }

        .brands-root * { box-sizing: border-box; }

        @keyframes brandspin { to { transform: rotate(360deg); } }
        @keyframes brandFade {
          from { opacity:0; transform:translateY(6px); }
          to { opacity:1; transform:translateY(0); }
        }

        .brand-fade { animation: brandFade 0.22s ease both; }

        .brand-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 12px;
          padding: 11px 14px;
          color: #e4e4e7;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .brand-input:focus {
          border-color: rgba(124,58,237,0.5);
          box-shadow: 0 0 0 3px rgba(124,58,237,0.1);
          background: rgba(255,255,255,0.065);
        }
        .brand-input::placeholder { color: rgba(255,255,255,0.18); }
        .brand-input:disabled { opacity: 0.4; }

        .brand-field-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.25);
          font-family: 'DM Mono', monospace;
          display: block;
          margin-bottom: 6px;
        }

        .brand-edit-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .brand-edit-logo-row {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .brand-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 16px;
          border-radius: 11px;
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
        }
        .brand-btn-primary {
          background: linear-gradient(135deg,#7c3aed,#4f46e5);
          color: white;
          box-shadow: 0 6px 18px rgba(124,58,237,0.18);
        }
        .brand-btn-primary:hover:not(:disabled) { opacity: 0.88; }
        .brand-btn-outline {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.55);
        }
        .brand-btn-outline:hover:not(:disabled) {
          background: rgba(255,255,255,0.09);
          color: #e4e4e7;
        }
        .brand-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .brand-section-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.22);
          font-family: 'DM Mono', monospace;
          margin-bottom: 10px;
        }

        .brand-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px,1fr));
          gap: 12px;
        }

        .brand-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px 10px;
          min-width: 0;
          overflow: hidden;
        }

        .brand-card-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
          margin-left: auto;
        }

        .brand-profile-label { display: inline; }

        .brand-scrape-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .brand-scrape-row > div:first-child {
          flex: 1;
          min-width: 0;
        }

        .brand-overview-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        @media (max-width: 760px) {
          .brand-grid { grid-template-columns: 1fr; }
          .brand-overview-grid { grid-template-columns: 1fr; }
          .brand-edit-grid { grid-template-columns: 1fr; }
          .brand-edit-logo-row { flex-direction: column; }
        }

        @media (max-width: 640px) {
          .brands-root { padding: 16px 10px; }
          .brand-card-header { gap: 8px; padding: 12px 12px 10px; }
          .brand-profile-label { display: none; }
        }
      `}</style>

      <div className="brands-root">
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(124,58,237,0.7)",
                marginBottom: 4,
                fontFamily: "DM Mono, monospace",
              }}
            >
              NeuroFlow · Config
            </div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#f4f4f5",
                margin: 0,
                lineHeight: 1.05,
              }}
            >
              Brands
            </h1>
            <p
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
                marginTop: 7,
              }}
            >
              {brands.length} brand{brands.length !== 1 ? "s" : ""} · {active.length} active · {totalTones} tone assignment{totalTones !== 1 ? "s" : ""}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="brand-btn brand-btn-outline" onClick={() => refresh()} disabled={loading}>
              <RefreshCcw
                style={{
                  width: 12,
                  height: 12,
                  animation: loading ? "brandspin 0.7s linear infinite" : "none",
                }}
              />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button className="brand-btn brand-btn-primary" onClick={() => setShowForm((v) => !v)}>
              <Plus style={{ width: 12, height: 12 }} />
              New Brand
            </button>
          </div>
        </div>

        {/* Create form */}
        {showForm && (
          <div
            className="brand-fade"
            style={{
              background: "linear-gradient(180deg, rgba(124,58,237,0.08), rgba(255,255,255,0.03))",
              border: "1px solid rgba(124,58,237,0.18)",
              borderRadius: 20,
              padding: "20px 22px",
              marginBottom: 24,
              boxShadow: "0 10px 30px rgba(124,58,237,0.08)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: "#c4b5fd", marginBottom: 16 }}>
              New Brand
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.25)",
                    fontFamily: "DM Mono, monospace",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Brand Name
                </span>
                <input
                  className="brand-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onCreate()}
                  placeholder="e.g. NeuroFlow AI"
                  autoFocus
                />
                {autoId && (
                  <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 5 }}>
                    <span
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,0.2)",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      ID →
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: "rgba(124,58,237,0.65)",
                        fontFamily: "DM Mono, monospace",
                        background: "rgba(124,58,237,0.1)",
                        border: "1px solid rgba(124,58,237,0.2)",
                        padding: "2px 8px",
                        borderRadius: 5,
                      }}
                    >
                      {autoId}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.25)",
                    fontFamily: "DM Mono, monospace",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Logo URL
                </span>
                <input
                  className="brand-input"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 12,
                alignItems: "end",
                marginBottom: 18,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.25)",
                    fontFamily: "DM Mono, monospace",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Primary Colour
                </span>
                <input
                  className="brand-input"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#7c3aed"
                />
              </div>

              <input
                type="color"
                value={normalizeHex(primaryColor)}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "none",
                  padding: 2,
                  cursor: "pointer",
                }}
              />

              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: normalizeHex(primaryColor),
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.25)",
                  fontFamily: "DM Mono, monospace",
                }}
              >
                Active on creation
              </span>
              <button
                onClick={() => setIsActive((v) => !v)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                }}
              >
                {isActive ? (
                  <ToggleRight style={{ width: 28, height: 28, color: "#34d399" }} />
                ) : (
                  <ToggleLeft style={{ width: 28, height: 28, color: "rgba(255,255,255,0.2)" }} />
                )}
              </button>
              <span
                style={{
                  fontSize: 11,
                  color: isActive ? "#34d399" : "rgba(255,255,255,0.3)",
                  fontWeight: 700,
                }}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {(displayName || logoUrl) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14,
                  marginBottom: 16,
                }}
              >
                <BrandAvatar id={autoId || displayName || "brand"} logoUrl={logoUrl || null} size={32} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7" }}>
                    {displayName || "Preview Brand"}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "rgba(255,255,255,0.25)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {autoId || "auto-generated-id"}
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      background: normalizeHex(primaryColor),
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      background: isActive ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${
                        isActive ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.1)"
                      }`,
                      color: isActive ? "#34d399" : "rgba(255,255,255,0.3)",
                      padding: "2px 8px",
                      borderRadius: 7,
                      fontWeight: 700,
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {isActive ? "active" : "inactive"}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button className="brand-btn brand-btn-primary" onClick={onCreate} disabled={creating}>
                {creating ? (
                  <span
                    style={{
                      width: 13,
                      height: 13,
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderTopColor: "white",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "brandspin 0.7s linear infinite",
                    }}
                  />
                ) : (
                  <Plus style={{ width: 12, height: 12 }} />
                )}
                {creating ? "Creating…" : "Create Brand"}
              </button>

              <button
                className="brand-btn brand-btn-outline"
                onClick={() => {
                  setShowForm(false);
                  setDisplayName("");
                  setLogoUrl("");
                  setPrimaryColor("#7c3aed");
                  setMsg(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Toast */}
        {msg && (
          <div
            className="brand-fade"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 12,
              marginBottom: 18,
              fontSize: 12,
              fontWeight: 700,
              background:
                msg.type === "ok"
                  ? "rgba(52,211,153,0.1)"
                  : "rgba(239,68,68,0.1)",
              border: `1px solid ${
                msg.type === "ok"
                  ? "rgba(52,211,153,0.25)"
                  : "rgba(239,68,68,0.22)"
              }`,
              color: msg.type === "ok" ? "#34d399" : "#f87171",
            }}
          >
            {msg.type === "ok" ? (
              <Check style={{ width: 13, height: 13 }} />
            ) : (
              <AlertTriangle style={{ width: 13, height: 13 }} />
            )}
            {msg.text}
            <button
              onClick={() => setMsg(null)}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "inherit",
                opacity: 0.5,
                padding: 2,
                display: "flex",
              }}
            >
              <X style={{ width: 11, height: 11 }} />
            </button>
          </div>
        )}

        {/* Brand lists */}
        {loading && brands.length === 0 ? (
          <div className="brand-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 180,
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.04)",
                  animation: "brandFade 1.4s ease infinite alternate",
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <div className="brand-section-label">Active · {active.length}</div>
                <div className="brand-grid">
                  {active.map((b, i) => (
                    <div key={b.id} className="brand-fade" style={{ animationDelay: `${i * 0.04}s` }}>
                      <BrandCard
                        b={b}
                        onToggle={toggleActive}
                        toggling={toggling === b.id}
                        onDelete={() => refresh(true)}
                        onUpdated={() => refresh(true)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {inactive.length > 0 && (
              <section>
                <div className="brand-section-label">Inactive · {inactive.length}</div>
                <div className="brand-grid">
                  {inactive.map((b, i) => (
                    <div key={b.id} className="brand-fade" style={{ animationDelay: `${i * 0.04}s` }}>
                      <BrandCard
                        b={b}
                        onToggle={toggleActive}
                        toggling={toggling === b.id}
                        onDelete={() => refresh(true)}
                        onUpdated={() => refresh(true)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {brands.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "70px 20px" }}>
                <Building2
                  style={{
                    width: 46,
                    height: 46,
                    margin: "0 auto 12px",
                    opacity: 0.35,
                    color: "rgba(255,255,255,0.12)",
                  }}
                />
                <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.22)" }}>
                  No brands yet
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", marginTop: 4 }}>
                  Click “New Brand” to add one
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}