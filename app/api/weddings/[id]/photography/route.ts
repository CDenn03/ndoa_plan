import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [vendors, checklistItems, budgetLines] = await Promise.all([
    db.vendor.findMany({
      where: { weddingId: id, category: { in: ['PHOTOGRAPHY', 'VIDEOGRAPHY'] }, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    }),
    db.checklistItem.findMany({
      where: { weddingId: id, category: { in: ['PHOTOGRAPHY', 'SHOT_LIST'] }, deletedAt: null },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    }),
    db.budgetLine.findMany({
      where: { weddingId: id, category: 'PHOTOGRAPHY', deletedAt: null },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return NextResponse.json({
    vendors: vendors.map(v => ({
      id: v.id, name: v.name, category: v.category, status: v.status,
      contactName: v.contactName, contactPhone: v.contactPhone, contactEmail: v.contactEmail,
      amount: v.amount ? Number(v.amount) : null,
      paidAmount: Number(v.paidAmount),
      depositAmount: v.depositAmount ? Number(v.depositAmount) : null,
      depositPaidAt: v.depositPaidAt?.toISOString() ?? null,
      contractPath: v.contractPath, notes: v.notes, description: v.description,
    })),
    checklistItems: checklistItems.map(c => ({
      id: c.id, title: c.title, description: c.description, category: c.category,
      isChecked: c.isChecked, priority: c.priority, order: c.order,
      dueDate: c.dueDate?.toISOString() ?? null,
      assignedToName: c.assignedToName, eventId: c.eventId, isFinalCheck: c.isFinalCheck,
    })),
    budgetLines: budgetLines.map(b => ({
      id: b.id, description: b.description, estimated: Number(b.estimated),
      actual: Number(b.actual), vendorId: b.vendorId, vendorName: b.vendorName,
      notes: b.notes, eventId: b.eventId,
    })),
  })
}
