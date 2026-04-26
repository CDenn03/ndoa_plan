'use client'
import { useState, useMemo } from 'react'
import { Gift, CalendarDays } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { EventTabs, StatsCard, Tabs } from '@/components/ui/tabs'
import {
  EventGiftsTab, RegistryList, ReceivedList,
  type GiftRegistryItem, type GiftReceived,
} from '@/components/features/gift-modals'

interface WeddingEvent { id: string; name: string; type: string; date: string }
interface Props {
  weddingId: string; events: WeddingEvent[]
  registry: GiftRegistryItem[]; received: GiftReceived[]; onRefresh: () => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

function OverallTab({ weddingId, registry, received, events, onRefresh }: Readonly<{
  weddingId: string; registry: GiftRegistryItem[]; received: GiftReceived[]
  events: WeddingEvent[]; onRefresh: () => void
}>) {
  const [subTab, setSubTab] = useState<'wishlist' | 'received'>('wishlist')
  const pendingThankYous = received.filter(r => !r.thankYouSent).length
  const totalValue = received.reduce((s, r) => s + Number(r.estimatedValue ?? 0), 0)

  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent | null; reg: GiftRegistryItem[]; rec: GiftReceived[] }>()
    for (const e of events) map.set(e.id, { event: e, reg: [], rec: [] })
    for (const r of registry) {
      const k = r.eventId ?? '__unassigned__'
      if (!map.has(k)) map.set(k, { event: null, reg: [], rec: [] })
      map.get(k)?.reg.push(r)
    }
    for (const r of received) {
      const k = r.eventId ?? '__unassigned__'
      if (!map.has(k)) map.set(k, { event: null, reg: [], rec: [] })
      map.get(k)?.rec.push(r)
    }
    return map
  }, [registry, received, events])

  if (registry.length === 0 && received.length === 0) return (
    <EmptyState icon={<Gift size={40} />} title="No gifts yet"
      description="Add registry items and record received gifts inside each event tab" />
  )

  return (
    <div className="space-y-8">
      <StatsCard
        stats={[
          { label: 'Wish list items', value: registry.length, color: 'default' },
          { label: 'Gifts received', value: received.length, color: 'default' },
          ...(totalValue > 0 ? [{ label: 'Total value', value: fmt(totalValue), color: 'green' as const }] : []),
          ...(pendingThankYous > 0 ? [{ label: 'Thank-yous pending', value: pendingThankYous, color: 'amber' as const }] : [])
        ]}
      />

      {/* By event */}
      {events.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">By event</p>
          {Array.from(byEvent.entries()).map(([key, { event, reg, rec }]) => {
            if (reg.length === 0 && rec.length === 0) return null
            return (
              <div key={key} className="rounded-2xl border border-[#1F4D3A]/8 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CalendarDays size={15} className="text-[#14161C]/40" />
                  <p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p>
                </div>
                <div className="flex gap-6 text-right">
                  <div><p className="text-xs text-[#14161C]/40">Registry</p><p className="text-sm font-bold text-[#1F4D3A]">{reg.length}</p></div>
                  <div><p className="text-xs text-[#14161C]/40">Received</p><p className="text-sm font-bold text-emerald-600">{rec.length}</p></div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="space-y-4">
        <Tabs
          tabs={[
            { key: 'wishlist', label: `Wish List (${registry.length})` },
            { 
              key: 'received', 
              label: pendingThankYous > 0 
                ? `Received (${received.length}) • ${pendingThankYous} pending`
                : `Received (${received.length})`
            }
          ]}
          activeTab={subTab}
          onTabChange={(key) => setSubTab(key as 'wishlist' | 'received')}
          variant="pills"
        />
        {subTab === 'wishlist' && <RegistryList items={registry} weddingId={weddingId} onRefresh={onRefresh} onAdd={() => {}} />}
        {subTab === 'received' && <ReceivedList gifts={received} weddingId={weddingId} onRefresh={onRefresh} onAdd={() => {}} />}
      </div>
    </div>
  )
}

export function GiftsClient({ weddingId, events, registry, received, onRefresh }: Readonly<Props>) {
  const [activeTab, setActiveTab] = useState('__overall__')
  const activeEvent = events.find(e => e.id === activeTab)
  const pendingThankYous = received.filter(r => !r.thankYouSent).length

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Content</p>
          <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Gifts</h1>
          <p className="text-sm text-[#14161C]/40 mt-2 mb-6">
            {registry.length} wish list items · {received.length} received
            {pendingThankYous > 0 && <span className="ml-2 text-amber-500 font-semibold">· {pendingThankYous} thank-yous pending</span>}
          </p>
          <EventTabs
            events={events}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showOverall={true}
          />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-8 py-10">
        {activeTab === '__overall__' ? (
          <OverallTab weddingId={weddingId} registry={registry} received={received} events={events} onRefresh={onRefresh} />
        ) : activeEvent ? (
          <EventGiftsTab weddingId={weddingId} eventId={activeEvent.id} registry={registry} received={received} onRefresh={onRefresh} />
        ) : null}
      </div>
    </div>
  )
}
