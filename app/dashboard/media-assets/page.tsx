'use client'

import { useEffect, useMemo, useState } from 'react'
import { uploadFileToSpaces } from '@/lib/upload-client'
import {
  listMediaAssets,
  createMediaAsset,
  listBrands,
  type MediaAsset,
  type MediaAssetType,
} from '@/lib/studio/media-asset-api'
import MediaAssetsHeader from '@/components/media-assets/MediaAssetsHeader'
import MobileTabs from '@/components/media-assets/MobileTabs'
import UploadPanel from '@/components/media-assets/UploadPanel'
import LibraryPanel from '@/components/media-assets/LibraryPanel'
import type { Brand, MobileTab, QueueItem } from '@/components/media-assets/types'
import { cleanOrUndefined, createQueueItem, toNumberOrUndefined } from '@/components/media-assets/helpers'

export default function MediaAssetsPage() {
  const [assetType, setAssetType] = useState<MediaAssetType>('image')
  const [filterBrandId, setFilterBrandId] = useState<string>('all')
  const [searchQ, setSearchQ] = useState('')
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadBrandId, setUploadBrandId] = useState<string>('')
  const [uploadBrandName, setUploadBrandName] = useState<string>('')
  const [mobileTab, setMobileTab] = useState<MobileTab>('library')

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      setAssets(await listMediaAssets())
    } catch (e: any) {
      setErr(e?.message || 'Failed to load media assets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    listBrands(false).then(setBrands).catch(() => {})
    refresh()
  }, [])

  const addToQueue = (files: File[]) => {
    setQueue((prev) => [
      ...prev,
      ...files.map((file) => createQueueItem(file, uploadBrandId, uploadBrandName)),
    ])
    setMobileTab('upload')
  }

  const updateQueueItem = (id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeFromQueue = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((i) => i.id !== id)
    })
  }

  const clearQueue = () => {
    queue.forEach((item) => { if (item.preview) URL.revokeObjectURL(item.preview) })
    setQueue([])
  }

  const uploadAll = async () => {
    const pending = queue.filter((item) => item.status === 'pending')
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
          filename: item.file.name,
          type: item.file.type.startsWith('image/') ? 'image' : 'video',
          brand_id: item.brand_id || undefined,
          brand_name: item.brand_name || undefined,
          tags: item.tags,
          size_bytes: item.file.size,
          mime_type: item.file.type,
          title: cleanOrUndefined(item.title),
          description: cleanOrUndefined(item.description),
          price: toNumberOrUndefined(item.price),
          price_currency: item.price_currency || 'MWK',
          compare_at_price: toNumberOrUndefined(item.compare_at_price),
          discount_label: cleanOrUndefined(item.discount_label),
          offer_title: cleanOrUndefined(item.offer_title),
          offer_description: cleanOrUndefined(item.offer_description),
          cta_text: cleanOrUndefined(item.cta_text),
          cta_url: cleanOrUndefined(item.cta_url),
          availability: item.availability,
          product_category: cleanOrUndefined(item.product_category),
          service_area: cleanOrUndefined(item.service_area),
          features: item.features,
        } as any)
        updateQueueItem(item.id, { status: 'done', progress: 100, url })
      } catch (e: any) {
        updateQueueItem(item.id, { status: 'error', error: e?.message || 'Upload failed' })
      }
    }

    setUploading(false)
    await refresh()
    setTimeout(() => {
      setQueue((prev) => {
        prev.filter((i) => i.status === 'done').forEach((i) => {
          if (i.preview) URL.revokeObjectURL(i.preview)
        })
        return prev.filter((i) => i.status !== 'done')
      })
    }, 2000)
  }

  const filteredAssets = useMemo(() => {
    const query = searchQ.toLowerCase().trim()
    return assets.filter((asset: any) => {
      if (asset.type !== assetType) return false
      if (filterBrandId !== 'all' && asset.brand_id !== filterBrandId) return false
      if (!query) return true
      return (
        (asset.filename || '').toLowerCase().includes(query) ||
        (asset.title || '').toLowerCase().includes(query) ||
        (asset.description || '').toLowerCase().includes(query) ||
        (asset.offer_title || '').toLowerCase().includes(query) ||
        (asset.discount_label || '').toLowerCase().includes(query) ||
        (asset.product_category || '').toLowerCase().includes(query) ||
        (asset.service_area || '').toLowerCase().includes(query) ||
        String(asset.price || '').toLowerCase().includes(query) ||
        (asset.tags || []).some((tag: string) => tag.toLowerCase().includes(query)) ||
        (asset.features || []).some((f: string) => f.toLowerCase().includes(query)) ||
        (asset.brand_name || '').toLowerCase().includes(query)
      )
    })
  }, [assets, assetType, filterBrandId, searchQ])

  const imageCount = assets.filter((a) => a.type === 'image').length
  const videoCount = assets.filter((a) => a.type === 'video').length
  const pendingCount = queue.filter((i) => i.status === 'pending').length

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .ma-root {
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          background: #f4f4f6;
          /* subtle noise texture for depth */
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.022'/%3E%3C/svg%3E");
        }

        /* 2-col grid: upload col narrow, library col fills rest */
        .ma-main-grid {
          grid-template-columns: 300px 1fr;
        }
        @media (max-width: 900px) {
          .ma-main-grid { grid-template-columns: 1fr !important; }
        }

        .mobile-hidden {
          display: none !important;
        }
        @media (min-width: 769px) {
          .mobile-hidden { display: unset !important; }
        }

        /* Error banner */
        .ma-error {
          background: rgba(239,68,68,0.07);
          border: 1px solid rgba(239,68,68,0.18);
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 500;
          color: #b91c1c;
          margin-bottom: 16px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
        }
      `}</style>

      <div className="ma-root">
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <MediaAssetsHeader
            brands={brands}
            assets={assets}
            imageCount={imageCount}
            videoCount={videoCount}
          />

          {err && <div className="ma-error">{err}</div>}

          <MobileTabs
            active={mobileTab}
            onChange={setMobileTab}
            libraryCount={filteredAssets.length}
            queueCount={queue.length}
          />

          <div className="ma-main-grid" style={{ display: 'grid', gap: 20, alignItems: 'start' }}>
            <div className={mobileTab === 'library' ? 'mobile-hidden' : ''}>
              <UploadPanel
                brands={brands}
                assetType={assetType}
                setAssetType={setAssetType}
                uploadBrandId={uploadBrandId}
                setUploadBrandId={setUploadBrandId}
                setUploadBrandName={setUploadBrandName}
                queue={queue}
                uploading={uploading}
                pendingCount={pendingCount}
                onFiles={addToQueue}
                onClearQueue={clearQueue}
                onUploadAll={uploadAll}
                onRemove={removeFromQueue}
                onPatch={updateQueueItem}
              />
            </div>

            <div className={mobileTab === 'upload' ? 'mobile-hidden' : ''}>
              <LibraryPanel
                assets={assets}
                filteredAssets={filteredAssets}
                brands={brands}
                loading={loading}
                assetType={assetType}
                setAssetType={setAssetType}
                filterBrandId={filterBrandId}
                setFilterBrandId={setFilterBrandId}
                searchQ={searchQ}
                setSearchQ={setSearchQ}
                imageCount={imageCount}
                videoCount={videoCount}
                onRefresh={refresh}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}