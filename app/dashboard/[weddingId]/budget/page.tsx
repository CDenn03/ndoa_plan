'use client'
import { useState, use } from 'react';
import { DollarSign, Plus, X } from 'lucide-react'
import { Button, Input, Select, Label, ProgressBar, EmptyState, Spinner, Modal } from '@/components/ui'
import { useBudgetLines, useBudgetSummary, useAddBudgetLine } from '@/hooks/use-data'

const CATEGORIES = ['VENUE','CATERING','PHOTOGRAPHY','VIDEOGRAPHY','DECOR','FLOWERS','MUSIC','TRANSPORT','ATTIRE','CAKE','INVITATIONS','ACCOMMODATION','HONEYMOON','MISCELLANEOUS']

export default function BudgetPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params);
  const wid = params.weddingId
  const { isLoading } = useBudgetLines(wid)
  const { totalEstimated, totalActual, totalCommitted, byCategory, lines } = useBudgetSummary(wid)
  const addLine = useAddBudgetLine(wid)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ category: 'VENUE', description: '', estimated: '', actual: '', committed: '' })

  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)
  const pct = totalEstimated > 0 ? Math.round((totalCommitted / totalEstimated) * 100) : 0

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    await addLine.mutateAsync({
      weddingId: wid, category: form.category, description: form.description,
      estimated: parseFloat(form.estimated) || 0, actual: parseFloat(form.actual) || 0, committed: parseFloat(form.committed) || 0,
    })
    setShowAdd(false)
    setForm({ category: 'VENUE', description: '', estimated: '', actual: '', committed: '' })
  }

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-4xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Finance</p>
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Budget</h1>
            <p className="text-sm text-zinc-400 mt-2">{lines.length} line items</p>
          </div>
          <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} /> Add line</Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">

        {/* Summary stats — open layout */}
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

        <hr className="border-zinc-100" />

        {/* Category breakdown — open rows, no cards */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : lines.length === 0 ? (
          <EmptyState icon={<DollarSign size={40} />} title="No budget lines yet" description="Add line items to track your wedding budget"
            action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add line item</Button>} />
        ) : (
          <div className="space-y-0">
            {Object.entries(byCategory).sort((a, b) => b[1].estimated - a[1].estimated).map(([cat, totals]) => {
              const catPct = totals.estimated > 0 ? Math.round(((totals.actual + totals.committed) / totals.estimated) * 100) : 0
              return (
                <div key={cat} className="py-5 border-b border-zinc-100 last:border-0">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-[#14161C]">{cat.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">Budget: {fmt(totals.estimated)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${catPct > 100 ? 'text-red-500' : 'text-[#14161C]'}`}>
                        {fmt(totals.actual + totals.committed)}
                      </p>
                      <p className="text-xs text-zinc-400">{catPct}% used</p>
                    </div>
                  </div>
                  <ProgressBar value={totals.actual + totals.committed} max={totals.estimated || 1} />
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
              <Label>Category</Label>
              <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </Select>
            </div>
            <div>
              <Label>Description *</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Main hall rental" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[['estimated', 'Estimated'], ['committed', 'Committed'], ['actual', 'Actual']] .map(([key, label]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input type="number" value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder="0" min="0" />
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

