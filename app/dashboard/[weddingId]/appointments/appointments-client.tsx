'use client'
import { useState, useMemo } from 'react'
import { Sparkles, CalendarDays, Plus, LayoutTemplate } from 'lucide-react'
import { EmptyState, Spinner, Button } from '@/components/ui'
import { EventTabs } from '@/components/ui/tabs'
import { StatsCards } from '@/components/ui/stats-cards'
import { isFuture, isThisWeek, format } from 'date-fns'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AppointmentList, EventAppointmentsTab, AppointmentLoadTemplateModal,
  type Appointment, type Vendor,
} from '@/components/features/appointment-modals'
import { AddAppointmentModal } from '@/components/features/appointment-modals'

interface WeddingEvent { id: string; name: string; type: string; date: string }
interface Props { 
  weddingId: string; 
  userId: string; 
  vendors: Vendor[]; 
  events: WeddingEvent[];
}

// ─── Overall tab ──────────────────────────────────────────────────────────────

function OverallTab({ appointments, events, isLoading, weddingId, vendors, onRefresh, onAdd, onTemplate }: Readonly<{
  appointments: Appointment[]; events: WeddingEvent[]; isLoading: boolean
  weddingId: string; vendors: Vendor[]; onRefresh: () => void; onAdd: () => void; onTemplate: () => void
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#14161C]/55">No appointments yet</p>
        <div className="flex gap-2">
          <Button variant="lavender" size="sm" onClick={onTemplate}>
            <LayoutTemplate size={13} /> Load template
          </Button>
          <Button size="sm" onClick={onAdd}><Plus size={14} /> Book appointment</Button>
        </div>
      </div>
      <EmptyState icon={<Sparkles size={40} />} title="No appointments yet" description="Book appointments to get started" />
    </div>
  )

  return (
    <div className="space-y-10">
      <StatsCards
        stats={[
          { label: 'Upcoming', value: upcoming.length, color: 'default' },
          ...(thisWeek.length > 0 ? [{ label: 'This week', value: thisWeek.length, color: 'amber' as const }] : []),
          { label: 'Total', value: appointments.length, color: 'default' }
        ]}
      />

      {/* Upcoming appointments section */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">Upcoming appointments</p>
          <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
            {upcoming.slice(0, 5).map(appt => (
              <div key={appt.id} className="flex items-center gap-4 py-4 px-6 border-b border-[#1F4D3A]/8 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#14161C] truncate">{appt.title}</p>
                  <p className="text-xs text-[#14161C]/40">
                    {format(new Date(appt.startAt), 'MMM d, yyyy • h:mm a')}
                    {appt.location && ` • ${appt.location}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#14161C]/40">
                    {isThisWeek(new Date(appt.startAt)) ? 'This week' : format(new Date(appt.startAt), 'MMM d')}
                  </p>
                </div>
              </div>
            ))}
            {upcoming.length > 5 && (
              <div className="px-6 py-3 bg-[#F7F5F2]/60 text-center">
                <p className="text-xs text-[#14161C]/40">+{upcoming.length - 5} more upcoming appointments</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">By event</p>
        {Array.from(byEvent.entries()).map(([key, { event, appts }]) => {
          if (appts.length === 0) return null
          const upcomingCount = appts.filter(a => a.status === 'SCHEDULED' && isFuture(new Date(a.startAt))).length
          return (
            <div key={key} className="rounded-2xl border border-[#1F4D3A]/8 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={15} className="text-[#14161C]/40" />
                <p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p>
              </div>
              <div className="flex gap-6 text-right">
                <div><p className="text-xs text-[#14161C]/40">Upcoming</p><p className="text-sm font-bold text-[#1F4D3A]">{upcomingCount}</p></div>
                <div><p className="text-xs text-[#14161C]/40">Total</p><p className="text-sm font-bold text-[#14161C]/55">{appts.length}</p></div>
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">All appointments</p>
          <div className="flex gap-2">
            <Button variant="lavender" size="sm" onClick={onTemplate}>
              <LayoutTemplate size={13} /> Load template
            </Button>
            <Button size="sm" onClick={onAdd}><Plus size={14} /> Book appointment</Button>
          </div>
        </div>
        <AppointmentList appointments={appointments} weddingId={weddingId} vendors={vendors} onRefresh={onRefresh} />
      </div>
    </div>
  )
}

// ─── Main client ──────────────────────────────────────────────────────────────

export function AppointmentsClient({ weddingId, userId, vendors, events }: Readonly<Props>) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('__overall__')
  const [showAdd, setShowAdd] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)

  const { data: appointments = [], isLoading: apptLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments', weddingId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/appointments`)
      if (!res.ok) throw new Error('Failed')
      return res.json() as Promise<Appointment[]>
    },
    staleTime: 30_000,
  })

  const isLoading = apptLoading
  const refresh = () => void qc.invalidateQueries({ queryKey: ['appointments', weddingId] })
  const activeEvent = events.find(e => e.id === activeTab)
  const upcoming = appointments.filter(a => a.status === 'SCHEDULED' && isFuture(new Date(a.startAt)))
  const thisWeek = upcoming.filter(a => isThisWeek(new Date(a.startAt)))
  const completed = appointments.filter(a => a.status === 'COMPLETED').length

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Planning</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Appointments</h1>
            
          </div>
          <p className="text-sm text-[#14161C]/40 mt-1 mb-6">
            {completed} of {appointments.length} completed
            {thisWeek.length > 0 && <span className="ml-2 text-amber-500 font-semibold">· {thisWeek.length} this week</span>}
          </p>
          <EventTabs
            events={events}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showOverall={true}
          />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-8 py-10">
        {activeTab === '__overall__' ? (
          <OverallTab 
            appointments={appointments} 
            events={events} 
            isLoading={isLoading} 
            weddingId={weddingId} 
            vendors={vendors} 
            onRefresh={refresh}
            onAdd={() => setShowAdd(true)}
            onTemplate={() => setShowTemplate(true)}
          />
        ) : activeEvent ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#14161C]/55">
                {appointments.filter(a => a.eventId === activeEvent.id && a.status === 'COMPLETED').length}/
                {appointments.filter(a => a.eventId === activeEvent.id).length} completed
              </p>
              <div className="flex gap-2">
                <Button variant="lavender" size="sm" onClick={() => setShowTemplate(true)}>
                  <LayoutTemplate size={13} /> Load template
                </Button>
                <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Book appointment</Button>
              </div>
            </div>
            <EventAppointmentsTab 
              weddingId={weddingId} 
              userId={userId} 
              eventId={activeEvent.id} 
              vendors={vendors} 
              appointments={appointments} 
              onRefresh={refresh} 
            />
          </div>
        ) : null}
      </div>
      {showAdd && <AddAppointmentModal weddingId={weddingId} userId={userId} vendors={vendors} eventId={activeEvent?.id} onClose={() => setShowAdd(false)} onDone={refresh} />}
      {showTemplate && activeEvent && <AppointmentLoadTemplateModal weddingId={weddingId} eventId={activeEvent.id} onClose={() => setShowTemplate(false)} onDone={refresh} />}
    </div>
  )
}
