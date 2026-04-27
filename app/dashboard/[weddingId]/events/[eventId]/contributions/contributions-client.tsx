'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui'
import {
  EventContributionsTab,
  ContributionModal,
  DirectContributionModal,
  type WeddingEvent,
} from '@/components/features/contribution-modals'

interface Props {
  weddingId: string
  eventId: string
  eventName: string
  events: WeddingEvent[]
}

export function ContributionsEventClient({ weddingId, eventId, eventName, events }: Readonly<Props>) {
  const [showAdd, setShowAdd] = useState(false)
  const [showDirect, setShowDirect] = useState(false)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Finance</p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Contributions</h1>
              <p className="text-sm text-[#14161C]/40 mt-1">{eventName}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowDirect(true)}>
                <Plus size={13} /> Record contribution
              </Button>
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <Plus size={13} /> Add pledge
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10">
        <EventContributionsTab weddingId={weddingId} eventId={eventId} events={events} />
      </div>

      {showAdd && (
        <ContributionModal
          weddingId={weddingId}
          events={events}
          eventId={eventId}
          onClose={() => setShowAdd(false)}
        />
      )}
      {showDirect && (
        <DirectContributionModal
          weddingId={weddingId}
          events={events}
          eventId={eventId}
          onClose={() => setShowDirect(false)}
        />
      )}
    </div>
  )
}
