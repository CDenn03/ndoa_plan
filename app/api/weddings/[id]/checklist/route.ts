import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: params.id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('eventId')

  const items = await db.checklistItem.findMany({
    where: {
      weddingId: params.id,
      deletedAt: null,
      ...(eventId ? { eventId } : {}),
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(items.map(i => ({
    id: i.id, serverId: i.id, weddingId: i.weddingId,
    eventId: i.eventId ?? undefined,
    title: i.title, description: i.description ?? undefined,
    category: i.category ?? undefined,
    phase: i.phase ?? undefined,
    dueDate: i.dueDate?.getTime() ?? undefined,
    assignedTo: i.assignedTo ?? undefined,
    assignedToName: i.assignedToName ?? undefined,
    isFinalCheck: i.isFinalCheck,
    isChecked: i.isChecked, checkedAt: i.checkedAt?.getTime() ?? undefined,
    checkedBy: i.checkedBy ?? undefined, priority: i.priority, order: i.order,
    version: i.version, checksum: i.checksum,
    syncedAt: i.updatedAt.getTime(), isDirty: false, updatedAt: i.updatedAt.getTime(),
  })))
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: params.id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, category, eventId, phase, dueDate, assignedTo, assignedToName, priority, order, isFinalCheck, isChecked } = body
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const item = await db.checklistItem.create({
    data: {
      weddingId: params.id, eventId: eventId || null,
      title: title.trim(), description: description || null,
      category: category || null, phase: phase || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedTo: assignedTo || null, assignedToName: assignedToName || null,
      priority: priority ?? 2, order: order ?? 0,
      isFinalCheck: isFinalCheck ?? false, isChecked: isChecked ?? false,
      version: 1, checksum: '', updatedBy: userId,
    },
  })

  return NextResponse.json({
    id: item.id, weddingId: item.weddingId, eventId: item.eventId ?? undefined,
    title: item.title, description: item.description ?? undefined,
    category: item.category ?? undefined, phase: item.phase ?? undefined,
    dueDate: item.dueDate?.toISOString() ?? undefined,
    assignedToName: item.assignedToName ?? undefined,
    isChecked: item.isChecked, priority: item.priority, order: item.order,
    isFinalCheck: item.isFinalCheck,
  }, { status: 201 })
}
