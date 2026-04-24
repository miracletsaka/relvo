
"use client"

import { useState } from 'react'
import { CampaignData } from '@/lib/types'
import {
  X, Plus, ChevronDown, ChevronUp,
  Type, AlignLeft, List, Quote, Megaphone, Hash, Link2,
  Building2, Users, Star, Tag, Award, Code2, Image, Gift, Phone, Globe2,
} from 'lucide-react'

interface CampaignDataFormProps {
  data: CampaignData
  onChange: (data: CampaignData) => void
}

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
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '10px 12px', color: '#e4e4e7', fontFamily: 'DM Mono, monospace', fontSize: 12, resize: 'vertical', lineHeight: 1.6, transition: 'border-color 0.2s', boxSizing: 'border-box' }}
      onFocus={e => { e.target.style.borderColor = 'rgba(124,58,237,0.5)'; e.target.style.outline = 'none' }}
      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
    />
  )
}

function DarkInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '9px 12px', color: '#e4e4e7', fontFamily: 'DM Mono, monospace', fontSize: 12, transition: 'border-color 0.2s', boxSizing: 'border-box' }}
      onFocus={e => { e.target.style.borderColor = 'rgba(124,58,237,0.5)'; e.target.style.outline = 'none' }}
      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
    />
  )
}

function DarkSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { label: string; value: string }[]
}) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '9px 12px', color: value ? '#e4e4e7' : 'rgba(255,255,255,0.3)', fontFamily: 'DM Mono, monospace', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
    >
      <option className="text-black" value="">— Select —</option>
      {options.map(o => <option className="text-black" key={o.value} value={o.value} style={{ background: '#1a1a2e' }}>{o.label}</option>)}
    </select>
  )
}

function Section({ icon, title, hint, children, defaultOpen = true, accent }: {
  icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode; defaultOpen?: boolean; accent?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  const color = accent || 'rgba(124,58,237,0.7)'
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
      <button type="button" onClick={() => setOpen(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ color, display: 'flex', flexShrink: 0 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#e4e4e7', fontFamily: 'Syne, sans-serif' }}>{title}</span>
        {hint && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'DM Mono, monospace' }}>{hint}</span>}
        {open ? <ChevronUp style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} /> : <ChevronDown style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />}
      </button>
      {open && <div style={{ padding: '0 14px 14px' }}>{children}</div>}
    </div>
  )
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: n <= value ? '#fbbf24' : 'rgba(255,255,255,0.15)', padding: '0 1px', transition: 'color 0.1s' }}>★</button>
      ))}
    </div>
  )
}

function ItemCard({ children, onRemove, index }: { children: React.ReactNode; onRemove: () => void; index: number }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>#{index + 1}</span>
        <button type="button" onClick={onRemove} className="cdf-remove" style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X style={{ width: 10, height: 10 }} />
        </button>
      </div>
      {children}
    </div>
  )
}

const ADD_BTN: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '5px 11px', borderRadius: 8,
  background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)',
  color: '#c4b5fd', fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700,
  cursor: 'pointer', transition: 'all 0.15s',
}

const BUSINESS_TYPES = ['Agency', 'E-commerce', 'SaaS', 'Retail', 'Healthcare', 'Education', 'Finance', 'Non-profit', 'Hospitality', 'Real Estate', 'Other']
const COMPANY_SIZES  = ['1–10', '11–50', '51–200', '201–500', '500+']
const REVIEW_SOURCES = ['Google', 'Trustpilot', 'Facebook', 'Yelp', 'Clutch', 'G2', 'Capterra', 'Other']
const META_CATS      = ['ai_context', 'compliance', 'audience', 'brand_voice', 'other']

export default function CampaignDataForm({ data, onChange }: CampaignDataFormProps) {
  const set = (field: keyof CampaignData | any, value: any) => onChange({ ...data, [field]: value })


  const updateBullet = (i: number, v: string) => { const b = [...(data.bullets || [])]; b[i] = v; set('bullets', b) }
  const addBullet    = () => set('bullets', [...(data.bullets || []), ''])
  const removeBullet = (i: number) => set('bullets', (data.bullets || []).filter((_, idx) => idx !== i))

  const updateLink = (i: number, field: 'label' | 'url', v: string) => { const links = [...(data.links || [])]; links[i] = { ...links[i], [field]: v }; set('links', links) }
  const addLink    = () => set('links', [...(data.links || []), { label: '', url: '' }])
  const removeLink = (i: number) => set('links', (data.links || []).filter((_, idx) => idx !== i))

  const updateSponsor = (i: number, field: string, v: string) => { const arr = [...(data.sponsors || [])]; arr[i] = { ...arr[i], [field]: v }; set('sponsors', arr) }
  const addSponsor    = () => set('sponsors', [...(data.sponsors || []), { name: '', logo_url: '', website: '' }])
  const removeSponsor = (i: number) => set('sponsors', (data.sponsors || []).filter((_, idx) => idx !== i))

  const updateReview = (i: number, field: string, v: any) => { const arr = [...(data.reviews || [])]; arr[i] = { ...arr[i], [field]: v }; set('reviews', arr) }
  const addReview    = () => set('reviews', [...(data.reviews || []), { author_name: '', rating: 5, body: '', source: '' }])
  const removeReview = (i: number) => set('reviews', (data.reviews || []).filter((_, idx) => idx !== i))

  const updateOffer = (i: number, field: string, v: string) => { const arr = [...(data.offers || [])]; arr[i] = { ...arr[i], [field]: v }; set('offers', arr) }
  const addOffer    = () => set('offers', [...(data.offers || []), { title: '', description: '', cta_text: '', cta_url: '', expires_at: '' }])
  const removeOffer = (i: number) => set('offers', (data.offers || []).filter((_, idx) => idx !== i))

  const updateAccreditation = (i: number, field: string, v: any) => { const arr = [...(data.accreditations || [])]; arr[i] = { ...arr[i], [field]: v }; set('accreditations', arr) }
  const addAccreditation    = () => set('accreditations', [...(data.accreditations || []), { name: '', issuer: '', year: undefined, logo_url: '' }])
  const removeAccreditation = (i: number) => set('accreditations', (data.accreditations || []).filter((_, idx) => idx !== i))

  const updateMeta = (i: number, field: string, v: string) => { const arr = [...(data.metadata || [])]; arr[i] = { ...arr[i], [field]: v }; set('metadata', arr) }
  const addMeta    = () => set('metadata', [...(data.metadata || []), { key: '', value: '', category: 'ai_context' }])
  const removeMeta = (i: number) => set('metadata', (data.metadata || []).filter((_, idx) => idx !== i))

  const setBI = (field: string, value: any) => set('businessInfo', { ...(data.businessInfo || {}), [field]: value })

  const setImageSlot = (key: string, url: string) => set('imageSlots', { ...(data.imageSlots || {}), [key]: { url } })
  const addImageSlot = () => { const key = `slot_${Date.now()}`; set('imageSlots', { ...(data.imageSlots || {}), [key]: { url: '' } }) }
  const removeImageSlot = (key: string) => { const slots = { ...(data.imageSlots || {}) }; delete slots[key]; set('imageSlots', slots) }

  const imageSlotEntries = Object.entries(data.imageSlots || {})
  const sponsors = data.sponsors || []
  const reviews = data.reviews || []
  const offers = data.offers || []
  const accreditations = data.accreditations || []
  const metadata = data.metadata || []

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=DM+Mono:wght@400;500&display=swap');
        .cdf-remove:hover { background: rgba(239,68,68,0.2) !important; border-color: rgba(239,68,68,0.4) !important; color: #f87171 !important; }
        .cdf-add:hover    { background: rgba(124,58,237,0.2) !important; }
        .cdf-bullet-num   { width:22px;height:22px;border-radius:7px;background:rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:rgba(255,255,255,0.35);flex-shrink:0;font-family:'DM Mono',monospace; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        select option { background: #1a1a2e; color: #e4e4e7; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'Syne, sans-serif' }}>
        <Section icon={<Type style={{ width: 14, height: 14 }} />} title="Hook / Headline" defaultOpen>
          <DarkTextarea value={data.hook} onChange={v => set('hook', v)} placeholder="Your main attention-grabbing headline…" rows={2} />
        </Section>

        <Section icon={<AlignLeft style={{ width: 14, height: 14 }} />} title="Subheading" defaultOpen>
          <DarkTextarea value={data.subheading} onChange={v => set('subheading', v)} placeholder="Supporting text…" rows={2} />
        </Section>

        <Section icon={<List style={{ width: 14, height: 14 }} />} title="Bullets" hint={`${(data.bullets || []).length} item${(data.bullets || []).length !== 1 ? 's' : ''}`} defaultOpen>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(data.bullets || []).map((bullet, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <div className="cdf-bullet-num">{i + 1}</div>
                <DarkTextarea value={bullet} onChange={v => updateBullet(i, v)} placeholder={`Benefit ${i + 1}…`} rows={2} />
                <button className="cdf-remove" type="button" onClick={() => removeBullet(i)} style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <X style={{ width: 11, height: 11 }} />
                </button>
              </div>
            ))}
          </div>
          <button className="cdf-add" style={{ ...ADD_BTN, marginTop: 8 }} onClick={addBullet} type="button"><Plus style={{ width: 11, height: 11 }} />Add bullet</button>
        </Section>

        <Section icon={<Quote style={{ width: 14, height: 14 }} />} title="Proof / Statistic" defaultOpen={false}>
          <DarkTextarea value={data.proof} onChange={v => set('proof', v)} placeholder="A statistic or social proof…" rows={2} />
        </Section>

        <Section icon={<Megaphone style={{ width: 14, height: 14 }} />} title="Call to Action" defaultOpen>
          <DarkTextarea value={data.cta} onChange={v => set('cta', v)} placeholder="What should the audience do next?" rows={2} />
          <div style={{ marginTop: 8 }}>
            <FieldLabel>CTA Link</FieldLabel>
            <DarkInput value={data.ctaLink || ''} onChange={v => set('ctaLink', v)} placeholder="https://example.com" type="url" />
          </div>
        </Section>

        <Section icon={<Hash style={{ width: 14, height: 14 }} />} title="Hashtags" defaultOpen={false}>
          <DarkInput value={data.hashtags as string} onChange={v => set('hashtags', v)} placeholder="#example #campaign #hashtags" />
        </Section>

        <Section icon={<Tag style={{ width: 14, height: 14 }} />} title="Quick Fields / Template Tags" defaultOpen={false} accent="rgba(255,255,255,0.3)">
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 0, marginBottom: 10 }}>
            Price tags usually fail because the template points to <strong>price_label</strong> but the form had no value field for it.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><FieldLabel>Price Label</FieldLabel><DarkInput value={(data as any).price_label || ''} onChange={v => set('price_label', v)} placeholder="$99 / month" /></div>
              <div><FieldLabel>Fine Print</FieldLabel><DarkInput value={(data as any).fine_print || ''} onChange={v => set('fine_print', v)} placeholder="Terms apply" /></div>
            </div>
            <div><FieldLabel>Enroll Note</FieldLabel><DarkInput value={(data as any).enroll_note || ''} onChange={v => set('enroll_note', v)} placeholder="Limited seats available" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><FieldLabel>Hook Tag</FieldLabel><DarkInput value={(data as any).hook_tag || ''} onChange={v => set('hook_tag', v)} placeholder="New" /></div>
              <div><FieldLabel>Hook Prefix</FieldLabel><DarkInput value={(data as any).hook_pre || ''} onChange={v => set('hook_pre', v)} placeholder="Save" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><FieldLabel>Hook Number</FieldLabel><DarkInput value={(data as any).hook_number || ''} onChange={v => set('hook_number', v)} placeholder="30%" /></div>
              <div><FieldLabel>Hook Label</FieldLabel><DarkInput value={(data as any).hook_label || ''} onChange={v => set('hook_label', v)} placeholder="OFF" /></div>
            </div>
            <div><FieldLabel>Hook Description</FieldLabel><DarkInput value={(data as any).hook_desc || ''} onChange={v => set('hook_desc', v)} placeholder="This week only" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><FieldLabel>Badge Icon</FieldLabel><DarkInput value={(data as any).badge_icon || ''} onChange={v => set('badge_icon', v)} placeholder="★" /></div>
              <div><FieldLabel>Decorative Icon</FieldLabel><DarkInput value={(data as any).deco_icon || ''} onChange={v => set('deco_icon', v)} placeholder="→" /></div>
            </div>
            <div><FieldLabel>Review Text</FieldLabel><DarkTextarea value={data.review_text || ''} onChange={v => set('review_text', v)} placeholder="Short testimonial…" rows={2} /></div>
            <div><FieldLabel>Review Author</FieldLabel><DarkInput value={data.review_author || ''} onChange={v => set('review_author', v)} placeholder="Jane S." /></div>
            <div><FieldLabel>Offer Title</FieldLabel><DarkInput value={data.offer_title || ''} onChange={v => set('offer_title', v)} placeholder="Limited time offer…" /></div>
            <div><FieldLabel>Offer CTA</FieldLabel><DarkInput value={data.offer_cta || ''} onChange={v => set('offer_cta', v)} placeholder="Claim Now" /></div>
          </div>
        </Section>

        <Section icon={<Link2 style={{ width: 14, height: 14 }} />} title="Additional Links" hint={(data.links || []).length ? String((data.links || []).length) : undefined} defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(data.links || []).length === 0 ? <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>No links added yet</div> : (data.links || []).map((link, i) => (
              <ItemCard key={i} index={i} onRemove={() => removeLink(i)}>
                <DarkInput value={link.label} onChange={v => updateLink(i, 'label', v)} placeholder="Label" />
                <DarkInput value={link.url} onChange={v => updateLink(i, 'url', v)} placeholder="https://…" type="url" />
              </ItemCard>
            ))}
          </div>
          <button className="cdf-add" style={{ ...ADD_BTN, marginTop: 8 }} onClick={addLink} type="button"><Plus style={{ width: 11, height: 11 }} />Add link</button>
        </Section>

        <Section icon={<Building2 style={{ width: 14, height: 14 }} />} title="Company Info" defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div><FieldLabel>Company Name</FieldLabel><DarkInput value={data.companyName} onChange={v => set('companyName', v)} placeholder="Your brand or company…" /></div>
            <div><FieldLabel>Location</FieldLabel><DarkInput value={data.location} onChange={v => set('location', v)} placeholder="City, Country or region…" /></div>
            <div><FieldLabel>Logo URL</FieldLabel><DarkInput value={data.logo || ""} onChange={v => set("logo", v)} placeholder="https://example.com/logo.png" /></div>
            <div><FieldLabel>Hero Image URL</FieldLabel><DarkInput value={(data as any).heroImage || ""} onChange={v => set("heroImage", v)} placeholder="https://example.com/hero.jpg" /></div>
          </div>
        </Section>

        <Section icon={<Phone style={{ width: 14, height: 14 }} />} title="Business Info" defaultOpen={false} accent="rgba(52,211,153,0.7)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div><FieldLabel>Business Type</FieldLabel><DarkSelect value={data.businessInfo?.business_type || ''} onChange={v => setBI('business_type', v)} options={BUSINESS_TYPES.map(t => ({ label: t, value: t }))} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><FieldLabel>Founded Year</FieldLabel><DarkInput value={String(data.businessInfo?.founded_year || '')} onChange={v => setBI('founded_year', v ? parseInt(v) : undefined)} placeholder="2019" type="number" /></div>
              <div><FieldLabel>Company Size</FieldLabel><DarkSelect value={data.businessInfo?.company_size || ''} onChange={v => setBI('company_size', v)} options={COMPANY_SIZES.map(s => ({ label: s, value: s }))} /></div>
            </div>
            <div><FieldLabel>Website</FieldLabel><DarkInput value={data.businessInfo?.website || ''} onChange={v => { setBI('website', v); set('website', v) }} placeholder="https://example.com" type="url" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><FieldLabel>Primary Email</FieldLabel><DarkInput value={data.businessInfo?.email_primary || ''} onChange={v => { setBI('email_primary', v); set('email', v) }} placeholder="hello@example.com" /></div>
              <div><FieldLabel>Support Email</FieldLabel><DarkInput value={data.businessInfo?.email_support || ''} onChange={v => setBI('email_support', v)} placeholder="support@example.com" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><FieldLabel>Primary Phone</FieldLabel><DarkInput value={data.businessInfo?.phone_primary || ''} onChange={v => { setBI('phone_primary', v); set('phone', v) }} placeholder="+44..." /></div>
              <div><FieldLabel>Secondary Phone</FieldLabel><DarkInput value={data.businessInfo?.phone_secondary || ''} onChange={v => setBI('phone_secondary', v)} placeholder="+44..." /></div>
            </div>
            <div><FieldLabel>WhatsApp</FieldLabel><DarkInput value={data.businessInfo?.whatsapp || ''} onChange={v => { setBI('whatsapp', v); set('whatsapp', v) }} placeholder="+44..." /></div>
            <div><FieldLabel>Tagline</FieldLabel><DarkInput value={data.businessInfo?.tagline || ''} onChange={v => setBI('tagline', v)} placeholder="Short punchy tagline…" /></div>
            <div><FieldLabel>Description</FieldLabel><DarkTextarea value={data.businessInfo?.description || ''} onChange={v => setBI('description', v)} placeholder="Brief description of your business…" rows={3} /></div>
            <div><FieldLabel>Address</FieldLabel><DarkTextarea value={data.businessInfo?.address || ''} onChange={v => { setBI('address', v); set('address', v) }} placeholder="123 High Street" rows={2} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><FieldLabel>City</FieldLabel><DarkInput value={data.businessInfo?.city || ''} onChange={v => { setBI('city', v); set('city', v) }} placeholder="London" /></div>
              <div><FieldLabel>Country</FieldLabel><DarkInput value={data.businessInfo?.country || ''} onChange={v => { setBI('country', v); set('country', v) }} placeholder="United Kingdom" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><FieldLabel>State / Province</FieldLabel><DarkInput value={data.businessInfo?.state_province || ''} onChange={v => setBI('state_province', v)} placeholder="England" /></div>
              <div><FieldLabel>Postal Code</FieldLabel><DarkInput value={data.businessInfo?.postal_code || ''} onChange={v => setBI('postal_code', v)} placeholder="E14" /></div>
            </div>
            <div><FieldLabel>Map URL</FieldLabel><DarkInput value={data.businessInfo?.map_url || ''} onChange={v => { setBI('map_url', v); set('map_url', v) }} placeholder="https://maps.google.com/..." type="url" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><FieldLabel>Registration No.</FieldLabel><DarkInput value={data.businessInfo?.registration_no || ''} onChange={v => { setBI('registration_no', v); set('registration_no', v) }} placeholder="ABC123" /></div>
              <div><FieldLabel>VAT Number</FieldLabel><DarkInput value={data.businessInfo?.vat_number || ''} onChange={v => { setBI('vat_number', v); set('vat_number', v) }} placeholder="GB123..." /></div>
            </div>
            <div><FieldLabel>Full Address (override)</FieldLabel><DarkInput value={(data as any).fullAddress || ''} onChange={v => set('fullAddress', v)} placeholder="123 High Street, London, England, E14, United Kingdom" /></div>
          </div>
        </Section>

        <Section icon={<Globe2 style={{ width: 14, height: 14 }} />} title="Socials & Public Links" defaultOpen={false} accent="rgba(96,165,250,0.7)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Facebook URL', 'facebook_url'],
              ['Instagram URL', 'instagram_url'],
              ['LinkedIn URL', 'linkedin_url'],
              ['Twitter / X URL', 'twitter_url'],
              ['TikTok URL', 'tiktok_url'],
              ['YouTube URL', 'youtube_url'],
            ].map(([label, key]) => (
              <div key={key}>
                <FieldLabel>{label}</FieldLabel>
                <DarkInput value={(data.businessInfo as any)?.[key] || (data as any)[key] || ''} onChange={v => { setBI(key, v); set(key, v) }} placeholder="https://..." type="url" />
              </div>
            ))}
          </div>
        </Section>

        <Section icon={<Users style={{ width: 14, height: 14 }} />} title="Sponsors" hint={sponsors.length ? `${sponsors.length}` : undefined} defaultOpen={false} accent="rgba(251,191,36,0.7)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sponsors.length === 0 ? <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>No sponsors added</div> : sponsors.map((s, i) => (
              <ItemCard key={i} index={i} onRemove={() => removeSponsor(i)}>
                <div><FieldLabel>Name *</FieldLabel><DarkInput value={s.name} onChange={v => updateSponsor(i, 'name', v)} placeholder="Sponsor name" /></div>
                <div><FieldLabel>Logo URL</FieldLabel><DarkInput value={s.logo_url || ''} onChange={v => updateSponsor(i, 'logo_url', v)} placeholder="https://cdn.example.com/logo.png" /></div>
                <div><FieldLabel>Website</FieldLabel><DarkInput value={s.website || ''} onChange={v => updateSponsor(i, 'website', v)} placeholder="https://sponsor.com" type="url" /></div>
              </ItemCard>
            ))}
          </div>
          <button className="cdf-add" style={{ ...ADD_BTN, marginTop: 8 }} onClick={addSponsor} type="button"><Plus style={{ width: 11, height: 11 }} />Add sponsor</button>
        </Section>

        <Section icon={<Star style={{ width: 14, height: 14 }} />} title="Reviews" hint={reviews.length ? `${reviews.length}` : undefined} defaultOpen={false} accent="rgba(251,191,36,0.7)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reviews.length === 0 ? <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>No reviews added</div> : reviews.map((r, i) => (
              <ItemCard key={i} index={i} onRemove={() => removeReview(i)}>
                <div><FieldLabel>Author Name *</FieldLabel><DarkInput value={r.author_name} onChange={v => updateReview(i, 'author_name', v)} placeholder="Jane Smith" /></div>
                <div><FieldLabel>Rating</FieldLabel><StarPicker value={r.rating} onChange={v => updateReview(i, 'rating', v)} /></div>
                <div><FieldLabel>Source</FieldLabel><DarkSelect value={r.source || ''} onChange={v => updateReview(i, 'source', v)} options={REVIEW_SOURCES.map(s => ({ label: s, value: s }))} /></div>
                <div><FieldLabel>Review Body</FieldLabel><DarkTextarea value={r.body || ''} onChange={v => updateReview(i, 'body', v)} placeholder="Review text…" rows={2} /></div>
              </ItemCard>
            ))}
          </div>
          <button className="cdf-add" style={{ ...ADD_BTN, marginTop: 8 }} onClick={addReview} type="button"><Plus style={{ width: 11, height: 11 }} />Add review</button>
        </Section>

        <Section icon={<Gift style={{ width: 14, height: 14 }} />} title="Offers" hint={offers.length ? `${offers.length}` : undefined} defaultOpen={false} accent="rgba(52,211,153,0.7)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {offers.length === 0 ? <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>No offers added</div> : offers.map((o, i) => (
              <ItemCard key={i} index={i} onRemove={() => removeOffer(i)}>
                <div><FieldLabel>Title *</FieldLabel><DarkInput value={o.title} onChange={v => updateOffer(i, 'title', v)} placeholder="20% Off This Month" /></div>
                <div><FieldLabel>Description</FieldLabel><DarkTextarea value={o.description || ''} onChange={v => updateOffer(i, 'description', v)} placeholder="Details about the offer…" rows={2} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><FieldLabel>CTA Text</FieldLabel><DarkInput value={o.cta_text || ''} onChange={v => updateOffer(i, 'cta_text', v)} placeholder="Book Now" /></div>
                  <div><FieldLabel>Expires</FieldLabel><DarkInput value={o.expires_at || ''} onChange={v => updateOffer(i, 'expires_at', v)} type="date" /></div>
                </div>
                <div><FieldLabel>CTA URL</FieldLabel><DarkInput value={o.cta_url || ''} onChange={v => updateOffer(i, 'cta_url', v)} placeholder="https://…" type="url" /></div>
              </ItemCard>
            ))}
          </div>
          <button className="cdf-add" style={{ ...ADD_BTN, marginTop: 8 }} onClick={addOffer} type="button"><Plus style={{ width: 11, height: 11 }} />Add offer</button>
        </Section>

        <Section icon={<Award style={{ width: 14, height: 14 }} />} title="Accreditations" hint={accreditations.length ? `${accreditations.length}` : undefined} defaultOpen={false} accent="rgba(129,140,248,0.7)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {accreditations.length === 0 ? <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>No accreditations added</div> : accreditations.map((a, i) => (
              <ItemCard key={i} index={i} onRemove={() => removeAccreditation(i)}>
                <div><FieldLabel>Name *</FieldLabel><DarkInput value={a.name} onChange={v => updateAccreditation(i, 'name', v)} placeholder="Google Partner" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><FieldLabel>Issuer</FieldLabel><DarkInput value={a.issuer || ''} onChange={v => updateAccreditation(i, 'issuer', v)} placeholder="Google" /></div>
                  <div><FieldLabel>Year</FieldLabel><DarkInput value={String(a.year || '')} onChange={v => updateAccreditation(i, 'year', v ? parseInt(v) : undefined)} placeholder="2024" type="number" /></div>
                </div>
                <div><FieldLabel>Badge Logo URL</FieldLabel><DarkInput value={a.logo_url || ''} onChange={v => updateAccreditation(i, 'logo_url', v)} placeholder="https://…" /></div>
              </ItemCard>
            ))}
          </div>
          <button className="cdf-add" style={{ ...ADD_BTN, marginTop: 8 }} onClick={addAccreditation} type="button"><Plus style={{ width: 11, height: 11 }} />Add accreditation</button>
        </Section>

        <Section icon={<Image style={{ width: 14, height: 14 }} />} title="Image Slots" hint={imageSlotEntries.length ? `${imageSlotEntries.length}` : undefined} defaultOpen={false} accent="rgba(244,114,182,0.7)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {imageSlotEntries.length === 0 ? <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>No image slots</div> : imageSlotEntries.map(([key, slot]) => (
              <div key={key} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(244,114,182,0.6)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em' }}>{key}</span>
                  <button type="button" onClick={() => removeImageSlot(key)} className="cdf-remove" style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X style={{ width: 9, height: 9 }} />
                  </button>
                </div>
                <DarkInput value={slot.url || ''} onChange={v => setImageSlot(key, v)} placeholder="https://images.unsplash.com/…" />
              </div>
            ))}
          </div>
          <button className="cdf-add" style={{ ...ADD_BTN, marginTop: 8 }} onClick={addImageSlot} type="button"><Plus style={{ width: 11, height: 11 }} />Add image slot</button>
        </Section>

        <Section icon={<Code2 style={{ width: 14, height: 14 }} />} title="Metadata / AI Context" hint={metadata.length ? `${metadata.length}` : undefined} defaultOpen={false} accent="rgba(52,211,153,0.7)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {metadata.length === 0 ? <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>No metadata entries</div> : metadata.map((m, i) => (
              <ItemCard key={i} index={i} onRemove={() => removeMeta(i)}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><FieldLabel>Key</FieldLabel><DarkInput value={m.key} onChange={v => updateMeta(i, 'key', v)} placeholder="target_audience" /></div>
                  <div><FieldLabel>Category</FieldLabel><DarkSelect value={m.category || 'ai_context'} onChange={v => updateMeta(i, 'category', v)} options={META_CATS.map(c => ({ label: c, value: c }))} /></div>
                </div>
                <div><FieldLabel>Value</FieldLabel><DarkInput value={m.value} onChange={v => updateMeta(i, 'value', v)} placeholder="25–40 year old homeowners" /></div>
              </ItemCard>
            ))}
          </div>
          <button className="cdf-add" style={{ ...ADD_BTN, marginTop: 8 }} onClick={addMeta} type="button"><Plus style={{ width: 11, height: 11 }} />Add metadata</button>
        </Section>
      </div>
    </>
  )
}
