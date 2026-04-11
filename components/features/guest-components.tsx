'use client'
import { useState, useMemo } from 'react'
import { Users, Search, Plus, UserCheck, Star, Pencil, Trash2, X, CalendarDays } from 'lucide-react'
import { Button, Input, Select, Label, EmptyState, Spinner, Modal, Badge } from '@/components/ui'
import { useGuests, useUpdateGuestRsvp, useCheckInGuest, useAddGuest } from '@/hooks/use-guests'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import type { LocalGuest } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventAttendance {
  id: string; rsvpStatus: string
  guest: { id: string; name: string; phone?: string | null; side: string; rsvpStatus: string; checkedIn: boolean; mealPref?: string | null; tags: string[] }
}

export const PRESET_TAGS = ['VIP', 'Family', 'Work', 'Committee', 'Out-of-town', 'Bridal Party']

export const RSVP_BADGE: Record<string, 'confirmed' | 'declined' | 'pending' | 'maybe'> = {
  CONFIRMED: 'confirmed', DECLINED: 'declined', PENDING: 'pending', MAYBE: 'maybe', WAITLISTED: 'pending',
}

const TAG_COLORS: Record<string, string> = {
  VIP: 'bg-amber-50 text-amber-700', Family: 'bg-violet-50 text-violet-700',
  Work: 'bg-sky-50 text-sky-700', Committee: 'bg-emerald-50 text-emerald-700',
  'Out-of-town': 'bg-orange-50 text-orange-700', 'Bridal Party': 'bg-pink-50 text-pink-700',
}

// ─── Add Guest Modal ──────────────────────────────────────────────────────────

export function AddGuestModal({ weddingId, eventId, onClose, onDone }: Readonly<{
  weddingId: string; eventId?: string; onClose: () => void; onDone?: () => void
}>) {
  const addGuest = useAddGuest(weddingId)
  const qc = useQueryClient()
  const { toast } = useToast()
  const [tab, setTab] = useState<'new' | 'existing'>('new')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', side: 'BOTH', mealPref: '', priority: 'GENERAL', tags: [] as string[], plusOneAllowed: false })
  const [selectedGuestId, setSelectedGuestId] = useState('')

  const { data: allGuests = [] } = useQuery<LocalGuest[]>({
    queryKey: ['guests', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/guests`); if (!res.ok) return []; return res.json() as Promise<LocalGuest[]> },
    staleTime: 30_000,
    enabled: !!eventId, // only needed when adding to event
  })

  const toggleTag = (tag: string) => setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      if (eventId) {
        // Add to event attendance
        const payload = tab === 'existing'
          ? { guestId: selectedGuestId }
          : { name: form.name.trim(), phone: form.phone || undefined, side: form.side }
        await fetch(`/api/weddings/${weddingId}/events/${eventId}/attendances`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        await qc.invalidateQueries({ queryKey: ['attendances', weddingId, eventId] })
        toast('Guest added to event', 'success')
      } else {
        await addGuest.mutateAsync({ weddingId, name: form.name.trim(), phone: form.phone || undefined, email: form.email || undefined, side: form.side as LocalGuest['side'], rsvpStatus: 'PENDING', checkedIn: false })
        toast('Guest added', 'success')
      }
      onDone?.(); onClose()
    } catch { toast('Failed to add guest', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title={eventId ? 'Add guest to event' : 'Add guest'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {eventId && (
          <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
            {(['new', 'existing'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {t === 'new' ? 'New guest' : 'Existing guest'}
              </button>
            ))}
          </div>
        )}

        {tab === 'existing' && eventId ? (
          <div>
            <Label htmlFor="ag-existing">Select guest *</Label>
            <Select id="ag-existing" value={selectedGuestId} onChange={e => setSelectedGuestId(e.target.value)} required>
              <option value="">Choose a guest…</option>
              {allGuests.map(g => <option key={g.id} value={g.id}>{g.name}{g.phone ? ` · ${g.phone}` : ''}</option>)}
            </Select>
          </div>
        ) : (
          <>
            <div><Label htmlFor="ag-name">Full name *</Label>
              <Input id="ag-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="ag-phone">Phone</Label>
                <Input id="ag-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254…" /></div>
              <div><Label htmlFor="ag-side">Side</Label>
                <Select id="ag-side" value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value }))}>
                  <option value="BOTH">Both sides</option>
                  <option value="BRIDE">Bride&apos;s side</option>
                  <option value="GROOM">Groom&apos;s side</option>
                </Select></div>
            </div>
            {!eventId && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label htmlFor="ag-meal">Meal preference</Label>
                    <Input id="ag-meal" value={form.mealPref} onChange={e => setForm(f => ({ ...f, mealPref: e.target.value }))} placeholder="e.g. Vegetarian" /></div>
                  <div><Label htmlFor="ag-priority">Priority</Label>
                    <Select id="ag-priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      <option value="VIP">VIP</option>
                      <option value="GENERAL">General</option>
                      <option value="OVERFLOW">Overflow</option>
                    </Select></div>
                </div>
                <div><Label>Tags</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {PRESET_TAGS.map(tag => (
                      <button key={tag} type="button" onClick={() => toggleTag(tag)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${form.tags.includes(tag) ? 'bg-violet-100 text-violet-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving || addGuest.isPending}>
            {saving || addGuest.isPending ? 'Adding…' : 'Add guest'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Edit Guest Modal ─────────────────────────────────────────────────────────

export function EditGuestModal({ guest, weddingId, onClose }: Readonly<{ guest: LocalGuest; weddingId: string; onClose: () => void }>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: guest.name, phone: guest.phone ?? '', side: guest.side ?? 'BOTH',
    mealPref: guest.mealPref ?? '', notes: guest.notes ?? '', tags: guest.tags ?? [],
  })

  const toggleTag = (tag: string) => setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      await fetch(`/api/weddings/${weddingId}/guests/${guest.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, phone: form.phone || null, side: form.side, mealPref: form.mealPref || null, notes: form.notes || null, tags: form.tags }),
      })
      await qc.invalidateQueries({ queryKey: ['guests', weddingId] })
      toast('Guest updated', 'success'); onClose()
    } catch { toast('Failed to update guest', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Edit guest">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="eg-name">Full name *</Label>
          <Input id="eg-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="eg-phone">Phone</Label>
            <Input id="eg-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div><Label htmlFor="eg-side">Side</Label>
            <Select id="eg-side" value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value }))}>
              <option value="BOTH">Both sides</option>
              <option value="BRIDE">Bride&apos;s side</option>
              <option value="GROOM">Groom&apos;s side</option>
            </Select></div>
        </div>
        <div><Label htmlFor="eg-meal">Meal preference</Label>
          <Input id="eg-meal" value={form.mealPref} onChange={e => setForm(f => ({ ...f, mealPref: e.target.value }))} placeholder="e.g. Vegetarian" /></div>
        <div><Label htmlFor="eg-notes">Notes</Label>
          <Input id="eg-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        <div><Label>Tags</Label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {PRESET_TAGS.map(tag => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${form.tags.includes(tag) ? 'bg-violet-100 text-violet-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Guest Row (for the main guests page) ────────────────────────────────────

export function GuestRow({ guest, weddingId }: Readonly<{ guest: LocalGuest; weddingId: string }>) {
  const updateRsvp = useUpdateGuestRsvp(weddingId)
  const checkIn = useCheckInGuest(weddingId)
  const qc = useQueryClient()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const extGuest = guest as LocalGuest & { priority?: string; plusOneOf?: string }

  const handleDelete = async () => {
    if (!confirm(`Remove ${guest.name} from guest list?`)) return
    try {
      await fetch(`/api/weddings/${weddingId}/guests/${guest.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['guests', weddingId] })
      toast('Guest removed', 'success')
    } catch { toast('Failed to remove guest', 'error') }
  }

  return (
    <>
      <div className="group flex items-center gap-4 py-3.5 border-b border-zinc-100 last:border-0 hover:bg-stone-50 transition-colors px-6">
        <div className="w-9 h-9 rounded-full bg-[#CDB5F7]/20 flex items-center justify-center text-xs font-bold text-violet-600 flex-shrink-0 relative">
          {guest.name.charAt(0).toUpperCase()}
          {extGuest.priority === 'VIP' && <Star size={9} className="absolute -top-0.5 -right-0.5 text-amber-500 fill-amber-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#14161C] truncate">{guest.name}</p>
            {extGuest.plusOneOf && <span className="text-[11px] text-zinc-400">+1</span>}
            {guest.checkedIn && <span className="text-[11px] font-semibold text-emerald-500">✓ Checked in</span>}
            {guest.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Pending sync" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {guest.phone && <p className="text-xs text-zinc-400">{guest.phone}</p>}
            {guest.mealPref && <p className="text-xs text-zinc-400">🍽 {guest.mealPref}</p>}
            {guest.tags?.map(tag => (
              <span key={tag} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TAG_COLORS[tag] ?? 'bg-zinc-100 text-zinc-500'}`}>{tag}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={RSVP_BADGE[guest.rsvpStatus] ?? 'default'}>{guest.rsvpStatus}</Badge>
          <select value={guest.rsvpStatus}
            onChange={e => updateRsvp.mutate({ guestId: guest.id, rsvpStatus: e.target.value as LocalGuest['rsvpStatus'], currentVersion: guest.version })}
            className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 bg-white text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-400 appearance-none cursor-pointer"
            disabled={updateRsvp.isPending} aria-label="Update RSVP status">
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="DECLINED">Declined</option>
            <option value="MAYBE">Maybe</option>
            <option value="WAITLISTED">Waitlisted</option>
          </select>
          {!guest.checkedIn && guest.rsvpStatus === 'CONFIRMED' && (
            <Button size="icon" variant="ghost" onClick={() => checkIn.mutate({ guestId: guest.id, currentVersion: guest.version })} disabled={checkIn.isPending} title="Check in">
              <UserCheck size={14} />
            </Button>
          )}
          <div className="flex items-center gap-1 ">
            <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors" aria-label="Edit guest"><Pencil size={13} /></button>
            <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors" aria-label="Remove guest"><Trash2 size={13} /></button>
          </div>
        </div>
      </div>
      {editing && <EditGuestModal guest={guest} weddingId={weddingId} onClose={() => setEditing(false)} />}
    </>
  )
}

// ─── Event Attendance Row (for event detail guests tab) ───────────────────────

export function AttendanceRow({ attendance, weddingId, eventId, onRefresh }: Readonly<{
  attendance: EventAttendance; weddingId: string; eventId: string; onRefresh: () => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)

  const updateRsvp = async (rsvpStatus: string) => {
    setSaving(true)
    try {
      await fetch(`/api/weddings/${weddingId}/events/${eventId}/attendances/${attendance.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rsvpStatus }),
      })
      await qc.invalidateQueries({ queryKey: ['attendances', weddingId, eventId] })
    } catch { toast('Failed to update RSVP', 'error') } finally { setSaving(false) }
  }

  const remove = async () => {
    if (!confirm(`Remove ${attendance.guest.name} from this event?`)) return
    try {
      await fetch(`/api/weddings/${weddingId}/events/${eventId}/attendances/${attendance.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['attendances', weddingId, eventId] })
      toast('Guest removed from event', 'success')
      onRefresh()
    } catch { toast('Failed to remove guest', 'error') }
  }

  const g = attendance.guest
  return (
    <div className="group flex items-center gap-4 py-3.5 border-b border-zinc-100 last:border-0 hover:bg-stone-50 transition-colors px-4">
      <div className="w-8 h-8 rounded-full bg-[#CDB5F7]/20 flex items-center justify-center text-xs font-bold text-violet-600 flex-shrink-0">
        {g.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#14161C] truncate">{g.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-zinc-400">{g.side}</span>
          {g.phone && <span className="text-xs text-zinc-400">{g.phone}</span>}
          {g.mealPref && <span className="text-xs text-zinc-400">🍽 {g.mealPref}</span>}
          {g.checkedIn && <span className="text-[11px] font-semibold text-emerald-500">✓ Checked in</span>}
          {g.tags?.map(tag => (
            <span key={tag} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TAG_COLORS[tag] ?? 'bg-zinc-100 text-zinc-500'}`}>{tag}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant={RSVP_BADGE[attendance.rsvpStatus] ?? 'default'}>{attendance.rsvpStatus}</Badge>
        <select value={attendance.rsvpStatus} onChange={e => void updateRsvp(e.target.value)} disabled={saving}
          className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 bg-white text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-400 appearance-none cursor-pointer"
          aria-label="Update RSVP">
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="DECLINED">Declined</option>
          <option value="MAYBE">Maybe</option>
          <option value="WAITLISTED">Waitlisted</option>
        </select>
        <button onClick={remove} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 " aria-label="Remove from event">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Event Guests Tab (full CRUD per event) ───────────────────────────────────

export function EventGuestsTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [rsvpFilter, setRsvpFilter] = useState('all')

  // Expected guests — stored in localStorage per event, no schema change needed
  const storageKey = `expected-guests:${weddingId}:${eventId}`
  const [expectedInput, setExpectedInput] = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(storageKey) ?? ''
  })
  const expected = Number.parseInt(expectedInput) || 0

  const saveExpected = (val: string) => {
    setExpectedInput(val)
    if (typeof window !== 'undefined') {
      if (val) localStorage.setItem(storageKey, val)
      else localStorage.removeItem(storageKey)
    }
  }

  const { data: attendances = [], isLoading } = useQuery<EventAttendance[]>({
    queryKey: ['attendances', weddingId, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/attendances`)
      if (!res.ok) throw new Error('Failed to load')
      return res.json() as Promise<EventAttendance[]>
    },
    staleTime: 30_000,
  })

  const filtered = useMemo(() => attendances.filter(a => {
    if (search && !a.guest.name.toLowerCase().includes(search.toLowerCase())) return false
    if (rsvpFilter !== 'all' && a.rsvpStatus !== rsvpFilter) return false
    return true
  }), [attendances, search, rsvpFilter])

  const confirmed = attendances.filter(a => a.rsvpStatus === 'CONFIRMED').length
  const pending = attendances.filter(a => a.rsvpStatus === 'PENDING').length
  const declined = attendances.filter(a => a.rsvpStatus === 'DECLINED').length
  const checkedIn = attendances.filter(a => a.guest.checkedIn).length

  // Delta vs expected
  const delta = expected > 0 ? confirmed - expected : null

  const refresh = () => void qc.invalidateQueries({ queryKey: ['attendances', weddingId, eventId] })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-0 divide-x divide-zinc-100">
        {[
          { label: 'Confirmed', val: confirmed, color: 'text-emerald-600' },
          { label: 'Pending', val: pending, color: 'text-amber-500' },
          { label: 'Declined', val: declined, color: 'text-red-500' },
          { label: 'Checked in', val: checkedIn, color: 'text-sky-600' },
        ].map(({ label, val, color }, i) => (
          <div key={label} className={i === 0 ? 'pr-4' : i === 3 ? 'pl-4' : 'px-4'}>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className={`text-2xl font-extrabold leading-none ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Expected guests input */}
      <div className="flex items-center gap-3 bg-zinc-50 rounded-xl px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-zinc-500 mb-1">Expected guests</p>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" value={expectedInput}
              onChange={e => saveExpected(e.target.value)}
              placeholder="Set target…"
              className="w-18 text-sm font-semibold bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300 text-[#14161C]"
            />
            {expected > 0 && (
              <span className={`text-xs font-semibold ${
                delta === null ? 'text-zinc-400' :
                delta > 0 ? 'text-amber-500' :
                delta < 0 ? 'text-zinc-400' :
                'text-emerald-600'
              }`}>
                {delta === null ? '' :
                 delta > 0 ? `${delta} over target` :
                 delta < 0 ? `${Math.abs(delta)} below target` :
                 'On target'}
              </span>
            )}
          </div>
        </div>
        {expected > 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-zinc-400">Confirmed / Expected</p>
            <p className="text-sm font-bold text-[#14161C]">{confirmed} / {expected}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{expected > 0 ? Math.round((confirmed / expected) * 100) : 0}% filled</p>
          </div>
        )}
      </div>

      {/* Filters + Add */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-36">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-8 text-sm" />
        </div>
        <Select value={rsvpFilter} onChange={e => setRsvpFilter(e.target.value)} className="w-auto text-sm" aria-label="Filter RSVP">
          <option value="all">All RSVPs</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PENDING">Pending</option>
          <option value="DECLINED">Declined</option>
          <option value="MAYBE">Maybe</option>
        </Select>
        {(search || rsvpFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setRsvpFilter('all') }}><X size={12} /> Clear</Button>
        )}
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={13} /> Add guest</Button>
      </div>

      {/* List */}
      {attendances.length === 0 ? (
        <EmptyState icon={<Users size={32} className="text-zinc-200" />} title="No guests for this event"
          description="Add guests or link existing ones to track attendance"
          action={<Button size="sm" onClick={() => setShowAdd(true)}><Plus size={13} /> Add guest</Button>} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users size={32} className="text-zinc-200" />} title="No guests match" description="Try adjusting your filters" />
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          {filtered.map(a => <AttendanceRow key={a.id} attendance={a} weddingId={weddingId} eventId={eventId} onRefresh={refresh} />)}
        </div>
      )}

      {showAdd && <AddGuestModal weddingId={weddingId} eventId={eventId} onClose={() => setShowAdd(false)} onDone={refresh} />}
    </div>
  )
}

// ─── Overall guests tab with per-event breakdown ──────────────────────────────

interface WeddingEvent { id: string; name: string; type: string; date: string }

export function GuestsOverallTab({ weddingId, events }: Readonly<{ weddingId: string; events: WeddingEvent[] }>) {
  const { data: guests = [], isLoading } = useGuests(weddingId)

  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent; count: number; confirmed: number }>()
    for (const e of events) map.set(e.id, { event: e, count: 0, confirmed: 0 })
    return map
  }, [events])

  const confirmed = guests.filter(g => g.rsvpStatus === 'CONFIRMED').length
  const pending = guests.filter(g => g.rsvpStatus === 'PENDING').length
  const declined = guests.filter(g => g.rsvpStatus === 'DECLINED').length
  const checkedIn = guests.filter(g => g.checkedIn).length

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-zinc-100">
        {[
          { label: 'Confirmed', val: confirmed, color: 'text-emerald-600' },
          { label: 'Pending', val: pending, color: 'text-amber-500' },
          { label: 'Declined', val: declined, color: 'text-red-500' },
          { label: 'Checked in', val: checkedIn, color: 'text-sky-600' },
        ].map(({ label, val, color }, i) => (
          <div key={label} className={i === 0 ? 'pr-8' : i === 3 ? 'pl-8' : 'px-8'}>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-3xl font-extrabold leading-none ${color}`}>{val}</p>
          </div>
        ))}
      </div>
      {events.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">By event</p>
          {Array.from(byEvent.values()).map(({ event }) => (
            <EventAttendanceSummary key={event.id} weddingId={weddingId} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventAttendanceSummary({ weddingId, event }: Readonly<{ weddingId: string; event: WeddingEvent }>) {
  const { data: attendances = [] } = useQuery<EventAttendance[]>({
    queryKey: ['attendances', weddingId, event.id],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/events/${event.id}/attendances`)
      if (!res.ok) return []
      return res.json() as Promise<EventAttendance[]>
    },
    staleTime: 60_000,
  })
  const confirmed = attendances.filter(a => a.rsvpStatus === 'CONFIRMED').length
  return (
    <div className="rounded-2xl border border-zinc-100 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <CalendarDays size={15} className="text-zinc-400" />
        <p className="text-sm font-bold text-[#14161C]">{event.name}</p>
        <span className="text-xs text-zinc-400">{attendances.length} guests</span>
      </div>
      <div className="flex gap-6 text-right">
        <div><p className="text-xs text-zinc-400">Confirmed</p><p className="text-sm font-bold text-emerald-600">{confirmed}</p></div>
        <div><p className="text-xs text-zinc-400">Total</p><p className="text-sm font-bold text-zinc-500">{attendances.length}</p></div>
      </div>
    </div>
  )
}
