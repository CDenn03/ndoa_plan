import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { LogisticsClient } from './logistics-client'

export default async function EventLogisticsPage(props: Readonly<{ params: Promise<{ weddingId: string; eventId: string }> }>) {
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

  // Fetch transport routes for this event
  const transportRoutes = await db.transportRoute.findMany({
    where: { weddingId, eventId },
    orderBy: { name: 'asc' }
  })

  // Fetch accommodation for this event
  const accommodations = await db.accommodation.findMany({
    where: { weddingId, eventId },
    orderBy: { hotelName: 'asc' }
  })

  return (
    <LogisticsClient 
      weddingId={weddingId} 
      eventId={eventId}
      eventName={event.name}
      initialTransportRoutes={transportRoutes}
      initialAccommodations={accommodations}
    />
  )
}