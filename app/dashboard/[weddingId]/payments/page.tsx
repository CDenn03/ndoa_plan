'use client'
import { useState, use, useMemo } from 'react'
import { DollarSign, Plus, Phone, AlertCircle, CheckCircle2, Clock, CalendarDays } from 'lucide-react'
import { Button, Input, Label, Select, Badge, EmptyState, Spinner, Modal } from '@/components/ui'
import { usePayments, useInitiatePayment } from '@/hooks/use-payments'
import { useToast } from '@/components/ui/toast'
import { format } from 'date-fns'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Payment } from '@/hooks/use-payments'

interface WeddingEvent { id: string; name: string; type: string; date: string }

const STATUS_BADGE: Record<string, 'confirmed' | 'pending' | 'declined' | 'maybe'> = {
  COMPLETED: 'confirmed', PENDING: 'pending', FAILED: 'declined',
  DISPUTED: 'declined', DUPLICATE: 'maybe', REFUNDED: 'maybe',
}
const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  COMPLETED: CheckCircle2, PENDING: Clock, FAILED: AlertCircle,
  DISPUTED: AlertCircle, DUPLICATE: AlertCircle, REFUNDED: CheckCircle2,
}
const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

function iconBg(status: string) {
  if (status === 'COMPLETED') return 'bg-emerald-50 text-emerald-600'
  if (status === 'DISPUTED' || status === 'FAILED') return 'bg-red-50 text-red-500'
  return 'bg-zinc-100 text-zinc-400'
}

function PaymentRow({ p }: Readonly<{ p: Payment }>) {
  const Icon = STATUS_ICON[p.status] ?? Clock
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-zinc-100 last:border-0 px-6">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg(p.status)}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#14161C]">{p.payerName ?? p.payerPhone ?? 'Unknown payer'}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {p.mpesaRef && <span className="text-xs text-zinc-400 font-mono">{p.mpesaRef}</span>}
          {p.description && <span className="text-xs text-zinc-400 truncate">{p.description}</span>}
          <span className="text-xs text-zinc-400">{format(new Date(p.createdAt), 'MMM d, HH:mm')}</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-[#14161C]">{fmt(p.amount)}</p>
        <Badge variant={STATUS_BADGE[p.status] ?? 'pending'} className="mt-1">{p.status}</Badge>
      </div>
    </div>
  )
}

function StkPushModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const initiate = useInitiatePayment(weddingId)
  const { toast } = useToast()
  const [form, setForm] = useState({ phone: '', amount: '', description: '' })

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    void (async () => {
      try {
        await initiate.mutateAsync({ weddingId, phone: form.phone, amount: parseFloat(form.amount), description: form.description || undefined })
        toast('M-Pesa STK push sent. Waiting for payment…', 'info')
        onClose()
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Payment initiation failed', 'error')
      }
    })()
  }

  return (
    <Modal onClose={onClose} title="Request M-Pesa payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="stk-phone">Phone number *</Label>
          <Input id="stk-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="254712345678" required />
          <p className="text-xs text-zinc-400 mt-1">Format: 254XXXXXXXXX (no +)</p></div>
        <div><Label htmlFor="stk-amount">Amount (KES) *</Label>
          <Input id="stk-amount" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="5000" min="1" required /></div>
        <div><Label htmlFor="stk-desc">Description</Label>
          <Input id="stk-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Catering deposit" /></div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={initiate.isPending}>
            {initiate.isPending ? 'Sending…' : <><Phone size={14} /> Send STK Push</>}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function AddManualPaymentModal({ weddingId, eventId, events, onClose }: Readonly<{
  weddingId: string; eventId?: string; events: WeddingEvent[]; onClose: () => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    amount: '', description: '', payerName: '', mpesaRef: '', status: 'COMPLETED',
    selectedEventId: eventId ?? '', vendorId: '',
  })

  const { data: vendors = [] } = useQuery<{ id: string; name: string; category: string }[]>({
    queryKey: ['vendors', weddingId, 'select'],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/vendors`)
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60_000,
  })

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          description: form.description || null,
          payerName: form.payerName || null,
          mpesaRef: form.mpesaRef || null,
          vendorId: form.vendorId || null,
          status: form.status,
          eventId: form.selectedEventId || null,
        }),
      })
      if (!res.ok) throw new Error()
      qc.invalidateQueries({ queryKey: ['payments', weddingId] })
      toast('Payment recorded', 'success'); onClose()
    } catch { toast('Failed to record payment', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Record manual payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!eventId && (
          <div><Label htmlFor="mp-event">Event (optional)</Label>
            <Select id="mp-event" value={form.selectedEventId} onChange={e => setForm(f => ({ ...f, selectedEventId: e.target.value }))}>
              <option value="">No specific event</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </Select></div>
        )}
        <div><Label htmlFor="mp-amount">Amount (KES) *</Label>
          <Input id="mp-amount" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="5000" min="1" required /></div>
        <div><Label htmlFor="mp-vendor">Vendor (optional)</Label>
          <Select id="mp-vendor" value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}>
            <option value="">No vendor</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name} — {v.category.replace(/_/g, ' ')}</option>)}
          </Select></div>
        <div><Label htmlFor="mp-desc">Description / Notes</Label>
          <Input id="mp-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Catering deposit — 50% upfront" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="mp-name">Payer name</Label>
            <Input id="mp-name" value={form.payerName} onChange={e => setForm(f => ({ ...f, payerName: e.target.value }))} placeholder="Jane Doe" /></div>
          <div><Label htmlFor="mp-ref">M-Pesa ref</Label>
            <Input id="mp-ref" value={form.mpesaRef} onChange={e => setForm(f => ({ ...f, mpesaRef: e.target.value }))} placeholder="QHX7..." /></div>
        </div>
        <div><Label htmlFor="mp-status">Status</Label>
          <Select id="mp-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </Select></div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Record payment'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function OverallTab({ payments, events }: Readonly<{ payments: Payment[]; events: WeddingEvent[] }>) {
  const totalReceived = payments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)
  const pending = payments.filter(p => p.status === 'PENDING').length

  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent | null; payments: Payment[] }>()
    for (const e of events) map.set(e.id, { event: e, payments: [] })
    for (const p of payments) {
      const k = p.eventId ?? '__unassigned__'
      if (!map.has(k)) map.set(k, { event: null, payments: [] })
      map.get(k)!.payments.push(p)
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

export default function PaymentsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: payments = [], isLoading } = usePayments(wid)
  const [activeTab, setActiveTab] = useState('__overall__')
  const [showStk, setShowStk] = useState(false)
  const [showManual, setShowManual] = useState(false)

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/events`); if (!res.ok) throw new Error(); return res.json() },
    staleTime: 60_000,
  })

  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name }))]
  const activeEvent = events.find(e => e.id === activeTab)
  const eventPayments = useMemo(() =>
    activeEvent ? payments.filter(p => p.eventId === activeEvent.id) : [],
  [payments, activeEvent])
  const totalReceived = payments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-zinc-100 bg-white">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Finance</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Payments</h1>
            <div className="flex gap-2">
              <Button onClick={() => setShowManual(true)} size="sm" variant="secondary"><Plus size={14} /> Manual</Button>
              <Button onClick={() => setShowStk(true)} size="sm"><Phone size={14} /> STK Push</Button>
            </div>
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

      <div className="max-w-4xl mx-auto px-8 py-10">
        {isLoading ? <div className="flex justify-center py-16"><Spinner /></div> :
          activeTab === '__overall__'
            ? <OverallTab payments={payments} events={events} />
            : activeEvent
              ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-400">{eventPayments.length} payments for {activeEvent.name}</p>
                    <div className="flex gap-2">
                      <Button onClick={() => setShowManual(true)} size="sm" variant="secondary"><Plus size={14} /> Manual</Button>
                      <Button onClick={() => setShowStk(true)} size="sm"><Phone size={14} /> STK Push</Button>
                    </div>
                  </div>
                  {eventPayments.length === 0
                    ? <EmptyState icon={<DollarSign size={40} />} title="No payments for this event" description="Record M-Pesa or manual payments" />
                    : <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">{eventPayments.map(p => <PaymentRow key={p.id} p={p} />)}</div>}
                </div>
              )
              : null}
      </div>

      {showStk && <StkPushModal weddingId={wid} onClose={() => setShowStk(false)} />}
      {showManual && <AddManualPaymentModal weddingId={wid} eventId={activeEvent?.id} events={events} onClose={() => setShowManual(false)} />}
    </div>
  )
}
