'use client'
import { use } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@/components/ui'
import { LogisticsClient } from './logistics-client'

interface WeddingEvent { id: string; name: string; type: string; date: string }

export default function LogisticsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const qc = useQueryClient()

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${wid}/events`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    staleTime: 60_000,
  })

  const { data: routes = [], isLoading: routesLoading } = useQuery({
    queryKey: ['logistics-routes', wid],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${wid}/logistics/routes`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    staleTime: 30_000,
  })

  const { data: accommodations = [], isLoading: accomLoading } = useQuery({
    queryKey: ['logistics-accommodations', wid],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${wid}/logistics/accommodations`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    staleTime: 30_000,
  })

  const isLoading = eventsLoading || routesLoading || accomLoading
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['logistics-routes', wid] })
    void qc.invalidateQueries({ queryKey: ['logistics-accommodations', wid] })
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <LogisticsClient
      weddingId={wid}
      events={events}
      routes={routes}
      accommodations={accommodations}
      onRefresh={refresh}
    />
  )
}
