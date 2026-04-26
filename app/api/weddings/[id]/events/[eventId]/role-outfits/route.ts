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

  const outfits = await db.bridalRoleOutfit.findMany({
    where: { eventId },
    orderBy: { role: 'asc' },
  })
  return NextResponse.json(outfits)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id, eventId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  if (!await authorize(id, userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body.role || !body.title) {
    return NextResponse.json({ error: 'role and title are required' }, { status: 400 })
  }

  // Enforce one outfit per role per event — upsert
  const outfit = await db.bridalRoleOutfit.upsert({
    where: { eventId_role: { eventId, role: body.role } },
    update: { title: body.title, description: body.description ?? null },
    create: { eventId, role: body.role, title: body.title, description: body.description ?? null },
  })
  return NextResponse.json(outfit, { status: 201 })
}
