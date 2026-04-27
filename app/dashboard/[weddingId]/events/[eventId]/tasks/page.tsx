import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { TasksClient } from './tasks-client'

export default async function EventTasksPage(props: Readonly<{ params: Promise<{ weddingId: string; eventId: string }> }>) {
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

  // Fetch tasks for this event
  const tasks = await db.checklistItem.findMany({
    where: {
      weddingId,
      eventId,
      deletedAt: null
    },
    orderBy: [
      { priority: 'asc' },
      { dueDate: 'asc' },
      { order: 'asc' }
    ]
  })

  return (
    <TasksClient 
      weddingId={weddingId} 
      eventId={eventId}
      eventName={event.name}
      initialTasks={tasks} 
    />
  )
}