'use client'
import { useState, useRef } from 'react'
import { FileText, Upload } from 'lucide-react'
import { Button, Select, Label, EmptyState, Spinner } from '@/components/ui'
import { format } from 'date-fns'

interface Doc {
  id: string; path: string; bucket: string; title?: string
  mimeType: string; category: string; createdAt: string
}

interface Props {
  weddingId: string
  categories: string[]
  initialDocs: Doc[]
}

const CATEGORY_LABEL: Record<string, string> = {
  CONTRACT: 'Contracts', PERMIT: 'Permits', ID: 'IDs',
  CERTIFICATE: 'Certificates', OTHER: 'Other',
}

export function DocumentsClient({ weddingId, categories, initialDocs }: Readonly<Props>) {
  const [docs, setDocs] = useState(initialDocs)
  const [uploading, setUploading] = useState(false)
  const [uploadCategory, setUploadCategory] = useState('CONTRACT')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bucket', 'documents')
        formData.append('path', `${weddingId}/documents/${uploadCategory}/${Date.now()}-${file.name}`)
        formData.append('weddingId', weddingId)

        const upRes = await fetch('/api/storage/upload', { method: 'POST', body: formData })
        if (!upRes.ok) continue
        const { path } = await upRes.json() as { path: string }

        const mediaRes = await fetch(`/api/weddings/${weddingId}/media`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket: 'documents', path, mimeType: file.type,
            linkedToType: 'document', linkedToId: uploadCategory,
            title: file.name, sizeBytes: file.size,
          }),
        })
        if (mediaRes.ok) {
          const newDoc = await mediaRes.json() as { id: string; path: string; bucket: string; title?: string; mimeType: string; createdAt: string }
          setDocs(prev => [...prev, {
            id: newDoc.id, path: newDoc.path, bucket: newDoc.bucket,
            title: newDoc.title ?? file.name, mimeType: newDoc.mimeType,
            category: uploadCategory, createdAt: newDoc.createdAt,
          }])
        }
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const grouped = docs.reduce<Record<string, Doc[]>>((acc, d) => {
    const key = d.category
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {})

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Content</p>
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Documents</h1>
            <p className="text-sm text-zinc-400 mt-2">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <Label htmlFor="doc-cat">Category</Label>
              <Select id="doc-cat" value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} className="w-auto">
                {categories.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
              </Select>
            </div>
            <Button variant="lavender" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Spinner size="sm" /> : <Upload size={13} />}
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={handleUpload} />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 space-y-10">
        {docs.length === 0 ? (
          <EmptyState
            icon={<FileText size={40} />}
            title="No documents yet"
            description="Upload contracts, permits, IDs, and certificates"
            action={
              <Button variant="lavender" onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> Upload document
              </Button>
            }
          />
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">{CATEGORY_LABEL[cat] ?? cat}</p>
              <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
                {items.map(doc => (
                  <div key={doc.id} className="flex items-center gap-4 py-4 px-6 border-b border-zinc-100 last:border-0">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <FileText size={15} className="text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#14161C] truncate">{doc.title ?? doc.path.split('/').pop()}</p>
                      <p className="text-xs text-zinc-400">{doc.mimeType} · {format(new Date(doc.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                    <a
                      href={`/api/storage/signed-url?path=${encodeURIComponent(doc.path)}&bucket=${doc.bucket}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors flex-shrink-0"
                    >
                      View →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
