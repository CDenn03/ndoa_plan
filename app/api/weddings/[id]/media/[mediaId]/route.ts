import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; mediaId: string }> }) {
  const { id, mediaId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { linkedToId, title } = await req.json()
  const item = await db.mediaItem.update({
    where: { id: mediaId, weddingId: id },
    data: {
      ...(linkedToId !== undefined && { linkedToId: linkedToId || null }),
      ...(title !== undefined && { title: title || null }),
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; mediaId: string }> }) {
  const { id, mediaId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.mediaItem.update({ where: { id: mediaId, weddingId: id }, data: { deletedAt: new Date() } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; mediaId: string }> }) {
  const { id, mediaId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { linkedToId, title } = await req.json()
  const item = await db.mediaItem.update({
    where: { id: mediaId, weddingId: id },
    data: {
      ...(linkedToId !== undefined && { linkedToId }),
      ...(title !== undefined && { title }),
    },
  })
  return NextResponse.json(item)
}
