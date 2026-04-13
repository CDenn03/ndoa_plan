'use client'
import { useState, useMemo, use } from 'react'
import { Plus, LayoutTemplate, CalendarDays } from 'lucide-react'
import { Button, ProgressBar, Spinner } from '@/components/ui'
import { useChecklistItems } from '@/hooks/use-data'
import { useQuery } from '@tanstack/react-query'
import { TaskModal, TaskList, LoadTemplateModal } from '@/components/features/task-modals'
import type { TaskItem } from '@/components/features/task-modals'

interface WeddingEvent { id: string; name: string; type: string; date: string }

// ─── Overall tab ──────────────────────────────────────────────────────────────

function OverallTab({ weddingId, items, events, onAdd, onSelectEvent }: Readonly<{
  weddingId: string; items: TaskItem[]; events: WeddingEvent[]; onAdd: () => void; onSelectEvent: (id: string) => void
}>) {
  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent | null; items: TaskItem[] }>()
    for (const e of events) map.set(e.id, { event: e, items: [] })
    for (const i of items) {
      const k = i.eventId ?? '__unassigned__'
      if (!map.has(k)) map.set(k, { event: null, items: [] })
      map.get(k)?.items.push(i)
    }
    return map
  }, [items, events])

  return (
    <div className="space-y-8">
      {events.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">By event</p>
          {Array.from(byEvent.entries()).map(([key, { event, items: evItems }]) => {
            if (evItems.length === 0) return null
            const done = evItems.filter(i => i.isChecked).length
            const pending = evItems.filter(i => !i.isChecked).length
            const overdue = evItems.filter(i => !i.isChecked && i.dueDate && new Date(i.dueDate) < new Date()).length
            const finalChecks = evItems.filter(i => i.isFinalCheck)
            const finalDone = finalChecks.filter(i => i.isChecked).length
            const highPriority = evItems.filter(i => !i.isChecked && i.priority === 1).length
            const pct = evItems.length > 0 ? Math.round((done / evItems.length) * 100) : 0
            return (
              <button key={key} onClick={() => event && onSelectEvent(event.id)}
                className="w-full rounded-2xl border border-[#1F4D3A]/8 p-4 space-y-3 hover:border-[#1F4D3A]/12 hover:bg-[#F7F5F2]/50 transition-colors text-left">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CalendarDays size={15} className="text-[#14161C]/40" />
                    <p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p>
                    <span className="text-xs text-[#14161C]/40">{evItems.length} task{evItems.length !== 1 ? 's' : ''}</span>
                    {overdue > 0 && (
                      <span className="text-[10px] font-bold bg-red-100 text-red-600 rounded-full px-1.5 py-0.5">
                        {overdue} overdue
                      </span>
                    )}
                    {highPriority > 0 && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">
                        {highPriority} high priority
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-bold ${pct === 100 ? 'text-emerald-600' : 'text-[#1F4D3A]'}`}>{pct}%</span>
                </div>

                {/* Progress bar */}
                <ProgressBar value={done} max={evItems.length} />

                {/* Stats row */}
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-xs text-[#14161C]/40">
                    <span className="font-semibold text-emerald-600">{done}</span> done
                  </span>
                  <span className="text-xs text-[#14161C]/40">
                    <span className="font-semibold text-[#14161C]/60">{pending}</span> pending
                  </span>
                  {finalChecks.length > 0 && (
                    <span className="text-xs text-[#14161C]/40">
                      Final checks: <span className={`font-semibold ${finalDone === finalChecks.length ? 'text-emerald-600' : 'text-red-500'}`}>{finalDone}/{finalChecks.length}</span>
                    </span>
                  )}
                  <span className="text-xs text-[#1F4D3A]/70 font-medium ml-auto">View tasks →</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
      <TaskList items={items} weddingId={weddingId} onAdd={onAdd} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: items = [], isLoading } = useChecklistItems(wid)
  const [activeTab, setActiveTab] = useState('__overall__')
  const [showAdd, setShowAdd] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/events`); if (!res.ok) throw new Error('Failed'); return res.json() as Promise<WeddingEvent[]> },
    staleTime: 60_000,
  })

  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name }))]
  const activeEvent = events.find(e => e.id === activeTab)
  const checked = items.filter(i => i.isChecked).length

  const eventItems = useMemo(() =>
    activeEvent ? (items as TaskItem[]).filter(i => i.eventId === activeEvent.id) : [],
  [items, activeEvent])

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Planning</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Tasks</h1>
          </div>
          <p className="text-sm text-[#14161C]/40 mt-1 mb-6">{checked} of {items.length} completed</p>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px">
            {(isLoading || eventsLoading) ? <div className="pb-4"><Spinner size="sm" /></div> : (
              tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-[#14161C] text-[#14161C]' : 'border-transparent text-[#14161C]/40 hover:text-[#14161C]/60'}`}>
                  {t.label}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10">
        {isLoading ? <div className="flex justify-center py-16"><Spinner /></div> :
          activeTab === '__overall__'
            ? <OverallTab weddingId={wid} items={items as TaskItem[]} events={events} onAdd={() => setShowAdd(true)} onSelectEvent={setActiveTab} />
            : activeEvent
              ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#14161C]/55">{eventItems.filter(t => t.isChecked).length}/{eventItems.length} completed</p>
                    <div className="flex gap-2">
                      <Button variant="lavender" size="sm" onClick={() => setShowTemplate(true)}>
                        <LayoutTemplate size={13} /> Load template
                      </Button>
                      <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add task</Button>
                    </div>
                  </div>
                  <TaskList items={eventItems} weddingId={wid} onAdd={() => setShowAdd(true)} />
                </div>
              )
              : null}
      </div>

      {showAdd && <TaskModal weddingId={wid} eventId={activeEvent?.id} onClose={() => setShowAdd(false)} />}
      {showTemplate && <LoadTemplateModal weddingId={wid} eventId={activeEvent?.id} onClose={() => setShowTemplate(false)} />}
    </div>
  )
}
