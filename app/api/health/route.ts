import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  let dbOk = false
  let dbLatencyMs = 0

  try {
    await db.$queryRaw`SELECT 1`
    dbOk = true
    dbLatencyMs = Date.now() - start
  } catch {
    dbOk = false
  }

  const status = dbOk ? 200 : 503
  return NextResponse.json(
    {
      status: dbOk ? 'ok' : 'degraded',
      db: { ok: dbOk, latencyMs: dbLatencyMs },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? 'unknown',
    },
    { status }
  )
}
