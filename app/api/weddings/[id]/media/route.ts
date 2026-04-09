import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { bucket, path, mimeType, linkedToType, linkedToId, title, sizeBytes, eventId } = await req.json()
  if (!bucket || !path || !mimeType) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const item = await db.mediaItem.create({
    data: {
      weddingId: id, bucket, path, mimeType,
      eventId: eventId ?? null,
      linkedToType: linkedToType ?? null,
      linkedToId: linkedToId ?? null,
      title: title ?? null,
      sizeBytes: sizeBytes ?? null,
      uploadedBy: userId,
    },
  })

  return NextResponse.json(item, { status: 201 })
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const items = await db.mediaItem.findMany({
    where: { weddingId: id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(items.map(i => ({
    id: i.id, weddingId: i.weddingId, eventId: i.eventId ?? undefined,
    title: i.title ?? undefined, bucket: i.bucket, path: i.path,
    mimeType: i.mimeType, sizeBytes: i.sizeBytes ?? undefined,
    linkedToId: i.linkedToId ?? undefined, linkedToType: i.linkedToType ?? undefined,
  })))
}
