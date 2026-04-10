'use client'
import { useState, useMemo } from 'react'
import { Button, Input, Label, Select, Modal, Badge, EmptyState, Spinner } from '@/components/ui'
import { useInitiatePayment, usePayments } from '@/hooks/use-payments'
import { useToast } from '@/components/ui/toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Phone, Plus, AlertCircle, CheckCircle2, Clock, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import type { Payment } from '@/hooks/use-payments'

export interface WeddingEvent { id: string; name: string }
export interface Vendor { id: string; name: string; category: string }

interface BudgetLine {
  id: string; description: string; category: string; estimated: number
  actual: number; committed: number; vendorId?: string | null; vendorName?: string | null
  eventId?: string | null
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

export const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

const STATUS_BADGE: Record<string, 'confirmed' | 'pending' | 'declined' | 'maybe'> = {
  COMPLETED: 'confirmed', PENDING: 'pending', FAILED: 'declined',
  DISPUTED: 'declined', DUPLICATE: 'maybe', REFUNDED: 'maybe',
}
const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  COMPLETED: CheckCircle2, PENDING: Clock, FAILED: AlertCircle,
  DISPUTED: AlertCircle, DUPLICATE: AlertCircle, REFUNDED: CheckCircle2,
}

function iconBg(status: string) {
  if (status === 'COMPLETED') return 'bg-emerald-50 text-emerald-600'
  if (status === 'DISPUTED' || status === 'FAILED') return 'bg-red-50 text-red-500'
  return 'bg-zinc-100 text-zinc-400'
}

// ─── Payment Row ──────────────────────────────────────────────────────────────

export function PaymentRow({ p }: Readonly<{ p: Payment }>) {
  const Icon = STATUS_ICON[p.status] ?? Clock
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-zinc-100 last:border-0 px-6">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg(p.status)}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#14161C]">{p.payerName ?? p.payerPhone ?? 'Unknown payer'}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {p.mpesaRef && <span className="text-xs text-zinc-400 font-mono">{p.mpesaRef}</span>}
          {p.description && <span className="text-xs text-zinc-400 truncate max-w-48">{p.description}</span>}
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

// ─── STK Push Modal ───────────────────────────────────────────────────────────

export function StkPushModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const initiate = useInitiatePayment(weddingId)
  const { toast } = useToast()
  const [form, setForm] = useState({ phone: '', amount: '', description: '' })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    void (async () => {
      try {
        await initiate.mutateAsync({ weddingId, phone: form.phone, amount: Number.parseFloat(form.amount), description: form.description || undefined })
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

// ─── Add Manual Payment Modal (rich version) ──────────────────────────────────

export function AddManualPaymentModal({ weddingId, eventId, events, onClose }: Readonly<{
  weddingId: string; eventId?: string; events: WeddingEvent[]; onClose: () => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full')
  const [form, setForm] = useState({
    amount: '', description: '', payerName: '', mpesaRef: '', status: 'COMPLETED',
    selectedEventId: eventId ?? '', vendorId: '', vendorNameOverride: '',
    budgetLineId: '',
  })

  // Load vendors
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors', weddingId, 'select'],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/vendors`); if (!res.ok) return []; return res.json() as Promise<Vendor[]> },
    staleTime: 60_000,
  })

  // Load budget lines (filtered by event if set)
  const activeEventId = form.selectedEventId || eventId
  const { data: allBudgetLines = [] } = useQuery<BudgetLine[]>({
    queryKey: ['budget', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/budget`); if (!res.ok) return []; return res.json() as Promise<BudgetLine[]> },
    staleTime: 30_000,
  })

  const budgetLines = useMemo(() =>
    activeEventId ? allBudgetLines.filter(l => l.eventId === activeEventId) : allBudgetLines,
  [allBudgetLines, activeEventId])

  const selectedLine = budgetLines.find(l => l.id === form.budgetLineId)
  const remaining = selectedLine ? Math.max(0, selectedLine.estimated - selectedLine.actual - selectedLine.committed) : null

  // When a budget line is selected, auto-fill fields
  const handleBudgetLineChange = (lineId: string) => {
    const line = budgetLines.find(l => l.id === lineId)
    if (!line) {
      setForm(f => ({ ...f, budgetLineId: '', vendorId: '', vendorNameOverride: '', description: '', amount: '' }))
      return
    }
    const rem = Math.max(0, line.estimated - line.actual - line.committed)
    setForm(f => ({
      ...f,
      budgetLineId: lineId,
      vendorId: line.vendorId ?? '',
      vendorNameOverride: line.vendorName ?? '',
      description: line.description,
      amount: paymentType === 'full' ? String(rem || line.estimated) : f.amount,
    }))
  }

  // When payment type changes, update amount from selected line
  const handlePaymentTypeChange = (type: 'full' | 'partial') => {
    setPaymentType(type)
    if (type === 'full' && selectedLine) {
      const rem = Math.max(0, selectedLine.estimated - selectedLine.actual - selectedLine.committed)
      setForm(f => ({ ...f, amount: String(rem || selectedLine.estimated) }))
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const amount = Number.parseFloat(form.amount)
      const res = await fetch(`/api/weddings/${weddingId}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description: form.description || null,
          payerName: form.payerName || null,
          mpesaRef: form.mpesaRef || null,
          vendorId: form.vendorId || null,
          vendorName: form.vendorNameOverride || null,
          status: form.status,
          eventId: form.selectedEventId || null,
          budgetLineId: form.budgetLineId || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to record payment')

      // If linked to a budget line, update its actual amount
      if (form.budgetLineId && selectedLine) {
        await fetch(`/api/weddings/${weddingId}/budget/${form.budgetLineId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actual: selectedLine.actual + amount }),
        })
        await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
      }

      await qc.invalidateQueries({ queryKey: ['payments', weddingId] })
      toast('Payment recorded', 'success'); onClose()
    } catch { toast('Failed to record payment', 'error') } finally { setSaving(false) }
  }

  const resolvedVendorName = vendors.find(v => v.id === form.vendorId)?.name

  return (
    <Modal onClose={onClose} title="Record manual payment">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Event selector (only when not scoped to an event) */}
        {!eventId && (
          <div><Label htmlFor="mp-event">Event (optional)</Label>
            <Select id="mp-event" value={form.selectedEventId} onChange={e => setForm(f => ({ ...f, selectedEventId: e.target.value, budgetLineId: '' }))}>
              <option value="">No specific event</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </Select></div>
        )}

        {/* Budget line dropdown */}
        <div>
          <Label htmlFor="mp-budget">Budget line (optional)</Label>
          <Select id="mp-budget" value={form.budgetLineId} onChange={e => handleBudgetLineChange(e.target.value)}>
            <option value="">No budget line</option>
            {budgetLines.map(l => {
              const rem = Math.max(0, l.estimated - l.actual - l.committed)
              return (
                <option key={l.id} value={l.id}>
                  {l.description} — {fmt(rem)} remaining
                </option>
              )
            })}
          </Select>
          {selectedLine && (
            <div className="mt-2 bg-zinc-50 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Estimated</span>
                <span className="font-semibold">{fmt(selectedLine.estimated)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Already paid</span>
                <span className="font-semibold text-emerald-600">{fmt(selectedLine.actual)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-1 mt-1">
                <span className="text-zinc-500 font-semibold">Remaining</span>
                <span className={`font-bold ${remaining === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>{fmt(remaining ?? 0)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Full / Partial toggle */}
        {selectedLine && (
          <div>
            <Label>Payment type</Label>
            <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl mt-1">
              {(['full', 'partial'] as const).map(t => (
                <button key={t} type="button" onClick={() => handlePaymentTypeChange(t)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${paymentType === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                  {t === 'full' ? `Full (${fmt(remaining ?? 0)})` : 'Partial'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Amount */}
        <div><Label htmlFor="mp-amount">Amount (KES) *</Label>
          <Input id="mp-amount" type="number" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="5000" min="1" required
            readOnly={paymentType === 'full' && !!selectedLine} />
          {paymentType === 'full' && selectedLine && (
            <p className="text-xs text-zinc-400 mt-1">Auto-filled from remaining balance. Switch to Partial to enter a custom amount.</p>
          )}
        </div>

        {/* Vendor — dropdown + name override */}
        <div className="space-y-2">
          <div><Label htmlFor="mp-vendor">Vendor (optional)</Label>
            <Select id="mp-vendor" value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}>
              <option value="">No vendor</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name} — {v.category.replaceAll('_', ' ')}</option>)}
            </Select></div>
          <div>
            <Label htmlFor="mp-vname">
              Vendor name override
              {resolvedVendorName && <span className="text-zinc-400 font-normal ml-1">(linked: {resolvedVendorName})</span>}
            </Label>
            <Input id="mp-vname" value={form.vendorNameOverride}
              onChange={e => setForm(f => ({ ...f, vendorNameOverride: e.target.value }))}
              placeholder={resolvedVendorName ?? 'Override or enter vendor name'} />
            <p className="text-xs text-zinc-400 mt-0.5">Leave blank to use the linked vendor name, or type to override.</p>
          </div>
        </div>

        {/* Description */}
        <div><Label htmlFor="mp-desc">Description / Notes</Label>
          <Input id="mp-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Catering deposit — 50% upfront" /></div>

        {/* Payer + M-Pesa ref */}
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="mp-name">Payer name</Label>
            <Input id="mp-name" value={form.payerName} onChange={e => setForm(f => ({ ...f, payerName: e.target.value }))} placeholder="Jane Doe" /></div>
          <div><Label htmlFor="mp-ref">M-Pesa ref</Label>
            <Input id="mp-ref" value={form.mpesaRef} onChange={e => setForm(f => ({ ...f, mpesaRef: e.target.value }))} placeholder="QHX7..." /></div>
        </div>

        {/* Status */}
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

// ─── Event Payments Tab (shared between event detail + payments page) ─────────

export function EventPaymentsTab({ weddingId, eventId, events, payments, isLoading }: Readonly<{
  weddingId: string; eventId: string; events: WeddingEvent[]
  payments: Payment[]; isLoading: boolean
}>) {
  const [showManual, setShowManual] = useState(false)
  const [showStk, setShowStk] = useState(false)
  const qc = useQueryClient()

  const eventPayments = useMemo(() => payments.filter(p => p.eventId === eventId), [payments, eventId])
  const total = eventPayments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)
  const pending = eventPayments.filter(p => p.status === 'PENDING').length

  const refresh = () => void qc.invalidateQueries({ queryKey: ['payments', weddingId] })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">{eventPayments.length} payment{eventPayments.length !== 1 ? 's' : ''}</p>
          {eventPayments.length > 0 && (
            <div className="flex gap-4 mt-0.5">
              <p className="text-xs font-bold text-emerald-600">{fmt(total)} received</p>
              {pending > 0 && <p className="text-xs font-bold text-amber-500">{pending} pending</p>}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowManual(true)}><Plus size={13} /> Manual</Button>
          <Button size="sm" onClick={() => setShowStk(true)}><Phone size={13} /> STK Push</Button>
        </div>
      </div>
      {eventPayments.length === 0
        ? <EmptyState icon={<DollarSign size={32} className="text-zinc-200" />} title="No payments" description="Record M-Pesa or manual payments for this event" />
        : <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
            {eventPayments.map(p => <PaymentRow key={p.id} p={p} />)}
          </div>}
      {showManual && <AddManualPaymentModal weddingId={weddingId} eventId={eventId} events={events} onClose={() => { setShowManual(false); refresh() }} />}
      {showStk && <StkPushModal weddingId={weddingId} onClose={() => { setShowStk(false); refresh() }} />}
    </div>
  )
}
