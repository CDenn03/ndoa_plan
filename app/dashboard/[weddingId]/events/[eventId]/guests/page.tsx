import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { GuestsClient } from './guests-client'

export default async function EventGuestsPage(props: Readonly<{ params: Promise<{ weddingId: string; eventId: string }> }>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const { weddingId, eventId } = params

  // Verify event belongs to wedding
  const event = await db.weddingEvent.findUnique({
    where: { id: eventId },
    select: { id: true, weddingId: true, name: true }
  })

  if (!event || event.weddingId !== weddingId) {
    notFound()
  }

  // Fetch guests and their attendance for this event
  const guests = await db.guest.findMany({
    where: {
      weddingId,
      deletedAt: null
    },
    include: {
      eventAttendances: {
        where: { eventId },
        select: {
          rsvpStatus: true,
          checkedIn: true,
          checkedInAt: true
        }
      }
    },
    orderBy: [
      { priority: 'asc' },
      { name: 'asc' }
    ]
  })

  return (
    <GuestsClient 
      weddingId={weddingId} 
      eventId={eventId}
      eventName={event.name}
      initialGuests={guests} 
    />
  )
}