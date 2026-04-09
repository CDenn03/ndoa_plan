'use client'
import { use } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@/components/ui'
import { DayOfClient } from './day-of-client'

interface WeddingEvent { id: string; name: string; type: string; date: string; isMain: boolean }

export default function DayOfPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const qc = useQueryClient()

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/events`); if (!res.ok) throw new Error(); return res.json() },
    staleTime: 60_000,
  })

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors-confirmed', wid],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${wid}/vendors`)
      if (!res.ok) throw new Error()
      const all = await res.json() as { id: string; name: string; category: string; status: string; contactPhone?: string | null; contactEmail?: string | null }[]
      return all.filter(v => v.status === 'CONFIRMED' || v.status === 'BOOKED')
    },
    staleTime: 60_000,
  })

  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ['incidents', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/incidents`); if (!res.ok) throw new Error(); return res.json() },
    staleTime: 15_000,
  })

  const isLoading = eventsLoading || vendorsLoading || incidentsLoading
  const refresh = () => qc.invalidateQueries({ queryKey: ['incidents', wid] })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>

  return <DayOfClient weddingId={wid} events={events} vendors={vendors} incidents={incidents} onRefresh={refresh} />
}
