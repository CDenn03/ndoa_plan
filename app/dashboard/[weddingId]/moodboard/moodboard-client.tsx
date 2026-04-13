'use client'
import { useState, useRef } from 'react'
import { Image as ImageIcon, Upload, Trash2 } from 'lucide-react'
import { Button, Select, Label, EmptyState, Spinner } from '@/components/ui'
import { useToast } from '@/components/ui/toast'

interface MoodImage {
  id: string; path: string; bucket: string; title?: string; category: string
}

interface Props {
  weddingId: string
  categories: string[]
  initialImages: MoodImage[]
}

export function MoodboardClient({ weddingId, categories, initialImages }: Readonly<Props>) {
  const [images, setImages] = useState(initialImages)
  const [uploading, setUploading] = useState(false)
  const [uploadCategory, setUploadCategory] = useState('OTHER')
  const [activeCategory, setActiveCategory] = useState('ALL')
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleDelete = async (imgId: string, path: string, bucket: string) => {
    if (!confirm('Remove this image from the vision board?')) return
    try {
      await fetch(`/api/weddings/${weddingId}/media/${imgId}`, { method: 'DELETE' })
      setImages(prev => prev.filter(i => i.id !== imgId))
      toast('Image removed', 'success')
    } catch { toast('Failed to remove image', 'error') }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bucket', 'media')
        formData.append('path', `${weddingId}/moodboard/${uploadCategory}/${Date.now()}-${file.name}`)
        formData.append('weddingId', weddingId)

        const upRes = await fetch('/api/storage/upload', { method: 'POST', body: formData })
        if (!upRes.ok) continue
        const { path } = await upRes.json() as { path: string }

        const mediaRes = await fetch(`/api/weddings/${weddingId}/media`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket: 'media', path, mimeType: file.type,
            linkedToType: 'moodboard', linkedToId: uploadCategory,
            title: file.name,
          }),
        })
        if (mediaRes.ok) {
          const newImg = await mediaRes.json() as { id: string; path: string; bucket: string; title?: string }
          setImages(prev => [{ id: newImg.id, path: newImg.path, bucket: newImg.bucket, title: newImg.title, category: uploadCategory }, ...prev])
        }
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const filtered = activeCategory === 'ALL' ? images : images.filter(img => img.category === activeCategory)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-5xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Content</p>
            <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Vision Board</h1>
            <p className="text-sm text-[#14161C]/40 mt-2">{images.length} image{images.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <Label htmlFor="mb-cat">Category</Label>
              <Select id="mb-cat" value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} className="w-auto">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <Button variant="lavender" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Spinner size="sm" /> : <Upload size={13} />}
              {uploading ? 'Uploading…' : 'Upload images'}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10 space-y-8">
        {/* Category filter tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {['ALL', ...categories].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                activeCategory === cat ? 'bg-[#14161C] text-white' : 'bg-[#1F4D3A]/6 text-[#14161C]/55 hover:text-[#14161C]/70'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {images.length === 0 ? (
          <EmptyState
            icon={<ImageIcon size={40} />}
            title="Vision board is empty"
            description="Upload mood board images to inspire your wedding aesthetic"
            action={
              <Button variant="lavender" onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> Upload images
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<ImageIcon size={40} />} title="No images in this category" description="Upload images or select a different category" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(img => (
              <div key={img.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-[#1F4D3A]/6">
                <img
                  src={`/api/storage/signed-url?path=${encodeURIComponent(img.path)}&bucket=${img.bucket}`}
                  alt={img.title ?? 'Mood board image'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent ">
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                    <p className="text-[11px] text-white font-medium truncate">{img.title ?? img.category}</p>
                    <button onClick={() => handleDelete(img.id, img.path, img.bucket)}
                      className="p-1.5 rounded-lg bg-black/40 hover:bg-red-500/80 text-white transition-colors flex-shrink-0" aria-label="Delete image">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
