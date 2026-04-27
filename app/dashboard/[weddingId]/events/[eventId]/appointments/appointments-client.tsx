'use client'
import { useState } from 'react'
import { Plus, LayoutTemplate } from 'lucide-react'
import { Button } from '@/components/ui'
import { useQueryClient } from '@tanstack/react-query'
import {
  EventAppointmentsTab,
  AddAppointmentModal,
  AppointmentLoadTemplateModal,
  type Vendor,
} from '@/components/features/appointment-modals'

interface Props {
  weddingId: string
  eventId: string
  eventName: string
  userId: string
  vendors: Vendor[]
}

export function AppointmentsEventClient({ weddingId, eventId, eventName, userId, vendors }: Readonly<Props>) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)

  const refresh = () => void qc.invalidateQueries({ queryKey: ['appointments', weddingId] })

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Planning</p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Appointments</h1>
              <p className="text-sm text-[#14161C]/40 mt-1">{eventName}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="lavender" size="sm" onClick={() => setShowTemplate(true)}>
                <LayoutTemplate size={13} /> Load template
              </Button>
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <Plus size={14} /> Book appointment
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10">
        <EventAppointmentsTab
          weddingId={weddingId}
          userId={userId}
          eventId={eventId}
          vendors={vendors}
          appointments={[]}
          onRefresh={refresh}
        />
      </div>

      {showAdd && (
        <AddAppointmentModal
          weddingId={weddingId}
          userId={userId}
          vendors={vendors}
          eventId={eventId}
          onClose={() => setShowAdd(false)}
          onDone={refresh}
        />
      )}
      {showTemplate && (
        <AppointmentLoadTemplateModal
          weddingId={weddingId}
          eventId={eventId}
          onClose={() => setShowTemplate(false)}
          onDone={refresh}
        />
      )}
    </div>
  )
}
