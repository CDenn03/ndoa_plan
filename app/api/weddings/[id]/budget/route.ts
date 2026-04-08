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

  const lines = await db.budgetLine.findMany({
    where: { weddingId: params.id, deletedAt: null },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(lines.map(l => ({
    id: l.id, serverId: l.id, weddingId: l.weddingId,
    category: l.category, description: l.description,
    estimated: Number(l.estimated), actual: Number(l.actual), committed: Number(l.committed),
    vendorId: l.vendorId ?? undefined, notes: l.notes ?? undefined,
    version: l.version, checksum: l.checksum,
    syncedAt: l.updatedAt.getTime(), isDirty: false, updatedAt: l.updatedAt.getTime(),
  })))
}
