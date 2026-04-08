import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { MoodboardClient } from './moodboard-client'

const CATEGORIES = ['DECOR', 'OUTFITS', 'FLOWERS', 'VENUE', 'OTHER']

export default async function MoodboardPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const wid = params.weddingId

  const images = await db.mediaItem.findMany({
    where: { weddingId: wid, linkedToType: 'moodboard', deletedAt: null, mimeType: { startsWith: 'image/' } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <MoodboardClient
      weddingId={wid}
      categories={CATEGORIES}
      initialImages={images.map(img => ({
        id: img.id, path: img.path, bucket: img.bucket,
        title: img.title ?? undefined, category: img.linkedToId ?? 'OTHER',
      }))}
    />
  )
}
