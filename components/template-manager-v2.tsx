'use client'

import { useEffect, useMemo, useState } from 'react'
import { Template } from '@/lib/types'
import {
  RefreshCcw,
  Trash2,
  Pencil,
  Check,
  Search,
  LayoutTemplate,
  Palette,
} from 'lucide-react'
import { getTemplates, deleteTemplate, updateTemplate } from '@/lib/template-storage'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

type ToneOption = {
  id: string
  name: string
  label?: string
  description?: string
  emoji?: string
}

interface Props {
  brandId?: string
  selectedTemplateId?: string | null
  onSelectTemplate: (t: Template) => void
  onDeleted?: (id: string) => void
  onUpdated?: (t: Template) => void
}

const API = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '')

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...((opts.headers as any) || {}) },
    ...opts,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.detail || json.message || `Error ${res.status}`)
  return json as T
}

export default function TemplateManagerV2({
  brandId,
  selectedTemplateId,
  onSelectTemplate,
  onDeleted,
  onUpdated,
}: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [tones, setTones] = useState<ToneOption[]>([])
  const [search, setSearch] = useState('')
  const [toneFilter, setToneFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editToneId, setEditToneId] = useState<string>('')
  const [editSaving, setEditSaving] = useState(false)

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const [templateRows, toneRows] = await Promise.all([
        getTemplates(brandId, toneFilter !== 'all' ? { toneId: toneFilter } : undefined),
        apiFetch<ToneOption[]>('/tones?active_only=true'),
      ])
      setTemplates(templateRows || [])
      setTones(toneRows || [])
    } catch (e: any) {
      setErr(e?.message || 'Failed to load templates')
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [brandId, toneFilter])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return templates

    return templates.filter((t: any) => {
      const toneText = `${t.tone_label || ''} ${t.tone_name || ''}`.toLowerCase()
      return (
        (t.name || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        toneText.includes(q)
      )
    })
  }, [templates, search])

  const openEdit = (t: Template) => {
    setErr(null)
    setEditing(t)
    setEditName(t.name || '')
    setEditDescription(t.description || '')
    setEditToneId((t as any).tone_id || '')
    setEditOpen(true)
  }

const saveEdit = async () => {
  if (!editing) return

  const name = editName.trim()

  if (!name) {
    setErr('Template name is required.')
    return
  }

  if (!brandId) {
    setErr('A brand must be selected before updating a template.')
    return
  }

  if (!editToneId) {
    setErr('Template must have a tone. Please select a tone.')
    return
  }

  setEditSaving(true)
  setErr(null)

  try {
    const res = await updateTemplate(editing.id, {
      name,
      description: editDescription.trim() || null,
      tone_id: editToneId, // 🚫 NEVER NULL
    })

      if (!res?.ok) throw new Error('Update failed')

      const selectedTone = tones.find((t) => t.id === editToneId)

      const updated: Template = {
        ...editing,
        name,
        description: editDescription.trim() || undefined,
        updatedAt: new Date().toISOString(),
        ...(editToneId ? { tone_id: editToneId } : { tone_id: null }),
        tone_name: selectedTone?.name || undefined,
        tone_label: selectedTone?.label || undefined,
      } as any

      setTemplates((prev) => prev.map((t) => (t.id === editing.id ? updated : t)))
      onUpdated?.(updated)
      setEditOpen(false)
      setEditing(null)
    } catch (e: any) {
      setErr(e?.message || 'Failed to update')
    } finally {
      setEditSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    setErr(null)
    try {
      if (!(await deleteTemplate(deleteId))) throw new Error('Delete failed')
      setTemplates((prev) => prev.filter((t) => t.id !== deleteId))
      onDeleted?.(deleteId)
      setDeleteId(null)
    } catch (e: any) {
      setErr(e?.message || 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');

        .tmv2-search {
          flex: 1;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 9px;
          padding: 7px 12px 7px 34px;
          color: #e4e4e7;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          transition: border-color 0.2s;
          outline: none;
        }
        .tmv2-search::placeholder { color: rgba(255,255,255,0.2); }
        .tmv2-search:focus { border-color: rgba(124,58,237,0.5); background: rgba(255,255,255,0.07); }

        .tmv2-select {
          height: 32px;
          min-width: 150px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 9px;
          padding: 0 10px;
          color: #e4e4e7;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          outline: none;
        }

        .tmv2-card {
          width: 180px;
          min-width: 180px;
          max-width: 180px;
          flex-shrink: 0;
          border-radius: 14px;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          display: flex;
          flex-direction: column;
          position: relative;
          scroll-snap-align: start;
        }
        .tmv2-card:hover {
          border-color: rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.055);
        }
        .tmv2-card.selected {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.22);
          background: rgba(124,58,237,0.06);
        }

        .tmv2-thumb {
          width: 100%;
          aspect-ratio: 3/4;
          background: rgba(255,255,255,0.04);
          overflow: hidden;
          position: relative;
          flex-shrink: 0;
        }
        .tmv2-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.25s;
        }
        .tmv2-card:hover .tmv2-thumb img { transform: scale(1.04); }

        .tmv2-overlay {
          position: absolute;
          inset: 0;
          background: rgba(124,58,237,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(1px);
        }
        .tmv2-check-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #7c3aed;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(124,58,237,0.5);
        }

        .tmv2-no-thumb {
          width: 100%;
          aspect-ratio: 3/4;
          background: rgba(255,255,255,0.03);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 6px;
          color: rgba(255,255,255,0.15);
        }

        .tmv2-body {
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }
        .tmv2-name {
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: #e4e4e7;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tmv2-meta {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: rgba(255,255,255,0.25);
        }
        .tmv2-desc {
          font-size: 10px;
          color: rgba(255,255,255,0.35);
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .tmv2-tone-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          width: fit-content;
          max-width: 100%;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(124,58,237,0.12);
          border: 1px solid rgba(124,58,237,0.22);
          color: #c4b5fd;
          font-size: 9px;
          font-weight: 700;
          line-height: 1;
        }

        .tmv2-actions {
          display: flex;
          gap: 4px;
          padding: 0 10px 10px;
        }
        .tmv2-action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
          border-radius: 7px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          transition: all 0.15s;
          font-size: 0;
        }
        .tmv2-action-btn:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
        .tmv2-action-btn.danger:hover { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.25); color: #f87171; }

        .tmv2-selected-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(124,58,237,0.2);
          border: 1px solid rgba(124,58,237,0.35);
          border-radius: 20px;
          padding: 2px 7px;
          font-size: 9px;
          font-weight: 700;
          color: #c4b5fd;
          letter-spacing: 0.06em;
        }

        .tmv2-delete-confirm {
          margin: 0 10px 10px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px;
          padding: 10px;
        }
        .tmv2-delete-confirm p { font-size: 11px; font-weight: 700; color: #fca5a5; margin-bottom: 8px; }
        .tmv2-confirm-btn {
          display:inline-flex;
          align-items:center;
          gap:4px;
          padding:5px 12px;
          border-radius:7px;
          font-family:'Syne',sans-serif;
          font-size:11px;
          font-weight:700;
          cursor:pointer;
          border:none;
          transition:all .15s;
        }
        .tmv2-confirm-btn.del { background:rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.35); color:#f87171; }
        .tmv2-confirm-btn.del:hover { background:rgba(239,68,68,0.3); }
        .tmv2-confirm-btn.cancel { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.5); }
        .tmv2-confirm-btn.cancel:hover { background:rgba(255,255,255,0.1); }
        .tmv2-confirm-btn:disabled { opacity:.4; cursor:not-allowed; }

        .tmv2-spinner {
          width:12px;
          height:12px;
          border:2px solid rgba(255,255,255,0.1);
          border-top-color:#a78bfa;
          border-radius:50%;
          animation:tmvspin .7s linear infinite;
          display:inline-block;
        }
        @keyframes tmvspin { to { transform:rotate(360deg); } }

        .tmv2-refresh {
          width:32px;
          height:32px;
          border-radius:9px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.09);
          color:rgba(255,255,255,0.4);
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          transition:all .15s;
          flex-shrink:0;
        }
        .tmv2-refresh:hover { background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.8); }

        .tmv2-dialog {
          background:#141418!important;
          border:1px solid rgba(255,255,255,0.1)!important;
          border-radius:18px!important;
          font-family:'Syne',sans-serif;
          color:#e4e4e7;
          max-width:430px!important;
        }
        .tmv2-field-label {
          font-size:10px;
          font-weight:700;
          letter-spacing:.1em;
          text-transform:uppercase;
          color:rgba(255,255,255,.3);
          margin-bottom:6px;
          display:block;
        }
        .tmv2-input {
          width:100%;
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.09);
          border-radius:9px;
          padding:9px 12px;
          color:#e4e4e7;
          font-family:'DM Mono',monospace;
          font-size:12px;
          transition:border-color .2s;
        }
        .tmv2-input:focus {
          outline:none;
          border-color:rgba(124,58,237,.5);
          background:rgba(255,255,255,.07);
        }
        .tmv2-input::placeholder { color:rgba(255,255,255,.2); }

        .tmv2-save-btn {
          display:inline-flex;
          align-items:center;
          gap:6px;
          padding:9px 20px;
          background:linear-gradient(135deg,#7c3aed,#4f46e5);
          border:none;
          border-radius:9px;
          font-family:'Syne',sans-serif;
          font-size:12px;
          font-weight:700;
          color:white;
          cursor:pointer;
          transition:opacity .15s;
        }
        .tmv2-save-btn:hover:not(:disabled) { opacity:.85; }
        .tmv2-save-btn:disabled { opacity:.4; cursor:not-allowed; }

        .tmv2-cancel-btn {
          display:inline-flex;
          align-items:center;
          gap:6px;
          padding:9px 16px;
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.1);
          border-radius:9px;
          font-family:'Syne',sans-serif;
          font-size:12px;
          font-weight:700;
          color:rgba(255,255,255,.5);
          cursor:pointer;
          transition:all .15s;
        }
        .tmv2-cancel-btn:hover:not(:disabled) { background:rgba(255,255,255,.09); color:rgba(255,255,255,.8); }
      `}</style>

      <div className='overflow-x-auto' style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'Syne, sans-serif' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 13,
                height: 13,
                color: 'rgba(255,255,255,0.25)',
                pointerEvents: 'none',
              }}
            />
            <input
              className="tmv2-search"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <select
            className="tmv2-select"
            value={toneFilter}
            onChange={(e) => setToneFilter(e.target.value)}
            title="Filter by tone"
          >
            <option className="text-black" value="all">All tones</option>
            {tones.map((tone) => (
              <option className="text-black" key={tone.id} value={tone.id}>
                {tone.label || tone.name}
              </option>
            ))}
          </select>

          <button className="tmv2-refresh" onClick={refresh} title="Refresh" style={{ width: 32, height: 32 }}>
            <RefreshCcw style={{ width: 13, height: 13 }} />
          </button>
        </div>

        {err && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 12px', fontSize: 11, color: '#f87171' }}>
            {err}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', gap: 10, overflow: 'hidden' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="tmv2-card" style={{ border: '2px solid rgba(255,255,255,0.05)', cursor: 'default' }}>
                <div className="tmv2-no-thumb" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div className="tmv2-body">
                  <div style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.07)', width: '70%' }} />
                  <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.04)', width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 20px', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: 14, color: 'rgba(255,255,255,0.2)' }}>
            <LayoutTemplate style={{ width: 24, height: 24, opacity: 0.3 }} />
            <p style={{ fontSize: 12, fontWeight: 600 }}>No templates found</p>
            {search && <p style={{ fontSize: 10 }}>Try clearing your search</p>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: 10, width: 'max-content' }}>
            {filtered.map((t: any) => {
              const isSelected = selectedTemplateId === t.id
              const thumb = t.thumbnail_url as string | undefined
              const toneLabel = t.tone_label || t.tone_name || null

              return (
                <div
                  key={t.id}
                  className={`tmv2-card${isSelected ? ' selected' : ''}`}
                  onClick={() => onSelectTemplate(t)}
                >
                  {thumb ? (
                    <div className="tmv2-thumb">
                      <img src={thumb} alt={t.name} />
                      {isSelected && (
                        <div className="tmv2-overlay">
                          <div className="tmv2-check-circle">
                            <Check style={{ width: 18, height: 18, color: 'white' }} strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="tmv2-no-thumb">
                      <LayoutTemplate style={{ width: 28, height: 28 }} />
                      <span style={{ fontSize: 9, letterSpacing: '0.08em', fontFamily: 'DM Mono, monospace' }}>NO PREVIEW</span>
                      {isSelected && (
                        <div className="tmv2-overlay">
                          <div className="tmv2-check-circle">
                            <Check style={{ width: 18, height: 18, color: 'white' }} strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="tmv2-body">
                    <div className="tmv2-name" title={t.name}>{t.name}</div>

                    {toneLabel && (
                      <div className="tmv2-tone-badge" title={`Tone: ${toneLabel}`}>
                        <Palette style={{ width: 10, height: 10 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {toneLabel}
                        </span>
                      </div>
                    )}

                    <div className="tmv2-meta">
                      {(t.shapes?.length ?? 0)} shapes · {t.canvasWidth}×{t.canvasHeight}
                    </div>

                    {t.description && <div className="tmv2-desc">{t.description}</div>}

                    {isSelected && (
                      <div className="tmv2-selected-badge">
                        <Check style={{ width: 8, height: 8 }} strokeWidth={3} /> SELECTED
                      </div>
                    )}
                  </div>

                  <div className="tmv2-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="tmv2-action-btn" title="Edit template details and tone" onClick={() => openEdit(t)}>
                      <Pencil style={{ width: 12, height: 12 }} />
                    </button>
                    <button className="tmv2-action-btn danger" title="Delete" onClick={() => setDeleteId(deleteId === t.id ? null : t.id)}>
                      <Trash2 style={{ width: 12, height: 12 }} />
                    </button>
                  </div>

                  {deleteId === t.id && (
                    <div className="tmv2-delete-confirm" onClick={(e) => e.stopPropagation()}>
                      <p>Delete "{t.name}"?</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="tmv2-confirm-btn del" onClick={confirmDelete} disabled={deleting}>
                          {deleting ? <span className="tmv2-spinner" /> : null}
                          {deleting ? 'Deleting…' : 'Delete'}
                        </button>
                        <button className="tmv2-confirm-btn cancel" onClick={() => setDeleteId(null)} disabled={deleting}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={(o) => !editSaving && setEditOpen(o)}>
        <DialogContent className="tmv2-dialog">
          <DialogHeader>
            <DialogTitle style={{ color: '#e4e4e7', fontSize: 15, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
              Edit Template
            </DialogTitle>
            <DialogDescription style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
              Update name, description, and tone.
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <span className="tmv2-field-label">Name</span>
              <input
                className="tmv2-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Template name"
              />
            </div>

            <div>
              <span className="tmv2-field-label">Description</span>
              <input
                className="tmv2-input"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div>
              <span className="tmv2-field-label">Tone</span>
              <select
                className="tmv2-select"
                value={editToneId}
                onChange={(e) => setEditToneId(e.target.value)}
                style={{ width: '100%', height: 40 }}
              >
                {tones.map((tone) => (
                  <option className="text-black" key={tone.id} value={tone.id}>
                    {tone.label || tone.name}
                  </option>
                ))}
              </select>
            </div>

            {editing && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, padding: '8px 12px' }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>ID</span>
                <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3, wordBreak: 'break-all' }}>{editing.id}</p>
              </div>
            )}

            {err && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '8px 12px', fontSize: 11, color: '#f87171' }}>
                {err}
              </div>
            )}
          </div>

          <DialogFooter>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button
                className="tmv2-cancel-btn"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  if (!editSaving) {
                    setEditOpen(false)
                    setEditing(null)
                  }
                }}
              >
                Cancel
              </button>
              <button
                  className="tmv2-save-btn"
                  style={{ flex: 2, justifyContent: 'center' }}
                  onClick={saveEdit}
                  disabled={editSaving || !editToneId || !brandId}
                >
                {editSaving ? <><span className="tmv2-spinner" />Saving…</> : <><Check style={{ width: 13, height: 13 }} />Save</>}
              </button>
            </div>
            {!editToneId && (
              <p style={{
                fontSize: 10,
                color: '#f87171',
                marginTop: 6,
                fontFamily: 'DM Mono, monospace'
              }}>
                A tone is required for every template.
              </p>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}