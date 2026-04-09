import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const DEFAULT_CATEGORIES = [
  { name: 'Decor', color: '#8B5CF6', order: 0 },
  { name: 'Outfits', color: '#EC4899', order: 1 },
  { name: 'Flowers', color: '#10B981', order: 2 },
  { name: 'Venue', color: '#F59E0B', order: 3 },
  { name: 'Food', color: '#EF4444', order: 4 },
  { name: 'Other', color: '#6B7280', order: 5 },
]

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let categories = await db.visionBoardCategory.findMany({
    where: { weddingId: id },
    orderBy: { order: 'asc' },
  })

  if (categories.length === 0) {
    await db.visionBoardCategory.createMany({
      data: DEFAULT_CATEGORIES.map(c => ({ ...c, weddingId: id, isDefault: true })),
      skipDuplicates: true,
    })
    categories = await db.visionBoardCategory.findMany({
      where: { weddingId: id },
      orderBy: { order: 'asc' },
    })
  }

  return NextResponse.json(categories)
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const maxOrder = await db.visionBoardCategory.aggregate({ where: { weddingId: id }, _max: { order: true } })
  const cat = await db.visionBoardCategory.create({
    data: { weddingId: id, name: name.trim(), color: color ?? '#8B5CF6', order: (maxOrder._max.order ?? -1) + 1 },
  })
  return NextResponse.json(cat, { status: 201 })
}
