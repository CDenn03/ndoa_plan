import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { LogisticsClient } from './logistics-client'

export default async function LogisticsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const wid = params.weddingId

  const [routes, accommodations] = await Promise.all([
    db.transportRoute.findMany({
      where: { weddingId: wid },
      include: { assignedVendor: { select: { id: true, name: true } } },
      orderBy: { departureTime: 'asc' },
    }),
    db.accommodation.findMany({
      where: { weddingId: wid },
      orderBy: { checkIn: 'asc' },
    }),
  ])

  return (
    <LogisticsClient
      weddingId={wid}
      routes={routes.map(r => ({ ...r, departureTime: r.departureTime.toISOString(), createdAt: r.createdAt.toISOString() }))}
      accommodations={accommodations.map(a => ({ ...a, checkIn: a.checkIn.toISOString(), checkOut: a.checkOut.toISOString(), createdAt: a.createdAt.toISOString() }))}
    />
  )
}
