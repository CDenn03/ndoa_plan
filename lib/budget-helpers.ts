import { db } from '@/lib/db'

/**
 * Recalculates BudgetLine.actual as the SUM of all COMPLETED payments
 * linked to that budget line. Call this after any payment create/update/delete.
 */
export async function recalculateBudgetLineActual(budgetLineId: string): Promise<void> {
  const agg = await db.payment.aggregate({
    where: { budgetLineId, status: 'COMPLETED', deletedAt: null },
    _sum: { amount: true },
  })
  const total = agg._sum.amount ?? 0
  await db.budgetLine.update({
    where: { id: budgetLineId },
    data: { actual: total, version: { increment: 1 } },
  })
}
