import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { AppointmentsEventClient } from './appointments-client'

export default async function EventAppointmentsPage(
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

  const vendors = await db.vendor.findMany({
    where: { weddingId },
    select: { id: true, name: true, category: true },
    orderBy: { name: 'asc' },
  })

  const userId = (session.user as typeof session.user & { id: string }).id

  return (
    <AppointmentsEventClient
      weddingId={weddingId}
      eventId={eventId}
      eventName={event.name}
      userId={userId}
      vendors={vendors}
    />
  )
}
