'use client'
import { useState } from 'react'
import { Calendar, Plus, MapPin, CheckSquare, DollarSign, Clock, ChevronRight } from 'lucide-react'
import { Button, Input, Select, Label, EmptyState, Modal } from '@/components/ui'
import { format, differenceInDays } from 'date-fns'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const EVENT_TYPES = ['WEDDING','RECEPTION','POST_WEDDING','TRADITIONAL','CIVIL','ENGAGEMENT','AFTER_PARTY','HONEYMOON','MOVING']

const TYPE_COLOR: Record<string, string> = {
  WEDDING: 'bg-[#1F4D3A]/10 text-[#1F4D3A]',
  TRADITIONAL: 'bg-amber-100 text-amber-700',
  RECEPTION: 'bg-sky-100 text-sky-700',
  ENGAGEMENT: 'bg-pink-100 text-pink-700',
  HONEYMOON: 'bg-emerald-100 text-emerald-700',
  TRADITIONAL: 'bg-orange-100 text-orange-700',
  CIVIL: 'bg-[#1F4D3A]/6 text-[#14161C]/60',
  AFTER_PARTY: 'bg-purple-100 text-purple-700',
  POST_WEDDING: 'bg-teal-100 text-teal-700',
  MOVING: 'bg-blue-100 text-blue-700',
}

interface WeddingEvent {
  id: string; name: string; type: string; date: string
  venue?: string | null; description?: string | null; isMain: boolean
  startTime?: string | null; endTime?: string | null
  taskCount: number; budgetLineCount: number
}

interface Props { weddingId: string; events: WeddingEvent[] }

function AddEventModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const { toast } = useToast()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'WEDDING', date: '', venue: '', description: '', startTime: '', endTime: '' })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to create event')
      toast('Event added', 'success')
      router.refresh()
      onClose()
    } catch {
      toast('Failed to add event', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Add event">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="ev-name">Event name *</Label>
          <Input id="ev-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Traditional ceremony" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ev-type">Type</Label>
            <Select id="ev-type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="ev-date">Date *</Label>
            <Input id="ev-date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ev-start">Start time</Label>
            <Input id="ev-start" type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="ev-end">End time</Label>
            <Input id="ev-end" type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
          </div>
        </div>
        <div>
          <Label htmlFor="ev-venue">Venue</Label>
          <Input id="ev-venue" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="Safari Park Hotel" />
        </div>
        <div>
          <Label htmlFor="ev-desc">Description</Label>
          <Input id="ev-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional details" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Adding…' : 'Add event'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function EventsClient({ weddingId, events }: Readonly<Props>) {
  const [showAdd, setShowAdd] = useState(false)
  const now = new Date()
  const upcoming = events.filter(e => new Date(e.date) >= now)
  const past = events.filter(e => new Date(e.date) < now)

  const EventCard = ({ ev }: { ev: WeddingEvent }) => {
    const daysLeft = differenceInDays(new Date(ev.date), now)
    const isPast = daysLeft < 0
    return (
      <Link
        href={`/dashboard/${weddingId}/events/${ev.id}`}
        className="flex items-start gap-4 py-4 border-b border-[#1F4D3A]/8 last:border-0 hover:bg-stone-50 transition-colors group"
      >
        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isPast ? 'bg-[#1F4D3A]/6' : 'bg-[#E5DF98]/40 border border-[#E5DF98]'}`}>
          {isPast ? (
            <p className="text-xs font-semibold text-[#14161C]/40">Done</p>
          ) : (
            <>
              <p className="text-lg font-extrabold text-[#14161C] leading-none">{daysLeft}</p>
              <p className="text-[9px] font-semibold text-[#14161C]/55 uppercase tracking-wide">days</p>
            </>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#14161C]">{ev.name}</p>
            {ev.isMain && <span className="text-[10px] font-bold bg-[#1F4D3A]/10 text-[#1F4D3A] rounded-full px-2 py-0.5">Main</span>}
            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${TYPE_COLOR[ev.type] ?? 'bg-[#1F4D3A]/6 text-[#14161C]/60'}`}>
              {ev.type.replaceAll('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-[#14161C]/40 mt-0.5">
            {format(new Date(ev.date), 'EEEE, d MMMM yyyy')}
            {ev.startTime && <> · <Clock size={10} className="inline" /> {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</>}
          </p>
          {ev.venue && (
            <p className="text-xs text-[#14161C]/40 mt-0.5 flex items-center gap-1">
              <MapPin size={10} /> {ev.venue}
            </p>
          )}
          <div className="flex items-center gap-4 mt-1.5">
            {ev.taskCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[#14161C]/40">
                <CheckSquare size={10} /> {ev.taskCount} task{ev.taskCount === 1 ? '' : 's'}
              </span>
            )}
            {ev.budgetLineCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[#14161C]/40">
                <DollarSign size={10} /> {ev.budgetLineCount} budget line{ev.budgetLineCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={14} className="text-[#14161C]/25 group-hover:text-[#14161C]/55 transition-colors flex-shrink-0 mt-1" />
      </Link>
    )
  }

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Planning</p>
            <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Events</h1>
            <p className="text-sm text-[#14161C]/40 mt-2">{events.length} event{events.length === 1 ? '' : 's'} · {upcoming.length} upcoming</p>
          </div>
          <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} /> Add event</Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10 space-y-10">
        {events.length === 0 ? (
          <EmptyState
            icon={<Calendar size={40} />}
            title="No events yet"
            description="Add your wedding events — traditional ceremony, main ceremony, reception, and more. Each event is a self-contained workspace with tasks, budget, and guests."
            action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add event</Button>}
          />
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-3">Upcoming</p>
                <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden px-4">
                  {upcoming.map(ev => <EventCard key={ev.id} ev={ev} />)}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-3">Past</p>
                <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden px-4 opacity-60">
                  {past.map(ev => <EventCard key={ev.id} ev={ev} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAdd && <AddEventModal weddingId={weddingId} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
