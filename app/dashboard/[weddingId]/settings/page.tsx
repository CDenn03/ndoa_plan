import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { WeddingSettingsClient } from './settings-client'

export default async function SettingsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = await props.params;
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const userId = (session.user as typeof session.user & { id: string }).id

  const member = await db.weddingMember.findFirst({
    where: { weddingId: params.weddingId, userId },
    include: { wedding: true },
  })
  if (!member) redirect('/dashboard')

  const w = member.wedding
  return (
    <WeddingSettingsClient
      weddingId={w.id}
      initialValues={{
        name: w.name,
        date: w.date.toISOString().split('T')[0],
        venue: w.venue ?? '',
        venueCapacity: w.venueCapacity ?? '',
        budget: Number(w.budget),
        culturalType: w.culturalType,
        themeColor: w.themeColor,
        themeAccent: w.themeAccent,
      }}
    />
  )
}
