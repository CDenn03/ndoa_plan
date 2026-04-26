import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string; eventId: string; outfitId: string }> }

async function authorize(weddingId: string, userId: string) {
  return db.weddingMember.findFirst({ where: { weddingId, userId } })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, outfitId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  if (!await authorize(id, userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const outfit = await db.bridalRoleOutfit.update({
    where: { id: outfitId },
    data: {
      title: body.title ?? undefined,
      description: body.description ?? undefined,
    },
  })
  return NextResponse.json(outfit)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, outfitId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  if (!await authorize(id, userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Delete outfit images (MediaItem) then the outfit itself
  await db.mediaItem.updateMany({
    where: { linkedToType: 'bridal_role_outfit', linkedToId: outfitId },
    data: { deletedAt: new Date() },
  })
  await db.bridalRoleOutfit.delete({ where: { id: outfitId } })
  return NextResponse.json({ ok: true })
}
