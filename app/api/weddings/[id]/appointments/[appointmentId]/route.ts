import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; appointmentId: string }> }) {
  const { id, appointmentId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, vendorId, eventId, location, startAt, endAt, notes, status } = body

  const appointment = await db.appointment.update({
    where: { id: appointmentId, weddingId: id },
    data: {
      ...(title !== undefined && { title }),
      ...(vendorId !== undefined && { vendorId: vendorId || null }),
      ...(eventId !== undefined && { eventId: eventId || null }),
      ...(location !== undefined && { location: location || null }),
      ...(startAt !== undefined && { startAt: new Date(startAt) }),
      ...(endAt !== undefined && { endAt: endAt ? new Date(endAt) : null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(status !== undefined && { status }),
    },
    include: { vendor: { select: { id: true, name: true } } },
  })
  return NextResponse.json({
    ...appointment,
    startAt: appointment.startAt.toISOString(),
    endAt: appointment.endAt?.toISOString() ?? null,
    reminderAt: appointment.reminderAt?.toISOString() ?? null,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  })
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; appointmentId: string }> }) {
  const { id, appointmentId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.appointment.delete({ where: { id: appointmentId, weddingId: id } })
  return NextResponse.json({ ok: true })
}
