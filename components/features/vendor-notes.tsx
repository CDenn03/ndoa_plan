'use client'
import { useState } from 'react'
import { Button, Input, Spinner } from '@/components/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Send } from 'lucide-react'

interface VendorNoteItem { id: string; content: string; createdBy: string; createdAt: string }

export function VendorNotesLog({ vendorId, weddingId }: Readonly<{ vendorId: string; weddingId: string }>) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')

  const { data: notes = [], isLoading } = useQuery<VendorNoteItem[]>({
    queryKey: ['vendor-notes', vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/vendors/${vendorId}/notes`)
      if (!res.ok) return []
      return res.json() as Promise<VendorNoteItem[]>
    },
    staleTime: 30_000,
  })

  const addNote = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/weddings/${weddingId}/vendors/${vendorId}/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to add note')
      return res.json()
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor-notes', vendorId] })
      setNote('')
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!note.trim()) return
    addNote.mutate(note.trim())
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">Notes log</p>
      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner size="sm" /></div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-[#14161C]/40">No notes yet. Log a communication update below.</p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
          {notes.map(n => (
            <div key={n.id} className="text-xs bg-[#F7F5F2] rounded-xl px-3 py-2.5">
              <p className="text-[#14161C] leading-relaxed">{n.content}</p>
              <p className="text-[#14161C]/40 mt-1">{n.createdBy} · {format(new Date(n.createdAt), 'MMM d, h:mm a')}</p>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Log a note or update…"
          className="flex-1 h-8 text-xs"
        />
        <Button type="submit" size="sm" variant="lavender" disabled={addNote.isPending || !note.trim()}>
          <Send size={12} />
        </Button>
      </form>
    </div>
  )
}
