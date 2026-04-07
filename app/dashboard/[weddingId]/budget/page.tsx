'use client'
import { useState } from 'react'
import { DollarSign, Plus, X, TrendingUp } from 'lucide-react'
import { Button, Input, Select, Card, CardHeader, CardContent, CardTitle, StatCard, ProgressBar, EmptyState, Spinner } from '@/components/ui'
import { useBudgetLines, useBudgetSummary, useAddBudgetLine } from '@/hooks/use-data'

const CATEGORIES = ['VENUE','CATERING','PHOTOGRAPHY','VIDEOGRAPHY','DECOR','FLOWERS','MUSIC','TRANSPORT','ATTIRE','CAKE','INVITATIONS','ACCOMMODATION','HONEYMOON','MISCELLANEOUS']

export default function BudgetPage({ params }: { params: { weddingId: string } }) {
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
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Budget</h1>
          <p className="text-sm text-zinc-500">{lines.length} line items</p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={15} /> Add line</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total budget" value={fmt(totalEstimated)} />
        <StatCard label="Spent" value={fmt(totalActual)} color="red" />
        <StatCard label="Committed" value={fmt(totalCommitted)} color="amber" />
        <StatCard label="Remaining" value={fmt(Math.max(0, totalEstimated - totalCommitted))} color={totalCommitted > totalEstimated ? 'red' : 'green'} />
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Budget utilisation</span>
            <span className={`font-semibold ${pct > 100 ? 'text-red-500' : pct > 85 ? 'text-amber-500' : 'text-zinc-900 dark:text-zinc-100'}`}>{pct}%</span>
          </div>
          <ProgressBar value={totalCommitted} max={totalEstimated} />
        </CardContent>
      </Card>

      {/* Category breakdown */}
      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (
        <div className="space-y-3">
          {Object.entries(byCategory).sort((a, b) => b[1].estimated - a[1].estimated).map(([cat, totals]) => {
            const catPct = totals.estimated > 0 ? Math.round(((totals.actual + totals.committed) / totals.estimated) * 100) : 0
            return (
              <Card key={cat}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{cat.replace('_', ' ')}</p>
                      <p className="text-xs text-zinc-400">Budget: {fmt(totals.estimated)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${catPct > 100 ? 'text-red-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        {fmt(totals.actual + totals.committed)}
                      </p>
                      <p className="text-xs text-zinc-400">{catPct}% used</p>
                    </div>
                  </div>
                  <ProgressBar value={totals.actual + totals.committed} max={totals.estimated || 1} />
                </CardContent>
              </Card>
            )
          })}

          {lines.length === 0 && (
            <EmptyState icon={<DollarSign size={40} />} title="No budget lines yet" description="Add line items to track your wedding budget"
              action={<Button onClick={() => setShowAdd(true)}><Plus size={15} />Add line item</Button>} />
          )}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="font-semibold">Add budget line</h2>
              <button onClick={() => setShowAdd(false)}><X size={18} className="text-zinc-400" /></button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Main hall rental" required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[['estimated', 'Estimated'], ['committed', 'Committed'], ['actual', 'Actual']].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1">{label}</label>
                    <Input type="number" value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder="0" min="0" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1" disabled={addLine.isPending}>{addLine.isPending ? 'Adding...' : 'Add line'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
