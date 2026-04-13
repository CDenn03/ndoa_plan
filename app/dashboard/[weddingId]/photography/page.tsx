'use client'
import { use } from 'react'
import { PhotographyTab } from '@/components/features/photography-components'

export default function PhotographyPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Content</p>
          <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Photography</h1>
          <p className="text-sm text-zinc-400 mt-1">Vendors, shot list, checklist, deliverables and budget</p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-8 py-10">
        <PhotographyTab weddingId={wid} />
      </div>
    </div>
  )
}
