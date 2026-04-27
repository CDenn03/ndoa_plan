import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { PaymentsClient } from './payments-client'

export default async function EventPaymentsPage(props: Readonly<{ params: Promise<{ weddingId: string; eventId: string }> }>) {
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

  // Fetch payments for this event (via budget lines)
  const budgetLines = await db.budgetLine.findMany({
    where: {
      weddingId,
      eventId,
      deletedAt: null
    },
    select: { id: true }
  })

  const budgetLineIds = budgetLines.map(bl => bl.id)

  const payments = await db.payment.findMany({
    where: {
      OR: [
        { budgetLineId: { in: budgetLineIds } },
        { weddingId, eventId } // Direct event payments
      ],
      deletedAt: null
    },
    include: {
      budgetLine: {
        select: {
          id: true,
          description: true,
          category: true
        }
      }
    },
    orderBy: { paymentDate: 'desc' }
  })

  // Fetch outstanding budget lines (where actual < estimated)
  const outstandingBudgetLines = await db.budgetLine.findMany({
    where: {
      weddingId,
      eventId,
      deletedAt: null
    },
    select: {
      id: true,
      description: true,
      category: true,
      estimated: true,
      actual: true
    }
  }).then(lines => 
    lines.filter(line => line.actual < line.estimated)
  )

  // Serialize Decimal fields to plain numbers before passing to client component
  const serializedPayments = payments.map(p => ({
    ...p,
    amount: Number(p.amount),
    paymentDate: p.paymentDate.toISOString(),
    processedAt: p.processedAt?.toISOString() ?? null,
    reconciledAt: p.reconciledAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    deletedAt: p.deletedAt?.toISOString() ?? null,
  }))

  const serializedBudgetLines = outstandingBudgetLines.map(bl => ({
    ...bl,
    estimated: Number(bl.estimated),
    actual: Number(bl.actual),
  }))

  return (
    <PaymentsClient 
      weddingId={weddingId} 
      eventId={eventId}
      eventName={event.name}
      initialPayments={serializedPayments}
      outstandingBudgetLines={serializedBudgetLines}
    />
  )
}