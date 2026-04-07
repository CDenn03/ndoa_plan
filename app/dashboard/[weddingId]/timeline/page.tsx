'use client'
import { useState } from 'react'
import { Clock, Plus, X, CheckCircle2, Circle } from 'lucide-react'
import { Button, Input, Textarea, Card, CardHeader, CardContent, CardTitle, EmptyState, Spinner } from '@/components/ui'
import { useTimelineEvents, useAddTimelineEvent, useUpdateTimelineEvent } from '@/hooks/use-data'
import { format } from 'date-fns'
import type { LocalTimelineEvent } from '@/types'

function TimelineItem({ event, weddingId }: { event: LocalTimelineEvent; weddingId: string }) {
  const update = useUpdateTimelineEvent(weddingId)
  const start = new Date(event.startTime)
  const end = event.endTime ? new Date(event.endTime) : null

  return (
    <div className="flex gap-4 group">
      {/* Timeline stem */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors"
          style={{ borderColor: event.color ?? '#8B5CF6', backgroundColor: event.isComplete ? (event.color ?? '#8B5CF6') : 'transparent' }}>
          {event.isComplete
            ? <CheckCircle2 size={14} className="text-white" />
            : <Circle size={14} style={{ color: event.color ?? '#8B5CF6' }} />}
        </div>
        <div className="w-0.5 flex-1 bg-zinc-100 dark:bg-zinc-800 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{event.title}</p>
              {event.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Pending sync" />}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {format(start, 'h:mm a')}
              {end && ` – ${format(end, 'h:mm a')}`}
              {event.location && ` · ${event.location}`}
            </p>
            {event.description && <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{event.description}</p>}
          </div>
          <button
            onClick={() => update.mutate({ eventId: event.id, data: { isComplete: !event.isComplete }, currentVersion: event.version })}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-violet-500 hover:text-violet-700"
          >
            {event.isComplete ? 'Undo' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddEventModal({ weddingId, onClose }: { weddingId: string; onClose: () => void }) {
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold">Add timeline event</h2>
          <button onClick={onClose}><X size={18} className="text-zinc-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ceremony begins" required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-sm font-medium mb-1">Date *</label>
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start time</label>
              <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End time</label>
              <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Main hall" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional details..." rows={2} />
          </div>
          <div className="flex items-center gap-3">
            <label className="block text-sm font-medium">Colour</label>
            <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={add.isPending}>{add.isPending ? 'Adding...' : 'Add event'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TimelinePage({ params }: { params: { weddingId: string } }) {
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
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Timeline</h1>
          <p className="text-sm text-zinc-500">{events.length} events scheduled</p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={15} /> Add event</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
        : events.length === 0 ? (
          <EmptyState icon={<Clock size={40} />} title="No events yet" description="Build your wedding day timeline"
            action={<Button onClick={() => setShowAdd(true)}><Plus size={15} />Add event</Button>} />
        ) : (
          Object.entries(grouped).sort().map(([day, dayEvents]) => (
            <div key={day}>
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wide">
                {format(new Date(day), 'EEEE, d MMMM yyyy')}
              </h2>
              <div>
                {dayEvents.map(e => <TimelineItem key={e.id} event={e} weddingId={wid} />)}
              </div>
            </div>
          ))
        )}

      {showAdd && <AddEventModal weddingId={wid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
