'use client'
import { useState, useRef } from 'react'
import { Image as ImageIcon, Upload, Trash2, Pencil, Plus, X, Check, MoreHorizontal } from 'lucide-react'
import { Button, Input, Label, EmptyState, Spinner, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export interface MoodCategory { id: string; name: string; color: string; isDefault: boolean; order: number }
export interface MoodImage {
  id: string; path: string; bucket: string; title?: string
  linkedToId?: string; linkedToType?: string; mimeType?: string; eventId?: string
}

export const COLOR_PRESETS = ['#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#3B82F6','#6B7280','#F97316','#14B8A6']

export function imgUrl(img: MoodImage) {
  return `/api/storage/signed-url?path=${encodeURIComponent(img.path)}&bucket=${img.bucket}`
}

// ─── Board Collage ────────────────────────────────────────────────────────────

export function BoardCollage({ images }: Readonly<{ images: MoodImage[] }>) {
  const previews = images.slice(0, 4)
  if (previews.length === 0) return (
    <div className="w-full aspect-[4/3] bg-zinc-100 rounded-2xl flex items-center justify-center">
      <ImageIcon size={36} className="text-zinc-300" />
    </div>
  )
  if (previews.length === 1) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imgUrl(previews[0])} alt="" className="w-full aspect-[4/3] object-cover rounded-2xl" loading="lazy" />
  )
  if (previews.length === 2) return (
    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden grid grid-cols-2 gap-0.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {previews.map(img => <img key={img.id} src={imgUrl(img)} alt="" className="w-full h-full object-cover" loading="lazy" />)}
    </div>
  )
  if (previews.length === 3) return (
    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden grid grid-cols-2 gap-0.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgUrl(previews[0])} alt="" className="w-full h-full object-cover row-span-2" loading="lazy" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgUrl(previews[1])} alt="" className="w-full h-full object-cover" loading="lazy" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgUrl(previews[2])} alt="" className="w-full h-full object-cover" loading="lazy" />
    </div>
  )
  return (
    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden grid grid-cols-2 gap-0.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {previews.map(img => <img key={img.id} src={imgUrl(img)} alt="" className="w-full h-full object-cover" loading="lazy" />)}
    </div>
  )
}

// ─── Board Card ───────────────────────────────────────────────────────────────

export function BoardCard({ category, images, onOpen, onEdit, onDelete }: Readonly<{
  category: MoodCategory; images: MoodImage[]
  onOpen: () => void; onEdit: () => void; onDelete: () => void
}>) {
  const [liked, setLiked] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  return (
    <div className="group relative">
      <button onClick={onOpen} className="text-left focus:outline-none w-full">
        <div className="overflow-hidden rounded-2xl transition-transform group-hover:scale-[1.02] duration-200">
          <BoardCollage images={images} />
        </div>
      </button>
      <div className="mt-2.5 flex items-start justify-between gap-2">
        <button onClick={onOpen} className="text-left flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#14161C] truncate">{category.name}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{images.length} photo{images.length === 1 ? '' : 's'}</p>
        </button>
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          <button onClick={e => { e.stopPropagation(); setLiked(v => !v) }} className="p-1 rounded-full" aria-label={liked ? 'Unlike' : 'Like'}>
            <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-colors ${liked ? 'fill-pink-400 stroke-pink-400' : 'fill-none stroke-zinc-300 hover:stroke-pink-400'}`} strokeWidth={2}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }} className="p-1 rounded-full text-zinc-300 hover:text-zinc-500 transition-colors" aria-label="More options">
              <MoreHorizontal size={15} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} aria-hidden />
                <div className="absolute right-0 top-6 bg-white rounded-xl shadow-lg border border-zinc-100 py-1 z-20 min-w-32">
                  <button onClick={() => { setShowMenu(false); onEdit() }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"><Pencil size={13} /> Edit board</button>
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
  const saveRename = () => { if (editingPhotoId) { onRenamePhoto(editingPhotoId, editTitle); setEditingPhotoId(null) } }
  return (
    <Modal onClose={onClose} title={category.name}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
            <p className="text-xs text-zinc-400">{images.length} photo{images.length === 1 ? '' : 's'}</p>
          </div>
          <Button size="sm" variant="lavender" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Spinner size="sm" /> : <Upload size={13} />}
            {uploading ? 'Uploading…' : 'Add photos'}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) onUpload(files, category.id, eventId ?? ''); e.target.value = '' }} />
        </div>
        {images.length === 0
          ? <EmptyState icon={<ImageIcon size={32} className="text-zinc-200" />} title="No photos yet" description="Add inspiration photos to this board"
              action={<Button size="sm" variant="lavender" onClick={() => fileRef.current?.click()}><Upload size={13} /> Upload</Button>} />
          : <div className="columns-2 gap-2 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
              {images.map(img => (
                <div key={img.id} className="break-inside-avoid mb-2 rounded-xl overflow-hidden group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl(img)} alt={img.title ?? ''} className="w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-xl" />
                  <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
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
  const [color, setColor] = useState(category?.color ?? '#8B5CF6')
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
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded-lg border border-zinc-200 cursor-pointer flex-shrink-0" />
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
      <p className="text-sm text-zinc-500 mb-6">All photos in this board will be removed. This cannot be undone.</p>
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
        <p className="text-sm text-zinc-500">{images.length} photo{images.length === 1 ? '' : 's'} · {categories.length} board{categories.length === 1 ? '' : 's'}</p>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Create board</Button>
      </div>
      {categories.length === 0
        ? <EmptyState icon={<ImageIcon size={40} className="text-zinc-200" />} title="No boards yet" description="Create boards to collect inspiration photos"
            action={<Button onClick={() => setShowCreate(true)}><Plus size={14} /> Create board</Button>} />
        : <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {categories.map(cat => (
              <BoardCard key={cat.id} category={cat} images={images.filter(i => i.linkedToId === cat.id)}
                onOpen={() => setOpenBoard(cat)} onEdit={() => setEditBoard(cat)} onDelete={() => setDeleteBoard(cat)} />
            ))}
          </div>}
      {openBoard && <BoardDetailModal category={openBoard} images={images.filter(i => i.linkedToId === openBoard.id)} weddingId={weddingId} eventId={eventId} onClose={() => setOpenBoard(null)} onDeletePhoto={handleDeletePhoto} onRenamePhoto={handleRenamePhoto} onUpload={handleUpload} uploading={uploading} />}
      {editBoard && <BoardFormModal weddingId={weddingId} category={editBoard} onClose={() => setEditBoard(null)} />}
      {showCreate && <BoardFormModal weddingId={weddingId} onClose={() => setShowCreate(false)} />}
      {deleteBoard && <ConfirmDeleteBoardModal label={deleteBoard.name} onConfirm={() => handleDeleteBoard(deleteBoard)} onCancel={() => setDeleteBoard(null)} />}
    </div>
  )
}
