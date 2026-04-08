import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { DowryClient } from './dowry-client'

export default async function DowryPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const wid = params.weddingId

  const [wedding, items] = await Promise.all([
    db.wedding.findUnique({ where: { id: wid }, select: { culturalType: true } }),
    db.dowryItem.findMany({ where: { weddingId: wid }, orderBy: { createdAt: 'asc' } }),
  ])

  if (!wedding || wedding.culturalType === 'STANDARD') redirect(`/dashboard/${wid}`)

  return (
    <DowryClient
      weddingId={wid}
      items={items.map(i => ({
        ...i,
        estimatedValue: i.estimatedValue ? Number(i.estimatedValue) : null,
        agreedValue: i.agreedValue ? Number(i.agreedValue) : null,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      }))}
    />
  )
}
