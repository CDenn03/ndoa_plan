import { differenceInDays } from 'date-fns'
import type { RiskRuleResult } from '@/types'

interface WeddingContext {
  wedding: { id: string; date: Date; budget: number; venueCapacity?: number }
  guests: { id: string; rsvpStatus: string; lastContactAt?: Date }[]
  vendors: { id: string; name: string; status: string; lastContactAt?: Date; lastStatusChangeAt?: Date; amount?: number }[]
  payments: { amount: number; status: string }[]
  budgetLines: { estimated: number; actual: number; committed: number }[]
  checklistItems: { isChecked: boolean; dueDate?: Date; priority: number }[]
  confirmedGuests: number
  pendingRsvps: number
}

type RiskRule = (ctx: WeddingContext) => RiskRuleResult | null

const rules: RiskRule[] = [
  // ── Budget overshoot ─────────────────────────────────────────────────────
  (ctx) => {
    const totalCommitted = ctx.budgetLines.reduce((s, l) => s + l.committed + l.actual, 0)
    const pct = totalCommitted / ctx.wedding.budget
    if (pct > 1.0) return {
      ruleId: 'budget.overshoot', triggered: true, severity: 'CRITICAL', category: 'budget',
      message: `Budget exceeded: ${Math.round(pct * 100)}% of total budget committed`,
      data: { percent: Math.round(pct * 100), totalCommitted, budget: ctx.wedding.budget },
      suggestedAction: 'Review budget lines and defer or cancel non-essential items',
    }
    if (pct > 0.85) {
      const daysLeft = differenceInDays(ctx.wedding.date, new Date())
      if (daysLeft > 14) return {
        ruleId: 'budget.drift', triggered: true, severity: 'HIGH', category: 'budget',
        message: `Budget at ${Math.round(pct * 100)}% with ${daysLeft} days remaining`,
        data: { percent: Math.round(pct * 100), daysLeft },
        suggestedAction: 'Review uncommitted vendor quotes before booking more',
      }
    }
    return null
  },

  // ── Guest overflow ────────────────────────────────────────────────────────
  (ctx) => {
    const capacity = ctx.wedding.venueCapacity
    if (!capacity) return null
    const confirmed = ctx.confirmedGuests
    if (confirmed >= capacity * 0.95) return {
      ruleId: 'guests.overflow', triggered: true,
      severity: confirmed >= capacity ? 'CRITICAL' : 'HIGH',
      category: 'guests',
      message: `${confirmed} confirmed guests vs ${capacity} venue capacity`,
      data: { confirmed, capacity, overflow: confirmed - capacity },
      suggestedAction: confirmed >= capacity ? 'Contact venue about overflow or move waitlisted guests' : 'Monitor RSVPs closely',
    }
    return null
  },

  // ── Vendor inactivity ────────────────────────────────────────────────────
  (ctx) => {
    const daysToEvent = differenceInDays(ctx.wedding.date, new Date())
    const threshold = daysToEvent < 7 ? 2 : daysToEvent < 30 ? 7 : 14
    const inactive = ctx.vendors.filter(v => {
      if (v.status === 'CONFIRMED' || v.status === 'CANCELLED' || v.status === 'COMPLETED') return false
      const lastActivity = Math.max(
        v.lastContactAt?.getTime() ?? 0,
        v.lastStatusChangeAt?.getTime() ?? 0,
      )
      return differenceInDays(new Date(), new Date(lastActivity)) > threshold
    })
    if (!inactive.length) return null
    return {
      ruleId: 'vendor.inactivity', triggered: true,
      severity: daysToEvent < 7 ? 'CRITICAL' : 'HIGH',
      category: 'vendor',
      message: `${inactive.length} vendor(s) without contact in ${threshold}+ days`,
      data: { vendorIds: inactive.map(v => v.id), vendorNames: inactive.map(v => v.name), daysToEvent },
      suggestedAction: 'Contact vendors to confirm attendance and logistics',
    }
  },

  // ── Overdue checklist items ───────────────────────────────────────────────
  (ctx) => {
    const now = new Date()
    const overdue = ctx.checklistItems.filter(
      i => !i.isChecked && i.dueDate && new Date(i.dueDate) < now && i.priority <= 2
    )
    if (!overdue.length) return null
    return {
      ruleId: 'checklist.overdue', triggered: true, severity: 'MEDIUM', category: 'timeline',
      message: `${overdue.length} high-priority checklist item(s) overdue`,
      data: { count: overdue.length },
      suggestedAction: 'Review and action overdue checklist items',
    }
  },

  // ── Large pending RSVP count close to wedding ─────────────────────────────
  (ctx) => {
    const daysLeft = differenceInDays(ctx.wedding.date, new Date())
    if (daysLeft > 21 || ctx.pendingRsvps === 0) return null
    if (ctx.pendingRsvps > 20) return {
      ruleId: 'guests.rsvp_outstanding', triggered: true, severity: 'HIGH', category: 'guests',
      message: `${ctx.pendingRsvps} guests have not responded with ${daysLeft} days to go`,
      data: { pending: ctx.pendingRsvps, daysLeft },
      suggestedAction: 'Send RSVP reminder to non-responding guests',
    }
    return null
  },
]

export function evaluateRisks(ctx: WeddingContext): RiskRuleResult[] {
  return rules.map(r => r(ctx)).filter((r): r is RiskRuleResult => r !== null)
}
