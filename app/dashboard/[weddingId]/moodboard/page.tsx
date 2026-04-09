'use client'
import { use, useState, useRef } from 'react'
import { Image as ImageIcon, Upload, Trash2, Pencil, Plus, X, Check } from 'lucide-react'
import { Button, Input, Label, EmptyState, Spinner, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface Category { id: string; name: string; color: string; isDefault: boolean; order: number }
interface MoodImage { id: string; path: string; bucket: string; title?: string; categoryId: string; eventId?: string }
interface WeddingEvent { id: string; name: string; type: string; date: string }

const COLOR_PRESETS = ['#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#3B82F6','#6B7280','#F97316','#14B8A6']

function ManageCategoriesModal({ weddingId, categories, onClose }: Readonly<{
  weddingId: string; categories: Category[]; onClose: () => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#8B5CF6')
  const [adding, setAdding] = useState(false)

  const startEdit = (cat: Category) => { setEditingId(cat.id); setEditName(cat.name); setEditColor(cat.color) }

  const saveEdit = async (catId: string) => {
    try {
      await fetch(`/api/weddings/${weddingId}/vision-categories/${catId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, color: editColor }),
      })
      qc.invalidateQueries({ queryKey: ['vision-categories', weddingId] })
      qc.invalidateQueries({ queryKey: ['moodboard', weddingId] })
      setEditingId(null)
    } catch { toast('Failed to update category', 'error') }
  }

  const deleteCategory = async (catId: string) => {
    if (!confirm('Delete this category? Images will be moved to Other.')) return
    try {
      await fetch(`/api/weddings/${weddingId}/vision-categories/${catId}`, { method: 'DELETE' })
      qc.invalidateQueries({ queryKey: ['vision-categories', weddingId] })
      qc.invalidateQueries({ queryKey: ['moodboard', weddingId] })
    } catch { toast('Failed to delete category', 'error') }
  }

  const addCategory = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      await fetch(`/api/weddings/${weddingId}/vision-categories`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      })
      qc.invalidateQueries({ queryKey: ['vision-categories', weddingId] })
      setNewName(''); setNewColor('#8B5CF6')
    } catch { toast('Failed to add category', 'error') }
    finally { setAdding(false) }
  }

  return (
    <Modal onClose={onClose} title="Manage categories">
      <div className="space-y-4">
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-3 py-2 border-b border-zinc-100 last:border-0">
              {editingId === cat.id ? (
                <>
                  <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                    className="w-7 h-7 rounded-lg border border-zinc-200 cursor-pointer flex-shrink-0" />
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 h-8 text-sm" />
                  <button onClick={() => saveEdit(cat.id)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" aria-label="Save"><Check size={13} /></button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors" aria-label="Cancel"><X size={13} /></button>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <p className="text-sm font-medium text-[#14161C] flex-1">{cat.name}</p>
                  <button onClick={() => startEdit(cat)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors" aria-label="Edit"><Pencil size={13} /></button>
                  {!cat.isDefault && (
                    <button onClick={() => deleteCategory(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors" aria-label="Delete"><Trash2 size={13} /></button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-100 pt-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Add category</p>
          <div className="flex items-center gap-2">
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
              className="w-8 h-8 rounded-lg border border-zinc-200 cursor-pointer flex-shrink-0" />
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Category name" className="flex-1 h-8 text-sm"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void addCategory() } }} />
            <Button size="sm" onClick={addCategory} disabled={adding || !newName.trim()}>
              {adding ? <Spinner size="sm" /> : <Plus size={13} />}
            </Button>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {COLOR_PRESETS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-zinc-400' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }} aria-label={c} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function ImageCard({ img, weddingId, categories, onDelete, onReassign }: Readonly<{
  img: MoodImage; weddingId: string; categories: Category[]
  onDelete: (id: string) => void; onReassign: (id: string, catId: string) => void
}>) {
  const [showReassign, setShowReassign] = useState(false)
  return (
    <div className="group relative rounded-2xl overflow-hidden bg-zinc-100 break-inside-avoid mb-3">
      <img
        src={`/api/storage/signed-url?path=${encodeURIComponent(img.path)}&bucket=${img.bucket}`}
        alt={img.title ?? 'Vision board image'}
        className="w-full object-cover group-hover:brightness-90 transition-all duration-300"
        loading="lazy"
      />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute top-2 right-2 flex gap-1">
          <button onClick={() => setShowReassign(v => !v)}
            className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors" aria-label="Move to category">
            <Pencil size={12} />
          </button>
          <button onClick={() => onDelete(img.id)}
            className="p-1.5 rounded-lg bg-black/50 hover:bg-red-500/80 text-white transition-colors" aria-label="Delete">
            <Trash2 size={12} />
          </button>
        </div>
        {img.title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
            <p className="text-[11px] text-white font-medium truncate">{img.title}</p>
          </div>
        )}
      </div>
      {showReassign && (
        <div className="absolute top-10 right-2 bg-white rounded-xl shadow-lg border border-zinc-100 p-2 z-10 min-w-36">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1 pb-1">Move to</p>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => { onReassign(img.id, cat.id); setShowReassign(false) }}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-zinc-50 transition-colors ${img.categoryId === cat.id ? 'text-violet-700 bg-violet-50' : 'text-zinc-700'}`}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MasonryGrid({ images, weddingId, categories, onDelete, onReassign }: Readonly<{
  images: MoodImage[]; weddingId: string; categories: Category[]
  onDelete: (id: string) => void; onReassign: (id: string, catId: string) => void
}>) {
  if (images.length === 0) return (
    <EmptyState icon={<ImageIcon size={40} />} title="No images yet" description="Upload images to build your vision board" />
  )
  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 gap-3">
      {images.map(img => (
        <ImageCard key={img.id} img={img} weddingId={weddingId} categories={categories} onDelete={onDelete} onReassign={onReassign} />
      ))}
    </div>
  )
}

function CategoryPills({ categories, images, activeCatId, onSelect }: Readonly<{
  categories: Category[]; images: MoodImage[]; activeCatId: string | null; onSelect: (id: string | null) => void
}>) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin flex-wrap">
      <button onClick={() => onSelect(null)}
        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!activeCatId ? 'bg-[#14161C] text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-700'}`}>
        All ({images.length})
      </button>
      {categories.map(cat => {
        const count = images.filter(i => i.categoryId === cat.id).length
        if (count === 0) return null
        const active = activeCatId === cat.id
        return (
          <button key={cat.id} onClick={() => onSelect(active ? null : cat.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${active ? 'text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-700'}`}
            style={active ? { backgroundColor: cat.color } : {}}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? 'white' : cat.color }} />
            {cat.name} ({count})
          </button>
        )
      })}
    </div>
  )
}

function VisionTab({ images, categories, weddingId, eventId, onDelete, onReassign, onUpload, uploading }: Readonly<{
  images: MoodImage[]; categories: Category[]; weddingId: string; eventId?: string
  onDelete: (id: string) => void; onReassign: (id: string, catId: string) => void
  onUpload: (files: File[], catId: string, eventId: string) => void; uploading: boolean
}>) {
  const [activeCatId, setActiveCatId] = useState<string | null>(null)
  const [uploadCatId, setUploadCatId] = useState(categories[0]?.id ?? '')
  const fileRef = useRef<HTMLInputElement>(null)
  const tabImages = eventId ? images.filter(i => i.eventId === eventId) : images
  const filtered = activeCatId ? tabImages.filter(i => i.categoryId === activeCatId) : tabImages

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-zinc-400">{tabImages.length} image{tabImages.length !== 1 ? 's' : ''}</p>
        <div className="flex items-end gap-3">
          <div>
            <Label htmlFor={`cat-upload-${eventId ?? 'overall'}`}>Category</Label>
            <select id={`cat-upload-${eventId ?? 'overall'}`} value={uploadCatId} onChange={e => setUploadCatId(e.target.value)}
              className="text-sm border border-zinc-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Button variant="lavender" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Spinner size="sm" /> : <Upload size={13} />}
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) onUpload(files, uploadCatId, eventId ?? ''); e.target.value = '' }} />
        </div>
      </div>
      <CategoryPills categories={categories} images={tabImages} activeCatId={activeCatId} onSelect={setActiveCatId} />
      {tabImages.length === 0
        ? <EmptyState icon={<ImageIcon size={40} />} title="No images yet" description="Upload images to build your vision board"
            action={<Button variant="lavender" onClick={() => fileRef.current?.click()}><Upload size={14} /> Upload images</Button>} />
        : <MasonryGrid images={filtered} weddingId={weddingId} categories={categories} onDelete={onDelete} onReassign={onReassign} />}
    </div>
  )
}

export default function MoodboardPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const qc = useQueryClient()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('__overall__')
  const [uploading, setUploading] = useState(false)
  const [showManageCategories, setShowManageCategories] = useState(false)

  const { data: categories = [], isLoading: catsLoading } = useQuery<Category[]>({
    queryKey: ['vision-categories', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/vision-categories`); if (!res.ok) throw new Error(); return res.json() },
    staleTime: 60_000,
  })

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/events`); if (!res.ok) throw new Error(); return res.json() },
    staleTime: 60_000,
  })

  const { data: images = [], isLoading: imagesLoading } = useQuery<MoodImage[]>({
    queryKey: ['moodboard', wid],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${wid}/media`)
      if (!res.ok) throw new Error()
      const items = await res.json() as { id: string; path: string; bucket: string; title?: string; linkedToId?: string; eventId?: string; linkedToType?: string; mimeType?: string }[]
      return items
        .filter(i => i.linkedToType === 'moodboard' && i.mimeType?.startsWith('image/'))
        .map(i => ({ id: i.id, path: i.path, bucket: i.bucket, title: i.title, categoryId: i.linkedToId ?? '', eventId: i.eventId }))
    },
    staleTime: 30_000,
  })

  const handleDelete = async (imgId: string) => {
    try {
      await fetch(`/api/weddings/${wid}/media/${imgId}`, { method: 'DELETE' })
      qc.invalidateQueries({ queryKey: ['moodboard', wid] })
      toast('Image removed', 'success')
    } catch { toast('Failed to remove image', 'error') }
  }

  const handleReassign = async (imgId: string, catId: string) => {
    try {
      await fetch(`/api/weddings/${wid}/media/${imgId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedToId: catId }),
      })
      qc.invalidateQueries({ queryKey: ['moodboard', wid] })
    } catch { toast('Failed to move image', 'error') }
  }

  const handleUpload = async (files: File[], catId: string, eventId: string) => {
    setUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bucket', 'media')
        formData.append('path', `${wid}/moodboard/${eventId || 'general'}/${catId}/${Date.now()}-${file.name}`)
        formData.append('weddingId', wid)
        const upRes = await fetch('/api/storage/upload', { method: 'POST', body: formData })
        if (!upRes.ok) continue
        const { path } = await upRes.json() as { path: string }
        await fetch(`/api/weddings/${wid}/media`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket: 'media', path, mimeType: file.type, linkedToType: 'moodboard', linkedToId: catId, title: file.name, eventId: eventId || null }),
        })
      }
      qc.invalidateQueries({ queryKey: ['moodboard', wid] })
      toast('Images uploaded', 'success')
    } catch { toast('Upload failed', 'error') }
    finally { setUploading(false) }
  }

  const isLoading = catsLoading || eventsLoading || imagesLoading
  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name }))]
  const activeEvent = events.find(e => e.id === activeTab)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-zinc-100 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Content</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Vision Board</h1>
            <Button variant="secondary" size="sm" onClick={() => setShowManageCategories(true)}>
              <Pencil size={13} /> Categories
            </Button>
          </div>
          <p className="text-sm text-zinc-400 mt-1 mb-6">{images.length} image{images.length !== 1 ? 's' : ''} · {categories.length} categories</p>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px">
            {isLoading ? <div className="pb-4"><Spinner size="sm" /></div> : (
              tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-[#14161C] text-[#14161C]' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
                  {t.label}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10">
        {isLoading ? <div className="flex justify-center py-16"><Spinner /></div> : (
          <VisionTab
            images={images} categories={categories} weddingId={wid}
            eventId={activeEvent?.id}
            onDelete={handleDelete} onReassign={handleReassign}
            onUpload={handleUpload} uploading={uploading}
          />
        )}
      </div>

      {showManageCategories && categories.length > 0 && (
        <ManageCategoriesModal weddingId={wid} categories={categories} onClose={() => setShowManageCategories(false)} />
      )}
    </div>
  )
}
