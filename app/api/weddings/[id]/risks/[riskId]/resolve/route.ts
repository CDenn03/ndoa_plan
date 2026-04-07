import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: { id: string; riskId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id

  const member = await db.weddingMember.findFirst({ where: { weddingId: params.id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const risk = await db.riskAlert.findFirst({
    where: { id: params.riskId, weddingId: params.id },
  })
  if (!risk) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.riskAlert.update({
    where: { id: params.riskId },
    data: { isResolved: true, resolvedAt: new Date(), resolvedBy: userId },
  })

  await db.auditLog.create({
    data: {
      weddingId: params.id,
      actorId: userId,
      actorRole: member.role,
      action: 'risk.resolved',
      resourceId: params.riskId,
      resourceType: 'risk_alert',
      prevState: JSON.stringify({ isResolved: false }),
      nextState: JSON.stringify({ isResolved: true }),
    },
  })

  return NextResponse.json(updated)
}
