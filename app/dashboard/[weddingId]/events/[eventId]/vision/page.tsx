import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { VisionClient } from './vision-client'

export default async function EventVisionPage(props: Readonly<{ params: Promise<{ weddingId: string; eventId: string }> }>) {
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

  // Fetch media items for this event (vision board images)
  const mediaItems = await db.mediaItem.findMany({
    where: {
      weddingId,
      eventId,
      deletedAt: null
    },
    orderBy: [
      { createdAt: 'desc' }
    ]
  })

  return (
    <VisionClient 
      weddingId={weddingId} 
      eventId={eventId}
      eventName={event.name}
      initialMediaItems={mediaItems}
    />
  )
}