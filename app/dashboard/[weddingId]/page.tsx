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
  const now = new Date()
  const thirtyDaysOut = new Date(now.getTime() + 30 * 86400000)

  const [
    wedding, guestCounts, vendorCounts, budgetLines,
    activeRisks, upcomingEvents, upcomingTasks, moodImages,
    contributions, nextAppointment,
  ] = await Promise.all([
    db.wedding.findUnique({ where: { id: wid } }),
    db.guest.groupBy({ by: ['rsvpStatus'], where: { weddingId: wid, deletedAt: null }, _count: true }),
    db.vendor.groupBy({ by: ['status'], where: { weddingId: wid, deletedAt: null }, _count: true }),
    db.budgetLine.findMany({ where: { weddingId: wid, deletedAt: null }, select: { estimated: true, actual: true } }),
    db.riskAlert.findMany({ where: { weddingId: wid, isResolved: false }, orderBy: { severity: 'asc' }, take: 5 }),
    db.weddingEvent.findMany({
      where: { weddingId: wid, date: { gte: now } },
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
      orderBy: { createdAt: 'desc' }, take: 6,
      select: { id: true, path: true, bucket: true, title: true },
    }),
    db.committeeContribution.findMany({
      where: { weddingId: wid },
      select: { pledgeAmount: true, paidAmount: true, memberId: true },
    }),
    db.appointment.findFirst({
      where: { weddingId: wid, startAt: { gte: now }, status: 'SCHEDULED' },
      orderBy: { startAt: 'asc' },
      select: { id: true, title: true, startAt: true, location: true, vendorId: true },
    }),
  ])

  if (!wedding) redirect('/dashboard')

  const confirmed = guestCounts.find(g => g.rsvpStatus === 'CONFIRMED')?._count ?? 0
  const pending = guestCounts.find(g => g.rsvpStatus === 'PENDING')?._count ?? 0
  const totalGuests = guestCounts.reduce((s, g) => s + g._count, 0)
  const confirmedVendors = vendorCounts.find(v => v.status === 'CONFIRMED')?._count ?? 0
  const totalVendors = vendorCounts.reduce((s, v) => s + v._count, 0)
  const totalBudget = budgetLines.reduce((s, l) => s + Number(l.estimated), 0)
  const totalActual = budgetLines.reduce((s, l) => s + Number(l.actual), 0)
  const daysToWedding = differenceInDays(wedding.date, now)

  const totalPledged = contributions.reduce((s, c) => s + Number(c.pledgeAmount), 0)
  const totalContribPaid = contributions.reduce((s, c) => s + Number(c.paidAmount), 0)
  const contributorCount = new Set(contributions.map(c => c.memberId)).size

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
          totalBudget, totalSpent: totalActual, totalActual,
          budgetPercent: totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0,
          upcomingTasks: upcomingTasks.length, overdueTasks: 0,
          activeRisks: activeRisks.length,
          criticalRisks: activeRisks.filter(r => r.severity === 'CRITICAL').length,
          daysToWedding,
          totalPledged, totalContribPaid, contributorCount,
        }}
        recentRisks={activeRisks.map(r => ({ id: r.id, severity: r.severity, message: r.message, category: r.category }))}
        upcomingEvents={upcomingEvents.map(e => ({ id: e.id, name: e.name, type: e.type, date: e.date.toISOString() }))}
        upcomingTasks={upcomingTasks.filter(t => t.dueDate).map(t => ({
          id: t.id, title: t.title, dueDate: t.dueDate!.toISOString(),
          category: t.category ?? undefined, isOverdue: t.dueDate! < now,
        }))}
        moodImages={moodImages.map(m => ({ id: m.id, path: m.path, bucket: m.bucket, title: m.title ?? undefined }))}
        nextAppointment={nextAppointment ? {
          id: nextAppointment.id, title: nextAppointment.title,
          startAt: nextAppointment.startAt.toISOString(),
          location: nextAppointment.location ?? undefined,
        } : undefined}
      />
    </Suspense>
  )
}
