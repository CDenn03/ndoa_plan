import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: params.id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const items = await db.checklistItem.findMany({
    where: { weddingId: params.id, deletedAt: null },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(items.map(i => ({
    id: i.id, serverId: i.id, weddingId: i.weddingId,
    title: i.title, description: i.description ?? undefined,
    category: i.category ?? undefined, dueDate: i.dueDate?.getTime() ?? undefined,
    assignedTo: i.assignedTo ?? undefined,
    isChecked: i.isChecked, checkedAt: i.checkedAt?.getTime() ?? undefined,
    checkedBy: i.checkedBy ?? undefined, priority: i.priority, order: i.order,
    version: i.version, checksum: i.checksum,
    syncedAt: i.updatedAt.getTime(), isDirty: false, updatedAt: i.updatedAt.getTime(),
  })))
}
