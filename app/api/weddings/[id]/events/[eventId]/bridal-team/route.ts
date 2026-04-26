import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string; eventId: string }> }

async function authorize(weddingId: string, userId: string) {
  return db.weddingMember.findFirst({ where: { weddingId, userId } })
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id, eventId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  if (!await authorize(id, userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const members = await db.bridalTeamMember.findMany({
    where: { eventId, deletedAt: null },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(members)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id, eventId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  if (!await authorize(id, userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body.name || !body.role || !body.side) {
    return NextResponse.json({ error: 'name, role and side are required' }, { status: 400 })
  }

  const member = await db.bridalTeamMember.create({
    data: {
      eventId,
      name: body.name,
      role: body.role,
      side: body.side,
      phone: body.phone ?? null,
      email: body.email ?? null,
      confirmationStatus: body.confirmationStatus ?? 'PENDING',
      notes: body.notes ?? null,
    },
  })
  return NextResponse.json(member, { status: 201 })
}
