import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; guestId: string }> }) {
  const { id, guestId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, phone, email, side, mealPref, notes, tags, rsvpStatus, priority, plusOneAllowed } = body

  const guest = await db.guest.update({
    where: { id: guestId, weddingId: id },
    data: {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(email !== undefined && { email: email || null }),
      ...(side !== undefined && { side }),
      ...(mealPref !== undefined && { mealPref: mealPref || null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(tags !== undefined && { tags }),
      ...(rsvpStatus !== undefined && { rsvpStatus }),
      ...(priority !== undefined && { priority }),
      ...(plusOneAllowed !== undefined && { plusOneAllowed }),
      version: { increment: 1 },
      updatedBy: userId,
    },
  })
  return NextResponse.json({ id: guest.id, name: guest.name, rsvpStatus: guest.rsvpStatus, version: guest.version })
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; guestId: string }> }) {
  const { id, guestId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.guest.update({ where: { id: guestId, weddingId: id }, data: { deletedAt: new Date(), updatedBy: userId } })
  return NextResponse.json({ ok: true })
}
