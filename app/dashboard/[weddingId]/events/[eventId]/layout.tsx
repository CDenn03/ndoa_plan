import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { EventTabsLayout } from './event-tabs-layout'

export default async function EventLayout(props: Readonly<{
  children: React.ReactNode
  params: Promise<{ weddingId: string; eventId: string }>
}>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const { weddingId, eventId } = params

  // Verify event belongs to wedding
  const event = await db.weddingEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      weddingId: true,
      type: true,
      date: true,
      venue: true,
      isMain: true
    }
  })

  if (!event || event.weddingId !== weddingId) {
    notFound()
  }

  return (
    <EventTabsLayout 
      weddingId={weddingId} 
      eventId={eventId} 
      event={event}
    >
      {props.children}
    </EventTabsLayout>
  )
}