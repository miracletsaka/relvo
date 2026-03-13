'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Upload, Image as ImageIcon, Video, Trash2,
  X, Check, Search, RefreshCw, Layers, ChevronDown,
} from 'lucide-react'
import { uploadFileToSpaces } from '@/lib/upload-client'
import {
  listMediaAssets,
  createMediaAsset,
  deleteMediaAsset,
  listBrands,
  type MediaAsset,
  type MediaAssetType,
} from '@/lib/studio/media-asset-api'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Brand {
  id: string;
  display_name: string;
  is_active: boolean;
  accent_color?: string | null
}

type QueueItem = {
  id:          string
  file:        File
  preview:     string | null
  status:      'pending' | 'uploading' | 'done' | 'error'
  progress:    number
  error?:      string
  url?:        string
  brand_id?:   string
  brand_name?: string
  tags:        string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
function col(brand?: Brand | null) {
  return brand?.accent_color || '#7c3aed'
}

// ─────────────────────────────────────────────────────────────────────────────
// BrandBadge
// ─────────────────────────────────────────────────────────────────────────────
function BrandBadge({ name, size = 'sm' }: { name?: string | null; size?: 'xs' | 'sm' }) {
  const pad = size === 'xs' ? '2px 7px' : '3px 9px'
  const fs  = size === 'xs' ? 9 : 10
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
      color: '#a78bfa', fontSize: fs, fontWeight: 700, padding: pad,
      borderRadius: 20, letterSpacing: '0.05em', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} />
      {name || 'No Brand'}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TypeTab
// ─────────────────────────────────────────────────────────────────────────────
function TypeTab({ active, type, count, onClick }: {
  active: boolean; type: MediaAssetType; count: number; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '8px 16px', borderRadius: 10,
      background: active ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.07)'}`,
      color: active ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
      fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700,
      cursor: 'pointer', transition: 'all 0.15s',
    }}>
      {type === 'image'
        ? <ImageIcon style={{ width: 14, height: 14 }} />
        : <Video style={{ width: 14, height: 14 }} />}
      {type === 'image' ? 'Backgrounds' : 'Videos'}
      <span style={{
        background: active ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)',
        borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700,
      }}>
        {count}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DropZone
// ─────────────────────────────────────────────────────────────────────────────
function DropZone({ type, onFiles }: { type: MediaAssetType; onFiles: (f: File[]) => void }) {
  const [dragging, setDragging] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragging(false)
        const files = Array.from(e.dataTransfer.files).filter((f) =>
          type === 'image' ? f.type.startsWith('image/') : f.type.startsWith('video/')
        )
        if (files.length) onFiles(files)
      }}
      style={{
        border: `2px dashed ${dragging ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 16, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
        background: dragging ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)',
        transition: 'all 0.2s',
      }}
    >
      <input ref={ref} type="file" accept={type === 'image' ? 'image/*' : 'video/*'} multiple
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files) onFiles(Array.from(e.target.files)) }}
      />
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 12px', color: '#a78bfa',
      }}>
        {type === 'image'
          ? <ImageIcon style={{ width: 20, height: 20 }} />
          : <Video style={{ width: 20, height: 20 }} />}
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7', marginBottom: 4 }}>
        Drop {type === 'image' ? 'images' : 'videos'} here
      </p>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
        {type === 'image' ? 'JPG, PNG, WebP' : 'MP4, MOV, WebM'} · or click to browse
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// QueueCard
// ─────────────────────────────────────────────────────────────────────────────
function QueueCard({ item, brands, onRemove, onTagsChange, onBrandChange }: {
  item: QueueItem
  brands: Brand[]
  onRemove: () => void
  onTagsChange: (tags: string[]) => void
  onBrandChange: (brandId: string, brandName: string) => void
}) {
  const [tagInput,      setTagInput]      = useState('')
  const [showBrandDrop, setShowBrandDrop] = useState(false)
  const selectedBrand = brands.find((b) => b.id === item.brand_id)

  const addTag = (v: string) => {
    const t = v.trim().toLowerCase().replace(/^#+/, '')
    if (t && !item.tags.includes(t)) onTagsChange([...item.tags, t])
  }

  const borderColor =
    item.status === 'done'      ? 'rgba(52,211,153,0.25)' :
    item.status === 'error'     ? 'rgba(248,113,113,0.25)' :
    item.status === 'uploading' ? 'rgba(124,58,237,0.25)' :
                                  'rgba(255,255,255,0.07)'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: `1px solid ${borderColor}`,
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Preview */}
      <div style={{ height: 80, background: 'rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden' }}>
        {item.preview && (
          <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
        )}
        {!item.preview && item.file.type.startsWith('video/') && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)' }}>
            <Video style={{ width: 28, height: 28 }} />
          </div>
        )}
        {item.status === 'uploading' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#a78bfa', animation: 'maspin 0.7s linear infinite' }} />
          </div>
        )}
        {item.status === 'done' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check style={{ width: 14, height: 14, color: 'white' }} />
            </div>
          </div>
        )}
        {item.status === 'error' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 20, height: 20, color: '#f87171' }} />
          </div>
        )}
        {item.status !== 'uploading' && (
          <button onClick={onRemove} style={{
            position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 7,
            background: 'rgba(0,0,0,0.6)', border: 'none', color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X style={{ width: 11, height: 11 }} />
          </button>
        )}
      </div>

      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <p style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.file.name}
        </p>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'DM Mono, monospace', marginTop: -5 }}>
          {fmtBytes(item.file.size)}
        </p>

        {/* Brand picker */}
        {item.status === 'pending' && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowBrandDrop((v) => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 8px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8,
                cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700,
                color: selectedBrand ? '#a78bfa' : 'rgba(255,255,255,0.3)',
              }}
            >
              {selectedBrand && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: col(selectedBrand), display: 'inline-block', flexShrink: 0 }} />
              )}
              <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedBrand?.display_name || 'Assign to brand…'}
              </span>
              <ChevronDown style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            </button>
            {showBrandDrop && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: '#1a1a22', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, overflow: 'hidden', marginTop: 3,
              }}>
                {brands.map((b) => (
                  <button key={b.id}
                    onClick={() => { onBrandChange(b.id, b.display_name); setShowBrandDrop(false) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                      padding: '8px 10px', border: 'none', cursor: 'pointer',
                      background: item.brand_id === b.id ? col(b) + '18' : 'transparent',
                      color: item.brand_id === b.id ? '#e4e4e7' : 'rgba(255,255,255,0.5)',
                      fontSize: 10, fontWeight: 700, fontFamily: 'Syne, sans-serif',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col(b), flexShrink: 0 }} />
                    {b.display_name}
                    {item.brand_id === b.id && <Check style={{ width: 10, height: 10, marginLeft: 'auto' }} />}
                  </button>
                ))}
                {brands.length === 0 && (
                  <p style={{ padding: '10px 12px', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>No brands yet</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {item.status === 'pending' && (
          <div>
            {item.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
                {item.tags.map((tag) => (
                  <span key={tag} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6, padding: '2px 7px', fontSize: 9,
                    color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Mono, monospace',
                  }}>
                    #{tag}
                    <button onClick={() => onTagsChange(item.tags.filter((t) => t !== tag))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0, lineHeight: 0 }}>
                      <X style={{ width: 8, height: 8 }} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault(); addTag(tagInput); setTagInput('')
                }
              }}
              onBlur={() => { if (tagInput.trim()) { addTag(tagInput); setTagInput('') } }}
              placeholder="+ add tag, Enter"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7,
                padding: '5px 8px', color: '#e4e4e7',
                fontFamily: 'DM Mono, monospace', fontSize: 10, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {item.error && (
          <p style={{ fontSize: 10, color: '#f87171', fontFamily: 'DM Mono, monospace' }}>{item.error}</p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AssetCard
// ─────────────────────────────────────────────────────────────────────────────
function AssetCard({ asset, onDelete }: { asset: MediaAsset; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try { await deleteMediaAsset(asset.id); onDelete() }
    finally { setDeleting(false); setConfirming(false) }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.15s',
    }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
    >
      {/* Thumbnail */}
      <div style={{ height: 120, background: 'rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden' }}>
        {asset.type === 'image' ? (
          <img src={asset.url} alt={asset.filename}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <video src={asset.url} muted playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}

        {/* Delete */}
        <div style={{ position: 'absolute', top: 6, right: 6 }}>
          {!confirming ? (
            <button onClick={() => setConfirming(true)} style={{
              width: 26, height: 26, borderRadius: 8, background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.3)'; (e.currentTarget as HTMLElement).style.color = '#f87171' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.6)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
            >
              <Trash2 style={{ width: 12, height: 12 }} />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={handleDelete} disabled={deleting} style={{
                width: 26, height: 26, borderRadius: 8, background: 'rgba(239,68,68,0.3)',
                border: '1px solid rgba(239,68,68,0.4)', color: '#f87171',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {deleting
                  ? <div style={{ width: 10, height: 10, border: '1.5px solid rgba(255,255,255,0.2)', borderTopColor: '#f87171', borderRadius: '50%', animation: 'maspin 0.6s linear infinite' }} />
                  : <Check style={{ width: 11, height: 11 }} />}
              </button>
              <button onClick={() => setConfirming(false)} style={{
                width: 26, height: 26, borderRadius: 8, background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X style={{ width: 11, height: 11 }} />
              </button>
            </div>
          )}
        </div>

        {/* Brand badge */}
        <div style={{ position: 'absolute', bottom: 6, left: 6 }}>
          <BrandBadge name={asset.brand_name} size="xs" />
        </div>
      </div>

      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <p style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {asset.filename}
        </p>
        {asset.tags && asset.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {asset.tags.slice(0, 4).map((t) => (
              <span key={t} style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: 4 }}>
                #{t}
              </span>
            ))}
            {asset.tags.length > 4 && (
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>+{asset.tags.length - 4}</span>
            )}
          </div>
        )}
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'DM Mono, monospace' }}>
          {fmtDate(asset.created_at)}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function MediaAssetsPage() {
  const [assetType,       setAssetType]       = useState<MediaAssetType>('image')
  const [filterBrandId,   setFilterBrandId]   = useState<string>('all')
  const [searchQ,         setSearchQ]         = useState('')
  const [assets,          setAssets]          = useState<MediaAsset[]>([])
  const [brands,          setBrands]          = useState<Brand[]>([])
  const [loading,         setLoading]         = useState(true)
  const [err,             setErr]             = useState<string | null>(null)
  const [queue,           setQueue]           = useState<QueueItem[]>([])
  const [uploading,       setUploading]       = useState(false)
  const [uploadBrandId,   setUploadBrandId]   = useState<string>('')
  const [uploadBrandName, setUploadBrandName] = useState<string>('')

  const refresh = async () => {
    setLoading(true); setErr(null)
    try { setAssets(await listMediaAssets()) }
    catch (e: any) { setErr(e?.message || 'Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    listBrands(false).then(setBrands).catch(() => {})
    refresh()
  }, [])

  const addToQueue = (files: File[]) => {
    const items: QueueItem[] = files.map((file) => ({
      id:         Math.random().toString(36).slice(2),
      file,
      preview:    file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      status:     'pending',
      progress:   0,
      brand_id:   uploadBrandId   || undefined,
      brand_name: uploadBrandName || undefined,
      tags:       [],
    }))
    setQueue((prev) => [...prev, ...items])
  }

  const updateQueueItem = (id: string, patch: Partial<QueueItem>) =>
    setQueue((prev) => prev.map((i) => i.id === id ? { ...i, ...patch } : i))

  const removeFromQueue = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((i) => i.id !== id)
    })
  }

  const uploadAll = async () => {
    const pending = queue.filter((i) => i.status === 'pending')
    if (!pending.length) return
    setUploading(true)
    for (const item of pending) {
      updateQueueItem(item.id, { status: 'uploading', progress: 10 })
      try {
        updateQueueItem(item.id, { progress: 40 })
        const url = await uploadFileToSpaces(item.file)
        updateQueueItem(item.id, { progress: 80 })
        await createMediaAsset({
          url,
          filename:   item.file.name,
          type:       item.file.type.startsWith('image/') ? 'image' : 'video',
          brand_id:   item.brand_id   || undefined,
          brand_name: item.brand_name || undefined,
          tags:       item.tags,
          size_bytes: item.file.size,
          mime_type:  item.file.type,
        })
        updateQueueItem(item.id, { status: 'done', progress: 100, url })
      } catch (e: any) {
        updateQueueItem(item.id, { status: 'error', error: e?.message || 'Upload failed' })
      }
    }
    setUploading(false)
    await refresh()
    setTimeout(() => setQueue((prev) => prev.filter((i) => i.status !== 'done')), 2000)
  }

  const filteredAssets = assets.filter((a) => {
    if (a.type !== assetType) return false
    if (filterBrandId !== 'all' && a.brand_id !== filterBrandId) return false
    if (searchQ) {
      const q = searchQ.toLowerCase()
      return (
        a.filename.toLowerCase().includes(q) ||
        (a.tags || []).some((t) => t.includes(q)) ||
        (a.brand_name || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const imageCnt   = assets.filter((a) => a.type === 'image').length
  const videoCnt   = assets.filter((a) => a.type === 'video').length
  const pendingCnt = queue.filter((i) => i.status === 'pending').length

  const filterOptions: (Brand & { id: string })[] = [
    { id: 'all', display_name: 'All Brands', is_active: true, accent_color: '#6b7280' },
    ...brands,
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .ma-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .ma-root { font-family: 'Syne', sans-serif; background: #0c0c0f; min-height: 100vh; color: #e4e4e7; }
        @keyframes maspin { to { transform: rotate(360deg); } }
        .ma-search {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 8px 12px 8px 36px; color: #e4e4e7;
          font-family: 'DM Mono', monospace; font-size: 11px; width: 100%;
          transition: border-color 0.2s; box-sizing: border-box;
        }
        .ma-search:focus { outline: none; border-color: rgba(124,58,237,0.5); }
        .ma-search::placeholder { color: rgba(255,255,255,0.2); }
        .upload-btn {
          display: inline-flex; align-items: center; gap: 7px; padding: 10px 20px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5); border: none;
          border-radius: 11px; font-family: 'Syne', sans-serif; font-size: 12px;
          font-weight: 700; color: white; cursor: pointer; transition: opacity 0.15s;
          letter-spacing: 0.04em;
        }
        .upload-btn:hover:not(:disabled) { opacity: 0.85; }
        .upload-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ma-skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 14px;
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .ma-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px 20px; gap: 10px; color: rgba(255,255,255,0.15);
          border: 2px dashed rgba(255,255,255,0.07); border-radius: 16px;
        }
      `}</style>

      <div className="ma-root">
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(124,58,237,0.7)', marginBottom: 4 }}>
                  Media Assets
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e4e4e7', lineHeight: 1.15 }}>
                  Backgrounds & Videos
                </h1>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 5, maxWidth: 480 }}>
                  Upload branded visuals per brand. The scene generator pulls automatically from the active brand's media pool.
                </p>
              </div>

              {/* Stat cards */}
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                {[
                  { label: 'Images', value: imageCnt, color: '#a78bfa' },
                  { label: 'Videos', value: videoCnt, color: '#34d399' },
                ].map((s) => (
                  <div key={s.label} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12, padding: '10px 18px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Brand summary pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              {brands.map((b) => {
                const cnt = assets.filter((a) => a.brand_id === b.id).length
                return (
                  <div key={b.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${col(b)}22`,
                    borderRadius: 8, padding: '4px 10px',
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: col(b), display: 'inline-block' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{b.display_name}</span>
                    <span style={{ fontSize: 10, color: col(b), fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{cnt}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {err && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#f87171', marginBottom: 16 }}>
              {err}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>

            {/* ── LEFT: Upload panel ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 20 }}>
              <div style={{
                background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16, overflow: 'hidden',
              }}>
                {/* Brand selector */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
                    Assign to Brand
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {brands.map((b) => (
                      <button key={b.id}
                        onClick={() => { setUploadBrandId(b.id); setUploadBrandName(b.display_name) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                          borderRadius: 9, cursor: 'pointer', textAlign: 'left', border: 'none',
                          background: uploadBrandId === b.id ? col(b) + '18' : 'transparent',
                          outline: uploadBrandId === b.id ? `1px solid ${col(b)}40` : '1px solid transparent',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: col(b), flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: uploadBrandId === b.id ? '#e4e4e7' : 'rgba(255,255,255,0.45)' }}>
                          {b.display_name}
                        </span>
                        {uploadBrandId === b.id && (
                          <Check style={{ width: 12, height: 12, color: col(b), flexShrink: 0 }} />
                        )}
                      </button>
                    ))}
                    {brands.length === 0 && (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', padding: '6px 4px' }}>
                        No brands yet — create one in Brands.
                      </p>
                    )}
                  </div>
                </div>

                {/* Type toggle + dropzone */}
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {(['image', 'video'] as MediaAssetType[]).map((t) => (
                      <button key={t} onClick={() => setAssetType(t)} style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        padding: '7px', borderRadius: 9, cursor: 'pointer',
                        fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                        background: assetType === t ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${assetType === t ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.07)'}`,
                        color: assetType === t ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                      }}>
                        {t === 'image' ? <ImageIcon style={{ width: 13, height: 13 }} /> : <Video style={{ width: 13, height: 13 }} />}
                        {t === 'image' ? 'Images' : 'Videos'}
                      </button>
                    ))}
                  </div>
                  <DropZone type={assetType} onFiles={addToQueue} />
                </div>
              </div>

              {/* Queue */}
              {queue.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#e4e4e7' }}>Upload Queue</span>
                      <span style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 10, padding: '1px 7px', fontSize: 10, color: '#c4b5fd', fontWeight: 700 }}>
                        {queue.length}
                      </span>
                    </div>
                    {!uploading && (
                      <button onClick={() => setQueue([])} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 10, fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
                        Clear all
                      </button>
                    )}
                  </div>
                  <div style={{ padding: 10, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                    {queue.map((item) => (
                      <QueueCard
                        key={item.id}
                        item={item}
                        brands={brands}
                        onRemove={() => removeFromQueue(item.id)}
                        onTagsChange={(tags) => updateQueueItem(item.id, { tags })}
                        onBrandChange={(bid, bname) => updateQueueItem(item.id, { brand_id: bid, brand_name: bname })}
                      />
                    ))}
                  </div>
                  <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button className="upload-btn" style={{ width: '100%', justifyContent: 'center' }}
                      onClick={uploadAll} disabled={uploading || pendingCnt === 0}>
                      {uploading ? (
                        <>
                          <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'maspin 0.7s linear infinite' }} />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <Upload style={{ width: 14, height: 14 }} />
                          Upload {pendingCnt} file{pendingCnt !== 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT: Library ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <TypeTab active={assetType === 'image'} type="image" count={imageCnt} onClick={() => setAssetType('image')} />
                  <TypeTab active={assetType === 'video'} type="video" count={videoCnt} onClick={() => setAssetType('video')} />
                </div>
                <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
                  <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                  <input className="ma-search" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search by name, tag or brand…" />
                </div>
                <button onClick={refresh} style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <RefreshCw style={{ width: 13, height: 13 }} />
                </button>
              </div>

              {/* Brand filter pills */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {filterOptions.map((b) => {
                  const isActive = filterBrandId === b.id
                  const c        = col(b)
                  const cnt      = b.id === 'all'
                    ? assets.filter((a) => a.type === assetType).length
                    : assets.filter((a) => a.brand_id === b.id && a.type === assetType).length
                  return (
                    <button key={b.id}
                      onClick={() => setFilterBrandId(isActive && b.id !== 'all' ? 'all' : b.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px',
                        borderRadius: 8, fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', border: 'none',
                        background: isActive ? c + '18' : 'rgba(255,255,255,0.04)',
                        outline: isActive ? `1px solid ${c}45` : '1px solid rgba(255,255,255,0.07)',
                        color: isActive ? c : 'rgba(255,255,255,0.35)',
                      }}
                    >
                      {b.id === 'all'
                        ? <Layers style={{ width: 11, height: 11 }} />
                        : <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block' }} />}
                      {b.display_name}
                      <span style={{ fontSize: 9, opacity: 0.6 }}>{cnt}</span>
                    </button>
                  )
                })}
              </div>

              {/* Grid */}
              {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="ma-skeleton" style={{ height: 180, animationDelay: `${i * 0.07}s` }} />
                  ))}
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="ma-empty">
                  {assetType === 'image'
                    ? <ImageIcon style={{ width: 36, height: 36 }} />
                    : <Video style={{ width: 36, height: 36 }} />}
                  <p style={{ fontSize: 13, fontWeight: 700 }}>
                    No {assetType === 'image' ? 'backgrounds' : 'videos'} found
                  </p>
                  <p style={{ fontSize: 11, textAlign: 'center', maxWidth: 220 }}>
                    {filterBrandId !== 'all'
                      ? 'No assets for this brand yet — upload some on the left'
                      : 'Select a brand, then upload files'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                  {filteredAssets.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} onDelete={refresh} />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}