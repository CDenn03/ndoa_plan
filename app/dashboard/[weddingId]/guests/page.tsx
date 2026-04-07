'use client'
import { useState, useMemo } from 'react'
import { Users, Search, Plus, UserCheck, Download, X } from 'lucide-react'
import { Button, Input, Select, Badge, Card, CardHeader, CardContent, CardTitle, StatCard, EmptyState, Spinner } from '@/components/ui'
import { useGuests, useGuestStats, useUpdateGuestRsvp, useCheckInGuest, useAddGuest } from '@/hooks/use-guests'
import { useWeddingStore } from '@/store/wedding-store'
import type { LocalGuest } from '@/types'

const RSVP_BADGE: Record<string, 'confirmed' | 'declined' | 'pending' | 'maybe'> = {
  CONFIRMED: 'confirmed', DECLINED: 'declined', PENDING: 'pending', MAYBE: 'maybe', WAITLISTED: 'pending',
}

function GuestRow({ guest, weddingId }: { guest: LocalGuest; weddingId: string }) {
  const updateRsvp = useUpdateGuestRsvp(weddingId)
  const checkIn = useCheckInGuest(weddingId)

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 last:border-0 transition-colors">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs font-semibold text-violet-600 dark:text-violet-400 flex-shrink-0">
        {guest.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{guest.name}</p>
          {guest.checkedIn && <span className="text-xs text-green-500">✓ In</span>}
          {guest.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Pending sync" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {guest.phone && <p className="text-xs text-zinc-400 truncate">{guest.phone}</p>}
          {guest.tableNumber && <p className="text-xs text-zinc-400">Table {guest.tableNumber}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <select
          value={guest.rsvpStatus}
          onChange={e => updateRsvp.mutate({ guestId: guest.id, rsvpStatus: e.target.value as LocalGuest['rsvpStatus'], currentVersion: guest.version })}
          className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
          disabled={updateRsvp.isPending}
        >
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="DECLINED">Declined</option>
          <option value="MAYBE">Maybe</option>
          <option value="WAITLISTED">Waitlisted</option>
        </select>

        {!guest.checkedIn && guest.rsvpStatus === 'CONFIRMED' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => checkIn.mutate({ guestId: guest.id, currentVersion: guest.version })}
            disabled={checkIn.isPending}
            title="Check in"
          >
            <UserCheck size={14} />
          </Button>
        )}
      </div>
    </div>
  )
}

function AddGuestModal({ weddingId, onClose }: { weddingId: string; onClose: () => void }) {
  const addGuest = useAddGuest(weddingId)
  const [form, setForm] = useState({ name: '', phone: '', email: '', side: 'BOTH', tableNumber: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await addGuest.mutateAsync({
      weddingId,
      name: form.name.trim(),
      phone: form.phone || undefined,
      email: form.email || undefined,
      side: form.side as LocalGuest['side'],
      tableNumber: form.tableNumber ? parseInt(form.tableNumber) : undefined,
      rsvpStatus: 'PENDING',
      checkedIn: false,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Add guest</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Full name *</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Phone</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Table #</label>
              <Input type="number" value={form.tableNumber} onChange={e => setForm(f => ({ ...f, tableNumber: e.target.value }))} placeholder="1" min="1" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Side</label>
            <Select value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value }))}>
              <option value="BOTH">Both sides</option>
              <option value="BRIDE">Bride's side</option>
              <option value="GROOM">Groom's side</option>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={addGuest.isPending}>
              {addGuest.isPending ? 'Adding...' : 'Add guest'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function GuestsPage({ params }: { params: { weddingId: string } }) {
  const wid = params.weddingId
  const { data: guests = [], isLoading } = useGuests(wid)
  const stats = useGuestStats(wid)
  const { guestFilter, setGuestFilter } = useWeddingStore()
  const [showAdd, setShowAdd] = useState(false)

  const filtered = useMemo(() => {
    return guests.filter(g => {
      if (guestFilter.search && !g.name.toLowerCase().includes(guestFilter.search.toLowerCase())) return false
      if (guestFilter.rsvpStatus !== 'all' && g.rsvpStatus !== guestFilter.rsvpStatus) return false
      if (guestFilter.side !== 'all' && g.side !== guestFilter.side) return false
      return true
    })
  }, [guests, guestFilter])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Guests</h1>
          <p className="text-sm text-zinc-500">{stats.total} invited · {stats.confirmed} confirmed</p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus size={15} /> Add guest
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Confirmed" value={stats.confirmed} color="green" />
        <StatCard label="Pending" value={stats.pending} color="amber" />
        <StatCard label="Declined" value={stats.declined} color="red" />
        <StatCard label="Checked in" value={stats.checkedIn} color="blue" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input value={guestFilter.search} onChange={e => setGuestFilter({ search: e.target.value })} placeholder="Search guests..." className="pl-8" />
        </div>
        <Select value={guestFilter.rsvpStatus} onChange={e => setGuestFilter({ rsvpStatus: e.target.value })} className="w-auto">
          <option value="all">All RSVPs</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PENDING">Pending</option>
          <option value="DECLINED">Declined</option>
          <option value="MAYBE">Maybe</option>
        </Select>
        <Select value={guestFilter.side} onChange={e => setGuestFilter({ side: e.target.value })} className="w-auto">
          <option value="all">All sides</option>
          <option value="BRIDE">Bride</option>
          <option value="GROOM">Groom</option>
          <option value="BOTH">Both</option>
        </Select>
        {(guestFilter.search || guestFilter.rsvpStatus !== 'all' || guestFilter.side !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => setGuestFilter({ search: '', rsvpStatus: 'all', side: 'all' })}>
            <X size={14} /> Clear
          </Button>
        )}
      </div>

      {/* Guest list */}
      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} guest{filtered.length !== 1 ? 's' : ''}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Users size={40} />}
              title="No guests found"
              description={guests.length === 0 ? "Add your first guest to get started" : "Try adjusting your filters"}
              action={guests.length === 0 ? <Button onClick={() => setShowAdd(true)}><Plus size={15} />Add guest</Button> : undefined}
            />
          ) : (
            <div>
              {filtered.map(g => <GuestRow key={g.id} guest={g} weddingId={wid} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {showAdd && <AddGuestModal weddingId={wid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
