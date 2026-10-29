"use client";

import { useCallback, useEffect, useState } from "react";
import { api, C, type Offer, Card, SectionHeading, TabHeader, EmptyState, LoadingCards, Inp, Textarea, Btn, Toggle, Badge } from "./shared";

export function OffersTab({ toast }: { toast: (ok: boolean, msg: string) => void }) {
  const [items,    setItems]    = useState<Offer[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ title: "", description: "", cta_text: "", cta_url: "", expires_at: "" });
  const [adding,   setAdding]   = useState(false);

  const load = useCallback(async () => {
    try { setItems(await api<Offer[]>("/org-profile/offers")); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.title.trim()) return;
    setAdding(true);
    try {
      await api("/org-profile/offers", { method: "POST", body: JSON.stringify({ title: form.title, description: form.description || null, cta_text: form.cta_text || null, cta_url: form.cta_url || null, expires_at: form.expires_at || null }) });
      setForm({ title: "", description: "", cta_text: "", cta_url: "", expires_at: "" }); setShowForm(false); await load(); toast(true, "Offer added");
    } catch (e: any) { toast(false, e.message); }
    finally { setAdding(false); }
  };

  const toggle = async (item: Offer) => {
    try { await api(`/org-profile/offers/${item.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !item.is_active }) }); await load(); }
    catch (e: any) { toast(false, e.message); }
  };

  const remove = async (id: string) => {
    try { await api(`/org-profile/offers/${id}`, { method: "DELETE" }); await load(); toast(true, "Removed"); }
    catch (e: any) { toast(false, e.message); }
  };

  if (loading) return <LoadingCards />;

  return (
    <div>
      <TabHeader title="Offers" sub={`${items.filter(o => o.is_active).length} active`} onAdd={() => setShowForm(v => !v)} />
      {showForm && (
        <Card style={{ border: "1px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.04)" }}>
          <SectionHeading title="New Offer" />
          <Inp label="Title *" value={form.title} onChange={(v: string) => setForm(f => ({ ...f, title: v }))} placeholder="20% Off This Month" />
          <Textarea label="Description" value={form.description} onChange={(v: string) => setForm(f => ({ ...f, description: v }))} placeholder="Tell customers about the offer…" rows={2} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="CTA Text" value={form.cta_text} onChange={(v: string) => setForm(f => ({ ...f, cta_text: v }))} placeholder="Book Now" />
            <Inp label="CTA URL"  value={form.cta_url}  onChange={(v: string) => setForm(f => ({ ...f, cta_url:  v }))} placeholder="https://…" />
          </div>
          <Inp label="Expires" type="date" value={form.expires_at} onChange={(v: string) => setForm(f => ({ ...f, expires_at: v }))} />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={add} loading={adding} disabled={!form.title.trim()}>Add Offer</Btn>
            <Btn onClick={() => setShowForm(false)} variant="ghost">Cancel</Btn>
          </div>
        </Card>
      )}
      {items.length === 0 ? <EmptyState icon="🎁" text="No offers yet" /> : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
          {items.map(o => (
            <Card key={o.id} style={{ opacity: o.is_active ? 1 : 0.5 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{o.title}</span>
                    {o.is_active ? <Badge label="Active" color={C.green} /> : <Badge label="Inactive" color={C.dim} />}
                    {o.expires_at && <Badge label={`Expires ${o.expires_at}`} color={C.yellow} />}
                  </div>
                  {o.description && <p style={{ fontSize: 11, color: C.muted, margin: "0 0 6px", lineHeight: 1.5 }}>{o.description}</p>}
                  {o.cta_text && <span style={{ fontSize: 10, color: C.accent, fontFamily: "DM Mono, monospace" }}>CTA: {o.cta_text}{o.cta_url ? ` → ${o.cta_url}` : ""}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <Toggle value={o.is_active} onChange={() => toggle(o)} />
                  <Btn onClick={() => remove(o.id)} variant="danger" small>Remove</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
