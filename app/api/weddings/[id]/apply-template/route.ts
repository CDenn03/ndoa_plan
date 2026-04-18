import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { v4 as uuid } from 'uuid'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id

  const member = await db.weddingMember.findFirst({ where: { weddingId: params.id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { templateId, eventId } = await req.json() as { templateId: string; eventId?: string }
  const template = await db.template.findUnique({ where: { id: templateId } })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const wid = params.id
  const data = template.data as Record<string, unknown>[]

  if (template.type === 'CHECKLIST') {
    const items = data as Array<{
      title: string; category?: string; priority?: number; isFinalCheck?: boolean; description?: string
    }>
    await db.checklistItem.createMany({
      data: items.map((item, i) => ({
        id: uuid(),
        weddingId: wid,
        eventId: eventId ?? null,
        title: item.title,
        category: item.category ?? 'OTHER',
        priority: item.priority ?? 2,
        isFinalCheck: item.isFinalCheck ?? false,
        description: item.description ?? null,
        order: i,
        isChecked: false,
        version: 1,
        checksum: '',
        updatedBy: userId,
      })),
    })
  } else if (template.type === 'BUDGET') {
    const lines = data as Array<{ category: string; description: string; estimated: number }>
    await db.budgetLine.createMany({
      data: lines.map(line => ({
        id: uuid(),
        weddingId: wid,
        eventId: eventId ?? null,
        category: line.category,
        description: line.description,
        estimated: line.estimated,
        actual: 0,
        version: 1,
        checksum: '',
        updatedBy: userId,
      })),
    })
  } else if (template.type === 'APPOINTMENT') {
    const appts = data as Array<{ title: string; location?: string; notes?: string; offsetDays?: number }>
    const base = new Date()
    await db.appointment.createMany({
      data: appts.map((a, i) => {
        const startAt = new Date(base)
        startAt.setDate(startAt.getDate() + (a.offsetDays ?? i))
        startAt.setHours(9, 0, 0, 0)
        return {
          id: uuid(),
          weddingId: wid,
          eventId: eventId ?? null,
          title: a.title,
          location: a.location ?? null,
          notes: a.notes ?? null,
          startAt,
          createdBy: userId,
        }
      }),
    })
  } else if (template.type === 'SHOT_LIST') {
    const shots = data as Array<{ title: string; group: string }>
    await db.checklistItem.createMany({
      data: shots.map((s, i) => ({
        id: uuid(),
        weddingId: wid,
        eventId: eventId ?? null,
        title: s.title,
        category: 'SHOT_LIST',
        description: s.group,   // group is stored in description field
        priority: 2,
        order: i,
        isChecked: false,
        version: 1,
        checksum: '',
        updatedBy: userId,
      })),
    })
  } else if (template.type === 'PHOTOGRAPHY') {
    const deliverables = data as Array<{ title: string }>
    await db.checklistItem.createMany({
      data: deliverables.map((d, i) => ({
        id: uuid(),
        weddingId: wid,
        eventId: eventId ?? null,
        title: d.title,
        category: 'PHOTOGRAPHY',
        description: 'deliverable',
        priority: 2,
        order: i,
        isChecked: false,
        version: 1,
        checksum: '',
        updatedBy: userId,
      })),
    })
  }

  await db.templateApplication.create({
    data: { weddingId: wid, templateId, appliedAt: new Date() },
  })

  return NextResponse.json({ ok: true, type: template.type })
}
