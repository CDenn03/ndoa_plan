import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: params.id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const guests = await db.guest.findMany({
    where: { weddingId: params.id, deletedAt: null },
    orderBy: { name: 'asc' },
  })

  // Map to LocalGuest shape
  const mapped = guests.map(g => ({
    id: g.id,
    serverId: g.id,
    weddingId: g.weddingId,
    name: g.name,
    phone: g.phone ?? undefined,
    email: g.email ?? undefined,
    rsvpStatus: g.rsvpStatus as string,
    tableNumber: g.tableNumber ?? undefined,
    seatNumber: g.seatNumber ?? undefined,
    committeeId: g.committeeId ?? undefined,
    side: g.side as string,
    mealPref: g.mealPref ?? undefined,
    checkedIn: g.checkedIn,
    checkedInAt: g.checkedInAt?.getTime() ?? undefined,
    notes: g.notes ?? undefined,
    tags: g.tags,
    version: g.version,
    checksum: g.checksum,
    syncedAt: g.updatedAt.getTime(),
    isDirty: false,
    updatedAt: g.updatedAt.getTime(),
  }))

  return NextResponse.json(mapped)
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: params.id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const guest = await db.guest.create({
    data: {
      weddingId: params.id,
      name: body.name,
      phone: body.phone ?? null,
      email: body.email ?? null,
      rsvpStatus: 'PENDING',
      tableNumber: body.tableNumber ?? null,
      side: body.side ?? 'BOTH',
      version: 1,
      checksum: body.checksum ?? '',
      updatedBy: userId,
    },
  })

  return NextResponse.json(guest, { status: 201 })
}
