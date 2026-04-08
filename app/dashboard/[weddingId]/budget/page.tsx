'use client'
import { useState, useMemo, use } from 'react'
import { DollarSign, Plus, Lightbulb } from 'lucide-react'
import { Button, Input, Select, Label, ProgressBar, EmptyState, Spinner, Modal } from '@/components/ui'
import { useBudgetLines, useBudgetSummary, useAddBudgetLine } from '@/hooks/use-data'

const CATEGORIES = ['VENUE','CATERING','PHOTOGRAPHY','VIDEOGRAPHY','DECOR','FLOWERS','MUSIC','TRANSPORT','ATTIRE','CAKE','INVITATIONS','ACCOMMODATION','HONEYMOON','MISCELLANEOUS']

// Suggested allocation percentages per category
const SUGGESTED_ALLOC: Record<string, number> = {
  CATERING: 0.45, VENUE: 0.20, DECOR: 0.10, PHOTOGRAPHY: 0.08,
  ATTIRE: 0.06, MUSIC: 0.04, TRANSPORT: 0.03, CAKE: 0.02,
  INVITATIONS: 0.01, MISCELLANEOUS: 0.01,
}

const PHASES = [
  { key: 'all', label: 'All phases' },
  { key: 'BUDGETING', label: 'Budgeting' },
  { key: 'PLANNING', label: 'Planning' },
  { key: 'PRE_WEDDING', label: 'Pre-Wedding' },
  { key: 'PROCUREMENT', label: 'Procurement' },
  { key: 'DAY_OF', label: 'Day-of' },
  { key: 'POST_WEDDING', label: 'Post-Wedding' },
]

export default function BudgetPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { isLoading } = useBudgetLines(wid)
  const { totalEstimated, totalActual, totalCommitted, lines } = useBudgetSummary(wid)
  const addLine = useAddBudgetLine(wid)
  const [showAdd, setShowAdd] = useState(false)
  const [showAlloc, setShowAlloc] = useState(false)
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [form, setForm] = useState({ category: 'VENUE', description: '', estimated: '', actual: '', committed: '', phase: '' })

  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)
  const pct = totalEstimated > 0 ? Math.round((totalCommitted / totalEstimated) * 100) : 0

  // Filter lines by phase
  const filteredLines = useMemo(() => {
    if (phaseFilter === 'all') return lines
    return lines.filter(l => (l as typeof l & { phase?: string }).phase === phaseFilter)
  }, [lines, phaseFilter])

  // Rebuild byCategory from filtered lines
  const filteredByCategory = useMemo(() => {
    return filteredLines.reduce<Record<string, { estimated: number; actual: number; committed: number }>>((acc, l) => {
      if (!acc[l.category]) acc[l.category] = { estimated: 0, actual: 0, committed: 0 }
      acc[l.category].estimated += l.estimated
      acc[l.category].actual += l.actual
      acc[l.category].committed += l.committed
      return acc
    }, {})
  }, [filteredLines])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    await addLine.mutateAsync({
      weddingId: wid, category: form.category, description: form.description,
      estimated: parseFloat(form.estimated) || 0, actual: parseFloat(form.actual) || 0, committed: parseFloat(form.committed) || 0,
    })
    setShowAdd(false)
    setForm({ category: 'VENUE', description: '', estimated: '', actual: '', committed: '', phase: '' })
  }

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-4xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Finance</p>
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Budget</h1>
            <p className="text-sm text-zinc-400 mt-2">{lines.length} line items</p>
          </div>
          <div className="flex gap-2">
            <Button variant="lavender" size="sm" onClick={() => setShowAlloc(v => !v)}>
              <Lightbulb size={13} /> Suggest allocation
            </Button>
            <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} /> Add line</Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">

        {/* Smart allocation suggestion */}
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

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-zinc-100">
          {[
            { label: 'Total budget', val: fmt(totalEstimated), color: 'text-[#14161C]' },
            { label: 'Spent', val: fmt(totalActual), color: 'text-red-500' },
            { label: 'Committed', val: fmt(totalCommitted), color: 'text-amber-500' },
            { label: 'Remaining', val: fmt(Math.max(0, totalEstimated - totalCommitted)), color: totalCommitted > totalEstimated ? 'text-red-500' : 'text-emerald-600' },
          ].map(({ label, val, color }, i) => (
            <div key={label} className={i === 0 ? 'pr-8' : i === 3 ? 'pl-8' : 'px-8'}>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-2xl font-extrabold leading-none ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* Utilisation bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Budget utilisation</span>
            <span className={`font-bold ${pct > 100 ? 'text-red-500' : pct > 85 ? 'text-amber-500' : 'text-[#14161C]'}`}>{pct}%</span>
          </div>
          <ProgressBar value={totalCommitted} max={totalEstimated} />
        </div>

        {/* Phase filter */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {PHASES.map(p => (
            <button key={p.key} onClick={() => setPhaseFilter(p.key)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                phaseFilter === p.key ? 'bg-[#14161C] text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-700'
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        <hr className="border-zinc-100" />

        {/* Category breakdown with variance */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : lines.length === 0 ? (
          <EmptyState icon={<DollarSign size={40} />} title="No budget lines yet" description="Add line items to track your wedding budget"
            action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add line item</Button>} />
        ) : Object.keys(filteredByCategory).length === 0 ? (
          <EmptyState icon={<DollarSign size={40} />} title="No lines in this phase" description="Add budget lines with a phase tag or select a different phase" />
        ) : (
          <div className="space-y-0">
            {/* Table header */}
            <div className="grid grid-cols-4 gap-4 pb-2 border-b border-zinc-100">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest col-span-1">Category</p>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Estimated</p>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Committed</p>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Variance</p>
            </div>
            {Object.entries(filteredByCategory).sort((a, b) => b[1].estimated - a[1].estimated).map(([cat, totals]) => {
              const committed = totals.actual + totals.committed
              const variance = totals.estimated - committed
              const catPct = totals.estimated > 0 ? Math.round((committed / totals.estimated) * 100) : 0
              return (
                <div key={cat} className="py-4 border-b border-zinc-100 last:border-0">
                  <div className="grid grid-cols-4 gap-4 mb-2">
                    <div className="col-span-1">
                      <p className="text-sm font-semibold text-[#14161C]">{cat.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{catPct}% used</p>
                    </div>
                    <p className="text-sm font-medium text-zinc-500 text-right self-center">{fmt(totals.estimated)}</p>
                    <p className={`text-sm font-bold text-right self-center ${catPct > 100 ? 'text-red-500' : 'text-[#14161C]'}`}>{fmt(committed)}</p>
                    <p className={`text-sm font-bold text-right self-center ${variance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {variance < 0 ? '-' : '+'}{fmt(Math.abs(variance))}
                    </p>
                  </div>
                  <ProgressBar value={committed} max={totals.estimated || 1} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <Modal onClose={() => setShowAdd(false)} title="Add budget line">
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <Label htmlFor="bl-cat">Category</Label>
              <Select id="bl-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="bl-phase">Phase</Label>
              <Select id="bl-phase" value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))}>
                <option value="">No phase</option>
                {PHASES.slice(1).map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="bl-desc">Description *</Label>
              <Input id="bl-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Main hall rental" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[['estimated', 'Estimated'], ['committed', 'Committed'], ['actual', 'Actual']].map(([key, label]) => (
                <div key={key}>
                  <Label htmlFor={`bl-${key}`}>{label}</Label>
                  <Input id={`bl-${key}`} type="number" value={form[key as keyof typeof form] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder="0" min="0" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={addLine.isPending}>{addLine.isPending ? 'Adding…' : 'Add line'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
