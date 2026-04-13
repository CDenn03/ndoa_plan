import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string; incidentId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id, incidentId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const incident = await db.incident.findFirst({ where: { id: incidentId, weddingId: id } })
  if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const notes = await db.incidentNote.findMany({
    where: { incidentId },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(notes.map(n => ({ ...n, createdAt: n.createdAt.toISOString() })))
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id, incidentId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id

  const incident = await db.incident.findFirst({ where: { id: incidentId, weddingId: id } })
  if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { content } = await req.json() as { content: string }
  if (!content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 })

  const note = await db.incidentNote.create({
    data: { incidentId, content: content.trim(), createdBy: userId },
  })
  return NextResponse.json({ ...note, createdAt: note.createdAt.toISOString() }, { status: 201 })
}
