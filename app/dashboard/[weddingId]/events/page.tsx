import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { EventsClient } from './events-client'

export default async function EventsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const wid = params.weddingId

  const events = await db.weddingEvent.findMany({
    where: { weddingId: wid },
    orderBy: { date: 'asc' },
    include: {
      _count: {
        select: {
          checklistItems: { where: { deletedAt: null } },
          budgetLines: { where: { deletedAt: null } },
        },
      },
    },
  })

  return (
    <EventsClient
      weddingId={wid}
      events={events.map(e => ({
        id: e.id, name: e.name, type: e.type, date: e.date.toISOString(),
        venue: e.venue, description: e.description, isMain: e.isMain,
        startTime: e.startTime, endTime: e.endTime,
        taskCount: e._count.checklistItems,
        budgetLineCount: e._count.budgetLines,
      }))}
    />
  )
}
