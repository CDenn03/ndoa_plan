'use client'
import { useState, useMemo } from 'react'
import { DollarSign, Plus, Lightbulb, LayoutTemplate, Pencil, Trash2, CreditCard, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { Button, Input, Select, Label, ProgressBar, EmptyState, Spinner, Modal, ConfirmDialog } from '@/components/ui'
import { useBudgetLines } from '@/hooks/use-data'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import { format } from 'date-fns'
import { weddingDB } from '@/lib/db/dexie'
import type { LocalBudgetLine } from '@/types'
import { PaymentModal } from '@/components/features/payment-modals'

export const BUDGET_CATEGORIES = ['VENUE','CATERING','PHOTOGRAPHY','VIDEOGRAPHY','DECOR','FLOWERS','MUSIC','TRANSPORT','ATTIRE','CAKE','INVITATIONS','ACCOMMODATION','HONEYMOON','MISCELLANEOUS']
const PAYMENT_TYPES = ['FULL', 'DEPOSIT', 'INSTALLMENT', 'BALANCE']
export const SUGGESTED_ALLOC: Record<string, number> = {
  CATERING: 0.45, VENUE: 0.20, DECOR: 0.10, PHOTOGRAPHY: 0.08,
  ATTIRE: 0.06, MUSIC: 0.04, TRANSPORT: 0.03, CAKE: 0.02,
  INVITATIONS: 0.01, MISCELLANEOUS: 0.01,
}

export interface WeddingEvent { id: string; name: string; type: string; date: string }
export interface Vendor { id: string; name: string; category: string }

import { 
  sanitizeNumeric, 
  addBudgetAmounts, 
  formatCurrency, 
  groupBudgetByCategory 
} from '@/lib/budget-helpers'

export const fmt = (n: number) => formatCurrency(n)

export function summarise(lines: LocalBudgetLine[]) {
  return lines.reduce(
    (acc, l) => ({
      estimated: addBudgetAmounts(acc.estimated, l.estimated),
      actual: addBudgetAmounts(acc.actual, l.actual),
    }),
    { estimated: 0, actual: 0 },
  )
}

// ─── Linked payment type ──────────────────────────────────────────────────────

interface LinkedPayment {
  id: string; amount: number; status: string
  payerName?: string; description?: string
  paymentDate?: string; createdAt: string
}

const PAY_STATUS_ICON: Record<string, typeof CheckCircle2> = {
  COMPLETED: CheckCircle2, PENDING: Clock, FAILED: AlertCircle,
}
const PAY_STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'text-emerald-600', PENDING: 'text-amber-500', FAILED: 'text-red-500',
}

// ─── Budget Line Modal (add + edit) ──────────────────────────────────────────

export function BudgetLineModal({ weddingId, eventId, events, vendors, line, onClose, onPay }: Readonly<{
  weddingId: string; eventId?: string; events: WeddingEvent[]; vendors: Vendor[]
  line?: LocalBudgetLine; onClose: () => void; onPay?: (line: LocalBudgetLine) => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    category: line?.category ?? 'VENUE',
    description: line?.description ?? '',
    estimated: line ? String(line.estimated) : '',
    vendorId: line?.vendorId ?? '',
    vendorName: line?.vendorName ?? '',
    notes: line?.notes ?? line?.paymentPlan ?? '',
    paymentDate: line?.paymentDate ? line.paymentDate.split('T')[0] : '',
    reminderDate: line?.reminderDate ? line.reminderDate.split('T')[0] : '',
    paymentType: line?.paymentType ?? '',
    selectedEventId: eventId ?? line?.eventId ?? '',
  })

  // Load linked payments for edit mode
  const { data: linkedPayments = [], isLoading: loadingPayments } = useQuery<LinkedPayment[]>({
    queryKey: ['budget-line-payments', line?.id],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/budget/${line!.id}`)
      if (!res.ok) return []
      return res.json() as Promise<LinkedPayment[]>
    },
    enabled: !!line,
    staleTime: 15_000,
  })

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await fetch(`/api/weddings/${weddingId}/payments/${paymentId}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['budget-line-payments', line?.id] })
      await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
      await qc.invalidateQueries({ queryKey: ['payments', weddingId] })
      toast('Payment deleted', 'success')
    } catch { toast('Failed to delete payment', 'error') }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.selectedEventId && !line) { toast('Please select an event for this budget item', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        weddingId, eventId: form.selectedEventId || undefined,
        category: form.category, description: form.description,
        estimated: Number.parseFloat(form.estimated) || 0,
        actual: 0,
        vendorId: form.vendorId || undefined,
        vendorName: form.vendorName || undefined,
        notes: form.notes || undefined,
        paymentDate: form.paymentDate || undefined,
        reminderDate: form.reminderDate || undefined,
        paymentType: form.paymentType || undefined,
      }
      if (line) {
        await fetch(`/api/weddings/${weddingId}/budget/${line.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
        toast('Budget item updated', 'success')
      } else {
        // POST directly to server so the line gets a real Postgres ID immediately
        const res = await fetch(`/api/weddings/${weddingId}/budget`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to add budget item')
        await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
        toast('Budget item added', 'success')
      }
      onClose()
    } catch { toast(line ? 'Failed to update' : 'Failed to add budget item', 'error') }
    finally { setSaving(false) }
  }

  const remaining = line ? Math.max(0, line.estimated - line.actual) : null

  return (
    <Modal onClose={onClose} title={line ? 'Edit budget item' : 'Add budget item'}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Event selector — only when not scoped */}
        {!eventId && (
          <div><Label htmlFor="bl-event">Event {!line && '*'}</Label>
            <Select id="bl-event" value={form.selectedEventId} onChange={e => setForm(f => ({ ...f, selectedEventId: e.target.value }))}>
              <option value="">Select event…</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </Select></div>
        )}

        <div><Label htmlFor="bl-cat">Category</Label>
          <Select id="bl-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {BUDGET_CATEGORIES.map(c => <option key={c} value={c}>{c.replaceAll('_', ' ')}</option>)}
          </Select></div>

        <div><Label htmlFor="bl-desc">Description *</Label>
          <Input id="bl-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Main hall rental" required /></div>

        <div><Label htmlFor="bl-est">Estimated (KES)</Label>
          <Input id="bl-est" type="number" value={form.estimated} onChange={e => setForm(f => ({ ...f, estimated: e.target.value }))} placeholder="0" min="0" /></div>

        {/* Read-only actual in edit mode */}
        {line && (
          <div className="bg-[#F7F5F2] rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[#14161C]/55">Actual paid</span>
              <span className={`font-bold ${line.actual > line.estimated ? 'text-red-500' : 'text-emerald-600'}`}>{fmt(line.actual)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#14161C]/55">Remaining</span>
              <span className={`font-semibold ${remaining === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>{fmt(remaining ?? 0)}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="bl-vendor">Vendor</Label>
            <Select id="bl-vendor" value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value, vendorName: e.target.value ? '' : f.vendorName }))}>
              <option value="">No vendor / type below</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select></div>
          <div><Label htmlFor="bl-vname">Or vendor name</Label>
            <Input id="bl-vname" value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value, vendorId: e.target.value ? '' : f.vendorId }))} placeholder="Free text" disabled={!!form.vendorId} /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="bl-ptype">Payment type</Label>
            <Select id="bl-ptype" value={form.paymentType} onChange={e => setForm(f => ({ ...f, paymentType: e.target.value }))}>
              <option value="">None</option>
              {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select></div>
          <div><Label htmlFor="bl-pdate">Payment date</Label>
            <Input id="bl-pdate" type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} /></div>
        </div>

        <div><Label htmlFor="bl-reminder">Reminder date</Label>
          <Input id="bl-reminder" type="date" value={form.reminderDate} onChange={e => setForm(f => ({ ...f, reminderDate: e.target.value }))} />
          <p className="text-xs text-[#14161C]/40 mt-1">Optional follow-up or next payment reminder</p></div>

        <div><Label htmlFor="bl-notes">Notes / Payment plan</Label>
          <Input id="bl-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. 50% deposit, 50% on day" /></div>

        {/* Linked payments list — edit mode only */}
        {line && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">Linked payments</p>
            {loadingPayments ? <Spinner size="sm" /> : linkedPayments.length === 0 ? (
              <p className="text-xs text-[#14161C]/40">No payments recorded yet</p>
            ) : (
              <div className="rounded-xl border border-[#1F4D3A]/8 overflow-hidden">
                {linkedPayments.map(p => {
                  const Icon = PAY_STATUS_ICON[p.status] ?? Clock
                  return (
                    <div key={p.id} className="flex items-center gap-3 py-2.5 px-3 border-b border-[#1F4D3A]/8 last:border-0">
                      <Icon size={13} className={PAY_STATUS_COLOR[p.status] ?? 'text-[#14161C]/40'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#14161C]">{fmt(p.amount)}</p>
                        <p className="text-[10px] text-[#14161C]/40">
                          {p.payerName ?? p.description ?? 'Payment'} · {format(new Date(p.paymentDate ?? p.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <button type="button" onClick={() => void handleDeletePayment(p.id)}
                        className="p-1 rounded hover:bg-red-50 text-[#14161C]/25 hover:text-red-500 transition-colors flex-shrink-0" aria-label="Delete payment">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          {line && onPay && (
            <Button type="button" variant="lavender" onClick={() => { onClose(); onPay(line) }} className="flex-1">
              <CreditCard size={13} /> Pay
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? (line ? 'Saving…' : 'Adding…') : (line ? 'Save' : 'Add line')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Load Budget Template Modal ───────────────────────────────────────────────

export function LoadBudgetTemplateModal({ weddingId, eventId, onClose }: Readonly<{ weddingId: string; eventId: string; onClose: () => void }>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [applying, setApplying] = useState<string | null>(null)
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', 'BUDGET'],
    queryFn: async () => { const res = await fetch('/api/templates?type=BUDGET'); if (!res.ok) return []; return res.json() as Promise<{ id: string; name: string; data: unknown[] }[]> },
  })
  const handleApply = async (templateId: string) => {
    setApplying(templateId)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/apply-template`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId, eventId }) })
      if (!res.ok) throw new Error('Failed to apply')
      // Fetch fresh server data (all lines for this wedding)
      const fresh = await fetch(`/api/weddings/${weddingId}/budget`)
      if (fresh.ok) {
        const serverItems = await fresh.json() as LocalBudgetLine[]
        // Clear Dexie first, then insert fresh data (prevents stale cache)
        await weddingDB.budgetLines.where('weddingId').equals(weddingId).delete()
        await weddingDB.budgetLines.bulkPut(serverItems)
        qc.setQueryData(['budget', weddingId], serverItems)
      }
      toast('Budget template applied', 'success'); onClose()
    } catch { toast('Failed to apply template', 'error') } finally { setApplying(null) }
  }
  return (
    <Modal onClose={onClose} title="Load budget template">
      <div className="space-y-3">
        <p className="text-xs text-[#14161C]/40">Appends suggested budget line items to this event.</p>
        {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> :
          templates.length === 0 ? <p className="text-sm text-[#14161C]/40 text-center py-6">No templates available</p> : (
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-3 border-b border-[#1F4D3A]/8 last:border-0">
                  <div><p className="text-sm font-semibold text-[#14161C]">{t.name}</p><p className="text-xs text-[#14161C]/40">{t.data.length} line items</p></div>
                  <Button size="sm" variant="lavender" onClick={() => void handleApply(t.id)} disabled={applying === t.id}>{applying === t.id ? <Spinner size="sm" /> : 'Apply'}</Button>
                </div>
              ))}
            </div>
          )}
      </div>
    </Modal>
  )
}

// ─── Category Breakdown ───────────────────────────────────────────────────────

export function CategoryBreakdown({ lines, weddingId, events, vendors, onEdit, onPay }: Readonly<{
  lines: LocalBudgetLine[]; weddingId: string; events: WeddingEvent[]; vendors: Vendor[]
  onEdit: (line: LocalBudgetLine) => void; onPay: (line: LocalBudgetLine) => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState<LocalBudgetLine | null>(null)

  const handleDelete = async (line: LocalBudgetLine) => {
    try {
      await fetch(`/api/weddings/${weddingId}/budget/${line.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
      toast('Budget item deleted', 'success')
    } catch { toast('Failed to delete', 'error') }
    setConfirmDelete(null)
  }

  const byCategory = useMemo(() => {
    const grouped = groupBudgetByCategory(lines)
    return grouped.reduce<Record<string, { estimated: number; actual: number; lines: LocalBudgetLine[] }>>((acc, { category, lines, totalEstimated, totalActual }) => {
      acc[category] = { estimated: totalEstimated, actual: totalActual, lines }
      return acc
    }, {})
  }, [lines])

  if (Object.keys(byCategory).length === 0) return null

  return (
    <>
    <div className="space-y-0">
      <div className="grid grid-cols-4 gap-4 pb-2 border-b border-[#1F4D3A]/8">
        <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest col-span-1">Category</p>
        <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest text-right">Estimated</p>
        <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest text-right">Actual</p>
        <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest text-right">Variance</p>
      </div>
      {Object.entries(byCategory).sort((a, b) => b[1].estimated - a[1].estimated).map(([cat, totals]) => {
        const variance = totals.estimated - totals.actual
        const catPct = totals.estimated > 0 ? Math.round((totals.actual / totals.estimated) * 100) : 0
        return (
          <div key={cat} className="py-4 border-b border-[#1F4D3A]/8 last:border-0">
            <div className="grid grid-cols-4 gap-4 mb-2">
              <div className="col-span-1"><p className="text-sm font-semibold text-[#14161C]">{cat.replaceAll('_', ' ')}</p><p className="text-xs text-[#14161C]/40 mt-0.5">{catPct}% used</p></div>
              <p className="text-sm font-medium text-[#14161C]/55 text-right self-center">{fmt(totals.estimated)}</p>
              <p className={`text-sm font-bold text-right self-center ${catPct > 100 ? 'text-red-500' : 'text-[#14161C]'}`}>{fmt(totals.actual)}</p>
              <p className={`text-sm font-bold text-right self-center ${variance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{variance < 0 ? '-' : '+'}{fmt(Math.abs(variance))}</p>
            </div>
            <ProgressBar value={totals.actual} max={totals.estimated || 1} />
            <div className="mt-2 space-y-1">
              {totals.lines.map(l => {
                const lineRemaining = Math.max(0, l.estimated - l.actual)
                const isPaid = l.estimated > 0 && l.actual >= l.estimated
                return (
                  <div key={l.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-[#F7F5F2]">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#14161C]/70 truncate">{l.description}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {(l.vendorName ?? l.vendorId) && <span className="text-[10px] text-[#1F4D3A]/70">{l.vendorName ?? 'Vendor'}</span>}
                        {l.paymentType && <span className="text-[10px] text-[#14161C]/40 bg-[#1F4D3A]/6 rounded px-1">{l.paymentType}</span>}
                        {l.paymentDate && <span className="text-[10px] text-[#14161C]/40">{format(new Date(l.paymentDate), 'MMM d, yyyy')}</span>}
                        {l.reminderDate && <span className="text-[10px] text-amber-500">🔔 {format(new Date(l.reminderDate), 'MMM d')}</span>}
                        {l.actual > 0 && <span className={`text-[10px] font-semibold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>{fmt(l.actual)} paid</span>}
                      </div>
                    </div>
                    <span className="text-xs text-[#14161C]/55 flex-shrink-0">{fmt(l.estimated)}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!isPaid && l.estimated > 0 && (
                        <button onClick={() => onPay(l)}
                          className="flex items-center gap-0.5 text-[10px] font-semibold text-[#1F4D3A] hover:text-[#16382B] bg-[#1F4D3A]/6 hover:bg-[#1F4D3A]/10 rounded px-1.5 py-0.5 transition-colors"
                          aria-label={`Pay ${l.description}`}>
                          <CreditCard size={9} /> {lineRemaining > 0 ? fmt(lineRemaining) : 'Pay'}
                        </button>
                      )}
                      {isPaid && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded px-1.5 py-0.5">✓ Paid</span>}
                      <button onClick={() => onEdit(l)} className="p-1 rounded hover:bg-[#1F4D3A]/6 text-[#14161C]/40 hover:text-[#14161C]/60" aria-label="Edit"><Pencil size={11} /></button>
                      <button onClick={() => setConfirmDelete(l)} className="p-1 rounded hover:bg-red-50 text-[#14161C]/40 hover:text-red-500" aria-label="Delete"><Trash2 size={11} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
    {confirmDelete && (
      <ConfirmDialog
        title="Delete budget item?"
        description={`"${confirmDelete.description}" will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={() => void handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    )}
    </>
  )
}

// ─── Budget Line Row ──────────────────────────────────────────────────────────

type FilterTab = 'all' | 'unpaid' | 'paid'

function BudgetLineRow({ l, onEdit, onPay, onDelete }: Readonly<{
  l: LocalBudgetLine
  onEdit: (l: LocalBudgetLine) => void
  onPay: (l: LocalBudgetLine) => void
  onDelete: (l: LocalBudgetLine) => void
}>) {
  const isPaid = (Number(l.estimated) || 0) > 0 && (Number(l.actual) || 0) >= (Number(l.estimated) || 0)
  const hasPartial = (Number(l.actual) || 0) > 0 && !isPaid
  const remaining = Math.max(0, (Number(l.estimated) || 0) - (Number(l.actual) || 0))

  return (
    <div className="flex items-center gap-4 py-3.5 px-4 border-b border-[#1F4D3A]/6 last:border-0 hover:bg-[#F7F5F2]/60 transition-colors group">
      {/* Status circle */}
      <button
        type="button"
        onClick={() => !isPaid && onPay(l)}
        aria-label={isPaid ? 'Paid' : `Mark ${l.description} as paid`}
        className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
        style={{ borderColor: isPaid ? '#10B981' : hasPartial ? '#F59E0B' : '#1F4D3A30' }}
      >
        {isPaid && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
        {hasPartial && <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />}
      </button>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-semibold truncate ${isPaid ? 'text-[#14161C]/40 line-through' : 'text-[#14161C]'}`}>
            {l.description}
          </p>
          {isPaid && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 flex-shrink-0">
              PAID
            </span>
          )}
          {hasPartial && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 flex-shrink-0">
              PARTIAL
            </span>
          )}
          {!isPaid && !hasPartial && (
            <span className="text-[10px] font-bold text-[#14161C]/30 bg-[#1F4D3A]/6 rounded-full px-2 py-0.5 flex-shrink-0">
              UNPAID
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {(l.vendorName ?? l.vendorId) && (
            <span className="text-[11px] text-[#1F4D3A]/60 flex items-center gap-1">
              @ {l.vendorName ?? 'Vendor'}
            </span>
          )}
          {l.paymentType && (
            <span className="text-[11px] text-[#14161C]/40 bg-[#1F4D3A]/6 rounded px-1.5 py-0.5">
              {l.paymentType}
            </span>
          )}
          {l.paymentDate && (
            <span className="text-[11px] text-[#14161C]/40">
              {format(new Date(l.paymentDate), 'MMM d, yyyy')}
            </span>
          )}
          {l.reminderDate && (
            <span className="text-[11px] text-amber-500">
              🔔 {format(new Date(l.reminderDate), 'MMM d')}
            </span>
          )}
          {hasPartial && (
            <span className="text-[11px] text-amber-600 font-semibold">
              {fmt(Number(l.actual) || 0)} paid · {fmt(remaining)} left
            </span>
          )}
        </div>
      </div>

      {/* Estimated amount */}
      <span className="text-sm font-semibold text-[#14161C]/60 flex-shrink-0 tabular-nums">
        {fmt(Number(l.estimated) || 0)}
      </span>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isPaid && (
          <button onClick={() => onPay(l)} aria-label={`Pay ${l.description}`}
            className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/8 text-[#1F4D3A]/50 hover:text-[#1F4D3A] transition-colors">
            <CreditCard size={13} />
          </button>
        )}
        <button onClick={() => onEdit(l)} aria-label="Edit"
          className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/8 text-[#14161C]/30 hover:text-[#14161C]/60 transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(l)} aria-label="Delete"
          className="p-1.5 rounded-lg hover:bg-red-50 text-[#14161C]/30 hover:text-red-500 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Event Budget Tab ─────────────────────────────────────────────────────────

export function EventBudgetTab({ weddingId, eventId, events, vendors }: Readonly<{
  weddingId: string; eventId: string; events: WeddingEvent[]; vendors: Vendor[]
}>) {
  const { data: allLines = [], isLoading } = useBudgetLines(weddingId)
  const [showAdd, setShowAdd] = useState(false)
  const [showAlloc, setShowAlloc] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [editingLine, setEditingLine] = useState<LocalBudgetLine | null>(null)
  const [payingLine, setPayingLine] = useState<LocalBudgetLine | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<LocalBudgetLine | null>(null)
  const [tab, setTab] = useState<FilterTab>('all')
  const { toast } = useToast()
  const qc = useQueryClient()

  const lines = useMemo(() => allLines.filter(l => l.eventId === eventId && !l.deletedAt), [allLines, eventId])
  const { estimated: totalEstimated, actual: totalActual } = summarise(lines)
  const pct = totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0

  const paidLines = useMemo(() =>
    lines.filter(l => sanitizeNumeric(l.estimated) > 0 && sanitizeNumeric(l.actual) >= sanitizeNumeric(l.estimated)),
  [lines])
  const unpaidLines = useMemo(() =>
    lines.filter(l => !(sanitizeNumeric(l.estimated) > 0 && sanitizeNumeric(l.actual) >= sanitizeNumeric(l.estimated))),
  [lines])
  const filteredLines = tab === 'paid' ? paidLines : tab === 'unpaid' ? unpaidLines : lines

  const byCategory = useMemo(() => {
    const grouped = groupBudgetByCategory(filteredLines)
    return grouped.reduce<Record<string, { estimated: number; actual: number; lines: LocalBudgetLine[] }>>((acc, { category, lines, totalEstimated, totalActual }) => {
      acc[category] = { estimated: totalEstimated, actual: totalActual, lines }
      return acc
    }, {})
  }, [filteredLines])

  const handleDelete = async (line: LocalBudgetLine) => {
    try {
      await fetch(`/api/weddings/${weddingId}/budget/${line.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
      toast('Budget item deleted', 'success')
    } catch { toast('Failed to delete', 'error') }
    setConfirmDelete(null)
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-5">

      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-[#14161C]/40">{paidLines.length}/{lines.length} paid</p>
        <div className="flex gap-2">
          <Button variant="lavender" size="sm" onClick={() => setShowAlloc(v => !v)}>
            <Lightbulb size={13} /> Suggest allocation
          </Button>
          <Button variant="lavender" size="sm" onClick={() => setShowTemplate(true)}>
            <LayoutTemplate size={13} /> Load template
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add item
          </Button>
        </div>
      </div>

      {/* Suggest allocation panel */}
      {showAlloc && totalEstimated > 0 && (
        <div className="bg-[#E5DF98]/30 rounded-2xl p-5 border border-[#E5DF98] space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#14161C]">Suggested allocation for {fmt(totalEstimated)}</p>
            <Button variant="ghost" size="sm" onClick={() => setShowAlloc(false)}>Dismiss</Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(SUGGESTED_ALLOC).map(([cat, pctAlloc]) => (
              <div key={cat} className="text-xs">
                <span className="font-semibold text-[#14161C]/60">{cat.replaceAll('_', ' ')}</span>
                <span className="text-[#14161C]/40 ml-1">{fmt(totalEstimated * pctAlloc)} ({Math.round(pctAlloc * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {lines.length === 0 ? (
        <EmptyState icon={<DollarSign size={40} />} title="No budget items for this event"
          description="Add items or load a template to get started"
          action={<Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add budget item</Button>} />
      ) : (
        <>
          {/* Stats card */}
          <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white shadow-sm p-5 space-y-4">
            <div className="grid grid-cols-3 gap-0 divide-x divide-zinc-100">
              <div className="pr-6">
                <p className="text-[11px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-0.5">Estimated</p>
                <p className="text-xl font-extrabold text-[#14161C] font-heading tabular-nums">{fmt(totalEstimated)}</p>
              </div>
              <div className="px-6">
                <p className="text-[11px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-0.5">Actual (paid)</p>
                <p className={`text-xl font-extrabold font-heading tabular-nums ${pct > 100 ? 'text-red-500' : 'text-[#14161C]'}`}>{fmt(totalActual)}</p>
              </div>
              <div className="pl-6">
                <p className="text-[11px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-0.5">Remaining</p>
                <p className={`text-xl font-extrabold font-heading tabular-nums ${pct > 100 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {fmt(Math.max(0, totalEstimated - totalActual))}
                </p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[#14161C]/55">Progress</span>
                <span className={`font-bold tabular-nums ${pct > 100 ? 'text-red-500' : pct > 85 ? 'text-amber-500' : 'text-[#14161C]'}`}>
                  {pct}% · {paidLines.length}/{lines.length}
                </span>
              </div>
              <ProgressBar value={totalActual} max={totalEstimated} />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-[#F7F5F2] rounded-xl p-1 w-fit">
            {([
              { key: 'all', label: 'All', count: lines.length },
              { key: 'unpaid', label: 'Unpaid', count: unpaidLines.length },
              { key: 'paid', label: 'Paid', count: paidLines.length },
            ] as { key: FilterTab; label: string; count: number }[]).map(t => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  tab === t.key ? 'bg-white text-[#14161C] shadow-sm' : 'text-[#14161C]/40 hover:text-[#14161C]/70'
                }`}>
                {t.label}
                <span className={`text-[11px] rounded-full px-1.5 py-0.5 font-bold ${
                  tab === t.key ? 'bg-[#1F4D3A]/8 text-[#1F4D3A]' : 'text-[#14161C]/30'
                }`}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* Category groups — each in a white card */}
          {Object.keys(byCategory).length === 0 ? (
            <p className="text-sm text-[#14161C]/40 py-8 text-center">No items in this filter</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byCategory)
                .sort((a, b) => b[1].estimated - a[1].estimated)
                .map(([cat, totals]) => {
                  const variance = totals.estimated - totals.actual
                  const catPct = totals.estimated > 0 ? Math.round((totals.actual / totals.estimated) * 100) : 0
                  return (
                    <div key={cat} className="rounded-2xl border border-[#1F4D3A]/10 bg-white shadow-sm overflow-hidden">
                      {/* Category header */}
                      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1F4D3A]/8 bg-[#F7F5F2]/60">
                        <div className="flex items-center gap-3">
                          <p className="text-xs font-bold text-[#14161C]/60 uppercase tracking-widest">
                            {cat.replaceAll('_', ' ')}
                          </p>
                          <span className="text-[11px] text-[#14161C]/40">{catPct}% used</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs tabular-nums">
                          <span className="text-[#14161C]/40">{fmt(totals.estimated)}</span>
                          <span className={`font-bold ${variance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {variance < 0 ? '-' : '+'}{fmt(Math.abs(variance))}
                          </span>
                        </div>
                      </div>
                      {/* Line items */}
                      {totals.lines.map(l => (
                        <BudgetLineRow
                          key={l.id}
                          l={l}
                          onEdit={setEditingLine}
                          onPay={setPayingLine}
                          onDelete={setConfirmDelete}
                        />
                      ))}
                    </div>
                  )
                })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showAdd && <BudgetLineModal weddingId={weddingId} eventId={eventId} events={events} vendors={vendors} onClose={() => setShowAdd(false)} onPay={setPayingLine} />}
      {editingLine && <BudgetLineModal weddingId={weddingId} events={events} vendors={vendors} line={editingLine} onClose={() => setEditingLine(null)} onPay={setPayingLine} />}
      {showTemplate && <LoadBudgetTemplateModal weddingId={weddingId} eventId={eventId} onClose={() => setShowTemplate(false)} />}
      {payingLine && <PaymentModal weddingId={weddingId} budgetLine={payingLine} events={events} onClose={() => setPayingLine(null)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete budget item?"
          description={`"${confirmDelete.description}" will be permanently removed.`}
          confirmLabel="Delete"
          onConfirm={() => void handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

// ─── Quick Pay Modal ──────────────────────────────────────────────────────────

export function QuickPayModal({ weddingId, line, onClose }: Readonly<{
  weddingId: string; line: LocalBudgetLine; onClose: () => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const remaining = Math.max(0, line.estimated - line.actual)
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>(remaining > 0 ? 'full' : 'partial')
  const [form, setForm] = useState({
    amount: String(remaining || line.estimated),
    payerName: '',
    description: line.description,
    mpesaRef: '',
    paymentDate: new Date().toISOString().split('T')[0],
    status: 'COMPLETED',
    vendorId: line.vendorId ?? '',
    vendorNameOverride: line.vendorName ?? '',
  })

  // Load vendors for the dropdown (only needed when line has no vendor)
  const needsVendor = !line.vendorId && !line.vendorName
  const { data: vendors = [] } = useQuery<{ id: string; name: string; category: string }[]>({
    queryKey: ['vendors', weddingId, 'select'],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/vendors`); if (!res.ok) return []; return res.json() },
    staleTime: 60_000,
    enabled: needsVendor,
  })

  const handlePaymentTypeChange = (type: 'full' | 'partial') => {
    setPaymentType(type)
    if (type === 'full') setForm(f => ({ ...f, amount: String(remaining || line.estimated) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.vendorId && !form.vendorNameOverride.trim()) {
      toast('Please select a vendor or enter a vendor name', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number.parseFloat(form.amount),
          description: form.description || null,
          payerName: form.payerName || null,
          mpesaRef: form.mpesaRef || null,
          vendorId: form.vendorId || null,
          vendorNameOverride: !form.vendorId ? form.vendorNameOverride.trim() : null,
          status: form.status,
          eventId: line.eventId || null,
          budgetLineId: line.serverId ?? line.id,
          paymentDate: form.paymentDate || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to record payment')
      await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
      await qc.invalidateQueries({ queryKey: ['payments', weddingId] })
      await qc.invalidateQueries({ queryKey: ['budget-line-payments', line.id] })
      toast('Payment recorded', 'success'); onClose()
    } catch { toast('Failed to record payment', 'error') }
    finally { setSaving(false) }
  }

  const resolvedVendorName = line.vendorName ?? vendors.find(v => v.id === form.vendorId)?.name

  return (
    <Modal onClose={onClose} title={`Pay — ${line.description}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Summary */}
        <div className="bg-[#F7F5F2] rounded-xl p-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-[#14161C]/55">Estimated</span><span className="font-semibold">{fmt(line.estimated)}</span></div>
          <div className="flex justify-between"><span className="text-[#14161C]/55">Already paid</span><span className="font-semibold text-emerald-600">{fmt(line.actual)}</span></div>
          <div className="flex justify-between border-t border-[#1F4D3A]/12 pt-1 mt-1">
            <span className="text-[#14161C]/55 font-semibold">Remaining</span>
            <span className={`font-bold ${remaining === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>{fmt(remaining)}</span>
          </div>
        </div>

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
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
              <span>⚠</span> No vendor linked — select one or enter a name
            </p>
            {vendors.length > 0 && (
              <Select value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value, vendorNameOverride: '' }))}>
                <option value="">— Pick from your vendors —</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name} — {v.category.replaceAll('_', ' ')}</option>)}
              </Select>
            )}
            {!form.vendorId && (
              <Input
                value={form.vendorNameOverride}
                onChange={e => setForm(f => ({ ...f, vendorNameOverride: e.target.value }))}
                placeholder={vendors.length > 0 ? 'Or type a vendor name…' : 'Vendor name e.g. Kamau Caterers'}
                required={!form.vendorId}
              />
            )}
          </div>
        )}

        {/* Full / Partial toggle */}
        <div>
          <Label>Payment type</Label>
          <div className="flex gap-1 bg-[#1F4D3A]/6 p-1 rounded-xl mt-1">
            {(['full', 'partial'] as const).map(t => (
              <button key={t} type="button" onClick={() => handlePaymentTypeChange(t)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${paymentType === t ? 'bg-white text-[#14161C] shadow-lg border' : 'text-[#14161C]/55 hover:text-[#14161C]/70'}`}>
                {t === 'full' ? `Full (${fmt(remaining)})` : 'Partial'}
              </button>
            ))}
          </div>
        </div>

        <div><Label htmlFor="qp-amount">Amount (KES) *</Label>
          <Input id="qp-amount" type="number" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            min="1" required readOnly={paymentType === 'full'} /></div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="qp-date">Payment date</Label>
            <Input id="qp-date" type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} /></div>
          <div><Label htmlFor="qp-status">Status</Label>
            <Select id="qp-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
            </Select></div>
        </div>

        <div><Label htmlFor="qp-payer">Payer name</Label>
          <Input id="qp-payer" value={form.payerName} onChange={e => setForm(f => ({ ...f, payerName: e.target.value }))} placeholder="Jane Doe" /></div>

        <div><Label htmlFor="qp-ref">M-Pesa ref</Label>
          <Input id="qp-ref" value={form.mpesaRef} onChange={e => setForm(f => ({ ...f, mpesaRef: e.target.value }))} placeholder="QHX7..." /></div>

        <div><Label htmlFor="qp-desc">Description</Label>
          <Input id="qp-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Record payment'}</Button>
        </div>
      </form>
    </Modal>
  )
}
