import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: params.id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('eventId')

  const lines = await db.budgetLine.findMany({
    where: {
      weddingId: params.id,
      deletedAt: null,
      ...(eventId ? { eventId } : {}),
    },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(lines.map(l => ({
    id: l.id, serverId: l.id, weddingId: l.weddingId,
    eventId: l.eventId ?? undefined,
    category: l.category, description: l.description,
    estimated: Number(l.estimated), actual: Number(l.actual),
    vendorId: l.vendorId ?? undefined, vendorName: l.vendorName ?? undefined,
    notes: l.notes ?? undefined,
    paymentDate: l.paymentDate?.toISOString() ?? undefined,
    paymentPlan: l.paymentPlan ?? undefined, paymentType: l.paymentType ?? undefined,
    reminderDate: l.reminderDate?.toISOString() ?? undefined,
    version: l.version, checksum: l.checksum,
    syncedAt: l.updatedAt.getTime(), isDirty: false, updatedAt: l.updatedAt.getTime(),
  })))
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: params.id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { category, description, eventId, estimated, actual, vendorId, vendorName, notes, paymentDate, reminderDate, paymentPlan, paymentType } = await req.json()
  if (!category || !description) return NextResponse.json({ error: 'category and description required' }, { status: 400 })

  const line = await db.budgetLine.create({
    data: {
      weddingId: params.id, eventId: eventId || null,
      category, description,
      estimated: estimated ?? 0, actual: actual ?? 0,
      vendorId: vendorId || null, vendorName: vendorName || null,
      notes: notes || null,
      paymentDate: paymentDate ? new Date(paymentDate) : null,
      reminderDate: reminderDate ? new Date(reminderDate) : null,
      paymentPlan: paymentPlan || null, paymentType: paymentType || null,
      version: 1, checksum: '', updatedBy: userId,
    },
  })

  return NextResponse.json({
    id: line.id, weddingId: line.weddingId, eventId: line.eventId ?? undefined,
    category: line.category, description: line.description,
    estimated: Number(line.estimated), actual: Number(line.actual),
    vendorId: line.vendorId ?? undefined, vendorName: line.vendorName ?? undefined,
    paymentDate: line.paymentDate?.toISOString() ?? undefined,
    paymentPlan: line.paymentPlan ?? undefined, paymentType: line.paymentType ?? undefined,
    reminderDate: line.reminderDate?.toISOString() ?? undefined,
    version: line.version, checksum: line.checksum, isDirty: false, updatedAt: line.updatedAt.getTime(),
  }, { status: 201 })
}
