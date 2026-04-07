'use client'
import { useState, useMemo } from 'react'
import { CheckSquare, Plus, X } from 'lucide-react'
import { Button, Input, Select, Card, CardHeader, CardContent, CardTitle, ProgressBar, EmptyState, Spinner } from '@/components/ui'
import { useChecklistItems, useToggleChecklistItem, useAddChecklistItem } from '@/hooks/use-data'
import { format } from 'date-fns'
import type { LocalChecklistItem } from '@/types'

const CATEGORIES = ['VENUE','CATERING','ATTIRE','PHOTOGRAPHY','MUSIC','TRANSPORT','LEGAL','INVITATIONS','DECORATIONS','OTHER']
const PRIORITY_LABEL = ['', 'High', 'Medium', 'Low']
const PRIORITY_COLOR = ['', 'text-red-500', 'text-amber-500', 'text-blue-500']

function ChecklistRow({ item, weddingId }: { item: LocalChecklistItem; weddingId: string }) {
  const toggle = useToggleChecklistItem(weddingId)
  const overdue = item.dueDate && !item.isChecked && new Date(item.dueDate) < new Date()

  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 transition-colors ${item.isChecked ? 'opacity-60' : ''}`}>
      <button
        onClick={() => toggle.mutate({ itemId: item.id, currentVersion: item.version })}
        disabled={toggle.isPending}
        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          item.isChecked ? 'bg-violet-600 border-violet-600' : 'border-zinc-300 dark:border-zinc-600 hover:border-violet-500'
        }`}
      >
        {item.isChecked && (
          <svg viewBox="0 0 12 10" className="w-3 h-3 fill-white">
            <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium ${item.isChecked ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
            {item.title}
          </p>
          {item.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Pending sync" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {item.category && <span className="text-xs text-zinc-400">{item.category}</span>}
          {item.dueDate && (
            <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-zinc-400'}`}>
              {overdue ? '⚠ ' : ''}Due {format(new Date(item.dueDate), 'MMM d')}
            </span>
          )}
          {item.priority <= 2 && (
            <span className={`text-xs font-medium ${PRIORITY_COLOR[item.priority]}`}>
              {PRIORITY_LABEL[item.priority]}
            </span>
          )}
        </div>
        {item.description && <p className="text-xs text-zinc-400 mt-0.5">{item.description}</p>}
      </div>
    </div>
  )
}

function AddItemModal({ weddingId, onClose }: { weddingId: string; onClose: () => void }) {
  const add = useAddChecklistItem(weddingId)
  const [form, setForm] = useState({ title: '', description: '', category: 'VENUE', dueDate: '', priority: '2', order: '0' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    await add.mutateAsync({
      weddingId, title: form.title.trim(), description: form.description || undefined,
      category: form.category, dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
      priority: parseInt(form.priority), order: parseInt(form.order) || 0, isChecked: false,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold">Add checklist item</h2>
          <button onClick={onClose}><X size={18} className="text-zinc-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Task *</label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Book the venue" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <Select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="1">High</option>
                <option value="2">Medium</option>
                <option value="3">Low</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due date</label>
            <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional details" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={add.isPending}>{add.isPending ? 'Adding...' : 'Add item'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ChecklistPage({ params }: { params: { weddingId: string } }) {
  const wid = params.weddingId
  const { data: items = [], isLoading } = useChecklistItems(wid)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [catFilter, setCatFilter] = useState('all')

  const checked = items.filter(i => i.isChecked).length
  const pct = items.length > 0 ? Math.round((checked / items.length) * 100) : 0

  const filtered = useMemo(() => items.filter(i => {
    if (filter === 'pending' && i.isChecked) return false
    if (filter === 'done' && !i.isChecked) return false
    if (catFilter !== 'all' && i.category !== catFilter) return false
    return true
  }), [items, filter, catFilter])

  const grouped = useMemo(() => filtered.reduce<Record<string, LocalChecklistItem[]>>((acc, i) => {
    const cat = i.category ?? 'OTHER'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(i)
    return acc
  }, {}), [filtered])

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Checklist</h1>
          <p className="text-sm text-zinc-500">{checked} of {items.length} completed</p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={15} /> Add task</Button>
      </div>

      {/* Progress */}
      {items.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Overall progress</span>
            <span className="font-semibold text-violet-600">{pct}%</span>
          </div>
          <ProgressBar value={checked} max={items.length} />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'done'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <Select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="w-auto ml-auto">
          <option value="all">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </Select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
        : items.length === 0 ? (
          <EmptyState icon={<CheckSquare size={40} />} title="No tasks yet" description="Build your pre-wedding checklist"
            action={<Button onClick={() => setShowAdd(true)}><Plus size={15} />Add task</Button>} />
        ) : (
          Object.entries(grouped).map(([cat, catItems]) => (
            <Card key={cat}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-sm">{cat.replace('_', ' ')}</CardTitle>
                <span className="text-xs text-zinc-400">{catItems.filter(i => i.isChecked).length}/{catItems.length}</span>
              </CardHeader>
              <CardContent className="p-0">
                {catItems.map(i => <ChecklistRow key={i.id} item={i} weddingId={wid} />)}
              </CardContent>
            </Card>
          ))
        )}

      {showAdd && <AddItemModal weddingId={wid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
