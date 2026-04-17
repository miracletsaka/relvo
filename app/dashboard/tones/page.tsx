"use client";
/**
 * app/dashboard/tones/page.tsx
 * ─────────────────────────────
 * Global tone management page.
 * Tones are used when generating content drafts.
 */

import { useEffect, useState, useCallback } from "react";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

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
  description?: string;
  emoji?: string;
  is_active: boolean;
  sort_order: number;
};

// ── Preset emoji suggestions ──────────────────────────────────────────────────
const EMOJI_SUGGESTIONS = ["📰","📣","🚨","💼","📢","🎓","✨","🏷️","🎭","⭐","🎬","❓","💡","🗞️","📖","🔥","💬","🌟","🎯","📊"];

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, onClose }: { msg: { type: "ok" | "err"; text: string }; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  const ok = msg.type === "ok";
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", background: ok ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.12)", border: `1px solid ${ok ? "rgba(52,211,153,0.35)" : "rgba(239,68,68,0.35)"}`, borderRadius: 14, color: ok ? "#34d399" : "#f87171", fontSize: 12, fontWeight: 700, fontFamily: "Syne, sans-serif", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", animation: "tn-fade 0.3s ease", maxWidth: 340 }}>
      <span>{ok ? "✓" : "✕"}</span>
      <span style={{ flex: 1 }}>{msg.text}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.5, fontSize: 14 }}>✕</button>
    </div>
  );
}

// ── Tone card ─────────────────────────────────────────────────────────────────
function ToneCard({
  tone, idx, onToggle, onDelete, onEdit,
}: {
  tone: Tone; idx: number; onToggle: () => void; onDelete: () => void; onEdit: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); setConfirmDelete(false); }
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: `1px solid ${tone.is_active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
      borderRadius: 16, padding: "16px 18px",
      display: "flex", alignItems: "flex-start", gap: 14,
      opacity: tone.is_active ? 1 : 0.5,
      transition: "all 0.2s",
      animation: `tn-fade 0.3s ease ${idx * 0.04}s both`,
    }}>
      {/* Emoji */}
      <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
        {tone.emoji || "🎨"}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", fontFamily: "Syne, sans-serif" }}>{tone.label}</span>
          <span style={{ fontSize: 9, fontFamily: "DM Mono, monospace", color: "rgba(129,140,248,0.7)", background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)", padding: "1px 7px", borderRadius: 6, letterSpacing: "0.06em" }}>{tone.name}</span>
          {!tone.is_active && <span style={{ fontSize: 9, fontFamily: "DM Mono, monospace", color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "1px 7px", borderRadius: 6 }}>inactive</span>}
        </div>
        {tone.description && (
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.6 }}>{tone.description}</p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {/* Toggle */}
        <button onClick={onToggle} title={tone.is_active ? "Deactivate" : "Activate"}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
          <div style={{ width: 34, height: 19, borderRadius: 10, background: tone.is_active ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${tone.is_active ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)"}`, position: "relative", transition: "all 0.2s" }}>
            <div style={{ position: "absolute", top: 2, left: tone.is_active ? 16 : 2, width: 13, height: 13, borderRadius: "50%", background: tone.is_active ? "#34d399" : "rgba(255,255,255,0.2)", transition: "left 0.2s" }} />
          </div>
        </button>

        {/* Edit */}
        <button onClick={onEdit}
          style={{ padding: "5px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 9, color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", transition: "all 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f1f5f9"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.09)"; }}>
          Edit
        </button>

        {/* Delete */}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            style={{ padding: "5px 8px", background: "none", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, color: "rgba(255,255,255,0.2)", fontSize: 10, cursor: "pointer", fontFamily: "Syne, sans-serif", transition: "all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.3)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; }}>
            ✕
          </button>
        ) : (
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={handleDelete} disabled={deleting}
              style={{ padding: "5px 10px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 9, color: "#f87171", fontSize: 10, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", fontFamily: "Syne, sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
              {deleting && <span style={{ width: 9, height: 9, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#f87171", borderRadius: "50%", display: "inline-block", animation: "tn-spin 0.6s linear infinite" }} />}
              Yes
            </button>
            <button onClick={() => setConfirmDelete(false)}
              style={{ padding: "5px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 9, color: "rgba(255,255,255,0.4)", fontSize: 10, cursor: "pointer" }}>
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Create / Edit drawer ──────────────────────────────────────────────────────
function ToneForm({
  initial, onSave, onCancel, saving,
}: {
  initial?: Partial<Tone>;
  onSave: (payload: any) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name,        setName]        = useState(initial?.name        || "");
  const [label,       setLabel]       = useState(initial?.label       || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [emoji,       setEmoji]       = useState(initial?.emoji       || "");
  const [sortOrder,   setSortOrder]   = useState(String(initial?.sort_order ?? 0));
  const [err,         setErr]         = useState<string | null>(null);

  const isEdit = !!initial?.id;

  const submit = async () => {
    if (!label.trim()) { setErr("Label is required"); return; }
    if (!isEdit && !name.trim()) { setErr("Name is required"); return; }
    setErr(null);
    try {
      await onSave({
        ...(!isEdit ? { name: name.trim() } : {}),
        label: label.trim(),
        description: description.trim() || null,
        emoji: emoji.trim() || null,
        sort_order: parseInt(sortOrder) || 0,
      });
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const inpStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 11, padding: "10px 13px",
    color: "#f1f5f9", fontSize: 12,
    fontFamily: "DM Mono, monospace", outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ background: "rgba(129,140,248,0.05)", border: "1px solid rgba(129,140,248,0.2)", borderRadius: 18, padding: "22px 24px", marginBottom: 20, animation: "tn-fade 0.25s ease" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#f1f5f9", fontFamily: "Syne, sans-serif", marginBottom: 18 }}>
        {isEdit ? `Edit — ${initial?.label}` : "New Tone"}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {!isEdit && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", marginBottom: 6 }}>Name (slug) *</div>
            <input value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} placeholder="e.g. my_tone" style={inpStyle}
              onFocus={e => e.target.style.borderColor = "rgba(129,140,248,0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 4, fontFamily: "DM Mono, monospace" }}>Lowercase, underscores only. Cannot be changed later.</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", marginBottom: 6 }}>Label *</div>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Informative" style={inpStyle}
            onFocus={e => e.target.style.borderColor = "rgba(129,140,248,0.5)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", marginBottom: 6 }}>Sort Order</div>
          <input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} placeholder="0" style={inpStyle}
            onFocus={e => e.target.style.borderColor = "rgba(129,140,248,0.5)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
        </div>
      </div>

      {/* Emoji picker */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", marginBottom: 6 }}>Emoji</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🎨" style={{ ...inpStyle, width: 70, textAlign: "center", fontSize: 18 }}
            onFocus={e => e.target.style.borderColor = "rgba(129,140,248,0.5)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
          {EMOJI_SUGGESTIONS.map(em => (
            <button key={em} onClick={() => setEmoji(em)} type="button"
              style={{ fontSize: 18, background: emoji === em ? "rgba(129,140,248,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${emoji === em ? "rgba(129,140,248,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 8, padding: "4px 6px", cursor: "pointer", transition: "all 0.1s" }}>
              {em}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono, monospace", marginBottom: 6 }}>
          AI Prompt Instruction
        </div>
        <textarea
          value={description} onChange={e => setDescription(e.target.value)} rows={3}
          placeholder="Describe the writing style this tone uses. This text is injected into the AI prompt when this tone is selected."
          style={{ ...inpStyle, resize: "vertical", lineHeight: 1.6 }}
          onFocus={e => e.target.style.borderColor = "rgba(129,140,248,0.5)"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
        />
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 4, fontFamily: "DM Mono, monospace" }}>
          This description becomes part of the AI system prompt — write it as an instruction.
        </div>
      </div>

      {err && (
        <div style={{ marginBottom: 12, padding: "9px 13px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, fontSize: 11, color: "#fca5a5" }}>{err}</div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={submit} disabled={saving}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 20px", background: saving ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#818cf8,#6366f1)", border: "none", borderRadius: 11, color: "#fff", fontSize: 12, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", fontFamily: "Syne, sans-serif", boxShadow: saving ? "none" : "0 4px 16px rgba(99,102,241,0.3)" }}>
          {saving && <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "tn-spin 0.7s linear infinite" }} />}
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Tone"}
        </button>
        <button onClick={onCancel}
          style={{ padding: "9px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 11, color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TonesPage() {
  const [tones,      setTones]      = useState<Tone[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editTone,   setEditTone]   = useState<Tone | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);
  const [search,     setSearch]     = useState("");

  const showToast = (type: "ok" | "err", text: string) => setToast({ type, text });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Tone[]>(`/tones?active_only=false`);
      setTones(data);
    } catch (e: any) {
      showToast("err", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (payload: any) => {
    setSaving(true);
    try {
      await apiFetch("/tones", { method: "POST", body: JSON.stringify(payload) });
      await load();
      setShowForm(false);
      showToast("ok", `Tone "${payload.label}" created`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (payload: any) => {
    if (!editTone) return;
    setSaving(true);
    try {
      await apiFetch(`/tones/${editTone.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      await load();
      setEditTone(null);
      showToast("ok", "Tone updated");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (tone: Tone) => {
    try {
      await apiFetch(`/tones/${tone.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !tone.is_active }) });
      await load();
    } catch (e: any) {
      showToast("err", e.message);
    }
  };

  const handleDelete = async (tone: Tone) => {
    try {
      await apiFetch(`/tones/${tone.id}`, { method: "DELETE" });
      await load();
      showToast("ok", `"${tone.label}" deleted`);
    } catch (e: any) {
      showToast("err", e.message);
    }
  };

  const filtered = tones
    .filter(t => !activeOnly || t.is_active)
    .filter(t => !search.trim() || t.label.toLowerCase().includes(search.toLowerCase()) || t.name.toLowerCase().includes(search.toLowerCase()));

  const active   = filtered.filter(t => t.is_active);
  const inactive = filtered.filter(t => !t.is_active);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .tn-root { font-family: 'Syne', sans-serif; background: #080810; min-height: 100vh; color: #f1f5f9; padding: 28px 24px; }
        .tn-root * { box-sizing: border-box; }
        @keyframes tn-spin  { to { transform: rotate(360deg); } }
        @keyframes tn-fade  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .tn-search:focus    { border-color: rgba(129,140,248,0.5) !important; outline: none; }
        select option       { background: #1a1a2e; color: #f1f5f9; }
      `}</style>

      <div className="tn-root">

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(129,140,248,0.6)", marginBottom: 4, fontFamily: "DM Mono, monospace" }}>
            Relvō · Content
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", margin: "0 0 6px", letterSpacing: "-0.02em" }}>Tones</h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0 }}>
            {tones.length} tone{tones.length !== 1 ? "s" : ""} · {tones.filter(t => t.is_active).length} active · used when generating content drafts
          </p>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "rgba(255,255,255,0.2)", pointerEvents: "none" }}>🔍</span>
            <input
              className="tn-search"
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tones…"
              style={{ width: "100%", paddingLeft: 34, padding: "9px 12px 9px 34px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 11, color: "#f1f5f9", fontSize: 12, fontFamily: "DM Mono, monospace", transition: "border-color 0.15s" }}
            />
          </div>

          {/* Active only toggle */}
          <button onClick={() => setActiveOnly(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", background: activeOnly ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${activeOnly ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.09)"}`, borderRadius: 11, color: activeOnly ? "#34d399" : "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", transition: "all 0.15s" }}>
            <span style={{ fontSize: 13 }}>✓</span> Active only
          </button>

          {/* Refresh */}
          <button onClick={() => load()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 11, color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", transition: "all 0.15s" }}>
            <span style={{ display: "inline-block", animation: loading ? "tn-spin 0.7s linear infinite" : "none", fontSize: 13 }}>↻</span>
            {loading ? "Loading…" : "Refresh"}
          </button>

          {/* New tone */}
          <button onClick={() => { setEditTone(null); setShowForm(v => !v); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "linear-gradient(135deg,#818cf8,#6366f1)", border: "none", borderRadius: 11, color: "#fff", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "Syne, sans-serif", boxShadow: "0 4px 16px rgba(99,102,241,0.3)", transition: "all 0.15s" }}>
            + New Tone
          </button>
        </div>

        {/* Create form */}
        {showForm && !editTone && (
          <ToneForm
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        )}

        {/* Edit form */}
        {editTone && (
          <ToneForm
            initial={editTone}
            onSave={handleEdit}
            onCancel={() => setEditTone(null)}
            saving={saving}
          />
        )}

        {/* Loading skeletons */}
        {loading && tones.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 80, borderRadius: 16, background: "rgba(255,255,255,0.04)", animation: `tn-fade 1.3s ease ${i * 0.1}s infinite alternate` }} />
            ))}
          </div>
        )}

        {/* Active tones */}
        {!loading && active.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(52,211,153,0.5)", fontFamily: "DM Mono, monospace", marginBottom: 10 }}>
              Active · {active.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {active.map((tone, i) => (
                <ToneCard
                  key={tone.id} tone={tone} idx={i}
                  onToggle={() => handleToggle(tone)}
                  onDelete={() => handleDelete(tone)}
                  onEdit={() => { setShowForm(false); setEditTone(tone); }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Inactive tones */}
        {!loading && inactive.length > 0 && !activeOnly && (
          <section>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono, monospace", marginBottom: 10 }}>
              Inactive · {inactive.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {inactive.map((tone, i) => (
                <ToneCard
                  key={tone.id} tone={tone} idx={i}
                  onToggle={() => handleToggle(tone)}
                  onDelete={() => handleDelete(tone)}
                  onEdit={() => { setShowForm(false); setEditTone(tone); }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.2)" }}>
              {search ? "No tones match your search" : "No tones yet"}
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", marginTop: 4 }}>
              {search ? "Try a different search term" : "Click \"New Tone\" to create your first one"}
            </p>
          </div>
        )}
      </div>

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </>
  );
}