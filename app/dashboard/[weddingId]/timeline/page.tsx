'use client'
import { useState, use } from 'react'
import { Clock, Plus, CheckCircle2, Circle } from 'lucide-react'
import { Button, Input, Textarea, Label, EmptyState, Spinner, Modal } from '@/components/ui'
import { useTimelineEvents, useAddTimelineEvent, useUpdateTimelineEvent } from '@/hooks/use-data'
import { format } from 'date-fns'
import type { LocalTimelineEvent } from '@/types'

function TimelineItem({ event, weddingId }: Readonly<{ event: LocalTimelineEvent; weddingId: string }>) {
  const update = useUpdateTimelineEvent(weddingId)
  const start = new Date(event.startTime)
  const end = event.endTime ? new Date(event.endTime) : null

  return (
    <div className="flex gap-5 group">
      {/* Stem */}
      <div className="flex flex-col items-center flex-shrink-0">
        <button
          onClick={() => update.mutate({ eventId: event.id, data: { isComplete: !event.isComplete }, currentVersion: event.version })}
          className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all hover:scale-105"
          style={{
            borderColor: event.color ?? '#8B5CF6',
            backgroundColor: event.isComplete ? (event.color ?? '#8B5CF6') : 'transparent',
          }}
        >
          {event.isComplete
            ? <CheckCircle2 size={15} className="text-white" />
            : <Circle size={15} style={{ color: event.color ?? '#8B5CF6' }} />}
        </button>
        <div className="w-px flex-1 bg-zinc-100 mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className={`font-semibold text-[#14161C] ${event.isComplete ? 'line-through text-zinc-400' : ''}`}>
                {event.title}
              </p>
              {event.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Pending sync" />}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {format(start, 'h:mm a')}
              {end && ` – ${format(end, 'h:mm a')}`}
              {event.location && <> · <span className="text-zinc-500">{event.location}</span></>}
            </p>
            {event.description && <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">{event.description}</p>}
          </div>
          <span className="text-xs font-semibold text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer whitespace-nowrap pt-0.5"
            onClick={() => update.mutate({ eventId: event.id, data: { isComplete: !event.isComplete }, currentVersion: event.version })}>
            {event.isComplete ? 'Undo' : 'Mark done'}
          </span>
        </div>
      </div>
    </div>
  )
}

function AddEventModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const add = useAddTimelineEvent(weddingId)
  const [form, setForm] = useState({ title: '', description: '', startDate: '', startTime: '09:00', endTime: '', location: '', color: '#8B5CF6' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.startDate) return
    const start = new Date(`${form.startDate}T${form.startTime}`).getTime()
    const end = form.endTime ? new Date(`${form.startDate}T${form.endTime}`).getTime() : undefined
    await add.mutateAsync({ weddingId, title: form.title, description: form.description || undefined, startTime: start, endTime: end, location: form.location || undefined, color: form.color, isComplete: false })
    onClose()
  }

  return (
    <Modal onClose={onClose} title="Add timeline event">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Title *</Label>
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ceremony begins" required />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <Label>Date *</Label>
            <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
          </div>
          <div>
            <Label>Start</Label>
            <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
          </div>
          <div>
            <Label>End</Label>
            <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
          </div>
        </div>
        <div>
          <Label>Location</Label>
          <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Main hall" />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional details…" rows={2} />
        </div>
        <div className="flex items-center gap-3">
          <Label className="mb-0">Colour</Label>
          <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-8 h-8 rounded-lg cursor-pointer border border-zinc-200 p-0.5" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={add.isPending}>{add.isPending ? 'Adding…' : 'Add event'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function TimelinePage(props: { params: Promise<{ weddingId: string }> }) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: events = [], isLoading } = useTimelineEvents(wid)
  const [showAdd, setShowAdd] = useState(false)

  const grouped = events.reduce<Record<string, LocalTimelineEvent[]>>((acc, e) => {
    const day = format(new Date(e.startTime), 'yyyy-MM-dd')
    if (!acc[day]) acc[day] = []
    acc[day].push(e)
    return acc
  }, {})

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Schedule</p>
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Timeline</h1>
            <p className="text-sm text-zinc-400 mt-2">{events.length} events scheduled</p>
          </div>
          <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} /> Add event</Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : events.length === 0 ? (
          <EmptyState icon={<Clock size={40} />} title="No events yet" description="Build your wedding day timeline"
            action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add event</Button>} />
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).sort().map(([day, dayEvents]) => (
              <div key={day}>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">
                  {format(new Date(day), 'EEEE, d MMMM yyyy')}
                </p>
                <div>
                  {dayEvents.map(e => <TimelineItem key={e.id} event={e} weddingId={wid} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddEventModal weddingId={wid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
