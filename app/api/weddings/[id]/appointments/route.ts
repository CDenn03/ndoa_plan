import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appointments = await db.appointment.findMany({
    where: { weddingId: id },
    include: { vendor: { select: { id: true, name: true } } },
    orderBy: { startAt: 'asc' },
  })
  return NextResponse.json(appointments)
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, vendorId, location, startAt, endAt, reminderAt, notes, createdBy } = body

  if (!title || !startAt || !createdBy) {
    return NextResponse.json({ error: 'title, startAt, and createdBy are required' }, { status: 400 })
  }

  const appointment = await db.appointment.create({
    data: {
      weddingId: id,
      title,
      vendorId: vendorId || null,
      location: location || null,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      reminderAt: reminderAt ? new Date(reminderAt) : null,
      notes: notes || null,
      createdBy,
    },
  })
  return NextResponse.json(appointment, { status: 201 })
}
