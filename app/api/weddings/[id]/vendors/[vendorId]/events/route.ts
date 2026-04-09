import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string; vendorId: string }> }) {
  const { id, vendorId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assignments = await db.vendorEventAssignment.findMany({
    where: { vendorId, vendor: { weddingId: id } },
    include: { event: { select: { id: true, name: true, type: true, date: true } } },
  })
  return NextResponse.json(assignments.map(a => ({
    id: a.id, eventId: a.eventId, event: a.event, notes: a.notes ?? undefined,
  })))
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string; vendorId: string }> }) {
  const { vendorId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId, notes } = await req.json()
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const assignment = await db.vendorEventAssignment.upsert({
    where: { vendorId_eventId: { vendorId, eventId } },
    update: { notes: notes ?? null },
    create: { vendorId, eventId, notes: notes ?? null },
  })
  return NextResponse.json(assignment, { status: 201 })
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string; vendorId: string }> }) {
  const { vendorId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId } = await req.json()
  await db.vendorEventAssignment.deleteMany({ where: { vendorId, eventId } })
  return NextResponse.json({ ok: true })
}
