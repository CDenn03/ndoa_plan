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

  const [active, resolved] = await Promise.all([
    db.riskAlert.findMany({
      where: { weddingId: params.id, isResolved: false },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
    }),
    db.riskAlert.findMany({
      where: { weddingId: params.id, isResolved: true },
      orderBy: { resolvedAt: 'desc' },
      take: 20,
    }),
  ])

  const mapAlert = (r: typeof active[0]) => ({
    id: r.id,
    weddingId: r.weddingId,
    ruleId: r.ruleId,
    severity: r.severity,
    category: r.category,
    message: r.message,
    data: r.data ?? undefined,
    isResolved: r.isResolved,
    resolvedAt: r.resolvedAt?.toISOString() ?? undefined,
    createdAt: r.createdAt.toISOString(),
  })

  return NextResponse.json({ active: active.map(mapAlert), resolved: resolved.map(mapAlert) })
}
