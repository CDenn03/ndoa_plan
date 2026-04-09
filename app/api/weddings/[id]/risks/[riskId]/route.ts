import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; riskId: string }> }) {
  const { id, riskId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { isResolved } = await req.json()
  const risk = await db.riskAlert.update({
    where: { id: riskId, weddingId: id },
    data: {
      isResolved: isResolved ?? true,
      resolvedAt: isResolved !== false ? new Date() : null,
      resolvedBy: isResolved !== false ? userId : null,
    },
  })
  return NextResponse.json({ id: risk.id, isResolved: risk.isResolved })
}
