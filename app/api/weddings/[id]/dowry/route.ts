import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await db.dowryItem.findMany({ where: { weddingId: id }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, quantity, estimatedValue, notes } = body

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const item = await db.dowryItem.create({
    data: { weddingId: id, name, quantity: quantity ?? 1, estimatedValue: estimatedValue ?? null, notes: notes || null },
  })
  return NextResponse.json(item, { status: 201 })
}
