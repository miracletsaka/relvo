// lib/api/media-assets.ts
// Brand-scoped media assets — category replaced by brand_id

export type MediaAssetType = 'image' | 'video'

export interface MediaAsset {
  id:          string
  url:         string
  filename:    string
  type:        MediaAssetType
  brand_id?:   string | null
  brand_name?: string | null
  tags:        string[]
  size_bytes?: number
  mime_type?:  string
  width?:      number
  height?:     number
  created_at:  string
  updated_at:  string
}

export interface CreateMediaAssetPayload {
  url:         string
  filename:    string
  type:        MediaAssetType
  brand_id?:   string | null
  brand_name?: string | null
  tags?:       string[]
  size_bytes?: number
  mime_type?:  string
  width?:      number
  height?:     number
}

const BASE = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '')

export async function listMediaAssets(filters?: {
  type?:     MediaAssetType
  brand_id?: string
}): Promise<MediaAsset[]> {
  const params = new URLSearchParams()
  if (filters?.type)     params.set('type',     filters.type)
  if (filters?.brand_id) params.set('brand_id', filters.brand_id)
  const qs = params.toString()
  const res = await fetch(`${BASE}/media-assets/${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error(`Failed to fetch media assets (${res.status})`)
  return res.json()
}

export async function createMediaAsset(payload: CreateMediaAssetPayload): Promise<MediaAsset> {
  const res = await fetch(`${BASE}/media-assets/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Failed to create media asset (${res.status})`)
  return res.json()
}

export async function updateMediaAsset(
  id:      string,
  payload: Partial<Pick<MediaAsset, 'brand_id' | 'brand_name' | 'tags'>>,
): Promise<MediaAsset> {
  const res = await fetch(`${BASE}/media-assets/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Failed to update media asset (${res.status})`)
  return res.json()
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const res = await fetch(`${BASE}/media-assets/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete media asset (${res.status})`)
}

/** Portrait video assets for a brand — used by Studio scene generator */
export async function getBrandVideoAssets(brandId: string): Promise<MediaAsset[]> {
  const assets = await listMediaAssets({ type: 'video', brand_id: brandId })
  const portrait = assets.filter(a => !a.width || !a.height || a.height > a.width)
  return portrait.length ? portrait : assets
}

/** Image assets for a brand — used by image generation dialog */
export async function getBrandImageAssets(brandId: string): Promise<MediaAsset[]> {
  return listMediaAssets({ type: 'image', brand_id: brandId })
}