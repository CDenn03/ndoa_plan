'use client'
import { useState, useMemo } from 'react'
import { Sparkles, Plus, CalendarDays } from 'lucide-react'
import { Button, EmptyState, Spinner } from '@/components/ui'
import { isFuture, isThisWeek } from 'date-fns'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AppointmentList, EventAppointmentsTab,
  type Appointment, type Vendor,
} from '@/components/features/appointment-modals'
import { AddAppointmentModal } from '@/components/features/appointment-modals'

interface WeddingEvent { id: string; name: string; type: string; date: string }
interface Props { weddingId: string; userId: string; vendors: Vendor[] }

// ─── Overall tab ──────────────────────────────────────────────────────────────

function OverallTab({ appointments, events, isLoading, weddingId, vendors, onRefresh }: Readonly<{
  appointments: Appointment[]; events: WeddingEvent[]; isLoading: boolean
  weddingId: string; vendors: Vendor[]; onRefresh: () => void
}>) {
  const upcoming = appointments.filter(a => a.status === 'SCHEDULED' && isFuture(new Date(a.startAt)))
  const thisWeek = upcoming.filter(a => isThisWeek(new Date(a.startAt)))

  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent | null; appts: Appointment[] }>()
    for (const e of events) map.set(e.id, { event: e, appts: [] })
    for (const a of appointments) {
      const key = a.eventId ?? '__unassigned__'
      if (!map.has(key)) map.set(key, { event: null, appts: [] })
      map.get(key)?.appts.push(a)
    }
    return map
  }, [appointments, events])

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (appointments.length === 0) return (
    <EmptyState icon={<Sparkles size={40} />} title="No appointments yet" description="Book appointments inside each event tab to get started" />
  )

  return (
    <div className="space-y-10">
      <div className="flex gap-8 divide-x divide-zinc-100">
        <div className="pr-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Upcoming</p>
          <p className="text-2xl font-extrabold text-[#14161C]">{upcoming.length}</p></div>
        {thisWeek.length > 0 && (
          <div className="px-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">This week</p>
            <p className="text-2xl font-extrabold text-amber-500">{thisWeek.length}</p></div>
        )}
        <div className="px-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Total</p>
          <p className="text-2xl font-extrabold text-zinc-400">{appointments.length}</p></div>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">By event</p>
        {Array.from(byEvent.entries()).map(([key, { event, appts }]) => {
          if (appts.length === 0) return null
          const upcomingCount = appts.filter(a => a.status === 'SCHEDULED' && isFuture(new Date(a.startAt))).length
          return (
            <div key={key} className="rounded-2xl border border-zinc-100 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={15} className="text-zinc-400" />
                <p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p>
              </div>
              <div className="flex gap-6 text-right">
                <div><p className="text-xs text-zinc-400">Upcoming</p><p className="text-sm font-bold text-violet-600">{upcomingCount}</p></div>
                <div><p className="text-xs text-zinc-400">Total</p><p className="text-sm font-bold text-zinc-500">{appts.length}</p></div>
              </div>
            </div>
          )
        })}
      </div>
      <div>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">All appointments</p>
        <AppointmentList appointments={appointments} weddingId={weddingId} vendors={vendors} onRefresh={onRefresh} />
      </div>
    </div>
  )
}

// ─── Main client ──────────────────────────────────────────────────────────────

export function AppointmentsClient({ weddingId, userId, vendors }: Readonly<Props>) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('__overall__')
  const [showAdd, setShowAdd] = useState(false)

  const { data: appointments = [], isLoading: apptLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/appointments`); if (!res.ok) throw new Error('Failed'); return res.json() as Promise<Appointment[]> },
    staleTime: 30_000,
  })

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/events`); if (!res.ok) throw new Error('Failed'); return res.json() as Promise<WeddingEvent[]> },
    staleTime: 60_000,
  })

  const isLoading = apptLoading || eventsLoading
  const refresh = () => void qc.invalidateQueries({ queryKey: ['appointments', weddingId] })
  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name }))]
  const activeEvent = events.find(e => e.id === activeTab)
  const upcoming = appointments.filter(a => a.status === 'SCHEDULED' && isFuture(new Date(a.startAt)))
  const thisWeek = upcoming.filter(a => isThisWeek(new Date(a.startAt)))

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-zinc-100 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Planning</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Appointments</h1>
            {activeTab === '__overall__' && (
              <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} /> Book appointment</Button>
            )}
          </div>
          <p className="text-sm text-zinc-400 mt-1 mb-6">
            {upcoming.length} upcoming
            {thisWeek.length > 0 && <span className="ml-2 text-amber-500 font-semibold">· {thisWeek.length} this week</span>}
          </p>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px">
            {isLoading ? <div className="pb-4"><Spinner size="sm" /></div> : (
              tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-[#14161C] text-[#14161C]' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
                  {t.label}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-8 py-10">
        {activeTab === '__overall__'
          ? <OverallTab appointments={appointments} events={events} isLoading={isLoading} weddingId={weddingId} vendors={vendors} onRefresh={refresh} />
          : activeEvent
            ? <EventAppointmentsTab weddingId={weddingId} userId={userId} eventId={activeEvent.id} vendors={vendors} appointments={appointments} onRefresh={refresh} />
            : null}
      </div>
      {showAdd && <AddAppointmentModal weddingId={weddingId} userId={userId} vendors={vendors} onClose={() => setShowAdd(false)} onDone={refresh} />}
    </div>
  )
}
