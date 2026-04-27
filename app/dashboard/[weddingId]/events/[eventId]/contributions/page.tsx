import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { ContributionsEventClient } from './contributions-client'

export default async function EventContributionsPage(
  props: Readonly<{ params: Promise<{ weddingId: string; eventId: string }> }>
) {
  const { weddingId, eventId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const event = await db.weddingEvent.findUnique({
    where: { id: eventId },
    select: { id: true, weddingId: true, name: true },
  })
  if (!event || event.weddingId !== weddingId) notFound()

  const events = await db.weddingEvent.findMany({
    where: { weddingId },
    select: { id: true, name: true, type: true },
    orderBy: { date: 'asc' },
  })

  return (
    <ContributionsEventClient
      weddingId={weddingId}
      eventId={eventId}
      eventName={event.name}
      events={events}
    />
  )
}
