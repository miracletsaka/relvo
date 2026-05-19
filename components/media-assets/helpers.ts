import type { Brand, QueueItem } from './types'

export function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export function brandColor(brand?: Brand | null) {
  return brand?.accent_color || '#7c3aed'
}

export function createQueueItem(file: File, brandId?: string, brandName?: string): QueueItem {
  return {
    id: Math.random().toString(36).slice(2),
    file,
    preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    status: 'pending',
    progress: 0,
    brand_id: brandId || undefined,
    brand_name: brandName || undefined,
    tags: [],
    title: '',
    description: '',
    price: '',
    price_currency: 'MWK',
    compare_at_price: '',
    discount_label: '',
    offer_title: '',
    offer_description: '',
    cta_text: '',
    cta_url: '',
    availability: 'available',
    product_category: '',
    service_area: '',
    features: [],
  }
}

export function toNumberOrUndefined(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

export function cleanOrUndefined(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}
