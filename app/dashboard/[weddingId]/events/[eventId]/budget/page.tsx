import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { BudgetClient } from './budget-client'

export default async function EventBudgetPage(props: Readonly<{ params: Promise<{ weddingId: string; eventId: string }> }>) {
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

  // Fetch budget lines for this event
  const budgetLines = await db.budgetLine.findMany({
    where: {
      weddingId,
      eventId,
      deletedAt: null
    },
    orderBy: [
      { category: 'asc' },
      { description: 'asc' }
    ]
  })

  // Fetch payments linked to these budget lines
  const payments = await db.payment.findMany({
    where: {
      weddingId,
      budgetLineId: { in: budgetLines.map(bl => bl.id) },
      deletedAt: null
    },
    orderBy: { paymentDate: 'desc' }
  })

  return (
    <BudgetClient 
      weddingId={weddingId} 
      eventId={eventId}
      eventName={event.name}
      initialBudgetLines={budgetLines}
      initialPayments={payments}
    />
  )
}