'use client'
import { useState, useMemo } from 'react'
import { Button, Input, Select, Label, Badge, Modal, Spinner, EmptyState, ProgressBar } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { MapPin, Clock, Pencil, Trash2, CheckCircle2, XCircle, LayoutTemplate, Plus, Sparkles } from 'lucide-react'

export interface Appointment {
  id: string; title: string; location?: string | null; notes?: string | null
  startAt: string; endAt?: string | null; status: string; eventId?: string | null
  vendorId?: string | null; vendor?: { id: string; name: string } | null
}
export interface Vendor { id: string; name: string; category: string }

const STATUS_BADGE: Record<string, 'confirmed' | 'pending' | 'declined'> = {
  SCHEDULED: 'pending', COMPLETED: 'confirmed', CANCELLED: 'declined',
}

export function AddAppointmentModal({ weddingId, userId, vendors, eventId, onClose, onDone }: Readonly<{
  weddingId: string; userId: string; vendors: Vendor[]
  eventId?: string; onClose: () => void; onDone: () => void
}>) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', vendorId: '', location: '', date: '', startTime: '09:00', endTime: '', notes: '' })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.title || !form.date) return
    setSaving(true)
    try {
      const startAt = new Date(`${form.date}T${form.startTime}`).toISOString()
      const endAt = form.endTime ? new Date(`${form.date}T${form.endTime}`).toISOString() : null
      const res = await fetch(`/api/weddings/${weddingId}/appointments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, vendorId: form.vendorId || null, location: form.location || null, startAt, endAt, notes: form.notes || null, createdBy: userId, eventId: eventId ?? null }),
      })
      if (!res.ok) throw new Error('Failed to book appointment')
      toast('Appointment booked', 'success'); onDone(); onClose()
    } catch { toast('Failed to book appointment', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Book appointment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="appt-title">Title *</Label>
          <Input id="appt-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Venue visit" required /></div>
        <div><Label htmlFor="appt-vendor">Vendor (optional)</Label>
          <Select id="appt-vendor" value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}>
            <option value="">No vendor</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1"><Label htmlFor="appt-date">Date *</Label>
            <Input id="appt-date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required /></div>
          <div><Label htmlFor="appt-start">Start</Label>
            <Input id="appt-start" type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
          <div><Label htmlFor="appt-end">End</Label>
            <Input id="appt-end" type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
        </div>
        <div><Label htmlFor="appt-loc">Location</Label>
          <Input id="appt-loc" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Address or venue name" /></div>
        <div><Label htmlFor="appt-notes">Notes</Label>
          <Input id="appt-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="What to bring, questions to ask…" /></div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Booking…' : 'Book appointment'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function EditAppointmentModal({ weddingId, appointment, vendors, onClose, onDone }: Readonly<{
  weddingId: string; appointment: Appointment; vendors: Vendor[]; onClose: () => void; onDone: () => void
}>) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const startDate = new Date(appointment.startAt)
  const endDate = appointment.endAt ? new Date(appointment.endAt) : null
  const [form, setForm] = useState({
    title: appointment.title, vendorId: appointment.vendorId ?? '',
    location: appointment.location ?? '', date: format(startDate, 'yyyy-MM-dd'),
    startTime: format(startDate, 'HH:mm'), endTime: endDate ? format(endDate, 'HH:mm') : '',
    notes: appointment.notes ?? '', status: appointment.status,
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const startAt = new Date(`${form.date}T${form.startTime}`).toISOString()
      const endAt = form.endTime ? new Date(`${form.date}T${form.endTime}`).toISOString() : null
      const res = await fetch(`/api/weddings/${weddingId}/appointments/${appointment.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, vendorId: form.vendorId || null, location: form.location || null, startAt, endAt, notes: form.notes || null, status: form.status }),
      })
      if (!res.ok) throw new Error('Failed to update appointment')
      toast('Appointment updated', 'success'); onDone(); onClose()
    } catch { toast('Failed to update appointment', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Edit appointment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="edit-title">Title *</Label>
          <Input id="edit-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
        <div><Label htmlFor="edit-vendor">Vendor</Label>
          <Select id="edit-vendor" value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}>
            <option value="">No vendor</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1"><Label htmlFor="edit-date">Date *</Label>
            <Input id="edit-date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required /></div>
          <div><Label htmlFor="edit-start">Start</Label>
            <Input id="edit-start" type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
          <div><Label htmlFor="edit-end">End</Label>
            <Input id="edit-end" type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
        </div>
        <div><Label htmlFor="edit-loc">Location</Label>
          <Input id="edit-loc" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
        <div><Label htmlFor="edit-status">Status</Label>
          <Select id="edit-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select></div>
        <div><Label htmlFor="edit-notes">Notes</Label>
          <Input id="edit-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function AppointmentRow({ a, weddingId, vendors, onRefresh }: Readonly<{
  a: Appointment; weddingId: string; vendors: Vendor[]; onRefresh: () => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const isCompleted = a.status === 'COMPLETED'
  const isCancelled = a.status === 'CANCELLED'
  const isDone = isCompleted || isCancelled

  const handleDelete = async () => {
    if (!confirm('Delete this appointment?')) return
    try {
      await fetch(`/api/weddings/${weddingId}/appointments/${a.id}`, { method: 'DELETE' })
      toast('Appointment deleted', 'success'); onRefresh()
    } catch { toast('Failed to delete appointment', 'error') }
  }

  const toggleComplete = async () => {
    if (updating) return
    setUpdating(true)
    const newStatus = isCompleted ? 'SCHEDULED' : 'COMPLETED'
    try {
      await fetch(`/api/weddings/${weddingId}/appointments/${a.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      await qc.invalidateQueries({ queryKey: ['appointments', weddingId] })
      onRefresh()
    } catch { toast('Failed to update', 'error') } finally { setUpdating(false) }
  }

  const cancelAppt = async () => {
    if (updating) return
    setUpdating(true)
    const newStatus = isCancelled ? 'SCHEDULED' : 'CANCELLED'
    try {
      await fetch(`/api/weddings/${weddingId}/appointments/${a.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      await qc.invalidateQueries({ queryKey: ['appointments', weddingId] })
      onRefresh()
    } catch { toast('Failed to update', 'error') } finally { setUpdating(false) }
  }

  return (
    <>
      <div className={`flex items-start gap-3 py-3.5 border-b border-[#1F4D3A]/8 last:border-0 ${isDone ? 'opacity-60' : ''}`}>
        {/* Checkbox */}
        <button onClick={toggleComplete} disabled={updating || isCancelled}
          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            updating ? 'border-violet-300 bg-[#1F4D3A]/10 animate-pulse cursor-wait' :
            isCompleted ? 'bg-[#1F4D3A]/60 border-violet-500' :
            isCancelled ? 'bg-[#1F4D3A]/10 border-zinc-300 cursor-not-allowed' :
            'border-zinc-300 hover:border-[#1F4D3A]/40'
          }`}
          aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}>
          {updating ? (
            <svg className="w-3 h-3 animate-spin text-violet-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : isCompleted ? (
            <svg viewBox="0 0 12 10" className="w-3 h-3">
              <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : isCancelled ? (
            <span className="text-[8px] font-bold text-[#14161C]/40">✕</span>
          ) : null}
        </button>

        {/* Date badge */}
        <div className="w-9 h-9 rounded-xl bg-[#1F4D3A]/8 flex flex-col items-center justify-center flex-shrink-0">
          <p className="text-sm font-extrabold text-[#1F4D3A] leading-none">{format(new Date(a.startAt), 'd')}</p>
          <p className="text-[9px] font-semibold text-[#14161C]/40 uppercase">{format(new Date(a.startAt), 'MMM')}</p>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-semibold ${isDone ? 'line-through text-[#14161C]/40' : 'text-[#14161C]'}`}>{a.title}</p>
            <Badge variant={STATUS_BADGE[a.status] ?? 'default'}>{a.status}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-[#14161C]/40 flex items-center gap-1">
              <Clock size={10} /> {format(new Date(a.startAt), 'h:mm a')}
              {a.endAt ? ` – ${format(new Date(a.endAt), 'h:mm a')}` : ''}
            </span>
            {a.location && <span className="text-xs text-[#14161C]/40 flex items-center gap-1"><MapPin size={10} /> {a.location}</span>}
            {a.vendor && <span className="text-xs text-[#1F4D3A]/70 font-medium">{a.vendor.name}</span>}
          </div>
          {a.notes && <p className="text-xs text-[#14161C]/40 mt-1">{a.notes}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isCancelled && !isCompleted && (
            <button onClick={cancelAppt} disabled={updating}
              className={`p-1.5 rounded-lg hover:bg-red-50 transition-colors ${updating ? 'text-[#14161C]/15 cursor-wait' : 'text-[#14161C]/40 hover:text-red-500'}`} title="Cancel">
              <XCircle size={13} />
            </button>
          )}
          {isCancelled && (
            <button onClick={cancelAppt} disabled={updating}
              className={`p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 transition-colors ${updating ? 'text-[#14161C]/15 cursor-wait' : 'text-[#14161C]/40 hover:text-[#14161C]/60'}`} title="Restore">
              <CheckCircle2 size={13} />
            </button>
          )}
          <button onClick={() => setEditing(true)} disabled={updating} className={`p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 transition-colors ${updating ? 'text-[#14161C]/15 cursor-wait' : 'text-[#14161C]/40 hover:text-[#14161C]/60'}`} aria-label="Edit"><Pencil size={13} /></button>
          <button onClick={handleDelete} disabled={updating} className={`p-1.5 rounded-lg hover:bg-red-50 transition-colors ${updating ? 'text-[#14161C]/15 cursor-wait' : 'text-[#14161C]/40 hover:text-red-500'}`} aria-label="Delete"><Trash2 size={13} /></button>
        </div>
      </div>
      {editing && <EditAppointmentModal weddingId={weddingId} appointment={a} vendors={vendors} onClose={() => setEditing(false)} onDone={onRefresh} />}
    </>
  )
}

export function AppointmentLoadTemplateModal({ weddingId, eventId, onClose, onDone }: Readonly<{
  weddingId: string; eventId: string; onClose: () => void; onDone: () => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [applying, setApplying] = useState<string | null>(null)
  const [templates, setTemplates] = useState<{ id: string; name: string; data: unknown[] }[]>([])
  const [loading, setLoading] = useState(true)

  useState(() => {
    fetch('/api/templates?type=APPOINTMENT')
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; name: string; data: unknown[] }[]) => { setTemplates(data); setLoading(false) })
      .catch(() => setLoading(false))
  })

  const handleApply = async (templateId: string) => {
    setApplying(templateId)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/apply-template`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, eventId }),
      })
      if (!res.ok) throw new Error('Failed to apply template')
      await qc.invalidateQueries({ queryKey: ['appointments', weddingId] })
      toast('Template applied', 'success'); onDone(); onClose()
    } catch { toast('Failed to apply template', 'error') } finally { setApplying(null) }
  }

  return (
    <Modal onClose={onClose} title="Load appointment template">
      <div className="space-y-3">
        <p className="text-xs text-[#14161C]/40">Adds suggested appointments to this event.</p>
        {loading ? <div className="flex justify-center py-8"><Spinner /></div> :
          templates.length === 0 ? <p className="text-sm text-[#14161C]/40 text-center py-6">No appointment templates available</p> :
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-3 border-b border-[#1F4D3A]/8 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-[#14161C]">{t.name}</p>
                  <p className="text-xs text-[#14161C]/40">{(t.data as unknown[]).length} appointments</p>
                </div>
                <Button size="sm" variant="lavender" onClick={() => void handleApply(t.id)} disabled={applying === t.id}>
                  {applying === t.id ? <Spinner size="sm" /> : 'Apply'}
                </Button>
              </div>
            ))}
          </div>}
      </div>
    </Modal>
  )
}

// ─── Appointment List (with filters matching task list style) ─────────────────

export function AppointmentList({ appointments, weddingId, vendors, onRefresh }: Readonly<{
  appointments: Appointment[]; weddingId: string; vendors: Vendor[]; onRefresh: () => void
}>) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all')

  const completed = appointments.filter(a => a.status === 'COMPLETED').length
  const pct = appointments.length > 0 ? Math.round((completed / appointments.length) * 100) : 0

  const filtered = useMemo(() => appointments.filter(a => {
    if (statusFilter === 'pending') return a.status === 'SCHEDULED'
    if (statusFilter === 'done') return a.status === 'COMPLETED' || a.status === 'CANCELLED'
    return true
  }), [appointments, statusFilter])

  // Group pending by month, done at bottom
  const pending = filtered.filter(a => a.status === 'SCHEDULED').sort((a, b) => a.startAt.localeCompare(b.startAt))
  const done = filtered.filter(a => a.status !== 'SCHEDULED').sort((a, b) => b.startAt.localeCompare(a.startAt))

  const grouped = useMemo(() =>
    pending.reduce<Record<string, Appointment[]>>((acc, a) => {
      const key = format(new Date(a.startAt), 'MMMM yyyy')
      if (!acc[key]) acc[key] = []
      acc[key].push(a)
      return acc
    }, {}),
  [pending])

  if (appointments.length === 0) return null

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#14161C]/55">Progress</span>
          <span className="font-bold text-[#1F4D3A]">{pct}% · {completed}/{appointments.length}</span>
        </div>
        <ProgressBar value={completed} max={appointments.length} />
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-[#1F4D3A]/6 p-1 rounded-xl w-fit">
        {(['all', 'pending', 'done'] as const).map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${statusFilter === f ? 'bg-white text-[#14161C] shadow-sm' : 'text-[#14161C]/55 hover:text-[#14161C]/70'}`}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Sparkles size={40} />} title="No appointments match" description="Try a different filter" />
      ) : (
        <div className="space-y-8">
          {/* Pending grouped by month */}
          {Object.entries(grouped).map(([month, appts]) => (
            <div key={month}>
              <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-3">{month}</p>
              <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden px-4">
                {appts.map(a => <AppointmentRow key={a.id} a={a} weddingId={weddingId} vendors={vendors} onRefresh={onRefresh} />)}
              </div>
            </div>
          ))}

          {/* Done section */}
          {done.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-3">Completed / Cancelled</p>
              <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden px-4">
                {done.map(a => <AppointmentRow key={a.id} a={a} weddingId={weddingId} vendors={vendors} onRefresh={onRefresh} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Event Appointments Tab (shared between event detail + dashboard) ──────────

export function EventAppointmentsTab({ weddingId, userId, eventId, vendors, appointments, onRefresh }: Readonly<{
  weddingId: string; userId: string; eventId: string
  vendors: Vendor[]; appointments: Appointment[]; onRefresh: () => void
}>) {
  const [showAdd, setShowAdd] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)

  const eventAppts = useMemo(() => appointments.filter(a => a.eventId === eventId), [appointments, eventId])
  const completed = eventAppts.filter(a => a.status === 'COMPLETED').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-[#14161C]/40">
          {completed}/{eventAppts.length} completed
        </p>
        <div className="flex gap-2">
          <Button variant="lavender" size="sm" onClick={() => setShowTemplate(true)}>
            <LayoutTemplate size={13} /> Load template
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Book appointment</Button>
        </div>
      </div>
      {eventAppts.length === 0 ? (
        <EmptyState icon={<Sparkles size={40} />} title="No appointments for this event"
          description="Book appointments or load a template to get started"
          action={<Button onClick={() => setShowAdd(true)}><Plus size={14} /> Book appointment</Button>} />
      ) : (
        <AppointmentList appointments={eventAppts} weddingId={weddingId} vendors={vendors} onRefresh={onRefresh} />
      )}
      {showAdd && <AddAppointmentModal weddingId={weddingId} userId={userId} vendors={vendors} eventId={eventId} onClose={() => setShowAdd(false)} onDone={onRefresh} />}
      {showTemplate && <AppointmentLoadTemplateModal weddingId={weddingId} eventId={eventId} onClose={() => setShowTemplate(false)} onDone={onRefresh} />}
    </div>
  )
}
