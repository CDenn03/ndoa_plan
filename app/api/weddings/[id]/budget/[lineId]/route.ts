import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string; lineId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id, lineId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payments = await db.payment.findMany({
    where: { budgetLineId: lineId, weddingId: id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(payments.map(p => ({
    id: p.id, amount: Number(p.amount), status: p.status,
    payerName: p.payerName ?? undefined, description: p.description ?? undefined,
    paymentDate: p.paymentDate?.toISOString() ?? undefined,
    createdAt: p.createdAt.toISOString(),
  })))
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, lineId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    category?: string; description?: string; estimated?: number
    vendorId?: string; vendorName?: string; notes?: string
    paymentDate?: string; reminderDate?: string; paymentPlan?: string
    paymentType?: string; eventId?: string
    // actual is intentionally excluded — it is server-computed only
  }

  const line = await db.budgetLine.upsert({
    where: { id: lineId },
    update: {
      ...(body.category !== undefined && { category: body.category }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.estimated !== undefined && { estimated: body.estimated }),
      ...(body.vendorId !== undefined && { vendorId: body.vendorId || null }),
      ...(body.vendorName !== undefined && { vendorName: body.vendorName || null }),
      ...(body.notes !== undefined && { notes: body.notes || null }),
      ...(body.paymentDate !== undefined && { paymentDate: body.paymentDate ? new Date(body.paymentDate) : null }),
      ...(body.reminderDate !== undefined && { reminderDate: body.reminderDate ? new Date(body.reminderDate) : null }),
      ...(body.paymentPlan !== undefined && { paymentPlan: body.paymentPlan || null }),
      ...(body.paymentType !== undefined && { paymentType: body.paymentType || null }),
      version: { increment: 1 },
      updatedBy: userId,
    },
    create: {
      id: lineId,
      weddingId: id,
      eventId: body.eventId || null,
      category: body.category ?? 'MISCELLANEOUS',
      description: body.description ?? '',
      estimated: body.estimated ?? 0,
      actual: 0,
      vendorId: body.vendorId || null,
      vendorName: body.vendorName || null,
      notes: body.notes || null,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
      reminderDate: body.reminderDate ? new Date(body.reminderDate) : null,
      paymentPlan: body.paymentPlan || null,
      paymentType: body.paymentType || null,
      version: 1,
      checksum: '',
      updatedBy: userId,
    },
  })

  return NextResponse.json({
    id: line.id, weddingId: line.weddingId, eventId: line.eventId ?? undefined,
    category: line.category, description: line.description,
    estimated: Number(line.estimated), actual: Number(line.actual),
    vendorId: line.vendorId ?? undefined, vendorName: line.vendorName ?? undefined,
    notes: line.notes ?? undefined,
    paymentDate: line.paymentDate?.toISOString() ?? undefined,
    reminderDate: line.reminderDate?.toISOString() ?? undefined,
    paymentPlan: line.paymentPlan ?? undefined, paymentType: line.paymentType ?? undefined,
    version: line.version,
  })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, lineId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.budgetLine.updateMany({
    where: { id: lineId, weddingId: id },
    data: { deletedAt: new Date(), updatedBy: userId },
  })
  return NextResponse.json({ ok: true })
}
