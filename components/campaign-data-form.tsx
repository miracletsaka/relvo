'use client'

import { useState } from 'react'
import { CampaignData } from '@/lib/types'
import { X, Plus, ChevronDown, ChevronUp, Type, AlignLeft, List, Quote, Megaphone, Hash, Link2, Building2 } from 'lucide-react'

interface CampaignDataFormProps {
  data: CampaignData
  onChange: (data: CampaignData) => void
}

/* ─── Field components ─────────────────────────────────── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 6, display: 'block' }}>
      {children}
    </span>
  )
}

function DarkTextarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 10, padding: '10px 12px', color: '#e4e4e7',
        fontFamily: 'DM Mono, monospace', fontSize: 12, resize: 'vertical',
        transition: 'border-color 0.2s', lineHeight: 1.6,
      }}
      onFocus={(e) => { e.target.style.borderColor = 'rgba(124,58,237,0.5)'; e.target.style.outline = 'none' }}
      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
    />
  )
}

function DarkInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 10, padding: '9px 12px', color: '#e4e4e7',
        fontFamily: 'DM Mono, monospace', fontSize: 12, transition: 'border-color 0.2s',
      }}
      onFocus={(e) => { e.target.style.borderColor = 'rgba(124,58,237,0.5)'; e.target.style.outline = 'none' }}
      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
    />
  )
}

/* ─── Section wrapper (collapsible) ───────────────────── */
function Section({ icon, title, hint, children, defaultOpen = true }: {
  icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ color: 'rgba(124,58,237,0.7)', display: 'flex', flexShrink: 0 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#e4e4e7', fontFamily: 'Syne, sans-serif' }}>{title}</span>
        {hint && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'DM Mono, monospace' }}>{hint}</span>}
        {open
          ? <ChevronUp style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
          : <ChevronDown style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
        }
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ─── Main ─────────────────────────────────────────────── */
export default function CampaignDataForm({ data, onChange }: CampaignDataFormProps) {
  const set = (field: keyof CampaignData, value: any) => onChange({ ...data, [field]: value })

  const updateBullet = (i: number, v: string) => {
    const b = [...data.bullets]; b[i] = v; set('bullets', b)
  }
  const addBullet = () => set('bullets', [...data.bullets, ''])
  const removeBullet = (i: number) => set('bullets', data.bullets.filter((_, idx) => idx !== i))

  const updateLink = (i: number, field: 'label' | 'url', v: string) => {
    const links = [...(data.links || [])]; links[i] = { ...links[i], [field]: v }; set('links', links)
  }
  const addLink = () => set('links', [...(data.links || []), { label: '', url: '' }])
  const removeLink = (i: number) => set('links', (data.links || []).filter((_, idx) => idx !== i))

  const ADD_BTN: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 11px', borderRadius: 8,
    background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)',
    color: '#c4b5fd', fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.15s',
  }

  const REMOVE_BTN: React.CSSProperties = {
    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
    color: 'rgba(239,68,68,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all 0.15s',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=DM+Mono:wght@400;500&display=swap');
        .cdf-remove:hover { background: rgba(239,68,68,0.2) !important; border-color: rgba(239,68,68,0.4) !important; color: #f87171 !important; }
        .cdf-add:hover { background: rgba(124,58,237,0.2) !important; }
        .cdf-bullet-num { width:22px;height:22px;border-radius:7px;background:rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:rgba(255,255,255,0.35);flex-shrink:0;font-family:'DM Mono',monospace; }
        .cdf-link-card { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:7px; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'Syne, sans-serif' }}>

        {/* Hook */}
        <Section icon={<Type style={{ width: 14, height: 14 }} />} title="Hook / Headline" defaultOpen={true}>
          <DarkTextarea value={data.hook} onChange={(v) => set('hook', v)} placeholder="Your main attention-grabbing headline…" rows={2} />
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 5 }}>The bold, primary headline — keep it punchy</p>
        </Section>

        {/* Subheading */}
        <Section icon={<AlignLeft style={{ width: 14, height: 14 }} />} title="Subheading" defaultOpen={true}>
          <DarkTextarea value={data.subheading} onChange={(v) => set('subheading', v)} placeholder="Supporting text that elaborates on your hook…" rows={2} />
        </Section>

        {/* Bullets */}
        <Section icon={<List style={{ width: 14, height: 14 }} />} title="Bullets" hint={`${data.bullets.length} item${data.bullets.length !== 1 ? 's' : ''}`} defaultOpen={true}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.bullets.map((bullet, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <div className="cdf-bullet-num">{i + 1}</div>
                <DarkTextarea value={bullet} onChange={(v) => updateBullet(i, v)} placeholder={`Benefit ${i + 1}…`} rows={2} />
                <button className="cdf-remove" style={REMOVE_BTN} onClick={() => removeBullet(i)} type="button">
                  <X style={{ width: 11, height: 11 }} />
                </button>
              </div>
            ))}
          </div>
          <button className="cdf-add" style={{ ...ADD_BTN, marginTop: 8 }} onClick={addBullet} type="button">
            <Plus style={{ width: 11, height: 11 }} />Add bullet
          </button>
        </Section>

        {/* Proof */}
        <Section icon={<Quote style={{ width: 14, height: 14 }} />} title="Proof / Statistic" defaultOpen={false}>
          <DarkTextarea value={data.proof} onChange={(v) => set('proof', v)} placeholder="A statistic, testimonial, or social proof element…" rows={2} />
        </Section>

        {/* CTA */}
        <Section icon={<Megaphone style={{ width: 14, height: 14 }} />} title="Call to Action" defaultOpen={true}>
          <DarkTextarea value={data.cta} onChange={(v) => set('cta', v)} placeholder="What should the audience do next?" rows={2} />
          <div style={{ marginTop: 8 }}>
            <FieldLabel>CTA Link</FieldLabel>
            <DarkInput value={data.ctaLink || ''} onChange={(v) => set('ctaLink', v)} placeholder="https://example.com" type="url" />
          </div>
        </Section>

        {/* Hashtags */}
        <Section icon={<Hash style={{ width: 14, height: 14 }} />} title="Hashtags" defaultOpen={false}>
          <DarkInput value={data.hashtags as string} onChange={(v) => set('hashtags', v)} placeholder="#example #campaign #hashtags" />
        </Section>

        {/* Additional Links */}
        <Section icon={<Link2 style={{ width: 14, height: 14 }} />} title="Additional Links" hint={(data.links || []).length ? `${(data.links || []).length}` : undefined} defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(data.links || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
                No links added yet
              </div>
            ) : (
              (data.links || []).map((link, i) => (
                <div key={i} className="cdf-link-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>Link {i + 1}</span>
                    <button className="cdf-remove" style={{ ...REMOVE_BTN, width: 22, height: 22 }} onClick={() => removeLink(i)} type="button">
                      <X style={{ width: 10, height: 10 }} />
                    </button>
                  </div>
                  <DarkInput value={link.label} onChange={(v) => updateLink(i, 'label', v)} placeholder="Label" />
                  <DarkInput value={link.url} onChange={(v) => updateLink(i, 'url', v)} placeholder="https://…" type="url" />
                </div>
              ))
            )}
          </div>
          <button className="cdf-add" style={{ ...ADD_BTN, marginTop: 8 }} onClick={addLink} type="button">
            <Plus style={{ width: 11, height: 11 }} />Add link
          </button>
        </Section>

        {/* Company Info */}
        <Section icon={<Building2 style={{ width: 14, height: 14 }} />} title="Company Info" defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <FieldLabel>Company Name</FieldLabel>
              <DarkInput value={data.companyName} onChange={(v) => set('companyName', v)} placeholder="Your brand or company…" />
            </div>
            <div>
              <FieldLabel>Location</FieldLabel>
              <DarkInput value={data.location} onChange={(v) => set('location', v)} placeholder="City, Country or region…" />
            </div>
          </div>
        </Section>

      </div>
    </>
  )
}