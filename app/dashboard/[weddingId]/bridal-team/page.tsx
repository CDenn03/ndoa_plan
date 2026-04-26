import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { BridalTeamOverviewClient } from './bridal-team-client'

export default async function BridalTeamPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const { weddingId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const userId = (session.user as typeof session.user & { id: string }).id

  const member = await db.weddingMember.findFirst({ where: { weddingId, userId } })
  if (!member) redirect('/dashboard')

  const events = await db.weddingEvent.findMany({
    where: { weddingId },
    orderBy: { date: 'asc' },
    select: {
      id: true, name: true, type: true,
      bridalTeamMembers: {
        where: { deletedAt: null },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  return <BridalTeamOverviewClient weddingId={weddingId} events={events} />
}
