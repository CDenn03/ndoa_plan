'use client'
import { useState } from 'react'
import { Truck, Hotel, Plus, MapPin, Clock } from 'lucide-react'
import { Button, Input, Label, EmptyState, Modal } from '@/components/ui'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'

interface Route {
  id: string; name: string; departureLocation: string; arrivalLocation: string
  departureTime: string; capacity?: number | null; assignedVendor?: { id: string; name: string } | null
}

interface Accommodation {
  id: string; hotelName: string; address?: string | null; checkIn: string; checkOut: string
  roomsBlocked?: number | null; notes?: string | null
}

interface Props {
  weddingId: string
  routes: Route[]
  accommodations: Accommodation[]
}

function AddRouteModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const { toast } = useToast()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', departureLocation: '', arrivalLocation: '', departureDate: '', departureTime: '08:00', capacity: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const departureTime = new Date(`${form.departureDate}T${form.departureTime}`).toISOString()
      const res = await fetch(`/api/weddings/${weddingId}/logistics/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, departureLocation: form.departureLocation, arrivalLocation: form.arrivalLocation, departureTime, capacity: form.capacity ? parseInt(form.capacity) : null }),
      })
      if (!res.ok) throw new Error('Failed')
      toast('Route added', 'success')
      router.refresh()
      onClose()
    } catch {
      toast('Failed to add route', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Add transport route">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="route-name">Route name *</Label>
          <Input id="route-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nairobi → Safari Park" required />
        </div>
        <div>
          <Label htmlFor="route-from">Departure location *</Label>
          <Input id="route-from" value={form.departureLocation} onChange={e => setForm(f => ({ ...f, departureLocation: e.target.value }))} placeholder="CBD, Nairobi" required />
        </div>
        <div>
          <Label htmlFor="route-to">Arrival location *</Label>
          <Input id="route-to" value={form.arrivalLocation} onChange={e => setForm(f => ({ ...f, arrivalLocation: e.target.value }))} placeholder="Safari Park Hotel" required />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <Label htmlFor="route-date">Date *</Label>
            <Input id="route-date" type="date" value={form.departureDate} onChange={e => setForm(f => ({ ...f, departureDate: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="route-time">Time</Label>
            <Input id="route-time" type="time" value={form.departureTime} onChange={e => setForm(f => ({ ...f, departureTime: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="route-cap">Capacity</Label>
            <Input id="route-cap" type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="50" min="1" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Adding…' : 'Add route'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddAccommodationModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const { toast } = useToast()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ hotelName: '', address: '', checkIn: '', checkOut: '', roomsBlocked: '', notes: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/logistics/accommodations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, roomsBlocked: form.roomsBlocked ? parseInt(form.roomsBlocked) : null }),
      })
      if (!res.ok) throw new Error('Failed')
      toast('Accommodation added', 'success')
      router.refresh()
      onClose()
    } catch {
      toast('Failed to add accommodation', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Add accommodation">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="hotel-name">Hotel name *</Label>
          <Input id="hotel-name" value={form.hotelName} onChange={e => setForm(f => ({ ...f, hotelName: e.target.value }))} placeholder="Safari Park Hotel" required />
        </div>
        <div>
          <Label htmlFor="hotel-addr">Address</Label>
          <Input id="hotel-addr" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Thika Road, Nairobi" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="hotel-in">Check-in *</Label>
            <Input id="hotel-in" type="date" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="hotel-out">Check-out *</Label>
            <Input id="hotel-out" type="date" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} required />
          </div>
        </div>
        <div>
          <Label htmlFor="hotel-rooms">Rooms blocked</Label>
          <Input id="hotel-rooms" type="number" value={form.roomsBlocked} onChange={e => setForm(f => ({ ...f, roomsBlocked: e.target.value }))} placeholder="10" min="1" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Adding…' : 'Add accommodation'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function LogisticsClient({ weddingId, routes, accommodations }: Readonly<Props>) {
  const [tab, setTab] = useState<'transport' | 'accommodation'>('transport')
  const [showAddRoute, setShowAddRoute] = useState(false)
  const [showAddAccom, setShowAddAccom] = useState(false)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Logistics</p>
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Logistics</h1>
            <p className="text-sm text-zinc-400 mt-2">{routes.length} routes · {accommodations.length} accommodations</p>
          </div>
          <Button onClick={() => tab === 'transport' ? setShowAddRoute(true) : setShowAddAccom(true)} size="sm">
            <Plus size={14} /> {tab === 'transport' ? 'Add route' : 'Add accommodation'}
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 space-y-8">
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          {(['transport', 'accommodation'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${
                tab === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}>
              {t === 'transport' ? 'Transport' : 'Accommodation'}
            </button>
          ))}
        </div>

        {tab === 'transport' && (
          routes.length === 0 ? (
            <EmptyState icon={<Truck size={40} />} title="No transport routes" description="Add routes for guests and bridal party"
              action={<Button onClick={() => setShowAddRoute(true)}><Plus size={14} />Add route</Button>} />
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              {routes.map(r => (
                <div key={r.id} className="flex items-start gap-4 py-4 px-6 border-b border-zinc-100 last:border-0">
                  <div className="w-9 h-9 rounded-full bg-sky-50 flex items-center justify-center flex-shrink-0">
                    <Truck size={15} className="text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#14161C]">{r.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                      <MapPin size={10} /> {r.departureLocation} → {r.arrivalLocation}
                    </p>
                    <p className="text-xs text-zinc-400 flex items-center gap-1">
                      <Clock size={10} /> {format(new Date(r.departureTime), 'MMM d, h:mm a')}
                      {r.capacity && ` · ${r.capacity} seats`}
                    </p>
                    {r.assignedVendor && <p className="text-xs text-violet-500 mt-0.5">{r.assignedVendor.name}</p>}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'accommodation' && (
          accommodations.length === 0 ? (
            <EmptyState icon={<Hotel size={40} />} title="No accommodations" description="Add hotels for out-of-town guests"
              action={<Button onClick={() => setShowAddAccom(true)}><Plus size={14} />Add accommodation</Button>} />
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              {accommodations.map(a => (
                <div key={a.id} className="flex items-start gap-4 py-4 px-6 border-b border-zinc-100 last:border-0">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Hotel size={15} className="text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#14161C]">{a.hotelName}</p>
                    {a.address && <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1"><MapPin size={10} /> {a.address}</p>}
                    <p className="text-xs text-zinc-400">
                      {format(new Date(a.checkIn), 'MMM d')} – {format(new Date(a.checkOut), 'MMM d, yyyy')}
                      {a.roomsBlocked && ` · ${a.roomsBlocked} rooms`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {showAddRoute && <AddRouteModal weddingId={weddingId} onClose={() => setShowAddRoute(false)} />}
      {showAddAccom && <AddAccommodationModal weddingId={weddingId} onClose={() => setShowAddAccom(false)} />}
    </div>
  )
}
