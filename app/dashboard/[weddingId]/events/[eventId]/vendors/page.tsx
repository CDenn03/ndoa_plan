import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { VendorsClient } from './vendors-client'

export default async function EventVendorsPage(props: Readonly<{ params: Promise<{ weddingId: string; eventId: string }> }>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const { weddingId, eventId } = params

  // Verify event belongs to wedding
  const event = await db.weddingEvent.findUnique({
    where: { id: eventId },
    select: { id: true, weddingId: true, name: true }
  })

  if (!event?.weddingId || event.weddingId !== weddingId) {
    notFound()
  }

  // Fetch vendors and their event assignments
  const vendors = await db.vendor.findMany({
    where: {
      weddingId,
      deletedAt: null
    },
    include: {
      eventAssignments: {
        where: { eventId },
        select: {
          id: true,
          notes: true,
        }
      },
      vendorNotes: {
        orderBy: { createdAt: 'desc' },
        take: 3
      }
    },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  })

  return (
    <VendorsClient 
      weddingId={weddingId} 
      eventId={eventId}
      eventName={event.name}
      initialVendors={vendors} 
    />
  )
}