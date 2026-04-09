import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gifts = await db.giftReceived.findMany({ where: { weddingId: id }, orderBy: { receivedAt: 'desc' } })
  return NextResponse.json(gifts)
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { giverName, description, estimatedValue, eventId } = body

  if (!giverName || !description) return NextResponse.json({ error: 'giverName and description are required' }, { status: 400 })

  const gift = await db.giftReceived.create({
    data: { weddingId: id, eventId: eventId ?? null, giverName, description, estimatedValue: estimatedValue ?? null },
  })
  return NextResponse.json(gift, { status: 201 })
}
