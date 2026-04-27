import { db } from '@/lib/db'

/**
 * Sanitizes numeric values from Dexie to prevent NaN errors
 * Uses the Number(x) || 0 pattern as specified in requirements
 */
export function sanitizeNumeric(value: unknown): number {
  const num = Number(value)
  return Number.isNaN(num) ? 0 : num
}

/**
 * Formats currency values consistently using Intl.NumberFormat
 * Defaults to KES currency with no decimal places
 */
export function formatCurrency(
  amount: number, 
  options: { currency?: string; locale?: string; maximumFractionDigits?: number } = {}
): string {
  const {
    currency = 'KES',
    locale = 'en-KE',
    maximumFractionDigits = 0
  } = options

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits
  }).format(sanitizeNumeric(amount))
}

/**
 * Performs proper numeric addition for budget calculations
 * Ensures all values are sanitized before arithmetic operations
 */
export function addBudgetAmounts(...amounts: unknown[]): number {
  return amounts.reduce<number>((sum, amount) => sum + sanitizeNumeric(amount), 0)
}

/**
 * Performs proper numeric subtraction for budget calculations
 * Ensures all values are sanitized before arithmetic operations
 */
export function subtractBudgetAmounts(minuend: unknown, subtrahend: unknown): number {
  return sanitizeNumeric(minuend) - sanitizeNumeric(subtrahend)
}

/**
 * Calculates percentage with proper numeric operations
 * Returns 0 if denominator is 0 to prevent division by zero
 */
export function calculatePercentage(numerator: unknown, denominator: unknown): number {
  const num = sanitizeNumeric(numerator)
  const den = sanitizeNumeric(denominator)
  return den > 0 ? (num / den) * 100 : 0
}

/**
 * Calculates budget line utilization percentage
 * Returns percentage of actual vs estimated spending
 */
export function calculateUtilization(actual: unknown, estimated: unknown): number {
  return calculatePercentage(actual, estimated)
}

/**
 * Calculates budget variance (actual - estimated)
 * Positive values indicate over-budget, negative values indicate under-budget
 */
export function calculateVariance(actual: unknown, estimated: unknown): number {
  return subtractBudgetAmounts(actual, estimated)
}

/**
 * Calculates budget summary statistics for an array of budget lines
 * Returns totals, variance, and utilization percentage
 */
export function calculateBudgetSummary(budgetLines: Array<{ estimated: unknown; actual: unknown }>): {
  totalEstimated: number
  totalActual: number
  variance: number
  utilizationPercentage: number
  remaining: number
} {
  const totalEstimated = budgetLines.reduce<number>((sum, line) => sum + sanitizeNumeric(line.estimated), 0)
  const totalActual = budgetLines.reduce<number>((sum, line) => sum + sanitizeNumeric(line.actual), 0)
  const variance = calculateVariance(totalActual, totalEstimated)
  const utilizationPercentage = calculateUtilization(totalActual, totalEstimated)
  const remaining = subtractBudgetAmounts(totalEstimated, totalActual)

  return {
    totalEstimated,
    totalActual,
    variance,
    utilizationPercentage,
    remaining
  }
}

/**
 * Groups budget lines by category and calculates category totals
 * Returns array of categories with their respective totals
 */
export function groupBudgetByCategory<T extends { category: string; estimated: unknown; actual: unknown }>(
  budgetLines: T[]
): Array<{
  category: string
  lines: T[]
  totalEstimated: number
  totalActual: number
  variance: number
  utilizationPercentage: number
}> {
  const grouped = budgetLines.reduce((acc, line) => {
    if (!acc[line.category]) {
      acc[line.category] = []
    }
    acc[line.category].push(line)
    return acc
  }, {} as Record<string, T[]>)

  return Object.entries(grouped).map(([category, lines]) => {
    const totalEstimated = lines.reduce<number>((sum, line) => sum + sanitizeNumeric(line.estimated), 0)
    const totalActual = lines.reduce<number>((sum, line) => sum + sanitizeNumeric(line.actual), 0)
    const variance = calculateVariance(totalActual, totalEstimated)
    const utilizationPercentage = calculateUtilization(totalActual, totalEstimated)

    return {
      category,
      lines,
      totalEstimated,
      totalActual,
      variance,
      utilizationPercentage
    }
  })
}

/**
 * Recalculates BudgetLine.actual as the SUM of all COMPLETED payments
 * linked to that budget line. Call this after any payment create/update/delete.
 */
export async function recalculateBudgetLineActual(budgetLineId: string): Promise<void> {
  const agg = await db.payment.aggregate({
    where: { budgetLineId, status: 'COMPLETED', deletedAt: null },
    _sum: { amount: true },
  })
  const total = sanitizeNumeric(agg._sum.amount)
  await db.budgetLine.update({
    where: { id: budgetLineId },
    data: { actual: total, version: { increment: 1 } },
  })
}
