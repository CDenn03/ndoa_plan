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
  })

  return <EventsClient weddingId={wid} events={events.map(e => ({ ...e, date: e.date.toISOString() }))} />
}
