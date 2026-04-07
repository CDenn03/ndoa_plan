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

  const contribs = await db.committeeContribution.findMany({
    where: { weddingId: params.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(contribs.map(c => ({
    id: c.id,
    weddingId: c.weddingId,
    memberId: c.memberId,
    memberName: c.memberName,
    pledgeAmount: Number(c.pledgeAmount),
    paidAmount: Number(c.paidAmount),
    pledgeDate: c.pledgeDate.toISOString(),
    dueDate: c.dueDate?.toISOString() ?? undefined,
    status: c.status,
    notes: c.notes ?? undefined,
  })))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: params.id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const contrib = await db.committeeContribution.create({
    data: {
      weddingId: params.id,
      memberId: body.memberId ?? userId,
      memberName: body.memberName,
      pledgeAmount: body.pledgeAmount,
      paidAmount: 0,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: 'PLEDGED',
      notes: body.notes ?? null,
    },
  })

  await db.auditLog.create({
    data: {
      weddingId: params.id,
      actorId: userId,
      actorRole: member.role,
      action: 'contribution.created',
      resourceId: contrib.id,
      resourceType: 'committee_contribution',
      nextState: JSON.stringify(contrib),
    },
  })

  return NextResponse.json(contrib, { status: 201 })
}
