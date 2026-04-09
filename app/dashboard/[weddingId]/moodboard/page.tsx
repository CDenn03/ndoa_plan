'use client'
import { use, useState, useRef, useMemo } from 'react'
import { Image as ImageIcon, Upload, Trash2, CalendarDays } from 'lucide-react'
import { Button, Select, Label, EmptyState, Spinner } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const CATEGORIES = ['DECOR', 'OUTFITS', 'FLOWERS', 'VENUE', 'OTHER']

interface MoodImage { id: string; path: string; bucket: string; title?: string; category: string; eventId?: string }
interface WeddingEvent { id: string; name: string; type: string; date: string }

function ImageGrid({ images, onDelete }: Readonly<{ images: MoodImage[]; onDelete: (id: string) => void }>) {
  if (images.length === 0) return (
    <EmptyState icon={<ImageIcon size={40} />} title="No images yet" description="Upload images to build your vision board" />
  )
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {images.map(img => (
        <div key={img.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-zinc-100">
          <img src={`/api/storage/signed-url?path=${encodeURIComponent(img.path)}&bucket=${img.bucket}`}
            alt={img.title ?? 'Vision board image'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
              <p className="text-[11px] text-white font-medium truncate">{img.title ?? img.category}</p>
              <button onClick={() => onDelete(img.id)}
                className="p-1.5 rounded-lg bg-black/40 hover:bg-red-500/80 text-white transition-colors flex-shrink-0" aria-label="Delete image">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EventVisionTab({ event, images, onDelete, onUpload, uploading }: Readonly<{
  event: WeddingEvent; images: MoodImage[]
  onDelete: (id: string) => void; onUpload: (files: File[], category: string, eventId: string) => void; uploading: boolean
}>) {
  const [category, setCategory] = useState('OTHER')
  const [activeCategory, setActiveCategory] = useState('ALL')
  const fileRef = useRef<HTMLInputElement>(null)
  const evImages = useMemo(() => images.filter(i => i.eventId === event.id), [images, event.id])
  const filtered = activeCategory === 'ALL' ? evImages : evImages.filter(i => i.category === activeCategory)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-zinc-400">{evImages.length} image{evImages.length !== 1 ? 's' : ''}</p>
        <div className="flex items-end gap-3">
          <div>
            <Label htmlFor={`cat-${event.id}`}>Category</Label>
            <Select id={`cat-${event.id}`} value={category} onChange={e => setCategory(e.target.value)} className="w-auto">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <Button variant="lavender" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Spinner size="sm" /> : <Upload size={13} />}
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) onUpload(files, category, event.id); e.target.value = '' }} />
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {['ALL', ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${activeCategory === cat ? 'bg-[#14161C] text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-700'}`}>
            {cat}
          </button>
        ))}
      </div>
      <ImageGrid images={filtered} onDelete={onDelete} />
    </div>
  )
}

function OverallTab({ images, events, onDelete }: Readonly<{
  images: MoodImage[]; events: WeddingEvent[]; onDelete: (id: string) => void
}>) {
  const [activeCategory, setActiveCategory] = useState('ALL')
  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent | null; count: number }>()
    for (const e of events) map.set(e.id, { event: e, count: 0 })
    for (const img of images) {
      const k = img.eventId ?? '__unassigned__'
      if (!map.has(k)) map.set(k, { event: null, count: 0 })
      map.get(k)!.count++
    }
    return map
  }, [images, events])

  const filtered = activeCategory === 'ALL' ? images : images.filter(i => i.category === activeCategory)

  if (images.length === 0) return (
    <EmptyState icon={<ImageIcon size={40} />} title="Vision board is empty"
      description="Upload images inside each event tab to build your vision board" />
  )

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">By event</p>
        {Array.from(byEvent.entries()).map(([key, { event, count }]) => {
          if (count === 0) return null
          return (
            <div key={key} className="rounded-2xl border border-zinc-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={15} className="text-zinc-400" />
                <p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p>
              </div>
              <p className="text-sm text-zinc-400">{count} image{count !== 1 ? 's' : ''}</p>
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {['ALL', ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${activeCategory === cat ? 'bg-[#14161C] text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-700'}`}>
            {cat}
          </button>
        ))}
      </div>
      <ImageGrid images={filtered} onDelete={onDelete} />
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
        .map(i => ({ id: i.id, path: i.path, bucket: i.bucket, title: i.title, category: i.linkedToId ?? 'OTHER', eventId: i.eventId }))
    },
    staleTime: 30_000,
  })

  const handleDelete = async (imgId: string) => {
    if (!confirm('Remove this image?')) return
    try {
      await fetch(`/api/weddings/${wid}/media/${imgId}`, { method: 'DELETE' })
      qc.invalidateQueries({ queryKey: ['moodboard', wid] })
      toast('Image removed', 'success')
    } catch { toast('Failed to remove image', 'error') }
  }

  const handleUpload = async (files: File[], category: string, eventId: string) => {
    setUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bucket', 'media')
        formData.append('path', `${wid}/moodboard/${eventId}/${category}/${Date.now()}-${file.name}`)
        formData.append('weddingId', wid)
        const upRes = await fetch('/api/storage/upload', { method: 'POST', body: formData })
        if (!upRes.ok) continue
        const { path } = await upRes.json() as { path: string }
        await fetch(`/api/weddings/${wid}/media`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket: 'media', path, mimeType: file.type, linkedToType: 'moodboard', linkedToId: category, title: file.name, eventId }),
        })
      }
      qc.invalidateQueries({ queryKey: ['moodboard', wid] })
      toast('Images uploaded', 'success')
    } catch { toast('Upload failed', 'error') }
    finally { setUploading(false) }
  }

  const isLoading = eventsLoading || imagesLoading
  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name }))]
  const activeEvent = events.find(e => e.id === activeTab)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-zinc-100 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Content</p>
          <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Vision Board</h1>
          <p className="text-sm text-zinc-400 mt-2 mb-6">{images.length} image{images.length !== 1 ? 's' : ''} across {events.length} events</p>
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
        {isLoading ? <div className="flex justify-center py-16"><Spinner /></div> :
          activeTab === '__overall__'
            ? <OverallTab images={images} events={events} onDelete={handleDelete} />
            : activeEvent
              ? <EventVisionTab event={activeEvent} images={images} onDelete={handleDelete} onUpload={handleUpload} uploading={uploading} />
              : null}
      </div>
    </div>
  )
}
