'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import {
  MapPin, Clock, Plus, Trash2, CheckSquare, DollarSign, Users,
  ArrowLeft, CreditCard, Sparkles, Truck, Hotel, Gift,
  ShoppingBag, Pencil, CalendarDays, List,
} from 'lucide-react'
import { Button, Input, Select, Label, Modal, Spinner, ProgressBar, EmptyState } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

// ─── Shared feature components ────────────────────────────────────────────────
import { TaskModal } from '@/components/features/task-modals'
import { EventAppointmentsTab } from '@/components/features/appointment-modals'
import type { Appointment, Vendor as ApptVendor } from '@/components/features/appointment-modals'
import { EventContributionsTab } from '@/components/features/contribution-modals'
import { EventPaymentsTab } from '@/components/features/payment-modals'
import { usePayments } from '@/hooks/use-payments'
import { AddRouteModal, AddAccommodationModal, RouteRow, AccommodationRow, EventLogisticsTab } from '@/components/features/logistics-modals'
import type { TransportRoute, Accommodation } from '@/components/features/logistics-modals'
import { AddRegistryModal, AddReceivedGiftModal, RegistryItemRow, ReceivedGiftRow } from '@/components/features/gift-modals'
import type { GiftRegistryItem, GiftReceived } from '@/components/features/gift-modals'
import { VendorNotesLog } from '@/components/features/vendor-notes'
import { MoodboardTab } from '@/components/features/moodboard-components'
import { EventBudgetTab } from '@/components/features/budget-components'
import { EventScheduleTab } from '@/components/features/schedule-components'
import type { Incident } from '@/components/features/schedule-components'
import { EventGuestsTab } from '@/components/features/guest-components'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventTask {
  id: string; title: string; description?: string; category?: string
  dueDate?: string; assignedToName?: string; eventId?: string; deletedAt?: number | null
  isChecked: boolean; priority: number; order: number; isFinalCheck: boolean
}
interface Vendor {
  id: string; name: string; category: string; status: string; contactPhone?: string
  contactName?: string; contactEmail?: string; amount?: number; notes?: string
}

interface Props {
  weddingId: string
  event: {
    id: string; name: string; type: string; date: string
    venue?: string; description?: string; startTime?: string; endTime?: string; isMain: boolean
  }
}

type Tab = 'tasks' | 'budget' | 'guests' | 'appointments' | 'payments' | 'contributions' | 'logistics' | 'vision' | 'gifts' | 'vendors' | 'schedule'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_LABEL: Record<number, string> = { 1: 'High', 2: 'Medium', 3: 'Low' }
const PRIORITY_COLOR: Record<number, string> = { 1: 'text-red-500', 2: 'text-amber-500', 3: 'text-sky-500' }
const TYPE_COLOR: Record<string, string> = {
  WEDDING: 'bg-violet-100 text-violet-700', RURACIO: 'bg-amber-100 text-amber-700',
  RECEPTION: 'bg-sky-100 text-sky-700', ENGAGEMENT: 'bg-pink-100 text-pink-700',
  TRADITIONAL: 'bg-orange-100 text-orange-700', CIVIL: 'bg-zinc-100 text-zinc-600',
  POST_WEDDING: 'bg-emerald-100 text-emerald-700',
}
const VENDOR_CATEGORIES = ['CATERING','PHOTOGRAPHY','VIDEOGRAPHY','FLORIST','MUSIC_DJ','BAND','TRANSPORT','DECOR','CAKE','ATTIRE','VENUE','OFFICIANT','HAIR_MAKEUP','ENTERTAINMENT','SECURITY','OTHER']
const VENDOR_STATUSES = ['ENQUIRED','QUOTED','BOOKED','CONFIRMED','CANCELLED','COMPLETED']
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

  const { data: allTasks = [], isLoading } = useQuery<EventTask[]>({
    queryKey: ['checklist', weddingId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/checklist`)
      if (!res.ok) throw new Error('Failed to load checklist')
      return res.json() as Promise<EventTask[]>
    },
    staleTime: 30_000,
  })
  const tasks = allTasks.filter((t: EventTask) => t.eventId === eventId && !t.deletedAt)

  const toggle = async (task: EventTask) => {
    qc.setQueryData<EventTask[]>(['checklist', weddingId], prev =>
      prev?.map(t => t.id === task.id ? { ...t, isChecked: !t.isChecked } : t) ?? []
    )
    await fetch(`/api/weddings/${weddingId}/checklist/${task.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isChecked: !task.isChecked }),
    })
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
        <button onClick={() => setEditing(task)} className="p-1 text-zinc-300 hover:text-violet-500 transition-colors" aria-label="Edit"><Pencil size={13} /></button>
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
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={13} /> Add task</Button>
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
      {showAdd && <TaskModal weddingId={weddingId} eventId={eventId} onClose={() => { setShowAdd(false); void qc.invalidateQueries({ queryKey: ['checklist', weddingId] }) }} />}
      {editing && <TaskModal weddingId={weddingId} eventId={eventId} item={editing as Parameters<typeof TaskModal>[0]['item']} onClose={() => { setEditing(null); void qc.invalidateQueries({ queryKey: ['checklist', weddingId] }) }} />}
      {deleteId && <ConfirmDelete label="task" onConfirm={() => deleteTask(deleteId)} onCancel={() => setDeleteId(null)} />}
    </div>
  )
}

// ─── Budget Tab — uses shared EventBudgetTab ──────────────────────────────────

function BudgetTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { data: events = [] } = useQuery<{ id: string; name: string; type: string; date: string }[]>({
    queryKey: ['events', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/events`); if (!res.ok) return []; return res.json() as Promise<{ id: string; name: string; type: string; date: string }[]> },
    staleTime: 60_000,
  })
  const { data: vendors = [] } = useQuery<{ id: string; name: string; category: string }[]>({
    queryKey: ['vendors', weddingId, 'select'],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/vendors`); if (!res.ok) return []; return res.json() as Promise<{ id: string; name: string; category: string }[]> },
    staleTime: 60_000,
  })
  return <EventBudgetTab weddingId={weddingId} eventId={eventId} events={events} vendors={vendors} />
}

// ─── Guests Tab — uses shared EventGuestsTab ─────────────────────────────────

function GuestsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  return <EventGuestsTab weddingId={weddingId} eventId={eventId} />
}

// ─── Appointments Tab — uses shared EventAppointmentsTab ─────────────────────

function AppointmentsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const qc = useQueryClient()

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/appointments?eventId=${eventId}`)
      if (!res.ok) throw new Error('Failed to load appointments')
      return res.json() as Promise<Appointment[]>
    },
    staleTime: 30_000,
  })

  const { data: vendors = [] } = useQuery<ApptVendor[]>({
    queryKey: ['vendors', weddingId, 'select'],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/vendors`); if (!res.ok) return []; return res.json() as Promise<ApptVendor[]> },
    staleTime: 60_000,
  })

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['appointments', weddingId, eventId] })
    void qc.invalidateQueries({ queryKey: ['appointments', weddingId] })
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return <EventAppointmentsTab weddingId={weddingId} userId="user" eventId={eventId} vendors={vendors} appointments={appointments} onRefresh={refresh} />
}

// ─── Payments Tab — uses shared EventPaymentsTab ──────────────────────────────

function PaymentsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { data: payments = [], isLoading } = usePayments(weddingId)
  return <EventPaymentsTab weddingId={weddingId} eventId={eventId} events={[]} payments={payments} isLoading={isLoading} />
}

// ─── Contributions Tab — uses shared EventContributionsTab ───────────────────

function ContributionsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { data: events = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['events', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/events`); if (!res.ok) return []; return res.json() as Promise<{ id: string; name: string }[]> },
    staleTime: 60_000,
  })
  return <EventContributionsTab weddingId={weddingId} eventId={eventId} events={events} />
}

// ─── Logistics Tab ────────────────────────────────────────────────────────────

function LogisticsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const qc = useQueryClient()
  const [showRoute, setShowRoute] = useState(false)
  const [showAccom, setShowAccom] = useState(false)

  const { data: routes = [], isLoading: loadingRoutes } = useQuery<TransportRoute[]>({
    queryKey: ['logistics-routes', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/logistics/routes`)
      if (!res.ok) throw new Error('Failed to load routes')
      const all = await res.json() as TransportRoute[]
      return all.filter(r => r.eventId === eventId)
    },
    staleTime: 30_000,
  })

  const { data: accommodations = [], isLoading: loadingAccom } = useQuery<Accommodation[]>({
    queryKey: ['logistics-accommodations', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/logistics/accommodations`)
      if (!res.ok) throw new Error('Failed to load accommodations')
      const all = await res.json() as Accommodation[]
      return all.filter(a => a.eventId === eventId)
    },
    staleTime: 30_000,
  })

  const refreshRoutes = () => void qc.invalidateQueries({ queryKey: ['logistics-routes', weddingId, eventId] })
  const refreshAccom = () => void qc.invalidateQueries({ queryKey: ['logistics-accommodations', weddingId, eventId] })

  if (loadingRoutes || loadingAccom) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Truck size={12} /> Transport routes</p>
          <Button size="sm" variant="secondary" onClick={() => setShowRoute(true)}><Plus size={13} /> Add route</Button>
        </div>
        {routes.length === 0
          ? <p className="text-sm text-zinc-400 py-4 text-center">No transport routes for this event</p>
          : <div className="space-y-2">{routes.map(r => <RouteRow key={r.id} route={r} weddingId={weddingId} onRefresh={refreshRoutes} />)}</div>}
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Hotel size={12} /> Accommodation</p>
          <Button size="sm" variant="secondary" onClick={() => setShowAccom(true)}><Plus size={13} /> Add block</Button>
        </div>
        {accommodations.length === 0
          ? <p className="text-sm text-zinc-400 py-4 text-center">No accommodation blocks for this event</p>
          : <div className="space-y-2">{accommodations.map(a => <AccommodationRow key={a.id} accommodation={a} weddingId={weddingId} onRefresh={refreshAccom} />)}</div>}
      </div>
      {showRoute && <AddRouteModal weddingId={weddingId} eventId={eventId} onClose={() => setShowRoute(false)} onDone={refreshRoutes} />}
      {showAccom && <AddAccommodationModal weddingId={weddingId} eventId={eventId} onClose={() => setShowAccom(false)} onDone={refreshAccom} />}
    </div>
  )
}

// ─── Gifts Tab ────────────────────────────────────────────────────────────────

function GiftsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const qc = useQueryClient()
  const [showAddRegistry, setShowAddRegistry] = useState(false)
  const [showAddReceived, setShowAddReceived] = useState(false)
  const [giftView, setGiftView] = useState<'registry' | 'received'>('registry')

  const { data: registry = [], isLoading: loadingRegistry } = useQuery<GiftRegistryItem[]>({
    queryKey: ['gifts-registry', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/gifts/registry`)
      if (!res.ok) throw new Error('Failed to load registry')
      const all = await res.json() as GiftRegistryItem[]
      return all.filter(g => g.eventId === eventId)
    },
    staleTime: 30_000,
  })

  const { data: received = [], isLoading: loadingReceived } = useQuery<GiftReceived[]>({
    queryKey: ['gifts-received', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/gifts/received`)
      if (!res.ok) throw new Error('Failed to load received gifts')
      const all = await res.json() as GiftReceived[]
      return all.filter(g => g.eventId === eventId)
    },
    staleTime: 30_000,
  })

  const refreshRegistry = () => void qc.invalidateQueries({ queryKey: ['gifts-registry', weddingId, eventId] })
  const refreshReceived = () => void qc.invalidateQueries({ queryKey: ['gifts-received', weddingId, eventId] })

  const isLoading = loadingRegistry || loadingReceived

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
          <button onClick={() => setGiftView('registry')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${giftView === 'registry' ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            <ShoppingBag size={11} className="inline mr-1" />Registry ({registry.length})
          </button>
          <button onClick={() => setGiftView('received')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${giftView === 'received' ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            <Gift size={11} className="inline mr-1" />Received ({received.length})
          </button>
        </div>
        {giftView === 'registry'
          ? <Button size="sm" onClick={() => setShowAddRegistry(true)}><Plus size={13} /> Add item</Button>
          : <Button size="sm" onClick={() => setShowAddReceived(true)}><Plus size={13} /> Record gift</Button>}
      </div>

      {giftView === 'registry' && (
        registry.length === 0
          ? <EmptyState icon={<ShoppingBag size={32} className="text-zinc-200" />} title="No registry items" description="Add items guests can gift for this event" />
          : <div className="space-y-2">{registry.map(g => <RegistryItemRow key={g.id} item={g} weddingId={weddingId} onRefresh={refreshRegistry} />)}</div>
      )}

      {giftView === 'received' && (
        received.length === 0
          ? <EmptyState icon={<Gift size={32} className="text-zinc-200" />} title="No gifts recorded" description="Record gifts received at this event" />
          : <div className="space-y-2">{received.map(g => <ReceivedGiftRow key={g.id} gift={g} weddingId={weddingId} onRefresh={refreshReceived} />)}</div>
      )}

      {showAddRegistry && <AddRegistryModal weddingId={weddingId} eventId={eventId} onClose={() => setShowAddRegistry(false)} onDone={refreshRegistry} />}
      {showAddReceived && <AddReceivedGiftModal weddingId={weddingId} eventId={eventId} onClose={() => setShowAddReceived(false)} onDone={refreshReceived} />}
    </div>
  )
}

// ─── Vendors Tab ──────────────────────────────────────────────────────────────

function VendorsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const blank = { name: '', category: 'CATERING', status: 'ENQUIRED', contactName: '', contactPhone: '', contactEmail: '', amount: '', notes: '' }
  const [form, setForm] = useState(blank)

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ['vendors', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/vendors?eventId=${eventId}`)
      if (!res.ok) throw new Error('Failed to load vendors')
      return res.json() as Promise<Vendor[]>
    },
    staleTime: 30_000,
  })

  const openEdit = (v: Vendor) => {
    setEditing(v)
    setForm({ name: v.name, category: v.category, status: v.status, contactName: v.contactName ?? '', contactPhone: v.contactPhone ?? '', contactEmail: v.contactEmail ?? '', amount: v.amount ? String(v.amount) : '', notes: v.notes ?? '' })
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    const payload = { name: form.name, category: form.category, status: form.status, contactName: form.contactName || null, contactPhone: form.contactPhone || null, contactEmail: form.contactEmail || null, amount: form.amount ? Number.parseFloat(form.amount) : null, notes: form.notes || null, eventId }
    try {
      if (editing) {
        await fetch(`/api/weddings/${weddingId}/vendors/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast('Vendor updated', 'success')
      } else {
        await fetch(`/api/weddings/${weddingId}/vendors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        toast('Vendor added', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['vendors', weddingId, eventId] })
      await qc.invalidateQueries({ queryKey: ['vendors', weddingId, 'select'] })
      setShowAdd(false); setEditing(null); setForm(blank)
    } catch { toast('Failed to save vendor', 'error') } finally { setSaving(false) }
  }

  const deleteVendor = async (id: string) => {
    setDeleteId(null)
    await fetch(`/api/weddings/${weddingId}/vendors/${id}`, { method: 'DELETE' })
    await qc.invalidateQueries({ queryKey: ['vendors', weddingId, eventId] })
    await qc.invalidateQueries({ queryKey: ['vendors', weddingId, 'select'] })
    toast('Vendor removed', 'success')
  }

  const STATUS_COLOR: Record<string, string> = {
    ENQUIRED: 'bg-zinc-100 text-zinc-600', QUOTED: 'bg-sky-100 text-sky-700',
    BOOKED: 'bg-amber-100 text-amber-700', CONFIRMED: 'bg-violet-100 text-violet-700',
    CANCELLED: 'bg-red-100 text-red-600', COMPLETED: 'bg-emerald-100 text-emerald-700',
  }

  const VendorForm = () => (
    <Modal onClose={() => { setShowAdd(false); setEditing(null) }} title={editing ? 'Edit vendor' : 'Add vendor'}>
      <form onSubmit={submit} className="space-y-4">
        <div><Label htmlFor="v-name">Vendor name *</Label>
          <Input id="v-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Savanna Caterers" required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="v-cat">Category</Label>
            <Select id="v-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {VENDOR_CATEGORIES.map(c => <option key={c} value={c}>{c.replaceAll('_', ' ')}</option>)}
            </Select></div>
          <div><Label htmlFor="v-status">Status</Label>
            <Select id="v-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {VENDOR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="v-cname">Contact name</Label>
            <Input id="v-cname" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Jane Doe" /></div>
          <div><Label htmlFor="v-cphone">Contact phone</Label>
            <Input id="v-cphone" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="0712345678" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="v-email">Email</Label>
            <Input id="v-email" type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="vendor@email.com" /></div>
          <div><Label htmlFor="v-amount">Amount (KES)</Label>
            <Input id="v-amount" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" min="0" /></div>
        </div>
        <div><Label htmlFor="v-notes">Notes</Label>
          <Input id="v-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Contract details, payment terms…" /></div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setEditing(null) }} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => { setForm(blank); setShowAdd(true) }}><Plus size={13} /> Add vendor</Button>
      </div>
      {vendors.length === 0
        ? <EmptyState icon={<Users size={32} className="text-zinc-200" />} title="No vendors" description="Add vendors assigned to this event" />
        : <div className="space-y-2">
            {vendors.map(v => (
              <div key={v.id} className="border border-zinc-100 rounded-xl overflow-hidden group">
                <div className="flex items-center gap-3 py-3 px-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#14161C]">{v.name}</p>
                      <span className="text-xs text-zinc-400">{v.category.replaceAll('_', ' ')}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[v.status] ?? 'bg-zinc-100 text-zinc-600'}`}>{v.status}</span>
                    </div>
                    {v.contactPhone && <p className="text-xs text-zinc-400 mt-0.5">{v.contactPhone}</p>}
                    {v.amount && <p className="text-xs font-semibold text-violet-600 mt-0.5">{fmt(v.amount)}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setExpandedId(expandedId === v.id ? null : v.id)} className="p-1 text-zinc-300 hover:text-zinc-500 transition-colors" aria-label="Notes"><List size={13} /></button>
                    <button onClick={() => openEdit(v)} className="p-1 text-zinc-300 hover:text-violet-500 opacity-0 group-hover:opacity-100 transition-all" aria-label="Edit"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteId(v.id)} className="p-1 text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" aria-label="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
                {expandedId === v.id && (
                  <div className="border-t border-zinc-100 px-4 py-3 bg-zinc-50">
                    <VendorNotesLog vendorId={v.id} weddingId={weddingId} />
                  </div>
                )}
              </div>
            ))}
          </div>}
      {(showAdd || editing) && <VendorForm />}
      {deleteId && <ConfirmDelete label="vendor" onConfirm={() => deleteVendor(deleteId)} onCancel={() => setDeleteId(null)} />}
    </div>
  )
}

// ─── Schedule Tab — uses shared EventScheduleTab ─────────────────────────────

function ScheduleTab({ weddingId, event }: Readonly<{ weddingId: string; event: Props['event'] }>) {
  const qc = useQueryClient()

  const { data: vendors = [] } = useQuery<{ id: string; name: string; category: string; contactPhone?: string | null }[]>({
    queryKey: ['vendors-confirmed', weddingId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/vendors`)
      if (!res.ok) return []
      const all = await res.json() as { id: string; name: string; category: string; status: string; contactPhone?: string | null }[]
      return all.filter(v => v.status === 'CONFIRMED' || v.status === 'BOOKED')
    },
    staleTime: 60_000,
  })

  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ['incidents', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/incidents`); if (!res.ok) return []; return res.json() as Promise<Incident[]> },
    staleTime: 15_000,
  })

  const refresh = () => void qc.invalidateQueries({ queryKey: ['incidents', weddingId] })

  return (
    <EventScheduleTab
      weddingId={weddingId}
      event={{ ...event, isMain: event.isMain }}
      vendors={vendors}
      incidents={incidents}
      onRefresh={refresh}
    />
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'tasks', label: 'Tasks', icon: <CheckSquare size={13} /> },
  { key: 'schedule', label: 'Schedule', icon: <CalendarDays size={13} /> },
  { key: 'budget', label: 'Budget', icon: <DollarSign size={13} /> },
  { key: 'guests', label: 'Guests', icon: <Users size={13} /> },
  { key: 'appointments', label: 'Appointments', icon: <Sparkles size={13} /> },
  { key: 'payments', label: 'Payments', icon: <CreditCard size={13} /> },
  { key: 'contributions', label: 'Contributions', icon: <Users size={13} /> },
  { key: 'logistics', label: 'Logistics', icon: <Truck size={13} /> },
  { key: 'vendors', label: 'Vendors', icon: <Users size={13} /> },
  { key: 'gifts', label: 'Gifts', icon: <Gift size={13} /> },
  { key: 'vision', label: 'Vision', icon: <Sparkles size={13} /> },
]

export function EventDetailClient({ weddingId, event }: Readonly<Props>) {
  const [activeTab, setActiveTab] = useState<Tab>('tasks')

  const typeColor = TYPE_COLOR[event.type] ?? 'bg-zinc-100 text-zinc-600'

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-zinc-100 bg-white">
        <div className="max-w-4xl mx-auto">
          <Link href={`/dashboard/${weddingId}/events`} className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors mb-4">
            <ArrowLeft size={12} /> All events
          </Link>
          <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeColor}`}>{event.type}</span>
                {event.isMain && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">Main event</span>}
              </div>
              <h1 className="text-3xl font-extrabold text-[#14161C] tracking-tight">{event.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500 flex-wrap">
                <span className="flex items-center gap-1.5"><CalendarDays size={13} /> {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}</span>
                {(event.startTime || event.endTime) && (
                  <span className="flex items-center gap-1.5"><Clock size={13} />
                    {event.startTime && format(new Date(event.startTime), 'HH:mm')}
                    {event.endTime && ` – ${format(new Date(event.endTime), 'HH:mm')}`}
                  </span>
                )}
                {event.venue && <span className="flex items-center gap-1.5"><MapPin size={13} /> {event.venue}</span>}
              </div>
              {event.description && <p className="text-sm text-zinc-400 mt-1">{event.description}</p>}
            </div>
          </div>
          <div className="flex gap-0.5 overflow-x-auto scrollbar-thin -mb-px mt-6">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-[#14161C] text-[#14161C]' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-8 py-8">
        {activeTab === 'tasks' && <TasksTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'schedule' && <ScheduleTab weddingId={weddingId} event={event} />}
        {activeTab === 'budget' && <BudgetTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'guests' && <GuestsTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'appointments' && <AppointmentsTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'payments' && <PaymentsTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'contributions' && <ContributionsTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'logistics' && <LogisticsTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'vendors' && <VendorsTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'gifts' && <GiftsTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'vision' && <MoodboardTab weddingId={weddingId} eventId={event.id} />}
      </div>
    </div>
  )
}