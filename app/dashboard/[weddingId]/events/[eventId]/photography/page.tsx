import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { PhotographyClient } from './photography-client'

export default async function EventPhotographyPage(props: Readonly<{ params: Promise<{ weddingId: string; eventId: string }> }>) {
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

  // Fetch photography deliverables (stored as checklist items with category='PHOTOGRAPHY')
  const deliverables = await db.checklistItem.findMany({
    where: {
      weddingId,
      eventId,
      category: 'PHOTOGRAPHY',
      description: 'deliverable',
      deletedAt: null
    },
    orderBy: [
      { priority: 'asc' },
      { order: 'asc' }
    ]
  })

  // Fetch photography vendor for this event
  const photographyVendor = await db.vendor.findFirst({
    where: {
      weddingId,
      category: 'PHOTOGRAPHY',
      eventAssignments: {
        some: { eventId }
      },
      deletedAt: null
    },
    include: {
      eventAssignments: {
        where: { eventId },
        select: { notes: true }
      }
    }
  })

  return (
    <PhotographyClient 
      weddingId={weddingId} 
      eventId={eventId}
      eventName={event.name}
      initialDeliverables={deliverables}
      photographyVendor={photographyVendor}
    />
  )
}