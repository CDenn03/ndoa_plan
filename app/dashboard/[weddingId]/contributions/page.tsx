'use client'
import { use, useState } from 'react'
import { Users, Plus, Pencil, Trash2, CalendarDays } from 'lucide-react'
import { Button, Input, Label, Select, EmptyState, Spinner, Modal } from '@/components/ui'
import { useContributions, useAddContribution } from '@/hooks/use-payments'
import { useToast } from '@/components/ui/toast'
import { format } from 'date-fns'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Contribution } from '@/hooks/use-payments'

interface WeddingEvent { id: string; name: string; type: string; date: string }

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)
function barColor(s: string) { return s === 'FULFILLED' ? 'bg-emerald-400' : s === 'OVERDUE' ? 'bg-red-400' : 'bg-[#CDB5F7]' }

function ContribModal({ weddingId, events, contrib, onClose }: Readonly<{
  weddingId: string; events: WeddingEvent[]; contrib?: Contribution; onClose: () => void
}>) {
  const add = useAddContribution(weddingId)
  const qc = useQueryClient()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    memberName: contrib?.memberName ?? '', pledgeAmount: contrib ? String(contrib.pledgeAmount) : '',
    paidAmount: contrib ? String(contrib.paidAmount) : '0', dueDate: contrib?.dueDate ? contrib.dueDate.split('T')[0] : '',
    notes: contrib?.notes ?? '', status: contrib?.status ?? 'PLEDGED', eventId: contrib?.eventId ?? '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      if (contrib) {
        await fetch(`/api/weddings/${weddingId}/contributions/${contrib.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberName: form.memberName, pledgeAmount: parseFloat(form.pledgeAmount), paidAmount: parseFloat(form.paidAmount), status: form.status, dueDate: form.dueDate || null, notes: form.notes || null, eventId: form.eventId || null }),
        })
        qc.invalidateQueries({ queryKey: ['contributions', weddingId] })
        toast('Contribution updated', 'success')
      } else {
        await add.mutateAsync({ memberName: form.memberName, pledgeAmount: parseFloat(form.pledgeAmount), status: 'PLEDGED', dueDate: form.dueDate || undefined, notes: form.notes || undefined, eventId: form.eventId || undefined })
        toast('Contribution recorded', 'success')
      }
      onClose()
    } catch { toast('Failed to save', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title={contrib ? 'Edit contribution' : 'Add contribution pledge'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="c-name">Member name *</Label>
          <Input id="c-name" value={form.memberName} onChange={e => setForm(f => ({ ...f, memberName: e.target.value }))} placeholder="Jane Doe" required /></div>
        <div><Label htmlFor="c-event">Event (optional)</Label>
          <Select id="c-event" value={form.eventId} onChange={e => setForm(f => ({ ...f, eventId: e.target.value }))}>
            <option value="">No specific event</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </Select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="c-pledge">Pledge (KES) *</Label>
            <Input id="c-pledge" type="number" value={form.pledgeAmount} onChange={e => setForm(f => ({ ...f, pledgeAmount: e.target.value }))} placeholder="10000" min="1" required /></div>
          <div><Label htmlFor="c-paid">Paid (KES)</Label>
            <Input id="c-paid" type="number" value={form.paidAmount} onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value }))} placeholder="0" min="0" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="c-status">Status</Label>
            <Select id="c-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof f.status }))}>
              <option value="PLEDGED">Pledged</option><option value="PARTIAL">Partial</option>
              <option value="FULFILLED">Fulfilled</option><option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </Select></div>
          <div><Label htmlFor="c-due">Due date</Label>
            <Input id="c-due" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
        </div>
        <div><Label htmlFor="c-notes">Notes</Label>
          <Input id="c-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" /></div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving || add.isPending}>{(saving || add.isPending) ? 'Saving…' : (contrib ? 'Save' : 'Record pledge')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function ContribRow({ contrib, weddingId, events, onEdit }: Readonly<{
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
      qc.invalidateQueries({ queryKey: ['contributions', weddingId] })
      toast('Contribution deleted', 'success')
    } catch { toast('Failed to delete', 'error') }
  }

  return (
    <div className="group flex items-center gap-4 py-3.5 border-b border-zinc-100 last:border-0 px-6">
      <div className="w-9 h-9 rounded-full bg-[#CDB5F7]/20 flex items-center justify-center text-xs font-bold text-violet-600 flex-shrink-0">
        {contrib.memberName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[#14161C]">{contrib.memberName}</p>
          {eventName && <span className="text-[10px] text-violet-500 bg-violet-50 rounded-full px-1.5 py-0.5">{eventName}</span>}
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
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => onEdit(contrib)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors" aria-label="Edit"><Pencil size={13} /></button>
        <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors" aria-label="Delete"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

export default function ContributionsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: contributions = [], isLoading } = useContributions(wid)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Contribution | null>(null)
  const [activeTab, setActiveTab] = useState('__overall__')

  const { data: events = [] } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/events`); if (!res.ok) throw new Error(); return res.json() },
    staleTime: 60_000,
  })

  const totalPledged = contributions.reduce((s, c) => s + c.pledgeAmount, 0)
  const totalPaid = contributions.reduce((s, c) => s + c.paidAmount, 0)
  const overdue = contributions.filter(c => c.status === 'OVERDUE').length
  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name }))]

  const filtered = activeTab === '__overall__'
    ? contributions
    : contributions.filter(c => c.eventId === activeTab)

  const byEvent = (() => {
    const map = new Map<string, { event: WeddingEvent | null; contribs: Contribution[] }>()
    for (const e of events) map.set(e.id, { event: e, contribs: [] })
    for (const c of contributions) {
      const k = c.eventId ?? '__unassigned__'
      if (!map.has(k)) map.set(k, { event: null, contribs: [] })
      map.get(k)!.contribs.push(c)
    }
    return map
  })()

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Finance</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Contributions</h1>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add pledge</Button>
          </div>
          <p className="text-sm text-zinc-400 mt-1 mb-6">
            {contributions.length} pledges · {fmt(totalPaid)} of {fmt(totalPledged)} collected
            {overdue > 0 && <span className="ml-2 text-red-500 font-semibold">· {overdue} overdue</span>}
          </p>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-[#14161C] text-[#14161C]' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 space-y-8">
        <div className="grid grid-cols-3 gap-0 divide-x divide-zinc-100">
          <div className="pr-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Total pledged</p><p className="text-2xl font-extrabold text-sky-600">{fmt(totalPledged)}</p></div>
          <div className="px-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Collected</p><p className="text-2xl font-extrabold text-emerald-600">{fmt(totalPaid)}</p></div>
          <div className="pl-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Outstanding</p><p className={`text-2xl font-extrabold ${totalPledged - totalPaid > 0 ? 'text-amber-500' : 'text-[#14161C]'}`}>{fmt(Math.max(0, totalPledged - totalPaid))}</p></div>
        </div>

        {activeTab === '__overall__' && events.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">By event</p>
            {Array.from(byEvent.entries()).map(([key, { event, contribs }]) => {
              if (contribs.length === 0) return null
              const evPledged = contribs.reduce((s, c) => s + c.pledgeAmount, 0)
              const evPaid = contribs.reduce((s, c) => s + c.paidAmount, 0)
              return (
                <div key={key} className="rounded-2xl border border-zinc-100 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={15} className="text-zinc-400" />
                    <p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p>
                    <span className="text-xs text-zinc-400">{contribs.length} pledges</span>
                  </div>
                  <div className="flex gap-6 text-right">
                    <div><p className="text-xs text-zinc-400">Pledged</p><p className="text-sm font-bold text-sky-600">{fmt(evPledged)}</p></div>
                    <div><p className="text-xs text-zinc-400">Paid</p><p className="text-sm font-bold text-emerald-600">{fmt(evPaid)}</p></div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {isLoading ? <div className="flex justify-center py-16"><Spinner /></div> :
          filtered.length === 0 ? (
            <EmptyState icon={<Users size={40} />} title="No contributions yet"
              description="Record committee member pledges"
              action={<Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add pledge</Button>} />
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              {filtered.map(c => <ContribRow key={c.id} contrib={c} weddingId={wid} events={events} onEdit={setEditing} />)}
            </div>
          )}
      </div>

      {showAdd && <ContribModal weddingId={wid} events={events} onClose={() => setShowAdd(false)} />}
      {editing && <ContribModal weddingId={wid} events={events} contrib={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
