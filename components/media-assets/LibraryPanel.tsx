import { Image as ImageIcon, Layers, RefreshCw, Search, Video } from 'lucide-react'
import AssetCard from '@/components/asset-card'
import TypeTab from './TypeTab'
import type { Brand, MediaAsset, MediaAssetType } from './types'
import { brandColor } from './helpers'

export default function LibraryPanel({
  assets,
  filteredAssets,
  brands,
  loading,
  assetType,
  setAssetType,
  filterBrandId,
  setFilterBrandId,
  searchQ,
  setSearchQ,
  imageCount,
  videoCount,
  onRefresh,
}: {
  assets: MediaAsset[]
  filteredAssets: MediaAsset[]
  brands: Brand[]
  loading: boolean
  assetType: MediaAssetType
  setAssetType: (type: MediaAssetType) => void
  filterBrandId: string
  setFilterBrandId: (id: string) => void
  searchQ: string
  setSearchQ: (value: string) => void
  imageCount: number
  videoCount: number
  onRefresh: () => void
}) {
  const filterOptions: (Brand & { id: string })[] = [
    { id: 'all', display_name: 'All Brands', is_active: true, accent_color: '#6b7280' },
    ...brands,
  ]

  return (
    <>
      <style>{`
        .lib-search-wrap {
          position: relative;
          flex: 1;
          max-width: 320px;
        }
        .lib-search-icon {
          position: absolute;
          left: 11px; top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: rgba(0,0,0,0.28);
        }
        .lib-search {
          width: 100%;
          padding: 9px 14px 9px 32px;
          border-radius: 13px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(8px);
          color: #1a1a2e;
          font-size: 12px;
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 4px rgba(0,0,0,0.04);
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .lib-search::placeholder { color: rgba(0,0,0,0.28); }
        .lib-search:focus {
          border-color: rgba(124,85,246,0.4);
          box-shadow: 0 0 0 3px rgba(124,85,246,0.09), inset 0 1px 0 rgba(255,255,255,0.95);
        }

        .lib-refresh-btn {
          width: 36px; height: 36px;
          border-radius: 11px;
          background: rgba(255,255,255,0.65);
          border: 1px solid rgba(0,0,0,0.08);
          color: rgba(0,0,0,0.4);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.05);
          transition: all 0.15s;
        }
        .lib-refresh-btn:hover {
          background: rgba(255,255,255,0.9);
          color: rgba(0,0,0,0.65);
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 2px 8px rgba(0,0,0,0.07);
        }

        .lib-filter-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 999px;
          font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
        }

        .lib-skeleton {
          border-radius: 14px;
          background: rgba(255,255,255,0.5);
          border: 1px solid rgba(0,0,0,0.06);
          animation: lib-pulse 1.4s ease-in-out infinite;
        }
        @keyframes lib-pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.45; }
        }

        .lib-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 56px 24px;
          border-radius: 18px;
          border: 1px dashed rgba(0,0,0,0.1);
          background: rgba(255,255,255,0.4);
          color: rgba(0,0,0,0.3);
          font-family: 'Inter', sans-serif;
          text-align: center;
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'Inter, sans-serif' }}>

        {/* ── Controls row ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <TypeTab active={assetType === 'image'} type="image" count={imageCount} onClick={() => setAssetType('image')} />
            <TypeTab active={assetType === 'video'} type="video" count={videoCount} onClick={() => setAssetType('video')} />
          </div>

          <div className="lib-search-wrap">
            <Search className="lib-search-icon" style={{ width: 13, height: 13 }} />
            <input
              className="lib-search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search by name, tag, offer, price or brand…"
            />
          </div>

          <button className="lib-refresh-btn" onClick={onRefresh} title="Refresh">
            <RefreshCw style={{ width: 13, height: 13 }} />
          </button>
        </div>

        {/* ── Brand filter pills ── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filterOptions.map((b) => {
            const active = filterBrandId === b.id
            const c = brandColor(b)
            const count = b.id === 'all'
              ? assets.filter((a) => a.type === assetType).length
              : assets.filter((a) => a.brand_id === b.id && a.type === assetType).length

            return (
              <button
                key={b.id}
                onClick={() => setFilterBrandId(active && b.id !== 'all' ? 'all' : b.id)}
                className="lib-filter-btn"
                style={{
                  background: active ? `${c}12` : 'rgba(255,255,255,0.55)',
                  border: active ? `1px solid ${c}38` : '1px solid rgba(0,0,0,0.07)',
                  color: active ? c : 'rgba(0,0,0,0.45)',
                }}
              >
                {b.id === 'all'
                  ? <Layers style={{ width: 11, height: 11 }} />
                  : <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />
                }
                {b.display_name}
                <span style={{ fontSize: 9, opacity: 0.65, fontWeight: 700 }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="lib-skeleton"
                style={{ height: 180, animationDelay: `${i * 0.07}s` }}
              />
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="lib-empty">
            {assetType === 'image'
              ? <ImageIcon style={{ width: 34, height: 34 }} />
              : <Video style={{ width: 34, height: 34 }} />
            }
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'rgba(0,0,0,0.45)' }}>
              No {assetType === 'image' ? 'images' : 'videos'} found
            </p>
            <p style={{ fontSize: 11, maxWidth: 260, margin: 0, lineHeight: 1.6, color: 'rgba(0,0,0,0.3)' }}>
              {filterBrandId !== 'all'
                ? 'No assets for this brand yet — upload some on the left.'
                : 'Select a brand, then upload files with product or offer details.'
              }
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {filteredAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} onDelete={onRefresh} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}