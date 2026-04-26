'use client'
import { useState, useMemo, useEffect } from 'react'
import { Button, Input, Label, Modal, EmptyState, Tabs } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Pencil, Trash2, Plus, Truck, Hotel, MapPin, Clock, X, Search, CheckCircle2, Circle } from 'lucide-react'

export interface TransportRoute {
  id: string; name: string; departureLocation: string; arrivalLocation: string
  departureTime: string; capacity?: number | null; eventId?: string | null
  isCompleted?: boolean
  contactPerson?: string | null; contactPhone?: string | null
  assignedVendor?: { id: string; name: string } | null
}
export interface Accommodation {
  id: string; hotelName: string; address?: string | null
  checkIn: string; checkOut: string; roomsBlocked?: number | null; notes?: string | null; eventId?: string | null
  isCompleted?: boolean
  contactPerson?: string | null; contactPhone?: string | null
}

export function AddRouteModal({ weddingId, eventId, onClose, onDone }: Readonly<{
  weddingId: string; eventId?: string; onClose: () => void; onDone: () => void
}>) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', departureLocation: '', arrivalLocation: '', departureDate: '', departureTime: '08:00', capacity: '', contactPerson: '', contactPhone: '' })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const departureTime = new Date(`${form.departureDate}T${form.departureTime}`).toISOString()
      const res = await fetch(`/api/weddings/${weddingId}/logistics/routes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, departureLocation: form.departureLocation, arrivalLocation: form.arrivalLocation, departureTime, capacity: form.capacity ? Number.parseInt(form.capacity) : null, eventId: eventId ?? null, contactPerson: form.contactPerson || null, contactPhone: form.contactPhone || null }),
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
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="route-contact">Contact person</Label>
            <Input id="route-contact" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Driver / coordinator name" /></div>
          <div><Label htmlFor="route-phone">Contact phone</Label>
            <Input id="route-phone" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+254 7XX XXX XXX" /></div>
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
    contactPerson: route.contactPerson ?? '', contactPhone: route.contactPhone ?? '',
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const departureTime = new Date(`${form.departureDate}T${form.departureTime}`).toISOString()
      const res = await fetch(`/api/weddings/${weddingId}/logistics/routes/${route.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, departureLocation: form.departureLocation, arrivalLocation: form.arrivalLocation, departureTime, capacity: form.capacity ? Number.parseInt(form.capacity) : null, contactPerson: form.contactPerson || null, contactPhone: form.contactPhone || null }),
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
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="er-contact">Contact person</Label>
            <Input id="er-contact" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Driver / coordinator name" /></div>
          <div><Label htmlFor="er-phone">Contact phone</Label>
            <Input id="er-phone" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+254 7XX XXX XXX" /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export // ─── Guest Multi-Picker ───────────────────────────────────────────────────────

function GuestMultiPicker({ guests, selected, onChange }: Readonly<{
  guests: { id: string; name: string; phone?: string | null }[]
  selected: string[]  // guest IDs
  onChange: (ids: string[]) => void
}>) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() =>
    guests.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || (g.phone ?? '').includes(search)),
  [guests, search])

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])

  const selectedGuests = guests.filter(g => selected.includes(g.id))

  return (
    <div className="space-y-2">
      {/* Selected pills */}
      {selectedGuests.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedGuests.map(g => (
            <span key={g.id} className="inline-flex items-center gap-1 bg-[#1F4D3A]/10 text-[#1F4D3A] text-xs font-semibold px-2.5 py-1 rounded-full">
              {g.name}
              <button type="button" onClick={() => toggle(g.id)} className="hover:text-violet-900" aria-label={`Remove ${g.name}`}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Search + list */}
      <div className="border border-[#1F4D3A]/12 rounded-xl overflow-hidden">
        <div className="relative border-b border-[#1F4D3A]/8">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#14161C]/40" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search guests…"
            className="w-full pl-8 pr-3 py-2 text-sm bg-white focus:outline-none text-[#14161C] placeholder:text-[#14161C]/40"
          />
        </div>
        <div className="max-h-40 overflow-y-auto">
          {filtered.length === 0
            ? <p className="text-xs text-[#14161C]/40 text-center py-3">No guests found</p>
            : filtered.map(g => (
              <label key={g.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[#F7F5F2] cursor-pointer">
                <input type="checkbox" checked={selected.includes(g.id)} onChange={() => toggle(g.id)}
                  className="rounded accent-[#1F4D3A]" />
                <span className="text-sm text-[#14161C] flex-1">{g.name}</span>
                {g.phone && <span className="text-xs text-[#14161C]/40">{g.phone}</span>}
              </label>
            ))}
        </div>
      </div>
      {selectedGuests.length > 0 && (
        <p className="text-xs text-[#14161C]/40">{selectedGuests.length} guest{selectedGuests.length !== 1 ? 's' : ''} selected</p>
      )}
    </div>
  )
}

function AddAccommodationModal({ weddingId, eventId, onClose, onDone }: Readonly<{
  weddingId: string; eventId?: string; onClose: () => void; onDone: () => void
}>) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    hotelName: '', address: '', checkIn: '', checkOut: '', roomsBlocked: '', notes: '',
    contactPerson: '', contactPhone: '',
    guestType: 'none' as 'none' | 'individual' | 'group',
    selectedGuestIds: [] as string[],
    groupName: '', groupSize: '',
  })

  const { data: guests = [] } = useQuery<{ id: string; name: string; phone?: string | null }[]>({
    queryKey: ['guests', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/guests`); if (!res.ok) return []; return res.json() },
    staleTime: 60_000,
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      let assignedTo: string | null = null
      if (form.guestType === 'individual' && form.selectedGuestIds.length > 0) {
        const names = form.selectedGuestIds.map(id => guests.find(g => g.id === id)?.name ?? id)
        assignedTo = names.join(', ')
      } else if (form.guestType === 'group' && form.groupName) {
        assignedTo = `${form.groupName}${form.groupSize ? ` (${form.groupSize} people)` : ''}`
      }
      const res = await fetch(`/api/weddings/${weddingId}/logistics/accommodations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelName: form.hotelName, address: form.address || null,
          checkIn: form.checkIn, checkOut: form.checkOut,
          roomsBlocked: form.roomsBlocked ? Number.parseInt(form.roomsBlocked) : null,
          notes: [assignedTo ? `Assigned to: ${assignedTo}` : '', form.notes].filter(Boolean).join('\n') || null,
          eventId: eventId ?? null,
          contactPerson: form.contactPerson || null, contactPhone: form.contactPhone || null,
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

        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="hotel-contact">Contact person</Label>
            <Input id="hotel-contact" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Hotel coordinator name" /></div>
          <div><Label htmlFor="hotel-phone">Contact phone</Label>
            <Input id="hotel-phone" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+254 7XX XXX XXX" /></div>
        </div>

        {/* Assignment type */}
        <div>
          <Label>Assigned to</Label>
          <div className="flex gap-1 bg-[#1F4D3A]/6 p-1 rounded-xl mt-1">
            {(['none', 'individual', 'group'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => setForm(f => ({ ...f, guestType: t, selectedGuestIds: [], groupName: '', groupSize: '' }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${form.guestType === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-[#14161C]/55 hover:text-[#14161C]/70'}`}>
                {t === 'none' ? 'Unassigned' : t === 'individual' ? 'Individual(s)' : 'Group'}
              </button>
            ))}
          </div>
        </div>

        {form.guestType === 'individual' && (
          <div>
            <Label>Select guests</Label>
            <GuestMultiPicker guests={guests} selected={form.selectedGuestIds}
              onChange={ids => setForm(f => ({ ...f, selectedGuestIds: ids }))} />
          </div>
        )}

        {form.guestType === 'group' && (
          <div className="space-y-2">
            <div><Label htmlFor="hotel-grpname">Group name *</Label>
              <Input id="hotel-grpname" value={form.groupName} onChange={e => setForm(f => ({ ...f, groupName: e.target.value }))} placeholder="e.g. Bride's family, Groom's delegation" /></div>
            <div><Label htmlFor="hotel-grpsize">Number of people</Label>
              <Input id="hotel-grpsize" type="number" value={form.groupSize} onChange={e => setForm(f => ({ ...f, groupSize: e.target.value }))} placeholder="8" min="1" /></div>
          </div>
        )}

        <div><Label htmlFor="hotel-notes">Notes</Label>
          <textarea id="hotel-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Breakfast included, special requests, room preferences…" rows={3}
            className="flex w-full rounded-xl border border-[hsl(var(--border))] bg-white px-3.5 py-2 text-sm text-[#14161C] focus:outline-none focus:ring-2 focus:ring-[#1F4D3A]/40 focus:ring-offset-1 focus:border-transparent resize-none" /></div>

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

  const existingNotes = accommodation.notes ?? ''
  const assignedMatch = existingNotes.match(/^Assigned to: (.+?)(?:\n|$)/)
  const assignedLine = assignedMatch?.[1] ?? ''
  const restNotes = existingNotes.replace(/^Assigned to: .+?\n?/, '')
  const groupMatch = assignedLine.match(/^(.+?) \((\d+) people\)$/)

  const { data: guests = [] } = useQuery<{ id: string; name: string; phone?: string | null }[]>({
    queryKey: ['guests', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/guests`); if (!res.ok) return []; return res.json() },
    staleTime: 60_000,
  })

  // Resolve previously saved names back to IDs where possible
  const initialGuestIds = useMemo(() => {
    if (!assignedLine || groupMatch) return []
    return assignedLine.split(', ').map(name => guests.find(g => g.name === name)?.id).filter(Boolean) as string[]
  }, [assignedLine, groupMatch, guests])

  const [form, setForm] = useState({
    hotelName: accommodation.hotelName, address: accommodation.address ?? '',
    checkIn: accommodation.checkIn.slice(0, 10), checkOut: accommodation.checkOut.slice(0, 10),
    roomsBlocked: accommodation.roomsBlocked ? String(accommodation.roomsBlocked) : '',
    notes: restNotes,
    contactPerson: accommodation.contactPerson ?? '', contactPhone: accommodation.contactPhone ?? '',
    guestType: (assignedLine ? (groupMatch ? 'group' : 'individual') : 'none') as 'none' | 'individual' | 'group',
    selectedGuestIds: [] as string[],
    groupName: groupMatch ? groupMatch[1] : '',
    groupSize: groupMatch ? groupMatch[2] : '',
  })

  // Sync guest IDs once guests have loaded (they load async after initial render)
  useEffect(() => {
    if (initialGuestIds.length > 0) {
      setForm(f => ({ ...f, selectedGuestIds: initialGuestIds }))
    }
  }, [initialGuestIds])
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      let assignedTo: string | null = null
      if (form.guestType === 'individual' && form.selectedGuestIds.length > 0) {
        const names = form.selectedGuestIds.map(id => guests.find(g => g.id === id)?.name ?? id)
        assignedTo = names.join(', ')
      } else if (form.guestType === 'group' && form.groupName) {
        assignedTo = `${form.groupName}${form.groupSize ? ` (${form.groupSize} people)` : ''}`
      }
      const res = await fetch(`/api/weddings/${weddingId}/logistics/accommodations/${accommodation.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelName: form.hotelName, address: form.address || null,
          checkIn: form.checkIn, checkOut: form.checkOut,
          roomsBlocked: form.roomsBlocked ? Number.parseInt(form.roomsBlocked) : null,
          notes: [assignedTo ? `Assigned to: ${assignedTo}` : '', form.notes].filter(Boolean).join('\n') || null,
          contactPerson: form.contactPerson || null, contactPhone: form.contactPhone || null,
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

        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="ea-contact">Contact person</Label>
            <Input id="ea-contact" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Hotel coordinator name" /></div>
          <div><Label htmlFor="ea-phone">Contact phone</Label>
            <Input id="ea-phone" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+254 7XX XXX XXX" /></div>
        </div>

        <div>
          <Label>Assigned to</Label>
          <div className="flex gap-1 bg-[#1F4D3A]/6 p-1 rounded-xl mt-1">
            {(['none', 'individual', 'group'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => setForm(f => ({ ...f, guestType: t, selectedGuestIds: [], groupName: '', groupSize: '' }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${form.guestType === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-[#14161C]/55 hover:text-[#14161C]/70'}`}>
                {t === 'none' ? 'Unassigned' : t === 'individual' ? 'Individual(s)' : 'Group'}
              </button>
            ))}
          </div>
        </div>

        {form.guestType === 'individual' && (
          <div>
            <Label>Select guests</Label>
            <GuestMultiPicker guests={guests} selected={form.selectedGuestIds}
              onChange={ids => setForm(f => ({ ...f, selectedGuestIds: ids }))} />
          </div>
        )}

        {form.guestType === 'group' && (
          <div className="space-y-2">
            <div><Label htmlFor="ea-grpname">Group name</Label>
              <Input id="ea-grpname" value={form.groupName} onChange={e => setForm(f => ({ ...f, groupName: e.target.value }))} placeholder="e.g. Bride's family" /></div>
            <div><Label htmlFor="ea-grpsize">Number of people</Label>
              <Input id="ea-grpsize" type="number" value={form.groupSize} onChange={e => setForm(f => ({ ...f, groupSize: e.target.value }))} placeholder="8" min="1" /></div>
          </div>
        )}

        <div><Label htmlFor="ea-notes">Notes</Label>
          <textarea id="ea-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Breakfast included, special requests, room preferences…" rows={3}
            className="flex w-full rounded-xl border border-[hsl(var(--border))] bg-white px-3.5 py-2 text-sm text-[#14161C] focus:outline-none focus:ring-2 focus:ring-[#1F4D3A]/40 focus:ring-offset-1 focus:border-transparent resize-none" /></div>

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
  const [toggling, setToggling] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this route?')) return
    try {
      await fetch(`/api/weddings/${weddingId}/logistics/routes/${route.id}`, { method: 'DELETE' })
      toast('Route deleted', 'success'); onRefresh()
    } catch { toast('Failed to delete route', 'error') }
  }

  const toggleComplete = async () => {
    setToggling(true)
    try {
      await fetch(`/api/weddings/${weddingId}/logistics/routes/${route.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !route.isCompleted }),
      })
      onRefresh()
    } catch { toast('Failed to update', 'error') } finally { setToggling(false) }
  }

  return (
    <>
      <div className={`group flex items-start gap-4 py-4 px-6 border-b border-[#1F4D3A]/8 last:border-0 transition-colors ${route.isCompleted ? 'bg-emerald-50/40' : ''}`}>
        <button onClick={toggleComplete} disabled={toggling}
          className="mt-0.5 flex-shrink-0 text-[#14161C]/25 hover:text-emerald-500 transition-colors disabled:opacity-50"
          aria-label={route.isCompleted ? 'Mark incomplete' : 'Mark complete'}>
          {route.isCompleted
            ? <CheckCircle2 size={18} className="text-emerald-500" />
            : <Circle size={18} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${route.isCompleted ? 'text-[#14161C]/40 line-through' : 'text-[#14161C]'}`}>{route.name}</p>
          <p className="text-xs text-[#14161C]/40 mt-0.5 flex items-center gap-1">
            <MapPin size={10} /> {route.departureLocation} → {route.arrivalLocation}
          </p>
          <p className="text-xs text-[#14161C]/40 flex items-center gap-1">
            <Clock size={10} /> {format(new Date(route.departureTime), 'MMM d, h:mm a')}
            {route.capacity ? ` · ${route.capacity} seats` : ''}
          </p>
          {route.assignedVendor && <p className="text-xs text-[#1F4D3A]/70 mt-0.5">{route.assignedVendor.name}</p>}
          {(route.contactPerson ?? route.contactPhone) && (
            <p className="text-xs text-[#14161C]/55 mt-0.5 flex items-center gap-1">
              📞 {route.contactPerson}{route.contactPerson && route.contactPhone ? ' · ' : ''}{route.contactPhone && <a href={`tel:${route.contactPhone}`} className="text-[#1F4D3A] hover:underline">{route.contactPhone}</a>}
            </p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {route.isCompleted && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full self-center">Done</span>}
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40 hover:text-[#14161C]/60" aria-label="Edit"><Pencil size={13} /></button>
          <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-[#14161C]/40 hover:text-red-500" aria-label="Delete"><Trash2 size={13} /></button>
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
  const [toggling, setToggling] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this accommodation?')) return
    try {
      await fetch(`/api/weddings/${weddingId}/logistics/accommodations/${accommodation.id}`, { method: 'DELETE' })
      toast('Accommodation deleted', 'success'); onRefresh()
    } catch { toast('Failed to delete accommodation', 'error') }
  }

  const toggleComplete = async () => {
    setToggling(true)
    try {
      await fetch(`/api/weddings/${weddingId}/logistics/accommodations/${accommodation.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !accommodation.isCompleted }),
      })
      onRefresh()
    } catch { toast('Failed to update', 'error') } finally { setToggling(false) }
  }

  // Extract assigned-to line from notes for display
  const assignedMatch = accommodation.notes?.match(/^Assigned to: (.+?)(?:\n|$)/)
  const assignedTo = assignedMatch?.[1]
  const restNotes = accommodation.notes?.replace(/^Assigned to: .+?\n?/, '') ?? ''

  return (
    <>
      <div className={`group flex items-start gap-4 py-4 px-6 border-b border-[#1F4D3A]/8 last:border-0 transition-colors ${accommodation.isCompleted ? 'bg-emerald-50/40' : ''}`}>
        <button onClick={toggleComplete} disabled={toggling}
          className="mt-0.5 flex-shrink-0 text-[#14161C]/25 hover:text-emerald-500 transition-colors disabled:opacity-50"
          aria-label={accommodation.isCompleted ? 'Mark incomplete' : 'Mark complete'}>
          {accommodation.isCompleted
            ? <CheckCircle2 size={18} className="text-emerald-500" />
            : <Circle size={18} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${accommodation.isCompleted ? 'text-[#14161C]/40 line-through' : 'text-[#14161C]'}`}>{accommodation.hotelName}</p>
          {accommodation.address && (
            <p className="text-xs text-[#14161C]/40 mt-0.5 flex items-center gap-1"><MapPin size={10} /> {accommodation.address}</p>
          )}
          <p className="text-xs text-[#14161C]/40">
            {format(new Date(accommodation.checkIn), 'MMM d')} – {format(new Date(accommodation.checkOut), 'MMM d, yyyy')}
            {accommodation.roomsBlocked ? ` · ${accommodation.roomsBlocked} rooms` : ''}
          </p>
          {assignedTo && <p className="text-xs text-[#1F4D3A]/70 mt-0.5">👤 {assignedTo}</p>}
          {(accommodation.contactPerson ?? accommodation.contactPhone) && (
            <p className="text-xs text-[#14161C]/55 mt-0.5 flex items-center gap-1">
              📞 {accommodation.contactPerson}{accommodation.contactPerson && accommodation.contactPhone ? ' · ' : ''}{accommodation.contactPhone && <a href={`tel:${accommodation.contactPhone}`} className="text-[#1F4D3A] hover:underline">{accommodation.contactPhone}</a>}
            </p>
          )}
          {restNotes && <p className="text-xs text-[#14161C]/40 mt-0.5 italic">{restNotes}</p>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {accommodation.isCompleted && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full self-center">Done</span>}
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40 hover:text-[#14161C]/60" aria-label="Edit"><Pencil size={13} /></button>
          <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-[#14161C]/40 hover:text-red-500" aria-label="Delete"><Trash2 size={13} /></button>
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
    <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
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
    <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
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

  const tabs = [
    { key: 'transport', label: 'Transport', icon: <Truck size={13} /> },
    { key: 'accommodation', label: 'Accommodation', icon: <Hotel size={13} /> }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Tabs
          tabs={tabs}
          activeTab={subTab}
          onTabChange={(key) => setSubTab(key as 'transport' | 'accommodation')}
          variant="pills"
        />
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
