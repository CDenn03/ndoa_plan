'use client'
import { useState, useMemo, use } from 'react'
import { CheckSquare, Plus, LayoutTemplate, Pencil, Trash2, CalendarDays } from 'lucide-react'
import { Button, Input, Select, Label, ProgressBar, EmptyState, Spinner, Modal } from '@/components/ui'
import { useChecklistItems, useToggleChecklistItem, useAddChecklistItem, useUpdateChecklistItem, useDeleteChecklistItem } from '@/hooks/use-data'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import { format } from 'date-fns'
import type { LocalChecklistItem } from '@/types'

const CATEGORIES = ['VENUE','CATERING','ATTIRE','PHOTOGRAPHY','MUSIC','TRANSPORT','LEGAL','INVITATIONS','DECORATIONS','OTHER']
const PRIORITY_LABEL = ['', 'High', 'Medium', 'Low']
const PRIORITY_COLOR = ['', 'text-red-500', 'text-amber-500', 'text-sky-500']

interface WeddingEvent { id: string; name: string; type: string; date: string }
type ItemWithExtras = LocalChecklistItem & { isFinalCheck?: boolean; assignedToName?: string }

// ─── Task form modal ──────────────────────────────────────────────────────────

function TaskModal({ weddingId, item, onClose }: Readonly<{
  weddingId: string; item?: ItemWithExtras; onClose: () => void
}>) {
  const add = useAddChecklistItem(weddingId)
  const update = useUpdateChecklistItem(weddingId)
  const [form, setForm] = useState({
    title: item?.title ?? '',
    description: item?.description ?? '',
    category: item?.category ?? 'VENUE',
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
      priority: parseInt(form.priority),
      assignedToName: form.assignedToName || undefined,
      isFinalCheck: form.isFinalCheck,
      order: item?.order ?? 0,
      isChecked: item?.isChecked ?? false,
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
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="task-cat">Category</Label>
            <Select id="task-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </Select></div>
        </div>
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
        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
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

// ─── Load template modal ──────────────────────────────────────────────────────

function LoadTemplateModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
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
        body: JSON.stringify({ templateId }),
      })
      if (!res.ok) throw new Error()
      await qc.invalidateQueries({ queryKey: ['checklist', weddingId] })
      toast('Template applied', 'success')
      onClose()
    } catch { toast('Failed to apply template', 'error') }
    finally { setApplying(null) }
  }

  return (
    <Modal onClose={onClose} title="Load template">
      <div className="space-y-3">
        <p className="text-xs text-zinc-400">Appends tasks to your list. Existing tasks are not affected.</p>
        {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> :
          templates.length === 0 ? <p className="text-sm text-zinc-400 py-4 text-center">No templates available.</p> : (
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {templates.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-3 border-b border-zinc-100 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-[#14161C]">{t.name}</p>
                    <p className="text-xs text-zinc-400">{(t.data as unknown[]).length} tasks{t.culturalType && <span className="ml-1.5 text-violet-500">{t.culturalType}</span>}</p>
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

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({ item, weddingId }: Readonly<{ item: ItemWithExtras; weddingId: string }>) {
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
      <div className={`group flex items-start gap-4 py-3.5 border-b border-zinc-100 last:border-0 ${item.isChecked ? 'opacity-50' : ''} ${item.isFinalCheck ? 'border-l-2 border-red-400 pl-3' : ''}`}>
        <button
          onClick={() => toggle.mutate({ itemId: item.id, currentVersion: item.version })}
          disabled={toggle.isPending}
          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item.isChecked ? 'bg-violet-500 border-violet-500' : 'border-zinc-300 hover:border-violet-400'}`}
          aria-label={item.isChecked ? 'Mark incomplete' : 'Mark complete'}>
          {item.isChecked && (
            <svg viewBox="0 0 12 10" className="w-3 h-3 fill-white">
              <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold ${item.isChecked ? 'line-through text-zinc-400' : 'text-[#14161C]'}`}>{item.title}</p>
            {item.isFinalCheck && <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">Final check</span>}
            {item.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Pending sync" />}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {item.dueDate && (
              <span className={`text-xs font-medium ${overdue ? 'text-red-500' : 'text-zinc-400'}`}>
                {overdue ? '⚠ Overdue · ' : ''}Due {format(new Date(item.dueDate), 'MMM d')}
              </span>
            )}
            {item.priority <= 2 && <span className={`text-xs font-semibold ${PRIORITY_COLOR[item.priority]}`}>{PRIORITY_LABEL[item.priority]}</span>}
            {item.assignedToName && <span className="text-xs text-zinc-400">→ {item.assignedToName}</span>}
            {item.description && <p className="text-xs text-zinc-400 w-full mt-0.5">{item.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors" aria-label="Edit task">
            <Pencil size={13} />
          </button>
          <button onClick={handleDelete} disabled={del.isPending} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors" aria-label="Delete task">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {editing && <TaskModal weddingId={weddingId} item={item} onClose={() => setEditing(false)} />}
    </>
  )
}

// ─── Task list with filters ───────────────────────────────────────────────────

function TaskList({ items, weddingId, onAdd }: Readonly<{ items: ItemWithExtras[]; weddingId: string; onAdd: () => void }>) {
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

  const grouped = useMemo(() => filtered.reduce<Record<string, ItemWithExtras[]>>((acc, i) => {
    const cat = i.category ?? 'OTHER'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(i)
    return acc
  }, {}), [filtered])

  if (items.length === 0) return (
    <EmptyState icon={<CheckSquare size={40} />} title="No tasks yet" description="Add tasks or load a template to get started"
      action={<Button onClick={onAdd}><Plus size={14} />Add task</Button>} />
  )

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Progress</span>
          <span className="font-bold text-violet-600">{pct}% · {checked}/{items.length}</span>
        </div>
        <ProgressBar value={checked} max={items.length} />
      </div>


      {/* Status + category filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          {(['all', 'pending', 'done'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${statusFilter === f ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
              {f}
            </button>
          ))}
        </div>
        {categories.length > 2 && (
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="text-sm border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-600 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All categories' : c.replace(/_/g, ' ')}</option>)}
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
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{cat.replace(/_/g, ' ')}</p>
                  <span className="text-xs text-zinc-400">{catItems.filter(i => i.isChecked).length}/{catItems.length}</span>
                </div>
                <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden px-4">
                  {regular.map(i => <TaskRow key={i.id} item={i} weddingId={weddingId} />)}
                  {finals.length > 0 && (
                    <>
                      {regular.length > 0 && <div className="border-t border-zinc-100 my-1" />}
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

// ─── Overall tab ──────────────────────────────────────────────────────────────

function OverallTab({ weddingId, items, events, onAdd }: Readonly<{
  weddingId: string; items: ItemWithExtras[]; events: WeddingEvent[]; onAdd: () => void
}>) {
  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent | null; items: ItemWithExtras[] }>()
    for (const e of events) map.set(e.id, { event: e, items: [] })
    for (const i of items) {
      const k = i.eventId ?? '__unassigned__'
      if (!map.has(k)) map.set(k, { event: null, items: [] })
      map.get(k)!.items.push(i)
    }
    return map
  }, [items, events])

  return (
    <div className="space-y-8">
      {events.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">By event</p>
          {Array.from(byEvent.entries()).map(([key, { event, items: evItems }]) => {
            if (evItems.length === 0) return null
            const done = evItems.filter(i => i.isChecked).length
            const pct = evItems.length > 0 ? Math.round((done / evItems.length) * 100) : 0
            return (
              <div key={key} className="rounded-2xl border border-zinc-100 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={15} className="text-zinc-400" />
                    <p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p>
                    <span className="text-xs text-zinc-400">{evItems.length} tasks</span>
                  </div>
                  <span className="text-sm font-bold text-violet-600">{pct}%</span>
                </div>
                <ProgressBar value={done} max={evItems.length} />
              </div>
            )
          })}
        </div>
      )}
      <TaskList items={items} weddingId={weddingId} onAdd={onAdd} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: items = [], isLoading } = useChecklistItems(wid)
  const [activeTab, setActiveTab] = useState('__overall__')
  const [showAdd, setShowAdd] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/events`); if (!res.ok) throw new Error(); return res.json() },
    staleTime: 60_000,
  })

  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name }))]
  const activeEvent = events.find(e => e.id === activeTab)
  const checked = items.filter(i => i.isChecked).length

  const eventItems = useMemo(() =>
    activeEvent ? (items as ItemWithExtras[]).filter(i => i.eventId === activeEvent.id) : [],
  [items, activeEvent])

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Planning</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Tasks</h1>
            <div className="flex gap-2">
              <Button variant="lavender" onClick={() => setShowTemplate(true)} size="sm">
                <LayoutTemplate size={13} /> Load template
              </Button>
              <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} /> Add task</Button>
            </div>
          </div>
          <p className="text-sm text-zinc-400 mt-1 mb-6">{checked} of {items.length} completed</p>

          <div className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px">
            {(isLoading || eventsLoading) ? <div className="pb-4"><Spinner size="sm" /></div> : (
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

      <div className="max-w-3xl mx-auto px-8 py-10">
        {isLoading ? <div className="flex justify-center py-16"><Spinner /></div> :
          activeTab === '__overall__'
            ? <OverallTab weddingId={wid} items={items as ItemWithExtras[]} events={events} onAdd={() => setShowAdd(true)} />
            : activeEvent
              ? <TaskList items={eventItems} weddingId={wid} onAdd={() => setShowAdd(true)} />
              : null}
      </div>

      {showAdd && <TaskModal weddingId={wid} onClose={() => setShowAdd(false)} />}
      {showTemplate && <LoadTemplateModal weddingId={wid} onClose={() => setShowTemplate(false)} />}
    </div>
  )
}
