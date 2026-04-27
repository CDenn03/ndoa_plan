import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { EventAnalyticsClient } from './analytics-client'
import { addBudgetAmounts } from '@/lib/budget-helpers'

export default async function EventAnalyticsPage(
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

  const [guestCounts, vendorCounts, budgetLines, checklistCounts, payments] = await Promise.all([
    db.guest.groupBy({
      by: ['rsvpStatus'],
      where: { weddingId, deletedAt: null },
      _count: { _all: true },
    }),
    db.vendor.groupBy({
      by: ['status'],
      where: { weddingId, deletedAt: null },
      _count: { _all: true },
    }),
    db.budgetLine.findMany({
      where: { weddingId, eventId, deletedAt: null },
      select: { category: true, estimated: true, actual: true },
    }),
    db.checklistItem.groupBy({
      by: ['isChecked'],
      where: { weddingId, eventId, deletedAt: null },
      _count: { _all: true },
    }),
    db.payment.findMany({
      where: { weddingId, eventId, status: 'COMPLETED', deletedAt: null },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const totalBudget = budgetLines.reduce((s, l) => addBudgetAmounts(s, l.estimated), 0)
  const totalActual = budgetLines.reduce((s, l) => addBudgetAmounts(s, l.actual), 0)

  const budgetByCategory = Object.entries(
    budgetLines.reduce<Record<string, { estimated: number; actual: number }>>((acc, l) => {
      if (!acc[l.category]) acc[l.category] = { estimated: 0, actual: 0 }
      acc[l.category].estimated = addBudgetAmounts(acc[l.category].estimated, l.estimated)
      acc[l.category].actual = addBudgetAmounts(acc[l.category].actual, l.actual)
      return acc
    }, {})
  )
    .map(([name, vals]) => ({ name, ...vals, total: vals.actual }))
    .sort((a, b) => b.total - a.total)

  const confirmed = guestCounts.find(g => g.rsvpStatus === 'CONFIRMED')?._count._all ?? 0
  const pending = guestCounts.find(g => g.rsvpStatus === 'PENDING')?._count._all ?? 0
  const declined = guestCounts.find(g => g.rsvpStatus === 'DECLINED')?._count._all ?? 0
  const totalGuests = guestCounts.reduce((s, g) => s + g._count._all, 0)

  const checkedCount = checklistCounts.find(c => c.isChecked)?._count._all ?? 0
  const totalChecklist = checklistCounts.reduce((s, c) => s + c._count._all, 0)

  const confirmedVendors = vendorCounts.find(v => v.status === 'CONFIRMED')?._count._all ?? 0
  const bookedVendors = vendorCounts.find(v => v.status === 'BOOKED')?._count._all ?? 0
  const totalVendors = vendorCounts.reduce((s, v) => s + v._count._all, 0)

  const costPerGuest = confirmed > 0 ? Math.round(totalActual / confirmed) : 0

  return (
    <EventAnalyticsClient
      weddingId={weddingId}
      eventId={eventId}
      eventName={event.name}
      totalBudget={totalBudget}
      totalActual={totalActual}
      budgetByCategory={budgetByCategory}
      guestStats={{ confirmed, pending, declined, total: totalGuests }}
      vendorStats={{ confirmed: confirmedVendors, booked: bookedVendors, total: totalVendors }}
      checklistStats={{ checked: checkedCount, total: totalChecklist }}
      costPerGuest={costPerGuest}
      payments={payments.map(p => ({ amount: Number(p.amount), createdAt: p.createdAt.toISOString() }))}
    />
  )
}
