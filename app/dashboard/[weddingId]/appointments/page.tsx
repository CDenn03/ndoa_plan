import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AppointmentsClient } from './appointments-client'
import { db } from '@/lib/db'

interface WeddingEvent { id: string; name: string; type: string; date: string }

export default async function AppointmentsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = await props.params
  const wid = params.weddingId
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return <div>Unauthorized</div>
  }

  // Fetch vendors and events server-side
  const [vendors, events] = await Promise.all([
    db.vendor.findMany({
      where: { weddingId: wid },
      select: { id: true, name: true, category: true },
      orderBy: { name: 'asc' }
    }),
    db.weddingEvent.findMany({
      where: { weddingId: wid },
      select: { id: true, name: true, type: true, date: true },
      orderBy: { date: 'asc' }
    })
  ])

  const userId = (session.user as { id: string }).id ?? ''

  // Convert events to match the expected interface
  const formattedEvents: WeddingEvent[] = events.map(event => ({
    id: event.id,
    name: event.name,
    type: event.type,
    date: event.date.toISOString()
  }))

  return (
    <AppointmentsClient 
      weddingId={wid} 
      userId={userId} 
      vendors={vendors} 
      events={formattedEvents}
    />
  )
}
