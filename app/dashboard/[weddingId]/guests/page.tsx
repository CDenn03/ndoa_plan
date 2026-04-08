'use client'
import { useState, useMemo, use } from 'react'
import { Users, Search, Plus, UserCheck, X, Star } from 'lucide-react'
import { Button, Input, Select, Label, EmptyState, Spinner, Modal, Badge } from '@/components/ui'
import { useGuests, useGuestStats, useUpdateGuestRsvp, useCheckInGuest, useAddGuest } from '@/hooks/use-guests'
import { useWeddingStore } from '@/store/wedding-store'
import type { LocalGuest } from '@/types'

const RSVP_BADGE: Record<string, 'confirmed' | 'declined' | 'pending' | 'maybe'> = {
  CONFIRMED: 'confirmed', DECLINED: 'declined', PENDING: 'pending', MAYBE: 'maybe', WAITLISTED: 'pending',
}

const PRIORITY_COLORS: Record<string, string> = {
  VIP: 'text-amber-500', GENERAL: 'text-zinc-400', OVERFLOW: 'text-zinc-300',
}

const TAG_COLORS: Record<string, string> = {
  VIP: 'bg-amber-50 text-amber-700', Family: 'bg-violet-50 text-violet-700',
  Work: 'bg-sky-50 text-sky-700', Committee: 'bg-emerald-50 text-emerald-700',
  'Out-of-town': 'bg-orange-50 text-orange-700', 'Bridal Party': 'bg-pink-50 text-pink-700',
}

function GuestRow({ guest, weddingId }: Readonly<{ guest: LocalGuest; weddingId: string }>) {
  const updateRsvp = useUpdateGuestRsvp(weddingId)
  const checkIn = useCheckInGuest(weddingId)
  const extGuest = guest as LocalGuest & { priority?: string; plusOneOf?: string }

  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-zinc-100 last:border-0 hover:bg-stone-50 transition-colors px-6">
      <div className="w-9 h-9 rounded-full bg-[#CDB5F7]/20 flex items-center justify-center text-xs font-bold text-violet-600 flex-shrink-0 relative">
        {guest.name.charAt(0).toUpperCase()}
        {extGuest.priority === 'VIP' && (
          <Star size={9} className="absolute -top-0.5 -right-0.5 text-amber-500 fill-amber-500" />
        )}
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
          {guest.tableNumber && <p className="text-xs text-zinc-400">Table {guest.tableNumber}</p>}
          {guest.mealPref && <p className="text-xs text-zinc-400">🍽 {guest.mealPref}</p>}
          {guest.tags && guest.tags.length > 0 && guest.tags.map(tag => (
            <span key={tag} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TAG_COLORS[tag] ?? 'bg-zinc-100 text-zinc-500'}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant={RSVP_BADGE[guest.rsvpStatus] ?? 'default'}>{guest.rsvpStatus}</Badge>
        <select
          value={guest.rsvpStatus}
          onChange={e => updateRsvp.mutate({ guestId: guest.id, rsvpStatus: e.target.value as LocalGuest['rsvpStatus'], currentVersion: guest.version })}
          className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 bg-white text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-400 appearance-none cursor-pointer"
          disabled={updateRsvp.isPending}
          aria-label="Update RSVP status"
        >
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
      </div>
    </div>
  )
}

const PRESET_TAGS = ['VIP', 'Family', 'Work', 'Committee', 'Out-of-town', 'Bridal Party']

function AddGuestModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const addGuest = useAddGuest(weddingId)
  const [form, setForm] = useState({
    name: '', phone: '', email: '', side: 'BOTH', tableNumber: '',
    mealPref: '', priority: 'GENERAL', tags: [] as string[], plusOneAllowed: false,
  })

  const toggleTag = (tag: string) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await addGuest.mutateAsync({
      weddingId, name: form.name.trim(),
      phone: form.phone || undefined, email: form.email || undefined,
      side: form.side as LocalGuest['side'],
      tableNumber: form.tableNumber ? parseInt(form.tableNumber) : undefined,
      rsvpStatus: 'PENDING', checkedIn: false,
    })
    onClose()
  }

  return (
    <Modal onClose={onClose} title="Add guest">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="guest-name">Full name *</Label>
          <Input id="guest-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="guest-phone">Phone</Label>
            <Input id="guest-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254…" />
          </div>
          <div>
            <Label htmlFor="guest-table">Table #</Label>
            <Input id="guest-table" type="number" value={form.tableNumber} onChange={e => setForm(f => ({ ...f, tableNumber: e.target.value }))} placeholder="1" min="1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="guest-side">Side</Label>
            <Select id="guest-side" value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value }))}>
              <option value="BOTH">Both sides</option>
              <option value="BRIDE">Bride&apos;s side</option>
              <option value="GROOM">Groom&apos;s side</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="guest-priority">Priority</Label>
            <Select id="guest-priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="VIP">VIP</option>
              <option value="GENERAL">General</option>
              <option value="OVERFLOW">Overflow</option>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="guest-meal">Meal preference</Label>
          <Input id="guest-meal" value={form.mealPref} onChange={e => setForm(f => ({ ...f, mealPref: e.target.value }))} placeholder="e.g. Vegetarian, Halal" />
        </div>
        <div>
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {PRESET_TAGS.map(tag => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  form.tags.includes(tag) ? 'bg-violet-100 text-violet-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                }`}>
                {tag}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
          <input type="checkbox" checked={form.plusOneAllowed} onChange={e => setForm(f => ({ ...f, plusOneAllowed: e.target.checked }))} className="rounded" />
          Allow plus-one
        </label>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={addGuest.isPending}>{addGuest.isPending ? 'Adding…' : 'Add guest'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function GuestsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: guests = [], isLoading } = useGuests(wid)
  const stats = useGuestStats(wid)
  const { guestFilter, setGuestFilter } = useWeddingStore()
  const [showAdd, setShowAdd] = useState(false)

  const filtered = useMemo(() => guests.filter(g => {
    if (guestFilter.search && !g.name.toLowerCase().includes(guestFilter.search.toLowerCase())) return false
    if (guestFilter.rsvpStatus !== 'all' && g.rsvpStatus !== guestFilter.rsvpStatus) return false
    if (guestFilter.side !== 'all' && g.side !== guestFilter.side) return false
    return true
  }), [guests, guestFilter])

  const hasFilter = guestFilter.search || guestFilter.rsvpStatus !== 'all' || guestFilter.side !== 'all'

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-4xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">People</p>
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Guests</h1>
            <p className="text-sm text-zinc-400 mt-2">{stats.total} invited · {stats.confirmed} confirmed</p>
          </div>
          <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} /> Add guest</Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-zinc-100">
          {[
            { label: 'Confirmed', val: stats.confirmed, color: 'text-emerald-600' },
            { label: 'Pending', val: stats.pending, color: 'text-amber-500' },
            { label: 'Declined', val: stats.declined, color: 'text-red-500' },
            { label: 'Checked in', val: stats.checkedIn, color: 'text-sky-600' },
          ].map(({ label, val, color }, i) => (
            <div key={label} className={i === 0 ? 'pr-8' : i === 3 ? 'pl-8' : 'px-8'}>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-3xl font-extrabold leading-none ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input value={guestFilter.search} onChange={e => setGuestFilter({ search: e.target.value })} placeholder="Search guests…" className="pl-9" />
          </div>
          <Select value={guestFilter.rsvpStatus} onChange={e => setGuestFilter({ rsvpStatus: e.target.value })} className="w-auto" aria-label="Filter by RSVP">
            <option value="all">All RSVPs</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="DECLINED">Declined</option>
            <option value="MAYBE">Maybe</option>
          </Select>
          <Select value={guestFilter.side} onChange={e => setGuestFilter({ side: e.target.value })} className="w-auto" aria-label="Filter by side">
            <option value="all">All sides</option>
            <option value="BRIDE">Bride</option>
            <option value="GROOM">Groom</option>
            <option value="BOTH">Both</option>
          </Select>
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={() => setGuestFilter({ search: '', rsvpStatus: 'all', side: 'all' })}>
              <X size={13} /> Clear
            </Button>
          )}
        </div>

        {/* Guest list */}
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#14161C]">{filtered.length} guest{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Users size={40} />}
              title="No guests found"
              description={guests.length === 0 ? 'Add your first guest to get started' : 'Try adjusting your filters'}
              action={guests.length === 0 ? <Button onClick={() => setShowAdd(true)}><Plus size={14} />Add guest</Button> : undefined}
            />
          ) : (
            filtered.map(g => <GuestRow key={g.id} guest={g} weddingId={wid} />)
          )}
        </div>
      </div>

      {showAdd && <AddGuestModal weddingId={wid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
