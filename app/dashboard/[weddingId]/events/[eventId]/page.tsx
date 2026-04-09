import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { EventDetailClient } from './event-detail-client'

export default async function EventDetailPage(props: Readonly<{ params: Promise<{ weddingId: string; eventId: string }> }>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const { weddingId: wid, eventId } = params

  const [event, guestAttendances] = await Promise.all([
    db.weddingEvent.findUnique({ where: { id: eventId } }),
    db.guestEventAttendance.findMany({
      where: { eventId },
      include: { guest: { select: { id: true, name: true, phone: true, rsvpStatus: true, side: true } } },
    }),
  ])

  if (!event || event.weddingId !== wid) notFound()

  return (
    <EventDetailClient
      weddingId={wid}
      event={{
        id: event.id, name: event.name, type: event.type, date: event.date.toISOString(),
        venue: event.venue ?? undefined, description: event.description ?? undefined,
        startTime: event.startTime ?? undefined, endTime: event.endTime ?? undefined,
        isMain: event.isMain,
      }}
      guestAttendances={guestAttendances.map(a => ({
        id: a.id, rsvpStatus: a.rsvpStatus,
        guest: { id: a.guest.id, name: a.guest.name, phone: a.guest.phone ?? undefined, side: a.guest.side },
      }))}
    />
  )
}
