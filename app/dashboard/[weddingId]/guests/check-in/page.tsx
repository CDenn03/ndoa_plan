'use client'
import { useState, useMemo, useRef, useEffect, use } from 'react'
import { Search, UserCheck, Users, Wifi, WifiOff } from 'lucide-react'
import { Input } from '@/components/ui'
import { useGuests, useCheckInGuest, useGuestStats } from '@/hooks/use-guests'
import { useSync } from '@/components/sync-provider'
import type { LocalGuest } from '@/types'

function CheckInRow({ guest, weddingId, onCheckedIn }: Readonly<{ guest: LocalGuest; weddingId: string; onCheckedIn: () => void }>) {
  const checkIn = useCheckInGuest(weddingId)
  const [justCheckedIn, setJustCheckedIn] = useState(false)
  const isCheckedIn = guest.checkedIn || justCheckedIn

  const handleCheckIn = async () => {
    if (isCheckedIn) return
    await checkIn.mutateAsync({ guestId: guest.id, currentVersion: guest.version })
    setJustCheckedIn(true)
    onCheckedIn()
    setTimeout(() => setJustCheckedIn(false), 2000)
  }

  return (
    <button
      onClick={handleCheckIn}
      disabled={isCheckedIn || checkIn.isPending}
      className={[
        'w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all text-left active:scale-[0.98]',
        isCheckedIn
          ? 'bg-emerald-50 border-emerald-100 opacity-60'
          : 'bg-white border-zinc-100 hover:border-[#CDB5F7] hover:shadow-sm',
        checkIn.isPending ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div className={[
        'w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors',
        isCheckedIn ? 'bg-emerald-500 text-white' : 'bg-[#CDB5F7]/20 text-violet-600',
      ].join(' ')}>
        {isCheckedIn ? <UserCheck size={18} /> : guest.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-base truncate ${isCheckedIn ? 'text-emerald-600 line-through' : 'text-[#14161C]'}`}>
          {guest.name}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          {guest.tableNumber && <span className="text-xs text-zinc-400">Table {guest.tableNumber}</span>}
          {guest.phone && <span className="text-xs text-zinc-400 truncate">{guest.phone}</span>}
        </div>
      </div>
      <div className="flex-shrink-0">
        {isCheckedIn
          ? <span className="text-xs font-semibold text-emerald-500">✓ In</span>
          : <span className="text-xs text-zinc-400 border border-zinc-200 rounded-lg px-2.5 py-1">Tap to check in</span>
        }
        {guest.isDirty && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" title="Pending sync" />}
      </div>
    </button>
  )
}

export default function CheckInPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: guests = [], isLoading } = useGuests(wid)
  const stats = useGuestStats(wid)
  const { isOnline } = useSync()
  const [search, setSearch] = useState('')
  const [lastCheckedIn, setLastCheckedIn] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { searchRef.current?.focus() }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return guests.filter(g => !g.checkedIn && g.rsvpStatus === 'CONFIRMED')
    const q = search.toLowerCase()
    return guests.filter(g =>
      g.name.toLowerCase().includes(q) ||
      g.phone?.includes(q) ||
      String(g.tableNumber ?? '').includes(q)
    ).sort((a, b) => {
      const aReady = a.rsvpStatus === 'CONFIRMED' && !a.checkedIn
      const bReady = b.rsvpStatus === 'CONFIRMED' && !b.checkedIn
      return aReady === bReady ? 0 : aReady ? -1 : 1
    })
  }, [guests, search])

  const confirmedNotIn = guests.filter(g => g.rsvpStatus === 'CONFIRMED' && !g.checkedIn).length

  return (
    <div className="flex flex-col h-full bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#14161C]">Day-of check-in</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Tap a guest to mark them as arrived</p>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${isOnline ? 'text-emerald-500' : 'text-amber-500'}`}>
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isOnline ? 'Live' : 'Offline'}
          </div>
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Checked in', val: stats.checkedIn, color: 'text-emerald-600' },
            { label: 'Still expected', val: confirmedNotIn, color: 'text-amber-500' },
            { label: 'Total confirmed', val: stats.confirmed, color: 'text-[#14161C]' },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center bg-stone-50 rounded-xl py-2.5">
              <p className={`text-xl font-extrabold leading-none ${color}`}>{val}</p>
              <p className="text-[11px] text-zinc-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or table…"
            className="pl-10 h-11 text-base"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Flash feedback */}
      {lastCheckedIn && (
        <div className="mx-4 mt-3 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700 font-semibold">
          ✓ {lastCheckedIn} checked in
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#CDB5F7] border-t-violet-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Users size={40} className="text-zinc-200 mb-4" />
            <p className="font-semibold text-zinc-500">
              {search ? 'No guests match your search' : 'All confirmed guests are checked in!'}
            </p>
            {search && <p className="text-sm text-zinc-400 mt-1.5">Try first name, last name, or table number</p>}
          </div>
        ) : (
          <>
            {filtered.map(g => (
              <CheckInRow key={g.id} guest={g} weddingId={wid} onCheckedIn={() => setLastCheckedIn(g.name)} />
            ))}
            {!search && (
              <p className="text-center text-xs text-zinc-400 py-3">
                {filtered.length} guest{filtered.length !== 1 ? 's' : ''} still to arrive
              </p>
            )}
          </>
        )}
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700 text-center font-medium">
          Offline — check-ins are saved locally and will sync when connected
        </div>
      )}
    </div>
  )
}
