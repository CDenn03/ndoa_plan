import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data = await req.json()

  // Toggle-only shortcut (legacy behaviour)
  if (Object.keys(data).length === 1 && 'isChecked' in data) {
    const item = await db.checklistItem.update({
      where: { id: itemId },
      data: {
        isChecked: data.isChecked,
        checkedAt: data.isChecked ? new Date() : null,
        checkedBy: data.isChecked ? userId : null,
        version: { increment: 1 },
        updatedBy: userId,
      },
    })
    return NextResponse.json({ id: item.id, isChecked: item.isChecked })
  }

  // Full update
  const { title, description, category, phase, dueDate, assignedToName, priority, isFinalCheck, isChecked } = data
  const item = await db.checklistItem.update({
    where: { id: itemId },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description || null }),
      ...(category !== undefined && { category: category || null }),
      ...(phase !== undefined && { phase: phase || null }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(assignedToName !== undefined && { assignedToName: assignedToName || null }),
      ...(priority !== undefined && { priority }),
      ...(isFinalCheck !== undefined && { isFinalCheck }),
      ...(isChecked !== undefined && {
        isChecked,
        checkedAt: isChecked ? new Date() : null,
        checkedBy: isChecked ? userId : null,
      }),
      version: { increment: 1 },
      updatedBy: userId,
    },
  })
  return NextResponse.json({
    id: item.id, weddingId: item.weddingId, eventId: item.eventId ?? undefined,
    title: item.title, description: item.description ?? undefined,
    category: item.category ?? undefined, phase: item.phase ?? undefined,
    dueDate: item.dueDate?.getTime() ?? undefined,
    assignedToName: item.assignedToName ?? undefined,
    isChecked: item.isChecked, priority: item.priority, order: item.order,
    isFinalCheck: item.isFinalCheck, version: item.version,
  })
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.checklistItem.update({
    where: { id: itemId },
    data: { deletedAt: new Date(), updatedBy: userId },
  })
  return NextResponse.json({ ok: true })
}
