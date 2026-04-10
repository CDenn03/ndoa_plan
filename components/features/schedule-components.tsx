'use client'
import { useState, useMemo } from 'react'
import { Calendar, Phone, AlertTriangle, CheckCircle2, CalendarDays, List, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, EmptyState, Modal, Input, Label, Select, Spinner } from '@/components/ui'
import { format, parseISO, addDays, startOfWeek, isSameDay } from 'date-fns'
import { useToast } from '@/components/ui/toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProgramItem {
  id: string; title: string; description?: string
  date?: string | null; time?: string; startTime?: string | null; endTime?: string | null
  duration?: number | null; order: number; assignedTo?: string
  scope?: 'daily' | 'weekly' | null
}
export interface Vendor { id: string; name: string; category: string; contactPhone?: string | null }
export interface Incident {
  id: string; eventId?: string | null; description: string; severity: string
  reportedAt: string; resolvedAt?: string | null; resolution?: string | null
}
export interface WeddingEvent { id: string; name: string; type: string; date: string; isMain: boolean }

export const MULTI_DAY_TYPES = new Set(['HONEYMOON', 'MOVING', 'POST_WEDDING'])

const SEV_COLOR: Record<string, string> = {
  CRITICAL: 'border-l-4 border-red-400 bg-red-50/50',
  HIGH: 'border-l-4 border-amber-400 bg-amber-50/50',
  MEDIUM: 'border-l-4 border-sky-400 bg-sky-50/50',
  LOW: 'border-l-4 border-zinc-300',
}

// ─── Log Incident Modal ───────────────────────────────────────────────────────

export function LogIncidentModal({ weddingId, eventId, onClose, onDone }: Readonly<{
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
      if (!res.ok) throw new Error('Failed to log incident')
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

// ─── Program Item Form Modal ──────────────────────────────────────────────────

export function ProgramItemModal({ weddingId, eventId, item, baseDate, defaultScope, onClose }: Readonly<{
  weddingId: string; eventId: string; item?: ProgramItem; baseDate: string
  defaultScope?: 'daily' | 'weekly'; onClose: () => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: item?.title ?? '',
    description: item?.description ?? '',
    scope: (item?.scope ?? defaultScope ?? 'daily') as 'daily' | 'weekly',
    startTime: item?.startTime ? format(new Date(item.startTime), 'HH:mm') : '',
    endTime: item?.endTime ? format(new Date(item.endTime), 'HH:mm') : '',
    duration: item?.duration ? String(item.duration) : '',
    assignedTo: item?.assignedTo ?? '',
    date: item?.date ? item.date.split('T')[0] : baseDate.split('T')[0],
  })

  const isWeekly = form.scope === 'weekly'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    const startAt = (!isWeekly && form.startTime) ? new Date(`${form.date}T${form.startTime}`).toISOString() : null
    const endAt = (!isWeekly && form.endTime) ? new Date(`${form.date}T${form.endTime}`).toISOString() : null
    const payload = {
      title: form.title, description: form.description || null,
      startTime: startAt, endTime: endAt,
      duration: form.duration ? Number.parseInt(form.duration) : null,
      assignedTo: form.assignedTo || null,
      date: form.date || null,
      scope: form.scope,
      order: item?.order ?? 0,
    }
    try {
      if (item) {
        await fetch(`/api/weddings/${weddingId}/events/${eventId}/program/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast('Program item updated', 'success')
      } else {
        await fetch(`/api/weddings/${weddingId}/events/${eventId}/program`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast('Program item added', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['program', weddingId, eventId] })
      await qc.invalidateQueries({ queryKey: ['program', eventId] })
      onClose()
    } catch { toast('Failed to save', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title={item ? 'Edit program item' : 'Add program item'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="pi-title">Title *</Label>
          <Input id="pi-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Bride entrance" required /></div>

        {/* Scope toggle */}
        <div>
          <Label>Type</Label>
          <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl mt-1 w-fit">
            {(['daily', 'weekly'] as const).map(s => (
              <button key={s} type="button" onClick={() => setForm(f => ({ ...f, scope: s }))}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${form.scope === s ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {s === 'daily' ? '📅 Daily' : '📆 Weekly'}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {isWeekly ? 'A weekly activity spans the whole week — no specific time needed.' : 'A daily activity is tied to a specific day and optionally a time.'}
          </p>
        </div>

        <div><Label htmlFor="pi-date">{isWeekly ? 'Week of (any day in the week)' : 'Date'}</Label>
          <Input id="pi-date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>

        {!isWeekly && (
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="pi-start">Start time</Label>
              <Input id="pi-start" type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
            <div><Label htmlFor="pi-end">End time</Label>
              <Input id="pi-end" type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {!isWeekly && (
            <div><Label htmlFor="pi-dur">Duration (min)</Label>
              <Input id="pi-dur" type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="30" min="1" /></div>
          )}
          <div className={isWeekly ? 'col-span-2' : ''}><Label htmlFor="pi-assign">Assigned to</Label>
            <Input id="pi-assign" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="MC, Coordinator…" /></div>
        </div>

        <div><Label htmlFor="pi-desc">Description</Label>
          <Input id="pi-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional details" /></div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Program Row ──────────────────────────────────────────────────────────────

export function ProgramRow({ item, idx, onEdit, onDelete }: Readonly<{
  item: ProgramItem; idx: number; onEdit?: () => void; onDelete?: () => void
}>) {
  const timeLabel = item.startTime ? format(new Date(item.startTime), 'HH:mm') : item.time
  const endLabel = item.endTime ? format(new Date(item.endTime), 'HH:mm') : null
  return (
    <div className="flex gap-4 py-3 border-b border-zinc-100 last:border-0 group">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center text-xs font-bold text-violet-600">{idx + 1}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-[#14161C]">{item.title}</p>
          {timeLabel && (
            <span className="text-xs font-semibold text-violet-600 bg-violet-50 rounded-full px-2 py-0.5">
              {timeLabel}{endLabel ? ` – ${endLabel}` : ''}
            </span>
          )}
          {Boolean(item.duration) && !timeLabel && <span className="text-xs text-zinc-400">{item.duration}min</span>}
        </div>
        {item.description && <p className="text-xs text-zinc-400 mt-0.5">{item.description}</p>}
        {item.assignedTo && <p className="text-xs text-violet-500 mt-0.5">→ {item.assignedTo}</p>}
      </div>
      {(onEdit ?? onDelete) && (
        <div className="flex gap-1  flex-shrink-0">
          {onEdit && <button onClick={onEdit} className="p-1 text-zinc-300 hover:text-violet-500" aria-label="Edit"><Pencil size={13} /></button>}
          {onDelete && <button onClick={onDelete} className="p-1 text-zinc-300 hover:text-red-400" aria-label="Delete"><Trash2 size={13} /></button>}
        </div>
      )}
    </div>
  )
}

// ─── Day Program ──────────────────────────────────────────────────────────────

export function DayProgram({ items, onEdit, onDelete }: Readonly<{
  items: ProgramItem[]; onEdit?: (item: ProgramItem) => void; onDelete?: (item: ProgramItem) => void
}>) {
  if (items.length === 0) return (
    <EmptyState icon={<Calendar size={40} />} title="No program items" description="Add items to plan this day's schedule" />
  )
  return (
    <div className="space-y-0">
      {items.map((item, idx) => (
        <ProgramRow key={item.id} item={item} idx={idx}
          onEdit={onEdit ? () => onEdit(item) : undefined}
          onDelete={onDelete ? () => onDelete(item) : undefined} />
      ))}
    </div>
  )
}

// ─── Week Program ─────────────────────────────────────────────────────────────

export function WeekProgram({ items, eventDate, onEdit, onDelete }: Readonly<{
  items: ProgramItem[]; eventDate: string
  onEdit?: (item: ProgramItem) => void; onDelete?: (item: ProgramItem) => void
}>) {
  const grouped = useMemo(() => {
    const map = new Map<string, ProgramItem[]>()
    for (const item of items) {
      const key = item.date ? item.date.split('T')[0] : eventDate.split('T')[0]
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(item)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [items, eventDate])

  if (grouped.length === 0) return (
    <EmptyState icon={<Calendar size={40} />} title="No program yet" description="Add program items to get started" />
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
              <p className="text-xs text-zinc-400">Day {dayIdx + 1} · {dayItems.length} item{dayItems.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div className="pl-4 border-l-2 border-violet-100 ml-5">
            {dayItems.map((item, idx) => (
              <ProgramRow key={item.id} item={item} idx={idx}
                onEdit={onEdit ? () => onEdit(item) : undefined}
                onDelete={onDelete ? () => onDelete(item) : undefined} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Contacts Sub-tab ─────────────────────────────────────────────────────────

export function ContactsTab({ vendors }: Readonly<{ vendors: Vendor[] }>) {
  if (vendors.length === 0) return (
    <EmptyState icon={<Phone size={40} />} title="No confirmed vendors" description="Confirmed and booked vendors appear here" />
  )
  return (
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
}

// ─── Incidents Sub-tab ────────────────────────────────────────────────────────

export function IncidentsTab({ incidents }: Readonly<{ incidents: Incident[] }>) {
  if (incidents.length === 0) return (
    <EmptyState icon={<AlertTriangle size={40} />} title="No incidents" description="Log any issues that arise" />
  )
  return (
    <div className="space-y-3">
      {incidents.map(inc => (
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
}

// ─── Event Schedule Tab (shared between event detail + day-of) ────────────────

export function EventScheduleTab({ weddingId, event, vendors, incidents, onRefresh }: Readonly<{
  weddingId: string; event: WeddingEvent; vendors: Vendor[]; incidents: Incident[]; onRefresh: () => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [subTab, setSubTab] = useState<'program' | 'contacts' | 'incidents'>('program')
  const [showIncident, setShowIncident] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editingItem, setEditingItem] = useState<ProgramItem | null>(null)
  const [selectedDay, setSelectedDay] = useState(new Date(event.date))
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(event.date), { weekStartsOn: 1 }))
  // For week view: which day cell was clicked to add an item
  const [addForDay, setAddForDay] = useState<string | null>(null)
  const [addScope, setAddScope] = useState<'daily' | 'weekly'>('daily')

  const { data: programItems = [], isLoading: programLoading } = useQuery<ProgramItem[]>({
    queryKey: ['program', weddingId, event.id],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/events/${event.id}/program`)
      if (!res.ok) throw new Error('Failed to load program')
      return res.json() as Promise<ProgramItem[]>
    },
    staleTime: 30_000,
  })

  const evIncidents = useMemo(() => incidents.filter(i => i.eventId === event.id), [incidents, event.id])
  const activeIncidents = evIncidents.filter(i => !i.resolvedAt)

  // Split by scope
  const weeklyItems = useMemo(() => programItems.filter(i => i.scope === 'weekly'), [programItems])
  const dailyItems = useMemo(() => programItems.filter(i => i.scope !== 'weekly'), [programItems])

  // Items for the selected day in day view
  const dayItems = useMemo(() =>
    dailyItems
      .filter(item => {
        const itemDate = item.startTime ? new Date(item.startTime) : item.date ? new Date(item.date) : new Date(event.date)
        return isSameDay(itemDate, selectedDay)
      })
      .sort((a, b) => (a.startTime ?? a.date ?? '').localeCompare(b.startTime ?? b.date ?? '')),
  [dailyItems, selectedDay, event.date])

  // Weekly items whose date falls in the current week view
  const weeklyItemsForWeek = useMemo(() =>
    weeklyItems.filter(item => {
      if (!item.date) return true
      const d = new Date(item.date)
      return d >= weekStart && d <= addDays(weekStart, 6)
    }),
  [weeklyItems, weekStart])

  // Items grouped by day for week view
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const itemsForDay = (day: Date) =>
    dailyItems
      .filter(item => {
        const itemDate = item.startTime ? new Date(item.startTime) : item.date ? new Date(item.date) : new Date(event.date)
        return isSameDay(itemDate, day)
      })
      .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))

  const deleteItem = async (item: ProgramItem) => {
    try {
      await fetch(`/api/weddings/${weddingId}/events/${event.id}/program/${item.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['program', weddingId, event.id] })
      toast('Item deleted', 'success')
    } catch { toast('Failed to delete', 'error') }
  }

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['program', weddingId, event.id] })
    onRefresh()
  }

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['program', weddingId, event.id] })

  // The base date to pre-fill when opening the add modal
  const addBaseDate = addForDay ?? format(selectedDay, 'yyyy-MM-dd')

  return (
    <div className="space-y-6">
      {/* Sub-tab bar + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          {(['program', 'contacts', 'incidents'] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${subTab === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
              {t === 'contacts' ? 'Contacts' : t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'incidents' && activeIncidents.length > 0 && (
                <span className="ml-1.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full px-1.5 py-0.5">{activeIncidents.length}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {subTab === 'program' && (
            <>
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
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => { setAddForDay(null); setAddScope('weekly'); setShowAdd(true) }}>
                  <CalendarDays size={12} /> Weekly
                </Button>
                <Button size="sm" onClick={() => { setAddForDay(null); setAddScope('daily'); setShowAdd(true) }}>
                  <Plus size={13} /> Daily
                </Button>
              </div>
            </>
          )}
          <Button size="sm" variant="danger" onClick={() => setShowIncident(true)}>
            <AlertTriangle size={14} /> Log incident
          </Button>
        </div>
      </div>

      {/* ── Program sub-tab ── */}
      {subTab === 'program' && (
        programLoading ? <div className="flex justify-center py-12"><Spinner /></div> :

        /* ── WEEK VIEW ── */
        viewMode === 'week' ? (
          <div className="space-y-4">
            {/* Week navigator */}
            <div className="flex items-center justify-between">
              <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" aria-label="Previous week">
                <ChevronLeft size={16} />
              </button>
              <p className="text-sm font-semibold text-zinc-600">
                {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </p>
              <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" aria-label="Next week">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekly activities banner */}
            {weeklyItemsForWeek.length > 0 && (
              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-sky-600 uppercase tracking-widest flex items-center gap-1.5">
                    <CalendarDays size={11} /> Weekly activities ({weeklyItemsForWeek.length})
                  </p>
                  <button onClick={() => { setAddForDay(format(weekStart, 'yyyy-MM-dd')); setAddScope('weekly'); setShowAdd(true) }}
                    className="text-[10px] font-semibold text-sky-500 hover:text-sky-700 flex items-center gap-0.5">
                    <Plus size={10} /> Add weekly
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {weeklyItemsForWeek.map(item => (
                    <div key={item.id}
                      className="group flex items-center gap-1.5 bg-white rounded-lg px-2.5 py-1.5 border border-sky-100 shadow-sm cursor-pointer hover:border-sky-300 transition-all"
                      onClick={() => setEditingItem(item)}>
                      <p className="text-xs font-semibold text-[#14161C]">{item.title}</p>
                      {item.assignedTo && <span className="text-[10px] text-zinc-400">→ {item.assignedTo}</span>}
                      <button onClick={e => { e.stopPropagation(); void deleteItem(item) }}
                        className="p-0.5 rounded  text-zinc-300 hover:text-red-400 transition-all ml-1"
                        aria-label="Delete"><Trash2 size={10} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day columns */}
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map(day => {
                const colItems = itemsForDay(day)
                const isEventDay = isSameDay(day, new Date(event.date))
                const isToday = isSameDay(day, new Date())
                return (
                  <div key={day.toISOString()}
                    className={`rounded-xl border flex flex-col min-h-32 ${isEventDay ? 'border-amber-200 bg-amber-50/40' : isToday ? 'border-violet-200 bg-violet-50/30' : 'border-zinc-100 bg-zinc-50/50'}`}>
                    {/* Day header */}
                    <div className={`px-2 pt-2 pb-1 border-b ${isEventDay ? 'border-amber-100' : 'border-zinc-100'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${isEventDay ? 'text-amber-600' : isToday ? 'text-violet-600' : 'text-zinc-400'}`}>
                        {format(day, 'EEE')}
                      </p>
                      <p className={`text-base font-extrabold leading-tight ${isEventDay ? 'text-amber-700' : isToday ? 'text-violet-700' : 'text-[#14161C]'}`}>
                        {format(day, 'd')}
                      </p>
                      {isEventDay && <p className="text-[9px] text-amber-500 font-semibold">Event day</p>}
                    </div>

                    {/* Items */}
                    <div className="flex-1 p-1.5 space-y-1 overflow-hidden">
                      {colItems.map(item => {
                        const timeStr = item.startTime ? format(new Date(item.startTime), 'HH:mm') : null
                        return (
                          <div key={item.id}
                            className="group relative bg-white rounded-lg px-2 py-1.5 border border-zinc-100 shadow-sm cursor-pointer hover:border-violet-200 hover:shadow-md transition-all"
                            onClick={() => setEditingItem(item)}>
                            {timeStr && <p className="text-[9px] font-bold text-violet-500 mb-0.5">{timeStr}</p>}
                            <p className="text-[11px] font-semibold text-[#14161C] leading-tight line-clamp-2">{item.title}</p>
                            {item.assignedTo && <p className="text-[9px] text-zinc-400 mt-0.5 truncate">→ {item.assignedTo}</p>}
                            {/* Delete on hover */}
                            <button
                              onClick={e => { e.stopPropagation(); void deleteItem(item) }}
                              className="absolute top-1 right-1 p-0.5 rounded  text-zinc-300 hover:text-red-400 transition-all"
                              aria-label="Delete">
                              <Trash2 size={10} />
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    {/* Add button at bottom of column */}
                    <button
                      onClick={() => { setAddForDay(format(day, 'yyyy-MM-dd')); setShowAdd(true) }}
                      className="mx-1.5 mb-1.5 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-semibold text-zinc-400 hover:text-violet-600 hover:bg-violet-50 transition-colors border border-dashed border-zinc-200 hover:border-violet-200">
                      <Plus size={10} /> Add
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Weekly summary */}
            {programItems.length > 0 && (
              <div className="pt-2 border-t border-zinc-100">
                <p className="text-xs text-zinc-400 text-center">
                  {programItems.length} item{programItems.length === 1 ? '' : 's'} this week ·
                  click any item to edit · click a day column to add
                </p>
              </div>
            )}
          </div>
        ) :

        /* ── DAY VIEW ── */
        (
          <div className="space-y-3">
            {/* Day navigator */}
            <div className="flex items-center justify-between">
              <button onClick={() => setSelectedDay(d => addDays(d, -1))} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" aria-label="Previous day">
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <p className="text-sm font-bold text-[#14161C]">{format(selectedDay, 'EEEE, MMMM d')}</p>
                {isSameDay(selectedDay, new Date(event.date)) && <p className="text-xs text-amber-600 font-semibold">Event day</p>}
                {isSameDay(selectedDay, new Date()) && !isSameDay(selectedDay, new Date(event.date)) && <p className="text-xs text-violet-500 font-semibold">Today</p>}
              </div>
              <button onClick={() => setSelectedDay(d => addDays(d, 1))} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" aria-label="Next day">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekly activities for this week */}
            {(() => {
              const dayWeekStart = startOfWeek(selectedDay, { weekStartsOn: 1 })
              const weeklyForDay = weeklyItems.filter(item => {
                if (!item.date) return true
                const d = new Date(item.date)
                return d >= dayWeekStart && d <= addDays(dayWeekStart, 6)
              })
              if (weeklyForDay.length === 0) return null
              return (
                <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 space-y-1.5">
                  <p className="text-xs font-bold text-sky-600 uppercase tracking-widest flex items-center gap-1.5">
                    <CalendarDays size={11} /> This week ({weeklyForDay.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {weeklyForDay.map(item => (
                      <div key={item.id}
                        className="group flex items-center gap-1.5 bg-white rounded-lg px-2.5 py-1.5 border border-sky-100 shadow-sm cursor-pointer hover:border-sky-300 transition-all"
                        onClick={() => setEditingItem(item)}>
                        <p className="text-xs font-semibold text-[#14161C]">{item.title}</p>
                        {item.assignedTo && <span className="text-[10px] text-zinc-400">→ {item.assignedTo}</span>}
                        <button onClick={e => { e.stopPropagation(); void deleteItem(item) }}
                          className="p-0.5 rounded  text-zinc-300 hover:text-red-400 transition-all ml-1"
                          aria-label="Delete"><Trash2 size={10} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Timeline */}
            {dayItems.length === 0 ? (
              <EmptyState icon={<Calendar size={40} />} title="No items for this day"
                description="Add daily activities, timings and assignments"
                action={<Button size="sm" onClick={() => { setAddForDay(format(selectedDay, 'yyyy-MM-dd')); setShowAdd(true) }}><Plus size={13} /> Add item</Button>} />
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[2.75rem] top-0 bottom-0 w-px bg-zinc-100" />
                <div className="space-y-0">
                  {dayItems.map((item, idx) => {
                    const st = item.startTime ? format(new Date(item.startTime), 'HH:mm') : null
                    const et = item.endTime ? format(new Date(item.endTime), 'HH:mm') : null
                    return (
                      <div key={item.id} className="flex gap-3 py-2.5 group">
                        {/* Time column */}
                        <div className="w-10 flex-shrink-0 text-right pt-0.5">
                          {st ? (
                            <>
                              <p className="text-xs font-bold text-violet-600">{st}</p>
                              {et && <p className="text-[10px] text-zinc-400">{et}</p>}
                            </>
                          ) : (
                            <span className="inline-flex w-5 h-5 rounded-full bg-violet-100 items-center justify-center text-[10px] font-bold text-violet-600 ml-auto">{idx + 1}</span>
                          )}
                        </div>
                        {/* Dot on timeline */}
                        <div className="relative flex-shrink-0 flex items-start pt-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-violet-400 ring-2 ring-white z-10" />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 bg-white rounded-xl border border-zinc-100 px-3 py-2 shadow-sm group-hover:border-violet-100 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[#14161C]">{item.title}</p>
                              {item.description && <p className="text-xs text-zinc-400 mt-0.5">{item.description}</p>}
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {item.duration && !et && <span className="text-xs text-zinc-400">{item.duration} min</span>}
                                {item.assignedTo && <span className="text-xs text-violet-500">→ {item.assignedTo}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1  flex-shrink-0">
                              <button onClick={() => setEditingItem(item)} className="p-1 text-zinc-300 hover:text-violet-500" aria-label="Edit"><Pencil size={13} /></button>
                              <button onClick={() => void deleteItem(item)} className="p-1 text-zinc-300 hover:text-red-400" aria-label="Delete"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {subTab === 'contacts' && <ContactsTab vendors={vendors} />}
      {subTab === 'incidents' && <IncidentsTab incidents={evIncidents} />}

      {showAdd && (
        <ProgramItemModal
          weddingId={weddingId} eventId={event.id}
          baseDate={addBaseDate}
          defaultScope={addScope}
          onClose={() => { setShowAdd(false); setAddForDay(null); setAddScope('daily'); invalidate() }}
        />
      )}
      {editingItem && (
        <ProgramItemModal
          weddingId={weddingId} eventId={event.id}
          item={editingItem}
          baseDate={editingItem.date?.split('T')[0] ?? format(selectedDay, 'yyyy-MM-dd')}
          onClose={() => { setEditingItem(null); invalidate() }}
        />
      )}
      {showIncident && <LogIncidentModal weddingId={weddingId} eventId={event.id} onClose={() => setShowIncident(false)} onDone={refresh} />}
    </div>
  )
}
