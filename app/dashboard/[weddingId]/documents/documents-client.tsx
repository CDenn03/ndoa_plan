'use client'
import { useState, useRef } from 'react'
import { FileText, Upload, Trash2, ArrowLeft, File, FileImage, FileVideo, Archive, Plus, Pencil, MoreHorizontal, X } from 'lucide-react'
import { Button, Input, Label, EmptyState, Spinner, Modal } from '@/components/ui'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/toast'

interface Doc {
  id: string; path: string; bucket: string; title?: string
  mimeType: string; category: string; createdAt: string
}

interface DocCategory { id: string; label: string; color: string }

interface Props {
  weddingId: string
  initialDocs: Doc[]
}

const DEFAULT_CATEGORIES: DocCategory[] = [
  { id: 'CONTRACT',    label: 'Contracts',    color: '#8B5CF6' },
  { id: 'PERMIT',      label: 'Permits',      color: '#F59E0B' },
  { id: 'ID',          label: 'IDs',          color: '#3B82F6' },
  { id: 'CERTIFICATE', label: 'Certificates', color: '#10B981' },
  { id: 'OTHER',       label: 'Other',        color: '#6B7280' },
]

const COLOR_PRESETS = ['#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#3B82F6','#6B7280','#F97316','#14B8A6']

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.startsWith('video/')) return FileVideo
  if (mimeType.includes('zip') || mimeType.includes('archive')) return Archive
  return File
}

// ─── Category Form Modal ──────────────────────────────────────────────────────

function CategoryFormModal({ category, onSave, onClose }: Readonly<{
  category?: DocCategory; onSave: (cat: DocCategory) => void; onClose: () => void
}>) {
  const [label, setLabel] = useState(category?.label ?? '')
  const [color, setColor] = useState(category?.color ?? '#8B5CF6')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim()) return
    onSave({ id: category?.id ?? label.toUpperCase().replace(/\s+/g, '_'), label: label.trim(), color })
    onClose()
  }

  return (
    <Modal onClose={onClose} title={category ? 'Edit category' : 'Create category'}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="cat-label">Category name *</Label>
          <Input id="cat-label" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Venue Contracts" autoFocus required />
        </div>
        <div>
          <Label>Color</Label>
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
          <Button type="submit" className="flex-1" disabled={!label.trim()}>{category ? 'Save changes' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Confirm Delete Category Modal ────────────────────────────────────────────

function ConfirmDeleteCategoryModal({ label, onConfirm, onCancel }: Readonly<{
  label: string; onConfirm: () => void; onCancel: () => void
}>) {
  return (
    <Modal onClose={onCancel} title={`Delete "${label}"?`}>
      <p className="text-sm text-zinc-500 mb-6">All documents in this category will be removed. This cannot be undone.</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white border-red-500">Delete</Button>
      </div>
    </Modal>
  )
}

// ─── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({ category, docs, onOpen, onEdit, onDelete, tall }: Readonly<{
  category: DocCategory; docs: Doc[]; onOpen: () => void
  onEdit: () => void; onDelete: () => void; tall?: boolean
}>) {
  const [showMenu, setShowMenu] = useState(false)
  const previews = docs.slice(0, 4)

  return (
    <div className="group relative">
      <button onClick={onOpen} className="text-left focus:outline-none w-full">
        <div
          className={`w-full rounded-2xl overflow-hidden flex items-center justify-center transition-transform group-hover:scale-[1.02] duration-200 ${tall ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}
          style={{ backgroundColor: `${category.color}18` }}
        >
          {previews.length === 0 ? (
            <FileText size={40} style={{ color: category.color }} className="opacity-40" />
          ) : previews.length === 1 ? (
            <FileText size={36} style={{ color: category.color }} />
          ) : (
            <div className="w-full h-full grid grid-cols-2 gap-0.5 p-3">
              {previews.map((doc, i) => {
                const Icon = fileIcon(doc.mimeType)
                return (
                  <div key={i} className="bg-white/60 rounded-lg flex items-center justify-center">
                    <Icon size={20} style={{ color: category.color }} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </button>

      <div className="mt-2.5 flex items-start justify-between gap-2">
        <button onClick={onOpen} className="text-left flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#14161C] truncate">{category.label}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
        </button>
        <div className="relative flex-shrink-0 mt-0.5">
          <button onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }}
            className="p-1 rounded-full text-zinc-300 hover:text-zinc-500 transition-colors" aria-label="More options">
            <MoreHorizontal size={15} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} aria-hidden />
              <div className="absolute right-0 top-6 bg-white rounded-xl shadow-lg border border-zinc-100 py-1 z-20 min-w-32">
                <button onClick={() => { setShowMenu(false); onEdit() }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={() => { setShowMenu(false); onDelete() }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Category Detail View ─────────────────────────────────────────────────────

function CategoryDetail({ weddingId, category, docs, onBack, onDelete, onUpload, uploading }: Readonly<{
  weddingId: string; category: DocCategory; docs: Doc[]
  onBack: () => void; onDelete: (id: string) => void
  onUpload: (files: File[], category: string) => void; uploading: boolean
}>) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
          <ArrowLeft size={12} /> All categories
        </button>
        <Button size="sm" variant="lavender" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Spinner size="sm" /> : <Upload size={13} />}
          {uploading ? 'Uploading…' : `Upload to ${category.label}`}
        </Button>
        <input ref={fileRef} type="file" multiple className="hidden"
          onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) onUpload(files, category.id); e.target.value = '' }} />
      </div>

      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
        <div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{category.label}</p>
          <p className="text-sm text-zinc-500">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {docs.length === 0 ? (
        <EmptyState icon={<FileText size={40} />} title="No documents yet"
          description={`Upload documents to ${category.label}`}
          action={<Button variant="lavender" onClick={() => fileRef.current?.click()}><Upload size={14} /> Upload</Button>} />
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          {docs.map(doc => {
            const Icon = fileIcon(doc.mimeType)
            return (
              <div key={doc.id} className="group flex items-center gap-4 py-4 px-6 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#14161C] truncate">{doc.title ?? doc.path.split('/').pop()}</p>
                  <p className="text-xs text-zinc-400">{doc.mimeType.split('/')[1]?.toUpperCase() ?? doc.mimeType} · {format(new Date(doc.createdAt), 'MMM d, yyyy')}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={`/api/storage/signed-url?path=${encodeURIComponent(doc.path)}&bucket=${doc.bucket}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                    View →
                  </a>
                  <button onClick={() => onDelete(doc.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors" aria-label="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Asymmetric grid helper ───────────────────────────────────────────────────
// Alternates tall/wide cards for visual rhythm, similar to moodboard

function AsymmetricGrid({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-0">
      {children}
    </div>
  )
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export function DocumentsClient({ weddingId, initialDocs }: Readonly<Props>) {
  const [docs, setDocs] = useState(initialDocs)
  const [categories, setCategories] = useState<DocCategory[]>(DEFAULT_CATEGORIES)
  const [uploading, setUploading] = useState(false)
  const [openCategory, setOpenCategory] = useState<DocCategory | null>(null)
  const [editCategory, setEditCategory] = useState<DocCategory | null>(null)
  const [deleteCategory, setDeleteCategory] = useState<DocCategory | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const { toast } = useToast()

  const handleUpload = async (files: File[], categoryId: string) => {
    setUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bucket', 'documents')
        formData.append('path', `${weddingId}/documents/${categoryId}/${Date.now()}-${file.name}`)
        formData.append('weddingId', weddingId)

        const upRes = await fetch('/api/storage/upload', { method: 'POST', body: formData })
        if (!upRes.ok) continue
        const { path } = await upRes.json() as { path: string }

        const mediaRes = await fetch(`/api/weddings/${weddingId}/media`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket: 'documents', path, mimeType: file.type,
            linkedToType: 'document', linkedToId: categoryId,
            title: file.name, sizeBytes: file.size,
          }),
        })
        if (mediaRes.ok) {
          const newDoc = await mediaRes.json() as { id: string; path: string; bucket: string; title?: string; mimeType: string; createdAt: string }
          setDocs(prev => [...prev, {
            id: newDoc.id, path: newDoc.path, bucket: newDoc.bucket,
            title: newDoc.title ?? file.name, mimeType: newDoc.mimeType,
            category: categoryId, createdAt: newDoc.createdAt,
          }])
        }
      }
      toast('Documents uploaded', 'success')
    } catch { toast('Upload failed', 'error') }
    finally { setUploading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return
    try {
      await fetch(`/api/weddings/${weddingId}/media/${id}`, { method: 'DELETE' })
      setDocs(prev => prev.filter(d => d.id !== id))
      toast('Document deleted', 'success')
    } catch { toast('Failed to delete', 'error') }
  }

  const handleDeleteCategory = async (cat: DocCategory) => {
    // Delete all docs in this category
    const catDocs = docs.filter(d => d.category === cat.id)
    for (const doc of catDocs) {
      await fetch(`/api/weddings/${weddingId}/media/${doc.id}`, { method: 'DELETE' }).catch(() => null)
    }
    setDocs(prev => prev.filter(d => d.category !== cat.id))
    setCategories(prev => prev.filter(c => c.id !== cat.id))
    setDeleteCategory(null)
    if (openCategory?.id === cat.id) setOpenCategory(null)
    toast('Category deleted', 'success')
  }

  const handleSaveCategory = (cat: DocCategory) => {
    setCategories(prev => {
      const exists = prev.find(c => c.id === cat.id)
      if (exists) return prev.map(c => c.id === cat.id ? cat : c)
      return [...prev, cat]
    })
  }

  const grouped = docs.reduce<Record<string, Doc[]>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {})

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-5xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Content</p>
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Documents</h1>
            <p className="text-sm text-zinc-400 mt-2">{docs.length} document{docs.length !== 1 ? 's' : ''} · {categories.length} categories</p>
          </div>
          {!openCategory && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Create category
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10">
        {openCategory ? (
          <CategoryDetail
            weddingId={weddingId}
            category={openCategory}
            docs={grouped[openCategory.id] ?? []}
            onBack={() => setOpenCategory(null)}
            onDelete={handleDelete}
            onUpload={handleUpload}
            uploading={uploading}
          />
        ) : categories.length === 0 ? (
          <EmptyState icon={<FileText size={40} className="text-zinc-200" />} title="No categories yet"
            description="Create a category to start organising your documents"
            action={<Button onClick={() => setShowCreate(true)}><Plus size={14} /> Create category</Button>} />
        ) : (
          <AsymmetricGrid>
            {categories.map((cat, i) => (
              <div key={cat.id} className="break-inside-avoid mb-4">
                <CategoryCard
                  category={cat}
                  docs={grouped[cat.id] ?? []}
                  onOpen={() => setOpenCategory(cat)}
                  onEdit={() => setEditCategory(cat)}
                  onDelete={() => setDeleteCategory(cat)}
                  tall={i % 3 === 0}
                />
              </div>
            ))}
          </AsymmetricGrid>
        )}
      </div>

      {showCreate && (
        <CategoryFormModal onSave={handleSaveCategory} onClose={() => setShowCreate(false)} />
      )}
      {editCategory && (
        <CategoryFormModal category={editCategory} onSave={handleSaveCategory} onClose={() => setEditCategory(null)} />
      )}
      {deleteCategory && (
        <ConfirmDeleteCategoryModal
          label={deleteCategory.label}
          onConfirm={() => handleDeleteCategory(deleteCategory)}
          onCancel={() => setDeleteCategory(null)}
        />
      )}
    </div>
  )
}
