'use client'
import { useState, useMemo } from 'react'
import { Button, Input, Select, Label, Modal, ProgressBar, EmptyState, Spinner } from '@/components/ui'
import { useAddChecklistItem, useUpdateChecklistItem, useToggleChecklistItem, useDeleteChecklistItem } from '@/hooks/use-data'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import { format } from 'date-fns'
import { CheckSquare, Plus, Pencil, Trash2 } from 'lucide-react'
import type { LocalChecklistItem } from '@/types'
import { weddingDB } from '@/lib/db/dexie'

// ─── Types ────────────────────────────────────────────────────────────────────

export const TASK_CATEGORIES = ['VENUE','CATERING','ATTIRE','PHOTOGRAPHY','MUSIC','TRANSPORT','LEGAL','INVITATIONS','DECORATIONS','MEDIA','DECOR','CEREMONY','RECEPTION','LOGISTICS','OTHER']

export type TaskItem = LocalChecklistItem & { isFinalCheck?: boolean; assignedToName?: string; eventId?: string }

const PRIORITY_LABEL = ['', 'High', 'Medium', 'Low']
const PRIORITY_COLOR = ['', 'text-red-500', 'text-amber-500', 'text-sky-500']

// ─── Task Modal (add + edit) ──────────────────────────────────────────────────

export function TaskModal({ weddingId, item, eventId, onClose }: Readonly<{
  weddingId: string; item?: TaskItem; eventId?: string; onClose: () => void
}>) {
  const add = useAddChecklistItem(weddingId)
  const update = useUpdateChecklistItem(weddingId)
  const [form, setForm] = useState({
    title: item?.title ?? '',
    description: item?.description ?? '',
    category: item?.category ?? 'CEREMONY',
    dueDate: item?.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '',
    priority: String(item?.priority ?? 2),
    assignedToName: item?.assignedToName ?? '',
    isFinalCheck: item?.isFinalCheck ?? false,
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.title.trim()) return
    const payload = {
      weddingId, title: form.title.trim(),
      description: form.description || undefined,
      category: form.category,
      dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
      priority: Number.parseInt(form.priority),
      assignedToName: form.assignedToName || undefined,
      isFinalCheck: form.isFinalCheck,
      order: item?.order ?? 0,
      isChecked: item?.isChecked ?? false,
      eventId: item?.eventId ?? eventId,
    }
    if (item) {
      await update.mutateAsync({ ...payload, id: item.id, currentVersion: item.version })
    } else {
      await add.mutateAsync(payload)
    }
    onClose()
  }

  const isPending = add.isPending || update.isPending

  return (
    <Modal onClose={onClose} title={item ? 'Edit task' : 'Add task'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="task-title">Task *</Label>
          <Input id="task-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Book the venue" required /></div>
        <div><Label htmlFor="task-cat">Category</Label>
          <Select id="task-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c.replaceAll('_', ' ')}</option>)}
          </Select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="task-priority">Priority</Label>
            <Select id="task-priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="1">High</option>
              <option value="2">Medium</option>
              <option value="3">Low</option>
            </Select></div>
          <div><Label htmlFor="task-due">Due date</Label>
            <Input id="task-due" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
        </div>
        <div><Label htmlFor="task-assignee">Assigned to</Label>
          <Input id="task-assignee" value={form.assignedToName} onChange={e => setForm(f => ({ ...f, assignedToName: e.target.value }))} placeholder="e.g. Bride's aunt" /></div>
        <div><Label htmlFor="task-notes">Notes</Label>
          <Input id="task-notes" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional details" /></div>
        <label className="flex items-center gap-2 text-sm text-[#14161C]/60 cursor-pointer">
          <input type="checkbox" checked={form.isFinalCheck} onChange={e => setForm(f => ({ ...f, isFinalCheck: e.target.checked }))} className="rounded" />
          Mark as final check item
        </label>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? (item ? 'Saving…' : 'Adding…') : (item ? 'Save' : 'Add task')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Load Template Modal ──────────────────────────────────────────────────────

export function LoadTemplateModal({ weddingId, eventId, onClose }: Readonly<{
  weddingId: string; eventId?: string; onClose: () => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [applying, setApplying] = useState<string | null>(null)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', 'CHECKLIST'],
    queryFn: async () => {
      const res = await fetch('/api/templates?type=CHECKLIST')
      if (!res.ok) return []
      return res.json() as Promise<{ id: string; name: string; culturalType?: string | null; data: unknown[] }[]>
    },
  })

  const handleApply = async (templateId: string) => {
    setApplying(templateId)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/apply-template`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, eventId: eventId ?? undefined }),
      })
      if (!res.ok) throw new Error()
      // Fetch fresh server items
      const fresh = await fetch(`/api/weddings/${weddingId}/checklist`)
      if (fresh.ok) {
        const serverItems = await fresh.json() as import('@/types').LocalChecklistItem[]
        // Clear Dexie first, then add all items to ensure consistency
        await weddingDB.checklistItems.where('weddingId').equals(weddingId).delete()
        await weddingDB.checklistItems.bulkPut(serverItems)
        // Update React Query cache
        qc.setQueryData(['checklist', weddingId], serverItems.sort((a, b) => a.order - b.order))
      } else {
        await qc.invalidateQueries({ queryKey: ['checklist', weddingId] })
      }
      toast('Template applied', 'success'); onClose()
    } catch { toast('Failed to apply template', 'error') }
    finally { setApplying(null) }
  }

  return (
    <Modal onClose={onClose} title="Load template">
      <div className="space-y-3">
        <p className="text-xs text-[#14161C]/40">Appends tasks to your list. Existing tasks are not affected.</p>
        {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> :
          templates.length === 0 ? <p className="text-sm text-[#14161C]/40 py-4 text-center">No templates available.</p> : (
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {templates.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-3 border-b border-[#1F4D3A]/8 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-[#14161C]">{t.name}</p>
                    <p className="text-xs text-[#14161C]/40">{(t.data as unknown[]).length} tasks{t.culturalType && <span className="ml-1.5 text-[#1F4D3A]/70">{t.culturalType}</span>}</p>
                  </div>
                  <Button size="sm" variant="lavender" onClick={() => void handleApply(t.id)} disabled={applying === t.id}>
                    {applying === t.id ? <Spinner size="sm" /> : 'Apply'}
                  </Button>
                </div>
              ))}
            </div>
          )}
      </div>
    </Modal>
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

export function TaskRow({ item, weddingId }: Readonly<{ item: TaskItem; weddingId: string }>) {
  const toggle = useToggleChecklistItem(weddingId)
  const del = useDeleteChecklistItem(weddingId)
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const overdue = item.dueDate && !item.isChecked && new Date(item.dueDate) < new Date()

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return
    try { await del.mutateAsync({ itemId: item.id, currentVersion: item.version }) }
    catch { toast('Failed to delete task', 'error') }
  }

  return (
    <>
      <div className={`group flex items-start gap-4 py-3.5 border-b border-[#1F4D3A]/8 last:border-0 ${item.isChecked ? 'opacity-50' : ''} ${item.isFinalCheck ? 'border-l-2 border-red-400 pl-3' : ''}`}>
        <button
          onClick={() => toggle.mutate({ itemId: item.id, currentVersion: item.version })}
          disabled={toggle.isPending}
          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            toggle.isPending ? 'border-violet-300 bg-[#1F4D3A]/10 animate-pulse cursor-wait' :
            item.isChecked ? 'bg-[#1F4D3A]/60 border-violet-500' : 'border-zinc-300 hover:border-[#1F4D3A]/40'
          }`}
          aria-label={item.isChecked ? 'Mark incomplete' : 'Mark complete'}>
          {toggle.isPending ? (
            <svg className="w-3 h-3 animate-spin text-violet-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : item.isChecked ? (
            <svg viewBox="0 0 12 10" className="w-3 h-3 fill-white">
              <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold ${item.isChecked ? 'line-through text-[#14161C]/40' : 'text-[#14161C]'}`}>{item.title}</p>
            {item.isFinalCheck && <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">Final check</span>}
            {item.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Pending sync" />}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {item.dueDate && (
              <span className={`text-xs font-medium ${overdue ? 'text-red-500' : 'text-[#14161C]/40'}`}>
                {overdue ? '⚠ Overdue · ' : ''}Due {format(new Date(item.dueDate), 'MMM d')}
              </span>
            )}
            {item.priority <= 2 && <span className={`text-xs font-semibold ${PRIORITY_COLOR[item.priority]}`}>{PRIORITY_LABEL[item.priority]}</span>}
            {item.assignedToName && <span className="text-xs text-[#14161C]/40">→ {item.assignedToName}</span>}
            {item.description && <p className="text-xs text-[#14161C]/40 w-full mt-0.5">{item.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1  flex-shrink-0">
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40 hover:text-[#14161C]/60 transition-colors" aria-label="Edit task">
            <Pencil size={13} />
          </button>
          <button onClick={handleDelete} disabled={del.isPending} className="p-1.5 rounded-lg hover:bg-red-50 text-[#14161C]/40 hover:text-red-500 transition-colors" aria-label="Delete task">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {editing && <TaskModal weddingId={weddingId} item={item} onClose={() => setEditing(false)} />}
    </>
  )
}

// ─── Task List (with progress bar + filters + grouped by category) ─────────────

export function TaskList({ items, weddingId, onAdd }: Readonly<{
  items: TaskItem[]; weddingId: string; onAdd: () => void
}>) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const checked = items.filter(i => i.isChecked).length
  const pct = items.length > 0 ? Math.round((checked / items.length) * 100) : 0

  const categories = useMemo(() => ['all', ...Array.from(new Set(items.map(i => i.category ?? 'OTHER')))], [items])

  const filtered = useMemo(() => items.filter(i => {
    if (statusFilter === 'pending' && i.isChecked) return false
    if (statusFilter === 'done' && !i.isChecked) return false
    if (categoryFilter !== 'all' && (i.category ?? 'OTHER') !== categoryFilter) return false
    return true
  }), [items, statusFilter, categoryFilter])

  const grouped = useMemo(() => filtered.reduce<Record<string, TaskItem[]>>((acc, i) => {
    const cat = i.category ?? 'OTHER'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(i)
    return acc
  }, {}), [filtered])

  if (items.length === 0) return (
    <EmptyState icon={<CheckSquare size={40} />} title="No tasks yet" description="Add tasks or load a template to get started"
      action={<Button onClick={onAdd}><Plus size={14} /> Add task</Button>} />
  )

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#14161C]/55">Progress</span>
          <span className="font-bold text-[#1F4D3A]">{pct}% · {checked}/{items.length}</span>
        </div>
        <ProgressBar value={checked} max={items.length} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-[#1F4D3A]/6 p-1 rounded-xl w-fit">
          {(['all', 'pending', 'done'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${statusFilter === f ? 'bg-white text-[#14161C] shadow-sm' : 'text-[#14161C]/55 hover:text-[#14161C]/70'}`}>
              {f}
            </button>
          ))}
        </div>
        {categories.length > 2 && (
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="text-sm border border-[#1F4D3A]/12 rounded-xl px-3 py-1.5 text-[#14161C]/60 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All categories' : c.replaceAll('_', ' ')}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<CheckSquare size={40} />} title="No tasks match" description="Try a different filter" />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, catItems]) => {
            const regular = catItems.filter(i => !i.isFinalCheck)
            const finals = catItems.filter(i => i.isFinalCheck)
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">{cat.replaceAll('_', ' ')}</p>
                  <span className="text-xs text-[#14161C]/40">{catItems.filter(i => i.isChecked).length}/{catItems.length}</span>
                </div>
                <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden px-4">
                  {regular.map(i => <TaskRow key={i.id} item={i} weddingId={weddingId} />)}
                  {finals.length > 0 && (
                    <>
                      {regular.length > 0 && <div className="border-t border-[#1F4D3A]/8 my-1" />}
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest py-2">Final checks</p>
                      {finals.map(i => <TaskRow key={i.id} item={i} weddingId={weddingId} />)}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
