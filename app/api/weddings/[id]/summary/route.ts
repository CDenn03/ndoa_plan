import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { differenceInDays } from 'date-fns'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({
    where: { weddingId: params.id, userId },
    include: { wedding: true },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const wid = params.id
  const now = new Date()

  const [guestCounts, vendorCounts, checkedIn, budgetAgg, checklistAgg, riskCount, nextEvent] = await Promise.all([
    db.guest.groupBy({ by: ['rsvpStatus'], where: { weddingId: wid, deletedAt: null }, _count: true }),
    db.vendor.groupBy({ by: ['status'], where: { weddingId: wid, deletedAt: null }, _count: true }),
    db.guest.count({ where: { weddingId: wid, checkedIn: true } }),
    db.budgetLine.aggregate({
      where: { weddingId: wid, deletedAt: null },
      _sum: { estimated: true, actual: true },
    }),
    db.checklistItem.groupBy({ by: ['isChecked'], where: { weddingId: wid, deletedAt: null }, _count: true }),
    db.riskAlert.groupBy({ by: ['severity', 'isResolved'], where: { weddingId: wid, isResolved: false }, _count: true }),
    db.weddingEvent.findFirst({
      where: { weddingId: wid, date: { gte: now } },
      orderBy: { date: 'asc' },
      select: { date: true },
    }),
  ])

  const confirmed = guestCounts.find(g => g.rsvpStatus === 'CONFIRMED')?._count ?? 0
  const pending = guestCounts.find(g => g.rsvpStatus === 'PENDING')?._count ?? 0
  const totalGuests = guestCounts.reduce((s, g) => s + g._count, 0)
  const totalVendors = vendorCounts.reduce((s, v) => s + v._count, 0)
  const confirmedVendors = vendorCounts.find(v => v.status === 'CONFIRMED')?._count ?? 0
  const totalBudget = Number(budgetAgg._sum.estimated ?? 0)
  const totalEstimated = totalBudget
  const totalActual = Number(budgetAgg._sum.actual ?? 0)
  const checkedCount = checklistAgg.find(c => c.isChecked)?._count ?? 0
  const totalChecklist = checklistAgg.reduce((s, c) => s + c._count, 0)
  const activeRisks = riskCount.reduce((s, r) => s + r._count, 0)
  const criticalRisks = riskCount.find(r => r.severity === 'CRITICAL')?._count ?? 0
  const daysToWedding = nextEvent ? differenceInDays(nextEvent.date, now) : null

  return NextResponse.json({
    guestCount: totalGuests,
    confirmedCount: confirmed,
    pendingCount: pending,
    checkedInCount: checkedIn,
    vendorCount: totalVendors,
    confirmedVendors,
    totalBudget,
    totalEstimated,
    totalSpent: totalActual,
    totalActual,
    budgetPercent: totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0,
    upcomingTasks: totalChecklist - checkedCount,
    overdueTasks: 0,
    checklistProgress: totalChecklist > 0 ? Math.round((checkedCount / totalChecklist) * 100) : 0,
    activeRisks,
    criticalRisks,
    daysToWedding,
  })
}
