import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string; eventId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: weddingId, eventId } = await params
  const contacts = await db.eventContact.findMany({
    where: { eventId, event: { weddingId } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(contacts)
}

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: weddingId, eventId } = await params
  const body = await req.json() as { name: string; role?: string; phone?: string; email?: string; notes?: string }
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  // verify event belongs to wedding
  const event = await db.weddingEvent.findFirst({ where: { id: eventId, weddingId } })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const contact = await db.eventContact.create({
    data: { eventId, name: body.name.trim(), role: body.role ?? null, phone: body.phone ?? null, email: body.email ?? null, notes: body.notes ?? null },
  })
  return NextResponse.json(contact, { status: 201 })
}
