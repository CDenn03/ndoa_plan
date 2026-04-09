import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; contribId: string }> }) {
  const { id, contribId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { memberName, pledgeAmount, paidAmount, dueDate, status, notes } = body

  const contrib = await db.committeeContribution.update({
    where: { id: contribId, weddingId: id },
    data: {
      ...(memberName !== undefined && { memberName }),
      ...(pledgeAmount !== undefined && { pledgeAmount }),
      ...(paidAmount !== undefined && { paidAmount }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  })
  return NextResponse.json({
    id: contrib.id, memberName: contrib.memberName,
    pledgeAmount: Number(contrib.pledgeAmount), paidAmount: Number(contrib.paidAmount),
    status: contrib.status,
  })
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; contribId: string }> }) {
  const { id, contribId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.committeeContribution.delete({ where: { id: contribId, weddingId: id } })
  return NextResponse.json({ ok: true })
}
