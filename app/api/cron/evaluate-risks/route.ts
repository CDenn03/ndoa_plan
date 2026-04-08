import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { evaluateRisks } from '@/lib/risk-engine'
import type { Prisma } from '@/lib/generated/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Called by Vercel Cron every 6 hours.
// Also cleans up old ProcessedOperation rows.
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Validate cron secret to prevent unauthorised triggering
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const weddings = await db.wedding.findMany({
    select: {
      id: true,
      date: true,
      budget: true,
      venueCapacity: true,
    },
    where: {
      date: { gte: new Date() }, // only upcoming weddings
    },
  })

  let totalTriggered = 0
  const errors: string[] = []

  for (const wedding of weddings) {
    try {
      const [guests, vendors, budgetLines, checklistItems] = await Promise.all([
        db.guest.findMany({ where: { weddingId: wedding.id, deletedAt: null }, select: { id: true, rsvpStatus: true } }),
        db.vendor.findMany({ where: { weddingId: wedding.id, deletedAt: null }, select: { id: true, name: true, status: true, lastContactAt: true, updatedAt: true, amount: true } }),
        db.budgetLine.findMany({ where: { weddingId: wedding.id, deletedAt: null }, select: { estimated: true, actual: true, committed: true } }),
        db.checklistItem.findMany({ where: { weddingId: wedding.id, deletedAt: null }, select: { isChecked: true, dueDate: true, priority: true } }),
      ])

      const confirmedGuests = guests.filter(g => g.rsvpStatus === 'CONFIRMED').length
      const pendingRsvps = guests.filter(g => g.rsvpStatus === 'PENDING').length

      const results = evaluateRisks({
        wedding: { id: wedding.id, date: wedding.date, budget: Number(wedding.budget), venueCapacity: wedding.venueCapacity ?? undefined },
        guests: guests.map(g => ({ id: g.id, rsvpStatus: g.rsvpStatus })),
        vendors: vendors.map(v => ({ id: v.id, name: v.name, status: v.status, lastContactAt: v.lastContactAt ?? undefined, lastStatusChangeAt: v.updatedAt, amount: v.amount ? Number(v.amount) : undefined })),
        payments: [],
        budgetLines: budgetLines.map(l => ({ estimated: Number(l.estimated), actual: Number(l.actual), committed: Number(l.committed) })),
        checklistItems: checklistItems.map(i => ({ isChecked: i.isChecked, dueDate: i.dueDate ?? undefined, priority: i.priority })),
        confirmedGuests,
        pendingRsvps,
      })

      const triggeredIds = new Set(results.map(r => r.ruleId))

      // Resolve no-longer-triggered alerts
      await db.riskAlert.updateMany({
        where: { weddingId: wedding.id, isResolved: false, ruleId: { notIn: Array.from(triggeredIds) } },
        data: { isResolved: true, resolvedAt: new Date(), resolvedBy: 'cron' },
      })

      // Upsert triggered alerts
      for (const result of results) {
        const existing = await db.riskAlert.findFirst({ where: { weddingId: wedding.id, ruleId: result.ruleId, isResolved: false } })
        if (!existing) {
          await db.riskAlert.create({
            data: { weddingId: wedding.id, ruleId: result.ruleId, severity: result.severity, category: result.category, message: result.message, ...(result.data ? { data: result.data as unknown as Prisma.InputJsonValue } : {}) },
          })
        } else {
          await db.riskAlert.update({
            where: { id: existing.id },
            data: { message: result.message, severity: result.severity, ...(result.data ? { data: result.data as unknown as Prisma.InputJsonValue } : {}) },
          })
        }
      }

      totalTriggered += results.length
    } catch (err) {
      errors.push(`${wedding.id}: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }

  // Prune old ProcessedOperation rows (older than 72hr)
  const pruned = await db.processedOperation.deleteMany({
    where: { processedAt: { lt: new Date(Date.now() - 72 * 60 * 60 * 1000) } },
  })

  return NextResponse.json({
    weddings: weddings.length,
    totalTriggered,
    pruned: pruned.count,
    errors,
    timestamp: new Date().toISOString(),
  })
}
