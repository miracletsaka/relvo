import type { Brand, MediaAsset } from './types'
import { brandColor } from './helpers'

export default function MediaAssetsHeader({ brands, assets, imageCount, videoCount }: {
  brands: Brand[]
  assets: MediaAsset[]
  imageCount: number
  videoCount: number
}) {
  return (
    <div style={{ marginBottom: 24, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(124,85,246,0.65)', marginBottom: 4,
          }}>
            Media Assets
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.18, margin: 0 }}>
            Product, Service &amp; Campaign Assets
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.38)', marginTop: 5, maxWidth: 520, lineHeight: 1.6 }}>
            Upload branded visuals with product, offer, pricing and service details. The scene generator can use this data inside campaign ads.
          </p>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          {[
            { label: 'Images', value: imageCount, color: '#7c55f6' },
            { label: 'Videos', value: videoCount, color: '#10b981' },
          ].map((s) => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: 14,
              padding: '10px 20px',
              textAlign: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 8px rgba(0,0,0,0.05)',
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.35)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand pills */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
        {brands.map((b) => {
          const count = assets.filter((a) => a.brand_id === b.id).length
          const c = brandColor(b)
          return (
            <div key={b.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.65)',
              border: `1px solid ${c}28`,
              borderRadius: 9,
              padding: '4px 11px',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.55)' }}>{b.display_name}</span>
              <span style={{ fontSize: 10, color: c, fontWeight: 700 }}>{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}