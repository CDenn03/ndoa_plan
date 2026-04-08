import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { GiftsClient } from './gifts-client'

export default async function GiftsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const wid = params.weddingId

  const [registry, received] = await Promise.all([
    db.giftRegistryItem.findMany({ where: { weddingId: wid }, orderBy: { priority: 'asc' } }),
    db.giftReceived.findMany({ where: { weddingId: wid }, orderBy: { receivedAt: 'desc' } }),
  ])

  return (
    <GiftsClient
      weddingId={wid}
      registry={registry.map(r => ({ ...r, estimatedPrice: r.estimatedPrice ? Number(r.estimatedPrice) : null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }))}
      received={received.map(r => ({ ...r, estimatedValue: r.estimatedValue ? Number(r.estimatedValue) : null, receivedAt: r.receivedAt.toISOString(), thankYouSentAt: r.thankYouSentAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }))}
    />
  )
}
