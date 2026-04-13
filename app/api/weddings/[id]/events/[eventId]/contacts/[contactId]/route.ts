import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string; eventId: string; contactId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: weddingId, eventId, contactId } = await params
  const body = await req.json() as { name?: string; role?: string; phone?: string; email?: string; notes?: string }
  const existing = await db.eventContact.findFirst({ where: { id: contactId, eventId, event: { weddingId } } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await db.eventContact.update({
    where: { id: contactId },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.role !== undefined && { role: body.role || null }),
      ...(body.phone !== undefined && { phone: body.phone || null }),
      ...(body.email !== undefined && { email: body.email || null }),
      ...(body.notes !== undefined && { notes: body.notes || null }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: weddingId, eventId, contactId } = await params
  const existing = await db.eventContact.findFirst({ where: { id: contactId, eventId, event: { weddingId } } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.eventContact.delete({ where: { id: contactId } })
  return new NextResponse(null, { status: 204 })
}
