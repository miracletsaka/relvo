"use client";

/**
 * org-profile-tabs/SponsorsTab.tsx
 */
import { useCallback, useEffect, useState } from "react";
import { api, C, type Sponsor, Card, SectionHeading, TabHeader, EmptyState, LoadingCards, Inp, Btn, Toggle, ImageInput } from "./shared";

export function SponsorsTab({ toast }: { toast: (ok: boolean, msg: string) => void }) {
  const [items,    setItems]    = useState<Sponsor[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState({ name: "", logo_url: "", website: "" });
  const [adding,   setAdding]   = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await api<Sponsor[]>("/org-profile/sponsors")); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.name.trim()) return;
    setAdding(true);
    try {
      await api("/org-profile/sponsors", { method: "POST", body: JSON.stringify({ name: form.name, logo_url: form.logo_url || null, website: form.website || null }) });
      setForm({ name: "", logo_url: "", website: "" }); setShowForm(false); await load(); toast(true, "Sponsor added");
    } catch (e: any) { toast(false, e.message); }
    finally { setAdding(false); }
  };

  const toggle = async (item: Sponsor) => {
    try { await api(`/org-profile/sponsors/${item.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !item.is_active }) }); await load(); }
    catch (e: any) { toast(false, e.message); }
  };

  const remove = async (id: string) => {
    try { await api(`/org-profile/sponsors/${id}`, { method: "DELETE" }); await load(); toast(true, "Sponsor removed"); }
    catch (e: any) { toast(false, e.message); }
  };

  if (loading) return <LoadingCards />;

  return (
    <div>
      <TabHeader title="Sponsors" sub={`${items.length} sponsor${items.length !== 1 ? "s" : ""}`} onAdd={() => setShowForm(v => !v)} />
      {showForm && (
        <Card style={{ border: "1px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.04)" }}>
          <SectionHeading title="Add Sponsor" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Name *"  value={form.name}    onChange={(v: string) => setForm(f => ({ ...f, name: v }))}    placeholder="Acme Corp" />
            <Inp label="Website" value={form.website} onChange={(v: string) => setForm(f => ({ ...f, website: v }))} placeholder="https://acme.com" />
          </div>
          <ImageInput label="Sponsor Logo" value={form.logo_url} onChange={url => setForm(f => ({ ...f, logo_url: url }))} />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={add} loading={adding} disabled={!form.name.trim()}>Add Sponsor</Btn>
            <Btn onClick={() => setShowForm(false)} variant="ghost">Cancel</Btn>
          </div>
        </Card>
      )}
      {items.length === 0 ? <EmptyState icon="🤝" text="No sponsors yet" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
          {items.map((s, i) => (
            <Card key={s.id} style={{ opacity: s.is_active ? 1 : 0.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                {s.logo_url
                  ? <img src={s.logo_url} alt={s.name} style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  : <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤝</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  {s.website && <div style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.website}</div>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Toggle value={s.is_active} onChange={() => toggle(s)} />
                <Btn onClick={() => remove(s.id)} variant="danger" small>Remove</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
