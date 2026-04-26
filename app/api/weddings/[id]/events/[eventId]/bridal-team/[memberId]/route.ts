import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string; eventId: string; memberId: string }> }

async function authorize(weddingId: string, userId: string) {
  return db.weddingMember.findFirst({ where: { weddingId, userId } })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, memberId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  if (!await authorize(id, userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const member = await db.bridalTeamMember.update({
    where: { id: memberId },
    data: {
      name: body.name ?? undefined,
      role: body.role ?? undefined,
      side: body.side ?? undefined,
      phone: body.phone ?? undefined,
      email: body.email ?? undefined,
      confirmationStatus: body.confirmationStatus ?? undefined,
      notes: body.notes ?? undefined,
    },
  })
  return NextResponse.json(member)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, memberId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  if (!await authorize(id, userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.bridalTeamMember.update({
    where: { id: memberId },
    data: { deletedAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}
