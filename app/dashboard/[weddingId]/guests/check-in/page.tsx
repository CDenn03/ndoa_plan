'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, UserCheck, Users, Wifi, WifiOff } from 'lucide-react'
import { Input, StatCard } from '@/components/ui'
import { useGuests, useCheckInGuest, useGuestStats } from '@/hooks/use-guests'
import { useSync } from '@/components/sync-provider'
import type { LocalGuest } from '@/types'

// Day-of check-in page — full-screen, optimised for mobile at venue door.
// Works fully offline. Check-ins queue and sync automatically.

function CheckInRow({ guest, weddingId, onCheckedIn }: { guest: LocalGuest; weddingId: string; onCheckedIn: () => void }) {
  const checkIn = useCheckInGuest(weddingId)
  const [justCheckedIn, setJustCheckedIn] = useState(false)

  const handleCheckIn = async () => {
    if (guest.checkedIn || justCheckedIn) return
    await checkIn.mutateAsync({ guestId: guest.id, currentVersion: guest.version })
    setJustCheckedIn(true)
    onCheckedIn()
    // Reset visual feedback after 2s
    setTimeout(() => setJustCheckedIn(false), 2000)
  }

  const isCheckedIn = guest.checkedIn || justCheckedIn

  return (
    <button
      onClick={handleCheckIn}
      disabled={isCheckedIn || checkIn.isPending}
      className={[
        'w-full flex items-center gap-4 px-4 py-4 rounded-xl border transition-all text-left',
        isCheckedIn
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 opacity-70'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-700 active:scale-[0.98]',
        checkIn.isPending ? 'opacity-60' : '',
      ].join(' ')}
    >
      {/* Avatar */}
      <div className={[
        'w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors',
        isCheckedIn
          ? 'bg-green-500 text-white'
          : 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400',
      ].join(' ')}>
        {isCheckedIn ? <UserCheck size={18} /> : guest.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={['font-semibold text-base truncate', isCheckedIn ? 'text-green-700 dark:text-green-400 line-through' : 'text-zinc-900 dark:text-zinc-100'].join(' ')}>
          {guest.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {guest.tableNumber && (
            <span className="text-xs text-zinc-400">Table {guest.tableNumber}</span>
          )}
          {guest.phone && (
            <span className="text-xs text-zinc-400 truncate">{guest.phone}</span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        {isCheckedIn ? (
          <span className="text-xs font-medium text-green-600 dark:text-green-400">✓ In</span>
        ) : (
          <span className="text-xs text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1">
            Tap to check in
          </span>
        )}
        {guest.isDirty && (
          <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" title="Pending sync" />
        )}
      </div>
    </button>
  )
}

export default function CheckInPage({ params }: { params: { weddingId: string } }) {
  const wid = params.weddingId
  const { data: guests = [], isLoading } = useGuests(wid)
  const stats = useGuestStats(wid)
  const { isOnline } = useSync()
  const [search, setSearch] = useState('')
  const [lastCheckedIn, setLastCheckedIn] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Auto-focus search on mount
  useEffect(() => { searchRef.current?.focus() }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return guests.filter(g => !g.checkedIn && g.rsvpStatus === 'CONFIRMED')
    const q = search.toLowerCase()
    return guests.filter(g =>
      g.name.toLowerCase().includes(q) ||
      g.phone?.includes(q) ||
      String(g.tableNumber ?? '').includes(q)
    ).sort((a, b) => {
      // Confirmed + not checked in first
      if (a.rsvpStatus === 'CONFIRMED' && !a.checkedIn && !(b.rsvpStatus === 'CONFIRMED' && !b.checkedIn)) return -1
      if (b.rsvpStatus === 'CONFIRMED' && !b.checkedIn) return 1
      return 0
    })
  }, [guests, search])

  const confirmedNotIn = guests.filter(g => g.rsvpStatus === 'CONFIRMED' && !g.checkedIn).length

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Day-of check-in
          </h1>
          <div className="flex items-center gap-2">
            {isOnline
              ? <span className="flex items-center gap-1 text-xs text-green-500"><Wifi size={12} /> Live</span>
              : <span className="flex items-center gap-1 text-xs text-amber-500"><WifiOff size={12} /> Offline</span>
            }
          </div>
        </div>

        {/* Live stats bar */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center bg-zinc-50 dark:bg-zinc-800 rounded-lg py-2">
            <p className="text-lg font-bold text-green-600">{stats.checkedIn}</p>
            <p className="text-xs text-zinc-400">Checked in</p>
          </div>
          <div className="text-center bg-zinc-50 dark:bg-zinc-800 rounded-lg py-2">
            <p className="text-lg font-bold text-amber-600">{confirmedNotIn}</p>
            <p className="text-xs text-zinc-400">Still expected</p>
          </div>
          <div className="text-center bg-zinc-50 dark:bg-zinc-800 rounded-lg py-2">
            <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300">{stats.confirmed}</p>
            <p className="text-xs text-zinc-400">Total confirmed</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or table…"
            className="pl-9 h-11 text-base"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Last checked-in flash */}
      {lastCheckedIn && (
        <div className="mx-4 mt-3 px-4 py-2 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400 font-medium animate-fade-in">
          ✓ {lastCheckedIn} checked in
        </div>
      )}

      {/* Guest list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Users size={40} className="text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="font-medium text-zinc-600 dark:text-zinc-400">
              {search ? 'No guests match your search' : 'All confirmed guests are checked in!'}
            </p>
            {search && (
              <p className="text-sm text-zinc-400 mt-1">
                Try searching by first name, last name, or table number
              </p>
            )}
          </div>
        ) : (
          filtered.map(g => (
            <CheckInRow
              key={g.id}
              guest={g}
              weddingId={wid}
              onCheckedIn={() => setLastCheckedIn(g.name)}
            />
          ))
        )}

        {!search && filtered.length > 0 && (
          <p className="text-center text-xs text-zinc-400 py-2">
            {filtered.length} guest{filtered.length !== 1 ? 's' : ''} still to arrive
          </p>
        )}
      </div>

      {/* Bottom hint */}
      {!isOnline && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 text-center">
          Offline mode — check-ins are saved locally and will sync when connected
        </div>
      )}
    </div>
  )
}
