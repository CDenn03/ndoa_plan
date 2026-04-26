'use client'
import { useState, use, useMemo } from 'react'
import { DollarSign, CalendarDays } from 'lucide-react'
import { EmptyState, Spinner, ConfirmDialog } from '@/components/ui'
import { EventTabs, StatsCard } from '@/components/ui/tabs'
import { usePayments } from '@/hooks/use-payments'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import { format } from 'date-fns'
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
  const recentPayments = payments
    .filter(p => p.status === 'COMPLETED')
    .sort((a, b) => new Date(b.processedAt || b.createdAt).getTime() - new Date(a.processedAt || a.createdAt).getTime())
    .slice(0, 5)

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
    <div className="space-y-8">
      <StatsCard
        stats={[
          { label: 'Total received', value: fmt(totalReceived), color: 'green' },
          { label: 'Total payments', value: payments.length, color: 'default' },
          { label: 'Pending', value: pendingCount, color: pendingCount > 0 ? 'amber' : 'default' }
        ]}
      />

      {/* Recent payments section */}
      {recentPayments.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">Recent payments</p>
          <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
            {recentPayments.map(payment => (
              <div key={payment.id} className="flex items-center gap-4 py-4 px-6 border-b border-[#1F4D3A]/8 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#14161C] truncate">{payment.payerName || 'Unknown'}</p>
                  <p className="text-xs text-[#14161C]/40">
                    {format(new Date(payment.processedAt || payment.createdAt), 'MMM d, yyyy • h:mm a')}
                    {payment.method && ` • ${payment.method}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">{fmt(payment.amount)}</p>
                  <p className="text-xs text-emerald-600">COMPLETED</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">By event</p>
          {Array.from(byEvent.entries()).map(([key, { event, payments: evPays }]) => {
            if (evPays.length === 0) return null
            const evTotal = evPays.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)
            return (
              <div key={key} className="rounded-2xl border border-[#1F4D3A]/8 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CalendarDays size={15} className="text-[#14161C]/40" />
                  <p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p>
                  <span className="text-xs text-[#14161C]/40">{evPays.length} payments</span>
                </div>
                <div className="flex gap-6 text-right">
                  <div><p className="text-xs text-[#14161C]/40">Received</p><p className="text-sm font-bold text-emerald-600">{fmt(evTotal)}</p></div>
                </div>
              </div>
            )
          })}
        </div>
      )}

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

  const { data: events = [] } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${wid}/events`)
      if (!res.ok) throw new Error('Failed')
      return res.json() as Promise<WeddingEvent[]>
    },
    staleTime: 60_000,
  })

  const activeEvent = events.find(e => e.id === activeTab)
  const totalReceived = payments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Finance</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Payments</h1>
          </div>
          <p className="text-sm text-[#14161C]/40 mt-1 mb-6">{payments.length} payments · {fmt(totalReceived)} received</p>
          <EventTabs
            events={events}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showOverall={true}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : activeTab === '__overall__' ? (
          <OverallTab payments={payments} events={events} weddingId={wid} />
        ) : activeEvent ? (
          <EventPaymentsTab weddingId={wid} eventId={activeEvent.id} events={events} payments={payments} isLoading={false} />
        ) : null}
      </div>

      {showStk && <StkPushModal weddingId={wid} onClose={() => setShowStk(false)} />}
      {showManual && <PaymentModal weddingId={wid} eventId={activeEvent?.id} events={events} onClose={() => setShowManual(false)} />}
    </div>
  )
}
