import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: params.id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payments = await db.payment.findMany({
    where: { weddingId: params.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(payments.map(p => ({
    id: p.id,
    weddingId: p.weddingId,
    eventId: p.eventId ?? undefined,
    vendorId: p.vendorId ?? undefined,
    contributionId: p.contributionId ?? undefined,
    mpesaRef: p.mpesaRef ?? undefined,
    amount: Number(p.amount),
    currency: p.currency,
    status: p.status,
    payerName: p.payerName ?? undefined,
    payerPhone: p.payerPhone ?? undefined,
    description: p.description ?? undefined,
    processedAt: p.processedAt?.toISOString() ?? undefined,
    reconciledAt: p.reconciledAt?.toISOString() ?? undefined,
    createdAt: p.createdAt.toISOString(),
  })))
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: params.id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { amount, description, payerName, payerPhone, vendorId, contributionId, status, mpesaRef, eventId } = body
  if (!amount) return NextResponse.json({ error: 'amount is required' }, { status: 400 })

  const payment = await db.payment.create({
    data: {
      weddingId: params.id,
      eventId: eventId || null,
      amount,
      description: description || null,
      payerName: payerName || null,
      payerPhone: payerPhone || null,
      vendorId: vendorId || null,
      contributionId: contributionId || null,
      status: status ?? 'COMPLETED',
      mpesaRef: mpesaRef || null,
      idempotencyKey: `manual-${userId}-${Date.now()}`,
      createdBy: userId,
      processedAt: new Date(),
    },
  })
  return NextResponse.json({ ...payment, amount: Number(payment.amount), createdAt: payment.createdAt.toISOString() }, { status: 201 })
}
