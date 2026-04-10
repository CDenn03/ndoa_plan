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

  const event = await db.weddingEvent.findUnique({ where: { id: eventId } })
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
    />
  )
}
