import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { BridalTeamTab } from '@/components/features/bridal-team-components'

export default async function EventBridalTeamPage(
  props: Readonly<{ params: Promise<{ weddingId: string; eventId: string }> }>
) {
  const { weddingId, eventId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const event = await db.weddingEvent.findUnique({
    where: { id: eventId },
    select: { id: true, weddingId: true, name: true },
  })
  if (!event || event.weddingId !== weddingId) notFound()

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">People</p>
          <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Bridal Team</h1>
          <p className="text-sm text-[#14161C]/40 mt-1">{event.name}</p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-8 py-10">
        <BridalTeamTab weddingId={weddingId} eventId={eventId} />
      </div>
    </div>
  )
}
