import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; giftId: string }> }) {
  const { id, giftId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { giverName, description, estimatedValue, status, thankYouSent } = body

  const gift = await db.giftReceived.update({
    where: { id: giftId, weddingId: id },
    data: {
      ...(giverName !== undefined && { giverName }),
      ...(description !== undefined && { description }),
      ...(estimatedValue !== undefined && { estimatedValue: estimatedValue ?? null }),
      ...(status !== undefined && { status }),
      ...(thankYouSent !== undefined && { thankYouSent, thankYouSentAt: thankYouSent ? new Date() : null }),
    },
  })
  return NextResponse.json(gift)
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; giftId: string }> }) {
  const { id, giftId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.giftReceived.delete({ where: { id: giftId, weddingId: id } })
  return NextResponse.json({ ok: true })
}
