import { Image as ImageIcon, Video } from 'lucide-react'
import type { MediaAssetType } from './types'

export default function TypeTab({ active, type, count, onClick }: {
  active: boolean
  type: MediaAssetType
  count: number
  onClick: () => void
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
      {type === 'image' ? <ImageIcon style={{ width: 14, height: 14 }} /> : <Video style={{ width: 14, height: 14 }} />}
      {type === 'image' ? 'Images' : 'Videos'}
      <span style={{
        background: active ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)',
        borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700,
      }}>{count}</span>
    </button>
  )
}
