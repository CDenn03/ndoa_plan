import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as typeof session.user & { id: string }).id
  const body = await req.json()
  const { weddingId, phone, amount, description, vendorId, contributionId } = body

  if (!weddingId || !phone || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const member = await db.weddingMember.findFirst({ where: { weddingId, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Create idempotency key before STK push — used for dedup regardless of callback
  const idempotencyKey = `${weddingId}-${userId}-${Date.now()}`

  // In production, call Safaricom STK Push API here
  // const stkResponse = await initiateStk({ phone, amount, accountRef: weddingId, ... })
  // const checkoutRequestId = stkResponse.CheckoutRequestID
  const checkoutRequestId = `mock-${idempotencyKey}` // replace with real Safaricom response

  // Create pending payment record immediately
  const payment = await db.payment.create({
    data: {
      weddingId,
      vendorId: vendorId ?? null,
      contributionId: contributionId ?? null,
      idempotencyKey,
      checkoutRequestId,
      amount,
      currency: 'KES',
      payerPhone: phone,
      description: description ?? null,
      status: 'PENDING',
      version: 1,
      createdBy: userId,
    },
  })

  await db.auditLog.create({
    data: {
      weddingId, actorId: userId, actorRole: member.role,
      action: 'payment.initiated', resourceId: payment.id, resourceType: 'payment',
      nextState: JSON.stringify({ amount, phone, checkoutRequestId }),
    },
  })

  return NextResponse.json({ paymentId: payment.id, checkoutRequestId })
}
