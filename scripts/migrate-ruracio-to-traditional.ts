/**
 * One-time migration: rename RURACIO event type to TRADITIONAL.
 * Run BEFORE pnpm db:push to avoid enum constraint violations.
 *
 * Usage: pnpm tsx scripts/migrate-ruracio-to-traditional.ts
 */
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../lib/generated/prisma'
import * as dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })

async function main() {
  // Raw SQL needed because Prisma won't let you write an old enum value
  const result = await db.$executeRaw`
    UPDATE "WeddingEvent"
    SET type = 'TRADITIONAL'
    WHERE type = 'RURACIO'
  `
  console.log(`✅ Migrated ${result} WeddingEvent row(s) from RURACIO → TRADITIONAL`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
