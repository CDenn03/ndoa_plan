'use client'
import { useState, use, useMemo } from 'react'
import { DollarSign, Plus, Phone, CalendarDays } from 'lucide-react'
import { Button, EmptyState, Spinner } from '@/components/ui'
import { usePayments } from '@/hooks/use-payments'
import { useQuery } from '@tanstack/react-query'
import type { Payment } from '@/hooks/use-payments'
import {
  PaymentRow, StkPushModal, AddManualPaymentModal, EventPaymentsTab, fmt,
  type WeddingEvent,
} from '@/components/features/payment-modals'

// ─── Overall tab ──────────────────────────────────────────────────────────────

function OverallTab({ payments, events }: Readonly<{ payments: Payment[]; events: WeddingEvent[] }>) {
  const totalReceived = payments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)
  const pending = payments.filter(p => p.status === 'PENDING').length

  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent | null; payments: Payment[] }>()
    for (const e of events) map.set(e.id, { event: e, payments: [] })
    for (const p of payments) {
      const k = p.eventId ?? '__unassigned__'
      if (!map.has(k)) map.set(k, { event: null, payments: [] })
      map.get(k)?.payments.push(p)
    }
    return map
  }, [payments, events])

  if (payments.length === 0) return (
    <EmptyState icon={<DollarSign size={40} />} title="No payments yet" description="Record payments inside each event tab" />
  )

  return (
    <div className="space-y-8">
      <div className="flex gap-8 divide-x divide-zinc-100">
        <div className="pr-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Total received</p>
          <p className="text-2xl font-extrabold text-emerald-600">{fmt(totalReceived)}</p></div>
        <div className="px-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Total payments</p>
          <p className="text-2xl font-extrabold text-[#14161C]">{payments.length}</p></div>
        {pending > 0 && <div className="px-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Pending</p>
          <p className="text-2xl font-extrabold text-amber-500">{pending}</p></div>}
      </div>
      <div className="space-y-3">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">By event</p>
        {Array.from(byEvent.entries()).map(([key, { event, payments: evPays }]) => {
          if (evPays.length === 0) return null
          const evTotal = evPays.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)
          return (
            <div key={key} className="rounded-2xl border border-zinc-100 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={15} className="text-zinc-400" />
                <p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p>
                <span className="text-xs text-zinc-400">{evPays.length} payments</span>
              </div>
              <p className="text-sm font-bold text-emerald-600">{fmt(evTotal)}</p>
            </div>
          )
        })}
      </div>
      <div>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">All payments</p>
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          {payments.map(p => <PaymentRow key={p.id} p={p} />)}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: payments = [], isLoading } = usePayments(wid)
  const [activeTab, setActiveTab] = useState('__overall__')
  const [showStk, setShowStk] = useState(false)
  const [showManual, setShowManual] = useState(false)

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/events`); if (!res.ok) throw new Error('Failed'); return res.json() as Promise<WeddingEvent[]> },
    staleTime: 60_000,
  })

  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name }))]
  const activeEvent = events.find(e => e.id === activeTab)
  const totalReceived = payments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-zinc-100 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Finance</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Payments</h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1 mb-6">{payments.length} payments · {fmt(totalReceived)} received</p>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px">
            {(isLoading || eventsLoading) ? <div className="pb-4"><Spinner size="sm" /></div> : (
              tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-[#14161C] text-[#14161C]' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
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
            ? <OverallTab payments={payments} events={events} />
            : activeEvent
              ? <EventPaymentsTab weddingId={wid} eventId={activeEvent.id} events={events} payments={payments} isLoading={false} />
              : null}
      </div>

      {showStk && <StkPushModal weddingId={wid} onClose={() => setShowStk(false)} />}
      {showManual && <AddManualPaymentModal weddingId={wid} eventId={activeEvent?.id} events={events} onClose={() => setShowManual(false)} />}
    </div>
  )
}
