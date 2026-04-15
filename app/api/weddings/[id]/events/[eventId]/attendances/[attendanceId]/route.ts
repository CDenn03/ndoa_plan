import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string; eventId: string; attendanceId: string }> }

export async function PATCH(req: NextRequest, props: Params) {
  const { id, attendanceId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { rsvpStatus?: string; checkedIn?: boolean }
  const updateData: { rsvpStatus?: string; checkedIn?: boolean; checkedInAt?: Date | null } = {}
  
  if (body.rsvpStatus) updateData.rsvpStatus = body.rsvpStatus
  if (body.checkedIn !== undefined) {
    updateData.checkedIn = body.checkedIn
    updateData.checkedInAt = body.checkedIn ? new Date() : null
  }

  const attendance = await db.guestEventAttendance.update({
    where: { id: attendanceId },
    data: updateData,
    include: { guest: { select: { id: true, name: true, phone: true, side: true, rsvpStatus: true, checkedIn: true, mealPref: true, tags: true } } },
  })
  
  return NextResponse.json({
    ...attendance,
    guest: { ...attendance.guest, checkedIn: attendance.checkedIn }, // Use event-specific check-in
  })
}

export async function DELETE(_req: NextRequest, props: Params) {
  const { id, attendanceId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.guestEventAttendance.delete({ where: { id: attendanceId } })
  return NextResponse.json({ ok: true })
}
