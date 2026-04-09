'use client'
import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { MapPin, Clock, Plus, Trash2, GripVertical, CheckSquare, DollarSign, Users, List, ArrowLeft, CreditCard, Sparkles, Truck, Hotel, Gift, Image as ImageIcon, ShoppingBag, Zap, Upload } from 'lucide-react'
import { Button, Input, Select, Label, Badge, Modal, Spinner, ProgressBar, EmptyState } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { weddingDB } from '@/lib/db/dexie'
import { useBudgetLines } from '@/hooks/use-data'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventTask {
  id: string; title: string; description?: string; category?: string
  dueDate?: string; assignedToName?: string
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

interface Props {
  weddingId: string
  event: {
    id: string; name: string; type: string; date: string
    venue?: string; description?: string; startTime?: string; endTime?: string; isMain: boolean
  }
  tasks: EventTask[]
  guestAttendances: GuestAttendance[]
  programItems: ProgramItem[]
}

type Tab = 'tasks' | 'budget' | 'guests' | 'appointments' | 'payments' | 'contributions' | 'logistics' | 'vision' | 'gifts' | 'vendors' | 'schedule'

const TASK_CATEGORIES = ['CATERING','MEDIA','TRANSPORT','DECOR','CEREMONY','RECEPTION','ATTIRE','LEGAL','LOGISTICS','OTHER']
const BUDGET_CATEGORIES = ['VENUE','CATERING','PHOTOGRAPHY','VIDEOGRAPHY','DECOR','FLOWERS','MUSIC','TRANSPORT','ATTIRE','CAKE','INVITATIONS','ACCOMMODATION','MISCELLANEOUS']
const PRIORITY_LABEL: Record<number, string> = { 1: 'High', 2: 'Medium', 3: 'Low' }
const PRIORITY_COLOR: Record<number, string> = { 1: 'text-red-500', 2: 'text-amber-500', 3: 'text-sky-500' }
const RSVP_BADGE: Record<string, 'confirmed' | 'declined' | 'pending' | 'maybe'> = {
  CONFIRMED: 'confirmed', DECLINED: 'declined', PENDING: 'pending', MAYBE: 'maybe', WAITLISTED: 'pending',
}

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

// ─── Task list ────────────────────────────────────────────────────────────────

function TasksTab({ weddingId, eventId, initialTasks }: Readonly<{ weddingId: string; eventId: string; initialTasks: EventTask[] }>) {
  const { toast } = useToast()
  const [tasks, setTasks] = useState(initialTasks)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'CEREMONY', priority: '2', assignedToName: '', dueDate: '', isFinalCheck: false })

  const toggle = async (task: EventTask) => {
    const updated = { ...task, isChecked: !task.isChecked }
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    await fetch(`/api/weddings/${weddingId}/checklist/${task.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isChecked: updated.isChecked }),
    })
  }

  const addTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/checklist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId, eventId, title: form.title.trim(),
          description: form.description || undefined,
          category: form.category, priority: parseInt(form.priority),
          assignedToName: form.assignedToName || undefined,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
          isFinalCheck: form.isFinalCheck, order: tasks.length, isChecked: false,
        }),
      })
      if (!res.ok) throw new Error()
      const newTask = await res.json() as EventTask
      setTasks(prev => [...prev, newTask])
      setShowAdd(false)
      setForm({ title: '', description: '', category: 'CEREMONY', priority: '2', assignedToName: '', dueDate: '', isFinalCheck: false })
      toast('Task added', 'success')
    } catch {
      toast('Failed to add task', 'error')
    } finally {
      setSaving(false)
    }
  }

  const done = tasks.filter(t => t.isChecked).length
  const finalChecks = tasks.filter(t => t.isFinalCheck)
  const finalChecksDone = finalChecks.filter(t => t.isChecked).length
  const regular = tasks.filter(t => !t.isFinalCheck)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">{done}/{tasks.length} completed</p>
          {tasks.length > 0 && <ProgressBar value={done} max={tasks.length} />}
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={13} /> Add task</Button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare size={32} className="text-zinc-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-400">No tasks yet</p>
          <p className="text-xs text-zinc-400 mt-1">Add tasks to coordinate this event</p>
        </div>
      ) : (
        <div className="space-y-1">
          {regular.map(task => (
            <div key={task.id} className={`flex items-start gap-3 py-3 border-b border-zinc-100 last:border-0 ${task.isChecked ? 'opacity-50' : ''}`}>
              <button
                onClick={() => toggle(task)}
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${task.isChecked ? 'bg-violet-500 border-violet-500' : 'border-zinc-300 hover:border-violet-400'}`}
                aria-label={task.isChecked ? 'Mark incomplete' : 'Mark complete'}
              >
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
            </div>
          ))}

          {finalChecks.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Final checks</p>
                <span className="text-xs text-zinc-400">{finalChecksDone}/{finalChecks.length}</span>
              </div>
              {finalChecks.map(task => (
                <div key={task.id} className={`flex items-start gap-3 py-3 border-l-2 border-red-300 pl-3 mb-1 ${task.isChecked ? 'opacity-50' : ''}`}>
                  <button
                    onClick={() => toggle(task)}
                    className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${task.isChecked ? 'bg-red-400 border-red-400' : 'border-red-300 hover:border-red-400'}`}
                    aria-label={task.isChecked ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {task.isChecked && <svg viewBox="0 0 12 10" className="w-3 h-3"><path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                  <p className={`text-sm font-semibold ${task.isChecked ? 'line-through text-zinc-400' : 'text-[#14161C]'}`}>{task.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <Modal onClose={() => setShowAdd(false)} title="Add task">
          <form onSubmit={addTask} className="space-y-4">
            <div>
              <Label htmlFor="t-title">Task *</Label>
              <Input id="t-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Confirm caterer menu" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t-cat">Category</Label>
                <Select id="t-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="t-pri">Priority</Label>
                <Select id="t-pri" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="1">High</option>
                  <option value="2">Medium</option>
                  <option value="3">Low</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t-assign">Assigned to</Label>
                <Input id="t-assign" value={form.assignedToName} onChange={e => setForm(f => ({ ...f, assignedToName: e.target.value }))} placeholder="e.g. Coordinator" />
              </div>
              <div>
                <Label htmlFor="t-due">Due date</Label>
                <Input id="t-due" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="t-desc">Notes</Label>
              <Input id="t-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional details" />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
              <input type="checkbox" checked={form.isFinalCheck} onChange={e => setForm(f => ({ ...f, isFinalCheck: e.target.checked }))} className="rounded" />
              Mark as final check
            </label>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Adding…' : 'Add task'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── Budget tab ───────────────────────────────────────────────────────────────

function RecordPaymentModal({ weddingId, line, onClose }: Readonly<{
  weddingId: string
  line: { id: string; description: string; estimated: number; actual: number; committed: number; vendorId?: string; vendorName?: string }
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
      await fetch(`/api/weddings/${weddingId}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount, description: form.description || null,
          payerName: form.payerName || null, mpesaRef: form.mpesaRef || null,
          vendorId: line.vendorId || null, status: 'COMPLETED',
        }),
      })
      await fetch(`/api/weddings/${weddingId}/budget/${line.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual: line.actual + amount }),
      })
      await weddingDB.budgetLines.update(line.id, { actual: line.actual + amount, isDirty: false, updatedAt: Date.now() })
      qc.invalidateQueries({ queryKey: ['budget', weddingId] })
      qc.invalidateQueries({ queryKey: ['payments', weddingId] })
      toast('Payment recorded and budget updated', 'success')
      onClose()
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
        <div><Label htmlFor="rp-amount">Amount paid (KES) *</Label>
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

function BudgetTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { data: allLines = [], isLoading } = useBudgetLines(weddingId)
  const lines = allLines.filter(l => l.eventId === eventId)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [payingLine, setPayingLine] = useState<typeof lines[0] | null>(null)
  const [form, setForm] = useState({ category: 'CATERING', description: '', estimated: '', committed: '', actual: '' })

  const totalEst = lines.reduce((s, l) => s + l.estimated, 0)
  const totalComm = lines.reduce((s, l) => s + l.committed + l.actual, 0)
  const variance = totalEst - totalComm

  const addLine = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/budget`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId, eventId, category: form.category, description: form.description,
          estimated: parseFloat(form.estimated) || 0,
          committed: parseFloat(form.committed) || 0,
          actual: parseFloat(form.actual) || 0,
        }),
      })
      if (!res.ok) throw new Error()
      const newLine = await res.json() as { id: string; category: string; description: string; estimated: number; actual: number; committed: number }
      await weddingDB.budgetLines.put({
        id: newLine.id, serverId: newLine.id, weddingId, eventId,
        category: newLine.category, description: newLine.description,
        estimated: newLine.estimated, actual: newLine.actual, committed: newLine.committed,
        version: 1, checksum: '', isDirty: false, updatedAt: Date.now(),
      })
      await qc.invalidateQueries({ queryKey: ['budget', weddingId] })
      setShowAdd(false)
      setForm({ category: 'CATERING', description: '', estimated: '', committed: '', actual: '' })
      toast('Budget line added', 'success')
    } catch { toast('Failed to add budget line', 'error') }
    finally { setSaving(false) }
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-8 divide-x divide-zinc-100">
          <div className="pr-8">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Estimated</p>
            <p className="text-2xl font-extrabold text-[#14161C]">{fmt(totalEst)}</p>
          </div>
          <div className="px-8">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Committed</p>
            <p className="text-2xl font-extrabold text-amber-500">{fmt(totalComm)}</p>
          </div>
          <div className="pl-8">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Variance</p>
            <p className={`text-2xl font-extrabold ${variance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
              {variance < 0 ? '-' : '+'}{fmt(Math.abs(variance))}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={13} /> Add line</Button>
      </div>

      {lines.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign size={32} className="text-zinc-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-400">No budget lines yet</p>
        </div>
      ) : (
        <div className="space-y-0">
          <div className="grid grid-cols-5 gap-3 pb-2 border-b border-zinc-100">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest col-span-2">Item</p>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Estimated</p>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Paid</p>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Action</p>
          </div>
          {lines.map(line => {
            const paid = line.actual
            const remaining = Math.max(0, line.estimated - paid - line.committed)
            return (
              <div key={line.id} className="grid grid-cols-5 gap-3 py-3 border-b border-zinc-100 last:border-0 items-center">
                <div className="col-span-2">
                  <p className="text-sm font-semibold text-[#14161C]">{line.description}</p>
                  <p className="text-xs text-zinc-400">{line.category}{line.vendorName ? ` · ${line.vendorName}` : ''}</p>
                </div>
                <p className="text-sm text-zinc-500 text-right">{fmt(line.estimated)}</p>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#14161C]">{fmt(paid)}</p>
                  {remaining > 0 && <p className="text-xs text-amber-500">{fmt(remaining)} left</p>}
                  {remaining === 0 && paid > 0 && <p className="text-xs text-emerald-500">Paid in full</p>}
                </div>
                <div className="text-right">
                  {remaining > 0 && (
                    <Button size="sm" variant="lavender" onClick={() => setPayingLine(line)}>
                      <CreditCard size={11} /> Pay
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <Modal onClose={() => setShowAdd(false)} title="Add budget line">
          <form onSubmit={addLine} className="space-y-4">
            <div>
              <Label htmlFor="bl-cat">Category</Label>
              <Select id="bl-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {BUDGET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="bl-desc">Description *</Label>
              <Input id="bl-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Catering deposit" required />
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
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Adding...' : 'Add line'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {payingLine && (
        <RecordPaymentModal weddingId={weddingId} line={payingLine} onClose={() => setPayingLine(null)} />
      )}
    </div>
  )
}

function GuestsTab({ attendances }: Readonly<{ attendances: GuestAttendance[] }>) {
  const confirmed = attendances.filter(a => a.rsvpStatus === 'CONFIRMED').length
  return (
    <div className="space-y-4">
      <div className="flex gap-8 divide-x divide-zinc-100">
        <div className="pr-8">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Total</p>
          <p className="text-2xl font-extrabold text-[#14161C]">{attendances.length}</p>
        </div>
        <div className="pl-8">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Confirmed</p>
          <p className="text-2xl font-extrabold text-emerald-600">{confirmed}</p>
        </div>
      </div>
      {attendances.length === 0 ? (
        <div className="text-center py-12">
          <Users size={32} className="text-zinc-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-400">No guests assigned to this event</p>
          <p className="text-xs text-zinc-400 mt-1">Guest attendance is managed from the Guests page</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          {attendances.map(a => (
            <div key={a.id} className="flex items-center gap-3 py-3 px-4 border-b border-zinc-100 last:border-0">
              <div className="w-8 h-8 rounded-full bg-[#CDB5F7]/20 flex items-center justify-center text-xs font-bold text-violet-600 flex-shrink-0">
                {a.guest.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#14161C]">{a.guest.name}</p>
                <p className="text-xs text-zinc-400">{a.guest.side}{a.guest.phone ? ' · ' + a.guest.phone : ''}</p>
              </div>
              <Badge variant={RSVP_BADGE[a.rsvpStatus] ?? 'default'}>{a.rsvpStatus}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Time helpers (client-side) ───────────────────────────────────────────────

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function formatTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
function fmtDisplay(t?: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}
function resolveClient(
  startTime?: string, endTime?: string, duration?: number,
): { startTime?: string; endTime?: string; duration?: number } {
  if (startTime && duration != null) {
    return { startTime, endTime: formatTime(parseTime(startTime) + duration), duration }
  }
  if (startTime && endTime) {
    const d = parseTime(endTime) - parseTime(startTime)
    return { startTime, endTime, duration: d > 0 ? d : undefined }
  }
  return { startTime, endTime, duration }
}

// ─── Program Tab ──────────────────────────────────────────────────────────────

type EditForm = { title: string; description: string; startTime: string; endTime: string; duration: string; assignedTo: string }
const EMPTY_FORM: EditForm = { title: '', description: '', startTime: '', endTime: '', duration: '', assignedTo: '' }

function ProgramTab({ weddingId, eventId, initialItems }: Readonly<{ weddingId: string; eventId: string; initialItems: ProgramItem[] }>) {
  const { toast } = useToast()
  const [items, setItems] = useState(initialItems)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EditForm>(EMPTY_FORM)
  const dragIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  const setF = (k: keyof EditForm, v: string) => setForm(f => {
    const next = { ...f, [k]: v }
    if (k === 'endTime' && v) next.duration = ''
    if (k === 'duration' && v) next.endTime = ''
    return next
  })

  const buildPayload = (f: EditForm) => ({
    title: f.title.trim(),
    description: f.description || undefined,
    startTime: f.startTime || undefined,
    endTime: f.endTime || undefined,
    duration: f.duration ? parseInt(f.duration) : undefined,
    assignedTo: f.assignedTo || undefined,
  })

  const addItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/program`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(form), order: items.length }),
      })
      if (!res.ok) throw new Error()
      const newItem = await res.json() as ProgramItem
      setItems(prev => [...prev, newItem])
      setShowAdd(false)
      setForm(EMPTY_FORM)
      toast('Activity added', 'success')
    } catch {
      toast('Failed to add activity', 'error')
    } finally { setSaving(false) }
  }

  const openEdit = (item: ProgramItem) => {
    setEditId(item.id)
    setForm({
      title: item.title,
      description: item.description ?? '',
      startTime: item.startTime ?? '',
      endTime: item.endTime ?? '',
      duration: item.duration != null ? String(item.duration) : '',
      assignedTo: item.assignedTo ?? '',
    })
  }

  const saveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/program/${editId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(form)),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json() as ProgramItem
      setItems(prev => prev.map(i => i.id === editId ? updated : i))
      setEditId(null)
      setForm(EMPTY_FORM)
      toast('Activity updated', 'success')
    } catch {
      toast('Failed to update activity', 'error')
    } finally { setSaving(false) }
  }

  const deleteItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/program/${id}`, { method: 'DELETE' })
    if (!res.ok) toast('Failed to delete activity', 'error')
  }

  const onDragStart = (idx: number) => { dragIdx.current = idx }
  const onDragEnter = (idx: number) => { dragOverIdx.current = idx }
  const onDragEnd = async () => {
    const from = dragIdx.current
    const to = dragOverIdx.current
    dragIdx.current = null
    dragOverIdx.current = null
    if (from === null || to === null || from === to) return
    const reordered = [...items]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    setItems(reordered)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/program`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reordered.map(i => ({ id: i.id }))),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json() as ProgramItem[]
      setItems(updated)
    } catch {
      toast('Failed to reorder', 'error')
      setItems(items)
    }
  }

  const preview = form.startTime
    ? resolveClient(form.startTime || undefined, form.endTime || undefined, form.duration ? parseInt(form.duration) : undefined)
    : null
  const calcMode = form.startTime && form.endTime ? 'from-to' : form.startTime && form.duration ? 'from-dur' : 'start-only'

  const closeForm = () => { setShowAdd(false); setEditId(null); setForm(EMPTY_FORM) }

  const ProgramForm = ({ onSubmit, title }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; title: string }) => (
    <Modal onClose={closeForm} title={title}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="pi-title">Activity *</Label>
          <Input id="pi-title" value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Bride entrance" required />
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Timing</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pi-start">From</Label>
              <Input id="pi-start" type="time" value={form.startTime} onChange={e => setF('startTime', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pi-end">To {form.duration ? <span className="text-zinc-300 font-normal">(auto)</span> : ''}</Label>
              <Input id="pi-end" type="time" value={form.endTime} onChange={e => setF('endTime', e.target.value)} disabled={!!form.duration} />
            </div>
          </div>
          <div>
            <Label htmlFor="pi-dur">Duration (min) {form.endTime ? <span className="text-zinc-300 font-normal">(auto)</span> : ''}</Label>
            <Input id="pi-dur" type="number" value={form.duration} onChange={e => setF('duration', e.target.value)}
              placeholder={form.endTime ? 'auto' : '15'} min="1" disabled={!!form.endTime} />
          </div>
          {preview?.startTime && (
            <p className="text-xs text-violet-600 font-medium">
              {(calcMode === 'from-to' || calcMode === 'from-dur') && preview.endTime
                ? `${fmtDisplay(preview.startTime)} → ${fmtDisplay(preview.endTime)} · ${preview.duration}min`
                : `Starts ${fmtDisplay(preview.startTime)}`}
            </p>
          )}
          <p className="text-[10px] text-zinc-400">Set From + To, or From + Duration — the third value is calculated automatically.</p>
        </div>
        <div>
          <Label htmlFor="pi-assign">Assigned to</Label>
          <Input id="pi-assign" value={form.assignedTo} onChange={e => setF('assignedTo', e.target.value)} placeholder="MC, Coordinator..." />
        </div>
        <div>
          <Label htmlFor="pi-desc">Notes</Label>
          <Input id="pi-desc" value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Additional details" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={closeForm} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{items.length} activit{items.length !== 1 ? 'ies' : 'y'}</p>
        <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setShowAdd(true) }}><Plus size={13} /> Add activity</Button>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-12">
          <List size={32} className="text-zinc-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-400">No program yet</p>
          <p className="text-xs text-zinc-400 mt-1">Build the order of activities for this event day</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragEnter={() => onDragEnter(idx)}
              onDragEnd={onDragEnd}
              onDragOver={e => e.preventDefault()}
              className="flex items-start gap-3 py-3 px-2 border border-transparent hover:border-zinc-100 hover:bg-zinc-50 rounded-xl transition-colors group cursor-default"
            >
              <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing">
                <GripVertical size={14} className="text-zinc-300 group-hover:text-zinc-400 transition-colors" />
                <span className="text-xs font-bold text-zinc-300 w-4 text-center">{idx + 1}</span>
              </div>
              <div className="flex-shrink-0 w-28 text-right mt-0.5">
                {item.startTime && <p className="text-xs font-semibold text-violet-600">{fmtDisplay(item.startTime)}</p>}
                {item.endTime && <p className="text-xs text-zinc-400">{fmtDisplay(item.endTime)}</p>}
                {item.duration != null && <p className="text-[10px] text-zinc-300 mt-0.5">{item.duration}min</p>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#14161C]">{item.title}</p>
                {item.description && <p className="text-xs text-zinc-400 mt-0.5">{item.description}</p>}
                {item.assignedTo && <p className="text-xs text-zinc-400 mt-0.5">→ {item.assignedTo}</p>}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => openEdit(item)} className="p-1 text-zinc-300 hover:text-violet-500 transition-colors" aria-label="Edit">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => deleteItem(item.id)} className="p-1 text-zinc-300 hover:text-red-400 transition-colors" aria-label="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd && <ProgramForm onSubmit={addItem} title="Add activity" />}
      {editId && <ProgramForm onSubmit={saveEdit} title="Edit activity" />}
    </div>
  )
}


// ─── Appointments Tab ─────────────────────────────────────────────────────────

function AppointmentsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['appointments', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/appointments?eventId=${eventId}`)
      if (!res.ok) throw new Error('Failed to fetch appointments')
      return res.json() as Promise<{ id: string; title: string; startAt: string; endAt?: string; location?: string; status: string; vendor?: { name: string } }[]>
    },
    staleTime: 30_000,
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (data.length === 0) return <EmptyState icon={<Sparkles size={32} className="text-zinc-200" />} title="No appointments" description="Appointments for this event will appear here" />

  return (
    <div className="space-y-2">
      {data.map(a => (
        <div key={a.id} className="flex items-start gap-3 py-3 px-4 border border-zinc-100 rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#14161C]">{a.title}</p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-zinc-400">{format(new Date(a.startAt), 'MMM d, yyyy')}</span>
              <span className="text-xs text-zinc-400 flex items-center gap-1"><Clock size={10} />{format(new Date(a.startAt), 'h:mm a')}</span>
              {a.location && <span className="text-xs text-zinc-400 flex items-center gap-1"><MapPin size={10} />{a.location}</span>}
              {a.vendor && <span className="text-xs text-zinc-400">{a.vendor.name}</span>}
            </div>
          </div>
          <Badge variant={a.status === 'COMPLETED' ? 'confirmed' : a.status === 'CANCELLED' ? 'declined' : 'pending'}>{a.status}</Badge>
        </div>
      ))}
    </div>
  )
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['payments-event', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/payments?eventId=${eventId}`)
      if (!res.ok) throw new Error('Failed to fetch payments')
      const all = await res.json() as { id: string; amount: number; payerName?: string; status: string; description?: string; eventId?: string }[]
      return all.filter(p => p.eventId === eventId)
    },
    staleTime: 30_000,
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (data.length === 0) return <EmptyState icon={<CreditCard size={32} className="text-zinc-200" />} title="No payments" description="Payments linked to this event will appear here" />

  const total = data.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-xs text-zinc-400">{data.length} payment{data.length !== 1 ? 's' : ''}</p>
        <span className="text-xs font-bold text-emerald-600">{fmt(total)} total</span>
      </div>
      <div className="space-y-2">
        {data.map(p => (
          <div key={p.id} className="flex items-center gap-3 py-3 px-4 border border-zinc-100 rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#14161C]">{p.description ?? 'Payment'}</p>
              {p.payerName && <p className="text-xs text-zinc-400 mt-0.5">{p.payerName}</p>}
            </div>
            <p className="text-sm font-bold text-[#14161C]">{fmt(p.amount)}</p>
            <Badge variant={p.status === 'COMPLETED' ? 'confirmed' : p.status === 'FAILED' ? 'declined' : 'pending'}>{p.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Contributions Tab ────────────────────────────────────────────────────────

function ContributionsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['contributions-event', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/contributions`)
      if (!res.ok) throw new Error('Failed to fetch contributions')
      const all = await res.json() as { id: string; memberName: string; pledgeAmount: number; paidAmount: number; eventId?: string }[]
      return all.filter(c => c.eventId === eventId)
    },
    staleTime: 30_000,
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (data.length === 0) return <EmptyState icon={<Users size={32} className="text-zinc-200" />} title="No contributions" description="Committee contributions for this event will appear here" />

  return (
    <div className="space-y-2">
      {data.map(c => {
        const pct = c.pledgeAmount > 0 ? Math.min(100, Math.round((c.paidAmount / c.pledgeAmount) * 100)) : 0
        return (
          <div key={c.id} className="py-3 px-4 border border-zinc-100 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#14161C]">{c.memberName}</p>
              <p className="text-xs text-zinc-400">{fmt(c.paidAmount)} / {fmt(c.pledgeAmount)}</p>
            </div>
            <ProgressBar value={c.paidAmount} max={c.pledgeAmount} />
            <p className="text-xs text-zinc-400">{pct}% paid</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Logistics Tab ────────────────────────────────────────────────────────────

function LogisticsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { data: routes = [], isLoading: loadingRoutes } = useQuery({
    queryKey: ['logistics-routes', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/logistics/routes`)
      if (!res.ok) throw new Error()
      const all = await res.json() as { id: string; name: string; from: string; to: string; departureTime?: string; capacity?: number; eventId?: string }[]
      return all.filter(r => r.eventId === eventId)
    },
    staleTime: 30_000,
  })
  const { data: accommodations = [], isLoading: loadingAccom } = useQuery({
    queryKey: ['logistics-accommodations', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/logistics/accommodations`)
      if (!res.ok) throw new Error()
      const all = await res.json() as { id: string; name: string; location: string; rooms?: number; checkIn?: string; checkOut?: string; eventId?: string }[]
      return all.filter(a => a.eventId === eventId)
    },
    staleTime: 30_000,
  })

  if (loadingRoutes || loadingAccom) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Truck size={12} /> Transport routes</p>
        {routes.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4 text-center">No transport routes</p>
        ) : (
          <div className="space-y-2">
            {routes.map(r => (
              <div key={r.id} className="py-3 px-4 border border-zinc-100 rounded-xl">
                <p className="text-sm font-semibold text-[#14161C]">{r.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{r.from} to {r.to}{r.departureTime ? ` · ${r.departureTime}` : ''}{r.capacity ? ` · ${r.capacity} seats` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Hotel size={12} /> Accommodation</p>
        {accommodations.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4 text-center">No accommodation blocks</p>
        ) : (
          <div className="space-y-2">
            {accommodations.map(a => (
              <div key={a.id} className="py-3 px-4 border border-zinc-100 rounded-xl">
                <p className="text-sm font-semibold text-[#14161C]">{a.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{a.location}{a.rooms ? ` · ${a.rooms} rooms` : ''}{a.checkIn ? ` · Check-in ${a.checkIn}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Vision Board Tab ─────────────────────────────────────────────────────────

function VisionTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['vision', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/media`)
      if (!res.ok) throw new Error()
      const all = await res.json() as { id: string; url: string; caption?: string; linkedToType?: string; eventId?: string }[]
      return all.filter(m => m.linkedToType === 'moodboard' && m.eventId === eventId)
    },
    staleTime: 30_000,
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: fd })
      if (!uploadRes.ok) throw new Error()
      const { url } = await uploadRes.json() as { url: string }
      await fetch(`/api/weddings/${weddingId}/media`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, linkedToType: 'moodboard', eventId }),
      })
      qc.invalidateQueries({ queryKey: ['vision', weddingId, eventId] })
      toast('Image added to vision board', 'success')
    } catch {
      toast('Upload failed', 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{images.length} image{images.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
      {images.length === 0 ? (
        <EmptyState icon={<ImageIcon size={32} className="text-zinc-200" />} title="No images yet" description="Upload inspiration images for this event" />
      ) : (
        <div className="columns-2 sm:columns-3 gap-3 space-y-3">
          {images.map(img => (
            <div key={img.id} className="break-inside-avoid rounded-xl overflow-hidden border border-zinc-100">
              <img src={img.url} alt={img.caption ?? 'Vision board image'} className="w-full object-cover" />
              {img.caption && <p className="text-xs text-zinc-400 px-2 py-1">{img.caption}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Gifts Tab ────────────────────────────────────────────────────────────────

function GiftsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const [subTab, setSubTab] = useState<'registry' | 'received'>('registry')

  const { data: registry = [], isLoading: loadingReg } = useQuery({
    queryKey: ['gifts-registry', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/gifts/registry`)
      if (!res.ok) throw new Error()
      const all = await res.json() as { id: string; name: string; price?: number; status: string; eventId?: string }[]
      return all.filter(g => g.eventId === eventId)
    },
    staleTime: 30_000,
  })

  const { data: received = [], isLoading: loadingRec } = useQuery({
    queryKey: ['gifts-received', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/gifts/received`)
      if (!res.ok) throw new Error()
      const all = await res.json() as { id: string; description: string; giverName?: string; value?: number; eventId?: string }[]
      return all.filter(g => g.eventId === eventId)
    },
    staleTime: 30_000,
  })

  const isLoading = loadingReg || loadingRec

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['registry', 'received'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${subTab === t ? 'bg-violet-100 text-violet-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
            {t === 'registry' ? 'Registry' : 'Received'}
          </button>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : subTab === 'registry' ? (
        registry.length === 0 ? (
          <EmptyState icon={<Gift size={32} className="text-zinc-200" />} title="No registry items" description="Gift registry items for this event will appear here" />
        ) : (
          <div className="space-y-2">
            {registry.map(g => (
              <div key={g.id} className="flex items-center gap-3 py-3 px-4 border border-zinc-100 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#14161C]">{g.name}</p>
                  {g.price != null && <p className="text-xs text-zinc-400">{fmt(g.price)}</p>}
                </div>
                <Badge variant={g.status === 'PURCHASED' ? 'confirmed' : 'pending'}>{g.status}</Badge>
              </div>
            ))}
          </div>
        )
      ) : (
        received.length === 0 ? (
          <EmptyState icon={<Gift size={32} className="text-zinc-200" />} title="No gifts received" description="Gifts received at this event will appear here" />
        ) : (
          <div className="space-y-2">
            {received.map(g => (
              <div key={g.id} className="flex items-center gap-3 py-3 px-4 border border-zinc-100 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#14161C]">{g.description}</p>
                  {g.giverName && <p className="text-xs text-zinc-400">From {g.giverName}</p>}
                </div>
                {g.value != null && <p className="text-sm font-bold text-[#14161C]">{fmt(g.value)}</p>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ─── Vendors Tab ──────────────────────────────────────────────────────────────

function VendorsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['vendors-event', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/vendors`)
      if (!res.ok) throw new Error()
      return res.json() as Promise<{ id: string; name: string; category: string; phone?: string; status: string; assignedEventIds?: string[] }[]>
    },
    staleTime: 30_000,
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (data.length === 0) return <EmptyState icon={<ShoppingBag size={32} className="text-zinc-200" />} title="No vendors" description="Vendors for this wedding will appear here" />

  const assigned = data.filter(v => v.assignedEventIds?.includes(eventId))
  const unassigned = data.filter(v => !v.assignedEventIds?.includes(eventId))

  return (
    <div className="space-y-4">
      {assigned.length > 0 && (
        <div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Assigned to this event</p>
          <div className="space-y-2">
            {assigned.map(v => (
              <div key={v.id} className="flex items-center gap-3 py-3 px-4 border border-violet-100 bg-violet-50/40 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#14161C]">{v.name}</p>
                  <p className="text-xs text-zinc-400">{v.category}{v.phone ? ` · ${v.phone}` : ''}</p>
                </div>
                <Badge variant={v.status === 'CONFIRMED' ? 'confirmed' : v.status === 'CANCELLED' ? 'declined' : 'pending'}>{v.status}</Badge>
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
              <div key={v.id} className="flex items-center gap-3 py-3 px-4 border border-zinc-100 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#14161C]">{v.name}</p>
                  <p className="text-xs text-zinc-400">{v.category}{v.phone ? ` · ${v.phone}` : ''}</p>
                </div>
                <Badge variant={v.status === 'CONFIRMED' ? 'confirmed' : v.status === 'CANCELLED' ? 'declined' : 'pending'}>{v.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  WEDDING: 'bg-violet-100 text-violet-700', RURACIO: 'bg-amber-100 text-amber-700',
  RECEPTION: 'bg-sky-100 text-sky-700', ENGAGEMENT: 'bg-pink-100 text-pink-700',
  HONEYMOON: 'bg-emerald-100 text-emerald-700', TRADITIONAL: 'bg-orange-100 text-orange-700',
  CIVIL: 'bg-zinc-100 text-zinc-600', AFTER_PARTY: 'bg-purple-100 text-purple-700',
}

export function EventDetailClient({ weddingId, event, tasks, guestAttendances, programItems }: Readonly<Props>) {
  const [tab, setTab] = useState<Tab>('tasks')

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'tasks', label: 'Tasks', icon: CheckSquare, count: tasks.length },
    { key: 'budget', label: 'Budget', icon: DollarSign },
    { key: 'guests', label: 'Guests', icon: Users, count: guestAttendances.length },
    { key: 'appointments', label: 'Appointments', icon: Sparkles },
    { key: 'payments', label: 'Payments', icon: CreditCard },
    { key: 'contributions', label: 'Contributions', icon: Users },
    { key: 'logistics', label: 'Logistics', icon: Truck },
    { key: 'vision', label: 'Vision', icon: ImageIcon },
    { key: 'gifts', label: 'Gifts', icon: Gift },
    { key: 'vendors', label: 'Vendors', icon: ShoppingBag },
    { key: 'schedule', label: 'Schedule', icon: Zap },
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
                <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${TYPE_COLOR[event.type] ?? 'bg-zinc-100 text-zinc-600'}`}>
                  {event.type.replaceAll('_', ' ')}
                </span>
                {event.isMain && <span className="text-[10px] font-bold bg-violet-100 text-violet-600 rounded-full px-2 py-0.5">Main</span>}
              </div>
              <h1 className="text-3xl font-extrabold text-[#14161C] tracking-tight">{event.name}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <p className="text-sm text-zinc-400">{format(new Date(event.date), 'EEEE, d MMMM yyyy')}</p>
                {(event.startTime || event.endTime) && (
                  <p className="text-sm text-zinc-400 flex items-center gap-1">
                    <Clock size={12} /> {event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}
                  </p>
                )}
                {event.venue && <p className="text-sm text-zinc-400 flex items-center gap-1"><MapPin size={12} /> {event.venue}</p>}
              </div>
              {event.description && <p className="text-sm text-zinc-500 mt-2">{event.description}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto px-8">
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {tabs.map(({ key, label, icon: Icon, count }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  tab === key ? 'border-violet-500 text-violet-700' : 'border-transparent text-zinc-500 hover:text-zinc-700'
                }`}>
                <Icon size={14} />
                {label}
                {count !== undefined && count > 0 && (
                  <span className="text-[10px] font-bold bg-zinc-100 text-zinc-500 rounded-full px-1.5 py-0.5 leading-none">{count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8">
        {tab === 'tasks' && <TasksTab weddingId={weddingId} eventId={event.id} initialTasks={tasks} />}
        {tab === 'budget' && <BudgetTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'guests' && <GuestsTab attendances={guestAttendances} />}
        {tab === 'appointments' && <AppointmentsTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'payments' && <PaymentsTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'contributions' && <ContributionsTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'logistics' && <LogisticsTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'vision' && <VisionTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'gifts' && <GiftsTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'vendors' && <VendorsTab weddingId={weddingId} eventId={event.id} />}
        {tab === 'schedule' && <ProgramTab weddingId={weddingId} eventId={event.id} initialItems={programItems} />}
      </div>
    </div>
  )
}
