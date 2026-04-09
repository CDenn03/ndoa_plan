'use client'
import { use } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@/components/ui'
import { GiftsClient } from './gifts-client'

interface WeddingEvent { id: string; name: string; type: string; date: string }

export default function GiftsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const qc = useQueryClient()

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/events`); if (!res.ok) throw new Error(); return res.json() },
    staleTime: 60_000,
  })
  const { data: registry = [], isLoading: regLoading } = useQuery({
    queryKey: ['gifts-registry', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/gifts/registry`); if (!res.ok) throw new Error(); return res.json() },
    staleTime: 30_000,
  })
  const { data: received = [], isLoading: recLoading } = useQuery({
    queryKey: ['gifts-received', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/gifts/received`); if (!res.ok) throw new Error(); return res.json() },
    staleTime: 30_000,
  })

  const isLoading = eventsLoading || regLoading || recLoading
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['gifts-registry', wid] })
    void qc.invalidateQueries({ queryKey: ['gifts-received', wid] })
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>

  return <GiftsClient weddingId={wid} events={events} registry={registry} received={received} onRefresh={refresh} />
}
