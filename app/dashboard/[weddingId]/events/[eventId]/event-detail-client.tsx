'use client'
import { useState, useRef } from 'react'
import { format } from 'date-fns'
import {
  MapPin, Clock, Plus, Trash2, GripVertical, CheckSquare, DollarSign, Users,
  ArrowLeft, CreditCard, Sparkles, Truck, Hotel, Gift, Image as ImageIcon,
  ShoppingBag, Upload, Pencil, Phone, List, AlertTriangle, MoreHorizontal, Check, X,
} from 'lucide-react'
import { Button, Input, Select, Label, Badge, Modal, Spinner, ProgressBar, EmptyState } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { weddingDB } from '@/lib/db/dexie'
import { useBudgetLines } from '@/hooks/use-data'
import { useInitiatePayment } from '@/hooks/use-payments'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventTask {
  id: string; title: string; description?: string; category?: string
  dueDate?: string; assignedToName?: string; eventId?: string; deletedAt?: number | null
  isChecked: boolean; priority: number; order: number; isFinalCheck: boolean
}
interface GuestAttendance {
  id: string; rsvpStatus: string
  guest: { id: string; name: string; phone?: string; side: string }
}
interface ProgramItem {
  id: string; title: string; description?: string
  startTime?: string; endTime?: string; duration?: number; order: number; assignedTo?: string
}
interface Appointment {
  id: string; title: string; location?: string; notes?: string
  startAt: string; endAt?: string; status: string
  vendor?: { id: string; name: string }
}
interface Payment {
  id: string; amount: number; status: string; description?: string
  payerName?: string; payerPhone?: string; mpesaRef?: string; createdAt: string; eventId?: string
}
interface Contribution {
  id: string; memberName: string; pledgeAmount: number; paidAmount: number
  status: string; dueDate?: string; notes?: string; eventId?: string
}
interface TransportRoute {
  id: string; name: string; departureLocation: string; arrivalLocation: string
  departureTime: string; capacity?: number; eventId?: string
}
interface Accommodation {
  id: string; hotelName: string; address?: string
  checkIn: string; checkOut: string; roomsBlocked?: number; notes?: string; eventId?: string
}
interface GiftRegistryItem {
  id: string; name: string; description?: string; url?: string
  estimatedPrice?: number; quantity: number; priority: number; eventId?: string
}
interface GiftReceived {
  id: string; giverName: string; description: string
  estimatedValue?: number; status: string; thankYouSent: boolean; eventId?: string
}
interface Vendor {
  id: string; name: string; category: string; status: string; contactPhone?: string
}

interface Props {
  weddingId: string
  event: {
    id: string; name: string; type: string; date: string
    venue?: string; description?: string; startTime?: string; endTime?: string; isMain: boolean
  }
  guestAttendances: GuestAttendance[]
}

type Tab = 'tasks' | 'budget' | 'guests' | 'appointments' | 'payments' | 'contributions' | 'logistics' | 'vision' | 'gifts' | 'vendors' | 'schedule'

// ─── Constants ────────────────────────────────────────────────────────────────

const TASK_CATEGORIES = ['CATERING','MEDIA','TRANSPORT','DECOR','CEREMONY','RECEPTION','ATTIRE','LEGAL','LOGISTICS','OTHER']
const BUDGET_CATEGORIES = ['VENUE','CATERING','PHOTOGRAPHY','VIDEOGRAPHY','DECOR','FLOWERS','MUSIC','TRANSPORT','ATTIRE','CAKE','INVITATIONS','ACCOMMODATION','MISCELLANEOUS']
const PRIORITY_LABEL: Record<number, string> = { 1: 'High', 2: 'Medium', 3: 'Low' }
const PRIORITY_COLOR: Record<number, string> = { 1: 'text-red-500', 2: 'text-amber-500', 3: 'text-sky-500' }
const RSVP_BADGE: Record<string, 'confirmed' | 'declined' | 'pending' | 'maybe'> = {
  CONFIRMED: 'confirmed', DECLINED: 'declined', PENDING: 'pending', MAYBE: 'maybe', WAITLISTED: 'pending',
}
const TYPE_COLOR: Record<string, string> = {
  WEDDING: 'bg-violet-100 text-violet-700', RURACIO: 'bg-amber-100 text-amber-700',
  RECEPTION: 'bg-sky-100 text-sky-700', ENGAGEMENT: 'bg-pink-100 text-pink-700',
  TRADITIONAL: 'bg-orange-100 text-orange-700', CIVIL: 'bg-zinc-100 text-zinc-600',
  POST_WEDDING: 'bg-emerald-100 text-emerald-700',
}
const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

// ─── Shared ───────────────────────────────────────────────────────────────────

function ConfirmDelete({ label, onConfirm, onCancel }: Readonly<{ label: string; onConfirm: () => void; onCancel: () => void }>) {
  return (
    <Modal onClose={onCancel} title={`Delete ${label}?`}>
      <p className="text-sm text-zinc-500 mb-6">This cannot be undone.</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button variant="danger" onClick={onConfirm} className="flex-1">Delete</Button>
      </div>
    </Modal>
  )
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<EventTask | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const blank = { title: '', description: '', category: 'CEREMONY', priority: '2', assignedToName: '', dueDate: '', isFinalCheck: false }
  const [form, setForm] = useState(blank)

  // Live fetch — same query key as the main checklist page so they stay in sync
  const { data: allTasks = [], isLoading } = useQuery<EventTask[]>({
    queryKey: ['checklist', weddingId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/checklist`)
      if (!res.ok) throw new Error('Failed to load checklist')
      return res.json()
    },
    staleTime: 30_000,
  })
  const tasks = allTasks.filter((t: EventTask) => t.eventId === eventId && !t.deletedAt)

  const openEdit = (t: EventTask) => {
    setEditing(t)
    setForm({ title: t.title, description: t.description ?? '', category: t.category ?? 'CEREMONY', priority: String(t.priority), assignedToName: t.assignedToName ?? '', dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : '', isFinalCheck: t.isFinalCheck })
  }

  const toggle = async (task: EventTask) => {
    qc.setQueryData<EventTask[]>(['checklist', weddingId], prev =>
      prev?.map(t => t.id === task.id ? { ...t, isChecked: !t.isChecked } : t) ?? []
    )
    await fetch(`/api/weddings/${weddingId}/checklist/${task.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isChecked: !task.isChecked }),
    })
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    const payload = { weddingId, eventId, title: form.title.trim(), description: form.description || null, category: form.category, priority: Number.parseInt(form.priority), assignedToName: form.assignedToName || null, dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null, isFinalCheck: form.isFinalCheck }
    try {
      if (editing) {
        await fetch(`/api/weddings/${weddingId}/checklist/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast('Task updated', 'success')
      } else {
        await fetch(`/api/weddings/${weddingId}/checklist`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, order: tasks.length, isChecked: false }) })
        toast('Task added', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['checklist', weddingId] })
      setShowAdd(false); setEditing(null); setForm(blank)
    } catch { toast('Failed to save task', 'error') } finally { setSaving(false) }
  }

  const deleteTask = async (id: string) => {
    setDeleteId(null)
    await fetch(`/api/weddings/${weddingId}/checklist/${id}`, { method: 'DELETE' })
    await qc.invalidateQueries({ queryKey: ['checklist', weddingId] })
    toast('Task deleted', 'success')
  }

  const done = tasks.filter((t: EventTask) => t.isChecked).length
  const regular = tasks.filter((t: EventTask) => !t.isFinalCheck)
  const finalChecks = tasks.filter((t: EventTask) => t.isFinalCheck)

  const TaskForm = () => (
    <Modal onClose={() => { setShowAdd(false); setEditing(null) }} title={editing ? 'Edit task' : 'Add task'}>
      <form onSubmit={submit} className="space-y-4">
        <div><Label htmlFor="t-title">Task *</Label>
          <Input id="t-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Confirm caterer menu" required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="t-cat">Category</Label>
            <Select id="t-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select></div>
          <div><Label htmlFor="t-pri">Priority</Label>
            <Select id="t-pri" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="1">High</option><option value="2">Medium</option><option value="3">Low</option>
            </Select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="t-assign">Assigned to</Label>
            <Input id="t-assign" value={form.assignedToName} onChange={e => setForm(f => ({ ...f, assignedToName: e.target.value }))} placeholder="Coordinator" /></div>
          <div><Label htmlFor="t-due">Due date</Label>
            <Input id="t-due" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
        </div>
        <div><Label htmlFor="t-desc">Notes</Label>
          <Input id="t-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional details" /></div>
        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
          <input type="checkbox" checked={form.isFinalCheck} onChange={e => setForm(f => ({ ...f, isFinalCheck: e.target.checked }))} className="rounded" />
          Mark as final check
        </label>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setEditing(null) }} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )

  const TaskRow = ({ task, accent }: { task: EventTask; accent?: boolean }) => (
    <div className={`flex items-start gap-3 py-3 border-b border-zinc-100 last:border-0 group ${task.isChecked ? 'opacity-50' : ''} ${accent ? 'border-l-2 border-red-300 pl-3' : ''}`}>
      <button onClick={() => toggle(task)}
        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${task.isChecked ? (accent ? 'bg-red-400 border-red-400' : 'bg-violet-500 border-violet-500') : (accent ? 'border-red-300 hover:border-red-400' : 'border-zinc-300 hover:border-violet-400')}`}
        aria-label={task.isChecked ? 'Mark incomplete' : 'Mark complete'}>
        {task.isChecked && <svg viewBox="0 0 12 10" className="w-3 h-3"><path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${task.isChecked ? 'line-through text-zinc-400' : 'text-[#14161C]'}`}>{task.title}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {task.category && <span className="text-xs text-zinc-400">{task.category}</span>}
          <span className={`text-xs font-semibold ${PRIORITY_COLOR[task.priority] ?? ''}`}>{PRIORITY_LABEL[task.priority]}</span>
          {task.assignedToName && <span className="text-xs text-zinc-400">→ {task.assignedToName}</span>}
          {task.dueDate && <span className="text-xs text-zinc-400">Due {format(new Date(task.dueDate), 'MMM d')}</span>}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => openEdit(task)} className="p-1 text-zinc-300 hover:text-violet-500 transition-colors" aria-label="Edit"><Pencil size={13} /></button>
        <button onClick={() => setDeleteId(task.id)} className="p-1 text-zinc-300 hover:text-red-400 transition-colors" aria-label="Delete"><Trash2 size={13} /></button>
      </div>
    </div>
  )

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">{done}/{tasks.length} completed</p>
          {tasks.length > 0 && <ProgressBar value={done} max={tasks.length} />}
        </div>
        <Button size="sm" onClick={() => { setForm(blank); setShowAdd(true) }}><Plus size={13} /> Add task</Button>
      </div>
      {tasks.length === 0
        ? <EmptyState icon={<CheckSquare size={32} className="text-zinc-200" />} title="No tasks yet" description="Add tasks to coordinate this event" />
        : <div className="space-y-1">
            {regular.map((t: EventTask) => <TaskRow key={t.id} task={t} />)}
            {finalChecks.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-100">
                <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Final checks ({finalChecks.filter((t: EventTask) => t.isChecked).length}/{finalChecks.length})</p>
                {finalChecks.map((t: EventTask) => <TaskRow key={t.id} task={t} accent />)}
              </div>
            )}
          </div>}
      {(showAdd || editing) && <TaskForm />}
      {deleteId && <ConfirmDelete label="task" onConfirm={() => deleteTask(deleteId)} onCancel={() => setDeleteId(null)} />}
    </div>
  )
}

// ─── Budget Tab ───────────────────────────────────────────────────────────────

function BudgetTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { data: allLines = [], isLoading } = useBudgetLines(weddingId)
  const lines = allLines.filter(l => l.eventId === eventId)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<typeof lines[0] | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [payingLine, setPayingLine] = useState<typeof lines[0] | null>(null)
  const [saving, setSaving] = useState(false)
  const blank = { category: 'CATERING', description: '', estimated: '', committed: '', actual: '' }
  const [form, setForm] = useState(blank)

  const openEdit = (l: typeof lines[0]) => {
    setEditing(l)
    setForm({ category: l.category, description: l.description, estimated: String(l.estimated), committed: String(l.committed), actual: String(l.actual) })
  }

  const totalEst = lines.reduce((s, l) => s + l.estimated, 0)
  const totalComm = lines.reduce((s, l) => s + l.committed + l.actual, 0)
  const variance = totalEst - totalComm

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    const payload = { weddingId, eventId, category: form.category, description: form.description, estimated: parseFloat(form.estimated) || 0, committed: parseFloat(form.committed) || 0, actual: parseFloat(form.actual) || 0 }
    try {
      if (editing) {
        const res = await fetch(`/api/weddings/${weddingId}/budget/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error()
        await weddingDB.budgetLines.update(editing.id, { ...payload, isDirty: false, updatedAt: Date.now() })
        toast('Budget line updated', 'success')
      } else {
        const res = await fetch(`/api/weddings/${weddingId}/budget`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error()
        const newLine = await res.json() as { id: string; category: string; description: string; estimated: number; actual: number; committed: number }
        await weddingDB.budgetLines.put({ id: newLine.id, serverId: newLine.id, weddingId, eventId, category: newLine.category, description: newLine.description, estimated: newLine.estimated, actual: newLine.actual, committed: newLine.committed, version: 1, checksum: '', isDirty: false, updatedAt: Date.now() })
        toast('Budget line added', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
      setShowAdd(false); setEditing(null); setForm(blank)
    } catch { toast('Failed to save', 'error') } finally { setSaving(false) }
  }

  const deleteLine = async (id: string) => {
    setDeleteId(null)
    await fetch(`/api/weddings/${weddingId}/budget/${id}`, { method: 'DELETE' })
    await weddingDB.budgetLines.delete(id)
    await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
    toast('Line deleted', 'success')
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-8 divide-x divide-zinc-100">
          <div className="pr-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Estimated</p><p className="text-2xl font-extrabold text-[#14161C]">{fmt(totalEst)}</p></div>
          <div className="px-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Committed</p><p className="text-2xl font-extrabold text-amber-500">{fmt(totalComm)}</p></div>
          <div className="pl-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Variance</p><p className={`text-2xl font-extrabold ${variance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{variance < 0 ? '-' : '+'}{fmt(Math.abs(variance))}</p></div>
        </div>
        <Button size="sm" onClick={() => { setForm(blank); setShowAdd(true) }}><Plus size={13} /> Add line</Button>
      </div>
      {lines.length === 0
        ? <EmptyState icon={<DollarSign size={32} className="text-zinc-200" />} title="No budget lines yet" description="Track estimated and actual costs for this event" />
        : <div>
            <div className="grid grid-cols-5 gap-3 pb-2 border-b border-zinc-100">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest col-span-2">Item</p>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Estimated</p>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Paid</p>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Actions</p>
            </div>
            {lines.map(line => {
              const remaining = Math.max(0, line.estimated - line.actual - line.committed)
              return (
                <div key={line.id} className="grid grid-cols-5 gap-3 py-3 border-b border-zinc-100 last:border-0 items-center group">
                  <div className="col-span-2">
                    <p className="text-sm font-semibold text-[#14161C]">{line.description}</p>
                    <p className="text-xs text-zinc-400">{line.category}</p>
                  </div>
                  <p className="text-sm text-zinc-500 text-right">{fmt(line.estimated)}</p>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#14161C]">{fmt(line.actual)}</p>
                    {remaining > 0 && <p className="text-xs text-amber-500">{fmt(remaining)} left</p>}
                    {remaining === 0 && line.actual > 0 && <p className="text-xs text-emerald-500">Paid in full</p>}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {remaining > 0 && <Button size="sm" variant="lavender" onClick={() => setPayingLine(line)}><CreditCard size={11} /> Pay</Button>}
                    <button onClick={() => openEdit(line)} className="p-1 text-zinc-300 hover:text-violet-500 opacity-0 group-hover:opacity-100 transition-all" aria-label="Edit"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteId(line.id)} className="p-1 text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" aria-label="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              )
            })}
          </div>}

      {(showAdd || editing) && (
        <Modal onClose={() => { setShowAdd(false); setEditing(null) }} title={editing ? 'Edit budget line' : 'Add budget line'}>
          <form onSubmit={submit} className="space-y-4">
            <div><Label htmlFor="bl-cat">Category</Label>
              <Select id="bl-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {BUDGET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select></div>
            <div><Label htmlFor="bl-desc">Description *</Label>
              <Input id="bl-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Catering deposit" required /></div>
            <div className="grid grid-cols-3 gap-3">
              {(['estimated', 'committed', 'actual'] as const).map(k => (
                <div key={k}><Label htmlFor={`bl-${k}`}>{k.charAt(0).toUpperCase() + k.slice(1)}</Label>
                  <Input id={`bl-${k}`} type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder="0" min="0" /></div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setEditing(null) }} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      )}
      {payingLine && <RecordPaymentModal weddingId={weddingId} line={payingLine} onClose={() => setPayingLine(null)} />}
      {deleteId && <ConfirmDelete label="budget line" onConfirm={() => deleteLine(deleteId)} onCancel={() => setDeleteId(null)} />}
    </div>
  )
}

function RecordPaymentModal({ weddingId, line, onClose }: Readonly<{
  weddingId: string
  line: { id: string; description: string; estimated: number; actual: number; committed: number; vendorId?: string }
  onClose: () => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const remaining = Math.max(0, line.estimated - line.actual - line.committed)
  const [form, setForm] = useState({ amount: String(remaining || line.estimated), payerName: '', mpesaRef: '', description: line.description })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const amount = parseFloat(form.amount) || 0
      await fetch(`/api/weddings/${weddingId}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, description: form.description || null, payerName: form.payerName || null, mpesaRef: form.mpesaRef || null, vendorId: line.vendorId || null, status: 'COMPLETED' }) })
      await fetch(`/api/weddings/${weddingId}/budget/${line.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actual: line.actual + amount }) })
      await weddingDB.budgetLines.update(line.id, { actual: line.actual + amount, isDirty: false, updatedAt: Date.now() })
      qc.invalidateQueries({ queryKey: ['budget', weddingId] })
      qc.invalidateQueries({ queryKey: ['payments', weddingId] })
      toast('Payment recorded', 'success'); onClose()
    } catch { toast('Failed to record payment', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Record payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-zinc-50 rounded-xl p-3 text-sm">
          <p className="font-semibold text-[#14161C]">{line.description}</p>
          <div className="flex gap-4 mt-1 text-xs text-zinc-500">
            <span>Estimated: {fmt(line.estimated)}</span>
            <span>Paid: {fmt(line.actual)}</span>
            <span className={remaining > 0 ? 'text-amber-500 font-semibold' : 'text-emerald-600'}>Remaining: {fmt(remaining)}</span>
          </div>
        </div>
        <div><Label htmlFor="rp-amount">Amount (KES) *</Label>
          <Input id="rp-amount" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min="1" required /></div>
        <div><Label htmlFor="rp-desc">Description</Label>
          <Input id="rp-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="rp-payer">Payer name</Label>
            <Input id="rp-payer" value={form.payerName} onChange={e => setForm(f => ({ ...f, payerName: e.target.value }))} placeholder="Jane Doe" /></div>
          <div><Label htmlFor="rp-ref">M-Pesa ref</Label>
            <Input id="rp-ref" value={form.mpesaRef} onChange={e => setForm(f => ({ ...f, mpesaRef: e.target.value }))} placeholder="QHX7..." /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Recording…' : 'Record payment'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Guests Tab ───────────────────────────────────────────────────────────────

function GuestsTab({ attendances }: Readonly<{ attendances: GuestAttendance[] }>) {
  const confirmed = attendances.filter(a => a.rsvpStatus === 'CONFIRMED').length
  return (
    <div className="space-y-4">
      <div className="flex gap-8 divide-x divide-zinc-100">
        <div className="pr-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Total</p><p className="text-2xl font-extrabold text-[#14161C]">{attendances.length}</p></div>
        <div className="pl-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Confirmed</p><p className="text-2xl font-extrabold text-emerald-600">{confirmed}</p></div>
      </div>
      {attendances.length === 0
        ? <EmptyState icon={<Users size={32} className="text-zinc-200" />} title="No guests assigned" description="Guest attendance is managed from the Guests page" />
        : <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
            {attendances.map(a => (
              <div key={a.id} className="flex items-center gap-3 py-3 px-4 border-b border-zinc-100 last:border-0">
                <div className="w-8 h-8 rounded-full bg-[#CDB5F7]/20 flex items-center justify-center text-xs font-bold text-violet-600 flex-shrink-0">{a.guest.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#14161C]">{a.guest.name}</p>
                  <p className="text-xs text-zinc-400">{a.guest.side}{a.guest.phone ? ' · ' + a.guest.phone : ''}</p>
                </div>
                <Badge variant={RSVP_BADGE[a.rsvpStatus] ?? 'default'}>{a.rsvpStatus}</Badge>
              </div>
            ))}
          </div>}
    </div>
  )
}

// ─── Appointments Tab ─────────────────────────────────────────────────────────

function AppointmentsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const blank = { title: '', location: '', notes: '', startAt: '', endAt: '', status: 'SCHEDULED' }
  const [form, setForm] = useState(blank)

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/appointments?eventId=${eventId}`)
      if (!res.ok) throw new Error()
      return res.json()
    },
    staleTime: 30_000,
  })

  const openEdit = (a: Appointment) => {
    setEditing(a)
    setForm({ title: a.title, location: a.location ?? '', notes: a.notes ?? '', startAt: a.startAt.slice(0, 16), endAt: a.endAt ? a.endAt.slice(0, 16) : '', status: a.status })
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/weddings/${weddingId}/appointments/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: form.title, location: form.location || null, notes: form.notes || null, startAt: form.startAt, endAt: form.endAt || null, status: form.status }) })
        if (!res.ok) throw new Error()
        toast('Appointment updated', 'success')
      } else {
        const res = await fetch(`/api/weddings/${weddingId}/appointments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: form.title, location: form.location || null, notes: form.notes || null, startAt: form.startAt, endAt: form.endAt || null, eventId, createdBy: 'user' }) })
        if (!res.ok) throw new Error()
        toast('Appointment added', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['appointments', weddingId, eventId] })
      await qc.invalidateQueries({ queryKey: ['appointments', weddingId] })
      setShowAdd(false); setEditing(null); setForm(blank)
    } catch { toast('Failed to save', 'error') } finally { setSaving(false) }
  }

  const deleteAppt = async (id: string) => {
    setDeleteId(null)
    await fetch(`/api/weddings/${weddingId}/appointments/${id}`, { method: 'DELETE' })
    await qc.invalidateQueries({ queryKey: ['appointments', weddingId, eventId] })
    await qc.invalidateQueries({ queryKey: ['appointments', weddingId] })
    toast('Appointment deleted', 'success')
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => { setForm(blank); setShowAdd(true) }}><Plus size={13} /> Add</Button>
      </div>
      {appointments.length === 0
        ? <EmptyState icon={<Sparkles size={32} className="text-zinc-200" />} title="No appointments" description="Schedule vendor meetings and fittings for this event" />
        : <div className="space-y-2">
            {appointments.map(a => (
              <div key={a.id} className="flex items-start gap-3 py-3 px-4 border border-zinc-100 rounded-xl group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#14161C]">{a.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-zinc-400">{format(new Date(a.startAt), 'MMM d, yyyy')}</span>
                    <span className="text-xs text-zinc-400 flex items-center gap-1"><Clock size={10} />{format(new Date(a.startAt), 'h:mm a')}</span>
                    {a.location && <span className="text-xs text-zinc-400 flex items-center gap-1"><MapPin size={10} />{a.location}</span>}
                    {a.vendor && <span className="text-xs text-zinc-400">{a.vendor.name}</span>}
                  </div>
                  {a.notes && <p className="text-xs text-zinc-400 mt-1">{a.notes}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={a.status === 'COMPLETED' ? 'confirmed' : a.status === 'CANCELLED' ? 'declined' : 'pending'}>{a.status}</Badge>
                  <button onClick={() => openEdit(a)} className="p-1 text-zinc-300 hover:text-violet-500 opacity-0 group-hover:opacity-100 transition-all ml-1" aria-label="Edit"><Pencil size={13} /></button>
                  <button onClick={() => setDeleteId(a.id)} className="p-1 text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" aria-label="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>}

      {(showAdd || editing) && (
        <Modal onClose={() => { setShowAdd(false); setEditing(null) }} title={editing ? 'Edit appointment' : 'Add appointment'}>
          <form onSubmit={submit} className="space-y-4">
            <div><Label htmlFor="ap-title">Title *</Label>
              <Input id="ap-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Cake tasting" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="ap-start">Start *</Label>
                <Input id="ap-start" type="datetime-local" value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))} required /></div>
              <div><Label htmlFor="ap-end">End</Label>
                <Input id="ap-end" type="datetime-local" value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))} /></div>
            </div>
            <div><Label htmlFor="ap-loc">Location</Label>
              <Input id="ap-loc" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Vendor address" /></div>
            {editing && <div><Label htmlFor="ap-status">Status</Label>
              <Select id="ap-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </Select></div>}
            <div><Label htmlFor="ap-notes">Notes</Label>
              <Input id="ap-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Bring samples..." /></div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setEditing(null) }} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      )}
      {deleteId && <ConfirmDelete label="appointment" onConfirm={() => deleteAppt(deleteId)} onCancel={() => setDeleteId(null)} />}
    </div>
  )
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const initiate = useInitiatePayment(weddingId)
  const [showManual, setShowManual] = useState(false)
  const [showStk, setShowStk] = useState(false)
  const [saving, setSaving] = useState(false)
  const blankManual = { amount: '', description: '', payerName: '', mpesaRef: '', status: 'COMPLETED' }
  const [manualForm, setManualForm] = useState(blankManual)
  const [stkForm, setStkForm] = useState({ phone: '', amount: '', description: '' })

  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ['payments', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/payments`)
      if (!res.ok) throw new Error()
      const all = await res.json() as Payment[]
      return all.filter(p => p.eventId === eventId)
    },
    staleTime: 30_000,
  })

  const addManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseFloat(manualForm.amount), description: manualForm.description || null, payerName: manualForm.payerName || null, mpesaRef: manualForm.mpesaRef || null, status: manualForm.status, eventId }) })
      if (!res.ok) throw new Error()
      await qc.invalidateQueries({ queryKey: ['payments', weddingId, eventId] })
      await qc.invalidateQueries({ queryKey: ['payments', weddingId] })
      toast('Payment recorded', 'success'); setShowManual(false); setManualForm(blankManual)
    } catch { toast('Failed to record payment', 'error') } finally { setSaving(false) }
  }

  const sendStk = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      await initiate.mutateAsync({ weddingId, phone: stkForm.phone, amount: parseFloat(stkForm.amount), description: stkForm.description || undefined })
      toast('STK push sent — waiting for payment…', 'info')
      setShowStk(false); setStkForm({ phone: '', amount: '', description: '' })
    } catch (err) { toast(err instanceof Error ? err.message : 'Failed', 'error') }
  }

  const total = payments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">{payments.length} payment{payments.length !== 1 ? 's' : ''}</p>
          {payments.length > 0 && <p className="text-xs font-bold text-emerald-600">{fmt(total)} received</p>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowManual(true)}><Plus size={13} /> Manual</Button>
          <Button size="sm" onClick={() => setShowStk(true)}><Phone size={13} /> STK Push</Button>
        </div>
      </div>
      {payments.length === 0
        ? <EmptyState icon={<CreditCard size={32} className="text-zinc-200" />} title="No payments" description="Record M-Pesa or manual payments for this event" />
        : <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex items-center gap-3 py-3 px-4 border border-zinc-100 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#14161C]">{p.description ?? 'Payment'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {p.payerName && <span className="text-xs text-zinc-400">{p.payerName}</span>}
                    {p.mpesaRef && <span className="text-xs text-zinc-400 font-mono">{p.mpesaRef}</span>}
                    <span className="text-xs text-zinc-400">{format(new Date(p.createdAt), 'MMM d, HH:mm')}</span>
                  </div>
                </div>
                <p className="text-sm font-bold text-[#14161C]">{fmt(p.amount)}</p>
                <Badge variant={p.status === 'COMPLETED' ? 'confirmed' : p.status === 'FAILED' ? 'declined' : 'pending'}>{p.status}</Badge>
              </div>
            ))}
          </div>}

      {showManual && (
        <Modal onClose={() => setShowManual(false)} title="Record manual payment">
          <form onSubmit={addManual} className="space-y-4">
            <div><Label htmlFor="mp-amount">Amount (KES) *</Label>
              <Input id="mp-amount" type="number" value={manualForm.amount} onChange={e => setManualForm(f => ({ ...f, amount: e.target.value }))} placeholder="5000" min="1" required /></div>
            <div><Label htmlFor="mp-desc">Description</Label>
              <Input id="mp-desc" value={manualForm.description} onChange={e => setManualForm(f => ({ ...f, description: e.target.value }))} placeholder="Catering deposit" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="mp-payer">Payer name</Label>
                <Input id="mp-payer" value={manualForm.payerName} onChange={e => setManualForm(f => ({ ...f, payerName: e.target.value }))} placeholder="Jane Doe" /></div>
              <div><Label htmlFor="mp-ref">M-Pesa ref</Label>
                <Input id="mp-ref" value={manualForm.mpesaRef} onChange={e => setManualForm(f => ({ ...f, mpesaRef: e.target.value }))} placeholder="QHX7..." /></div>
            </div>
            <div><Label htmlFor="mp-status">Status</Label>
              <Select id="mp-status" value={manualForm.status} onChange={e => setManualForm(f => ({ ...f, status: e.target.value }))}>
                <option value="COMPLETED">Completed</option><option value="PENDING">Pending</option><option value="FAILED">Failed</option>
              </Select></div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowManual(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Record'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {showStk && (
        <Modal onClose={() => setShowStk(false)} title="Request M-Pesa payment">
          <form onSubmit={sendStk} className="space-y-4">
            <div><Label htmlFor="stk-phone">Phone *</Label>
              <Input id="stk-phone" value={stkForm.phone} onChange={e => setStkForm(f => ({ ...f, phone: e.target.value }))} placeholder="254712345678" required />
              <p className="text-xs text-zinc-400 mt-1">Format: 254XXXXXXXXX</p></div>
            <div><Label htmlFor="stk-amount">Amount (KES) *</Label>
              <Input id="stk-amount" type="number" value={stkForm.amount} onChange={e => setStkForm(f => ({ ...f, amount: e.target.value }))} placeholder="5000" min="1" required /></div>
            <div><Label htmlFor="stk-desc">Description</Label>
              <Input id="stk-desc" value={stkForm.description} onChange={e => setStkForm(f => ({ ...f, description: e.target.value }))} placeholder="Catering deposit" /></div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowStk(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={initiate.isPending}>{initiate.isPending ? 'Sending…' : <><Phone size={14} /> Send STK Push</>}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── Contributions Tab ────────────────────────────────────────────────────────

function ContributionsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Contribution | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const blank = { memberName: '', pledgeAmount: '', paidAmount: '0', dueDate: '', notes: '', status: 'PLEDGED' }
  const [form, setForm] = useState(blank)

  const { data: contributions = [], isLoading } = useQuery<Contribution[]>({
    queryKey: ['contributions', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/contributions`)
      if (!res.ok) throw new Error()
      const all = await res.json() as Contribution[]
      return all.filter(c => c.eventId === eventId)
    },
    staleTime: 30_000,
  })

  const openEdit = (c: Contribution) => {
    setEditing(c)
    setForm({ memberName: c.memberName, pledgeAmount: String(c.pledgeAmount), paidAmount: String(c.paidAmount), dueDate: c.dueDate ? c.dueDate.slice(0, 10) : '', notes: c.notes ?? '', status: c.status })
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/weddings/${weddingId}/contributions/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberName: form.memberName, pledgeAmount: parseFloat(form.pledgeAmount), paidAmount: parseFloat(form.paidAmount), status: form.status, dueDate: form.dueDate || null, notes: form.notes || null }) })
        if (!res.ok) throw new Error()
        toast('Contribution updated', 'success')
      } else {
        const res = await fetch(`/api/weddings/${weddingId}/contributions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberName: form.memberName, pledgeAmount: parseFloat(form.pledgeAmount), eventId, dueDate: form.dueDate || null, notes: form.notes || null }) })
        if (!res.ok) throw new Error()
        toast('Pledge recorded', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['contributions', weddingId, eventId] })
      await qc.invalidateQueries({ queryKey: ['contributions', weddingId] })
      setShowAdd(false); setEditing(null); setForm(blank)
    } catch { toast('Failed to save', 'error') } finally { setSaving(false) }
  }

  const deleteContrib = async (id: string) => {
    setDeleteId(null)
    await fetch(`/api/weddings/${weddingId}/contributions/${id}`, { method: 'DELETE' })
    await qc.invalidateQueries({ queryKey: ['contributions', weddingId, eventId] })
    await qc.invalidateQueries({ queryKey: ['contributions', weddingId] })
    toast('Contribution deleted', 'success')
  }

  const totalPledged = contributions.reduce((s, c) => s + c.pledgeAmount, 0)
  const totalPaid = contributions.reduce((s, c) => s + c.paidAmount, 0)

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {contributions.length > 0 && (
          <div className="flex gap-6 divide-x divide-zinc-100">
            <div className="pr-6"><p className="text-xs text-zinc-400">Pledged</p><p className="text-lg font-extrabold text-sky-600">{fmt(totalPledged)}</p></div>
            <div className="pl-6"><p className="text-xs text-zinc-400">Collected</p><p className="text-lg font-extrabold text-emerald-600">{fmt(totalPaid)}</p></div>
          </div>
        )}
        <Button size="sm" onClick={() => { setForm(blank); setShowAdd(true) }} className="ml-auto"><Plus size={13} /> Add pledge</Button>
      </div>
      {contributions.length === 0
        ? <EmptyState icon={<Users size={32} className="text-zinc-200" />} title="No contributions" description="Record committee member pledges for this event" />
        : <div className="space-y-2">
            {contributions.map(c => {
              const pct = c.pledgeAmount > 0 ? Math.min(100, Math.round((c.paidAmount / c.pledgeAmount) * 100)) : 0
              return (
                <div key={c.id} className="py-3 px-4 border border-zinc-100 rounded-xl space-y-2 group">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#14161C]">{c.memberName}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-zinc-400">{fmt(c.paidAmount)} / {fmt(c.pledgeAmount)}</p>
                      <Badge variant={c.status === 'FULFILLED' ? 'confirmed' : c.status === 'OVERDUE' ? 'declined' : 'pending'}>{c.status}</Badge>
                      <button onClick={() => openEdit(c)} className="p-1 text-zinc-300 hover:text-violet-500 opacity-0 group-hover:opacity-100 transition-all" aria-label="Edit"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteId(c.id)} className="p-1 text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" aria-label="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <ProgressBar value={c.paidAmount} max={c.pledgeAmount} />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-400">{pct}% paid</p>
                    {c.dueDate && <p className={`text-xs ${c.status === 'OVERDUE' ? 'text-red-500 font-semibold' : 'text-zinc-400'}`}>Due {format(new Date(c.dueDate), 'MMM d')}</p>}
                  </div>
                </div>
              )
            })}
          </div>}

      {(showAdd || editing) && (
        <Modal onClose={() => { setShowAdd(false); setEditing(null) }} title={editing ? 'Edit contribution' : 'Add pledge'}>
          <form onSubmit={submit} className="space-y-4">
            <div><Label htmlFor="co-name">Member name *</Label>
              <Input id="co-name" value={form.memberName} onChange={e => setForm(f => ({ ...f, memberName: e.target.value }))} placeholder="Jane Doe" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="co-pledge">Pledge (KES) *</Label>
                <Input id="co-pledge" type="number" value={form.pledgeAmount} onChange={e => setForm(f => ({ ...f, pledgeAmount: e.target.value }))} placeholder="10000" min="1" required /></div>
              <div><Label htmlFor="co-paid">Paid (KES)</Label>
                <Input id="co-paid" type="number" value={form.paidAmount} onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value }))} placeholder="0" min="0" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {editing && <div><Label htmlFor="co-status">Status</Label>
                <Select id="co-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="PLEDGED">Pledged</option><option value="PARTIAL">Partial</option>
                  <option value="FULFILLED">Fulfilled</option><option value="OVERDUE">Overdue</option>
                  <option value="CANCELLED">Cancelled</option>
                </Select></div>}
              <div><Label htmlFor="co-due">Due date</Label>
                <Input id="co-due" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            </div>
            <div><Label htmlFor="co-notes">Notes</Label>
              <Input id="co-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" /></div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setEditing(null) }} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      )}
      {deleteId && <ConfirmDelete label="contribution" onConfirm={() => deleteContrib(deleteId)} onCancel={() => setDeleteId(null)} />}
    </div>
  )
}

// ─── Logistics Tab ────────────────────────────────────────────────────────────

function LogisticsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [showRoute, setShowRoute] = useState(false)
  const [showAccom, setShowAccom] = useState(false)
  const [editRoute, setEditRoute] = useState<TransportRoute | null>(null)
  const [editAccom, setEditAccom] = useState<Accommodation | null>(null)
  const [deleteRoute, setDeleteRoute] = useState<string | null>(null)
  const [deleteAccom, setDeleteAccom] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const blankRoute = { name: '', departureLocation: '', arrivalLocation: '', departureTime: '', capacity: '' }
  const blankAccom = { hotelName: '', address: '', checkIn: '', checkOut: '', roomsBlocked: '', notes: '' }
  const [routeForm, setRouteForm] = useState(blankRoute)
  const [accomForm, setAccomForm] = useState(blankAccom)

  const { data: routes = [], isLoading: loadingRoutes } = useQuery<TransportRoute[]>({
    queryKey: ['logistics-routes', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/logistics/routes`)
      if (!res.ok) throw new Error()
      const all = await res.json() as TransportRoute[]
      return all.filter(r => r.eventId === eventId)
    },
    staleTime: 30_000,
  })

  const { data: accommodations = [], isLoading: loadingAccom } = useQuery<Accommodation[]>({
    queryKey: ['logistics-accommodations', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/logistics/accommodations`)
      if (!res.ok) throw new Error()
      const all = await res.json() as Accommodation[]
      return all.filter(a => a.eventId === eventId)
    },
    staleTime: 30_000,
  })

  const openEditRoute = (r: TransportRoute) => {
    setEditRoute(r)
    setRouteForm({ name: r.name, departureLocation: r.departureLocation, arrivalLocation: r.arrivalLocation, departureTime: r.departureTime.slice(0, 16), capacity: r.capacity ? String(r.capacity) : '' })
  }
  const openEditAccom = (a: Accommodation) => {
    setEditAccom(a)
    setAccomForm({ hotelName: a.hotelName, address: a.address ?? '', checkIn: a.checkIn.slice(0, 10), checkOut: a.checkOut.slice(0, 10), roomsBlocked: a.roomsBlocked ? String(a.roomsBlocked) : '', notes: a.notes ?? '' })
  }

  const submitRoute = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    const payload = { name: routeForm.name, departureLocation: routeForm.departureLocation, arrivalLocation: routeForm.arrivalLocation, departureTime: routeForm.departureTime, capacity: routeForm.capacity ? parseInt(routeForm.capacity) : null, eventId }
    try {
      if (editRoute) {
        await fetch(`/api/weddings/${weddingId}/logistics/routes/${editRoute.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast('Route updated', 'success')
      } else {
        await fetch(`/api/weddings/${weddingId}/logistics/routes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast('Route added', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['logistics-routes', weddingId, eventId] })
      setShowRoute(false); setEditRoute(null); setRouteForm(blankRoute)
    } catch { toast('Failed to save route', 'error') } finally { setSaving(false) }
  }

  const submitAccom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    const payload = { hotelName: accomForm.hotelName, address: accomForm.address || null, checkIn: accomForm.checkIn, checkOut: accomForm.checkOut, roomsBlocked: accomForm.roomsBlocked ? parseInt(accomForm.roomsBlocked) : null, notes: accomForm.notes || null, eventId }
    try {
      if (editAccom) {
        await fetch(`/api/weddings/${weddingId}/logistics/accommodations/${editAccom.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast('Accommodation updated', 'success')
      } else {
        await fetch(`/api/weddings/${weddingId}/logistics/accommodations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast('Accommodation added', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['logistics-accommodations', weddingId, eventId] })
      setShowAccom(false); setEditAccom(null); setAccomForm(blankAccom)
    } catch { toast('Failed to save accommodation', 'error') } finally { setSaving(false) }
  }

  if (loadingRoutes || loadingAccom) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Truck size={12} /> Transport routes</p>
          <Button size="sm" variant="secondary" onClick={() => { setRouteForm(blankRoute); setShowRoute(true) }}><Plus size={13} /> Add route</Button>
        </div>
        {routes.length === 0
          ? <p className="text-sm text-zinc-400 py-4 text-center">No transport routes for this event</p>
          : <div className="space-y-2">
              {routes.map(r => (
                <div key={r.id} className="py-3 px-4 border border-zinc-100 rounded-xl group flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#14161C]">{r.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{r.departureLocation} → {r.arrivalLocation} · {format(new Date(r.departureTime), 'MMM d, h:mm a')}{r.capacity ? ` · ${r.capacity} seats` : ''}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <button onClick={() => openEditRoute(r)} className="p-1 text-zinc-300 hover:text-violet-500" aria-label="Edit"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteRoute(r.id)} className="p-1 text-zinc-300 hover:text-red-400" aria-label="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Hotel size={12} /> Accommodation</p>
          <Button size="sm" variant="secondary" onClick={() => { setAccomForm(blankAccom); setShowAccom(true) }}><Plus size={13} /> Add block</Button>
        </div>
        {accommodations.length === 0
          ? <p className="text-sm text-zinc-400 py-4 text-center">No accommodation blocks for this event</p>
          : <div className="space-y-2">
              {accommodations.map(a => (
                <div key={a.id} className="py-3 px-4 border border-zinc-100 rounded-xl group flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#14161C]">{a.hotelName}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{a.address ? `${a.address} · ` : ''}{format(new Date(a.checkIn), 'MMM d')} – {format(new Date(a.checkOut), 'MMM d')}{a.roomsBlocked ? ` · ${a.roomsBlocked} rooms` : ''}</p>
                    {a.notes && <p className="text-xs text-zinc-400 mt-0.5">{a.notes}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <button onClick={() => openEditAccom(a)} className="p-1 text-zinc-300 hover:text-violet-500" aria-label="Edit"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteAccom(a.id)} className="p-1 text-zinc-300 hover:text-red-400" aria-label="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>}
      </div>

      {(showRoute || editRoute) && (
        <Modal onClose={() => { setShowRoute(false); setEditRoute(null) }} title={editRoute ? 'Edit route' : 'Add transport route'}>
          <form onSubmit={submitRoute} className="space-y-4">
            <div><Label htmlFor="rt-name">Route name *</Label>
              <Input id="rt-name" value={routeForm.name} onChange={e => setRouteForm(f => ({ ...f, name: e.target.value }))} placeholder="Nairobi → Venue" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="rt-from">From *</Label>
                <Input id="rt-from" value={routeForm.departureLocation} onChange={e => setRouteForm(f => ({ ...f, departureLocation: e.target.value }))} placeholder="Nairobi CBD" required /></div>
              <div><Label htmlFor="rt-to">To *</Label>
                <Input id="rt-to" value={routeForm.arrivalLocation} onChange={e => setRouteForm(f => ({ ...f, arrivalLocation: e.target.value }))} placeholder="Venue" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="rt-time">Departure *</Label>
                <Input id="rt-time" type="datetime-local" value={routeForm.departureTime} onChange={e => setRouteForm(f => ({ ...f, departureTime: e.target.value }))} required /></div>
              <div><Label htmlFor="rt-cap">Capacity</Label>
                <Input id="rt-cap" type="number" value={routeForm.capacity} onChange={e => setRouteForm(f => ({ ...f, capacity: e.target.value }))} placeholder="50" min="1" /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setShowRoute(false); setEditRoute(null) }} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {(showAccom || editAccom) && (
        <Modal onClose={() => { setShowAccom(false); setEditAccom(null) }} title={editAccom ? 'Edit accommodation' : 'Add accommodation block'}>
          <form onSubmit={submitAccom} className="space-y-4">
            <div><Label htmlFor="ac-hotel">Hotel name *</Label>
              <Input id="ac-hotel" value={accomForm.hotelName} onChange={e => setAccomForm(f => ({ ...f, hotelName: e.target.value }))} placeholder="Serena Hotel" required /></div>
            <div><Label htmlFor="ac-addr">Address</Label>
              <Input id="ac-addr" value={accomForm.address} onChange={e => setAccomForm(f => ({ ...f, address: e.target.value }))} placeholder="Nairobi" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="ac-in">Check-in *</Label>
                <Input id="ac-in" type="date" value={accomForm.checkIn} onChange={e => setAccomForm(f => ({ ...f, checkIn: e.target.value }))} required /></div>
              <div><Label htmlFor="ac-out">Check-out *</Label>
                <Input id="ac-out" type="date" value={accomForm.checkOut} onChange={e => setAccomForm(f => ({ ...f, checkOut: e.target.value }))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="ac-rooms">Rooms blocked</Label>
                <Input id="ac-rooms" type="number" value={accomForm.roomsBlocked} onChange={e => setAccomForm(f => ({ ...f, roomsBlocked: e.target.value }))} placeholder="10" min="1" /></div>
              <div><Label htmlFor="ac-notes">Notes</Label>
                <Input id="ac-notes" value={accomForm.notes} onChange={e => setAccomForm(f => ({ ...f, notes: e.target.value }))} placeholder="Breakfast included" /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setShowAccom(false); setEditAccom(null) }} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteRoute && <ConfirmDelete label="route" onConfirm={async () => { setDeleteRoute(null); await fetch(`/api/weddings/${weddingId}/logistics/routes/${deleteRoute}`, { method: 'DELETE' }); await qc.invalidateQueries({ queryKey: ['logistics-routes', weddingId, eventId] }); toast('Route deleted', 'success') }} onCancel={() => setDeleteRoute(null)} />}
      {deleteAccom && <ConfirmDelete label="accommodation" onConfirm={async () => { setDeleteAccom(null); await fetch(`/api/weddings/${weddingId}/logistics/accommodations/${deleteAccom}`, { method: 'DELETE' }); await qc.invalidateQueries({ queryKey: ['logistics-accommodations', weddingId, eventId] }); toast('Accommodation deleted', 'success') }} onCancel={() => setDeleteAccom(null)} />}
    </div>
  )
}

// ─── Vision Tab ───────────────────────────────────────────────────────────────

interface VisionImage { id: string; path: string; bucket: string; title?: string; linkedToId?: string; linkedToType?: string; mimeType?: string; eventId?: string }
interface VisionCategory { id: string; name: string; color: string; isDefault: boolean; order: number }

function imgUrl(img: VisionImage) {
  return `/api/storage/signed-url?path=${encodeURIComponent(img.path)}&bucket=${img.bucket}`
}

function BoardCollage({ images }: Readonly<{ images: VisionImage[] }>) {
  const previews = images.slice(0, 4)
  if (previews.length === 0) return (
    <div className="w-full aspect-[4/3] bg-zinc-100 rounded-2xl flex items-center justify-center">
      <ImageIcon size={32} className="text-zinc-300" />
    </div>
  )
  if (previews.length === 1) return (
    <img src={imgUrl(previews[0])} alt="" className="w-full aspect-[4/3] object-cover rounded-2xl" loading="lazy" />
  )
  if (previews.length === 2) return (
    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden grid grid-cols-2 gap-0.5">
      {previews.map(img => <img key={img.id} src={imgUrl(img)} alt="" className="w-full h-full object-cover" loading="lazy" />)}
    </div>
  )
  if (previews.length === 3) return (
    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden grid grid-cols-2 gap-0.5">
      <img src={imgUrl(previews[0])} alt="" className="w-full h-full object-cover row-span-2" loading="lazy" />
      <img src={imgUrl(previews[1])} alt="" className="w-full h-full object-cover" loading="lazy" />
      <img src={imgUrl(previews[2])} alt="" className="w-full h-full object-cover" loading="lazy" />
    </div>
  )
  return (
    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden grid grid-cols-2 gap-0.5">
      {previews.map(img => <img key={img.id} src={imgUrl(img)} alt="" className="w-full h-full object-cover" loading="lazy" />)}
    </div>
  )
}

function BoardCard({ category, images, onOpen, onEdit, onDelete }: Readonly<{
  category: VisionCategory; images: VisionImage[]
  onOpen: () => void; onEdit: () => void; onDelete: () => void
}>) {
  const [liked, setLiked] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  return (
    <div className="group relative">
      <button onClick={onOpen} className="text-left focus:outline-none w-full">
        <div className="overflow-hidden rounded-2xl transition-transform group-hover:scale-[1.02] duration-200">
          <BoardCollage images={images} />
        </div>
      </button>
      <div className="mt-2.5 flex items-start justify-between gap-2">
        <button onClick={onOpen} className="text-left flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#14161C] truncate">{category.name}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{images.length} photo{images.length !== 1 ? 's' : ''}</p>
        </button>
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          <button onClick={e => { e.stopPropagation(); setLiked(v => !v) }} className="p-1 rounded-full" aria-label={liked ? 'Unlike' : 'Like'}>
            <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-colors ${liked ? 'fill-pink-400 stroke-pink-400' : 'fill-none stroke-zinc-300 hover:stroke-pink-400'}`} strokeWidth={2}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }} className="p-1 rounded-full text-zinc-300 hover:text-zinc-500 transition-colors" aria-label="More options">
              <MoreHorizontal size={15} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} aria-hidden />
                <div className="absolute right-0 top-6 bg-white rounded-xl shadow-lg border border-zinc-100 py-1 z-20 min-w-32">
                  <button onClick={() => { setShowMenu(false); onEdit() }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                    <Pencil size={13} /> Edit board
                  </button>
                  <button onClick={() => { setShowMenu(false); onDelete() }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50">
                    <Trash2 size={13} /> Delete board
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function VisionBoardDetailModal({ category, images, weddingId, onClose, onDeletePhoto, onRenamePhoto, onUpload, uploading }: Readonly<{
  category: VisionCategory; images: VisionImage[]; weddingId: string
  onClose: () => void; onDeletePhoto: (id: string) => void
  onRenamePhoto: (id: string, title: string) => void
  onUpload: (files: File[], catId: string) => void; uploading: boolean
}>) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const saveRename = () => { if (editingPhotoId) { onRenamePhoto(editingPhotoId, editTitle); setEditingPhotoId(null) } }
  return (
    <Modal onClose={onClose} title={category.name}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
            <p className="text-xs text-zinc-400">{images.length} photo{images.length !== 1 ? 's' : ''}</p>
          </div>
          <Button size="sm" variant="lavender" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Spinner size="sm" /> : <Upload size={13} />}
            {uploading ? 'Uploading…' : 'Add photos'}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) onUpload(files, category.id); e.target.value = '' }} />
        </div>
        {images.length === 0
          ? <EmptyState icon={<ImageIcon size={32} className="text-zinc-200" />} title="No photos yet" description="Add inspiration photos to this board"
              action={<Button size="sm" variant="lavender" onClick={() => fileRef.current?.click()}><Upload size={13} /> Upload</Button>} />
          : <div className="columns-2 gap-2 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
              {images.map(img => (
                <div key={img.id} className="break-inside-avoid mb-2 rounded-xl overflow-hidden group relative">
                  <img src={imgUrl(img)} alt={img.title ?? ''} className="w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-xl" />
                  <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setEditingPhotoId(img.id); setEditTitle(img.title ?? '') }}
                      className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white" aria-label="Rename"><Pencil size={11} /></button>
                    <button onClick={() => onDeletePhoto(img.id)}
                      className="p-1.5 rounded-lg bg-black/50 hover:bg-red-500/80 text-white" aria-label="Delete"><Trash2 size={11} /></button>
                  </div>
                  {editingPhotoId === img.id ? (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 flex items-center gap-1">
                      <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditingPhotoId(null) }}
                        className="flex-1 text-xs bg-transparent text-white placeholder-white/50 outline-none border-b border-white/40" placeholder="Add a title…" />
                      <button onClick={saveRename} className="text-emerald-400 hover:text-emerald-300" aria-label="Save"><Check size={12} /></button>
                      <button onClick={() => setEditingPhotoId(null)} className="text-white/60 hover:text-white" aria-label="Cancel"><X size={12} /></button>
                    </div>
                  ) : img.title ? (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-all">
                      <p className="text-[11px] text-white font-medium truncate">{img.title}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>}
      </div>
    </Modal>
  )
}

function EditVisionBoardModal({ weddingId, category, onClose }: Readonly<{
  weddingId: string; category: VisionCategory; onClose: () => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const COLOR_PRESETS = ['#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#3B82F6','#6B7280','#F97316','#14B8A6']
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)
  const [saving, setSaving] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!name.trim()) return; setSaving(true)
    try {
      await fetch(`/api/weddings/${weddingId}/vision-categories/${category.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })
      qc.invalidateQueries({ queryKey: ['vision-categories', weddingId] })
      toast('Board updated', 'success'); onClose()
    } catch { toast('Failed to update board', 'error') } finally { setSaving(false) }
  }
  return (
    <Modal onClose={onClose} title="Edit board">
      <form onSubmit={submit} className="space-y-4">
        <div><Label htmlFor="evb-name">Board name *</Label>
          <Input id="evb-name" value={name} onChange={e => setName(e.target.value)} autoFocus required /></div>
        <div><Label>Color</Label>
          <div className="flex items-center gap-2 mt-1">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded-lg border border-zinc-200 cursor-pointer flex-shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              {COLOR_PRESETS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-zinc-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }} aria-label={c} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function CreateVisionBoardModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const COLOR_PRESETS = ['#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#3B82F6','#6B7280','#F97316','#14B8A6']
  const [name, setName] = useState('')
  const [color, setColor] = useState('#8B5CF6')
  const [saving, setSaving] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!name.trim()) return; setSaving(true)
    try {
      await fetch(`/api/weddings/${weddingId}/vision-categories`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })
      qc.invalidateQueries({ queryKey: ['vision-categories', weddingId] })
      toast('Board created', 'success'); onClose()
    } catch { toast('Failed to create board', 'error') } finally { setSaving(false) }
  }
  return (
    <Modal onClose={onClose} title="Create board">
      <form onSubmit={submit} className="space-y-4">
        <div><Label htmlFor="cvb-name">Board name *</Label>
          <Input id="cvb-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tablescapes" autoFocus required /></div>
        <div><Label>Color</Label>
          <div className="flex items-center gap-2 mt-1">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded-lg border border-zinc-200 cursor-pointer flex-shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              {COLOR_PRESETS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-zinc-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }} aria-label={c} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving || !name.trim()}>{saving ? 'Creating…' : 'Create board'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function VisionTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [openBoard, setOpenBoard] = useState<VisionCategory | null>(null)
  const [editBoard, setEditBoard] = useState<VisionCategory | null>(null)
  const [deleteBoard, setDeleteBoard] = useState<VisionCategory | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: categories = [], isLoading: catsLoading } = useQuery<VisionCategory[]>({
    queryKey: ['vision-categories', weddingId],
    queryFn: async () => { const r = await fetch(`/api/weddings/${weddingId}/vision-categories`); if (!r.ok) throw new Error(); return r.json() },
    staleTime: 60_000,
  })

  const { data: allImages = [], isLoading: imagesLoading } = useQuery<VisionImage[]>({
    queryKey: ['moodboard', weddingId],
    queryFn: async () => {
      const r = await fetch(`/api/weddings/${weddingId}/media`)
      if (!r.ok) throw new Error()
      const items = await r.json() as VisionImage[]
      return items.filter(i => i.linkedToType === 'moodboard' && i.mimeType?.startsWith('image/'))
    },
    staleTime: 30_000,
  })

  const images = allImages.filter(i => i.eventId === eventId)

  const handleUpload = async (files: File[], catId: string) => {
    setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file); fd.append('bucket', 'media')
        fd.append('path', `${weddingId}/moodboard/${eventId}/${catId}/${Date.now()}-${file.name}`)
        fd.append('weddingId', weddingId)
        const up = await fetch('/api/storage/upload', { method: 'POST', body: fd })
        if (!up.ok) continue
        const { path } = await up.json() as { path: string }
        await fetch(`/api/weddings/${weddingId}/media`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket: 'media', path, mimeType: file.type, linkedToType: 'moodboard', linkedToId: catId, title: file.name, eventId }),
        })
      }
      await qc.invalidateQueries({ queryKey: ['moodboard', weddingId] })
      toast('Photos uploaded', 'success')
    } catch { toast('Upload failed', 'error') } finally { setUploading(false) }
  }

  const handleDeletePhoto = async (imgId: string) => {
    try {
      await fetch(`/api/weddings/${weddingId}/media/${imgId}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['moodboard', weddingId] })
      toast('Photo removed', 'success')
    } catch { toast('Failed to remove photo', 'error') }
  }

  const handleRenamePhoto = async (imgId: string, title: string) => {
    try {
      await fetch(`/api/weddings/${weddingId}/media/${imgId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || null }),
      })
      await qc.invalidateQueries({ queryKey: ['moodboard', weddingId] })
    } catch { toast('Failed to rename photo', 'error') }
  }

  const handleDeleteBoard = async (cat: VisionCategory) => {
    try {
      await fetch(`/api/weddings/${weddingId}/vision-categories/${cat.id}`, { method: 'DELETE' })
      qc.invalidateQueries({ queryKey: ['vision-categories', weddingId] })
      qc.invalidateQueries({ queryKey: ['moodboard', weddingId] })
      setDeleteBoard(null)
      if (openBoard?.id === cat.id) setOpenBoard(null)
      toast('Board deleted', 'success')
    } catch { toast('Failed to delete board', 'error') }
  }

  if (catsLoading || imagesLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{images.length} photo{images.length !== 1 ? 's' : ''} · {categories.length} board{categories.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Create board</Button>
      </div>

      {categories.length === 0
        ? <EmptyState icon={<ImageIcon size={40} className="text-zinc-200" />} title="No boards yet" description="Vision boards will appear here once categories are set up" />
        : <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {categories.map(cat => (
              <BoardCard
                key={cat.id}
                category={cat}
                images={images.filter(i => i.linkedToId === cat.id)}
                onOpen={() => setOpenBoard(cat)}
                onEdit={() => setEditBoard(cat)}
                onDelete={() => setDeleteBoard(cat)}
              />
            ))}
          </div>}

      {openBoard && (
        <VisionBoardDetailModal
          category={openBoard}
          images={images.filter(i => i.linkedToId === openBoard.id)}
          weddingId={weddingId}
          onClose={() => setOpenBoard(null)}
          onDeletePhoto={handleDeletePhoto}
          onRenamePhoto={handleRenamePhoto}
          onUpload={handleUpload}
          uploading={uploading}
        />
      )}
      {editBoard && <EditVisionBoardModal weddingId={weddingId} category={editBoard} onClose={() => setEditBoard(null)} />}
      {deleteBoard && (
        <Modal onClose={() => setDeleteBoard(null)} title={`Delete "${deleteBoard.name}"?`}>
          <p className="text-sm text-zinc-500 mb-6">All photos in this board will be removed. This cannot be undone.</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDeleteBoard(null)} className="flex-1">Cancel</Button>
            <Button onClick={() => handleDeleteBoard(deleteBoard)} className="flex-1 bg-red-500 hover:bg-red-600 text-white border-red-500">Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Gifts Tab ────────────────────────────────────────────────────────────────

function GiftsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [subTab, setSubTab] = useState<'registry' | 'received'>('registry')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<GiftRegistryItem | GiftReceived | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const blankReg = { name: '', description: '', url: '', estimatedPrice: '', quantity: '1', priority: '2' }
  const blankRec = { giverName: '', description: '', estimatedValue: '', status: 'RECEIVED', thankYouSent: false }
  const [regForm, setRegForm] = useState(blankReg)
  const [recForm, setRecForm] = useState(blankRec)

  const { data: registry = [], isLoading: loadingReg } = useQuery<GiftRegistryItem[]>({
    queryKey: ['gifts-registry', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/gifts/registry`)
      if (!res.ok) throw new Error()
      const all = await res.json() as GiftRegistryItem[]
      return all.filter(g => g.eventId === eventId)
    },
    staleTime: 30_000,
  })

  const { data: received = [], isLoading: loadingRec } = useQuery<GiftReceived[]>({
    queryKey: ['gifts-received', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/gifts/received`)
      if (!res.ok) throw new Error()
      const all = await res.json() as GiftReceived[]
      return all.filter(g => g.eventId === eventId)
    },
    staleTime: 30_000,
  })

  const openEditReg = (g: GiftRegistryItem) => {
    setEditing(g)
    setRegForm({ name: g.name, description: g.description ?? '', url: g.url ?? '', estimatedPrice: g.estimatedPrice ? String(g.estimatedPrice) : '', quantity: String(g.quantity), priority: String(g.priority) })
  }
  const openEditRec = (g: GiftReceived) => {
    setEditing(g)
    setRecForm({ giverName: g.giverName, description: g.description, estimatedValue: g.estimatedValue ? String(g.estimatedValue) : '', status: g.status, thankYouSent: g.thankYouSent })
  }

  const submitReg = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    const payload = { name: regForm.name, description: regForm.description || null, url: regForm.url || null, estimatedPrice: regForm.estimatedPrice ? parseFloat(regForm.estimatedPrice) : null, quantity: parseInt(regForm.quantity) || 1, priority: parseInt(regForm.priority) || 2, eventId }
    try {
      if (editing) {
        await fetch(`/api/weddings/${weddingId}/gifts/registry/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast('Registry item updated', 'success')
      } else {
        await fetch(`/api/weddings/${weddingId}/gifts/registry`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast('Registry item added', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['gifts-registry', weddingId, eventId] })
      setShowAdd(false); setEditing(null); setRegForm(blankReg)
    } catch { toast('Failed to save', 'error') } finally { setSaving(false) }
  }

  const submitRec = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    const payload = { giverName: recForm.giverName, description: recForm.description, estimatedValue: recForm.estimatedValue ? parseFloat(recForm.estimatedValue) : null, status: recForm.status, thankYouSent: recForm.thankYouSent, eventId }
    try {
      if (editing) {
        await fetch(`/api/weddings/${weddingId}/gifts/received/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast('Gift updated', 'success')
      } else {
        await fetch(`/api/weddings/${weddingId}/gifts/received`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast('Gift recorded', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['gifts-received', weddingId, eventId] })
      setShowAdd(false); setEditing(null); setRecForm(blankRec)
    } catch { toast('Failed to save', 'error') } finally { setSaving(false) }
  }

  const deleteItem = async (id: string) => {
    setDeleteId(null)
    const url = subTab === 'registry' ? `/api/weddings/${weddingId}/gifts/registry/${id}` : `/api/weddings/${weddingId}/gifts/received/${id}`
    await fetch(url, { method: 'DELETE' })
    await qc.invalidateQueries({ queryKey: [subTab === 'registry' ? 'gifts-registry' : 'gifts-received', weddingId, eventId] })
    toast('Deleted', 'success')
  }

  const isLoading = loadingReg || loadingRec

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['registry', 'received'] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${subTab === t ? 'bg-violet-100 text-violet-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
              {t === 'registry' ? 'Registry' : 'Received'}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setShowAdd(true) }}><Plus size={13} /> Add</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : subTab === 'registry' ? (
        registry.length === 0
          ? <EmptyState icon={<Gift size={32} className="text-zinc-200" />} title="No registry items" description="Add gift registry items for this event" />
          : <div className="space-y-2">
              {registry.map(g => (
                <div key={g.id} className="flex items-center gap-3 py-3 px-4 border border-zinc-100 rounded-xl group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#14161C]">{g.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {g.estimatedPrice != null && <span className="text-xs text-zinc-400">{fmt(g.estimatedPrice)}</span>}
                      <span className="text-xs text-zinc-400">Qty: {g.quantity}</span>
                      {g.url && <a href={g.url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-500 hover:underline">Link</a>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditReg(g)} className="p-1 text-zinc-300 hover:text-violet-500 opacity-0 group-hover:opacity-100 transition-all" aria-label="Edit"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteId(g.id)} className="p-1 text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" aria-label="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
      ) : (
        received.length === 0
          ? <EmptyState icon={<Gift size={32} className="text-zinc-200" />} title="No gifts received" description="Record gifts received at this event" />
          : <div className="space-y-2">
              {received.map(g => (
                <div key={g.id} className="flex items-center gap-3 py-3 px-4 border border-zinc-100 rounded-xl group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#14161C]">{g.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-400">From {g.giverName}</span>
                      {g.thankYouSent && <span className="text-xs text-emerald-500">Thank you sent</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.estimatedValue != null && <p className="text-sm font-bold text-[#14161C]">{fmt(g.estimatedValue)}</p>}
                    <Badge variant={g.status === 'THANKED' ? 'confirmed' : 'pending'}>{g.status}</Badge>
                    <button onClick={() => openEditRec(g)} className="p-1 text-zinc-300 hover:text-violet-500 opacity-0 group-hover:opacity-100 transition-all" aria-label="Edit"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteId(g.id)} className="p-1 text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" aria-label="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
      )}

      {(showAdd || editing) && subTab === 'registry' && (
        <Modal onClose={() => { setShowAdd(false); setEditing(null) }} title={editing ? 'Edit registry item' : 'Add registry item'}>
          <form onSubmit={submitReg} className="space-y-4">
            <div><Label htmlFor="gr-name">Item name *</Label>
              <Input id="gr-name" value={regForm.name} onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))} placeholder="KitchenAid Mixer" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="gr-price">Price (KES)</Label>
                <Input id="gr-price" type="number" value={regForm.estimatedPrice} onChange={e => setRegForm(f => ({ ...f, estimatedPrice: e.target.value }))} placeholder="15000" min="0" /></div>
              <div><Label htmlFor="gr-qty">Quantity</Label>
                <Input id="gr-qty" type="number" value={regForm.quantity} onChange={e => setRegForm(f => ({ ...f, quantity: e.target.value }))} placeholder="1" min="1" /></div>
            </div>
            <div><Label htmlFor="gr-url">Link (optional)</Label>
              <Input id="gr-url" value={regForm.url} onChange={e => setRegForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." /></div>
            <div><Label htmlFor="gr-desc">Description</Label>
              <Input id="gr-desc" value={regForm.description} onChange={e => setRegForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes" /></div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setEditing(null) }} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {(showAdd || editing) && subTab === 'received' && (
        <Modal onClose={() => { setShowAdd(false); setEditing(null) }} title={editing ? 'Edit gift' : 'Record received gift'}>
          <form onSubmit={submitRec} className="space-y-4">
            <div><Label htmlFor="rc-giver">Giver name *</Label>
              <Input id="rc-giver" value={recForm.giverName} onChange={e => setRecForm(f => ({ ...f, giverName: e.target.value }))} placeholder="John & Mary" required /></div>
            <div><Label htmlFor="rc-desc">Description *</Label>
              <Input id="rc-desc" value={recForm.description} onChange={e => setRecForm(f => ({ ...f, description: e.target.value }))} placeholder="Dinner set" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="rc-val">Estimated value (KES)</Label>
                <Input id="rc-val" type="number" value={recForm.estimatedValue} onChange={e => setRecForm(f => ({ ...f, estimatedValue: e.target.value }))} placeholder="5000" min="0" /></div>
              <div><Label htmlFor="rc-status">Status</Label>
                <Select id="rc-status" value={recForm.status} onChange={e => setRecForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="RECEIVED">Received</option>
                  <option value="THANKED">Thanked</option>
                  <option value="RETURNED">Returned</option>
                </Select></div>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
              <input type="checkbox" checked={recForm.thankYouSent} onChange={e => setRecForm(f => ({ ...f, thankYouSent: e.target.checked }))} className="rounded" />
              Thank you note sent
            </label>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setEditing(null) }} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      )}
      {deleteId && <ConfirmDelete label="item" onConfirm={() => deleteItem(deleteId)} onCancel={() => setDeleteId(null)} />}
    </div>
  )
}

// ─── Vendors Tab ──────────────────────────────────────────────────────────────

const VENDOR_CATEGORIES = ['CATERING','PHOTOGRAPHY','VIDEOGRAPHY','FLORIST','MUSIC_DJ','BAND','TRANSPORT','DECOR','CAKE','ATTIRE','VENUE','OFFICIANT','HAIR_MAKEUP','ENTERTAINMENT','SECURITY','OTHER']
const VENDOR_STATUSES = ['ENQUIRED','QUOTED','BOOKED','CONFIRMED','CANCELLED','COMPLETED']

function VendorsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const blank = { name: '', category: 'CATERING', status: 'ENQUIRED', contactName: '', contactPhone: '', contactEmail: '', amount: '', notes: '' }
  const [form, setForm] = useState(blank)

  const { data: vendors = [], isLoading } = useQuery<(Vendor & { contactName?: string; contactEmail?: string; amount?: number; notes?: string })[]>({
    queryKey: ['vendors', weddingId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/vendors`)
      if (!res.ok) throw new Error()
      return res.json()
    },
    staleTime: 30_000,
  })

  const { data: assignments = [], isLoading: loadingAssign } = useQuery<{ vendorId: string }[]>({
    queryKey: ['vendor-assignments', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/vendors/assignments?eventId=${eventId}`)
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 30_000,
  })

  const assignedIds = new Set(assignments.map((a: { vendorId: string }) => a.vendorId))

  const openEdit = (v: Vendor & { contactName?: string; contactEmail?: string; amount?: number; notes?: string }) => {
    setEditing(v)
    setForm({ name: v.name, category: v.category, status: v.status, contactName: v.contactName ?? '', contactPhone: v.contactPhone ?? '', contactEmail: v.contactEmail ?? '', amount: v.amount ? String(v.amount) : '', notes: v.notes ?? '' })
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    const payload = { name: form.name, category: form.category, status: form.status, contactName: form.contactName || null, contactPhone: form.contactPhone || null, contactEmail: form.contactEmail || null, amount: form.amount ? parseFloat(form.amount) : null, notes: form.notes || null }
    try {
      if (editing) {
        const res = await fetch(`/api/weddings/${weddingId}/vendors/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error()
        toast('Vendor updated', 'success')
      } else {
        const res = await fetch(`/api/weddings/${weddingId}/vendors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, weddingId }) })
        if (!res.ok) throw new Error()
        const newVendor = await res.json() as Vendor
        // Auto-assign to this event
        await fetch(`/api/weddings/${weddingId}/vendors/${newVendor.id}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId }) })
        await qc.invalidateQueries({ queryKey: ['vendor-assignments', weddingId, eventId] })
        toast('Vendor added and assigned to event', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['vendors', weddingId] })
      setShowAdd(false); setEditing(null); setForm(blank)
    } catch { toast('Failed to save vendor', 'error') } finally { setSaving(false) }
  }

  const deleteVendor = async (id: string) => {
    setDeleteId(null)
    await fetch(`/api/weddings/${weddingId}/vendors/${id}`, { method: 'DELETE' })
    await qc.invalidateQueries({ queryKey: ['vendors', weddingId] })
    await qc.invalidateQueries({ queryKey: ['vendor-assignments', weddingId, eventId] })
    toast('Vendor deleted', 'success')
  }

  const assign = async (vendorId: string) => {
    await fetch(`/api/weddings/${weddingId}/vendors/${vendorId}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId }) })
    await qc.invalidateQueries({ queryKey: ['vendor-assignments', weddingId, eventId] })
    toast('Vendor assigned', 'success')
  }

  const unassign = async (vendorId: string) => {
    await fetch(`/api/weddings/${weddingId}/vendors/${vendorId}/events`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId }) })
    await qc.invalidateQueries({ queryKey: ['vendor-assignments', weddingId, eventId] })
    toast('Vendor removed from event', 'success')
  }

  const VendorForm = () => (
    <Modal onClose={() => { setShowAdd(false); setEditing(null) }} title={editing ? 'Edit vendor' : 'Add vendor'}>
      <form onSubmit={submit} className="space-y-4">
        <div><Label htmlFor="vd-name">Vendor name *</Label>
          <Input id="vd-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Savanna Caterers" required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="vd-cat">Category</Label>
            <Select id="vd-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {VENDOR_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </Select></div>
          <div><Label htmlFor="vd-status">Status</Label>
            <Select id="vd-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {VENDOR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="vd-cname">Contact name</Label>
            <Input id="vd-cname" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Jane Doe" /></div>
          <div><Label htmlFor="vd-phone">Phone</Label>
            <Input id="vd-phone" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="0712345678" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="vd-email">Email</Label>
            <Input id="vd-email" type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="vendor@email.com" /></div>
          <div><Label htmlFor="vd-amount">Amount (KES)</Label>
            <Input id="vd-amount" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="50000" min="0" /></div>
        </div>
        <div><Label htmlFor="vd-notes">Notes</Label>
          <Input id="vd-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Package details, terms..." /></div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setEditing(null) }} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )

  if (isLoading || loadingAssign) return <div className="flex justify-center py-12"><Spinner /></div>

  const assigned = vendors.filter(v => assignedIds.has(v.id))
  const unassigned = vendors.filter(v => !assignedIds.has(v.id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''} · {assigned.length} assigned</p>
        <Button size="sm" onClick={() => { setForm(blank); setShowAdd(true) }}><Plus size={13} /> Add vendor</Button>
      </div>

      {vendors.length === 0
        ? <EmptyState icon={<ShoppingBag size={32} className="text-zinc-200" />} title="No vendors yet" description="Add vendors and assign them to this event" />
        : <>
            {assigned.length > 0 && (
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Assigned to this event</p>
                <div className="space-y-2">
                  {assigned.map(v => (
                    <div key={v.id} className="flex items-center gap-3 py-3 px-4 border border-violet-100 bg-violet-50/40 rounded-xl group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#14161C]">{v.name}</p>
                        <p className="text-xs text-zinc-400">{v.category.replace(/_/g, ' ')}{v.contactPhone ? ` · ${v.contactPhone}` : ''}</p>
                      </div>
                      <Badge variant={v.status === 'CONFIRMED' ? 'confirmed' : v.status === 'CANCELLED' ? 'declined' : 'pending'}>{v.status}</Badge>
                      <button onClick={() => openEdit(v)} className="p-1 text-zinc-300 hover:text-violet-500 opacity-0 group-hover:opacity-100 transition-all" aria-label="Edit"><Pencil size={13} /></button>
                      <button onClick={() => unassign(v.id)} className="p-1 text-zinc-300 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-all" aria-label="Remove from event" title="Remove from event"><Trash2 size={13} /></button>
                      <button onClick={() => setDeleteId(v.id)} className="p-1 text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" aria-label="Delete vendor permanently" title="Delete vendor permanently"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {unassigned.length > 0 && (
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Other vendors</p>
                <div className="space-y-2">
                  {unassigned.map(v => (
                    <div key={v.id} className="flex items-center gap-3 py-3 px-4 border border-zinc-100 rounded-xl group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#14161C]">{v.name}</p>
                        <p className="text-xs text-zinc-400">{v.category.replace(/_/g, ' ')}{v.contactPhone ? ` · ${v.contactPhone}` : ''}</p>
                      </div>
                      <Badge variant={v.status === 'CONFIRMED' ? 'confirmed' : v.status === 'CANCELLED' ? 'declined' : 'pending'}>{v.status}</Badge>
                      <button onClick={() => openEdit(v)} className="p-1 text-zinc-300 hover:text-violet-500 opacity-0 group-hover:opacity-100 transition-all" aria-label="Edit"><Pencil size={13} /></button>
                      <button onClick={() => assign(v.id)} className="p-1 text-zinc-300 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" aria-label="Assign to event" title="Assign to this event"><Plus size={13} /></button>
                      <button onClick={() => setDeleteId(v.id)} className="p-1 text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" aria-label="Delete vendor permanently"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>}

      {(showAdd || editing) && <VendorForm />}
      {deleteId && <ConfirmDelete label="vendor" onConfirm={() => deleteVendor(deleteId)} onCancel={() => setDeleteId(null)} />}
    </div>
  )
}

// ─── Schedule Tab (mirrors day-of/day-of-client.tsx EventScheduleTab) ────────

const SEV_COLOR: Record<string, string> = {
  CRITICAL: 'border-l-4 border-red-400 bg-red-50/50',
  HIGH: 'border-l-4 border-amber-400 bg-amber-50/50',
  MEDIUM: 'border-l-4 border-sky-400 bg-sky-50/50',
  LOW: 'border-l-4 border-zinc-300',
}
const MULTI_DAY_TYPES = new Set(['HONEYMOON', 'MOVING', 'POST_WEDDING'])

type EditForm = { title: string; description: string; startTime: string; endTime: string; duration: string; assignedTo: string }
const EMPTY_FORM: EditForm = { title: '', description: '', startTime: '', endTime: '', duration: '', assignedTo: '' }

function parseTime(t: string): number { const [h, m] = t.split(':').map(Number); return h * 60 + m }
function formatTime(mins: number): string { const h = Math.floor(mins / 60) % 24; const m = mins % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
function fmtDisplay(t?: string | null) { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` }

function ProgramRow({ item, idx }: Readonly<{ item: ProgramItem; idx: number }>) {
  return (
    <div className="flex gap-4 py-3 border-b border-zinc-100 last:border-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center text-xs font-bold text-violet-600">{idx + 1}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-[#14161C]">{item.title}</p>
          {item.startTime && <span className="text-xs font-semibold text-violet-600 bg-violet-50 rounded-full px-2 py-0.5">{fmtDisplay(item.startTime)}</span>}
          {item.duration != null && <span className="text-xs text-zinc-400">{item.duration}min</span>}
        </div>
        {item.description && <p className="text-xs text-zinc-400 mt-0.5">{item.description}</p>}
        {item.assignedTo && <p className="text-xs text-violet-500 mt-0.5">→ {item.assignedTo}</p>}
      </div>
    </div>
  )
}

function ScheduleTab({ weddingId, eventId, eventType, eventDate }: Readonly<{
  weddingId: string; eventId: string; eventType: string; eventDate: string
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const isMultiDay = MULTI_DAY_TYPES.has(eventType)
  const [viewMode, setViewMode] = useState<'day' | 'week'>(isMultiDay ? 'week' : 'day')
  const [subTab, setSubTab] = useState<'program' | 'contacts' | 'incidents'>('program')
  const [showIncident, setShowIncident] = useState(false)
  const [incidentForm, setIncidentForm] = useState({ description: '', severity: 'MEDIUM' })
  const [savingIncident, setSavingIncident] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EditForm>(EMPTY_FORM)
  const dragIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  const { data: items = [], isLoading: programLoading } = useQuery<ProgramItem[]>({
    queryKey: ['program', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/program`)
      if (!res.ok) throw new Error('Failed to load program')
      return res.json()
    },
    staleTime: 30_000,
  })

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<{ id: string; name: string; category: string; contactPhone?: string }[]>({
    queryKey: ['vendors-confirmed', weddingId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/vendors`)
      if (!res.ok) throw new Error()
      const all = await res.json() as { id: string; name: string; category: string; status: string; contactPhone?: string }[]
      return all.filter(v => v.status === 'CONFIRMED' || v.status === 'BOOKED')
    },
    staleTime: 60_000,
  })

  const { data: incidents = [], isLoading: incidentsLoading } = useQuery<{ id: string; description: string; severity: string; reportedAt: string; resolvedAt?: string | null; resolution?: string | null }[]>({
    queryKey: ['incidents', weddingId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/incidents`)
      if (!res.ok) throw new Error()
      return res.json()
    },
    staleTime: 15_000,
  })

  const evIncidents = incidents.filter(i => (i as { eventId?: string }).eventId === eventId || !('eventId' in i))
  const activeIncidents = incidents.filter(i => !i.resolvedAt)

  const setF = (k: keyof EditForm, v: string) => setForm(f => {
    const next = { ...f, [k]: v }
    if (k === 'endTime' && v) next.duration = ''
    if (k === 'duration' && v) next.endTime = ''
    return next
  })

  const buildPayload = (f: EditForm) => ({
    title: f.title.trim(), description: f.description || undefined,
    startTime: f.startTime || undefined, endTime: f.endTime || undefined,
    duration: f.duration ? Number.parseInt(f.duration) : undefined,
    assignedTo: f.assignedTo || undefined,
  })

  const addItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!form.title.trim()) return; setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/program`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...buildPayload(form), order: items.length }) })
      if (!res.ok) throw new Error()
      await qc.invalidateQueries({ queryKey: ['program', eventId] })
      setShowAdd(false); setForm(EMPTY_FORM); toast('Activity added', 'success')
    } catch { toast('Failed to add', 'error') } finally { setSaving(false) }
  }

  const saveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!editId) return; setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/program/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload(form)) })
      if (!res.ok) throw new Error()
      await qc.invalidateQueries({ queryKey: ['program', eventId] })
      setEditId(null); setForm(EMPTY_FORM); toast('Activity updated', 'success')
    } catch { toast('Failed to update', 'error') } finally { setSaving(false) }
  }

  const deleteItem = async (id: string) => {
    await fetch(`/api/weddings/${weddingId}/events/${eventId}/program/${id}`, { method: 'DELETE' })
    await qc.invalidateQueries({ queryKey: ['program', eventId] })
    toast('Activity deleted', 'success')
  }

  const onDragEnd = async () => {
    const from = dragIdx.current; const to = dragOverIdx.current
    dragIdx.current = null; dragOverIdx.current = null
    if (from === null || to === null || from === to) return
    const reordered = [...items]; const [moved] = reordered.splice(from, 1); reordered.splice(to, 0, moved)
    qc.setQueryData(['program', eventId], reordered)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/program`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reordered.map(i => ({ id: i.id }))) })
      if (!res.ok) throw new Error()
      await qc.invalidateQueries({ queryKey: ['program', eventId] })
    } catch { toast('Failed to reorder', 'error'); await qc.invalidateQueries({ queryKey: ['program', eventId] }) }
  }

  const logIncident = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSavingIncident(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/incidents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...incidentForm, eventId }) })
      if (!res.ok) throw new Error()
      await qc.invalidateQueries({ queryKey: ['incidents', weddingId] })
      toast('Incident logged', 'success'); setShowIncident(false); setIncidentForm({ description: '', severity: 'MEDIUM' })
    } catch { toast('Failed to log incident', 'error') } finally { setSavingIncident(false) }
  }

  const hasDatedItems = items.some(i => (i as { date?: string }).date)
  const canToggleView = isMultiDay || hasDatedItems

  const preview = form.startTime ? (() => {
    if (form.startTime && form.duration) return { startTime: form.startTime, endTime: formatTime(parseTime(form.startTime) + Number.parseInt(form.duration)), duration: Number.parseInt(form.duration) }
    if (form.startTime && form.endTime) { const d = parseTime(form.endTime) - parseTime(form.startTime); return { startTime: form.startTime, endTime: form.endTime, duration: d > 0 ? d : undefined } }
    return { startTime: form.startTime }
  })() : null

  const closeForm = () => { setShowAdd(false); setEditId(null); setForm(EMPTY_FORM) }

  const ProgramForm = ({ onSubmit, title }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; title: string }) => (
    <Modal onClose={closeForm} title={title}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div><Label htmlFor="pi-title">Activity *</Label>
          <Input id="pi-title" value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Bride entrance" required /></div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Timing</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="pi-start">From</Label>
              <Input id="pi-start" type="time" value={form.startTime} onChange={e => setF('startTime', e.target.value)} /></div>
            <div><Label htmlFor="pi-end">To {form.duration ? <span className="text-zinc-300 font-normal">(auto)</span> : ''}</Label>
              <Input id="pi-end" type="time" value={form.endTime} onChange={e => setF('endTime', e.target.value)} disabled={!!form.duration} /></div>
          </div>
          <div><Label htmlFor="pi-dur">Duration (min) {form.endTime ? <span className="text-zinc-300 font-normal">(auto)</span> : ''}</Label>
            <Input id="pi-dur" type="number" value={form.duration} onChange={e => setF('duration', e.target.value)} placeholder={form.endTime ? 'auto' : '15'} min="1" disabled={!!form.endTime} /></div>
          {preview?.startTime && (
            <p className="text-xs text-violet-600 font-medium">
              {preview.endTime ? `${fmtDisplay(preview.startTime)} → ${fmtDisplay(preview.endTime)} · ${preview.duration}min` : `Starts ${fmtDisplay(preview.startTime)}`}
            </p>
          )}
        </div>
        <div><Label htmlFor="pi-assign">Assigned to</Label>
          <Input id="pi-assign" value={form.assignedTo} onChange={e => setF('assignedTo', e.target.value)} placeholder="MC, Coordinator..." /></div>
        <div><Label htmlFor="pi-desc">Notes</Label>
          <Input id="pi-desc" value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Additional details" /></div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={closeForm} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )

  return (
    <div className="space-y-6">
      {/* Sub-tab bar + controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          {(['program', 'contacts', 'incidents'] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${subTab === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'incidents' && activeIncidents.length > 0 && (
                <span className="ml-1.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full px-1.5 py-0.5">{activeIncidents.length}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {subTab === 'program' && canToggleView && (
            <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
              <button onClick={() => setViewMode('day')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'day' ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                <List size={12} /> Day
              </button>
              <button onClick={() => setViewMode('week')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'week' ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                <Clock size={12} /> Week
              </button>
            </div>
          )}
          {subTab === 'program' && (
            <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setShowAdd(true) }}><Plus size={13} /> Add activity</Button>
          )}
          <Button size="sm" variant="danger" onClick={() => setShowIncident(true)}>
            <AlertTriangle size={13} /> Log incident
          </Button>
        </div>
      </div>

      {/* Program sub-tab */}
      {subTab === 'program' && (
        programLoading
          ? <div className="flex justify-center py-12"><Spinner /></div>
          : items.length === 0
            ? <EmptyState icon={<Clock size={32} className="text-zinc-200" />} title="No program yet" description="Add activities to build the run-of-show for this event" />
            : <div className="space-y-1">
                {items.map((item, idx) => (
                  <div key={item.id} draggable
                    onDragStart={() => { dragIdx.current = idx }}
                    onDragEnter={() => { dragOverIdx.current = idx }}
                    onDragEnd={onDragEnd}
                    onDragOver={e => e.preventDefault()}
                    className="flex items-start gap-3 py-3 px-2 border border-transparent hover:border-zinc-100 hover:bg-zinc-50 rounded-xl transition-colors group cursor-default">
                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing">
                      <GripVertical size={14} className="text-zinc-300 group-hover:text-zinc-400" />
                      <span className="text-xs font-bold text-zinc-300 w-4 text-center">{idx + 1}</span>
                    </div>
                    <div className="flex-shrink-0 w-24 text-right mt-0.5">
                      {item.startTime && <p className="text-xs font-semibold text-violet-600">{fmtDisplay(item.startTime)}</p>}
                      {item.endTime && <p className="text-xs text-zinc-400">{fmtDisplay(item.endTime)}</p>}
                      {item.duration != null && <p className="text-[10px] text-zinc-300 mt-0.5">{item.duration}min</p>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#14161C]">{item.title}</p>
                      {item.description && <p className="text-xs text-zinc-400 mt-0.5">{item.description}</p>}
                      {item.assignedTo && <p className="text-xs text-violet-500 mt-0.5">→ {item.assignedTo}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => { setEditId(item.id); setForm({ title: item.title, description: item.description ?? '', startTime: item.startTime ?? '', endTime: item.endTime ?? '', duration: item.duration != null ? String(item.duration) : '', assignedTo: item.assignedTo ?? '' }) }} className="p-1 text-zinc-300 hover:text-violet-500" aria-label="Edit"><Pencil size={13} /></button>
                      <button onClick={() => deleteItem(item.id)} className="p-1 text-zinc-300 hover:text-red-400" aria-label="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
      )}

      {/* Contacts sub-tab */}
      {subTab === 'contacts' && (
        vendorsLoading
          ? <div className="flex justify-center py-12"><Spinner /></div>
          : vendors.length === 0
            ? <EmptyState icon={<Phone size={32} className="text-zinc-200" />} title="No confirmed vendors" description="Confirmed and booked vendors appear here" />
            : <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
                {vendors.map(v => (
                  <div key={v.id} className="flex items-center gap-4 py-4 px-6 border-b border-zinc-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#14161C]">{v.name}</p>
                      <p className="text-xs text-zinc-400">{v.category.replaceAll('_', ' ')}</p>
                    </div>
                    {v.contactPhone && (
                      <a href={`tel:${v.contactPhone}`} className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-800 transition-colors flex-shrink-0">
                        <Phone size={13} /> {v.contactPhone}
                      </a>
                    )}
                  </div>
                ))}
              </div>
      )}

      {/* Incidents sub-tab */}
      {subTab === 'incidents' && (
        incidentsLoading
          ? <div className="flex justify-center py-12"><Spinner /></div>
          : evIncidents.length === 0
            ? <EmptyState icon={<AlertTriangle size={32} className="text-zinc-200" />} title="No incidents" description="Log any issues that arise during this event" />
            : <div className="space-y-3">
                {evIncidents.map(inc => (
                  <div key={inc.id} className={`rounded-xl p-4 ${SEV_COLOR[inc.severity] ?? 'border-l-4 border-zinc-300'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-zinc-500 uppercase">{inc.severity}</span>
                      <span className="text-xs text-zinc-400">{format(new Date(inc.reportedAt), 'h:mm a')}</span>
                      {inc.resolvedAt && <span className="text-xs text-emerald-500 font-semibold">✓ Resolved</span>}
                    </div>
                    <p className="text-sm text-zinc-700">{inc.description}</p>
                    {inc.resolution && <p className="text-xs text-zinc-500 mt-1 italic">{inc.resolution}</p>}
                  </div>
                ))}
              </div>
      )}

      {/* Add/Edit program item modal */}
      {showAdd && <ProgramForm onSubmit={addItem} title="Add activity" />}
      {editId && <ProgramForm onSubmit={saveEdit} title="Edit activity" />}

      {/* Log incident modal */}
      {showIncident && (
        <Modal onClose={() => setShowIncident(false)} title="Log incident">
          <form onSubmit={logIncident} className="space-y-4">
            <div><Label htmlFor="inc-desc">Description *</Label>
              <Input id="inc-desc" value={incidentForm.description} onChange={e => setIncidentForm(f => ({ ...f, description: e.target.value }))} placeholder="What happened?" required /></div>
            <div><Label htmlFor="inc-sev">Severity</Label>
              <Select id="inc-sev" value={incidentForm.severity} onChange={e => setIncidentForm(f => ({ ...f, severity: e.target.value }))}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </Select></div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowIncident(false)} className="flex-1">Cancel</Button>
              <Button type="submit" variant="danger" className="flex-1" disabled={savingIncident}>{savingIncident ? 'Logging…' : 'Log incident'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── Root Component ───────────────────────────────────────────────────────────

export function EventDetailClient({ weddingId, event, guestAttendances }: Readonly<Props>) {
  const [tab, setTab] = useState<Tab>('tasks')

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'tasks', label: 'Tasks', icon: CheckSquare },
    { key: 'budget', label: 'Budget', icon: DollarSign },
    { key: 'guests', label: 'Guests', icon: Users, count: guestAttendances.length },
    { key: 'appointments', label: 'Appointments', icon: Sparkles },
    { key: 'payments', label: 'Payments', icon: CreditCard },
    { key: 'contributions', label: 'Contributions', icon: Users },
    { key: 'logistics', label: 'Logistics', icon: Truck },
    { key: 'vision', label: 'Vision', icon: ImageIcon },
    { key: 'gifts', label: 'Gifts', icon: Gift },
    { key: 'vendors', label: 'Vendors', icon: ShoppingBag },
    { key: 'schedule', label: 'Schedule', icon: Clock },
  ]

  return (
    <div className="min-h-full">
      <div className="px-8 pt-8 pb-6 border-b border-zinc-100 bg-white">
        <div className="max-w-5xl mx-auto">
          <a href={`/dashboard/${weddingId}/events`} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors mb-4">
            <ArrowLeft size={12} /> All events
          </a>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${TYPE_COLOR[event.type] ?? 'bg-zinc-100 text-zinc-600'}`}>{event.type.replaceAll('_', ' ')}</span>
                {event.isMain && <span className="text-[10px] font-bold bg-violet-100 text-violet-600 rounded-full px-2 py-0.5">Main</span>}
              </div>
              <h1 className="text-3xl font-extrabold text-[#14161C] tracking-tight">{event.name}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <p className="text-sm text-zinc-400">{format(new Date(event.date), 'EEEE, d MMMM yyyy')}</p>
                {(event.startTime || event.endTime) && (
                  <p className="text-sm text-zinc-400 flex items-center gap-1"><Clock size={12} /> {event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</p>
                )}
                {event.venue && <p className="text-sm text-zinc-400 flex items-center gap-1"><MapPin size={12} /> {event.venue}</p>}
              </div>
              {event.description && <p className="text-sm text-zinc-500 mt-2">{event.description}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-100 bg-white">
        <div className="max-w-5xl mx-auto px-8">
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {tabs.map(({ key, label, icon: Icon, count }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === key ? 'border-violet-500 text-violet-700' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
                <Icon size={14} />
                {label}
                {count !== undefined && count > 0 && <span className="text-[10px] font-bold bg-zinc-100 text-zinc-500 rounded-full px-1.5 py-0.5 leading-none">{count}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8">
        {tab === 'tasks' && <TasksTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'budget' && <BudgetTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'guests' && <GuestsTab attendances={guestAttendances} />}
        {tab === 'appointments' && <AppointmentsTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'payments' && <PaymentsTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'contributions' && <ContributionsTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'logistics' && <LogisticsTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'vision' && <VisionTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'gifts' && <GiftsTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'vendors' && <VendorsTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'schedule' && <ScheduleTab weddingId={weddingId} eventId={event.id} eventType={event.type} eventDate={event.date} />}
      </div>
    </div>
  )
}
