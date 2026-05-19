"use client";

import { AdminGuard } from "@/components/AdminGuard";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search, X, Check, Loader2, ChevronRight, Sparkles } from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

const DEFAULT_SEGMENTS = ["background", "hero-image", "hero-text", "cta", "footer"];

const EXTRA_SEGMENTS = [
  { key: "features",  label: "Features",  desc: "Benefit blocks and bullet sections" },
  { key: "offer",     label: "Offer",     desc: "Discounts, promotions, pricing hooks" },
  { key: "sponsors",  label: "Sponsors",  desc: "Partner or sponsor logo rows" },
  { key: "contact",   label: "Contact",   desc: "Phone, email, WhatsApp, location" },
  { key: "social",    label: "Social",    desc: "Social handles and profile links" },
  { key: "reviews",   label: "Reviews",   desc: "Testimonials and proof sections" },
  { key: "scene",     label: "Scene",     desc: "Atmospheric hero or visual scene blocks" },
  { key: "header",    label: "Header",    desc: "Top branding/navigation sections" },
];

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...((opts.headers as any) || {}) },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail || json.message || `Error ${res.status}`);
  return json as T;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Tone = {
  id: string;
  name: string;
  label: string;
  description?: string | null;
  emoji?: string | null;
  is_active: boolean;
  sort_order: number;
  segment_types?: string[];
  default_segments?: string[];
  all_segments?: string[];
};

type ToneDraft = {
  name: string;
  label: string;
  description: string;
  emoji: string;
  sort_order: number;
  segment_types: string[];
};

type GeneratedTone = {
  name: string;
  label: string;
  description: string;
  emoji: string;
  suggested_segments: string[];
};

const emptyDraft: ToneDraft = {
  name: "", label: "", description: "", emoji: "✨", sort_order: 0, segment_types: [],
};

// ── Shared class strings ──────────────────────────────────────────────────────

const labelCls = "block text-[9px] font-bold uppercase tracking-[0.15em] text-black/30 mb-1.5";

const inputCls = [
  "w-full text-[12px] font-medium font-[Inter,sans-serif]",
  "bg-white/70 border border-black/[0.08] rounded-[11px]",
  "px-3 py-2.5 text-[#1a1a2e] outline-none",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.04)]",
  "placeholder:text-black/25 placeholder:font-normal",
  "focus:border-[rgba(124,85,246,0.45)] focus:shadow-[0_0_0_3px_rgba(124,85,246,0.1),inset_0_1px_0_rgba(255,255,255,0.95)]",
  "transition-all duration-150",
].join(" ");

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, onClose }: { msg: { type: "ok" | "err"; text: string }; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  const ok = msg.type === "ok";
  return (
    <div className={[
      "fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-[16px] max-w-sm",
      "border font-[Inter,sans-serif] text-[12px] font-bold",
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_32px_rgba(0,0,0,0.1)]",
      ok
        ? "bg-emerald-50 border-emerald-200 text-emerald-600"
        : "bg-red-50 border-red-200 text-red-500",
    ].join(" ")}>
      {ok ? <Check size={13} /> : <X size={13} />}
      <span className="flex-1">{msg.text}</span>
      <button onClick={onClose} className="opacity-40 hover:opacity-70 cursor-pointer transition-opacity">
        <X size={12} />
      </button>
    </div>
  );
}

// ── Segment selector ──────────────────────────────────────────────────────────

function SegmentSelector({ selected, onChange }: { selected: string[]; onChange: (next: string[]) => void }) {
  const selectedSet = new Set(selected);

  const toggle = (key: string) => {
    if (selectedSet.has(key)) onChange(selected.filter((s) => s !== key));
    else onChange([...selected, key]);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Default (always on) */}
      <div>
        <p className={labelCls}>Always included</p>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_SEGMENTS.map((s) => (
            <span key={s} className="text-[9px] font-mono px-2 py-1 rounded-full bg-white/60 border border-black/[0.07] text-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Extra segments */}
      <div>
        <p className={labelCls}>Extra segments</p>
        <div className="grid grid-cols-2 gap-1.5">
          {EXTRA_SEGMENTS.map((seg) => {
            const active = selectedSet.has(seg.key);
            return (
              <button
                key={seg.key}
                type="button"
                onClick={() => toggle(seg.key)}
                className={[
                  "text-left p-2.5 rounded-[11px] border cursor-pointer transition-all duration-150",
                  active
                    ? "bg-[rgba(124,85,246,0.08)] border-[rgba(124,85,246,0.32)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    : "bg-white/40 border-black/[0.06] hover:bg-white/70 hover:border-black/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
                ].join(" ")}
              >
                <div className="flex items-center gap-1.5">
                  <span className={[
                    "w-3.5 h-3.5 rounded-[4px] border flex-shrink-0 grid place-items-center transition-all",
                    active
                      ? "bg-[#7c55f6] border-[#7c55f6] text-white"
                      : "bg-white/60 border-black/[0.12]",
                  ].join(" ")}>
                    {active && <Check size={9} />}
                  </span>
                  <span className={`text-[11px] font-bold ${active ? "text-[#4c2db8]" : "text-black/55"}`}>
                    {seg.label}
                  </span>
                </div>
                <p className="text-[9.5px] text-black/30 font-medium mt-1 ml-5 leading-snug">{seg.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Tone Builder Drawer ───────────────────────────────────────────────────────

function ToneDrawer({
  initial, onSave, onClose, saving,
}: {
  initial?: Tone | null;
  onSave: (payload: ToneDraft) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const isEdit = !!initial?.id;
  const [idea, setIdea] = useState("");
  const [draft, setDraft] = useState<ToneDraft>(() => ({
    ...emptyDraft,
    name:          initial?.name        || "",
    label:         initial?.label       || "",
    description:   initial?.description || "",
    emoji:         initial?.emoji       || "✨",
    sort_order:    initial?.sort_order  || 0,
    segment_types: initial?.segment_types || [],
  }));
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState("");

  const set = (key: keyof ToneDraft, val: any) =>
    setDraft((prev) => ({ ...prev, [key]: val }));

  const generateTone = async () => {
    if (!idea.trim()) { setErr("Describe the tone you want first."); return; }
    setGenerating(true); setErr("");
    try {
      const generated = await apiFetch<GeneratedTone>("/tones/generate", {
        method: "POST", body: JSON.stringify({ idea }),
      });
      setDraft((prev) => ({
        ...prev,
        name:          generated.name              || prev.name,
        label:         generated.label             || prev.label,
        description:   generated.description       || prev.description,
        emoji:         generated.emoji             || prev.emoji || "✨",
        segment_types: generated.suggested_segments || prev.segment_types,
      }));
    } catch (e: any) { setErr(e.message || "Tone generation failed"); }
    finally { setGenerating(false); }
  };

  const save = async () => {
    if (!draft.name.trim())  { setErr("Name is required."); return; }
    if (!draft.label.trim()) { setErr("Label is required."); return; }
    setErr("");
    await onSave(draft);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/15 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col tone-drawer">
        <style>{`
          .tone-drawer {
            background: rgba(248,248,250,0.97);
            backdrop-filter: blur(40px) saturate(180%);
            -webkit-backdrop-filter: blur(40px) saturate(180%);
            border-left: 1px solid rgba(255,255,255,0.9);
            box-shadow: -8px 0 40px rgba(0,0,0,0.1), inset 1px 0 0 rgba(255,255,255,0.8);
            animation: tone-slidein 0.22s cubic-bezier(0.32,0.72,0,1);
          }
          @keyframes tone-slidein {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
          .tone-scroll::-webkit-scrollbar { width: 3px; }
          .tone-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06] flex-shrink-0 bg-white/40">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/28 mb-0.5">
              {isEdit ? "Editing Tone" : "New Tone"}
            </p>
            <p className="text-[14px] font-extrabold text-[#1a1a2e] tracking-[-0.01em]">
              {isEdit ? initial?.label : "Create with AI"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[11px] bg-white/70 border border-black/[0.08] text-black/35 hover:text-black/60 hover:bg-white/90 transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 tone-scroll">

          {/* AI idea (create only) */}
          {!isEdit && (
            <div className="p-3.5 rounded-[14px] bg-[rgba(124,85,246,0.05)] border border-[rgba(124,85,246,0.15)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <p className={labelCls}>Describe the tone</p>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={3}
                placeholder="Example: Luxury but friendly tone for premium service brands. Polished, confident and human."
                className={`${inputCls} resize-none leading-relaxed mb-2.5`}
              />
              <button
                onClick={generateTone}
                disabled={generating}
                className={[
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-[13px] text-[12px] font-bold cursor-pointer transition-all duration-150",
                  "border border-[rgba(168,85,247,0.45)] bg-[rgba(168,85,247,0.18)] text-[#5b21b6]",
                  "shadow-[0_2px_14px_rgba(168,85,247,0.18),inset_0_1px_0_rgba(255,255,255,0.5)]",
                  "hover:bg-[rgba(168,85,247,0.28)] hover:border-[rgba(168,85,247,0.6)] hover:-translate-y-px",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none",
                ].join(" ")}
              >
                {generating
                  ? <><Loader2 size={13} className="animate-spin" />Generating…</>
                  : <><Sparkles size={13} />Generate AI Tone</>
                }
              </button>
            </div>
          )}

          {/* Fields */}
          <div className="rounded-[14px] bg-white/55 border border-black/[0.06] p-3.5 flex flex-col gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/25">Tone Details</p>

            {/* Emoji + Label + Order */}
            <div className="grid grid-cols-[72px_1fr_64px] gap-2">
              <div>
                <label className={labelCls}>Emoji</label>
                <input
                  value={draft.emoji}
                  onChange={(e) => set("emoji", e.target.value)}
                  className={`${inputCls} text-center text-lg`}
                />
              </div>
              <div>
                <label className={labelCls}>Label</label>
                <input
                  value={draft.label}
                  onChange={(e) => set("label", e.target.value)}
                  placeholder="Luxury Friendly"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Order</label>
                <input
                  type="number"
                  value={draft.sort_order}
                  onChange={(e) => set("sort_order", Number(e.target.value || 0))}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Slug */}
            <div>
              <label className={labelCls}>Slug / Name</label>
              <input
                value={draft.name}
                disabled={isEdit}
                onChange={(e) => set("name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                placeholder="luxury_friendly"
                className={`${inputCls} font-mono ${isEdit ? "opacity-40 cursor-not-allowed" : ""}`}
              />
              <p className="text-[9px] text-black/25 font-medium mt-1 font-[Inter,sans-serif]">
                Lowercase slug used internally. Cannot be changed after creation.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>AI Instruction</label>
              <textarea
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Use premium, polished language while staying warm and practical…"
                className={`${inputCls} resize-none leading-relaxed`}
              />
            </div>
          </div>

          {/* Segments */}
          <div className="rounded-[14px] bg-white/55 border border-black/[0.06] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/25 mb-3">Design Segments</p>
            <SegmentSelector
              selected={draft.segment_types}
              onChange={(segment_types) => set("segment_types", segment_types)}
            />
          </div>

          {/* Error */}
          {err && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-[11px] bg-red-50 border border-red-200 text-[11px] text-red-500 font-medium font-[Inter,sans-serif]">
              <X size={12} className="flex-shrink-0 mt-px" />
              {err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-3.5 border-t border-black/[0.06] flex gap-2 bg-white/30">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-[14px] text-[12px] font-bold bg-white/60 border border-black/[0.08] text-black/40 hover:bg-white/90 hover:text-black/60 cursor-pointer transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] font-[Inter,sans-serif]"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || generating}
            className={[
              "flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-[12px] font-bold cursor-pointer transition-all font-[Inter,sans-serif]",
              "border border-[rgba(168,85,247,0.45)] bg-[rgba(168,85,247,0.18)] text-[#5b21b6]",
              "shadow-[0_2px_14px_rgba(168,85,247,0.18),inset_0_1px_0_rgba(255,255,255,0.5)]",
              "hover:bg-[rgba(168,85,247,0.28)] hover:border-[rgba(168,85,247,0.6)] hover:-translate-y-px",
              "disabled:opacity-35 disabled:cursor-not-allowed disabled:transform-none",
            ].join(" ")}
          >
            {saving
              ? <><Loader2 size={13} className="animate-spin" />Saving…</>
              : <><Check size={13} />{isEdit ? "Save Changes" : "Create Tone"}</>
            }
          </button>
        </div>
      </div>
    </>
  );
}

// ── ToneCard ──────────────────────────────────────────────────────────────────

function ToneCard({
  tone, idx, onToggle, onDelete, onEdit,
}: {
  tone: Tone; idx: number; onToggle: () => void; onDelete: () => void; onEdit: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className={[
        "rounded-[18px] bg-white/65 border border-black/[0.07] p-4",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_10px_rgba(0,0,0,0.05)]",
        "flex items-start gap-3 transition-all duration-150",
        !tone.is_active ? "opacity-50" : "hover:bg-white/85 hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_4px_16px_rgba(0,0,0,0.07)]",
      ].join(" ")}
      style={{ animation: `tone-fadein 0.3s ease ${idx * 0.04}s both` }}
    >
      {/* Emoji block */}
      <div className="w-11 h-11 rounded-[13px] bg-white/80 border border-black/[0.08] flex items-center justify-center text-xl flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_4px_rgba(0,0,0,0.05)]">
        {tone.emoji || "🎨"}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[14px] font-extrabold text-[#1a1a2e] tracking-[-0.01em]">{tone.label}</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[6px] bg-[rgba(124,85,246,0.08)] border border-[rgba(124,85,246,0.2)] text-[rgba(124,85,246,0.7)]">
            {tone.name}
          </span>
          {!tone.is_active && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[6px] bg-black/[0.05] border border-black/[0.08] text-black/30">
              inactive
            </span>
          )}
        </div>

        {tone.description && (
          <p className="text-[11.5px] text-black/40 font-medium leading-relaxed mb-2 line-clamp-2">
            {tone.description}
          </p>
        )}

        {/* Segment chips */}
        <div className="flex flex-wrap gap-1">
          {(tone.default_segments || DEFAULT_SEGMENTS).map((s) => (
            <span key={s} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/60 border border-black/[0.07] text-black/35">
              {s}
            </span>
          ))}
          {(tone.segment_types || []).map((s) => (
            <span key={s} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[rgba(124,85,246,0.08)] border border-[rgba(124,85,246,0.22)] text-[rgba(124,85,246,0.65)]">
              + {s}
            </span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Toggle */}
        <button
          onClick={onToggle}
          title={tone.is_active ? "Deactivate" : "Activate"}
          className="cursor-pointer p-1"
        >
          <div className={[
            "w-9 h-[20px] rounded-full border relative transition-all duration-200",
            tone.is_active
              ? "bg-emerald-50 border-emerald-200"
              : "bg-black/[0.07] border-black/[0.1]",
          ].join(" ")}>
            <div className={[
              "absolute top-[3px] w-3.5 h-3.5 rounded-full transition-all duration-200",
              tone.is_active
                ? "left-[18px] bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"
                : "left-[3px] bg-black/20",
            ].join(" ")} />
          </div>
        </button>

        {/* Edit */}
        <button
          onClick={onEdit}
          className="px-3 py-1.5 rounded-[10px] text-[11px] font-bold bg-white/70 border border-black/[0.08] text-black/45 hover:bg-white/95 hover:text-black/65 cursor-pointer transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] font-[Inter,sans-serif]"
        >
          Edit
        </button>

        {/* Delete */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-7 h-7 flex items-center justify-center rounded-[9px] bg-white/60 border border-black/[0.07] text-black/25 hover:bg-red-50 hover:border-red-200 hover:text-red-400 cursor-pointer transition-all"
          >
            <X size={12} />
          </button>
        ) : (
          <div className="flex gap-1">
            <button
              onClick={onDelete}
              className="px-2.5 py-1.5 rounded-[9px] bg-red-50 border border-red-200 text-red-500 text-[11px] font-bold hover:bg-red-100 cursor-pointer transition-all font-[Inter,sans-serif]"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2.5 py-1.5 rounded-[9px] bg-white/70 border border-black/[0.08] text-black/40 text-[11px] font-bold hover:bg-white/95 cursor-pointer transition-all font-[Inter,sans-serif]"
            >
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TonesPage() {
  const [tones,       setTones]       = useState<Tone[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [editTone,    setEditTone]    = useState<Tone | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [activeOnly,  setActiveOnly]  = useState(false);
  const [search,      setSearch]      = useState("");

  const showToast = (type: "ok" | "err", text: string) => setToast({ type, text });

  const load = useCallback(async () => {
    setLoading(true);
    try { setTones(await apiFetch<Tone[]>("/tones?active_only=false")); }
    catch (e: any) { showToast("err", e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async (payload: ToneDraft) => {
    setSaving(true);
    try {
      await apiFetch("/tones", { method: "POST", body: JSON.stringify({ ...payload, is_active: true }) });
      await load(); setDrawerOpen(false); showToast("ok", `Tone "${payload.label}" created`);
    } catch (e: any) { showToast("err", e.message); throw e; }
    finally { setSaving(false); }
  };

  const handleEdit = async (payload: ToneDraft) => {
    if (!editTone) return;
    setSaving(true);
    try {
      await apiFetch(`/tones/${editTone.id}`, { method: "PATCH", body: JSON.stringify({ label: payload.label, description: payload.description || null, emoji: payload.emoji || null, sort_order: payload.sort_order, segment_types: payload.segment_types }) });
      await load(); setEditTone(null); showToast("ok", "Tone updated");
    } catch (e: any) { showToast("err", e.message); throw e; }
    finally { setSaving(false); }
  };

  const handleToggle = async (tone: Tone) => {
    try { await apiFetch(`/tones/${tone.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !tone.is_active }) }); await load(); }
    catch (e: any) { showToast("err", e.message); }
  };

  const handleDelete = async (tone: Tone) => {
    try { await apiFetch(`/tones/${tone.id}`, { method: "DELETE" }); await load(); showToast("ok", `"${tone.label}" deleted`); }
    catch (e: any) { showToast("err", e.message); }
  };

  const filtered = useMemo(() => tones
    .filter((t) => !activeOnly || t.is_active)
    .filter((t) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return t.label.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || String(t.description || "").toLowerCase().includes(q);
    }),
    [tones, activeOnly, search],
  );

  const active   = filtered.filter((t) =>  t.is_active);
  const inactive = filtered.filter((t) => !t.is_active);

  return (
    <AdminGuard>
      <style>{`
        @keyframes tone-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      <div
        className="min-h-screen font-[Inter,sans-serif]"
        style={{ background: "#f4f4f6" }}
      >
        {/* Dot-grid texture */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(124,85,246,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(124,85,246,0.025) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative max-w-3xl mx-auto px-6 py-10">

          {/* ── Header ── */}
          <div className="mb-7">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/28 mb-2">
              Content Intelligence
            </p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-[#1a1a2e] leading-none">
                  Tones
                </h1>
                <p className="text-[11.5px] text-black/35 font-medium mt-1 max-w-lg leading-relaxed">
                  AI-generated tone profiles that control voice, language and design segments.
                  Default segments are always included.
                </p>
              </div>
              <button
                onClick={() => { setEditTone(null); setDrawerOpen(true); }}
                className={[
                  "flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-[16px] text-[12px] font-bold cursor-pointer transition-all duration-150 font-[Inter,sans-serif]",
                  "border border-[rgba(168,85,247,0.45)] bg-[rgba(168,85,247,0.18)] text-[#5b21b6]",
                  "shadow-[0_2px_14px_rgba(168,85,247,0.2),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.08)]",
                  "hover:bg-[rgba(168,85,247,0.28)] hover:border-[rgba(168,85,247,0.65)] hover:-translate-y-px",
                ].join(" ")}
              >
                <Plus size={14} /> New Tone
              </button>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/25 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tones…"
                className={[
                  "w-full pl-8 pr-3 py-2.5 text-[12px] font-medium font-[Inter,sans-serif]",
                  "bg-white/70 border border-black/[0.08] rounded-[13px] text-[#1a1a2e] outline-none",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] placeholder:text-black/25",
                  "focus:border-[rgba(124,85,246,0.45)] focus:shadow-[0_0_0_3px_rgba(124,85,246,0.1),inset_0_1px_0_rgba(255,255,255,0.95)]",
                  "transition-all duration-150",
                ].join(" ")}
              />
            </div>

            {/* Active filter */}
            <button
              onClick={() => setActiveOnly((v) => !v)}
              className={[
                "inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[13px] text-[11px] font-bold cursor-pointer transition-all border font-[Inter,sans-serif]",
                activeOnly
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                  : "bg-white/60 border-black/[0.08] text-black/40 hover:bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
              ].join(" ")}
            >
              <Check size={11} className={activeOnly ? "text-emerald-500" : "text-black/25"} />
              Active only
            </button>

            {/* Refresh */}
            <button
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[13px] text-[11px] font-bold bg-white/60 border border-black/[0.08] text-black/40 hover:bg-white/90 cursor-pointer transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] disabled:opacity-40 font-[Inter,sans-serif]"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {/* ── Skeleton ── */}
          {loading && tones.length === 0 && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-[18px] bg-white/40 border border-black/[0.06] animate-pulse" />
              ))}
            </div>
          )}

          {/* ── Active tones ── */}
          {!loading && active.length > 0 && (
            <section className="mb-6">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-500/60 mb-2.5">
                Active · {active.length}
              </p>
              <div className="flex flex-col gap-2.5">
                {active.map((t, i) => (
                  <ToneCard
                    key={t.id} tone={t} idx={i}
                    onToggle={() => handleToggle(t)}
                    onDelete={() => handleDelete(t)}
                    onEdit={() => { setDrawerOpen(false); setEditTone(t); }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Inactive tones ── */}
          {!loading && inactive.length > 0 && !activeOnly && (
            <section>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/25 mb-2.5">
                Inactive · {inactive.length}
              </p>
              <div className="flex flex-col gap-2.5">
                {inactive.map((t, i) => (
                  <ToneCard
                    key={t.id} tone={t} idx={i}
                    onToggle={() => handleToggle(t)}
                    onDelete={() => handleDelete(t)}
                    onEdit={() => { setDrawerOpen(false); setEditTone(t); }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Empty state ── */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-[20px] bg-white/70 border border-black/[0.07] flex items-center justify-center text-2xl mb-4 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_10px_rgba(0,0,0,0.05)]">
                🎨
              </div>
              <p className="text-[13px] font-bold text-black/30">
                {search ? "No tones match your search" : "No tones yet"}
              </p>
              <p className="text-[11px] text-black/20 font-medium mt-1">
                {search ? "Try a different term" : "Click New Tone to get started"}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* ── Drawer (create) ── */}
      {drawerOpen && !editTone && (
        <ToneDrawer
          onSave={handleCreate}
          onClose={() => setDrawerOpen(false)}
          saving={saving}
        />
      )}

      {/* ── Drawer (edit) ── */}
      {editTone && (
        <ToneDrawer
          initial={editTone}
          onSave={handleEdit}
          onClose={() => setEditTone(null)}
          saving={saving}
        />
      )}

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </AdminGuard>
  );
}