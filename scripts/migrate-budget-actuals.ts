/**
 * Option B migration: for every BudgetLine where actual > 0 and no linked
 * payment exists, create a synthetic COMPLETED payment so the new
 * recalculateBudgetLineActual system has accurate data.
 *
 * Run once: pnpm tsx scripts/migrate-budget-actuals.ts
 */
import { PrismaClient } from '../lib/generated/prisma'
import { PrismaNeon } from '@prisma/adapter-neon'
import * as dotenv from 'dotenv'
dotenv.config()

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  const lines = await db.budgetLine.findMany({
    where: { deletedAt: null, actual: { gt: 0 } },
  })
  console.log(`Found ${lines.length} budget lines with actual > 0`)

  let created = 0
  let skipped = 0

  for (const line of lines) {
    const existing = await db.payment.findFirst({
      where: { budgetLineId: line.id, deletedAt: null },
    })
    if (existing) {
      console.log(`  SKIP (already has payment): ${line.description}`)
      skipped++
      continue
    }

    await db.payment.create({
      data: {
        weddingId: line.weddingId,
        eventId: line.eventId ?? null,
        budgetLineId: line.id,
        vendorId: line.vendorId ?? null,
        amount: line.actual,
        status: 'COMPLETED',
        description: `Migrated from manual entry — ${line.description}`,
        paymentDate: line.paymentDate ?? new Date(),
        idempotencyKey: `migrate-actual-${line.id}`,
        processedAt: new Date(),
      },
    })
    console.log(`  CREATED: ${line.description} — KES ${Number(line.actual).toLocaleString()}`)
    created++
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
