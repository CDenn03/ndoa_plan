import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { EventDetailClient } from './event-detail-client'

export default async function EventDetailPage(props: Readonly<{ params: Promise<{ weddingId: string; eventId: string }> }>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const { weddingId: wid, eventId } = params

  const [event, tasks, budgetLines, guestAttendances, programItems] = await Promise.all([
    db.weddingEvent.findUnique({ where: { id: eventId } }),
    db.checklistItem.findMany({
      where: { eventId, deletedAt: null },
      orderBy: [{ priority: 'asc' }, { order: 'asc' }],
    }),
    db.budgetLine.findMany({
      where: { eventId, deletedAt: null },
      orderBy: [{ category: 'asc' }],
    }),
    db.guestEventAttendance.findMany({
      where: { eventId },
      include: { guest: { select: { id: true, name: true, phone: true, rsvpStatus: true, side: true } } },
    }),
    db.eventProgramItem.findMany({
      where: { eventId },
      orderBy: { order: 'asc' },
    }),
  ])

  if (!event || event.weddingId !== wid) notFound()

  const totalEstimated = budgetLines.reduce((s, l) => s + Number(l.estimated), 0)
  const totalCommitted = budgetLines.reduce((s, l) => s + Number(l.committed) + Number(l.actual), 0)

  return (
    <EventDetailClient
      weddingId={wid}
      event={{
        id: event.id, name: event.name, type: event.type, date: event.date.toISOString(),
        venue: event.venue ?? undefined, description: event.description ?? undefined,
        startTime: event.startTime ?? undefined, endTime: event.endTime ?? undefined,
        isMain: event.isMain,
      }}
      tasks={tasks.map(t => ({
        id: t.id, title: t.title, description: t.description ?? undefined,
        category: t.category ?? undefined, phase: t.phase ?? undefined,
        dueDate: t.dueDate?.toISOString() ?? undefined,
        assignedToName: t.assignedToName ?? undefined,
        isChecked: t.isChecked, priority: t.priority, order: t.order,
        isFinalCheck: t.isFinalCheck,
      }))}
      budgetLines={budgetLines.map(l => ({
        id: l.id, category: l.category, description: l.description,
        estimated: Number(l.estimated), actual: Number(l.actual), committed: Number(l.committed),
        vendorId: l.vendorId ?? undefined,
      }))}
      guestAttendances={guestAttendances.map(a => ({
        id: a.id, rsvpStatus: a.rsvpStatus,
        guest: { id: a.guest.id, name: a.guest.name, phone: a.guest.phone ?? undefined, side: a.guest.side },
      }))}
      programItems={programItems.map(p => ({
        id: p.id, title: p.title, description: p.description ?? undefined,
        startTime: p.startTime ?? undefined, endTime: p.endTime ?? undefined,
        duration: p.duration ?? undefined, order: p.order,
        assignedTo: p.assignedTo ?? undefined,
      }))}
      budgetSummary={{ totalEstimated, totalCommitted }}
    />
  )
}
