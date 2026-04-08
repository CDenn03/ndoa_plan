import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { DocumentsClient } from './documents-client'

const CATEGORIES = ['CONTRACT', 'PERMIT', 'ID', 'CERTIFICATE', 'OTHER']

export default async function DocumentsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const wid = params.weddingId

  const docs = await db.mediaItem.findMany({
    where: { weddingId: wid, linkedToType: 'document', deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <DocumentsClient
      weddingId={wid}
      categories={CATEGORIES}
      initialDocs={docs.map(d => ({
        id: d.id, path: d.path, bucket: d.bucket,
        title: d.title ?? undefined, mimeType: d.mimeType,
        category: d.linkedToId ?? 'OTHER',
        createdAt: d.createdAt.toISOString(),
      }))}
    />
  )
}
