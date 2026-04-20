'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import CampaignDataForm from '@/components/campaign-data-form'
import TemplateManagerV2 from '@/components/template-manager-v2'
import { Template, CampaignData } from '@/lib/types'
import {
  ArrowRight, ImagePlus, ChevronLeft, ChevronRight,
  Check, Shuffle, Wand2, X, Layers, PenLine
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { DEFAULT_CAMPAIGN_DATA } from '@/lib/campaign-context'

/* ─── types ─────────────────────────────────────────── */
type DraftStructured = {
  hook?: string | null; subheading?: string | null
  bullets?: string[] | string | null; proof?: string | null
  cta?: string | null; hashtags?: string | string[] | null
  companyName?: string | null; location?: string | null; ctaLink?: string | null
}

/* ─── utils ─────────────────────────────────────────── */
function safeArray(v: any): string[] {
  if (!v) return []
  if (Array.isArray(v)) return v.map((x) => String(x || '').trim()).filter(Boolean)
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); if (Array.isArray(p)) return p.map((x) => String(x || '').trim()).filter(Boolean) } catch {}
    if (v.includes(',')) return v.split(',').map((x) => x.trim()).filter(Boolean)
    if (v.includes('\n')) return v.split('\n').map((x) => x.trim()).filter(Boolean)
    return [v.trim()].filter(Boolean)
  }
  return []
}
function safeHashtags(v: any): string {
  if (!v) return ''
  if (Array.isArray(v)) return v.map((x) => String(x || '').trim()).filter(Boolean).join(' ')
  return String(v || '').trim()
}
function pickRandom<T>(arr: T[]): T | null {
  if (!arr.length) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

/* ─── StepBadge ──────────────────────────────────────── */
function StepBadge({ n, label, active, done }: { n: number; label: string; active?: boolean; done?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 800, flexShrink: 0,
        background: done ? '#7c3aed' : active ? 'rgba(124,58,237,0.22)' : 'rgba(255,255,255,0.05)',
        border: `1.5px solid ${done || active ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
        color: done ? 'white' : active ? '#c4b5fd' : 'rgba(255,255,255,0.25)',
      }}>
        {done ? <Check style={{ width: 10, height: 10 }} /> : n}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: active || done ? '#e4e4e7' : 'rgba(255,255,255,0.28)', letterSpacing: '0.04em' }}>
        {label}
      </span>
    </div>
  )
}

/* ─── BgThumb ─────────────────────────────────────────── */
function BgThumb({ url, selected, onClick }: { url: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative', borderRadius: 10, overflow: 'hidden',
        border: `2px solid ${selected ? '#7c3aed' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: selected ? '0 0 0 3px rgba(124,58,237,0.25)' : 'none',
        flexShrink: 0, width: 80, height: 80,
        cursor: 'pointer', transition: 'all 0.15s', background: 'rgba(255,255,255,0.03)',
        padding: 0,
      }}
    >
      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {selected && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check style={{ width: 12, height: 12, color: 'white' }} />
          </div>
        </div>
      )}
    </button>
  )
}

/* ─── HorizontalTemplateWrapper ─────────────────────── */
function HorizontalTemplateWrapper({
  selectedId, onSelect,
}: { selectedId: string | null; onSelect: (t: Template) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const SCROLL_AMT = 260

  const updateArrows = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -SCROLL_AMT : SCROLL_AMT, behavior: 'smooth' })
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let isDown = false, startX = 0, sl = 0
    const onDown = (e: MouseEvent) => { isDown = true; startX = e.pageX - el.offsetLeft; sl = el.scrollLeft; el.style.cursor = 'grabbing' }
    const onUp   = () => { isDown = false; el.style.cursor = 'grab' }
    const onMove = (e: MouseEvent) => {
      if (!isDown) return
      e.preventDefault()
      el.scrollLeft = sl - (e.pageX - el.offsetLeft - startX) * 1.3
    }
    el.addEventListener('mousedown', onDown)
    el.addEventListener('mouseup', onUp)
    el.addEventListener('mouseleave', onUp)
    el.addEventListener('mousemove', onMove)
    el.addEventListener('scroll', updateArrows)
    // observe size changes to recheck arrows
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    updateArrows()
    return () => {
      el.removeEventListener('mousedown', onDown)
      el.removeEventListener('mouseup', onUp)
      el.removeEventListener('mouseleave', onUp)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('scroll', updateArrows)
      ro.disconnect()
    }
  }, [])

  return (
    <div>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'DM Mono, monospace' }}>
          Drag or use ← → to browse
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { dir: 'left' as const, icon: <ChevronLeft style={{ width: 14, height: 14 }} />, disabled: !canScrollLeft },
            { dir: 'right' as const, icon: <ChevronRight style={{ width: 14, height: 14 }} />, disabled: !canScrollRight },
          ].map(({ dir, icon, disabled }) => (
            <button
              key={dir}
              onClick={() => scroll(dir)}
              disabled={disabled}
              style={{
                width: 30, height: 30, borderRadius: 9,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)',
                color: disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
              }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Fade + scroll host */}
      <div style={{ position: 'relative' }}>
        {/* Left fade */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 28, background: 'linear-gradient(to right, #0f0f14, transparent)', zIndex: 2, pointerEvents: 'none', opacity: canScrollLeft ? 1 : 0, transition: 'opacity 0.2s' }} />
        {/* Right fade */}
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 28, background: 'linear-gradient(to left, #0f0f14, transparent)', zIndex: 2, pointerEvents: 'none', opacity: canScrollRight ? 1 : 0, transition: 'opacity 0.2s' }} />

        <div
          ref={scrollRef}
          style={{
            overflowX: 'auto', overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch' as any,
            scrollbarWidth: 'none',
            cursor: 'grab',
            paddingBottom: 4,
          }}
          onScroll={updateArrows}
        >
          {/* Force TemplateManagerV2 into a horizontal row */}
          <div style={{
            display: 'flex', flexDirection: 'row', flexWrap: 'nowrap',
            gap: 10, width: 'max-content', minWidth: '100%',
          }}>
            {/* 
              TemplateManagerV2 renders cards; we wrap it and override its layout.
              If TemplateManagerV2 renders a grid/flex-col, the parent div here
              overrides it by forcing everything into a row. 
            */}
            <style>{`
              /* Force TemplateManagerV2 children horizontal */
              .tpl-scroll-inner > * {
                display: contents !important;
              }
              .tpl-scroll-inner > * > * {
                flex-shrink: 0 !important;
                scroll-snap-align: start;
                min-width: 190px !important;
                max-width: 190px !important;
              }
            `}</style>
            <div className="tpl-scroll-inner" style={{ display: 'contents' }}>
              <TemplateManagerV2
                selectedTemplateId={selectedId}
                onSelectTemplate={onSelect}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────── */
export default function ContentUploadPage(props: {
  background_images?: string[]
  structured?: DraftStructured | null
  topicId?: string
  activeId?: string
}) {
  const router = useRouter()

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [bgImages, setBgImages] = useState<string[]>([])
  const [bgLoading, setBgLoading] = useState(false)
  const [bgErr, setBgErr] = useState<string | null>(null)
  const [selectedBg, setSelectedBg] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'template' | 'content'>('content')

  const [campaignData, setCampaignData] = useState<CampaignData>(DEFAULT_CAMPAIGN_DATA)

  const [openGen, setOpenGen] = useState(false)
  const [genPrompt, setGenPrompt] = useState('')
  const [genLoading, setGenLoading] = useState(false)
  const [genErr, setGenErr] = useState<string | null>(null)

  useEffect(() => {
    const s = props.structured
    if (!s) return
    setCampaignData((prev) => ({
      ...prev,
      hook: (s.hook ?? prev.hook) as any,
      subheading: (s.subheading ?? prev.subheading) as any,
      bullets: safeArray(s.bullets).length ? (safeArray(s.bullets) as any) : prev.bullets,
      proof: (s.proof ?? prev.proof) as any,
      cta: (s.cta ?? prev.cta) as any,
      hashtags: safeHashtags(s.hashtags) || prev.hashtags,
      companyName: (s.companyName ?? prev.companyName) as any,
      location: (s.location ?? prev.location) as any,
      ctaLink: (s.ctaLink ?? prev.ctaLink) as any,
    }))
  }, [props.structured])

  useEffect(() => {
    if (!props.topicId) return
    setBgLoading(true); setBgErr(null)
    try {
      setBgImages(props.background_images?.map(String).map((x) => x.trim()).filter(Boolean) || [])
    } catch (e: any) { setBgErr(e?.message || 'Failed') }
    finally { setBgLoading(false) }
  }, [props.topicId, props.background_images])

  const handleProceed = () => {
    if (!selectedTemplate || !props.activeId || !props.topicId) return
    const bg = selectedBg || pickRandom(bgImages) || ''
    const p = new URLSearchParams()
    p.set('q', props.activeId); p.set('topic', props.topicId)
    p.set('templateId', selectedTemplate.id)
    if (bg) p.set('bg', bg)
    router.push(`/dashboard/design-studio/user/generate?${p.toString()}`)
  }

  const defaultPrompt = useMemo(() => {
    return [
      `Create a premium ad background image for ${campaignData.companyName || 'a brand'}.`,
      `Headline: ${campaignData.hook}`,
      `Subheading: ${campaignData.subheading}`,
      (campaignData.bullets || []).slice(0, 3).join(' | ') ? `Key points: ${(campaignData.bullets || []).slice(0, 3).join(' | ')}` : '',
      (campaignData.hashtags || '').trim() ? `Context: ${campaignData.hashtags}` : '',
      'Style: clean, minimal, soft lighting, commercial photography, leave empty space for text overlay, no text rendered.',
    ].filter(Boolean).join('\n')
  }, [campaignData])

  const step1Done = !!selectedTemplate
  const step2Done = step1Done && (bgImages.length === 0 || !!selectedBg)
  const canProceed = !!selectedTemplate && !!props.activeId && !!props.topicId

  const SECTION: React.CSSProperties = {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16, padding: 16,
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .cup-root { font-family: 'Syne', sans-serif; background: #0c0c0f; color: #e4e4e7; }
        .cup-tab { display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:9px;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:.05em;cursor:pointer;border:none;transition:all .15s; }
        .cup-tab-active { background:rgba(124,58,237,.2);border:1px solid rgba(124,58,237,.35);color:#c4b5fd; }
        .cup-tab-inactive { background:transparent;border:1px solid transparent;color:rgba(255,255,255,.35); }
        .cup-tab-inactive:hover { color:rgba(255,255,255,.7);background:rgba(255,255,255,.04); }
        .cup-proceed { display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px 24px;background:linear-gradient(135deg,#7c3aed,#4f46e5);border:none;border-radius:12px;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;letter-spacing:.04em;color:white;cursor:pointer;transition:opacity .15s;position:relative;overflow:hidden; }
        .cup-proceed::before { content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.14),transparent);pointer-events:none; }
        .cup-proceed:hover:not(:disabled) { opacity:.87; }
        .cup-proceed:disabled { opacity:.35;cursor:not-allowed; }
        .cup-outline { display:inline-flex;align-items:center;gap:6px;padding:7px 13px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:9px;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:rgba(255,255,255,.55);cursor:pointer;transition:all .15s; }
        .cup-outline:hover:not(:disabled) { background:rgba(255,255,255,.09);color:rgba(255,255,255,.85); }
        .cup-outline:disabled { opacity:.3;cursor:not-allowed; }
        .cup-spinner { width:13px;height:13px;border:2px solid rgba(255,255,255,.1);border-top-color:#a78bfa;border-radius:50%;animation:cupspin .7s linear infinite;display:inline-block; }
        @keyframes cupspin { to { transform:rotate(360deg); } }
        .bg-strip { display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scroll-snap-type:x mandatory;scrollbar-width:none; }
        .bg-strip::-webkit-scrollbar { display:none; }
        .gen-dialog { background:#141418!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:20px!important;font-family:'Syne',sans-serif;color:#e4e4e7;max-width:540px!important; }
        .gen-ta { width:100%;min-height:190px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:14px;color:#e4e4e7;font-family:'DM Mono',monospace;font-size:12px;resize:vertical;transition:border-color .2s; }
        .gen-ta:focus { outline:none;border-color:rgba(124,58,237,.5); }
        .gen-ta::placeholder { color:rgba(255,255,255,.2); }
        .fl { font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:8px;display:block; }
      `}</style>

      <div className="cup-root">
        <div style={{ maxWidth: 840, margin: '0 auto', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(124,58,237,0.7)', marginBottom: 3 }}>
                Design Studio
              </div>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: '#e4e4e7', lineHeight: 1.2 }}>Create Campaign</h1>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 3 }}>
                Pick template → background → generate
              </p>
            </div>
            <button className="cup-outline" onClick={() => { setGenErr(null); setGenPrompt(defaultPrompt); setOpenGen(true) }}>
              <Wand2 style={{ width: 13, height: 13 }} />
              Generate Image
            </button>
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', ...SECTION }}>
            <StepBadge n={1} label="Template" active={!step1Done} done={step1Done} />
            <div style={{ flex: 1, height: 1, background: step1Done ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)', transition: 'background 0.3s' }} />
            <StepBadge n={2} label="Background" active={step1Done && !step2Done} done={step2Done} />
            <div style={{ flex: 1, height: 1, background: step2Done ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)', transition: 'background 0.3s' }} />
            <StepBadge n={3} label="Generate" active={step2Done} done={false} />
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 4 }}>
            {/* <button className={`cup-tab ${activeTab === 'template' ? 'cup-tab-active' : 'cup-tab-inactive'}`} style={{ flex: 1 }} onClick={() => setActiveTab('template')}>
              <Layers style={{ width: 13, height: 13 }} />Template & Background
            </button> */}
            <button className={`cup-tab ${activeTab === 'content' ? 'cup-tab-active' : 'cup-tab-inactive'}`} style={{ flex: 1 }} onClick={() => setActiveTab('content')}>
              <PenLine style={{ width: 13, height: 13 }} />Content
            </button>
          </div>

          {/* ── TEMPLATE TAB ── */}
          {activeTab === 'template' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Template carousel */}
              <div style={SECTION}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className="fl" style={{ marginBottom: 0 }}>Templates</span>
                  {selectedTemplate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 10, padding: '6px 10px' }}>
                      <Check style={{ width: 12, height: 12, color: '#a78bfa', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#e4e4e7', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedTemplate.name}
                      </span>
                      <button onClick={() => setSelectedTemplate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0, display: 'flex', lineHeight: 0 }}>
                        <X style={{ width: 11, height: 11 }} />
                      </button>
                    </div>
                  )}
                </div>

                <HorizontalTemplateWrapper
                  selectedId={selectedTemplate?.id || null}
                  onSelect={(t) => { setSelectedTemplate(t); setSelectedBg('') }}
                />
              </div>

              {/* Background chooser */}
              {selectedTemplate && (
                <div style={SECTION}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span className="fl" style={{ marginBottom: 0 }}>Background</span>
                    {selectedBg && (
                      <button className="cup-outline" style={{ padding: '5px 10px', fontSize: 10 }} onClick={() => setSelectedBg('')}>
                        <Shuffle style={{ width: 11, height: 11 }} />Auto-random
                      </button>
                    )}
                  </div>

                  {bgLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                      <span className="cup-spinner" />Loading backgrounds…
                    </div>
                  ) : bgErr ? (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 12px', fontSize: 11, color: '#f87171' }}>{bgErr}</div>
                  ) : bgImages.length === 0 ? (
                    <div style={{ border: '2px dashed rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
                      <ImagePlus style={{ width: 22, height: 22, margin: '0 auto 8px', opacity: 0.25 }} />
                      <p style={{ fontSize: 12, fontWeight: 600 }}>No backgrounds uploaded yet</p>
                      <p style={{ fontSize: 10, marginTop: 3 }}>Upload in the parent page to use them here</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-strip">
                        {bgImages.map((url) => (
                          <BgThumb key={url} url={url} selected={selectedBg === url} onClick={() => setSelectedBg(selectedBg === url ? '' : url)} />
                        ))}
                      </div>
                      <div style={{ marginTop: 7, fontSize: 10, color: 'rgba(255,255,255,0.22)', fontFamily: 'DM Mono, monospace' }}>
                        {selectedBg ? '✓ Background selected' : `Auto-random from ${bgImages.length} image${bgImages.length !== 1 ? 's' : ''}`}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Proceed */}
              <button className="cup-proceed" onClick={handleProceed} disabled={!canProceed}>
                Proceed to Generate
                <ArrowRight style={{ width: 15, height: 15 }} />
              </button>
              {(!props.activeId || !props.topicId) && (
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', textAlign: 'center', fontFamily: 'DM Mono, monospace', marginTop: -4 }}>
                  Open from a draft to enable generation
                </p>
              )}
            </div>
          )}

          {/* ── CONTENT TAB ── */}
          {activeTab === 'content' && (
            <div style={SECTION}>
              <span className="fl">Campaign Content</span>
              <CampaignDataForm data={campaignData} onChange={setCampaignData} />
            </div>
          )}
        </div>
      </div>

      {/* Generate Image Dialog */}
      <Dialog open={openGen} onOpenChange={setOpenGen}>
        <DialogContent className="gen-dialog">
          <DialogHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Wand2 style={{ width: 15, height: 15, color: 'white' }} />
              </div>
              <div>
                <DialogTitle style={{ color: '#e4e4e7', fontSize: 15, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
                  Generate Background Image
                </DialogTitle>
                <DialogDescription style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                  AI-generated background from your campaign content
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="fl">Prompt (editable)</span>
            <textarea className="gen-ta" value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} placeholder="Describe the background image…" />
            {genErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 12px', fontSize: 11, color: '#f87171' }}>{genErr}</div>}
          </div>

          <DialogFooter>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button className="cup-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setOpenGen(false)} disabled={genLoading}>Cancel</button>
              <button className="cup-proceed" style={{ flex: 2 }} onClick={async () => { setGenErr(null); setGenLoading(true); try { setOpenGen(false) } catch (e: any) { setGenErr(e?.message || 'Failed') } finally { setGenLoading(false) } }} disabled={genLoading || !genPrompt.trim()}>
                {genLoading ? <><span className="cup-spinner" />Generating…</> : <><Wand2 style={{ width: 14, height: 14 }} />Generate</>}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}