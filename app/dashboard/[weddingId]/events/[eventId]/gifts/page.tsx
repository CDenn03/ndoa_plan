import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { GiftsClient } from './gifts-client'

export default async function EventGiftsPage(props: Readonly<{ params: Promise<{ weddingId: string; eventId: string }> }>) {
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

  // Fetch gift registry items
  const registryItems = await db.giftRegistryItem.findMany({
    where: { weddingId },
    orderBy: [{ priority: 'asc' }, { name: 'asc' }]
  })

  // Fetch received gifts
  const receivedGifts = await db.giftReceived.findMany({
    where: { weddingId },
    orderBy: { receivedAt: 'desc' }
  })

  return (
    <GiftsClient 
      weddingId={weddingId} 
      eventId={eventId}
      eventName={event.name}
      initialRegistryItems={registryItems}
      initialReceivedGifts={receivedGifts}
    />
  )
}