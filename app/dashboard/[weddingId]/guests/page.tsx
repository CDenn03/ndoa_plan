'use client'
import { useState, useMemo, use, useRef, useEffect } from 'react'
import { Users, Search, Plus, X, UserCheck, Wifi, WifiOff } from 'lucide-react'
import { Button, Input, Select, EmptyState, Spinner, EventTabs } from '@/components/ui'
import { useGuests, useGuestStats, useCheckInGuest } from '@/hooks/use-guests'
import { useWeddingStore } from '@/store/wedding-store'
import { useQuery } from '@tanstack/react-query'
import { useSync } from '@/components/sync-provider'
import {
  GuestRow, AddGuestModal, EventGuestsTab, GuestsOverallTab, PRESET_TAGS,
} from '@/components/features/guest-components'
import type { LocalGuest } from '@/types'

interface WeddingEvent { id: string; name: string; type: string; date: string }

// ─── Check-in tab (inlined from check-in/page.tsx) ───────────────────────────

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
        isCheckedIn ? 'bg-emerald-50 border-emerald-100 opacity-60' : 'bg-white border-[#1F4D3A]/8 hover:border-[#CDB5F7] hover:shadow-sm',
        checkIn.isPending ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div className={['w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors', isCheckedIn ? 'bg-emerald-500 text-white' : 'bg-[#1F4D3A]/8 text-[#1F4D3A]'].join(' ')}>
        {isCheckedIn ? <UserCheck size={18} /> : guest.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-base truncate ${isCheckedIn ? 'text-emerald-600 line-through' : 'text-[#14161C]'}`}>{guest.name}</p>
        {guest.phone && <span className="text-xs text-[#14161C]/40 truncate">{guest.phone}</span>}
      </div>
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {isCheckedIn
          ? <span className="text-xs font-semibold text-emerald-500">✓ In</span>
          : <span className="text-xs text-[#14161C]/40 border border-[#1F4D3A]/12 rounded-lg px-2.5 py-1">Tap to check in</span>
        }
        {guest.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" title="Pending sync" />}
      </div>
    </button>
  )
}

function CheckInTab({ weddingId }: Readonly<{ weddingId: string }>) {
  const { data: guests = [], isLoading } = useGuests(weddingId)
  const stats = useGuestStats(weddingId)
  const { isOnline } = useSync()
  const [search, setSearch] = useState('')
  const [lastCheckedIn, setLastCheckedIn] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { searchRef.current?.focus() }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return guests.filter(g => !g.checkedIn && g.rsvpStatus === 'CONFIRMED')
    const q = search.toLowerCase()
    return guests.filter(g =>
      g.name.toLowerCase().includes(q) || (g.phone?.includes(q) ?? false)
    ).sort((a, b) => {
      const aReady = a.rsvpStatus === 'CONFIRMED' && !a.checkedIn
      const bReady = b.rsvpStatus === 'CONFIRMED' && !b.checkedIn
      if (aReady === bReady) return 0
      return aReady ? -1 : 1
    })
  }, [guests, search])

  const confirmedNotIn = guests.filter(g => g.rsvpStatus === 'CONFIRMED' && !g.checkedIn).length

  return (
    <div className="flex flex-col bg-stone-50 rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
      <div className="bg-white border-b border-[#1F4D3A]/8 px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#14161C]">Day-of check-in</h2>
            <p className="text-xs text-[#14161C]/40 mt-0.5">Tap a guest to mark them as arrived</p>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${isOnline ? 'text-emerald-500' : 'text-amber-500'}`}>
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isOnline ? 'Live' : 'Offline'}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Checked in', val: stats.checkedIn, color: 'text-emerald-600' },
            { label: 'Still expected', val: confirmedNotIn, color: 'text-amber-500' },
            { label: 'Total confirmed', val: stats.confirmed, color: 'text-[#14161C]' },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center bg-stone-50 rounded-xl py-2.5">
              <p className={`text-xl font-extrabold leading-none ${color}`}>{val}</p>
              <p className="text-[11px] text-[#14161C]/40 mt-1">{label}</p>
            </div>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#14161C]/40" />
          <Input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone…" className="pl-10 h-11 text-base"
            autoComplete="off" autoCorrect="off" spellCheck={false} />
        </div>
      </div>

      {lastCheckedIn && (
        <div className="mx-4 mt-3 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700 font-semibold">
          ✓ {lastCheckedIn} checked in
        </div>
      )}

      <div className="flex-1 px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Users size={40} className="text-[#14161C]/15 mb-4" />
            <p className="font-semibold text-[#14161C]/55">
              {search ? 'No guests match your search' : 'All confirmed guests are checked in!'}
            </p>
            {search && <p className="text-sm text-[#14161C]/40 mt-1.5">Try first name, last name, or phone</p>}
          </div>
        ) : (
          <>
            {filtered.map(g => (
              <CheckInRow key={g.id} guest={g} weddingId={weddingId} onCheckedIn={() => setLastCheckedIn(g.name)} />
            ))}
            {!search && (
              <p className="text-center text-xs text-[#14161C]/40 py-3">
                {filtered.length} guest{filtered.length === 1 ? '' : 's'} still to arrive
              </p>
            )}
          </>
        )}
      </div>

      {!isOnline && (
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700 text-center font-medium">
          Offline — check-ins are saved locally and will sync when connected
        </div>
      )}
    </div>
  )
}

export default function GuestsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: guests = [], isLoading } = useGuests(wid)
  const stats = useGuestStats(wid)
  const { guestFilter, setGuestFilter } = useWeddingStore()
  const [showAdd, setShowAdd] = useState(false)
  const [activeTab, setActiveTab] = useState('__overall__')
  const [tagFilter, setTagFilter] = useState('all')

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}/events`); if (!res.ok) throw new Error('Failed'); return res.json() as Promise<WeddingEvent[]> },
    staleTime: 60_000,
  })

  const { data: wedding } = useQuery({
    queryKey: ['wedding', wid],
    queryFn: async () => { const res = await fetch(`/api/weddings/${wid}`); if (!res.ok) return null; return res.json() as Promise<{ expectedGuestCount?: number | null }> },
    staleTime: 60_000,
  })

  const expectedCount = wedding?.expectedGuestCount ?? null
  const delta = expectedCount != null ? stats.confirmed - expectedCount : null

  const filtered = useMemo(() => guests.filter(g => {
    if (guestFilter.search && !g.name.toLowerCase().includes(guestFilter.search.toLowerCase())) return false
    if (guestFilter.rsvpStatus !== 'all' && g.rsvpStatus !== guestFilter.rsvpStatus) return false
    if (guestFilter.side !== 'all' && g.side !== guestFilter.side) return false
    if (tagFilter !== 'all' && !(g.tags ?? []).includes(tagFilter)) return false
    return true
  }), [guests, guestFilter, tagFilter])

  const hasFilter = guestFilter.search || guestFilter.rsvpStatus !== 'all' || guestFilter.side !== 'all' || tagFilter !== 'all'
  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name })), { key: '__check-in__', label: 'Check-in' }]
  const activeEvent = events.find(e => e.id === activeTab)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">People</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <div>
              <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Guests</h1>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px mt-6">
            {(isLoading || eventsLoading) ? <div className="pb-4"><Spinner size="sm" /></div> : (
              <>
                <EventTabs
                  events={events}
                  activeTab={activeTab === '__check-in__' ? '__overall__' : activeTab}
                  onTabChange={setActiveTab}
                  showOverall={true}
                />
                <button
                  onClick={() => setActiveTab('__check-in__')}
                  className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === '__check-in__' ? 'border-[#14161C] text-[#14161C]' : 'border-transparent text-[#14161C]/40 hover:text-[#14161C]/60'}`}>
                  Check-in
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10">
        {activeTab === '__overall__' ? (
          <div className="space-y-8">
            <GuestsOverallTab weddingId={wid} events={events} />

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-48">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#14161C]/40" />
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
              <Select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="w-auto" aria-label="Filter by category">
                <option value="all">All categories</option>
                {PRESET_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </Select>
              {hasFilter && (
                <Button variant="ghost" size="sm" onClick={() => { setGuestFilter({ search: '', rsvpStatus: 'all', side: 'all' }); setTagFilter('all') }}>
                  <X size={13} /> Clear
                </Button>
              )}
            </div>

            {/* All guests list */}
            <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1F4D3A]/8">
                <p className="text-sm font-semibold text-[#14161C]">{filtered.length} guest{filtered.length !== 1 ? 's' : ''}</p>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-16"><Spinner /></div>
              ) : filtered.length === 0 ? (
                <EmptyState icon={<Users size={40} />} title="No guests found"
                  description={guests.length === 0 ? 'Add your first guest to get started' : 'Try adjusting your filters'}
                  action={guests.length === 0 ? <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add guest</Button> : undefined} />
              ) : (
                filtered.map(g => <GuestRow key={g.id} guest={g} weddingId={wid} />)
              )}
            </div>
          </div>
        ) : activeTab === '__check-in__' ? (
          <CheckInTab weddingId={wid} />
        ) : activeEvent ? (
          <EventGuestsTab weddingId={wid} eventId={activeEvent.id} />
        ) : null}
      </div>

      {showAdd && <AddGuestModal weddingId={wid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
