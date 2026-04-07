import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Safaricom sends callbacks with a shared secret in the header or a known IP.
// For production, validate the source IP against Safaricom's published range.
// This endpoint must be publicly accessible (no auth header required by Safaricom).

export const runtime = 'nodejs'

interface MpesaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: string | number }>
      }
    }
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: MpesaCallback

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid JSON' }, { status: 400 })
  }

  const callback = body?.Body?.stkCallback
  if (!callback) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid callback structure' })
  }

  const checkoutRequestId = callback.CheckoutRequestID
  const resultCode = callback.ResultCode

  // Always store raw callback first — never lose Safaricom data
  // (In production, use a separate raw_mpesa_callbacks table)
  console.log('[mpesa-callback]', JSON.stringify(body))

  if (resultCode !== 0) {
    // Payment failed or cancelled — update status
    await db.payment.updateMany({
      where: { checkoutRequestId },
      data: { status: 'FAILED', rawCallback: body as object },
    })
    // Always return 200 to Safaricom or they will retry indefinitely
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }

  // Extract metadata items
  const items = callback.CallbackMetadata?.Item ?? []
  const getItem = (name: string) => items.find(i => i.Name === name)?.Value

  const mpesaRef = getItem('MpesaReceiptNumber') as string | undefined
  const amount = getItem('Amount') as number | undefined
  const phone = getItem('PhoneNumber') as string | undefined
  const transactionDate = getItem('TransactionDate') as string | undefined

  // ── Duplicate detection ────────────────────────────────────────────────────
  if (mpesaRef) {
    const dup = await db.payment.findFirst({ where: { mpesaRef } })
    if (dup) {
      console.log(`[mpesa-callback] Duplicate mpesaRef ${mpesaRef} — ignoring`)
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }
  }

  // ── Find the pending payment by checkoutRequestId ──────────────────────────
  const pending = await db.payment.findFirst({ where: { checkoutRequestId } })

  if (!pending) {
    // Unknown checkout — log and accept (don't error; Safaricom will retry on non-200)
    console.warn(`[mpesa-callback] Unknown checkoutRequestId: ${checkoutRequestId}`)
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }

  // ── Amount reconciliation check ────────────────────────────────────────────
  const expectedAmount = Number(pending.amount)
  const actualAmount = Number(amount ?? 0)
  const mismatch = Math.abs(actualAmount - expectedAmount) > 1 // 1 KES tolerance

  await db.payment.update({
    where: { id: pending.id },
    data: {
      mpesaRef: mpesaRef ?? null,
      payerPhone: phone?.toString() ?? null,
      status: mismatch ? 'DISPUTED' : 'COMPLETED',
      processedAt: new Date(),
      rawCallback: body as object,
      version: { increment: 1 },
    },
  })

  if (mismatch) {
    console.warn(`[mpesa-callback] Amount mismatch for ${mpesaRef}: expected ${expectedAmount}, got ${actualAmount}`)
  }

  // Update committee contribution if linked
  if (pending.contributionId) {
    const contribution = await db.committeeContribution.findUnique({
      where: { id: pending.contributionId },
    })
    if (contribution) {
      const newPaid = Number(contribution.paidAmount) + actualAmount
      const isFulfilled = newPaid >= Number(contribution.pledgeAmount)
      await db.committeeContribution.update({
        where: { id: pending.contributionId },
        data: {
          paidAmount: newPaid,
          status: isFulfilled ? 'FULFILLED' : 'PARTIAL',
        },
      })
    }
  }

  // Audit log
  await db.auditLog.create({
    data: {
      weddingId: pending.weddingId,
      actorId: 'mpesa-system',
      actorRole: 'SYSTEM',
      action: mismatch ? 'payment.disputed' : 'payment.completed',
      resourceId: pending.id,
      resourceType: 'payment',
      nextState: JSON.stringify({ mpesaRef, amount: actualAmount, status: mismatch ? 'DISPUTED' : 'COMPLETED' }),
    },
  })

  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
}
