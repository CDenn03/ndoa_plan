'use client'
import { useState } from 'react'
import { Sparkles, Plus, MapPin, Clock, CheckCircle2, X } from 'lucide-react'
import { Button, Input, Select, Label, Badge, EmptyState, Modal, Spinner } from '@/components/ui'
import { format, isFuture, isThisWeek } from 'date-fns'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'

interface Vendor { id: string; name: string; category: string }

interface Appointment {
  id: string
  title: string
  description?: string | null
  vendorId?: string | null
  location?: string | null
  startAt: string
  endAt?: string | null
  status: string
  notes?: string | null
  vendor?: Vendor | null
}

interface Props {
  weddingId: string
  userId: string
  appointments: Appointment[]
  vendors: Vendor[]
}

const STATUS_BADGE: Record<string, 'confirmed' | 'pending' | 'declined'> = {
  SCHEDULED: 'pending', COMPLETED: 'confirmed', CANCELLED: 'declined',
}

function AddAppointmentModal({ weddingId, userId, vendors, onClose }: Readonly<{
  weddingId: string; userId: string; vendors: Vendor[]; onClose: () => void
}>) {
  const { toast } = useToast()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', vendorId: '', location: '', date: '', startTime: '09:00', endTime: '', notes: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.date) return
    setSaving(true)
    try {
      const startAt = new Date(`${form.date}T${form.startTime}`).toISOString()
      const endAt = form.endTime ? new Date(`${form.date}T${form.endTime}`).toISOString() : null
      const res = await fetch(`/api/weddings/${weddingId}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, vendorId: form.vendorId || null, location: form.location || null, startAt, endAt, notes: form.notes || null, createdBy: userId }),
      })
      if (!res.ok) throw new Error('Failed')
      toast('Appointment booked', 'success')
      router.refresh()
      onClose()
    } catch {
      toast('Failed to book appointment', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Book appointment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="appt-title">Title *</Label>
          <Input id="appt-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Venue visit" required />
        </div>
        <div>
          <Label htmlFor="appt-vendor">Vendor (optional)</Label>
          <Select id="appt-vendor" value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}>
            <option value="">No vendor</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <Label htmlFor="appt-date">Date *</Label>
            <Input id="appt-date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="appt-start">Start</Label>
            <Input id="appt-start" type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="appt-end">End</Label>
            <Input id="appt-end" type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
          </div>
        </div>
        <div>
          <Label htmlFor="appt-loc">Location</Label>
          <Input id="appt-loc" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Address or venue name" />
        </div>
        <div>
          <Label htmlFor="appt-notes">Notes</Label>
          <Input id="appt-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="What to bring, questions to ask…" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Booking…' : 'Book appointment'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function AppointmentsClient({ weddingId, userId, appointments, vendors }: Readonly<Props>) {
  const [showAdd, setShowAdd] = useState(false)

  const upcoming = appointments.filter(a => a.status === 'SCHEDULED' && isFuture(new Date(a.startAt)))
  const thisWeek = upcoming.filter(a => isThisWeek(new Date(a.startAt)))
  const past = appointments.filter(a => a.status !== 'SCHEDULED' || !isFuture(new Date(a.startAt)))

  // Group upcoming by month
  const grouped = upcoming.reduce<Record<string, Appointment[]>>((acc, a) => {
    const key = format(new Date(a.startAt), 'MMMM yyyy')
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Planning</p>
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Appointments</h1>
            <p className="text-sm text-zinc-400 mt-2">
              {upcoming.length} upcoming
              {thisWeek.length > 0 && <span className="ml-2 text-amber-500 font-semibold">· {thisWeek.length} this week</span>}
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} /> Book appointment</Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 space-y-10">
        {appointments.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={40} />}
            title="No appointments yet"
            description="Book venue visits, tastings, fittings, and vendor meetings"
            action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Book appointment</Button>}
          />
        ) : (
          <>
            {Object.entries(grouped).map(([month, appts]) => (
              <div key={month}>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-5">{month}</p>
                <div className="space-y-0">
                  {appts.map(a => (
                    <div key={a.id} className="flex items-start gap-4 py-4 border-b border-zinc-100 last:border-0">
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
                            {a.endAt && ` – ${format(new Date(a.endAt), 'h:mm a')}`}
                          </span>
                          {a.location && (
                            <span className="text-xs text-zinc-400 flex items-center gap-1">
                              <MapPin size={10} /> {a.location}
                            </span>
                          )}
                          {a.vendor && <span className="text-xs text-violet-500 font-medium">{a.vendor.name}</span>}
                        </div>
                        {a.notes && <p className="text-xs text-zinc-400 mt-1">{a.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {past.length > 0 && (
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-5">Past</p>
                <div className="space-y-0 opacity-60">
                  {past.slice(0, 5).map(a => (
                    <div key={a.id} className="flex items-start gap-4 py-3 border-b border-zinc-100 last:border-0">
                      <CheckCircle2 size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-zinc-500 line-through">{a.title}</p>
                        <p className="text-xs text-zinc-400">{format(new Date(a.startAt), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAdd && <AddAppointmentModal weddingId={weddingId} userId={userId} vendors={vendors} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
