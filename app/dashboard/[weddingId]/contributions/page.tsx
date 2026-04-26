'use client'
import { Users, Plus, CalendarDays } from 'lucide-react'
import { Button, EmptyState, Spinner } from '@/components/ui'
import { EventTabs, StatsCard } from '@/components/ui/tabs'
import { useContributions } from '@/hooks/use-payments'
import { useQuery } from '@tanstack/react-query'
import { useState, use } from 'react'
import { format } from 'date-fns'
import {
  ContributionModal, DirectContributionModal, ContribRow, EventContributionsTab, fmt,
  type WeddingEvent,
} from '@/components/features/contribution-modals'
import type { Contribution } from '@/hooks/use-payments'

export default function ContributionsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: contributions = [], isLoading } = useContributions(wid)
  const [showAdd, setShowAdd] = useState(false)
  const [showDirect, setShowDirect] = useState(false)
  const [editing, setEditing] = useState<Contribution | null>(null)
  const [activeTab, setActiveTab] = useState('__overall__')

  const { data: events = [] } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${wid}/events`)
      if (!res.ok) throw new Error('Failed')
      return res.json() as Promise<WeddingEvent[]>
    },
    staleTime: 60_000,
  })

  const totalPledged = contributions.reduce((s, c) => s + c.pledgeAmount, 0)
  const totalPaid = contributions.reduce((s, c) => s + c.paidAmount, 0)
  const overdue = contributions.filter(c => c.status === 'OVERDUE').length
  const activeEvent = events.find(e => e.id === activeTab)

  const filtered = activeTab === '__overall__' ? contributions : contributions.filter(c => c.eventId === activeTab)

  const byEvent = (() => {
    const eventMap = new Map(events.map(e => [e.id, e]))
    const extraKeys = contributions
      .map(c => c.eventId ?? '__unassigned__')
      .filter(k => !eventMap.has(k))
    const keys = [...eventMap.keys(), ...new Set(extraKeys)]

    return new Map(
      keys.map(k => [
        k,
        {
          event: eventMap.get(k) ?? null,
          contribs: contributions.filter(c => (c.eventId ?? '__unassigned__') === k),
        },
      ])
    )
  })()

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Finance</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Contributions</h1>
          </div>
          <p className="text-sm text-[#14161C]/40 mt-1 mb-6">
            {contributions.length} pledges · {fmt(totalPaid)} of {fmt(totalPledged)} collected
            {overdue > 0 && <span className="ml-2 text-red-500 font-semibold">· {overdue} overdue</span>}
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
        {/* Per-event tab — uses shared EventContributionsTab */}
        {activeEvent ? (
          <EventContributionsTab weddingId={wid} eventId={activeEvent.id} events={events} />
        ) : (
          /* Overall tab */
          <div className="space-y-8">
            <StatsCard
              stats={[
                { label: 'Total pledged', value: fmt(totalPledged), color: 'blue' },
                { label: 'Collected', value: fmt(totalPaid), color: 'green' },
                { label: 'Outstanding', value: fmt(Math.max(0, totalPledged - totalPaid)), color: totalPledged - totalPaid > 0 ? 'amber' : 'default' }
              ]}
            />

            {/* Recent contributions section */}
            {(() => {
              const recentContribs = contributions
                .filter(c => c.paidAmount > 0)
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, 5)
              
              return recentContribs.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">Recent contributions</p>
                  <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
                    {recentContribs.map(contrib => (
                      <div key={contrib.id} className="flex items-center gap-4 py-4 px-6 border-b border-[#1F4D3A]/8 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#14161C] truncate">{contrib.memberName}</p>
                          <p className="text-xs text-[#14161C]/40">
                            Paid {fmt(contrib.paidAmount)} of {fmt(contrib.pledgeAmount)}
                            {contrib.dueDate && ` • Due ${format(new Date(contrib.dueDate), 'MMM d')}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600">{fmt(contrib.paidAmount)}</p>
                          <p className="text-xs text-emerald-600">PAID</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {events.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">By event</p>
                {Array.from(byEvent.entries()).map(([key, { event, contribs }]) => {
                  if (contribs.length === 0) return null
                  const evPledged = contribs.reduce((s, c) => s + c.pledgeAmount, 0)
                  const evPaid = contribs.reduce((s, c) => s + c.paidAmount, 0)
                  return (
                    <div key={key} className="rounded-2xl border border-[#1F4D3A]/8 p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={15} className="text-[#14161C]/40" />
                        <p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p>
                        <span className="text-xs text-[#14161C]/40">{contribs.length} pledges</span>
                      </div>
                      <div className="flex gap-6 text-right">
                        <div><p className="text-xs text-[#14161C]/40">Pledged</p><p className="text-sm font-bold text-sky-600">{fmt(evPledged)}</p></div>
                        <div><p className="text-xs text-[#14161C]/40">Paid</p><p className="text-sm font-bold text-emerald-600">{fmt(evPaid)}</p></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : filtered.length === 0 ? (
              <div className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setShowDirect(true)}><Plus size={14} /> Record contribution</Button>
                  <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add pledge</Button>
                </div>
                <EmptyState icon={<Users size={40} />} title="No contributions yet"
                  description="Add a pledge or record a direct contribution" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowDirect(true)}><Plus size={13} /> Record contribution</Button>
                  <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={13} /> Add pledge</Button>
                </div>
                <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
                  {filtered.map(c => <ContribRow key={c.id} contrib={c} weddingId={wid} events={events} onEdit={setEditing} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add modal — auto-selects event when on an event tab */}
      {showAdd && <ContributionModal weddingId={wid} events={events} eventId={activeEvent?.id} onClose={() => setShowAdd(false)} />}
      {showDirect && <DirectContributionModal weddingId={wid} events={events} eventId={activeEvent?.id} onClose={() => setShowDirect(false)} />}
      {editing && <ContributionModal weddingId={wid} events={events} contrib={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
