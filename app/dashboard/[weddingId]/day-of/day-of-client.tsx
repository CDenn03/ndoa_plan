'use client'
import { useState, useMemo } from 'react'
import { Calendar, CalendarDays } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { format } from 'date-fns'
import {
  EventScheduleTab,
  type WeddingEvent, type Vendor, type Incident,
} from '@/components/features/schedule-components'

interface Props {
  weddingId: string; events: WeddingEvent[]
  vendors: Vendor[]; incidents: Incident[]; onRefresh: () => void
}

function OverallTab({ incidents, events }: Readonly<{ incidents: Incident[]; events: WeddingEvent[] }>) {
  const activeIncidents = incidents.filter(i => !i.resolvedAt)
  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent; incidents: Incident[] }>()
    for (const e of events) map.set(e.id, { event: e, incidents: [] })
    for (const i of incidents) {
      const k = i.eventId ?? '__unassigned__'
      const entry = map.get(k)
      if (entry) entry.incidents.push(i)
    }
    return map
  }, [incidents, events])

  if (events.length === 0) return (
    <EmptyState icon={<Calendar size={40} />} title="No events yet" description="Create events to manage their schedules" />
  )

  return (
    <div className="space-y-8">
      <div className="flex gap-8 divide-x divide-zinc-100">
        <div className="pr-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Events</p>
          <p className="text-2xl font-extrabold text-[#14161C]">{events.length}</p></div>
        <div className="px-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Active incidents</p>
          <p className={`text-2xl font-extrabold ${activeIncidents.length > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{activeIncidents.length}</p></div>
        <div className="px-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Total incidents</p>
          <p className="text-2xl font-extrabold text-zinc-400">{incidents.length}</p></div>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Events</p>
        {events.map(e => {
          const evIncidents = byEvent.get(e.id)?.incidents ?? []
          const active = evIncidents.filter(i => !i.resolvedAt).length
          return (
            <div key={e.id} className="rounded-2xl border border-zinc-100 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={15} className="text-zinc-400" />
                <div>
                  <p className="text-sm font-bold text-[#14161C]">{e.name}</p>
                  <p className="text-xs text-zinc-400">{format(new Date(e.date), 'MMM d, yyyy')}</p>
                </div>
              </div>
              <div className="flex gap-6 text-right">
                {active > 0 && <div><p className="text-xs text-zinc-400">Active</p><p className="text-sm font-bold text-red-500">{active}</p></div>}
                <div><p className="text-xs text-zinc-400">Incidents</p><p className="text-sm font-bold text-zinc-500">{evIncidents.length}</p></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ScheduleClient({ weddingId, events, vendors, incidents, onRefresh }: Readonly<Props>) {
  const [activeTab, setActiveTab] = useState(() => events.find(e => e.isMain)?.id ?? events[0]?.id ?? '__overall__')
  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name }))]
  const activeEvent = events.find(e => e.id === activeTab)
  const activeIncidents = incidents.filter(i => !i.resolvedAt)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Execution</p>
          <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Schedule</h1>
          <p className="text-sm text-zinc-400 mt-2 mb-6">
            {events.length} events
            {activeIncidents.length > 0 && (
              <span className="ml-2 text-red-500 font-semibold">· {activeIncidents.length} active incident{activeIncidents.length === 1 ? '' : 's'}</span>
            )}
          </p>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-[#14161C] text-[#14161C]' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-8 py-10">
        {activeTab === '__overall__'
          ? <OverallTab incidents={incidents} events={events} />
          : activeEvent
            ? <EventScheduleTab weddingId={weddingId} event={activeEvent} vendors={vendors} incidents={incidents} onRefresh={onRefresh} />
            : null}
      </div>
    </div>
  )
}

// Backward-compat alias
export { ScheduleClient as DayOfClient }
