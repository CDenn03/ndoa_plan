'use client'
import { useState, useMemo } from 'react'
import { Users, Plus, Pencil, Trash2, ChevronDown, ChevronUp, CreditCard, Phone } from 'lucide-react'
import { Button, Input, Label, Select, Modal, Badge, EmptyState, Spinner, ProgressBar } from '@/components/ui'
import { useContributions, useInitiatePayment } from '@/hooks/use-payments'
import { useToast } from '@/components/ui/toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import type { Contribution } from '@/hooks/use-payments'

export type { Contribution }
export interface WeddingEvent { id: string; name: string; type?: string; date?: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

type ContribStatus = 'PLEDGED' | 'PARTIAL' | 'FULFILLED' | 'OVERDUE' | 'CANCELLED'

function deriveStatus(pledgeAmount: number, paidAmount: number, dueDate: string, currentStatus: ContribStatus): ContribStatus {
  if (currentStatus === 'CANCELLED') return 'CANCELLED'
  if (pledgeAmount <= 0) return 'PLEDGED'
  if (paidAmount >= pledgeAmount) return 'FULFILLED'
  if (paidAmount > 0) return 'PARTIAL'
  if (dueDate && new Date(dueDate) < new Date()) return 'OVERDUE'
  return 'PLEDGED'
}

const STATUS_BADGE: Record<string, 'confirmed' | 'declined' | 'pending' | 'maybe'> = {
  FULFILLED: 'confirmed', OVERDUE: 'declined', PLEDGED: 'pending', PARTIAL: 'maybe', CANCELLED: 'declined',
}

function barColor(s: string) {
  if (s === 'FULFILLED') return 'bg-emerald-400'
  if (s === 'OVERDUE') return 'bg-red-400'
  return 'bg-[#CDB5F7]'
}

interface Payment {
  id: string; amount: number; status: string; description?: string
  payerName?: string; mpesaRef?: string; createdAt: string
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────

function RecordPaymentModal({ weddingId, contrib, onClose }: Readonly<{
  weddingId: string; contrib: Contribution; onClose: () => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const initiate = useInitiatePayment(weddingId)
  const outstanding = Math.max(0, contrib.pledgeAmount - contrib.paidAmount)

  const [mode, setMode] = useState<'manual' | 'mpesa'>('manual')
  const [amount, setAmount] = useState(String(outstanding || ''))
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleManual = async (e: React.FormEvent) => {
    e.preventDefault()
    const paid = Number.parseFloat(amount)
    if (!paid || paid <= 0) return
    setSaving(true)
    try {
      const newPaid = contrib.paidAmount + paid
      const newStatus = deriveStatus(contrib.pledgeAmount, newPaid, contrib.dueDate ?? '', contrib.status as ContribStatus)

      // Record a payment entry
      await fetch(`/api/weddings/${weddingId}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paid, status: 'COMPLETED', description: notes || `Payment from ${contrib.memberName}`,
          payerName: contrib.memberName, contributionId: contrib.id,
          idempotencyKey: `contrib-${contrib.id}-${Date.now()}`,
        }),
      })

      // Update contribution paidAmount + status
      await fetch(`/api/weddings/${weddingId}/contributions/${contrib.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidAmount: newPaid, status: newStatus }),
      })

      await qc.invalidateQueries({ queryKey: ['contributions', weddingId] })
      await qc.invalidateQueries({ queryKey: ['payments', weddingId] })
      await qc.invalidateQueries({ queryKey: ['contrib-payments', contrib.id] })
      toast('Payment recorded', 'success')
      onClose()
    } catch { toast('Failed to record payment', 'error') }
    finally { setSaving(false) }
  }

  const handleMpesa = async (e: React.FormEvent) => {
    e.preventDefault()
    const paid = Number.parseFloat(amount)
    if (!paid || !phone) return
    try {
      await initiate.mutateAsync({
        weddingId,
        phone, amount: paid,
        description: notes || `Contribution from ${contrib.memberName}`,
        contributionId: contrib.id,
      })
      toast('STK Push sent', 'success')
      onClose()
    } catch { toast('Failed to initiate M-Pesa', 'error') }
  }

  return (
    <Modal onClose={onClose} title={`Record payment — ${contrib.memberName}`}>
      <div className="space-y-4">
        {/* Outstanding summary */}
        <div className="bg-zinc-50 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Pledge</p>
            <p className="text-sm font-bold text-[#14161C]">{fmt(contrib.pledgeAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Paid so far</p>
            <p className="text-sm font-bold text-emerald-600">{fmt(contrib.paidAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Outstanding</p>
            <p className={`text-sm font-bold ${outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmt(outstanding)}</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
          <button onClick={() => setMode('manual')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${mode === 'manual' ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500'}`}>
            <CreditCard size={13} /> Manual
          </button>
          <button onClick={() => setMode('mpesa')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${mode === 'mpesa' ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500'}`}>
            <Phone size={13} /> M-Pesa STK
          </button>
        </div>

        {mode === 'manual' ? (
          <form onSubmit={handleManual} className="space-y-3">
            <div><Label htmlFor="rp-amount">Amount (KES) *</Label>
              <Input id="rp-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" max={String(outstanding || undefined)} required /></div>
            <div><Label htmlFor="rp-notes">Notes</Label>
              <Input id="rp-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Cash payment" /></div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Record payment'}</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleMpesa} className="space-y-3">
            <div><Label htmlFor="rp-phone">Phone (254XXXXXXXXX) *</Label>
              <Input id="rp-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="254712345678" required /></div>
            <div><Label htmlFor="rp-mpesa-amount">Amount (KES) *</Label>
              <Input id="rp-mpesa-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" required /></div>
            <div><Label htmlFor="rp-mpesa-notes">Description</Label>
              <Input id="rp-mpesa-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Contribution payment" /></div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={initiate.isPending}>
                {initiate.isPending ? 'Sending…' : 'Send STK Push'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}

// ─── Payment History ──────────────────────────────────────────────────────────

function PaymentHistory({ weddingId, contribId }: Readonly<{ weddingId: string; contribId: string }>) {
  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ['contrib-payments', contribId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/payments`)
      if (!res.ok) throw new Error()
      const all = await res.json() as (Payment & { contributionId?: string })[]
      return all.filter(p => p.contributionId === contribId && p.status !== 'FAILED')
    },
    staleTime: 30_000,
  })

  if (isLoading) return <div className="py-2 flex justify-center"><Spinner size="sm" /></div>
  if (payments.length === 0) return <p className="text-xs text-zinc-400 py-2 px-6">No payments recorded yet.</p>

  return (
    <div className="px-6 pb-3 space-y-1.5">
      {payments.map(p => (
        <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-50 last:border-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-zinc-500">{format(new Date(p.createdAt), 'MMM d, yyyy')}</span>
            {p.description && <span className="text-zinc-400 truncate max-w-32">{p.description}</span>}
            {p.mpesaRef && <span className="font-mono text-violet-500">{p.mpesaRef}</span>}
          </div>
          <span className="font-bold text-emerald-600">{fmt(p.amount)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Contribution Row ─────────────────────────────────────────────────────────

export function ContribRow({ contrib, weddingId, events, onEdit }: Readonly<{
  contrib: Contribution; weddingId: string; events: WeddingEvent[]; onEdit: (c: Contribution) => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [showPayment, setShowPayment] = useState(false)

  const pct = contrib.pledgeAmount > 0 ? Math.round((contrib.paidAmount / contrib.pledgeAmount) * 100) : 0
  const eventName = events.find(e => e.id === contrib.eventId)?.name
  const outstanding = Math.max(0, contrib.pledgeAmount - contrib.paidAmount)
  const isDirect = contrib.status === 'FULFILLED' && contrib.pledgeAmount === contrib.paidAmount

  const handleDelete = async () => {
    if (!confirm(`Delete ${contrib.memberName}'s pledge?`)) return
    try {
      await fetch(`/api/weddings/${weddingId}/contributions/${contrib.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['contributions', weddingId] })
      toast('Pledge deleted', 'success')
    } catch { toast('Failed to delete', 'error') }
  }

  return (
    <>
      <div className={`border-b border-zinc-100 last:border-0 ${expanded ? 'bg-zinc-50/50' : ''}`}>
        {/* Main row */}
        <div className="group flex items-center gap-4 py-3.5 px-6">
          <div className="w-9 h-9 rounded-full bg-[#CDB5F7]/20 flex items-center justify-center text-xs font-bold text-violet-600 flex-shrink-0">
            {contrib.memberName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-[#14161C]">{contrib.memberName}</p>
              {isDirect && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5">Direct</span>}
              {eventName && <span className="text-[10px] text-violet-500 bg-violet-50 rounded-full px-1.5 py-0.5">{eventName}</span>}
              <Badge variant={STATUS_BADGE[contrib.status] ?? 'pending'}>{contrib.status}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 bg-zinc-100 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full transition-all ${barColor(contrib.status)}`} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <span className="text-xs text-zinc-400 whitespace-nowrap">{pct}%</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-[#14161C]">{fmt(contrib.paidAmount)} <span className="text-zinc-400 font-normal text-xs">/ {fmt(contrib.pledgeAmount)}</span></p>
            {contrib.dueDate && <p className={`text-xs mt-0.5 ${contrib.status === 'OVERDUE' ? 'text-red-500 font-semibold' : 'text-zinc-400'}`}>Due {format(new Date(contrib.dueDate), 'MMM d')}</p>}
            {outstanding > 0 && <p className="text-xs text-amber-600 font-medium">{fmt(outstanding)} left</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {outstanding > 0 && (
              <button onClick={() => setShowPayment(true)}
                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors"
                aria-label="Record payment">
                + Pay
              </button>
            )}
            <button onClick={() => onEdit(contrib)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors" aria-label="Edit"><Pencil size={13} /></button>
            <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors" aria-label="Delete"><Trash2 size={13} /></button>
            <button onClick={() => setExpanded(v => !v)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors" aria-label="Toggle history">
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* Payment history */}
        {expanded && <PaymentHistory weddingId={weddingId} contribId={contrib.id} />}
      </div>

      {showPayment && (
        <RecordPaymentModal weddingId={weddingId} contrib={contrib} onClose={() => setShowPayment(false)} />
      )}
    </>
  )
}

// ─── Direct Contribution Modal (unpledged giving) ────────────────────────────

export function DirectContributionModal({ weddingId, events, eventId, onClose }: Readonly<{
  weddingId: string; events: WeddingEvent[]; eventId?: string; onClose: () => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const initiate = useInitiatePayment(weddingId)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'manual' | 'mpesa'>('manual')
  const [form, setForm] = useState({
    memberName: '',
    amount: '',
    phone: '',
    notes: '',
    eventId: eventId ?? '',
  })

  const handleManual = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number.parseFloat(form.amount)
    if (!amount || !form.memberName.trim()) return
    setSaving(true)
    try {
      // Create a contribution with pledge = paid = amount, status FULFILLED
      const res = await fetch(`/api/weddings/${weddingId}/contributions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId, memberName: form.memberName.trim(),
          pledgeAmount: amount, paidAmount: amount,
          status: 'FULFILLED',
          notes: form.notes || null,
          eventId: form.eventId || null,
        }),
      })
      if (!res.ok) throw new Error()
      const contrib = await res.json() as { id: string }

      // Also record a payment entry linked to this contribution
      await fetch(`/api/weddings/${weddingId}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount, status: 'COMPLETED',
          description: form.notes || `Direct contribution from ${form.memberName}`,
          payerName: form.memberName.trim(),
          contributionId: contrib.id,
          idempotencyKey: `direct-${contrib.id}-${Date.now()}`,
        }),
      })

      await qc.invalidateQueries({ queryKey: ['contributions', weddingId] })
      await qc.invalidateQueries({ queryKey: ['payments', weddingId] })
      toast('Contribution recorded', 'success')
      onClose()
    } catch { toast('Failed to record contribution', 'error') }
    finally { setSaving(false) }
  }

  const handleMpesa = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number.parseFloat(form.amount)
    if (!amount || !form.phone || !form.memberName.trim()) return
    try {
      // Create the contribution record first (pending payment)
      const res = await fetch(`/api/weddings/${weddingId}/contributions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId, memberName: form.memberName.trim(),
          pledgeAmount: amount, paidAmount: 0,
          status: 'PLEDGED',
          notes: form.notes || null,
          eventId: form.eventId || null,
        }),
      })
      if (!res.ok) throw new Error()
      const contrib = await res.json() as { id: string }

      await initiate.mutateAsync({
        weddingId, phone: form.phone, amount,
        description: form.notes || `Contribution from ${form.memberName}`,
        contributionId: contrib.id,
      })
      await qc.invalidateQueries({ queryKey: ['contributions', weddingId] })
      toast('STK Push sent', 'success')
      onClose()
    } catch { toast('Failed to initiate M-Pesa', 'error') }
  }

  return (
    <Modal onClose={onClose} title="Record contribution">
      <div className="space-y-4">
        <p className="text-xs text-zinc-400">For on-the-spot giving — no prior pledge needed.</p>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
          <button type="button" onClick={() => setMode('manual')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${mode === 'manual' ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500'}`}>
            <CreditCard size={13} /> Cash / Manual
          </button>
          <button type="button" onClick={() => setMode('mpesa')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${mode === 'mpesa' ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500'}`}>
            <Phone size={13} /> M-Pesa STK
          </button>
        </div>

        <form onSubmit={mode === 'manual' ? handleManual : handleMpesa} className="space-y-3">
          <div><Label htmlFor="dc-name">Contributor name *</Label>
            <Input id="dc-name" value={form.memberName} onChange={e => setForm(f => ({ ...f, memberName: e.target.value }))} placeholder="Jane Doe" required /></div>

          {mode === 'mpesa' && (
            <div><Label htmlFor="dc-phone">Phone (254XXXXXXXXX) *</Label>
              <Input id="dc-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="254712345678" required /></div>
          )}

          <div><Label htmlFor="dc-amount">Amount (KES) *</Label>
            <Input id="dc-amount" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="5000" min="1" required /></div>

          {!eventId && (
            <div><Label htmlFor="dc-event">Event (optional)</Label>
              <Select id="dc-event" value={form.eventId} onChange={e => setForm(f => ({ ...f, eventId: e.target.value }))}>
                <option value="">No specific event</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </Select></div>
          )}

          <div><Label htmlFor="dc-notes">Notes</Label>
            <Input id="dc-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Cash at the gate" /></div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving || initiate.isPending}>
              {saving || initiate.isPending ? 'Saving…' : mode === 'mpesa' ? 'Send STK Push' : 'Record contribution'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export function ContributionModal({ weddingId, events, contrib, eventId, onClose }: Readonly<{
  weddingId: string; events: WeddingEvent[]; contrib?: Contribution; eventId?: string; onClose: () => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    memberName: contrib?.memberName ?? '',
    pledgeAmount: contrib ? String(contrib.pledgeAmount) : '',
    paidAmount: contrib ? String(contrib.paidAmount) : '0',
    dueDate: contrib?.dueDate ? contrib.dueDate.split('T')[0] : '',
    notes: contrib?.notes ?? '',
    status: contrib?.status ?? 'PLEDGED' as ContribStatus,
    eventId: contrib?.eventId ?? eventId ?? '',
  })

  const handleFieldChange = (updates: Partial<typeof form>) => {
    setForm(prev => {
      const next = { ...prev, ...updates }
      if (next.status !== 'CANCELLED') {
        next.status = deriveStatus(
          Number.parseFloat(next.pledgeAmount) || 0,
          Number.parseFloat(next.paidAmount) || 0,
          next.dueDate,
          next.status as ContribStatus,
        )
      }
      return next
    })
  }

  const pledge = Number.parseFloat(form.pledgeAmount) || 0
  const paid = Number.parseFloat(form.paidAmount) || 0
  const pct = pledge > 0 ? Math.min(100, Math.round((paid / pledge) * 100)) : 0
  const outstanding = Math.max(0, pledge - paid)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = {
        memberName: form.memberName, pledgeAmount: pledge, paidAmount: paid,
        status: form.status, dueDate: form.dueDate || null,
        notes: form.notes || null, eventId: form.eventId || null,
      }
      if (contrib) {
        await fetch(`/api/weddings/${weddingId}/contributions/${contrib.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        toast('Pledge updated', 'success')
      } else {
        const res = await fetch(`/api/weddings/${weddingId}/contributions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weddingId, ...payload }),
        })
        if (!res.ok) throw new Error()
        toast('Pledge recorded', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['contributions', weddingId] })
      onClose()
    } catch { toast('Failed to save', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title={contrib ? 'Edit pledge' : 'Add pledge'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="c-name">Member name *</Label>
          <Input id="c-name" value={form.memberName} onChange={e => handleFieldChange({ memberName: e.target.value })} placeholder="Jane Doe" required /></div>

        {!eventId && (
          <div><Label htmlFor="c-event">Event (optional)</Label>
            <Select id="c-event" value={form.eventId} onChange={e => handleFieldChange({ eventId: e.target.value })}>
              <option value="">No specific event</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </Select></div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="c-pledge">Pledge amount (KES) *</Label>
            <Input id="c-pledge" type="number" value={form.pledgeAmount}
              onChange={e => handleFieldChange({ pledgeAmount: e.target.value })} placeholder="10000" min="1" required /></div>
          <div><Label htmlFor="c-paid">Initial payment (KES)</Label>
            <Input id="c-paid" type="number" value={form.paidAmount}
              onChange={e => handleFieldChange({ paidAmount: e.target.value })} placeholder="0" min="0" /></div>
        </div>

        {pledge > 0 && (
          <div className="bg-zinc-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Progress</span>
              <span className="font-bold text-[#14161C]">{pct}%</span>
            </div>
            <ProgressBar value={paid} max={pledge} />
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Paid: <span className="font-semibold text-emerald-600">{fmt(paid)}</span></span>
              <span className="text-zinc-400">Outstanding: <span className={`font-semibold ${outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmt(outstanding)}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-400">Status:</span>
              <Badge variant={STATUS_BADGE[form.status] ?? 'pending'}>{form.status}</Badge>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="c-status">Status</Label>
            <Select id="c-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ContribStatus }))}>
              <option value="PLEDGED">Pledged</option>
              <option value="PARTIAL">Partial</option>
              <option value="FULFILLED">Fulfilled</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </Select></div>
          <div><Label htmlFor="c-due">Due date</Label>
            <Input id="c-due" type="date" value={form.dueDate} onChange={e => handleFieldChange({ dueDate: e.target.value })} /></div>
        </div>

        <div><Label htmlFor="c-notes">Notes</Label>
          <Input id="c-notes" value={form.notes} onChange={e => handleFieldChange({ notes: e.target.value })} placeholder="Optional notes" /></div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? 'Saving…' : contrib ? 'Save changes' : 'Add pledge'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Event Contributions Tab ──────────────────────────────────────────────────

export function EventContributionsTab({ weddingId, eventId, events }: Readonly<{
  weddingId: string; eventId: string; events: WeddingEvent[]
}>) {
  const qc = useQueryClient()
  const [showPledge, setShowPledge] = useState(false)
  const [showDirect, setShowDirect] = useState(false)
  const [editing, setEditing] = useState<Contribution | null>(null)

  const { data: allContributions = [], isLoading } = useContributions(weddingId)
  const contributions = useMemo(() => allContributions.filter(c => c.eventId === eventId), [allContributions, eventId])

  const totalPledged = contributions.reduce((s, c) => s + c.pledgeAmount, 0)
  const totalPaid = contributions.reduce((s, c) => s + c.paidAmount, 0)
  const outstanding = Math.max(0, totalPledged - totalPaid)
  const overdue = contributions.filter(c => c.status === 'OVERDUE').length

  const refresh = () => void qc.invalidateQueries({ queryKey: ['contributions', weddingId] })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-4">
      {contributions.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-0 divide-x divide-zinc-100">
            <div className="pr-6">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Total pledged</p>
              <p className="text-xl font-extrabold text-sky-600">{fmt(totalPledged)}</p>
            </div>
            <div className="px-6">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Collected</p>
              <p className="text-xl font-extrabold text-emerald-600">{fmt(totalPaid)}</p>
            </div>
            <div className="pl-6">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Outstanding</p>
              <p className={`text-xl font-extrabold ${outstanding > 0 ? 'text-amber-500' : 'text-[#14161C]'}`}>{fmt(outstanding)}</p>
            </div>
          </div>
          {totalPledged > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Collection progress</span>
                <span className="font-bold">{Math.round((totalPaid / totalPledged) * 100)}%</span>
              </div>
              <ProgressBar value={totalPaid} max={totalPledged} />
              {overdue > 0 && <p className="text-xs text-red-500 font-semibold">{overdue} overdue</p>}
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => setShowDirect(true)}><Plus size={13} /> Record contribution</Button>
        <Button size="sm" onClick={() => setShowPledge(true)}><Plus size={13} /> Add pledge</Button>
      </div>

      {contributions.length === 0 ? (
        <EmptyState icon={<Users size={32} className="text-zinc-200" />} title="No contributions yet"
          description="Add a pledge or record a direct contribution"
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowDirect(true)}><Plus size={13} /> Record contribution</Button>
              <Button size="sm" onClick={() => setShowPledge(true)}><Plus size={13} /> Add pledge</Button>
            </div>
          } />
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          {contributions.map(c => <ContribRow key={c.id} contrib={c} weddingId={weddingId} events={events} onEdit={setEditing} />)}
        </div>
      )}

      {showPledge && <ContributionModal weddingId={weddingId} events={events} eventId={eventId} onClose={() => { setShowPledge(false); refresh() }} />}
      {showDirect && <DirectContributionModal weddingId={weddingId} events={events} eventId={eventId} onClose={() => { setShowDirect(false); refresh() }} />}
      {editing && <ContributionModal weddingId={weddingId} events={events} contrib={editing} eventId={eventId} onClose={() => { setEditing(null); refresh() }} />}
    </div>
  )
}
