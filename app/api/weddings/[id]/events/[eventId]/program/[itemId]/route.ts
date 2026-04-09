import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { resolveTimings } from '../route'

type Params = { params: Promise<{ id: string; eventId: string; itemId: string }> }

export async function PATCH(req: NextRequest, props: Params) {
  const { id, itemId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data = await req.json()

  // Resolve timings if any time field is being updated
  let timingUpdate: { startTime?: string | null; endTime?: string | null; duration?: number | null } = {}
  if ('startTime' in data || 'endTime' in data || 'duration' in data) {
    const current = await db.eventProgramItem.findUnique({ where: { id: itemId } })
    const resolved = resolveTimings(
      'startTime' in data ? (data.startTime || null) : current?.startTime ?? null,
      'endTime' in data ? (data.endTime || null) : current?.endTime ?? null,
      'duration' in data ? (data.duration != null ? Number(data.duration) : null) : current?.duration ?? null,
    )
    timingUpdate = resolved
  }

  const item = await db.eventProgramItem.update({
    where: { id: itemId },
    data: {
      ...(data.title != null && { title: data.title }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo || null }),
      ...(data.order != null && { order: data.order }),
      ...timingUpdate,
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, props: Params) {
  const { id, itemId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.eventProgramItem.delete({ where: { id: itemId } })
  return NextResponse.json({ ok: true })
}
