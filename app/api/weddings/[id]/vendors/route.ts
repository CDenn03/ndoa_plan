import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: params.id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const vendors = await db.vendor.findMany({
    where: { weddingId: params.id, deletedAt: null },
    orderBy: { name: 'asc' },
  })

  const mapped = vendors.map(v => ({
    id: v.id,
    serverId: v.id,
    weddingId: v.weddingId,
    name: v.name,
    category: v.category as string,
    status: v.status as string,
    contactName: v.contactName ?? undefined,
    contactPhone: v.contactPhone ?? undefined,
    contactEmail: v.contactEmail ?? undefined,
    amount: v.amount ? Number(v.amount) : undefined,
    paidAmount: Number(v.paidAmount),
    depositAmount: v.depositAmount ? Number(v.depositAmount) : undefined,
    contractPath: v.contractPath ?? undefined,
    lastContactAt: v.lastContactAt?.getTime() ?? undefined,
    notes: v.notes ?? undefined,
    rating: v.rating ?? undefined,
    version: v.version,
    checksum: v.checksum,
    syncedAt: v.updatedAt.getTime(),
    isDirty: false,
    updatedAt: v.updatedAt.getTime(),
  }))

  return NextResponse.json(mapped)
}
