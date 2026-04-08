'use client'
import { useState, use } from 'react'
import { DollarSign, Plus, Phone, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Button, Input, Label, Badge, EmptyState, Spinner, Modal } from '@/components/ui'
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

function iconBg(status: string) {
  if (status === 'COMPLETED') return 'bg-emerald-50 text-emerald-600'
  if (status === 'DISPUTED' || status === 'FAILED') return 'bg-red-50 text-red-500'
  return 'bg-zinc-100 text-zinc-400'
}

function barColor(status: string) {
  if (status === 'FULFILLED') return 'bg-emerald-400'
  if (status === 'OVERDUE') return 'bg-red-400'
  return 'bg-[#CDB5F7]'
}

function PaymentRow({ amount, status, payerName, payerPhone, mpesaRef, description, createdAt }: Readonly<{
  amount: number; status: string; payerName?: string; payerPhone?: string
  mpesaRef?: string; description?: string; createdAt: string
}>) {
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)
  const Icon = STATUS_ICON[status] ?? Clock
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-zinc-100 last:border-0 px-6">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg(status)}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#14161C]">{payerName ?? payerPhone ?? 'Unknown payer'}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {mpesaRef && <span className="text-xs text-zinc-400 font-mono">{mpesaRef}</span>}
          {description && <span className="text-xs text-zinc-400 truncate">{description}</span>}
          <span className="text-xs text-zinc-400">{format(new Date(createdAt), 'MMM d, HH:mm')}</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-[#14161C]">{fmt(amount)}</p>
        <Badge variant={STATUS_BADGE[status] ?? 'pending'} className="mt-1">{status}</Badge>
      </div>
    </div>
  )
}

function ContributionRow({ memberName, pledgeAmount, paidAmount, status, dueDate }: Readonly<{
  memberName: string; pledgeAmount: number; paidAmount: number; status: string; dueDate?: string
}>) {
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)
  const pct = pledgeAmount > 0 ? Math.round((paidAmount / pledgeAmount) * 100) : 0
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-zinc-100 last:border-0 px-6">
      <div className="w-9 h-9 rounded-full bg-[#CDB5F7]/20 flex items-center justify-center text-xs font-bold text-violet-600 flex-shrink-0">
        {memberName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#14161C]">{memberName}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 bg-zinc-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${barColor(status)}`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <span className="text-xs text-zinc-400 whitespace-nowrap">{pct}%</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-[#14161C]">{fmt(paidAmount)} <span className="text-zinc-400 font-normal text-xs">/ {fmt(pledgeAmount)}</span></p>
        {dueDate && <p className={`text-xs mt-0.5 ${status === 'OVERDUE' ? 'text-red-500 font-semibold' : 'text-zinc-400'}`}>Due {format(new Date(dueDate), 'MMM d')}</p>}
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
        <div>
          <Label htmlFor="stk-phone">Phone number *</Label>
          <Input id="stk-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="254712345678" required />
          <p className="text-xs text-zinc-400 mt-1">Format: 254XXXXXXXXX (no +)</p>
        </div>
        <div>
          <Label htmlFor="stk-amount">Amount (KES) *</Label>
          <Input id="stk-amount" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="5000" min="1" required />
        </div>
        <div>
          <Label htmlFor="stk-desc">Description</Label>
          <Input id="stk-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Catering deposit" />
        </div>
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

function AddContributionModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const add = useAddContribution(weddingId)
  const { toast } = useToast()
  const [form, setForm] = useState({ memberName: '', pledgeAmount: '', dueDate: '' })

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    void (async () => {
      try {
        await add.mutateAsync({ memberName: form.memberName, pledgeAmount: parseFloat(form.pledgeAmount), status: 'PLEDGED', dueDate: form.dueDate || undefined })
        toast('Contribution pledge recorded', 'success')
        onClose()
      } catch {
        toast('Failed to record contribution', 'error')
      }
    })()
  }

  return (
    <Modal onClose={onClose} title="Add contribution pledge">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="contrib-name">Member name *</Label>
          <Input id="contrib-name" value={form.memberName} onChange={e => setForm(f => ({ ...f, memberName: e.target.value }))} placeholder="Jane Doe" required />
        </div>
        <div>
          <Label htmlFor="contrib-amount">Pledge amount (KES) *</Label>
          <Input id="contrib-amount" type="number" value={form.pledgeAmount} onChange={e => setForm(f => ({ ...f, pledgeAmount: e.target.value }))} placeholder="10000" min="1" required />
        </div>
        <div>
          <Label htmlFor="contrib-due">Due date</Label>
          <Input id="contrib-due" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={add.isPending}>{add.isPending ? 'Adding…' : 'Record pledge'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function PaymentsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: payments = [], isLoading: loadingPayments } = usePayments(wid)
  const { data: contributions = [], isLoading: loadingContrib } = useContributions(wid)
  const summary = usePaymentSummary(wid)
  const [showStk, setShowStk] = useState(false)
  const [showContrib, setShowContrib] = useState(false)
  const [tab, setTab] = useState<'payments' | 'contributions'>('payments')
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-4xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Finance</p>
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Payments</h1>
            <p className="text-sm text-zinc-400 mt-2">M-Pesa tracking &amp; committee contributions</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowContrib(true)} size="sm" variant="secondary"><Plus size={14} /> Contribution</Button>
            <Button onClick={() => setShowStk(true)} size="sm"><Phone size={14} /> STK Push</Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-zinc-100">
          {[
            { label: 'Total received', val: fmt(summary.totalReceived), color: 'text-emerald-600' },
            { label: 'Pledged', val: fmt(summary.totalPledged), color: 'text-sky-600' },
            { label: 'Pending', val: String(summary.pendingPayments), color: 'text-amber-500' },
            { label: summary.disputed > 0 ? 'Disputed' : 'Overdue pledges', val: String(summary.disputed > 0 ? summary.disputed : summary.overdue), color: (summary.disputed > 0 || summary.overdue > 0) ? 'text-red-500' : 'text-[#14161C]' },
          ].map(({ label, val, color }, i) => (
            <div key={label} className={i === 0 ? 'pr-8' : i === 3 ? 'pl-8' : 'px-8'}>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-2xl font-extrabold leading-none ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          {(['payments', 'contributions'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${
                tab === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100">
            <p className="text-sm font-semibold text-[#14161C]">
              {tab === 'payments' ? `${payments.length} payment${payments.length !== 1 ? 's' : ''}` : `${contributions.length} contribution${contributions.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {tab === 'payments' && (
            loadingPayments ? <div className="flex justify-center py-12"><Spinner /></div>
            : payments.length === 0
              ? <EmptyState icon={<DollarSign size={36} />} title="No payments yet" description="Request M-Pesa payments using STK Push"
                  action={<Button onClick={() => setShowStk(true)} size="sm"><Phone size={14} /> Send STK Push</Button>} />
              : payments.map(p => <PaymentRow key={p.id} {...p} />)
          )}

          {tab === 'contributions' && (
            loadingContrib ? <div className="flex justify-center py-12"><Spinner /></div>
            : contributions.length === 0
              ? <EmptyState icon={<DollarSign size={36} />} title="No contributions yet" description="Record committee contribution pledges"
                  action={<Button onClick={() => setShowContrib(true)} size="sm"><Plus size={14} /> Add pledge</Button>} />
              : contributions.map(c => <ContributionRow key={c.id} {...c} />)
          )}
        </div>
      </div>

      {showStk && <StkPushModal weddingId={wid} onClose={() => setShowStk(false)} />}
      {showContrib && <AddContributionModal weddingId={wid} onClose={() => setShowContrib(false)} />}
    </div>
  )
}
