'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import {
  MapPin, Clock, Plus, DollarSign, Users,
  ArrowLeft, CreditCard, Sparkles, Truck, Gift, Camera,
  CalendarDays, LayoutTemplate, CheckSquare, UserCheck,
} from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

// ─── Shared feature components ────────────────────────────────────────────────
import { TaskModal, TaskList, LoadTemplateModal } from '@/components/features/task-modals'
import type { TaskItem } from '@/components/features/task-modals'
import { useChecklistItems } from '@/hooks/use-data'
import { EventAppointmentsTab } from '@/components/features/appointment-modals'
import type { Appointment, Vendor as ApptVendor } from '@/components/features/appointment-modals'
import { EventContributionsTab } from '@/components/features/contribution-modals'
import { EventPaymentsTab } from '@/components/features/payment-modals'
import { usePayments } from '@/hooks/use-payments'
import { EventLogisticsTab } from '@/components/features/logistics-modals'
import type { TransportRoute, Accommodation } from '@/components/features/logistics-modals'
import { EventGiftsTab } from '@/components/features/gift-modals'
import type { GiftRegistryItem, GiftReceived } from '@/components/features/gift-modals'
import { EventVendorsTab } from '@/components/features/vendor-components'
import { MoodboardTab } from '@/components/features/moodboard-components'
import { PhotographyTab } from '@/components/features/photography-components'
import { EventBudgetTab } from '@/components/features/budget-components'
import { EventScheduleTab } from '@/components/features/schedule-components'
import type { Incident } from '@/components/features/schedule-components'
import { EventGuestsTab, EventCheckInTab } from '@/components/features/guest-components'
import { BridalTeamTab } from '@/components/features/bridal-team-components'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  weddingId: string
  event: {
    id: string; name: string; type: string; date: string
    venue?: string; description?: string; startTime?: string; endTime?: string; isMain: boolean
  }
}

type Tab = 'tasks' | 'budget' | 'guests' | 'check-in' | 'appointments' | 'payments' | 'contributions' | 'logistics' | 'vision' | 'gifts' | 'vendors' | 'schedule' | 'photography' | 'bridal-team'

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  WEDDING: 'bg-[#1F4D3A]/10 text-[#1F4D3A]',
  RECEPTION: 'bg-sky-100 text-sky-700', ENGAGEMENT: 'bg-pink-100 text-pink-700',
  TRADITIONAL: 'bg-orange-100 text-orange-700', CIVIL: 'bg-[#1F4D3A]/6 text-[#14161C]/60',
  POST_WEDDING: 'bg-emerald-100 text-emerald-700',
}

// ─── Tasks Tab — uses shared TaskList + LoadTemplateModal ─────────────────────

function TasksTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const [showAdd, setShowAdd] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)

  // Use the same Dexie-backed hook as the checklist page so mutations stay in sync
  const { data: allTasks = [], isLoading } = useChecklistItems(weddingId)
  const tasks = (allTasks as TaskItem[]).filter(t => t.eventId === eventId && !t.deletedAt && t.category !== 'SHOT_LIST')

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#14161C]/55">{tasks.filter(t => t.isChecked).length}/{tasks.length} completed</p>
        <div className="flex gap-2">
          <Button size="sm" variant="lavender" onClick={() => setShowTemplate(true)}><LayoutTemplate size={13} /> Template</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={13} /> Add task</Button>
        </div>
      </div>
      <TaskList items={tasks} weddingId={weddingId} onAdd={() => setShowAdd(true)} />
      {showAdd && <TaskModal weddingId={weddingId} eventId={eventId} onClose={() => setShowAdd(false)} />}
      {showTemplate && <LoadTemplateModal weddingId={weddingId} eventId={eventId} onClose={() => setShowTemplate(false)} />}
    </div>
  )
}

// ─── Budget Tab ───────────────────────────────────────────────────────────────

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

// ─── Guests Tab ───────────────────────────────────────────────────────────────

function GuestsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  return <EventGuestsTab weddingId={weddingId} eventId={eventId} />
}

// ─── Appointments Tab ─────────────────────────────────────────────────────────

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

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const { data: payments = [], isLoading } = usePayments(weddingId)
  return <EventPaymentsTab weddingId={weddingId} eventId={eventId} events={[]} payments={payments} isLoading={isLoading} />
}

// ─── Contributions Tab ────────────────────────────────────────────────────────

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
  const { data: routes = [], isLoading: loadingRoutes } = useQuery<TransportRoute[]>({
    queryKey: ['logistics-routes', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/logistics/routes`); if (!res.ok) throw new Error('Failed'); return res.json() as Promise<TransportRoute[]> },
    staleTime: 30_000,
  })
  const { data: accommodations = [], isLoading: loadingAccom } = useQuery<Accommodation[]>({
    queryKey: ['logistics-accommodations', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/logistics/accommodations`); if (!res.ok) throw new Error('Failed'); return res.json() as Promise<Accommodation[]> },
    staleTime: 30_000,
  })
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['logistics-routes', weddingId] })
    void qc.invalidateQueries({ queryKey: ['logistics-accommodations', weddingId] })
  }
  if (loadingRoutes || loadingAccom) return <div className="flex justify-center py-12"><Spinner /></div>
  return <EventLogisticsTab weddingId={weddingId} eventId={eventId} routes={routes} accommodations={accommodations} onRefresh={refresh} />
}

// ─── Gifts Tab — uses shared EventGiftsTab ───────────────────────────────────

function GiftsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const qc = useQueryClient()

  const { data: registry = [], isLoading: loadingRegistry } = useQuery<GiftRegistryItem[]>({
    queryKey: ['gifts-registry', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/gifts/registry`); if (!res.ok) throw new Error('Failed'); return res.json() as Promise<GiftRegistryItem[]> },
    staleTime: 30_000,
  })

  const { data: received = [], isLoading: loadingReceived } = useQuery<GiftReceived[]>({
    queryKey: ['gifts-received', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/gifts/received`); if (!res.ok) throw new Error('Failed'); return res.json() as Promise<GiftReceived[]> },
    staleTime: 30_000,
  })

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['gifts-registry', weddingId] })
    void qc.invalidateQueries({ queryKey: ['gifts-received', weddingId] })
  }

  if (loadingRegistry || loadingReceived) return <div className="flex justify-center py-12"><Spinner /></div>

  return <EventGiftsTab weddingId={weddingId} eventId={eventId} registry={registry} received={received} onRefresh={refresh} />
}

// ─── Vendors Tab ──────────────────────────────────────────────────────────────

function VendorsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  return <EventVendorsTab weddingId={weddingId} eventId={eventId} />
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────

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
  return <EventScheduleTab weddingId={weddingId} event={{ ...event, isMain: event.isMain }} vendors={vendors} incidents={incidents} onRefresh={refresh} />
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  // ── Planning ──
  { key: 'tasks',         label: 'Tasks',          icon: <CheckSquare size={13} /> },
  { key: 'budget',        label: 'Budget',         icon: <DollarSign size={13} /> },
  { key: 'vendors',       label: 'Vendors',        icon: <Users size={13} /> },
  { key: 'appointments',  label: 'Appointments',   icon: <Sparkles size={13} /> },
  // ── People ──
  { key: 'guests',        label: 'Guests',         icon: <Users size={13} /> },
  { key: 'bridal-team',   label: 'Bridal Team',    icon: <Users size={13} /> },
  { key: 'contributions', label: 'Contributions',  icon: <Users size={13} /> },
  // ── Execution ──
  { key: 'schedule',      label: 'Schedule',       icon: <CalendarDays size={13} /> },
  { key: 'logistics',     label: 'Logistics',      icon: <Truck size={13} /> },
  { key: 'payments',      label: 'Payments',       icon: <CreditCard size={13} /> },
  { key: 'check-in',      label: 'Check-in',       icon: <UserCheck size={13} /> },
  // ── Extras ──
  { key: 'gifts',         label: 'Gifts',          icon: <Gift size={13} /> },
  { key: 'vision',        label: 'Vision',         icon: <Sparkles size={13} /> },
  { key: 'photography',   label: 'Media Production', icon: <Camera size={13} /> },
]

export function EventDetailClient({ weddingId, event }: Readonly<Props>) {
  const [activeTab, setActiveTab] = useState<Tab>('tasks')
  const typeColor = TYPE_COLOR[event.type] ?? 'bg-[#1F4D3A]/6 text-[#14161C]/60'

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <Link href={`/dashboard/${weddingId}/events`} className="inline-flex items-center gap-1.5 text-xs text-[#14161C]/40 hover:text-[#14161C]/60 transition-colors mb-4">
            <ArrowLeft size={12} /> All events
          </Link>
          <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeColor}`}>{event.type}</span>
                {event.isMain && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#1F4D3A]/10 text-[#1F4D3A]">Main event</span>}
              </div>
              <h1 className="text-3xl font-heading font-semibold text-[#14161C] tracking-tight">{event.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-[#14161C]/55 flex-wrap">
                <span className="flex items-center gap-1.5"><CalendarDays size={13} /> {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}</span>
                {(event.startTime || event.endTime) && (
                  <span className="flex items-center gap-1.5"><Clock size={13} />
                    {event.startTime && String(event.startTime).slice(0, 5)}
                    {event.endTime && ` – ${String(event.endTime).slice(0, 5)}`}
                  </span>
                )}
                {event.venue && <span className="flex items-center gap-1.5"><MapPin size={13} /> {event.venue}</span>}
              </div>
              {event.description && <p className="text-sm text-[#14161C]/40 mt-1">{event.description}</p>}
            </div>
          </div>
          <div className="flex gap-0.5 overflow-x-auto scrollbar-thin -mb-px mt-6">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-[#14161C] text-[#14161C]' : 'border-transparent text-[#14161C]/40 hover:text-[#14161C]/60'}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-8 py-8">
        {activeTab === 'tasks' && <TasksTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'schedule' && <ScheduleTab weddingId={weddingId} event={event} />}
        {activeTab === 'budget' && <BudgetTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'guests' && <GuestsTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'check-in' && <EventCheckInTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'appointments' && <AppointmentsTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'payments' && <PaymentsTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'contributions' && <ContributionsTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'logistics' && <LogisticsTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'vendors' && <VendorsTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'gifts' && <GiftsTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'vision' && <MoodboardTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'photography' && <PhotographyTab weddingId={weddingId} eventId={event.id} />}
        {activeTab === 'bridal-team' && <BridalTeamTab weddingId={weddingId} eventId={event.id} />}
      </div>
    </div>
  )
}
