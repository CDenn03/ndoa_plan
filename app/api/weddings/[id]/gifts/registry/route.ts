import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await db.giftRegistryItem.findMany({ where: { weddingId: id }, orderBy: { priority: 'asc' } })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, url, estimatedPrice, quantity, priority } = body

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const item = await db.giftRegistryItem.create({
    data: { weddingId: id, name, description: description || null, url: url || null, estimatedPrice: estimatedPrice ?? null, quantity: quantity ?? 1, priority: priority ?? 2 },
  })
  return NextResponse.json(item, { status: 201 })
}
