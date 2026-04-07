import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { evaluateRisks } from '@/lib/risk-engine'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as typeof session.user & { id: string }).id
  const wid = params.id

  const member = await db.weddingMember.findFirst({ where: { weddingId: wid, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [wedding, guests, vendors, budgetLines, checklistItems] = await Promise.all([
    db.wedding.findUnique({ where: { id: wid } }),
    db.guest.findMany({ where: { weddingId: wid, deletedAt: null }, select: { id: true, rsvpStatus: true } }),
    db.vendor.findMany({ where: { weddingId: wid, deletedAt: null }, select: { id: true, name: true, status: true, lastContactAt: true, updatedAt: true, amount: true } }),
    db.budgetLine.findMany({ where: { weddingId: wid, deletedAt: null }, select: { estimated: true, actual: true, committed: true } }),
    db.checklistItem.findMany({ where: { weddingId: wid, deletedAt: null }, select: { isChecked: true, dueDate: true, priority: true } }),
  ])

  if (!wedding) return NextResponse.json({ error: 'Wedding not found' }, { status: 404 })

  const confirmedGuests = guests.filter(g => g.rsvpStatus === 'CONFIRMED').length
  const pendingRsvps = guests.filter(g => g.rsvpStatus === 'PENDING').length

  const results = evaluateRisks({
    wedding: {
      id: wedding.id,
      date: wedding.date,
      budget: Number(wedding.budget),
      venueCapacity: wedding.venueCapacity ?? undefined,
    },
    guests: guests.map(g => ({ id: g.id, rsvpStatus: g.rsvpStatus })),
    vendors: vendors.map(v => ({
      id: v.id, name: v.name, status: v.status,
      lastContactAt: v.lastContactAt ?? undefined,
      lastStatusChangeAt: v.updatedAt,
      amount: v.amount ? Number(v.amount) : undefined,
    })),
    payments: [],
    budgetLines: budgetLines.map(l => ({ estimated: Number(l.estimated), actual: Number(l.actual), committed: Number(l.committed) })),
    checklistItems: checklistItems.map(i => ({ isChecked: i.isChecked, dueDate: i.dueDate ?? undefined, priority: i.priority })),
    confirmedGuests,
    pendingRsvps,
  })

  // Upsert risk alerts — resolve ones no longer triggered, create new ones
  const triggeredIds = new Set(results.map(r => r.ruleId))

  // Resolve alerts whose rule is no longer triggered
  await db.riskAlert.updateMany({
    where: { weddingId: wid, isResolved: false, ruleId: { notIn: Array.from(triggeredIds) } },
    data: { isResolved: true, resolvedAt: new Date(), resolvedBy: 'system' },
  })

  // Create or re-open triggered alerts
  for (const result of results) {
    const existing = await db.riskAlert.findFirst({ where: { weddingId: wid, ruleId: result.ruleId, isResolved: false } })
    if (!existing) {
      await db.riskAlert.create({
        data: {
          weddingId: wid,
          ruleId: result.ruleId,
          severity: result.severity,
          category: result.category,
          message: result.message,
          data: result.data ?? {},
        },
      })
    } else {
      // Update message in case values changed
      await db.riskAlert.update({
        where: { id: existing.id },
        data: { message: result.message, data: result.data ?? {}, severity: result.severity },
      })
    }
  }

  return NextResponse.json({ evaluated: results.length, triggered: results.filter(r => r.triggered).length })
}
