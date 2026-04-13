'use client'
import { useState, useMemo } from 'react'
import { Button, Input, Label, Select, Modal, Badge, EmptyState, Spinner, ConfirmDialog } from '@/components/ui'
import { useInitiatePayment } from '@/hooks/use-payments'
import { useToast } from '@/components/ui/toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Phone, Plus, AlertCircle, CheckCircle2, Clock, DollarSign, Trash2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import type { Payment } from '@/hooks/use-payments'

export interface WeddingEvent { id: string; name: string }
export interface Vendor { id: string; name: string; category: string }

interface BudgetLine {
  id: string; description: string; category: string; estimated: number
  actual: number; vendorId?: string | null; vendorName?: string | null
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
  return 'bg-[#1F4D3A]/6 text-[#14161C]/40'
}

// ─── Payment Row ──────────────────────────────────────────────────────────────

export function PaymentRow({ p, onDelete }: Readonly<{ p: Payment; onDelete?: (p: Payment) => void }>) {
  const Icon = STATUS_ICON[p.status] ?? Clock
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-[#1F4D3A]/8 last:border-0 px-6 group">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg(p.status)}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#14161C]">{p.payerName ?? p.payerPhone ?? 'Unknown payer'}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {p.mpesaRef && <span className="text-xs text-[#14161C]/40 font-mono">{p.mpesaRef}</span>}
          {p.description && <span className="text-xs text-[#14161C]/40 truncate max-w-48">{p.description}</span>}
          <span className="text-xs text-[#14161C]/40">{format(new Date(p.createdAt), 'MMM d, HH:mm')}</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-[#14161C]">{fmt(p.amount)}</p>
        <Badge variant={STATUS_BADGE[p.status] ?? 'pending'} className="mt-1">{p.status}</Badge>
      </div>
      {onDelete && (
        <button onClick={() => onDelete(p)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-[#14161C]/25 hover:text-red-500 transition-all flex-shrink-0" aria-label="Delete payment">
          <Trash2 size={13} />
        </button>
      )}
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
          <p className="text-xs text-[#14161C]/40 mt-1">Format: 254XXXXXXXXX (no +)</p></div>
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
    budgetLineId: '', paymentDate: new Date().toISOString().split('T')[0],
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
  const remaining = selectedLine ? Math.max(0, selectedLine.estimated - selectedLine.actual) : null

  // When a budget line is selected, auto-fill fields
  const handleBudgetLineChange = (lineId: string) => {
    const line = budgetLines.find(l => l.id === lineId)
    if (!line) {
      setForm(f => ({ ...f, budgetLineId: '', vendorId: '', vendorNameOverride: '', description: '', amount: '' }))
      return
    }
    const rem = Math.max(0, line.estimated - line.actual)
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
      const rem = Math.max(0, selectedLine.estimated - selectedLine.actual)
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
      await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
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
              const rem = Math.max(0, l.estimated - l.actual)
              return (
                <option key={l.id} value={l.id}>
                  {l.description} — {fmt(rem)} remaining
                </option>
              )
            })}
          </Select>
          {selectedLine && (
            <div className="mt-2 bg-[#F7F5F2] rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#14161C]/55">Estimated</span>
                <span className="font-semibold">{fmt(selectedLine.estimated)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#14161C]/55">Already paid</span>
                <span className="font-semibold text-emerald-600">{fmt(selectedLine.actual)}</span>
              </div>
              <div className="flex justify-between border-t border-[#1F4D3A]/12 pt-1 mt-1">
                <span className="text-[#14161C]/55 font-semibold">Remaining</span>
                <span className={`font-bold ${remaining === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>{fmt(remaining ?? 0)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Full / Partial toggle */}
        {selectedLine && (
          <div>
            <Label>Payment type</Label>
            <div className="flex gap-1 bg-[#1F4D3A]/6 p-1 rounded-xl mt-1">
              {(['full', 'partial'] as const).map(t => (
                <button key={t} type="button" onClick={() => handlePaymentTypeChange(t)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${paymentType === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-[#14161C]/55 hover:text-[#14161C]/70'}`}>
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
            <p className="text-xs text-[#14161C]/40 mt-1">Auto-filled from remaining balance. Switch to Partial to enter a custom amount.</p>
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
              {resolvedVendorName && <span className="text-[#14161C]/40 font-normal ml-1">(linked: {resolvedVendorName})</span>}
            </Label>
            <Input id="mp-vname" value={form.vendorNameOverride}
              onChange={e => setForm(f => ({ ...f, vendorNameOverride: e.target.value }))}
              placeholder={resolvedVendorName ?? 'Override or enter vendor name'} />
            <p className="text-xs text-[#14161C]/40 mt-0.5">Leave blank to use the linked vendor name, or type to override.</p>
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

        <div><Label htmlFor="mp-pdate">Payment date</Label>
          <Input id="mp-pdate" type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} /></div>

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
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [confirmDelete, setConfirmDelete] = useState<Payment | null>(null)
  const qc = useQueryClient()
  const { toast } = useToast()

  const eventPayments = useMemo(() => payments.filter(p => p.eventId === eventId), [payments, eventId])
  const total = eventPayments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)
  const pendingCount = eventPayments.filter(p => p.status === 'PENDING').length

  // Load budget lines to surface unpaid items as pending
  const { data: allBudgetLines = [] } = useQuery<BudgetLine[]>({
    queryKey: ['budget', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/budget`); if (!res.ok) return []; return res.json() as Promise<BudgetLine[]> },
    staleTime: 30_000,
  })
  const pendingBudgetItems = useMemo(() =>
    allBudgetLines.filter(l => l.eventId === eventId && l.estimated > l.actual),
  [allBudgetLines, eventId])

  const filtered = useMemo(() => {
    if (filter === 'pending') return eventPayments.filter(p => p.status === 'PENDING')
    if (filter === 'completed') return eventPayments.filter(p => p.status === 'COMPLETED')
    return eventPayments
  }, [eventPayments, filter])

  const handleDelete = async (p: Payment) => {
    try {
      await fetch(`/api/weddings/${weddingId}/payments/${p.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['payments', weddingId] })
      toast('Payment deleted', 'success')
    } catch { toast('Failed to delete payment', 'error') }
    setConfirmDelete(null)
  }

  const refresh = () => void qc.invalidateQueries({ queryKey: ['payments', weddingId] })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-[#14161C]/55">{eventPayments.length} payment{eventPayments.length !== 1 ? 's' : ''}</p>
          {eventPayments.length > 0 && (
            <div className="flex gap-4 mt-0.5">
              <p className="text-xs font-bold text-emerald-600">{fmt(total)} received</p>
              {pendingCount > 0 && <p className="text-xs font-bold text-amber-500">{pendingCount} pending</p>}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowManual(true)}><Plus size={13} /> Manual</Button>
          <Button size="sm" onClick={() => setShowStk(true)}><Phone size={13} /> STK Push</Button>
        </div>
      </div>

      {/* Filter tabs */}
      {eventPayments.length > 0 && (
        <div className="flex gap-1 bg-[#1F4D3A]/6 p-1 rounded-xl w-fit">
          {(['all', 'pending', 'completed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${filter === f ? 'bg-white text-[#14161C] shadow-sm' : 'text-[#14161C]/55 hover:text-[#14161C]/70'}`}>
              {f === 'all' ? `All (${eventPayments.length})` : f === 'pending' ? `Pending (${eventPayments.filter(p => p.status === 'PENDING').length})` : `Completed (${eventPayments.filter(p => p.status === 'COMPLETED').length})`}
            </button>
          ))}
        </div>
      )}

      {/* Pending budget items */}
      {(filter === 'all' || filter === 'pending') && pendingBudgetItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest flex items-center gap-1.5"><AlertTriangle size={11} className="text-amber-400" /> Outstanding from budget</p>
          <div className="bg-amber-50 rounded-2xl border border-amber-100 overflow-hidden">
            {pendingBudgetItems.map(l => (
              <div key={l.id} className="flex items-center gap-4 py-3 px-5 border-b border-amber-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#14161C]">{l.description}</p>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-xs text-[#14161C]/55">{l.category.replaceAll('_', ' ')}</span>
                    {l.vendorName && <span className="text-xs text-[#1F4D3A]/70">{l.vendorName}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-amber-600">{fmt(l.estimated - l.actual)} due</p>
                  <p className="text-xs text-[#14161C]/40">{fmt(l.actual)} of {fmt(l.estimated)} paid</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setShowManual(true)} className="flex-shrink-0 text-xs">
                  <Plus size={11} /> Pay
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && pendingBudgetItems.length === 0
        ? <EmptyState icon={<DollarSign size={32} className="text-[#14161C]/15" />} title="No payments" description="Record M-Pesa or manual payments for this event" />
        : filtered.length > 0
          ? <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
              {filtered.map(p => <PaymentRow key={p.id} p={p} onDelete={setConfirmDelete} />)}
            </div>
          : null}

      {showManual && <AddManualPaymentModal weddingId={weddingId} eventId={eventId} events={events} onClose={() => { setShowManual(false); refresh() }} />}
      {showStk && <StkPushModal weddingId={weddingId} onClose={() => { setShowStk(false); refresh() }} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete payment?"
          description={`${fmt(confirmDelete.amount)} from ${confirmDelete.payerName ?? 'unknown'} will be removed.`}
          confirmLabel="Delete"
          onConfirm={() => void handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
