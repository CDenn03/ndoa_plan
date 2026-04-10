'use client'
import { useState, useMemo } from 'react'
import { Users, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button, Input, Label, Select, Modal, Badge, EmptyState, Spinner, ProgressBar } from '@/components/ui'
import { useContributions } from '@/hooks/use-payments'
import { useToast } from '@/components/ui/toast'
import { useQueryClient } from '@tanstack/react-query'
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

// ─── Contribution Modal (add + edit) ─────────────────────────────────────────

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

  // Auto-derive status when pledge/paid/due changes
  const handleFieldChange = (updates: Partial<typeof form>) => {
    setForm(prev => {
      const next = { ...prev, ...updates }
      // Only auto-derive if not manually set to CANCELLED
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
        memberName: form.memberName,
        pledgeAmount: pledge,
        paidAmount: paid,
        status: form.status,
        dueDate: form.dueDate || null,
        notes: form.notes || null,
        eventId: form.eventId || null,
      }
      if (contrib) {
        await fetch(`/api/weddings/${weddingId}/contributions/${contrib.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        await qc.invalidateQueries({ queryKey: ['contributions', weddingId] })
        toast('Contribution updated', 'success')
      } else {
        // POST with all fields including paidAmount so we don't need a second PATCH
        const res = await fetch(`/api/weddings/${weddingId}/contributions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weddingId, memberName: form.memberName, pledgeAmount: pledge,
            paidAmount: paid, status: form.status,
            dueDate: form.dueDate || null, notes: form.notes || null,
            eventId: form.eventId || null,
          }),
        })
        if (!res.ok) throw new Error('Failed to add contribution')
        await qc.invalidateQueries({ queryKey: ['contributions', weddingId] })
        toast('Contribution recorded', 'success')
      }
      onClose()
    } catch { toast('Failed to save', 'error') } finally { setSaving(false) }
  }

  const isPending = saving

  return (
    <Modal onClose={onClose} title={contrib ? 'Edit contribution' : 'Add contribution pledge'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="c-name">Member name *</Label>
          <Input id="c-name" value={form.memberName} onChange={e => handleFieldChange({ memberName: e.target.value })} placeholder="Jane Doe" required /></div>

        {/* Event — hidden when scoped to a specific event */}
        {!eventId && (
          <div><Label htmlFor="c-event">Event (optional)</Label>
            <Select id="c-event" value={form.eventId} onChange={e => handleFieldChange({ eventId: e.target.value })}>
              <option value="">No specific event</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </Select></div>
        )}

        {/* Pledge + Paid amounts */}
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="c-pledge">Pledge amount (KES) *</Label>
            <Input id="c-pledge" type="number" value={form.pledgeAmount}
              onChange={e => handleFieldChange({ pledgeAmount: e.target.value })}
              placeholder="10000" min="1" required /></div>
          <div>
            <Label htmlFor="c-paid">Amount paid (KES)</Label>
            <Input id="c-paid" type="number" value={form.paidAmount}
              onChange={e => handleFieldChange({ paidAmount: e.target.value })}
              placeholder="0" min="0" max={form.pledgeAmount || undefined} />
          </div>
        </div>

        {/* Live progress preview */}
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
              <span className="text-[10px] text-zinc-400">(auto-derived)</span>
            </div>
          </div>
        )}

        {/* Status + Due date */}
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
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? 'Saving…' : contrib ? 'Save changes' : 'Record pledge'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Contribution Row ─────────────────────────────────────────────────────────

export function ContribRow({ contrib, weddingId, events, onEdit }: Readonly<{
  contrib: Contribution; weddingId: string; events: WeddingEvent[]; onEdit: (c: Contribution) => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const pct = contrib.pledgeAmount > 0 ? Math.round((contrib.paidAmount / contrib.pledgeAmount) * 100) : 0
  const eventName = events.find(e => e.id === contrib.eventId)?.name

  const handleDelete = async () => {
    if (!confirm(`Delete ${contrib.memberName}'s contribution?`)) return
    try {
      await fetch(`/api/weddings/${weddingId}/contributions/${contrib.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['contributions', weddingId] })
      toast('Contribution deleted', 'success')
    } catch { toast('Failed to delete', 'error') }
  }

  return (
    <div className="group flex items-center gap-4 py-3.5 border-b border-zinc-100 last:border-0 px-6">
      <div className="w-9 h-9 rounded-full bg-[#CDB5F7]/20 flex items-center justify-center text-xs font-bold text-violet-600 flex-shrink-0">
        {contrib.memberName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-[#14161C]">{contrib.memberName}</p>
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
      </div>
      <div className="flex items-center gap-1  flex-shrink-0">
        <button onClick={() => onEdit(contrib)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors" aria-label="Edit"><Pencil size={13} /></button>
        <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors" aria-label="Delete"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

// ─── Event Contributions Tab (shared between event detail + contributions page) ─

export function EventContributionsTab({ weddingId, eventId, events }: Readonly<{
  weddingId: string; eventId: string; events: WeddingEvent[]
}>) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
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
      {/* Stats */}
      {contributions.length > 0 && (
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
      )}

      {/* Overall progress bar */}
      {contributions.length > 0 && totalPledged > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Collection progress</span>
            <span className="font-bold text-[#14161C]">{Math.round((totalPaid / totalPledged) * 100)}%</span>
          </div>
          <ProgressBar value={totalPaid} max={totalPledged} />
          {overdue > 0 && <p className="text-xs text-red-500 font-semibold">{overdue} overdue pledge{overdue !== 1 ? 's' : ''}</p>}
        </div>
      )}

      {/* Add button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={13} /> Add pledge</Button>
      </div>

      {/* List */}
      {contributions.length === 0 ? (
        <EmptyState icon={<Users size={32} className="text-zinc-200" />} title="No contributions" description="Record committee member pledges for this event"
          action={<Button size="sm" onClick={() => setShowAdd(true)}><Plus size={13} /> Add pledge</Button>} />
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          {contributions.map(c => <ContribRow key={c.id} contrib={c} weddingId={weddingId} events={events} onEdit={setEditing} />)}
        </div>
      )}

      {showAdd && <ContributionModal weddingId={weddingId} events={events} eventId={eventId} onClose={() => { setShowAdd(false); refresh() }} />}
      {editing && <ContributionModal weddingId={weddingId} events={events} contrib={editing} eventId={eventId} onClose={() => { setEditing(null); refresh() }} />}
    </div>
  )
}
