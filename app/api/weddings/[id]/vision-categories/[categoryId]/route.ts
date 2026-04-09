import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; categoryId: string }> }) {
  const { id, categoryId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, color } = await req.json()
  const cat = await db.visionBoardCategory.update({
    where: { id: categoryId, weddingId: id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(color !== undefined && { color }),
    },
  })
  return NextResponse.json(cat)
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; categoryId: string }> }) {
  const { id, categoryId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Reassign images in this category to 'Other' before deleting
  const other = await db.visionBoardCategory.findFirst({ where: { weddingId: id, name: 'Other' } })
  if (other) {
    await db.mediaItem.updateMany({
      where: { weddingId: id, linkedToId: categoryId, linkedToType: 'moodboard' },
      data: { linkedToId: other.id },
    })
  }
  await db.visionBoardCategory.delete({ where: { id: categoryId, weddingId: id } })
  return NextResponse.json({ ok: true })
}
