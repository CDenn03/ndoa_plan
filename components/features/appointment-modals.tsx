'use client'
import { useState, useMemo } from 'react'
import { Button, Input, Select, Label, Badge, Modal, Spinner, EmptyState } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQueryClient } from '@tanstack/react-query'
import { format, isFuture } from 'date-fns'
import { MapPin, Clock, Pencil, Trash2, CheckCircle2, LayoutTemplate, Plus, Sparkles } from 'lucide-react'

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
  const [editing, setEditing] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this appointment?')) return
    try {
      const res = await fetch(`/api/weddings/${weddingId}/appointments/${a.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast('Appointment deleted', 'success'); onRefresh()
    } catch { toast('Failed to delete appointment', 'error') }
  }

  return (
    <>
      <div className="group flex items-start gap-4 py-4 border-b border-zinc-100 last:border-0">
        <div className="w-10 h-10 rounded-xl bg-[#CDB5F7]/20 flex flex-col items-center justify-center flex-shrink-0">
          <p className="text-sm font-extrabold text-violet-600 leading-none">{format(new Date(a.startAt), 'd')}</p>
          <p className="text-[9px] font-semibold text-zinc-400 uppercase">{format(new Date(a.startAt), 'MMM')}</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#14161C]">{a.title}</p>
            <Badge variant={STATUS_BADGE[a.status] ?? 'default'}>{a.status}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Clock size={10} /> {format(new Date(a.startAt), 'h:mm a')}
              {a.endAt ? ` – ${format(new Date(a.endAt), 'h:mm a')}` : ''}
            </span>
            {a.location && <span className="text-xs text-zinc-400 flex items-center gap-1"><MapPin size={10} /> {a.location}</span>}
            {a.vendor && <span className="text-xs text-violet-500 font-medium">{a.vendor.name}</span>}
          </div>
          {a.notes && <p className="text-xs text-zinc-400 mt-1">{a.notes}</p>}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors" aria-label="Edit"><Pencil size={13} /></button>
          <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors" aria-label="Delete"><Trash2 size={13} /></button>
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
        <p className="text-xs text-zinc-400">Adds suggested appointments to this event.</p>
        {loading ? <div className="flex justify-center py-8"><Spinner /></div> :
          templates.length === 0 ? <p className="text-sm text-zinc-400 text-center py-6">No appointment templates available</p> :
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-3 border-b border-zinc-100 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-[#14161C]">{t.name}</p>
                  <p className="text-xs text-zinc-400">{(t.data as unknown[]).length} appointments</p>
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

// ─── Appointment List (grouped by month + past section) ───────────────────────

export function AppointmentList({ appointments, weddingId, vendors, onRefresh }: Readonly<{
  appointments: Appointment[]; weddingId: string; vendors: Vendor[]; onRefresh: () => void
}>) {
  const upcoming = appointments.filter(a => a.status === 'SCHEDULED' && isFuture(new Date(a.startAt)))
  const past = appointments.filter(a => a.status !== 'SCHEDULED' || !isFuture(new Date(a.startAt)))

  const grouped = useMemo(() =>
    upcoming.reduce<Record<string, Appointment[]>>((acc, a) => {
      const key = format(new Date(a.startAt), 'MMMM yyyy')
      if (!acc[key]) acc[key] = []
      acc[key].push(a)
      return acc
    }, {}),
  [upcoming])

  if (appointments.length === 0) return null

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([month, appts]) => (
        <div key={month}>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">{month}</p>
          <div className="space-y-0">
            {appts.map(a => <AppointmentRow key={a.id} a={a} weddingId={weddingId} vendors={vendors} onRefresh={onRefresh} />)}
          </div>
        </div>
      ))}
      {past.length > 0 && (
        <div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Past</p>
          <div className="space-y-0 opacity-60">
            {past.slice(0, 5).map(a => (
              <div key={a.id} className="group flex items-start gap-4 py-3 border-b border-zinc-100 last:border-0">
                <CheckCircle2 size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-500 line-through">{a.title}</p>
                  <p className="text-xs text-zinc-400">{format(new Date(a.startAt), 'MMM d, yyyy')}</p>
                </div>
                <button onClick={async () => {
                  if (!confirm('Delete this appointment?')) return
                  await fetch(`/api/weddings/${weddingId}/appointments/${a.id}`, { method: 'DELETE' })
                  onRefresh()
                }} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-zinc-400">{eventAppts.length} appointment{eventAppts.length !== 1 ? 's' : ''}</p>
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
