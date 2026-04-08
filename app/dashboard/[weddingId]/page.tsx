import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { DashboardClient } from './dashboard-client'
import { Spinner } from '@/components/ui'
import { differenceInDays } from 'date-fns'

export default async function DashboardPage(props: { params: Promise<{ weddingId: string }> }) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const wid = params.weddingId
  const thirtyDaysOut = new Date(new Date().getTime() + 30 * 86400000)

  const [wedding, guestCounts, vendorCounts, budgetLines, activeRisks, upcomingEvents, upcomingTasks, moodImages, phaseItems] = await Promise.all([
    db.wedding.findUnique({ where: { id: wid } }),
    db.guest.groupBy({ by: ['rsvpStatus'], where: { weddingId: wid, deletedAt: null }, _count: true }),
    db.vendor.groupBy({ by: ['status'], where: { weddingId: wid, deletedAt: null }, _count: true }),
    db.budgetLine.findMany({ where: { weddingId: wid, deletedAt: null }, select: { estimated: true, actual: true, committed: true } }),
    db.riskAlert.findMany({ where: { weddingId: wid, isResolved: false }, orderBy: { severity: 'asc' }, take: 5 }),
    db.weddingEvent.findMany({
      where: { weddingId: wid, date: { gte: new Date() } },
      orderBy: { date: 'asc' }, take: 5,
      select: { id: true, name: true, type: true, date: true },
    }),
    db.checklistItem.findMany({
      where: { weddingId: wid, deletedAt: null, isChecked: false, dueDate: { lte: thirtyDaysOut } },
      orderBy: { dueDate: 'asc' }, take: 10,
      select: { id: true, title: true, dueDate: true, category: true },
    }),
    db.mediaItem.findMany({
      where: { weddingId: wid, linkedToType: 'moodboard', deletedAt: null, mimeType: { startsWith: 'image/' } },
      orderBy: { createdAt: 'desc' }, take: 4,
      select: { id: true, path: true, bucket: true, title: true },
    }),
    db.checklistItem.findMany({
      where: { weddingId: wid, deletedAt: null, phase: { not: null } },
      select: { phase: true, isChecked: true },
    }),
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

  const phaseMap: Record<string, { total: number; done: number }> = {}
  for (const item of phaseItems) {
    if (!item.phase) continue
    if (!phaseMap[item.phase]) phaseMap[item.phase] = { total: 0, done: 0 }
    phaseMap[item.phase].total++
    if (item.isChecked) phaseMap[item.phase].done++
  }
  const phaseProgress = Object.entries(phaseMap).map(([phase, v]) => ({ phase, ...v }))
  const now = new Date()

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Spinner /></div>}>
      <DashboardClient
        wedding={{
          id: wedding.id, name: wedding.name, date: wedding.date.toISOString(),
          venue: wedding.venue ?? undefined, themeColor: wedding.themeColor, budget: totalBudget,
          couplePhotoPath: wedding.couplePhotoPath ?? undefined,
        }}
        summary={{
          guestCount: totalGuests, confirmedCount: confirmed, pendingCount: pending, checkedInCount: 0,
          vendorCount: totalVendors, confirmedVendors,
          totalBudget, totalSpent, totalCommitted,
          budgetPercent: totalBudget > 0 ? Math.round((totalCommitted / totalBudget) * 100) : 0,
          upcomingTasks: upcomingTasks.length, overdueTasks: 0,
          activeRisks: activeRisks.length,
          criticalRisks: activeRisks.filter(r => r.severity === 'CRITICAL').length,
          daysToWedding,
        }}
        recentRisks={activeRisks.map(r => ({ id: r.id, severity: r.severity, message: r.message, category: r.category }))}
        upcomingEvents={upcomingEvents.map(e => ({ id: e.id, name: e.name, type: e.type, date: e.date.toISOString() }))}
        upcomingTasks={upcomingTasks.filter(t => t.dueDate).map(t => ({
          id: t.id, title: t.title, dueDate: t.dueDate!.toISOString(),
          category: t.category ?? undefined, isOverdue: t.dueDate! < now,
        }))}
        moodImages={moodImages.map(m => ({ id: m.id, path: m.path, bucket: m.bucket, title: m.title ?? undefined }))}
        phaseProgress={phaseProgress}
      />
    </Suspense>
  )
}
