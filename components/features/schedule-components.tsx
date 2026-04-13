'use client'
import { useState, useMemo, useRef } from 'react'
import { Calendar, Phone, AlertTriangle, CheckCircle2, CalendarDays, List, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, EmptyState, Modal, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
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

  // ── Time arithmetic helpers ──────────────────────────────────────────────
  const toMins = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }
  const fromMins = (mins: number) => {
    const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60)
    const m = ((mins % 1440) + 1440) % 1440 % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  // Derive the third field whenever two are set
  const handleTimeChange = (field: 'startTime' | 'endTime' | 'duration', value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      const hasStart = next.startTime !== ''
      const hasEnd = next.endTime !== ''
      const hasDur = next.duration !== '' && Number(next.duration) > 0

      if (field === 'startTime' && hasEnd) {
        // start + end → duration
        const d = toMins(next.endTime) - toMins(next.startTime)
        next.duration = d > 0 ? String(d) : prev.duration
      } else if (field === 'startTime' && hasDur) {
        // start + duration → end
        next.endTime = fromMins(toMins(next.startTime) + Number(next.duration))
      } else if (field === 'endTime' && hasStart) {
        // end + start → duration
        const d = toMins(next.endTime) - toMins(next.startTime)
        next.duration = d > 0 ? String(d) : prev.duration
      } else if (field === 'endTime' && hasDur) {
        // end + duration → start
        next.startTime = fromMins(toMins(next.endTime) - Number(next.duration))
      } else if (field === 'duration' && hasStart) {
        // duration + start → end
        next.endTime = fromMins(toMins(next.startTime) + Number(value))
      } else if (field === 'duration' && hasEnd) {
        // duration + end → start
        next.startTime = fromMins(toMins(next.endTime) - Number(value))
      }

      return next
    })
  }

  // Which field is auto-derived (disable it)
  const derived = (() => {
    const hasStart = form.startTime !== ''
    const hasEnd = form.endTime !== ''
    const hasDur = form.duration !== '' && Number(form.duration) > 0
    if (hasStart && hasEnd) return 'duration'
    if (hasStart && hasDur) return 'endTime'
    if (hasEnd && hasDur) return 'startTime'
    return null
  })()

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
          <div className="flex gap-1 bg-[#1F4D3A]/6 p-1 rounded-xl mt-1 w-fit">
            {(['daily', 'weekly'] as const).map(s => (
              <button key={s} type="button" onClick={() => setForm(f => ({ ...f, scope: s }))}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${form.scope === s ? 'bg-white text-[#14161C] shadow-sm' : 'text-[#14161C]/55 hover:text-[#14161C]/70'}`}>
                {s === 'daily' ? '📅 Daily' : '📆 Weekly'}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#14161C]/40 mt-1">
            {isWeekly ? 'A weekly activity spans the whole week — no specific time needed.' : 'A daily activity is tied to a specific day and optionally a time.'}
          </p>
        </div>

        <div><Label htmlFor="pi-date">{isWeekly ? 'Week of (any day in the week)' : 'Date'}</Label>
          <Input id="pi-date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>

        {!isWeekly && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="pi-start">
                  Start time {derived === 'startTime' && <span className="text-[10px] text-violet-400 font-normal">(auto)</span>}
                </Label>
                <Input id="pi-start" type="time" value={form.startTime}
                  onChange={e => handleTimeChange('startTime', e.target.value)}
                  className={derived === 'startTime' ? 'bg-[#1F4D3A]/6 text-[#1F4D3A]' : ''} />
              </div>
              <div>
                <Label htmlFor="pi-end">
                  End time {derived === 'endTime' && <span className="text-[10px] text-violet-400 font-normal">(auto)</span>}
                </Label>
                <Input id="pi-end" type="time" value={form.endTime}
                  onChange={e => handleTimeChange('endTime', e.target.value)}
                  className={derived === 'endTime' ? 'bg-[#1F4D3A]/6 text-[#1F4D3A]' : ''} />
              </div>
              <div>
                <Label htmlFor="pi-dur">
                  Duration (min) {derived === 'duration' && <span className="text-[10px] text-violet-400 font-normal">(auto)</span>}
                </Label>
                <Input id="pi-dur" type="number" value={form.duration}
                  onChange={e => handleTimeChange('duration', e.target.value)}
                  placeholder="30" min="1"
                  className={derived === 'duration' ? 'bg-[#1F4D3A]/6 text-[#1F4D3A]' : ''} />
              </div>
            </div>
            {(form.startTime || form.endTime || form.duration) && (
              <p className="text-xs text-[#14161C]/40 -mt-2">
                Fill any two — the third is calculated automatically.
              </p>
            )}
          </>
        )}

        <div><Label htmlFor="pi-assign">Assigned to</Label>
          <Input id="pi-assign" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="MC, Coordinator…" /></div>

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
    <div className="flex gap-4 py-3 border-b border-[#1F4D3A]/8 last:border-0 group">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1F4D3A]/6 flex items-center justify-center text-xs font-bold text-[#1F4D3A]">{idx + 1}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-[#14161C]">{item.title}</p>
          {timeLabel && (
            <span className="text-xs font-semibold text-[#1F4D3A] bg-[#1F4D3A]/6 rounded-full px-2 py-0.5">
              {timeLabel}{endLabel ? ` – ${endLabel}` : ''}
            </span>
          )}
          {Boolean(item.duration) && !timeLabel && <span className="text-xs text-[#14161C]/40">{item.duration}min</span>}
        </div>
        {item.description && <p className="text-xs text-[#14161C]/40 mt-0.5">{item.description}</p>}
        {item.assignedTo && <p className="text-xs text-[#1F4D3A]/70 mt-0.5">→ {item.assignedTo}</p>}
      </div>
      {(onEdit ?? onDelete) && (
        <div className="flex gap-1  flex-shrink-0">
          {onEdit && <button onClick={onEdit} className="p-1 text-[#14161C]/25 hover:text-[#1F4D3A]/70" aria-label="Edit"><Pencil size={13} /></button>}
          {onDelete && <button onClick={onDelete} className="p-1 text-[#14161C]/25 hover:text-red-400" aria-label="Delete"><Trash2 size={13} /></button>}
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
            <div className="w-10 h-10 rounded-xl bg-[#1F4D3A]/6 flex flex-col items-center justify-center flex-shrink-0">
              <p className="text-sm font-extrabold text-[#1F4D3A] leading-none">{format(parseISO(dateStr), 'd')}</p>
              <p className="text-[9px] font-semibold text-[#14161C]/40 uppercase">{format(parseISO(dateStr), 'MMM')}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-[#14161C]">{format(parseISO(dateStr), 'EEEE, d MMMM')}</p>
              <p className="text-xs text-[#14161C]/40">Day {dayIdx + 1} · {dayItems.length} item{dayItems.length === 1 ? '' : 's'}</p>
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

interface EventContact {
  id: string; name: string; role?: string | null; phone?: string | null
  email?: string | null; notes?: string | null
}

function ContactModal({ weddingId, eventId, contact, onClose, onDone }: Readonly<{
  weddingId: string; eventId: string; contact?: EventContact; onClose: () => void; onDone: () => void
}>) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: contact?.name ?? '',
    role: contact?.role ?? '',
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
    notes: contact?.notes ?? '',
  })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const url = contact
        ? `/api/weddings/${weddingId}/events/${eventId}/contacts/${contact.id}`
        : `/api/weddings/${weddingId}/events/${eventId}/contacts`
      const res = await fetch(url, {
        method: contact ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to save contact')
      toast(contact ? 'Contact updated' : 'Contact added', 'success')
      onDone(); onClose()
    } catch { toast('Failed to save contact', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={contact ? 'Edit contact' : 'Add contact'} onClose={onClose}>
      <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
        <div><Label>Name *</Label><Input value={form.name} onChange={set('name')} required placeholder="e.g. John Kamau" /></div>
        <div><Label>Role / Title</Label><Input value={form.role} onChange={set('role')} placeholder="e.g. MC, Caterer, Coordinator" /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={set('phone')} placeholder="+254 7XX XXX XXX" /></div>
        <div><Label>Email</Label><Input value={form.email} onChange={set('email')} type="email" placeholder="email@example.com" /></div>
        <div><Label>Notes</Label><Input value={form.notes} onChange={set('notes')} placeholder="Any extra info" /></div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : contact ? 'Save changes' : 'Add contact'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function ContactsTab({ weddingId, eventId, vendors, showAdd, onCloseAdd }: Readonly<{
  weddingId: string; eventId: string; vendors: Vendor[]
  showAdd?: boolean; onCloseAdd?: () => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [subTab, setSubTab] = useState<'key-people' | 'vendors-on-duty'>('vendors-on-duty')
  const [editing, setEditing] = useState<EventContact | null>(null)
  const [deleting, setDeleting] = useState<EventContact | null>(null)

  const { data: contacts = [], isLoading } = useQuery<EventContact[]>({
    queryKey: ['event-contacts', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/contacts`)
      if (!res.ok) throw new Error('Failed')
      return res.json() as Promise<EventContact[]>
    },
    staleTime: 30_000,
  })

  const refresh = () => void qc.invalidateQueries({ queryKey: ['event-contacts', eventId] })

  const handleDelete = async (c: EventContact) => {
    try {
      await fetch(`/api/weddings/${weddingId}/events/${eventId}/contacts/${c.id}`, { method: 'DELETE' })
      toast('Contact deleted', 'success'); refresh()
    } catch { toast('Failed to delete', 'error') }
    setDeleting(null)
  }

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-[#1F4D3A]/6 rounded-2xl p-1 w-fit">
        {([
          { key: 'vendors-on-duty', label: 'Vendors on Duty', count: vendors.length },
          { key: 'key-people',      label: 'Key People',      count: contacts.length },
        ] as const).map(t => (
          <button key={t.key} type="button" onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs transition-all ${subTab === t.key ? 'bg-white text-[#14161C] font-bold shadow-sm' : 'text-[#14161C]/40 font-medium hover:text-[#14161C]/60'}`}>
            {t.label}
            {t.count > 0 && <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${subTab === t.key ? 'bg-[#1F4D3A]/6 text-[#14161C]/55' : 'bg-[#1F4D3A]/10 text-[#14161C]/40'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Vendors on Duty */}
      {subTab === 'vendors-on-duty' && (
        <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
          {vendors.length === 0 ? (
            <div className="py-12 text-center">
              <Phone size={32} className="mx-auto text-[#14161C]/15 mb-3" />
              <p className="text-sm font-semibold text-[#14161C]/40">No vendors assigned to this event</p>
              <p className="text-xs text-[#14161C]/25 mt-1">Assign vendors from the Vendors tab</p>
            </div>
          ) : vendors.map(v => (
            <div key={v.id} className="flex items-center gap-4 py-4 px-6 border-b border-[#1F4D3A]/8 last:border-0">
              <div className="w-8 h-8 rounded-full bg-[#1F4D3A]/8 flex items-center justify-center text-xs font-bold text-[#1F4D3A] flex-shrink-0">
                {v.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#14161C]">{v.name}</p>
                <p className="text-xs text-[#14161C]/40">{v.category.replaceAll('_', ' ')}</p>
              </div>
              {v.contactPhone && (
                <a href={`tel:${v.contactPhone}`} className="flex items-center gap-1.5 text-sm font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors flex-shrink-0">
                  <Phone size={13} /> {v.contactPhone}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Key People */}
      {subTab === 'key-people' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
            {contacts.length === 0 ? (
              <div className="py-12 text-center">
                <Phone size={32} className="mx-auto text-[#14161C]/15 mb-3" />
                <p className="text-sm font-semibold text-[#14161C]/40">No key people added yet</p>
                <p className="text-xs text-[#14161C]/25 mt-1">Add the MC, pastor, family coordinator or anyone else to call on the day</p>
              </div>
            ) : contacts.map(c => (
              <div key={c.id} className="flex items-center gap-4 py-4 px-6 border-b border-[#1F4D3A]/8 last:border-0">
                <div className="w-8 h-8 rounded-full bg-[#1F4D3A]/6 flex items-center justify-center text-xs font-bold text-[#14161C]/55 flex-shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#14161C]">{c.name}</p>
                  {c.role && <p className="text-xs text-[#14161C]/40">{c.role}</p>}
                  {c.notes && <p className="text-xs text-[#14161C]/40 italic mt-0.5">{c.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-sm font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors">
                      <Phone size={13} /> {c.phone}
                    </a>
                  )}
                  <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40 hover:text-[#14161C]/60 transition-colors" aria-label="Edit"><Pencil size={13} /></button>
                  <button onClick={() => setDeleting(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#14161C]/40 hover:text-red-500 transition-colors" aria-label="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add contact modal — only for Key People */}
      {showAdd && (
        <ContactModal
          weddingId={weddingId} eventId={eventId}
          onClose={() => { onCloseAdd?.(); setSubTab('key-people') }}
          onDone={refresh}
        />
      )}
      {editing && (
        <ContactModal
          weddingId={weddingId} eventId={eventId}
          contact={editing}
          onClose={() => setEditing(null)}
          onDone={refresh}
        />
      )}
      {deleting && (
        <Modal title="Delete contact?" onClose={() => setDeleting(null)}>
          <p className="text-sm text-[#14161C]/60 mb-6">"{deleting.name}" will be permanently removed.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => void handleDelete(deleting)}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Incidents Sub-tab ────────────────────────────────────────────────────────

interface IncidentNote { id: string; content: string; createdBy?: string | null; createdAt: string }

function IncidentDetailModal({ incident: initialIncident, weddingId, onClose, onRefresh, onDeleted }: Readonly<{
  incident: Incident; weddingId: string
  onClose: () => void; onRefresh: () => void; onDeleted: () => void
}>) {
  const { toast } = useToast()
  // Own a local copy so UI updates immediately without waiting for parent re-fetch
  const [inc, setInc] = useState(initialIncident)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ description: inc.description, severity: inc.severity, resolution: inc.resolution ?? '' })
  const [saving, setSaving] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const { data: notes = [], refetch: refetchNotes } = useQuery<IncidentNote[]>({
    queryKey: ['incident-notes', inc.id],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/incidents/${inc.id}/notes`)
      if (!res.ok) throw new Error('Failed')
      return res.json() as Promise<IncidentNote[]>
    },
    staleTime: 0,
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/incidents/${inc.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed')
      // Update local state immediately
      setInc(prev => ({ ...prev, description: form.description, severity: form.severity, resolution: form.resolution || null }))
      setEditing(false)
      toast('Incident updated', 'success')
      onRefresh()
    } catch { toast('Failed to update', 'error') }
    finally { setSaving(false) }
  }

  const handleResolve = async () => {
    try {
      const resolvedAt = new Date().toISOString()
      await fetch(`/api/weddings/${weddingId}/incidents/${inc.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedAt }),
      })
      // Update local state — modal stays open showing resolved status
      setInc(prev => ({ ...prev, resolvedAt }))
      toast('Marked as resolved', 'success')
      onRefresh()
    } catch { toast('Failed', 'error') }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this incident?')) return
    try {
      await fetch(`/api/weddings/${weddingId}/incidents/${inc.id}`, { method: 'DELETE' })
      toast('Incident deleted', 'success')
      onDeleted()
      onClose()
    } catch { toast('Failed to delete', 'error') }
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    setAddingNote(true)
    try {
      await fetch(`/api/weddings/${weddingId}/incidents/${inc.id}/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteText.trim() }),
      })
      setNoteText('')
      await refetchNotes()
      toast('Note added', 'success')
    } catch { toast('Failed to add note', 'error') }
    finally { setAddingNote(false) }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await fetch(`/api/weddings/${weddingId}/incidents/${inc.id}/notes/${noteId}`, { method: 'DELETE' })
      await refetchNotes()
    } catch { toast('Failed to delete note', 'error') }
  }

  const sevColor: Record<string, string> = { LOW: 'text-[#14161C]/55', MEDIUM: 'text-amber-600', HIGH: 'text-orange-600', CRITICAL: 'text-red-600' }

  return (
    <Modal title="Incident" onClose={onClose}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold uppercase ${sevColor[inc.severity] ?? 'text-[#14161C]/55'}`}>{inc.severity}</span>
            <span className="text-xs text-[#14161C]/40">{format(new Date(inc.reportedAt), 'MMM d · h:mm a')}</span>
            {inc.resolvedAt && <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1"><CheckCircle2 size={11} /> Resolved</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setEditing(v => !v)} className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40 hover:text-[#14161C]/60 transition-colors" aria-label="Edit"><Pencil size={13} /></button>
            <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-[#14161C]/40 hover:text-red-500 transition-colors" aria-label="Delete"><Trash2 size={13} /></button>
          </div>
        </div>

        {/* Edit form or read view */}
        {editing ? (
          <div className="space-y-3 bg-[#F7F5F2] rounded-xl p-4">
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                {['LOW','MEDIUM','HIGH','CRITICAL'].map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label>Resolution notes</Label>
              <Textarea value={form.resolution} onChange={e => setForm(f => ({ ...f, resolution: e.target.value }))} rows={2} placeholder="How was this resolved?" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[#14161C]/70">{inc.description}</p>
            {inc.resolution && <p className="text-xs text-[#14161C]/55 mt-1.5 italic border-l-2 border-[#1F4D3A]/12 pl-2">{inc.resolution}</p>}
          </div>
        )}

        {!inc.resolvedAt && !editing && (
          <button onClick={handleResolve} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors">
            <CheckCircle2 size={13} /> Mark as resolved
          </button>
        )}

        <hr className="border-[#1F4D3A]/8" />

        {/* Activity log */}
        <div>
          <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-3">Activity log</p>
          {notes.length === 0 ? (
            <p className="text-xs text-[#14161C]/40 py-2">No notes yet — log updates, actions taken, or follow-ups.</p>
          ) : (
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto scrollbar-thin">
              {notes.map(n => (
                <div key={n.id} className="flex items-start gap-2 group">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#14161C]/70 leading-relaxed">{n.content}</p>
                    <p className="text-[10px] text-[#14161C]/40 mt-0.5">{format(new Date(n.createdAt), 'MMM d · h:mm a')}</p>
                  </div>
                  <button onClick={() => void handleDeleteNote(n.id)}
                    className="p-1 rounded text-[#14161C]/25 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    aria-label="Delete note"><Trash2 size={11} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <textarea ref={noteRef} value={noteText} onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleAddNote() } }}
              placeholder="Log an update or action taken… (Enter to submit)"
              rows={2}
              className="flex-1 text-sm rounded-xl border border-[#1F4D3A]/12 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#1F4D3A]/40 focus:border-transparent" />
            <Button size="sm" variant="lavender" onClick={handleAddNote} disabled={addingNote || !noteText.trim()}>
              {addingNote ? '…' : 'Add'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function IncidentsTab({ incidents, weddingId, onRefresh }: Readonly<{
  incidents: Incident[]; weddingId: string; onRefresh: () => void
}>) {
  const [selected, setSelected] = useState<Incident | null>(null)

  if (incidents.length === 0) return (
    <EmptyState icon={<AlertTriangle size={40} />} title="No incidents" description="Log any issues that arise" />
  )

  return (
    <>
      <div className="space-y-2">
        {incidents.map(inc => (
          <button key={inc.id} onClick={() => setSelected(inc)}
            className={`w-full text-left rounded-xl p-4 transition-all hover:opacity-90 active:scale-[0.99] ${SEV_COLOR[inc.severity] ?? 'border-l-4 border-zinc-300'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#14161C]/55 uppercase">{inc.severity}</span>
                <span className="text-xs text-[#14161C]/40">{format(new Date(inc.reportedAt), 'h:mm a')}</span>
                {inc.resolvedAt && <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1"><CheckCircle2 size={11} /> Resolved</span>}
              </div>
              <Pencil size={12} className="text-[#14161C]/25 flex-shrink-0" />
            </div>
            <p className="text-sm text-[#14161C]/70 mt-1">{inc.description}</p>
            {inc.resolution && <p className="text-xs text-[#14161C]/55 mt-1 italic">{inc.resolution}</p>}
          </button>
        ))}
      </div>

      {selected && (
        <IncidentDetailModal
          incident={selected}
          weddingId={weddingId}
          onClose={() => setSelected(null)}
          onRefresh={onRefresh}
          onDeleted={() => { onRefresh(); setSelected(null) }}
        />
      )}
    </>
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
  const [showAddContact, setShowAddContact] = useState(false)
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
        <div className="flex gap-1 bg-[#1F4D3A]/6 p-1 rounded-xl w-fit">
          {(['program', 'contacts', 'incidents'] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${subTab === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-[#14161C]/55 hover:text-[#14161C]/70'}`}>
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
              <div className="flex gap-1 bg-[#1F4D3A]/6 p-1 rounded-xl">
                <button onClick={() => setViewMode('day')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'day' ? 'bg-white text-[#14161C] shadow-sm' : 'text-[#14161C]/55 hover:text-[#14161C]/70'}`}>
                  <List size={12} /> Day
                </button>
                <button onClick={() => setViewMode('week')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'week' ? 'bg-white text-[#14161C] shadow-sm' : 'text-[#14161C]/55 hover:text-[#14161C]/70'}`}>
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
          {subTab === 'contacts'
            ? <Button size="sm" onClick={() => setShowAddContact(true)}><Plus size={13} /> Add contact</Button>
            : <Button size="sm" variant="danger" onClick={() => setShowIncident(true)}><AlertTriangle size={14} /> Log incident</Button>
          }
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
              <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40 hover:text-[#14161C]/60" aria-label="Previous week">
                <ChevronLeft size={16} />
              </button>
              <p className="text-sm font-semibold text-[#14161C]/60">
                {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </p>
              <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40 hover:text-[#14161C]/60" aria-label="Next week">
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
                      {item.assignedTo && <span className="text-[10px] text-[#14161C]/40">→ {item.assignedTo}</span>}
                      <button onClick={e => { e.stopPropagation(); void deleteItem(item) }}
                        className="p-0.5 rounded  text-[#14161C]/25 hover:text-red-400 transition-all ml-1"
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
                    className={`rounded-xl border flex flex-col min-h-32 ${isEventDay ? 'border-amber-200 bg-amber-50/40' : isToday ? 'border-violet-200 bg-[#1F4D3A]/6/30' : 'border-[#1F4D3A]/8 bg-[#F7F5F2]/50'}`}>
                    {/* Day header */}
                    <div className={`px-2 pt-2 pb-1 border-b ${isEventDay ? 'border-amber-100' : 'border-[#1F4D3A]/8'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${isEventDay ? 'text-amber-600' : isToday ? 'text-[#1F4D3A]' : 'text-[#14161C]/40'}`}>
                        {format(day, 'EEE')}
                      </p>
                      <p className={`text-base font-extrabold leading-tight ${isEventDay ? 'text-amber-700' : isToday ? 'text-[#1F4D3A]' : 'text-[#14161C]'}`}>
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
                            className="group relative bg-white rounded-lg px-2 py-1.5 border border-[#1F4D3A]/8 shadow-sm cursor-pointer hover:border-violet-200 hover:shadow-md transition-all"
                            onClick={() => setEditingItem(item)}>
                            {timeStr && <p className="text-[9px] font-bold text-[#1F4D3A]/70 mb-0.5">{timeStr}</p>}
                            <p className="text-[11px] font-semibold text-[#14161C] leading-tight line-clamp-2">{item.title}</p>
                            {item.assignedTo && <p className="text-[9px] text-[#14161C]/40 mt-0.5 truncate">→ {item.assignedTo}</p>}
                            {/* Delete on hover */}
                            <button
                              onClick={e => { e.stopPropagation(); void deleteItem(item) }}
                              className="absolute top-1 right-1 p-0.5 rounded  text-[#14161C]/25 hover:text-red-400 transition-all"
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
                      className="mx-1.5 mb-1.5 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-semibold text-[#14161C]/40 hover:text-[#1F4D3A] hover:bg-[#1F4D3A]/6 transition-colors border border-dashed border-[#1F4D3A]/12 hover:border-violet-200">
                      <Plus size={10} /> Add
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Weekly summary */}
            {programItems.length > 0 && (
              <div className="pt-2 border-t border-[#1F4D3A]/8">
                <p className="text-xs text-[#14161C]/40 text-center">
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
              <button onClick={() => setSelectedDay(d => addDays(d, -1))} className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40 hover:text-[#14161C]/60" aria-label="Previous day">
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <p className="text-sm font-bold text-[#14161C]">{format(selectedDay, 'EEEE, MMMM d')}</p>
                {isSameDay(selectedDay, new Date(event.date)) && <p className="text-xs text-amber-600 font-semibold">Event day</p>}
                {isSameDay(selectedDay, new Date()) && !isSameDay(selectedDay, new Date(event.date)) && <p className="text-xs text-[#1F4D3A]/70 font-semibold">Today</p>}
              </div>
              <button onClick={() => setSelectedDay(d => addDays(d, 1))} className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40 hover:text-[#14161C]/60" aria-label="Next day">
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
                        {item.assignedTo && <span className="text-[10px] text-[#14161C]/40">→ {item.assignedTo}</span>}
                        <button onClick={e => { e.stopPropagation(); void deleteItem(item) }}
                          className="p-0.5 rounded  text-[#14161C]/25 hover:text-red-400 transition-all ml-1"
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
                <div className="absolute left-[2.75rem] top-0 bottom-0 w-px bg-[#1F4D3A]/6" />
                <div className="space-y-0">
                  {dayItems.map((item, idx) => {
                    const parseTime = (v: unknown) => {
                      if (!v) return null
                      const d = new Date(v as string)
                      return isNaN(d.getTime()) ? null : format(d, 'HH:mm')
                    }
                    const st = parseTime(item.startTime)
                    const et = parseTime(item.endTime)
                    return (
                      <div key={item.id} className="flex gap-3 py-2.5 group">
                        {/* Time column */}
                        <div className="w-10 flex-shrink-0 text-right pt-0.5">
                          {st ? (
                            <>
                              <p className="text-xs font-bold text-[#1F4D3A]">{st}</p>
                              {et && <p className="text-[10px] text-[#14161C]/40">{et}</p>}
                            </>
                          ) : (
                            <span className="inline-flex w-5 h-5 rounded-full bg-[#1F4D3A]/10 items-center justify-center text-[10px] font-bold text-[#1F4D3A] ml-auto">{idx + 1}</span>
                          )}
                        </div>
                        {/* Dot on timeline */}
                        <div className="relative flex-shrink-0 flex items-start pt-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#1F4D3A] ring-2 ring-white z-10" />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 bg-white rounded-xl border border-[#1F4D3A]/8 px-3 py-2 shadow-sm group-hover:border-violet-100 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[#14161C]">{item.title}</p>
                              {item.description && <p className="text-xs text-[#14161C]/40 mt-0.5">{item.description}</p>}
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {item.duration && !et && <span className="text-xs text-[#14161C]/40">{item.duration} min</span>}
                                {item.assignedTo && <span className="text-xs text-[#1F4D3A]/70">→ {item.assignedTo}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1  flex-shrink-0">
                              <button onClick={() => setEditingItem(item)} className="p-1 text-[#14161C]/25 hover:text-[#1F4D3A]/70" aria-label="Edit"><Pencil size={13} /></button>
                              <button onClick={() => void deleteItem(item)} className="p-1 text-[#14161C]/25 hover:text-red-400" aria-label="Delete"><Trash2 size={13} /></button>
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

      {subTab === 'contacts' && <ContactsTab weddingId={weddingId} eventId={event.id} vendors={vendors} showAdd={showAddContact} onCloseAdd={() => setShowAddContact(false)} />}
      {subTab === 'incidents' && <IncidentsTab incidents={evIncidents} weddingId={weddingId} onRefresh={onRefresh} />}

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
