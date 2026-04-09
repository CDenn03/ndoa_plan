'use client'
import { use, useState, useRef } from 'react'
import { Image as ImageIcon, Upload, Trash2, Pencil, Plus, X, Check, ChevronDown, MoreHorizontal } from 'lucide-react'
import { Button, Input, Label, EmptyState, Spinner, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface Category { id: string; name: string; color: string; isDefault: boolean; order: number }
interface MoodImage { id: string; path: string; bucket: string; title?: string; linkedToId?: string; linkedToType?: string; mimeType?: string; eventId?: string }
interface WeddingEvent { id: string; name: string; type: string; date: string }

const COLOR_PRESETS = ['#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#3B82F6','#6B7280','#F97316','#14B8A6']

function imgUrl(img: MoodImage) {
  return `/api/storage/signed-url?path=${encodeURIComponent(img.path)}&bucket=${img.bucket}`
}

// ─── Board Collage ────────────────────────────────────────────────────────────

function BoardCollage({ images }: Readonly<{ images: MoodImage[] }>) {
  const previews = images.slice(0, 4)
  if (previews.length === 0) return (
    <div className="w-full aspect-[4/3] bg-zinc-100 rounded-2xl flex items-center justify-center">
      <ImageIcon size={36} className="text-zinc-300" />
    </div>
  )
  if (previews.length === 1) return (
    <img src={imgUrl(previews[0])} alt="" className="w-full aspect-[4/3] object-cover rounded-2xl" loading="lazy" />
  )
  if (previews.length === 2) return (
    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden grid grid-cols-2 gap-0.5">
      {previews.map(img => <img key={img.id} src={imgUrl(img)} alt="" className="w-full h-full object-cover" loading="lazy" />)}
    </div>
  )
  if (previews.length === 3) return (
    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden grid grid-cols-2 gap-0.5">
      <img src={imgUrl(previews[0])} alt="" className="w-full h-full object-cover row-span-2" loading="lazy" />
      <img src={imgUrl(previews[1])} alt="" className="w-full h-full object-cover" loading="lazy" />
      <img src={imgUrl(previews[2])} alt="" className="w-full h-full object-cover" loading="lazy" />
    </div>
  )
  return (
    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden grid grid-cols-2 gap-0.5">
      {previews.map(img => <img key={img.id} src={imgUrl(img)} alt="" className="w-full h-full object-cover" loading="lazy" />)}
    </div>
  )
}

// ─── Board Card ───────────────────────────────────────────────────────────────

function BoardCard({ category, images, onOpen, onEdit, onDelete }: Readonly<{
  category: Category; images: MoodImage[]
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

      {/* Card footer */}
      <div className="mt-2.5 flex items-start justify-between gap-2">
        <button onClick={onOpen} className="text-left flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#14161C] truncate">{category.name}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{images.length} photo{images.length !== 1 ? 's' : ''}</p>
        </button>

        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          {/* Like */}
          <button
            onClick={e => { e.stopPropagation(); setLiked(v => !v) }}
            className="p-1 rounded-full transition-colors"
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-colors ${liked ? 'fill-pink-400 stroke-pink-400' : 'fill-none stroke-zinc-300 hover:stroke-pink-400'}`} strokeWidth={2}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {/* More menu */}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }}
              className="p-1 rounded-full text-zinc-300 hover:text-zinc-500 transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal size={15} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} aria-hidden />
                <div className="absolute right-0 top-6 bg-white rounded-xl shadow-lg border border-zinc-100 py-1 z-20 min-w-32">
                  <button onClick={() => { setShowMenu(false); onEdit() }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors">
                    <Pencil size={13} /> Edit board
                  </button>
                  <button onClick={() => { setShowMenu(false); onDelete() }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={13} /> Delete board
                  </button>
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

function BoardDetailModal({ category, images, weddingId, onClose, onDeletePhoto, onRenamePhoto, onUpload, uploading }: Readonly<{
  category: Category; images: MoodImage[]; weddingId: string
  onClose: () => void
  onDeletePhoto: (id: string) => void
  onRenamePhoto: (id: string, title: string) => void
  onUpload: (files: File[], catId: string, eventId: string) => void
  uploading: boolean
}>) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const startRename = (img: MoodImage) => { setEditingPhotoId(img.id); setEditTitle(img.title ?? '') }
  const saveRename = () => { if (editingPhotoId) { onRenamePhoto(editingPhotoId, editTitle); setEditingPhotoId(null) } }

  return (
    <Modal onClose={onClose} title={category.name}>
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
            <p className="text-xs text-zinc-400">{images.length} photo{images.length !== 1 ? 's' : ''}</p>
          </div>
          <Button size="sm" variant="lavender" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Spinner size="sm" /> : <Upload size={13} />}
            {uploading ? 'Uploading…' : 'Add photos'}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) onUpload(files, category.id, ''); e.target.value = '' }} />
        </div>

        {/* Photo grid */}
        {images.length === 0
          ? <EmptyState icon={<ImageIcon size={32} className="text-zinc-200" />} title="No photos yet"
              description="Add inspiration photos to this board"
              action={<Button size="sm" variant="lavender" onClick={() => fileRef.current?.click()}><Upload size={13} /> Upload</Button>} />
          : <div className="columns-2 gap-2 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
              {images.map(img => (
                <div key={img.id} className="break-inside-avoid mb-2 rounded-xl overflow-hidden group relative">
                  <img src={imgUrl(img)} alt={img.title ?? ''} className="w-full object-cover" loading="lazy" />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-xl" />

                  {/* Actions */}
                  <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => startRename(img)}
                      className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
                      aria-label="Rename photo">
                      <Pencil size={11} />
                    </button>
                    <button onClick={() => onDeletePhoto(img.id)}
                      className="p-1.5 rounded-lg bg-black/50 hover:bg-red-500/80 text-white transition-colors"
                      aria-label="Delete photo">
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {/* Title / rename inline */}
                  {editingPhotoId === img.id ? (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 flex items-center gap-1">
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditingPhotoId(null) }}
                        className="flex-1 text-xs bg-transparent text-white placeholder-white/50 outline-none border-b border-white/40"
                        placeholder="Add a title…"
                      />
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

// ─── Edit Board Modal ─────────────────────────────────────────────────────────

function EditBoardModal({ weddingId, category, onClose }: Readonly<{
  weddingId: string; category: Category; onClose: () => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/weddings/${weddingId}/vision-categories/${category.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })
      qc.invalidateQueries({ queryKey: ['vision-categories', weddingId] })
      toast('Board updated', 'success')
      onClose()
    } catch { toast('Failed to update board', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Edit board">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="edit-board-name">Board name *</Label>
          <Input id="edit-board-name" value={name} onChange={e => setName(e.target.value)} autoFocus required />
        </div>
        <div>
          <Label>Color</Label>
          <div className="flex items-center gap-2 mt-1">
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-8 h-8 rounded-lg border border-zinc-200 cursor-pointer flex-shrink-0" />
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
          <Button type="submit" className="flex-1" disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Create Board Modal ───────────────────────────────────────────────────────

function CreateBoardModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#8B5CF6')
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/weddings/${weddingId}/vision-categories`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })
      qc.invalidateQueries({ queryKey: ['vision-categories', weddingId] })
      toast('Board created', 'success')
      onClose()
    } catch { toast('Failed to create board', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Create board">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="board-name">Board name *</Label>
          <Input id="board-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tablescapes" autoFocus required />
        </div>
        <div>
          <Label>Color</Label>
          <div className="flex items-center gap-2 mt-1">
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-8 h-8 rounded-lg border border-zinc-200 cursor-pointer flex-shrink-0" />
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
          <Button type="submit" className="flex-1" disabled={saving || !name.trim()}>{saving ? 'Creating…' : 'Create board'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({ label, onConfirm, onCancel }: Readonly<{
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MoodboardPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const qc = useQueryClient()
  const { toast } = useToast()

  const [eventFilter, setEventFilter] = useState<string>('__all__')
  const [uploading, setUploading] = useState(false)
  const [openBoard, setOpenBoard] = useState<Category | null>(null)
  const [editBoard, setEditBoard] = useState<Category | null>(null)
  const [deleteBoard, setDeleteBoard] = useState<Category | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showEventDropdown, setShowEventDropdown] = useState(false)

  const { data: categories = [], isLoading: catsLoading } = useQuery<Category[]>({
    queryKey: ['vision-categories', wid],
    queryFn: async () => { const r = await fetch(`/api/weddings/${wid}/vision-categories`); if (!r.ok) throw new Error(); return r.json() },
    staleTime: 60_000,
  })

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => { const r = await fetch(`/api/weddings/${wid}/events`); if (!r.ok) throw new Error(); return r.json() },
    staleTime: 60_000,
  })

  const { data: allImages = [], isLoading: imagesLoading } = useQuery<MoodImage[]>({
    queryKey: ['moodboard', wid],
    queryFn: async () => {
      const r = await fetch(`/api/weddings/${wid}/media`)
      if (!r.ok) throw new Error()
      const items = await r.json() as MoodImage[]
      return items.filter(i => i.linkedToType === 'moodboard' && i.mimeType?.startsWith('image/'))
    },
    staleTime: 30_000,
  })

  const images = eventFilter === '__all__' ? allImages : allImages.filter(i => i.eventId === eventFilter)

  const handleUpload = async (files: File[], catId: string, eventId: string) => {
    setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('bucket', 'media')
        fd.append('path', `${wid}/moodboard/${eventId || 'general'}/${catId}/${Date.now()}-${file.name}`)
        fd.append('weddingId', wid)
        const up = await fetch('/api/storage/upload', { method: 'POST', body: fd })
        if (!up.ok) continue
        const { path } = await up.json() as { path: string }
        await fetch(`/api/weddings/${wid}/media`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket: 'media', path, mimeType: file.type, linkedToType: 'moodboard', linkedToId: catId, title: file.name, eventId: eventId || null }),
        })
      }
      qc.invalidateQueries({ queryKey: ['moodboard', wid] })
      toast('Photos uploaded', 'success')
    } catch { toast('Upload failed', 'error') }
    finally { setUploading(false) }
  }

  const handleDeletePhoto = async (imgId: string) => {
    try {
      await fetch(`/api/weddings/${wid}/media/${imgId}`, { method: 'DELETE' })
      qc.invalidateQueries({ queryKey: ['moodboard', wid] })
      toast('Photo removed', 'success')
    } catch { toast('Failed to remove photo', 'error') }
  }

  const handleRenamePhoto = async (imgId: string, title: string) => {
    try {
      await fetch(`/api/weddings/${wid}/media/${imgId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || null }),
      })
      qc.invalidateQueries({ queryKey: ['moodboard', wid] })
    } catch { toast('Failed to rename photo', 'error') }
  }

  const handleDeleteBoard = async (cat: Category) => {
    try {
      await fetch(`/api/weddings/${wid}/vision-categories/${cat.id}`, { method: 'DELETE' })
      qc.invalidateQueries({ queryKey: ['vision-categories', wid] })
      qc.invalidateQueries({ queryKey: ['moodboard', wid] })
      setDeleteBoard(null)
      if (openBoard?.id === cat.id) setOpenBoard(null)
      toast('Board deleted', 'success')
    } catch { toast('Failed to delete board', 'error') }
  }

  const isLoading = catsLoading || eventsLoading || imagesLoading
  const activeEventLabel = eventFilter === '__all__' ? 'All events' : (events.find(e => e.id === eventFilter)?.name ?? 'All events')

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Content</p>
          <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Boards</h1>
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-5xl mx-auto px-8 pt-6 pb-0">
        <div className="flex items-center justify-between gap-4">
          {/* Event filter */}
          <div className="relative">
            <button
              onClick={() => setShowEventDropdown(v => !v)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
            >
              {activeEventLabel}
              <ChevronDown size={14} className="text-zinc-500" />
            </button>
            {showEventDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowEventDropdown(false)} aria-hidden />
                <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-zinc-100 py-1 z-20 min-w-44">
                  {[{ id: '__all__', name: 'All events' }, ...events.map(e => ({ id: e.id, name: e.name }))].map(opt => (
                    <button key={opt.id} onClick={() => { setEventFilter(opt.id); setShowEventDropdown(false) }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-zinc-50 ${eventFilter === opt.id ? 'font-semibold text-violet-700' : 'text-zinc-700'}`}>
                      {opt.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Create */}
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus size={13} /> Create board
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-8 py-8">
        {isLoading
          ? <div className="flex justify-center py-16"><Spinner /></div>
          : categories.length === 0
            ? <EmptyState icon={<ImageIcon size={40} className="text-zinc-200" />} title="No boards yet"
                description="Create your first board to start collecting inspiration"
                action={<Button onClick={() => setShowCreate(true)}><Plus size={14} /> Create board</Button>} />
            : <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                {categories.map(cat => (
                  <BoardCard
                    key={cat.id}
                    category={cat}
                    images={images.filter(i => i.linkedToId === cat.id)}
                    onOpen={() => setOpenBoard(cat)}
                    onEdit={() => setEditBoard(cat)}
                    onDelete={() => setDeleteBoard(cat)}
                  />
                ))}
              </div>}
      </div>

      {/* Board detail */}
      {openBoard && (
        <BoardDetailModal
          category={openBoard}
          images={images.filter(i => i.linkedToId === openBoard.id)}
          weddingId={wid}
          onClose={() => setOpenBoard(null)}
          onDeletePhoto={handleDeletePhoto}
          onRenamePhoto={handleRenamePhoto}
          onUpload={handleUpload}
          uploading={uploading}
        />
      )}

      {/* Edit board */}
      {editBoard && (
        <EditBoardModal weddingId={wid} category={editBoard} onClose={() => setEditBoard(null)} />
      )}

      {/* Delete board confirm */}
      {deleteBoard && (
        <ConfirmDeleteModal
          label={deleteBoard.name}
          onConfirm={() => handleDeleteBoard(deleteBoard)}
          onCancel={() => setDeleteBoard(null)}
        />
      )}

      {/* Create board */}
      {showCreate && <CreateBoardModal weddingId={wid} onClose={() => setShowCreate(false)} />}
    </div>
  )
}
