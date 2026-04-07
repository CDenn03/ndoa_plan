'use client'
import { useState } from 'react'
import { DollarSign, Plus, Phone, AlertCircle, CheckCircle2, Clock, X } from 'lucide-react'
import { Button, Input, Card, CardHeader, CardContent, CardTitle, StatCard, Badge, EmptyState, Spinner } from '@/components/ui'
import { usePayments, useContributions, useInitiatePayment, useAddContribution, usePaymentSummary } from '@/hooks/use-payments'
import { useToast } from '@/components/ui/toast'
import { format } from 'date-fns'

const STATUS_BADGE: Record<string, 'confirmed' | 'pending' | 'declined' | 'maybe'> = {
  COMPLETED: 'confirmed', PENDING: 'pending', FAILED: 'declined',
  DISPUTED: 'declined', DUPLICATE: 'maybe', REFUNDED: 'maybe',
}
const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  COMPLETED: CheckCircle2, PENDING: Clock, FAILED: AlertCircle,
  DISPUTED: AlertCircle, DUPLICATE: AlertCircle, REFUNDED: CheckCircle2,
}

function PaymentRow({ amount, status, payerName, payerPhone, mpesaRef, description, createdAt }: {
  amount: number; status: string; payerName?: string; payerPhone?: string
  mpesaRef?: string; description?: string; createdAt: string
}) {
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)
  const Icon = STATUS_ICON[status] ?? Clock
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/30' : status === 'DISPUTED' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
        <Icon size={14} className={status === 'COMPLETED' ? 'text-green-600' : status === 'DISPUTED' ? 'text-red-500' : 'text-zinc-400'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {payerName ?? payerPhone ?? 'Unknown payer'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {mpesaRef && <span className="text-xs text-zinc-400 font-mono">{mpesaRef}</span>}
          {description && <span className="text-xs text-zinc-400 truncate">{description}</span>}
          <span className="text-xs text-zinc-400">{format(new Date(createdAt), 'MMM d, HH:mm')}</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{fmt(amount)}</p>
        <Badge variant={STATUS_BADGE[status] ?? 'pending'} className="mt-0.5">{status}</Badge>
      </div>
    </div>
  )
}

function ContributionRow({ memberName, pledgeAmount, paidAmount, status, dueDate }: {
  memberName: string; pledgeAmount: number; paidAmount: number; status: string; dueDate?: string
}) {
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)
  const pct = pledgeAmount > 0 ? Math.round((paidAmount / pledgeAmount) * 100) : 0
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs font-bold text-violet-600 dark:text-violet-400 flex-shrink-0">
        {memberName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{memberName}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${status === 'FULFILLED' ? 'bg-green-500' : status === 'OVERDUE' ? 'bg-red-400' : 'bg-violet-400'}`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <span className="text-xs text-zinc-400 whitespace-nowrap">{pct}%</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{fmt(paidAmount)} / {fmt(pledgeAmount)}</p>
        {dueDate && <p className={`text-xs mt-0.5 ${status === 'OVERDUE' ? 'text-red-500' : 'text-zinc-400'}`}>Due {format(new Date(dueDate), 'MMM d')}</p>}
      </div>
    </div>
  )
}

function StkPushModal({ weddingId, onClose }: { weddingId: string; onClose: () => void }) {
  const initiate = useInitiatePayment(weddingId)
  const { toast } = useToast()
  const [form, setForm] = useState({ phone: '', amount: '', description: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.phone || !form.amount) return
    try {
      await initiate.mutateAsync({
        weddingId, phone: form.phone,
        amount: parseFloat(form.amount),
        description: form.description || undefined,
      })
      toast('M-Pesa STK push sent. Waiting for payment…', 'info')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Payment initiation failed', 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Request M-Pesa payment</h2>
          <button onClick={onClose}><X size={18} className="text-zinc-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Phone number *</label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="254712345678" required />
            <p className="text-xs text-zinc-400 mt-1">Format: 254XXXXXXXXX (no +)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Amount (KES) *</label>
            <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="5000" min="1" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Catering deposit" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={initiate.isPending}>
              {initiate.isPending ? 'Sending…' : <><Phone size={14} /> Send STK Push</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddContributionModal({ weddingId, onClose }: { weddingId: string; onClose: () => void }) {
  const add = useAddContribution(weddingId)
  const { toast } = useToast()
  const [form, setForm] = useState({ memberName: '', pledgeAmount: '', dueDate: '', notes: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.memberName || !form.pledgeAmount) return
    try {
      await add.mutateAsync({
        memberName: form.memberName,
        pledgeAmount: parseFloat(form.pledgeAmount),
        status: 'PLEDGED',
        dueDate: form.dueDate || undefined,
        notes: form.notes || undefined,
      })
      toast('Contribution pledge recorded', 'success')
      onClose()
    } catch {
      toast('Failed to record contribution', 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Add contribution pledge</h2>
          <button onClick={onClose}><X size={18} className="text-zinc-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Member name *</label>
            <Input value={form.memberName} onChange={e => setForm(f => ({ ...f, memberName: e.target.value }))} placeholder="Jane Doe" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Pledge amount (KES) *</label>
            <Input type="number" value={form.pledgeAmount} onChange={e => setForm(f => ({ ...f, pledgeAmount: e.target.value }))} placeholder="10000" min="1" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Due date</label>
            <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={add.isPending}>
              {add.isPending ? 'Adding…' : 'Record pledge'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PaymentsPage({ params }: { params: { weddingId: string } }) {
  const wid = params.weddingId
  const { data: payments = [], isLoading: loadingPayments } = usePayments(wid)
  const { data: contributions = [], isLoading: loadingContrib } = useContributions(wid)
  const summary = usePaymentSummary(wid)
  const [showStk, setShowStk] = useState(false)
  const [showContrib, setShowContrib] = useState(false)
  const [tab, setTab] = useState<'payments' | 'contributions'>('payments')
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Payments</h1>
          <p className="text-sm text-zinc-500">M-Pesa tracking &amp; committee contributions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowContrib(true)} size="sm" variant="secondary">
            <Plus size={15} /> Contribution
          </Button>
          <Button onClick={() => setShowStk(true)} size="sm">
            <Phone size={15} /> STK Push
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total received" value={fmt(summary.totalReceived)} color="green" />
        <StatCard label="Pledged" value={fmt(summary.totalPledged)} color="blue" />
        <StatCard label="Pending" value={summary.pendingPayments} color="amber" />
        {summary.disputed > 0
          ? <StatCard label="Disputed" value={summary.disputed} color="red" />
          : <StatCard label="Overdue pledges" value={summary.overdue} color={summary.overdue > 0 ? 'amber' : 'default'} />
        }
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
        {(['payments', 'contributions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'payments' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{payments.length} payment{payments.length !== 1 ? 's' : ''}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingPayments ? <div className="flex justify-center py-10"><Spinner /></div>
              : payments.length === 0
              ? <EmptyState icon={<DollarSign size={36} />} title="No payments yet" description="Request M-Pesa payments using STK Push" action={<Button onClick={() => setShowStk(true)} size="sm"><Phone size={14} /> Send STK Push</Button>} />
              : payments.map(p => <PaymentRow key={p.id} {...p} />)}
          </CardContent>
        </Card>
      )}

      {tab === 'contributions' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{contributions.length} contribution{contributions.length !== 1 ? 's' : ''}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingContrib ? <div className="flex justify-center py-10"><Spinner /></div>
              : contributions.length === 0
              ? <EmptyState icon={<DollarSign size={36} />} title="No contributions yet" description="Record committee contribution pledges" action={<Button onClick={() => setShowContrib(true)} size="sm"><Plus size={14} /> Add pledge</Button>} />
              : contributions.map(c => <ContributionRow key={c.id} {...c} />)}
          </CardContent>
        </Card>
      )}

      {showStk && <StkPushModal weddingId={wid} onClose={() => setShowStk(false)} />}
      {showContrib && <AddContributionModal weddingId={wid} onClose={() => setShowContrib(false)} />}
    </div>
  )
}
