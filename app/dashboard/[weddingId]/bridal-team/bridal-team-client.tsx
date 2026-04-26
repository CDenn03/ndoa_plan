'use client'
import { useState, useMemo } from 'react'
import { Heart, CalendarDays, Users } from 'lucide-react'
import { Button, Badge, EmptyState } from '@/components/ui'
import { BridalTeamTab } from '@/components/features/bridal-team-components'
import Link from 'next/link'

type ConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED'
type BridalRole = string

interface Member {
  id: string; name: string; role: BridalRole; side: string; confirmationStatus: ConfirmationStatus
}

interface EventWithTeam {
  id: string; name: string; type: string
  bridalTeamMembers: Member[]
}

interface Props {
  weddingId: string
  events: EventWithTeam[]
}

const ROLE_LABELS: Record<string, string> = {
  BRIDE: 'Bride', GROOM: 'Groom', BEST_MAN: 'Best Man', MAID_OF_HONOUR: 'Maid of Honour',
  BRIDESMAID: 'Bridesmaid', GROOMSMAN: 'Groomsman', FLOWER_GIRL: 'Flower Girl',
  PAGE_BOY: 'Page Boy', RING_BEARER: 'Ring Bearer', PARENT_BRIDE: "Bride's Parent",
  PARENT_GROOM: "Groom's Parent", NEGOTIATOR: 'Negotiator', ELDER: 'Elder', OTHER: 'Other',
}

const STATUS_VARIANT: Record<ConfirmationStatus, 'confirmed' | 'declined' | 'pending'> = {
  CONFIRMED: 'confirmed', DECLINED: 'declined', PENDING: 'pending',
}

function OverallTab({ events, weddingId }: Readonly<{
  events: EventWithTeam[]; weddingId: string
}>) {
  const eventsWithMembers = events.filter(e => e.bridalTeamMembers.length > 0)
  const totalMembers = events.reduce((s, e) => s + e.bridalTeamMembers.length, 0)
  const confirmedMembers = events.reduce((s, e) => s + e.bridalTeamMembers.filter(m => m.confirmationStatus === 'CONFIRMED').length, 0)

  if (totalMembers === 0) return (
    <EmptyState
      icon={<Heart size={40} />}
      title="No bridal team members yet"
      description="Add bridal team members from within each event tab"
    />
  )

  return (
    <div className="space-y-8">
      <div className="flex gap-8 divide-x divide-zinc-100">
        <div className="pr-8">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-1">Total Members</p>
          <p className="text-2xl font-extrabold text-[#14161C]">{totalMembers}</p>
        </div>
        <div className="px-8">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-1">Confirmed</p>
          <p className="text-2xl font-extrabold text-[#14161C]">{confirmedMembers}</p>
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">By event</p>
        {eventsWithMembers.map(event => (
          <div key={event.id} className="rounded-2xl border border-[#1F4D3A]/8 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-[#14161C]/40" />
              <p className="text-sm font-bold text-[#14161C]">{event.name}</p>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-xs text-[#14161C]/40">Members</p>
                <p className="text-sm font-bold text-sky-600">{event.bridalTeamMembers.length}</p>
              </div>
              <div>
                <p className="text-xs text-[#14161C]/40">Confirmed</p>
                <p className="text-sm font-bold text-emerald-600">
                  {event.bridalTeamMembers.filter(m => m.confirmationStatus === 'CONFIRMED').length}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BridalTeamOverviewClient({ weddingId, events }: Readonly<Props>) {
  const [activeTab, setActiveTab] = useState('__overall__')
  const totalMembers = events.reduce((s, e) => s + e.bridalTeamMembers.length, 0)
  const tabs = [
    { key: '__overall__', label: 'Overall', icon: <Heart size={13} /> },
    ...events.map(e => ({ key: e.id, label: e.name, icon: <Users size={13} /> }))
  ]
  const activeEvent = events.find(e => e.id === activeTab)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">People</p>
          <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Bridal Team</h1>
          <p className="text-sm text-[#14161C]/40 mt-2 mb-6">{totalMembers} members across {events.length} events</p>
          <div className="flex gap-0.5 overflow-x-auto scrollbar-thin -mb-px">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-[#14161C] text-[#14161C]' : 'border-transparent text-[#14161C]/40 hover:text-[#14161C]/60'}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-8 py-10">
        {activeTab === '__overall__'
          ? <OverallTab events={events} weddingId={weddingId} />
          : activeEvent
            ? <BridalTeamTab weddingId={weddingId} eventId={activeEvent.id} />
            : null}
      </div>
    </div>
  )
}
