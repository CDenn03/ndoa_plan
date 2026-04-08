'use client'
import { useState, useMemo, use } from 'react'
import { CheckSquare, Plus, Lock } from 'lucide-react'
import { Button, Input, Select, Label, ProgressBar, EmptyState, Spinner, Modal } from '@/components/ui'
import { useChecklistItems, useToggleChecklistItem, useAddChecklistItem } from '@/hooks/use-data'
import { format } from 'date-fns'
import type { LocalChecklistItem } from '@/types'

const CATEGORIES = ['VENUE','CATERING','ATTIRE','PHOTOGRAPHY','MUSIC','TRANSPORT','LEGAL','INVITATIONS','DECORATIONS','OTHER']
const PRIORITY_LABEL = ['', 'High', 'Medium', 'Low']
const PRIORITY_COLOR = ['', 'text-red-500', 'text-amber-500', 'text-sky-500']

const PHASES = [
  { key: 'all', label: 'All' },
  { key: 'BUDGETING', label: 'Budgeting' },
  { key: 'PLANNING', label: 'Planning' },
  { key: 'PRE_WEDDING', label: 'Pre-Wedding' },
  { key: 'PROCUREMENT', label: 'Procurement' },
  { key: 'DAY_OF', label: 'Day-of' },
  { key: 'POST_WEDDING', label: 'Post-Wedding' },
]

function ChecklistRow({ item, weddingId }: Readonly<{ item: LocalChecklistItem; weddingId: string }>) {
  const toggle = useToggleChecklistItem(weddingId)
  const overdue = item.dueDate && !item.isChecked && new Date(item.dueDate) < new Date()

  return (
    <div className={`flex items-start gap-4 py-3.5 border-b border-zinc-100 last:border-0 transition-colors ${item.isChecked ? 'opacity-50' : ''} ${(item as LocalChecklistItem & { isFinalCheck?: boolean }).isFinalCheck ? 'border-l-2 border-red-400 pl-3' : ''}`}>
      <button
        onClick={() => toggle.mutate({ itemId: item.id, currentVersion: item.version })}
        disabled={toggle.isPending}
        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          item.isChecked ? 'bg-violet-500 border-violet-500' : 'border-zinc-300 hover:border-violet-400'
        }`}
        aria-label={item.isChecked ? 'Mark incomplete' : 'Mark complete'}
      >
        {item.isChecked && (
          <svg viewBox="0 0 12 10" className="w-3 h-3 fill-white">
            <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${item.isChecked ? 'line-through text-zinc-400' : 'text-[#14161C]'}`}>
            {item.title}
          </p>
          {(item as LocalChecklistItem & { isFinalCheck?: boolean }).isFinalCheck && (
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">Final check</span>
          )}
          {item.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Pending sync" />}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {item.dueDate && (
            <span className={`text-xs font-medium ${overdue ? 'text-red-500' : 'text-zinc-400'}`}>
              {overdue ? '⚠ Overdue · ' : ''}Due {format(new Date(item.dueDate), 'MMM d')}
            </span>
          )}
          {item.priority <= 2 && (
            <span className={`text-xs font-semibold ${PRIORITY_COLOR[item.priority]}`}>{PRIORITY_LABEL[item.priority]}</span>
          )}
          {(item as LocalChecklistItem & { assignedToName?: string }).assignedToName && (
            <span className="text-xs text-zinc-400">→ {(item as LocalChecklistItem & { assignedToName?: string }).assignedToName}</span>
          )}
          {item.description && <p className="text-xs text-zinc-400 w-full mt-0.5">{item.description}</p>}
        </div>
      </div>
    </div>
  )
}

function AddItemModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const add = useAddChecklistItem(weddingId)
  const [form, setForm] = useState({
    title: '', description: '', category: 'VENUE', dueDate: '', priority: '2',
    phase: '', assignedToName: '', isFinalCheck: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    await add.mutateAsync({
      weddingId, title: form.title.trim(), description: form.description || undefined,
      category: form.category, dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
      priority: parseInt(form.priority), order: 0, isChecked: false,
    })
    onClose()
  }

  return (
    <Modal onClose={onClose} title="Add task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="task-title">Task *</Label>
          <Input id="task-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Book the venue" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="task-cat">Category</Label>
            <Select id="task-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="task-phase">Phase</Label>
            <Select id="task-phase" value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))}>
              <option value="">No phase</option>
              {PHASES.slice(1).map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="task-priority">Priority</Label>
            <Select id="task-priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="1">High</option>
              <option value="2">Medium</option>
              <option value="3">Low</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="task-due">Due date</Label>
            <Input id="task-due" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
        </div>
        <div>
          <Label htmlFor="task-assignee">Assigned to</Label>
          <Input id="task-assignee" value={form.assignedToName} onChange={e => setForm(f => ({ ...f, assignedToName: e.target.value }))} placeholder="e.g. Bride's aunt" />
        </div>
        <div>
          <Label htmlFor="task-notes">Notes</Label>
          <Input id="task-notes" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional details" />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
          <input type="checkbox" checked={form.isFinalCheck} onChange={e => setForm(f => ({ ...f, isFinalCheck: e.target.checked }))} className="rounded" />
          Mark as final check item
        </label>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={add.isPending}>{add.isPending ? 'Adding…' : 'Add task'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function ChecklistPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: items = [], isLoading } = useChecklistItems(wid)
  const [showAdd, setShowAdd] = useState(false)
  const [phase, setPhase] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all')

  const checked = items.filter(i => i.isChecked).length
  const pct = items.length > 0 ? Math.round((checked / items.length) * 100) : 0

  const filtered = useMemo(() => items.filter(i => {
    if (statusFilter === 'pending' && i.isChecked) return false
    if (statusFilter === 'done' && !i.isChecked) return false
    if (phase !== 'all' && (i as LocalChecklistItem & { phase?: string }).phase !== phase) return false
    return true
  }), [items, statusFilter, phase])

  // Group by category within the filtered set
  const grouped = useMemo(() => filtered.reduce<Record<string, LocalChecklistItem[]>>((acc, i) => {
    const cat = i.category ?? 'OTHER'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(i)
    return acc
  }, {}), [filtered])

  // Phase completion check — a phase is "done" only when all its final-check items are ticked
  const phaseStats = useMemo(() => {
    const stats: Record<string, { total: number; done: number; finalChecks: number; finalChecksDone: number }> = {}
    for (const item of items) {
      const p = (item as LocalChecklistItem & { phase?: string }).phase
      if (!p) continue
      if (!stats[p]) stats[p] = { total: 0, done: 0, finalChecks: 0, finalChecksDone: 0 }
      stats[p].total++
      if (item.isChecked) stats[p].done++
      if ((item as LocalChecklistItem & { isFinalCheck?: boolean }).isFinalCheck) {
        stats[p].finalChecks++
        if (item.isChecked) stats[p].finalChecksDone++
      }
    }
    return stats
  }, [items])

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Planning</p>
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Checklist</h1>
            <p className="text-sm text-zinc-400 mt-2">{checked} of {items.length} completed</p>
          </div>
          <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} /> Add task</Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 space-y-8">
        {/* Progress */}
        {items.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Overall progress</span>
              <span className="font-bold text-violet-600">{pct}%</span>
            </div>
            <ProgressBar value={checked} max={items.length} />
          </div>
        )}

        {/* Phase tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {PHASES.map(p => {
            const stats = p.key !== 'all' ? phaseStats[p.key] : null
            const phaseDone = stats ? (stats.finalChecks > 0 ? stats.finalChecksDone === stats.finalChecks : stats.done === stats.total && stats.total > 0) : false
            return (
              <button key={p.key} onClick={() => setPhase(p.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  phase === p.key ? 'bg-[#14161C] text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                }`}>
                {phaseDone && <span className="text-emerald-400">✓</span>}
                {stats && !phaseDone && stats.finalChecks > 0 && stats.finalChecksDone < stats.finalChecks && (
                  <Lock size={11} className="text-zinc-400" />
                )}
                {p.label}
                {stats && <span className="text-[11px] opacity-60">{stats.done}/{stats.total}</span>}
              </button>
            )
          })}
        </div>

        {/* Status filter */}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          {(['all', 'pending', 'done'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${
                statusFilter === f ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Items */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={<CheckSquare size={40} />} title="No tasks yet" description="Build your pre-wedding checklist"
            action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add task</Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<CheckSquare size={40} />} title="No tasks match" description="Try a different phase or status filter" />
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([cat, catItems]) => {
              const regularItems = catItems.filter(i => !(i as LocalChecklistItem & { isFinalCheck?: boolean }).isFinalCheck)
              const finalCheckItems = catItems.filter(i => (i as LocalChecklistItem & { isFinalCheck?: boolean }).isFinalCheck)
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{cat.replace(/_/g, ' ')}</p>
                    <span className="text-xs text-zinc-400">{catItems.filter(i => i.isChecked).length}/{catItems.length}</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden px-4">
                    {regularItems.map(i => <ChecklistRow key={i.id} item={i} weddingId={wid} />)}
                    {finalCheckItems.length > 0 && (
                      <>
                        {regularItems.length > 0 && <div className="border-t border-zinc-100 my-1" />}
                        <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest px-0 py-2">Final checks</p>
                        {finalCheckItems.map(i => <ChecklistRow key={i.id} item={i} weddingId={wid} />)}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAdd && <AddItemModal weddingId={wid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
