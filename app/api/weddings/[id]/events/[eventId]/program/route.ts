import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string; eventId: string }> }

// ─── Time helpers ─────────────────────────────────────────────────────────────

/** Parse "HH:mm" → total minutes since midnight */
function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Total minutes since midnight → "HH:mm" */
function formatTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Resolve startTime/endTime/duration — always returns all three.
 * Priority: startTime+duration → derive endTime
 *           startTime+endTime  → derive duration
 */
export function resolveTimings(
  startTime?: string | null,
  endTime?: string | null,
  duration?: number | null,
): { startTime: string | null; endTime: string | null; duration: number | null } {
  if (startTime && duration != null) {
    return { startTime, endTime: formatTime(parseTime(startTime) + duration), duration }
  }
  if (startTime && endTime) {
    const d = parseTime(endTime) - parseTime(startTime)
    return { startTime, endTime, duration: d > 0 ? d : null }
  }
  if (startTime) return { startTime, endTime: null, duration: null }
  return { startTime: null, endTime: null, duration: duration ?? null }
}

/**
 * Cascade start times forward from anchorIdx.
 * Each item after the anchor inherits the previous item's endTime as its startTime.
 */
export function cascadeTimes(
  items: { startTime: string | null; endTime: string | null; duration: number | null }[],
  anchorIdx = 0,
): { startTime: string | null; endTime: string | null; duration: number | null }[] {
  const result = items.map(i => ({ ...i }))
  for (let i = anchorIdx + 1; i < result.length; i++) {
    const prev = result[i - 1]
    if (prev.endTime && result[i].duration != null) {
      result[i].startTime = prev.endTime
      result[i].endTime = formatTime(parseTime(prev.endTime) + result[i].duration!)
    } else if (prev.endTime) {
      result[i].startTime = prev.endTime
      result[i].endTime = null
    }
  }
  return result
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, props: Params) {
  const { id, eventId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const items = await db.eventProgramItem.findMany({
    where: { eventId },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(items)
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, props: Params) {
  const { id, eventId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, startTime, endTime, duration, order, assignedTo, vendorId, date } = body
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const resolved = resolveTimings(
    startTime || null,
    endTime || null,
    duration != null ? Number(duration) : null,
  )

  const item = await db.eventProgramItem.create({
    data: {
      eventId,
      title: title.trim(),
      description: description || null,
      date: date ? new Date(date) : null,
      startTime: resolved.startTime,
      endTime: resolved.endTime,
      duration: resolved.duration,
      order: order ?? 0,
      assignedTo: assignedTo || null,
      vendorId: vendorId || null,
    },
  })
  return NextResponse.json(item, { status: 201 })
}

// ─── PATCH (bulk reorder + time cascade) ─────────────────────────────────────

export async function PATCH(req: NextRequest, props: Params) {
  const { id, eventId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Ordered array of { id } — position = new order
  const ordered = await req.json() as { id: string }[]

  const current = await db.eventProgramItem.findMany({ where: { eventId }, orderBy: { order: 'asc' } })
  const byId = Object.fromEntries(current.map(c => [c.id, c]))

  const reordered = ordered.map(({ id: itemId }) => byId[itemId]).filter(Boolean)

  // Cascade times from the first anchored item
  const anchorIdx = reordered.findIndex(i => i.startTime)
  const timingInputs = reordered.map(i => ({
    startTime: i.startTime,
    endTime: i.endTime,
    duration: i.duration,
  }))
  const cascaded = anchorIdx >= 0 ? cascadeTimes(timingInputs, anchorIdx) : timingInputs

  await Promise.all(
    reordered.map((item, idx) =>
      db.eventProgramItem.update({
        where: { id: item.id },
        data: {
          order: idx,
          startTime: cascaded[idx].startTime,
          endTime: cascaded[idx].endTime,
          duration: cascaded[idx].duration,
        },
      })
    )
  )

  const updated = await db.eventProgramItem.findMany({ where: { eventId }, orderBy: { order: 'asc' } })
  return NextResponse.json(updated)
}
