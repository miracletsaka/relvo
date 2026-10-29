"use client";

import { useCallback, useEffect, useState } from "react";
import { api, C, PRESET_GOALS, type Goal, Card, SectionHeading, TabHeader, LoadingCards, Btn } from "./shared";

export function GoalsTab() {
  const [selected, setSelected] = useState<Goal[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [custom,   setCustom]   = useState("");
  const [adding,   setAdding]   = useState(false);
    const [toast,   setToast]   = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showToast = (ok: boolean, msg: string) => setToast({ type: ok ? "ok" : "err", text: msg });

  const load = useCallback(async () => {
    try { const d = await api<{ presets: string[]; selected: Goal[] }>("/org-profile/campaign-goals"); setSelected(d.selected); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeLabels = new Set(selected.filter(g => g.is_active).map(g => g.label));

  const togglePreset = async (label: string) => {
    const existing = selected.find(g => g.label === label);
    try {
      if (existing) await api(`/org-profile/campaign-goals/${existing.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !existing.is_active }) });
      else          await api("/org-profile/campaign-goals", { method: "POST", body: JSON.stringify({ label }) });
      await load();
    } catch (e: any) { showToast(false, e.message); }
  };

  const addCustom = async () => {
    if (!custom.trim()) return;
    setAdding(true);
    try { await api("/org-profile/campaign-goals", { method: "POST", body: JSON.stringify({ label: custom.trim() }) }); setCustom(""); await load(); showToast(true, "Goal added"); }
    catch (e: any) { showToast(false, e.message); }
    finally { setAdding(false); }
  };

  const remove = async (id: string) => {
    try { await api(`/org-profile/campaign-goals/${id}`, { method: "DELETE" }); await load(); }
    catch (e: any) { showToast(false, e.message); }
  };

  if (loading) return <LoadingCards />;

  return (
    <div>
      <TabHeader title="Campaign Goals" sub="Define what your content campaigns aim to achieve" />
      <Card>
        <SectionHeading title="Preset Goals" sub="Click to toggle" />
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
          {PRESET_GOALS.map(label => {
            const active = activeLabels.has(label);
            return (
              <button key={label} onClick={() => togglePreset(label)}
                style={{ padding: "8px 16px", borderRadius: 20, border: `1px solid ${active ? "rgba(124,58,237,0.5)" : C.border}`, background: active ? "rgba(124,58,237,0.12)" : "transparent", color: active ? C.accent : C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }}>
                {active && <span style={{ fontSize: 10 }}>✓</span>}
                {label}
              </button>
            );
          })}
        </div>
      </Card>
      <Card>
        <SectionHeading title="Custom Goals" sub="Add goals specific to your business" />
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustom()} placeholder="e.g. Trade Show Traffic"
            style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 13px", color: C.text, fontSize: 12, fontFamily: "DM Mono, monospace", outline: "none" }} />
          <Btn onClick={addCustom} loading={adding} disabled={!custom.trim()}>Add</Btn>
        </div>
        {selected.filter(g => !g.is_preset).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
            {selected.filter(g => !g.is_preset).map(g => (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(124,58,237,0.4)", background: "rgba(124,58,237,0.08)", color: C.accent, fontSize: 11, fontWeight: 700, fontFamily: "Syne, sans-serif" }}>
                {g.label}
                <button onClick={() => remove(g.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.5, padding: 0, fontSize: 12 }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
