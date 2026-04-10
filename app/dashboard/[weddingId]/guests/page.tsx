'use client'
import { useState, useMemo, use } from 'react'
import { Users, Search, Plus, X } from 'lucide-react'
import { Button, Input, Select, EmptyState, Spinner } from '@/components/ui'
import { useGuests, useGuestStats } from '@/hooks/use-guests'
import { useWeddingStore } from '@/store/wedding-store'
import { useQuery } from '@tanstack/react-query'
import {
  GuestRow, AddGuestModal, EventGuestsTab, GuestsOverallTab,
} from '@/components/features/guest-components'

interface WeddingEvent { id: string; name: string; type: string; date: string }

export default function GuestsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: guests = [], isLoading } = useGuests(wid)
  const stats = useGuestStats(wid)
  const { guestFilter, setGuestFilter } = useWeddingStore()
  const [showAdd, setShowAdd] = useState(false)
  const [activeTab, setActiveTab] = useState('__overall__')

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
    return true
  }), [guests, guestFilter])

  const hasFilter = guestFilter.search || guestFilter.rsvpStatus !== 'all' || guestFilter.side !== 'all'
  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name }))]
  const activeEvent = events.find(e => e.id === activeTab)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-zinc-100 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">People</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <div>
              <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Guests</h1>
              <p className="text-sm text-zinc-400 mt-2">
                {stats.total} invited · {stats.confirmed} confirmed
                {expectedCount != null && delta != null && (
                  <span className={`ml-2 font-semibold ${delta === 0 ? 'text-emerald-500' : delta > 0 ? 'text-amber-500' : 'text-zinc-400'}`}>
                    {delta > 0 ? `· ${delta} more than expected` : delta < 0 ? `· ${Math.abs(delta)} fewer than expected` : '· on target'}
                  </span>
                )}
              </p>
            </div>
            <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} /> Add guest</Button>
          </div>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px mt-6">
            {(isLoading || eventsLoading) ? <div className="pb-4"><Spinner size="sm" /></div> : (
              tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-[#14161C] text-[#14161C]' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
                  {t.label}
                </button>
              ))
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

            {/* All guests list */}
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100">
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
        ) : activeEvent ? (
          <EventGuestsTab weddingId={wid} eventId={activeEvent.id} />
        ) : null}
      </div>

      {showAdd && <AddGuestModal weddingId={wid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
