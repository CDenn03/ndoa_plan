import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export default async function DashboardRootPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const userId = (session.user as typeof session.user & { id: string }).id
  const membership = await db.weddingMember.findFirst({
    where: { userId },
    include: { wedding: true },
    orderBy: { wedding: { date: 'asc' } },
  })

  if (!membership) redirect('/onboarding')
  redirect(`/dashboard/${membership.weddingId}`)
}
