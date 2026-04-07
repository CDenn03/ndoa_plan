import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { DashboardClient } from './dashboard-client'
import { Spinner } from '@/components/ui'
import { differenceInDays } from 'date-fns'

export default async function DashboardPage({ params }: { params: { weddingId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const wid = params.weddingId

  const [wedding, guestCounts, vendorCounts, budgetLines, checklistCounts, activeRisks] = await Promise.all([
    db.wedding.findUnique({ where: { id: wid } }),
    db.guest.groupBy({ by: ['rsvpStatus'], where: { weddingId: wid, deletedAt: null }, _count: true }),
    db.vendor.groupBy({ by: ['status'], where: { weddingId: wid, deletedAt: null }, _count: true }),
    db.budgetLine.findMany({ where: { weddingId: wid, deletedAt: null }, select: { estimated: true, actual: true, committed: true } }),
    db.checklistItem.aggregate({ where: { weddingId: wid, deletedAt: null }, _count: { _all: true }, _sum: { isChecked: false as never } }),
    db.riskAlert.findMany({ where: { weddingId: wid, isResolved: false }, orderBy: { severity: 'asc' }, take: 5 }),
  ])

  if (!wedding) redirect('/dashboard')

  const confirmed = guestCounts.find(g => g.rsvpStatus === 'CONFIRMED')?._count ?? 0
  const pending = guestCounts.find(g => g.rsvpStatus === 'PENDING')?._count ?? 0
  const totalGuests = guestCounts.reduce((s, g) => s + g._count, 0)
  const confirmedVendors = vendorCounts.find(v => v.status === 'CONFIRMED')?._count ?? 0
  const totalVendors = vendorCounts.reduce((s, v) => s + v._count, 0)
  const totalBudget = Number(wedding.budget)
  const totalSpent = budgetLines.reduce((s, l) => s + Number(l.actual), 0)
  const totalCommitted = budgetLines.reduce((s, l) => s + Number(l.committed) + Number(l.actual), 0)
  const daysToWedding = differenceInDays(wedding.date, new Date())
  const totalChecklist = checklistCounts._count._all

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Spinner /></div>}>
      <DashboardClient
        wedding={{ id: wedding.id, name: wedding.name, date: wedding.date.toISOString(), venue: wedding.venue ?? undefined, themeColor: wedding.themeColor, budget: totalBudget }}
        summary={{
          guestCount: totalGuests, confirmedCount: confirmed, pendingCount: pending, checkedInCount: 0,
          vendorCount: totalVendors, confirmedVendors,
          totalBudget, totalSpent, totalCommitted,
          budgetPercent: totalBudget > 0 ? Math.round((totalCommitted / totalBudget) * 100) : 0,
          upcomingTasks: totalChecklist, overdueTasks: 0,
          activeRisks: activeRisks.length,
          criticalRisks: activeRisks.filter(r => r.severity === 'CRITICAL').length,
          daysToWedding,
        }}
        recentRisks={activeRisks.map(r => ({ id: r.id, severity: r.severity, message: r.message, category: r.category }))}
      />
    </Suspense>
  )
}
