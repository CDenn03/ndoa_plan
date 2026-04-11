'use client'
import { useState } from 'react'
import { Button, Input, Label, Select, Modal, EmptyState } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Pencil, Trash2, Plus, Truck, Hotel, MapPin, Clock } from 'lucide-react'

export interface TransportRoute {
  id: string; name: string; departureLocation: string; arrivalLocation: string
  departureTime: string; capacity?: number | null; eventId?: string | null
  assignedVendor?: { id: string; name: string } | null
}
export interface Accommodation {
  id: string; hotelName: string; address?: string | null
  checkIn: string; checkOut: string; roomsBlocked?: number | null; notes?: string | null; eventId?: string | null
}

export function AddRouteModal({ weddingId, eventId, onClose, onDone }: Readonly<{
  weddingId: string; eventId?: string; onClose: () => void; onDone: () => void
}>) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', departureLocation: '', arrivalLocation: '', departureDate: '', departureTime: '08:00', capacity: '' })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const departureTime = new Date(`${form.departureDate}T${form.departureTime}`).toISOString()
      const res = await fetch(`/api/weddings/${weddingId}/logistics/routes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, departureLocation: form.departureLocation, arrivalLocation: form.arrivalLocation, departureTime, capacity: form.capacity ? Number.parseInt(form.capacity) : null, eventId: eventId ?? null }),
      })
      if (!res.ok) throw new Error('Failed to add route')
      toast('Route added', 'success'); onDone(); onClose()
    } catch { toast('Failed to add route', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Add transport route">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="route-name">Route name *</Label>
          <Input id="route-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nairobi → Safari Park" required /></div>
        <div><Label htmlFor="route-from">Departure *</Label>
          <Input id="route-from" value={form.departureLocation} onChange={e => setForm(f => ({ ...f, departureLocation: e.target.value }))} placeholder="CBD, Nairobi" required /></div>
        <div><Label htmlFor="route-to">Arrival *</Label>
          <Input id="route-to" value={form.arrivalLocation} onChange={e => setForm(f => ({ ...f, arrivalLocation: e.target.value }))} placeholder="Safari Park Hotel" required /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1"><Label htmlFor="route-date">Date *</Label>
            <Input id="route-date" type="date" value={form.departureDate} onChange={e => setForm(f => ({ ...f, departureDate: e.target.value }))} required /></div>
          <div><Label htmlFor="route-time">Time</Label>
            <Input id="route-time" type="time" value={form.departureTime} onChange={e => setForm(f => ({ ...f, departureTime: e.target.value }))} /></div>
          <div><Label htmlFor="route-cap">Capacity</Label>
            <Input id="route-cap" type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="50" min="1" /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Adding…' : 'Add route'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function EditRouteModal({ weddingId, route, onClose, onDone }: Readonly<{
  weddingId: string; route: TransportRoute; onClose: () => void; onDone: () => void
}>) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const dt = new Date(route.departureTime)
  const [form, setForm] = useState({
    name: route.name, departureLocation: route.departureLocation, arrivalLocation: route.arrivalLocation,
    departureDate: format(dt, 'yyyy-MM-dd'), departureTime: format(dt, 'HH:mm'),
    capacity: route.capacity ? String(route.capacity) : '',
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const departureTime = new Date(`${form.departureDate}T${form.departureTime}`).toISOString()
      const res = await fetch(`/api/weddings/${weddingId}/logistics/routes/${route.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, departureLocation: form.departureLocation, arrivalLocation: form.arrivalLocation, departureTime, capacity: form.capacity ? Number.parseInt(form.capacity) : null }),
      })
      if (!res.ok) throw new Error('Failed to update route')
      toast('Route updated', 'success'); onDone(); onClose()
    } catch { toast('Failed to update route', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Edit transport route">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="er-name">Route name *</Label>
          <Input id="er-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
        <div><Label htmlFor="er-from">Departure *</Label>
          <Input id="er-from" value={form.departureLocation} onChange={e => setForm(f => ({ ...f, departureLocation: e.target.value }))} required /></div>
        <div><Label htmlFor="er-to">Arrival *</Label>
          <Input id="er-to" value={form.arrivalLocation} onChange={e => setForm(f => ({ ...f, arrivalLocation: e.target.value }))} required /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1"><Label htmlFor="er-date">Date *</Label>
            <Input id="er-date" type="date" value={form.departureDate} onChange={e => setForm(f => ({ ...f, departureDate: e.target.value }))} required /></div>
          <div><Label htmlFor="er-time">Time</Label>
            <Input id="er-time" type="time" value={form.departureTime} onChange={e => setForm(f => ({ ...f, departureTime: e.target.value }))} /></div>
          <div><Label htmlFor="er-cap">Capacity</Label>
            <Input id="er-cap" type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} min="1" /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function AddAccommodationModal({ weddingId, eventId, onClose, onDone }: Readonly<{
  weddingId: string; eventId?: string; onClose: () => void; onDone: () => void
}>) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    hotelName: '', address: '', checkIn: '', checkOut: '', roomsBlocked: '', notes: '',
    guestType: 'none' as 'none' | 'individual' | 'group',
    guestId: '', guestName: '', groupSize: '',
  })

  const { data: guests = [] } = useQuery<{ id: string; name: string; phone?: string | null }[]>({
    queryKey: ['guests', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/guests`); if (!res.ok) return []; return res.json() },
    staleTime: 60_000,
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const assignedTo = form.guestType === 'individual'
        ? (form.guestName || guests.find(g => g.id === form.guestId)?.name || null)
        : form.guestType === 'group'
          ? `${form.guestName}${form.groupSize ? ` (${form.groupSize} people)` : ''}`
          : null
      const res = await fetch(`/api/weddings/${weddingId}/logistics/accommodations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelName: form.hotelName, address: form.address || null,
          checkIn: form.checkIn, checkOut: form.checkOut,
          roomsBlocked: form.roomsBlocked ? Number.parseInt(form.roomsBlocked) : null,
          notes: [assignedTo ? `Assigned to: ${assignedTo}` : '', form.notes].filter(Boolean).join('\n') || null,
          eventId: eventId ?? null,
        }),
      })
      if (!res.ok) throw new Error('Failed to add accommodation')
      toast('Accommodation added', 'success'); onDone(); onClose()
    } catch { toast('Failed to add accommodation', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Add accommodation">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="hotel-name">Hotel name *</Label>
          <Input id="hotel-name" value={form.hotelName} onChange={e => setForm(f => ({ ...f, hotelName: e.target.value }))} placeholder="Safari Park Hotel" required /></div>
        <div><Label htmlFor="hotel-addr">Address</Label>
          <Input id="hotel-addr" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Thika Road, Nairobi" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="hotel-in">Check-in *</Label>
            <Input id="hotel-in" type="date" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} required /></div>
          <div><Label htmlFor="hotel-out">Check-out *</Label>
            <Input id="hotel-out" type="date" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} required /></div>
        </div>
        <div><Label htmlFor="hotel-rooms">Rooms blocked</Label>
          <Input id="hotel-rooms" type="number" value={form.roomsBlocked} onChange={e => setForm(f => ({ ...f, roomsBlocked: e.target.value }))} placeholder="1" min="1" /></div>

        {/* Guest / group assignment */}
        <div>
          <Label>Assigned to</Label>
          <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl mt-1">
            {(['none', 'individual', 'group'] as const).map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, guestType: t, guestId: '', guestName: '', groupSize: '' }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${form.guestType === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {t === 'none' ? 'Unassigned' : t === 'individual' ? 'Individual' : 'Group'}
              </button>
            ))}
          </div>
        </div>

        {form.guestType === 'individual' && (
          <div className="space-y-2">
            <div><Label htmlFor="hotel-guest">Select guest</Label>
              <Select id="hotel-guest" value={form.guestId} onChange={e => {
                const g = guests.find(g => g.id === e.target.value)
                setForm(f => ({ ...f, guestId: e.target.value, guestName: g?.name ?? '' }))
              }}>
                <option value="">Choose from guest list…</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.name}{g.phone ? ` · ${g.phone}` : ''}</option>)}
              </Select></div>
            <div><Label htmlFor="hotel-gname">Or enter name</Label>
              <Input id="hotel-gname" value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName: e.target.value, guestId: '' }))} placeholder="Guest name" /></div>
          </div>
        )}

        {form.guestType === 'group' && (
          <div className="space-y-2">
            <div><Label htmlFor="hotel-grpname">Group name *</Label>
              <Input id="hotel-grpname" value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))} placeholder="e.g. Bride's family, Groom's delegation" /></div>
            <div><Label htmlFor="hotel-grpsize">Number of people</Label>
              <Input id="hotel-grpsize" type="number" value={form.groupSize} onChange={e => setForm(f => ({ ...f, groupSize: e.target.value }))} placeholder="8" min="1" /></div>
          </div>
        )}

        <div><Label htmlFor="hotel-notes">Notes</Label>
          <textarea id="hotel-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Breakfast included, special requests, room preferences…"
            rows={4}
            className="flex w-full rounded-xl border border-[hsl(var(--border))] bg-white px-3.5 py-2 text-sm text-[#14161C] focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1 focus:border-transparent resize-none" /></div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Adding…' : 'Add accommodation'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function EditAccommodationModal({ weddingId, accommodation, onClose, onDone }: Readonly<{
  weddingId: string; accommodation: Accommodation; onClose: () => void; onDone: () => void
}>) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  // Parse existing notes to extract assignment info
  const existingNotes = accommodation.notes ?? ''
  const assignedMatch = existingNotes.match(/^Assigned to: (.+?)(?:\n|$)/)
  const assignedLine = assignedMatch?.[1] ?? ''
  const restNotes = existingNotes.replace(/^Assigned to: .+?\n?/, '')
  const groupMatch = assignedLine.match(/^(.+?) \((\d+) people\)$/)

  const [form, setForm] = useState({
    hotelName: accommodation.hotelName, address: accommodation.address ?? '',
    checkIn: accommodation.checkIn.slice(0, 10), checkOut: accommodation.checkOut.slice(0, 10),
    roomsBlocked: accommodation.roomsBlocked ? String(accommodation.roomsBlocked) : '',
    notes: restNotes,
    guestType: (assignedLine ? (groupMatch ? 'group' : 'individual') : 'none') as 'none' | 'individual' | 'group',
    guestId: '', guestName: groupMatch ? groupMatch[1] : assignedLine,
    groupSize: groupMatch ? groupMatch[2] : '',
  })

  const { data: guests = [] } = useQuery<{ id: string; name: string; phone?: string | null }[]>({
    queryKey: ['guests', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/guests`); if (!res.ok) return []; return res.json() },
    staleTime: 60_000,
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const assignedTo = form.guestType === 'individual'
        ? (form.guestName || guests.find(g => g.id === form.guestId)?.name || null)
        : form.guestType === 'group'
          ? `${form.guestName}${form.groupSize ? ` (${form.groupSize} people)` : ''}`
          : null
      const res = await fetch(`/api/weddings/${weddingId}/logistics/accommodations/${accommodation.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelName: form.hotelName, address: form.address || null,
          checkIn: form.checkIn, checkOut: form.checkOut,
          roomsBlocked: form.roomsBlocked ? Number.parseInt(form.roomsBlocked) : null,
          notes: [assignedTo ? `Assigned to: ${assignedTo}` : '', form.notes].filter(Boolean).join('\n') || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to update accommodation')
      toast('Accommodation updated', 'success'); onDone(); onClose()
    } catch { toast('Failed to update accommodation', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Edit accommodation">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="ea-hotel">Hotel name *</Label>
          <Input id="ea-hotel" value={form.hotelName} onChange={e => setForm(f => ({ ...f, hotelName: e.target.value }))} required /></div>
        <div><Label htmlFor="ea-addr">Address</Label>
          <Input id="ea-addr" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="ea-in">Check-in *</Label>
            <Input id="ea-in" type="date" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} required /></div>
          <div><Label htmlFor="ea-out">Check-out *</Label>
            <Input id="ea-out" type="date" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} required /></div>
        </div>
        <div><Label htmlFor="ea-rooms">Rooms blocked</Label>
          <Input id="ea-rooms" type="number" value={form.roomsBlocked} onChange={e => setForm(f => ({ ...f, roomsBlocked: e.target.value }))} min="1" /></div>

        {/* Guest / group assignment */}
        <div>
          <Label>Assigned to</Label>
          <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl mt-1">
            {(['none', 'individual', 'group'] as const).map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, guestType: t, guestId: '', guestName: '', groupSize: '' }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${form.guestType === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {t === 'none' ? 'Unassigned' : t === 'individual' ? 'Individual' : 'Group'}
              </button>
            ))}
          </div>
        </div>

        {form.guestType === 'individual' && (
          <div className="space-y-2">
            <div><Label htmlFor="ea-guest">Select guest</Label>
              <Select id="ea-guest" value={form.guestId} onChange={e => {
                const g = guests.find(g => g.id === e.target.value)
                setForm(f => ({ ...f, guestId: e.target.value, guestName: g?.name ?? '' }))
              }}>
                <option value="">Choose from guest list…</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.name}{g.phone ? ` · ${g.phone}` : ''}</option>)}
              </Select></div>
            <div><Label htmlFor="ea-gname">Or enter name</Label>
              <Input id="ea-gname" value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName: e.target.value, guestId: '' }))} placeholder="Guest name" /></div>
          </div>
        )}

        {form.guestType === 'group' && (
          <div className="space-y-2">
            <div><Label htmlFor="ea-grpname">Group name</Label>
              <Input id="ea-grpname" value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))} placeholder="e.g. Bride's family" /></div>
            <div><Label htmlFor="ea-grpsize">Number of people</Label>
              <Input id="ea-grpsize" type="number" value={form.groupSize} onChange={e => setForm(f => ({ ...f, groupSize: e.target.value }))} placeholder="8" min="1" /></div>
          </div>
        )}

        <div><Label htmlFor="ea-notes">Notes</Label>
          <textarea id="ea-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Breakfast included, special requests, room preferences…"
            rows={4}
            className="flex w-full rounded-xl border border-[hsl(var(--border))] bg-white px-3.5 py-2 text-sm text-[#14161C] focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1 focus:border-transparent resize-none" /></div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function RouteRow({ route, weddingId, onRefresh }: Readonly<{
  route: TransportRoute; weddingId: string; onRefresh: () => void
}>) {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this route?')) return
    try {
      await fetch(`/api/weddings/${weddingId}/logistics/routes/${route.id}`, { method: 'DELETE' })
      toast('Route deleted', 'success'); onRefresh()
    } catch { toast('Failed to delete route', 'error') }
  }

  return (
    <>
      <div className="group flex items-start gap-4 py-4 px-6 border-b border-zinc-100 last:border-0">
        <div className="w-9 h-9 rounded-full bg-sky-50 flex items-center justify-center flex-shrink-0">
          <Truck size={15} className="text-sky-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#14161C]">{route.name}</p>
          <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
            <MapPin size={10} /> {route.departureLocation} → {route.arrivalLocation}
          </p>
          <p className="text-xs text-zinc-400 flex items-center gap-1">
            <Clock size={10} /> {format(new Date(route.departureTime), 'MMM d, h:mm a')}
            {route.capacity ? ` · ${route.capacity} seats` : ''}
          </p>
          {route.assignedVendor && <p className="text-xs text-violet-500 mt-0.5">{route.assignedVendor.name}</p>}
        </div>
        <div className="flex gap-1  flex-shrink-0">
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" aria-label="Edit"><Pencil size={13} /></button>
          <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500" aria-label="Delete"><Trash2 size={13} /></button>
        </div>
      </div>
      {editing && <EditRouteModal weddingId={weddingId} route={route} onClose={() => setEditing(false)} onDone={onRefresh} />}
    </>
  )
}

export function AccommodationRow({ accommodation, weddingId, onRefresh }: Readonly<{
  accommodation: Accommodation; weddingId: string; onRefresh: () => void
}>) {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this accommodation?')) return
    try {
      await fetch(`/api/weddings/${weddingId}/logistics/accommodations/${accommodation.id}`, { method: 'DELETE' })
      toast('Accommodation deleted', 'success'); onRefresh()
    } catch { toast('Failed to delete accommodation', 'error') }
  }

  return (
    <>
      <div className="group flex items-start gap-4 py-4 px-6 border-b border-zinc-100 last:border-0">
        <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <Hotel size={15} className="text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#14161C]">{accommodation.hotelName}</p>
          {accommodation.address && (
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1"><MapPin size={10} /> {accommodation.address}</p>
          )}
          <p className="text-xs text-zinc-400">
            {format(new Date(accommodation.checkIn), 'MMM d')} – {format(new Date(accommodation.checkOut), 'MMM d, yyyy')}
            {accommodation.roomsBlocked ? ` · ${accommodation.roomsBlocked} rooms` : ''}
          </p>
          {accommodation.notes && <p className="text-xs text-zinc-400 mt-0.5">{accommodation.notes}</p>}
        </div>
        <div className="flex gap-1  flex-shrink-0">
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" aria-label="Edit"><Pencil size={13} /></button>
          <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500" aria-label="Delete"><Trash2 size={13} /></button>
        </div>
      </div>
      {editing && <EditAccommodationModal weddingId={weddingId} accommodation={accommodation} onClose={() => setEditing(false)} onDone={onRefresh} />}
    </>
  )
}

// ─── Route List ───────────────────────────────────────────────────────────────

export function RouteList({ routes, weddingId, onRefresh, onAdd }: Readonly<{
  routes: TransportRoute[]; weddingId: string; onRefresh: () => void; onAdd: () => void
}>) {
  if (routes.length === 0) return (
    <EmptyState icon={<Truck size={40} />} title="No transport routes" description="Add routes for guests and bridal party"
      action={<Button onClick={onAdd}><Plus size={14} /> Add route</Button>} />
  )
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
      {routes.map(r => <RouteRow key={r.id} route={r} weddingId={weddingId} onRefresh={onRefresh} />)}
    </div>
  )
}

// ─── Accommodation List ───────────────────────────────────────────────────────

export function AccomList({ accommodations, weddingId, onRefresh, onAdd }: Readonly<{
  accommodations: Accommodation[]; weddingId: string; onRefresh: () => void; onAdd: () => void
}>) {
  if (accommodations.length === 0) return (
    <EmptyState icon={<Hotel size={40} />} title="No accommodations" description="Add hotels for out-of-town guests"
      action={<Button onClick={onAdd}><Plus size={14} /> Add accommodation</Button>} />
  )
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
      {accommodations.map(a => <AccommodationRow key={a.id} accommodation={a} weddingId={weddingId} onRefresh={onRefresh} />)}
    </div>
  )
}

// ─── Event Logistics Tab (shared between event detail + logistics dashboard) ──

export function EventLogisticsTab({ weddingId, eventId, routes, accommodations, onRefresh }: Readonly<{
  weddingId: string; eventId: string
  routes: TransportRoute[]; accommodations: Accommodation[]; onRefresh: () => void
}>) {
  const [subTab, setSubTab] = useState<'transport' | 'accommodation'>('transport')
  const [showAddRoute, setShowAddRoute] = useState(false)
  const [showAddAccom, setShowAddAccom] = useState(false)

  const evRoutes = routes.filter(r => r.eventId === eventId)
  const evAccoms = accommodations.filter(a => a.eventId === eventId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          {(['transport', 'accommodation'] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${subTab === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
              {t === 'transport' ? 'Transport' : 'Accommodation'}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => subTab === 'transport' ? setShowAddRoute(true) : setShowAddAccom(true)}>
          <Plus size={14} /> {subTab === 'transport' ? 'Add route' : 'Add accommodation'}
        </Button>
      </div>

      {subTab === 'transport' && (
        <RouteList routes={evRoutes} weddingId={weddingId} onRefresh={onRefresh} onAdd={() => setShowAddRoute(true)} />
      )}
      {subTab === 'accommodation' && (
        <AccomList accommodations={evAccoms} weddingId={weddingId} onRefresh={onRefresh} onAdd={() => setShowAddAccom(true)} />
      )}

      {showAddRoute && <AddRouteModal weddingId={weddingId} eventId={eventId} onClose={() => setShowAddRoute(false)} onDone={onRefresh} />}
      {showAddAccom && <AddAccommodationModal weddingId={weddingId} eventId={eventId} onClose={() => setShowAddAccom(false)} onDone={onRefresh} />}
    </div>
  )
}
