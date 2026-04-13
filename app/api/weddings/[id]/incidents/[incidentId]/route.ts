import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string; incidentId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, incidentId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    description?: string; severity?: string; resolution?: string
    resolvedAt?: string | null; resolvedBy?: string | null
  }

  const existing = await db.incident.findFirst({ where: { id: incidentId, weddingId: id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.incident.update({
    where: { id: incidentId },
    data: {
      ...(body.description !== undefined && { description: body.description }),
      ...(body.severity !== undefined && { severity: body.severity }),
      ...(body.resolution !== undefined && { resolution: body.resolution || null }),
      ...(body.resolvedAt !== undefined && { resolvedAt: body.resolvedAt ? new Date(body.resolvedAt) : null }),
      ...(body.resolvedBy !== undefined && { resolvedBy: body.resolvedBy || null }),
    },
    include: { notes: { orderBy: { createdAt: 'asc' } } },
  })
  return NextResponse.json({ ...updated, reportedAt: updated.reportedAt.toISOString(), resolvedAt: updated.resolvedAt?.toISOString() ?? null })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, incidentId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.incident.findFirst({ where: { id: incidentId, weddingId: id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.incident.delete({ where: { id: incidentId } })
  return new NextResponse(null, { status: 204 })
}
