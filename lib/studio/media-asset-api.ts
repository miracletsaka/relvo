// lib/api/media-assets.ts
// Brand-scoped media assets — category replaced by brand_id

import { api, Brand } from "../api"

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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ''

export function listBrands(active_only = true) {
  return api<Brand[]>(`/brands?active_only=${active_only ? "true" : "false"}`);
}

export async function listMediaAssets(filters?: {
  type?:     MediaAssetType
  brand_id?: string
}): Promise<MediaAsset[]> {
  const params = new URLSearchParams()
  if (filters?.type)     params.set('type',     filters.type)
  if (filters?.brand_id) params.set('brand_id', filters.brand_id)
  const res = await fetch(`${API_BASE}/media-assets?${params}`)
  if (!res.ok) throw new Error('Failed to fetch media assets')
  return res.json()
}

export async function createMediaAsset(payload: CreateMediaAssetPayload): Promise<MediaAsset> {
  const res = await fetch(`${API_BASE}/media-assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create media asset')
  return res.json()
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/media-assets/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete media asset')
}

/** Fetch portrait video assets for a brand — used by Studio scene generator */
export async function getBrandVideoAssets(brandId: string): Promise<MediaAsset[]> {
  const assets = await listMediaAssets({ type: 'video', brand_id: brandId })
  // Portrait filter (height > width) client-side as fallback if backend doesn't do it
  const portrait = assets.filter(a => !a.width || !a.height || a.height > a.width)
  return portrait.length ? portrait : assets
}

/** Fetch image assets for a brand — used by image generation dialog */
export async function getBrandImageAssets(brandId: string): Promise<MediaAsset[]> {
  return listMediaAssets({ type: 'image', brand_id: brandId })
}