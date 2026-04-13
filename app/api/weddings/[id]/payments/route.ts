import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { recalculateBudgetLineActual } from '@/lib/budget-helpers'

function serializePayment(p: {
  id: string; weddingId: string; eventId: string | null; vendorId: string | null
  contributionId: string | null; budgetLineId: string | null; mpesaRef: string | null
  amount: { toString(): string }; currency: string; status: string
  payerName: string | null; payerPhone: string | null; description: string | null
  paymentDate: Date | null; processedAt: Date | null; reconciledAt: Date | null
  createdAt: Date
}) {
  return {
    id: p.id,
    weddingId: p.weddingId,
    eventId: p.eventId ?? undefined,
    vendorId: p.vendorId ?? undefined,
    contributionId: p.contributionId ?? undefined,
    budgetLineId: p.budgetLineId ?? undefined,
    mpesaRef: p.mpesaRef ?? undefined,
    amount: Number(p.amount),
    currency: p.currency,
    status: p.status,
    payerName: p.payerName ?? undefined,
    payerPhone: p.payerPhone ?? undefined,
    description: p.description ?? undefined,
    paymentDate: p.paymentDate?.toISOString() ?? undefined,
    processedAt: p.processedAt?.toISOString() ?? undefined,
    reconciledAt: p.reconciledAt?.toISOString() ?? undefined,
    createdAt: p.createdAt.toISOString(),
  }
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: params.id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payments = await db.payment.findMany({
    where: { weddingId: params.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json(payments.map(serializePayment))
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: params.id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    amount: number; description?: string; payerName?: string; payerPhone?: string
    vendorId?: string; contributionId?: string; budgetLineId?: string
    status?: string; mpesaRef?: string; eventId?: string; paymentDate?: string
  }
  if (!body.amount) return NextResponse.json({ error: 'amount is required' }, { status: 400 })

  // Validate budget line belongs to this wedding
  if (body.budgetLineId) {
    const bl = await db.budgetLine.findFirst({ where: { id: body.budgetLineId, weddingId: params.id, deletedAt: null } })
    if (!bl) return NextResponse.json({ error: 'Budget line not found' }, { status: 404 })
  }

  const payment = await db.payment.create({
    data: {
      weddingId: params.id,
      eventId: body.eventId || null,
      budgetLineId: body.budgetLineId || null,
      amount: body.amount,
      description: body.description || null,
      payerName: body.payerName || null,
      payerPhone: body.payerPhone || null,
      vendorId: body.vendorId || null,
      contributionId: body.contributionId || null,
      status: body.status ?? 'COMPLETED',
      mpesaRef: body.mpesaRef || null,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
      idempotencyKey: `manual-${userId}-${Date.now()}`,
      createdBy: userId,
      processedAt: new Date(),
    },
  })

  // Recalculate budget line actual if linked
  if (body.budgetLineId) {
    await recalculateBudgetLineActual(body.budgetLineId)
  }

  return NextResponse.json(serializePayment(payment), { status: 201 })
}
