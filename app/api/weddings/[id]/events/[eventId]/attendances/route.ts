import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string; eventId: string }> }

export async function GET(_req: NextRequest, props: Params) {
  const { id, eventId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const attendances = await db.guestEventAttendance.findMany({
    where: { eventId },
    include: { guest: { select: { id: true, name: true, phone: true, side: true, rsvpStatus: true, checkedIn: true, mealPref: true, tags: true } } },
    orderBy: { guest: { name: 'asc' } },
  })

  return NextResponse.json(attendances.map(a => ({
    ...a,
    guest: { ...a.guest, checkedIn: a.checkedIn }, // Use event-specific check-in status
  })))
}

export async function POST(req: NextRequest, props: Params) {
  const { id, eventId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { guestId?: string; name?: string; phone?: string; side?: string; rsvpStatus?: string; tags?: string[] }

  // If guestId provided, link existing guest; otherwise create a new guest first
  let guestId = body.guestId
  if (!guestId) {
    if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    const guest = await db.guest.create({
      data: {
        weddingId: id, name: body.name,
        phone: body.phone ?? null, side: body.side ?? 'BOTH',
        tags: body.tags ?? [],
        rsvpStatus: 'PENDING', version: 1, checksum: '', updatedBy: userId,
      },
    })
    guestId = guest.id
  }

  const attendance = await db.guestEventAttendance.upsert({
    where: { guestId_eventId: { guestId, eventId } },
    create: { guestId, eventId, rsvpStatus: body.rsvpStatus ?? 'PENDING' },
    update: { rsvpStatus: body.rsvpStatus ?? 'PENDING' },
    include: { guest: { select: { id: true, name: true, phone: true, side: true, rsvpStatus: true, checkedIn: true, mealPref: true, tags: true } } },
  })

  return NextResponse.json(attendance, { status: 201 })
}
