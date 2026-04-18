'use client'
import { useState, useMemo } from 'react'
import { Button, Input, Label, Select, Modal, Badge, EmptyState, Spinner, ConfirmDialog } from '@/components/ui'
import { useInitiatePayment } from '@/hooks/use-payments'
import { useBudgetLines } from '@/hooks/use-data'
import { useToast } from '@/components/ui/toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Phone, Plus, AlertCircle, CheckCircle2, Clock, DollarSign, Trash2, AlertTriangle, Eye } from 'lucide-react'
import { format } from 'date-fns'
import type { Payment } from '@/hooks/use-payments'

export interface WeddingEvent { id: string; name: string }
export interface Vendor { id: string; name: string; category: string }
interface BudgetLineOption { id: string; serverId?: string; description: string; estimated: number; actual: number; vendorId?: string; vendorName?: string; eventId?: string }

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

export function PaymentRow({ p, onDelete, onView }: Readonly<{ p: Payment; onDelete?: (p: Payment) => void; onView?: (p: Payment) => void }>) {
  const Icon = STATUS_ICON[p.status] ?? Clock
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-[#1F4D3A]/8 last:border-0 px-6">
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
      <div className="flex items-center gap-1 flex-shrink-0">
        {onView && (
          <button onClick={() => onView(p)} className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40 hover:text-[#14161C]/70 transition-colors" aria-label="View payment">
            <Eye size={13} />
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#14161C]/40 hover:text-red-500 transition-colors" aria-label="Delete payment">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Payment Detail Modal ─────────────────────────────────────────────────────

export function PaymentDetailModal({ p, weddingId, onClose }: Readonly<{
  p: Payment; weddingId: string; onClose: () => void
}>) {
  // Load budget line info if linked
  const { data: budgetLines = [] } = useQuery<BudgetLineOption[]>({
    queryKey: ['budget', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/budget`); if (!res.ok) return []; return res.json() },
    staleTime: 0,
    enabled: !!p.budgetLineId,
  })
  const linkedLine = p.budgetLineId ? budgetLines.find((l: BudgetLineOption) => l.id === p.budgetLineId) : null

  const Icon = STATUS_ICON[p.status] ?? Clock

  return (
    <Modal onClose={onClose} title="Payment details">
      <div className="space-y-5">
        {/* Status + amount hero */}
        <div className={`rounded-2xl p-5 flex items-center gap-4 ${iconBg(p.status)} bg-opacity-10`}
          style={{ background: p.status === 'COMPLETED' ? 'rgb(236 253 245)' : p.status === 'PENDING' ? 'rgb(255 251 235)' : 'rgb(254 242 242)' }}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg(p.status)}`}>
            <Icon size={20} />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[#14161C] tabular-nums">{fmt(p.amount)}</p>
            <Badge variant={STATUS_BADGE[p.status] ?? 'pending'} className="mt-1">{p.status}</Badge>
          </div>
        </div>

        {/* Core details */}
        <div className="bg-[#F7F5F2] rounded-xl divide-y divide-[#1F4D3A]/8">
          {p.payerName && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-xs text-[#14161C]/50 font-medium">Paid by</span>
              <span className="text-sm font-semibold text-[#14161C]">{p.payerName}</span>
            </div>
          )}
          {p.payerPhone && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-xs text-[#14161C]/50 font-medium">Phone</span>
              <span className="text-sm font-semibold text-[#14161C]">{p.payerPhone}</span>
            </div>
          )}
          {p.description && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-xs text-[#14161C]/50 font-medium">Description</span>
              <span className="text-sm font-semibold text-[#14161C] text-right max-w-[60%]">{p.description}</span>
            </div>
          )}
          {p.mpesaRef && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-xs text-[#14161C]/50 font-medium">M-Pesa ref</span>
              <span className="text-sm font-mono font-semibold text-[#14161C]">{p.mpesaRef}</span>
            </div>
          )}
          <div className="flex justify-between px-4 py-3">
            <span className="text-xs text-[#14161C]/50 font-medium">Recorded</span>
            <span className="text-sm font-semibold text-[#14161C]">{format(new Date(p.createdAt), 'MMM d, yyyy · HH:mm')}</span>
          </div>
          {p.paymentDate && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-xs text-[#14161C]/50 font-medium">Payment date</span>
              <span className="text-sm font-semibold text-[#14161C]">{format(new Date(p.paymentDate), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {/* Linked budget line */}
        {linkedLine && (
          <div className="rounded-xl border border-[#1F4D3A]/10 overflow-hidden">
            <div className="px-4 py-2.5 bg-[#1F4D3A]/4 border-b border-[#1F4D3A]/8">
              <p className="text-xs font-bold text-[#1F4D3A]/60 uppercase tracking-widest">Linked budget item</p>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-sm font-semibold text-[#14161C]">{linkedLine.description}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-[#14161C]/40">Estimated</p>
                  <p className="font-bold text-[#14161C]">{fmt(linkedLine.estimated)}</p>
                </div>
                <div>
                  <p className="text-[#14161C]/40">Paid so far</p>
                  <p className="font-bold text-emerald-600">{fmt(linkedLine.actual)}</p>
                </div>
                <div>
                  <p className="text-[#14161C]/40">Remaining</p>
                  <p className={`font-bold ${linkedLine.estimated > linkedLine.actual ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {fmt(Math.max(0, linkedLine.estimated - linkedLine.actual))}
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-[#1F4D3A]/8 rounded-full h-1.5 mt-1">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, linkedLine.estimated > 0 ? (linkedLine.actual / linkedLine.estimated) * 100 : 0)}%` }}
                />
              </div>
              <p className="text-xs text-[#14161C]/40">
                This payment ({fmt(p.amount)}) is {linkedLine.estimated > 0 ? Math.round((p.amount / linkedLine.estimated) * 100) : 0}% of the estimated total
              </p>
            </div>
          </div>
        )}

        <Button variant="secondary" onClick={onClose} className="w-full">Close</Button>
      </div>
    </Modal>
  )
}

// ─── Unified Payment Modal ───────────────────────────────────────────────────

/**
 * Unified payment modal that consolidates QuickPayModal (budget) and AddManualPaymentModal (payments)
 * 
 * Usage:
 * - From budget page: Pass budgetLine prop for pre-populated context
 * - From payments page: Omit budgetLine prop to allow budget line selection
 */
export function PaymentModal({ weddingId, budgetLine, eventId, events, onClose }: Readonly<{
  weddingId: string
  budgetLine?: { id: string; serverId?: string; description: string; estimated: number; actual: number; vendorId?: string; vendorName?: string; eventId?: string }
  eventId?: string
  events: WeddingEvent[]
  onClose: () => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  
  // Calculate remaining if budget line provided
  const remaining = budgetLine ? Math.max(0, budgetLine.estimated - budgetLine.actual) : null
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>(
    remaining && remaining > 0 ? 'full' : 'partial'
  )
  
  const [form, setForm] = useState({
    amount: budgetLine ? String(remaining || budgetLine.estimated) : '',
    description: budgetLine?.description ?? '',
    payerName: '',
    mpesaRef: '',
    status: 'COMPLETED',
    selectedEventId: eventId ?? budgetLine?.eventId ?? '',
    vendorId: budgetLine?.vendorId ?? '',
    vendorNameOverride: budgetLine?.vendorName ?? '',
    budgetLineId: budgetLine ? (budgetLine.serverId ?? budgetLine.id) : '',
    paymentDate: new Date().toISOString().split('T')[0],
  })

  // Load vendors
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors', weddingId, 'select'],
    queryFn: async () => { 
      const res = await fetch(`/api/weddings/${weddingId}/vendors`)
      if (!res.ok) return []
      return res.json() as Promise<Vendor[]>
    },
    staleTime: 60_000,
  })

  // Load budget lines (only when no budgetLine prop provided)
  const { data: allBudgetLines = [] } = useQuery<BudgetLineOption[]>({
    queryKey: ['budget', weddingId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/budget`)
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 0,
    enabled: !budgetLine,
  })

  const activeEventId = form.selectedEventId || eventId
  const budgetLines: BudgetLineOption[] = useMemo(() =>
    activeEventId ? allBudgetLines.filter((l: BudgetLineOption) => l.eventId === activeEventId) : allBudgetLines,
  [allBudgetLines, activeEventId])

  const selectedLine: BudgetLineOption | undefined = budgetLine ?? budgetLines.find((l: BudgetLineOption) => l.id === form.budgetLineId)
  const selectedRemaining = selectedLine ? Math.max(0, selectedLine.estimated - selectedLine.actual) : null

  // When a budget line is selected (from dropdown), auto-fill fields
  const handleBudgetLineChange = (lineId: string) => {
    const line = budgetLines.find((l: BudgetLineOption) => l.id === lineId)
    if (!line) {
      setForm(f => ({ ...f, budgetLineId: '', vendorId: '', vendorNameOverride: '', description: '', amount: '' }))
      return
    }
    const rem = Math.max(0, line.estimated - line.actual)
    setForm(f => ({
      ...f,
      budgetLineId: line.serverId ?? line.id,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate vendor
    if (!form.vendorId && !form.vendorNameOverride.trim()) {
      toast('Please select a vendor or enter a vendor name', 'error')
      return
    }

    // Validate amount
    const amount = Number.parseFloat(form.amount)
    const { validatePaymentAmount } = await import('@/lib/payment-validation')
    const validation = validatePaymentAmount(amount)
    if (!validation.valid) {
      toast(validation.error ?? 'Invalid amount', 'error')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description: form.description || null,
          payerName: form.payerName || null,
          mpesaRef: form.mpesaRef || null,
          vendorId: form.vendorId || null,
          vendorNameOverride: !form.vendorId ? form.vendorNameOverride.trim() : null,
          status: form.status,
          eventId: form.selectedEventId || null,
          budgetLineId: form.budgetLineId || null,
          paymentDate: form.paymentDate || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to record payment')
      }

      await qc.invalidateQueries({ queryKey: ['payments', weddingId] })
      await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
      toast('Payment recorded', 'success')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to record payment', 'error')
    } finally {
      setSaving(false)
    }
  }

  const resolvedVendorName = budgetLine?.vendorName ?? vendors.find(v => v.id === form.vendorId)?.name

  return (
    <Modal onClose={onClose} title={budgetLine ? `Pay — ${budgetLine.description}` : 'Record manual payment'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Budget line summary (when pre-populated from budget page) */}
        {budgetLine && remaining !== null && (
          <div className="bg-[#F7F5F2] rounded-xl p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[#14161C]/55">Estimated</span>
              <span className="font-semibold">{fmt(budgetLine.estimated)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#14161C]/55">Already paid</span>
              <span className="font-semibold text-emerald-600">{fmt(budgetLine.actual)}</span>
            </div>
            <div className="flex justify-between border-t border-[#1F4D3A]/12 pt-1 mt-1">
              <span className="text-[#14161C]/55 font-semibold">Remaining</span>
              <span className={`font-bold ${remaining === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {fmt(remaining)}
              </span>
            </div>
          </div>
        )}

        {/* Event selector (only when not scoped to an event and no budget line) */}
        {!eventId && !budgetLine && (
          <div>
            <Label htmlFor="pm-event">Event (optional)</Label>
            <Select id="pm-event" value={form.selectedEventId} onChange={e => setForm(f => ({ ...f, selectedEventId: e.target.value, budgetLineId: '' }))}>
              <option value="">No specific event</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </Select>
          </div>
        )}

        {/* Budget line dropdown (only when no budget line prop provided) */}
        {!budgetLine && (
          <div>
            <Label htmlFor="pm-budget">Budget line (optional)</Label>
            <Select id="pm-budget" value={form.budgetLineId} onChange={e => handleBudgetLineChange(e.target.value)}>
              <option value="">No budget line</option>
              {budgetLines.map((l: BudgetLineOption) => {
                const rem = Math.max(0, l.estimated - l.actual)
                return (
                  <option key={l.id} value={l.id}>
                    {l.description} — {fmt(rem)} remaining
                  </option>
                )
              })}
            </Select>
            {selectedLine && selectedRemaining !== null && (
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
                  <span className={`font-bold ${selectedRemaining === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {fmt(selectedRemaining)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vendor — show if present, prompt if missing */}
        {resolvedVendorName ? (
          <div className="flex items-center gap-3 bg-[#1F4D3A]/6 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[#1F4D3A]/10 flex items-center justify-center text-xs font-bold text-[#1F4D3A] flex-shrink-0">
              {resolvedVendorName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#14161C]/40 font-medium">Vendor</p>
              <p className="text-sm font-semibold text-[#14161C] truncate">{resolvedVendorName}</p>
            </div>
          </div>
        ) : (
          <div>
            <Label htmlFor="pm-vendor">Vendor *</Label>
            <Select id="pm-vendor" value={form.vendorId} onChange={e => {
              const v = vendors.find(v => v.id === e.target.value)
              setForm(f => ({ ...f, vendorId: e.target.value, vendorNameOverride: v ? '' : f.vendorNameOverride }))
            }}>
              <option value="">— Type a name below —</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name} — {v.category.replaceAll('_', ' ')}</option>)}
            </Select>
            {!form.vendorId && (
              <Input
                className="mt-2"
                value={form.vendorNameOverride}
                onChange={e => setForm(f => ({ ...f, vendorNameOverride: e.target.value }))}
                placeholder="Vendor name e.g. Kamau Caterers"
                required={!form.vendorId}
              />
            )}
          </div>
        )}

        {/* Full / Partial toggle (only when budget line is selected) */}
        {selectedLine && (
          <div>
            <Label>Payment type</Label>
            <div className="flex gap-1 bg-[#1F4D3A]/6 p-1 rounded-xl mt-1">
              {(['full', 'partial'] as const).map(t => (
                <button key={t} type="button" onClick={() => handlePaymentTypeChange(t)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${paymentType === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-[#14161C]/55 hover:text-[#14161C]/70'}`}>
                  {t === 'full' ? `Full (${fmt(selectedRemaining ?? 0)})` : 'Partial'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Amount */}
        <div>
          <Label htmlFor="pm-amount">Amount (KES) *</Label>
          <Input
            id="pm-amount"
            type="number"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="5000"
            min="1"
            max="10000000"
            required
            readOnly={paymentType === 'full' && !!selectedLine}
          />
          {paymentType === 'full' && selectedLine && (
            <p className="text-xs text-[#14161C]/40 mt-1">
              Auto-filled from remaining balance. Switch to Partial to enter a custom amount.
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="pm-desc">Description / Notes</Label>
          <Input
            id="pm-desc"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="e.g. Catering deposit — 50% upfront"
          />
        </div>

        {/* Payer + M-Pesa ref */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pm-payer">Payer name</Label>
            <Input
              id="pm-payer"
              value={form.payerName}
              onChange={e => setForm(f => ({ ...f, payerName: e.target.value }))}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <Label htmlFor="pm-ref">M-Pesa ref</Label>
            <Input
              id="pm-ref"
              value={form.mpesaRef}
              onChange={e => setForm(f => ({ ...f, mpesaRef: e.target.value }))}
              placeholder="QHX7..."
            />
          </div>
        </div>

        {/* Payment date + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pm-date">Payment date</Label>
            <Input
              id="pm-date"
              type="date"
              value={form.paymentDate}
              onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="pm-status">Status</Label>
            <Select id="pm-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Record payment'}
          </Button>
        </div>
      </form>
    </Modal>
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

  // Load budget lines via shared hook (same cache as EventBudgetTab)
  const activeEventId = form.selectedEventId || eventId
  const { data: allBudgetLines = [] } = useBudgetLines(weddingId)

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
    e.preventDefault()
    if (!form.vendorId && !form.vendorNameOverride.trim()) {
      toast('Please select a vendor or enter a vendor name', 'error')
      return
    }
    setSaving(true)
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
          vendorNameOverride: !form.vendorId ? form.vendorNameOverride.trim() : null,
          status: form.status,
          eventId: form.selectedEventId || null,
          budgetLineId: form.budgetLineId || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to record payment')

      await qc.invalidateQueries({ queryKey: ['payments', weddingId] })
      await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
      toast('Payment recorded', 'success'); onClose()
    } catch { toast('Failed to record payment', 'error') } finally { setSaving(false) }
  }

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

        {/* Vendor — select existing or type a name */}
        <div>
          <Label htmlFor="mp-vendor">Vendor *</Label>
          <Select id="mp-vendor" value={form.vendorId} onChange={e => {
            const v = vendors.find(v => v.id === e.target.value)
            setForm(f => ({ ...f, vendorId: e.target.value, vendorNameOverride: v ? '' : f.vendorNameOverride }))
          }}>
            <option value="">— Type a name below —</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name} — {v.category.replaceAll('_', ' ')}</option>)}
          </Select>
          {!form.vendorId && (
            <Input
              className="mt-2"
              id="mp-vname"
              value={form.vendorNameOverride}
              onChange={e => setForm(f => ({ ...f, vendorNameOverride: e.target.value }))}
              placeholder="Vendor name e.g. Kamau Caterers"
              required={!form.vendorId}
            />
          )}
          {!form.vendorId && !form.vendorNameOverride && (
            <p className="text-xs text-amber-600 mt-1">Select a vendor above or type a name.</p>
          )}
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
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null)
  const [payingBudgetLine, setPayingBudgetLine] = useState<BudgetLineOption | null>(null)
  const qc = useQueryClient()
  const { toast } = useToast()

  // Load contributions to find payments linked via contributionId (contribution payments often have no eventId)
  const { data: allContributions = [] } = useQuery<{ id: string; eventId?: string }[]>({
    queryKey: ['contributions', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/contributions`); if (!res.ok) return []; return res.json() },
    staleTime: 60_000,
  })
  const eventContribIds = useMemo(() =>
    new Set(allContributions.filter(c => c.eventId === eventId).map(c => c.id)),
  [allContributions, eventId])

  const eventPayments = useMemo(() =>
    payments.filter(p =>
      p.eventId === eventId ||
      (p.contributionId != null && eventContribIds.has(p.contributionId))
    ),
  [payments, eventId, eventContribIds])
  const total = eventPayments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)
  const pendingPaymentsCount = eventPayments.filter(p => p.status === 'PENDING').length

  // Load budget lines to surface unpaid items as pending
  const { data: allBudgetLines = [] } = useBudgetLines(weddingId)
  const pendingBudgetItems = useMemo(() =>
    allBudgetLines.filter(l => l.eventId === eventId && l.estimated > l.actual),
  [allBudgetLines, eventId])

  const pendingCount = pendingPaymentsCount + pendingBudgetItems.length

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
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-[#14161C]/40">
          {eventPayments.length} payment{eventPayments.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowManual(true)}><Plus size={13} /> Manual</Button>
          <Button size="sm" onClick={() => setShowStk(true)}><Phone size={13} /> STK Push</Button>
        </div>
      </div>

      {/* Stats card */}
      {eventPayments.length > 0 && (
        <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white shadow-sm p-5 grid grid-cols-3 gap-0 divide-x divide-zinc-100">
          <div className="pr-6">
            <p className="text-[11px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-0.5">Received</p>
            <p className="text-xl font-extrabold text-emerald-600 font-heading tabular-nums">{fmt(total)}</p>
          </div>
          <div className="px-6">
            <p className="text-[11px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-0.5">Total</p>
            <p className="text-xl font-extrabold text-[#14161C] font-heading tabular-nums">{eventPayments.length}</p>
          </div>
          <div className="pl-6">
            <p className="text-[11px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-0.5">Pending</p>
            <p className={`text-xl font-extrabold font-heading tabular-nums ${pendingCount > 0 ? 'text-amber-500' : 'text-[#14161C]/30'}`}>{pendingCount}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {eventPayments.length > 0 && (
        <div className="flex gap-1 bg-[#F7F5F2] rounded-xl p-1 w-fit">
          {([
            { key: 'all', label: 'All', count: eventPayments.length },
            { key: 'pending', label: 'Pending', count: pendingCount },
            { key: 'completed', label: 'Completed', count: eventPayments.filter(p => p.status === 'COMPLETED').length },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${filter === f.key ? 'bg-white text-[#14161C] shadow-sm' : 'text-[#14161C]/40 hover:text-[#14161C]/70'}`}>
              {f.label}
              <span className={`text-[11px] rounded-full px-1.5 py-0.5 font-bold ${filter === f.key ? 'bg-[#1F4D3A]/8 text-[#1F4D3A]' : 'text-[#14161C]/30'}`}>{f.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Outstanding budget items */}
      {(filter === 'all' || filter === 'pending') && pendingBudgetItems.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-100 bg-amber-50/60">
            <AlertTriangle size={11} className="text-amber-500" />
            <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">Outstanding from budget</p>
          </div>
          {pendingBudgetItems.map(l => (
            <div key={l.id} className="flex items-center gap-4 py-3.5 px-5 border-b border-[#1F4D3A]/6 last:border-0 hover:bg-[#F7F5F2]/60 transition-colors">
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
              <Button size="sm" variant="secondary" onClick={() => setPayingBudgetLine(l)} className="flex-shrink-0 text-xs">
                <Plus size={11} /> Pay
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Payment list */}
      {filtered.length === 0 && pendingBudgetItems.length === 0
        ? <EmptyState icon={<DollarSign size={32} className="text-[#14161C]/15" />} title="No payments" description="Record M-Pesa or manual payments for this event" />
        : filtered.length > 0
          ? <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white shadow-sm overflow-hidden">
              {filtered.map(p => <PaymentRow key={p.id} p={p} onView={setViewingPayment} onDelete={setConfirmDelete} />)}
            </div>
          : null}

      {showManual && <PaymentModal weddingId={weddingId} eventId={eventId} events={events} onClose={() => { setShowManual(false); refresh() }} />}
      {payingBudgetLine && <PaymentModal weddingId={weddingId} budgetLine={payingBudgetLine} events={events} onClose={() => { setPayingBudgetLine(null); refresh() }} />}
      {showStk && <StkPushModal weddingId={weddingId} onClose={() => { setShowStk(false); refresh() }} />}
      {viewingPayment && <PaymentDetailModal p={viewingPayment} weddingId={weddingId} onClose={() => setViewingPayment(null)} />}
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
