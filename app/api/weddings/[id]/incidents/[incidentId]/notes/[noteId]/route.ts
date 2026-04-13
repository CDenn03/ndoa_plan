import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string; incidentId: string; noteId: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, incidentId, noteId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const note = await db.incidentNote.findFirst({
    where: { id: noteId, incidentId, incident: { weddingId: id } },
  })
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.incidentNote.delete({ where: { id: noteId } })
  return new NextResponse(null, { status: 204 })
}
