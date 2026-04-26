'use client'
import { useState, useMemo, use } from 'react'
import { ShoppingBag, Search, Plus, X, CalendarDays } from 'lucide-react'
import { Button, Input, Select, EmptyState, Spinner } from '@/components/ui'
import { EventTabs, StatsCard } from '@/components/ui/tabs'
import { useVendors, useVendorStats } from '@/hooks/use-vendors'
import { useWeddingStore } from '@/store/wedding-store'
import { useQuery } from '@tanstack/react-query'
import {
  VendorRow, AddVendorModal, EventVendorsTab, VENDOR_CATEGORIES, VENDOR_STATUSES, fmt,
} from '@/components/features/vendor-components'

interface WeddingEvent { id: string; name: string; type: string; date: string }

export default function VendorsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: vendors = [], isLoading } = useVendors(wid)
  const stats = useVendorStats(wid)
  const { vendorFilter, setVendorFilter } = useWeddingStore()
  const [showAdd, setShowAdd] = useState(false)
  const [activeTab, setActiveTab] = useState('__overall__')

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${wid}/events`)
      if (!res.ok) throw new Error('Failed')
      return res.json() as Promise<WeddingEvent[]>
    },
    staleTime: 60_000,
  })

  const activeEvent = events.find(e => e.id === activeTab)

  const filtered = useMemo(() => vendors.filter(v => {
    if (vendorFilter.search && !v.name.toLowerCase().includes(vendorFilter.search.toLowerCase())) return false
    if (vendorFilter.category !== 'all' && v.category !== vendorFilter.category) return false
    if (vendorFilter.status !== 'all' && v.status !== vendorFilter.status) return false
    return true
  }), [vendors, vendorFilter])

  const hasFilter = vendorFilter.search || vendorFilter.category !== 'all' || vendorFilter.status !== 'all'

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">People</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Vendors</h1>
          </div>
          <p className="text-sm text-[#14161C]/40 mt-1 mb-6">{stats.total} vendors · {fmt(stats.totalOwed)} outstanding</p>
          <EventTabs
            events={events}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showOverall={true}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10">
        {/* Per-event tab — uses shared EventVendorsTab */}
        {activeEvent ? (
          <EventVendorsTab weddingId={wid} eventId={activeEvent.id} />
        ) : (
          /* Overall tab */
          <div className="space-y-8">
            <StatsCard
              stats={[
                { label: 'Confirmed', value: stats.confirmed, color: 'green' },
                { label: 'Booked', value: stats.booked, color: 'blue' },
                { label: 'Pending', value: stats.pending, color: 'amber' },
                { label: 'Total owed', value: fmt(stats.totalOwed), color: stats.totalOwed > 0 ? 'red' : 'default' },
              ]}
            />

            {/* By event summary */}
            {events.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">By event</p>
                {events.map(e => (
                    <button key={e.id} onClick={() => setActiveTab(e.id)}
                      className="w-full rounded-2xl border border-[#1F4D3A]/8 p-4 flex items-center justify-between gap-4 hover:border-[#1F4D3A]/12 hover:bg-[#F7F5F2] transition-colors text-left">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={15} className="text-[#14161C]/40" />
                        <p className="text-sm font-bold text-[#14161C]">{e.name}</p>
                      </div>
                      <span className="text-xs text-[#14161C]/40">View vendors →</span>
                    </button>
                  ))}
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-48">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#14161C]/40" />
                <Input value={vendorFilter.search} onChange={e => setVendorFilter({ search: e.target.value })} placeholder="Search vendors…" className="pl-9" />
              </div>
              <Select value={vendorFilter.category} onChange={e => setVendorFilter({ category: e.target.value })} className="w-auto" aria-label="Filter by category">
                <option value="all">All categories</option>
                {VENDOR_CATEGORIES.map(c => <option key={c} value={c}>{c.replaceAll('_', ' ')}</option>)}
              </Select>
              <Select value={vendorFilter.status} onChange={e => setVendorFilter({ status: e.target.value })} className="w-auto" aria-label="Filter by status">
                <option value="all">All statuses</option>
                {VENDOR_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </Select>
              {hasFilter && (
                <Button variant="ghost" size="sm" onClick={() => setVendorFilter({ search: '', category: 'all', status: 'all' })}>
                  <X size={13} /> Clear
                </Button>
              )}
            </div>

            {/* All vendors list */}
            <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1F4D3A]/8">
                <p className="text-sm font-semibold text-[#14161C]">{filtered.length} vendor{filtered.length !== 1 ? 's' : ''}</p>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-16"><Spinner /></div>
              ) : filtered.length === 0 ? (
                <EmptyState icon={<ShoppingBag size={40} />} title="No vendors found"
                  description={vendors.length === 0 ? 'Add your first vendor to get started' : 'Try adjusting your filters'}
                  action={vendors.length === 0 ? <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add vendor</Button> : undefined} />
              ) : (
                filtered.map(v => <VendorRow key={v.id} vendor={v} weddingId={wid} showEventAssign />)
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add modal — no event pre-selected on overall tab */}
      {showAdd && <AddVendorModal weddingId={wid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
