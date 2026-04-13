'use client'
import { useState, useRef } from 'react'
import { Image as ImageIcon, Upload, Trash2, Pencil, Plus, X, Check, MoreHorizontal, Maximize2, ArrowLeft, Download } from 'lucide-react'
import { Button, Input, Label, EmptyState, Spinner, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export interface MoodCategory { id: string; name: string; color: string; isDefault: boolean; order: number }
export interface MoodImage {
  id: string; path: string; bucket: string; title?: string
  linkedToId?: string; linkedToType?: string; mimeType?: string; eventId?: string
}

export const COLOR_PRESETS = ['#1F4D3A','#EC4899','#10B981','#F59E0B','#EF4444','#3B82F6','#6B7280','#F97316','#14B8A6']

export function imgUrl(img: MoodImage) {
  return `/api/storage/signed-url?path=${encodeURIComponent(img.path)}&bucket=${img.bucket}`
}

// ─── Board Collage ────────────────────────────────────────────────────────────

export function BoardCollage({ images, tall }: Readonly<{ images: MoodImage[]; tall?: boolean }>) {
  const aspect = tall ? 'aspect-[3/4]' : 'aspect-[4/3]'
  const previews = images.slice(0, 4)
  if (previews.length === 0) return (
    <div className={`w-full ${aspect} bg-[#1F4D3A]/6 rounded-2xl flex items-center justify-center`}>
      <ImageIcon size={36} className="text-[#14161C]/25" />
    </div>
  )
  if (previews.length === 1) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imgUrl(previews[0])} alt="" className={`w-full ${aspect} object-cover rounded-2xl`} loading="lazy" />
  )
  if (previews.length === 2) return (
    <div className={`w-full ${aspect} rounded-2xl overflow-hidden grid grid-cols-2 gap-0.5`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {previews.map(img => <img key={img.id} src={imgUrl(img)} alt="" className="w-full h-full object-cover" loading="lazy" />)}
    </div>
  )
  if (previews.length === 3) return (
    <div className={`w-full ${aspect} rounded-2xl overflow-hidden grid grid-cols-2 gap-0.5`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgUrl(previews[0])} alt="" className="w-full h-full object-cover row-span-2" loading="lazy" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgUrl(previews[1])} alt="" className="w-full h-full object-cover" loading="lazy" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgUrl(previews[2])} alt="" className="w-full h-full object-cover" loading="lazy" />
    </div>
  )
  return (
    <div className={`w-full ${aspect} rounded-2xl overflow-hidden grid grid-cols-2 gap-0.5`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {previews.map(img => <img key={img.id} src={imgUrl(img)} alt="" className="w-full h-full object-cover" loading="lazy" />)}
    </div>
  )
}

// ─── Board Card ───────────────────────────────────────────────────────────────

export function BoardCard({ category, images, onOpen, onEdit, onDelete, tall }: Readonly<{
  category: MoodCategory; images: MoodImage[]
  onOpen: () => void; onEdit: () => void; onDelete: () => void; tall?: boolean
}>) {
  const [liked, setLiked] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  return (
    <div className="group relative">
      <button onClick={onOpen} className="text-left focus:outline-none w-full">
        <div className="overflow-hidden rounded-2xl transition-transform group-hover:scale-[1.02] duration-200">
          <BoardCollage images={images} tall={tall} />
        </div>
      </button>
      <div className="mt-2.5 flex items-start justify-between gap-2">
        <button onClick={onOpen} className="text-left flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#14161C] truncate">{category.name}</p>
          <p className="text-xs text-[#14161C]/40 mt-0.5">{images.length} photo{images.length === 1 ? '' : 's'}</p>
        </button>
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          <button onClick={e => { e.stopPropagation(); setLiked(v => !v) }} className="p-1 rounded-full" aria-label={liked ? 'Unlike' : 'Like'}>
            <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-colors ${liked ? 'fill-[#D4A94F] stroke-[#D4A94F]' : 'fill-none stroke-[#14161C]/25 hover:stroke-[#D4A94F]'}`} strokeWidth={2}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }} className="p-1 rounded-full text-[#14161C]/25 hover:text-[#14161C]/55 transition-colors" aria-label="More options">
              <MoreHorizontal size={15} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} aria-hidden />
                <div className="absolute right-0 top-6 bg-white rounded-xl shadow-lg border border-[#1F4D3A]/8 py-1 z-20 min-w-32">
                  <button onClick={() => { setShowMenu(false); onEdit() }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#14161C]/70 hover:bg-[#F7F5F2]"><Pencil size={13} /> Edit board</button>
                  <button onClick={() => { setShowMenu(false); onDelete() }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50"><Trash2 size={13} /> Delete board</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Board Detail Modal ───────────────────────────────────────────────────────

export function BoardDetailModal({ category, images, weddingId, eventId, onClose, onDeletePhoto, onRenamePhoto, onUpload, uploading }: Readonly<{
  category: MoodCategory; images: MoodImage[]; weddingId: string; eventId?: string
  onClose: () => void; onDeletePhoto: (id: string) => void
  onRenamePhoto: (id: string, title: string) => void
  onUpload: (files: File[], catId: string, eventId: string) => void; uploading: boolean
}>) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [lightboxImg, setLightboxImg] = useState<MoodImage | null>(null)

  const saveRename = () => { if (editingPhotoId) { onRenamePhoto(editingPhotoId, editTitle); setEditingPhotoId(null) } }

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
        {/* Fullscreen header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <button onClick={() => setFullscreen(false)}
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back to board
          </button>
          <p className="text-sm font-semibold text-white">{category.name} · {images.length} photo{images.length !== 1 ? 's' : ''}</p>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition-colors">
            <Upload size={13} /> {uploading ? 'Uploading…' : 'Add photos'}
          </button>
        </div>
        {/* Fullscreen grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {images.length === 0
            ? <div className="flex items-center justify-center h-full">
                <p className="text-white/40 text-sm">No photos yet</p>
              </div>
            : <div className="columns-2 sm:columns-3 lg:columns-4 gap-3">
                {images.map(img => (
                  <div key={img.id} className="break-inside-avoid mb-3 rounded-xl overflow-hidden group relative cursor-pointer"
                    onClick={() => setLightboxImg(img)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl(img)} alt={img.title ?? ''} className="w-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-xl" />
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <a href={imgUrl(img)} download={img.title ?? 'photo'}
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white" aria-label="Download">
                        <Download size={11} />
                      </a>
                      <button onClick={e => { e.stopPropagation(); onDeletePhoto(img.id) }}
                        className="p-1.5 rounded-lg bg-black/50 hover:bg-red-500/80 text-white" aria-label="Delete">
                        <Trash2 size={11} />
                      </button>
                    </div>
                    {img.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-all">
                        <p className="text-[11px] text-white font-medium truncate">{img.title}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) onUpload(files, category.id, eventId ?? ''); e.target.value = '' }} />
        {/* Lightbox */}
        {lightboxImg && (
          <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxImg(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgUrl(lightboxImg)} alt={lightboxImg.title ?? ''} className="max-w-full max-h-full object-contain rounded-xl" onClick={e => e.stopPropagation()} />
            <div className="absolute top-4 right-4 flex gap-2">
              <a href={imgUrl(lightboxImg)} download={lightboxImg.title ?? 'photo'}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors" aria-label="Download">
                <Download size={16} />
              </a>
              <button onClick={() => setLightboxImg(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors" aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal onClose={onClose} title={category.name}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
            <p className="text-xs text-[#14161C]/40">{images.length} photo{images.length === 1 ? '' : 's'}</p>
          </div>
          <div className="flex items-center gap-2">
            {images.length > 0 && (
              <button onClick={() => setFullscreen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#14161C]/55 hover:text-[#14161C] transition-colors px-2 py-1 rounded-lg hover:bg-[#1F4D3A]/6"
                aria-label="Open fullscreen">
                <Maximize2 size={12} /> Fullscreen
              </button>
            )}
            <Button size="sm" variant="lavender" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Spinner size="sm" /> : <Upload size={13} />}
              {uploading ? 'Uploading…' : 'Add photos'}
            </Button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) onUpload(files, category.id, eventId ?? ''); e.target.value = '' }} />
        </div>
        {images.length === 0
          ? <EmptyState icon={<ImageIcon size={32} className="text-[#14161C]/15" />} title="No photos yet" description="Add inspiration photos to this board"
              action={<Button size="sm" variant="lavender" onClick={() => fileRef.current?.click()}><Upload size={13} /> Upload</Button>} />
          : <div className="columns-2 gap-2 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
              {images.map(img => (
                <div key={img.id} className="break-inside-avoid mb-2 rounded-xl overflow-hidden group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl(img)} alt={img.title ?? ''} className="w-full object-cover cursor-pointer" loading="lazy"
                    onClick={() => setLightboxImg(img)} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-xl pointer-events-none" />
                  <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <a href={imgUrl(img)} download={img.title ?? 'photo'}
                      className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white" aria-label="Download">
                      <Download size={11} />
                    </a>
                    <button onClick={() => { setEditingPhotoId(img.id); setEditTitle(img.title ?? '') }} className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white" aria-label="Rename"><Pencil size={11} /></button>
                    <button onClick={() => onDeletePhoto(img.id)} className="p-1.5 rounded-lg bg-black/50 hover:bg-red-500/80 text-white" aria-label="Delete"><Trash2 size={11} /></button>
                  </div>
                  {editingPhotoId === img.id ? (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 flex items-center gap-1">
                      <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { saveRename() } else if (e.key === 'Escape') { setEditingPhotoId(null) } }}
                        className="flex-1 text-xs bg-transparent text-white placeholder-white/50 outline-none border-b border-white/40" placeholder="Add a title…" />
                      <button onClick={saveRename} className="text-emerald-400 hover:text-emerald-300" aria-label="Save"><Check size={12} /></button>
                      <button onClick={() => setEditingPhotoId(null)} className="text-white/60 hover:text-white" aria-label="Cancel"><X size={12} /></button>
                    </div>
                  ) : img.title ? (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-all">
                      <p className="text-[11px] text-white font-medium truncate">{img.title}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>}
      </div>
      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl(lightboxImg)} alt={lightboxImg.title ?? ''} className="max-w-full max-h-full object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          <div className="absolute top-4 right-4 flex gap-2">
            <a href={imgUrl(lightboxImg)} download={lightboxImg.title ?? 'photo'}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors" aria-label="Download">
              <Download size={16} />
            </a>
            <button onClick={() => setLightboxImg(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Board Template Picker ────────────────────────────────────────────────────

const BOARD_TEMPLATES = [
  { name: 'Decor', color: '#1F4D3A' },
  { name: 'Outfits', color: '#EC4899' },
  { name: 'Flowers', color: '#10B981' },
  { name: 'Venue', color: '#F59E0B' },
  { name: 'Food', color: '#EF4444' },
  { name: 'Cake', color: '#F97316' },
  { name: 'Lighting', color: '#14B8A6' },
  { name: 'Hair & Makeup', color: '#EC4899' },
  { name: 'Photography', color: '#3B82F6' },
  { name: 'Table Settings', color: '#1F4D3A' },
  { name: 'Other', color: '#6B7280' },
]

export function BoardTemplatePicker({ weddingId, existingNames, onClose }: Readonly<{
  weddingId: string; existingNames: Set<string>; onClose: () => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const toggle = (name: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(name)) next.delete(name); else next.add(name)
    return next
  })

  const handleAdd = async () => {
    if (selected.size === 0) return
    setSaving(true)
    try {
      for (const t of BOARD_TEMPLATES) {
        if (!selected.has(t.name)) continue
        await fetch(`/api/weddings/${weddingId}/vision-categories`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: t.name, color: t.color }),
        })
      }
      await qc.invalidateQueries({ queryKey: ['vision-categories', weddingId] })
      toast(`${selected.size} board${selected.size !== 1 ? 's' : ''} added`, 'success')
      onClose()
    } catch { toast('Failed to add boards', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Add from templates">
      <div className="space-y-4">
        <p className="text-xs text-[#14161C]/40">Select the boards you want to add. Already existing boards are greyed out.</p>
        <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-thin">
          {BOARD_TEMPLATES.map(t => {
            const exists = existingNames.has(t.name)
            const isSelected = selected.has(t.name)
            return (
              <button key={t.name} type="button" disabled={exists}
                onClick={() => toggle(t.name)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${exists ? 'opacity-40 cursor-not-allowed' : isSelected ? 'bg-[#1F4D3A]/6 text-[#1F4D3A]' : 'hover:bg-[#F7F5F2] text-[#14161C]/70'}`}>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-sm font-medium flex-1">{t.name}</span>
                {exists && <span className="text-[10px] text-[#14161C]/40">Already added</span>}
                {isSelected && !exists && <Check size={13} className="text-[#1F4D3A] flex-shrink-0" />}
              </button>
            )
          })}
        </div>
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleAdd} className="flex-1" disabled={saving || selected.size === 0}>
            {saving ? 'Adding…' : `Add ${selected.size > 0 ? selected.size : ''} board${selected.size !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Board Form Modal (create + edit) ─────────────────────────────────────────

export function BoardFormModal({ weddingId, category, onClose }: Readonly<{
  weddingId: string; category?: MoodCategory; onClose: () => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? '#1F4D3A')
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!name.trim()) return; setSaving(true)
    try {
      if (category) {
        await fetch(`/api/weddings/${weddingId}/vision-categories/${category.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), color }) })
        toast('Board updated', 'success')
      } else {
        await fetch(`/api/weddings/${weddingId}/vision-categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), color }) })
        toast('Board created', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['vision-categories', weddingId] })
      onClose()
    } catch { toast('Failed to save board', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title={category ? 'Edit board' : 'Create board'}>
      <form onSubmit={submit} className="space-y-4">
        <div><Label htmlFor="vb-name">Board name *</Label>
          <Input id="vb-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tablescapes" autoFocus required /></div>
        <div><Label>Color</Label>
          <div className="flex items-center gap-2 mt-1">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded-lg border border-[#1F4D3A]/12 cursor-pointer flex-shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              {COLOR_PRESETS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-zinc-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }} aria-label={c} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving || !name.trim()}>{saving ? 'Saving…' : category ? 'Save changes' : 'Create board'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Confirm Delete Board Modal ───────────────────────────────────────────────

export function ConfirmDeleteBoardModal({ label, onConfirm, onCancel }: Readonly<{
  label: string; onConfirm: () => void; onCancel: () => void
}>) {
  return (
    <Modal onClose={onCancel} title={`Delete "${label}"?`}>
      <p className="text-sm text-[#14161C]/55 mb-6">All photos in this board will be removed. This cannot be undone.</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white border-red-500">Delete</Button>
      </div>
    </Modal>
  )
}

// ─── Moodboard Tab (reusable in event detail + standalone page) ───────────────

export function MoodboardTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId?: string }>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [openBoard, setOpenBoard] = useState<MoodCategory | null>(null)
  const [editBoard, setEditBoard] = useState<MoodCategory | null>(null)
  const [deleteBoard, setDeleteBoard] = useState<MoodCategory | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  const { data: categories = [], isLoading: catsLoading } = useQuery<MoodCategory[]>({
    queryKey: ['vision-categories', weddingId],
    queryFn: async () => { const r = await fetch(`/api/weddings/${weddingId}/vision-categories`); if (!r.ok) throw new Error('Failed to load'); return r.json() as Promise<MoodCategory[]> },
    staleTime: 60_000,
  })

  const { data: allImages = [], isLoading: imagesLoading } = useQuery<MoodImage[]>({
    queryKey: ['moodboard', weddingId],
    queryFn: async () => {
      const r = await fetch(`/api/weddings/${weddingId}/media`)
      if (!r.ok) throw new Error('Failed to load')
      const items = await r.json() as MoodImage[]
      return items.filter(i => i.linkedToType === 'moodboard' && i.mimeType?.startsWith('image/'))
    },
    staleTime: 30_000,
  })

  const images = eventId ? allImages.filter(i => i.eventId === eventId) : allImages

  const handleUpload = async (files: File[], catId: string, evId: string) => {
    setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file); fd.append('bucket', 'media')
        fd.append('path', `${weddingId}/moodboard/${evId || eventId || 'general'}/${catId}/${Date.now()}-${file.name}`)
        fd.append('weddingId', weddingId)
        const up = await fetch('/api/storage/upload', { method: 'POST', body: fd })
        if (!up.ok) continue
        const { path } = await up.json() as { path: string }
        await fetch(`/api/weddings/${weddingId}/media`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket: 'media', path, mimeType: file.type, linkedToType: 'moodboard', linkedToId: catId, title: file.name, eventId: evId || eventId || null }),
        })
      }
      await qc.invalidateQueries({ queryKey: ['moodboard', weddingId] })
      toast('Photos uploaded', 'success')
    } catch { toast('Upload failed', 'error') } finally { setUploading(false) }
  }

  const handleDeletePhoto = async (imgId: string) => {
    try {
      await fetch(`/api/weddings/${weddingId}/media/${imgId}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['moodboard', weddingId] })
      toast('Photo removed', 'success')
    } catch { toast('Failed to remove photo', 'error') }
  }

  const handleRenamePhoto = async (imgId: string, title: string) => {
    try {
      await fetch(`/api/weddings/${weddingId}/media/${imgId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim() || null }) })
      await qc.invalidateQueries({ queryKey: ['moodboard', weddingId] })
    } catch { toast('Failed to rename photo', 'error') }
  }

  const handleDeleteBoard = async (cat: MoodCategory) => {
    try {
      await fetch(`/api/weddings/${weddingId}/vision-categories/${cat.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['vision-categories', weddingId] })
      await qc.invalidateQueries({ queryKey: ['moodboard', weddingId] })
      setDeleteBoard(null)
      if (openBoard?.id === cat.id) setOpenBoard(null)
      toast('Board deleted', 'success')
    } catch { toast('Failed to delete board', 'error') }
  }

  if (catsLoading || imagesLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#14161C]/55">{images.length} photo{images.length === 1 ? '' : 's'} · {categories.length} board{categories.length === 1 ? '' : 's'}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowTemplates(true)}>Templates</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Create board</Button>
        </div>
      </div>
      {categories.length === 0
        ? <EmptyState icon={<ImageIcon size={40} className="text-[#14161C]/15" />} title="No boards yet" description="Create boards to collect inspiration photos"
            action={<Button onClick={() => setShowCreate(true)}><Plus size={14} /> Create board</Button>} />
        : <div className="columns-2 sm:columns-3 gap-4">
            {categories.map((cat, i) => (
              <div key={cat.id} className="break-inside-avoid mb-4">
                <BoardCard category={cat} images={images.filter(img => img.linkedToId === cat.id)}
                  onOpen={() => setOpenBoard(cat)} onEdit={() => setEditBoard(cat)} onDelete={() => setDeleteBoard(cat)}
                  tall={i % 3 === 0} />
              </div>
            ))}
          </div>}
      {openBoard && <BoardDetailModal category={openBoard} images={images.filter(i => i.linkedToId === openBoard.id)} weddingId={weddingId} eventId={eventId} onClose={() => setOpenBoard(null)} onDeletePhoto={handleDeletePhoto} onRenamePhoto={handleRenamePhoto} onUpload={handleUpload} uploading={uploading} />}
      {editBoard && <BoardFormModal weddingId={weddingId} category={editBoard} onClose={() => setEditBoard(null)} />}
      {showCreate && <BoardFormModal weddingId={weddingId} onClose={() => setShowCreate(false)} />}
      {showTemplates && <BoardTemplatePicker weddingId={weddingId} existingNames={new Set(categories.map(c => c.name))} onClose={() => setShowTemplates(false)} />}
      {deleteBoard && <ConfirmDeleteBoardModal label={deleteBoard.name} onConfirm={() => handleDeleteBoard(deleteBoard)} onCancel={() => setDeleteBoard(null)} />}
    </div>
  )
}
