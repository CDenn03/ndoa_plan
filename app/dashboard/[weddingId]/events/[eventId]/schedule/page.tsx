import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { ScheduleClient } from './schedule-client'

export default async function EventSchedulePage(props: Readonly<{ params: Promise<{ weddingId: string; eventId: string }> }>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const { weddingId, eventId } = params

  // Verify event belongs to wedding
  const event = await db.weddingEvent.findUnique({
    where: { id: eventId },
    select: { 
      id: true, 
      weddingId: true, 
      name: true, 
      date: true,
      startTime: true,
      endTime: true
    }
  })

  if (!event?.weddingId || event.weddingId !== weddingId) {
    notFound()
  }

  // Fetch program items for this event
  const programItems = await db.eventProgramItem.findMany({
    where: {
      eventId,
    },
    orderBy: [
      { startTime: 'asc' },
      { order: 'asc' }
    ]
  })

  // Fetch event contacts
  const contacts = await db.eventContact.findMany({
    where: {
      eventId,
    },
    orderBy: { name: 'asc' }
  })

  // Fetch vendors assigned to this event
  const vendorContacts = await db.vendor.findMany({
    where: {
      weddingId,
      deletedAt: null,
      eventAssignments: {
        some: {
          eventId,
        }
      }
    },
    select: {
      id: true,
      name: true,
      contactName: true,
      contactPhone: true,
      contactEmail: true,
      category: true
    }
  })

  return (
    <ScheduleClient 
      weddingId={weddingId} 
      eventId={eventId}
      event={event}
      initialProgramItems={programItems}
      initialContacts={contacts}
      vendorContacts={vendorContacts}
    />
  )
}