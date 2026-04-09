'use client'
import { useState, useMemo } from 'react'
import { Calendar, Phone, AlertTriangle, CheckCircle2, CalendarDays, List } from 'lucide-react'
import { Button, EmptyState, Modal, Input, Label, Select, Spinner } from '@/components/ui'
import { format, parseISO } from 'date-fns'
import { useToast } from '@/components/ui/toast'
import { useQuery } from '@tanstack/react-query'

interface ProgramItem {
  id: string; title: string; description?: string
  date?: string | null; time?: string; startTime?: string | null
  duration?: number | null; order: number; assignedTo?: string
}
interface Vendor { id: string; name: string; category: string; contactPhone?: string | null }
interface Incident {
  id: string; eventId?: string | null; description: string; severity: string
  reportedAt: string; resolvedAt?: string | null; resolution?: string | null
}
interface WeddingEvent { id: string; name: string; type: string; date: string; isMain: boolean }
interface Props {
  weddingId: string; events: WeddingEvent[]
  vendors: Vendor[]; incidents: Incident[]; onRefresh: () => void
}

const SEV_COLOR: Record<string, string> = {
  CRITICAL: 'border-l-4 border-red-400 bg-red-50/50',
  HIGH: 'border-l-4 border-amber-400 bg-amber-50/50',
  MEDIUM: 'border-l-4 border-sky-400 bg-sky-50/50',
  LOW: 'border-l-4 border-zinc-300',
}

const MULTI_DAY_TYPES = new Set(['HONEYMOON', 'MOVING', 'POST_WEDDING'])

function LogIncidentModal({ weddingId, eventId, onClose, onDone }: Readonly<{
  weddingId: string; eventId?: string; onClose: () => void; onDone: () => void
}>) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ description: '', severity: 'MEDIUM' })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/incidents`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, eventId: eventId ?? null }),
      })
      if (!res.ok) throw new Error()
      toast('Incident logged', 'success'); onDone(); onClose()
    } catch { toast('Failed to log incident', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Log incident">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="inc-desc">Description *</Label>
          <Input id="inc-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What happened?" required /></div>
        <div><Label htmlFor="inc-sev">Severity</Label>
          <Select id="inc-sev" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </Select></div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" variant="danger" className="flex-1" disabled={saving}>{saving ? 'Logging…' : 'Log incident'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function ProgramRow({ item, idx }: Readonly<{ item: ProgramItem; idx: number }>) {
  const timeLabel = item.startTime ?? item.time
  return (
    <div className="flex gap-4 py-3 border-b border-zinc-100 last:border-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center text-xs font-bold text-violet-600">{idx + 1}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-[#14161C]">{item.title}</p>
          {timeLabel && <span className="text-xs font-semibold text-violet-600 bg-violet-50 rounded-full px-2 py-0.5">{timeLabel}</span>}
          {Boolean(item.duration) && <span className="text-xs text-zinc-400">{item.duration}min</span>}
        </div>
        {item.description && <p className="text-xs text-zinc-400 mt-0.5">{item.description}</p>}
        {item.assignedTo && <p className="text-xs text-violet-500 mt-0.5">→ {item.assignedTo}</p>}
      </div>
    </div>
  )
}

function DayProgram({ items }: Readonly<{ items: ProgramItem[] }>) {
  if (items.length === 0) return (
    <EmptyState icon={<Calendar size={40} />} title="No program yet" description="Add program items from the Events page" />
  )
  return <div className="space-y-0">{items.map((item, idx) => <ProgramRow key={item.id} item={item} idx={idx} />)}</div>
}

function WeekProgram({ items, eventDate }: Readonly<{ items: ProgramItem[]; eventDate: string }>) {
  const grouped = useMemo(() => {
    const map = new Map<string, ProgramItem[]>()
    for (const item of items) {
      const key = item.date ? item.date.split('T')[0] : eventDate.split('T')[0]
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [items, eventDate])

  if (grouped.length === 0) return (
    <EmptyState icon={<Calendar size={40} />} title="No program yet" description="Add program items from the Events page" />
  )

  return (
    <div className="space-y-6">
      {grouped.map(([dateStr, dayItems], dayIdx) => (
        <div key={dateStr}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex flex-col items-center justify-center flex-shrink-0">
              <p className="text-sm font-extrabold text-violet-600 leading-none">{format(parseISO(dateStr), 'd')}</p>
              <p className="text-[9px] font-semibold text-zinc-400 uppercase">{format(parseISO(dateStr), 'MMM')}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-[#14161C]">{format(parseISO(dateStr), 'EEEE, d MMMM')}</p>
              <p className="text-xs text-zinc-400">Day {dayIdx + 1} · {dayItems.length} item{dayItems.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="pl-4 border-l-2 border-violet-100 ml-5">
            {dayItems.map((item, idx) => <ProgramRow key={item.id} item={item} idx={idx} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function OverallTab({ incidents, events }: Readonly<{ incidents: Incident[]; events: WeddingEvent[] }>) {
  const activeIncidents = incidents.filter(i => !i.resolvedAt)
  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent; incidents: Incident[] }>()
    for (const e of events) map.set(e.id, { event: e, incidents: [] })
    for (const i of incidents) {
      const k = i.eventId ?? '__unassigned__'
      if (map.has(k)) map.get(k)!.incidents.push(i)
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

function EventScheduleTab({ weddingId, event, vendors, incidents, onRefresh }: Readonly<{
  weddingId: string; event: WeddingEvent; vendors: Vendor[]; incidents: Incident[]; onRefresh: () => void
}>) {
  const isMultiDay = MULTI_DAY_TYPES.has(event.type)
  const [viewMode, setViewMode] = useState<'day' | 'week'>(isMultiDay ? 'week' : 'day')
  const [subTab, setSubTab] = useState<'program' | 'contacts' | 'incidents'>('program')
  const [showIncident, setShowIncident] = useState(false)

  const { data: programItems = [], isLoading: programLoading } = useQuery<ProgramItem[]>({
    queryKey: ['program', event.id],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/events/${event.id}/program`)
      if (!res.ok) throw new Error()
      return res.json()
    },
    staleTime: 30_000,
  })

  const evIncidents = useMemo(() => incidents.filter(i => i.eventId === event.id), [incidents, event.id])
  const activeIncidents = evIncidents.filter(i => !i.resolvedAt)
  const hasDatedItems = programItems.some(i => i.date)
  const canToggleView = isMultiDay || hasDatedItems

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          {(['program', 'contacts', 'incidents'] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${subTab === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
              {t === 'contacts' ? 'Contacts' : t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'incidents' && activeIncidents.length > 0 && (
                <span className="ml-1.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full px-1.5 py-0.5">{activeIncidents.length}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {subTab === 'program' && canToggleView && (
            <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
              <button onClick={() => setViewMode('day')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'day' ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                <List size={12} /> Day
              </button>
              <button onClick={() => setViewMode('week')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'week' ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                <CalendarDays size={12} /> Week
              </button>
            </div>
          )}
          <Button size="sm" variant="danger" onClick={() => setShowIncident(true)}>
            <AlertTriangle size={14} /> Log incident
          </Button>
        </div>
      </div>

      {subTab === 'program' && (
        programLoading ? <div className="flex justify-center py-12"><Spinner /></div> :
        viewMode === 'week'
          ? <WeekProgram items={programItems} eventDate={event.date} />
          : <DayProgram items={programItems} />
      )}

      {subTab === 'contacts' && (
        vendors.length === 0
          ? <EmptyState icon={<Phone size={40} />} title="No confirmed vendors" description="Confirmed and booked vendors appear here" />
          : (
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              {vendors.map(v => (
                <div key={v.id} className="flex items-center gap-4 py-4 px-6 border-b border-zinc-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#14161C]">{v.name}</p>
                    <p className="text-xs text-zinc-400">{v.category.replaceAll('_', ' ')}</p>
                  </div>
                  {v.contactPhone && (
                    <a href={`tel:${v.contactPhone}`} className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-800 transition-colors flex-shrink-0">
                      <Phone size={13} /> {v.contactPhone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )
      )}

      {subTab === 'incidents' && (
        evIncidents.length === 0
          ? <EmptyState icon={<AlertTriangle size={40} />} title="No incidents" description="Log any issues that arise" />
          : (
            <div className="space-y-3">
              {evIncidents.map(inc => (
                <div key={inc.id} className={`rounded-xl p-4 ${SEV_COLOR[inc.severity] ?? 'border-l-4 border-zinc-300'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-zinc-500 uppercase">{inc.severity}</span>
                    <span className="text-xs text-zinc-400">{format(new Date(inc.reportedAt), 'h:mm a')}</span>
                    {inc.resolvedAt && <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1"><CheckCircle2 size={11} /> Resolved</span>}
                  </div>
                  <p className="text-sm text-zinc-700">{inc.description}</p>
                  {inc.resolution && <p className="text-xs text-zinc-500 mt-1 italic">{inc.resolution}</p>}
                </div>
              ))}
            </div>
          )
      )}

      {showIncident && <LogIncidentModal weddingId={weddingId} eventId={event.id} onClose={() => setShowIncident(false)} onDone={onRefresh} />}
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
