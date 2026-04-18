'use client'
import { useState, use, useMemo } from 'react'
import { DollarSign, CalendarDays } from 'lucide-react'
import { EmptyState, Spinner, ConfirmDialog } from '@/components/ui'
import { usePayments } from '@/hooks/use-payments'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import type { Payment } from '@/hooks/use-payments'
import {
  PaymentRow, StkPushModal, EventPaymentsTab, PaymentDetailModal, fmt,
  type WeddingEvent,
} from '@/components/features/payment-modals'
import { PaymentModal } from '@/components/features/payment-modals'

// ─── Overall tab ──────────────────────────────────────────────────────────────

function OverallTab({ payments, events, weddingId }: Readonly<{ payments: Payment[]; events: WeddingEvent[]; weddingId: string }>) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [confirmDelete, setConfirmDelete] = useState<Payment | null>(null)
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null)
  const qc = useQueryClient()
  const { toast } = useToast()

  const totalReceived = payments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)
  const pendingCount = payments.filter(p => p.status === 'PENDING').length

  const byEvent = useMemo(() => {
    const eventMap = new Map(events.map(e => [e.id, e]))
    const extraKeys = payments.map(p => p.eventId ?? '__unassigned__').filter(k => !eventMap.has(k))
    const keys = [...eventMap.keys(), ...new Set(extraKeys)]
    return new Map(keys.map(k => [k, { event: eventMap.get(k) ?? null, payments: payments.filter(p => (p.eventId ?? '__unassigned__') === k) }]))
  }, [payments, events])

  const filtered = useMemo(() => {
    if (filter === 'pending') return payments.filter(p => p.status === 'PENDING')
    if (filter === 'completed') return payments.filter(p => p.status === 'COMPLETED')
    return payments
  }, [payments, filter])

  const handleDelete = async (p: Payment) => {
    try {
      await fetch(`/api/weddings/${weddingId}/payments/${p.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['payments', weddingId] })
      toast('Payment deleted', 'success')
    } catch { toast('Failed to delete payment', 'error') }
    setConfirmDelete(null)
  }

  if (payments.length === 0) return (
    <EmptyState icon={<DollarSign size={40} />} title="No payments yet" description="Record payments inside each event tab" />
  )

  return (
    <div className="space-y-6">
      {/* Stats card */}
      <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white shadow-sm p-5 grid grid-cols-3 gap-0 divide-x divide-zinc-100">
        <div className="pr-6">
          <p className="text-[11px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-0.5">Total received</p>
          <p className="text-xl font-extrabold text-emerald-600 font-heading tabular-nums">{fmt(totalReceived)}</p>
        </div>
        <div className="px-6">
          <p className="text-[11px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-0.5">Total payments</p>
          <p className="text-xl font-extrabold text-[#14161C] font-heading tabular-nums">{payments.length}</p>
        </div>
        <div className="pl-6">
          <p className="text-[11px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-0.5">Pending</p>
          <p className={`text-xl font-extrabold font-heading tabular-nums ${pendingCount > 0 ? 'text-amber-500' : 'text-[#14161C]/30'}`}>{pendingCount}</p>
        </div>
      </div>

      {/* By event card */}
      <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1F4D3A]/8 bg-[#F7F5F2]/60">
          <p className="text-xs font-bold text-[#14161C]/60 uppercase tracking-widest">By event</p>
        </div>
        {Array.from(byEvent.entries()).map(([key, { event, payments: evPays }]) => {
          if (evPays.length === 0) return null
          const evTotal = evPays.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)
          return (
            <div key={key} className="flex items-center gap-4 py-3.5 px-5 border-b border-[#1F4D3A]/6 last:border-0 hover:bg-[#F7F5F2]/60 transition-colors">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <CalendarDays size={14} className="text-[#14161C]/40 flex-shrink-0" />
                <p className="text-sm font-semibold text-[#14161C] truncate">{event?.name ?? 'Unassigned'}</p>
                <span className="text-xs text-[#14161C]/40 flex-shrink-0">{evPays.length} payments</span>
              </div>
              <p className="text-sm font-bold text-emerald-600 flex-shrink-0 tabular-nums">{fmt(evTotal)}</p>
            </div>
          )
        })}
      </div>

      {/* All payments card */}
      <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1F4D3A]/8 bg-[#F7F5F2]/60">
          <p className="text-xs font-bold text-[#14161C]/60 uppercase tracking-widest">All payments</p>
          <div className="flex gap-1 bg-white rounded-xl p-1 border border-[#1F4D3A]/8">
            {(['all', 'pending', 'completed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize ${filter === f ? 'bg-[#1F4D3A] text-white shadow-sm' : 'text-[#14161C]/40 hover:text-[#14161C]/70'}`}>
                {f === 'all' ? `All (${payments.length})` : f === 'pending' ? `Pending (${pendingCount})` : `Done (${payments.filter(p => p.status === 'COMPLETED').length})`}
              </button>
            ))}
          </div>
        </div>
        {filtered.length === 0
          ? <p className="text-sm text-[#14161C]/40 text-center py-8">No {filter} payments</p>
          : filtered.map(p => <PaymentRow key={p.id} p={p} onView={setViewingPayment} onDelete={setConfirmDelete} />)}
      </div>
      {confirmDelete && (
        <ConfirmDialog
          title="Delete payment?"
          description={`${fmt(confirmDelete.amount)} from ${confirmDelete.payerName ?? 'unknown'} will be removed.`}
          confirmLabel="Delete"
          onConfirm={() => void handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {viewingPayment && <PaymentDetailModal p={viewingPayment} weddingId={weddingId} onClose={() => setViewingPayment(null)} />}
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
      <div className="px-6 pt-8 pb-0 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Finance</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Payments</h1>
          </div>
          <p className="text-sm text-[#14161C]/40 mt-1 mb-6">{payments.length} payments · {fmt(totalReceived)} received</p>
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

      <div className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? <div className="flex justify-center py-16"><Spinner /></div> :
          activeTab === '__overall__'
            ? <OverallTab payments={payments} events={events} weddingId={wid} />
            : activeEvent
              ? <EventPaymentsTab weddingId={wid} eventId={activeEvent.id} events={events} payments={payments} isLoading={false} />
              : null}
      </div>

      {showStk && <StkPushModal weddingId={wid} onClose={() => setShowStk(false)} />}
      {showManual && <PaymentModal weddingId={wid} eventId={activeEvent?.id} events={events} onClose={() => setShowManual(false)} />}
    </div>
  )
}
