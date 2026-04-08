import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { AppointmentsClient } from './appointments-client'

export default async function AppointmentsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const userId = (session.user as typeof session.user & { id: string }).id
  const wid = params.weddingId

  const [appointments, vendors] = await Promise.all([
    db.appointment.findMany({
      where: { weddingId: wid },
      include: { vendor: { select: { id: true, name: true, category: true } } },
      orderBy: { startAt: 'asc' },
    }),
    db.vendor.findMany({
      where: { weddingId: wid, deletedAt: null },
      select: { id: true, name: true, category: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <AppointmentsClient
      weddingId={wid}
      userId={userId}
      appointments={appointments.map(a => ({
        ...a,
        startAt: a.startAt.toISOString(),
        endAt: a.endAt?.toISOString() ?? null,
        reminderAt: a.reminderAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }))}
      vendors={vendors}
    />
  )
}
