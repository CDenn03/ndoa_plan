import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { recalculateBudgetLineActual } from '@/lib/budget-helpers'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; paymentId: string }> }) {
  const { id, paymentId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await db.payment.findFirst({ where: { id: paymentId, weddingId: id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json() as { status?: string; description?: string; paymentDate?: string }

  const updated = await db.payment.update({
    where: { id: paymentId },
    data: {
      ...(body.status !== undefined && { status: body.status as never }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.paymentDate !== undefined && { paymentDate: body.paymentDate ? new Date(body.paymentDate) : null }),
    },
  })

  // Recalculate if status changed and line is linked
  if (body.status !== undefined && existing.budgetLineId) {
    await recalculateBudgetLineActual(existing.budgetLineId)
  }

  return NextResponse.json({ ...updated, amount: Number(updated.amount), createdAt: updated.createdAt.toISOString() })
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; paymentId: string }> }) {
  const { id, paymentId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await db.payment.findFirst({ where: { id: paymentId, weddingId: id, deletedAt: null } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.payment.update({
    where: { id: paymentId },
    data: { deletedAt: new Date() },
  })

  // Recalculate budget line after deletion
  if (existing.budgetLineId) {
    await recalculateBudgetLineActual(existing.budgetLineId)
  }

  return NextResponse.json({ ok: true })
}
