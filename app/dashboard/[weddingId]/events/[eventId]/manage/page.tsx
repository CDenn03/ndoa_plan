import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ManageEventClient } from './manage-event-client'

interface Props {
  readonly params: Promise<{ weddingId: string; eventId: string }>
}

export default async function ManageEventPage({ params }: Props) {
  const { weddingId, eventId } = await params
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  // Fetch event details
  const event = await db.weddingEvent.findFirst({
    where: {
      id: eventId,
      weddingId,
    },
    select: {
      id: true,
      name: true,
      type: true,
      date: true,
      startTime: true,
      endTime: true,
      venue: true,
      description: true,
      isMain: true,
    },
  })

  if (!event) {
    redirect(`/dashboard/${weddingId}/events`)
  }

  return (
    <ManageEventClient 
      weddingId={weddingId}
      eventId={eventId}
      initialValues={{
        name: event.name,
        type: event.type,
        date: event.date.toISOString().split('T')[0], // Format for date input
        startTime: event.startTime || '',
        endTime: event.endTime || '',
        venue: event.venue || '',
        description: event.description || '',
        isMain: event.isMain,
      }}
    />
  )
}