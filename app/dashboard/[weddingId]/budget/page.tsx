'use client'
import { useState, useMemo, use } from 'react'
import { DollarSign, Plus, CalendarDays } from 'lucide-react'
import { Button, ProgressBar, EmptyState, Spinner, EventTabs } from '@/components/ui'
import { useBudgetLines } from '@/hooks/use-data'
import { useQuery } from '@tanstack/react-query'
import type { LocalBudgetLine } from '@/types'
import {
  BudgetLineModal, EventBudgetTab, CategoryBreakdown,
  summarise, fmt, type WeddingEvent, type Vendor,
} from '@/components/features/budget-components'
import { PaymentModal } from '@/components/features/payment-modals'

// ─── Overall tab ──────────────────────────────────────────────────────────────

function OverallTab({ lines, events, vendors, isLoading, weddingId, onAddLine }: Readonly<{
  lines: LocalBudgetLine[]; events: WeddingEvent[]; vendors: Vendor[]
  isLoading: boolean; weddingId: string; onAddLine: () => void
}>) {
  const [editingLine, setEditingLine] = useState<LocalBudgetLine | null>(null)
  const [payingLine, setPayingLine] = useState<LocalBudgetLine | null>(null)
  const { estimated: totalEstimated, actual: totalActual } = summarise(lines)
  const remaining = Math.max(0, totalEstimated - totalActual)

  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent | null; lines: LocalBudgetLine[] }>()
    for (const e of events) map.set(e.id, { event: e, lines: [] })
    for (const l of lines) {
      const key = l.eventId ?? '__unassigned__'
      if (!map.has(key)) map.set(key, { event: null, lines: [] })
      const entry = map.get(key)
      if (entry) entry.lines.push(l)
    }
    return map
  }, [lines, events])

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-0 divide-x divide-zinc-100">
        <div className="pr-8">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-1">Total budget</p>
          <p className="text-2xl font-extrabold text-sky-600">{fmt(totalEstimated)}</p>
        </div>
        <div className="px-8">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-1">Spent</p>
          <p className="text-2xl font-extrabold text-emerald-600">{fmt(totalActual)}</p>
        </div>
        <div className="pl-8">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-1">Remaining</p>
          <p className={`text-2xl font-extrabold ${remaining <= 0 ? 'text-red-500' : 'text-[#14161C]'}`}>{fmt(remaining)}</p>
        </div>
      </div>

      {events.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">By event</p>
          {Array.from(byEvent.entries()).map(([key, { event, lines: evLines }]) => {
            if (evLines.length === 0) return null
            const s = summarise(evLines)
            return (
              <div key={key} className="rounded-2xl border border-[#1F4D3A]/8 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CalendarDays size={15} className="text-[#14161C]/40" />
                  <p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p>
                  <span className="text-xs text-[#14161C]/40">{evLines.length} lines</span>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-xs text-[#14161C]/40">Estimated</p>
                    <p className="text-sm font-bold text-sky-600">{fmt(s.estimated)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#14161C]/40">Spent</p>
                    <p className="text-sm font-bold text-emerald-600">{fmt(s.actual)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {lines.length === 0 ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={onAddLine}><Plus size={14} /> Add budget line</Button>
          </div>
          <EmptyState 
            icon={<DollarSign size={40} />} 
            title="No budget lines yet"
            description="Add line items to track your wedding expenses" 
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={onAddLine}><Plus size={13} /> Add budget line</Button>
          </div>
          <div>
            <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-4">All categories</p>
            <CategoryBreakdown lines={lines} weddingId={weddingId} events={events} vendors={vendors} onEdit={setEditingLine} onPay={setPayingLine} />
          </div>
        </div>
      )}

      {editingLine && <BudgetLineModal weddingId={weddingId} events={events} vendors={vendors} line={editingLine} onClose={() => setEditingLine(null)} onPay={setPayingLine} />}
      {payingLine && <PaymentModal weddingId={weddingId} budgetLine={payingLine} events={events} onClose={() => setPayingLine(null)} />}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: lines = [], isLoading: linesLoading } = useBudgetLines(wid)
  const [activeTab, setActiveTab] = useState('__overall__')
  const [showAddFromOverall, setShowAddFromOverall] = useState(false)

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/events`); if (!res.ok) throw new Error('Failed to load events'); return res.json() as Promise<WeddingEvent[]> },
    staleTime: 60_000,
  })
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors', wid, 'select'],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/vendors`); if (!res.ok) return []; return res.json() as Promise<Vendor[]> },
    staleTime: 60_000,
  })

  const isLoading = linesLoading || eventsLoading
  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name }))]
  const activeEvent = events.find(e => e.id === activeTab)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Finance</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Budget</h1>
          </div>
          <p className="text-sm text-[#14161C]/40 mt-1 mb-6">{lines.length} total line items across {events.length} events</p>
          
          <EventTabs
            events={events}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showOverall={true}
          />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-8 py-10">
        {activeTab === '__overall__'
          ? <OverallTab lines={lines} events={events} vendors={vendors} isLoading={isLoading} weddingId={wid} onAddLine={() => setShowAddFromOverall(true)} />
          : activeEvent
            ? <EventBudgetTab weddingId={wid} eventId={activeEvent.id} events={events} vendors={vendors} />
            : null}
      </div>
      {showAddFromOverall && <BudgetLineModal weddingId={wid} events={events} vendors={vendors} onClose={() => setShowAddFromOverall(false)} />}
    </div>
  )
}
