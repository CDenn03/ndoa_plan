import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { DayOfClient } from './day-of-client'

export default async function DayOfPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const wid = params.weddingId

  const [events, vendors, incidents] = await Promise.all([
    db.timelineEvent.findMany({
      where: { weddingId: wid, deletedAt: null },
      orderBy: { startTime: 'asc' },
    }),
    db.vendor.findMany({
      where: { weddingId: wid, deletedAt: null, status: { in: ['CONFIRMED', 'BOOKED'] } },
      select: { id: true, name: true, category: true, contactPhone: true, contactEmail: true },
    }),
    db.incident.findMany({
      where: { weddingId: wid },
      orderBy: { reportedAt: 'desc' },
      take: 20,
    }),
  ])

  return (
    <DayOfClient
      weddingId={wid}
      events={events.map(e => ({ ...e, startTime: e.startTime.toISOString(), endTime: e.endTime?.toISOString() ?? null, createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString() }))}
      vendors={vendors}
      incidents={incidents.map(i => ({ ...i, reportedAt: i.reportedAt.toISOString(), resolvedAt: i.resolvedAt?.toISOString() ?? null }))}
    />
  )
}
