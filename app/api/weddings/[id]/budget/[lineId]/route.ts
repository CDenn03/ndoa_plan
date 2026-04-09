import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; lineId: string }> }) {
  const { id, lineId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { category, description, estimated, actual, committed, vendorId, vendorName, notes, paymentDate, paymentPlan, paymentType, phase } = body

  const line = await db.budgetLine.update({
    where: { id: lineId, weddingId: id },
    data: {
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(estimated !== undefined && { estimated }),
      ...(actual !== undefined && { actual }),
      ...(committed !== undefined && { committed }),
      ...(vendorId !== undefined && { vendorId: vendorId || null }),
      ...(vendorName !== undefined && { vendorName: vendorName || null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(paymentDate !== undefined && { paymentDate: paymentDate ? new Date(paymentDate) : null }),
      ...(paymentPlan !== undefined && { paymentPlan: paymentPlan || null }),
      ...(paymentType !== undefined && { paymentType: paymentType || null }),
      ...(phase !== undefined && { phase: phase || null }),
      version: { increment: 1 },
      updatedBy: userId,
    },
  })
  return NextResponse.json({
    id: line.id, weddingId: line.weddingId, eventId: line.eventId ?? undefined,
    category: line.category, description: line.description,
    estimated: Number(line.estimated), actual: Number(line.actual), committed: Number(line.committed),
    vendorId: line.vendorId ?? undefined, vendorName: line.vendorName ?? undefined,
    notes: line.notes ?? undefined,
    paymentDate: line.paymentDate?.toISOString() ?? undefined,
    paymentPlan: line.paymentPlan ?? undefined, paymentType: line.paymentType ?? undefined,
    version: line.version,
  })
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; lineId: string }> }) {
  const { id, lineId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.budgetLine.update({ where: { id: lineId, weddingId: id }, data: { deletedAt: new Date(), updatedBy: userId } })
  return NextResponse.json({ ok: true })
}
