// Merge these fields into your existing `MediaAsset` and `CreateMediaAssetPayload`
// in `@/lib/studio/media-asset-api.ts`.
// Keep your existing API functions/base URL exactly as they are.

export type AssetAvailability = 'available' | 'limited' | 'sold_out' | 'coming_soon' | 'hidden'

export type MediaAssetProductFields = {
  title?: string | null
  description?: string | null
  price?: number | null
  price_currency?: string | null
  compare_at_price?: number | null
  discount_label?: string | null
  offer_title?: string | null
  offer_description?: string | null
  cta_text?: string | null
  cta_url?: string | null
  availability?: AssetAvailability | string | null
  product_category?: string | null
  service_area?: string | null
  features?: string[]
  metadata?: Record<string, any>
}

// Example:
// export type MediaAsset = ExistingMediaAssetBase & MediaAssetProductFields
// export type CreateMediaAssetPayload = ExistingCreatePayloadBase & MediaAssetProductFields
