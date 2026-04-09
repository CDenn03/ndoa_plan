'use client'
import { useState, useMemo } from 'react'
import { Truck, Hotel, Plus, MapPin, Clock, CalendarDays } from 'lucide-react'
import { Button, Input, Label, EmptyState, Modal } from '@/components/ui'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/toast'

interface Route {
  id: string; eventId?: string | null; name: string
  departureLocation: string; arrivalLocation: string
  departureTime: string; capacity?: number | null
  assignedVendor?: { id: string; name: string } | null
}
interface Accommodation {
  id: string; eventId?: string | null; hotelName: string
  address?: string | null; checkIn: string; checkOut: string
  roomsBlocked?: number | null; notes?: string | null
}
interface WeddingEvent { id: string; name: string; type: string; date: string }
interface Props {
  weddingId: string; events: WeddingEvent[]
  routes: Route[]; accommodations: Accommodation[]; onRefresh: () => void
}

function AddRouteModal({ weddingId, eventId, onClose, onDone }: Readonly<{ weddingId: string; eventId?: string; onClose: () => void; onDone: () => void }>) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', departureLocation: '', arrivalLocation: '', departureDate: '', departureTime: '08:00', capacity: '' })
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const departureTime = new Date(`${form.departureDate}T${form.departureTime}`).toISOString()
      const res = await fetch(`/api/weddings/${weddingId}/logistics/routes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, departureLocation: form.departureLocation, arrivalLocation: form.arrivalLocation, departureTime, capacity: form.capacity ? parseInt(form.capacity) : null, eventId: eventId ?? null }),
      })
      if (!res.ok) throw new Error()
      toast('Route added', 'success'); onDone(); onClose()
    } catch { toast('Failed to add route', 'error') } finally { setSaving(false) }
  }
  return (
    <Modal onClose={onClose} title="Add transport route">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="route-name">Route name *</Label><Input id="route-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nairobi → Safari Park" required /></div>
        <div><Label htmlFor="route-from">Departure *</Label><Input id="route-from" value={form.departureLocation} onChange={e => setForm(f => ({ ...f, departureLocation: e.target.value }))} placeholder="CBD, Nairobi" required /></div>
        <div><Label htmlFor="route-to">Arrival *</Label><Input id="route-to" value={form.arrivalLocation} onChange={e => setForm(f => ({ ...f, arrivalLocation: e.target.value }))} placeholder="Safari Park Hotel" required /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1"><Label htmlFor="route-date">Date *</Label><Input id="route-date" type="date" value={form.departureDate} onChange={e => setForm(f => ({ ...f, departureDate: e.target.value }))} required /></div>
          <div><Label htmlFor="route-time">Time</Label><Input id="route-time" type="time" value={form.departureTime} onChange={e => setForm(f => ({ ...f, departureTime: e.target.value }))} /></div>
          <div><Label htmlFor="route-cap">Capacity</Label><Input id="route-cap" type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="50" min="1" /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Adding…' : 'Add route'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddAccommodationModal({ weddingId, eventId, onClose, onDone }: Readonly<{ weddingId: string; eventId?: string; onClose: () => void; onDone: () => void }>) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ hotelName: '', address: '', checkIn: '', checkOut: '', roomsBlocked: '', notes: '' })
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/logistics/accommodations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, roomsBlocked: form.roomsBlocked ? parseInt(form.roomsBlocked) : null, eventId: eventId ?? null }),
      })
      if (!res.ok) throw new Error()
      toast('Accommodation added', 'success'); onDone(); onClose()
    } catch { toast('Failed to add accommodation', 'error') } finally { setSaving(false) }
  }
  return (
    <Modal onClose={onClose} title="Add accommodation">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="hotel-name">Hotel name *</Label><Input id="hotel-name" value={form.hotelName} onChange={e => setForm(f => ({ ...f, hotelName: e.target.value }))} placeholder="Safari Park Hotel" required /></div>
        <div><Label htmlFor="hotel-addr">Address</Label><Input id="hotel-addr" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Thika Road, Nairobi" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="hotel-in">Check-in *</Label><Input id="hotel-in" type="date" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} required /></div>
          <div><Label htmlFor="hotel-out">Check-out *</Label><Input id="hotel-out" type="date" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} required /></div>
        </div>
        <div><Label htmlFor="hotel-rooms">Rooms blocked</Label><Input id="hotel-rooms" type="number" value={form.roomsBlocked} onChange={e => setForm(f => ({ ...f, roomsBlocked: e.target.value }))} placeholder="10" min="1" /></div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Adding…' : 'Add accommodation'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function RouteList({ routes, onAdd }: Readonly<{ routes: Route[]; onAdd: () => void }>) {
  if (routes.length === 0) return <EmptyState icon={<Truck size={40} />} title="No transport routes" description="Add routes for guests and bridal party" action={<Button onClick={onAdd}><Plus size={14} />Add route</Button>} />
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
      {routes.map(r => (
        <div key={r.id} className="flex items-start gap-4 py-4 px-6 border-b border-zinc-100 last:border-0">
          <div className="w-9 h-9 rounded-full bg-sky-50 flex items-center justify-center flex-shrink-0"><Truck size={15} className="text-sky-500" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#14161C]">{r.name}</p>
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1"><MapPin size={10} /> {r.departureLocation} → {r.arrivalLocation}</p>
            <p className="text-xs text-zinc-400 flex items-center gap-1"><Clock size={10} /> {format(new Date(r.departureTime), 'MMM d, h:mm a')}{r.capacity && ` · ${r.capacity} seats`}</p>
            {r.assignedVendor && <p className="text-xs text-violet-500 mt-0.5">{r.assignedVendor.name}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

function AccomList({ accommodations, onAdd }: Readonly<{ accommodations: Accommodation[]; onAdd: () => void }>) {
  if (accommodations.length === 0) return <EmptyState icon={<Hotel size={40} />} title="No accommodations" description="Add hotels for out-of-town guests" action={<Button onClick={onAdd}><Plus size={14} />Add accommodation</Button>} />
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
      {accommodations.map(a => (
        <div key={a.id} className="flex items-start gap-4 py-4 px-6 border-b border-zinc-100 last:border-0">
          <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0"><Hotel size={15} className="text-emerald-500" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#14161C]">{a.hotelName}</p>
            {a.address && <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1"><MapPin size={10} /> {a.address}</p>}
            <p className="text-xs text-zinc-400">{format(new Date(a.checkIn), 'MMM d')} – {format(new Date(a.checkOut), 'MMM d, yyyy')}{a.roomsBlocked && ` · ${a.roomsBlocked} rooms`}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function OverallTab({ routes, accommodations, events }: Readonly<{ routes: Route[]; accommodations: Accommodation[]; events: WeddingEvent[] }>) {
  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent | null; routes: Route[]; accoms: Accommodation[] }>()
    for (const e of events) map.set(e.id, { event: e, routes: [], accoms: [] })
    for (const r of routes) { const k = r.eventId ?? '__unassigned__'; if (!map.has(k)) map.set(k, { event: null, routes: [], accoms: [] }); map.get(k)!.routes.push(r) }
    for (const a of accommodations) { const k = a.eventId ?? '__unassigned__'; if (!map.has(k)) map.set(k, { event: null, routes: [], accoms: [] }); map.get(k)!.accoms.push(a) }
    return map
  }, [routes, accommodations, events])

  if (routes.length === 0 && accommodations.length === 0) return <EmptyState icon={<Truck size={40} />} title="No logistics yet" description="Add transport routes and accommodations inside each event tab" />

  return (
    <div className="space-y-8">
      <div className="flex gap-8 divide-x divide-zinc-100">
        <div className="pr-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Routes</p><p className="text-2xl font-extrabold text-[#14161C]">{routes.length}</p></div>
        <div className="px-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Accommodations</p><p className="text-2xl font-extrabold text-[#14161C]">{accommodations.length}</p></div>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">By event</p>
        {Array.from(byEvent.entries()).map(([key, { event, routes: evR, accoms }]) => {
          if (evR.length === 0 && accoms.length === 0) return null
          return (
            <div key={key} className="rounded-2xl border border-zinc-100 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2"><CalendarDays size={15} className="text-zinc-400" /><p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p></div>
              <div className="flex gap-6 text-right">
                <div><p className="text-xs text-zinc-400">Routes</p><p className="text-sm font-bold text-sky-600">{evR.length}</p></div>
                <div><p className="text-xs text-zinc-400">Accommodations</p><p className="text-sm font-bold text-emerald-600">{accoms.length}</p></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EventLogisticsTab({ weddingId, event, routes, accommodations, onRefresh }: Readonly<{ weddingId: string; event: WeddingEvent; routes: Route[]; accommodations: Accommodation[]; onRefresh: () => void }>) {
  const [subTab, setSubTab] = useState<'transport' | 'accommodation'>('transport')
  const [showAddRoute, setShowAddRoute] = useState(false)
  const [showAddAccom, setShowAddAccom] = useState(false)
  const evRoutes = useMemo(() => routes.filter(r => r.eventId === event.id), [routes, event.id])
  const evAccoms = useMemo(() => accommodations.filter(a => a.eventId === event.id), [accommodations, event.id])
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          {(['transport', 'accommodation'] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${subTab === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
              {t === 'transport' ? 'Transport' : 'Accommodation'}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => subTab === 'transport' ? setShowAddRoute(true) : setShowAddAccom(true)}>
          <Plus size={14} /> {subTab === 'transport' ? 'Add route' : 'Add accommodation'}
        </Button>
      </div>
      {subTab === 'transport' && <RouteList routes={evRoutes} onAdd={() => setShowAddRoute(true)} />}
      {subTab === 'accommodation' && <AccomList accommodations={evAccoms} onAdd={() => setShowAddAccom(true)} />}
      {showAddRoute && <AddRouteModal weddingId={weddingId} eventId={event.id} onClose={() => setShowAddRoute(false)} onDone={onRefresh} />}
      {showAddAccom && <AddAccommodationModal weddingId={weddingId} eventId={event.id} onClose={() => setShowAddAccom(false)} onDone={onRefresh} />}
    </div>
  )
}

export function LogisticsClient({ weddingId, events, routes, accommodations, onRefresh }: Readonly<Props>) {
  const [activeTab, setActiveTab] = useState('__overall__')
  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name }))]
  const activeEvent = events.find(e => e.id === activeTab)
  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Logistics</p>
          <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Logistics</h1>
          <p className="text-sm text-zinc-400 mt-2 mb-6">{routes.length} routes · {accommodations.length} accommodations</p>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-[#14161C] text-[#14161C]' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-8 py-10">
        {activeTab === '__overall__'
          ? <OverallTab routes={routes} accommodations={accommodations} events={events} />
          : activeEvent ? <EventLogisticsTab weddingId={weddingId} event={activeEvent} routes={routes} accommodations={accommodations} onRefresh={onRefresh} /> : null}
      </div>
    </div>
  )
}
