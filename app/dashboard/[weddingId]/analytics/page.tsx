import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { AnalyticsClient } from './analytics-client'
import { addBudgetAmounts } from '@/lib/budget-helpers'

export default async function AnalyticsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const wid = params.weddingId

  const [wedding, guestCounts, vendorCounts, budgetLines, checklistCounts, payments] = await Promise.all([
    db.wedding.findUnique({ where: { id: wid }, select: { name: true, budget: true, currency: true } }),
    db.guest.groupBy({ by: ['rsvpStatus'], where: { weddingId: wid, deletedAt: null }, _count: true }),
    db.vendor.groupBy({ by: ['status'], where: { weddingId: wid, deletedAt: null }, _count: true }),
    db.budgetLine.findMany({ where: { weddingId: wid, deletedAt: null }, select: { category: true, estimated: true, actual: true } }),
    db.checklistItem.groupBy({ by: ['isChecked'], where: { weddingId: wid, deletedAt: null }, _count: true }),
    db.payment.findMany({ where: { weddingId: wid, status: 'COMPLETED', deletedAt: null }, select: { amount: true, createdAt: true }, orderBy: { createdAt: 'asc' } }),
  ])

  if (!wedding) redirect('/dashboard')

  const totalBudget = budgetLines.reduce((s, l) => addBudgetAmounts(s, l.estimated), 0)
  const totalSpent = budgetLines.reduce((s, l) => addBudgetAmounts(s, l.actual), 0)
  const totalActual = budgetLines.reduce((s, l) => addBudgetAmounts(s, l.actual), 0)

  // Budget by category
  const budgetByCategory = Object.entries(
    budgetLines.reduce<Record<string, { estimated: number; actual: number }>>((acc, l) => {
      if (!acc[l.category]) acc[l.category] = { estimated: 0, actual: 0 }
      acc[l.category].estimated = addBudgetAmounts(acc[l.category].estimated, l.estimated)
      acc[l.category].actual = addBudgetAmounts(acc[l.category].actual, l.actual)
      return acc
    }, {})
  ).map(([name, vals]) => ({ name, ...vals, total: vals.actual }))
    .sort((a, b) => b.total - a.total)

  const confirmed = guestCounts.find(g => g.rsvpStatus === 'CONFIRMED')?._count ?? 0
  const pending = guestCounts.find(g => g.rsvpStatus === 'PENDING')?._count ?? 0
  const declined = guestCounts.find(g => g.rsvpStatus === 'DECLINED')?._count ?? 0
  const totalGuests = guestCounts.reduce((s, g) => s + g._count, 0)

  const checkedCount = checklistCounts.find(c => c.isChecked)?._count ?? 0
  const totalChecklist = checklistCounts.reduce((s, c) => s + c._count, 0)

  const confirmedVendors = vendorCounts.find(v => v.status === 'CONFIRMED')?._count ?? 0
  const bookedVendors = vendorCounts.find(v => v.status === 'BOOKED')?._count ?? 0
  const totalVendors = vendorCounts.reduce((s, v) => s + v._count, 0)

  const costPerGuest = confirmed > 0 ? Math.round(totalActual / confirmed) : 0

  return (
    <AnalyticsClient
      weddingId={wid}
      weddingName={wedding.name}
      currency={wedding.currency}
      totalBudget={totalBudget}
      totalSpent={totalSpent}
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
