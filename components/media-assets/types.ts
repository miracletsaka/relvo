import type { MediaAsset, MediaAssetType } from '@/lib/studio/media-asset-api'

export type { MediaAsset, MediaAssetType }

export interface Brand {
  id: string
  display_name: string
  is_active: boolean
  accent_color?: string | null
}

export type QueueItemStatus = 'pending' | 'uploading' | 'done' | 'error'

export type AssetAvailability = 'available' | 'limited' | 'sold_out' | 'coming_soon' | 'hidden'

export type QueueItem = {
  id: string
  file: File
  preview: string | null
  status: QueueItemStatus
  progress: number
  error?: string
  url?: string
  brand_id?: string
  brand_name?: string
  tags: string[]

  // Product / offer metadata
  title: string
  description: string
  price: string
  price_currency: string
  compare_at_price: string
  discount_label: string
  offer_title: string
  offer_description: string
  cta_text: string
  cta_url: string
  availability: AssetAvailability
  product_category: string
  service_area: string
  features: string[]
}

export type MobileTab = 'upload' | 'library'
