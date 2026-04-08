import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

async function checkAccess(weddingId: string, userId: string) {
  return db.weddingMember.findFirst({ where: { weddingId, userId } })
}

// ─── Timeline GET ─────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  if (!(await checkAccess(params.id, userId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const events = await db.timelineEvent.findMany({
    where: { weddingId: params.id, deletedAt: null },
    orderBy: { startTime: 'asc' },
  })

  return NextResponse.json(events.map(e => ({
    id: e.id, serverId: e.id, weddingId: e.weddingId,
    title: e.title, description: e.description ?? undefined,
    startTime: e.startTime.getTime(), endTime: e.endTime?.getTime() ?? undefined,
    location: e.location ?? undefined, assignedUserId: e.assignedUserId ?? undefined,
    vendorId: e.vendorId ?? undefined, category: e.category ?? undefined,
    color: e.color ?? undefined, isComplete: e.isComplete,
    version: e.version, checksum: e.checksum,
    syncedAt: e.updatedAt.getTime(), isDirty: false, updatedAt: e.updatedAt.getTime(),
  })))
}
