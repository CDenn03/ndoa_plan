'use client'
import { useState, useMemo } from 'react'
import { Truck, CalendarDays, MapPin, Bed } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import {
  EventLogisticsTab, RouteList, AccomList,
  type TransportRoute, type Accommodation,
} from '@/components/features/logistics-modals'

interface WeddingEvent { id: string; name: string; type: string; date: string }
interface Props {
  weddingId: string; events: WeddingEvent[]
  routes: TransportRoute[]; accommodations: Accommodation[]; onRefresh: () => void
}

function OverallTab({ routes, accommodations, events }: Readonly<{
  routes: TransportRoute[]; accommodations: Accommodation[]; events: WeddingEvent[]
}>) {
  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent | null; routes: TransportRoute[]; accoms: Accommodation[] }>()
    for (const e of events) map.set(e.id, { event: e, routes: [], accoms: [] })
    for (const r of routes) {
      const k = r.eventId ?? '__unassigned__'
      if (!map.has(k)) map.set(k, { event: null, routes: [], accoms: [] })
      map.get(k)?.routes.push(r)
    }
    for (const a of accommodations) {
      const k = a.eventId ?? '__unassigned__'
      if (!map.has(k)) map.set(k, { event: null, routes: [], accoms: [] })
      map.get(k)?.accoms.push(a)
    }
    return map
  }, [routes, accommodations, events])

  if (routes.length === 0 && accommodations.length === 0) return (
    <EmptyState icon={<Truck size={40} />} title="No logistics yet" description="Add transport routes and accommodations inside each event tab" />
  )

  return (
    <div className="space-y-8">
      <div className="flex gap-8 divide-x divide-zinc-100">
        <div className="pr-8"><p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-1">Routes</p>
          <p className="text-2xl font-extrabold text-[#14161C]">{routes.length}</p></div>
        <div className="px-8"><p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-1">Accommodations</p>
          <p className="text-2xl font-extrabold text-[#14161C]">{accommodations.length}</p></div>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">By event</p>
        {Array.from(byEvent.entries()).map(([key, { event, routes: evR, accoms }]) => {
          if (evR.length === 0 && accoms.length === 0) return null
          return (
            <div key={key} className="rounded-2xl border border-[#1F4D3A]/8 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={15} className="text-[#14161C]/40" />
                <p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p>
              </div>
              <div className="flex gap-6 text-right">
                <div><p className="text-xs text-[#14161C]/40">Routes</p><p className="text-sm font-bold text-sky-600">{evR.length}</p></div>
                <div><p className="text-xs text-[#14161C]/40">Accommodations</p><p className="text-sm font-bold text-emerald-600">{accoms.length}</p></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function LogisticsClient({ weddingId, events, routes, accommodations, onRefresh }: Readonly<Props>) {
  const [activeTab, setActiveTab] = useState('__overall__')
  const tabs = [
    { key: '__overall__', label: 'Overall', icon: <CalendarDays size={13} /> },
    ...events.map(e => ({ key: e.id, label: e.name, icon: <CalendarDays size={13} /> }))
  ]
  const activeEvent = events.find(e => e.id === activeTab)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Logistics</p>
          <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Logistics</h1>
          <p className="text-sm text-[#14161C]/40 mt-2 mb-6">{routes.length} routes · {accommodations.length} accommodations</p>
          <div className="flex gap-0.5 overflow-x-auto scrollbar-thin -mb-px">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-[#14161C] text-[#14161C]' : 'border-transparent text-[#14161C]/40 hover:text-[#14161C]/60'}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-8 py-10">
        {activeTab === '__overall__'
          ? <OverallTab routes={routes} accommodations={accommodations} events={events} />
          : activeEvent
            ? <EventLogisticsTab weddingId={weddingId} eventId={activeEvent.id} routes={routes} accommodations={accommodations} onRefresh={onRefresh} />
            : null}
      </div>
    </div>
  )
}
