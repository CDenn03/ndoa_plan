'use client'
import { useState, useMemo, use } from 'react'
import { DollarSign, Plus, Lightbulb, LayoutTemplate, CalendarDays, Pencil, Trash2 } from 'lucide-react'
import { Button, Input, Select, Label, ProgressBar, EmptyState, Spinner, Modal } from '@/components/ui'
import { useBudgetLines, useAddBudgetLine } from '@/hooks/use-data'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import { format } from 'date-fns'
import type { LocalBudgetLine } from '@/types'

const CATEGORIES = ['VENUE','CATERING','PHOTOGRAPHY','VIDEOGRAPHY','DECOR','FLOWERS','MUSIC','TRANSPORT','ATTIRE','CAKE','INVITATIONS','ACCOMMODATION','HONEYMOON','MISCELLANEOUS']
const SUGGESTED_ALLOC: Record<string, number> = {
  CATERING: 0.45, VENUE: 0.20, DECOR: 0.10, PHOTOGRAPHY: 0.08,
  ATTIRE: 0.06, MUSIC: 0.04, TRANSPORT: 0.03, CAKE: 0.02,
  INVITATIONS: 0.01, MISCELLANEOUS: 0.01,
}
const PAYMENT_TYPES = ['FULL', 'DEPOSIT', 'INSTALLMENT', 'BALANCE']

interface WeddingEvent { id: string; name: string; type: string; date: string }
interface Vendor { id: string; name: string; category: string }

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

function summarise(lines: LocalBudgetLine[]) {
  return lines.reduce(
    (acc, l) => ({ estimated: acc.estimated + l.estimated, actual: acc.actual + l.actual, committed: acc.committed + l.committed }),
    { estimated: 0, actual: 0, committed: 0 },
  )
}

// ─── Budget line form (add + edit) ───────────────────────────────────────────

function BudgetLineModal({ weddingId, eventId, events, vendors, line, onClose }: Readonly<{
  weddingId: string; eventId?: string; events: WeddingEvent[]; vendors: Vendor[]
  line?: LocalBudgetLine; onClose: () => void
}>) {
  const { toast } = useToast()
  const addLine = useAddBudgetLine(weddingId)
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    category: line?.category ?? 'VENUE',
    description: line?.description ?? '',
    estimated: line ? String(line.estimated) : '',
    committed: line ? String(line.committed) : '',
    actual: line ? String(line.actual) : '',
    vendorId: line?.vendorId ?? '',
    vendorName: line?.vendorName ?? '',
    notes: line?.notes ?? '',
    paymentDate: line?.paymentDate ? line.paymentDate.split('T')[0] : '',
    paymentPlan: line?.paymentPlan ?? '',
    paymentType: line?.paymentType ?? '',
    selectedEventId: eventId ?? line?.eventId ?? '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.selectedEventId && !line) {
      toast('Please select an event for this budget line', 'error'); return
    }
    setSaving(true)
    try {
      const payload = {
        weddingId, eventId: form.selectedEventId || undefined,
        category: form.category, description: form.description,
        estimated: parseFloat(form.estimated) || 0,
        committed: parseFloat(form.committed) || 0,
        actual: parseFloat(form.actual) || 0,
        vendorId: form.vendorId || undefined,
        vendorName: form.vendorName || undefined,
        notes: form.notes || undefined,
        paymentDate: form.paymentDate || undefined,
        paymentPlan: form.paymentPlan || undefined,
        paymentType: form.paymentType || undefined,
      }
      if (line) {
        await fetch(`/api/weddings/${weddingId}/budget/${line.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
        toast('Budget line updated', 'success')
      } else {
        await addLine.mutateAsync(payload)
        toast('Budget line added', 'success')
      }
      onClose()
    } catch { toast(line ? 'Failed to update' : 'Failed to add budget line', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title={line ? 'Edit budget line' : 'Add budget line'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!eventId && (
          <div><Label htmlFor="bl-event">Event {!line && '*'}</Label>
            <Select id="bl-event" value={form.selectedEventId} onChange={e => setForm(f => ({ ...f, selectedEventId: e.target.value }))}>
              <option value="">Select event…</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </Select></div>
        )}
        <div><Label htmlFor="bl-cat">Category</Label>
          <Select id="bl-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </Select></div>
        <div><Label htmlFor="bl-desc">Description *</Label>
          <Input id="bl-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Main hall rental" required /></div>
        <div className="grid grid-cols-3 gap-3">
          {[['estimated', 'Estimated'], ['committed', 'Committed'], ['actual', 'Actual']].map(([key, lbl]) => (
            <div key={key}><Label htmlFor={`bl-${key}`}>{lbl}</Label>
              <Input id={`bl-${key}`} type="number" value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder="0" min="0" /></div>
          ))}
        </div>
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
        <div><Label htmlFor="bl-plan">Payment plan / notes</Label>
          <Input id="bl-plan" value={form.paymentPlan} onChange={e => setForm(f => ({ ...f, paymentPlan: e.target.value }))} placeholder="e.g. 50% deposit, 50% on day" /></div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving || addLine.isPending}>
            {(saving || addLine.isPending) ? (line ? 'Saving…' : 'Adding…') : (line ? 'Save' : 'Add line')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Load template modal ──────────────────────────────────────────────────────

function LoadBudgetTemplateModal({ weddingId, eventId, onClose }: Readonly<{ weddingId: string; eventId: string; onClose: () => void }>) {
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
      if (!res.ok) throw new Error()
      await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
      toast('Budget template applied', 'success'); onClose()
    } catch { toast('Failed to apply template', 'error') } finally { setApplying(null) }
  }
  return (
    <Modal onClose={onClose} title="Load budget template">
      <div className="space-y-3">
        <p className="text-xs text-zinc-400">Appends suggested budget line items to this event.</p>
        {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> :
          templates.length === 0 ? <p className="text-sm text-zinc-400 text-center py-6">No templates available</p> : (
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-3 border-b border-zinc-100 last:border-0">
                  <div><p className="text-sm font-semibold text-[#14161C]">{t.name}</p><p className="text-xs text-zinc-400">{(t.data as unknown[]).length} line items</p></div>
                  <Button size="sm" variant="lavender" onClick={() => void handleApply(t.id)} disabled={applying === t.id}>{applying === t.id ? <Spinner size="sm" /> : 'Apply'}</Button>
                </div>
              ))}
            </div>
          )}
      </div>
    </Modal>
  )
}

// ─── Category breakdown ───────────────────────────────────────────────────────

function CategoryBreakdown({ lines, weddingId, events, vendors, onEdit }: Readonly<{
  lines: LocalBudgetLine[]; weddingId: string; events: WeddingEvent[]; vendors: Vendor[]
  onEdit: (line: LocalBudgetLine) => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()

  const handleDelete = async (line: LocalBudgetLine) => {
    if (!confirm('Delete this budget line?')) return
    try {
      await fetch(`/api/weddings/${weddingId}/budget/${line.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
      toast('Budget line deleted', 'success')
    } catch { toast('Failed to delete', 'error') }
  }

  const byCategory = useMemo(() =>
    lines.reduce<Record<string, { estimated: number; actual: number; committed: number; lines: LocalBudgetLine[] }>>((acc, l) => {
      if (!acc[l.category]) acc[l.category] = { estimated: 0, actual: 0, committed: 0, lines: [] }
      acc[l.category].estimated += l.estimated; acc[l.category].actual += l.actual
      acc[l.category].committed += l.committed; acc[l.category].lines.push(l)
      return acc
    }, {}),
  [lines])

  if (Object.keys(byCategory).length === 0) return null

  return (
    <div className="space-y-0">
      <div className="grid grid-cols-4 gap-4 pb-2 border-b border-zinc-100">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest col-span-1">Category</p>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Estimated</p>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Committed</p>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Variance</p>
      </div>
      {Object.entries(byCategory).sort((a, b) => b[1].estimated - a[1].estimated).map(([cat, totals]) => {
        const committed = totals.actual + totals.committed
        const variance = totals.estimated - committed
        const catPct = totals.estimated > 0 ? Math.round((committed / totals.estimated) * 100) : 0
        return (
          <div key={cat} className="py-4 border-b border-zinc-100 last:border-0">
            <div className="grid grid-cols-4 gap-4 mb-2">
              <div className="col-span-1"><p className="text-sm font-semibold text-[#14161C]">{cat.replace(/_/g, ' ')}</p><p className="text-xs text-zinc-400 mt-0.5">{catPct}% used</p></div>
              <p className="text-sm font-medium text-zinc-500 text-right self-center">{fmt(totals.estimated)}</p>
              <p className={`text-sm font-bold text-right self-center ${catPct > 100 ? 'text-red-500' : 'text-[#14161C]'}`}>{fmt(committed)}</p>
              <p className={`text-sm font-bold text-right self-center ${variance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{variance < 0 ? '-' : '+'}{fmt(Math.abs(variance))}</p>
            </div>
            <ProgressBar value={committed} max={totals.estimated || 1} />
            <div className="mt-2 space-y-1">
              {totals.lines.map(l => (
                <div key={l.id} className="group flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-zinc-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-700 truncate">{l.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {(l.vendorName ?? l.vendorId) && <span className="text-[10px] text-violet-500">{l.vendorName ?? 'Vendor'}</span>}
                      {l.paymentType && <span className="text-[10px] text-zinc-400 bg-zinc-100 rounded px-1">{l.paymentType}</span>}
                      {l.paymentDate && <span className="text-[10px] text-zinc-400">{format(new Date(l.paymentDate), 'MMM d, yyyy')}</span>}
                      {l.paymentPlan && <span className="text-[10px] text-zinc-400 italic truncate max-w-32">{l.paymentPlan}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500 flex-shrink-0">{fmt(l.estimated)}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => onEdit(l)} className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" aria-label="Edit"><Pencil size={11} /></button>
                    <button onClick={() => handleDelete(l)} className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500" aria-label="Delete"><Trash2 size={11} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Overall tab ──────────────────────────────────────────────────────────────

function OverallTab({ lines, events, vendors, isLoading, weddingId, onAddLine }: Readonly<{
  lines: LocalBudgetLine[]; events: WeddingEvent[]; vendors: Vendor[]
  isLoading: boolean; weddingId: string; onAddLine: () => void
}>) {
  const [editingLine, setEditingLine] = useState<LocalBudgetLine | null>(null)
  const { estimated: totalEstimated, actual: totalActual, committed: totalCommitted } = summarise(lines)
  const pct = totalEstimated > 0 ? Math.round(((totalActual + totalCommitted) / totalEstimated) * 100) : 0

  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent | null; lines: LocalBudgetLine[] }>()
    for (const e of events) map.set(e.id, { event: e, lines: [] })
    for (const l of lines) {
      const key = l.eventId ?? '__unassigned__'
      if (!map.has(key)) map.set(key, { event: null, lines: [] })
      map.get(key)!.lines.push(l)
    }
    return map
  }, [lines, events])

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (lines.length === 0) return (
    <EmptyState icon={<DollarSign size={40} />} title="No budget lines yet"
      description="Add line items inside each event tab to get started"
      action={<Button onClick={onAddLine}><Plus size={14} /> Add line</Button>} />
  )

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-zinc-100">
        {[
          { label: 'Total budget', val: fmt(totalEstimated), color: 'text-[#14161C]' },
          { label: 'Spent', val: fmt(totalActual), color: 'text-red-500' },
          { label: 'Committed', val: fmt(totalCommitted), color: 'text-amber-500' },
          { label: 'Remaining', val: fmt(Math.max(0, totalEstimated - totalActual - totalCommitted)), color: pct > 100 ? 'text-red-500' : 'text-emerald-600' },
        ].map(({ label, val, color }, i) => (
          <div key={label} className={i === 0 ? 'pr-8' : i === 3 ? 'pl-8' : 'px-8'}>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-extrabold leading-none ${color}`}>{val}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Overall utilisation</span>
          <span className={`font-bold ${pct > 100 ? 'text-red-500' : pct > 85 ? 'text-amber-500' : 'text-[#14161C]'}`}>{pct}%</span>
        </div>
        <ProgressBar value={totalActual + totalCommitted} max={totalEstimated} />
      </div>
      <div className="space-y-4">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">By event</p>
        {Array.from(byEvent.entries()).map(([key, { event, lines: evLines }]) => {
          if (evLines.length === 0) return null
          const s = summarise(evLines)
          const evPct = s.estimated > 0 ? Math.round(((s.actual + s.committed) / s.estimated) * 100) : 0
          const evVariance = s.estimated - (s.actual + s.committed)
          return (
            <div key={key} className="rounded-2xl border border-zinc-100 p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <CalendarDays size={15} className="text-zinc-400" />
                  <p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p>
                  <span className="text-xs text-zinc-400">{evLines.length} lines</span>
                </div>
                <div className="flex gap-6 text-right">
                  <div><p className="text-xs text-zinc-400">Estimated</p><p className="text-sm font-bold text-[#14161C]">{fmt(s.estimated)}</p></div>
                  <div><p className="text-xs text-zinc-400">Committed</p><p className={`text-sm font-bold ${evPct > 100 ? 'text-red-500' : 'text-amber-500'}`}>{fmt(s.actual + s.committed)}</p></div>
                  <div><p className="text-xs text-zinc-400">Variance</p><p className={`text-sm font-bold ${evVariance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{evVariance < 0 ? '-' : '+'}{fmt(Math.abs(evVariance))}</p></div>
                </div>
              </div>
              <ProgressBar value={s.actual + s.committed} max={s.estimated || 1} />
            </div>
          )
        })}
      </div>
      <div>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">All categories</p>
        <CategoryBreakdown lines={lines} weddingId={weddingId} events={events} vendors={vendors} onEdit={setEditingLine} />
      </div>
      {editingLine && <BudgetLineModal weddingId={weddingId} events={events} vendors={vendors} line={editingLine} onClose={() => setEditingLine(null)} />}
    </div>
  )
}

// ─── Event tab ────────────────────────────────────────────────────────────────

function EventBudgetTab({ weddingId, event, events, vendors }: Readonly<{ weddingId: string; event: WeddingEvent; events: WeddingEvent[]; vendors: Vendor[] }>) {
  const { data: allLines = [], isLoading } = useBudgetLines(weddingId)
  const [showAdd, setShowAdd] = useState(false)
  const [showAlloc, setShowAlloc] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [editingLine, setEditingLine] = useState<LocalBudgetLine | null>(null)

  const lines = useMemo(() => allLines.filter(l => l.eventId === event.id), [allLines, event.id])
  const { estimated: totalEstimated, actual: totalActual, committed: totalCommitted } = summarise(lines)
  const pct = totalEstimated > 0 ? Math.round(((totalActual + totalCommitted) / totalEstimated) * 100) : 0

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-zinc-400">{lines.length} line items</p>
        <div className="flex gap-2">
          <Button variant="lavender" size="sm" onClick={() => setShowAlloc(v => !v)}><Lightbulb size={13} /> Suggest allocation</Button>
          <Button variant="lavender" size="sm" onClick={() => setShowTemplate(true)}><LayoutTemplate size={13} /> Load template</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add line</Button>
        </div>
      </div>
      {showAlloc && totalEstimated > 0 && (
        <div className="bg-[#E5DF98]/30 rounded-2xl p-5 border border-[#E5DF98] space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#14161C]">Suggested allocation for {fmt(totalEstimated)}</p>
            <Button variant="ghost" size="sm" onClick={() => setShowAlloc(false)}>Dismiss</Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(SUGGESTED_ALLOC).map(([cat, pctAlloc]) => (
              <div key={cat} className="text-xs">
                <span className="font-semibold text-zinc-600">{cat.replace(/_/g, ' ')}</span>
                <span className="text-zinc-400 ml-1">{fmt(totalEstimated * pctAlloc)} ({Math.round(pctAlloc * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {lines.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-zinc-100">
            {[
              { label: 'Estimated', val: fmt(totalEstimated), color: 'text-[#14161C]' },
              { label: 'Spent', val: fmt(totalActual), color: 'text-red-500' },
              { label: 'Committed', val: fmt(totalCommitted), color: 'text-amber-500' },
              { label: 'Remaining', val: fmt(Math.max(0, totalEstimated - totalActual - totalCommitted)), color: pct > 100 ? 'text-red-500' : 'text-emerald-600' },
            ].map(({ label, val, color }, i) => (
              <div key={label} className={i === 0 ? 'pr-8' : i === 3 ? 'pl-8' : 'px-8'}>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-2xl font-extrabold leading-none ${color}`}>{val}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Budget utilisation</span>
              <span className={`font-bold ${pct > 100 ? 'text-red-500' : pct > 85 ? 'text-amber-500' : 'text-[#14161C]'}`}>{pct}%</span>
            </div>
            <ProgressBar value={totalActual + totalCommitted} max={totalEstimated} />
          </div>
          <CategoryBreakdown lines={lines} weddingId={weddingId} events={events} vendors={vendors} onEdit={setEditingLine} />
        </>
      )}
      {lines.length === 0 && (
        <EmptyState icon={<DollarSign size={40} />} title="No budget lines for this event"
          description="Add line items or load a template to get started"
          action={<Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add line item</Button>} />
      )}
      {showAdd && <BudgetLineModal weddingId={weddingId} eventId={event.id} events={events} vendors={vendors} onClose={() => setShowAdd(false)} />}
      {editingLine && <BudgetLineModal weddingId={weddingId} events={events} vendors={vendors} line={editingLine} onClose={() => setEditingLine(null)} />}
      {showTemplate && <LoadBudgetTemplateModal weddingId={weddingId} eventId={event.id} onClose={() => setShowTemplate(false)} />}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: lines = [], isLoading: linesLoading } = useBudgetLines(wid)
  const [activeTab, setActiveTab] = useState('__overall__')
  const [showAddFromOverall, setShowAddFromOverall] = useState(false)

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/events`); if (!res.ok) throw new Error(); return res.json() },
    staleTime: 60_000,
  })
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors', wid, 'select'],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/vendors`); if (!res.ok) return []; return res.json() },
    staleTime: 60_000,
  })

  const isLoading = linesLoading || eventsLoading
  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name }))]
  const activeEvent = events.find(e => e.id === activeTab)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-zinc-100 bg-white">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Finance</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Budget</h1>
            {activeTab === '__overall__' && (
              <Button size="sm" onClick={() => setShowAddFromOverall(true)}><Plus size={14} /> Add line</Button>
            )}
          </div>
          <p className="text-sm text-zinc-400 mt-1 mb-6">{lines.length} total line items across {events.length} events</p>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px">
            {isLoading ? <div className="pb-4"><Spinner size="sm" /></div> : (
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
        {activeTab === '__overall__'
          ? <OverallTab lines={lines} events={events} vendors={vendors} isLoading={isLoading} weddingId={wid} onAddLine={() => setShowAddFromOverall(true)} />
          : activeEvent
            ? <EventBudgetTab weddingId={wid} event={activeEvent} events={events} vendors={vendors} />
            : null}
      </div>
      {showAddFromOverall && <BudgetLineModal weddingId={wid} events={events} vendors={vendors} onClose={() => setShowAddFromOverall(false)} />}
    </div>
  )
}
